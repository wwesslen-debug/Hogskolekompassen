const STOP_WORDS = new Set([
  "och", "i", "på", "för", "med", "till", "av", "om", "en", "ett",
  "program", "programmet", "utbildning", "utbildningen", "kurs", "kurser",
  "kandidatprogram", "masterprogram", "magisterprogram", "högskoleprogram"
]);

export function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function getPath(object, path) {
  let current = object;
  for (const part of String(path).split(".")) {
    if (current == null) return undefined;
    if (/^\d+$/.test(part)) {
      current = Array.isArray(current) ? current[Number(part)] : undefined;
    } else {
      current = current?.[part];
    }
  }
  return current;
}

export function firstValue(object, paths, fallback = null) {
  for (const path of paths) {
    const value = getPath(object, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

export function textValue(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim() || null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = textValue(item);
      if (text) return text;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of ["sv", "swe", "sv-SE", "value", "text", "name", "title", "label", "description", "uri", "url", "href", "code", "id"]) {
      if (value[key] !== undefined) {
        const text = textValue(value[key]);
        if (text) return text;
      }
    }
    for (const item of Object.values(value)) {
      const text = textValue(item);
      if (text) return text;
    }
  }
  return null;
}

export function stringList(value) {
  return asArray(value)
    .flatMap((item) => {
      if (item == null) return [];
      if (typeof item === "string" || typeof item === "number") return [String(item)];
      if (typeof item === "object") {
        const candidate = firstValue(item, ["id", "identifier", "code", "value", "name", "title", "href", "url"]);
        return candidate != null ? [String(candidate)] : [];
      }
      return [];
    })
    .filter(Boolean);
}


export function recordContent(raw) {
  if (!raw || typeof raw !== "object") return raw || {};
  // EMIL3 list endpoints wrap the actual EMIL entity in { id, status, content }.
  // Older/demo payloads may expose fields directly, so keep both shapes supported.
  return raw.content && typeof raw.content === "object" && !Array.isArray(raw.content)
    ? raw.content
    : raw;
}

export function schoolTypeCode(raw) {
  const body = recordContent(raw);
  return textValue(firstValue(body, [
    "schoolType.code", "schoolType", "educationForm.code", "educationForm",
    "educationType.code", "form.code", "type.code", "type"
  ]));
}

export function itemId(item) {
  const value = firstValue(item, [
    "id", "identifier", "@id", "educationEventId", "educationInfoId", "educationProviderId",
    "metadata.id", "meta.id"
  ]);
  return textValue(value);
}

export function isDeletedRecord(item) {
  if (!item || typeof item !== "object") return false;
  if (item.deleted === true || item.isDeleted === true || item.removed === true) return true;
  const status = textValue(firstValue(item, ["status", "changeType", "operation", "meta.status"]))?.toLowerCase();
  return ["deleted", "removed", "delete", "tombstone"].includes(status || "");
}

export function extractItems(payload, collectionName = "") {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.items,
    payload.content,
    payload.data,
    payload.results,
    payload[collectionName],
    payload._embedded?.[collectionName],
    payload._embedded?.items,
    payload.embedded?.[collectionName],
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.every((item) => item && typeof item === "object")) return value;
  }
  return [];
}

function absoluteUrl(value, baseUrl) {
  const href = textValue(value);
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function sameUrl(a, b) {
  if (!a || !b) return false;
  try {
    const left = new URL(a);
    const right = new URL(b);
    const normalize = (url) => {
      const entries = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) =>
        ak === bk ? String(av).localeCompare(String(bv)) : ak.localeCompare(bk)
      );
      url.search = "";
      for (const [key, value] of entries) url.searchParams.append(key, value);
      url.hash = "";
      return url.toString();
    };
    return normalize(left) === normalize(right);
  } catch {
    return String(a) === String(b);
  }
}

