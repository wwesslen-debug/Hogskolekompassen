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

function safeHttpUrl(value) {
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

export function antagningSearchUrl(offering = {}) {
  const query = String(offering.title || offering.applicationCode || "").trim();
  if (!query) return "";
  const params = new URLSearchParams({ freeText: query });
  return `https://www.antagning.se/se/search?${params.toString()}`;
}

export function getLiveApplicationLink(offering = {}) {
  const directUrl = safeHttpUrl(offering.applicationUrl);
  if (directUrl) {
    return {
      href: directUrl,
      label: isAntagningUrl(directUrl) ? "Sök på Antagning.se ↗" : "Sök utbildningen ↗",
      source: "application_url",
    };
  }

  const fallbackUrl = antagningSearchUrl(offering);
  return fallbackUrl
    ? { href: fallbackUrl, label: "Sök på Antagning.se ↗", source: "antagning_search" }
    : null;
}
