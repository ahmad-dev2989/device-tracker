import "./setup.js";

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { WebSocket } from "ws";
import { server } from "../index.js";
import { db } from "../db.js";

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

// Helper to setup paired devices per-test to avoid race conditions
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

describe("WebSocket Authorization, Lifecycle & Routing Tests", () => {

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

  test("should reject WebSocket upgrade with invalid JWT token", (t, done) => {
    const ws = new WebSocket(`ws://localhost:${testPort}?token=invalid-jwt`);
    
    ws.on("open", () => {
      ws.close();
      done(new Error("Should not have opened connection"));
    });

    ws.on("error", (err) => {
      assert.ok(err.message.includes("403") || err.message.includes("401") || err.message.includes("Unexpected server response:"));
      done();
    });
  });

  test("should reject WebSocket upgrade if device has no active pairing", async (t) => {
    const devUnpaired = await setupDevice("Unpaired Device", "LAPTOP");
    
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?token=${devUnpaired.token}`);
      
      ws.on("open", () => {
        ws.close();
        reject(new Error("Unpaired device should not be authorized to open WebSocket"));
      });

      ws.on("error", (err) => {
        assert.ok(err.message.includes("403") || err.message.includes("Unexpected server response:"));
        resolve();
      });
    });
  });

  test("should successfully open WebSocket for authenticated and paired device", async (t) => {
    const { devA } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      
      ws.on("open", () => {
        ws.close();
        resolve();
      });

      ws.on("error", (err) => {
        reject(err);
      });
    });
  });

  test("should terminate obsolete duplicate socket and retain valid new socket", async (t) => {
    const { devA } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const ws1 = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      
      ws1.on("open", () => {
        const ws2 = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
        
        ws2.on("open", () => {
          ws2.close();
        });

        ws1.on("close", (code) => {
          assert.strictEqual(code, 1000);
          resolve();
        });
      });

      ws1.on("error", reject);
    });
  });

  test("should route messages between paired devices and validate payload integrity", async (t) => {
    const { devA, devB } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      const wsB = new WebSocket(`ws://localhost:${testPort}?token=${devB.token}`);

      let openCount = 0;
      const onOpen = () => {
        openCount++;
        if (openCount === 2) {
          setTimeout(() => {
            wsA.send(JSON.stringify({
              type: "DEVICE_STATUS",
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              payload: { battery: 95 }
            }));
          }, 50);
        }
      };

      wsA.on("open", onOpen);
      wsB.on("open", onOpen);

      wsA.on("message", (raw) => {
        console.log("wsA received message:", raw.toString());
      });

      wsB.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "DEVICE_STATUS") {
          assert.strictEqual(msg.payload.battery, 95);
          wsA.close();
          wsB.close();
          resolve();
        }
      });

      wsA.on("error", reject);
      wsB.on("error", reject);
    });
  });

  test("should reject malformed or invalid websocket messages on the backend", async (t) => {
    const { devA } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      
      wsA.on("open", () => {
        wsA.send(JSON.stringify({
          type: "INVALID_TYPE",
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          payload: {}
        }));
      });

      wsA.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ERROR") {
          assert.ok(msg.payload.error.includes("Unknown message type"));
          wsA.close();
          resolve();
        }
      });

      wsA.on("error", reject);
    });
  });

  test("should enforce message size limits (<10KB) on the backend", async (t) => {
    const { devA } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      
      wsA.on("open", () => {
        const hugePayload = "A".repeat(11000);
        wsA.send(JSON.stringify({
          type: "DEVICE_STATUS",
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          payload: { content: hugePayload }
        }));
      });

      wsA.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ERROR") {
          assert.ok(msg.payload.error.includes("exceeds limit"));
          wsA.close();
          resolve();
        }
      });

      wsA.on("error", reject);
    });
  });

  test("should reject duplicate/replayed messages with duplicate message IDs", async (t) => {
    const { devA, devB } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      const wsB = new WebSocket(`ws://localhost:${testPort}?token=${devB.token}`);

      let openCount = 0;
      const msgId = crypto.randomUUID();

      const onOpen = () => {
        openCount++;
        if (openCount === 2) {
          setTimeout(() => {
            const msg = JSON.stringify({
              type: "DEVICE_STATUS",
              id: msgId,
              timestamp: new Date().toISOString(),
              payload: { count: 1 }
            });
            wsA.send(msg);
            wsA.send(msg);
          }, 50);
        }
      };

      wsA.on("open", onOpen);
      wsB.on("open", onOpen);

      let receivedCount = 0;
      wsB.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "DEVICE_STATUS") {
          receivedCount++;
          setTimeout(() => {
            assert.strictEqual(receivedCount, 1);
            wsA.close();
            wsB.close();
            resolve();
          }, 150);
        }
      });

      wsA.on("error", reject);
      wsB.on("error", reject);
    });
  });

  test("should terminate existing active WebSocket connections and notify when pairing is revoked", async (t) => {
    const { devA } = await setupPairedDevices();
    
    await new Promise<void>((resolve, reject) => {
      const wsA = new WebSocket(`ws://localhost:${testPort}?token=${devA.token}`);
      
      wsA.on("open", async () => {
        const unpairRes = await makeRequest("/api/pairings/unpair", "POST", null, devA.token);
        assert.strictEqual(unpairRes.status, 200);
      });

      let receivedRevocation = false;
      wsA.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "PAIRING_STATUS" && msg.payload.status === "REVOKED") {
          receivedRevocation = true;
        }
      });

      wsA.on("close", (code) => {
        assert.ok(receivedRevocation);
        assert.strictEqual(code, 4003);
        resolve();
      });

      wsA.on("error", reject);
    });
  });
});
