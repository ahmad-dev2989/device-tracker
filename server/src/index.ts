import express, { Request, Response, NextFunction } from "express";
import http from "node:http";
import crypto from "node:crypto";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { db, initializeSchema } from "./db.js";
import {
  generateChallenge,
  verifyChallenge,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from "./auth.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const HEARTBEAT_TIMEOUT_MS = parseInt(process.env.HEARTBEAT_TIMEOUT_MS || "30000", 10);

// Initialize DB schema
initializeSchema();

// Express Configuration
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

// Extend Express Request type
interface AuthRequest extends Request {
  deviceId?: string;
  userId?: string;
}

// Authentication Middleware
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing authentication token" });
    return;
  }

  const claims = verifyAccessToken(token);
  if (!claims) {
    res.status(403).json({ error: "Invalid or expired access token" });
    return;
  }

  req.deviceId = claims.deviceId;
  req.userId = claims.userId;
  next();
}

/**
 * ----------------------------------------------------
 * API ENDPOINTS
 * ----------------------------------------------------
 */

// 1. POST /api/devices/register
app.post("/api/devices/register", (req: Request, res: Response) => {
  const { id, publicKey, deviceType, name, platform, appVersion, userId: incomingUserId } = req.body;

  if (!id || !publicKey || !deviceType || !name || !platform || !appVersion) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (deviceType !== "LAPTOP" && deviceType !== "MOBILE") {
    res.status(400).json({ error: "Invalid deviceType. Must be LAPTOP or MOBILE" });
    return;
  }

  try {
    // Check if device already exists
    const deviceCheck = db.prepare("SELECT id FROM devices WHERE id = ?").get(id) as { id: string } | undefined;
    if (deviceCheck) {
      res.status(409).json({ error: "Device already registered" });
      return;
    }

    let userId = incomingUserId;
    if (userId) {
      // Validate incoming user exists
      const userCheck = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
      if (!userCheck) {
        res.status(400).json({ error: "Invalid userId. User does not exist" });
        return;
      }
    } else {
      // Generate new user
      userId = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare("INSERT INTO users (id, createdAt, updatedAt) VALUES (?, ?, ?)").run(userId, now, now);
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO devices (id, userId, deviceType, name, platform, publicKey, appVersion, status, createdAt, updatedAt, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, deviceType, name, platform, publicKey, appVersion, "ONLINE", now, now, now);

    console.log(`[Security Log] Device registered: ${id} (${deviceType}) under user: ${userId}`);
    res.status(201).json({ deviceId: id, userId });
  } catch (err) {
    console.error("[Database Error] Registration failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. POST /api/auth/challenge
app.post("/api/auth/challenge", (req: Request, res: Response) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    res.status(400).json({ error: "Missing deviceId" });
    return;
  }

  // Ensure device exists
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(deviceId) as { id: string } | undefined;
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const challenge = generateChallenge(deviceId);
  res.json({ challenge });
});

// 3. POST /api/auth/login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { deviceId, signature } = req.body;

  if (!deviceId || !signature) {
    res.status(400).json({ error: "Missing deviceId or signature" });
    return;
  }

  // Retrieve device details
  const device = db.prepare("SELECT id, userId, publicKey FROM devices WHERE id = ?").get(deviceId) as
    | { id: string; userId: string; publicKey: string }
    | undefined;

  if (!device) {
    res.status(404).json({ error: "Device not registered" });
    return;
  }

  // Verify signature
  const isVerified = verifyChallenge(deviceId, signature, device.publicKey);
  if (!isVerified) {
    console.warn(`[Security Log] Authentication rejected for device: ${deviceId}`);
    res.status(401).json({ error: "Cryptographic verification failed" });
    return;
  }

  // Generate tokens
  const tokens = generateTokens(device.id, device.userId);
  const now = new Date().toISOString();
  const tokenHash = hashToken(tokens.refreshToken);
  const sessionId = crypto.randomUUID();

  try {
    db.prepare(`
      INSERT INTO sessions (id, deviceId, tokenHash, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, device.id, tokenHash, tokens.expiresAt, now);

    // Update status to ONLINE on successful authentication
    db.prepare(`
      UPDATE devices SET status = 'ONLINE', lastSeenAt = ?, updatedAt = ? WHERE id = ?
    `).run(now, now, device.id);

    console.log(`[Security Log] Device authenticated: ${device.id}`);
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: device.userId,
    });
  } catch (err) {
    console.error("[Database Error] Session insertion failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /api/auth/refresh
app.post("/api/auth/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "Missing refresh token" });
    return;
  }

  const claims = verifyRefreshToken(refreshToken);
  if (!claims) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  // Verify session in database
  const session = db.prepare("SELECT id, expiresAt FROM sessions WHERE tokenHash = ?").get(tokenHash) as
    | { id: string; expiresAt: string }
    | undefined;

  if (!session) {
    res.status(403).json({ error: "Session revoked or invalid" });
    return;
  }

  if (new Date() > new Date(session.expiresAt)) {
    // Clean up expired session
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    res.status(403).json({ error: "Session expired" });
    return;
  }

  // Issue new access token
  const tokens = generateTokens(claims.deviceId, claims.userId);
  const newHash = hashToken(tokens.refreshToken);
  const now = new Date().toISOString();

  try {
    // Rotate refresh token: delete old, insert new
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    const newSessionId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO sessions (id, deviceId, tokenHash, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(newSessionId, claims.deviceId, newHash, tokens.expiresAt, now);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. POST /api/auth/revoke
app.post("/api/auth/revoke", (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "Missing refresh token" });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  try {
    db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(tokenHash);
    console.log("[Security Log] Authentication token revoked");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. GET /api/devices/me
app.get("/api/devices/me", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const device = db.prepare(`
      SELECT id, userId, deviceType, name, platform, appVersion, status, createdAt, lastSeenAt
      FROM devices WHERE id = ?
    `).get(req.deviceId!) as any;

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. GET /api/devices/:id
app.get("/api/devices/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;

  try {
    const device = db.prepare(`
      SELECT id, userId, deviceType, name, platform, appVersion, status, createdAt, lastSeenAt
      FROM devices WHERE id = ?
    `).get(targetId) as any;

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Server-side ownership / association check: device must belong to same user
    if (device.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden: Access denied to other user's device" });
      return;
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. POST /api/devices/heartbeat
app.post("/api/devices/heartbeat", authenticateToken, (req: AuthRequest, res: Response) => {
  const { appVersion } = req.body;
  const now = new Date().toISOString();

  try {
    if (appVersion) {
      db.prepare(`
        UPDATE devices SET status = 'ONLINE', lastSeenAt = ?, appVersion = ?, updatedAt = ? WHERE id = ?
      `).run(now, appVersion, now, req.deviceId!);
    } else {
      db.prepare(`
        UPDATE devices SET status = 'ONLINE', lastSeenAt = ?, updatedAt = ? WHERE id = ?
      `).run(now, now, req.deviceId!);
    }

    console.log(`[Security Log] Heartbeat received from device: ${req.deviceId}`);
    res.json({ success: true, status: "ONLINE", lastSeenAt: now });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ----------------------------------------------------
 * WEBSOCKET SERVER FOUNDATION (REAL-TIME COMMUNICATION)
 * ----------------------------------------------------
 */

const wss = new WebSocketServer({ noServer: true });

// Map to track active WS connections: deviceId -> WebSocket
const activeConnections = new Map<string, WebSocket>();

wss.on("connection", (ws: WebSocket, request: http.IncomingMessage, claims: { deviceId: string; userId: string }) => {
  const deviceId = claims.deviceId;
  activeConnections.set(deviceId, ws);
  console.log(`[Security Log] WebSocket connected & authenticated for device: ${deviceId}`);

  ws.on("message", (message: string) => {
    // WebSocket communication foundation ready for future commands
    console.log(`[WebSocket] Message received from ${deviceId}: ${message.toString()}`);
  });

  ws.on("close", () => {
    activeConnections.delete(deviceId);
    console.log(`[WebSocket] Connection closed for device: ${deviceId}`);
  });
});

// Authenticate WebSocket connection during HTTP upgrade
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const claims = verifyAccessToken(token);
  if (!claims) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request, claims);
  });
});

/**
 * ----------------------------------------------------
 * BACKGROUND WORKER: HEARTBEAT STATUS MONITORING
 * ----------------------------------------------------
 */
setInterval(() => {
  const cutoffTime = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS).toISOString();
  try {
    // Find devices that missed heartbeat
    const offlineDevices = db.prepare(`
      SELECT id FROM devices WHERE status = 'ONLINE' AND lastSeenAt < ?
    `).all(cutoffTime) as { id: string }[];

    if (offlineDevices.length > 0) {
      const now = new Date().toISOString();
      const updateStmt = db.prepare(`
        UPDATE devices SET status = 'OFFLINE', updatedAt = ? WHERE id = ?
      `);

      for (const dev of offlineDevices) {
        updateStmt.run(now, dev.id);
        console.log(`[Security Log] Device marked offline: ${dev.id} (Heartbeat timeout)`);
      }
    }
  } catch (err) {
    console.error("[Worker Error] Failed checking device heartbeats:", err);
  }
}, 10000); // Check every 10 seconds

// Start Server
server.listen(PORT, () => {
  console.log(`[Server] Running on port http://localhost:${PORT}`);
});

export { app, server };
