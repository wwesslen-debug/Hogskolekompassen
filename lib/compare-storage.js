export const COMPARE_STORAGE_KEY = "hogskolekompassen-live-compare";
export const COMPARE_EVENT_NAME = "hogskolekompassen-compare-change";
export const COMPARE_LIMIT = 3;

function normalizeEntry(item) {
  if (typeof item === "number" || typeof item === "string") {
    const id = Number(item);
    return Number.isInteger(id) && id > 0 ? { kind: "live", id } : null;
  }

  if (!item || typeof item !== "object") return null;
  const id = Number(item.id ?? item.offeringId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return { kind: "live", id };
}

export function compareEntryKey(entry) {
  return `${entry.kind}:${entry.id}`;
}

export function normalizeCompareEntries(value) {
  const seen = new Set();
  const entries = [];

  for (const item of Array.isArray(value) ? value : []) {
    const entry = normalizeEntry(item);
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
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY) || "[]";
    return normalizeCompareEntries(JSON.parse(raw));
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
