import Database from "better-sqlite3";
import { getDbPath } from "../lib/runtime-paths.mjs";

const db = new Database(getDbPath(), { readonly: true });
const hasTable = (name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
if (!hasTable("susa_education_events")) {
  console.log("v0.6-tabellerna saknas. Kör npm run db:migrate:v06.");
  process.exit(0);
}

const eventColumns = new Set(db.prepare("PRAGMA table_info(susa_education_events)").all().map((row) => row.name));
const counts = {
  providers: db.prepare("SELECT COUNT(*) count FROM susa_providers").get().count,
  educationInfos: db.prepare("SELECT COUNT(*) count FROM susa_education_infos WHERE school_type='HS'").get().count,
  educationEvents: db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE school_type='HS'").get().count,
  linkedEvents: db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE school_type='HS' AND canonical_program_id IS NOT NULL").get().count,
  applicationsOpenNow: db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE school_type='HS' AND application_deadline IS NOT NULL AND date(application_deadline) >= date('now') AND (application_open IS NULL OR date(application_open) <= date('now'))").get().count,
};
const linkRatePercent = counts.educationEvents ? Number((counts.linkedEvents / counts.educationEvents * 100).toFixed(1)) : 0;
const confidence = db.prepare(`
  SELECT
    SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score >= .75 THEN 1 ELSE 0 END) high,
    SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score >= .55 AND link_score < .75 THEN 1 ELSE 0 END) medium,
    SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score < .55 THEN 1 ELSE 0 END) exploratory
  FROM susa_education_events WHERE school_type='HS'
`).get();
const lastSync = db.prepare("SELECT value, updated_at FROM susa_sync_state WHERE key='last_successful_sync'").get();
const lastRelink = hasTable("susa_sync_state") ? db.prepare("SELECT value, updated_at FROM susa_sync_state WHERE key='last_relink'").get() : null;
const linkModel = hasTable("susa_sync_state") ? db.prepare("SELECT value FROM susa_sync_state WHERE key='link_model_version'").get()?.value || null : null;
const schoolType = db.prepare("SELECT value FROM susa_sync_state WHERE key='susa_school_type'").get()?.value || "HS";
const periods = db.prepare("SELECT period, COUNT(*) count FROM susa_education_events WHERE school_type='HS' AND period IS NOT NULL GROUP BY period ORDER BY MIN(start_date) LIMIT 12").all();
const kinds = db.prepare("SELECT kind, COUNT(*) count FROM susa_education_events WHERE school_type='HS' AND kind IS NOT NULL GROUP BY kind ORDER BY count DESC").all();
const methods = eventColumns.has("link_method")
  ? db.prepare("SELECT COALESCE(link_method,'okänd') method, COUNT(*) count FROM susa_education_events WHERE school_type='HS' AND canonical_program_id IS NOT NULL GROUP BY COALESCE(link_method,'okänd') ORDER BY count DESC").all()
  : [];
console.log(JSON.stringify({
  schoolType,
  counts,
  linkRatePercent,
  linkConfidence: {
    high: Number(confidence.high || 0),
    medium: Number(confidence.medium || 0),
    exploratory: Number(confidence.exploratory || 0),
  },
  linkModel,
  lastSync: lastSync || null,
  lastRelink: lastRelink || null,
  periods,
  kinds,
  methods,
}, null, 2));
db.close();
