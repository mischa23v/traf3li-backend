const express = require('express');
const multer = require('multer');
const { userMiddleware } = require('../middlewares');
const malwareScanMiddleware = require('../middlewares/malwareScan.middleware');
const {
    createTransaction,
    getTransactions,
    getTransaction,
    importTransactions,
    matchTransaction,
    unmatchTransaction
} = require('../controllers/bankTransaction.controller');

const app = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/csv', 'application/csv', 'text/plain', 'application/x-ofx', 'application/x-qif'];
        const allowedExtensions = ['.csv', '.ofx', '.qif'];
        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV, OFX, and QIF files are allowed.'));
        }
    }
});

// Collection routes
app.post('/', userMiddleware, createTransaction);
app.get('/', userMiddleware, getTransactions);

// Single transaction routes
app.get('/:id', userMiddleware, getTransaction);

// Transaction matching
app.post('/:transactionId/match', userMiddleware, matchTransaction);
app.post('/:transactionId/unmatch', userMiddleware, unmatchTransaction);

// Import route (attached to bank account)
// This will be mounted under /bank-accounts/:accountId/import in server.js
// But we also expose it here for flexibility
// Gold Standard: Malware scan before processing bank transaction files
app.post('/import/:accountId', userMiddleware, upload.single('file'), malwareScanMiddleware, importTransactions);

module.exports = app;
