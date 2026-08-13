import Database from "better-sqlite3";
import { getDbPath } from "../lib/runtime-paths.mjs";

const dbPath = getDbPath();
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const hasEvents = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='susa_education_events'").get();
if (!hasEvents) {
  console.error("Live-tabeller saknas. Kör npm run db:migrate:v06 först.");
  process.exit(1);
}

const columns = new Set(db.prepare("PRAGMA table_info(susa_education_events)").all().map((row) => row.name));
const hasV07 = columns.has("link_method");
const where = "school_type IS NULL OR school_type='HS'";
const total = Number(db.prepare(`SELECT COUNT(*) n FROM susa_education_events WHERE ${where}`).get().n || 0);
const linked = Number(db.prepare(`SELECT COUNT(*) n FROM susa_education_events WHERE (${where}) AND canonical_program_id IS NOT NULL`).get().n || 0);
const confidence = db.prepare(`
  SELECT
    SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score >= 0.75 THEN 1 ELSE 0 END) high,
    SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score >= 0.55 AND link_score < 0.75 THEN 1 ELSE 0 END) medium,
    SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score < 0.55 THEN 1 ELSE 0 END) exploratory
  FROM susa_education_events WHERE ${where}
`).get();

const byKind = db.prepare(`
  SELECT COALESCE(NULLIF(kind,''), 'okänd') kind, COUNT(*) total,
    SUM(CASE WHEN canonical_program_id IS NOT NULL THEN 1 ELSE 0 END) linked
  FROM susa_education_events WHERE ${where}
  GROUP BY COALESCE(NULLIF(kind,''), 'okänd') ORDER BY total DESC
`).all();

const topUnmatched = db.prepare(`
  SELECT title, COALESCE(provider_name, 'Okänt lärosäte') provider,
    COALESCE(kind, 'okänd') kind, COUNT(*) events
  FROM susa_education_events
  WHERE (${where}) AND canonical_program_id IS NULL
  GROUP BY education_info_id, title, provider_name, kind
  ORDER BY events DESC, title
  LIMIT 25
`).all();

const topCanonical = db.prepare(`
  SELECT p.title, p.category, COUNT(*) events, ROUND(AVG(e.link_score) * 100, 1) avgScore
  FROM susa_education_events e JOIN programs p ON p.id=e.canonical_program_id
  WHERE e.school_type IS NULL OR e.school_type='HS'
  GROUP BY p.id, p.title, p.category ORDER BY events DESC LIMIT 20
`).all();

const methods = hasV07 ? db.prepare(`
  SELECT COALESCE(NULLIF(link_method,''), 'okänd') method, COUNT(*) count
  FROM susa_education_events
  WHERE (${where}) AND canonical_program_id IS NOT NULL
  GROUP BY COALESCE(NULLIF(link_method,''), 'okänd') ORDER BY count DESC
`).all() : [];

console.log("Högskolekompassen v0.7 · länk-kvalitet\n");
console.log(JSON.stringify({
  total,
  linked,
  unlinked: total - linked,
  linkRatePercent: total ? Number((linked / total * 100).toFixed(1)) : 0,
  confidence: {
    high: Number(confidence.high || 0),
    medium: Number(confidence.medium || 0),
    exploratory: Number(confidence.exploratory || 0),
  },
}, null, 2));
console.log("\nPer utbildningstyp:");
console.table(byKind.map((row) => ({
  kind: row.kind,
  total: Number(row.total),
  linked: Number(row.linked || 0),
  rate: row.total ? `${(Number(row.linked || 0) / Number(row.total) * 100).toFixed(1)}%` : "0%",
})));
if (methods.length) {
  console.log("\nLänkmetoder:");
  console.table(methods);
}
console.log("\nVanligaste omatchade utbildningar:");
console.table(topUnmatched);
console.log("\nCanonical-profiler med flest live-tillfällen:");
console.table(topCanonical);

db.close();
