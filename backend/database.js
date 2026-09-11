const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Open database connection
async function getDb() {
  return open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });
}

// Initialize database schema
async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL
    )
  `);
  console.log('Database initialized');
}

module.exports = {
  getDb,
  initDb
};
