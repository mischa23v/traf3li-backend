app.post('/users/:id/revoke-tokens', authenticate, sensitiveRateLimiter, revokeUserTokens);

app.get('/revoked-tokens', authenticate, publicRateLimiter, getRecentRevocations);

app.get('/revoked-tokens/stats', authenticate, publicRateLimiter, getRevocationStats);

app.get('/users/:id/revocations', authenticate, publicRateLimiter, getUserRevocationHistory);

app.post('/revoked-tokens/cleanup', authenticate, sensitiveRateLimiter, cleanupExpiredTokens);

// ========== Password Management (Admin) ==========
app.post('/users/:id/expire-password', authenticate, sensitiveRateLimiter, expireUserPassword);

app.post('/firm/expire-all-passwords', authenticate, sensitiveRateLimiter, expireAllFirmPasswords);

app.get('/firm/password-stats', authenticate, publicRateLimiter, getFirmPasswordStats);

// ========== Custom JWT Claims Management (Admin) ==========
app.get('/users/:id/claims', authenticate, publicRateLimiter, getUserClaims);

app.put('/users/:id/claims', authenticate, sensitiveRateLimiter, setUserClaims);

app.delete('/users/:id/claims', authenticate, sensitiveRateLimiter, deleteUserClaims);

app.get('/users/:id/claims/preview', authenticate, publicRateLimiter, previewTokenClaims);

app.post('/users/:id/claims/validate', authenticate, publicRateLimiter, validateClaims);

module.exports = app;
