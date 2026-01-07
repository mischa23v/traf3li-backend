const express = require('express');
const {
    getConfig,
    saveConfig,
    testConnection,
    testAuth,
    syncUsers,
    login
} = require('../controllers/ldap.controller');
const { authenticate, requireAdmin } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// ========================================================================
// ADMIN ROUTES - LDAP Configuration Management
// ========================================================================

router.get('/config', authenticate, requireAdmin(), getConfig);

router.post('/config', authenticate, requireAdmin(), sensitiveRateLimiter, saveConfig);

router.post('/test', authenticate, requireAdmin(), authRateLimiter, testConnection);

router.post('/test-auth', authenticate, requireAdmin(), authRateLimiter, testAuth);

router.post('/sync', authenticate, requireAdmin(), sensitiveRateLimiter, syncUsers);

// ========================================================================
// PUBLIC AUTH ROUTES - LDAP Login
// ========================================================================

router.post('/login', authRateLimiter, login);

module.exports = router;
