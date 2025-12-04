const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const {
    getEntries,
    getEntry,
    voidEntry,
    getAccountBalance,
    getTrialBalance,
    getEntriesByReference,
    getSummary
} = require('../controllers/generalLedger.controller');

// Apply authentication to all routes
router.use(authenticate);

// Get GL summary by account type
router.get('/summary', getSummary);

// Get trial balance
router.get('/trial-balance', getTrialBalance);

// Get account balance
router.get('/account-balance/:accountId', getAccountBalance);

// Get entries by reference (invoice, payment, etc.)
router.get('/reference/:model/:id', getEntriesByReference);

// Get all GL entries with filters
router.get('/', getEntries);

// Get single GL entry
router.get('/:id', getEntry);

// Void a GL entry
router.post('/void/:id', voidEntry);

module.exports = router;
