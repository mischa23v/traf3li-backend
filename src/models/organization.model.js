const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['company', 'government', 'court', 'law_firm', 'nonprofit', 'other'],
        default: 'company'
    },
    registrationNumber: {
        type: String,
        trim: true
    },
    vatNumber: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    fax: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    website: {
        type: String,
        trim: true
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
    industry: {
        type: String,
        trim: true
    },
    size: {
        type: String,
        enum: ['small', 'medium', 'large', 'enterprise'],
        default: null
    },
    notes: {
        type: String,
        maxlength: 2000
    },
    linkedClients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }],
    linkedContacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],
    linkedCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
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
organizationSchema.index({ lawyerId: 1, type: 1, status: 1 });
organizationSchema.index({ lawyerId: 1, name: 'text', nameAr: 'text' });

// Static method: Search organizations
organizationSchema.statics.searchOrganizations = async function(lawyerId, searchTerm, limit = 20) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { nameAr: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { registrationNumber: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    return await this.find(query)
        .select('name nameAr type email phone status')
        .sort({ name: 1 })
        .limit(limit);
};

module.exports = mongoose.model('Organization', organizationSchema);
