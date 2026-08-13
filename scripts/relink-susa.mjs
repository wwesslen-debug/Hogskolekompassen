import Database from "better-sqlite3";
import { getDbPath } from "../lib/runtime-paths.mjs";
import {
  bestCanonicalMatch,
  normalizeEducationInfo,
} from "../lib/susa-normalize.mjs";

const args = process.argv.slice(2);
const argValue = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const LINK_THRESHOLD = Math.max(0.2, Math.min(0.8, Number(argValue("--link-threshold", "0.34")) || 0.34));
const HIGH_CONFIDENCE = Math.max(0.5, Math.min(0.9, Number(argValue("--evidence-threshold", "0.64")) || 0.64));
const dbPath = getDbPath();
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const required = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='susa_education_events'").get();
if (!required) {
  console.error("v0.6 live-data tables saknas. Kör npm run db:migrate:v06 först.");
  process.exit(1);
}

const eventColumns = new Set(db.prepare("PRAGMA table_info(susa_education_events)").all().map((row) => row.name));
if (!eventColumns.has("link_method")) {
  console.error("v0.7-kolumnerna saknas. Kör npm run db:migrate:v07 först.");
  process.exit(1);
}

const programs = db.prepare(`SELECT id, title, institution, category, degree, tags_json FROM programs`).all().map((row) => ({
  ...row,
  tags: JSON.parse(row.tags_json || "[]"),
}));

const infoRows = db.prepare(`
  SELECT id, title, description, school_type AS schoolType, level, kind, degree,
    student_aid AS studentAid, credits, credits_unit AS creditsUnit, eligibility,
    provider_name AS providerName, application_code AS applicationCode,
    urls_json AS urlsJson, subject_codes_json AS subjectCodesJson, raw_json AS rawJson
  FROM susa_education_infos
  WHERE school_type IS NULL OR school_type='HS'
`).all();

function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

function hydrateInfo(row) {
  const raw = safeJson(row.rawJson, null);
  const normalized = raw ? normalizeEducationInfo(raw) : null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    schoolType: row.schoolType || "HS",
    level: row.level,
    kind: row.kind,
    degree: row.degree,
    studentAid: row.studentAid,
    credits: row.credits,
    creditsUnit: row.creditsUnit,
    eligibility: row.eligibility,
    providerName: row.providerName,
    applicationCode: row.applicationCode,
    urlsJson: row.urlsJson,
    subjectCodes: normalized?.subjectCodes?.length
      ? normalized.subjectCodes
      : safeJson(row.subjectCodesJson, []),
  };
}

const infos = infoRows.map(hydrateInfo);

// Pass 1: only strong lexical matches are allowed to teach us how SUN subject codes
// distribute over Högskolekompassens own categories. This is deliberately conservative:
// subject codes refine a lexical match in pass 2 but can never create one from nothing.
const subjectCategoryCounts = new Map();
let strongEvidenceMatches = 0;
for (let infoIndex = 0; infoIndex < infos.length; infoIndex += 1) {
  const info = infos[infoIndex];
  if (infoIndex > 0 && infoIndex % 2500 === 0) process.stdout.write(`\r  Analys 1/2: ${infoIndex}/${infos.length} EducationInfo`);
  if (!info.subjectCodes?.length) continue;
  const match = bestCanonicalMatch(info, programs, HIGH_CONFIDENCE);
  if (!match) continue;
  strongEvidenceMatches += 1;
  for (const code of info.subjectCodes) {
    if (!subjectCategoryCounts.has(code)) subjectCategoryCounts.set(code, new Map());
    const bucket = subjectCategoryCounts.get(code);
    const weight = Math.max(0.5, match.score);
    bucket.set(match.program.category, (bucket.get(match.program.category) || 0) + weight);
  }
}

process.stdout.write(`\r  Analys 1/2: ${infos.length}/${infos.length} EducationInfo\n`);

const subjectCategoryEvidence = new Map();
for (const [code, bucket] of subjectCategoryCounts) {
  const total = [...bucket.values()].reduce((sum, value) => sum + value, 0);
  if (total < 2.5) continue;
  const probabilities = {};
  for (const [category, value] of bucket) probabilities[category] = value / total;
  const strongest = Math.max(...Object.values(probabilities));
  // Ignore ambiguous codes. They still remain stored for future/manual mappings.
  if (strongest >= 0.42) subjectCategoryEvidence.set(code, probabilities);
}

const events = db.prepare(`
  SELECT
    e.id,
    e.education_info_id AS educationInfoId,
    e.provider_name AS eventProviderName,
    e.provider_id AS providerId,
    e.city,
    e.start_date AS startDate,
    e.end_date AS endDate,
    e.period,
    e.study_form AS studyForm,
    e.study_pace AS studyPace,
    e.language,
    e.application_open AS applicationOpen,
    e.application_deadline AS applicationDeadline,
    e.application_url AS applicationUrl,
    e.source_url AS eventSourceUrl,
    e.distance,
    p.name AS providerName,
    p.website AS providerWebsite
  FROM susa_education_events e
  LEFT JOIN susa_providers p ON p.id = e.provider_id
  WHERE e.school_type IS NULL OR e.school_type='HS'
`).all();

const infoById = new Map(infos.map((item) => [item.id, item]));
const matchByInfoId = new Map();
let withInfo = 0;
let missingInfo = 0;
let linkedInfos = 0;

