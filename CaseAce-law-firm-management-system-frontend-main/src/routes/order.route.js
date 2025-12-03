const express = require('express');
const { userMiddleware } = require('../middlewares');
const { 
    getOrders, 
    paymentIntent, 
    proposalPaymentIntent,
    updatePaymentStatus, 
    createTestContract,
    createTestProposalContract
} = require('../controllers/order.controller');

const app = express.Router();

// Get all orders
app.get('/', userMiddleware, getOrders);

// Payment intent for GIG
app.post('/create-payment-intent/:_id', userMiddleware, paymentIntent);

// ✅ NEW: Payment intent for PROPOSAL
app.post('/create-proposal-payment-intent/:_id', userMiddleware, proposalPaymentIntent);

// Payment confirm
app.patch('/', userMiddleware, updatePaymentStatus);

// ========================================
// TEST MODE ONLY - REMOVE BEFORE LAUNCH
// ========================================
// Only enable this route if TEST_MODE is true
if (process.env.TEST_MODE === 'true') {
    app.post('/create-test-contract/:_id', userMiddleware, createTestContract);
    app.post('/create-test-proposal-contract/:_id', userMiddleware, createTestProposalContract);
    console.log('⚠️  TEST MODE: Payment bypass endpoints enabled');
}

module.exports = app;
