const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
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
    rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
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
taxSchema.index({ firmId: 1, isDefault: 1 });
taxSchema.index({ firmId: 1, isActive: 1 });

// Ensure only one default tax per firm
taxSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { firmId: this.firmId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

module.exports = mongoose.model('Tax', taxSchema);
