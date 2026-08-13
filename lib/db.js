import Database from "better-sqlite3";
import { enrichProgram } from "@/lib/program-insights";
import { getDbPath } from "./runtime-paths.mjs";

let database;
let liveTablesKnown;

export function getDb() {
  if (!database) {
    const file = getDbPath();
    database = new Database(file, { readonly: true, fileMustExist: true });
    database.pragma("query_only = ON");
  }
  return database;
}

function hasTable(name) {
  const db = getDb();
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

export function hasLiveEducationDataTables() {
  if (liveTablesKnown === undefined) liveTablesKnown = hasTable("susa_education_events");
  return liveTablesKnown;
}

export function getQuestions() {
  const db = getDb();
  return db.prepare(`
    SELECT id, section, text, weights_json AS weights, reverse_weights_json AS reverseWeights
    FROM questions
    ORDER BY id
  `).all().map((row) => ({
    ...row,
    weights: JSON.parse(row.weights),
    reverseWeights: JSON.parse(row.reverseWeights),
  }));
}

function buildProgramWhere(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.city) {
    clauses.push("city = @city");
    params.city = filters.city;
  }
  if (filters.category) {
    clauses.push("category = @category");
    params.category = filters.category;
  }
  if (filters.degree) {
    clauses.push("degree = @degree");
    params.degree = filters.degree;
  }
  if (filters.liveOnly && hasLiveEducationDataTables()) {
    clauses.push("EXISTS (SELECT 1 FROM susa_education_events se WHERE se.canonical_program_id = programs.id)");
  }

  if (filters.search) {
    const terms = String(filters.search).trim().split(/\s+/).filter(Boolean).slice(0, 8);
    terms.forEach((term, index) => {
      const key = `search${index}`;
      clauses.push(`(
        title LIKE @${key} OR institution LIKE @${key} OR category LIKE @${key} OR
        degree LIKE @${key} OR description LIKE @${key} OR tags_json LIKE @${key}
      )`);
      params[key] = `%${term}%`;
    });
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function mapProgram(row) {
  return enrichProgram({
    ...row,
    liveOfferCount: Number(row.liveOfferCount || 0),
    tags: JSON.parse(row.tags),
    vector: JSON.parse(row.vector),
  });
}

function selectColumns() {
  const liveColumn = hasLiveEducationDataTables()
    ? `, (SELECT COUNT(*) FROM susa_education_events se WHERE se.canonical_program_id = programs.id AND (se.start_date IS NULL OR se.start_date >= date('now', '-45 day'))) AS liveOfferCount`
    : `, 0 AS liveOfferCount`;
  return `
    id, title, institution, city, category, years, degree, study,
    description, tags_json AS tags, vector_json AS vector,
    data_status AS dataStatus, antagning_search AS antagningSearch
    ${liveColumn}
  `;
}

export function getPrograms(filters = {}) {
  const db = getDb();
  const { where, params } = buildProgramWhere(filters);
  const requestedLimit = Number(filters.limit || 500);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 500, 1000));

  return db.prepare(`
    SELECT ${selectColumns()}
    FROM programs
    ${where}
    ORDER BY CASE WHEN institution = 'Flera lärosäten' THEN 1 ELSE 0 END, institution, title
    LIMIT ${limit}
  `).all(params).map(mapProgram);
}

export function getProgramsByIds(ids = []) {
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 12);
  if (!clean.length) return [];
  const db = getDb();
  const placeholders = clean.map(() => "?").join(",");
  const rows = db.prepare(`SELECT ${selectColumns()} FROM programs WHERE id IN (${placeholders})`).all(...clean);
  const byId = new Map(rows.map((row) => [row.id, mapProgram(row)]));
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

export function getProgramById(id) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  const db = getDb();
  const row = db.prepare(`SELECT ${selectColumns()} FROM programs WHERE id = ?`).get(numeric);
  return row ? mapProgram(row) : null;
}

export function getRelatedPrograms(program, limit = 6) {
  if (!program) return [];
  const db = getDb();
  return db.prepare(`
    SELECT ${selectColumns()}
    FROM programs
    WHERE category = ? AND id != ?
    ORDER BY CASE WHEN institution = 'Flera lärosäten' THEN 1 ELSE 0 END, institution, title
    LIMIT ?
  `).all(program.category, program.id, Math.max(1, Math.min(limit, 12))).map(mapProgram);
}

