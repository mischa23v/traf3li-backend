const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountBalance,
    getAccountTypes
} = require('../controllers/account.controller');

// Apply authentication to all routes
router.use(authenticate);

// Get account types (dropdown data)
router.get('/types', getAccountTypes);

// Get all accounts (supports ?includeHierarchy=true)
router.get('/', getAccounts);

// Get single account with balance
router.get('/:id', getAccount);

// Get account balance with filters
router.get('/:id/balance', getAccountBalance);

// Create new account
router.post('/', createAccount);

// Update account
router.patch('/:id', updateAccount);

// Delete account
router.delete('/:id', deleteAccount);

module.exports = router;
