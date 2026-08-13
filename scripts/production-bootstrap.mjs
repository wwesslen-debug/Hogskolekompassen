import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getBundledSeedDbPath, getDataDir, getDbPath } from "../lib/runtime-paths.mjs";

const dataDir = getDataDir();
const dbPath = getDbPath();
const seedPath = getBundledSeedDbPath();
const sqliteHeader = Buffer.from("SQLite format 3\0", "utf8");

function hasSqliteHeader(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size < sqliteHeader.length) return false;

    const handle = fs.openSync(file, "r");
    try {
      const header = Buffer.alloc(sqliteHeader.length);
      fs.readSync(handle, header, 0, header.length, 0);
      return header.equals(sqliteHeader);
    } finally {
      fs.closeSync(handle);
    }
  } catch {
    return false;
  }
}

function archiveInvalidDatabase(reason) {
  if (path.resolve(dbPath) === path.resolve(seedPath)) {
    console.error(`Bundled seed database is not usable: ${reason}`);
    process.exit(1);
  }

  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(file)) {
      fs.renameSync(file, `${file}.invalid-${suffix}`);
    }
  }

  console.warn(`Archived unusable production database (${reason}) before reseeding: ${dbPath}`);
}

function copySeedDatabase() {
  if (!hasSqliteHeader(seedPath)) {
    console.error(`Production database is missing and bundled seed is not a valid SQLite file: ${seedPath}`);
    process.exit(1);
  }

  if (path.resolve(dbPath) !== path.resolve(seedPath)) {
    fs.copyFileSync(seedPath, dbPath);
    console.log(`Initialized persistent database from seed: ${dbPath}`);
  }
}

function runOptionalMigrations() {
  if (process.env.HK_RUN_BOOT_MIGRATIONS !== "1") {
    console.log("Skipping native SQLite migrations during web boot.");
    return;
  }

  for (const script of ["scripts/migrate-v06.mjs", "scripts/migrate-v07.mjs"]) {
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

fs.mkdirSync(dataDir, { recursive: true });

if (fs.existsSync(dbPath) && !hasSqliteHeader(dbPath)) {
  archiveInvalidDatabase("database file is empty or not SQLite");
}

if (!fs.existsSync(dbPath)) {
  copySeedDatabase();
}

runOptionalMigrations();

console.log("Production bootstrap ready.");
console.log(JSON.stringify({
  environment: process.env.NODE_ENV || "development",
  dataDir,
  dbPath,
  persistentVolume: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.HK_DATA_DIR || process.env.HK_DB_PATH),
  sqliteDisabledForWeb: process.env.HK_DISABLE_SQLITE === "1",
}, null, 2));