export function getProgramCount(filters = {}) {
  const db = getDb();
  const { where, params } = buildProgramWhere(filters);
  return db.prepare(`SELECT COUNT(*) AS count FROM programs ${where}`).get(params).count;
}

export function getFilterOptions() {
  const db = getDb();
  return {
    cities: db.prepare("SELECT DISTINCT city FROM programs ORDER BY CASE WHEN city = 'Flera orter' THEN 1 ELSE 0 END, city").all().map((x) => x.city),
    categories: db.prepare("SELECT DISTINCT category FROM programs ORDER BY category").all().map((x) => x.category),
    degrees: db.prepare("SELECT DISTINCT degree FROM programs ORDER BY degree").all().map((x) => x.degree),
  };
}

const liveSelectColumns = `
  id, education_info_id AS educationInfoId, title, provider_name AS providerName,
  provider_id AS providerId, city, start_date AS startDate, end_date AS endDate,
  period, study_form AS studyForm, study_pace AS studyPace, language, credits,
  credits_unit AS creditsUnit, level, kind, degree, student_aid AS studentAid, eligibility, description,
  application_open AS applicationOpen, application_deadline AS applicationDeadline,
  application_url AS applicationUrl, application_code AS applicationCode,
  source_url AS sourceUrl, school_type AS schoolType, distance,
  subject_codes_json AS subjectCodesJson, canonical_program_id AS canonicalProgramId, link_score AS linkScore,
  link_method AS linkMethod, link_evidence_json AS linkEvidenceJson,
  last_edited AS lastEdited, synced_at AS syncedAt
`;

function mapLiveOffering(row) {
  if (!row) return null;
  let subjectCodes = [];
  let linkEvidence = {};
  try { subjectCodes = JSON.parse(row.subjectCodesJson || "[]"); } catch { subjectCodes = []; }
  try { linkEvidence = JSON.parse(row.linkEvidenceJson || "{}"); } catch { linkEvidence = {}; }
  const { subjectCodesJson, linkEvidenceJson, ...rest } = row;
  return {
    ...rest,
    distance: Boolean(row.distance),
    linkScore: row.linkScore == null ? null : Math.round(Number(row.linkScore) * 100),
    subjectCodes,
    linkEvidence,
  };
}

