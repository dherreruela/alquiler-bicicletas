// Capa de base de datos SQLite usando better-sqlite3.
// Proporciona acceso a la base de datos y el esquema de tablas.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Crear directorio de datos si no existe
const dataDir = path.resolve(config.dataDir);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'bikeshare.db');
const db = new Database(dbPath);

// Habilitar integridad referencial y mejor rendimiento
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Crear esquema de tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS bikes (
    id TEXT PRIMARY KEY,
    bikeNumber TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'disponible',
    stationId TEXT,
    pricePerHour REAL DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    capacity INTEGER DEFAULT 10,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    idCard TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    bookingNumber TEXT UNIQUE NOT NULL,
    customerId TEXT NOT NULL,
    bikeId TEXT NOT NULL,
    startStationId TEXT,
    endStationId TEXT,
    startTime TEXT,
    endTime TEXT,
    totalPrice REAL DEFAULT 0,
    status TEXT DEFAULT 'activa',
    createdAt TEXT,
    FOREIGN KEY (customerId) REFERENCES customers(id),
    FOREIGN KEY (bikeId) REFERENCES bikes(id),
    FOREIGN KEY (startStationId) REFERENCES stations(id),
    FOREIGN KEY (endStationId) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'operator'
  );

  CREATE TABLE IF NOT EXISTS pricing (
    id TEXT PRIMARY KEY,
    bikeType TEXT UNIQUE NOT NULL,
    pricePerHour REAL NOT NULL,
    pricePerDay REAL,
    extraHour REAL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_bikes_status ON bikes(status);
  CREATE INDEX IF NOT EXISTS idx_bikes_station ON bikes(stationId);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customerId);
`);

module.exports = db;
