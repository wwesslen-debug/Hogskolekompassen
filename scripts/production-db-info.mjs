import fs from "node:fs";
import Database from "better-sqlite3";
import { getDataDir, getDbPath, getSusaCacheDir } from "../lib/runtime-paths.mjs";

const dbPath = getDbPath();
const exists = fs.existsSync(dbPath);
const output = {
  dataDir: getDataDir(),
  dbPath,
  cacheDir: getSusaCacheDir(),
  exists,
  persistentVolumeDetected: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.HK_DATA_DIR || process.env.HK_DB_PATH),
  railwayVolumeMountPath: process.env.RAILWAY_VOLUME_MOUNT_PATH || null,
};

if (exists) {
  const stat = fs.statSync(dbPath);
  output.sizeMb = Math.round((stat.size / 1024 / 1024) * 100) / 100;
  const db = new Database(dbPath, { readonly: true });
  const has = (name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
  output.counts = {
    programs: has("programs") ? db.prepare("SELECT COUNT(*) count FROM programs").get().count : 0,
    providers: has("susa_providers") ? db.prepare("SELECT COUNT(*) count FROM susa_providers").get().count : 0,
    educationInfos: has("susa_education_infos") ? db.prepare("SELECT COUNT(*) count FROM susa_education_infos").get().count : 0,
    educationEvents: has("susa_education_events") ? db.prepare("SELECT COUNT(*) count FROM susa_education_events").get().count : 0,
    linkedEvents: has("susa_education_events") ? db.prepare("SELECT COUNT(*) count FROM susa_education_events WHERE canonical_program_id IS NOT NULL").get().count : 0,
  };
  db.close();
}

console.log(JSON.stringify(output, null, 2));
if (!exists) process.exitCode = 1;
