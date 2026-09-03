import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { liveEntryProgramSqlClause } from "./live-entry-programs.mjs";
import { isShortSearchTerm, parseSearchQuery } from "./search.mjs";
import { inferLiveProgramProfile } from "@/lib/live-profile-inference";

const { Pool } = pg;

let pool;
let liveTablesKnown;
let analyticsTablesKnown;
let analyticsCleanupLastRun = 0;
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

async function ensureSupabaseAnalyticsTables() {
  if (!isSupabaseLiveConfigured()) return false;
  if (analyticsTablesKnown) return true;

  await query(`
    CREATE TABLE IF NOT EXISTS hk_analytics_daily (
      day date PRIMARY KEY,
      total_events integer NOT NULL DEFAULT 0,
      page_views integer NOT NULL DEFAULT 0,
      visits integer NOT NULL DEFAULT 0,
      starts integer NOT NULL DEFAULT 0,
      completions integer NOT NULL DEFAULT 0,
      result_views integer NOT NULL DEFAULT 0,
      application_clicks integer NOT NULL DEFAULT 0,
      compare_events integer NOT NULL DEFAULT 0,
      save_events integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS hk_analytics_event_daily (
      day date NOT NULL,
      event text NOT NULL,
      count integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (day, event)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS hk_analytics_path_daily (
      day date NOT NULL,
      path text NOT NULL,
      count integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (day, path)
    )
  `);
  await query("CREATE INDEX IF NOT EXISTS idx_hk_analytics_event_day ON hk_analytics_event_daily(day)");
  await query("CREATE INDEX IF NOT EXISTS idx_hk_analytics_path_day ON hk_analytics_path_daily(day)");
  analyticsTablesKnown = true;
  return true;
}

function analyticsDay(value) {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
}

async function maybeCleanupAnalytics() {
  const now = Date.now();
  if (now - analyticsCleanupLastRun < 60 * 60 * 1000) return;
  analyticsCleanupLastRun = now;
  await query("DELETE FROM hk_analytics_daily WHERE day < current_date - interval '400 days'");
  await query("DELETE FROM hk_analytics_event_daily WHERE day < current_date - interval '400 days'");
  await query("DELETE FROM hk_analytics_path_daily WHERE day < current_date - interval '400 days'");
}

export async function recordSupabaseAnalyticsEvent(record) {
  if (!(await ensureSupabaseAnalyticsTables())) return false;

  const event = String(record?.event || "").slice(0, 80);
  if (!event) return false;

  const day = analyticsDay();
  const pathValue = String(record?.path || "").slice(0, 180);
  const counts = {
    pageViews: event === "page_view" ? 1 : 0,
    visits: event === "visit" ? 1 : 0,
    starts: event === "start_compass" ? 1 : 0,
    completions: event === "compass_completed" ? 1 : 0,
    resultViews: event === "view_results" ? 1 : 0,
    applicationClicks: event === "application_click" ? 1 : 0,
    compareEvents: event.startsWith("compare_") ? 1 : 0,
    saveEvents: ["save_program", "unsave_program", "saved_list_view"].includes(event) ? 1 : 0,
  };

  await query(`
    INSERT INTO hk_analytics_daily (
      day, total_events, page_views, visits, starts, completions, result_views,
      application_clicks, compare_events, save_events, updated_at
    )
    VALUES ($1::date, 1, $2, $3, $4, $5, $6, $7, $8, $9, now())
    ON CONFLICT (day) DO UPDATE SET
      total_events = hk_analytics_daily.total_events + 1,
      page_views = hk_analytics_daily.page_views + EXCLUDED.page_views,
      visits = hk_analytics_daily.visits + EXCLUDED.visits,
      starts = hk_analytics_daily.starts + EXCLUDED.starts,
      completions = hk_analytics_daily.completions + EXCLUDED.completions,
      result_views = hk_analytics_daily.result_views + EXCLUDED.result_views,
      application_clicks = hk_analytics_daily.application_clicks + EXCLUDED.application_clicks,
      compare_events = hk_analytics_daily.compare_events + EXCLUDED.compare_events,
      save_events = hk_analytics_daily.save_events + EXCLUDED.save_events,
      updated_at = now()
  `, [
    day,
    counts.pageViews,
    counts.visits,
    counts.starts,
    counts.completions,
    counts.resultViews,
    counts.applicationClicks,
    counts.compareEvents,
    counts.saveEvents,
  ]);

  await query(`
    INSERT INTO hk_analytics_event_daily (day, event, count, updated_at)
    VALUES ($1::date, $2, 1, now())
    ON CONFLICT (day, event) DO UPDATE SET
      count = hk_analytics_event_daily.count + 1,
      updated_at = now()
  `, [day, event]);

  if (event === "page_view" && pathValue) {
    await query(`
      INSERT INTO hk_analytics_path_daily (day, path, count, updated_at)
      VALUES ($1::date, $2, 1, now())
      ON CONFLICT (day, path) DO UPDATE SET
        count = hk_analytics_path_daily.count + 1,
        updated_at = now()
    `, [day, pathValue]);
  }

  await maybeCleanupAnalytics();
  return true;
}

