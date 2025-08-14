const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração para Railway...\n');

// Verificar arquivos essenciais
const requiredFiles = [
  'package.json',
  'server.js',
  'database-mysql.js',
  'railway.json',
  'Procfile',
  '.env.railway',
  'RAILWAY_DEPLOY.md',
  'public/index.html'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTANDO`);
    allFilesExist = false;
  }
});

// Verificar package.json
console.log('\n📦 Verificando package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (packageJson.scripts && packageJson.scripts.start) {
  console.log('✅ Script "start" configurado');
} else {
  console.log('❌ Script "start" não encontrado');
  allFilesExist = false;
}

if (packageJson.engines) {
  console.log('✅ Engines especificado');
} else {
  console.log('⚠️  Engines não especificado (recomendado)');
}

if (packageJson.dependencies && packageJson.dependencies.mysql2) {
  console.log('✅ MySQL2 dependency encontrada');
} else {
  console.log('❌ MySQL2 dependency não encontrada');
  allFilesExist = false;
}

// Verificar .gitignore
console.log('\n🔒 Verificando .gitignore...');
const gitignore = fs.readFileSync('.gitignore', 'utf8');

if (gitignore.includes('.env')) {
  console.log('✅ .env ignorado');
} else {
  console.log('❌ .env não está sendo ignorado');
  allFilesExist = false;
}

// Verificar server.js
console.log('\n🗄️ Verificando configuração do banco...');
const serverJs = fs.readFileSync('server.js', 'utf8');

if (serverJs.includes('database-mysql')) {
  console.log('✅ Server.js configurado para MySQL');
} else {
  console.log('❌ Server.js não está configurado para MySQL');
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 CONFIGURAÇÃO COMPLETA!');
  console.log('🚀 Seu projeto está pronto para o Railway!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Commit e push para o GitHub');
  console.log('2. Conecte o repositório ao Railway');
  console.log('3. Adicione serviço MySQL no Railway');
  console.log('4. Configure as variáveis MP_ACCESS_TOKEN e MP_PUBLIC_KEY');
  console.log('5. Deploy automático será iniciado!');
  console.log('\n🗄️ O MySQL será configurado automaticamente pelo Railway');
} else {
  console.log('❌ Configuração incompleta');
  console.log('Corrija os problemas acima antes do deploy');
}

console.log('\n📖 Leia o RAILWAY_DEPLOY.md para instruções detalhadas');
