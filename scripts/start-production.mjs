import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "production",
};

if (!env.SUPABASE_DATABASE_URL) {
  console.warn("SUPABASE_DATABASE_URL is not configured. The app will start, but live catalog data will be empty.");
}

const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextCli, "start", "-H", "0.0.0.0"], {
  cwd: root,
  env,
  stdio: "inherit",
});

server.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Next server exited from signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

server.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
