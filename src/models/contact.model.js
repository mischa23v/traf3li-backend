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
        default: 'individual'
    },
    category: {
        type: String,
        enum: ['client_contact', 'opposing_party', 'witness', 'expert_witness', 'judge', 'court_clerk', 'other'],
        default: 'other'
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
        trim: true
    },
    notes: {
        type: String,
        maxlength: 2000
    },
    tags: [{
        type: String,
        trim: true
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
contactSchema.index({ lawyerId: 1, type: 1, status: 1 });
contactSchema.index({ lawyerId: 1, linkedCases: 1 });
contactSchema.index({ lawyerId: 1, linkedClients: 1 });
contactSchema.index({ lawyerId: 1, firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Static method: Search contacts
contactSchema.statics.searchContacts = async function(lawyerId, searchTerm, limit = 20) {
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

    return await this.find(query)
        .select('firstName lastName email phone company type category status')
        .sort({ firstName: 1 })
        .limit(limit);
};

module.exports = mongoose.model('Contact', contactSchema);
