const { User, Firm, FirmInvitation } = require('../models');
const { CustomException } = require('../utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { schemas: authSchemas } = require('../validators/auth.validator');
const { getDefaultPermissions, getSoloLawyerPermissions, isSoloLawyer: checkIsSoloLawyer } = require('../config/permissions.config');
const auditLogService = require('../services/auditLog.service');
const accountLockoutService = require('../services/accountLockout.service');
const sessionManager = require('../services/sessionManager.service');
const { validatePassword } = require('../utils/passwordPolicy');
const { recordActivity, clearSessionActivity } = require('../middlewares/sessionTimeout.middleware');
const mfaService = require('../services/mfa.service');
const { validateBackupCodeFormat } = require('../utils/backupCodes');
const logger = require('../utils/contextLogger');

const { JWT_SECRET, NODE_ENV } = process.env;

// Password hashing rounds - OWASP recommends minimum 10, we use 12 for better security
const saltRounds = 12;

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS (imported from validators)
// ═══════════════════════════════════════════════════════════════

// Import validation schemas from centralized validators
const registerSchema = authSchemas.register;
const loginSchema = authSchemas.login;
const checkAvailabilitySchema = authSchemas.checkAvailability;

// Robust production detection for cross-origin cookie settings
// Checks multiple indicators to determine if we're in a production environment
const isProductionEnv = NODE_ENV === 'production' ||
                        NODE_ENV === 'prod' ||
                        process.env.RENDER === 'true' ||
                        process.env.VERCEL_ENV === 'production' ||
                        process.env.RAILWAY_ENVIRONMENT === 'production';

// Helper to detect if request is coming through a TRUE same-origin proxy
// A true same-origin proxy is when:
// 1. The frontend proxies API calls through itself (e.g., Vercel rewrites /api/* to backend)
// 2. The browser sees the API call as going to the same origin as the frontend
//
// IMPORTANT: Just because Origin header is "dashboard.traf3li.com" does NOT mean it's same-origin!
// If the frontend at dashboard.traf3li.com makes a fetch() to api.traf3li.com, that's cross-origin.
//
// Detection strategy (in order of preference):
// 1. X-Forwarded-Host: Set by reverse proxies (Vercel, Nginx, etc.) with original host
// 2. Host: Direct request host (may be backend's host when proxied)
//
// With Vercel rewrites:
//   - Origin=https://dashboard.traf3li.com
//   - Host=backend-server.render.com (or similar)
//   - X-Forwarded-Host=dashboard.traf3li.com (original host)
// Direct cross-origin:
//   - Origin=https://dashboard.traf3li.com
//   - Host=api.traf3li.com (no X-Forwarded-Host)
const isSameOriginProxy = (request) => {
    const origin = request.headers.origin || '';
    // Prefer X-Forwarded-Host (set by reverse proxies) over Host header
    // This is crucial for Vercel rewrites where Host is the backend's host
    const forwardedHost = request.headers['x-forwarded-host'] || '';
    const host = request.headers.host || '';

    // Use forwarded host if available (indicates proxy), otherwise use direct host
    const effectiveHost = forwardedHost || host;

    // If no origin header, can't determine (treat as cross-origin for safety)
    if (!origin || !effectiveHost) {
        return false;
    }

    try {
        const originHost = new URL(origin).host;
        // True same-origin: the effective host matches the Origin header's host
        // This happens when frontend proxies requests through itself (Vercel rewrites)
        const isSame = originHost === effectiveHost;

        return isSame;
    } catch {
        return false;
    }
};

// Helper to get cookie domain based on request origin
// - For same-origin proxy requests: don't set domain (browser scopes to proxy host)
// - For cross-origin *.traf3li.com: use '.traf3li.com' to share cookies across subdomains
// - For other origins (e.g., *.vercel.app): don't set domain
const getCookieDomain = (request) => {
    if (!isProductionEnv) return undefined;

    // Same-origin proxy requests: don't set domain
    if (isSameOriginProxy(request)) {
        return undefined;
    }

    const origin = request.headers.origin || request.headers.referer || '';
    if (origin.includes('.traf3li.com') || origin.includes('traf3li.com')) {
        return '.traf3li.com';
    }
    return undefined;
};

// Helper to get cookie config based on request context
// Uses more permissive settings for same-origin proxy requests
const getCookieConfig = (request) => {
    const isSameOrigin = isSameOriginProxy(request);

    if (isSameOrigin) {
        // Same-origin via proxy: use Lax (more compatible with browser privacy)
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProductionEnv,
            maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
            path: '/'
            // No domain - let browser scope to exact origin
            // No partitioned - not needed for same-origin
        };
    }

    // Cross-origin: use None with all the cross-site cookie requirements
    // Note: secure must be true for SameSite=None in production
    // But for localhost development, we need secure=false to work over HTTP
    const cookieDomain = getCookieDomain(request);
    return {
        httpOnly: true,
        sameSite: isProductionEnv ? 'none' : 'lax', // 'lax' works better for localhost
        secure: isProductionEnv, // false for localhost (HTTP), true for production (HTTPS)
        maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
        path: '/',
        domain: cookieDomain,
        partitioned: isProductionEnv // CHIPS only needed in production
    };
};

