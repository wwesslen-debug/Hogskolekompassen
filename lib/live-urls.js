const fallbackSlug = "utbildning";

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");

  return slug || fallbackSlug;
}

export function liveEducationPath(offeringOrId) {
  const offering = typeof offeringOrId === "object" && offeringOrId !== null ? offeringOrId : null;
  const id = String(offering?.id ?? offeringOrId ?? "").trim();
  if (!id) return "/utbildningar";

  const slugSource = offering
    ? [offering.title, offering.providerName, offering.period].filter(Boolean).join(" ")
    : fallbackSlug;

  return `/utbildningar/${slugify(slugSource)}--${encodeURIComponent(id)}`;
}

export function liveEducationIdFromRouteParam(value) {
  const raw = Array.isArray(value) ? value.join("/") : String(value || "");
  const separator = raw.lastIndexOf("--");
  const encodedId = separator >= 0 ? raw.slice(separator + 2) : raw;

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return encodedId;
  }
}

export function safeHttpUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function isAntagningUrl(value) {
  const url = safeHttpUrl(value);
  if (!url) return false;
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  return hostname === "antagning.se" || hostname.endsWith(".antagning.se");
}

export function getLiveApplicationLink(offering = {}) {
  const directUrl = safeHttpUrl(offering.applicationUrl);
  if (!directUrl || isAntagningUrl(directUrl)) return null;

  return {
    href: directUrl,
    label: "Sök via lärosätet ↗",
    source: "application_url",
  };
}

export function getLiveSourceLink(offering = {}) {
  const sourceUrl = safeHttpUrl(offering.sourceUrl);
  if (!sourceUrl || isAntagningUrl(sourceUrl)) return null;

  return {
    href: sourceUrl,
    label: "Lärosätets sida ↗",
    source: "source_url",
  };
}

export function getLiveExternalLink(offering = {}) {
  return getLiveApplicationLink(offering) || getLiveSourceLink(offering);
}
