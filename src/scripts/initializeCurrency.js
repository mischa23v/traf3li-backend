/**
 * Initialize Currency Exchange Rates
 *
 * This script initializes default exchange rates in the database
 * Run once after setting up the bank reconciliation features
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const currencyService = require('../services/currency.service');

// Load environment variables
dotenv.config();

async function initializeCurrency() {
    try {
        console.log('🔗 Connecting to MongoDB...');

        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB');
        console.log('');
        console.log('💱 Initializing currency exchange rates...');
        console.log('');

        // Initialize default rates
        await currencyService.initializeDefaultRates();

        console.log('');
        console.log('🌐 Fetching live rates from API...');

        try {
            // Try to fetch live rates
            const baseCurrencies = ['SAR', 'USD', 'EUR'];
            for (const currency of baseCurrencies) {
                try {
                    console.log(`  Updating ${currency} rates...`);
                    await currencyService.updateRatesFromAPI(currency);
                } catch (error) {
                    console.log(`  ⚠️  Could not fetch live rates for ${currency}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log('  ⚠️  Could not fetch live rates, using defaults');
        }

        console.log('');
        console.log('✅ Currency initialization completed!');
        console.log('');

        // Display summary
        const ExchangeRate = require('../models/exchangeRate.model');
        const count = await ExchangeRate.countDocuments({ isActive: true });
        console.log(`📊 Total active exchange rates: ${count}`);

        // Display supported currencies
        const currencies = await currencyService.getSupportedCurrencies('SAR');
        console.log(`💰 Supported currencies: ${currencies.join(', ')}`);

        console.log('');
        console.log('🎉 Setup complete! You can now use multi-currency features.');
        console.log('');

    } catch (error) {
        console.error('❌ Error initializing currency:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the initialization
initializeCurrency();