export function extractNextUrl(payload, responseHeaders, currentUrl, itemCount) {
  const linkHeader = responseHeaders?.get?.("link");
  if (linkHeader) {
    for (const part of linkHeader.split(",")) {
      const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
      if (match) {
        const candidate = absoluteUrl(match[1], currentUrl);
        if (candidate && !sameUrl(candidate, currentUrl)) return candidate;
      }
    }
  }

  const bodyNext = firstValue(payload || {}, [
    "_links.next.href", "links.next.href", "links.next", "next.href", "next", "pagination.next", "page.next"
  ]);
  const direct = absoluteUrl(bodyNext, currentUrl);
  if (direct && !sameUrl(direct, currentUrl)) return direct;

  const totalPages = Number(firstValue(payload || {}, ["totalPages", "page.totalPages", "pagination.totalPages", "meta.totalPages"]));
  const currentPage = Number(firstValue(payload || {}, ["pageNumber", "number", "page.number", "pagination.page", "meta.page"]));
  const size = Number(firstValue(payload || {}, ["pageSize", "size", "page.size", "pagination.pageSize", "meta.pageSize"]));
  if (Number.isFinite(totalPages) && Number.isFinite(currentPage) && currentPage + 1 < totalPages) {
    const url = new URL(currentUrl);
    const pageParam = url.searchParams.has("pageNumber") ? "pageNumber" : "page";
    url.searchParams.set(pageParam, String(currentPage + 1));
    if (Number.isFinite(size) && size > 0 && !url.searchParams.has("pageSize") && !url.searchParams.has("size")) {
      url.searchParams.set("pageSize", String(size));
    }
    return url.toString();
  }

  // Some APIs only return a page number + size. If we cannot prove there are more pages,
  // stop rather than looping indefinitely.
  void itemCount;
  return null;
}

