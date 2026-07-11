import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import {
  MULTIPLAYER_ROOM_ID,
  type ClientMessage,
  type PlayerSnapshot,
  type RemotePlayer,
  type ServerMessage,
} from "../src/multiplayer-protocol";

const PORT = Number(process.env.MULTIPLAYER_PORT ?? process.env.PORT ?? 8787);
const HEARTBEAT_TIMEOUT_MS = 15_000;
const CLEANUP_INTERVAL_MS = 5_000;
const VISITOR_STATS_PATH = resolve(process.env.VISITOR_STATS_PATH ?? "data/visitor-stats.json");
const VISITOR_HASH_SALT = process.env.VISITOR_HASH_SALT ?? "mars-advance-team";

type ConnectedPlayer = RemotePlayer & {
  socket: WebSocket;
};

const players = new Map<string, ConnectedPlayer>();

const fallbackSnapshot: PlayerSnapshot = {
  position: [0, 0, 0],
  quaternion: [0, 0, 0, 1],
  speed: 0,
  flying: false,
  insideState: "surface",
};

type VisitorStats = {
  version: 1;
  total: number;
  visitors: Record<string, { firstSeenAt: string; lastSeenAt: string; hits: number }>;
};

const server = createServer((request, response) => {
  if (request.url) {
    const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
    if (url.pathname === "/api/visitors") {
      handleVisitorStatsRequest(request, response);
      return;
    }
  }
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("Mars service is running. Connect multiplayer through /ws and visitor stats through /api/visitors.\n");
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  let boundPlayerId: string | null = null;

  socket.on("message", (raw) => {
    const message = parseClientMessage(raw);
    if (!message) return;

    if (message.type === "join") {
      if (message.roomId !== MULTIPLAYER_ROOM_ID) return;
      boundPlayerId = message.playerId;
      const player: ConnectedPlayer = {
        playerId: message.playerId,
        displayName: sanitizeDisplayName(message.displayName, message.playerId),
        roomId: MULTIPLAYER_ROOM_ID,
        snapshot: players.get(message.playerId)?.snapshot ?? fallbackSnapshot,
        updatedAt: Date.now(),
        socket,
      };
      players.set(message.playerId, player);
      send(socket, {
        type: "welcome",
        playerId: message.playerId,
        peers: listPeers(message.playerId),
      });
      broadcastExcept(message.playerId, {
        type: "player_joined",
        player: publicPlayer(player),
      });
      return;
    }

    if (message.type === "state") {
      const player = players.get(message.playerId);
      if (!player || player.socket !== socket) return;
      player.snapshot = normalizeSnapshot(message.snapshot);
      player.updatedAt = Date.now();
      broadcastExcept(message.playerId, {
        type: "player_state",
        playerId: message.playerId,
        snapshot: player.snapshot,
      });
      return;
    }

    if (message.type === "ping") {
      const player = players.get(message.playerId);
      if (player && player.socket === socket) player.updatedAt = Date.now();
      send(socket, { type: "pong", sentAt: finiteNumber(message.sentAt, Date.now(), 0, Number.MAX_SAFE_INTEGER) });
    }
  });

  socket.on("close", () => {
    if (!boundPlayerId) return;
    const player = players.get(boundPlayerId);
    if (player?.socket === socket) removePlayer(boundPlayerId);
  });

  socket.on("error", () => {
    if (!boundPlayerId) return;
    const player = players.get(boundPlayerId);
    if (player?.socket === socket) removePlayer(boundPlayerId);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [playerId, player] of players) {
    if (now - player.updatedAt > HEARTBEAT_TIMEOUT_MS) removePlayer(playerId);
  }
}, CLEANUP_INTERVAL_MS);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Mars multiplayer server listening on ws://127.0.0.1:${PORT}/ws`);
});

