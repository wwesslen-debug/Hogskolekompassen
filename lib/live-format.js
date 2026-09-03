function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function formatLiveDate(value) {
  const key = normalizeDateKey(value);
  if (!key) return value ? String(value) : null;

  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function getLiveApplicationStatus(offering = {}, options = {}) {
  const {
    deadlineVerb = "Sök senast",
    fallback = "Kontrollera ansökan",
    unknownTone = "neutral",
  } = options;
  const today = localDateKey();
  const opens = normalizeDateKey(offering.applicationOpen);
  const deadline = normalizeDateKey(offering.applicationDeadline);

  if (deadline && deadline < today) return { label: "Ansökan stängd", tone: "closed" };
  if (opens && opens > today) return { label: `Öppnar ${formatLiveDate(opens)}`, tone: "future" };
  if (deadline) return { label: `${deadlineVerb} ${formatLiveDate(deadline)}`, tone: "open" };
  return { label: fallback, tone: unknownTone };
}

export function getLiveCreditsLabel(offering = {}) {
  if (!offering.credits) return "Ej angiven";
  return `${offering.credits} ${offering.creditsUnit || "hp"}`;
}
