# Deploy Högskolekompassen v0.8 steg 1 på Railway

Den här versionen är anpassad för en enkel public-beta-arkitektur:

```text
Railway service
  ├─ Next.js
  ├─ API routes
  ├─ Susa sync/relink
  └─ persistent Railway Volume /data
       └─ hogskolekompassen.sqlite
```

## 1. Lägg projektet i GitHub

Från projektmappen:

```powershell
git init
git add .
git commit -m "Högskolekompassen v0.8 production deployment"
git branch -M main
```

Skapa ett tomt GitHub-repository och följ sedan GitHubs instruktioner för att lägga till `origin` och pusha `main`.

## 2. Skapa Railway-projektet

- Skapa ett nytt Railway project.
- Välj Deploy from GitHub repo.
- Välj Högskolekompassen-repot.
- Railway läser `railway.json` och kör `npm run build`.

## 3. Lägg till persistent volume

På Högskolekompassen-servicen:

- Add Volume.
- Mount Path: `/data`.
- Deploy/redeploy servicen.

Du behöver normalt inte sätta `HK_DB_PATH`. Railway tillhandahåller `RAILWAY_VOLUME_MOUNT_PATH` automatiskt.

## 4. Variabler

Rekommenderade service variables:

```text
NODE_ENV=production
SUSA_API_BASE_URL=https://api.skolverket.se/susa-navet/emil3
SUSA_SCHOOL_TYPE=HS
```

## 5. Skapa publik Railway-domän

Under Networking: Generate Domain.

Kontrollera därefter:

```text
https://<din-railway-domän>/api/health
```

Svaret ska ha `status: "ok"` och `database: "ready"`.

## 6. Verifiera den persistenta databasen

Anslut till den körande servicen med Railway SSH och kör:

```bash
npm run prod:db:info
```

`persistentVolumeDetected` ska vara `true` och `dbPath` ska ligga under `/data`.

## 7. Första produktionssynken

I samma SSH-session:

```bash
npm run prod:sync
```

Det kör full Susa-sync följt av v0.7-relink. v0.7.1-checkpoints sparas på samma persistenta volume.

Efteråt:

```bash
npm run prod:db:info
npm run susa:status
npm run susa:quality
```

Förväntat är ungefär 51 providers och omkring 59 000 EducationInfos/EducationEvents. Exakta siffror förändras när Susa-data uppdateras.

## 8. Verifiera webbplatsen

Testa åtminstone:

```text
/
/kompass
/resultat
/utbildningar
/aktuellt
/datakvalitet
/api/health
```

## 9. Backup

När den första produktion-synken är verifierad: skapa/aktivera en Railway Volume-backup innan nästa större kodändring.

## Nästa del av punkt 1

När den första produktion-deploymenten och databasen är verifierade kopplar vi på automatisk Susa-uppdatering och testar restore-flödet. Därefter kan punkt 1 markeras helt grön.
