# Högskolekompassen v0.7.1 – Live Matching & Safe Sync

Högskolekompassen är en Next.js-app som kombinerar en transparent profilkompass med ett lokalt synkat live-utbud av svenska universitets- och högskoleutbildningar från Skolverkets Susa-nav/EMIL3.

v0.7 bygger vidare på den fungerande v0.6.5-integrationen och fokuserar på att göra live-datan användbar i själva rekommendationen. v0.7.1 gör dessutom den stora Susa-importen betydligt robustare.


## Nytt i v0.7.1 – robust fullsynk

Den stora HS-importen kan bestå av nästan 1 200 API-sidor. v0.7.1 gör därför synken säkrare:

- HTTP 429/502/503/504 och tillfälliga nätverksfel får upp till åtta försök med exponential backoff.
- Fullsynken checkpointar varje hämtad Susa-sida till `db/.susa-sync-cache`. Om Skolverket tillfälligt går ned kan nästa `npm run susa:sync:full` fortsätta från senaste checkpoint i stället för att börja om från sida 1. Checkpoints återanvänds i upp till sex timmar.
- När hämtningen är klar skrivs providers, EducationInfo och EducationEvent i mindre SQLite-transaktioner med synlig progress. Ett avbrott under skrivfasen rullar därför inte tillbaka hela katalogen till noll.
- Den tunga canonical-matchningen görs inte längre inne i själva importtransaktionen. Live-datan sparas först säkert; därefter kör `susa:relink` den tvåstegsmodell som används av resultatsidan.
- Relink visar progress och sparar också i mindre deltransaktioner.

Om du medvetet vill kasta en gammal checkpoint och börja om helt från API-sida 1:

```powershell
npm run susa:sync:full:fresh
```

## Nytt i v0.7

### 1. Live-utbildningar direkt i resultatet
Efter kompassen hämtas aktuella Susa-nav-tillfällen för användarens högst rankade canonical-profiler. Resultatsidan visar nu bland annat:

- personlig matchprocent från Högskolekompassens profilmodell
- verkligt utbildningsnamn
- verkligt lärosäte och ort
- program/kurs
- startperiod/startdatum när det finns
- studietakt, nivå, omfattning och distansmarkering när datan finns
- ansöknings-/originalkälla
- separat länksäkerhet mellan live-posten och canonical-profilen

Den personliga procenten och länksäkerheten är medvetet separata begrepp.

### 2. Förbättrad tvåstegslänkning
`npm run susa:relink` använder nu en v0.7-modell med:

- bättre svensk/engelsk titelnormalisering
- fler synonymer för vanliga utbildningsnamn
- titel-F1/Jaccard i stället för bara enkel tokenöverlappning
- examenssignaler, t.ex. civilingenjör/högskoleingenjör/kandidat/master
- program/kurs-signal
- låg vikt från beskrivning och tags
- leverantör/lärosäte som svag stödsignal
- ambiguitetskontroll mot näst bästa träff
- SUN-ämneskoder som sekundär stödsignal

SUN-koderna används konservativt. Först skapas ett ämneskod→kategori-underlag från starka lexikala träffar. Därefter får ämneskoden bara förstärka en redan existerande textmatch – den kan inte ensam skapa en länk.

### 3. Datakvalitet
Ny sida:

`/datakvalitet`

Den visar:

- antal live-tillfällen
- antal och andel länkade
- hög/medel/explorativ länksäkerhet
- täckning per program/kurs
- vilka länkmetoder som används
- vanligaste omatchade utbildningarna
- canonical-profiler med flest live-tillfällen

Terminalversion:

```powershell
npm run susa:quality
```

### 4. Ny canonical-profil: Polisutbildningen
Den verifierade HS-proben innehöll Polisutbildningen, men v0.6 saknade motsvarande matchningsprofil. v0.7 lägger till den utan att återställa databasen.

Canonical-katalogen innehåller därför nu **370 profiler**.

## Installation – nytt projekt