function clampAnalyticsDays(days) {
  const number = Number(days || 30);
  return Math.max(1, Math.min(Number.isFinite(number) ? number : 30, 400));
}

function emptyAnalyticsOverview(days, overrides = {}) {
  return {
    configured: isSupabaseLiveConfigured(),
    ready: false,
    days,
    totals: {
      totalEvents: 0,
      pageViews: 0,
      visits: 0,
      starts: 0,
      completions: 0,
      resultViews: 0,
      applicationClicks: 0,
      compareEvents: 0,
      saveEvents: 0,
    },
    daily: [],
    events: [],
    paths: [],
    lastUpdated: null,
    ...overrides,
  };
}

export async function getSupabaseAnalyticsOverview(options = {}) {
  const days = clampAnalyticsDays(options.days);

  try {
    if (!(await ensureSupabaseAnalyticsTables())) return emptyAnalyticsOverview(days);

    const [daily, events, paths] = await Promise.all([
      query(`
        SELECT
          day::text AS day,
          total_events::int AS "totalEvents",
          page_views::int AS "pageViews",
          visits::int AS visits,
          starts::int AS starts,
          completions::int AS completions,
          result_views::int AS "resultViews",
          application_clicks::int AS "applicationClicks",
          compare_events::int AS "compareEvents",
          save_events::int AS "saveEvents",
          updated_at AS "updatedAt"
        FROM hk_analytics_daily
        WHERE day >= current_date - (($1::int - 1) * interval '1 day')
        ORDER BY day DESC
      `, [days]),
      query(`
        SELECT event, SUM(count)::int AS count
        FROM hk_analytics_event_daily
        WHERE day >= current_date - (($1::int - 1) * interval '1 day')
        GROUP BY event
        ORDER BY count DESC, event
      `, [days]),
      query(`
        SELECT path, SUM(count)::int AS count
        FROM hk_analytics_path_daily
        WHERE day >= current_date - (($1::int - 1) * interval '1 day')
        GROUP BY path
        ORDER BY count DESC, path
        LIMIT 20
      `, [days]),
    ]);

    const totals = daily.rows.reduce((sum, row) => ({
      totalEvents: sum.totalEvents + Number(row.totalEvents || 0),
      pageViews: sum.pageViews + Number(row.pageViews || 0),
      visits: sum.visits + Number(row.visits || 0),
      starts: sum.starts + Number(row.starts || 0),
      completions: sum.completions + Number(row.completions || 0),
      resultViews: sum.resultViews + Number(row.resultViews || 0),
      applicationClicks: sum.applicationClicks + Number(row.applicationClicks || 0),
      compareEvents: sum.compareEvents + Number(row.compareEvents || 0),
      saveEvents: sum.saveEvents + Number(row.saveEvents || 0),
    }), emptyAnalyticsOverview(days).totals);

    const updatedTimes = daily.rows
      .map((row) => row.updatedAt ? new Date(row.updatedAt).getTime() : 0)
      .filter(Number.isFinite);

    return {
      configured: true,
      ready: true,
      days,
      totals,
      daily: daily.rows,
      events: events.rows,
      paths: paths.rows,
      lastUpdated: updatedTimes.length ? new Date(Math.max(...updatedTimes)).toISOString() : null,
    };
  } catch (error) {
    return emptyAnalyticsOverview(days, {
      configured: true,
      error: error?.message || "Analytics data could not be loaded.",
    });
  }
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
  const offering = {
    ...rest,
    distance: Boolean(Number(row.distance || 0)),
    linkScore: row.linkScore == null ? null : Math.round(Number(row.linkScore) * 100),
    subjectCodes,
    linkEvidence,
  };
  const inferred = inferLiveProgramProfile(offering);
  return {
    ...offering,
    inferredCategory: inferred.category,
    inferredEvidence: inferred.inference.evidence,
  };
}

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

