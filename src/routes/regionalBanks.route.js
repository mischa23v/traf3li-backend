/**
 * Regional Bank Providers Routes
 *
 * Endpoints for Saudi/GCC bank connections via Open Banking
 */

const express = require('express');
const router = express.Router();
const regionalBankController = require('../controllers/regionalBankProvider.controller');

// ═══════════════════════════════════════════════════════════════
// BANK DISCOVERY
// ═══════════════════════════════════════════════════════════════

// Get all supported countries
router.get('/countries', regionalBankController.getSupportedCountries);

// Get supported banks for a country
router.get('/countries/:countryCode/banks', regionalBankController.getBanksByCountry);

// Find bank by IBAN
router.get('/find-by-iban', regionalBankController.findBankByIBAN);

// Get provider statistics
router.get('/stats', regionalBankController.getProviderStats);

// ═══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Initialize bank connection (get link URL)
router.post('/connect', regionalBankController.initializeConnection);

// Handle OAuth callback (from bank)
router.get('/callback', regionalBankController.handleCallback);

// Sync transactions for a connected account
router.post('/sync/:accountId', regionalBankController.syncTransactions);

// Get connection status
router.get('/status/:accountId', regionalBankController.getConnectionStatus);

// Disconnect bank account
router.post('/disconnect/:accountId', regionalBankController.disconnectAccount);

module.exports = router;
