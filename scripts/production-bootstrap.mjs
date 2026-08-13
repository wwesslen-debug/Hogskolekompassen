import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getBundledSeedDbPath, getDataDir, getDbPath } from "../lib/runtime-paths.mjs";

const dataDir = getDataDir();
const dbPath = getDbPath();
const seedPath = getBundledSeedDbPath();

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(dbPath)) {
  if (!fs.existsSync(seedPath)) {
    console.error(`Produktionsdatabasen saknas och seed-databasen hittades inte: ${seedPath}`);
    process.exit(1);
  }

  if (path.resolve(dbPath) !== path.resolve(seedPath)) {
    fs.copyFileSync(seedPath, dbPath);
    console.log(`Initierade persistent databas från seed: ${dbPath}`);
  }
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
