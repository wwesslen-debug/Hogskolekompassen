import Database from "better-sqlite3";
import { liveEntryProgramSqlClause } from "../lib/live-entry-programs.mjs";
import { getDbPath } from "../lib/runtime-paths.mjs";

const dbPath = getDbPath();
const db = new Database(dbPath);

function hasTable(name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function setState(key, value) {
  if (!hasTable("susa_sync_state")) return;
  db.prepare(`
    INSERT INTO susa_sync_state(key, value, updated_at) VALUES(?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `).run(key, String(value ?? ""), new Date().toISOString());
}

if (!hasTable("susa_education_events")) {
  console.error("Live-tabeller saknas. Kör npm run db:migrate:v06 först.");
  process.exit(1);
}

const prune = db.transaction(() => {
  const before = {
    events: db.prepare("SELECT COUNT(*) count FROM susa_education_events").get().count,
    infos: hasTable("susa_education_infos")
      ? db.prepare("SELECT COUNT(*) count FROM susa_education_infos").get().count
      : 0,
  };

  const removedEvents = db.prepare(`
    DELETE FROM susa_education_events
    WHERE COALESCE((${liveEntryProgramSqlClause()}), 0) = 0
  `).run().changes;

  const removedInfos = hasTable("susa_education_infos")
    ? db.prepare(`
      DELETE FROM susa_education_infos
      WHERE id NOT IN (
        SELECT DISTINCT education_info_id
        FROM susa_education_events
        WHERE education_info_id IS NOT NULL AND education_info_id != ''
      )
    `).run().changes
    : 0;

  setState("last_entry_program_prune", new Date().toISOString());

  return {
    before,
    removedEvents,
    removedInfos,
    after: {
      events: db.prepare("SELECT COUNT(*) count FROM susa_education_events").get().count,
      infos: hasTable("susa_education_infos")
        ? db.prepare("SELECT COUNT(*) count FROM susa_education_infos").get().count
        : 0,
    },
  };
});

try {
  console.log(JSON.stringify({ database: dbPath, ...prune() }, null, 2));
} finally {
  db.close();
}
