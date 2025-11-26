const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    clientId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fullName: {
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
    alternatePhone: {
        type: String,
        trim: true
    },
    nationalId: {
        type: String,
        trim: true
    },
    companyName: {
        type: String,
        trim: true
    },
    companyRegistration: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    preferredContactMethod: {
        type: String,
        enum: ['email', 'phone', 'sms', 'whatsapp'],
        default: 'phone'
    },
    notes: {
        type: String,
        maxlength: 2000
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
clientSchema.index({ lawyerId: 1, status: 1 });
clientSchema.index({ lawyerId: 1, fullName: 'text', email: 'text', phone: 'text' });
clientSchema.index({ clientId: 1 });

// Generate client ID before saving
clientSchema.pre('save', async function(next) {
    if (!this.clientId) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        this.clientId = `CLT-${randomNum}`;
    }
    next();
});

// Static method: Search clients
clientSchema.statics.searchClients = async function(lawyerId, searchTerm, limit = 20) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { fullName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { clientId: { $regex: searchTerm, $options: 'i' } },
            { companyName: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    return await this.find(query)
        .select('clientId fullName email phone companyName status')
        .sort({ fullName: 1 })
        .limit(limit);
};

module.exports = mongoose.model('Client', clientSchema);
