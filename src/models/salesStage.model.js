/**
 * Sales Stage Model
 *
 * Represents pipeline stages for CRM cases.
 * Supports probability, automation triggers, and stage types.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const salesStageSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    order: {
        type: Number,
        required: true,
        min: 1
    },

    defaultProbability: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    type: {
        type: String,
        enum: ['open', 'won', 'lost'],
        default: 'open',
        required: true
    },
    color: {
        type: String,
        default: '#6B7280',
        match: /^#[0-9A-Fa-f]{6}$/
    },

    requiresConflictCheck: {
        type: Boolean,
        default: false
    },
    requiresQualification: {
        type: Boolean,
        default: false
    },
    autoCreateQuote: {
        type: Boolean,
        default: false
    },

    enabled: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

salesStageSchema.index({ firmId: 1, order: 1 });
salesStageSchema.index({ firmId: 1, type: 1 });
salesStageSchema.index({ firmId: 1, enabled: 1, order: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all enabled stages for a firm, ordered
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Ordered array of stages
 */
salesStageSchema.statics.getOrdered = async function(firmId) {
    return this.find({ firmId, enabled: true }).sort({ order: 1 });
};

/**
 * Get stages by type
 * @param {ObjectId} firmId - Firm ID
 * @param {String} type - Stage type (open, won, lost)
 * @returns {Promise<Array>} Array of stages
 */
salesStageSchema.statics.getByType = async function(firmId, type) {
    return this.find({ firmId, type, enabled: true }).sort({ order: 1 });
};

/**
 * Get next stage in order
 * @param {ObjectId} firmId - Firm ID
 * @param {Number} currentOrder - Current stage order
 * @returns {Promise<Object>} Next stage or null
 */
salesStageSchema.statics.getNextStage = async function(firmId, currentOrder) {
    return this.findOne({
        firmId,
        enabled: true,
        type: 'open',
        order: { $gt: currentOrder }
    }).sort({ order: 1 });
};

/**
 * Reorder stages
 * @param {ObjectId} firmId - Firm ID
 * @param {Array} stages - Array of { _id, order }
 */
salesStageSchema.statics.reorder = async function(firmId, stages) {
    const bulkOps = stages.map(({ _id, order }) => ({
        updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(_id), firmId },
            update: { $set: { order, updatedAt: new Date() } }
        }
    }));

    await this.bulkWrite(bulkOps);
};

/**
 * Get default stages for initialization
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Created stages
 */
salesStageSchema.statics.createDefaults = async function(firmId) {
    const defaults = [
        { name: 'Intake', nameAr: 'استقبال', order: 1, defaultProbability: 10, type: 'open', color: '#6B7280' },
        { name: 'Conflict Check', nameAr: 'فحص التعارض', order: 2, defaultProbability: 20, type: 'open', color: '#F59E0B', requiresConflictCheck: true },
        { name: 'Qualified', nameAr: 'مؤهل', order: 3, defaultProbability: 40, type: 'open', color: '#3B82F6', requiresQualification: true },
        { name: 'Proposal Sent', nameAr: 'تم إرسال العرض', order: 4, defaultProbability: 60, type: 'open', color: '#8B5CF6', autoCreateQuote: true },
        { name: 'Negotiation', nameAr: 'التفاوض', order: 5, defaultProbability: 80, type: 'open', color: '#EC4899' },
        { name: 'Won', nameAr: 'تم الفوز', order: 6, defaultProbability: 100, type: 'won', color: '#10B981' },
        { name: 'Lost', nameAr: 'خسارة', order: 7, defaultProbability: 0, type: 'lost', color: '#EF4444' }
    ];

    const stages = defaults.map(d => ({ ...d, firmId }));
    return this.insertMany(stages);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if this is a terminal stage (won or lost)
 * @returns {Boolean} True if terminal
 */
salesStageSchema.methods.isTerminal = function() {
    return this.type === 'won' || this.type === 'lost';
};

/**
 * Check if stage requires any validation
 * @returns {Boolean} True if requires validation
 */
salesStageSchema.methods.requiresValidation = function() {
    return this.requiresConflictCheck || this.requiresQualification;
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get display name (bilingual)
 */
salesStageSchema.virtual('displayName').get(function() {
    return `${this.name} / ${this.nameAr}`;
});

salesStageSchema.set('toJSON', { virtuals: true });
salesStageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SalesStage', salesStageSchema);
