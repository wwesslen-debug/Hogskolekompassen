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
