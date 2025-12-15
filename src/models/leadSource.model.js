/**
 * Lead Source Model
 *
 * Represents sources of leads for CRM tracking and analytics.
 * Supports UTM tracking parameters.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const leadSourceSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
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
    slug: {
        type: String,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },

    utmSource: {
        type: String,
        trim: true,
        maxlength: 50
    },
    utmMedium: {
        type: String,
        trim: true,
        maxlength: 50
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

leadSourceSchema.index({ firmId: 1, slug: 1 }, { unique: true });
leadSourceSchema.index({ firmId: 1, enabled: 1 });
leadSourceSchema.index({ firmId: 1, utmSource: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

leadSourceSchema.pre('save', function(next) {
    // Generate slug from name if not provided
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all enabled lead sources for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of lead sources
 */
leadSourceSchema.statics.getEnabled = async function(firmId) {
    return this.find({ firmId, enabled: true }).sort({ name: 1 });
};

/**
 * Get lead source by UTM parameters
 * @param {ObjectId} firmId - Firm ID
 * @param {String} utmSource - UTM source
 * @param {String} utmMedium - UTM medium (optional)
 * @returns {Promise<Object>} Lead source document
 */
leadSourceSchema.statics.getByUTM = async function(firmId, utmSource, utmMedium = null) {
    const query = { firmId, utmSource, enabled: true };
    if (utmMedium) {
        query.utmMedium = utmMedium;
    }
    return this.findOne(query);
};

/**
 * Get default lead sources for initialization
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Created lead sources
 */
leadSourceSchema.statics.createDefaults = async function(firmId) {
    const defaults = [
        { name: 'Website', nameAr: 'الموقع الإلكتروني', slug: 'website', utmSource: 'website' },
        { name: 'Referral', nameAr: 'إحالة', slug: 'referral', utmSource: 'referral' },
        { name: 'Social Media', nameAr: 'وسائل التواصل الاجتماعي', slug: 'social-media', utmSource: 'social' },
        { name: 'Google Ads', nameAr: 'إعلانات جوجل', slug: 'google-ads', utmSource: 'google', utmMedium: 'cpc' },
        { name: 'Walk In', nameAr: 'زيارة مباشرة', slug: 'walk-in', utmSource: 'walk_in' },
        { name: 'Phone Call', nameAr: 'اتصال هاتفي', slug: 'phone-call', utmSource: 'phone' },
        { name: 'Email', nameAr: 'بريد إلكتروني', slug: 'email', utmSource: 'email' },
        { name: 'Event', nameAr: 'فعالية', slug: 'event', utmSource: 'event' },
        { name: 'Other', nameAr: 'أخرى', slug: 'other', utmSource: 'other' }
    ];

    const sources = defaults.map(d => ({ ...d, firmId }));
    return this.insertMany(sources, { ordered: false }).catch(err => {
        // Ignore duplicate key errors
        if (err.code !== 11000) throw err;
    });
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get display name (bilingual)
 */
leadSourceSchema.virtual('displayName').get(function() {
    return `${this.name} / ${this.nameAr}`;
});

leadSourceSchema.set('toJSON', { virtuals: true });
leadSourceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeadSource', leadSourceSchema);
