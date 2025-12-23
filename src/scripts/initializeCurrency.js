/**
 * Initialize Currency Exchange Rates
 *
 * This script initializes default exchange rates in the database
 * Run once after setting up the bank reconciliation features
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const currencyService = require('../services/currency.service');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

async function initializeCurrency() {
    try {
        logger.info('🔗 Connecting to MongoDB...');

        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        logger.info('✅ Connected to MongoDB');
        logger.info('');
        logger.info('💱 Initializing currency exchange rates...');
        logger.info('');

        // Initialize default rates
        await currencyService.initializeDefaultRates();

        logger.info('');
        logger.info('🌐 Fetching live rates from API...');

        try {
            // Try to fetch live rates
            const baseCurrencies = ['SAR', 'USD', 'EUR'];
            for (const currency of baseCurrencies) {
                try {
                    logger.info(`  Updating ${currency} rates...`);
                    await currencyService.updateRatesFromAPI(currency);
                } catch (error) {
                    logger.info(`  ⚠️  Could not fetch live rates for ${currency}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.info('  ⚠️  Could not fetch live rates, using defaults');
        }

        logger.info('');
        logger.info('✅ Currency initialization completed!');
        logger.info('');

        // Display summary
        const ExchangeRate = require('../models/exchangeRate.model');
        const count = await ExchangeRate.countDocuments({ isActive: true });
        logger.info(`📊 Total active exchange rates: ${count}`);

        // Display supported currencies
        const currencies = await currencyService.getSupportedCurrencies('SAR');
        logger.info(`💰 Supported currencies: ${currencies.join(', ')}`);

        logger.info('');
        logger.info('🎉 Setup complete! You can now use multi-currency features.');
        logger.info('');

    } catch (error) {
        logger.error('❌ Error initializing currency:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        logger.info('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the initialization
initializeCurrency();
