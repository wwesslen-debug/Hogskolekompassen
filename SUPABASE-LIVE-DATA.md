# Supabase live-data

Högskolekompassen använder Supabase/Postgres som enda databas för livekatalogen i webbruntime. Quizfrågor och canonical-profiler läses från versionerade JSON-filer i `data/`; verkliga programstarter läses från Supabase.

## 1. Connection string

I Supabase:

1. Öppna projektet.
2. Välj **Connect**.
3. Välj **Direct connection** eller **Transaction pooler**.
4. Kopiera Postgres-URI:n och ersätt lösenordsplatshållaren.

Sätt den som server-only miljövariabel:

```bash
SUPABASE_DATABASE_URL=postgresql://...
```

Använd inte `NEXT_PUBLIC_*` för databassträngen.

## 2. Schema

Från repot:

```bash
npm run supabase:schema
```

Det applicerar `supabase/schema.sql` och skapar tabellerna:

- `susa_providers`
- `susa_education_infos`
- `susa_education_events`
- `susa_sync_state`

## 3. Webbruntime

Appens livedatafunktioner går direkt mot Supabase. Om `SUPABASE_DATABASE_URL` saknas startar appen ändå, men livekatalogen visas som tom och `/api/health` rapporterar `supabaseConfigured: false`.

Det finns ingen SQLite-fallback i webbruntime längre.

## 4. Verifiering

Efter deploy:

```text
/api/health
/api/live-quality
/aktuellt
```

Förväntat när tabellerna är fyllda:

- `database: "supabase"` i `/api/health`
- `liveDataSource: "supabase"` i `/api/health`
- `eventCount > 0`
- `source: "supabase"` i live-dataresponser
