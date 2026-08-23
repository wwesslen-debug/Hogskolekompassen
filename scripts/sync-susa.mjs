import Database from "better-sqlite3";
import path from "node:path";
import { getDbPath, getSusaCacheDir } from "../lib/runtime-paths.mjs";
import fs from "node:fs";
import {
  extractItems,
  extractNextUrl,
  isDeletedRecord,
  itemId,
  looksLikeHigherEducation,
  normalizeEducationEvent,
  normalizeEducationInfo,
  normalizeProvider,
  schoolTypeCode,
} from "../lib/susa-normalize.mjs";
import { liveEntryProgramSqlClause } from "../lib/live-entry-programs.mjs";

const args = process.argv.slice(2);
const argValue = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const hasArg = (name) => args.includes(name);

const API_BASE = (argValue("--base-url") || process.env.SUSA_API_BASE_URL || "https://api.skolverket.se/susa-navet/emil3").replace(/\/$/, "");
const SCHOOL_TYPE = hasArg("--no-school-type")
  ? null
  : argValue("--school-type", process.env.SUSA_SCHOOL_TYPE || "HS");
const FULL = hasArg("--full");
const PROBE = hasArg("--probe");
const DISCOVER_TYPES = hasArg("--discover-types");
const KEEP_UNFILTERED = hasArg("--keep-unfiltered");
const MAX_PAGES = Math.max(1, Number(argValue("--max-pages", process.env.SUSA_MAX_PAGES || "1000")) || 500);
const PROBE_PAGES = Math.max(1, Number(argValue("--probe-pages", "2")) || 2);
const dbPath = getDbPath();
const cacheDir = getSusaCacheDir();
const RESET_CACHE = hasArg("--reset-cache");
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchResponse(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Hogskolekompassen/0.7.1 (+local sync; Skolverket Susa-navet)",
      },
      signal: controller.signal,
    });

    const transient = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
    if (transient && attempt < 8) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const exponential = Math.min(60000, 5000 * (2 ** (attempt - 1)));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : exponential;
      console.warn(`\n  Susa-navet svarade HTTP ${response.status}. Försök ${attempt}/8 misslyckades; väntar ${Math.ceil(waitMs / 1000)} s och försöker igen…`);
      await sleep(waitMs);
      return fetchResponse(url, attempt + 1);
    }
    return response;
  } catch (error) {
    if (attempt < 8 && (error?.name === "AbortError" || error instanceof TypeError)) {
      const waitMs = Math.min(60000, 5000 * (2 ** (attempt - 1)));
      console.warn(`\n  Tillfälligt nätverksfel mot Susa-navet. Försök ${attempt}/8 misslyckades; väntar ${Math.ceil(waitMs / 1000)} s och försöker igen…`);
      await sleep(waitMs);
      return fetchResponse(url, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonPage(url) {
  const response = await fetchResponse(url);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    const snippet = text.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`Susa-navet svarade inte med JSON (${response.status}). ${snippet}`);
  }
  return { response, payload };
}

function buildCollectionUrl(collection, { updatedSince, schoolType } = {}) {
  const url = new URL(`${API_BASE}/${collection}`);
  if (updatedSince) url.searchParams.set("updatedSince", updatedSince);
  if (schoolType) url.searchParams.set("schoolType", schoolType);
  return url.toString();
}

function forceAdvancePaginationUrl(currentUrl, itemCount, pagesFetched) {
  try {
    const url = new URL(currentUrl);

    // Prefer the paging parameter that the API itself put in the current URL.
    for (const key of ["page", "pageNumber", "pageNo", "pageIndex"]) {
      if (!url.searchParams.has(key)) continue;
      const value = Number(url.searchParams.get(key));
      if (!Number.isFinite(value)) continue;
      url.searchParams.set(key, String(value + 1));
      return url.toString();
    }

    // Also support offset-based pagination if Skolverket changes representation.
    for (const key of ["offset", "start", "startIndex"]) {
      if (!url.searchParams.has(key)) continue;
      const value = Number(url.searchParams.get(key));
      if (!Number.isFinite(value)) continue;
      url.searchParams.set(key, String(value + Math.max(1, itemCount)));
      return url.toString();
    }

    // Last-resort fallback for a page-based endpoint. This is only used after
    // the API has advertised a next page but returned a repeated next-link.
    // Most Spring-style APIs are zero-based, hence pagesFetched after page 1 is 1.
    url.searchParams.set("page", String(pagesFetched));
    return url.toString();
  } catch {
    return null;
  }
}

function cachePaths(collection, options = {}) {
  const school = String(options.schoolType || "all").replace(/[^a-z0-9_-]/gi, "_");
  const mode = options.updatedSince ? "delta" : "full";
  const stem = `${mode}-${school}-${collection}`;
  return {
    meta: path.join(cacheDir, `${stem}.json`),
    data: path.join(cacheDir, `${stem}.ndjson`),
  };
}

function removeCache(paths) {
  for (const file of [paths.meta, paths.data]) {
    try { fs.rmSync(file, { force: true }); } catch {}
  }
}

function readCachedItems(dataPath) {
  if (!fs.existsSync(dataPath)) return [];
  const text = fs.readFileSync(dataPath, "utf8");
  if (!text.trim()) return [];
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch {}
  }
  return rows;
}

