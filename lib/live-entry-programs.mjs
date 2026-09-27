export const LIVE_ENTRY_PROGRAM_EXCLUDED_TERMS = [
  "master",
  "magister",
  "avancerad",
  "second cycle",
  "vidareutbildning",
  "vidare utbildning",
  "kompletterande utbildning",
  "kompletterande pedagogisk utbildning",
  "kompletteringsutbildning",
  "senare del",
  "later part",
  "utbytesstudier",
  "exchange studies",
];

export const LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS = [
  "grundläggande behörighet",
  "grundlaggande behorighet",
  "gymnasiekompetens",
  "gymnasieexamen",
  "högskolebehörighet",
  "hogskolebehorighet",
  "general entry requirements",
  "basic entry requirements",
  "basic eligibility",
  "upper secondary qualification",
  "upper secondary school",
];

const LIVE_ENTRY_SPECIAL_ELIGIBILITY_TERMS = [
  "särskild behörighet",
  "sarskild behorighet",
  "särskilda behörighetskrav",
  "sarskilda behorighetskrav",
  "områdesbehörighet",
  "omradesbehorighet",
  "specific entry requirements",
  "special entry requirements",
  "additional entry requirements",
  "arbetsprov",
  "färdighetsprov",
  "fardighetsprov",
  "antagningsprov",
  "urvalsprov",
  "portfolio",
  "audition",
  "yrkeserfarenhet",
  "work experience",
  "tidigare högskolestudier",
  "tidigare hogskolestudier",
];

const LIVE_ENTRY_SPECIAL_ELIGIBILITY_PATTERNS = [
  /\b(matematik|fysik|kemi|biologi|naturkunskap|samhallskunskap|historia|religionskunskap|moderna sprak)\s*[0-9a-e]/,
  /\b[0-9]+\s*(hp|hogskolepoang|ects)\b/,
  /\b(kandidatexamen|hogskoleexamen|yrkesexamen|bachelor|master|magister)\b/,
];

const LIVE_ENTRY_SPECIAL_ELIGIBILITY_SQL_PATTERNS = [
  "(^|[^[:alnum:]])(matematik|fysik|kemi|biologi|naturkunskap|samhallskunskap|historia|religionskunskap|moderna sprak)[[:space:]]*[0-9a-e]",
  "(^|[^[:alnum:]])[0-9]+[[:space:]]*(hp|hogskolepoang|ects)([^[:alnum:]]|$)",
  "(^|[^[:alnum:]])(kandidatexamen|hogskoleexamen|yrkesexamen|bachelor|master|magister)([^[:alnum:]]|$)",
];

const sqlTextColumns = ["title", "degree", "level", "eligibility"];
const sqlTranslateFrom = "åäöéèêëáàâãíìîïóòôõúùûüçñ";
const sqlTranslateTo = "aaoeeeeaaaaiiiioooouuuucn";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function column(alias, name) {
  return alias ? `${alias}.${name}` : name;
}

function sqlHaystack(alias = "") {
  return `LOWER(${sqlTextColumns.map((name) => `COALESCE(${column(alias, name)}, '')`).join(" || ' ' || ")})`;
}

function sqlNormalizedText(value) {
  return `BTRIM(REGEXP_REPLACE(TRANSLATE(LOWER(COALESCE(${value}, '')), '${sqlTranslateFrom}', '${sqlTranslateTo}'), '[^[:alnum:]]+', ' ', 'g'))`;
}

function sqlContainsAny(expression, terms) {
  return terms.map((term) => `${expression} LIKE ${sqlString(`%${normalizeText(term)}%`)}`).join(" OR ");
}

function sqlContainsNone(expression, terms) {
  return terms.map((term) => `${expression} NOT LIKE ${sqlString(`%${normalizeText(term)}%`)}`).join(" AND ");
}

function liveEntryBasicEligibilitySqlClause({ alias = "" } = {}) {
  const eligibility = sqlNormalizedText(column(alias, "eligibility"));
  return [
    `(${sqlContainsAny(eligibility, LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS)})`,
    sqlContainsNone(eligibility, LIVE_ENTRY_SPECIAL_ELIGIBILITY_TERMS),
    ...LIVE_ENTRY_SPECIAL_ELIGIBILITY_SQL_PATTERNS.map((pattern) => `${eligibility} !~ ${sqlString(pattern)}`),
  ].join(" AND ");
}

export function hasLiveEntryBasicEligibilityOnly(row = {}) {
  const eligibility = normalizeText(row.eligibility);
  if (!eligibility) return false;

  const hasBasicEligibility = LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS
    .map(normalizeText)
    .some((term) => eligibility.includes(term));
  if (!hasBasicEligibility) return false;

  const hasSpecialEligibilityTerm = LIVE_ENTRY_SPECIAL_ELIGIBILITY_TERMS
    .map(normalizeText)
    .some((term) => eligibility.includes(term));
  if (hasSpecialEligibilityTerm) return false;

  return !LIVE_ENTRY_SPECIAL_ELIGIBILITY_PATTERNS.some((pattern) => pattern.test(eligibility));
}

export function liveEntryProgramSqlClause({ alias = "" } = {}) {
  const schoolType = column(alias, "school_type");
  const kind = column(alias, "kind");
  const level = column(alias, "level");
  const haystack = sqlHaystack(alias);
  const excluded = LIVE_ENTRY_PROGRAM_EXCLUDED_TERMS
    .map((term) => `${haystack} NOT LIKE '%${term}%'`)
    .join(" AND ");

  return [
    `(${schoolType} IS NULL OR ${schoolType} = 'HS')`,
    `${kind} = 'program'`,
    `(${level} IS NULL OR ${level} = '' OR LOWER(${level}) = 'grund' OR LOWER(${level}) LIKE 'grund%')`,
    liveEntryBasicEligibilitySqlClause({ alias }),
    excluded,
  ].join(" AND ");
}

export function isLiveEntryProgram(row = {}) {
  const schoolType = normalizeText(row.school_type ?? row.schoolType);
  if (schoolType && schoolType !== "hs") return false;
  if (normalizeText(row.kind) !== "program") return false;

  const level = normalizeText(row.level);
  if (level && level !== "grund" && !level.startsWith("grund")) return false;

  const haystack = normalizeText(sqlTextColumns.map((name) => row[name]).join(" "));
  return hasLiveEntryBasicEligibilityOnly(row)
    && !LIVE_ENTRY_PROGRAM_EXCLUDED_TERMS.some((term) => haystack.includes(normalizeText(term)));
}
