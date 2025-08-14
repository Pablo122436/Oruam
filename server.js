require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS para produção
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CORS_ORIGIN, /\.railway\.app$/]
    : true,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Health check endpoint para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Configurar Mercado Pago - Versão Compatível
if (!process.env.MP_ACCESS_TOKEN) {
  console.warn('⚠️  MP_ACCESS_TOKEN não configurado. Configure as variáveis de ambiente.');
} else {
  mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN
  });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar pagamento PIX - Versão Robusta com Fallback
app.post('/create-pix-payment', async (req, res) => {
  try {
    const { amount, donor_name, donor_email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Verificar se é modo de teste
    const isTestMode = process.env.MP_ACCESS_TOKEN.startsWith('TEST-');
    let paymentResponse = null;
    let usedFallback = false;

    // Tentar criar pagamento real (funciona tanto em teste quanto produção)
    try {
      const paymentData = {
        transaction_amount: parseFloat(amount),
        description: `Doação de ${donor_name || 'Doador Anônimo'}`,
        payment_method_id: 'pix',
        payer: {
          email: donor_email || `doador${Date.now()}@${isTestMode ? 'test' : 'gmail'}.com`,
          first_name: donor_name || 'Doador',
          last_name: 'Anônimo'
        }
      };

      console.log('💰 Tentando criar pagamento PIX no Mercado Pago:', paymentData);
      console.log(isTestMode ? '🧪 Modo: TESTE' : '🚀 Modo: PRODUÇÃO');
      
      paymentResponse = await mercadopago.payment.create(paymentData);
      console.log('✅ Pagamento criado com sucesso:', paymentResponse.body.id);

    } catch (mpError) {
      console.log('⚠️ Mercado Pago falhou:', mpError.message);
      console.log('🔄 Usando fallback de demonstração...');
      
      // Criar pagamento simulado para demonstração
      const simulatedId = `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const qrCodeData = `00020126580014br.gov.bcb.pix0136${Date.now()}52040000530398654${amount.toString().padStart(6, '0')}5802BR5925DEMO MERCADO PAGO PIX6009SAO PAULO62240520${simulatedId}6304`;
      
      // Gerar QR Code base64 simulado (placeholder)
      const qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      paymentResponse = {
        body: {
          id: simulatedId,
          status: 'pending',
          point_of_interaction: {
            transaction_data: {
              qr_code: qrCodeData,
              qr_code_base64: qrCodeBase64
            }
          }
        }
      };
      
      usedFallback = true;
      console.log('🎭 Pagamento de demonstração criado:', simulatedId);
    }
    
    if (!paymentResponse || !paymentResponse.body || !paymentResponse.body.id) {
      throw new Error('Falha ao criar pagamento');
    }

    console.log('✅ Pagamento criado:', {
      id: paymentResponse.body.id,
      status: paymentResponse.body.status,
      qr_code: paymentResponse.body.point_of_interaction?.transaction_data?.qr_code ? '✅' : '❌',
      fallback: usedFallback
    });

    // Salvar no banco
    const stmt = db.prepare(`
      INSERT INTO donations (payment_id, donor_name, donor_email, amount, pix_qr_code, pix_qr_code_base64)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const paymentId = paymentResponse.body.id.toString();
    const qrCode = paymentResponse.body.point_of_interaction?.transaction_data?.qr_code || '';
    const qrCodeBase64 = paymentResponse.body.point_of_interaction?.transaction_data?.qr_code_base64 || '';

    stmt.run([
      paymentId,
      donor_name || 'Doador Anônimo',
      donor_email || '',
      parseFloat(amount),
      qrCode,
      qrCodeBase64
    ]);

    stmt.finalize();

    res.json({
      success: true,
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      amount: amount,
      status: paymentResponse.body.status,
      is_test: isTestMode,
      is_demo: usedFallback,
      message: usedFallback 
        ? 'Modo DEMONSTRAÇÃO - Use o botão "Simular Pagamento" para testar' 
        : (isTestMode 
          ? 'QR Code de TESTE - Use o botão "Simular Pagamento" para testar' 
          : 'QR Code real - Escaneie com seu app bancário')
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    
    res.status(500).json({ 
      error: 'Erro ao criar pagamento PIX',
      details: error.message,
      mp_error: error.response?.data || null
    });
  }
});

// Verificar status do pagamento
app.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log(`🔍 Verificando status do pagamento: ${paymentId}`);
    
    // Se for ID de demonstração, verificar apenas no banco
    if (paymentId.startsWith('DEMO_')) {
      const stmt = db.prepare('SELECT status FROM donations WHERE payment_id = ?');
      const donation = stmt.get([paymentId]);
      stmt.finalize();
      
      console.log(`📊 Status DEMO encontrado no banco: ${donation ? donation.status : 'não encontrado'}`);
      
      return res.json({
        status: donation ? donation.status : 'pending',
        payment_id: paymentId,
        is_demo: true
      });
    }
    
    // Para IDs reais do Mercado Pago, primeiro verificar no banco
    const stmtCheck = db.prepare('SELECT status FROM donations WHERE payment_id = ?');
    const localDonation = stmtCheck.get([paymentId]);
    stmtCheck.finalize();
    
    // Se já está como 'paid' no banco, retornar aprovado
    if (localDonation && localDonation.status === 'paid') {
      console.log(`✅ Pagamento ${paymentId} já aprovado no banco local`);
      return res.json({
        status: 'approved',
        payment_id: paymentId,
        is_demo: false
      });
    }
    
    // Tentar verificar com a API do Mercado Pago
    try {
      const payment = await mercadopago.payment.get(paymentId);
      
      if (payment.body.status === 'approved') {
        const stmt = db.prepare(`
          UPDATE donations 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
          WHERE payment_id = ? AND status != 'paid'
        `);
        const result = stmt.run([paymentId]);
        stmt.finalize();
        console.log(`✅ Pagamento ${paymentId} aprovado via API MP! Linhas atualizadas: ${result.changes}`);
      }
      
      res.json({
        status: payment.body.status,
        payment_id: paymentId,
        is_demo: false
      });
    } catch (mpError) {
      console.log(`⚠️ Erro na API do MP para ${paymentId}:`, mpError.message);
      // Retornar status do banco local como fallback
      res.json({
        status: localDonation ? localDonation.status : 'pending',
        payment_id: paymentId,
        is_demo: false,
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// Simular pagamento aprovado (apenas para testes)
app.post('/simulate-payment/:paymentId', (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log(`🔄 Tentativa de simular pagamento: ${paymentId}`);
    
    // Funciona com credenciais de teste ou IDs de demonstração
    if (!process.env.MP_ACCESS_TOKEN.startsWith('TEST-') && !paymentId.startsWith('DEMO_')) {
      console.log(`❌ Simulação negada - não é TEST ou DEMO: ${paymentId}`);
      return res.status(400).json({ error: 'Simulação só funciona em modo de teste ou demonstração' });
    }
    
    console.log(`✅ Simulação autorizada para: ${paymentId}`);
    
    const stmt = db.prepare(`
      UPDATE donations 
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
      WHERE payment_id = ? AND status != 'paid'
    `);
    
    const result = stmt.run([paymentId]);
    stmt.finalize();
    
    console.log(`📊 Resultado da atualização: ${result.changes} linhas afetadas`);
    
    if (result.changes > 0) {
      const isDemo = paymentId.startsWith('DEMO_');
      console.log(`🎭 Pagamento ${paymentId} simulado como aprovado! ${isDemo ? '(DEMO)' : '(TEST)'}`);
      res.json({ 
        success: true, 
        message: `Pagamento ${isDemo ? 'de demonstração' : 'de teste'} simulado como aprovado!`,
        status: 'approved',
        is_demo: isDemo
      });
    } else {
      console.log(`❌ Nenhuma linha foi atualizada para: ${paymentId}`);
      res.status(404).json({ error: 'Pagamento não encontrado ou já estava pago' });
    }
    
  } catch (error) {
    console.error('Erro ao simular pagamento:', error);
    res.status(500).json({ error: 'Erro ao simular pagamento' });
  }
});

// Webhook
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const payment = await mercadopago.payment.get(data.id);
      
      if (payment.body.status === 'approved') {
        const stmt = db.prepare(`
          UPDATE donations 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
          WHERE payment_id = ?
        `);
        stmt.run([data.id.toString()]);
        stmt.finalize();
        console.log(`🎉 Webhook: Pagamento ${data.id} aprovado!`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Erro');
  }
});

// Ranking das doações (Top 3)
app.get('/ranking', (req, res) => {
  const query = `
    SELECT 
      donor_name,
      SUM(amount) as total_amount,
      COUNT(*) as donation_count,
      MAX(paid_at) as last_donation
    FROM donations 
    WHERE status = 'paid'
    GROUP BY donor_name
    ORDER BY total_amount DESC
    LIMIT 3
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar ranking:', err);
      return res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
    res.json(rows);
  });
});

// Todos os apoiadores (para o modal)
app.get('/all-supporters', (req, res) => {
  const query = `
    SELECT 
      donor_name,
      donor_email,
      SUM(amount) as total_amount,
      COUNT(*) as donation_count
    FROM donations 
    WHERE status = 'paid'
    GROUP BY donor_name, donor_email
    ORDER BY total_amount DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar todos os apoiadores:', err);
      return res.status(500).json({ error: 'Erro ao buscar apoiadores' });
    }
    
    console.log(`📋 Total de apoiadores únicos: ${rows.length}`);
    res.json(rows);
  });
});

// Lista de doações
app.get('/donations', (req, res) => {
  const query = `
    SELECT donor_name, amount, paid_at, status, payment_id
    FROM donations 
    WHERE status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 50
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar doações:', err);
      return res.status(500).json({ error: 'Erro ao buscar doações' });
    }
    res.json(rows);
  });
});

// Lista de doações pendentes (para debug)
app.get('/donations/pending', (req, res) => {
  const query = `
    SELECT donor_name, amount, created_at, status, payment_id
    FROM donations 
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 20
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar doações pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar doações pendentes' });
    }
    res.json(rows);
  });
});

