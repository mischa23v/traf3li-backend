const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// PAGE TEMPLATE MODEL
// Templates for common legal documentation workflows
// ═══════════════════════════════════════════════════════════════

const TEMPLATE_CATEGORIES = [
    'case_strategy', 'client_meeting', 'court_hearing', 'legal_research',
    'evidence_analysis', 'witness_interview', 'settlement_negotiation',
    'case_timeline', 'brainstorming', 'custom'
];

const pageTemplateSchema = new mongoose.Schema({
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    descriptionAr: { type: String, maxlength: 1000 },

    category: {
        type: String,
        enum: TEMPLATE_CATEGORIES,
        required: true
    },

    icon: {
        type: { type: String, enum: ['emoji', 'file', 'external'] },
        emoji: String,
        url: String
    },

    // Template content (stored as JSON blocks array)
    blocks: [mongoose.Schema.Types.Mixed],

    isGlobal: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

pageTemplateSchema.index({ firmId: 1, category: 1 });
pageTemplateSchema.index({ isGlobal: 1, isActive: 1 });
pageTemplateSchema.index({ name: 'text', nameAr: 'text' });

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('PageTemplate', pageTemplateSchema);
module.exports.TEMPLATE_CATEGORIES = TEMPLATE_CATEGORIES;
