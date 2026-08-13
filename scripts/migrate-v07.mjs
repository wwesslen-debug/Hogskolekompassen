import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { getDbPath } from "../lib/runtime-paths.mjs";

const dbPath = getDbPath();
if (!fs.existsSync(dbPath)) {
  console.error("Databasen saknas. Kör npm run db:seed först.");
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function hasTable(name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function ensureColumn(table, column, definition) {
  if (!hasTable(table)) return;
  const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
  if (!columns.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

if (!hasTable("susa_education_events")) {
  console.error("v0.6-tabellerna saknas. Kör npm run db:migrate:v06 först.");
  process.exit(1);
}

ensureColumn("susa_education_infos", "subject_codes_json", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("susa_education_events", "subject_codes_json", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("susa_education_events", "link_method", "TEXT");
ensureColumn("susa_education_events", "link_evidence_json", "TEXT NOT NULL DEFAULT '{}'");

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_susa_events_link_score ON susa_education_events(link_score);
  CREATE INDEX IF NOT EXISTS idx_susa_events_kind ON susa_education_events(kind);
  CREATE INDEX IF NOT EXISTS idx_susa_events_info ON susa_education_events(education_info_id);
`);



// v0.7 adds one canonical profile that is already visible in the verified HS feed.
// Insert it without rebuilding the database so existing live data is preserved.
const programsPath = path.join(process.cwd(), "data", "programs.json");
if (fs.existsSync(programsPath)) {
  const additions = JSON.parse(fs.readFileSync(programsPath, "utf8")).filter((item) => item.title === "Polisutbildningen");
  const insertProgram = db.prepare(`
    INSERT INTO programs (
      title, institution, city, category, years, degree, study,
      description, tags_json, vector_json, data_status, antagning_search
    ) VALUES (
      @title, @institution, @city, @category, @years, @degree, @study,
      @description, @tagsJson, @vectorJson, @dataStatus, @antagningSearch
    )
  `);
  for (const item of additions) {
    const exists = db.prepare("SELECT id FROM programs WHERE title=? AND category=? LIMIT 1").get(item.title, item.category);
    if (!exists) insertProgram.run({ ...item, tagsJson: JSON.stringify(item.tags || []), vectorJson: JSON.stringify(item.vector || {}) });
  }
}

const now = new Date().toISOString();
db.prepare(`
  INSERT INTO susa_sync_state(key, value, updated_at) VALUES('schema_version', '0.7', ?)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
`).run(now);

db.close();
console.log("v0.7 live-matching columns are ready:", dbPath);
