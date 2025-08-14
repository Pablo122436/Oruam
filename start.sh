#!/bin/bash

# Railway Start Command
# Este script é executado quando o app inicia no Railway

echo "🚂 Iniciando aplicação no Railway..."

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$MP_ACCESS_TOKEN" ]; then
    echo "❌ ERRO: MP_ACCESS_TOKEN não configurado"
    echo "Configure as variáveis de ambiente no painel do Railway:"
    echo "Settings > Variables > Add Variable"
    exit 1
fi

if [ -z "$MP_PUBLIC_KEY" ]; then
    echo "❌ ERRO: MP_PUBLIC_KEY não configurado"
    exit 1
fi

echo "✅ Variáveis de ambiente configuradas"
echo "✅ Mercado Pago configurado"
echo "🗄️ Inicializando banco de dados..."

# Iniciar o servidor
echo "🚀 Iniciando servidor..."
exec node server.js
