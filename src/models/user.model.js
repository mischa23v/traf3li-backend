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
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: true,
    },
    description: {
        type: String,
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
    }
}, {
    versionKey: false,
    timestamps: true
});

userSchema.index({ role: 1, 'lawyerProfile.specialization': 1, 'lawyerProfile.rating': -1 });

module.exports = mongoose.model('User', userSchema);
