# Mercado Pago PIX API com Ranking

Sistema completo de pagamentos PIX via Mercado Pago com ranking de doações.

## Funcionalidades

- 💳 Integração com Mercado Pago para pagamentos PIX
- 🏆 Ranking das maiores doações
- 📋 Lista de todas as doações
- 🔄 Atualizações em tempo real
- 💾 Armazenamento em SQLite

## Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure suas credenciais do Mercado Pago no arquivo `.env`:
```
MP_ACCESS_TOKEN=seu_access_token_aqui
MP_PUBLIC_KEY=sua_public_key_aqui
PORT=3000
```

3. Execute o servidor:
```bash
npm start
# ou para desenvolvimento
npm run dev
```

## Como obter as credenciais do Mercado Pago

1. Acesse [developers.mercadopago.com](https://developers.mercadopago.com)
2. Faça login em sua conta
3. Vá em "Credenciais" no menu lateral
4. Copie o Access Token e Public Key (use as credenciais de teste primeiro)

## Uso

1. Acesse `http://localhost:3000` no navegador
2. Digite o valor da doação
3. Clique em "Gerar PIX"
4. Escaneie o QR Code ou copie o código PIX
5. Realize o pagamento
6. Acompanhe o ranking em tempo real

## Estrutura do Projeto

```
mercadopago/
├── server.js          # Servidor principal
├── database.js        # Configuração do banco de dados
├── public/
│   ├── index.html     # Frontend
│   ├── style.css      # Estilos
│   └── script.js      # JavaScript do frontend
├── .env               # Variáveis de ambiente
└── package.json       # Dependências
```
