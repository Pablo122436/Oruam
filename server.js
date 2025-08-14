require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');
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
  const dbType = (process.env.MYSQLHOST || process.env.MYSQL_URL) && process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite';
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbType
  });
});

// Configurar Mercado Pago - Nova API v2.8.0
let client = null;
let payment = null;

if (!process.env.MP_ACCESS_TOKEN) {
  console.warn('⚠️  MP_ACCESS_TOKEN não configurado. Configure as variáveis de ambiente.');
} else {
  client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: { timeout: 5000 }
  });
  payment = new Payment(client);
  console.log('✅ MercadoPago configurado com sucesso!');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar pagamento PIX - Nova API v2.8.0
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
      if (!payment) {
        throw new Error('MercadoPago não configurado');
      }

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
      
      paymentResponse = await payment.create({ body: paymentData });
      console.log('✅ Pagamento criado com sucesso:', paymentResponse.id);

    } catch (mpError) {
      console.log('⚠️ Mercado Pago falhou:', mpError.message);
      console.log('🔄 Usando fallback de demonstração...');
      
      // Criar pagamento simulado para demonstração
      const simulatedId = `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const qrCodeData = `00020126580014br.gov.bcb.pix0136${Date.now()}52040000530398654${amount.toString().padStart(6, '0')}5802BR5925DEMO MERCADO PAGO PIX6009SAO PAULO62240520${simulatedId}6304`;
      
      // Gerar QR Code base64 simulado (placeholder)
      const qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      paymentResponse = {
        id: simulatedId,
        status: 'pending',
        point_of_interaction: {
          transaction_data: {
            qr_code: qrCodeData,
            qr_code_base64: qrCodeBase64
          }
        }
      };
      
      usedFallback = true;
      console.log('🎭 Pagamento de demonstração criado:', simulatedId);
    }
    
    if (!paymentResponse || !paymentResponse.id) {
      throw new Error('Falha ao criar pagamento');
    }

    console.log('✅ Pagamento criado:', {
      id: paymentResponse.id,
      status: paymentResponse.status,
      qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code ? '✅' : '❌',
      fallback: usedFallback
    });

    // Salvar no banco
    try {
      await db.insertDonation({
        payment_id: paymentResponse.id.toString(),
        amount: parseFloat(amount),
        donor_name: donor_name || 'Doador Anônimo',
        donor_email: donor_email || '',
        status: 'pending',
        qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        pix_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code || ''
      });
      console.log('✅ Doação salva no banco de dados');
    } catch (dbError) {
      console.error('❌ Erro ao salvar no banco:', dbError.message);
    }

    const paymentId = paymentResponse.id.toString();
    const qrCode = paymentResponse.point_of_interaction?.transaction_data?.qr_code || '';
    const qrCodeBase64 = paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64 || '';

    res.json({
      success: true,
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      amount: amount,
      status: paymentResponse.status,
      is_test: isTestMode,
      is_demo: usedFallback,
      message: usedFallback 
        ? 'Modo DEMONSTRAÇÃO - Use o botão "Simular Pagamento" para testar' 
        : (isTestMode 
          ? 'QR Code de TESTE - Use o botão "Simular Pagamento" para testar' 
          : 'QR Code de PRODUÇÃO - Pagamento real')
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
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
      const donation = await db.getDonationByPaymentId(paymentId);
      
      console.log(`📊 Status DEMO encontrado no banco: ${donation ? donation.status : 'não encontrado'}`);
      
      return res.json({
        status: donation ? donation.status : 'pending',
        payment_id: paymentId,
        is_demo: true
      });
    }
    
    // Para IDs reais do Mercado Pago, primeiro verificar no banco
    const localDonation = await db.getDonationByPaymentId(paymentId);
    
    // Se já está como 'paid' no banco, retornar aprovado
    if (localDonation && localDonation.status === 'paid') {
      console.log(`✅ Pagamento ${paymentId} já aprovado no banco local`);
      return res.json({
        status: 'approved',
        payment_id: paymentId,
        is_demo: false
      });
    }

    // Consultar o Mercado Pago para IDs reais
    try {
      if (!payment) {
        throw new Error('MercadoPago não configurado');
      }
      
      const paymentInfo = await payment.get({ id: paymentId });
      const status = paymentInfo.status;
      
      console.log(`💳 Status do Mercado Pago para ${paymentId}: ${status}`);
      
      // Se foi aprovado, atualizar no banco
      if (status === 'approved' && localDonation) {
        await db.updateDonationStatus(paymentId, 'paid', new Date().toISOString());
        console.log(`🎉 Pagamento ${paymentId} aprovado e atualizado no banco!`);
      }
      
      res.json({
        status: status,
        payment_id: paymentId,
        is_demo: false
      });
      
    } catch (mpError) {
      console.log(`⚠️ Erro ao consultar Mercado Pago para ${paymentId}:`, mpError.message);
      
      // Se não conseguir consultar o MP, retornar status do banco local
      res.json({
        status: localDonation ? localDonation.status : 'pending',
        payment_id: paymentId,
        is_demo: false,
        error: 'Erro ao consultar status no Mercado Pago'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({
      error: 'Erro ao verificar status do pagamento',
      payment_id: req.params.paymentId
    });
  }
});

// Simular pagamento aprovado (para testes)
app.post('/simulate-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log(`🎭 Simulando aprovação do pagamento: ${paymentId}`);
    
    const donation = await db.getDonationByPaymentId(paymentId);
    
    if (!donation) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    if (donation.status === 'paid') {
      return res.json({
        success: true,
        message: 'Pagamento já estava aprovado',
        payment_id: paymentId
      });
    }
    
    // Atualizar status para aprovado
    await db.updateDonationStatus(paymentId, 'paid', new Date().toISOString());
    
    console.log(`✅ Pagamento ${paymentId} simulado como aprovado!`);
    
    res.json({
      success: true,
      message: 'Pagamento simulado como aprovado!',
      payment_id: paymentId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao simular pagamento:', error);
    res.status(500).json({
      error: 'Erro ao simular pagamento',
      details: error.message
    });
  }
});

// Webhook do Mercado Pago
app.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:', req.body);
    
    if (req.body.type === 'payment') {
      const paymentId = req.body.data.id;
      console.log(`🔍 Processando webhook para pagamento: ${paymentId}`);
      
      // Consultar detalhes do pagamento no Mercado Pago
      try {
        if (!payment) {
          throw new Error('MercadoPago não configurado');
        }
        
        const paymentInfo = await payment.get({ id: paymentId });
        const status = paymentInfo.status;
        
        console.log(`📊 Status do webhook: ${status}`);
        
        if (status === 'approved') {
          // Atualizar status no banco
          await db.updateDonationStatus(paymentId.toString(), 'paid', new Date().toISOString());
          console.log(`🎉 Pagamento ${paymentId} aprovado via webhook!`);
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
      }
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

// Endpoint para ranking das doações
app.get('/ranking', async (req, res) => {
  try {
    const rankings = await db.getRanking(10);
    
    // Formatar dados para o slot
    const formattedRankings = rankings.map((row, index) => ({
      name: row.donor_name || 'Apoiador Anônimo',
      amount: `R$ ${parseFloat(row.amount).toFixed(2).replace('.', ',')}`,
      position: index + 1
    }));
    
    res.json(formattedRankings);
  } catch (err) {
    console.error('Erro ao buscar ranking:', err);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

// Endpoint para todas as doações
app.get('/donations', async (req, res) => {
  try {
    const donations = await db.getRecentDonations(50);
    
    // Formatar dados para o slot
    const formattedDonations = donations.map((row, index) => ({
      name: row.donor_name || 'Apoiador Anônimo',
      amount: `R$ ${parseFloat(row.amount).toFixed(2).replace('.', ',')}`,
      position: index + 1,
      paid_at: row.paid_at
    }));
    
    res.json(formattedDonations);
  } catch (err) {
    console.error('Erro ao buscar doações:', err);
    res.status(500).json({ error: 'Erro ao buscar doações' });
  }
});

// Endpoint para estatísticas
app.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      total_amount: parseFloat(stats.total || 0),
      total_donations: parseInt(stats.count || 0),
      formatted_total: `R$ ${parseFloat(stats.total || 0).toFixed(2).replace('.', ',')}`
    });
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Endpoint para doações do slot - formato específico
app.get('/slot-donations', async (req, res) => {
  try {
    const donations = await db.getRecentDonations(20);
    
    // Formatar dados para o slot
    const formattedDonations = donations.map((row, index) => ({
      name: row.donor_name || 'Apoiador Anônimo',
      amount: `R$ ${parseFloat(row.amount).toFixed(2).replace('.', ',')}`,
      position: index + 1,
      paid_at: row.paid_at
    }));
    
    res.json(formattedDonations);
  } catch (err) {
    console.error('Erro ao buscar doações recentes:', err);
    res.status(500).json({ error: 'Erro ao buscar doações recentes' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const dbType = (process.env.MYSQLHOST || process.env.MYSQL_URL) && process.env.NODE_ENV === 'production' ? 'MySQL' : 'SQLite';
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Acesse: ${process.env.NODE_ENV === 'production' ? 'https://your-app.railway.app' : `http://localhost:${PORT}`}`);
  console.log(`💰 Mercado Pago: ${process.env.MP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🗄️ Banco de dados: ${dbType}`);
  console.log(`🔥 Sistema pronto para receber doações PIX!`);
  
  // Log adicional para Railway
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`🔗 Railway URL: ${process.env.RAILWAY_STATIC_URL || 'Pending...'}`);
  }
});
