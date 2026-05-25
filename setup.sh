#!/bin/bash

echo "🚀 Polymarket Demo Test - Setup Script"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found"
    echo "📋 Copying .env.example to .env"
    cp .env.example .env
    echo "✅ .env created"
    echo ""
    echo "📝 Please edit .env with your credentials:"
    echo "   PRIVATE_KEY=0x...  (your Ethereum private key)"
    echo "   WALLET_ADDRESS=0x... (your wallet address)"
    echo ""
else
    echo "✅ .env file exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your Polymarket credentials"
echo "  2. Run 'npm run dev' for development"
echo "  3. Or 'npm run build && npm start' for production"
echo ""
