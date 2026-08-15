export const LIVE_ENTRY_PROGRAM_EXCLUDED_TERMS = [
  "master",
  "magister",
  "avancerad",
  "second cycle",
];

const sqlTextColumns = ["title", "degree", "level", "eligibility"];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function column(alias, name) {
  return alias ? `${alias}.${name}` : name;
}

function sqlHaystack(alias = "") {
  return `LOWER(${sqlTextColumns.map((name) => `COALESCE(${column(alias, name)}, '')`).join(" || ' ' || ")})`;
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
  return !LIVE_ENTRY_PROGRAM_EXCLUDED_TERMS.some((term) => haystack.includes(normalizeText(term)));
}
