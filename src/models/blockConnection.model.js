const mongoose = require('mongoose');
const logger = require('../utils/logger');

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

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
     * Handle position system (ReactFlow pattern)
     */
    sourceHandle: {
        id: String,
        position: {
            type: String,
            enum: ['top', 'right', 'bottom', 'left', 'center'],
            default: 'right'
        }
    },
    targetHandle: {
        id: String,
        position: {
            type: String,
            enum: ['top', 'right', 'bottom', 'left', 'center'],
            default: 'left'
        }
    },

    /**
     * Path configuration for curved/bent connections
     */
    pathType: {
        type: String,
        enum: ['straight', 'bezier', 'smoothstep', 'step'],
        default: 'bezier'
    },
    bendPoints: [{
        x: Number,
        y: Number
    }],
    curvature: {
        type: Number,
        default: 0.25,
        min: 0,
        max: 1
    },

    /**
     * Visual styling
     */
    strokeWidth: {
        type: Number,
        default: 2,
        min: 1,
        max: 10
    },
    animated: {
        type: Boolean,
        default: false
    },
    markerStart: {
        type: {
            type: String,
            enum: ['none', 'arrow', 'arrowclosed', 'circle', 'diamond'],
            default: 'none'
        },
        color: String,
        width: Number,
        height: Number
    },
    markerEnd: {
        type: {
            type: String,
            enum: ['none', 'arrow', 'arrowclosed', 'circle', 'diamond'],
            default: 'arrow'
        },
        color: String,
        width: Number,
        height: Number
    },

    /**
     * Z-index for layering
     */
    zIndex: {
        type: Number,
        default: 0
    },

    /**
     * Interaction settings
     */
    selectable: {
        type: Boolean,
        default: true
    },
    deletable: {
        type: Boolean,
        default: true
    },
    interactionWidth: {
        type: Number,
        default: 20,
        min: 10,
        max: 50
    },

    /**
     * Version control
     */
    version: {
        type: Number,
        default: 1
    },
    isDeleted: {
        type: Boolean,
        default: false
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

// Index for sorting connections by z-index within a page
blockConnectionSchema.index({ pageId: 1, zIndex: 1 });

// Compound index for firmId and createdAt
blockConnectionSchema.index({ firmId: 1, createdAt: -1 });

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

// Handle bidirectional binding - update boundElements on both blocks
blockConnectionSchema.post('save', async function(doc) {
    try {
        const CaseNotionBlock = mongoose.model('CaseNotionBlock');

        // Update source block's boundElements
        await CaseNotionBlock.findByIdAndUpdate(
            doc.sourceBlockId,
            {
                $addToSet: {
                    boundElements: {
                        id: doc._id,
                        type: 'connection',
                        role: 'source'
                    }
                }
            }
        );

        // Update target block's boundElements
        await CaseNotionBlock.findByIdAndUpdate(
            doc.targetBlockId,
            {
                $addToSet: {
                    boundElements: {
                        id: doc._id,
                        type: 'connection',
                        role: 'target'
                    }
                }
            }
        );
    } catch (error) {
        logger.error('Error updating bidirectional binding:', error);
        // Don't throw error to prevent connection creation from failing
        // The binding can be re-synced later if needed
    }
});

// Handle bidirectional binding cleanup on delete
blockConnectionSchema.post('findOneAndDelete', async function(doc) {
    if (!doc) return;

    try {
        const CaseNotionBlock = mongoose.model('CaseNotionBlock');

        // Remove from source block's boundElements
        await CaseNotionBlock.findByIdAndUpdate(
            doc.sourceBlockId,
            {
                $pull: {
                    boundElements: { id: doc._id }
                }
            }
        );

        // Remove from target block's boundElements
        await CaseNotionBlock.findByIdAndUpdate(
            doc.targetBlockId,
            {
                $pull: {
                    boundElements: { id: doc._id }
                }
            }
        );
    } catch (error) {
        logger.error('Error cleaning up bidirectional binding:', error);
    }
});

// Handle bidirectional binding cleanup on deleteMany
blockConnectionSchema.post('deleteMany', async function() {
    try {
        const CaseNotionBlock = mongoose.model('CaseNotionBlock');

        // This is a bulk operation, so we need to clean up all blocks
        // Remove all connection references from boundElements
        await CaseNotionBlock.updateMany(
            { 'boundElements.type': 'connection' },
            {
                $pull: {
                    boundElements: { type: 'connection' }
                }
            }
        );
    } catch (error) {
        logger.error('Error cleaning up bidirectional binding on bulk delete:', error);
    }
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('BlockConnection', blockConnectionSchema);
module.exports.CONNECTION_TYPES = CONNECTION_TYPES;
