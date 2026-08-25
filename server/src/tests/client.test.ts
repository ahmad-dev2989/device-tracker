import "./setup.js";
import { test, describe, before } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";

// Mock browser environments before importing client-side files
const mockLocalStorage: Record<string, string> = {};
globalThis.window = {
  crypto: crypto.webcrypto,
  navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  location: { reload: () => {} },
} as any;

globalThis.localStorage = {
  getItem: (key: string) => mockLocalStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockLocalStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorage[key];
  },
  clear: () => {
    for (const k in mockLocalStorage) delete mockLocalStorage[k];
  },
} as any;

// Import client components to test
import { generateDeviceKeyPair, signChallenge } from "../../../src/utils/crypto.ts";
import { secureStore } from "../../../src/utils/secureStore.ts";

describe("Client-Side Logic & Cryptography Tests", () => {
  describe("Cryptographic Key Generation & Signing", () => {
    test("should generate valid ECDSA P-256 JWK key pair", async () => {
      const keys = await generateDeviceKeyPair();
      
      assert.ok(keys.publicKeyJwk);
      assert.ok(keys.privateKeyJwk);
      assert.strictEqual(keys.publicKeyJwk.kty, "EC");
      assert.strictEqual(keys.publicKeyJwk.crv, "P-256");
      assert.strictEqual(keys.privateKeyJwk.kty, "EC");
      assert.strictEqual(keys.privateKeyJwk.crv, "P-256");
    });

    test("should sign challenges correctly and produce valid hex signature", async () => {
      const keys = await generateDeviceKeyPair();
      const challenge = "a1b2c3d4e5f67890a1b2c3d4e5f67890";
      
      const signatureHex = await signChallenge(challenge, keys.privateKeyJwk);
      
      assert.ok(signatureHex);
      assert.strictEqual(typeof signatureHex, "string");
      // ECDSA P-256 IEEE P1363 raw signature is exactly 64 bytes (128 hex chars)
      assert.strictEqual(signatureHex.length, 128);
    });
  });

  describe("Unified Secure Storage Fallback", () => {
    before(() => {
      // Clear mock store
      for (const k in mockLocalStorage) delete mockLocalStorage[k];
    });

    test("should write to LocalStorage fallback in browser test environment", async () => {
      await secureStore.set("test_key", "secret_value_123");
      const val = localStorage.getItem("simulate_test_key");
      
      assert.strictEqual(val, "secret_value_123");
    });

    test("should read from LocalStorage fallback in browser test environment", async () => {
      const val = await secureStore.get("test_key");
      assert.strictEqual(val, "secret_value_123");
    });

    test("should delete from LocalStorage fallback", async () => {
      await secureStore.remove("test_key");
      const val = await secureStore.get("test_key");
      assert.strictEqual(val, null);
    });
  });
});
