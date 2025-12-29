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
const refreshTokenService = require('../services/refreshToken.service');
const { generateAccessToken } = require('../utils/generateToken');
const magicLinkService = require('../services/magicLink.service');
const emailVerificationService = require('../services/emailVerification.service');
const authWebhookService = require('../services/authWebhook.service');
const csrfService = require('../services/csrf.service');
const geoAnomalyDetectionService = require('../services/geoAnomalyDetection.service');
const stepUpAuthService = require('../services/stepUpAuth.service');
const { getCookieConfig, getCSRFCookieConfig, isProductionEnv } = require('../utils/cookieConfig');

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
        acceptsRemote,

        // OAuth/SSO fields
        oauthProvider,
        oauthVerified
    } = request.body;

    // Check if this is an OAuth registration
    const isOAuthRegistration = oauthVerified === true &&
        ['google', 'microsoft', 'facebook', 'apple', 'github', 'linkedin', 'twitter'].includes(oauthProvider);

    try {
        // ═══════════════════════════════════════════════════════════════
        // JOI VALIDATION - Validate all input fields
        // ═══════════════════════════════════════════════════════════════
        const { error, value } = registerSchema.validate(request.body, {
            abortEarly: false,
            stripUnknown: false
        });

        if (error) {
            // For OAuth registration, filter out password-related errors if password not provided
            if (isOAuthRegistration && !password) {
                const filteredDetails = error.details.filter(detail =>
                    !detail.path.includes('password')
                );
                if (filteredDetails.length > 0) {
                    const messages = filteredDetails.map(detail => detail.message);
                    return response.status(400).send({
                        error: true,
                        message: messages.join('. '),
                        code: 'VALIDATION_ERROR',
                        details: filteredDetails
                    });
                }
                // If all errors were password-related, continue with OAuth registration
            } else {
                const messages = error.details.map(detail => detail.message);
                return response.status(400).send({
                    error: true,
                    message: messages.join('. '),
                    code: 'VALIDATION_ERROR',
                    details: error.details
                });
            }
        }

        // Password validation (skip for OAuth users without password)
        let hash = null;
        if (password) {
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

            // Check if password has been breached (HaveIBeenPwned)
            const { checkPasswordBreach } = require('../utils/passwordPolicy');
            const breachCheck = await checkPasswordBreach(password);

            // Reject breached passwords (only if API check succeeded)
            if (breachCheck.breached && !breachCheck.error) {
                return response.status(400).send({
                    error: true,
                    message: `تم العثور على كلمة المرور هذه في ${breachCheck.count.toLocaleString()} تسريب بيانات. الرجاء اختيار كلمة مرور مختلفة لحمايتك.`,
                    messageEn: `This password has been found in ${breachCheck.count.toLocaleString()} data breaches. Please choose a different password for your security.`,
                    code: 'PASSWORD_BREACHED',
                    breachCount: breachCheck.count
                });
            }

            // SECURITY: Use async bcrypt.hash to prevent event loop blocking DoS
            hash = await bcrypt.hash(password, saltRounds);
        } else if (!isOAuthRegistration) {
            // Password is required for non-OAuth registration
            return response.status(400).send({
                error: true,
                message: 'كلمة المرور مطلوبة',
                messageEn: 'Password is required',
                code: 'VALIDATION_ERROR'
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

        // Build user object
        const userData = {
            username,
            email,
            password: hash, // Will be null for OAuth users without password
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
            // Role is user's explicit choice, not derived from isSeller
            role: role === 'lawyer' ? 'lawyer' : 'client',
            lawyerMode: isLawyer ? (lawyerMode || 'dashboard') : null,

            // OAuth/SSO fields - set when registering via OAuth
            isSSOUser: isOAuthRegistration,
            ssoProvider: isOAuthRegistration ? oauthProvider : null,
            createdViaSSO: isOAuthRegistration,

            // Email verification - OAuth users are pre-verified
            isEmailVerified: isOAuthRegistration,
            emailVerifiedAt: isOAuthRegistration ? new Date() : null
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
                // NOTE: Bypass firmIsolation filter - user doesn't have firmId yet during registration
                await User.findByIdAndUpdate(user._id, {
                    firmId: firm._id,
                    firmRole: 'owner',
                    firmStatus: 'active',
                    'lawyerProfile.firmID': firm._id
                }, { bypassFirmFilter: true });

                responseData.user.firmId = firm._id;
                responseData.user.firmRole = 'owner';
                responseData.firm = {
                    id: firm._id,
                    name: firm.name,
                    licenseNumber: firm.licenseNumber
                };
                responseData.message = 'تم إنشاء الحساب والمكتب بنجاح';
            } catch (firmError) {
                logger.error('Firm creation error', {
                    error: firmError.message,
                    userId: user._id,
                    firmName: firmData?.name
                });
                // User was created but firm creation failed
                // Clean up by deleting the user
                // NOTE: Bypass firmIsolation filter - user doesn't have firmId yet during registration
                await User.findByIdAndDelete(user._id).setOptions({ bypassFirmFilter: true });
                return response.status(400).send({
                    error: true,
                    message: 'فشل في إنشاء المكتب. يرجى المحاولة مرة أخرى',
                    messageEn: 'Failed to create firm. Please try again',
                    code: 'FIRM_CREATION_FAILED'
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
                        // NOTE: Bypass firmIsolation filter - user doesn't have firmId yet during registration
                        await User.findByIdAndUpdate(user._id, {
                            firmId: firm._id,
                            firmRole: invitation.role,
                            firmStatus: 'active',
                            'lawyerProfile.firmID': firm._id
                        }, { bypassFirmFilter: true });

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

        // Send email verification (fire-and-forget, non-blocking)
        // Skip for OAuth users since their email is already verified by the provider
        if (!isOAuthRegistration) {
            (async () => {
                try {
                    const userName = `${firstName} ${lastName}`;
                    await emailVerificationService.sendVerificationEmail(
                        user._id.toString(),
                        email,
                        userName,
                        'ar' // Default to Arabic
                    );
                } catch (error) {
                    logger.error('Failed to send verification email during registration', {
                        error: error.message,
                        userId: user._id,
                        email
                    });
                    // Don't fail registration if email sending fails
                }
            })();
        }

        // Trigger registration webhook (fire-and-forget)
        (async () => {
            try {
                await authWebhookService.triggerRegisterWebhook(user, request, {
                    firmId: user.firmId?.toString() || null,
                    firmRole: user.firmRole || null,
                    lawyerWorkMode: user.lawyerWorkMode || null
                });
            } catch (error) {
                logger.error('Failed to trigger registration webhook', {
                    error: error.message,
                    userId: user._id
                });
                // Don't fail registration if webhook fails
            }
        })();

        // For OAuth registration, generate tokens and set cookies so user is logged in
        // This matches the behavior of regular login and SSO login
        if (isOAuthRegistration) {
            const token = await generateAccessToken(user);

            // Create device info for refresh token
            const deviceInfo = {
                userAgent: request.headers['user-agent'] || 'unknown',
                ip: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                deviceId: request.headers['x-device-id'] || null,
                browser: request.headers['sec-ch-ua'] || null,
                os: request.headers['sec-ch-ua-platform'] || null,
                device: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
            };

            // Generate refresh token (matches regular login behavior)
            const refreshToken = await refreshTokenService.createRefreshToken(
                user._id.toString(),
                deviceInfo,
                user.firmId
            );

            // Set both cookies with proper config
            response.cookie('accessToken', token, getCookieConfig(request, 'access'));
            response.cookie('refreshToken', refreshToken, getCookieConfig(request, 'refresh'));

            responseData.token = token;
            responseData.message = 'تم إنشاء الحساب بنجاح عبر ' + oauthProvider;
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
};

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

            // SECURITY FIX: Return generic 401 instead of 423 to prevent account enumeration
            // Don't reveal whether the account exists or is just locked
            return response.status(401).json({
                error: true,
                message: 'بيانات الدخول غير صحيحة',
                messageEn: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Accept both username AND email for login
        // PERF: Use .lean() for faster query (plain JS object, no Mongoose overhead)
        // Select only fields needed for authentication
        // NOTE: Bypass firmIsolation filter - we don't know firmId during login
        //       and solo lawyers don't have a firmId at all
        const user = await User.findOne({
            $or: [
                { username: loginIdentifier },
                { email: loginIdentifier }
            ]
        })
        .select('_id username email password firstName lastName role isSeller isSoloLawyer lawyerWorkMode firmId firmRole firmStatus lawyerProfile image phone country region city timezone notificationPreferences')
        .setOptions({ bypassFirmFilter: true })
        .lean();

        if(!user) {
            // SECURITY FIX: Perform fake bcrypt.compare to prevent timing attacks
            // Without this, attackers can distinguish between valid/invalid users by response time
            await bcrypt.compare(password, '$2b$12$K1R8L6Q5MxN7P2V3W4Y5ZeAbCdEfGhIjKlMnOpQrStUvWxYz1234AB');

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

            // SECURITY FIX: Return generic 401 instead of 423/404 to prevent account enumeration
            if (failResult.locked) {
                return response.status(401).json({
                    error: true,
                    message: 'بيانات الدخول غير صحيحة',
                    messageEn: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            return response.status(401).json({
                error: true,
                message: 'بيانات الدخول غير صحيحة',
                messageEn: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Only lawyers are allowed to login to the dashboard
        // Clients and other non-lawyer roles are not permitted
        if (user.role !== 'lawyer') {
            logger.warn('Non-lawyer login attempt blocked', {
                userId: user._id,
                email: user.email,
                role: user.role,
                ipAddress
            });

            return response.status(403).json({
                error: true,
                message: 'هذه اللوحة مخصصة للمحامين فقط',
                messageEn: 'This dashboard is for lawyers only',
                code: 'LAWYERS_ONLY'
            });
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
                .setOptions({ bypassFirmFilter: true })
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
                        // Prepare context for backup code usage notification
                        const context = {
                            ipAddress,
                            userAgent,
                            location: null // Can be enhanced with GeoIP lookup if needed
                        };

                        const backupResult = await mfaService.useBackupCode(user._id.toString(), mfaCode, context);
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
                            // NOTE: Bypass firmIsolation filter - auth operations need to work for solo lawyers without firmId
                            await User.findByIdAndUpdate(user._id, {
                                mfaVerifiedAt: new Date()
                            }, { bypassFirmFilter: true });

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

            // Update reauthentication timestamp on successful login (fire-and-forget for performance)
            stepUpAuthService.updateReauthTimestamp(user._id.toString()).catch(err =>
                logger.error('Failed to update reauth timestamp on login:', err)
            );

            // ═══════════════════════════════════════════════════════════════
            // GEOGRAPHIC ANOMALY DETECTION
            // ═══════════════════════════════════════════════════════════════
            // Detect suspicious logins based on location changes (fire-and-forget for performance)
            (async () => {
                try {
                    const deviceFingerprint = {
                        userAgent,
                        deviceType: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop',
                        os: request.headers['sec-ch-ua-platform'] || 'unknown',
                        browser: request.headers['sec-ch-ua'] || 'unknown',
                        deviceId: request.headers['x-device-id'] || null,
                        firmId: user.firmId,
                    };

                    const anomalyResult = await geoAnomalyDetectionService.detectAnomalies(
                        user._id.toString(),
                        ipAddress,
                        new Date(),
                        deviceFingerprint
                    );

                    if (anomalyResult.anomalous) {
                        logger.warn('Geographic anomaly detected during login', {
                            userId: user._id,
                            userEmail: user.email,
                            action: anomalyResult.action,
                            riskScore: anomalyResult.riskScore,
                            factors: anomalyResult.factors,
                            travelSpeed: anomalyResult.travelSpeed,
                            distance: anomalyResult.distance,
                        });

                        // Note: The action is handled asynchronously and doesn't block login
                        // - If action is 'block', the security incident is logged for review
                        // - If action is 'verify', additional verification would be required on next login
                        // - If action is 'notify', user receives an email notification
                        // - If action is 'log', it's just logged for monitoring
                    }
                } catch (geoError) {
                    logger.error('Geographic anomaly detection failed', {
                        error: geoError.message,
                        userId: user._id,
                        userEmail: user.email,
                    });
                    // Don't fail login if geo detection fails
                }
            })();

            // PERF: With .lean(), user is already a plain object (no _doc needed)
            const { password: pwd, ...data } = user;

            // Generate access token (short-lived, 15 minutes)
            const accessToken = await generateAccessToken(user);

            // Create device info for refresh token
            const deviceInfo = {
                userAgent: userAgent,
                ip: ipAddress,
                deviceId: request.headers['x-device-id'] || null,
                browser: request.headers['sec-ch-ua'] || null,
                os: request.headers['sec-ch-ua-platform'] || null,
                device: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
            };

            // Generate refresh token (long-lived, 7 days)
            const refreshToken = await refreshTokenService.createRefreshToken(
                user._id.toString(),
                deviceInfo,
                user.firmId
            );

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
                            const member = firm.members?.find(
                                m => m.userId?.toString() === user._id.toString()
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
            sessionManager.createSession(user._id, accessToken, {
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

            // Get refresh token cookie config with proper expiry
            const refreshCookieConfig = getCookieConfig(request, 'refresh');

            // Generate CSRF token for the session (if enabled)
            let csrfTokenData = null;
            if (csrfService.isEnabled()) {
                try {
                    csrfTokenData = await csrfService.generateCSRFToken(user._id.toString());
                    logger.debug('CSRF token generated for login', { userId: user._id });
                } catch (csrfError) {
                    logger.warn('Failed to generate CSRF token for login', { error: csrfError.message });
                    // Don't fail login if CSRF token generation fails
                }
            }

            // Trigger login webhook (fire-and-forget)
            (async () => {
                try {
                    await authWebhookService.triggerLoginWebhook(user, request, {
                        loginMethod: 'password',
                        mfaUsed: userWithMFA?.mfaEnabled || false,
                        firmId: user.firmId?.toString() || null
                    });
                } catch (error) {
                    logger.error('Failed to trigger login webhook', {
                        error: error.message,
                        userId: user._id
                    });
                    // Don't fail login if webhook fails
                }
            })();

            const loginResponse = {
                error: false,
                message: 'Success!',
                user: userData
            };

            // Include CSRF token in response if generated
            if (csrfTokenData && csrfTokenData.token) {
                loginResponse.csrfToken = csrfTokenData.token;

                // Also set CSRF token in cookie for double-submit pattern using secure configuration
                response.cookie('csrfToken', csrfTokenData.token, getCSRFCookieConfig(request));
            }

            return response
                .cookie('accessToken', accessToken, getCookieConfig(request, 'access'))
                .cookie('refreshToken', refreshToken, refreshCookieConfig)
                .status(202).send(loginResponse);
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

        // SECURITY FIX: Return generic 401 for both locked and wrong password
        // This prevents attackers from distinguishing between locked accounts and wrong passwords
        if (failResult.locked) {
            return response.status(401).json({
                error: true,
                message: 'بيانات الدخول غير صحيحة',
                messageEn: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        return response.status(401).json({
            error: true,
            message: 'بيانات الدخول غير صحيحة',
            messageEn: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
        });
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

const authLogout = async (request, response) => {
    try {
        // Get tokens from request (set by JWT middleware or cookies)
        const accessToken = request.token || request.cookies?.accessToken;
        const refreshToken = request.cookies?.refreshToken;

        // Extract user info (may come from JWT middleware or request.user)
        const userId = request.userId || request.userID || request.user?._id || request.user?.id;

        // If we have tokens, revoke them
        if (accessToken && userId) {
            const tokenRevocationService = require('../services/tokenRevocation.service');
            const { User } = require('../models');

            // Get user details for audit trail
            // NOTE: Bypass firmIsolation filter - logout needs to work for solo lawyers without firmId
            const user = await User.findById(userId).select('email firmId').setOptions({ bypassFirmFilter: true }).lean();

            // Revoke the access token
            await tokenRevocationService.revokeToken(accessToken, 'logout', {
                userId,
                userEmail: user?.email,
                firmId: user?.firmId,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown'
            });

            logger.audit('token_revoked', { reason: 'logout' });
        }

        // Revoke refresh token if present
        if (refreshToken) {
            try {
                await refreshTokenService.revokeRefreshToken(refreshToken, 'logout');
                logger.info('Refresh token revoked on logout', { userId });
            } catch (error) {
                logger.warn('Failed to revoke refresh token on logout', { error: error.message });
                // Continue with logout even if refresh token revocation fails
            }
        }

        // Clear session activity tracking
        if (userId) {
            clearSessionActivity(userId?.toString());
        }

        // Terminate session record (fire-and-forget)
        if (accessToken) {
            (async () => {
                try {
                    const session = await sessionManager.getSessionByToken(accessToken);
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

            // Trigger logout webhook (fire-and-forget)
            (async () => {
                try {
                    if (request.user) {
                        await authWebhookService.triggerLogoutWebhook(request.user, request, {
                            firmId: request.user.firmId?.toString() || null
                        });
                    }
                } catch (error) {
                    logger.error('Failed to trigger logout webhook', {
                        error: error.message,
                        userId
                    });
                    // Don't fail logout if webhook fails
                }
            })();
        }

        // Use same cookie config as login to ensure cookie is properly cleared
        const cookieConfig = getCookieConfig(request);

        return response
            .clearCookie('accessToken', cookieConfig)
            .clearCookie('refreshToken', cookieConfig)
            .send({
                error: false,
                message: 'User have been logged out!'
            });
    } catch (error) {
        logger.error('Logout failed', { error: error.message });

        // Even if token revocation fails, still clear the cookies
        const cookieConfig = getCookieConfig(request);

        return response
            .clearCookie('accessToken', cookieConfig)
            .clearCookie('refreshToken', cookieConfig)
            .send({
                error: false,
                message: 'User have been logged out!'
            });
    }
};

/**
 * SECURITY WARNING: This endpoint can be used for user enumeration
 * REQUIRED: Apply rate limiting middleware (e.g., 10 requests per hour per IP)
 * RECOMMENDED: Consider requiring authentication for this endpoint
 */
const checkAvailability = async (request, response) => {
    const { email, username, phone } = request.body;
    const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

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

        // SECURITY FIX: Add delay to prevent rapid enumeration attacks
        // Minimum 500ms delay for all requests to slow down bulk enumeration
        const startTime = Date.now();

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

        // Check if user exists with the given field (bypass firmFilter for auth)
        const existingUser = await User.findOne(query)
            .select('_id')
            .setOptions({ bypassFirmFilter: true });

        // Log availability check for security monitoring
        if (existingUser) {
            auditLogService.log(
                'availability_check',
                'user',
                null,
                null,
                {
                    field,
                    value: field === 'email' ? '***' : field === 'username' ? username : '***',
                    found: true,
                    ipAddress,
                    userAgent: request.headers['user-agent'] || 'unknown',
                    severity: 'low'
                }
            );
        }

        // SECURITY FIX: Ensure minimum delay of 500ms to slow down enumeration
        const elapsedTime = Date.now() - startTime;
        const minimumDelay = 500;
        if (elapsedTime < minimumDelay) {
            await new Promise(resolve => setTimeout(resolve, minimumDelay - elapsedTime));
        }

        // SECURITY NOTE: While we still return availability status, the delay and rate limiting
        // make bulk enumeration much more difficult. Consider requiring authentication
        // for this endpoint in the future for maximum security.
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
};

const authStatus = async (request, response) => {
    try {
        // ═══════════════════════════════════════════════════════════════
        // PERFORMANCE: Use lean() for faster query - returns plain JS object
        // findById is faster than findOne for _id lookups
        // Bypass firmFilter - solo lawyers don't have firmId
        // ═══════════════════════════════════════════════════════════════
        const user = await User.findById(request.userID)
            .select('-password')
            .setOptions({ bypassFirmFilter: true })
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
                        const member = firm.members?.find(
                            m => m.userId?.toString() === user._id.toString()
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
    catch(error) {
        const message = error?.message || 'An error occurred';
        const status = error?.status || 500;
        return response.status(status).send({
            error: true,
            message
        });
    }
};

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
        // NOTE: Bypass firmIsolation filter - logout needs to work for solo lawyers without firmId
        const user = await User.findById(userId).select('email firmId').setOptions({ bypassFirmFilter: true }).lean();

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

/**
 * Send magic link for passwordless authentication
 * POST /api/auth/magic-link/send
 */
const sendMagicLink = async (request, response) => {
    const { email, purpose = 'login', redirectUrl } = request.body;

    try {
        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        const result = await magicLinkService.sendMagicLink(
            email,
            purpose,
            redirectUrl,
            { ip: ipAddress, userAgent }
        );

        if (!result.success) {
            return response.status(400).json({
                error: true,
                message: result.message,
                messageEn: result.messageEn,
                code: result.code
            });
        }

        // Log the request
        await auditLogService.log(
            'magic_link_requested',
            'user',
            null,
            null,
            {
                email,
                purpose,
                ipAddress,
                userAgent,
                severity: 'low'
            }
        );

        return response.status(200).json({
            error: false,
            message: result.message,
            messageEn: result.messageEn,
            expiresInMinutes: result.expiresInMinutes
        });
    } catch (error) {
        logger.error('Failed to send magic link', {
            error: error.message,
            email: email ? '***' : undefined, // Sanitize email in logs
            purpose
        });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إرسال رابط تسجيل الدخول',
            messageEn: 'An error occurred while sending the login link',
            code: 'MAGIC_LINK_SEND_FAILED'
        });
    }
};

/**
 * Verify magic link and authenticate user
 * POST /api/auth/magic-link/verify
 */
const verifyMagicLink = async (request, response) => {
    const { token } = request.body;

    try {
        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        const result = await magicLinkService.verifyMagicLink(token, { ip: ipAddress, userAgent });

        if (!result.valid) {
            // Log failed verification
            await auditLogService.log(
                'magic_link_verification_failed',
                'user',
                null,
                null,
                {
                    token: token.substring(0, 8) + '...',
                    reason: result.code,
                    ipAddress,
                    userAgent,
                    severity: 'medium'
                }
            );

            return response.status(400).json({
                error: true,
                message: result.message,
                messageEn: result.messageEn,
                code: result.code
            });
        }

        // For register purpose, return email for frontend to complete registration
        if (result.purpose === 'register') {
            return response.status(200).json({
                error: false,
                message: result.message,
                messageEn: result.messageEn,
                purpose: result.purpose,
                email: result.email,
                redirectUrl: result.redirectUrl
            });
        }

        // For login/verify_email, authenticate the user
        const user = result.user;

        // Record session activity
        recordActivity(user._id.toString());

        // Generate access token using proper utility (matches regular login)
        const accessToken = await generateAccessToken(user);

        // Create device info for refresh token
        const deviceInfo = {
            userAgent,
            ip: ipAddress,
            deviceId: request.headers['x-device-id'] || null,
            browser: request.headers['sec-ch-ua'] || null,
            os: request.headers['sec-ch-ua-platform'] || null,
            device: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
        };

        // Generate refresh token (matches regular login behavior)
        const refreshToken = await refreshTokenService.createRefreshToken(
            user._id.toString(),
            deviceInfo,
            user.firmId
        );

        // Get cookie configs for access and refresh tokens
        const accessCookieConfig = getCookieConfig(request, 'access');
        const refreshCookieConfig = getCookieConfig(request, 'refresh');

        // Build user data with firm info if applicable
        const userData = {
            ...user,
            isSoloLawyer: user.isSoloLawyer || false,
            lawyerWorkMode: user.lawyerWorkMode || null
        };

        // If user is a lawyer, get firm information
        if (user.role === 'lawyer' || user.isSeller) {
            if (user.firmId) {
                try {
                    const firm = await Firm.findById(user.firmId)
                        .select('name nameEnglish licenseNumber status members subscription');

                    if (firm) {
                        const member = firm.members?.find(
                            m => m.userId?.toString() === user._id.toString()
                        );

                        userData.firm = {
                            id: firm._id,
                            name: firm.name,
                            nameEn: firm.nameEnglish,
                            status: firm.status
                        };
                        userData.firmRole = member?.role || user.firmRole;
                        userData.firmStatus = member?.status || user.firmStatus;

                        if (member) {
                            userData.permissions = member.permissions || getDefaultPermissions(member.role);
                        }

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
                userData.firm = null;
                userData.firmRole = null;
                userData.firmStatus = null;
                userData.isSoloLawyer = true;
                userData.tenant = null;
                userData.permissions = getSoloLawyerPermissions();
            }
        }

        // Create session record
        sessionManager.createSession(user._id, accessToken, {
            userAgent,
            ip: ipAddress,
            firmId: user.firmId,
            country: request.headers['cf-ipcountry'] || null,
            city: request.headers['cf-ipcity'] || null,
            region: request.headers['cf-ipregion'] || null,
            timezone: user.timezone || 'Asia/Riyadh'
        }).catch(err => logger.error('Failed to create session', { error: err.message }));

        // Enforce session limit
        (async () => {
            try {
                const limit = await sessionManager.getSessionLimit(user._id, user.firmId);
                await sessionManager.enforceSessionLimit(user._id, limit);
            } catch (err) {
                logger.error('Failed to enforce session limit', { error: err.message });
            }
        })();

        // Log successful login
        await auditLogService.log(
            'magic_link_login_success',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                userName: `${user.firstName} ${user.lastName}`,
                firmId: user.firmId,
                ipAddress,
                userAgent,
                purpose: result.purpose,
                severity: 'low'
            }
        );

        return response
            .cookie('accessToken', accessToken, accessCookieConfig)
            .cookie('refreshToken', refreshToken, refreshCookieConfig)
            .status(200).json({
                error: false,
                message: 'تم تسجيل الدخول بنجاح',
                messageEn: 'Login successful',
                user: userData,
                redirectUrl: result.redirectUrl
            });
    } catch (error) {
        logger.error('Failed to verify magic link', {
            error: error.message,
            token: token ? token.substring(0, 8) + '...' : undefined // Log only token prefix
        });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء التحقق من رابط تسجيل الدخول',
            messageEn: 'An error occurred while verifying the login link',
            code: 'MAGIC_LINK_VERIFY_FAILED'
        });
    }
};

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
const verifyEmail = async (request, response) => {
    try {
        const { token } = request.body;

        if (!token) {
            return response.status(400).json({
                error: true,
                message: 'رمز التفعيل مطلوب',
                messageEn: 'Verification token required',
                code: 'TOKEN_REQUIRED'
            });
        }

        const result = await emailVerificationService.verifyEmail(token);

        if (!result.success) {
            return response.status(400).json({
                error: true,
                message: result.message,
                messageEn: result.messageEn,
                code: result.code
            });
        }

        // Log successful verification
        await auditLogService.log(
            'email_verified',
            'user',
            result.user.id,
            null,
            {
                userId: result.user.id,
                userEmail: result.user.email,
                userName: result.user.name,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown',
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'low',
            }
        );

        return response.status(200).json({
            error: false,
            message: result.message,
            messageEn: result.messageEn,
            user: result.user
        });
    } catch (error) {
        const reqToken = request.body?.token;
        logger.error('Email verification failed', {
            error: error.message,
            token: reqToken ? reqToken.substring(0, 8) + '...' : undefined // Log only token prefix
        });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء تفعيل البريد الإلكتروني',
            messageEn: 'An error occurred while verifying email',
            code: 'EMAIL_VERIFY_FAILED'
        });
    }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
const resendVerificationEmail = async (request, response) => {
    try {
        // Get user ID from authenticated request
        const userId = request.userID || request.userId || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول',
                messageEn: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const result = await emailVerificationService.resendVerificationEmail(userId);

        if (!result.success) {
            const statusCode = result.code === 'RATE_LIMITED' ? 429 : 400;
            return response.status(statusCode).json({
                error: true,
                message: result.message,
                messageEn: result.messageEn,
                code: result.code,
                waitTime: result.waitTime
            });
        }

        return response.status(200).json({
            error: false,
            message: result.message,
            messageEn: result.messageEn,
            expiresAt: result.expiresAt
        });
    } catch (error) {
        logger.error('Failed to resend verification email', {
            error: error.message,
            userId: request.userID || request.userId
        });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إعادة إرسال رابط التفعيل',
            messageEn: 'An error occurred while resending verification link',
            code: 'RESEND_EMAIL_FAILED'
        });
    }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
const refreshAccessToken = async (request, response) => {
    try {
        // Get refresh token from cookie or body
        const refreshToken = request.cookies?.refreshToken || request.body?.refreshToken;

        if (!refreshToken) {
            return response.status(401).json({
                error: true,
                message: 'Refresh token required',
                messageAr: 'رمز التحديث مطلوب',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
        }

        // Refresh the access token (with rotation)
        const result = await refreshTokenService.refreshAccessToken(refreshToken);

        // Get cookie configs for access and refresh tokens (with proper expiry)
        const accessCookieConfig = getCookieConfig(request, 'access');
        const refreshCookieConfig = getCookieConfig(request, 'refresh');

        // Log successful refresh
        await auditLogService.log(
            'token_refreshed_success',
            'user',
            result.user.id,
            null,
            {
                userId: result.user.id,
                userEmail: result.user.email,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown',
                severity: 'low'
            }
        );

        // Return new tokens
        return response
            .cookie('accessToken', result.accessToken, accessCookieConfig)
            .cookie('refreshToken', result.refreshToken, refreshCookieConfig)
            .status(200).json({
                error: false,
                message: 'Token refreshed successfully',
                messageAr: 'تم تحديث الرمز بنجاح',
                user: result.user
            });
    } catch (error) {
        // Sanitize error logging - don't log sensitive token data
        const hasToken = !!(request.cookies?.refreshToken || request.body?.refreshToken);
        logger.error('Token refresh failed', {
            error: error.message,
            hasRefreshToken: hasToken
        });

        // Handle specific error codes
        const errorCode = error.message;
        let statusCode = 401;
        let message = 'فشل تحديث الرمز';
        let messageEn = 'Token refresh failed';
        let code = 'REFRESH_FAILED';

        // Map known error codes to user-friendly messages
        const errorMap = {
            'INVALID_REFRESH_TOKEN': {
                statusCode: 401,
                message: 'رمز التحديث غير صالح',
                messageEn: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            },
            'REFRESH_TOKEN_EXPIRED': {
                statusCode: 401,
                message: 'انتهت صلاحية رمز التحديث',
                messageEn: 'Refresh token expired',
                code: 'REFRESH_TOKEN_EXPIRED'
            },
            'REFRESH_TOKEN_REVOKED': {
                statusCode: 401,
                message: 'تم إلغاء رمز التحديث',
                messageEn: 'Refresh token revoked',
                code: 'REFRESH_TOKEN_REVOKED'
            },
            'REFRESH_TOKEN_NOT_FOUND': {
                statusCode: 401,
                message: 'رمز التحديث غير موجود',
                messageEn: 'Refresh token not found',
                code: 'REFRESH_TOKEN_NOT_FOUND'
            },
            'TOKEN_REUSE_DETECTED': {
                statusCode: 403,
                message: 'تم اكتشاف إعادة استخدام رمز التحديث - تم إلغاء جميع الجلسات',
                messageEn: 'Token reuse detected - all sessions revoked',
                code: 'TOKEN_REUSE_DETECTED'
            },
            'USER_NOT_FOUND': {
                statusCode: 404,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found',
                code: 'USER_NOT_FOUND'
            }
        };

        // Use mapped error or default
        const mappedError = errorMap[errorCode];
        if (mappedError) {
            statusCode = mappedError.statusCode;
            message = mappedError.message;
            messageEn = mappedError.messageEn;
            code = mappedError.code;
        }

        return response.status(statusCode).json({
            error: true,
            message,
            messageEn,
            code
        });
    }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (request, response) => {
    const { email } = request.body;
    const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

    try {
        // Find user by email (bypass firmFilter for auth operations)
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('_id email firstName lastName passwordResetRequestedAt')
            .setOptions({ bypassFirmFilter: true })
            .lean();

        // SECURITY: Always return success even if user doesn't exist
        // This prevents email enumeration attacks
        if (!user) {
            logger.warn('Password reset requested for non-existent email', { email });
            return response.status(200).json({
                error: false,
                message: 'إذا كان البريد الإلكتروني موجوداً، سيتم إرسال رابط إعادة تعيين كلمة المرور',
                messageEn: 'If the email exists, a password reset link will be sent'
            });
        }

        // RATE LIMITING: Check if user has requested reset recently (max 3 per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (user.passwordResetRequestedAt && user.passwordResetRequestedAt > oneHourAgo) {
            const resetCount = await User.countDocuments({
                _id: user._id,
                passwordResetRequestedAt: { $gte: oneHourAgo }
            });

            if (resetCount >= 3) {
                logger.warn('Password reset rate limit exceeded', { userId: user._id, email, ipAddress });
                return response.status(429).json({
                    error: true,
                    message: 'تم تجاوز الحد الأقصى لطلبات إعادة تعيين كلمة المرور. يرجى المحاولة لاحقاً',
                    messageEn: 'Too many password reset requests. Please try again later',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }
        }

        // Generate secure reset token (32 bytes = 64 hex characters)
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash the token before storing (using SHA256)
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set token expiration (30 minutes from now)
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Update user with reset token and expiration
        // NOTE: Bypass firmIsolation filter - password reset needs to work for solo lawyers without firmId
        await User.findByIdAndUpdate(user._id, {
            passwordResetToken: hashedToken,
            passwordResetExpires: expiresAt,
            passwordResetRequestedAt: new Date()
        }, { bypassFirmFilter: true });

        // Send password reset email
        const emailService = require('../services/email.service');
        const userName = `${user.firstName} ${user.lastName}`;

        try {
            await emailService.sendPasswordReset(
                {
                    email: user.email,
                    name: userName
                },
                resetToken,
                'ar' // Default to Arabic
            );

            logger.info('Password reset email sent successfully', { userId: user._id, email });
        } catch (emailError) {
            logger.error('Failed to send password reset email', {
                error: emailError.message,
                userId: user._id,
                email
            });

            // Clear the reset token if email fails
            // NOTE: Bypass firmIsolation filter - password reset needs to work for solo lawyers without firmId
            await User.findByIdAndUpdate(user._id, {
                passwordResetToken: null,
                passwordResetExpires: null
            }, { bypassFirmFilter: true });

            return response.status(500).json({
                error: true,
                message: 'فشل في إرسال بريد إعادة تعيين كلمة المرور',
                messageEn: 'Failed to send password reset email'
            });
        }

        // Log the password reset request
        await auditLogService.log(
            'password_reset_requested',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                ipAddress,
                userAgent: request.headers['user-agent'] || 'unknown',
                severity: 'medium'
            }
        );

        // Trigger password reset requested webhook (fire-and-forget)
        (async () => {
            try {
                await authWebhookService.triggerPasswordResetRequestedWebhook(user, request, {
                    firmId: user.firmId?.toString() || null,
                    expiresInMinutes: 30
                });
            } catch (error) {
                logger.error('Failed to trigger password reset requested webhook', {
                    error: error.message,
                    userId: user._id
                });
                // Don't fail password reset if webhook fails
            }
        })();

        return response.status(200).json({
            error: false,
            message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
            messageEn: 'Password reset link has been sent to your email',
            expiresInMinutes: 30
        });
    } catch (error) {
        logger.error('Forgot password failed', {
            error: error.message,
            email: email ? '***' : undefined // Sanitize email in logs
        });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء معالجة طلبك',
            messageEn: 'An error occurred while processing your request',
            code: 'FORGOT_PASSWORD_FAILED'
        });
    }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
const resetPassword = async (request, response) => {
    const { token, newPassword } = request.body;
    const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

    try {
        // Hash the provided token to compare with stored hash
        const crypto = require('crypto');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with matching token and non-expired token (bypass firmFilter for auth)
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        })
            .select('_id email firstName lastName password passwordResetToken passwordResetExpires')
            .setOptions({ bypassFirmFilter: true });

        if (!user) {
            logger.warn('Invalid or expired password reset token', { ipAddress });

            // Log failed attempt
            await auditLogService.log(
                'password_reset_failed',
                'user',
                null,
                null,
                {
                    reason: 'Invalid or expired token',
                    ipAddress,
                    userAgent: request.headers['user-agent'] || 'unknown',
                    severity: 'medium'
                }
            );

            return response.status(400).json({
                error: true,
                message: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية',
                messageEn: 'Invalid or expired reset token',
                code: 'INVALID_TOKEN'
            });
        }

        // Validate password policy
        const passwordValidation = validatePassword(newPassword, {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        });

        if (!passwordValidation.valid) {
            return response.status(400).json({
                error: true,
                message: passwordValidation.errorsAr.join('. '),
                messageEn: passwordValidation.errors.join('. '),
                code: 'WEAK_PASSWORD',
                errors: passwordValidation.errors
            });
        }

        // Check if password has been breached (HaveIBeenPwned)
        const { checkPasswordBreach } = require('../utils/passwordPolicy');
        const breachCheck = await checkPasswordBreach(newPassword);

        // Reject breached passwords (only if API check succeeded)
        if (breachCheck.breached && !breachCheck.error) {
            return response.status(400).json({
                error: true,
                message: `تم العثور على كلمة المرور هذه في ${breachCheck.count.toLocaleString()} تسريب بيانات. الرجاء اختيار كلمة مرور مختلفة لحمايتك.`,
                messageEn: `This password has been found in ${breachCheck.count.toLocaleString()} data breaches. Please choose a different password for your security.`,
                code: 'PASSWORD_BREACHED',
                breachCount: breachCheck.count
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user password and clear reset token
        // NOTE: Bypass firmIsolation filter - password reset needs to work for solo lawyers without firmId
        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordResetRequestedAt: null,
            passwordChangedAt: new Date(),
            mustChangePassword: false
        }, { bypassFirmFilter: true });

        // Log successful password reset
        await auditLogService.log(
            'password_reset_success',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                ipAddress,
                userAgent: request.headers['user-agent'] || 'unknown',
                severity: 'medium'
            }
        );

        logger.info('Password reset successful', { userId: user._id, email: user.email });

        // Trigger password reset completed webhook (fire-and-forget)
        (async () => {
            try {
                // Fetch fresh user data with firmId
                // NOTE: Bypass firmIsolation filter - password reset needs to work for solo lawyers without firmId
                const freshUser = await User.findById(user._id)
                    .select('_id email username firmId')
                    .setOptions({ bypassFirmFilter: true })
                    .lean();
                if (freshUser) {
                    await authWebhookService.triggerPasswordResetCompletedWebhook(freshUser, request, {
                        firmId: freshUser.firmId?.toString() || null
                    });
                }
            } catch (error) {
                logger.error('Failed to trigger password reset completed webhook', {
                    error: error.message,
                    userId: user._id
                });
                // Don't fail password reset if webhook fails
            }
        })();

        return response.status(200).json({
            error: false,
            message: 'تم إعادة تعيين كلمة المرور بنجاح',
            messageEn: 'Password has been reset successfully'
        });
    } catch (error) {
        logger.error('Reset password failed', {
            error: error.message,
            token: token ? token.substring(0, 8) + '...' : undefined // Log only token prefix
        });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إعادة تعيين كلمة المرور',
            messageEn: 'An error occurred while resetting password',
            code: 'RESET_PASSWORD_FAILED'
        });
    }
};

/**
 * Get fresh CSRF token
 * GET /api/auth/csrf
 */
const getCSRFToken = async (request, response) => {
    try {
        // Check if CSRF protection is enabled
        if (!csrfService.isEnabled()) {
            return response.status(200).json({
                error: false,
                csrfToken: null,
                enabled: false,
                message: 'CSRF protection is disabled'
            });
        }

        // Get session identifier (user ID)
        const sessionId = request.userID || request.userId || request.user?._id?.toString();

        if (!sessionId) {
            return response.status(401).json({
                error: true,
                message: 'Authentication required',
                messageAr: 'المصادقة مطلوبة',
                code: 'AUTH_REQUIRED'
            });
        }

        // Generate new CSRF token
        const tokenData = await csrfService.generateCSRFToken(sessionId);

        if (!tokenData.token) {
            return response.status(500).json({
                error: true,
                message: 'Failed to generate CSRF token',
                messageAr: 'فشل في إنشاء رمز CSRF',
                code: 'CSRF_GENERATION_FAILED'
            });
        }

        // Set CSRF token in cookie for double-submit pattern
        // Set CSRF token in cookie using secure centralized configuration
        response.cookie('csrfToken', tokenData.token, getCSRFCookieConfig(request));

        logger.debug('Fresh CSRF token generated', { sessionId });

        return response.status(200).json({
            error: false,
            csrfToken: tokenData.token,
            enabled: true,
            expiresAt: tokenData.expiresAt,
            ttl: tokenData.ttl
        });
    } catch (error) {
        logger.error('Failed to get CSRF token', {
            error: error.message,
            userId: request.userID
        });
        return response.status(500).json({
            error: true,
            message: 'Failed to get CSRF token',
            messageAr: 'فشل في الحصول على رمز CSRF',
            code: 'CSRF_GET_FAILED'
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
    refreshAccessToken,
    getCookieConfig,
    sendMagicLink,
    verifyMagicLink,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    getCSRFToken
};
