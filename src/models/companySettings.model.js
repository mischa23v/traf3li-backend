const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        unique: true,
        required: true
    },

    // Company Info
    name: {
        type: String
    },
    nameAr: {
        type: String
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    mobile: {
        type: String
    },
    fax: {
        type: String
    },
    website: {
        type: String
    },

    // Address
    address: {
        type: String
    },
    addressAr: {
        type: String
    },
    city: {
        type: String
    },
    cityAr: {
        type: String
    },
    state: {
        type: String
    },
    stateAr: {
        type: String
    },
    country: {
        type: String,
        default: 'SA'
    },
    postalCode: {
        type: String
    },

    // Tax & Registration
    taxNumber: {
        type: String
    },
    vatNumber: {
        type: String
    },
    crNumber: {
        type: String // Commercial Registration Number
    },

    // Bank Details
    bankName: {
        type: String
    },
    bankNameAr: {
        type: String
    },
    bankAccountNumber: {
        type: String
    },
    bankAccountName: {
        type: String
    },
    iban: {
        type: String
    },
    swiftCode: {
        type: String
    },

    // Files
    logo: {
        type: String
    },
    icon: {
        type: String
    },
    signature: {
        type: String
    },
    stamp: {
        type: String
    },

    // Additional Settings
    timezone: {
        type: String,
        default: 'Asia/Riyadh'
    },
    dateFormat: {
        type: String,
        default: 'DD/MM/YYYY'
    },
    fiscalYearStart: {
        type: Number,
        default: 1 // January
    }
}, {
    versionKey: false,
    timestamps: true
});

// Index
companySettingsSchema.index({ organizationId: 1 });

// Static method to get or create company settings for an organization
companySettingsSchema.statics.getOrCreate = async function(organizationId) {
    let settings = await this.findOne({ organizationId });
    if (!settings) {
        settings = await this.create({ organizationId });
    }
    return settings;
};

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
