const express = require('express');
const { authLogin, authLogout, authRegister, authStatus, checkAvailability } = require('../controllers/auth.controller');
const { sendOTP, verifyOTP, resendOTP, checkOTPStatus } = require('../controllers/otp.controller');
const { authenticate } = require('../middlewares');

const app = express.Router();

// Check availability (email, username, phone)
app.post('/check-availability', checkAvailability);

// Register
app.post('/register', authRegister);

// Login
app.post('/login', authLogin);

// Logout
app.post('/logout', authLogout)

// Check Auth status
app.get('/me', authenticate, authStatus);

// ========== OTP Authentication ==========
// Send OTP to email
app.post('/send-otp', sendOTP);

// Verify OTP and get tokens
app.post('/verify-otp', verifyOTP);

// Resend OTP (same as send-otp with rate limiting)
app.post('/resend-otp', resendOTP);

// Check OTP rate limit status
app.get('/otp-status', checkOTPStatus);

module.exports = app;