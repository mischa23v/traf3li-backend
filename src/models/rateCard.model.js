const mongoose = require('mongoose');

const rateCardEntrySchema = new mongoose.Schema({
    rateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BillingRate',
        required: true
    },
    customAmount: Number,
    customCurrency: String,
    notes: String
});

const rateCardSchema = new mongoose.Schema({
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
    entityType: {
        type: String,
        enum: ['client', 'case', 'contract'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    entries: [rateCardEntrySchema],
    effectiveFrom: {
        type: Date,
        required: true
    },
    effectiveTo: Date,
    isActive: {
        type: Boolean,
        default: true
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
rateCardSchema.index({ lawyerId: 1, entityType: 1, entityId: 1 });
rateCardSchema.index({ lawyerId: 1, isActive: 1 });
rateCardSchema.index({ firmId: 1, lawyerId: 1 });

// Static method: Get rate card for entity
rateCardSchema.statics.getForEntity = async function(lawyerId, entityType, entityId) {
    const now = new Date();
    return await this.findOne({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        isActive: true,
        effectiveFrom: { $lte: now },
        $or: [
            { effectiveTo: null },
            { effectiveTo: { $gte: now } }
        ]
    }).populate('entries.rateId');
};

module.exports = mongoose.model('RateCard', rateCardSchema);
