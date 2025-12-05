const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    clientId: {
        type: String,
        unique: true,
        index: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    // For company clients
    companyName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['individual', 'company'],
        default: 'individual'
    },
    nationalId: {
        type: String,
        trim: true
    },
    commercialRegistration: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        postalCode: String,
        country: {
            type: String,
            default: 'Saudi Arabia'
        }
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    platformUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    },
    notes: {
        type: String,
        maxlength: 2000
    },
    source: {
        type: String,
        enum: ['platform', 'external', 'referral', 'website', 'social_media', 'advertising', 'cold_call', 'walk_in', 'event'],
        default: 'external'
    },

    // ═══════════════════════════════════════════════════════════════
    // CRM FIELDS
    // ═══════════════════════════════════════════════════════════════
    // Lead conversion tracking
    convertedFromLead: { type: Boolean, default: false },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    convertedAt: Date,

    // Referral tracking
    referralId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Referral'
    },
    referralName: String,

    // Client value & engagement
    lifetimeValue: { type: Number, default: 0 },
    clientRating: { type: Number, min: 1, max: 5 },
    clientTier: {
        type: String,
        enum: ['standard', 'premium', 'vip'],
        default: 'standard'
    },

    // Activity tracking
    lastContactedAt: Date,
    lastActivityAt: Date,
    nextFollowUpDate: Date,
    nextFollowUpNote: String,
    activityCount: { type: Number, default: 0 },
    callCount: { type: Number, default: 0 },
    emailCount: { type: Number, default: 0 },
    meetingCount: { type: Number, default: 0 },

    // Tags for categorization
    tags: [{ type: String, trim: true }],

    // Preferences
    preferredContactMethod: {
        type: String,
        enum: ['phone', 'email', 'whatsapp', 'sms', 'in_person'],
        default: 'phone'
    },
    preferredLanguage: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },
    timezone: { type: String, default: 'Asia/Riyadh' },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    totalCases: {
        type: Number,
        default: 0
    },
    activeCases: {
        type: Number,
        default: 0
    },
    totalInvoices: {
        type: Number,
        default: 0
    },
    totalPaid: {
        type: Number,
        default: 0
    },
    totalOutstanding: {
        type: Number,
        default: 0
    },
    lastInteraction: {
        type: Date
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
clientSchema.index({ lawyerId: 1, status: 1 });
clientSchema.index({ lawyerId: 1, clientTier: 1 });
clientSchema.index({ lawyerId: 1, source: 1 });
clientSchema.index({ lawyerId: 1, referralId: 1 });
clientSchema.index({ lawyerId: 1, nextFollowUpDate: 1 });
clientSchema.index({ firstName: 'text', lastName: 'text', companyName: 'text', email: 'text' });

// Virtual for full name
clientSchema.virtual('fullName').get(function() {
    if (this.type === 'company' && this.companyName) {
        return this.companyName;
    }
    return `${this.firstName} ${this.lastName}`.trim();
});

// Ensure virtuals are included in JSON output
clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

// Generate client ID before saving
clientSchema.pre('save', async function(next) {
    if (!this.clientId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: {
                $gte: new Date(year, 0, 1)
            }
        });
        this.clientId = `CLT-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Static method: Search clients
clientSchema.statics.searchClients = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { firstName: { $regex: searchTerm, $options: 'i' } },
            { lastName: { $regex: searchTerm, $options: 'i' } },
            { companyName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { clientId: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    return await this.find(query)
        .sort({ lastInteraction: -1, createdAt: -1 })
        .limit(filters.limit || 50);
};

module.exports = mongoose.model('Client', clientSchema);
