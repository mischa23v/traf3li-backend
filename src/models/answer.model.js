const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy) - Optional for solo lawyers
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional - null for solo lawyers
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    likes: {
        type: Number,
        default: 0
    },
    verified: {
        type: Boolean,
        default: false
    },
    helpful: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

answerSchema.index({ questionId: 1, createdAt: -1 });
answerSchema.index({ firmId: 1, lawyerId: 1 });

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 * Solo lawyers use lawyerId filter instead of firmId (handled by plugin).
 *
 * Usage:
 *   // Firm member queries:
 *   await Answer.find({ firmId: myFirmId, questionId: qId });
 *
 *   // Solo lawyer queries:
 *   await Answer.find({ lawyerId: myLawyerId, questionId: qId });
 *
 *   // System-level queries (bypass):
 *   await Answer.findWithoutFirmFilter({ questionId: qId });
 */
answerSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('Answer', answerSchema);
