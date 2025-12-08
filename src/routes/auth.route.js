const express = require('express');
const { authLogin, authLogout, authRegister, authStatus, checkAvailability } = require('../controllers/auth.controller');
const { sendOTP, verifyOTP, resendOTP, checkOTPStatus } = require('../controllers/otp.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateLogin,
    validateRegister,
    validateSendOTP,
    validateVerifyOTP,
    validateCheckAvailability
} = require('../validators/auth.validator');

const app = express.Router();

// Check availability (email, username, phone) - rate limiting + validation
app.post('/check-availability', publicRateLimiter, validateCheckAvailability, checkAvailability);

// Register - strict rate limiting + strong validation
app.post('/register', authRateLimiter, validateRegister, authRegister);

// Login - strict rate limiting + validation
app.post('/login', authRateLimiter, validateLogin, authLogin);

// Logout - no rate limiting needed (requires auth anyway)
app.post('/logout', authLogout)

// Check Auth status
app.get('/me', authenticate, authStatus);

// ========== OTP Authentication ==========
// Send OTP to email - VERY strict (prevents SMS/email bombing) + validation
app.post('/send-otp', sensitiveRateLimiter, validateSendOTP, sendOTP);

// Verify OTP and get tokens - strict rate limiting + validation
app.post('/verify-otp', authRateLimiter, validateVerifyOTP, verifyOTP);

// Resend OTP - VERY strict (prevents SMS/email bombing) + validation
app.post('/resend-otp', sensitiveRateLimiter, validateSendOTP, resendOTP);

// Check OTP rate limit status
app.get('/otp-status', publicRateLimiter, checkOTPStatus);

module.exports = app;