const searchColumns = ["title", "provider_name", "description", "city", "degree", "application_code"];
const searchTranslateFrom = "åäöéèêëáàâãíìîïóòôõúùûüçñ";
const searchTranslateTo = "aaoeeeeaaaaiiiioooouuuucn";

function escapeSqlLike(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

function escapeSqlRegex(value) {
  return String(value).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function normalizedSql(value, options = {}) {
  const translated = `TRANSLATE(LOWER(${value}), '${searchTranslateFrom}', '${searchTranslateTo}')`;
  if (options.keepSeparators) return translated;
  return `BTRIM(REGEXP_REPLACE(${translated}, '[^[:alnum:]]+', ' ', 'g'))`;
}

function normalizedColumn(name, options = {}) {
  return normalizedSql(`COALESCE(${name}, '')`, options);
}

function likeMatch(column, term, params) {
  const key = addParam(params, `%${escapeSqlLike(term)}%`);
  return `${normalizedColumn(column)} LIKE ${key} ESCAPE '\\'`;
}

function tokenMatch(column, term, params) {
  const key = addParam(params, `(^|[^[:alnum:]])${escapeSqlRegex(term)}([^[:alnum:]]|$)`);
  return `${normalizedColumn(column, { keepSeparators: true })} ~ ${key}`;
}

function termMatch(column, term, params) {
  return isShortSearchTerm(term) ? tokenMatch(column, term, params) : likeMatch(column, term, params);
}

function groupMatch(columns, group, params, options = {}) {
  const alternatives = group.alternatives.slice(0, options.maxAlternatives || 8);
  return `(${alternatives
    .map((term) => `(${columns.map((columnName) => termMatch(columnName, term, params)).join(" OR ")})`)
    .join(" OR ")})`;
}

function groupWithAlternatives(alternatives) {
  return { alternatives: alternatives.filter(Boolean) };
}

function primaryGroupMatch(columns, group, params) {
  return groupMatch(columns, groupWithAlternatives([group.term]), params, { maxAlternatives: 1 });
}

function synonymGroupMatch(columns, group, params, options = {}) {
  const alternatives = group.alternatives.slice(1, (options.maxAlternatives || 5));
  return alternatives.length ? groupMatch(columns, groupWithAlternatives(alternatives), params, options) : null;
}

function rankedGroupCase(column, group, params, primaryScore, synonymScore) {
  const primaryMatch = primaryGroupMatch([column], group, params);
  const synonymMatch = synonymGroupMatch([column], group, params, { maxAlternatives: 5 });
  return `CASE WHEN ${primaryMatch} THEN ${primaryScore} ${synonymMatch ? `WHEN ${synonymMatch} THEN ${synonymScore} ` : ""}ELSE 0 END`;
}

function buildLiveSearchOrder(search, params) {
  if (!search?.groups?.length) return null;

  const title = normalizedColumn("title");
  const provider = normalizedColumn("provider_name");
  const city = normalizedColumn("city");
  const description = normalizedColumn("description");
  const degree = normalizedColumn("degree");
  const applicationCode = normalizedColumn("application_code");
  const parts = [];

  if (search.phrase) {
    const exactPhrase = addParam(params, search.phrase);
    const phraseLike = addParam(params, `%${escapeSqlLike(search.phrase)}%`);
    const phrasePrefix = addParam(params, `${escapeSqlLike(search.phrase)}%`);
    parts.push(`CASE WHEN ${title} = ${exactPhrase} THEN 5000 ELSE 0 END`);
    parts.push(`CASE WHEN ${title} LIKE ${phrasePrefix} ESCAPE '\\' THEN 1800 ELSE 0 END`);
    parts.push(`CASE WHEN ${title} LIKE ${phraseLike} ESCAPE '\\' THEN 1200 ELSE 0 END`);
    parts.push(`CASE WHEN ${provider} = ${exactPhrase} THEN 900 ELSE 0 END`);
    parts.push(`CASE WHEN ${provider} LIKE ${phraseLike} ESCAPE '\\' THEN 450 ELSE 0 END`);
  }

  if (search.groups.length > 1) {
    const titleMatchesAllPrimaryTerms = search.groups
      .map((group) => primaryGroupMatch(["title"], group, params))
      .join(" AND ");
    const titleMatchesAllTerms = search.groups
      .map((group) => groupMatch(["title"], group, params, { maxAlternatives: 5 }))
      .join(" AND ");
    parts.push(`CASE WHEN ${titleMatchesAllPrimaryTerms} THEN 1400 WHEN ${titleMatchesAllTerms} THEN 800 ELSE 0 END`);
  }

  for (const group of search.groups) {
    parts.push(rankedGroupCase("title", group, params, 300, 180));
    parts.push(rankedGroupCase("degree", group, params, 80, 45));
    parts.push(rankedGroupCase("provider_name", group, params, 70, 35));
    parts.push(rankedGroupCase("city", group, params, 55, 25));
    parts.push(rankedGroupCase("description", group, params, 45, 30));
    parts.push(rankedGroupCase("application_code", group, params, 35, 20));
  }

  parts.push(`CASE WHEN ${applicationCode} = ${addParam(params, search.phrase)} THEN 1200 ELSE 0 END`);
  parts.push(`CASE WHEN ${description} LIKE ${addParam(params, `%${escapeSqlLike(search.phrase)}%`)} ESCAPE '\\' THEN 90 ELSE 0 END`);
  parts.push(`CASE WHEN ${city} = ${addParam(params, search.phrase)} THEN 120 ELSE 0 END`);

  return `(${parts.join(" + ")})`;
}

function liveDefaultOrderBy() {
  return `
      CASE
        WHEN start_date IS NULL OR start_date = '' OR start_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 2
        WHEN start_date::date >= current_date - interval '45 days' THEN 0
        ELSE 1
      END,
      CASE
        WHEN start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND start_date::date >= current_date - interval '45 days'
        THEN start_date::date
      END,
      CASE
        WHEN start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND start_date::date < current_date - interval '45 days'
        THEN start_date::date
      END DESC,
      provider_name,
      title
  `;
}

function buildLiveWhere(filters = {}) {
  const clauses = [liveEntryProgramSqlClause()];
  const params = [];
  const search = parseSearchQuery(filters.search);
  const ids = Array.isArray(filters.ids)
    ? [...new Set(filters.ids.map((id) => String(id ?? "").trim()).filter(Boolean))].slice(0, 200)
    : [];

  if (ids.length) clauses.push(`id = ANY(${addParam(params, ids)}::text[])`);
  if (search.groups.length) {
    for (const group of search.groups) clauses.push(groupMatch(searchColumns, group, params));
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

  return { where: `WHERE ${clauses.join(" AND ")}`, params, search };
}

export async function getSupabaseLiveOfferings(filters = {}) {
  if (!(await hasSupabaseLiveDataTables())) return [];
  const { where, params, search } = buildLiveWhere(filters);
  const searchOrder = buildLiveSearchOrder(search, params);
  const requestedLimit = Number(filters.limit || 120);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 120, 500));
  const offset = Math.max(0, Number(filters.offset || 0) || 0);
  const result = await query(`
    SELECT ${liveSelectColumns}
    FROM susa_education_events
    ${where}
    ORDER BY
      ${searchOrder ? `${searchOrder} DESC,` : ""}
      ${liveDefaultOrderBy()}
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

export async function getSupabaseLiveRecommendationCandidates(options = {}) {
  if (!(await hasSupabaseLiveDataTables())) return [];
  const requestedLimit = Math.max(1, Math.min(5000, Number(options.limit || 3500)));
  const result = await query(`
    SELECT ${liveSelectColumns}
    FROM susa_education_events
    WHERE ${liveEntryProgramSqlClause()}
      AND (start_date IS NULL OR start_date = '' OR NULLIF(start_date, '')::date >= current_date - interval '45 days')
    ORDER BY
      CASE WHEN kind='program' THEN 0 WHEN kind='course' OR kind='kurs' THEN 2 ELSE 1 END,
      CASE WHEN NULLIF(application_deadline, '')::date >= current_date
             AND (application_open IS NULL OR application_open = '' OR NULLIF(application_open, '')::date <= current_date) THEN 0 ELSE 1 END,
      CASE WHEN canonical_program_id IS NULL THEN 1 ELSE 0 END,
      COALESCE(link_score, 0) DESC,
      CASE WHEN start_date IS NULL THEN 1 ELSE 0 END,
      start_date,
      provider_name,
      title
    LIMIT $1
  `, [requestedLimit]);

  return result.rows.map(mapLiveOffering);
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