const authRegister = async (request, response) => {
    const {
        // Basic info
        username,
        email,
        phone,
        password,
        firstName,
        lastName,
        image,
        description,

        // Location
        country,
        nationality,
        region,
        city,

        // Role & Type
        isSeller,
        role,
        lawyerMode,

        // NEW: Lawyer work mode
        lawyerWorkMode, // 'solo' | 'create_firm' | 'join_firm'
        firmData,       // Required if lawyerWorkMode is 'create_firm'
        invitationCode, // Required if lawyerWorkMode is 'join_firm'

        // Lawyer profile fields
        isLicensed,
        licenseNumber,
        courts,
        yearsOfExperience,
        workType,
        firmName,
        specializations,
        languages,
        isRegisteredKhebra,
        serviceType,
        pricingModel,
        hourlyRateMin,
        hourlyRateMax,
        acceptsRemote
    } = request.body;

    try {
        // ═══════════════════════════════════════════════════════════════
        // JOI VALIDATION - Validate all input fields
        // ═══════════════════════════════════════════════════════════════
        const { error, value } = registerSchema.validate(request.body, {
            abortEarly: false,
            stripUnknown: false
        });

        if (error) {
            const messages = error.details.map(detail => detail.message);
            return response.status(400).send({
                error: true,
                message: messages.join('. '),
                code: 'VALIDATION_ERROR',
                details: error.details
            });
        }

        // Password policy validation
        const passwordValidation = validatePassword(password, {
            email,
            username,
            firstName,
            lastName,
            phone
        });

        if (!passwordValidation.valid) {
            return response.status(400).send({
                error: true,
                message: passwordValidation.errorsAr.join('. '),
                messageEn: passwordValidation.errors.join('. '),
                code: 'WEAK_PASSWORD',
                errors: passwordValidation.errors
            });
        }

        // Validate lawyerWorkMode for lawyers
        const isLawyer = isSeller || role === 'lawyer';
        if (isLawyer && lawyerWorkMode) {
            // Validate create_firm mode
            if (lawyerWorkMode === 'create_firm') {
                if (!firmData || !firmData.name || !firmData.licenseNumber) {
                    return response.status(400).send({
                        error: true,
                        message: 'بيانات المكتب مطلوبة: الاسم ورقم الترخيص'
                    });
                }
            }

            // Validate join_firm mode
            if (lawyerWorkMode === 'join_firm') {
                if (!invitationCode) {
                    return response.status(400).send({
                        error: true,
                        message: 'كود الدعوة مطلوب للانضمام إلى مكتب'
                    });
                }

                // Validate invitation code
                const invitation = await FirmInvitation.findValidByCode(invitationCode);
                if (!invitation) {
                    return response.status(400).send({
                        error: true,
                        message: 'كود الدعوة غير صالح أو منتهي الصلاحية',
                        code: 'INVITATION_INVALID'
                    });
                }

                // Check if invitation is for this email
                if (invitation.email.toLowerCase() !== email.toLowerCase()) {
                    return response.status(400).send({
                        error: true,
                        message: 'كود الدعوة مخصص لبريد إلكتروني آخر',
                        code: 'INVITATION_EMAIL_MISMATCH'
                    });
                }
            }
        }

        // SECURITY: Use async bcrypt.hash to prevent event loop blocking DoS
        const hash = await bcrypt.hash(password, saltRounds);

        // Build user object
        const userData = {
            username,
            email,
            password: hash,
            firstName,
            lastName,
            phone,
            image,
            description,
            country: country || 'Saudi Arabia',
            nationality,
            region,
            city,
            isSeller: isSeller || false,
            // SECURITY: Only allow 'lawyer' or 'client' roles during registration
            // Admin roles must be assigned through secure admin panel, not registration
            role: isSeller ? 'lawyer' : 'client',
            lawyerMode: isLawyer ? (lawyerMode || 'dashboard') : null
        };

        // Set solo lawyer fields
        if (isLawyer) {
            if (lawyerWorkMode === 'solo') {
                userData.isSoloLawyer = true;
                userData.lawyerWorkMode = 'solo';
            } else if (lawyerWorkMode === 'create_firm') {
                userData.isSoloLawyer = false;
                userData.lawyerWorkMode = 'firm_owner';
            } else if (lawyerWorkMode === 'join_firm') {
                userData.isSoloLawyer = false;
                userData.lawyerWorkMode = 'firm_member';
            } else {
                // Default to solo for backwards compatibility
                userData.isSoloLawyer = true;
                userData.lawyerWorkMode = 'solo';
            }
        }

        // Add lawyer profile if registering as lawyer
        if (isLawyer) {
            // Transform courts object from frontend format to array format
            let courtsArray = [];
            if (courts && typeof courts === 'object') {
                courtsArray = Object.entries(courts)
                    .filter(([_, value]) => value.selected)
                    .map(([courtId, value]) => ({
                        courtId,
                        courtName: value.name || courtId,
                        caseCount: value.caseCount || null
                    }));
            }

            userData.lawyerProfile = {
                isLicensed: isLicensed || false,
                licenseNumber: licenseNumber || null,
                yearsExperience: parseInt(yearsOfExperience) || 0,
                workType: workType || null,
                firmName: firmName || null,
                specialization: specializations || [],
                languages: languages || ['العربية'],
                courts: courtsArray,
                isRegisteredKhebra: isRegisteredKhebra || false,
                serviceType: serviceType || null,
                pricingModel: pricingModel || [],
                hourlyRateMin: hourlyRateMin ? parseFloat(hourlyRateMin) : null,
                hourlyRateMax: hourlyRateMax ? parseFloat(hourlyRateMax) : null,
                acceptsRemote: acceptsRemote || null
            };
        }

        const user = new User(userData);
        await user.save();

        // Response object
        let responseData = {
            error: false,
            message: 'تم إنشاء الحساب بنجاح!',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isSoloLawyer: user.isSoloLawyer,
                firmId: null,
                firmRole: null
            }
        };

        // Handle firm creation if lawyerWorkMode is 'create_firm'
        if (isLawyer && lawyerWorkMode === 'create_firm' && firmData) {
            try {
                const firm = await Firm.create({
                    name: firmData.name,
                    nameArabic: firmData.name,
                    nameEnglish: firmData.nameEn || null,
                    licenseNumber: firmData.licenseNumber,
                    email: firmData.email || email,
                    phone: firmData.phone || phone,
                    address: {
                        region: firmData.region,
                        city: firmData.city,
                        street: firmData.address
                    },
                    website: firmData.website || null,
                    description: firmData.description || null,
                    practiceAreas: firmData.specializations || [],
                    ownerId: user._id,
                    createdBy: user._id,
                    lawyers: [user._id],
                    members: [{
                        userId: user._id,
                        role: 'owner',
                        permissions: getDefaultPermissions('owner'),
                        status: 'active',
                        joinedAt: new Date()
                    }],
                    subscription: {
                        plan: 'free',
                        status: 'trial',
                        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                        maxUsers: 3,
                        maxCases: 50,
                        maxClients: 100
                    }
                });

                // Update user with firm info
                await User.findByIdAndUpdate(user._id, {
                    firmId: firm._id,
                    firmRole: 'owner',
                    firmStatus: 'active',
                    'lawyerProfile.firmID': firm._id
                });

                responseData.user.firmId = firm._id;
                responseData.user.firmRole = 'owner';
                responseData.firm = {
                    id: firm._id,
                    name: firm.name,
                    licenseNumber: firm.licenseNumber
                };
                responseData.message = 'تم إنشاء الحساب والمكتب بنجاح';
            } catch (firmError) {
                logger.error('Firm creation error', { error: firmError.message });
                // User was created but firm creation failed
                // Clean up by deleting the user
                await User.findByIdAndDelete(user._id);
                return response.status(400).send({
                    error: true,
                    message: 'فشل في إنشاء المكتب: ' + firmError.message
                });
            }
        }

        // Handle joining firm if lawyerWorkMode is 'join_firm'
        if (isLawyer && lawyerWorkMode === 'join_firm' && invitationCode) {
            try {
                const invitation = await FirmInvitation.findValidByCode(invitationCode);
                if (invitation) {
                    const firm = await Firm.findById(invitation.firmId);
                    if (firm) {
                        // Add user to firm
                        const memberPermissions = invitation.permissions && Object.values(invitation.permissions).some(v => v !== null)
                            ? invitation.permissions
                            : getDefaultPermissions(invitation.role);

                        firm.members.push({
                            userId: user._id,
                            role: invitation.role,
                            permissions: memberPermissions,
                            status: 'active',
                            joinedAt: new Date()
                        });

                        if (!firm.lawyers.includes(user._id)) {
                            firm.lawyers.push(user._id);
                        }

                        await firm.save();

                        // Update user with firm info
                        await User.findByIdAndUpdate(user._id, {
                            firmId: firm._id,
                            firmRole: invitation.role,
                            firmStatus: 'active',
                            'lawyerProfile.firmID': firm._id
                        });

                        // Mark invitation as accepted
                        await invitation.accept(user._id);

                        responseData.user.firmId = firm._id;
                        responseData.user.firmRole = invitation.role;
                        responseData.firm = {
                            id: firm._id,
                            name: firm.name,
                            role: invitation.role
                        };
                        responseData.message = 'تم إنشاء الحساب والانضمام إلى المكتب بنجاح';
                    }
                }
            } catch (joinError) {
                logger.warn('Failed to join firm during registration', { error: joinError.message });
                // User was created but joining failed - continue anyway
                // They can join later
            }
        }

        // Update message for solo lawyer
        if (isLawyer && lawyerWorkMode === 'solo') {
            responseData.message = 'تم إنشاء الحساب بنجاح كمحامي مستقل';
        }

        return response.status(201).send(responseData);
    }
    catch({message}) {
        logger.error('Registration failed', { error: message });
        if(message.includes('E11000')) {
            // Check if it's email or username duplicate
            if (message.includes('email')) {
                return response.status(400).send({
                    error: true,
                    message: 'البريد الإلكتروني مستخدم بالفعل!'
                });
            }
            return response.status(400).send({
                error: true,
                message: 'اسم المستخدم مستخدم بالفعل!'
            });
        }
        return response.status(500).send({
            error: true,
            message: 'حدث خطأ ما، يرجى المحاولة مرة أخرى'
        });
    }
}

