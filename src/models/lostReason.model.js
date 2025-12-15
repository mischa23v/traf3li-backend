/**
 * Lost Reason Model
 *
 * Tracks reasons why cases/opportunities were lost.
 * Helps with analytics and improving conversion rates.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const LOST_REASON_CATEGORIES = [
    'price',
    'competitor',
    'timing',
    'scope',
    'relationship',
    'internal',
    'other'
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const lostReasonSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    reasonAr: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    category: {
        type: String,
        enum: LOST_REASON_CATEGORIES,
        default: 'other',
        index: true
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

lostReasonSchema.index({ firmId: 1, category: 1 });
lostReasonSchema.index({ firmId: 1, enabled: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all enabled lost reasons for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of lost reasons
 */
lostReasonSchema.statics.getEnabled = async function(firmId) {
    return this.find({ firmId, enabled: true }).sort({ category: 1, reason: 1 });
};

/**
 * Get reasons by category
 * @param {ObjectId} firmId - Firm ID
 * @param {String} category - Reason category
 * @returns {Promise<Array>} Array of lost reasons
 */
lostReasonSchema.statics.getByCategory = async function(firmId, category) {
    return this.find({ firmId, category, enabled: true }).sort({ reason: 1 });
};

/**
 * Get default lost reasons for initialization
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Created lost reasons
 */
lostReasonSchema.statics.createDefaults = async function(firmId) {
    const defaults = [
        // Price reasons
        { reason: 'Price too high', reasonAr: 'السعر مرتفع جداً', category: 'price' },
        { reason: 'Budget constraints', reasonAr: 'قيود الميزانية', category: 'price' },
        { reason: 'Found cheaper option', reasonAr: 'وجدوا خيار أرخص', category: 'price' },

        // Competitor reasons
        { reason: 'Chose competitor', reasonAr: 'اختاروا منافس', category: 'competitor' },
        { reason: 'Existing relationship with competitor', reasonAr: 'علاقة قائمة مع منافس', category: 'competitor' },

        // Timing reasons
        { reason: 'Bad timing', reasonAr: 'توقيت غير مناسب', category: 'timing' },
        { reason: 'Project postponed', reasonAr: 'تم تأجيل المشروع', category: 'timing' },
        { reason: 'No longer needed', reasonAr: 'لم تعد هناك حاجة', category: 'timing' },

        // Scope reasons
        { reason: 'Scope mismatch', reasonAr: 'عدم تطابق النطاق', category: 'scope' },
        { reason: 'Requirements changed', reasonAr: 'تغيرت المتطلبات', category: 'scope' },
        { reason: 'Service not available', reasonAr: 'الخدمة غير متوفرة', category: 'scope' },

        // Relationship reasons
        { reason: 'Poor communication', reasonAr: 'ضعف التواصل', category: 'relationship' },
        { reason: 'Lost trust', reasonAr: 'فقدان الثقة', category: 'relationship' },
        { reason: 'No response from client', reasonAr: 'لا رد من العميل', category: 'relationship' },

        // Internal reasons
        { reason: 'Internal decision', reasonAr: 'قرار داخلي', category: 'internal' },
        { reason: 'Resource constraints', reasonAr: 'قيود الموارد', category: 'internal' },
        { reason: 'Conflict of interest', reasonAr: 'تضارب مصالح', category: 'internal' },

        // Other
        { reason: 'Unknown reason', reasonAr: 'سبب غير معروف', category: 'other' },
        { reason: 'Other', reasonAr: 'أخرى', category: 'other' }
    ];

    const reasons = defaults.map(d => ({ ...d, firmId }));
    return this.insertMany(reasons, { ordered: false }).catch(err => {
        // Ignore duplicate key errors
        if (err.code !== 11000) throw err;
    });
};

/**
 * Get valid categories
 * @returns {Array} Array of valid category strings
 */
lostReasonSchema.statics.getCategories = function() {
    return LOST_REASON_CATEGORIES;
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get display name (bilingual)
 */
lostReasonSchema.virtual('displayName').get(function() {
    return `${this.reason} / ${this.reasonAr}`;
});

lostReasonSchema.set('toJSON', { virtuals: true });
lostReasonSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LostReason', lostReasonSchema);