function normalizeDate(value) {
  const text = textValue(value);
  if (!text) return null;
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function normalizeDateTime(value) {
  const text = textValue(value);
  return text || null;
}

function providerIdsFrom(value) {
  return asArray(value).map((item) => {
    if (typeof item === "string" || typeof item === "number") return String(item);
    return itemId(item) || textValue(firstValue(item, ["providerId", "educationProviderId", "identifier"]));
  }).filter(Boolean);
}

function providerNameFrom(value) {
  for (const item of asArray(value)) {
    if (item && typeof item === "object") {
      const text = textValue(firstValue(item, ["name", "title", "legalName", "providerName"]));
      if (text) return text;
    }
  }
  return null;
}

function findApplication(event) {
  const candidates = [
    ...asArray(event?.applications),
    ...asArray(event?.application),
    ...asArray(event?.admissions),
    ...asArray(event?.admission),
  ].filter(Boolean);
  return candidates[0] || {};
}

function findLocation(event) {
  return firstValue(event, ["locations.0", "location", "place", "places.0", "address", "venue"]) || {};
}

export function normalizeProvider(raw) {
  const id = itemId(raw);
  if (!id) return null;
  const body = recordContent(raw);
  const address = firstValue(body, [
    "visitAddresses.0", "contactAddress", "addresses.0", "address",
    "visitingAddress", "postalAddress"
  ]) || {};
  const urls = asArray(firstValue(body, ["url", "webAddresses", "urls", "websites", "website"]))
    .map(textValue).filter(Boolean);
  const emails = asArray(firstValue(body, ["emailAddresses", "emails", "email"]))
    .map(textValue).filter(Boolean);

  return {
    id,
    name: textValue(firstValue(body, ["name", "title", "legalName", "providerName"])) || id,
    organisationNumber: textValue(firstValue(body, ["organisationNumber", "organizationNumber", "orgNumber"])),
    website: urls[0] || null,
    email: emails[0] || null,
    city: textValue(firstValue(address, ["town", "city", "locality", "municipality", "postTown"])),
    // EducationProvider does not necessarily carry C_SchoolType in EMIL3.
    schoolType: textValue(firstValue(body, ["schoolType.code", "schoolType", "educationForm.code", "educationForm"])),
    lastEdited: normalizeDateTime(firstValue(body, ["lastEdited", "modified", "updatedAt", "meta.lastEdited"])),
    expires: normalizeDateTime(firstValue(body, ["expires", "expirationDate", "validTo"])),
    raw,
  };
}

export function normalizeEducationInfo(raw) {
  const id = itemId(raw);
  if (!id) return null;
  const body = recordContent(raw);
  const providers = firstValue(body, ["providers", "provider", "educationProviders"]);
  const extent = firstValue(body, ["extent", "credits", "educationCredits", "duration"]);
  const typeCode = schoolTypeCode(raw);
  const resultIsDegree = firstValue(body, ["resultIsDegree"]);

  const extentLength = firstValue(extent || {}, ["length", "value"]);
  const extentUnit = firstValue(extent || {}, ["unit.code", "unit", "type"]);
  const levelValue = firstValue(body, [
    "educationLevels.0.code", "educationLevels.0", "level.code", "level",
    "educationLevel.code", "educationLevel", "qualificationLevel", "cycle"
  ]);

  const urlsValue = firstValue(body, ["url", "urls", "webAddresses", "websites", "webAddress"]);

  return {
    id,
    title: textValue(firstValue(body, ["title", "name", "titles", "educationTitle"])) || id,
    description: textValue(firstValue(body, ["description", "descriptions", "summary", "contentDescription"])),
    schoolType: typeCode,
    level: textValue(levelValue),
    kind: textValue(firstValue(body, [
      "configuration.code", "configuration", "courseOrProgramme", "courseOrProgram", "kind"
    ])) || (resultIsDegree === true ? "program" : null),
    degree: asArray(firstValue(body, ["degrees", "degree"]))
      .map(textValue).filter(Boolean).join(", ") || null,
    studentAid: textValue(firstValue(body, ["eligibleForStudentAid.code", "eligibleForStudentAid"])),
    credits: Number(extentLength) || null,
    creditsUnit: textValue(extentUnit),
    eligibility: textValue(firstValue(body, ["eligibility", "entryRequirements", "admissionRequirements", "prerequisites"])),
    providerIds: providerIdsFrom(providers),
    providerName: providerNameFrom(providers),
    applicationCode: textValue(firstValue(body, ["applicationCode", "admissionCode", "code"])),
    urls: asArray(urlsValue).map(textValue).filter(Boolean),
    subjectCodes: asArray(firstValue(body, ["subjects"]))
      .map((item) => textValue(firstValue(item || {}, ["code", "id", "value"])))
      .filter(Boolean),
    lastEdited: normalizeDateTime(firstValue(body, ["lastEdited", "modified", "updatedAt", "meta.lastEdited"])),
    expires: normalizeDateTime(firstValue(body, ["expires", "expirationDate", "validTo"])),
    raw,
  };
}

export function periodFromStartDate(startDate) {
  const text = normalizeDate(startDate);
  const match = text?.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month >= 7) return `HT ${year}`;
  return `VT ${year}`;
}

function looksDistance(value) {
  const text = textValue(value)?.toLowerCase() || "";
  return /distans|distance|online|remote|webb/.test(text);
}

