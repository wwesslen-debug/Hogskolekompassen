import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { liveEntryProgramSqlClause } from "./live-entry-programs.mjs";

const { Pool } = pg;

let pool;
let liveTablesKnown;
let programMeta;

export function isSupabaseLiveConfigured() {
  return Boolean(process.env.SUPABASE_DATABASE_URL);
}

function getPool() {
  if (!isSupabaseLiveConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL,
      max: Number(process.env.SUPABASE_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.SUPABASE_DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const client = getPool();
  if (!client) throw new Error("SUPABASE_DATABASE_URL is not configured.");
  return client.query(sql, params);
}

function loadProgramMeta() {
  if (!programMeta) {
    const file = path.join(process.cwd(), "data", "programs.json");
    const programs = JSON.parse(fs.readFileSync(file, "utf8"));
    programMeta = new Map(programs.map((program, index) => [index + 1, {
      id: index + 1,
      title: program.title,
      category: program.category,
    }]));
  }
  return programMeta;
}

export async function hasSupabaseLiveDataTables() {
  if (!isSupabaseLiveConfigured()) return false;
  if (liveTablesKnown !== undefined) return liveTablesKnown;
  const result = await query("SELECT to_regclass('public.susa_education_events') AS table_name");
  liveTablesKnown = Boolean(result.rows[0]?.table_name);
  return liveTablesKnown;
}

const liveSelectColumns = `
  id,
  education_info_id AS "educationInfoId",
  title,
  provider_name AS "providerName",
  provider_id AS "providerId",
  city,
  start_date AS "startDate",
  end_date AS "endDate",
  period,
  study_form AS "studyForm",
  study_pace AS "studyPace",
  language,
  credits,
  credits_unit AS "creditsUnit",
  level,
  kind,
  degree,
  student_aid AS "studentAid",
  eligibility,
  description,
  application_open AS "applicationOpen",
  application_deadline AS "applicationDeadline",
  application_url AS "applicationUrl",
  application_code AS "applicationCode",
  source_url AS "sourceUrl",
  school_type AS "schoolType",
  distance,
  subject_codes_json AS "subjectCodesJson",
  canonical_program_id AS "canonicalProgramId",
  link_score AS "linkScore",
  link_method AS "linkMethod",
  link_evidence_json AS "linkEvidenceJson",
  last_edited AS "lastEdited",
  synced_at AS "syncedAt"
`;

function mapLiveOffering(row) {
  let subjectCodes = [];
  let linkEvidence = {};
  try { subjectCodes = JSON.parse(row.subjectCodesJson || "[]"); } catch { subjectCodes = []; }
  try { linkEvidence = JSON.parse(row.linkEvidenceJson || "{}"); } catch { linkEvidence = {}; }
  const { subjectCodesJson, linkEvidenceJson, ...rest } = row;
  return {
    ...rest,
    distance: Boolean(Number(row.distance || 0)),
    linkScore: row.linkScore == null ? null : Math.round(Number(row.linkScore) * 100),
    subjectCodes,
    linkEvidence,
  };
}

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

function buildLiveWhere(filters = {}) {
  const clauses = [liveEntryProgramSqlClause()];
  const params = [];

  if (filters.search) {
    const terms = String(filters.search).trim().split(/\s+/).filter(Boolean).slice(0, 8);
    for (const term of terms) {
      const key = addParam(params, `%${term}%`);
      clauses.push(`(title ILIKE ${key} OR provider_name ILIKE ${key} OR description ILIKE ${key} OR city ILIKE ${key})`);
    }
  }
  if (filters.period) clauses.push(`period = ${addParam(params, filters.period)}`);
  if (filters.city) clauses.push(`city = ${addParam(params, filters.city)}`);
  if (filters.provider) clauses.push(`provider_name = ${addParam(params, filters.provider)}`);
  if (filters.kind) clauses.push(`kind = ${addParam(params, filters.kind)}`);
  if (filters.applicationStatus === "open") {
    clauses.push("NULLIF(application_deadline, '')::date >= current_date AND (application_open IS NULL OR application_open = '' OR NULLIF(application_open, '')::date <= current_date)");
  } else if (filters.applicationStatus === "future") {
    clauses.push("NULLIF(application_open, '')::date > current_date");
  } else if (filters.applicationStatus === "closed") {
    clauses.push("NULLIF(application_deadline, '')::date < current_date");
  } else if (filters.applicationStatus === "unknown") {
    clauses.push("(application_open IS NULL OR application_open = '') AND (application_deadline IS NULL OR application_deadline = '')");
  }
  if (filters.distance === true || filters.distance === "true" || filters.distance === "1") clauses.push("distance = 1");
  if (filters.programId) clauses.push(`canonical_program_id = ${addParam(params, Number(filters.programId))}`);
  if (filters.upcoming !== false) clauses.push("(start_date IS NULL OR start_date = '' OR NULLIF(start_date, '')::date >= current_date - interval '45 days')");

  return { where: `WHERE ${clauses.join(" AND ")}`, params };
}

export async function getSupabaseLiveOfferings(filters = {}) {
  if (!(await hasSupabaseLiveDataTables())) return [];
  const { where, params } = buildLiveWhere(filters);
  const requestedLimit = Number(filters.limit || 120);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 120, 500));
  const offset = Math.max(0, Number(filters.offset || 0) || 0);
  const result = await query(`
    SELECT ${liveSelectColumns}
    FROM susa_education_events
    ${where}
    ORDER BY CASE WHEN start_date IS NULL THEN 1 ELSE 0 END, start_date, provider_name, title
    LIMIT ${addParam(params, limit)} OFFSET ${addParam(params, offset)}
  `, params);
  return result.rows.map(mapLiveOffering);
}