```powershell
npm install
npm run setup:v07
npm run dev
```

Öppna:

`http://localhost:3000`

Den medföljande databasen innehåller canonical-katalogen men ingen förhämtad Susa-livekatalog.

För första fulla synken:

```powershell
npm run susa:sync:full
```

`susa:sync:full` kör först en checkpointad full HS-synk, sparar live-datan säkert i SQLite och kör därefter v0.7.1-relinkningen.

Kontrollera:

```powershell
npm run susa:status
npm run susa:quality
```

## Uppgradering från v0.6.5 utan att förlora live-datan

Använd helst v0.7-update-paketet och **behåll din befintliga**:

`db/hogskolekompassen.sqlite`

Kör sedan:

```powershell
npm install
npm run setup:v07
npm run susa:relink
npm run susa:status
npm run susa:quality
npm run dev
```

Du behöver alltså inte ladda ner ~59 000 poster igen bara för att få den nya länkmodellen.

## Viktiga kommandon

```powershell
npm run dev
npm run validate
npm run setup:v07
npm run susa:probe
npm run susa:sync:full
npm run susa:sync:full:fresh
npm run susa:update
npm run susa:relink
npm run susa:status
npm run susa:quality
```

- `susa:probe` – kort HS-prov mot Susa-navet.
- `susa:sync:full` – checkpointad full HS-synk + v0.7.1-relink.
- `susa:sync:full:fresh` – raderar synk-checkpoint och gör en helt ny fullsynk.
- `susa:update` – delta-synk + relink.
- `susa:relink` – använder redan hämtad data och kör bara länkmodellen.
- `susa:quality` – terminalrapport över täckning och omatchade poster.

## Arkitektur

```text
50 grundfrågor + adaptiva frågor
              │
              ▼
       personlig profil
              │
              ▼
   370 canonical-profiler
              │
       personlig match %
              │
              ├─────────────────┐
              │                 │
              ▼                 ▼
       resultatområden    v0.7-länkmodell
                                │
                                ▼
                         Susa-nav / HS
                         EducationInfo
                         EducationEvent
                                │
                                ▼
                     verkliga utbildningar
                     i användarens resultat
```

Canonical-profilerna bestämmer **vad som passar användaren**. Susa-navet bestämmer **vilka verkliga utbildningstillfällen som finns i den lokalt synkade katalogen**.

## Resultatmodell

Profilmatchningen är fortfarande deterministisk och transparent. Den beräknar separata delpoäng för:

- Intressen
- Studiestil
- Arbetssätt
- Framtidsmål

Prioriteringar kan finjustera resultatet och deal-breakers kan ge tydliga avdrag.

v0.7 ändrar inte detta till en AI-genererad procentsats. Live-länkningen är ett separat lager.

## Databas

v0.7 lägger bland annat till:

- `susa_education_infos.subject_codes_json`
- `susa_education_events.subject_codes_json`
- `susa_education_events.link_method`
- `susa_education_events.link_evidence_json`
- index för link score, kind och EducationInfo-referens

`npm run db:migrate:v07` är idempotent och ska inte radera live-data.

## Routes

- `/` – startsida
- `/kompass` – kompass
- `/resultat` – personligt resultat + live-rekommendationer
- `/utbildningar` – canonical-katalog
- `/utbildningar/[id]` – canonical-profil + live-tillfällen
- `/aktuellt` – full livekatalog
- `/datakvalitet` – v0.7 länk- och täckningsrapport
- `/jamfor` – jämför utbildningar
- `/karriar` – karriärspår
- `/min-vag` – temporärt sparade val i webbläsaren

## Viktigt om procenttal

**Personlig match** är en profilmatch i Högskolekompassens modell.

**Länksäkerhet** anger hur starkt ett verkligt Susa-nav-tillfälle kunde kopplas till en canonical-profil.

Ingen av procentsatserna är sannolikhet för antagning, examen, trivsel eller framtida arbetsmarknadsutfall.
