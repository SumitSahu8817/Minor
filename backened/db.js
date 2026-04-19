const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Open the built-in Node 22 SQLite database (NO external packages needed!)
const db = new DatabaseSync(path.join(dataDir, 'faculty.db'));

// Enable WAL mode for better performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ─── Schema Creation ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    created_at TEXT   DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS classes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    subject      TEXT    NOT NULL,
    num_students INTEGER NOT NULL,
    num_days     INTEGER NOT NULL,
    syllabus_text TEXT   DEFAULT '',
    created_at   TEXT   DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id     INTEGER NOT NULL,
    session_date TEXT    NOT NULL,
    created_at   TEXT   DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    class_id   INTEGER NOT NULL,
    roll_no    INTEGER NOT NULL,
    is_present INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS planner_items (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    day_no   INTEGER NOT NULL,
    topic    TEXT    NOT NULL,
    is_done  INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  );
`);

// Custom transaction wrapper so old routes work perfectly
db.transaction = (fn) => {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (ex) {
      db.exec('ROLLBACK');
      throw ex;
    }
  };
};

console.log("✔ Database (Node 22 Built-in SQLite) Ready!");

module.exports = db;