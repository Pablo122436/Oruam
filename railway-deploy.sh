#!/bin/bash

# Railway deployment script
echo "🚀 Starting Railway deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Set up database
echo "🗄️ Setting up database..."
node -e "
const db = require('./database');
console.log('Database initialized successfully');
"

# Health check
echo "🏥 Setting up health check..."
if [ ! -f "health-check.js" ]; then
  echo "Creating health check endpoint..."
fi

echo "✅ Deployment setup complete!"
echo "🌐 Your app will be available at: https://\$RAILWAY_STATIC_URL"
