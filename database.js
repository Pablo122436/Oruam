const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Criar conexão com o banco de dados
const dbPath = path.join(__dirname, 'donations.db');
const db = new sqlite3.Database(dbPath);

// Criar tabela de doações se não existir
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT UNIQUE,
      donor_name TEXT,
      donor_email TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      pix_qr_code TEXT,
      pix_qr_code_base64 TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME
    )
  `);
});

module.exports = db;
