import Database from "better-sqlite3";
import fs from "node:fs";
import { getDbPath } from "../lib/runtime-paths.mjs";

const dbPath = getDbPath();
if (!fs.existsSync(dbPath)) {
  console.error("Databasen saknas. Kör npm run db:seed först.");
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS susa_sync_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS susa_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organisation_number TEXT,
    website TEXT,
    email TEXT,
    city TEXT,
    school_type TEXT,
    last_edited TEXT,
    expires TEXT,
    synced_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS susa_education_infos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    school_type TEXT,
    level TEXT,
    kind TEXT,
    degree TEXT,
    student_aid TEXT,
    credits REAL,
    credits_unit TEXT,
    eligibility TEXT,
    provider_ids_json TEXT NOT NULL DEFAULT '[]',
    provider_name TEXT,
    application_code TEXT,
    urls_json TEXT NOT NULL DEFAULT '[]',
    last_edited TEXT,
    expires TEXT,
    synced_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS susa_education_events (
    id TEXT PRIMARY KEY,
    education_info_id TEXT,
    title TEXT NOT NULL,
    provider_name TEXT,
    provider_id TEXT,
    provider_ids_json TEXT NOT NULL DEFAULT '[]',
    city TEXT,
    start_date TEXT,
    end_date TEXT,
    period TEXT,
    study_form TEXT,
    study_pace TEXT,
    language TEXT,
    credits REAL,
    credits_unit TEXT,
    level TEXT,
    kind TEXT,
    degree TEXT,
    student_aid TEXT,
    eligibility TEXT,
    description TEXT,
    application_open TEXT,
    application_deadline TEXT,
    application_url TEXT,
    application_code TEXT,
    source_url TEXT,
    school_type TEXT,
    distance INTEGER NOT NULL DEFAULT 0,
    last_edited TEXT,
    expires TEXT,
    canonical_program_id INTEGER,
    link_score REAL,
    synced_at TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    FOREIGN KEY (canonical_program_id) REFERENCES programs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_susa_events_period ON susa_education_events(period);
  CREATE INDEX IF NOT EXISTS idx_susa_events_provider ON susa_education_events(provider_name);
  CREATE INDEX IF NOT EXISTS idx_susa_events_city ON susa_education_events(city);
  CREATE INDEX IF NOT EXISTS idx_susa_events_start_date ON susa_education_events(start_date);
  CREATE INDEX IF NOT EXISTS idx_susa_events_program ON susa_education_events(canonical_program_id);
  CREATE INDEX IF NOT EXISTS idx_susa_infos_school_type ON susa_education_infos(school_type);
`);


function ensureColumn(table, column, definition) {
  const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
  if (!columns.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn("susa_education_infos", "degree", "TEXT");
ensureColumn("susa_education_infos", "student_aid", "TEXT");
ensureColumn("susa_education_events", "degree", "TEXT");
ensureColumn("susa_education_events", "student_aid", "TEXT");

db.close();
console.log("v0.6 live-data tables are ready:", dbPath);
