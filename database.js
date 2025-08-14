require('dotenv').config();

let db = null;
let isMySQL = false;

// Verificar se está no Railway (variáveis MySQL disponíveis)
const hasMySQL = process.env.MYSQLHOST || process.env.MYSQL_URL;

console.log('🔍 Verificando ambiente...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MYSQLHOST:', process.env.MYSQLHOST ? 'Definido' : 'Não definido');
console.log('MYSQL_URL:', process.env.MYSQL_URL ? 'Definido' : 'Não definido');

if (hasMySQL && process.env.NODE_ENV === 'production') {
  // Usar MySQL em produção (Railway)
  console.log('🗄️ Usando MySQL para produção...');
  isMySQL = true;
  db = require('./database-mysql-only');
} else {
  // Usar SQLite em desenvolvimento
  console.log('🗄️ Usando SQLite para desenvolvimento...');
  isMySQL = false;
  db = require('./database-sqlite');
}

module.exports = db;