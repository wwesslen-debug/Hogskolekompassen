import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

// Accept database connections without answering them to reproduce a stuck DB.
const sockets = new Set();
let connections = 0;
const database = net.createServer((socket) => {
  connections += 1;
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});
const databasePort = await listen(database);
const reservation = net.createServer();
const port = await listen(reservation);
await new Promise((resolve) => reservation.close(resolve));
const server = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    SUPABASE_DATABASE_URL: `postgresql://test:test@127.0.0.1:${databasePort}/test`,
    SUPABASE_DATABASE_SSL: "disable",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });
const get = (suffix = "") => fetch(`http://127.0.0.1:${port}/api/health${suffix}`, {
  headers: { host: "healthcheck.railway.app" },
  signal: AbortSignal.timeout(12000),
});

try {
  let response;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { response = await get(); break; } catch { await delay(100); }
  }
  assert.ok(response, `Production server did not start:\n${logs}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).service, "ready");
  assert.equal(connections, 0, "Readiness must not connect to the database");

  const detailed = get("?details=1");
  for (let attempt = 0; attempt < 30 && !connections; attempt += 1) await delay(100);
  assert.ok(connections > 0, "Detailed diagnostics should test the database");
  const started = performance.now();
  assert.equal((await get()).status, 200);
  assert.ok(performance.now() - started < 1500, "Readiness must remain fast while diagnostics are waiting");
  const diagnostics = await (await detailed).json();
  assert.equal(diagnostics.liveDataReady, false);
  assert.ok(diagnostics.supabaseError);
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200);
  console.log("OK: readiness and homepage return 200 while the database is unresponsive; diagnostics time out.");
} finally {
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => database.close(resolve));
}
