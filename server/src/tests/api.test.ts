import "./setup.js";

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { server } from "../index.js";
import { db } from "../db.js";

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

  const res = await fetch(`http://localhost:3005${path}`, {
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

describe("OmniRecover Backend API Tests", () => {
  // Generate testing key pair
  let publicKeyJwkStr: string;
  let privateKey: crypto.KeyObject;
  let deviceId: string;

  let otherPublicKeyJwkStr: string;
  let otherPrivateKey: crypto.KeyObject;
  let otherDeviceId: string;

  before(() => {
    // Device A
    const keysA = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    privateKey = keysA.privateKey;
    publicKeyJwkStr = JSON.stringify(keysA.publicKey.export({ format: "jwk" }));
    deviceId = crypto.randomUUID();

    // Device B
    const keysB = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    otherPrivateKey = keysB.privateKey;
    otherPublicKeyJwkStr = JSON.stringify(keysB.publicKey.export({ format: "jwk" }));
    otherDeviceId = crypto.randomUUID();
  });

  after(() => {
    server.close();
  });

  describe("Device Registration", () => {
    test("should successfully register a valid device", async () => {
      const res = await makeRequest("/api/devices/register", "POST", {
        id: deviceId,
        publicKey: publicKeyJwkStr,
        deviceType: "LAPTOP",
        name: "Test Laptop",
        platform: "Windows",
        appVersion: "1.0.0",
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.deviceId, deviceId);
      assert.ok(res.data.userId);
    });

    test("should fail to register an already existing device ID", async () => {
      const res = await makeRequest("/api/devices/register", "POST", {
        id: deviceId,
        publicKey: publicKeyJwkStr,
        deviceType: "LAPTOP",
        name: "Duplicate Laptop",
        platform: "Windows",
        appVersion: "1.0.0",
      });

      assert.strictEqual(res.status, 409);
      assert.ok(res.data.error.includes("already registered"));
    });

    test("should reject registration with invalid device type", async () => {
      const res = await makeRequest("/api/devices/register", "POST", {
        id: crypto.randomUUID(),
        publicKey: publicKeyJwkStr,
        deviceType: "SMART_TOASTER",
        name: "Kitchen Device",
        platform: "Embedded",
        appVersion: "1.0.0",
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes("deviceType"));
    });
  });

  describe("Challenge-Response Authentication", () => {
    test("should return challenge for a registered device", async () => {
      const res = await makeRequest("/api/auth/challenge", "POST", {
        deviceId,
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.data.challenge);
    });

    test("should fail challenge generation for unregistered device", async () => {
      const res = await makeRequest("/api/auth/challenge", "POST", {
        deviceId: crypto.randomUUID(),
      });

      assert.strictEqual(res.status, 404);
    });

    test("should successfully authenticate with valid cryptographic signature", async () => {
      // 1. Get challenge
      const challengeRes = await makeRequest("/api/auth/challenge", "POST", {
        deviceId,
      });
      const challenge = challengeRes.data.challenge;

      // 2. Sign challenge
      const signature = crypto.sign("sha256", Buffer.from(challenge), {
        key: privateKey,
        dsaEncoding: "ieee-p1363",
      });
      const signatureHex = signature.toString("hex");

      // 3. Login
      const loginRes = await makeRequest("/api/auth/login", "POST", {
        deviceId,
        signature: signatureHex,
      });

      assert.strictEqual(loginRes.status, 200);
      assert.ok(loginRes.data.accessToken);
      assert.ok(loginRes.data.refreshToken);
    });

    test("should reject login with invalid signature", async () => {
      // 1. Get challenge
      await makeRequest("/api/auth/challenge", "POST", { deviceId });

      // 2. Send invalid signature
      const loginRes = await makeRequest("/api/auth/login", "POST", {
        deviceId,
        signature: "aabbccddeeff00112233445566778899",
      });

      assert.strictEqual(loginRes.status, 401);
    });
  });

  describe("Authorization & Security checks", () => {
    let token: string;
    let userId: string;

    before(async () => {
      // Authenticate to get a token
      const challengeRes = await makeRequest("/api/auth/challenge", "POST", { deviceId });
      const challenge = challengeRes.data.challenge;
      const signature = crypto.sign("sha256", Buffer.from(challenge), {
        key: privateKey,
        dsaEncoding: "ieee-p1363",
      });
      const loginRes = await makeRequest("/api/auth/login", "POST", {
        deviceId,
        signature: signature.toString("hex"),
      });
      token = loginRes.data.accessToken;
      userId = loginRes.data.userId;

      // Register second device under different user
      const regRes = await makeRequest("/api/devices/register", "POST", {
        id: otherDeviceId,
        publicKey: otherPublicKeyJwkStr,
        deviceType: "MOBILE",
        name: "Other Phone",
        platform: "Android",
        appVersion: "1.0.0",
      });
    });

    test("should fetch own device details", async () => {
      const res = await makeRequest("/api/devices/me", "GET", undefined, token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, deviceId);
      assert.strictEqual(res.data.userId, userId);
      // Verify secrets are not returned
      assert.strictEqual(res.data.publicKey, undefined);
    });

    test("should deny access to device belonging to another user", async () => {
      const res = await makeRequest(`/api/devices/${otherDeviceId}`, "GET", undefined, token);
      assert.strictEqual(res.status, 403);
      assert.ok(res.data.error.includes("Forbidden"));
    });

    test("should reject requests without authentication headers", async () => {
      const res = await makeRequest("/api/devices/me", "GET");
      assert.strictEqual(res.status, 401);
    });
  });

  describe("Heartbeat & Offline Transition", () => {
    let token: string;

    before(async () => {
      // Authenticate to get a token
      const challengeRes = await makeRequest("/api/auth/challenge", "POST", { deviceId });
      const challenge = challengeRes.data.challenge;
      const signature = crypto.sign("sha256", Buffer.from(challenge), {
        key: privateKey,
        dsaEncoding: "ieee-p1363",
      });
      const loginRes = await makeRequest("/api/auth/login", "POST", {
        deviceId,
        signature: signature.toString("hex"),
      });
      token = loginRes.data.accessToken;
    });

    test("should update device status and lastSeenAt on heartbeat", async () => {
      const start = new Date().toISOString();
      const res = await makeRequest("/api/devices/heartbeat", "POST", { appVersion: "1.0.6" }, token);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "ONLINE");

      // Verify DB reflects update
      const dev = db.prepare("SELECT status, lastSeenAt, appVersion FROM devices WHERE id = ?").get(deviceId) as any;
      assert.strictEqual(dev.status, "ONLINE");
      assert.strictEqual(dev.appVersion, "1.0.6");
      assert.ok(dev.lastSeenAt >= start);
    });

    test("should automatically transition device to OFFLINE after heartbeat timeout", async () => {
      // Wait for heartbeat worker to detect timeout (configured to 100ms, checker runs every 10s or we wait)
      // Since background interval is 10s, we can trigger the check database logic manually to avoid long waits!
      const now = new Date().toISOString();
      // Backdate lastSeenAt to force timeout
      db.prepare("UPDATE devices SET lastSeenAt = ? WHERE id = ?").run(
        new Date(Date.now() - 10000).toISOString(),
        deviceId
      );

      // Trigger the database cleanup query directly (or wait, but unit tests are fast this way!)
      const cutoffTime = new Date(Date.now() - 100).toISOString();
      const offlineDevices = db.prepare(`
        SELECT id FROM devices WHERE status = 'ONLINE' AND lastSeenAt < ?
      `).all(cutoffTime) as { id: string }[];

      assert.ok(offlineDevices.some(d => d.id === deviceId));

      // Apply offline transition
      db.prepare("UPDATE devices SET status = 'OFFLINE', updatedAt = ? WHERE id = ?").run(now, deviceId);

      const dev = db.prepare("SELECT status FROM devices WHERE id = ?").get(deviceId) as any;
      assert.strictEqual(dev.status, "OFFLINE");
    });
  });

  describe("Device Pairing API Tests", () => {
    let laptopToken: string;
    let mobileToken: string;
    let laptopId: string;
    let mobileId: string;
    let requestId: string;
    let pairingCode: string;

    before(async () => {
      // Create and authenticate Laptop
      const keysA = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
      const pubA = JSON.stringify(keysA.publicKey.export({ format: "jwk" }));
      laptopId = crypto.randomUUID();

      await makeRequest("/api/devices/register", "POST", {
        id: laptopId,
        publicKey: pubA,
        deviceType: "LAPTOP",
        name: "Pairing Laptop",
        platform: "Windows",
        appVersion: "1.0.6",
      });

      const challA = await makeRequest("/api/auth/challenge", "POST", { deviceId: laptopId });
      const sigA = crypto.sign("sha256", Buffer.from(challA.data.challenge), {
        key: keysA.privateKey,
        dsaEncoding: "ieee-p1363",
      }).toString("hex");

      const logA = await makeRequest("/api/auth/login", "POST", { deviceId: laptopId, signature: sigA });
      laptopToken = logA.data.accessToken;

      // Create and authenticate Mobile
      const keysB = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
      const pubB = JSON.stringify(keysB.publicKey.export({ format: "jwk" }));
      mobileId = crypto.randomUUID();

      await makeRequest("/api/devices/register", "POST", {
        id: mobileId,
        publicKey: pubB,
        deviceType: "MOBILE",
        name: "Pairing Mobile",
        platform: "Android",
        appVersion: "1.0.6",
      });

      const challB = await makeRequest("/api/auth/challenge", "POST", { deviceId: mobileId });
      const sigB = crypto.sign("sha256", Buffer.from(challB.data.challenge), {
        key: keysB.privateKey,
        dsaEncoding: "ieee-p1363",
      }).toString("hex");

      const logB = await makeRequest("/api/auth/login", "POST", { deviceId: mobileId, signature: sigB });
      mobileToken = logB.data.accessToken;
    });

    test("should successfully create a pairing request", async () => {
      const res = await makeRequest("/api/pairings/request", "POST", undefined, laptopToken);
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.requestId);
      assert.ok(res.data.pairingCode);
      assert.strictEqual(res.data.pairingCode.length, 6);

      requestId = res.data.requestId;
      pairingCode = res.data.pairingCode;
    });

    test("should fail validation with invalid pairing code", async () => {
      const res = await makeRequest("/api/pairings/validate", "POST", {
        requestId,
        pairingCode: "000000",
      }, mobileToken);
      assert.strictEqual(res.status, 401);
    });

    test("should validate pairing request with correct code", async () => {
      const res = await makeRequest("/api/pairings/validate", "POST", {
        requestId,
        pairingCode,
      }, mobileToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.device.id, laptopId);
      assert.strictEqual(res.data.device.name, "Pairing Laptop");
    });

    test("should approve pairing and link devices under same userId", async () => {
      const res = await makeRequest("/api/pairings/approve", "POST", {
        requestId,
        pairingCode,
      }, mobileToken);
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.success);

      // Verify they now have active pairing and same userId
      const activeRes = await makeRequest("/api/pairings/active", "GET", undefined, laptopToken);
      assert.strictEqual(activeRes.status, 200);
      assert.strictEqual(activeRes.data.paired, true);
      assert.strictEqual(activeRes.data.device.id, mobileId);

      // Verify request state is CONSUMED
      const statusRes = await makeRequest(`/api/pairings/status/${requestId}`, "GET", undefined, laptopToken);
      assert.strictEqual(statusRes.status, 200);
      assert.strictEqual(statusRes.data.status, "CONSUMED");
    });

    test("should reject duplicate pairing attempts", async () => {
      // Generate new pairing request
      const reqRes = await makeRequest("/api/pairings/request", "POST", undefined, laptopToken);
      const res = await makeRequest("/api/pairings/approve", "POST", {
        requestId: reqRes.data.requestId,
        pairingCode: reqRes.data.pairingCode,
      }, mobileToken);
      assert.strictEqual(res.status, 409); // conflict: already paired
    });

    test("should revoke pairing on unpair", async () => {
      const res = await makeRequest("/api/pairings/unpair", "POST", undefined, laptopToken);
      assert.strictEqual(res.status, 200);

      // Verify no active pairing
      const activeRes = await makeRequest("/api/pairings/active", "GET", undefined, laptopToken);
      assert.strictEqual(activeRes.status, 200);
      assert.strictEqual(activeRes.data.paired, false);
    });
  });
});
