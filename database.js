const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');

let db;

function getDb() {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

async function initDatabase() {
  const client = getDb();

  await client.executeMultiple(`
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
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin if not exists
  const result = await client.execute('SELECT id FROM admin LIMIT 1');
  if (result.rows.length === 0) {
    const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await client.execute({
      sql: 'INSERT INTO admin (username, password) VALUES (?, ?)',
      args: [process.env.ADMIN_USERNAME || 'admin', hashedPassword]
    });
    console.log('Default admin account created.');
  }

  console.log('Database initialized.');
}

module.exports = { getDb, initDatabase };
