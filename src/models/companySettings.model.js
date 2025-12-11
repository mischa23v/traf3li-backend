const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String, default: 'Saudi Arabia' },
    postalCode: { type: String },
    logo: { type: String }, // URL to logo image
    taxNumber: { type: String }, // VAT/Tax registration number
    commercialRegister: { type: String }, // Commercial registration number
    bankName: { type: String },
    bankAccount: { type: String },
    iban: { type: String }
}, {
    versionKey: false,
    timestamps: true
});

// Get or create settings for a firm
companySettingsSchema.statics.getOrCreate = async function(firmId, defaultName = 'Company') {
    let settings = await this.findOne({ firmId });
    if (!settings) {
        settings = await this.create({ firmId, name: defaultName });
    }
    return settings;
};

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
