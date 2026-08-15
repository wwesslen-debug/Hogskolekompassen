import Database from "better-sqlite3";
import pg from "pg";
import { getDbPath } from "../lib/runtime-paths.mjs";
import "./apply-supabase-schema.mjs";

const { Pool } = pg;

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const argValue = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const connectionString = process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  console.error("SUPABASE_DATABASE_URL saknas.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.SUPABASE_DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
});

const tables = [
  "susa_sync_state",
  "susa_providers",
  "susa_education_infos",
  "susa_education_events",
];

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function columnsFor(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function readRows(db, table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

async function upsertRows(table, columns, rows) {
  if (!rows.length) return 0;
  const conflictColumn = table === "susa_sync_state" ? "key" : "id";
  const updates = columns
    .filter((column) => column !== conflictColumn)
    .map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`)
    .join(", ");

  let written = 0;
  const chunkSize = Math.max(50, Math.floor(45000 / Math.max(1, columns.length)));

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const batch = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = batch.map((row) => {
      const rowPlaceholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    });

    await pool.query(`
      INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (${quoteIdent(conflictColumn)}) DO UPDATE SET ${updates}
    `, values);

    written += batch.length;
    process.stdout.write(`\r  ${table}: ${written}/${rows.length}`);
  }
  process.stdout.write("\n");
  return written;
}

async function main() {
  const sourceDbPath = argValue("--db", getDbPath());
  const db = new Database(sourceDbPath, { readonly: true, fileMustExist: true });

  try {
    console.log(`Source SQLite database: ${sourceDbPath}`);
    if (replace) {
      console.log("Clearing Supabase live tables before upload…");
      await pool.query("TRUNCATE susa_education_events, susa_education_infos, susa_providers, susa_sync_state");
    }

    const summary = {};
    for (const table of tables) {
      const columns = columnsFor(db, table);
      const rows = readRows(db, table);
      summary[table] = await upsertRows(table, columns, rows);
    }

    console.log("Supabase upload complete.");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    db.close();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error("Supabase upload failed:");
  console.error(error?.stack || error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
