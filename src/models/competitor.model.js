/**
 * Competitor Model
 *
 * Tracks competitors in the CRM system.
 * Helps analyze win/loss rates against specific competitors.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const competitorSchema = new mongoose.Schema({
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
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    website: {
        type: String,
        trim: true,
        maxlength: 255
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Stats (calculated)
    casesLostTo: {
        type: Number,
        default: 0,
        min: 0
    },
    casesWonAgainst: {
        type: Number,
        default: 0,
        min: 0
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

competitorSchema.index({ firmId: 1, enabled: 1 });
competitorSchema.index({ firmId: 1, name: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all enabled competitors for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of competitors
 */
competitorSchema.statics.getEnabled = async function(firmId) {
    return this.find({ firmId, enabled: true }).sort({ name: 1 });
};

/**
 * Get competitors with stats
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of competitors with win/loss stats
 */
competitorSchema.statics.getWithStats = async function(firmId) {
    const competitors = await this.find({ firmId, enabled: true })
        .sort({ name: 1 })
        .lean();

    return competitors.map(c => ({
        ...c,
        totalCases: c.casesLostTo + c.casesWonAgainst,
        winRate: c.casesLostTo + c.casesWonAgainst > 0
            ? Math.round((c.casesWonAgainst / (c.casesLostTo + c.casesWonAgainst)) * 100)
            : 0
    }));
};

/**
 * Record a loss to a competitor
 * @param {ObjectId} competitorId - Competitor ID
 * @returns {Promise<Object>} Updated competitor
 */
competitorSchema.statics.recordLoss = async function(competitorId) {
    return this.findByIdAndUpdate(
        competitorId,
        { $inc: { casesLostTo: 1 } },
        { new: true }
    );
};

/**
 * Record a win against a competitor
 * @param {ObjectId} competitorId - Competitor ID
 * @returns {Promise<Object>} Updated competitor
 */
competitorSchema.statics.recordWin = async function(competitorId) {
    return this.findByIdAndUpdate(
        competitorId,
        { $inc: { casesWonAgainst: 1 } },
        { new: true }
    );
};

/**
 * Get top competitors by losses
 * @param {ObjectId} firmId - Firm ID
 * @param {Number} limit - Max results
 * @returns {Promise<Array>} Top competitors
 */
competitorSchema.statics.getTopByLosses = async function(firmId, limit = 5) {
    return this.find({ firmId, enabled: true, casesLostTo: { $gt: 0 } })
        .sort({ casesLostTo: -1 })
        .limit(limit)
        .lean();
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get win rate percentage
 */
competitorSchema.virtual('winRate').get(function() {
    const total = this.casesLostTo + this.casesWonAgainst;
    if (total === 0) return 0;
    return Math.round((this.casesWonAgainst / total) * 100);
});

/**
 * Get total cases
 */
competitorSchema.virtual('totalCases').get(function() {
    return this.casesLostTo + this.casesWonAgainst;
});

/**
 * Get display name (bilingual)
 */
competitorSchema.virtual('displayName').get(function() {
    if (this.nameAr) {
        return `${this.name} / ${this.nameAr}`;
    }
    return this.name;
});

competitorSchema.set('toJSON', { virtuals: true });
competitorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Competitor', competitorSchema);
