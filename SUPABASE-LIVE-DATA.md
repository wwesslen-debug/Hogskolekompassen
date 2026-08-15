# Supabase live-data setup

This moves the Susa live catalog out of native SQLite for the web process.
Railway can then run with `HK_DISABLE_SQLITE=1` and read live data from Supabase/Postgres.

## 1. Get the connection string

In Supabase:

1. Open the project.
2. Click **Connect**.
3. Choose **Direct connection** or **Transaction pooler**.
4. Copy the Postgres URI and replace `[YOUR-PASSWORD]` with the database password.

Use this as a server-only environment variable:

```bash
SUPABASE_DATABASE_URL=postgresql://...
```

Do not expose this as `NEXT_PUBLIC_*`.

## 2. Prepare the schema

From this repo:

```bash
npm run supabase:schema
```

This applies `supabase/schema.sql`.

## 3. Upload current Susa live data

First make sure the local Susa database is synced and relinked:

```bash
npm run susa:sync:full
```

Then upload the live tables to Supabase:

```bash
npm run supabase:push-live -- --replace
```

Shortcut:

```bash
npm run susa:sync:supabase
```

## 4. Railway variables

Set these on the Railway service:

```bash
HK_DISABLE_SQLITE=1
SUPABASE_DATABASE_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=https://www.xn--hgskolekompassen-mwb.se
```

After redeploy, `/api/live-quality` should report `"source":"supabase"` and live counts above zero.

## Notes

- The app still uses `data/programs.json` for the canonical match profiles during web boot.
- Supabase stores only the live Susa tables and sync metadata.
- If `SUPABASE_DATABASE_URL` is missing or fails, the app falls back safely to the local/JSON catalog and shows no live events.
