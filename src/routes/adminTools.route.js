router.get('/users/:id/data', ...adminOnly, publicRateLimiter, getUserData);

router.delete('/users/:id/data', ...adminOnly, sensitiveRateLimiter, deleteUserData);

router.get('/firms/:id/export', ...adminOnly, publicRateLimiter, exportFirmData);

router.post('/firms/:id/import', ...adminOnly, sensitiveRateLimiter, importFirmData);

router.post('/users/merge', ...adminOnly, sensitiveRateLimiter, mergeUsers);

router.post('/clients/merge', ...adminOnly, sensitiveRateLimiter, mergeClients);

// ═══════════════════════════════════════════════════════════════
// DATA FIXES ROUTES
// ═══════════════════════════════════════════════════════════════

router.post('/firms/:id/recalculate-invoices', ...adminOnly, sensitiveRateLimiter, recalculateInvoiceTotals);

router.post('/firms/:id/reindex', ...adminOnly, sensitiveRateLimiter, reindexSearchData);

router.post('/firms/:id/cleanup-orphaned', ...adminOnly, sensitiveRateLimiter, cleanupOrphanedRecords);

router.get('/firms/:id/validate', ...adminOnly, publicRateLimiter, validateDataIntegrity);

router.post('/firms/:id/fix-currency', ...adminOnly, sensitiveRateLimiter, fixCurrencyConversions);

// ═══════════════════════════════════════════════════════════════
// SYSTEM TOOLS ROUTES
// ═══════════════════════════════════════════════════════════════

router.get('/stats', ...adminOnly, publicRateLimiter, getSystemStats);

router.get('/activity-report', ...adminOnly, publicRateLimiter, getUserActivityReport);

router.get('/storage-usage', ...adminOnly, publicRateLimiter, getStorageUsage);

router.post('/clear-cache', ...adminOnly, sensitiveRateLimiter, clearCache);

router.get('/diagnostics', ...adminOnly, publicRateLimiter, runDiagnostics);

router.get('/slow-queries', ...adminOnly, publicRateLimiter, getSlowQueries);

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

router.post('/users/:id/reset-password', ...adminOnly, sensitiveRateLimiter, resetUserPassword);

router.post('/users/:id/impersonate', ...adminOnly, sensitiveRateLimiter, impersonateUser);

router.post('/impersonation/:sessionId/end', ...adminOnly, sensitiveRateLimiter, endImpersonation);

router.post('/users/:id/lock', ...adminOnly, sensitiveRateLimiter, lockUser);

router.post('/users/:id/unlock', ...adminOnly, sensitiveRateLimiter, unlockUser);

router.get('/users/:id/login-history', ...adminOnly, publicRateLimiter, getLoginHistory);

// ═══════════════════════════════════════════════════════════════
// JWT KEY ROTATION ROUTES
// ═══════════════════════════════════════════════════════════════

const {
    getKeyRotationStatus,
    rotateKeys,
    generateNewKey,
    cleanupExpiredKeys,
    checkRotationNeeded,
    initializeKeyRotation,
    autoRotate
} = require('../controllers/keyRotation.controller');

router.get('/key-rotation/status', ...adminOnly, publicRateLimiter, getKeyRotationStatus);

router.get('/key-rotation/check', ...adminOnly, publicRateLimiter, checkRotationNeeded);

router.post('/key-rotation/rotate', ...adminOnly, sensitiveRateLimiter, rotateKeys);

router.post('/key-rotation/auto-rotate', ...adminOnly, sensitiveRateLimiter, autoRotate);

router.post('/key-rotation/generate', ...adminOnly, sensitiveRateLimiter, generateNewKey);

router.post('/key-rotation/cleanup', ...adminOnly, sensitiveRateLimiter, cleanupExpiredKeys);

router.post('/key-rotation/initialize', ...adminOnly, sensitiveRateLimiter, initializeKeyRotation);

module.exports = router;
