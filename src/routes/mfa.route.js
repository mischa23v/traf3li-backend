const express = require('express');
const {
    setupMFA,
    verifySetup,
    verifyMFA,
    disableMFA,
    generateBackupCodes,
    verifyBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    getMFAStatus
} = require('../controllers/mfa.controller');
const { authenticate } = require('../middlewares');
const { requireRecentAuthHourly, requireVeryRecentAuth } = require('../middlewares/stepUpAuth.middleware');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { csrfProtection } = require('../middlewares/csrf.middleware');

const router = express.Router();

// ========================================================================
// TOTP Setup & Verification Routes
// ========================================================================

router.post('/setup', authenticate, requireRecentAuthHourly({ purpose: 'MFA setup' }), sensitiveRateLimiter, setupMFA);

router.post('/verify-setup', authenticate, csrfProtection, authRateLimiter, verifySetup);

router.post('/verify', authRateLimiter, verifyMFA);

router.post('/disable', authenticate, requireRecentAuthHourly({ purpose: 'MFA disable' }), csrfProtection, sensitiveRateLimiter, disableMFA);

router.get('/status', authenticate, getMFAStatus);

// ========================================================================
// Backup Codes Routes
// ========================================================================

router.post('/backup-codes/generate', authenticate, sensitiveRateLimiter, generateBackupCodes);

router.post('/backup-codes/verify', authRateLimiter, verifyBackupCode);

router.post('/backup-codes/regenerate', authenticate, sensitiveRateLimiter, regenerateBackupCodes);

router.get('/backup-codes/count', authenticate, getBackupCodesCount);

module.exports = router;
