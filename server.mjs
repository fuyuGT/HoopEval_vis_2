import fs from "node:fs/promises";
import { createReadStream, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadLocalEnv(filePath) {
  try {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

loadLocalEnv(path.join(__dirname, ".env"));

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const basePath = process.env.BASE_PATH || "/HoopEval_vis_2";
const distDir = path.join(__dirname, "dist");
const databasePath = process.env.HOOPEVAL_DB_PATH || path.join(__dirname, ".hoopeval-db", "sessions.json");
const databaseUrl = process.env.DATABASE_URL || "";
const adminApiToken = process.env.ADMIN_API_TOKEN || "";
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 2_000_000);

const allowedOrigin = process.env.CORS_ORIGIN || "*";
const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": allowedOrigin,
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-token",
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const shouldUseSsl =
  process.env.DATABASE_SSL === "true" ||
  (databaseUrl && !databaseUrl.includes("localhost") && process.env.DATABASE_SSL !== "false");
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    })
  : null;

let schemaReadyPromise = null;

async function ensureSchema() {
  if (!pool) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        session_id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        session_data JSONB NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS study_sessions_participant_idx
        ON study_sessions (participant_id);

      CREATE INDEX IF NOT EXISTS study_sessions_completed_idx
        ON study_sessions (completed_at);
    `);
  }
  await schemaReadyPromise;
}

async function readFileSessions() {
  try {
    const raw = await fs.readFile(databasePath, "utf8");
    const sessions = JSON.parse(raw);
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeFileSessions(sessions) {
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const tempPath = `${databasePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(sessions, null, 2));
  await fs.rename(tempPath, databasePath);
}

async function readSessions() {
  if (!pool) return readFileSessions();

  await ensureSchema();
  const result = await pool.query(`
    SELECT session_data
    FROM study_sessions
    ORDER BY COALESCE(completed_at, started_at, created_at), created_at
  `);
  return result.rows.map((row) => row.session_data);
}

async function readLatestParticipantSession(participantId) {
  const normalizedParticipantId = participantId.trim().toLowerCase();
  if (!normalizedParticipantId || normalizedParticipantId === "admin") return null;

  const sessions = await readSessions();
  const participantSessions = sessions
    .filter(
      (session) =>
        session.participantId?.trim().toLowerCase() === normalizedParticipantId &&
        session.participantId?.trim().toLowerCase() !== "admin",
    )
    .sort((a, b) => {
      const aTime = new Date(a.savedAt || a.startTime || 0).getTime();
      const bTime = new Date(b.savedAt || b.startTime || 0).getTime();
      return bTime - aTime;
    });

  return participantSessions.find((session) => !session.endTime) || participantSessions[0] || null;
}

function normalizeParticipantId(session) {
  return session.participantId?.trim().toLowerCase() || "";
}

function sortSessionsNewestFirst(sessions) {
  return [...sessions].sort((a, b) => {
    const aTime = new Date(a.savedAt || a.startTime || 0).getTime();
    const bTime = new Date(b.savedAt || b.startTime || 0).getTime();
    return bTime - aTime;
  });
}

function getLatestUnfinishedParticipantSession(sessions, participantId, excludedSessionId = "") {
  const normalizedParticipantId = participantId.trim().toLowerCase();
  if (!normalizedParticipantId || normalizedParticipantId === "admin") return null;

  return (
    sortSessionsNewestFirst(sessions).find(
      (session) =>
        normalizeParticipantId(session) === normalizedParticipantId &&
        session.sessionId !== excludedSessionId &&
        !session.endTime,
    ) || null
  );
}

function collapseParticipantSessions(sessions) {
  const latestByParticipant = new Map();
  const admins = [];

  sortSessionsNewestFirst(sessions).forEach((session) => {
    const participantId = normalizeParticipantId(session);
    if (!participantId) return;
    if (participantId === "admin") {
      admins.push(session);
      return;
    }
    if (!latestByParticipant.has(participantId)) {
      latestByParticipant.set(participantId, session);
    }
  });

  return [...latestByParticipant.values(), ...admins].sort((a, b) => {
    const aTime = new Date(a.startTime || a.savedAt || 0).getTime();
    const bTime = new Date(b.startTime || b.savedAt || 0).getTime();
    return aTime - bTime;
  });
}

