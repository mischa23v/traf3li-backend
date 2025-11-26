const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    alternatePhone: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    company: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['individual', 'organization', 'court', 'attorney', 'expert', 'government', 'other'],
        required: true,
        default: 'individual'
    },
    category: {
        type: String,
        enum: ['client_contact', 'opposing_party', 'witness', 'expert_witness', 'judge', 'court_clerk', 'other']
    },
    address: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        default: 'Saudi Arabia'
    },
    notes: {
        type: String,
        maxlength: 2000
    },
    tags: [{
        type: String
    }],
    linkedCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],
    linkedClients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }],
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
contactSchema.index({ lawyerId: 1, status: 1 });
contactSchema.index({ lawyerId: 1, type: 1 });
contactSchema.index({ lawyerId: 1, category: 1 });
contactSchema.index({ firstName: 'text', lastName: 'text', email: 'text', company: 'text' });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
contactSchema.set('toJSON', { virtuals: true });
contactSchema.set('toObject', { virtuals: true });

// Static method: Search contacts
contactSchema.statics.searchContacts = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { firstName: { $regex: searchTerm, $options: 'i' } },
            { lastName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { company: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;

    return await this.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);
};

module.exports = mongoose.model('Contact', contactSchema);
