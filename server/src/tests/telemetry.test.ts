import "./setup.js";

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { WebSocket } from "ws";
import { server } from "../index.js";
import { db, getDeviceTelemetry } from "../db.js";

let testPort: number;

// Helper to make HTTP requests
async function makeRequest(
  path: string,
  method: "GET" | "POST",
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`http://localhost:${testPort}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  return { status: res.status, data };
}

// Helper to generate key pair and register device
async function setupDevice(name: string, type: "LAPTOP" | "MOBILE") {
  const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const publicKeyJwk = keyPair.publicKey.export({ format: "jwk" });
  const deviceId = crypto.randomUUID();

  const regRes = await makeRequest("/api/devices/register", "POST", {
    id: deviceId,
    publicKey: JSON.stringify(publicKeyJwk),
    deviceType: type,
    name,
    platform: type === "LAPTOP" ? "Windows" : "Android",
    appVersion: "1.0.8",
  });

  // Login challenge
  const challRes = await makeRequest("/api/auth/challenge", "POST", { deviceId });
  const challenge = challRes.data.challenge;

  // Sign challenge
  const signature = crypto.sign("sha256", Buffer.from(challenge), {
    key: keyPair.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const signatureHex = signature.toString("hex");

  // Authentication
  const loginRes = await makeRequest("/api/auth/login", "POST", {
    deviceId,
    signature: signatureHex,
  });

  return {
    deviceId,
    token: loginRes.data.accessToken,
    refreshToken: loginRes.data.refreshToken,
    userId: loginRes.data.userId,
    keyPair,
  };
}

// Helper to setup paired devices per-test
async function setupPairedDevices() {
  const devA = await setupDevice("Laptop " + crypto.randomUUID().substring(0, 8), "LAPTOP");
  const devB = await setupDevice("Mobile " + crypto.randomUUID().substring(0, 8), "MOBILE");
  
  const prRes = await makeRequest("/api/pairings/request", "POST", null, devA.token);
  const requestId = prRes.data.requestId;
  const pairingCode = prRes.data.pairingCode;

  await makeRequest("/api/pairings/validate", "POST", { requestId, pairingCode }, devB.token);
  await makeRequest("/api/pairings/approve", "POST", { requestId, pairingCode }, devB.token);
  
  // Re-authenticate devB to get a fresh token containing the updated userId
  const challRes = await makeRequest("/api/auth/challenge", "POST", { deviceId: devB.deviceId });
  const challenge = challRes.data.challenge;
  const signature = crypto.sign("sha256", Buffer.from(challenge), {
    key: devB.keyPair.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const loginRes = await makeRequest("/api/auth/login", "POST", {
    deviceId: devB.deviceId,
    signature: signature.toString("hex"),
  });
  devB.token = loginRes.data.accessToken;
  
  return { devA, devB };
}

describe("Telemetry & Location Tracking Service Tests", () => {
  before(async () => {
    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        testPort = addr.port;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  test("should deny paired telemetry endpoint access for unauthenticated client", async () => {
    const res = await makeRequest("/api/devices/paired/telemetry", "GET");
    assert.strictEqual(res.status, 401);
  });

  test("should deny paired telemetry endpoint if no active pairing exists", async () => {
    const dev = await setupDevice("Unpaired Device", "LAPTOP");
    const res = await makeRequest("/api/devices/paired/telemetry", "GET", null, dev.token);
    assert.strictEqual(res.status, 403);
    assert.match(res.data.error, /No active pairing found/);
  });

  test("should allow fetching paired device telemetry when paired", async () => {
    const { devA, devB } = await setupPairedDevices();
    const res = await makeRequest("/api/devices/paired/telemetry", "GET", null, devA.token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.deviceId, devB.deviceId);
    assert.strictEqual(res.data.telemetry, null); // No telemetry uploaded yet
  });

  test("should save and route valid LOCATION_UPDATE over WebSocket", async () => {
    const { devA, devB } = await setupPairedDevices();

    const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
    const wsB = new WebSocket(`ws://localhost:${testPort}?token=${devB.token}`);

    await Promise.all([
      new Promise<void>((r) => wsA.on("open", () => r())),
      new Promise<void>((r) => wsB.on("open", () => r())),
    ]);

    const msgId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const locationUpdateMsg = {
      type: "LOCATION_UPDATE",
      id: msgId,
      timestamp,
      payload: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15.4,
        timestamp,
        source: "GPS",
        altitude: 12.5,
      },
    };

    const routingPromise = new Promise<void>((resolve, reject) => {
      wsB.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "LOCATION_UPDATE" && msg.id === msgId) {
            assert.strictEqual(msg.payload.latitude, 37.7749);
            assert.strictEqual(msg.payload.source, "GPS");
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    const ackPromise = new Promise<void>((resolve, reject) => {
      wsA.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "TELEMETRY_ACK" && msg.payload.originalMessageId === msgId) {
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    wsA.send(JSON.stringify(locationUpdateMsg));

    await Promise.all([routingPromise, ackPromise]);

    // Check DB storage
    const stored = getDeviceTelemetry(devA.deviceId);
    assert.ok(stored);
    assert.strictEqual(stored.latitude, 37.7749);
    assert.strictEqual(stored.longitude, -122.4194);
    assert.strictEqual(stored.accuracy, 15.4);
    assert.strictEqual(stored.source, "GPS");
    assert.strictEqual(stored.altitude, 12.5);

    wsA.close();
    wsB.close();
  });

  test("should save and route valid DEVICE_TELEMETRY over WebSocket", async () => {
    const { devA, devB } = await setupPairedDevices();

    const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
    const wsB = new WebSocket(`ws://localhost:${testPort}?token=${devB.token}`);

    await Promise.all([
      new Promise<void>((r) => wsA.on("open", () => r())),
      new Promise<void>((r) => wsB.on("open", () => r())),
    ]);

    const msgId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const telemetryMsg = {
      type: "DEVICE_TELEMETRY",
      id: msgId,
      timestamp,
      payload: {
        timestamp,
        appVersion: "1.0.9",
        platform: "Android",
        battery: {
          level: 85,
          charging: true,
        },
        network: {
          connected: true,
          type: "wifi",
        },
        location: {
          latitude: 37.7753,
          longitude: -122.4201,
          accuracy: 5.2,
          timestamp,
          source: "GPS",
        },
      },
    };

    const routingPromise = new Promise<void>((resolve) => {
      wsB.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "DEVICE_TELEMETRY" && msg.id === msgId) {
          assert.strictEqual(msg.payload.battery.level, 85);
          assert.strictEqual(msg.payload.location.latitude, 37.7753);
          resolve();
        }
      });
    });

    const ackPromise = new Promise<void>((resolve) => {
      wsA.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "TELEMETRY_ACK" && msg.payload.originalMessageId === msgId) {
          resolve();
        }
      });
    });

    wsA.send(JSON.stringify(telemetryMsg));

    await Promise.all([routingPromise, ackPromise]);

    // Check DB storage
    const stored = getDeviceTelemetry(devA.deviceId);
    assert.ok(stored);
    assert.strictEqual(stored.batteryLevel, 85);
    assert.strictEqual(stored.isCharging, true);
    assert.strictEqual(stored.networkType, "wifi");
    assert.strictEqual(stored.latitude, 37.7753);
    assert.strictEqual(stored.accuracy, 5.2);
    assert.strictEqual(stored.source, "GPS");

    wsA.close();
    wsB.close();
  });

  test("should reject malformed or invalid location coordinates", async () => {
    const { devA } = await setupPairedDevices();

    const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
    await new Promise<void>((r) => wsA.on("open", () => r()));

    const msgId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Invalid latitude: 120
    const badMsg = {
      type: "LOCATION_UPDATE",
      id: msgId,
      timestamp,
      payload: {
        latitude: 120,
        longitude: -122.4194,
        accuracy: 10,
        timestamp,
        source: "GPS",
      },
    };

    const errorPromise = new Promise<void>((resolve) => {
      wsA.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "TELEMETRY_ERROR" && msg.payload.originalMessageId === msgId) {
          assert.match(msg.payload.error, /Invalid location coordinates/);
          resolve();
        }
      });
    });

    wsA.send(JSON.stringify(badMsg));
    await errorPromise;

    // Check DB: telemetry must NOT have been updated with coordinates
    const stored = getDeviceTelemetry(devA.deviceId);
    assert.strictEqual(stored, null);

    wsA.close();
  });

  test("should preserve last-known location and update status to OFFLINE on disconnect", async () => {
    const { devA, devB } = await setupPairedDevices();

    const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
    await new Promise<void>((r) => wsA.on("open", () => r()));

    const msgId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const locationUpdateMsg = {
      type: "LOCATION_UPDATE",
      id: msgId,
      timestamp,
      payload: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15.4,
        timestamp,
        source: "GPS",
      },
    };

    const ackPromise = new Promise<void>((resolve) => {
      wsA.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "TELEMETRY_ACK" && msg.payload.originalMessageId === msgId) {
          resolve();
        }
      });
    });

    wsA.send(JSON.stringify(locationUpdateMsg));
    await ackPromise;

    // Disconnect wsA
    wsA.close();
    await new Promise((r) => setTimeout(r, 200)); // wait for socket cleanup and heartbeat check (timeout=100ms)

    // Check endpoint: devA status should be OFFLINE, but location must remain saved (last-known location)
    const res = await makeRequest("/api/devices/paired/telemetry", "GET", null, devB.token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "OFFLINE");
    assert.ok(res.data.telemetry);
    assert.strictEqual(res.data.telemetry.latitude, 37.7749);
    assert.strictEqual(res.data.telemetry.source, "GPS");
  });

  test("should reject revoked pairing telemetry requests", async () => {
    const { devA, devB } = await setupPairedDevices();

    // Revoke pairing
    await makeRequest("/api/pairings/unpair", "POST", null, devA.token);

    // Call paired telemetry endpoint: must return 403
    const res = await makeRequest("/api/devices/paired/telemetry", "GET", null, devA.token);
    assert.strictEqual(res.status, 403);
  });
});
