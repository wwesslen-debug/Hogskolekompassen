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
  "grundläggande högskolebehörighet",
  "gymnasiekompetens",
  "gymnasieexamen",
  "högskolebehörighet",
  "hogskolebehorighet",
  "general entry requirements",
  "general eligibility",
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

// Use the same regular expressions in JavaScript and Postgres. All matching is
// against normalized text, so formatting cannot change an admission decision.
const specialEligibilityPatterns = [
  "(^| )(matematik|fysik|kemi|biologi|naturkunskap|samhallskunskap|historia|religionskunskap|moderna sprak) *(fortsattning *)?(niva *)?([0-9][a-z0-9]*|[a-e])($| )",
  "(^| )[0-9]+ *(hp|hogskolepoang|ects)($| )",
  "(^| )(kandidatexamen|hogskoleexamen|yrkesexamen|bachelor|master|magister)($| )",
];

const formattingReplacements = [
  ["<[^>]*>", " "],
  ["&(nbsp|#160|#xa0);", " "],
  ["&(auml|aring|#228|#229|#xe4|#xe5);", "a"],
  ["&(ouml|#246|#xf6);", "o"],
  ["&(shy|#173|#xad);|[\u00ad\u200b-\u200d\ufeff]", ""],
];

const nonRequiredPatterns = [
  "(^| )(ingen sarskild behorighet|inga sarskilda behorighetskrav|inga (ytterligare |extra )?krav pa sarskild behorighet)( kravs| behovs)? *([.!?]|$)",
  "(^| )(sarskild behorighet|sarskilda behorighetskrav) (inga|ingen|saknas) *([.!?]|$)",
  "(^| )(inga arbetsprov|inga antagningsprov|inga fardighetsprov|ingen yrkeserfarenhet|inga tidigare hogskolestudier)( kravs| behovs)? *([.!?]|$)",
  "(^| )no (specific|special|additional) entry requirements *([.!?]|$)",
];

// An optional course must not disqualify the entire program, but only ignore its
// requirements when the source explicitly confirms a basic-eligibility route.
const optionalBasicRoutePattern = "(^| )du kan valja (kurser|amnen)( eller (kurser|amnen))? dar (endast|enbart) grundlaggande behorighet kravs([.!?]|$| )";
const optionalCourseSentencePattern = "(^|[.!?]) *for (vissa )?(valfria|valbara)( eller (valfria|valbara))? (kurser|amnen)( och (kurser|amnen))?( inom programmet)? ((kravs|galler) )?(sarskild behorighet|sarskilda behorighetskrav)( kravs| galler)? *([.!?]|$)";

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

function normalizeEligibilityText(value, { sentences = false } = {}) {
  let text = normalizeText(value);
  for (const [pattern, replacement] of formattingReplacements) {
    text = text.replace(new RegExp(pattern, "g"), replacement);
  }
  return text.replace(sentences ? /[^a-z0-9.!?]+/g : /[^a-z0-9]+/g, " ").trim();
}

function sqlReplace(value, pattern, replacement = " ") {
  return `REGEXP_REPLACE(${value}, ${sqlString(pattern)}, ${sqlString(replacement)}, 'g')`;
}

function sqlNormalizedText(value, { sentences = false } = {}) {
  let text = `TRANSLATE(LOWER(COALESCE(${value}, '')), '${sqlTranslateFrom}', '${sqlTranslateTo}')`;
  for (const [pattern, replacement] of formattingReplacements) {
    text = sqlReplace(text, pattern, replacement);
  }
  return `BTRIM(${sqlReplace(text, sentences ? "[^a-z0-9.!?]+" : "[^a-z0-9]+")})`;
}

function admissionRequirements(value) {
  let text = normalizeEligibilityText(value, { sentences: true });
  if (new RegExp(optionalBasicRoutePattern).test(text)) {
    text = text.replace(new RegExp(optionalCourseSentencePattern, "g"), " ");
  }
  for (const pattern of nonRequiredPatterns) {
    text = text.replace(new RegExp(pattern, "g"), " ");
  }
  return normalizeEligibilityText(text);
}

function sqlContainsAny(expression, terms) {
  return terms.map((term) => `${expression} LIKE ${sqlString(`%${normalizeText(term)}%`)}`).join(" OR ");
}

function sqlContainsNone(expression, terms) {
  return terms.map((term) => `${expression} NOT LIKE ${sqlString(`%${normalizeText(term)}%`)}`).join(" AND ");
}

function liveEntryBasicEligibilitySqlClause({ alias = "" } = {}) {
  const eligibility = "entry_requirements";
  const scopedText = `CASE WHEN entry_formatted ~ ${sqlString(optionalBasicRoutePattern)}
    THEN ${sqlReplace("entry_formatted", optionalCourseSentencePattern)} ELSE entry_formatted END`;
  const requirements = nonRequiredPatterns.reduce((value, pattern) => sqlReplace(value, pattern), scopedText);
  const conditions = [
    `(${sqlContainsAny(eligibility, LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS)})`,
    sqlContainsNone(eligibility, LIVE_ENTRY_SPECIAL_ELIGIBILITY_TERMS),
    ...specialEligibilityPatterns.map((pattern) => `${eligibility} !~ ${sqlString(pattern)}`),
  ].join(" AND ");
  return `EXISTS (
    WITH entry_source AS MATERIALIZED (
      SELECT ${sqlNormalizedText(column(alias, "eligibility"), { sentences: true })} AS entry_formatted
    ), entry_admission AS MATERIALIZED (
      SELECT ${sqlNormalizedText(requirements)} AS entry_requirements FROM entry_source
    )
    SELECT 1 FROM entry_admission
    WHERE ${conditions}
  )`;
}

export function hasLiveEntryBasicEligibilityOnly(row = {}) {
  const eligibility = admissionRequirements(row.eligibility);
  if (!eligibility) return false;

  const hasBasicEligibility = LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS
    .map(normalizeText)
    .some((term) => eligibility.includes(term));
  if (!hasBasicEligibility) return false;

  const hasSpecialEligibilityTerm = LIVE_ENTRY_SPECIAL_ELIGIBILITY_TERMS
    .map(normalizeText)
    .some((term) => eligibility.includes(term));
  if (hasSpecialEligibilityTerm) return false;

  return !specialEligibilityPatterns.some((pattern) => new RegExp(pattern).test(eligibility));
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
