import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) {
  console.error("SUPABASE_DATABASE_URL saknas. Kopiera connection string från Supabase > Connect > Direct connection eller pooler.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.SUPABASE_DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
});

try {
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  console.log("Supabase live-data schema is ready.");
} finally {
  await pool.end();
}
