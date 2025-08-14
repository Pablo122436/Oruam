require('dotenv').config();
const mysql = require('mysql2/promise');

let connection = null;

// Configuração do banco de dados
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'oruam',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Função para conectar ao banco
async function connectToDatabase() {
  try {
    if (!connection) {
      console.log('🔗 Conectando ao MySQL...');
      connection = await mysql.createConnection(dbConfig);
      console.log('✅ Conectado ao MySQL com sucesso!');
    }
    return connection;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MySQL:', error.message);
    throw error;
  }
}

// Função para inicializar as tabelas
async function initializeDatabase() {
  try {
    const conn = await connectToDatabase();
    
    // Criar tabela de doações
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS donations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id VARCHAR(255) UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        donor_name VARCHAR(255),
        donor_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        qr_code TEXT,
        qr_code_base64 TEXT,
        pix_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await conn.execute(createTableQuery);
    console.log('✅ Tabela donations criada/verificada com sucesso!');
    
    // Criar índices para performance
    try {
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_status ON donations(status)');
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_amount ON donations(amount DESC)');
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_paid_at ON donations(paid_at DESC)');
      console.log('✅ Índices criados com sucesso!');
    } catch (indexError) {
      console.log('ℹ️ Índices já existem ou erro menor:', indexError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
    throw error;
  }
}

// Função para executar queries
async function query(sql, params = []) {
  try {
    const conn = await connectToDatabase();
    const [results] = await conn.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
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
  
  return await query(sql, [payment_id, amount, donor_name, donor_email, status, qr_code, qr_code_base64, pix_code]);
}

// Função para atualizar status da doação
async function updateDonationStatus(payment_id, status, paid_at = null) {
  const sql = paid_at 
    ? 'UPDATE donations SET status = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?'
    : 'UPDATE donations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?';
  
  const params = paid_at ? [status, paid_at, payment_id] : [status, payment_id];
  return await query(sql, params);
}

// Função para buscar doação por payment_id
async function getDonationByPaymentId(payment_id) {
  const sql = 'SELECT * FROM donations WHERE payment_id = ?';
  const results = await query(sql, [payment_id]);
  return results[0] || null;
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
  return await query(sql, [limit]);
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
  return await query(sql, [limit]);
}

// Função para obter estatísticas
async function getStats() {
  const totalSql = 'SELECT SUM(amount) as total FROM donations WHERE status = "paid"';
  const countSql = 'SELECT COUNT(*) as count FROM donations WHERE status = "paid"';
  
  const [totalResult, countResult] = await Promise.all([
    query(totalSql),
    query(countSql)
  ]);
  
  return {
    total: totalResult[0]?.total || 0,
    count: countResult[0]?.count || 0
  };
}

// Inicializar banco na inicialização
initializeDatabase().catch(err => {
  console.error('❌ Falha crítica na inicialização do banco:', err);
});

// Função para fechar conexão (para cleanup)
async function closeConnection() {
  if (connection) {
    await connection.end();
    connection = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Fechando conexão com banco...');
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
