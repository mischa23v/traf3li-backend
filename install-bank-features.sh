#!/bin/bash

# Installation script for Bank Reconciliation & Multi-Currency features
# TRAF3LI Backend - Bank Features Setup

echo "================================================"
echo "Bank Reconciliation & Multi-Currency Setup"
echo "================================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "📦 Installing required npm packages..."
echo ""

# Install dependencies
npm install csv-parse string-similarity ofx-js

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "Installed packages:"
    echo "  - csv-parse: CSV file parsing"
    echo "  - string-similarity: Fuzzy matching"
    echo "  - ofx-js: OFX file parsing"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Add environment variables to your .env file:"
echo "   FEED_ENCRYPTION_KEY=your-32-character-key"
echo "   EXCHANGE_RATE_API_KEY=your_api_key (optional)"
echo ""
echo "2. Initialize default exchange rates:"
echo "   node src/scripts/initializeCurrency.js"
echo ""
echo "3. Restart your server:"
echo "   npm run dev"
echo ""
echo "4. Test the API endpoints:"
echo "   See BANK_RECONCILIATION_SETUP.md for examples"
echo ""
echo "📚 Full documentation: BANK_RECONCILIATION_SETUP.md"
echo ""
