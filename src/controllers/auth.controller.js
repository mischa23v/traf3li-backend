const { User, Firm, FirmInvitation } = require('../models');
const { CustomException } = require('../utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getDefaultPermissions, getSoloLawyerPermissions, isSoloLawyer: checkIsSoloLawyer } = require('../config/permissions.config');
const auditLogService = require('../services/auditLog.service');

const { JWT_SECRET, NODE_ENV } = process.env;
const saltRounds = 10;

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
// True same-origin proxy detection requires checking if the HOST of the request matches the ORIGIN.
// With Vercel rewrites: Host=dashboard.traf3li.com, Origin=dashboard.traf3li.com (same-origin)
// Direct cross-origin: Host=api.traf3li.com, Origin=dashboard.traf3li.com (cross-origin)
const isSameOriginProxy = (request) => {
    const origin = request.headers.origin || '';
    const host = request.headers.host || '';

    // If no origin header, can't determine (treat as cross-origin for safety)
    if (!origin || !host) {
        return false;
    }

    try {
        const originHost = new URL(origin).host;
        // True same-origin: the Host header matches the Origin header's host
        // This happens when frontend proxies requests through itself (Vercel rewrites)
        return originHost === host;
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
    const origin = request.headers.origin || '';
    const host = request.headers.host || '';

    // Debug logging for cookie configuration (helps diagnose production issues)
    console.log('[Cookie Config Debug]', {
        origin,
        host,
        isSameOrigin,
        isProductionEnv,
        NODE_ENV
    });

    if (isSameOrigin) {
        // Same-origin via proxy: use Lax (more compatible with browser privacy)
        console.log('[Cookie Config] Using same-origin config (SameSite=Lax)');
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
    console.log('[Cookie Config] Using cross-origin config (SameSite=None)', { cookieDomain });
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
        // Validation
        if (!username || !email || !password || !phone || !firstName || !lastName) {
            return response.status(400).send({
                error: true,
                message: 'الحقول المطلوبة: الاسم الأول، الاسم الأخير، اسم المستخدم، البريد الإلكتروني، كلمة المرور، رقم الجوال'
            });
        }

        // Password validation
        if (password.length < 8) {
            return response.status(400).send({
                error: true,
                message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
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

        const hash = bcrypt.hashSync(password, saltRounds);

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
            role: role || (isSeller ? 'lawyer' : 'client'),
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
                console.log('Firm creation error:', firmError.message);
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
                console.log('Join firm error:', joinError.message);
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
        console.log('Registration error:', message);
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
    const { username, email, password } = request.body;

    // Support both 'username' and 'email' fields from frontend
    const loginIdentifier = username || email;

    try {
        // Accept both username AND email for login
        const user = await User.findOne({
            $or: [
                { username: loginIdentifier },
                { email: loginIdentifier }
            ]
        });

        if(!user) {
            throw CustomException('Check username or password!', 404);
        }

        const match = bcrypt.compareSync(password, user.password);

        if(match) {
            const { password: pwd, ...data } = user._doc;

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
                        console.log('Error fetching firm:', firmError.message);
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

            // Log successful login
            await auditLogService.log(
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

        throw CustomException('Check username or password!', 404);
    }
    catch({ message, status = 500 }) {
        // Log failed login attempt
        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

        await auditLogService.log(
            'login_failed',
            'user',
            null,
            null,
            {
                userId: null,
                userEmail: request.body.email || request.body.username || 'unknown',
                userRole: 'unknown',
                ipAddress: ipAddress,
                userAgent: request.headers['user-agent'] || 'unknown',
                method: request.method,
                endpoint: request.originalUrl,
                status: 'failed',
                errorMessage: message,
                severity: 'medium',
            }
        );

        return response.status(status).send({
            error: true,
            message
        });
    }
}

const authLogout = async (request, response) => {
    // Log logout if user is authenticated
    if (request.user) {
        await auditLogService.log(
            'logout',
            'user',
            request.user._id || request.user.id,
            null,
            {
                userId: request.user._id || request.user.id,
                userEmail: request.user.email,
                userRole: request.user.role,
                userName: request.user.firstName ? `${request.user.firstName} ${request.user.lastName || ''}` : null,
                firmId: request.user.firmId,
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
}

const checkAvailability = async (request, response) => {
    const { email, username, phone } = request.body;

    try {
        // Validate that at least one field is provided
        if (!email && !username && !phone) {
            return response.status(400).send({
                error: true,
                message: 'يجب توفير البريد الإلكتروني أو اسم المستخدم أو رقم الجوال'
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
        const user = await User.findOne({ _id: request.userID }).select('-password');

        if(!user) {
            throw CustomException('User not found!', 404);
        }

        // Build enhanced user data with solo lawyer and firm info
        const userData = {
            ...user._doc,
            isSoloLawyer: user.isSoloLawyer || false,
            lawyerWorkMode: user.lawyerWorkMode || null
        };

        // If user is a lawyer, get firm/tenant information
        if (user.role === 'lawyer' || user.isSeller) {
            if (user.firmId) {
                try {
                    const firm = await Firm.findById(user.firmId)
                        .select('name nameEnglish licenseNumber status members subscription');

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
                    console.log('Error fetching firm:', firmError.message);
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

module.exports = {
    authLogin,
    authLogout,
    authRegister,
    authStatus,
    checkAvailability,
    getCookieConfig,
    getCookieDomain
};
