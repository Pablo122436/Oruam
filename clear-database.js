const db = require('./database.js');

console.log('🧹 Iniciando limpeza do banco de dados...');

// Limpar a tabela donations
db.run('DELETE FROM donations', function(err) {
  if (err) {
    console.error('❌ Erro ao limpar tabela donations:', err);
  } else {
    console.log('✅ Tabela donations limpa! Registros removidos:', this.changes);
  }
  
  // Resetar o contador AUTO_INCREMENT
  db.run('DELETE FROM sqlite_sequence WHERE name="donations"', function(err) {
    if (err) {
      console.error('⚠️ Aviso: Não foi possível resetar o AUTO_INCREMENT:', err.message);
    } else {
      console.log('🔄 Contador AUTO_INCREMENT resetado');
    }
    
    // Verificar se a limpeza foi bem-sucedida
    db.get('SELECT COUNT(*) as count FROM donations', [], (err, row) => {
      if (err) {
        console.error('❌ Erro ao verificar limpeza:', err);
      } else {
        console.log('📊 Registros restantes na tabela donations:', row.count);
        
        if (row.count === 0) {
          console.log('🎉 Banco de dados limpo com sucesso!');
          console.log('📋 Estrutura da tabela mantida intacta');
          console.log('🆔 Próximo ID será: 1');
        } else {
          console.log('⚠️ Ainda restam registros na tabela');
        }
      }
      
      // Mostrar estrutura da tabela para confirmar que foi mantida
      db.all('PRAGMA table_info(donations)', [], (err, columns) => {
        if (err) {
          console.error('❌ Erro ao verificar estrutura:', err);
        } else {
          console.log('🏗️ Estrutura da tabela donations:');
          columns.forEach(col => {
            console.log(`   - ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''} ${col.notnull ? '(NOT NULL)' : ''}`);
          });
        }
        
        db.close((err) => {
          if (err) {
            console.error('❌ Erro ao fechar banco:', err);
          } else {
            console.log('🔒 Conexão com banco fechada');
            console.log('✨ Limpeza concluída! O banco está pronto para novos dados.');
          }
        });
      });
    });
  });
});