export function normalizeEducationEvent(raw, info = null, providerById = new Map()) {
  const id = itemId(raw);
  if (!id) return null;
  const body = recordContent(raw);
  const educationInfoRef = firstValue(body, ["education", "educationInfo", "educationInfos.0", "educationInfoId", "education.id"]);
  const educationInfoId = typeof educationInfoRef === "object" ? itemId(educationInfoRef) : textValue(educationInfoRef);
  const providers = firstValue(body, ["providers", "provider", "educationProviders"]);
  const providerIds = providerIdsFrom(providers);
  const embeddedProviderName = providerNameFrom(providers);
  const knownProvider = providerIds.map((providerId) => providerById.get(providerId)).find(Boolean);
  const application = findApplication(body);
  const location = findLocation(body);
  const execution = firstValue(body, ["execution", "timePeriod", "dateRange"]) || {};

  const startDate = normalizeDate(firstValue(body, [
    "execution.start", "execution.startDate", "startDate", "starts", "start",
    "timePeriod.startDate", "dateRange.startDate"
  ]));
  const endDate = normalizeDate(firstValue(body, [
    "execution.end", "execution.endDate", "endDate", "ends", "end",
    "timePeriod.endDate", "dateRange.endDate"
  ]));
  const studyForm = textValue(firstValue(body, [
    "studyForm", "deliveryMode", "formOfStudy", "studyMode", "attendanceType"
  ]));
  const city = textValue(firstValue(location, ["town", "city", "locality", "municipality", "name"]))
    || textValue(firstValue(body, ["city", "municipality", "locationName"]))
    || knownProvider?.city
    || null;
  const applicationUrl = textValue(firstValue(application, ["url", "href", "webAddress", "applicationUrl"]))
    || textValue(firstValue(body, ["applicationUrl", "applyUrl"]));
  const sourceUrl = textValue(firstValue(body, ["url", "webAddress", "webpage", "informationUrl"]))
    || info?.urls?.[0]
    || knownProvider?.website
    || null;

  const title = textValue(firstValue(body, ["title", "name", "educationTitle"])) || info?.title || id;
  const schoolType = schoolTypeCode(raw) || info?.schoolType || knownProvider?.schoolType || null;
  const providerName = embeddedProviderName || info?.providerName || knownProvider?.name || null;
  const distance = Boolean(firstValue(body, ["distance", "isDistance", "distanceLearning"])) || looksDistance(studyForm);

  return {
    id,
    educationInfoId: educationInfoId || info?.id || null,
    title,
    providerName,
    providerId: providerIds[0] || info?.providerIds?.[0] || null,
    providerIds,
    city,
    startDate,
    endDate,
    period: periodFromStartDate(startDate),
    studyForm,
    studyPace: (() => {
      const percentage = Number(firstValue(body, ["paceOfStudy.percentage", "studyPace.percentage"]));
      if (Number.isFinite(percentage) && percentage > 0) return `${percentage} %`;
      return textValue(firstValue(body, ["studyPace", "pace", "studyRate", "intensity", "paceOfStudy"]));
    })(),
    language: textValue(firstValue(body, ["language", "languages.0", "instructionLanguage"])),
    credits: info?.credits ?? (Number(firstValue(body, ["credits.value", "extent.length", "extent.value", "credits", "extent"])) || null),
    creditsUnit: info?.creditsUnit || textValue(firstValue(body, ["credits.unit.code", "credits.unit", "extent.unit.code", "extent.unit", "creditUnit"])),
    level: info?.level || textValue(firstValue(body, ["educationLevels.0.code", "level", "educationLevel", "cycle"])),
    kind: info?.kind || textValue(firstValue(body, ["configuration.code", "configuration", "educationType", "courseOrProgramme", "courseOrProgram", "kind"])),
    degree: info?.degree || asArray(firstValue(body, ["degrees", "degree"])).map(textValue).filter(Boolean).join(", ") || null,
    studentAid: info?.studentAid || textValue(firstValue(body, ["eligibleForStudentAid.code", "eligibleForStudentAid"])),
    eligibility: info?.eligibility || textValue(firstValue(body, ["eligibility", "entryRequirements", "admissionRequirements"])),
    description: info?.description || textValue(firstValue(body, ["description", "summary"])),
    subjectCodes: info?.subjectCodes || asArray(firstValue(body, ["subjects"]))
      .map((item) => textValue(firstValue(item || {}, ["code", "id", "value"])))
      .filter(Boolean),
    applicationOpen: normalizeDate(firstValue(application, ["startDate", "opens", "openDate", "applicationStartDate"])),
    applicationDeadline: normalizeDate(firstValue(application, ["endDate", "deadline", "closeDate", "applicationDeadline", "lastApplicationDate"])),
    applicationUrl,
    applicationCode: textValue(firstValue(application, ["code", "applicationCode", "admissionCode"])) || info?.applicationCode || null,
    sourceUrl,
    schoolType,
    distance,
    lastEdited: normalizeDateTime(firstValue(body, ["lastEdited", "modified", "updatedAt", "meta.lastEdited"])),
    expires: normalizeDateTime(firstValue(body, ["expires", "expirationDate", "validTo"])),
    raw,
  };
}

