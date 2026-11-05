export const LIVE_APPLICATION_STATUS_OPTIONS = [
  { value: "open", label: "Öppen nu" },
  { value: "future", label: "Öppnar senare" },
  { value: "closed", label: "Stängd" },
  { value: "unknown", label: "Datum saknas" },
];

export function emptyLiveFilterOptions() {
  return { periods: [], cities: [], providers: [], kinds: [], applicationStatuses: [], distanceAvailable: false };
}

const dimensions = ["period", "city", "provider", "kind", "applicationStatus", "distance"];

export function normalizeLiveFilterCity(value) {
  return String(value || "").trim().toLocaleLowerCase("sv");
}

function displayCity(value) {
  const city = normalizeLiveFilterCity(value);
  if (!/\p{L}/u.test(city)) return "";
  return city.replace(/(^|[\s/-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("sv"));
}

function isDistance(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function comparePeriods(a, b) {
  const key = (value) => {
    const match = /^(VT|HT) (\d{4})$/.exec(value);
    return match ? Number(match[2]) * 2 + Number(match[1] === "HT") : Infinity;
  };
  return key(a) - key(b) || a.localeCompare(b, "sv");
}

// Each menu respects the search and the other filters, while keeping alternatives
// to its own selection available. Rows come from the entire eligible result set.
export function buildLiveFilterOptions(rows = [], filters = {}) {
  const values = Object.fromEntries(dimensions.map((key) => [key, new Set()]));
  const activeFilters = dimensions.filter((key) => key === "distance" ? isDistance(filters[key]) : Boolean(filters[key]));

  for (const row of rows) {
    const mismatches = activeFilters.filter((key) => key === "distance"
      ? !isDistance(row.distance)
      : key === "city"
        ? normalizeLiveFilterCity(row.city) !== normalizeLiveFilterCity(filters.city)
        : row[key] !== filters[key]);
    if (mismatches.length > 1) continue;

    for (const key of dimensions) {
      if (mismatches.length && mismatches[0] !== key) continue;
      const value = key === "distance" ? isDistance(row[key]) : key === "city" ? displayCity(row.city) : row[key];
      if (value && String(value).trim()) values[key].add(value);
    }
  }

  const sorted = (key) => [...values[key]].sort((a, b) => a.localeCompare(b, "sv"));
  return {
    periods: [...values.period].sort(comparePeriods),
    cities: sorted("city"),
    providers: sorted("provider"),
    kinds: sorted("kind"),
    applicationStatuses: LIVE_APPLICATION_STATUS_OPTIONS.map(({ value }) => value).filter((value) => values.applicationStatus.has(value)),
    distanceAvailable: values.distance.has(true),
  };
}