export async function getSupabaseLiveOfferingCount(filters = {}) {
  if (!(await hasSupabaseLiveDataTables())) return 0;
  const { where, params } = buildLiveWhere(filters);
  const result = await query(`SELECT COUNT(*)::int AS count FROM susa_education_events ${where}`, params);
  return Number(result.rows[0]?.count || 0);
}

export async function getSupabaseLiveFilterOptions() {
  if (!(await hasSupabaseLiveDataTables())) return { periods: [], cities: [], providers: [], kinds: [] };
  const baseWhere = liveEntryProgramSqlClause();
  const [periods, cities, providers, kinds] = await Promise.all([
    query(`SELECT period FROM susa_education_events WHERE period IS NOT NULL AND ${baseWhere} GROUP BY period ORDER BY MIN(start_date)`),
    query(`SELECT DISTINCT city FROM susa_education_events WHERE city IS NOT NULL AND city != '' AND ${baseWhere} ORDER BY city`),
    query(`SELECT DISTINCT provider_name AS value FROM susa_education_events WHERE provider_name IS NOT NULL AND provider_name != '' AND ${baseWhere} ORDER BY provider_name`),
    query(`SELECT DISTINCT kind FROM susa_education_events WHERE kind IS NOT NULL AND kind != '' AND ${baseWhere} ORDER BY kind`),
  ]);
  return {
    periods: periods.rows.map((row) => row.period),
    cities: cities.rows.map((row) => row.city),
    providers: providers.rows.map((row) => row.value),
    kinds: kinds.rows.map((row) => row.kind),
  };
}

export async function getSupabaseLiveDataStatus() {
  if (!(await hasSupabaseLiveDataTables())) {
    return {
      ready: false,
      eventCount: 0,
      linkedCount: 0,
      providerCount: 0,
      periods: [],
      lastSync: null,
      source: "supabase",
    };
  }

  const baseWhere = liveEntryProgramSqlClause();
  const [counts, periods, lastSync, schoolType] = await Promise.all([
    query(`
      SELECT
        COUNT(*)::int AS "eventCount",
        COUNT(*) FILTER (WHERE canonical_program_id IS NOT NULL)::int AS "linkedCount",
        COUNT(DISTINCT provider_name)::int AS "providerCount"
      FROM susa_education_events
      WHERE ${baseWhere}
    `),
    query(`SELECT period, COUNT(*)::int AS count FROM susa_education_events WHERE period IS NOT NULL AND ${baseWhere} GROUP BY period ORDER BY MIN(start_date)`),
    query("SELECT value, updated_at AS \"updatedAt\" FROM susa_sync_state WHERE key='last_successful_sync' LIMIT 1"),
    query("SELECT value FROM susa_sync_state WHERE key='susa_school_type' LIMIT 1"),
  ]);

  const row = counts.rows[0] || {};
  const eventCount = Number(row.eventCount || 0);
  const linkedCount = Number(row.linkedCount || 0);
  return {
    ready: true,
    eventCount,
    linkedCount,
    linkRate: eventCount ? Number((linkedCount / eventCount * 100).toFixed(1)) : 0,
    providerCount: Number(row.providerCount || 0),
    periods: periods.rows,
    lastSync: lastSync.rows[0] || null,
    schoolType: schoolType.rows[0]?.value || "HS",
    source: "supabase",
  };
}