export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(value) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

const TOKEN_SYNONYMS = new Map([
  ["bioteknologi", "bioteknik"],
  ["mjukvaruteknik", "mjukvara"],
  ["software", "mjukvara"],
  ["informatik", "systemvetenskap"],
  ["informationssystem", "systemvetenskap"],
  ["datavetenskap", "data"],
  ["datateknik", "data"],
  ["computer", "data"],
  ["computing", "data"],
  ["economics", "ekonomi"],
  ["business", "ekonomi"],
  ["engineering", "ingenjor"],
  ["engineer", "ingenjor"],
  ["civilingenjorsutbildning", "civilingenjor"],
  ["civilingenjorsprogram", "civilingenjor"],
  ["civilingenjorsprogrammet", "civilingenjor"],
  ["hogskoleingenjorsutbildning", "hogskoleingenjor"],
  ["hogskoleingenjorsprogram", "hogskoleingenjor"],
  ["hogskoleingenjorsprogrammet", "hogskoleingenjor"],
  ["molecular", "molekylar"],
  ["molekylart", "molekylar"],
  ["medicine", "medicin"],
  ["medical", "medicin"],
  ["nursing", "sjukskoterska"],
  ["psychology", "psykologi"],
  ["law", "juridik"],
  ["legal", "juridik"],
  ["architecture", "arkitektur"],
  ["environmental", "miljo"],
  ["sustainability", "hallbarhet"],
  ["teacher", "larare"],
  ["education", "pedagogik"],
  ["management", "ledning"],
  ["finance", "finans"],
  ["accounting", "redovisning"],
  ["chemistry", "kemi"],
  ["biology", "biologi"],
  ["physics", "fysik"],
  ["mathematics", "matematik"],
]);

const DEGREE_MARKERS = [
  "civilingenjor", "hogskoleingenjor", "kandidat", "master", "magister",
  "lakare", "jurist", "psykolog", "sjukskoterska", "arkitekt", "larare",
  "socionom", "tandlakare", "fysioterapeut", "arbetsterapeut", "logoped",
  "apotekare", "receptarie", "veterinar", "polis"
];

const GENERIC_TOKENS = new Set([
  "grundniva", "avancerad", "inriktning", "specialisering", "studier", "vetenskap",
  "introduktion", "fortsattning", "examensarbete", "projekt", "självständigt", "sjalvstandigt"
]);

function canonicalToken(token) {
  let value = TOKEN_SYNONYMS.get(token) || token;
  value = value
    .replace(/ernas$|arnas$|ens$|ets$/g, "")
    .replace(/erna$|arna$/g, "")
    .replace(/ande$|ende$/g, "");
  return TOKEN_SYNONYMS.get(value) || value;
}

function canonicalTokens(value) {
  return titleTokens(value).map(canonicalToken).filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token));
}

function setOverlap(a, b) {
  if (!a.size || !b.size) return { intersection: 0, jaccard: 0, coverageA: 0, coverageB: 0, f1: 0 };
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = new Set([...a, ...b]).size || 1;
  const coverageA = intersection / a.size;
  const coverageB = intersection / b.size;
  const precision = coverageA;
  const recall = coverageB;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { intersection, jaccard: intersection / union, coverageA, coverageB, f1 };
}

function degreeMarker(value) {
  const text = normalizeSearchText(value);
  return DEGREE_MARKERS.find((marker) => text.includes(marker)) || null;
}

