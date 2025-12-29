const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');

/**
 * Trello Integration Model
 *
 * Stores OAuth tokens and settings for Trello board integration
 * per firm and user.
 *
 * Security Features:
 * - Encrypted access/token secrets (AES-256-GCM)
 * - Firm isolation
 * - Task/card mapping for sync
 *
 * Note: Trello uses OAuth 1.0a (not OAuth 2.0)
 */

const trelloIntegrationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // USER & FIRM ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
        // User who connected the Trello workspace
    },

    // ═══════════════════════════════════════════════════════════════
    // TRELLO MEMBER INFO
    // ═══════════════════════════════════════════════════════════════
    trelloMemberId: {
        type: String,
        required: true,
        index: true
        // Trello member ID
    },

    fullName: {
        type: String,
        required: true
        // Member's full name
    },

    username: {
        type: String
        // Trello username
    },

    avatarUrl: {
        type: String
        // Member's avatar URL
    },

    // ═══════════════════════════════════════════════════════════════
    // OAUTH TOKENS (encrypted) - OAuth 1.0a
    // ═══════════════════════════════════════════════════════════════
    accessToken: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // OAuth 1.0a access token - will be encrypted by plugin
    },

    tokenSecret: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // OAuth 1.0a token secret - will be encrypted by plugin
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTED BOARDS
    // ═══════════════════════════════════════════════════════════════
    boards: [{
        boardId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        shortUrl: {
            type: String
        },
        url: {
            type: String
        },
        closed: {
            type: Boolean,
            default: false
        },
        synced: {
            type: Boolean,
            default: false
            // Whether this board is synced with tasks/cases
        },
        syncDirection: {
            type: String,
            enum: ['to_trello', 'from_trello', 'bidirectional', null],
            default: null
            // How to sync cards
        },
        lastSyncAt: {
            type: Date
        },
        // Lists in this board
        lists: [{
            listId: {
                type: String,
                required: true
            },
            name: {
                type: String,
                required: true
            },
            closed: {
                type: Boolean,
                default: false
            },
            pos: {
                type: Number
                // Position in the board
            }
        }]
    }],

    // ═══════════════════════════════════════════════════════════════
    // SYNC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    syncSettings: {
        // Auto-sync settings
        enabled: {
            type: Boolean,
            default: false
        },

        // Sync interval
        syncInterval: {
            type: String,
            enum: ['manual', 'hourly', 'daily', 'realtime'],
            default: 'manual'
        },

        // Notification preferences
        notifications: {
            cardCreated: {
                type: Boolean,
                default: true
            },
            cardUpdated: {
                type: Boolean,
                default: true
            },
            cardMoved: {
                type: Boolean,
                default: true
            },
            cardCompleted: {
                type: Boolean,
                default: true
            },
            cardArchived: {
                type: Boolean,
                default: false
            },
            commentAdded: {
                type: Boolean,
                default: true
            },
            dueDateReminder: {
                type: Boolean,
                default: true
            }
        },

        // Default board for new cards
        defaultBoardId: String,
        defaultBoardName: String,

        // Default list for new cards
        defaultListId: String,
        defaultListName: String
    },

    // ═══════════════════════════════════════════════════════════════
    // TASK MAPPING (Trello cards <-> Cases/Tasks)
    // ═══════════════════════════════════════════════════════════════
    taskMapping: [{
        // Internal task/case ID
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        // Task type ('case' or 'task')
        taskType: {
            type: String,
            enum: ['case', 'task'],
            required: true
        },

        // Trello card ID
        cardId: {
            type: String,
            required: true,
            index: true
        },

        // Board and list info
        boardId: {
            type: String,
            required: true
        },

        listId: {
            type: String,
            required: true
        },

        // Sync metadata
        lastSyncAt: {
            type: Date,
            default: Date.now
        },

        syncDirection: {
            type: String,
            enum: ['to_trello', 'from_trello', 'bidirectional'],
            default: 'bidirectional'
        },

        // Auto-sync enabled for this mapping
        autoSync: {
            type: Boolean,
            default: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    webhooks: [{
        webhookId: {
            type: String,
            required: true
        },
        boardId: {
            type: String,
            required: true
        },
        callbackUrl: {
            type: String,
            required: true
        },
        active: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    connectedAt: {
        type: Date,
        default: Date.now
    },

    lastSyncAt: {
        type: Date
        // Last time cards were synced
    },

    lastError: {
        message: String,
        code: String,
        occurredAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalCardsSynced: {
            type: Number,
            default: 0
        },
        totalCardsCreated: {
            type: Number,
            default: 0
        },
        totalCardsUpdated: {
            type: Number,
            default: 0
        },
        totalComments: {
            type: Number,
            default: 0
        },
        failedSyncs: {
            type: Number,
            default: 0
        },
        lastCardSyncedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    disconnectedAt: {
        type: Date
    },

    disconnectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    disconnectReason: {
        type: String
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
trelloIntegrationSchema.index({ firmId: 1, isActive: 1 });
trelloIntegrationSchema.index({ firmId: 1, userId: 1 }, { unique: true });
trelloIntegrationSchema.index({ trelloMemberId: 1 });
trelloIntegrationSchema.index({ 'taskMapping.cardId': 1 });
trelloIntegrationSchema.index({ 'taskMapping.taskId': 1 });
trelloIntegrationSchema.index({ 'boards.boardId': 1 });

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════
// Apply encryption to sensitive fields
trelloIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['accessToken', 'tokenSecret']
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if integration is active and connected
 */
trelloIntegrationSchema.methods.isConnected = function() {
    return this.isActive && !this.disconnectedAt;
};

/**
 * Disconnect integration
 */
trelloIntegrationSchema.methods.disconnect = async function(userId, reason) {
    this.isActive = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;
    return await this.save();
};

/**
 * Update last sync timestamp
 */
trelloIntegrationSchema.methods.recordSync = async function() {
    this.lastSyncAt = new Date();
    return await this.save();
};

/**
 * Increment sync stats
 */
trelloIntegrationSchema.methods.incrementStats = async function(type = 'synced', success = true) {
    if (success) {
        switch (type) {
            case 'synced':
                this.stats.totalCardsSynced += 1;
                break;
            case 'created':
                this.stats.totalCardsCreated += 1;
                break;
            case 'updated':
                this.stats.totalCardsUpdated += 1;
                break;
            case 'comment':
                this.stats.totalComments += 1;
                break;
        }
        this.stats.lastCardSyncedAt = new Date();
        this.lastSyncAt = new Date();
        this.lastError = null;
    } else {
        this.stats.failedSyncs += 1;
    }
    return await this.save();
};

/**
 * Record error
 */
trelloIntegrationSchema.methods.recordError = async function(error) {
    this.lastError = {
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
        occurredAt: new Date()
    };
    this.stats.failedSyncs += 1;
    return await this.save();
};

/**
 * Add or update board
 */
trelloIntegrationSchema.methods.addBoard = function(boardData) {
    const existing = this.boards.find(b => b.boardId === boardData.boardId);

    if (existing) {
        Object.assign(existing, boardData);
    } else {
        this.boards.push(boardData);
    }

    return this.save();
};

/**
 * Remove board
 */
trelloIntegrationSchema.methods.removeBoard = function(boardId) {
    this.boards = this.boards.filter(b => b.boardId !== boardId);

    // Update default board if removed
    if (this.syncSettings.defaultBoardId === boardId) {
        this.syncSettings.defaultBoardId = this.boards.length > 0
            ? this.boards[0].boardId
            : null;
        this.syncSettings.defaultBoardName = this.boards.length > 0
            ? this.boards[0].name
            : null;
    }

    return this.save();
};

/**
 * Add task mapping
 */
trelloIntegrationSchema.methods.addTaskMapping = function(mappingData) {
    // Check if mapping already exists
    const existing = this.taskMapping.find(
        m => m.taskId.toString() === mappingData.taskId.toString() && m.taskType === mappingData.taskType
    );

    if (existing) {
        Object.assign(existing, mappingData);
        existing.lastSyncAt = new Date();
    } else {
        this.taskMapping.push(mappingData);
    }

    return this.save();
};

/**
 * Remove task mapping
 */
trelloIntegrationSchema.methods.removeTaskMapping = function(taskId, taskType) {
    this.taskMapping = this.taskMapping.filter(
        m => !(m.taskId.toString() === taskId.toString() && m.taskType === taskType)
    );

    return this.save();
};

/**
 * Get mapping by card ID
 */
trelloIntegrationSchema.methods.getMappingByCardId = function(cardId) {
    return this.taskMapping.find(m => m.cardId === cardId);
};

/**
 * Get mapping by task ID
 */
trelloIntegrationSchema.methods.getMappingByTaskId = function(taskId, taskType) {
    return this.taskMapping.find(
        m => m.taskId.toString() === taskId.toString() && m.taskType === taskType
    );
};

/**
 * Update notification preferences
 */
trelloIntegrationSchema.methods.updateNotificationPreferences = function(preferences) {
    Object.assign(this.syncSettings.notifications, preferences);
    return this.save();
};

/**
 * Check if notification type is enabled
 */
trelloIntegrationSchema.methods.isNotificationEnabled = function(notificationType) {
    return this.syncSettings.notifications[notificationType] !== false;
};

/**
 * Add webhook
 */
trelloIntegrationSchema.methods.addWebhook = function(webhookData) {
    const existing = this.webhooks.find(w => w.webhookId === webhookData.webhookId);

    if (!existing) {
        this.webhooks.push(webhookData);
    }

    return this.save();
};

/**
 * Remove webhook
 */
trelloIntegrationSchema.methods.removeWebhook = function(webhookId) {
    this.webhooks = this.webhooks.filter(w => w.webhookId !== webhookId);
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active integration for firm
 */
trelloIntegrationSchema.statics.findActiveIntegration = async function(firmId) {
    return await this.findOne({
        firmId,
        isActive: true
    }).select('+accessToken +tokenSecret');
};

/**
 * Find by member ID
 */
trelloIntegrationSchema.statics.findByMemberId = async function(trelloMemberId) {
    return await this.findOne({ trelloMemberId, isActive: true });
};

/**
 * Get integration stats for firm
 */
trelloIntegrationSchema.statics.getStats = async function(firmId) {
    const integration = await this.findOne({ firmId, isActive: true });

    if (!integration) {
        return null;
    }

    return {
        fullName: integration.fullName,
        connectedAt: integration.connectedAt,
        lastSyncAt: integration.lastSyncAt,
        totalCardsSynced: integration.stats.totalCardsSynced,
        totalCardsCreated: integration.stats.totalCardsCreated,
        totalCardsUpdated: integration.stats.totalCardsUpdated,
        totalComments: integration.stats.totalComments,
        failedSyncs: integration.stats.failedSyncs,
        lastCardSyncedAt: integration.stats.lastCardSyncedAt,
        boardsConfigured: integration.boards.length,
        activeMappings: integration.taskMapping.length
    };
};

/**
 * Check if firm has active Trello integration
 */
trelloIntegrationSchema.statics.hasActiveIntegration = async function(firmId) {
    const count = await this.countDocuments({ firmId, isActive: true });
    return count > 0;
};

/**
 * Find mapping by card ID across all integrations
 */
trelloIntegrationSchema.statics.findMappingByCardId = async function(cardId) {
    const integration = await this.findOne({
        'taskMapping.cardId': cardId,
        isActive: true
    });

    if (!integration) {
        return null;
    }

    const mapping = integration.taskMapping.find(m => m.cardId === cardId);
    return {
        integration,
        mapping
    };
};

module.exports = mongoose.model('TrelloIntegration', trelloIntegrationSchema);