const authLogin = async (request, response) => {
    const { username, email, password, mfaCode } = request.body;

    // Support both 'username' and 'email' fields from frontend
    const loginIdentifier = username || email;
    const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    try {
        // ═══════════════════════════════════════════════════════════════
        // JOI VALIDATION - Validate login inputs
        // ═══════════════════════════════════════════════════════════════
        const { error } = loginSchema.validate(request.body, {
            abortEarly: false
        });

        if (error) {
            const messages = error.details.map(detail => detail.message);
            return response.status(400).send({
                error: true,
                message: messages.join('. '),
                code: 'VALIDATION_ERROR',
                details: error.details
            });
        }
        // Check if account is locked BEFORE any database queries
        // PERF: isAccountLocked now runs email and IP checks in parallel
        const lockStatus = await accountLockoutService.isAccountLocked(loginIdentifier, ipAddress);
        if (lockStatus.locked) {
            // Log the blocked attempt (fire-and-forget for performance)
            auditLogService.log(
                'login_failed',
                'user',
                null,
                null,
                {
                    userId: null,
                    userEmail: loginIdentifier,
                    userRole: 'unknown',
                    ipAddress,
                    userAgent,
                    method: request.method,
                    endpoint: request.originalUrl,
                    status: 'blocked',
                    errorMessage: 'Account locked due to too many failed attempts',
                    severity: 'high',
                }
            );

            return response.status(423).json({
                error: true,
                message: lockStatus.message || 'الحساب مقفل مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة',
                messageEn: lockStatus.messageEn || 'Account temporarily locked due to multiple failed login attempts',
                code: 'ACCOUNT_LOCKED',
                remainingTime: lockStatus.remainingTime,
            });
        }

        // Accept both username AND email for login
        // PERF: Use .lean() for faster query (plain JS object, no Mongoose overhead)
        // Select only fields needed for authentication
        const user = await User.findOne({
            $or: [
                { username: loginIdentifier },
                { email: loginIdentifier }
            ]
        })
        .select('_id username email password firstName lastName role isSeller isSoloLawyer lawyerWorkMode firmId firmRole firmStatus lawyerProfile image phone country region city timezone notificationPreferences')
        .lean();

        if(!user) {
            // Record failed attempt
            const failResult = await accountLockoutService.recordFailedAttempt(loginIdentifier, ipAddress, userAgent);

            // Log failed attempt with remaining attempts info (fire-and-forget for performance)
            auditLogService.log(
                'login_failed',
                'user',
                null,
                null,
                {
                    userId: null,
                    userEmail: loginIdentifier,
                    userRole: 'unknown',
                    ipAddress,
                    userAgent,
                    method: request.method,
                    endpoint: request.originalUrl,
                    status: 'failed',
                    errorMessage: 'User not found',
                    severity: 'medium',
                    details: {
                        attemptsRemaining: failResult.attemptsRemaining,
                    }
                }
            );

            // Return appropriate error based on lockout status
            if (failResult.locked) {
                return response.status(423).json({
                    error: true,
                    message: failResult.message,
                    messageEn: failResult.messageEn,
                    code: 'ACCOUNT_LOCKED',
                    remainingTime: failResult.remainingTime,
                });
            }

            throw CustomException('Check username or password!', 404);
        }

        // PERF: Use async bcrypt.compare instead of blocking compareSync
        // This prevents blocking the event loop during password verification
        const match = await bcrypt.compare(password, user.password);

        if(match) {
            // ═══════════════════════════════════════════════════════════════
            // MFA VERIFICATION (if enabled)
            // ═══════════════════════════════════════════════════════════════
            // Check if user has MFA enabled - need to fetch MFA fields
            const userWithMFA = await User.findById(user._id)
                .select('mfaEnabled mfaSecret mfaBackupCodes')
                .lean();

            if (userWithMFA?.mfaEnabled) {
                // MFA is enabled - check if code is provided
                if (!mfaCode) {
                    // No MFA code provided - return response indicating MFA is required
                    return response.status(200).json({
                        error: false,
                        mfaRequired: true,
                        message: 'يرجى إدخال رمز المصادقة الثنائية',
                        messageEn: 'Please enter your MFA code',
                        userId: user._id,
                        code: 'MFA_REQUIRED'
                    });
                }

                // MFA code provided - verify it
                let mfaVerified = false;
                let usedBackupCode = false;

                // Check if it's a backup code format (XXXX-XXXX)
                if (validateBackupCodeFormat(mfaCode)) {
                    // Try verifying as backup code
                    try {
                        const backupResult = await mfaService.useBackupCode(user._id.toString(), mfaCode);
                        if (backupResult.valid) {
                            mfaVerified = true;
                            usedBackupCode = true;

                            // Log backup code usage
                            await auditLogService.log(
                                'mfa_login_backup_code',
                                'user',
                                user._id,
                                null,
                                {
                                    userId: user._id,
                                    userEmail: user.email,
                                    userRole: user.role,
                                    ipAddress,
                                    userAgent,
                                    remainingBackupCodes: backupResult.remainingCodes,
                                    severity: 'medium'
                                }
                            );
                        }
                    } catch (backupError) {
                        logger.warn('Backup code verification failed', { error: backupError.message });
                    }
                } else {
                    // Try verifying as TOTP code
                    try {
                        // Decrypt the MFA secret
                        const decryptedSecret = mfaService.decryptMFASecret(userWithMFA.mfaSecret);

                        // Verify the TOTP token
                        const isValidTOTP = mfaService.verifyTOTP(decryptedSecret, mfaCode, 1);

                        if (isValidTOTP) {
                            mfaVerified = true;

                            // Update mfaVerifiedAt timestamp
                            await User.findByIdAndUpdate(user._id, {
                                mfaVerifiedAt: new Date()
                            });

                            // Log TOTP verification
                            await auditLogService.log(
                                'mfa_login_totp',
                                'user',
                                user._id,
                                null,
                                {
                                    userId: user._id,
                                    userEmail: user.email,
                                    userRole: user.role,
                                    ipAddress,
                                    userAgent,
                                    severity: 'low'
                                }
                            );
                        }
                    } catch (totpError) {
                        logger.warn('TOTP verification failed', { error: totpError.message });
                    }
                }

                // Check if MFA verification succeeded
                if (!mfaVerified) {
                    // MFA verification failed
                    await auditLogService.log(
                        'mfa_login_failed',
                        'user',
                        user._id,
                        null,
                        {
                            userId: user._id,
                            userEmail: user.email,
                            userRole: user.role,
                            ipAddress,
                            userAgent,
                            reason: 'Invalid MFA code',
                            severity: 'medium'
                        }
                    );

                    return response.status(401).json({
                        error: true,
                        message: 'رمز المصادقة الثنائية غير صحيح',
                        messageEn: 'Invalid MFA code',
                        code: 'INVALID_MFA_CODE',
                        mfaRequired: true,
                        userId: user._id
                    });
                }

                // MFA verified successfully - continue with login
                if (usedBackupCode) {
                    // Get remaining backup codes
                    const remainingCodes = await mfaService.getBackupCodesCount(user._id.toString());

                    // Warn if running low on backup codes
                    if (remainingCodes <= 2) {
                        logger.warn('User running low on backup codes', { remainingCodes });
                    }
                }
            }

            // Clear failed attempts on successful login (already cleared above if MFA was used)
            await accountLockoutService.clearFailedAttempts(user.email, ipAddress);

            // Record session activity for timeout tracking
            recordActivity(user._id.toString());

            // PERF: With .lean(), user is already a plain object (no _doc needed)
            const { password: pwd, ...data } = user;

            const token = jwt.sign({
                _id: user._id,
                isSeller: user.isSeller
            }, JWT_SECRET, { expiresIn: '7 days' });

            // Get cookie config based on request context (same-origin proxy vs cross-origin)
            const cookieConfig = getCookieConfig(request);

            // Build enhanced user data with solo lawyer and firm info
            const userData = {
                ...data,
                isSoloLawyer: user.isSoloLawyer || false,
                lawyerWorkMode: user.lawyerWorkMode || null
            };

            // If user is a lawyer, get firm information and permissions
            if (user.role === 'lawyer' || user.isSeller) {
                if (user.firmId) {
                    try {
                        const firm = await Firm.findById(user.firmId)
                            .select('name nameEnglish licenseNumber status members subscription');

                        if (firm) {
                            const member = firm.members.find(
                                m => m.userId.toString() === user._id.toString()
                            );

                            userData.firm = {
                                id: firm._id,
                                name: firm.name,
                                nameEn: firm.nameEnglish,
                                status: firm.status
                            };
                            userData.firmRole = member?.role || user.firmRole;
                            userData.firmStatus = member?.status || user.firmStatus;

                            // Include permissions from firm membership
                            if (member) {
                                userData.permissions = member.permissions || getDefaultPermissions(member.role);
                            }

                            // Tenant context for firm members
                            userData.tenant = {
                                id: firm._id,
                                name: firm.name,
                                nameEn: firm.nameEnglish,
                                status: firm.status,
                                subscription: {
                                    plan: firm.subscription?.plan || 'free',
                                    status: firm.subscription?.status || 'trial'
                                }
                            };
                        }
                    } catch (firmError) {
                        logger.warn('Failed to fetch firm data', { error: firmError.message });
                    }
                } else if (checkIsSoloLawyer(user)) {
                    // Solo lawyer - full permissions, no tenant
                    userData.firm = null;
                    userData.firmRole = null;
                    userData.firmStatus = null;
                    userData.isSoloLawyer = true;
                    userData.tenant = null;
                    userData.permissions = getSoloLawyerPermissions();
                }
            }

            // Create session record (fire-and-forget for performance)
            sessionManager.createSession(user._id, token, {
                userAgent: userAgent,
                ip: ipAddress,
                firmId: user.firmId,
                country: request.headers['cf-ipcountry'] || null,
                city: request.headers['cf-ipcity'] || null,
                region: request.headers['cf-ipregion'] || null,
                timezone: user.timezone || 'Asia/Riyadh'
            }).catch(err => logger.error('Failed to create session', { error: err.message }));

            // Enforce session limit (fire-and-forget, non-blocking)
            (async () => {
                try {
                    const limit = await sessionManager.getSessionLimit(user._id, user.firmId);
                    await sessionManager.enforceSessionLimit(user._id, limit);
                } catch (err) {
                    logger.error('Failed to enforce session limit', { error: err.message });
                }
            })();

            // Log successful login (fire-and-forget for performance)
            auditLogService.log(
                'login_success',
                'user',
                user._id,
                null,
                {
                    userId: user._id,
                    userEmail: user.email,
                    userRole: user.role,
                    userName: `${user.firstName} ${user.lastName}`,
                    firmId: user.firmId,
                    ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: request.headers['user-agent'] || 'unknown',
                    method: request.method,
                    endpoint: request.originalUrl,
                    severity: 'low',
                    details: {
                        lawyerWorkMode: user.lawyerWorkMode,
                        isSoloLawyer: user.isSoloLawyer,
                    }
                }
            );

            return response.cookie('accessToken', token, cookieConfig)
                .status(202).send({
                    error: false,
                    message: 'Success!',
                    user: userData
                });
        }

        // Password mismatch - record failed attempt
        const failResult = await accountLockoutService.recordFailedAttempt(user.email, ipAddress, userAgent);

        // Log failed attempt (fire-and-forget for performance)
        auditLogService.log(
            'login_failed',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                ipAddress,
                userAgent,
                method: request.method,
                endpoint: request.originalUrl,
                status: 'failed',
                errorMessage: 'Invalid password',
                severity: 'medium',
                details: {
                    attemptsRemaining: failResult.attemptsRemaining,
                }
            }
        );

        // Return appropriate error based on lockout status
        if (failResult.locked) {
            return response.status(423).json({
                error: true,
                message: failResult.message,
                messageEn: failResult.messageEn,
                code: 'ACCOUNT_LOCKED',
                remainingTime: failResult.remainingTime,
            });
        }

        throw CustomException('Check username or password!', 404);
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

const authLogout = async (request, response) => {
    try {
        // Get token from request (set by JWT middleware)
        const token = request.token || request.cookies?.accessToken;

        // Extract user info (may come from JWT middleware or request.user)
        const userId = request.userId || request.userID || request.user?._id || request.user?.id;

        // If we have a token, revoke it
        if (token && userId) {
            const tokenRevocationService = require('../services/tokenRevocation.service');
            const { User } = require('../models');

            // Get user details for audit trail
            const user = await User.findById(userId).select('email firmId').lean();

            // Revoke the token
            await tokenRevocationService.revokeToken(token, 'logout', {
                userId,
                userEmail: user?.email,
                firmId: user?.firmId,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown'
            });

            logger.audit('token_revoked', { reason: 'logout' });
        }

        // Clear session activity tracking
        if (userId) {
            clearSessionActivity(userId?.toString());
        }

        // Terminate session record (fire-and-forget)
        if (token) {
            (async () => {
                try {
                    const session = await sessionManager.getSessionByToken(token);
                    if (session) {
                        await sessionManager.terminateSession(session._id, 'logout', userId);
                    }
                } catch (err) {
                    logger.error('Failed to terminate session', { error: err.message });
                }
            })();
        }

        // Log logout if user is authenticated
        if (request.user || userId) {
            await auditLogService.log(
                'logout',
                'user',
                userId,
                null,
                {
                    userId: userId,
                    userEmail: request.user?.email,
                    userRole: request.user?.role,
                    userName: request.user?.firstName ? `${request.user.firstName} ${request.user.lastName || ''}` : null,
                    firmId: request.user?.firmId,
                    ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: request.headers['user-agent'] || 'unknown',
                    method: request.method,
                    endpoint: request.originalUrl,
                    severity: 'low',
                }
            );
        }

        // Use same cookie config as login to ensure cookie is properly cleared
        const cookieConfig = getCookieConfig(request);

        return response.clearCookie('accessToken', cookieConfig)
        .send({
            error: false,
            message: 'User have been logged out!'
        });
    } catch (error) {
        logger.error('Logout failed', { error: error.message });

        // Even if token revocation fails, still clear the cookie
        const cookieConfig = getCookieConfig(request);

        return response.clearCookie('accessToken', cookieConfig)
        .send({
            error: false,
            message: 'User have been logged out!'
        });
    }
}

const checkAvailability = async (request, response) => {
    const { email, username, phone } = request.body;

    try {
        // ═══════════════════════════════════════════════════════════════
        // JOI VALIDATION - Validate availability check inputs
        // ═══════════════════════════════════════════════════════════════
        const { error } = checkAvailabilitySchema.validate(request.body, {
            abortEarly: false
        });

        if (error) {
            const messages = error.details.map(detail => detail.message);
            return response.status(400).send({
                error: true,
                message: messages.join('. '),
                code: 'VALIDATION_ERROR',
                details: error.details
            });
        }

        // Build query based on provided field
        let query = {};
        let field = '';

        if (email) {
            query = { email: email.toLowerCase() };
            field = 'email';
        } else if (username) {
            query = { username: username.toLowerCase() };
            field = 'username';
        } else if (phone) {
            query = { phone: phone };
            field = 'phone';
        }

        // Check if user exists with the given field
        const existingUser = await User.findOne(query).select('_id');

        return response.status(200).send({
            error: false,
            available: !existingUser,
            field: field
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

const authStatus = async (request, response) => {
    try {
        // ═══════════════════════════════════════════════════════════════
        // PERFORMANCE: Use lean() for faster query - returns plain JS object
        // findById is faster than findOne for _id lookups
        // ═══════════════════════════════════════════════════════════════
        const user = await User.findById(request.userID)
            .select('-password')
            .lean()
            .exec();

        if(!user) {
            throw CustomException('User not found!', 404);
        }

        // Build enhanced user data with solo lawyer and firm info
        // Note: With lean(), user is already a plain object (no _doc needed)
        const userData = {
            ...user,
            isSoloLawyer: user.isSoloLawyer || false,
            lawyerWorkMode: user.lawyerWorkMode || null
        };

        // If user is a lawyer, get firm/tenant information
        if (user.role === 'lawyer' || user.isSeller) {
            if (user.firmId) {
                try {
                    // PERFORMANCE: Use lean() for faster query
                    const firm = await Firm.findById(user.firmId)
                        .select('name nameEnglish licenseNumber status members subscription')
                        .lean()
                        .exec();

                    if (firm) {
                        const member = firm.members.find(
                            m => m.userId.toString() === user._id.toString()
                        );

                        // Tenant context (Casbin-style domain info)
                        userData.tenant = {
                            id: firm._id,
                            name: firm.name,
                            nameEn: firm.nameEnglish,
                            status: firm.status,
                            subscription: {
                                plan: firm.subscription?.plan || 'free',
                                status: firm.subscription?.status || 'trial'
                            }
                        };

                        // User's role within tenant
                        userData.firmRole = member?.role || user.firmRole;
                        userData.firmStatus = member?.status || user.firmStatus;
                        userData.permissions = member?.permissions || null;

                        // For backwards compatibility
                        userData.firm = {
                            id: firm._id,
                            name: firm.name,
                            nameEn: firm.nameEnglish,
                            status: firm.status
                        };
                    }
                } catch (firmError) {
                    logger.warn('Failed to fetch firm data', { error: firmError.message });
                }
            } else if (user.isSoloLawyer || !user.firmId) {
                // Solo lawyer - full access, no tenant
                userData.tenant = null;
                userData.firm = null;
                userData.firmRole = null;
                userData.firmStatus = null;
                userData.isSoloLawyer = true;

                // Solo lawyers get owner-level permissions
                userData.permissions = getDefaultPermissions('owner');
            }
        }

        return response.send({
            error: false,
            message: 'Success!',
            user: userData
        });
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

const authLogoutAll = async (request, response) => {
    try {
        const tokenRevocationService = require('../services/tokenRevocation.service');
        const { User } = require('../models');

        // Get user ID from JWT middleware
        const userId = request.userId || request.userID;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'Authentication required'
            });
        }

        // Get user details for audit trail
        const user = await User.findById(userId).select('email firmId').lean();

        if (!user) {
            return response.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        // Revoke all tokens for the user
        await tokenRevocationService.revokeAllUserTokens(userId, 'logout_all', {
            userEmail: user.email,
            firmId: user.firmId,
            ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
            userAgent: request.headers['user-agent'] || 'unknown'
        });

        // Clear session activity tracking
        clearSessionActivity(userId.toString());

        // Terminate all sessions (fire-and-forget)
        sessionManager.terminateAllSessions(userId, null, 'user_terminated', userId)
            .catch(err => logger.error('Failed to terminate all sessions', { error: err.message }));

        // Log the logout-all action
        await auditLogService.log(
            'logout_all',
            'user',
            userId,
            null,
            {
                userId: userId,
                userEmail: user.email,
                firmId: user.firmId,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown',
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'medium',
            }
        );

        // Clear the cookie
        const cookieConfig = getCookieConfig(request);

        return response.clearCookie('accessToken', cookieConfig).json({
            error: false,
            message: 'تم تسجيل الخروج من جميع الأجهزة بنجاح',
            messageEn: 'Successfully logged out from all devices'
        });
    } catch (error) {
        logger.error('Logout all failed', { error: error.message });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء تسجيل الخروج',
            messageEn: 'An error occurred during logout'
        });
    }
};

/**
 * Get user's onboarding/setup wizard completion status
 * GET /api/auth/onboarding-status
 */
const getOnboardingStatus = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // If user has no firm, they may not need onboarding (solo users)
        if (!firmId) {
            return response.status(200).json({
                success: true,
                data: {
                    isComplete: true,
                    hasStarted: false,
                    progress: {
                        total: 0,
                        completed: 0,
                        percentage: 100
                    },
                    required: {
                        total: 0,
                        completed: 0,
                        isComplete: true
                    },
                    nextTask: null
                }
            });
        }

        // Get setup progress models
        const UserSetupProgress = require('../models/userSetupProgress.model');
        const SetupTask = require('../models/setupTask.model');

        // Get all required tasks
        const requiredTasks = await SetupTask.find({ isActive: true, isRequired: true }).lean();
        const allTasks = await SetupTask.find({ isActive: true }).lean();

        // Get user's progress
        const progress = await UserSetupProgress.find({ userId, firmId }).lean();

        // Calculate completion
        const completedOrSkipped = progress.filter(p => p.isCompleted || p.skipped);
        const requiredTaskIds = requiredTasks.map(t => t.taskId);
        const requiredCompleted = progress.filter(
            p => requiredTaskIds.includes(p.taskId) && (p.isCompleted || p.skipped)
        );

        const isComplete = requiredCompleted.length >= requiredTasks.length;
        const hasStarted = progress.length > 0;

        // Get next task if not complete
        let nextTask = null;
        if (!isComplete) {
            const nextTaskData = await UserSetupProgress.getNextTask(userId, firmId);
            if (nextTaskData) {
                nextTask = {
                    taskId: nextTaskData.task.taskId,
                    name: nextTaskData.task.name,
                    description: nextTaskData.task.description,
                    route: nextTaskData.task.route,
                    section: nextTaskData.section?.name || null
                };
            }
        }

        return response.status(200).json({
            success: true,
            data: {
                isComplete,
                hasStarted,
                progress: {
                    total: allTasks.length,
                    completed: completedOrSkipped.length,
                    percentage: allTasks.length > 0
                        ? Math.round((completedOrSkipped.length / allTasks.length) * 100)
                        : 0
                },
                required: {
                    total: requiredTasks.length,
                    completed: requiredCompleted.length,
                    isComplete
                },
                nextTask
            }
        });
    } catch (error) {
        logger.error('Failed to get onboarding status', { error: error.message });
        return response.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get onboarding status',
                messageAr: 'فشل في الحصول على حالة الإعداد'
            }
        });
    }
};

module.exports = {
    authLogin,
    authLogout,
    authLogoutAll,
    authRegister,
    authStatus,
    checkAvailability,
    getOnboardingStatus,
    getCookieConfig,
    getCookieDomain
};
