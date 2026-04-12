const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'academy.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sl_no INTEGER NOT NULL,
      name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      class TEXT NOT NULL,
      board TEXT DEFAULT 'N/A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      class TEXT NOT NULL,
      board TEXT DEFAULT 'N/A',
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late')),
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_students_class_board ON students(class, board);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  `);

  // Seed default admin if not exists
  const adminExists = db.prepare('SELECT id FROM admin LIMIT 1').get();
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run(
      process.env.ADMIN_USERNAME || 'admin',
      hashedPassword
    );
    console.log('Default admin account created.');
  }
}

module.exports = { getDb };
