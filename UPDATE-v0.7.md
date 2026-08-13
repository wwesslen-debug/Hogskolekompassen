# Uppdatera v0.6.5 → v0.7.0 utan att tappa Susa-datan

Det säkraste sättet är att använda `hogskolekompassen-v0.7-update.zip`.

## Viktigt

Behåll din befintliga fil:

`db/hogskolekompassen.sqlite`

Den innehåller din fullsynk med cirka 59 000 HS-utbildningstillfällen. Update-paketet innehåller därför medvetet **ingen `db`-mapp**.

## Steg

1. Stoppa `npm run dev` med `Ctrl+C`.
2. Ta gärna backup:

```powershell
Copy-Item .\db\hogskolekompassen.sqlite .\db\hogskolekompassen-backup-v065.sqlite
```

3. Packa upp update-zippen och kopiera innehållet till projektmappen. Välj **Ersätt filer**.
4. Kör:

```powershell
npm install
npm run setup:v07
npm run susa:relink
npm run susa:status
npm run susa:quality
npm run dev
```

`setup:v07` lägger till nya kolumner och Polisutbildningen som canonical-profil men raderar inte live-datan.

`susa:relink` laddar inte ner Susa-navet igen. Den kör v0.7-länkmodellen mot de poster som redan finns lokalt.

## Nya sidor

- `/resultat` visar live-utbildningar för toppmatchningarna.
- `/datakvalitet` visar länkgrad, confidence buckets, länkmetoder och vanligaste omatchade utbildningar.

## Om du använder hela v0.7-zippen

Den kompletta zippen innehåller en ren seed-databas utan din tidigare live-synk. Kopiera därför tillbaka din backup av `hogskolekompassen.sqlite` innan `setup:v07`, eller kör en ny `npm run susa:sync:full`.
