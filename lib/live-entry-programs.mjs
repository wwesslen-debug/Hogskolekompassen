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

const generalSpecialEligibilityTerms = [
  "särskild behörighet",
  "sarskild behorighet",
  "särskilda behörighetskrav",
  "sarskilda behorighetskrav",
  "områdesbehörighet",
  "omradesbehorighet",
  "specific entry requirements",
  "special entry requirements",
  "additional entry requirements",
];

const postSecondaryEligibilityTerms = [
  "arbetsprov",
  "färdighetsprov",
  "fardighetsprov",
  "antagningsprov",
  "behörighetsprov",
  "urvalsprov",
  "portfolio",
  "audition",
  "yrkeserfarenhet",
  "arbetslivserfarenhet",
  "yrkeslivserfarenhet",
  "yrkeskunskaper",
  "work experience",
  "professional experience",
  "tidigare högskolestudier",
  "tidigare hogskolestudier",
  "eftergymnasial",
  "post secondary education",
  "university credits",
  "university degree",
  "higher education qualification",
  "legitimation",
  "legitimerad",
  "körkort",
  "simkunnighet",
  "militär grundutbildning",
  "militär utbildning",
  "säkerhetsprövning",
  "fysiska tester",
  "inskrivningsprov",
  "lämplighetstest",
  "medicinsk undersökning",
  "medical class",
];

// Use the same regular expressions in JavaScript and Postgres. All matching is
// against normalized text, so formatting cannot change an admission decision.
const upperSecondarySubjectPattern = "(^| )(matematik|fysik|kemi|biologi|naturkunskap|samhallskunskap|historia|religionskunskap|moderna sprak|engelska|svenska( som andrasprak)?|franska|spanska|tyska|geografi|idrott och halsa|programmering|teknik) *((fortsattning|fordjupning|specialisering) *)?(niva *)?([0-9][a-z0-9]*|[a-e])($| )";

const postSecondaryEligibilityPatterns = [
  "(^| )[0-9]+ *(hp|hogskolepoang|ects)($| )",
  "(^| )(kandidatexamen|hogskoleexamen|yrkesexamen|lararexamen|lakarexamen|sjukskoterskeexamen|psykologexamen|socionomexamen|bachelor|master|magister)($| )",
  "(^| )(tidigare|avslutad|avslutade|avklarad|avklarade|genomgangen|genomgangna) +(hogskolekurser|hogskolestudier|hogskoleutbildning|universitetsstudier|universitetsutbildning)($| )",
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

function liveEntryUpperSecondaryEligibilitySqlClause({ alias = "" } = {}) {
  const eligibility = "entry_requirements";
  const scopedText = `CASE WHEN entry_formatted ~ ${sqlString(optionalBasicRoutePattern)}
    THEN ${sqlReplace("entry_formatted", optionalCourseSentencePattern)} ELSE entry_formatted END`;
  const requirements = nonRequiredPatterns.reduce((value, pattern) => sqlReplace(value, pattern), scopedText);
  const hasSchoolSubjects = `${eligibility} ~ ${sqlString(upperSecondarySubjectPattern)}`;
  const conditions = [
    `((${sqlContainsAny(eligibility, LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS)}) OR ${hasSchoolSubjects})`,
    sqlContainsNone(eligibility, postSecondaryEligibilityTerms),
    ...postSecondaryEligibilityPatterns.map((pattern) => `${eligibility} !~ ${sqlString(pattern)}`),
    // A generic "special eligibility" label needs concrete gymnasium subjects.
    // It must not silently admit unspecified professional or artistic skills.
    `((${sqlContainsNone(eligibility, generalSpecialEligibilityTerms)}) OR ${hasSchoolSubjects})`,
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

export function hasLiveEntryUpperSecondaryEligibility(row = {}) {
  const eligibility = admissionRequirements(row.eligibility);
  if (!eligibility) return false;

  const hasBasicEligibility = LIVE_ENTRY_BASIC_ELIGIBILITY_TERMS
    .map(normalizeText)
    .some((term) => eligibility.includes(term));
  const hasSchoolSubjects = new RegExp(upperSecondarySubjectPattern).test(eligibility);
  if (!hasBasicEligibility && !hasSchoolSubjects) return false;

  const hasPostSecondaryRequirement = postSecondaryEligibilityTerms
    .map(normalizeText)
    .some((term) => eligibility.includes(term));
  if (hasPostSecondaryRequirement) return false;

  if (postSecondaryEligibilityPatterns.some((pattern) => new RegExp(pattern).test(eligibility))) return false;
  return hasSchoolSubjects || !generalSpecialEligibilityTerms.map(normalizeText).some((term) => eligibility.includes(term));
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
    liveEntryUpperSecondaryEligibilitySqlClause({ alias }),
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
  return hasLiveEntryUpperSecondaryEligibility(row)
    && !LIVE_ENTRY_PROGRAM_EXCLUDED_TERMS.some((term) => haystack.includes(normalizeText(term)));
}