function parseClientMessage(raw: Buffer | ArrayBuffer | Buffer[]): ClientMessage | null {
  try {
    const text = Array.isArray(raw) ? Buffer.concat(raw).toString("utf8") : Buffer.from(raw).toString("utf8");
    const message = JSON.parse(text) as ClientMessage;
    if (!message || typeof message !== "object" || typeof message.type !== "string") return null;
    return message;
  } catch {
    return null;
  }
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function broadcastExcept(playerId: string, message: ServerMessage) {
  for (const player of players.values()) {
    if (player.playerId === playerId) continue;
    send(player.socket, message);
  }
}

function listPeers(playerId: string) {
  return [...players.values()].filter((player) => player.playerId !== playerId).map(publicPlayer);
}

function publicPlayer(player: ConnectedPlayer): RemotePlayer {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    roomId: player.roomId,
    snapshot: player.snapshot,
    updatedAt: player.updatedAt,
  };
}

function removePlayer(playerId: string) {
  const player = players.get(playerId);
  if (!player) return;
  players.delete(playerId);
  try {
    player.socket.close();
  } catch {
    // Socket may already be closed.
  }
  broadcastExcept(playerId, { type: "player_left", playerId });
}

function handleVisitorStatsRequest(request: IncomingMessage, response: ServerResponse) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("cache-control", "no-store");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    response.writeHead(405, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  const visitorKey = hashVisitorIp(readClientIp(request));
  const stats = readVisitorStats();
  const now = new Date().toISOString();
  let unique = false;
  const visitor = stats.visitors[visitorKey];
  if (visitor) {
    visitor.lastSeenAt = now;
    visitor.hits += 1;
  } else {
    stats.visitors[visitorKey] = { firstSeenAt: now, lastSeenAt: now, hits: 1 };
    stats.total += 1;
    unique = true;
  }
  writeVisitorStats(stats);

  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ ok: true, total: stats.total, unique }));
}

function readClientIp(request: IncomingMessage) {
  const realIp = headerFirstValue(request.headers["x-real-ip"]);
  if (realIp) return normalizeIp(realIp);
  const forwardedFor = headerFirstValue(request.headers["x-forwarded-for"]);
  if (forwardedFor) return normalizeIp(forwardedFor.split(",")[0] ?? "");
  return normalizeIp(request.socket.remoteAddress ?? "unknown");
}

function headerFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

function normalizeIp(ip: string) {
  const trimmed = ip.trim();
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  return trimmed || "unknown";
}

function hashVisitorIp(ip: string) {
  return createHash("sha256").update(`${VISITOR_HASH_SALT}:${ip}`).digest("hex");
}

function readVisitorStats(): VisitorStats {
  if (!existsSync(VISITOR_STATS_PATH)) return { version: 1, total: 0, visitors: {} };
  try {
    const parsed = JSON.parse(readFileSync(VISITOR_STATS_PATH, "utf8")) as Partial<VisitorStats>;
    if (parsed.version !== 1 || typeof parsed.total !== "number" || !parsed.visitors || typeof parsed.visitors !== "object") {
      return { version: 1, total: 0, visitors: {} };
    }
    return { version: 1, total: parsed.total, visitors: parsed.visitors };
  } catch {
    return { version: 1, total: 0, visitors: {} };
  }
}

function writeVisitorStats(stats: VisitorStats) {
  mkdirSync(dirname(VISITOR_STATS_PATH), { recursive: true });
  const temporaryPath = `${VISITOR_STATS_PATH}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(stats, null, 2), "utf8");
  renameSync(temporaryPath, VISITOR_STATS_PATH);
}

function sanitizeDisplayName(name: string, playerId: string) {
  const trimmed = name.trim().slice(0, 18);
  if (trimmed) return trimmed;
  return `巡检员 ${playerId.slice(-4).toUpperCase()}`;
}

function normalizeSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
  return {
    position: normalizeTuple(snapshot.position, 3, 0) as [number, number, number],
    quaternion: normalizeTuple(snapshot.quaternion, 4, 0, [0, 0, 0, 1]) as [number, number, number, number],
    speed: finiteNumber(snapshot.speed, 0, 0, 120),
    flying: Boolean(snapshot.flying),
    insideState: ["surface", "habitat", "greenhouse", "rocket", "elevator"].includes(snapshot.insideState) ? snapshot.insideState : "surface",
  };
}

function normalizeTuple(values: unknown, length: number, fallback = 0, wholeFallback?: number[]) {
  if (!Array.isArray(values) || values.length !== length) return wholeFallback ?? new Array(length).fill(fallback);
  return values.map((value) => finiteNumber(value, fallback, -1000, 1000));
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
