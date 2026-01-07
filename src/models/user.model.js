const mongoose = require('mongoose');

// Court experience schema for lawyer profiles
const courtExperienceSchema = new mongoose.Schema({
    courtId: {
        type: String,
        required: true
    },
    courtName: {
        type: String,
        required: true
    },
    caseCount: {
        type: String,
        required: false
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    // Basic user info
    username: {
        type: String,
        required: function() {
            return !this.isAnonymous; // Not required for anonymous users
        },
        unique: true,
        sparse: true // Allow multiple null values for anonymous users
    },
    email: {
        type: String,
        required: function() {
            return !this.isAnonymous; // Not required for anonymous users
        },
        unique: true,
        sparse: true // Allow multiple null values for anonymous users
    },
    password: {
        type: String,
        required: function() {
            return !this.isAnonymous; // Not required for anonymous users
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ANONYMOUS/GUEST AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════
    // Flag indicating if this is an anonymous/guest user (Supabase-style)
    isAnonymous: {
        type: Boolean,
        default: false,
        required: false,
        index: true
    },
    // Last activity timestamp for anonymous users (for cleanup)
    lastActivityAt: {
        type: Date,
        default: Date.now,
        required: false,
        index: true
    },
    // Original anonymous user ID (if this user was converted from anonymous)
    convertedFromAnonymousId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    // When anonymous user was converted to full account
    convertedAt: {
        type: Date,
        required: false,
        default: null
    },

    // ═══════════════════════════════════════════════════════════════
    // PASSWORD RESET
    // ═══════════════════════════════════════════════════════════════
    // Hashed token for password reset (expires in 15-30 minutes)
    passwordResetToken: {
        type: String,
        required: false,
        default: null
    },
    // Expiration timestamp for reset token
    passwordResetExpires: {
        type: Date,
        required: false,
        default: null
    },
    // Track when password reset was requested (for rate limiting)
    passwordResetRequestedAt: {
        type: Date,
        required: false,
        default: null
    },

    firstName: {
        type: String,
        required: function() {
            return !this.isAnonymous; // Not required for anonymous users
        },
        default: function() {
            return this.isAnonymous ? 'Guest' : undefined;
        }
    },
    lastName: {
        type: String,
        required: function() {
            return !this.isAnonymous; // Not required for anonymous users
        },
        default: function() {
            return this.isAnonymous ? 'User' : undefined;
        }
    },
    image: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: function() {
            return !this.isAnonymous; // Not required for anonymous users
        },
    },
    description: {
        type: String,
        required: false,
    },

    // Email verification
    isEmailVerified: {
        type: Boolean,
        default: false,
        required: false,
    },
    emailVerifiedAt: {
        type: Date,
        default: null,
        required: false,
    },

    // Location info
    country: {
        type: String,
        default: 'Saudi Arabia',
        required: false,
    },
    nationality: {
        type: String,
        required: false,
    },
    region: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: false,
    },
    // User's preferred timezone for date/time display
    timezone: {
        type: String,
        default: 'Asia/Riyadh',
        required: false,
    },

    // Role and type
    isSeller: {
        type: Boolean,
        default: false,
        required: false,
    },
    role: {
        type: String,
        enum: ['client', 'lawyer', 'admin'],
        default: 'client',
        required: false
    },
    // For lawyers: 'marketplace' (visible in search + dashboard) or 'dashboard' (dashboard only)
    lawyerMode: {
        type: String,
        enum: ['marketplace', 'dashboard', null],
        default: null,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // SOLO LAWYER MODE
    // ═══════════════════════════════════════════════════════════════
    // Flag indicating if the lawyer works independently without a firm
    isSoloLawyer: {
        type: Boolean,
        default: false,
        required: false
    },
    // Work mode selected during registration: 'solo', 'firm_owner', 'firm_member'
    lawyerWorkMode: {
        type: String,
        enum: ['solo', 'firm_owner', 'firm_member', null],
        default: null,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // FIRM MEMBERSHIP (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    // User's role within their firm
    firmRole: {
        type: String,
        enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant', 'departed', null],
        default: null,
        required: false
    },
    // Employment status within the firm
    firmStatus: {
        type: String,
        enum: ['active', 'departed', 'suspended', 'pending', null],
        default: null,
        required: false
    },
    // Date when user was marked as departed (required for data retention job)
    departedAt: {
        type: Date,
        default: null,
        required: false
    },
    // Flag indicating user data has been anonymized
    dataAnonymized: {
        type: Boolean,
        default: false,
        required: false
    },
    // Date when user data was anonymized
    anonymizedAt: {
        type: Date,
        default: null,
        required: false
    },

    // Lawyer-specific profile data
    lawyerProfile: {
        // Licensing
        isLicensed: {
            type: Boolean,
            default: false
        },
        licenseNumber: {
            type: String,
            required: false
        },
        barAssociation: {
            type: String,
            required: false
        },
        verified: {
            type: Boolean,
            default: false
        },

        // Experience & Specialization
        yearsExperience: {
            type: Number,
            default: 0
        },
        workType: {
            type: String,
            required: false
        },
        firmName: {
            type: String,
            required: false
        },
        specialization: {
            type: [String],
            default: []
        },
        languages: {
            type: [String],
            default: ['العربية']
        },

        // Courts experience
        courts: {
            type: [courtExperienceSchema],
            default: []
        },

        // Khebra platform registration
        isRegisteredKhebra: {
            type: Boolean,
            default: false
        },

        // Marketplace settings (only for lawyerMode: 'marketplace')
        serviceType: {
            type: String,
            enum: ['consultation', 'litigation', 'both', null],
            default: null
        },
        pricingModel: {
            type: [String],
            default: []
        },
        hourlyRateMin: {
            type: Number,
            required: false
        },
        hourlyRateMax: {
            type: Number,
            required: false
        },
        acceptsRemote: {
            type: String,
            enum: ['نعم', 'لا', 'كلاهما', null],
            default: null
        },

        // Stats (system-managed)
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        casesWon: {
            type: Number,
            default: 0
        },
        casesTotal: {
            type: Number,
            default: 0
        },
        firmID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Firm',
            required: false
        }
    },

    // Push notification subscription (Web Push)
    pushSubscription: {
        endpoint: {
            type: String,
            required: false
        },
        keys: {
            p256dh: {
                type: String,
                required: false
            },
            auth: {
                type: String,
                required: false
            }
        }
    },

    // Notification preferences
    notificationPreferences: {
        channels: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            whatsapp: { type: Boolean, default: false },
            in_app: { type: Boolean, default: true }
        },
        types: {
            task_reminders: { type: Boolean, default: true },
            hearing_reminders: { type: Boolean, default: true },
            case_updates: { type: Boolean, default: true },
            messages: { type: Boolean, default: true },
            payments: { type: Boolean, default: true }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MFA (Multi-Factor Authentication)
    // ═══════════════════════════════════════════════════════════════
    // Whether MFA is enabled for this user
    mfaEnabled: {
        type: Boolean,
        default: false,
        required: false
    },
    // TOTP secret for authenticator apps (Google Authenticator, Authy, etc.)
    mfaSecret: {
        type: String,
        required: false,
        default: null
    },
    // Backup codes for MFA recovery
    // Each code can only be used once and is marked as used after verification
    mfaBackupCodes: [{
        code: {
            type: String,
            required: true
        },
        used: {
            type: Boolean,
            default: false,
            required: true
        },
        usedAt: {
            type: Date,
            default: null,
            required: false
        }
    }],
    // Timestamp when MFA was last verified (for sensitive operations)
    mfaVerifiedAt: {
        type: Date,
        default: null,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // SSO/SAML AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════
    // Flag indicating if user was created via SSO
    isSSOUser: {
        type: Boolean,
        default: false,
        required: false
    },
    // SSO provider (azure, okta, google, custom)
    ssoProvider: {
        type: String,
        enum: ['azure', 'okta', 'google', 'custom', null],
        default: null,
        required: false
    },
    // External ID from SSO provider
    ssoExternalId: {
        type: String,
        required: false,
        index: true,
        sparse: true
    },
    // Flag indicating user was created via JIT provisioning
    createdViaSSO: {
        type: Boolean,
        default: false,
        required: false
    },
    // Last successful SSO login
    lastSSOLogin: {
        type: Date,
        required: false
    },
    // Last login (any method)
    lastLogin: {
        type: Date,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // STRIPE CONNECT (Lawyer Payouts)
    // ═══════════════════════════════════════════════════════════════
    // Stripe Connect account ID for receiving payouts
    stripeConnectAccountId: {
        type: String,
        required: false,
        default: null,
        index: true,
        sparse: true
    },
    // Whether lawyer can receive payouts
    stripePayoutEnabled: {
        type: Boolean,
        default: false,
        required: false
    },
    // Whether Stripe Connect onboarding is complete
    stripeOnboardingComplete: {
        type: Boolean,
        default: false,
        required: false
    },
    // When onboarding was completed
    stripeOnboardingCompletedAt: {
        type: Date,
        required: false,
        default: null
    },
    // Stripe account status (active, pending, restricted, disabled)
    stripeAccountStatus: {
        type: String,
        enum: ['active', 'pending', 'restricted', 'disabled', null],
        default: null,
        required: false
    },
    // Platform commission rate (percentage)
    platformCommissionRate: {
        type: Number,
        default: 10, // 10% default commission
        min: 0,
        max: 100,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // PASSWORD ROTATION & EXPIRATION
    // ═══════════════════════════════════════════════════════════════
    // When the password was last changed
    passwordChangedAt: {
        type: Date,
        required: false,
        default: null
    },
    // When the password will expire (calculated based on firm's policy)
    passwordExpiresAt: {
        type: Date,
        required: false,
        default: null
    },
    // Password breach detection (HaveIBeenPwned)
    passwordBreached: {
        type: Boolean,
        default: false,
        required: false
    },
    // When the breach was detected
    passwordBreachedAt: {
        type: Date,
        required: false,
        default: null
    },
    // Number of times this password appeared in breaches
    passwordBreachCount: {
        type: Number,
        required: false,
        default: 0
    },
    // Force user to change password on next login
    mustChangePassword: {
        type: Boolean,
        default: false,
        required: false
    },
    // Timestamp when mustChangePassword was set (for admin tracking)
    mustChangePasswordSetAt: {
        type: Date,
        required: false,
        default: null
    },
    // Who forced the password change (admin user ID)
    mustChangePasswordSetBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    // Inline password history (last 12 passwords)
    // Kept in sync with PasswordHistory collection for redundancy
    passwordHistory: [{
        hash: {
            type: String,
            required: true
        },
        changedAt: {
            type: Date,
            required: true,
            default: Date.now
        }
    }],
    // Password expiration warning emails sent
    passwordExpiryWarningsSent: {
        sevenDayWarning: {
            type: Boolean,
            default: false
        },
        oneDayWarning: {
            type: Boolean,
            default: false
        },
        expiredNotification: {
            type: Boolean,
            default: false
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // KYC/AML VERIFICATION (Know Your Customer / Anti-Money Laundering)
    // ═══════════════════════════════════════════════════════════════
    // Current KYC verification status
    kycStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'expired', null],
        default: null,
        required: false,
        index: true
    },
    // When KYC was verified
    kycVerifiedAt: {
        type: Date,
        default: null,
        required: false
    },
    // When KYC will expire (Saudi Arabia: typically 1 year for residents, 5 years for citizens)
    kycExpiresAt: {
        type: Date,
        default: null,
        required: false
    },
    // Submitted documents for KYC verification
    kycDocuments: [{
        type: {
            type: String,
            enum: ['national_id', 'iqama', 'passport', 'commercial_registration', 'power_of_attorney', 'address_proof', 'selfie'],
            required: true
        },
        documentId: {
            type: String,
            required: false  // External document ID from Yakeen/Wathq
        },
        documentNumber: {
            type: String,
            required: false  // Actual ID/CR number
        },
        fileUrl: {
            type: String,
            required: false  // URL to uploaded document image
        },
        verifiedAt: {
            type: Date,
            required: false
        },
        expiresAt: {
            type: Date,
            required: false
        },
        verificationSource: {
            type: String,
            enum: ['yakeen', 'wathq', 'manual', null],
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        rejectionReason: {
            type: String,
            required: false
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Reason for KYC rejection (if applicable)
    kycRejectionReason: {
        type: String,
        required: false,
        default: null
    },
    // Verified identity data from Yakeen API
    kycVerifiedIdentity: {
        nationalId: { type: String, required: false },
        fullNameAr: { type: String, required: false },
        fullNameEn: { type: String, required: false },
        dateOfBirth: { type: String, required: false },
        nationality: { type: String, required: false },
        gender: { type: String, required: false },
        verificationSource: { type: String, required: false },
        verifiedAt: { type: Date, required: false }
    },
    // Verified business data from Wathq API (for lawyers/firms)
    kycVerifiedBusiness: {
        crNumber: { type: String, required: false },
        companyName: { type: String, required: false },
        entityType: { type: String, required: false },
        status: { type: String, required: false },
        isActive: { type: Boolean, required: false },
        verificationSource: { type: String, required: false },
        verifiedAt: { type: Date, required: false }
    },
    // AML risk score (0-100, higher = more risk)
    amlRiskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
        required: false
    },
    // AML screening results
    amlScreening: {
        lastScreenedAt: { type: Date, required: false },
        status: {
            type: String,
            enum: ['clear', 'review', 'flagged', null],
            default: null
        },
        flags: [{
            type: { type: String, required: true },
            description: { type: String, required: false },
            severity: {
                type: String,
                enum: ['low', 'medium', 'high'],
                required: true
            },
            detectedAt: { type: Date, default: Date.now }
        }]
    },
    // When KYC process was initiated
    kycInitiatedAt: {
        type: Date,
        required: false,
        default: null
    },
    // Admin who verified/rejected KYC (for manual review)
    kycReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    // Timestamp when KYC was reviewed
    kycReviewedAt: {
        type: Date,
        required: false,
        default: null
    },
    // Notes from KYC review
    kycReviewNotes: {
        type: String,
        required: false,
        default: null
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATIONS (Third-party integrations)
    // ═══════════════════════════════════════════════════════════════
    integrations: {
        // Microsoft Calendar Integration
        microsoftCalendar: {
            connected: { type: Boolean, default: false },
            firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
            accessToken: String, // Encrypted
            refreshToken: String, // Encrypted
            expiresAt: Date,
            tokenType: { type: String, default: 'Bearer' },
            scope: String,
            connectedAt: Date,
            disconnectedAt: Date,
            lastSyncedAt: Date,
            lastRefreshedAt: Date,
            syncSettings: {
                enabled: { type: Boolean, default: false },
                syncInterval: {
                    type: String,
                    enum: ['manual', 'hourly', 'daily'],
                    default: 'manual'
                },
                syncDirection: {
                    type: String,
                    enum: ['to_microsoft', 'from_microsoft', 'bidirectional'],
                    default: 'bidirectional'
                },
                defaultCalendarId: String,
                syncPastDays: { type: Number, default: 30 },
                syncFutureDays: { type: Number, default: 90 },
                lastSync: Date
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM JWT CLAIMS (Supabase-style)
    // ═══════════════════════════════════════════════════════════════
    // Custom claims to be included in JWT tokens
    // Follows Supabase Auth pattern for extending user metadata in tokens
    // Can store user-specific claims, permissions, metadata, etc.
    customClaims: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        required: false
    },
    // When custom claims were last updated
    customClaimsUpdatedAt: {
        type: Date,
        required: false,
        default: null
    },
    // Who updated the custom claims (admin tracking)
    customClaimsUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    }
}, {
    versionKey: false,
    timestamps: true
});

userSchema.index({ role: 1, 'lawyerProfile.specialization': 1, 'lawyerProfile.rating': -1 });

// ─────────────────────────────────────────────────────────
// ENCRYPTION PLUGIN - PII Protection
// ─────────────────────────────────────────────────────────
const encryptionPlugin = require('./plugins/encryption.plugin');

// Apply encryption to sensitive PII fields
// Note: email_hash allows searching encrypted emails
userSchema.plugin(encryptionPlugin, {
    fields: [
        'phone',       // Phone number - PII
        'mfaSecret',   // MFA secret - authentication credential
    ],
    searchableFields: []  // Phone/MFA not searchable for security
});

module.exports = mongoose.model('User', userSchema);
