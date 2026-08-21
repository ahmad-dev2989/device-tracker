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

  console.log("[Database] Schema check and migrations completed.");
}
