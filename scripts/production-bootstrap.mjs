import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { getBundledSeedDbPath, getDataDir, getDbPath } from "../lib/runtime-paths.mjs";

const dataDir = getDataDir();
const dbPath = getDbPath();
const seedPath = getBundledSeedDbPath();
const coreTables = ["questions", "programs"];

function inspectDatabase(file) {
  let db;
  try {
    const stat = fs.statSync(file);
    if (stat.size === 0) {
      return { ready: false, reason: "database file is empty" };
    }

    db = new Database(file, { readonly: true, fileMustExist: true });
    const tables = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name),
    );

    for (const table of coreTables) {
      if (!tables.has(table)) return { ready: false, reason: `missing required table: ${table}` };
    }

    for (const table of coreTables) {
      const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
      if (Number(row?.count || 0) === 0) return { ready: false, reason: `required table is empty: ${table}` };
    }

    return { ready: true };
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : "unknown database validation error",
    };
  } finally {
    if (db) db.close();
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
  if (!fs.existsSync(seedPath)) {
    console.error(`Production database is missing and bundled seed was not found: ${seedPath}`);
    process.exit(1);
  }

  if (path.resolve(dbPath) !== path.resolve(seedPath)) {
    fs.copyFileSync(seedPath, dbPath);
    console.log(`Initialized persistent database from seed: ${dbPath}`);
  }
}

fs.mkdirSync(dataDir, { recursive: true });

if (fs.existsSync(dbPath)) {
  const inspection = inspectDatabase(dbPath);
  if (!inspection.ready) {
    archiveInvalidDatabase(inspection.reason);
    copySeedDatabase();
  }
} else {
  copySeedDatabase();
}

for (const script of ["scripts/migrate-v06.mjs", "scripts/migrate-v07.mjs"]) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Production bootstrap ready.");
console.log(JSON.stringify({
  environment: process.env.NODE_ENV || "development",
  dataDir,
  dbPath,
  persistentVolume: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.HK_DATA_DIR || process.env.HK_DB_PATH),
}, null, 2));
