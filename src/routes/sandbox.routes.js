/**
 * Sandbox Routes
 *
 * Routes for sandbox/demo environment management
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createSandbox,
    getSandbox,
    resetSandbox,
    deleteSandbox,
    extendSandbox,
    getSandboxStats,
    cloneSandboxToProduction,
    getTemplates,
    checkApiLimit
} = require('../controllers/sandbox.controller');

const router = express.Router();

// ==============================================
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES!)
// ==============================================

// Get available templates
router.get('/templates', userMiddleware, getTemplates);

// Get sandbox statistics (admin only)
router.get('/stats', userMiddleware, getSandboxStats);

// ==============================================
// SANDBOX CRUD ROUTES
// ==============================================

// Create new sandbox
router.post('/', userMiddleware, createSandbox);

// Get user's active sandbox
router.get('/', userMiddleware, getSandbox);

// ==============================================
// SANDBOX ACTION ROUTES
// ==============================================

// Reset sandbox to initial state
router.post('/:id/reset', userMiddleware, resetSandbox);

// Extend sandbox expiration
router.post('/:id/extend', userMiddleware, extendSandbox);

// Clone sandbox to production firm
router.post('/:id/clone', userMiddleware, cloneSandboxToProduction);

// Check API limit
router.get('/:id/check-limit', userMiddleware, checkApiLimit);

// Delete sandbox
router.delete('/:id', userMiddleware, deleteSandbox);

module.exports = router;
