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
// TEST MODE ENDPOINTS - DISABLED IN PRODUCTION
// ========================================
// SECURITY: These endpoints bypass payment verification
// Only enabled when BOTH conditions are met:
// 1. TEST_MODE=true is set
// 2. NODE_ENV is NOT production
// This double-check prevents accidental enabling in production
const isTestMode = process.env.TEST_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

if (isTestMode && !isProduction) {
    app.post('/create-test-contract/:_id', userMiddleware, createTestContract);
    app.post('/create-test-proposal-contract/:_id', userMiddleware, createTestProposalContract);
    console.log('⚠️  TEST MODE: Payment bypass endpoints enabled (development only)');
} else if (isTestMode && isProduction) {
    console.error('❌ SECURITY: TEST_MODE is set but ignored in production environment');
    console.error('❌ Payment bypass endpoints are DISABLED for security');
}

module.exports = app;