function expectedProgramKind(program) {
  const degree = normalizeSearchText(program.degree || "");
  const title = normalizeSearchText(program.title || "");
  if (/kurs|frist[aå]ende/.test(degree) || /^kurs\b/.test(title)) return "course";
  return "program";
}

const PROGRAM_TOKEN_CACHE = new WeakMap();
const LIVE_DESCRIPTION_CACHE = new WeakMap();

function programSearchTokens(program) {
  if (PROGRAM_TOKEN_CACHE.has(program)) return PROGRAM_TOKEN_CACHE.get(program);
  const value = {
    title: new Set(canonicalTokens(program.title)),
    tags: new Set((program.tags || []).flatMap(canonicalTokens)),
    category: new Set(canonicalTokens(program.category || "")),
  };
  PROGRAM_TOKEN_CACHE.set(program, value);
  return value;
}

function liveDescriptionTokens(live) {
  if (live && typeof live === "object" && LIVE_DESCRIPTION_CACHE.has(live)) return LIVE_DESCRIPTION_CACHE.get(live);
  const value = `${live.description || ""} ${live.degree || ""}`.slice(0, 2400);
  const tokens = new Set(canonicalTokens(value));
  if (live && typeof live === "object") LIVE_DESCRIPTION_CACHE.set(live, tokens);
  return tokens;
}

export function similarityScoreDetailed(live, program, context = {}) {
  const liveTitle = normalizeSearchText(live.title);
  const programTitle = normalizeSearchText(program.title);
  if (!liveTitle || !programTitle) return { score: 0, method: "none", evidence: {} };

  const liveTokens = new Set(canonicalTokens(live.title));
  const programTokens = programSearchTokens(program);
  const titleOverlap = setOverlap(liveTokens, programTokens.title);
  const tagOverlap = setOverlap(liveTokens, programTokens.tags);
  const categoryOverlap = setOverlap(liveTokens, programTokens.category);

  let score = 0;
  let method = "lexical";
  const evidence = {
    titleF1: Number(titleOverlap.f1.toFixed(3)),
    titleCoverage: Number(Math.max(titleOverlap.coverageA, titleOverlap.coverageB).toFixed(3)),
    tagCoverage: Number(Math.max(tagOverlap.coverageA, tagOverlap.coverageB).toFixed(3)),
    categoryCoverage: Number(Math.max(categoryOverlap.coverageA, categoryOverlap.coverageB).toFixed(3)),
  };

  if (liveTitle === programTitle) {
    score = 0.995;
    method = "exact-title";
  } else {
    const shorter = Math.min(liveTitle.length, programTitle.length);
    const contained = shorter >= 8 && (liveTitle.includes(programTitle) || programTitle.includes(liveTitle));
    if (contained) {
      score = 0.91;
      method = "title-containment";
    } else {
      score = titleOverlap.f1 * 0.68 + titleOverlap.jaccard * 0.12 + Math.max(tagOverlap.coverageA, tagOverlap.coverageB) * 0.12;
      if (titleOverlap.intersection >= 2) method = "title-tokens";
      else if (tagOverlap.intersection) method = "title-tags";
    }
  }

  const liveMarker = degreeMarker(`${live.title || ""} ${live.degree || ""}`);
  const programMarker = degreeMarker(`${program.title || ""} ${program.degree || ""}`);
  if (liveMarker && programMarker) {
    if (liveMarker === programMarker) {
      score += 0.075;
      evidence.degreeMarker = liveMarker;
    } else {
      score -= 0.13;
      evidence.degreeConflict = `${liveMarker} != ${programMarker}`;
    }
  }

  const liveKind = normalizeSearchText(live.kind || "");
  const expectedKind = expectedProgramKind(program);
  if (liveKind) {
    const isCourse = /course|kurs/.test(liveKind);
    const isProgram = /program/.test(liveKind);
    if ((expectedKind === "program" && isProgram) || (expectedKind === "course" && isCourse)) score += 0.035;
    if (expectedKind === "program" && isCourse) score -= 0.035;
  }

  if (score < 0.72 && (titleOverlap.intersection || tagOverlap.intersection)) {
    const descriptionTokens = liveDescriptionTokens(live);
    const targetTokens = new Set([...programTokens.title, ...programTokens.tags]);
    const descriptionOverlap = setOverlap(descriptionTokens, targetTokens);
    const bonus = Math.min(0.08, descriptionOverlap.coverageB * 0.08);
    score += bonus;
    evidence.descriptionCoverage = Number(descriptionOverlap.coverageB.toFixed(3));
  }

  if (context.subjectCategoryEvidence && Array.isArray(live.subjectCodes) && live.subjectCodes.length) {
    let bestSubjectSupport = 0;
    for (const code of live.subjectCodes) {
      const evidenceForCode = context.subjectCategoryEvidence.get?.(code) || context.subjectCategoryEvidence[code];
      if (!evidenceForCode) continue;
      const support = Number(evidenceForCode[program.category] || 0);
      if (support > bestSubjectSupport) bestSubjectSupport = support;
    }
    if (bestSubjectSupport > 0) {
      score += Math.min(0.1, bestSubjectSupport * 0.1);
      evidence.subjectCategorySupport = Number(bestSubjectSupport.toFixed(3));
      if (method === "lexical" || method === "title-tags") method = "lexical+subject";
    }
  }

  const providerBonus = program.institution && live.providerName && program.institution !== "Flera lärosäten"
    && normalizeSearchText(live.providerName).includes(normalizeSearchText(program.institution).replace(" universitet", "").replace(" hogskola", ""))
      ? 0.025
      : 0;
  score += providerBonus;
  if (providerBonus) evidence.providerMatch = true;

  // Require some real lexical evidence. Subject/category support should refine, not invent, a link.
  if (titleOverlap.intersection === 0 && tagOverlap.intersection === 0 && score < 0.9) score = 0;

  return { score: Math.max(0, Math.min(0.995, score)), method, evidence };
}

