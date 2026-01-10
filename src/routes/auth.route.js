const express = require('express');
const { authLogin, authLogout, authLogoutAll, authRegister, authStatus, checkAvailability, getOnboardingStatus, refreshAccessToken, sendMagicLink, verifyMagicLink, verifyEmail, resendVerificationEmail, requestVerificationEmailPublic, forgotPassword, resetPassword, getCSRFToken } = require('../controllers/auth.controller');
const { anonymousLogin, convertAnonymousUser } = require('../controllers/anonymous.auth.controller');
const { sendOTP, verifyOTP, resendOTP, checkOTPStatus } = require('../controllers/otp.controller');
const { sendPhoneOTP, verifyPhoneOTP, resendPhoneOTP, checkPhoneOTPStatus } = require('../controllers/phoneOtp.controller');
const { authenticateWithOneTap } = require('../controllers/googleOneTap.controller');
const {
    generateBackupCodes,
    verifyBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    getMFAStatus
} = require('../controllers/mfa.controller');
const {
    getActiveSessions,
    getCurrentSession,
    terminateSession,
    terminateAllOtherSessions,
    getSessionStats
} = require('../controllers/session.controller');
const { changePassword, getPasswordStatus } = require('../controllers/passwordChange.controller');
const { reauthenticate, createReauthChallenge, verifyReauthChallenge, getReauthStatus } = require('../controllers/stepUpAuth.controller');
const { authenticate } = require('../middlewares');
const { requireRecentAuthHourly, requireVeryRecentAuth } = require('../middlewares/stepUpAuth.middleware');
const { authRateLimiter, sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    login: loginLimiter,
    auth: authLimiter,
    passwordReset: passwordResetLimiter,
    otp: otpLimiter
} = require('../config/rateLimiter.config').rateLimiters;
const { captchaRegister, captchaLogin, captchaForgotPassword } = require('../middlewares/captcha.middleware');
const { csrfProtection, attachCSRFToken } = require('../middlewares/csrf.middleware');
const {
    validateLogin,
    validateRegister,
    validateSendOTP,
    validateVerifyOTP,
    validateSendPhoneOTP,
    validateVerifyPhoneOTP,
    validateCheckAvailability,
    validateSendMagicLink,
    validateVerifyMagicLink,
    validateForgotPassword,
    validateResetPassword,
    validateGoogleOneTap
} = require('../validators/auth.validator');

const app = express.Router();

// SECURITY: Using sensitiveRateLimiter (3 req/hour) instead of publicRateLimiter to prevent enumeration attacks
app.post('/check-availability', sensitiveRateLimiter, validateCheckAvailability, checkAvailability);

app.post('/register', authLimiter, captchaRegister, validateRegister, authRegister);

// ========== ANONYMOUS/GUEST AUTHENTICATION ==========
app.post('/anonymous', publicRateLimiter, anonymousLogin);

app.post('/anonymous/convert', authenticate, authRateLimiter, convertAnonymousUser);

app.post('/login', loginLimiter, captchaLogin, validateLogin, authLogin);

// ========== GOOGLE ONE TAP AUTHENTICATION ==========
app.post('/google/one-tap', authRateLimiter, validateGoogleOneTap, authenticateWithOneTap);

app.post('/logout', authenticate, csrfProtection, authLogout);

app.post('/logout-all', authenticate, authLogoutAll);

app.post('/refresh', authRateLimiter, refreshAccessToken);

app.get('/me', authenticate, authStatus);

app.get('/onboarding-status', authenticate, publicRateLimiter, getOnboardingStatus);

// ========== OTP Authentication ==========
app.post('/send-otp', otpLimiter, validateSendOTP, sendOTP);

app.post('/verify-otp', otpLimiter, validateVerifyOTP, verifyOTP);

app.post('/resend-otp', sensitiveRateLimiter, validateSendOTP, resendOTP);

app.get('/otp-status', publicRateLimiter, checkOTPStatus);

// ========== Phone OTP Authentication ==========
app.post('/phone/send-otp', sensitiveRateLimiter, validateSendPhoneOTP, sendPhoneOTP);

app.post('/phone/verify-otp', authRateLimiter, validateVerifyPhoneOTP, verifyPhoneOTP);

app.post('/phone/resend-otp', sensitiveRateLimiter, validateSendPhoneOTP, resendPhoneOTP);

app.get('/phone/otp-status', publicRateLimiter, checkPhoneOTPStatus);

// ========== Magic Link (Passwordless) Authentication ==========
app.post('/magic-link/send', sensitiveRateLimiter, validateSendMagicLink, sendMagicLink);

app.post('/magic-link/verify', authRateLimiter, validateVerifyMagicLink, verifyMagicLink);

// ========== MFA Backup Codes ==========
app.post('/mfa/backup-codes/generate', authenticate, requireRecentAuthHourly({ purpose: 'MFA backup code generation' }), sensitiveRateLimiter, generateBackupCodes);

app.post('/mfa/backup-codes/verify', authRateLimiter, verifyBackupCode);

app.post('/mfa/backup-codes/regenerate', authenticate, requireRecentAuthHourly({ purpose: 'MFA backup code regeneration' }), sensitiveRateLimiter, regenerateBackupCodes);

app.get('/mfa/backup-codes/count', authenticate, publicRateLimiter, getBackupCodesCount);

app.get('/mfa/status', authenticate, publicRateLimiter, getMFAStatus);

// ========== Session Management ==========
app.get('/sessions', authenticate, publicRateLimiter, getActiveSessions);

app.get('/sessions/current', authenticate, publicRateLimiter, getCurrentSession);

app.get('/sessions/stats', authenticate, publicRateLimiter, getSessionStats);

app.delete('/sessions/:id', authenticate, csrfProtection, authRateLimiter, terminateSession);

app.delete('/sessions', authenticate, csrfProtection, authRateLimiter, terminateAllOtherSessions);

// ========== Password Management ==========
app.post('/change-password', authenticate, requireRecentAuthHourly({ purpose: 'password change' }), csrfProtection, authRateLimiter, changePassword);

app.get('/password-status', authenticate, publicRateLimiter, getPasswordStatus);

app.post('/forgot-password', passwordResetLimiter, captchaForgotPassword, validateForgotPassword, forgotPassword);

app.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);

// ========== Email Verification ==========
app.post('/verify-email', publicRateLimiter, verifyEmail);

app.post('/resend-verification', authenticate, authRateLimiter, resendVerificationEmail);

// PUBLIC endpoint - no auth required (solves circular dependency)
// Users who can't login because email isn't verified can still request verification
app.post('/request-verification-email', sensitiveRateLimiter, requestVerificationEmailPublic);

// ========== CSRF Token ==========
app.get('/csrf', authenticate, publicRateLimiter, getCSRFToken);

// ========== Step-Up Authentication / Reauthentication ==========
app.post('/reauthenticate', authenticate, csrfProtection, authRateLimiter, reauthenticate);

app.post('/reauthenticate/challenge', authenticate, csrfProtection, authRateLimiter, createReauthChallenge);

app.post('/reauthenticate/verify', authenticate, csrfProtection, authRateLimiter, verifyReauthChallenge);

app.get('/reauthenticate/status', authenticate, publicRateLimiter, getReauthStatus);

// ========== OAuth SSO Routes ==========
const oauthRoutes = require('./oauth.route');
app.use('/sso', oauthRoutes);

module.exports = app;