function writeCacheMeta(metaPath, state) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify({ ...state, savedAt: new Date().toISOString() }, null, 2));
}

async function collect(collection, options = {}) {
  let filtered = Boolean(options.schoolType);
  let usedDelta = Boolean(options.updatedSince);
  let currentUrl = buildCollectionUrl(collection, options);
  let page = 0;
  const pageLimit = options.maxPages || MAX_PAGES;
  const allowPartial = Boolean(options.allowPartial);
  const quietPagination = Boolean(options.quietPagination);
  const items = [];
  const visited = new Set();
  const seenRecords = new Set();
  let observedPageSize = 0;
  const cache = options.resumeCache ? cachePaths(collection, options) : null;

  const recordKey = (item) => {
    const id = itemId(item);
    if (id) return `id:${id}`;
    try {
      return `json:${JSON.stringify(item)}`;
    } catch {
      return null;
    }
  };

  if (cache) {
    fs.mkdirSync(cacheDir, { recursive: true });
    if (RESET_CACHE) removeCache(cache);
    if (fs.existsSync(cache.meta) && fs.existsSync(cache.data)) {
      try {
        const meta = JSON.parse(fs.readFileSync(cache.meta, "utf8"));
        const age = Date.now() - new Date(meta.savedAt || 0).getTime();
        const compatible = age >= 0 && age <= CACHE_MAX_AGE_MS && meta.collection === collection && meta.schoolType === (options.schoolType || null);
        if (compatible) {
          const cached = readCachedItems(cache.data);
          for (const item of cached) {
            const key = recordKey(item);
            if (key && seenRecords.has(key)) continue;
            if (key) seenRecords.add(key);
            items.push(item);
          }
          page = Number(meta.page || 0);
          observedPageSize = Number(meta.observedPageSize || 0);
          filtered = Boolean(meta.filtered);
          usedDelta = Boolean(meta.usedDelta);
          if (meta.completed) {
            console.log(`  ${collection}: återanvänder checkpoint med ${items.length} poster (${page} sidor).`);
            return { items, apiFilteredBySchoolType: filtered && Boolean(options.schoolType), usedDelta };
          }
          if (meta.nextUrl) {
            currentUrl = meta.nextUrl;
            console.log(`  ${collection}: återupptar från checkpoint efter ${page} sidor / ${items.length} poster.`);
          }
        } else {
          removeCache(cache);
        }
      } catch {
        removeCache(cache);
      }
    }
  }

  while (currentUrl && page < pageLimit) {
    if (visited.has(currentUrl)) {
      // A repeated URL is only a fatal loop if we cannot safely terminate.
      // In practice EMIL3 may advertise a stale next-link at the end of a collection.
      console.warn(`\n  ${collection}: repeated page URL detected; stopping pagination safely.`);
      currentUrl = null;
      break;
    }
    visited.add(currentUrl);

    const { response, payload } = await fetchJsonPage(currentUrl);

    if (!response.ok) {
      // Be defensive against future parameter-name/code changes in the public API.
      if ((response.status === 400 || response.status === 422) && (filtered || usedDelta) && page === 0) {
        if (filtered) {
          console.warn(`  ${collection}: schoolType=${options.schoolType} rejected (${response.status}); retrying without schoolType and filtering locally.`);
          filtered = false;
          currentUrl = buildCollectionUrl(collection, { updatedSince: usedDelta ? options.updatedSince : null });
          continue;
        }
        if (usedDelta) {
          console.warn(`  ${collection}: updatedSince rejected (${response.status}); falling back to a full collection fetch.`);
          usedDelta = false;
          currentUrl = buildCollectionUrl(collection, {});
          continue;
        }
      }
      const message = typeof payload === "object" ? JSON.stringify(payload).slice(0, 500) : String(payload).slice(0, 500);
      throw new Error(`${collection}: HTTP ${response.status}. ${message}`);
    }

    const pageItems = extractItems(payload, collection);
    const previousPageSize = observedPageSize;
    if (pageItems.length > observedPageSize) observedPageSize = pageItems.length;

    const newItems = [];
    for (const item of pageItems) {
      const key = recordKey(item);
      if (key && seenRecords.has(key)) continue;
      if (key) seenRecords.add(key);
      newItems.push(item);
    }
    items.push(...newItems);
    page += 1;
    if (cache && newItems.length) {
      fs.appendFileSync(cache.data, newItems.map((item) => JSON.stringify(item)).join("\n") + "\n");
    }
    process.stdout.write(`\r  ${collection}: ${items.length} unique records (${page} page${page === 1 ? "" : "s"})`);

    // Strong termination signals. These prevent a stale rel=next link from making us
    // manufacture hundreds of empty pages after the real last page.
    if (pageItems.length === 0) {
      process.stdout.write(`\n  ${collection}: empty page reached; collection complete.`);
      currentUrl = null;
      break;
    }
    if (newItems.length === 0) {
      process.stdout.write(`\n  ${collection}: page contained no new records; collection complete.`);
      currentUrl = null;
      break;
    }

    let nextUrl = extractNextUrl(payload, response.headers, currentUrl, pageItems.length);

    // EMIL3 has returned a repeated rel=next URL in live use. If the current page
    // is shorter than earlier pages, it is the natural last page: do not invent a
    // new page number. Otherwise advance explicitly as a compatibility fallback.
    if (nextUrl && visited.has(nextUrl)) {
      const isShortFinalPage = previousPageSize > 0 && pageItems.length < previousPageSize;
      if (isShortFinalPage) {
        process.stdout.write(`\n  ${collection}: repeated next-link after a short final page (${pageItems.length}/${previousPageSize}); collection complete.`);
        nextUrl = null;
      } else {
        const forced = forceAdvancePaginationUrl(currentUrl, pageItems.length, page);
        if (forced && !visited.has(forced)) {
          if (!quietPagination) process.stdout.write(`\n  ${collection}: repeated next-link detected; advancing pagination explicitly.`);
          nextUrl = forced;
        } else {
          process.stdout.write(`\n  ${collection}: repeated next-link detected and no safe next page could be derived; stopping this collection.`);
          nextUrl = null;
        }
      }
    }

    currentUrl = nextUrl;
    if (cache) {
      writeCacheMeta(cache.meta, {
        collection,
        schoolType: options.schoolType || null,
        page,
        observedPageSize,
        filtered,
        usedDelta,
        nextUrl: currentUrl,
        completed: !currentUrl,
      });
    }
  }
  process.stdout.write("\n");

  if (cache) {
    writeCacheMeta(cache.meta, {
      collection,
      schoolType: options.schoolType || null,
      page,
      observedPageSize,
      filtered,
      usedDelta,
      nextUrl: currentUrl,
      completed: !currentUrl,
    });
  }

  if (page >= pageLimit && currentUrl && !allowPartial) {
    throw new Error(`${collection}: reached --max-pages=${pageLimit}. Increase the limit rather than silently keeping a partial dataset.`);
  }

  // If an explicitly supplied school-type code produced an empty result, retry unfiltered once.
  if (!items.length && options.schoolType && filtered) {
    console.warn(`  ${collection}: schoolType=${options.schoolType} returned 0 records; retrying without the schoolType parameter.`);
    return collect(collection, {
      updatedSince: options.updatedSince,
      schoolType: null,
      fallbackFromSchoolType: true,
      maxPages: options.maxPages,
      allowPartial: options.allowPartial,
    });
  }

  return { items, apiFilteredBySchoolType: filtered && Boolean(options.schoolType), usedDelta };
}

