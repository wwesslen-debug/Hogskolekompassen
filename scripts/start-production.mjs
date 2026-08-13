import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const env = {
  ...process.env,
  HK_DISABLE_SQLITE: process.env.HK_DISABLE_SQLITE || "1",
  NODE_ENV: process.env.NODE_ENV || "production",
};

const bootstrap = spawnSync(process.execPath, ["scripts/production-bootstrap.mjs"], {
  cwd: root,
  env,
  stdio: "inherit",
});

if (bootstrap.status !== 0) {
  process.exit(bootstrap.status ?? 1);
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
