const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createBroker,
    getBrokers,
    getBroker,
    updateBroker,
    deleteBroker,
    setDefaultBroker
} = require('../controllers/brokers.controller');

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create broker
router.post('/', userMiddleware, firmFilter, createBroker);

// Get all brokers
router.get('/', userMiddleware, firmFilter, getBrokers);

// Get single broker
router.get('/:id', userMiddleware, firmFilter, getBroker);

// Update broker
router.patch('/:id', userMiddleware, firmFilter, updateBroker);

// Delete broker
router.delete('/:id', userMiddleware, firmFilter, deleteBroker);

// ═══════════════════════════════════════════════════════════════
// ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Set as default broker
router.post('/:id/set-default', userMiddleware, firmFilter, setDefaultBroker);

module.exports = router;
