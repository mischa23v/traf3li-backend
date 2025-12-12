const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// BLOCK CONNECTION MODEL
// Visual connections between blocks on whiteboard/canvas
// ═══════════════════════════════════════════════════════════════

const CONNECTION_TYPES = ['arrow', 'line', 'dashed', 'bidirectional'];

const blockConnectionSchema = new mongoose.Schema({
    /**
     * The page this connection belongs to
     */
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true,
        index: true
    },

    /**
     * Source block (where the arrow starts)
     */
    sourceBlockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock',
        required: true,
        index: true
    },

    /**
     * Target block (where the arrow points to)
     */
    targetBlockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock',
        required: true,
        index: true
    },

    /**
     * Type of connection line
     */
    connectionType: {
        type: String,
        enum: CONNECTION_TYPES,
        default: 'arrow'
    },

    /**
     * Optional label displayed on the connection line
     */
    label: {
        type: String,
        maxlength: 100
    },

    /**
     * Color of the connection line (CSS color)
     */
    color: {
        type: String,
        default: '#6b7280' // Gray-500
    },

    /**
     * User who created this connection
     */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Ensure unique connections (no duplicates in same direction)
blockConnectionSchema.index(
    { pageId: 1, sourceBlockId: 1, targetBlockId: 1 },
    { unique: true }
);

// Index for finding all connections for a block
blockConnectionSchema.index({ sourceBlockId: 1, targetBlockId: 1 });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Prevent self-referencing connections
blockConnectionSchema.pre('save', function(next) {
    if (this.sourceBlockId.toString() === this.targetBlockId.toString()) {
        return next(new Error('Cannot create connection from a block to itself'));
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('BlockConnection', blockConnectionSchema);
module.exports.CONNECTION_TYPES = CONNECTION_TYPES;
