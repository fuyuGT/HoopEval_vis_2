import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const basePath = "/HoopEval_vis_2";
const distDir = path.join(__dirname, "dist");
const databasePath = process.env.HOOPEVAL_DB_PATH || path.join(__dirname, ".hoopeval-db", "sessions.json");

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function readSessions() {
  try {
    const raw = await fs.readFile(databasePath, "utf8");
    const sessions = JSON.parse(raw);
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeSessions(sessions) {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const tempPath = `${databasePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(sessions, null, 2));
  await fs.rename(tempPath, databasePath);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, jsonHeaders);
  response.end(JSON.stringify(payload));
}

function average(values) {
  const cleanValues = values.map(Number).filter(Number.isFinite);
  if (!cleanValues.length) return null;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function countValues(values) {
  return values.reduce((counts, value) => {
    if (!value) return counts;
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function buildStats(sessions) {
  const participantSessions = sessions.filter((session) => session.participantId?.toLowerCase() !== "admin");
  const trials = participantSessions.flatMap((session) => (session.trials || []).filter((trial) => !trial.isPractice));

  return {
    sessionCount: participantSessions.length,
    trialCount: trials.length,
    avgEpvMatch: average(trials.map((trial) => trial.epvAlignment)),
    avgExplanationUsefulness: average(trials.map((trial) => trial.explanationUsefulness)),
    avgCoachingUsefulness: average(participantSessions.map((session) => session.postStudyResponses?.overallUsefulness)),
    topActions: countValues(trials.map((trial) => trial.independentActionRanking?.[0])),
    topPlayers: countValues(trials.map((trial) => trial.independentPlayerRanking?.[0])),
    useCases: countValues(participantSessions.flatMap((session) => session.postStudyResponses?.likelyUseCases || [])),
    latestCompletion:
      participantSessions
        .map((session) => session.endTime)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
  };
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, jsonHeaders);
    response.end();
    return;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/sessions" && request.method === "GET") {
    sendJson(response, 200, { sessions: await readSessions() });
    return;
  }

  if (url.pathname === "/api/stats" && request.method === "GET") {
    const sessions = await readSessions();
    sendJson(response, 200, { stats: buildStats(sessions) });
    return;
  }

  if (url.pathname === "/api/sessions" && request.method === "POST") {
    const body = await readBody(request);
    const session = JSON.parse(body || "{}");

    if (!session.sessionId || !session.participantId) {
      sendJson(response, 400, { error: "sessionId and participantId are required" });
      return;
    }

    const sessions = await readSessions();
    const savedSession = { ...session, savedAt: new Date().toISOString() };
    const nextSessions = [...sessions.filter((item) => item.sessionId !== savedSession.sessionId), savedSession];
    await writeSessions(nextSessions);
    sendJson(response, 200, { ok: true, session: savedSession, stats: buildStats(nextSessions) });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function serveStatic(request, response, url) {
  let requestPath = decodeURIComponent(url.pathname);

  if (requestPath === "/") {
    response.writeHead(302, { location: `${basePath}/` });
    response.end();
    return;
  }

  if (requestPath.startsWith(basePath)) {
    requestPath = requestPath.slice(basePath.length) || "/";
  }

  const filePath = requestPath === "/" ? path.join(distDir, "index.html") : path.join(distDir, requestPath);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(resolvedPath);
    if (!stats.isFile()) throw new Error("Not a file");

    response.writeHead(200, { "content-type": contentTypes[path.extname(resolvedPath)] || "application/octet-stream" });
    createReadStream(resolvedPath).pipe(response);
  } catch {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    createReadStream(path.join(distDir, "index.html")).pipe(response);
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(request, response, url);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`HoopEval server running on http://localhost:${port}${basePath}/`);
});
