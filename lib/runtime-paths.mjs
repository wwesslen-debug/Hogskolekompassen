import path from "node:path";

export function getDataDir() {
  if (process.env.HK_DATA_DIR) return path.resolve(process.env.HK_DATA_DIR);
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH);
  return path.join(process.cwd(), "db");
}

export function getDbPath() {
  if (process.env.HK_DB_PATH) return path.resolve(process.env.HK_DB_PATH);
  return path.join(getDataDir(), "hogskolekompassen.sqlite");
}

export function getBundledSeedDbPath() {
  return path.join(process.cwd(), "db", "hogskolekompassen.sqlite");
}

export function getSusaCacheDir() {
  if (process.env.HK_SUSA_CACHE_DIR) return path.resolve(process.env.HK_SUSA_CACHE_DIR);
  return path.join(getDataDir(), ".susa-sync-cache");
}
