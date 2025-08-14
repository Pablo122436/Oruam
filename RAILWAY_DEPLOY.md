# 🚀 Guia de Deploy no Railway

## 📋 Pré-requisitos
- Conta no Railway (https://railway.app)
- Repositório no GitHub
- Credenciais do Mercado Pago

## 🔧 Configuração Automática

### 1. Conectar Repositório
1. Acesse [Railway](https://railway.app)
2. Clique em "Start a New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha o repositório `Oruam`

### 2. Configurar Variáveis de Ambiente
No painel do Railway, vá para **Settings > Variables** e adicione:

```bash
# Obrigatórias
MP_ACCESS_TOKEN=seu_access_token_do_mercadopago
MP_PUBLIC_KEY=sua_public_key_do_mercadopago
NODE_ENV=production

# Opcionais (Railway configura automaticamente)
PORT=3000
CORS_ORIGIN=https://seu-app.up.railway.app
```

### 3. Deploy Automático
- O Railway detectará automaticamente que é um projeto Node.js
- Usará o comando `npm start` definido no package.json
- O banco SQLite será criado automaticamente

## 🔒 Segurança Configurada

### ✅ Arquivos Protegidos
- `.env` - Ignorado pelo Git
- Credenciais não expostas no código
- CORS configurado para produção

### ✅ Health Check
- Endpoint `/health` configurado
- Monitoramento automático do Railway

## 🌐 URLs Importantes

Após o deploy, seu app estará disponível em:
- **App**: `https://seu-app.up.railway.app`
- **Health Check**: `https://seu-app.up.railway.app/health`
- **API PIX**: `https://seu-app.up.railway.app/create-pix-payment`

## 🔄 Atualizações Automáticas

Qualquer push para a branch `main` fará deploy automático no Railway.

## 🆘 Solução de Problemas

### Erro: "MP_ACCESS_TOKEN não configurado"
1. Vá para Settings > Variables no Railway
2. Adicione a variável MP_ACCESS_TOKEN com seu token

### Erro: "Application failed to respond"
1. Verifique os logs no Railway Dashboard
2. Confirme que o endpoint `/health` está respondendo

### Banco de dados não funcionando
1. O SQLite é criado automaticamente
2. Verifique os logs para erros de permissão

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no Railway Dashboard
2. Teste localmente primeiro com `npm run dev`
3. Confirme que todas as variáveis estão configuradas

---

## 🎯 Checklist de Deploy

- [ ] Repositório conectado ao Railway
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando
- [ ] Teste de pagamento PIX funcionando
- [ ] CORS configurado corretamente

**Pronto! Seu sistema de doações PIX está no ar! 🎉**
