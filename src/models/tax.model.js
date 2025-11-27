const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    nameAr: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    description: {
        type: String
    },
    descriptionAr: {
        type: String
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
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
taxSchema.index({ organizationId: 1, isEnabled: 1 });
taxSchema.index({ organizationId: 1, isDefault: 1 });

// Pre-save hook to ensure only one default tax per organization
taxSchema.pre('save', async function(next) {
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

// Static method to get default tax for an organization
taxSchema.statics.getDefaultTax = async function(organizationId) {
    return this.findOne({
        organizationId,
        isDefault: true,
        isEnabled: true
    });
};

// Static method to get all active taxes for an organization
taxSchema.statics.getActiveTaxes = async function(organizationId) {
    return this.find({
        organizationId,
        isEnabled: true
    }).sort({ name: 1 });
};

module.exports = mongoose.model('Tax', taxSchema);
