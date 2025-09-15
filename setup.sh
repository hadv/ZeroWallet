#!/bin/bash

echo "🚀 Setting up ZeroWallet..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual API keys:"
    echo "   - ZeroDev Project ID (from https://dashboard.zerodev.app/)"
    echo "   - Magic.link Publishable Key (from https://dashboard.magic.link/)"
    echo "   - Infura Project ID (from https://infura.io/)"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Project overview and setup"
echo "   - USER_GUIDE.md - How to use the wallet"
echo "   - DEPLOYMENT.md - Deployment instructions"
echo ""
echo "🔗 Useful links:"
echo "   - ZeroDev Dashboard: https://dashboard.zerodev.app/"
echo "   - Magic.link Dashboard: https://dashboard.magic.link/"
echo "   - Infura Dashboard: https://infura.io/"
