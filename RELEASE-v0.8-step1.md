# Högskolekompassen v0.8 – Public Beta, steg 1

Fokus: deployment + persistent produktionsdatabas.

## Nytt

- Databassökvägen är inte längre hårdkodad till `./db/hogskolekompassen.sqlite`.
- Railway Volumes stöds automatiskt via `RAILWAY_VOLUME_MOUNT_PATH`.
- Lokal utveckling fortsätter använda `db/hogskolekompassen.sqlite` utan extra konfiguration.
- Produktionsstart initierar en tom persistent volume från den bundlade seed-databasen och kör v0.6/v0.7-migreringar.
- `/api/health` verifierar att Next.js kan läsa SQLite-databasen.
- `railway.json` konfigurerar Railpack, build, start och healthcheck.
- Susa-sync, relink, status och quality använder samma produktionsdatabas via runtime-path-konfigurationen.
- `npm run prod:db:info` visar exakt produktionsdatabassökväg, volymdetektering, filstorlek och live-räknare.

## Nya kommandon

```bash
npm run start:prod
npm run prod:init
npm run prod:sync
npm run prod:update
npm run prod:status
npm run prod:db:info
```

## Rekommenderad Railway-volym

Mount path:

```text
/data
```

När volymen är monterad sätter Railway `RAILWAY_VOLUME_MOUNT_PATH` automatiskt. Högskolekompassen använder då:

```text
/data/hogskolekompassen.sqlite
/data/.susa-sync-cache/
```

## Viktigt

Kör inte `npm run db:seed` i produktion. Det kommandot är ett lokalt utvecklingsverktyg som bygger om seed-databasen i projektets `db`-mapp.