for (let infoIndex = 0; infoIndex < infos.length; infoIndex += 1) {
  const info = infos[infoIndex];
  const match = bestCanonicalMatch(info, programs, LINK_THRESHOLD, { subjectCategoryEvidence });
  matchByInfoId.set(info.id, match || null);
  if (match) linkedInfos += 1;
  if ((infoIndex + 1) % 2500 === 0 || infoIndex + 1 === infos.length) {
    process.stdout.write(`\r  Analys 2/2: ${infoIndex + 1}/${infos.length} EducationInfo`);
  }
}
process.stdout.write("\n");

const updateInfoSubjects = db.prepare(`UPDATE susa_education_infos SET subject_codes_json=@subjectCodesJson WHERE id=@id`);
const updateEvent = db.prepare(`
  UPDATE susa_education_events SET
    title=@title,
    provider_name=@providerName,
    credits=@credits,
    credits_unit=@creditsUnit,
    level=@level,
    kind=@kind,
    degree=@degree,
    student_aid=@studentAid,
    eligibility=@eligibility,
    description=@description,
    application_code=@applicationCode,
    source_url=@sourceUrl,
    school_type=@schoolType,
    subject_codes_json=@subjectCodesJson,
    canonical_program_id=@canonicalProgramId,
    link_score=@linkScore,
    link_method=@linkMethod,
    link_evidence_json=@linkEvidenceJson
  WHERE id=@id
`);

let linkedEvents = 0;
let changed = 0;
const methodCounts = new Map();
const now = new Date().toISOString();

function runWriteChunks(rows, chunkSize, label, handler) {
  let done = 0;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const batch = rows.slice(offset, offset + chunkSize);
    const tx = db.transaction((items) => {
      for (const item of items) handler(item);
    });
    tx(batch);
    done += batch.length;
    process.stdout.write(`\r  ${label}: ${done}/${rows.length}`);
  }
  process.stdout.write("\n");
}

runWriteChunks(infos, 1000, "Sparar ämneskoder", (info) => {
  updateInfoSubjects.run({ id: info.id, subjectCodesJson: JSON.stringify(info.subjectCodes || []) });
});

runWriteChunks(events, 750, "Länkar live-tillfällen", (row) => {
  const info = row.educationInfoId ? infoById.get(String(row.educationInfoId)) : null;
  if (!info) {
    missingInfo += 1;
    return;
  }
  withInfo += 1;
  const match = matchByInfoId.get(info.id) || null;
  if (match) {
    linkedEvents += 1;
    methodCounts.set(match.method, (methodCounts.get(match.method) || 0) + 1);
  }

  const urls = safeJson(info.urlsJson, []);
  const result = updateEvent.run({
    id: row.id,
    title: info.title,
    providerName: row.eventProviderName || info.providerName || row.providerName || null,
    credits: info.credits,
    creditsUnit: info.creditsUnit,
    level: info.level,
    kind: info.kind,
    degree: info.degree,
    studentAid: info.studentAid,
    eligibility: info.eligibility,
    description: info.description,
    applicationCode: info.applicationCode,
    sourceUrl: row.eventSourceUrl || urls[0] || row.providerWebsite || null,
    schoolType: info.schoolType || "HS",
    subjectCodesJson: JSON.stringify(info.subjectCodes || []),
    canonicalProgramId: match?.program?.id || null,
    linkScore: match ? Number(match.score.toFixed(4)) : null,
    linkMethod: match?.method || null,
    linkEvidenceJson: JSON.stringify(match ? {
      ...match.evidence,
      margin: match.margin,
      canonicalTitle: match.program.title,
      canonicalCategory: match.program.category,
    } : {}),
  });
  changed += result.changes;
});

db.prepare(`
  INSERT INTO susa_sync_state(key, value, updated_at) VALUES('last_relink', ?, ?)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
`).run(now, now);
db.prepare(`
  INSERT INTO susa_sync_state(key, value, updated_at) VALUES('link_model_version', 'v0.7.1-two-pass', ?)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
`).run(now);

const database = {
  events: db.prepare("SELECT COUNT(*) AS n FROM susa_education_events WHERE school_type IS NULL OR school_type='HS'").get().n,
  linked: db.prepare("SELECT COUNT(*) AS n FROM susa_education_events WHERE canonical_program_id IS NOT NULL AND (school_type IS NULL OR school_type='HS')").get().n,
  withEducationInfo: db.prepare("SELECT COUNT(*) AS n FROM susa_education_events e JOIN susa_education_infos i ON i.id=e.education_info_id WHERE e.school_type IS NULL OR e.school_type='HS'").get().n,
};

console.log("Högskolekompassen v0.7.1 · förbättrad relink av Susa-data");
console.log(JSON.stringify({
  linkThreshold: LINK_THRESHOLD,
  evidenceThreshold: HIGH_CONFIDENCE,
  canonicalProfiles: programs.length,
  educationInfos: infos.length,
  strongEvidenceMatches,
  learnedSubjectCodes: subjectCategoryEvidence.size,
  linkedInfos,
  scannedEvents: events.length,
  withInfo,
  missingInfo,
  updated: changed,
  linkedEvents,
  linkRatePercent: database.events ? Number((database.linked / database.events * 100).toFixed(1)) : 0,
  methods: Object.fromEntries([...methodCounts.entries()].sort((a, b) => b[1] - a[1])),
  database,
}, null, 2));

db.close();
