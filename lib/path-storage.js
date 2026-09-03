export const PATH_STORAGE_KEY = "hogskolekompassen-path";
export const PATH_EVENT_NAME = "hogskolekompassen-path-change";

export const pathStatuses = [
  { id: "favorite", label: "Favorit", icon: "★" },
  { id: "interesting", label: "Intressant", icon: "+" },
  { id: "unsure", label: "Osäker", icon: "?" },
  { id: "no", label: "Inte för mig", icon: "×" },
];

const pathKinds = new Set(["live", "program"]);
const statusIds = new Set(pathStatuses.map((item) => item.id));

function normalizeKind(value, fallbackKind = "live") {
  return pathKinds.has(value) ? value : fallbackKind;
}

function normalizeStatus(value) {
  return statusIds.has(value) ? value : "";
}

function normalizeLiveId(value) {
  const id = String(value ?? "").trim();
  return id || null;
}

function normalizeProgramId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function normalizePathTarget(value = {}, fallbackKind = "live") {
  const inferredKind = value.kind
    || (value.offeringId != null ? "live" : value.programId != null ? "program" : fallbackKind);
  const kind = normalizeKind(inferredKind, fallbackKind);
  const id = kind === "program"
    ? normalizeProgramId(value.programId ?? value.id)
    : normalizeLiveId(value.offeringId ?? value.id);
  return id == null ? null : { kind, id };
}

function normalizePathEntry(item, fallbackKind = "live") {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const target = normalizePathTarget(item, fallbackKind);
  const status = normalizeStatus(item.status);
  if (!target || !status) return null;

  return {
    ...target,
    status,
    savedAt: typeof item.savedAt === "string" ? item.savedAt : null,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
  };
}

function legacyPathObjectToEntries(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([id, status]) => ({ kind: "program", id, status }));
}

export function pathEntryKey(entry) {
  return `${entry.kind}:${entry.id}`;
}

export function normalizePathEntries(value, fallbackKind = "live") {
  const rawEntries = Array.isArray(value) ? value : legacyPathObjectToEntries(value);
  const seen = new Set();
  const entries = [];

  for (const item of rawEntries) {
    const entry = normalizePathEntry(item, fallbackKind);
    if (!entry) continue;
    const key = pathEntryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  return entries;
}

export function readPathEntries() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(PATH_STORAGE_KEY);
    if (!raw) return [];
    const entries = normalizePathEntries(JSON.parse(raw), "program");
    localStorage.setItem(PATH_STORAGE_KEY, JSON.stringify(entries));
    return entries;
  } catch {
    return [];
  }
}

export function writePathEntries(entries) {
  if (typeof window === "undefined") return;
  const normalized = normalizePathEntries(entries);
  localStorage.setItem(PATH_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(PATH_EVENT_NAME, { detail: normalized }));
}

export function getPathStatus(entries, target) {
  const normalizedTarget = normalizePathTarget(target);
  if (!normalizedTarget) return "";

  const key = pathEntryKey(normalizedTarget);
  const entry = normalizePathEntries(entries).find((item) => pathEntryKey(item) === key);
  return entry?.status || "";
}

export function setPathStatus(target, nextStatus) {
  const normalizedTarget = normalizePathTarget(target);
  if (!normalizedTarget) {
    return { entries: readPathEntries(), previousStatus: "", status: "", removing: true };
  }

  const current = readPathEntries();
  const key = pathEntryKey(normalizedTarget);
  const previousEntry = current.find((item) => pathEntryKey(item) === key);
  const previousStatus = previousEntry?.status || "";
  const status = normalizeStatus(nextStatus);
  const removing = !status || previousStatus === status;
  const rest = current.filter((item) => pathEntryKey(item) !== key);

  if (removing) {
    writePathEntries(rest);
    return { entries: rest, previousStatus, status: "", removing: true };
  }

  const now = new Date().toISOString();
  const next = [{
    ...normalizedTarget,
    status,
    savedAt: previousEntry?.savedAt || now,
    updatedAt: now,
  }, ...rest];
  writePathEntries(next);
  return { entries: next, previousStatus, status, removing: false };
}
