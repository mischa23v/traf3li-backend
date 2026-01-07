router.get('/categories', readRateLimiter, getCategories);

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

// Apply authentication to all routes below
router.use(userMiddleware);

router.get(
    '/',
    readRateLimiter,
    checkPermission('view:integrations'),
    listApps
);

router.get(
    '/stats',
    readRateLimiter,
    checkPermission('view:integrations'),
    getStats
);

router.get(
    '/:appId',
    readRateLimiter,
    checkPermission('view:integrations'),
    getApp
);

router.post(
    '/:appId/connect',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    connectApp
);

router.post(
    '/:appId/disconnect',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    disconnectApp
);

router.get(
    '/:appId/settings',
    readRateLimiter,
    checkPermission('view:integrations'),
    getAppSettings
);

router.put(
    '/:appId/settings',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    updateAppSettings
);

router.post(
    '/:appId/sync',
    syncRateLimiter,
    checkPermission('manage:integrations'),
    syncApp
);

router.post(
    '/:appId/test',
    writeRateLimiter,
    checkPermission('manage:integrations'),
    testApp
);

module.exports = router;
