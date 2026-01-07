app.get('/config', authenticate, adminAuth, apiRateLimiter, getConfig);

app.get('/overview', authenticate, adminAuth, apiRateLimiter, getOverview);

app.get('/tiers/:tier', authenticate, adminAuth, apiRateLimiter, getTierConfig);

app.get('/effective', authenticate, adminAuth, apiRateLimiter, getEffectiveLimitEndpoint);

app.get('/users/:userId', authenticate, adminAuth, apiRateLimiter, getUserLimits);

app.get('/users/:userId/stats', authenticate, adminAuth, apiRateLimiter, getUserStats);

app.post('/users/:userId/reset', authenticate, adminAuth, apiRateLimiter, resetUserLimit);

app.post('/users/:userId/adjust', authenticate, adminAuth, apiRateLimiter, adjustUserLimit);

app.get('/firms/:firmId', authenticate, adminAuth, apiRateLimiter, getFirmLimits);

app.get('/firms/:firmId/top-users', authenticate, adminAuth, apiRateLimiter, getTopUsersForFirm);

app.get('/firms/:firmId/throttled', authenticate, adminAuth, apiRateLimiter, getThrottledRequestsForFirm);

app.post('/firms/:firmId/reset', authenticate, adminAuth, apiRateLimiter, resetFirmLimit);

module.exports = app;
