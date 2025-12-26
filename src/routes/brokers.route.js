const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createBroker,
    getBrokers,
    getBroker,
    updateBroker,
    deleteBroker,
    setDefaultBroker
} = require('../controllers/brokers.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create broker
router.post('/', userMiddleware, createBroker);

// Get all brokers
router.get('/', userMiddleware, getBrokers);

// Get single broker
router.get('/:id', userMiddleware, getBroker);

// Update broker
router.patch('/:id', userMiddleware, updateBroker);

// Delete broker
router.delete('/:id', userMiddleware, deleteBroker);

// ═══════════════════════════════════════════════════════════════
// ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Set as default broker
router.post('/:id/set-default', userMiddleware, setDefaultBroker);

module.exports = router;
