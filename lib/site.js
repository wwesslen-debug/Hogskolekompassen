export const siteName = "Högskolekompassen";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.xn--hgskolekompassen-mwb.se").replace(/\/$/, "");
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "kontakt@hogskolekompassen.se";

const catalogNoticePattern = / Katalogposten används för matchning; aktuella program, behörighetskrav och studieorter ska verifieras på Antagning\.se\./g;

export function canonicalUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

export function cleanDescription(value = "", maxLength = 155) {
  const cleaned = String(value)
    .replace(catalogNoticePattern, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatSyncDate(value) {
  if (!value) return "Ingen livesynk registrerad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