function buildLiveWhere(filters = {}) {
  const clauses = [];
  const params = {};
  clauses.push("(school_type IS NULL OR school_type = 'HS')");
  if (filters.search) {
    const terms = String(filters.search).trim().split(/\s+/).filter(Boolean).slice(0, 8);
    terms.forEach((term, index) => {
      const key = `search${index}`;
      clauses.push(`(title LIKE @${key} OR provider_name LIKE @${key} OR description LIKE @${key} OR city LIKE @${key})`);
      params[key] = `%${term}%`;
    });
  }
  if (filters.period) { clauses.push("period = @period"); params.period = filters.period; }
  if (filters.city) { clauses.push("city = @city"); params.city = filters.city; }
  if (filters.provider) { clauses.push("provider_name = @provider"); params.provider = filters.provider; }
  if (filters.kind) { clauses.push("kind = @kind"); params.kind = filters.kind; }
  if (filters.applicationStatus === "open") {
    clauses.push("application_deadline IS NOT NULL AND date(application_deadline) >= date('now') AND (application_open IS NULL OR date(application_open) <= date('now'))");
  } else if (filters.applicationStatus === "future") {
    clauses.push("application_open IS NOT NULL AND date(application_open) > date('now')");
  } else if (filters.applicationStatus === "closed") {
    clauses.push("application_deadline IS NOT NULL AND date(application_deadline) < date('now')");
  } else if (filters.applicationStatus === "unknown") {
    clauses.push("application_open IS NULL AND application_deadline IS NULL");
  }
  if (filters.distance === true || filters.distance === "true" || filters.distance === "1") clauses.push("distance = 1");
  if (filters.programId) { clauses.push("canonical_program_id = @programId"); params.programId = Number(filters.programId); }
  if (filters.upcoming !== false) clauses.push("(start_date IS NULL OR start_date >= date('now', '-45 day'))");
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function getLiveOfferings(filters = {}) {
  if (!hasLiveEducationDataTables()) return [];
  const db = getDb();
  const { where, params } = buildLiveWhere(filters);
  const requestedLimit = Number(filters.limit || 120);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 120, 500));
  const offset = Math.max(0, Number(filters.offset || 0) || 0);
  return db.prepare(`
    SELECT ${liveSelectColumns}
    FROM susa_education_events
    ${where}
    ORDER BY CASE WHEN start_date IS NULL THEN 1 ELSE 0 END, start_date, provider_name, title
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset }).map(mapLiveOffering);
}

export function getLiveOfferingCount(filters = {}) {
  if (!hasLiveEducationDataTables()) return 0;
  const db = getDb();
  const { where, params } = buildLiveWhere(filters);
  return db.prepare(`SELECT COUNT(*) count FROM susa_education_events ${where}`).get(params).count;
}

export function getLiveOfferingsForProgram(programId, limit = 10) {
  const numeric = Number(programId);
  if (!Number.isInteger(numeric) || numeric <= 0) return [];
  return getLiveOfferings({ programId: numeric, limit, upcoming: true });
}

export function getLiveFilterOptions() {
  if (!hasLiveEducationDataTables()) return { periods: [], cities: [], providers: [], kinds: [] };
  const db = getDb();
  return {
    periods: db.prepare("SELECT period FROM susa_education_events WHERE period IS NOT NULL AND (school_type IS NULL OR school_type='HS') GROUP BY period ORDER BY MIN(start_date)").all().map((x) => x.period),
    cities: db.prepare("SELECT DISTINCT city FROM susa_education_events WHERE city IS NOT NULL AND city != '' AND (school_type IS NULL OR school_type='HS') ORDER BY city").all().map((x) => x.city),
    providers: db.prepare("SELECT DISTINCT provider_name AS value FROM susa_education_events WHERE provider_name IS NOT NULL AND provider_name != '' AND (school_type IS NULL OR school_type='HS') ORDER BY provider_name").all().map((x) => x.value),
    kinds: db.prepare("SELECT DISTINCT kind FROM susa_education_events WHERE kind IS NOT NULL AND kind != '' AND (school_type IS NULL OR school_type='HS') ORDER BY kind").all().map((x) => x.kind),
  };
}

export function getLiveDataStatus() {
  if (!hasLiveEducationDataTables()) {
    return { ready: false, eventCount: 0, linkedCount: 0, providerCount: 0, periods: [], lastSync: null };
  }
  const db = getDb();
  const eventCount = db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE school_type IS NULL OR school_type='HS'").get().count;
  const linkedCount = db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE canonical_program_id IS NOT NULL AND (school_type IS NULL OR school_type='HS')").get().count;
  const providerCount = db.prepare("SELECT COUNT(DISTINCT provider_name) count FROM susa_education_events WHERE provider_name IS NOT NULL AND (school_type IS NULL OR school_type='HS')").get().count;
  const periods = db.prepare("SELECT period, COUNT(*) count FROM susa_education_events WHERE period IS NOT NULL AND (school_type IS NULL OR school_type='HS') GROUP BY period ORDER BY MIN(start_date)").all();
  const lastSync = hasTable("susa_sync_state")
    ? db.prepare("SELECT value, updated_at AS updatedAt FROM susa_sync_state WHERE key='last_successful_sync'").get() || null
    : null;
  const schoolType = hasTable("susa_sync_state")
    ? db.prepare("SELECT value FROM susa_sync_state WHERE key='susa_school_type'").get()?.value || "HS"
    : "HS";
  return { ready: true, eventCount, linkedCount, linkRate: eventCount ? Number((linkedCount / eventCount * 100).toFixed(1)) : 0, providerCount, periods, lastSync, schoolType };
}


export function getLiveRecommendationsForPrograms(programIds = [], options = {}) {
  if (!hasLiveEducationDataTables()) return [];
  const ids = [...new Set(programIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 30);
  if (!ids.length) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const requestedLimit = Math.max(1, Math.min(60, Number(options.limit || 18)));
  const rows = db.prepare(`
    SELECT ${liveSelectColumns}
    FROM susa_education_events
    WHERE canonical_program_id IN (${placeholders})
      AND (school_type IS NULL OR school_type='HS')
      AND (start_date IS NULL OR start_date >= date('now', '-45 day'))
    ORDER BY
      CASE WHEN kind='program' THEN 0 WHEN kind='course' OR kind='kurs' THEN 2 ELSE 1 END,
      CASE WHEN application_deadline IS NOT NULL AND date(application_deadline) >= date('now')
             AND (application_open IS NULL OR date(application_open) <= date('now')) THEN 0 ELSE 1 END,
      COALESCE(link_score, 0) DESC,
      CASE WHEN start_date IS NULL THEN 1 ELSE 0 END,
      start_date,
      provider_name,
      title
    LIMIT ?
  `).all(...ids, requestedLimit * 4).map(mapLiveOffering);

  const perProgram = Math.max(1, Math.min(6, Number(options.perProgram || 3)));
  const counts = new Map();
  const seen = new Set();
  const picked = [];
  for (const row of rows) {
    const canonicalId = Number(row.canonicalProgramId);
    const count = counts.get(canonicalId) || 0;
    if (count >= perProgram) continue;
    const key = `${row.educationInfoId || row.title}|${row.providerId || row.providerName}|${row.period || row.startDate || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.set(canonicalId, count + 1);
    picked.push(row);
    if (picked.length >= requestedLimit) break;
  }
  return picked;
}

