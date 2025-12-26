const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Quality Inspection Model
 *
 * Tracks quality inspections for items at various stages
 * (incoming, outgoing, in-process) with template-based readings
 * and acceptance criteria.
 */

// ============ READING SCHEMA ============
const ReadingSchema = new Schema({
    parameterName: {
        type: String,
        required: true
    },
    parameterNameAr: String,
    specification: String,
    acceptanceCriteria: String,
    minValue: Number,
    maxValue: Number,
    value: Schema.Types.Mixed, // Can be number or string
    status: {
        type: String,
        enum: ['accepted', 'rejected'],
        required: true
    },
    remarks: String
}, { _id: true });

// ============ MAIN SCHEMA ============
const qualityInspectionSchema = new Schema({
    // ============ IDENTIFIERS ============
    inspectionId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    inspectionNumber: {
        type: String,
        unique: true,
        sparse: true
    },

    // ============ REFERENCE ============
    referenceType: {
        type: String,
        enum: ['purchase_receipt', 'delivery_note', 'stock_entry', 'production'],
        required: true,
        index: true
    },
    referenceId: {
        type: Schema.Types.ObjectId,
        refPath: 'referenceModel',
        required: true,
        index: true
    },
    referenceModel: {
        type: String,
        enum: ['PurchaseReceipt', 'DeliveryNote', 'StockEntry', 'Production']
    },
    referenceNumber: String,

    // ============ ITEM DETAILS ============
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    itemCode: String,
    itemName: String,
    batchNo: String,

    // ============ INSPECTION TYPE ============
    inspectionType: {
        type: String,
        enum: ['incoming', 'outgoing', 'in_process'],
        required: true,
        index: true
    },

    // ============ SAMPLE & INSPECTION ============
    sampleSize: {
        type: Number,
        required: true,
        min: 0
    },
    inspectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    inspectedByName: String,
    inspectionDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },

    // ============ TEMPLATE ============
    templateId: {
        type: Schema.Types.ObjectId,
        ref: 'QualityTemplate',
        index: true
    },
    templateName: String,

    // ============ READINGS ============
    readings: [ReadingSchema],

    // ============ STATUS & RESULTS ============
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'partially_accepted'],
        default: 'pending',
        index: true
    },
    acceptedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    rejectedQty: {
        type: Number,
        default: 0,
        min: 0
    },

    // ============ REMARKS ============
    remarks: String,

    // ============ MULTI-TENANCY ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
qualityInspectionSchema.index({ firmId: 1, status: 1, inspectionDate: -1 });
qualityInspectionSchema.index({ firmId: 1, inspectionType: 1 });
qualityInspectionSchema.index({ firmId: 1, itemId: 1 });
qualityInspectionSchema.index({ referenceType: 1, referenceId: 1 });

// ============ VIRTUALS ============
qualityInspectionSchema.virtual('totalQty').get(function() {
    return (this.acceptedQty || 0) + (this.rejectedQty || 0);
});

qualityInspectionSchema.virtual('acceptanceRate').get(function() {
    const total = this.totalQty;
    return total > 0 ? ((this.acceptedQty || 0) / total) * 100 : 0;
});

qualityInspectionSchema.virtual('passedReadings').get(function() {
    if (!this.readings || this.readings.length === 0) return 0;
    return this.readings.filter(r => r.status === 'accepted').length;
});

qualityInspectionSchema.virtual('failedReadings').get(function() {
    if (!this.readings || this.readings.length === 0) return 0;
    return this.readings.filter(r => r.status === 'rejected').length;
});

// ============ PRE-SAVE MIDDLEWARE ============
qualityInspectionSchema.pre('save', async function(next) {
    // Auto-generate inspection ID if not provided
    if (this.isNew && !this.inspectionId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Create counter ID: quality_inspection_{firmId}_{date}
        const counterId = this.firmId
            ? `quality_inspection_${this.firmId}_${dateStr}`
            : `quality_inspection_global_${dateStr}`;

        const seq = await Counter.getNextSequence(counterId);
        this.inspectionId = `QI-${dateStr}-${String(seq).padStart(4, '0')}`;
        this.inspectionNumber = this.inspectionId;
    }

    // Auto-calculate status based on readings if not manually set
    if (this.readings && this.readings.length > 0 && this.status === 'pending') {
        const passedCount = this.readings.filter(r => r.status === 'accepted').length;
        const failedCount = this.readings.filter(r => r.status === 'rejected').length;

        if (failedCount === 0 && passedCount > 0) {
            this.status = 'accepted';
        } else if (passedCount === 0 && failedCount > 0) {
            this.status = 'rejected';
        } else if (passedCount > 0 && failedCount > 0) {
            this.status = 'partially_accepted';
        }
    }

    next();
});

// ============ STATIC METHODS ============
qualityInspectionSchema.statics.getInspectionStats = async function(firmId, filters = {}) {
    const query = { ...filters };

    if (firmId) {
        query.firmId = firmId;
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalInspections: { $sum: 1 },
                accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                partiallyAccepted: { $sum: { $cond: [{ $eq: ['$status', 'partially_accepted'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                totalAcceptedQty: { $sum: '$acceptedQty' },
                totalRejectedQty: { $sum: '$rejectedQty' }
            }
        }
    ]);

    return stats || {
        totalInspections: 0,
        accepted: 0,
        rejected: 0,
        partiallyAccepted: 0,
        pending: 0,
        totalAcceptedQty: 0,
        totalRejectedQty: 0
    };
};

qualityInspectionSchema.statics.getInspectionsByItem = async function(firmId, itemId, limit = 10) {
    const query = { itemId };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query)
        .sort({ inspectionDate: -1 })
        .limit(limit)
        .populate('inspectedBy', 'name')
        .populate('templateId', 'name');
};

module.exports = mongoose.model('QualityInspection', qualityInspectionSchema);