function ensureTables(db) {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='susa_education_events'").get();
  if (!exists) {
    throw new Error("v0.6-tabellerna saknas. Kör npm run db:migrate:v06 först." );
  }
  const columns = new Set(db.prepare("PRAGMA table_info(susa_education_events)").all().map((row) => row.name));
  if (!columns.has("link_method")) {
    throw new Error("v0.7-kolumnerna saknas. Kör npm run db:migrate:v07 först.");
  }
}

function getState(db, key) {
  return db.prepare("SELECT value FROM susa_sync_state WHERE key=?").get(key)?.value || null;
}

function setState(db, key, value) {
  db.prepare(`
    INSERT INTO susa_sync_state(key, value, updated_at) VALUES(?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `).run(key, String(value ?? ""), new Date().toISOString());
}

function runChunked(db, rows, chunkSize, label, handler) {
  let processed = 0;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const batch = rows.slice(offset, offset + chunkSize);
    const tx = db.transaction((items) => {
      for (const item of items) handler(item);
    });
    tx(batch);
    processed += batch.length;
    process.stdout.write(`\r  Sparar ${label}: ${processed}/${rows.length}`);
  }
  process.stdout.write("\n");
}

function pruneNonEntryProgramRows(db) {
  const removedEvents = db.prepare(`
    DELETE FROM susa_education_events
    WHERE COALESCE((${liveEntryProgramSqlClause()}), 0) = 0
  `).run().changes;

  const removedInfos = db.prepare(`
    DELETE FROM susa_education_infos
    WHERE id NOT IN (
      SELECT DISTINCT education_info_id
      FROM susa_education_events
      WHERE education_info_id IS NOT NULL AND education_info_id != ''
    )
  `).run().changes;

  setState(db, "last_entry_program_prune", new Date().toISOString());
  return { removedEvents, removedInfos };
}

