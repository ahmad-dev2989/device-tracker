import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-do-not-use-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Temporary in-memory challenge storage: deviceId -> { challenge, expiresAt }
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

/**
 * Generate a cryptographically secure random challenge for a device
 */
export function generateChallenge(deviceId: string): string {
  const challenge = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  challenges.set(deviceId, { challenge, expiresAt });
  return challenge;
}

/**
 * Verify signature of the challenge using the device's public key
 */
export function verifyChallenge(
  deviceId: string,
  signatureHex: string,
  publicKeyJwkStr: string
): boolean {
  const challengeInfo = challenges.get(deviceId);
  if (!challengeInfo) {
    console.error(`[Auth] No challenge found for device: ${deviceId}`);
    return false;
  }

  if (Date.now() > challengeInfo.expiresAt) {
    console.error(`[Auth] Challenge expired for device: ${deviceId}`);
    challenges.delete(deviceId);
    return false;
  }

  try {
    const jwk = JSON.parse(publicKeyJwkStr);
    const pubKey = crypto.createPublicKey({
      key: jwk,
      format: "jwk",
    });

    const isVerified = crypto.verify(
      "sha256",
      Buffer.from(challengeInfo.challenge),
      {
        key: pubKey,
        dsaEncoding: "ieee-p1363",
      },
      Buffer.from(signatureHex, "hex")
    );

    if (isVerified) {
      challenges.delete(deviceId); // Consume the challenge
    } else {
      console.warn(`[Auth] Cryptographic verification failed for device: ${deviceId}`);
    }

    return isVerified;
  } catch (err) {
    console.error(`[Auth] Error verifying challenge:`, err);
    return false;
  }
}

/**
 * Generate Access and Refresh JWTs
 */
export function generateTokens(deviceId: string, userId: string) {
  const accessToken = jwt.sign(
    { deviceId, userId, type: "access" },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { deviceId, userId, type: "refresh" },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
  const expiresAt = new Date((decoded.exp || 0) * 1000).toISOString();

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

/**
 * Verify access token and return token claims
 */
export function verifyAccessToken(token: string): { deviceId: string; userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (decoded.type !== "access") {
      return null;
    }
    return {
      deviceId: decoded.deviceId,
      userId: decoded.userId,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Verify refresh token and return token claims
 */
export function verifyRefreshToken(token: string): { deviceId: string; userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (decoded.type !== "refresh") {
      return null;
    }
    return {
      deviceId: decoded.deviceId,
      userId: decoded.userId,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Compute SHA-256 hash of a string (used to safely store refresh token hashes in DB)
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
