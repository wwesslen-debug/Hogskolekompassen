export const COMPARE_STORAGE_KEY = "hogskolekompassen-live-compare";
export const LEGACY_COMPARE_STORAGE_KEY = "hogskolekompassen-compare";
export const COMPARE_EVENT_NAME = "hogskolekompassen-compare-change";
export const COMPARE_LIMIT = 3;

const compareKinds = new Set(["live", "program"]);

function normalizeKind(value, fallbackKind = "live") {
  return compareKinds.has(value) ? value : fallbackKind;
}

function normalizeEntry(item, fallbackKind = "live") {
  const defaultKind = normalizeKind(fallbackKind);

  if (typeof item === "number" || typeof item === "string") {
    const id = Number(item);
    return Number.isInteger(id) && id > 0 ? { kind: defaultKind, id } : null;
  }

  if (!item || typeof item !== "object") return null;
  const kind = normalizeKind(
    item.kind || (item.programId != null && item.offeringId == null ? "program" : "live"),
    defaultKind
  );
  const id = Number(kind === "program" ? item.id ?? item.programId : item.id ?? item.offeringId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return { kind, id };
}

export function compareEntryKey(entry) {
  return `${entry.kind}:${entry.id}`;
}

export function normalizeCompareEntries(value, fallbackKind = "live") {
  const seen = new Set();
  const entries = [];

  for (const item of Array.isArray(value) ? value : []) {
    const entry = normalizeEntry(item, fallbackKind);
    if (!entry) continue;
    const key = compareEntryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
    if (entries.length >= COMPARE_LIMIT) break;
  }

  return entries;
}

export function readCompareEntries() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_COMPARE_STORAGE_KEY);
    const currentEntries = raw ? normalizeCompareEntries(JSON.parse(raw), "live") : [];
    const legacyEntries = legacyRaw ? normalizeCompareEntries(JSON.parse(legacyRaw), "program") : [];
    const entries = normalizeCompareEntries([...currentEntries, ...legacyEntries]);

    if (legacyRaw != null) localStorage.removeItem(LEGACY_COMPARE_STORAGE_KEY);
    if (raw != null || legacyRaw != null) localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(entries));

    return entries;
  } catch {
    return [];
  }
}

export function writeCompareEntries(entries) {
  if (typeof window === "undefined") return;
  const normalized = normalizeCompareEntries(entries);
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(COMPARE_EVENT_NAME, { detail: normalized }));
}

export function hasCompareEntry(entries, target) {
  const key = compareEntryKey(target);
  return normalizeCompareEntries(entries).some((entry) => compareEntryKey(entry) === key);
}
