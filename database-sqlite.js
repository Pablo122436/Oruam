const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

// Criar conexão com o banco de dados
const dbPath = path.join(__dirname, 'donations.db');
const db = new sqlite3.Database(dbPath);

// Promisificar métodos do SQLite
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

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
      qr_code TEXT,
      qr_code_base64 TEXT,
      pix_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Banco SQLite inicializado com sucesso!');
});

// Função para executar queries
async function query(sql, params = []) {
  try {
    return await db.allAsync(sql, params);
  } catch (error) {
    console.error('❌ Erro na query SQLite:', error.message);
    throw error;
  }
}

// Função para inserir doação
async function insertDonation(donationData) {
  const { payment_id, amount, donor_name, donor_email, status, qr_code, qr_code_base64, pix_code } = donationData;
  
  const sql = `
    INSERT INTO donations (payment_id, amount, donor_name, donor_email, status, qr_code, qr_code_base64, pix_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  return await db.runAsync(sql, [payment_id, amount, donor_name, donor_email, status, qr_code, qr_code_base64, pix_code]);
}

// Função para atualizar status da doação
async function updateDonationStatus(payment_id, status, paid_at = null) {
  const sql = paid_at 
    ? 'UPDATE donations SET status = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?'
    : 'UPDATE donations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?';
  
  const params = paid_at ? [status, paid_at, payment_id] : [status, payment_id];
  return await db.runAsync(sql, params);
}

// Função para buscar doação por payment_id
async function getDonationByPaymentId(payment_id) {
  const sql = 'SELECT * FROM donations WHERE payment_id = ?';
  return await db.getAsync(sql, [payment_id]);
}

// Função para buscar ranking
async function getRanking(limit = 10) {
  const sql = `
    SELECT donor_name, amount, paid_at 
    FROM donations 
    WHERE status = 'paid' 
    ORDER BY amount DESC, paid_at ASC 
    LIMIT ?
  `;
  return await db.allAsync(sql, [limit]);
}

// Função para buscar doações recentes
async function getRecentDonations(limit = 20) {
  const sql = `
    SELECT donor_name, amount, paid_at 
    FROM donations 
    WHERE status = 'paid' 
    ORDER BY paid_at DESC 
    LIMIT ?
  `;
  return await db.allAsync(sql, [limit]);
}

// Função para obter estatísticas
async function getStats() {
  const totalSql = 'SELECT SUM(amount) as total FROM donations WHERE status = "paid"';
  const countSql = 'SELECT COUNT(*) as count FROM donations WHERE status = "paid"';
  
  const [totalResult, countResult] = await Promise.all([
    db.getAsync(totalSql),
    db.getAsync(countSql)
  ]);
  
  return {
    total: totalResult?.total || 0,
    count: countResult?.count || 0
  };
}

// Função para inicializar banco (compatibilidade com MySQL)
async function initializeDatabase() {
  console.log('✅ SQLite já inicializado');
  return Promise.resolve();
}

// Função para fechar conexão (compatibilidade com MySQL)
async function closeConnection() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error('Erro ao fechar SQLite:', err);
      resolve();
    });
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Fechando conexão SQLite...');
  await closeConnection();
  process.exit(0);
});

module.exports = {
  query,
  insertDonation,
  updateDonationStatus,
  getDonationByPaymentId,
  getRanking,
  getRecentDonations,
  getStats,
  initializeDatabase,
  closeConnection
};
