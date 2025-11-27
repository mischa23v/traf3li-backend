const mongoose = require('mongoose');

const paymentModeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    nameAr: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    descriptionAr: {
        type: String
    },
    ref: {
        type: String // Reference code
    },
    icon: {
        type: String,
        default: 'credit-card'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    // Gateway configuration (if applicable)
    gatewayProvider: {
        type: String,
        enum: ['none', 'stripe', 'paypal', 'hyperpay', 'moyasar', 'bank_transfer', 'cash'],
        default: 'none'
    },
    gatewayConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
paymentModeSchema.index({ organizationId: 1, isEnabled: 1 });
paymentModeSchema.index({ organizationId: 1, isDefault: 1 });

// Pre-save hook to ensure only one default payment mode per organization
paymentModeSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            {
                organizationId: this.organizationId,
                _id: { $ne: this._id },
                isDefault: true
            },
            { isDefault: false }
        );
    }
    next();
});

// Static method to get default payment mode for an organization
paymentModeSchema.statics.getDefaultPaymentMode = async function(organizationId) {
    return this.findOne({
        organizationId,
        isDefault: true,
        isEnabled: true
    });
};

// Static method to get all active payment modes for an organization
paymentModeSchema.statics.getActivePaymentModes = async function(organizationId) {
    return this.find({
        organizationId,
        isEnabled: true
    }).sort({ name: 1 });
};

module.exports = mongoose.model('PaymentMode', paymentModeSchema);