// Lista de todas as doações (para debug)
app.get('/donations/all', (req, res) => {
  const query = `
    SELECT donor_name, amount, status, payment_id, created_at, paid_at
    FROM donations 
    ORDER BY created_at DESC
    LIMIT 50
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar todas as doações:', err);
      return res.status(500).json({ error: 'Erro ao buscar todas as doações' });
    }
    console.log(`📋 Total de doações no banco: ${rows.length}`);
    res.json(rows);
  });
});

// Estatísticas
app.get('/stats', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_donations,
      COUNT(DISTINCT 
        CASE 
          WHEN donor_email IS NOT NULL AND donor_email != '' 
          THEN donor_email 
          ELSE donor_name 
        END
      ) as total_donors,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount,
      MAX(amount) as highest_donation
    FROM donations 
    WHERE status = 'paid'
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      console.error('Erro ao buscar estatísticas:', err);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
    
    console.log(`📊 Stats calculados: ${row ? row.total_donors : 0} apoiadores únicos, ${row ? row.total_donations : 0} doações`);
    
    res.json(row || {
      total_donations: 0,
      total_donors: 0,
      total_amount: 0,
      average_amount: 0,
      highest_donation: 0
    });
  });
});

// Rota para doações recentes (apoiadores em tempo real)
app.get('/recent-donations', (req, res) => {
  const query = `
    SELECT donor_name, amount, paid_at, status,
           ROW_NUMBER() OVER (ORDER BY amount DESC) as position
    FROM donations 
    WHERE status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 20
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar doações recentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar doações recentes' });
    }
    
    // Formatar dados para o slot
    const formattedDonations = rows.map((row, index) => ({
      name: row.donor_name || 'Apoiador Anônimo',
      amount: `R$ ${parseFloat(row.amount).toFixed(2).replace('.', ',')}`,
      position: index + 1,
      paid_at: row.paid_at
    }));
    
    res.json(formattedDonations);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Acesse: ${process.env.NODE_ENV === 'production' ? 'https://your-app.railway.app' : `http://localhost:${PORT}`}`);
  console.log(`💰 Mercado Pago: ${process.env.MP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🔥 Sistema pronto para receber doações PIX!`);
  
  // Log adicional para Railway
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`🔗 Railway URL: ${process.env.RAILWAY_STATIC_URL || 'Pending...'}`);
  }
});