export function similarityScore(live, program, context = {}) {
  return similarityScoreDetailed(live, program, context).score;
}

export function rankCanonicalMatches(live, programs, options = {}) {
  const threshold = Number(options.threshold ?? 0.36);
  const limit = Math.max(1, Math.min(10, Number(options.limit || 3)));
  const context = options.context || {};
  const ranked = programs
    .map((program) => {
      const detail = similarityScoreDetailed(live, program, context);
      return { program, ...detail };
    })
    .filter((item) => item.score >= Math.max(0.05, threshold - 0.12))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked;
}

export function bestCanonicalMatch(live, programs, threshold = 0.36, context = {}) {
  const ranked = rankCanonicalMatches(live, programs, { threshold, limit: 2, context });
  const best = ranked[0] || null;
  if (!best || best.score < threshold) return null;

  // Ambiguous weak matches are safer left unlinked than attached to the wrong profile.
  const runnerUp = ranked[1];
  const margin = runnerUp ? best.score - runnerUp.score : 1;
  if (best.score < 0.58 && runnerUp && margin < 0.035) return null;

  const liveKind = normalizeSearchText(live.kind || "");
  if ((/course|kurs/.test(liveKind)) && expectedProgramKind(best.program) === "program" && best.score < 0.72) return null;

  return { ...best, margin: Number(margin.toFixed(4)) };
}

export function looksLikeHigherEducation(record) {
  const type = normalizeSearchText(record?.schoolType || "");
  if (type === "hs" || /(universitet|hogskola|higher education|university|college|uh|uoh)/.test(type)) return true;
  const provider = normalizeSearchText(record?.providerName || record?.name || "");
  return /(universitet|hogskola|chalmers|kth|karolinska|konstfack|gymnastik och idrottshogskolan|handelshogskolan)/.test(provider);
}
