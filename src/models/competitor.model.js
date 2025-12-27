const mongoose = require('mongoose');

const competitorSchema = new mongoose.Schema({
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    website: { type: String, trim: true },
    description: String,
    descriptionAr: String,

    // Classification
    competitorType: {
        type: String,
        enum: ['direct', 'indirect', 'potential'],
        default: 'direct'
    },
    threatLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },

    // Strengths and weaknesses
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
    ourAdvantages: [{ type: String, trim: true }],
    theirAdvantages: [{ type: String, trim: true }],

    // Pricing info
    pricing: {
        model: { type: String, enum: ['hourly', 'fixed', 'retainer', 'hybrid', 'unknown'] },
        priceRange: String,
        notes: String
    },

    // Market presence
    marketShare: { type: Number, min: 0, max: 100 },
    targetMarket: [{ type: String, trim: true }],
    geographicPresence: [{ type: String, trim: true }],

    // Win/Loss tracking
    stats: {
        dealsWonAgainst: { type: Number, default: 0 },
        dealsLostTo: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        lastEncounter: Date
    },

    // Contact info (if known)
    contacts: [{
        name: String,
        title: String,
        email: String,
        phone: String
    }],

    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
    tags: [{ type: String, trim: true }],
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false });

competitorSchema.index({ firmId: 1, status: 1 });
competitorSchema.index({ firmId: 1, threatLevel: 1 });
competitorSchema.index({ name: 'text', nameAr: 'text' });

module.exports = mongoose.model('Competitor', competitorSchema);
