const mongoose = require('mongoose');

const paymentModeSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    description: { type: String },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Compound index for firm and default
paymentModeSchema.index({ firmId: 1, isDefault: 1 });
paymentModeSchema.index({ firmId: 1, isActive: 1 });

// Ensure only one default payment mode per firm
paymentModeSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { firmId: this.firmId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

module.exports = mongoose.model('PaymentMode', paymentModeSchema);