export async function getSupabaseLiveRecommendationsForPrograms(programIds = [], options = {}) {
  if (!(await hasSupabaseLiveDataTables())) return [];
  const ids = [...new Set(programIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 30);
  if (!ids.length) return [];
  const requestedLimit = Math.max(1, Math.min(60, Number(options.limit || 18)));
  const result = await query(`
    SELECT ${liveSelectColumns}
    FROM susa_education_events
    WHERE canonical_program_id = ANY($1::int[])
      AND ${liveEntryProgramSqlClause()}
      AND (start_date IS NULL OR start_date = '' OR NULLIF(start_date, '')::date >= current_date - interval '45 days')
    ORDER BY
      CASE WHEN kind='program' THEN 0 WHEN kind='course' OR kind='kurs' THEN 2 ELSE 1 END,
      CASE WHEN NULLIF(application_deadline, '')::date >= current_date
             AND (application_open IS NULL OR application_open = '' OR NULLIF(application_open, '')::date <= current_date) THEN 0 ELSE 1 END,
      COALESCE(link_score, 0) DESC,
      CASE WHEN start_date IS NULL THEN 1 ELSE 0 END,
      start_date,
      provider_name,
      title
    LIMIT $2
  `, [ids, requestedLimit * 4]);

  const perProgram = Math.max(1, Math.min(6, Number(options.perProgram || 3)));
  const counts = new Map();
  const seen = new Set();
  const picked = [];
  for (const row of result.rows.map(mapLiveOffering)) {
    const canonicalId = Number(row.canonicalProgramId);
    const count = counts.get(canonicalId) || 0;
    if (count >= perProgram) continue;
    const key = `${row.educationInfoId || row.title}|${row.providerId || row.providerName}|${row.period || row.startDate || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.set(canonicalId, count + 1);
    picked.push(row);
    if (picked.length >= requestedLimit) break;
  }
  return picked;
}

export async function getSupabaseLiveLinkQuality(limit = 20) {
  if (!(await hasSupabaseLiveDataTables())) {
    return {
      ready: false, total: 0, linked: 0, unlinked: 0, linkRate: 0,
      confidence: { high: 0, medium: 0, exploratory: 0 },
      byKind: [], methods: [], topUnmatched: [], topCanonical: [],
      source: "supabase",
    };
  }

  const safeLimit = Math.max(5, Math.min(100, Number(limit || 20)));
  const baseWhere = liveEntryProgramSqlClause();
  const [totals, confidence, byKind, methods, topUnmatched, topCanonicalRows] = await Promise.all([
    query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE canonical_program_id IS NOT NULL)::int AS linked
      FROM susa_education_events WHERE ${baseWhere}
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE canonical_program_id IS NOT NULL AND link_score >= 0.75)::int AS high,
        COUNT(*) FILTER (WHERE canonical_program_id IS NOT NULL AND link_score >= 0.55 AND link_score < 0.75)::int AS medium,
        COUNT(*) FILTER (WHERE canonical_program_id IS NOT NULL AND link_score < 0.55)::int AS exploratory
      FROM susa_education_events WHERE ${baseWhere}
    `),
    query(`
      SELECT COALESCE(NULLIF(kind,''), 'okänd') AS kind,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE canonical_program_id IS NOT NULL)::int AS linked
      FROM susa_education_events WHERE ${baseWhere}
      GROUP BY COALESCE(NULLIF(kind,''), 'okänd') ORDER BY total DESC
    `),
    query(`
      SELECT COALESCE(NULLIF(link_method,''), 'okänd') AS method, COUNT(*)::int AS count
      FROM susa_education_events
      WHERE (${baseWhere}) AND canonical_program_id IS NOT NULL
      GROUP BY COALESCE(NULLIF(link_method,''), 'okänd') ORDER BY count DESC
    `),
    query(`
      SELECT title, COALESCE(provider_name, 'Okänt lärosäte') AS "providerName",
        COALESCE(kind, 'okänd') AS kind, COUNT(*)::int AS events
      FROM susa_education_events
      WHERE (${baseWhere}) AND canonical_program_id IS NULL
      GROUP BY education_info_id, title, provider_name, kind
      ORDER BY events DESC, title
      LIMIT $1
    `, [safeLimit]),
    query(`
      SELECT canonical_program_id AS id,
        COUNT(*)::int AS events,
        ROUND((AVG(link_score) * 100)::numeric, 1)::float AS "avgLinkScore"
      FROM susa_education_events
      WHERE (${baseWhere}) AND canonical_program_id IS NOT NULL
      GROUP BY canonical_program_id
      ORDER BY events DESC
      LIMIT $1
    `, [safeLimit]),
  ]);

  const total = Number(totals.rows[0]?.total || 0);
  const linked = Number(totals.rows[0]?.linked || 0);
  const meta = loadProgramMeta();
  const topCanonical = topCanonicalRows.rows.map((row) => {
    const program = meta.get(Number(row.id));
    return {
      ...row,
      title: program?.title || `Profil ${row.id}`,
      category: program?.category || "Okänt område",
    };
  });

  return {
    ready: true,
    total,
    linked,
    unlinked: total - linked,
    linkRate: total ? Number((linked / total * 100).toFixed(1)) : 0,
    confidence: {
      high: Number(confidence.rows[0]?.high || 0),
      medium: Number(confidence.rows[0]?.medium || 0),
      exploratory: Number(confidence.rows[0]?.exploratory || 0),
    },
    byKind: byKind.rows,
    methods: methods.rows,
    topUnmatched: topUnmatched.rows,
    topCanonical,
    source: "supabase",
  };
}
