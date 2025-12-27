const mongoose = require('mongoose');

const rateGroupSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    descriptionAr: String,
    color: {
        type: String,
        required: true,
        default: '#3B82F6'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    applicableTo: [{
        type: String,
        enum: ['clients', 'cases', 'services']
    }],
    rates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BillingRate'
    }]
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
rateGroupSchema.index({ lawyerId: 1, isDefault: 1 });
rateGroupSchema.index({ lawyerId: 1, isActive: 1 });
rateGroupSchema.index({ firmId: 1, lawyerId: 1 });

// Pre-save hook to ensure only one default
rateGroupSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { lawyerId: this.lawyerId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

module.exports = mongoose.model('RateGroup', rateGroupSchema);
