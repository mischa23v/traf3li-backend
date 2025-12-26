const mongoose = require('mongoose');
const Counter = require('./counter.model');

/**
 * Ticket Model - Support Ticket Management
 *
 * This model manages support tickets for the customer support module.
 * Supports ticket lifecycle from creation to resolution with SLA tracking,
 * communications, attachments, and custom fields.
 */

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION SUBDOCUMENT (Embedded in ticket)
// ═══════════════════════════════════════════════════════════════
const communicationSchema = new mongoose.Schema({
    communicationId: {
        type: String,
        required: true,
        comment: 'Unique identifier for the communication'
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User ID of the sender (null for system messages)'
    },

    senderName: {
        type: String,
        required: true,
        trim: true,
        comment: 'Display name of the sender'
    },

    senderType: {
        type: String,
        enum: ['customer', 'agent', 'system'],
        required: true,
        comment: 'Type of sender'
    },

    content: {
        type: String,
        required: true,
        comment: 'Message content'
    },

    contentType: {
        type: String,
        enum: ['text', 'html'],
        default: 'text',
        comment: 'Content format type'
    },

    attachments: [{
        fileName: {
            type: String,
            required: true,
            trim: true
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true
        },
        fileSize: {
            type: Number,
            comment: 'File size in bytes'
        },
        mimeType: {
            type: String,
            trim: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    sentVia: {
        type: String,
        enum: ['email', 'portal', 'phone', 'chat', 'whatsapp'],
        default: 'portal',
        comment: 'Channel through which the message was sent'
    },

    isInternal: {
        type: Boolean,
        default: false,
        comment: 'True for internal notes not visible to customers'
    },

    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    }
}, { _id: true, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// ATTACHMENT SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const attachmentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        trim: true
    },

    fileUrl: {
        type: String,
        required: true,
        trim: true
    },

    fileSize: {
        type: Number,
        comment: 'File size in bytes'
    },

    mimeType: {
        type: String,
        trim: true
    },

    uploadedAt: {
        type: Date,
        default: Date.now
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// TICKET SCHEMA
// ═══════════════════════════════════════════════════════════════
const ticketSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    ticketId: {
        type: String,
        unique: true,
        required: true,
        index: true,
        comment: 'Auto-generated ticket ID (e.g., TKT-20231215-0001)'
    },

    ticketNumber: {
        type: Number,
        unique: true,
        required: true,
        index: true,
        comment: 'Sequential ticket number'
    },

    // ═══════════════════════════════════════════════════════════════
    // TICKET DETAILS
    // ═══════════════════════════════════════════════════════════════
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
        comment: 'Ticket subject/title'
    },

    description: {
        type: String,
        required: true,
        comment: 'Detailed description of the issue'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & PRIORITY
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['open', 'replied', 'resolved', 'closed', 'on_hold'],
        default: 'open',
        required: true,
        index: true,
        comment: 'Current ticket status'
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        required: true,
        index: true,
        comment: 'Ticket priority level'
    },

    ticketType: {
        type: String,
        enum: ['question', 'problem', 'feature_request', 'incident', 'service_request'],
        default: 'question',
        required: true,
        index: true,
        comment: 'Type/category of the ticket'
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
        comment: 'User who raised the ticket'
    },

    raisedByName: {
        type: String,
        required: true,
        trim: true,
        comment: 'Name of the user who raised the ticket'
    },

    raisedByEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        comment: 'Email of the user who raised the ticket'
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
        comment: 'Support agent assigned to this ticket'
    },

    assignedToName: {
        type: String,
        trim: true,
        comment: 'Name of the assigned agent'
    },

    assignedAt: {
        type: Date,
        comment: 'When the ticket was assigned'
    },

    // ═══════════════════════════════════════════════════════════════
    // CLIENT REFERENCE
    // ═══════════════════════════════════════════════════════════════
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false,
        index: true,
        comment: 'Reference to the client (if applicable)'
    },

    clientName: {
        type: String,
        trim: true,
        comment: 'Name of the client'
    },

    // ═══════════════════════════════════════════════════════════════
    // SLA TRACKING
    // ═══════════════════════════════════════════════════════════════
    slaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SLA',
        required: false,
        index: true,
        comment: 'SLA policy applied to this ticket'
    },

    slaStatus: {
        type: String,
        enum: ['within_sla', 'warning', 'breached'],
        default: 'within_sla',
        index: true,
        comment: 'Current SLA compliance status'
    },

    firstResponseTime: {
        type: Date,
        comment: 'When the first response was sent'
    },

    firstResponseDue: {
        type: Date,
        index: true,
        comment: 'SLA deadline for first response'
    },

    resolutionTime: {
        type: Date,
        comment: 'When the ticket was resolved'
    },

    resolutionDue: {
        type: Date,
        index: true,
        comment: 'SLA deadline for resolution'
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMUNICATIONS (Embedded)
    // ═══════════════════════════════════════════════════════════════
    communications: {
        type: [communicationSchema],
        default: [],
        comment: 'All communications related to this ticket'
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: {
        type: [attachmentSchema],
        default: [],
        comment: 'Files attached to the ticket'
    },

    // ═══════════════════════════════════════════════════════════════
    // CATEGORIZATION
    // ═══════════════════════════════════════════════════════════════
    tags: {
        type: [String],
        default: [],
        index: true,
        comment: 'Tags for categorization and search'
    },

    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {},
        comment: 'Custom fields for additional data'
    },

    // ═══════════════════════════════════════════════════════════════
    // RESOLUTION TRACKING
    // ═══════════════════════════════════════════════════════════════
    resolvedAt: {
        type: Date,
        index: true,
        comment: 'When the ticket was marked as resolved'
    },

    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'User who resolved the ticket'
    },

    resolutionNotes: {
        type: String,
        comment: 'Notes about the resolution'
    },

    closedAt: {
        type: Date,
        index: true,
        comment: 'When the ticket was closed'
    },

    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'User who closed the ticket'
    },

    // ═══════════════════════════════════════════════════════════════
    // RATINGS & FEEDBACK
    // ═══════════════════════════════════════════════════════════════
    rating: {
        type: Number,
        min: 1,
        max: 5,
        comment: 'Customer satisfaction rating (1-5)'
    },

    feedback: {
        type: String,
        comment: 'Customer feedback on resolution'
    },

    feedbackDate: {
        type: Date,
        comment: 'When feedback was provided'
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
        comment: 'Firm this ticket belongs to'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who created this ticket'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who last updated this ticket'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
ticketSchema.index({ firmId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ firmId: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ firmId: 1, assignedTo: 1, status: 1 });
ticketSchema.index({ firmId: 1, raisedBy: 1, createdAt: -1 });
ticketSchema.index({ firmId: 1, clientId: 1, createdAt: -1 });
ticketSchema.index({ firmId: 1, ticketType: 1, createdAt: -1 });
ticketSchema.index({ firmId: 1, slaStatus: 1, createdAt: -1 });
ticketSchema.index({ firmId: 1, tags: 1 });
ticketSchema.index({ firmId: 1, firstResponseDue: 1 });
ticketSchema.index({ firmId: 1, resolutionDue: 1 });
ticketSchema.index({ raisedByEmail: 1, firmId: 1 });

// Text search index
ticketSchema.index({
    subject: 'text',
    description: 'text',
    'communications.content': 'text'
});

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
ticketSchema.virtual('isOpen').get(function() {
    return ['open', 'replied', 'on_hold'].includes(this.status);
});

ticketSchema.virtual('isResolved').get(function() {
    return this.status === 'resolved' || this.status === 'closed';
});

ticketSchema.virtual('responseTime').get(function() {
    if (this.firstResponseTime && this.createdAt) {
        return this.firstResponseTime - this.createdAt;
    }
    return null;
});

ticketSchema.virtual('totalResolutionTime').get(function() {
    if (this.resolvedAt && this.createdAt) {
        return this.resolvedAt - this.createdAt;
    }
    return null;
});

ticketSchema.virtual('communicationCount').get(function() {
    return this.communications ? this.communications.length : 0;
});

ticketSchema.virtual('lastCommunication').get(function() {
    if (this.communications && this.communications.length > 0) {
        return this.communications[this.communications.length - 1];
    }
    return null;
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate next ticket ID
 * @param {Date} date - Date for the ticket ID (defaults to now)
 * @returns {Promise<String>} - Formatted ticket ID (e.g., TKT-20231215-0001)
 */
ticketSchema.statics.generateTicketId = async function(date = new Date()) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const counterId = `ticket-${dateStr}`;
    const seq = await Counter.getNextSequence(counterId);
    return `TKT-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Get open tickets for a firm
 */
ticketSchema.statics.getOpenTickets = async function(firmId, filters = {}) {
    const query = {
        firmId,
        status: { $in: ['open', 'replied', 'on_hold'] },
        ...filters
    };

    return await this.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .populate('assignedTo', 'firstName lastName email')
        .populate('raisedBy', 'firstName lastName email')
        .lean();
};

/**
 * Get tickets assigned to a specific agent
 */
ticketSchema.statics.getAgentTickets = async function(agentId, firmId, status = null) {
    const query = { assignedTo: agentId, firmId };
    if (status) {
        query.status = status;
    }

    return await this.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .populate('raisedBy', 'firstName lastName email')
        .lean();
};

/**
 * Get tickets by customer
 */
ticketSchema.statics.getCustomerTickets = async function(userId, firmId) {
    return await this.find({ raisedBy: userId, firmId })
        .sort({ createdAt: -1 })
        .populate('assignedTo', 'firstName lastName')
        .lean();
};

/**
 * Get SLA breach warnings
 */
ticketSchema.statics.getSLABreachWarnings = async function(firmId) {
    const now = new Date();

    return await this.find({
        firmId,
        status: { $in: ['open', 'replied', 'on_hold'] },
        $or: [
            { firstResponseDue: { $lte: now }, firstResponseTime: null },
            { resolutionDue: { $lte: now }, resolvedAt: null }
        ]
    })
        .sort({ priority: -1, createdAt: 1 })
        .populate('assignedTo', 'firstName lastName email')
        .populate('raisedBy', 'firstName lastName email')
        .lean();
};

/**
 * Get ticket statistics
 */
ticketSchema.statics.getStats = async function(firmId, dateRange = {}) {
    const matchQuery = { firmId };

    if (dateRange.startDate || dateRange.endDate) {
        matchQuery.createdAt = {};
        if (dateRange.startDate) matchQuery.createdAt.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) matchQuery.createdAt.$lte = new Date(dateRange.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $facet: {
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                byPriority: [
                    { $group: { _id: '$priority', count: { $sum: 1 } } }
                ],
                byType: [
                    { $group: { _id: '$ticketType', count: { $sum: 1 } } }
                ],
                bySLA: [
                    { $group: { _id: '$slaStatus', count: { $sum: 1 } } }
                ],
                total: [
                    { $count: 'count' }
                ],
                avgResponseTime: [
                    { $match: { firstResponseTime: { $exists: true } } },
                    {
                        $project: {
                            responseTime: {
                                $subtract: ['$firstResponseTime', '$createdAt']
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgResponseTime: { $avg: '$responseTime' }
                        }
                    }
                ],
                avgResolutionTime: [
                    { $match: { resolvedAt: { $exists: true } } },
                    {
                        $project: {
                            resolutionTime: {
                                $subtract: ['$resolvedAt', '$createdAt']
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgResolutionTime: { $avg: '$resolutionTime' }
                        }
                    }
                ],
                avgRating: [
                    { $match: { rating: { $exists: true } } },
                    {
                        $group: {
                            _id: null,
                            avgRating: { $avg: '$rating' },
                            ratedCount: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);

    const result = stats[0];

    return {
        total: result.total[0]?.count || 0,
        byStatus: result.byStatus,
        byPriority: result.byPriority,
        byType: result.byType,
        bySLA: result.bySLA,
        avgResponseTimeMs: result.avgResponseTime[0]?.avgResponseTime || null,
        avgResolutionTimeMs: result.avgResolutionTime[0]?.avgResolutionTime || null,
        avgRating: result.avgRating[0]?.avgRating || null,
        ratedCount: result.avgRating[0]?.ratedCount || 0
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add a communication to the ticket
 */
ticketSchema.methods.addCommunication = async function(communicationData, userId = null) {
    const communicationId = `COMM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const communication = {
        communicationId,
        sender: communicationData.sender,
        senderName: communicationData.senderName,
        senderType: communicationData.senderType || 'agent',
        content: communicationData.content,
        contentType: communicationData.contentType || 'text',
        attachments: communicationData.attachments || [],
        sentVia: communicationData.sentVia || 'portal',
        isInternal: communicationData.isInternal || false,
        timestamp: new Date()
    };

    this.communications.push(communication);

    // Update first response time if this is the first agent response
    if (!this.firstResponseTime && communication.senderType === 'agent' && !communication.isInternal) {
        this.firstResponseTime = new Date();
    }

    // Update status to 'replied' if agent responds
    if (communication.senderType === 'agent' && !communication.isInternal) {
        this.status = 'replied';
    }

    this.updatedBy = userId;
    await this.save();
    return communication;
};

/**
 * Assign ticket to an agent
 */
ticketSchema.methods.assignTo = async function(agentId, agentName, userId = null) {
    this.assignedTo = agentId;
    this.assignedToName = agentName;
    this.assignedAt = new Date();
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Update ticket status
 */
ticketSchema.methods.updateStatus = async function(newStatus, userId = null) {
    const oldStatus = this.status;
    this.status = newStatus;

    if (newStatus === 'resolved' && !this.resolvedAt) {
        this.resolvedAt = new Date();
        this.resolvedBy = userId;
    }

    if (newStatus === 'closed' && !this.closedAt) {
        this.closedAt = new Date();
        this.closedBy = userId;
    }

    this.updatedBy = userId;
    await this.save();
    return { oldStatus, newStatus };
};

/**
 * Resolve the ticket
 */
ticketSchema.methods.resolve = async function(resolutionNotes, userId = null) {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    this.resolutionTime = new Date();
    if (resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
    }
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Close the ticket
 */
ticketSchema.methods.close = async function(userId = null) {
    this.status = 'closed';
    this.closedAt = new Date();
    this.closedBy = userId;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Add customer rating and feedback
 */
ticketSchema.methods.addFeedback = async function(rating, feedback = '') {
    this.rating = rating;
    this.feedback = feedback;
    this.feedbackDate = new Date();
    await this.save();
    return this;
};

/**
 * Update SLA status
 */
ticketSchema.methods.updateSLAStatus = async function(status) {
    this.slaStatus = status;
    await this.save();
    return this;
};

/**
 * Add attachment
 */
ticketSchema.methods.addAttachment = async function(attachmentData, userId = null) {
    this.attachments.push({
        fileName: attachmentData.fileName,
        fileUrl: attachmentData.fileUrl,
        fileSize: attachmentData.fileSize,
        mimeType: attachmentData.mimeType,
        uploadedAt: new Date(),
        uploadedBy: userId
    });
    this.updatedBy = userId;
    await this.save();
    return this.attachments[this.attachments.length - 1];
};

/**
 * Add tags
 */
ticketSchema.methods.addTags = async function(tags, userId = null) {
    const newTags = Array.isArray(tags) ? tags : [tags];
    this.tags = [...new Set([...this.tags, ...newTags])];
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Remove tags
 */
ticketSchema.methods.removeTags = async function(tags, userId = null) {
    const tagsToRemove = Array.isArray(tags) ? tags : [tags];
    this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
    this.updatedBy = userId;
    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

// Pre-save hook to auto-generate ticket ID and number
ticketSchema.pre('save', async function(next) {
    if (this.isNew) {
        // Generate ticket number
        if (!this.ticketNumber) {
            this.ticketNumber = await Counter.getNextSequence('ticket');
        }

        // Generate ticket ID
        if (!this.ticketId) {
            this.ticketId = await this.constructor.generateTicketId();
        }

        // Set initial createdBy if not set
        if (!this.createdBy && this.raisedBy) {
            this.createdBy = this.raisedBy;
        }
    }

    next();
});

// Pre-save hook to update updatedBy
ticketSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew && !this.updatedBy) {
        this.updatedBy = this.createdBy;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = mongoose.model('Ticket', ticketSchema);
