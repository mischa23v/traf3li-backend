router.post('/verify-captcha', authRateLimiter, verifyCaptcha);

router.get('/captcha/providers', publicRateLimiter, getEnabledProviders);

router.get('/captcha/status/:provider', publicRateLimiter, getProviderStatus);

module.exports = router;
