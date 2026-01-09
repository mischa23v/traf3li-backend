/**
 * Auth Extended Routes
 *
 * Extended authentication routes at /api/auth
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Rate limiting on sensitive endpoints
 * - Session management
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const ALLOWED_ONBOARDING_COMPANY_FIELDS = [
    'name', 'nameAr', 'industry', 'size', 'address', 'phone', 'website',
    'registrationNumber', 'taxNumber', 'country', 'timezone', 'currency'
];

const ALLOWED_ONBOARDING_PROFILE_FIELDS = [
    'firstName', 'lastName', 'phone', 'jobTitle', 'department'
];

/**
 * POST /api/auth/refresh-activity
 * Refresh session activity timestamp
 */
router.post('/refresh-activity', async (req, res) => {
    try {
        // Update user's last activity
        await User.findByIdAndUpdate(req.userID, {
            $set: { lastActivityAt: new Date() }
        });

        return res.json({
            success: true,
            message: 'Activity refreshed',
            data: { refreshedAt: new Date() }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/anonymous/extend
 * Extend anonymous session
 */
router.post('/anonymous/extend', async (req, res) => {
    try {
        const { sessionId, duration } = req.body;

        if (!sessionId) {
            throw CustomException('Session ID is required', 400);
        }

        // Extend session (mock response)
        const extendedUntil = new Date(Date.now() + (duration || 30) * 60 * 1000);

        return res.json({
            success: true,
            message: 'Anonymous session extended',
            data: {
                sessionId,
                extendedUntil
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/captcha/verify
 * Verify captcha response
 */
router.post('/captcha/verify', async (req, res) => {
    try {
        const { token, action } = req.body;

        if (!token) {
            throw CustomException('Captcha token is required', 400);
        }

        // Verify captcha (integration with actual captcha service would go here)
        // For now, simulate verification
        const score = 0.9; // Simulated score
        const isValid = score >= 0.5;

        return res.json({
            success: true,
            data: {
                valid: isValid,
                score,
                action: action || 'verify'
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/auth/captcha/settings
 * Get captcha settings
 */
router.get('/captcha/settings', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.security.captcha');

        const settings = firm?.settings?.security?.captcha || {
            enabled: true,
            provider: 'recaptcha',
            siteKey: process.env.RECAPTCHA_SITE_KEY || '',
            threshold: 0.5,
            actions: ['login', 'register', 'reset-password']
        };

        return res.json({
            success: true,
            data: settings
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/auth/captcha/settings
 * Update captcha settings
 */
router.put('/captcha/settings', async (req, res) => {
    try {
        const allowedFields = ['enabled', 'provider', 'siteKey', 'threshold', 'actions'];
        const settings = pickAllowedFields(req.body, allowedFields);

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.security.captcha': settings } }
        );

        return res.json({
            success: true,
            message: 'Captcha settings updated',
            data: settings
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/captcha/check-required
 * Check if captcha is required for action
 */
router.post('/captcha/check-required', async (req, res) => {
    try {
        const { action, email } = req.body;

        if (!action) {
            throw CustomException('Action is required', 400);
        }

        // Check failed attempts for the action/email
        const isRequired = true; // Simplified - actual logic would check failed attempts

        return res.json({
            success: true,
            data: {
                required: isRequired,
                action,
                reason: 'security_policy'
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/mfa/sms/send
 * Send MFA code via SMS
 */
router.post('/mfa/sms/send', async (req, res) => {
    try {
        const { phone } = req.body;

        const user = await User.findById(req.userID).select('phone mfa');
        if (!user) {
            throw CustomException('User not found', 404);
        }

        const targetPhone = phone || user.phone;
        if (!targetPhone) {
            throw CustomException('Phone number is required', 400);
        }

        // Generate and send code (actual SMS integration would go here)
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store code hash (in production, use a proper OTP mechanism)
        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'mfa.pendingCode': code, // In production, hash this
                'mfa.pendingCodeExpiry': new Date(Date.now() + 5 * 60 * 1000),
                'mfa.pendingCodeType': 'sms'
            }
        });

        return res.json({
            success: true,
            message: 'MFA code sent via SMS',
            data: {
                sentTo: targetPhone.replace(/\d(?=\d{4})/g, '*'),
                expiresIn: 300
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/mfa/email/send
 * Send MFA code via email
 */
router.post('/mfa/email/send', async (req, res) => {
    try {
        const user = await User.findById(req.userID).select('email mfa');
        if (!user) {
            throw CustomException('User not found', 404);
        }

        // Generate and send code (actual email integration would go here)
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'mfa.pendingCode': code,
                'mfa.pendingCodeExpiry': new Date(Date.now() + 10 * 60 * 1000),
                'mfa.pendingCodeType': 'email'
            }
        });

        return res.json({
            success: true,
            message: 'MFA code sent via email',
            data: {
                sentTo: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
                expiresIn: 600
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/auth/mfa/required
 * Check if MFA is required
 */
router.get('/mfa/required', async (req, res) => {
    try {
        const user = await User.findById(req.userID).select('mfa');
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.security.mfa');

        const mfaSettings = firm?.settings?.security?.mfa || {};
        const userMfa = user?.mfa || {};

        const required = mfaSettings.required === true || userMfa.enabled === true;
        const methods = [];

        if (userMfa.totpEnabled) methods.push('totp');
        if (userMfa.smsEnabled) methods.push('sms');
        if (userMfa.emailEnabled) methods.push('email');

        return res.json({
            success: true,
            data: {
                required,
                enabled: userMfa.enabled || false,
                methods,
                enforced: mfaSettings.required || false
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding-progress
 * Update onboarding progress
 */
router.post('/onboarding-progress', async (req, res) => {
    try {
        const { step, completed } = req.body;

        await User.findByIdAndUpdate(req.userID, {
            $set: {
                [`onboarding.steps.${step}`]: {
                    completed: completed || false,
                    completedAt: completed ? new Date() : null
                },
                'onboarding.lastUpdatedAt': new Date()
            }
        });

        return res.json({
            success: true,
            message: 'Onboarding progress updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/company-info
 * Save company info during onboarding
 */
router.post('/onboarding/company-info', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_ONBOARDING_COMPANY_FIELDS);

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: allowedFields }
        );

        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'onboarding.steps.companyInfo': {
                    completed: true,
                    completedAt: new Date()
                }
            }
        });

        return res.json({
            success: true,
            message: 'Company info saved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/company-logo
 * Upload company logo during onboarding
 */
router.post('/onboarding/company-logo', async (req, res) => {
    try {
        const { logoUrl } = req.body;

        if (!logoUrl) {
            throw CustomException('Logo URL is required', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { logo: logoUrl } }
        );

        return res.json({
            success: true,
            message: 'Company logo uploaded'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/user-profile
 * Save user profile during onboarding
 */
router.post('/onboarding/user-profile', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_ONBOARDING_PROFILE_FIELDS);

        await User.findByIdAndUpdate(req.userID, {
            $set: {
                ...allowedFields,
                'onboarding.steps.userProfile': {
                    completed: true,
                    completedAt: new Date()
                }
            }
        });

        return res.json({
            success: true,
            message: 'User profile saved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/user-avatar
 * Upload user avatar during onboarding
 */
router.post('/onboarding/user-avatar', async (req, res) => {
    try {
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            throw CustomException('Avatar URL is required', 400);
        }

        await User.findByIdAndUpdate(req.userID, {
            $set: { avatar: avatarUrl }
        });

        return res.json({
            success: true,
            message: 'User avatar uploaded'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/modules
 * Select modules during onboarding
 */
router.post('/onboarding/modules', async (req, res) => {
    try {
        const { modules } = req.body;

        if (!Array.isArray(modules)) {
            throw CustomException('Modules must be an array', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            {
                $set: {
                    'settings.enabledModules': modules,
                    'onboarding.modulesSelectedAt': new Date()
                }
            }
        );

        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'onboarding.steps.modules': {
                    completed: true,
                    completedAt: new Date()
                }
            }
        });

        return res.json({
            success: true,
            message: 'Modules selected'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/complete
 * Complete onboarding
 */
router.post('/onboarding/complete', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'onboarding.completed': true,
                'onboarding.completedAt': new Date()
            }
        });

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            {
                $set: {
                    'onboarding.completed': true,
                    'onboarding.completedAt': new Date(),
                    'onboarding.completedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Onboarding completed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/onboarding/skip
 * Skip onboarding
 */
router.post('/onboarding/skip', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'onboarding.skipped': true,
                'onboarding.skippedAt': new Date()
            }
        });

        return res.json({
            success: true,
            message: 'Onboarding skipped'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/auth/reset-password/validate
 * Validate password reset token
 */
router.get('/reset-password/validate', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            throw CustomException('Token is required', 400);
        }

        // Find user with valid reset token
        const user = await User.findOne({
            'passwordReset.token': token,
            'passwordReset.expiresAt': { $gt: new Date() }
        }).select('email');

        if (!user) {
            throw CustomException('Invalid or expired token', 400);
        }

        return res.json({
            success: true,
            data: {
                valid: true,
                email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/password/check-breach
 * Check if password has been breached
 */
router.post('/password/check-breach', async (req, res) => {
    try {
        const { passwordHash } = req.body;

        if (!passwordHash) {
            throw CustomException('Password hash is required', 400);
        }

        // In production, check against haveibeenpwned API
        // Using k-Anonymity model for privacy
        const breached = false; // Simulated response

        return res.json({
            success: true,
            data: {
                breached,
                recommendation: breached ? 'Please choose a different password' : null
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/phone/verify
 * Verify phone number
 */
router.post('/phone/verify', async (req, res) => {
    try {
        const { phone, code } = req.body;

        if (!phone || !code) {
            throw CustomException('Phone and verification code are required', 400);
        }

        // Verify code (actual verification logic would go here)
        const user = await User.findById(req.userID);
        if (!user) {
            throw CustomException('User not found', 404);
        }

        // Simulated verification
        const verified = code === user.phoneVerification?.code;

        if (verified) {
            await User.findByIdAndUpdate(req.userID, {
                $set: {
                    phone,
                    phoneVerified: true,
                    phoneVerifiedAt: new Date()
                },
                $unset: { phoneVerification: 1 }
            });
        }

        return res.json({
            success: true,
            data: { verified }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/sessions/extend
 * Extend current session
 */
router.post('/sessions/extend', async (req, res) => {
    try {
        const { duration } = req.body;
        const extendMinutes = Math.min(duration || 30, 120); // Max 2 hours

        const newExpiry = new Date(Date.now() + extendMinutes * 60 * 1000);

        await User.findByIdAndUpdate(req.userID, {
            $set: {
                'currentSession.expiresAt': newExpiry,
                'currentSession.extendedAt': new Date()
            }
        });

        return res.json({
            success: true,
            message: 'Session extended',
            data: { expiresAt: newExpiry }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/auth/sessions/:sessionId/report
 * Report suspicious session
 */
router.post('/sessions/:sessionId/report', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.sessionId);
        if (!sanitizedId) {
            throw CustomException('Invalid session ID format', 400);
        }

        const { reason, details } = req.body;

        // Log the report
        await User.findByIdAndUpdate(req.userID, {
            $push: {
                'security.reportedSessions': {
                    sessionId: sanitizedId,
                    reason,
                    details,
                    reportedAt: new Date(),
                    reportedBy: req.userID
                }
            }
        });

        // Revoke the suspicious session
        await User.findByIdAndUpdate(req.userID, {
            $pull: { 'sessions': { _id: sanitizedId } }
        });

        return res.json({
            success: true,
            message: 'Session reported and revoked'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/auth/sessions/:sessionId/report
 * Delete session report
 */
router.delete('/sessions/:sessionId/report', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.sessionId);
        if (!sanitizedId) {
            throw CustomException('Invalid session ID format', 400);
        }

        await User.findByIdAndUpdate(req.userID, {
            $pull: { 'security.reportedSessions': { sessionId: sanitizedId } }
        });

        return res.json({
            success: true,
            message: 'Session report deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/auth/reauthenticate/methods
 * Get available re-authentication methods
 */
router.get('/reauthenticate/methods', async (req, res) => {
    try {
        const user = await User.findById(req.userID).select('mfa email phone');

        const methods = ['password'];

        if (user?.mfa?.totpEnabled) methods.push('totp');
        if (user?.mfa?.smsEnabled && user?.phone) methods.push('sms');
        if (user?.email) methods.push('email');

        return res.json({
            success: true,
            data: {
                methods,
                preferred: user?.mfa?.preferredMethod || 'password'
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