function persist(db, rawCollections, flags) {
  const now = new Date().toISOString();
  const providers = [];
  const infos = [];

  console.log("\nSparar Susa-data i SQLite i säkra deltransaktioner…");

  const upsertProvider = db.prepare(`
    INSERT INTO susa_providers (
      id, name, organisation_number, website, email, city, school_type,
      last_edited, expires, synced_at, raw_json
    ) VALUES (
      @id, @name, @organisationNumber, @website, @email, @city, @schoolType,
      @lastEdited, @expires, @syncedAt, @rawJson
    )
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, organisation_number=excluded.organisation_number,
      website=excluded.website, email=excluded.email, city=excluded.city,
      school_type=excluded.school_type, last_edited=excluded.last_edited,
      expires=excluded.expires, synced_at=excluded.synced_at, raw_json=excluded.raw_json
  `);
  const deleteProvider = db.prepare("DELETE FROM susa_providers WHERE id=?");

  runChunked(db, rawCollections.providers.items, 250, "providers", (raw) => {
    const id = itemId(raw);
    if (isDeletedRecord(raw)) {
      if (id) deleteProvider.run(id);
      return;
    }
    const normalized = normalizeProvider(raw);
    if (!normalized) return;
    if (!KEEP_UNFILTERED && !rawCollections.providers.apiFilteredBySchoolType && !looksLikeHigherEducation(normalized)) return;
    providers.push(normalized);
    upsertProvider.run({ ...normalized, syncedAt: now, rawJson: JSON.stringify(raw) });
  });

  const providerRows = db.prepare("SELECT id, name, city, website, school_type AS schoolType FROM susa_providers").all();
  const providerById = new Map(providerRows.map((item) => [item.id, item]));

  const upsertInfo = db.prepare(`
    INSERT INTO susa_education_infos (
      id, title, description, school_type, level, kind, degree, student_aid, credits, credits_unit,
      eligibility, provider_ids_json, provider_name, application_code, urls_json, subject_codes_json,
      last_edited, expires, synced_at, raw_json
    ) VALUES (
      @id, @title, @description, @schoolType, @level, @kind, @degree, @studentAid, @credits, @creditsUnit,
      @eligibility, @providerIdsJson, @providerName, @applicationCode, @urlsJson, @subjectCodesJson,
      @lastEdited, @expires, @syncedAt, @rawJson
    )
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, description=excluded.description, school_type=excluded.school_type,
      level=excluded.level, kind=excluded.kind, degree=excluded.degree, student_aid=excluded.student_aid,
      credits=excluded.credits, credits_unit=excluded.credits_unit,
      eligibility=excluded.eligibility, provider_ids_json=excluded.provider_ids_json,
      provider_name=excluded.provider_name, application_code=excluded.application_code,
      urls_json=excluded.urls_json, subject_codes_json=excluded.subject_codes_json, last_edited=excluded.last_edited, expires=excluded.expires,
      synced_at=excluded.synced_at, raw_json=excluded.raw_json
  `);
  const deleteInfo = db.prepare("DELETE FROM susa_education_infos WHERE id=?");

  runChunked(db, rawCollections.infos.items, 1000, "educationInfos", (raw) => {
    const id = itemId(raw);
    if (isDeletedRecord(raw)) {
      if (id) deleteInfo.run(id);
      return;
    }
    const normalized = normalizeEducationInfo(raw);
    if (!normalized) return;
    const knownProvider = normalized.providerIds.map((providerId) => providerById.get(providerId)).find(Boolean);
    if (!normalized.providerName && knownProvider?.name) normalized.providerName = knownProvider.name;
    const isHigher = looksLikeHigherEducation(normalized) || normalized.providerIds.some((providerId) => providerById.has(providerId));
    if (!KEEP_UNFILTERED && !rawCollections.infos.apiFilteredBySchoolType && !isHigher) return;
    infos.push(normalized);
    upsertInfo.run({
      ...normalized,
      providerIdsJson: JSON.stringify(normalized.providerIds),
      urlsJson: JSON.stringify(normalized.urls),
      subjectCodesJson: JSON.stringify(normalized.subjectCodes || []),
      syncedAt: now,
      rawJson: JSON.stringify(raw),
    });
  });

  const infoRows = db.prepare(`
    SELECT id, title, description, school_type AS schoolType, level, kind, degree, student_aid AS studentAid, credits,
      credits_unit AS creditsUnit, eligibility, provider_ids_json AS providerIds,
      provider_name AS providerName, application_code AS applicationCode,
      urls_json AS urls, subject_codes_json AS subjectCodes
    FROM susa_education_infos
  `).all().map((row) => ({
    ...row,
    providerIds: JSON.parse(row.providerIds || "[]"),
    urls: JSON.parse(row.urls || "[]"),
    subjectCodes: JSON.parse(row.subjectCodes || "[]"),
  }));
  const infoById = new Map(infoRows.map((item) => [item.id, item]));

  const upsertEvent = db.prepare(`
    INSERT INTO susa_education_events (
      id, education_info_id, title, provider_name, provider_id, provider_ids_json,
      city, start_date, end_date, period, study_form, study_pace, language,
      credits, credits_unit, level, kind, degree, student_aid, eligibility, description,
      application_open, application_deadline, application_url, application_code,
      source_url, school_type, distance, subject_codes_json, last_edited, expires,
      canonical_program_id, link_score, link_method, link_evidence_json, synced_at, raw_json
    ) VALUES (
      @id, @educationInfoId, @title, @providerName, @providerId, @providerIdsJson,
      @city, @startDate, @endDate, @period, @studyForm, @studyPace, @language,
      @credits, @creditsUnit, @level, @kind, @degree, @studentAid, @eligibility, @description,
      @applicationOpen, @applicationDeadline, @applicationUrl, @applicationCode,
      @sourceUrl, @schoolType, @distanceInt, @subjectCodesJson, @lastEdited, @expires,
      NULL, NULL, NULL, @linkEvidenceJson, @syncedAt, @rawJson
    )
    ON CONFLICT(id) DO UPDATE SET
      education_info_id=excluded.education_info_id, title=excluded.title,
      provider_name=excluded.provider_name, provider_id=excluded.provider_id,
      provider_ids_json=excluded.provider_ids_json, city=excluded.city,
      start_date=excluded.start_date, end_date=excluded.end_date, period=excluded.period,
      study_form=excluded.study_form, study_pace=excluded.study_pace, language=excluded.language,
      credits=excluded.credits, credits_unit=excluded.credits_unit, level=excluded.level,
      kind=excluded.kind, degree=excluded.degree, student_aid=excluded.student_aid,
      eligibility=excluded.eligibility, description=excluded.description,
      application_open=excluded.application_open, application_deadline=excluded.application_deadline,
      application_url=excluded.application_url, application_code=excluded.application_code,
      source_url=excluded.source_url, school_type=excluded.school_type, distance=excluded.distance,
      subject_codes_json=excluded.subject_codes_json, last_edited=excluded.last_edited, expires=excluded.expires,
      canonical_program_id=NULL, link_score=NULL, link_method=NULL, link_evidence_json=excluded.link_evidence_json,
      synced_at=excluded.synced_at, raw_json=excluded.raw_json
  `);
  const deleteEvent = db.prepare("DELETE FROM susa_education_events WHERE id=?");
  let eventUpserts = 0;
  let skippedNonHigher = 0;

  runChunked(db, rawCollections.events.items, 750, "educationEvents", (raw) => {
    const id = itemId(raw);
    if (isDeletedRecord(raw)) {
      if (id) deleteEvent.run(id);
      return;
    }
    const provisional = normalizeEducationEvent(raw, null, providerById);
    if (!provisional) return;
    const info = provisional.educationInfoId
      ? infoById.get(String(provisional.educationInfoId)) || null
      : null;
    const normalized = normalizeEducationEvent(raw, info, providerById);
    if (!normalized) return;
    const isHigher = looksLikeHigherEducation(normalized) || Boolean(info && (looksLikeHigherEducation(info) || info.providerIds?.some((providerId) => providerById.has(providerId))));
    if (!KEEP_UNFILTERED && !rawCollections.events.apiFilteredBySchoolType && !isHigher) {
      skippedNonHigher += 1;
      return;
    }

    upsertEvent.run({
      ...normalized,
      providerIdsJson: JSON.stringify(normalized.providerIds),
      distanceInt: normalized.distance ? 1 : 0,
      subjectCodesJson: JSON.stringify(normalized.subjectCodes || []),
      linkEvidenceJson: "{}",
      syncedAt: now,
      rawJson: JSON.stringify(raw),
    });
    eventUpserts += 1;
  });

  setState(db, "last_successful_sync", flags.checkpoint || now);
  setState(db, "last_sync_mode", flags.full ? "full" : "delta");
  setState(db, "susa_api_base_url", API_BASE);
  setState(db, "susa_school_type", SCHOOL_TYPE || "");
  setState(db, "source_license", "Skolverkets källicens / Creative Commons");

  return {
    providerUpserts: providers.length,
    infoUpserts: infos.length,
    eventUpserts,
    linked: 0,
    linkPhase: "deferred-to-relink",
    skippedNonHigher,
  };
}

