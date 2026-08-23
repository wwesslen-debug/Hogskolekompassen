# Högskolekompassen

Högskolekompassen är en Next.js-app som kombinerar ett profilbaserat utbildningstest med aktuella svenska högskoleprogram från Skolverkets Susa-nav.

Webbruntime använder nu Supabase/Postgres som enda databas för livekatalogen. Quizfrågor och Högskolekompassens canonical-profiler ligger kvar som versionerade JSON-filer i `data/`.

## Kom igång

```powershell
npm install
npm run dev
```

Öppna:

```text
http://localhost:3000
```

## Viktiga kommandon

```powershell
npm run dev
npm run validate
npm run build
npm run start:prod
npm run supabase:schema
```

- `dev` startar lokal Next.js-utveckling.
- `validate` validerar fråge- och programdata i `data/`.
- `build` bygger produktionen.
- `start:prod` startar Next i produktionsläge.
- `supabase:schema` applicerar `supabase/schema.sql`.

## Miljövariabler

Minst för produktion:

```text
NODE_ENV=production
SUPABASE_DATABASE_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=https://www.xn--hgskolekompassen-mwb.se
NEXT_PUBLIC_CONTACT_EMAIL=kontakt@hogskolekompassen.se
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-7522543243781751
```

`SUPABASE_DATABASE_URL` är server-side och ska inte exponeras som `NEXT_PUBLIC_*`.

## Arkitektur

```text
25 eller 50 kompassfrågor
        │
        ▼
personlig profil
        │
        ▼
canonical-profiler i data/programs.json
        │
        ├─ personlig matchning
        │
        ▼
Supabase/Postgres livekatalog
        │
        ▼
aktuella programstarter i resultat och /aktuellt
```

Supabase-tabellerna är:

- `susa_providers`
- `susa_education_infos`
- `susa_education_events`
- `susa_sync_state`

## Routes

- `/` – startsida
- `/kompass` – snabbtest eller hela kompassen
- `/resultat` – personligt resultat + live-rekommendationer
- `/utbildningar` – canonical-katalog
- `/utbildningar/[id]` – canonical-profil
- `/aktuellt` – aktuell livekatalog från Supabase
- `/datakvalitet` – länk- och täckningsrapport
- `/api/health` – runtime- och Supabase-status

## Viktigt om procenttal

**Personlig match** är en profilmatch i Högskolekompassens modell.

**Länksäkerhet** anger hur starkt ett verkligt Susa-nav-tillfälle kunde kopplas till en canonical-profil.

Ingen av procentsatserna är sannolikhet för antagning, examen, trivsel eller framtida arbetsmarknadsutfall.
