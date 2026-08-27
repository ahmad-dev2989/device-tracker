import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const dbPath = process.env.DATABASE_PATH || "db.sqlite";

// Ensure the directory for the database exists if it's a file
if (dbPath !== ":memory:") {
  const dir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize Database connection
export const db = new DatabaseSync(dbPath);

console.log(`[Database] Initialized SQLite connection to: ${dbPath}`);

// Create Tables schema
export function initializeSchema() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Devices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      deviceType TEXT NOT NULL CHECK(deviceType IN ('LAPTOP', 'MOBILE')),
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      publicKey TEXT NOT NULL,
      appVersion TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ONLINE', 'OFFLINE')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastSeenAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      tokenHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE
    );
  `);

  // Pairings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pairings (
      id TEXT PRIMARY KEY,
      deviceA TEXT NOT NULL,
      deviceB TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACTIVE', 'REVOKED')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (deviceA) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (deviceB) REFERENCES devices(id) ON DELETE CASCADE
    );
  `);

  // Pairing requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pairing_requests (
      id TEXT PRIMARY KEY,
      initiatingDeviceId TEXT NOT NULL,
      pairingSecretHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'EXPIRED', 'CANCELLED', 'CONSUMED')),
      createdAt TEXT NOT NULL,
      consumedAt TEXT,
      FOREIGN KEY (initiatingDeviceId) REFERENCES devices(id) ON DELETE CASCADE
    );
  `);

  // Index to prevent duplicate active pairings between same two devices
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_pairings ON pairings (deviceA, deviceB) WHERE status = 'ACTIVE';
  `);

  // Device Telemetry table
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_telemetry (
      deviceId TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      source TEXT,
      altitude REAL,
      heading REAL,
      speed REAL,
      batteryLevel REAL,
      isCharging INTEGER,
      powerState TEXT,
      networkType TEXT,
      appVersion TEXT,
      platform TEXT,
      FOREIGN KEY (deviceId) REFERENCES devices(id) ON DELETE CASCADE
    );
  `);

  console.log("[Database] Schema check and migrations completed.");
}

export function updateDeviceTelemetry(deviceId: string, telemetry: any) {
  // Check if record exists
  const existing = db.prepare("SELECT deviceId FROM device_telemetry WHERE deviceId = ?").get(deviceId);
  
  if (existing) {
    // Perform update of fields that are passed (coalescing with existing values)
    const sql = `
      UPDATE device_telemetry
      SET 
        timestamp = ?,
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        accuracy = COALESCE(?, accuracy),
        source = COALESCE(?, source),
        altitude = COALESCE(?, altitude),
        heading = COALESCE(?, heading),
        speed = COALESCE(?, speed),
        batteryLevel = COALESCE(?, batteryLevel),
        isCharging = COALESCE(?, isCharging),
        powerState = COALESCE(?, powerState),
        networkType = COALESCE(?, networkType),
        appVersion = COALESCE(?, appVersion),
        platform = COALESCE(?, platform)
      WHERE deviceId = ?
    `;
    db.prepare(sql).run(
      telemetry.timestamp,
      telemetry.latitude !== undefined ? telemetry.latitude : null,
      telemetry.longitude !== undefined ? telemetry.longitude : null,
      telemetry.accuracy !== undefined ? telemetry.accuracy : null,
      telemetry.source !== undefined ? telemetry.source : null,
      telemetry.altitude !== undefined ? telemetry.altitude : null,
      telemetry.heading !== undefined ? telemetry.heading : null,
      telemetry.speed !== undefined ? telemetry.speed : null,
      telemetry.batteryLevel !== undefined ? telemetry.batteryLevel : null,
      telemetry.isCharging !== undefined ? (telemetry.isCharging ? 1 : 0) : null,
      telemetry.powerState !== undefined ? telemetry.powerState : null,
      telemetry.networkType !== undefined ? telemetry.networkType : null,
      telemetry.appVersion !== undefined ? telemetry.appVersion : null,
      telemetry.platform !== undefined ? telemetry.platform : null,
      deviceId
    );
  } else {
    // Insert new record
    const sql = `
      INSERT INTO device_telemetry (
        deviceId, timestamp, latitude, longitude, accuracy, source, 
        altitude, heading, speed, batteryLevel, isCharging, powerState, networkType, appVersion, platform
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      deviceId,
      telemetry.timestamp,
      telemetry.latitude !== undefined ? telemetry.latitude : null,
      telemetry.longitude !== undefined ? telemetry.longitude : null,
      telemetry.accuracy !== undefined ? telemetry.accuracy : null,
      telemetry.source !== undefined ? telemetry.source : null,
      telemetry.altitude !== undefined ? telemetry.altitude : null,
      telemetry.heading !== undefined ? telemetry.heading : null,
      telemetry.speed !== undefined ? telemetry.speed : null,
      telemetry.batteryLevel !== undefined ? telemetry.batteryLevel : null,
      telemetry.isCharging !== undefined ? (telemetry.isCharging ? 1 : 0) : null,
      telemetry.powerState !== undefined ? telemetry.powerState : null,
      telemetry.networkType !== undefined ? telemetry.networkType : null,
      telemetry.appVersion !== undefined ? telemetry.appVersion : null,
      telemetry.platform !== undefined ? telemetry.platform : null
    );
  }
}

export function getDeviceTelemetry(deviceId: string) {
  const row = db.prepare("SELECT * FROM device_telemetry WHERE deviceId = ?").get(deviceId) as any;
  if (!row) return null;
  return {
    deviceId: row.deviceId,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    source: row.source,
    altitude: row.altitude,
    heading: row.heading,
    speed: row.speed,
    batteryLevel: row.batteryLevel,
    isCharging: row.isCharging === 1,
    powerState: row.powerState,
    networkType: row.networkType,
    appVersion: row.appVersion,
    platform: row.platform
  };
}
