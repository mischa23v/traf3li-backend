const mongoose = require('mongoose');

const billingRateSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rateType: {
        type: String,
        enum: ['standard', 'custom_client', 'custom_case_type', 'activity_based'],
        required: true
    },
    standardHourlyRate: {
        type: Number,
        required: true,
        min: 0
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    caseType: String,
    activityCode: {
        type: String,
        enum: [
            'court_appearance',
            'client_meeting',
            'research',
            'document_preparation',
            'phone_call',
            'email',
            'travel',
            'administrative',
            'other'
        ]
    },
    customRate: {
        type: Number,
        min: 0
    },
    effectiveDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: Date,
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
billingRateSchema.index({ lawyerId: 1, effectiveDate: -1 });
billingRateSchema.index({ clientId: 1, lawyerId: 1 });
billingRateSchema.index({ lawyerId: 1, isActive: 1 });

// Static method: Get applicable rate
billingRateSchema.statics.getApplicableRate = async function(lawyerId, clientId, caseType, activityCode) {
    // Priority: Custom Client > Custom Case Type > Activity Based > Standard

    // 1. Try custom client rate
    if (clientId) {
        const clientRate = await this.findOne({
            lawyerId,
            clientId,
            rateType: 'custom_client',
            isActive: true,
            effectiveDate: { $lte: new Date() },
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: new Date() } }
            ]
        }).sort({ effectiveDate: -1 });

        if (clientRate) {
            return clientRate.customRate || clientRate.standardHourlyRate;
        }
    }

    // 2. Try custom case type rate
    if (caseType) {
        const caseTypeRate = await this.findOne({
            lawyerId,
            caseType,
            rateType: 'custom_case_type',
            isActive: true,
            effectiveDate: { $lte: new Date() },
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: new Date() } }
            ]
        }).sort({ effectiveDate: -1 });

        if (caseTypeRate) {
            return caseTypeRate.customRate || caseTypeRate.standardHourlyRate;
        }
    }

    // 3. Try activity-based rate
    if (activityCode) {
        const activityRate = await this.findOne({
            lawyerId,
            activityCode,
            rateType: 'activity_based',
            isActive: true,
            effectiveDate: { $lte: new Date() },
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: new Date() } }
            ]
        }).sort({ effectiveDate: -1 });

        if (activityRate) {
            return activityRate.customRate || activityRate.standardHourlyRate;
        }
    }

    // 4. Fall back to standard rate
    const standardRate = await this.findOne({
        lawyerId,
        rateType: 'standard',
        isActive: true,
        effectiveDate: { $lte: new Date() },
        $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: new Date() } }
        ]
    }).sort({ effectiveDate: -1 });

    return standardRate ? standardRate.standardHourlyRate : null;
};

module.exports = mongoose.model('BillingRate', billingRateSchema);