export function getLiveLinkQuality(limit = 20) {
  if (!hasLiveEducationDataTables()) {
    return {
      ready: false, total: 0, linked: 0, unlinked: 0, linkRate: 0,
      confidence: { high: 0, medium: 0, exploratory: 0 },
      byKind: [], methods: [], topUnmatched: [], topCanonical: [],
    };
  }
  const db = getDb();
  const baseWhere = "school_type IS NULL OR school_type='HS'";
  const total = Number(db.prepare(`SELECT COUNT(*) n FROM susa_education_events WHERE ${baseWhere}`).get().n || 0);
  const linked = Number(db.prepare(`SELECT COUNT(*) n FROM susa_education_events WHERE (${baseWhere}) AND canonical_program_id IS NOT NULL`).get().n || 0);
  const confidence = db.prepare(`
    SELECT
      SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score >= 0.75 THEN 1 ELSE 0 END) high,
      SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score >= 0.55 AND link_score < 0.75 THEN 1 ELSE 0 END) medium,
      SUM(CASE WHEN canonical_program_id IS NOT NULL AND link_score < 0.55 THEN 1 ELSE 0 END) exploratory
    FROM susa_education_events WHERE ${baseWhere}
  `).get();
  const byKind = db.prepare(`
    SELECT COALESCE(NULLIF(kind,''), 'okänd') kind,
      COUNT(*) total,
      SUM(CASE WHEN canonical_program_id IS NOT NULL THEN 1 ELSE 0 END) linked
    FROM susa_education_events WHERE ${baseWhere}
    GROUP BY COALESCE(NULLIF(kind,''), 'okänd') ORDER BY total DESC
  `).all().map((row) => ({ ...row, total: Number(row.total), linked: Number(row.linked || 0) }));
  const methods = db.prepare(`
    SELECT COALESCE(NULLIF(link_method,''), 'okänd') method, COUNT(*) count
    FROM susa_education_events
    WHERE (${baseWhere}) AND canonical_program_id IS NOT NULL
    GROUP BY COALESCE(NULLIF(link_method,''), 'okänd') ORDER BY count DESC
  `).all().map((row) => ({ ...row, count: Number(row.count) }));
  const safeLimit = Math.max(5, Math.min(100, Number(limit || 20)));
  const topUnmatched = db.prepare(`
    SELECT title, COALESCE(provider_name, 'Okänt lärosäte') providerName,
      COALESCE(kind, 'okänd') kind, COUNT(*) events
    FROM susa_education_events
    WHERE (${baseWhere}) AND canonical_program_id IS NULL
    GROUP BY education_info_id, title, provider_name, kind
    ORDER BY events DESC, title
    LIMIT ?
  `).all(safeLimit).map((row) => ({ ...row, events: Number(row.events) }));
  const topCanonical = db.prepare(`
    SELECT p.id, p.title, p.category, COUNT(*) events, ROUND(AVG(e.link_score) * 100, 1) avgLinkScore
    FROM susa_education_events e
    JOIN programs p ON p.id=e.canonical_program_id
    WHERE ${baseWhere.replaceAll('school_type', 'e.school_type')}
    GROUP BY p.id, p.title, p.category
    ORDER BY events DESC
    LIMIT ?
  `).all(safeLimit).map((row) => ({ ...row, events: Number(row.events), avgLinkScore: Number(row.avgLinkScore || 0) }));
  return {
    ready: true,
    total,
    linked,
    unlinked: total - linked,
    linkRate: total ? Number((linked / total * 100).toFixed(1)) : 0,
    confidence: {
      high: Number(confidence.high || 0),
      medium: Number(confidence.medium || 0),
      exploratory: Number(confidence.exploratory || 0),
    },
    byKind,
    methods,
    topUnmatched,
    topCanonical,
  };
}