async function main() {
  const syncStartedAt = new Date().toISOString();
  console.log("Högskolekompassen v0.7.1 · Susa-navet sync");
  console.log(`API: ${API_BASE}`);
  console.log(`School type filter: ${SCHOOL_TYPE || "none"}`);

  let db = null;
  let since = null;
  if (!PROBE && !DISCOVER_TYPES) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    ensureTables(db);
    since = FULL ? null : getState(db, "last_successful_sync");
  }
  if (since) console.log(`Delta since: ${since}`);
  else console.log("Mode: full/current fetch");

  if (!PROBE && !DISCOVER_TYPES && !SCHOOL_TYPE && !KEEP_UNFILTERED) {
    throw new Error(
      "Ingen skolform är vald. v0.7 använder HS som standard för universitet/högskola. " +
      "Använd --school-type <CODE> för annan skolform eller --keep-unfiltered endast om du medvetet vill importera allt."
    );
  }

  if (DISCOVER_TYPES) {
    const scanPages = Math.max(1, Number(argValue("--scan-pages", "500")) || 500);
    console.log(`Type discovery mode: scanning educationInfos (up to ${scanPages} pages, no database writes).`);
    const result = await collect("educationInfos", {
      schoolType: null,
      updatedSince: null,
      maxPages: scanPages,
      allowPartial: true,
      quietPagination: true,
    });
    const counts = new Map();
    for (const item of result.items) {
      const code = schoolTypeCode(item) || "(missing)";
      counts.set(code, (counts.get(code) || 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));
    console.log("\nObserved EducationInfo type codes:");
    console.table(sorted);
    console.log("\nTip: university/higher-education data is represented by a C_SchoolType code in EducationInfo.content.type.code.");
    console.log("Högskolekompassen använder HS som standard. För att testa en annan kod: npm run susa:probe -- --school-type <CODE>");
    return;
  }

  const options = {
    updatedSince: since,
    schoolType: SCHOOL_TYPE || null,
    resumeCache: Boolean(FULL && !PROBE && !DISCOVER_TYPES),
    ...(PROBE ? { maxPages: PROBE_PAGES, allowPartial: true } : {}),
  };
  const rawCollections = {};

  if (PROBE) console.log(`Probe mode: sampling at most ${PROBE_PAGES} page(s) per endpoint.`);
  console.log("Fetching education providers…");
  rawCollections.providers = await collect("educationProviders", options);
  console.log("Fetching education infos…");
  rawCollections.infos = await collect("educationInfos", options);
  console.log("Fetching education events…");
  rawCollections.events = await collect("educationEvents", options);

  if (PROBE) {
    const typeCounts = new Map();
    for (const item of rawCollections.infos.items) {
      const code = schoolTypeCode(item);
      if (!code) continue;
      typeCounts.set(code, (typeCounts.get(code) || 0) + 1);
    }
    const schoolTypes = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));
    const sample = {
      observedEducationInfoTypes: schoolTypes,
      educationProviders: rawCollections.providers.items[0] || null,
      educationInfos: rawCollections.infos.items[0] || null,
      educationEvents: rawCollections.events.items[0] || null,
    };
    console.log("\nProbe complete. Sampled schema and EducationInfo type values:\n");
    console.log(JSON.stringify(sample, null, 2).slice(0, 24000));
    return;
  }

  const summary = persist(db, rawCollections, { full: !since || FULL, checkpoint: syncStartedAt });

  // A full refresh is authoritative for the selected school type. Reconcile stale local rows.
  if (!since || FULL) {
    const reconcile = (table, rawItems) => {
      const currentIds = new Set(rawItems.map(itemId).filter(Boolean));
      if (!currentIds.size) return 0;
      const stale = db.prepare(`SELECT id FROM ${table}`).all().filter((row) => !currentIds.has(row.id));
      const remove = db.prepare(`DELETE FROM ${table} WHERE id=?`);
      const clean = db.transaction(() => stale.forEach((row) => remove.run(row.id)));
      clean();
      return stale.length;
    };
    summary.removedStaleEvents = reconcile("susa_education_events", rawCollections.events.items);
    summary.removedStaleInfos = reconcile("susa_education_infos", rawCollections.infos.items);
    summary.removedStaleProviders = reconcile("susa_providers", rawCollections.providers.items);
  }

  if (!KEEP_UNFILTERED) {
    summary.prunedNonEntryPrograms = pruneNonEntryProgramRows(db);
  }

  const counts = {
    providers: db.prepare("SELECT COUNT(*) count FROM susa_providers").get().count,
    infos: db.prepare("SELECT COUNT(*) count FROM susa_education_infos").get().count,
    events: db.prepare("SELECT COUNT(*) count FROM susa_education_events").get().count,
    linked: db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE canonical_program_id IS NOT NULL").get().count,
  };
  if (FULL) {
    try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch {}
  }
  db.close();

  console.log("\nSync complete.");
  console.log(JSON.stringify({ summary, database: counts }, null, 2));
  if (!counts.events) {
    console.warn("No higher-education events were stored. Run `npm run susa:probe` to inspect HS data, or `npm run susa:types` to inspect available school types. See README troubleshooting.");
  }
}

main().catch((error) => {
  console.error("\nSusa sync failed:");
  console.error(error?.stack || error);
  process.exit(1);
});
