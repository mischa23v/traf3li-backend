const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    clientId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
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
        enum: ['platform', 'external', 'referral'],
        default: 'external'
    },
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
clientSchema.index({ name: 'text', email: 'text' });

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
            { name: { $regex: searchTerm, $options: 'i' } },
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
