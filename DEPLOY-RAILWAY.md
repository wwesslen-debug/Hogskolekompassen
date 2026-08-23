# Deploy Högskolekompassen på Railway

Appen kör Next.js på Railway och läser livekatalogen från Supabase/Postgres. Ingen SQLite-fil eller Railway Volume behövs för webbruntime.

```text
Railway service
  ├─ Next.js
  ├─ API routes
  └─ Supabase/Postgres
       ├─ susa_providers
       ├─ susa_education_infos
       ├─ susa_education_events
       └─ susa_sync_state
```

## 1. GitHub

Pusha `main` till GitHub-repot som Railway är kopplat till. Railway läser `railway.json` och kör:

```bash
npm run build
```

## 2. Railway-variabler

Sätt minst:

```text
NODE_ENV=production
SUPABASE_DATABASE_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=https://www.xn--hgskolekompassen-mwb.se
NEXT_PUBLIC_CONTACT_EMAIL=kontakt@hogskolekompassen.se
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-7522543243781751
```

`SUPABASE_DATABASE_URL` ska vara server-side och får inte heta `NEXT_PUBLIC_*`.

## 3. Supabase-schema

Kör vid behov från projektet:

```bash
npm run supabase:schema
```

Det applicerar `supabase/schema.sql`.

## 4. Deploy

Startkommandot är:

```bash
npm run start:prod
```

Det startar Next direkt. Det finns ingen produktions-bootstrap som kopierar eller migrerar SQLite.

## 5. Verifiering

Kontrollera efter deploy:

```text
https://www.xn--hgskolekompassen-mwb.se/api/health
https://www.xn--hgskolekompassen-mwb.se/aktuellt
https://www.xn--hgskolekompassen-mwb.se/datakvalitet
```

`/api/health` ska rapportera `database: "supabase"` och `liveDataSource: "supabase"`. När Supabase-tabellerna innehåller data ska `eventCount` vara större än 0.
