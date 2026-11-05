const fullTimeAlias = "full_time_offering";

function normalizedColumn(alias, name) {
  return `LOWER(BTRIM(COALESCE(${alias}.${name}, '')))`;
}

function paceIs(alias, pace) {
  return `REGEXP_REPLACE(LOWER(COALESCE(${alias}.study_pace, '')), '[[:space:]]|\u00a0|\u202f', '', 'g') ~ '^${pace}([.,]0+)?(%|procent|percent)?$'`;
}

// A different provider, start, location or delivery mode is a distinct offering.
// End dates and application codes normally differ between the two study paces.
const identityColumns = [
  "title", "provider_name", "city", "period", "start_date", "kind", "level", "study_form", "language",
];

export function liveStudyPacePreferenceSqlClause({ alias = "susa_education_events", eligibleFullTimeSql = "TRUE" } = {}) {
  const identity = identityColumns.map((name) => `${normalizedColumn(fullTimeAlias, name)} = ${normalizedColumn(alias, name)}`);
  identity.push(`COALESCE(${fullTimeAlias}.distance, 0) = COALESCE(${alias}.distance, 0)`);
  return `CASE WHEN ${paceIs(alias, 50)}
    AND ${normalizedColumn(alias, "title")} != ''
    AND ${normalizedColumn(alias, "provider_name")} != ''
    AND ${normalizedColumn(alias, "start_date")} != ''
  THEN NOT EXISTS (
    SELECT 1 FROM susa_education_events ${fullTimeAlias}
    WHERE ${paceIs(fullTimeAlias, 100)}
      AND ${identity.join(" AND ")}
      AND (${eligibleFullTimeSql})
  ) ELSE TRUE END`;
}