async function saveSession(session) {
  const savedAt = new Date().toISOString();

  if (!pool) {
    const sessions = await readFileSessions();
    const existingUnfinishedSession = !session.endTime
      ? getLatestUnfinishedParticipantSession(sessions, session.participantId, session.sessionId)
      : null;
    const savedSession = existingUnfinishedSession
      ? {
          ...existingUnfinishedSession,
          ...session,
          sessionId: existingUnfinishedSession.sessionId,
          startTime: existingUnfinishedSession.startTime || session.startTime,
          savedAt,
        }
      : { ...session, savedAt };
    const nextSessions = [...sessions.filter((item) => item.sessionId !== savedSession.sessionId), savedSession];
    await writeFileSessions(nextSessions);
    return savedSession;
  }

  await ensureSchema();
  const existingUnfinishedSession = !session.endTime ? await readLatestParticipantSession(session.participantId) : null;
  const shouldReuseExistingSession =
    existingUnfinishedSession &&
    !existingUnfinishedSession.endTime &&
    existingUnfinishedSession.sessionId !== session.sessionId;
  const savedSession = shouldReuseExistingSession
    ? {
        ...existingUnfinishedSession,
        ...session,
        sessionId: existingUnfinishedSession.sessionId,
        startTime: existingUnfinishedSession.startTime || session.startTime,
        savedAt,
      }
    : { ...session, savedAt };
  await pool.query(
    `
      INSERT INTO study_sessions (
        session_id,
        participant_id,
        is_admin,
        started_at,
        completed_at,
        session_data,
        saved_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
      ON CONFLICT (session_id)
      DO UPDATE SET
        participant_id = EXCLUDED.participant_id,
        is_admin = EXCLUDED.is_admin,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        session_data = EXCLUDED.session_data,
        saved_at = EXCLUDED.saved_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      savedSession.sessionId,
      savedSession.participantId,
      savedSession.participantId?.toLowerCase() === "admin",
      savedSession.startTime || null,
      savedSession.endTime || null,
      JSON.stringify(savedSession),
      savedAt,
    ],
  );
  return savedSession;
}

async function deleteSession(sessionId) {
  if (!sessionId) return false;

  if (!pool) {
    const sessions = await readFileSessions();
    const nextSessions = sessions.filter((session) => session.sessionId !== sessionId);
    if (nextSessions.length === sessions.length) return false;
    await writeFileSessions(nextSessions);
    return true;
  }

  await ensureSchema();
  const result = await pool.query("DELETE FROM study_sessions WHERE session_id = $1", [sessionId]);
  return result.rowCount > 0;
}

async function deleteAllSessions() {
  if (!pool) {
    await writeFileSessions([]);
    return true;
  }

  await ensureSchema();
  await pool.query("DELETE FROM study_sessions");
  return true;
}

async function readBody(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBodyBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, jsonHeaders);
  response.end(JSON.stringify(payload));
}

function requireAdmin(request, response) {
  const adminProtectionEnabled = Boolean(pool || adminApiToken);
  if (!adminProtectionEnabled) return true;

  if (!adminApiToken) {
    sendJson(response, 503, { error: "ADMIN_API_TOKEN is required for admin endpoints." });
    return false;
  }

  if (request.headers["x-admin-token"] !== adminApiToken) {
    sendJson(response, 401, { error: "Admin token is required." });
    return false;
  }

  return true;
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
  const participantSessions = collapseParticipantSessions(sessions).filter((session) => session.participantId?.toLowerCase() !== "admin");
  const completedSessions = participantSessions.filter((session) => session.endTime);
  const trials = participantSessions.flatMap((session) => (session.trials || []).filter((trial) => !trial.isPractice));

  return {
    sessionCount: participantSessions.length,
    completedSessionCount: completedSessions.length,
    trialCount: trials.length,
    avgEpvMatch: average(trials.map((trial) => trial.epvAlignment)),
    avgExplanationUsefulness: average(participantSessions.map((session) => session.postStudyResponses?.explanationUsefulness)),
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

function parseJsonBody(body) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, jsonHeaders);
    response.end();
    return;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, { ok: true, storage: pool ? "postgres" : "file" });
    return;
  }

  if (url.pathname === "/api/sessions/latest" && request.method === "GET") {
    const participantId = url.searchParams.get("participantId") || "";
    if (!participantId.trim()) {
      sendJson(response, 400, { error: "participantId is required" });
      return;
    }

    sendJson(response, 200, { session: await readLatestParticipantSession(participantId) });
    return;
  }

  if (url.pathname === "/api/sessions" && request.method === "GET") {
    if (!requireAdmin(request, response)) return;
    sendJson(response, 200, { sessions: await readSessions() });
    return;
  }

  if (url.pathname === "/api/sessions" && request.method === "DELETE") {
    if (!requireAdmin(request, response)) return;
    await deleteAllSessions();
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/stats" && request.method === "GET") {
    if (!requireAdmin(request, response)) return;
    const sessions = await readSessions();
    sendJson(response, 200, { stats: buildStats(sessions) });
    return;
  }

  if (url.pathname === "/api/sessions" && request.method === "POST") {
    const session = parseJsonBody(await readBody(request));

    if (!session.sessionId || !session.participantId) {
      sendJson(response, 400, { error: "sessionId and participantId are required" });
      return;
    }

    const savedSession = await saveSession(session);
    sendJson(response, 200, { ok: true, session: savedSession });
    return;
  }

  if (url.pathname.startsWith("/api/sessions/") && request.method === "DELETE") {
    if (!requireAdmin(request, response)) return;
    const sessionId = decodeURIComponent(url.pathname.slice("/api/sessions/".length));
    if (!sessionId) {
      sendJson(response, 400, { error: "sessionId is required" });
      return;
    }

    const deleted = await deleteSession(sessionId);
    sendJson(response, deleted ? 200 : 404, deleted ? { ok: true, sessionId } : { error: "Session not found" });
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
    sendJson(response, error.statusCode || 500, { error: error.message || "Internal server error" });
  }
});

server.listen(port, host, () => {
  console.log(`HoopEval server running on http://${host}:${port}${basePath}/ using ${pool ? "Postgres" : "file"} storage`);
});
