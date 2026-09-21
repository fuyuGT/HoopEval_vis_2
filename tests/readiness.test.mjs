import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { studyConfig } from "../src/studyConfig.js";

const root = fileURLToPath(new URL("../", import.meta.url));

async function fixture(t, overrides = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hoopeval-readiness-"));
  const databasePath = path.join(dir, "sessions.json");
  const env = {
    ...process.env,
    NODE_ENV: "test", HOST: "127.0.0.1", PORT: "0",
    DATABASE_URL: "", ADMIN_API_TOKEN: "synthetic-test-admin",
    HOOPEVAL_DB_PATH: databasePath, BASE_PATH: "/HoopEval_vis_2",
    DATABASE_SSL: "false", MAX_BODY_BYTES: "2000000", ...overrides,
  };
  let child;
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "exit");
      child.kill("SIGTERM");
      await closed;
    }
  }
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  async function start() {
    child = spawn(process.execPath, ["server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    const url = await new Promise((resolve, reject) => {
      let output = "";
      let errors = "";
      child.stderr.on("data", (chunk) => { errors += chunk; });
      const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 10000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", () => { clearTimeout(timeout); reject(new Error(`Server exited before startup: ${errors}`)); });
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timeout); resolve(match[0]); }
      });
    });
    return async (endpoint, options = {}) => fetch(`${url}${endpoint}`, {
      ...options, signal: AbortSignal.timeout(15000),
    });
  }
  return { start, stop, databasePath, env };
}

const sample = {
  sessionId: "synthetic-session", participantId: "synthetic-participant",
  startTime: "2026-09-21T12:00:00.000Z", endTime: "",
  trials: [{ sequenceId: "synthetic-possession", answer: "first" }],
};
const post = (session) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(session) });
const admin = { headers: { "x-admin-token": "synthetic-test-admin" } };

test("session insert/update is durable across API restart; admin reads and deletes require credentials", async (t) => {
  const f = await fixture(t);
  let request = await f.start();
  assert.deepEqual(await (await request("/api/health")).json(), { ok: true, storage: "file" });
  assert.equal((await request("/api/sessions", post(sample))).status, 200);
  const completed = { ...sample, endTime: "2026-09-21T13:00:00.000Z", trials: [{ answer: "final" }] };
  assert.equal((await request("/api/sessions", post(completed))).status, 200);
  await f.stop();
  request = await f.start();
  assert.equal((await request("/api/sessions")).status, 401);
  assert.equal((await request("/api/sessions", { method: "DELETE" })).status, 401);
  const { sessions } = await (await request("/api/sessions", admin)).json();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].trials[0].answer, "final");
  assert.equal(sessions[0].endTime, completed.endTime);
  assert.equal((await request(`/api/sessions/${sample.sessionId}`, { ...admin, method: "DELETE" })).status, 200);
  assert.deepEqual((await (await request("/api/sessions", admin)).json()).sessions, []);
});

test("invalid JSON and missing identifiers are rejected", async (t) => {
  const f = await fixture(t);
  const request = await f.start();
  assert.equal((await request("/api/sessions", { method: "POST", body: "{" })).status, 400);
  assert.equal((await request("/api/sessions", post({}))).status, 400);
});

test("unreachable PostgreSQL returns unhealthy, including repeated checks", async (t) => {
  const f = await fixture(t, { DATABASE_URL: "postgres://synthetic:synthetic@127.0.0.1:1/synthetic" });
  const request = await f.start();
  for (let index = 0; index < 2; index++) {
    const response = await request("/api/health");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, storage: "postgres", error: "Storage unavailable" });
  }
});

test("corrupted local storage fails health check and recovers after repair", async (t) => {
  const f = await fixture(t);
  const request = await f.start();
  await writeFile(f.databasePath, "broken-json");
  assert.equal((await request("/api/health")).status, 503);
  await writeFile(f.databasePath, "[]");
  assert.equal((await request("/api/health")).status, 200);
});

test("production refuses to run without database or admin configuration", async (t) => {
  for (const overrides of [{ DATABASE_URL: "" }, { DATABASE_URL: "postgres://synthetic", ADMIN_API_TOKEN: "" }]) {
    const f = await fixture(t, { NODE_ENV: "production", ...overrides });
    await assert.rejects(f.start(), /Production requires DATABASE_URL and ADMIN_API_TOKEN/);
  }
});

test("production page, built assets, and all configured study data are served", async (t) => {
  const f = await fixture(t);
  const request = await f.start();
  const page = await request("/HoopEval_vis_2/");
  assert.equal(page.status, 200);
  const html = await page.text();
  const scripts = [...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)].map((match) => match[1]);
  assert.ok(scripts.length >= 2);
  for (const url of scripts) {
    const asset = await request(url);
    assert.equal(asset.status, 200);
    assert.ok(!asset.headers.get("content-type").includes("text/html"));
  }
  const names = [...studyConfig.practiceSequenceIds, ...studyConfig.mainSequenceIds];
  assert.equal(new Set(names).size, names.length);
  assert.ok(studyConfig.mainSequenceIds.length >= studyConfig.mainTrialCount);
  for (const name of names) {
    const source = JSON.parse(await readFile(path.join(root, "public/data", name), "utf8"));
    const response = await request(`/HoopEval_vis_2/data/${name}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), source);
    assert.ok(source.frames.length > 0);
    assert.ok(source.player_ids.length > 0);
  }
});
