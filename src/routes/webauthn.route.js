router.post('/register/start', authenticate, sensitiveRateLimiter, startRegistration);

router.post('/register/finish', authenticate, sensitiveRateLimiter, validateFinishRegistration, finishRegistration);

// ========================================
// AUTHENTICATION ENDPOINTS (Public)
// ========================================

router.post('/authenticate/start', authRateLimiter, validateStartAuthentication, startAuthentication);

router.post('/authenticate/finish', authRateLimiter, validateFinishAuthentication, finishAuthentication);

// ========================================
// CREDENTIAL MANAGEMENT ENDPOINTS (Protected)
// ========================================

router.get('/credentials', authenticate, getCredentials);

router.patch('/credentials/:id', authenticate, sensitiveRateLimiter, validateCredentialIdParam, validateUpdateCredentialName, updateCredentialName);
router.delete('/credentials/:id', authenticate, sensitiveRateLimiter, validateCredentialIdParam, deleteCredential);

module.exports = router;
