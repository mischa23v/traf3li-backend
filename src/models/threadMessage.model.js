const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Tracking value schema for field changes (Odoo-style)
const trackingValueSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    field_desc: {
        type: String,
        required: true
    },
    field_type: {
        type: String,
        enum: ['char', 'integer', 'float', 'datetime', 'boolean', 'monetary', 'selection', 'many2one'],
        required: true
    },
    old_value_char: String,
    new_value_char: String,
    old_value_integer: Number,
    new_value_integer: Number,
    old_value_float: Number,
    new_value_float: Number,
    old_value_datetime: Date,
    new_value_datetime: Date,
    old_value_monetary: Number,
    new_value_monetary: Number,
    currency_id: {
        type: String,
        default: 'SAR'
    }
}, { _id: false });

const threadMessageSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // RESOURCE REFERENCE (Polymorphic)
    // ═══════════════════════════════════════════════════════════════
    res_model: {
        type: String,
        required: true,
        index: true,
        trim: true
        // Examples: 'Case', 'Client', 'Lead', 'Task', 'Invoice', 'Expense', etc.
    },
    res_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
        // The document ID of the resource
    },

    // ═══════════════════════════════════════════════════════════════
    // THREADING
    // ═══════════════════════════════════════════════════════════════
    parent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ThreadMessage',
        required: false
        // For threaded replies
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE TYPE & SUBTYPE
    // ═══════════════════════════════════════════════════════════════
    message_type: {
        type: String,
        enum: ['comment', 'notification', 'email', 'activity_done', 'stage_change', 'auto_log', 'note', 'activity', 'tracking'],
        default: 'comment',
        index: true
    },
    subtype: {
        type: String,
        required: false,
        trim: true
        // Examples: 'note', 'status_change', 'assignment', 'field_update', 'document_attached'
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTENT
    // ═══════════════════════════════════════════════════════════════
    subject: {
        type: String,
        trim: true,
        maxlength: 500
    },
    body: {
        type: String,
        required: false
        // HTML content
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTHOR & RECIPIENTS
    // ═══════════════════════════════════════════════════════════════
    author_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    partner_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Mentioned/notified users
    }],

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachment_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],

    // ═══════════════════════════════════════════════════════════════
    // FIELD TRACKING (Odoo-style tracking)
    // ═══════════════════════════════════════════════════════════════
    tracking_value_ids: [trackingValueSchema],

    // ═══════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════
    is_internal: {
        type: Boolean,
        default: false,
        index: true
        // true = internal note, false = public message
    },

    // ═══════════════════════════════════════════════════════════════
    // STARRING (Favorites)
    // ═══════════════════════════════════════════════════════════════
    starred_partner_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Users who starred this message
    }],

    // ═══════════════════════════════════════════════════════════════
    // EMAIL INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    email_from: {
        type: String,
        trim: true
    },
    email_cc: {
        type: String,
        trim: true
    },
    reply_to: {
        type: String,
        trim: true
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
// Compound index for efficient queries by resource
threadMessageSchema.index({ firmId: 1, res_model: 1, res_id: 1, createdAt: -1 });

// Index for author activity timeline
threadMessageSchema.index({ firmId: 1, author_id: 1, createdAt: -1 });

// Index for resource queries
threadMessageSchema.index({ res_model: 1, res_id: 1 });

// Index for message type filtering
threadMessageSchema.index({ message_type: 1, createdAt: -1 });

// Index for threading
threadMessageSchema.index({ parent_id: 1 });

// Index for internal vs public filtering
threadMessageSchema.index({ res_model: 1, res_id: 1, is_internal: 1 });

// Text index for full-text search on subject and body
threadMessageSchema.index({ subject: 'text', body: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL: is_starred
// Check if current user has starred this message
// ═══════════════════════════════════════════════════════════════
threadMessageSchema.virtual('is_starred').get(function() {
    // This should be set by the query based on current user
    return this._starred || false;
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get messages for a specific record with pagination
 * @param {String} res_model - The model name (e.g., 'Case', 'Client')
 * @param {ObjectId} res_id - The document ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Messages with pagination info
 */
threadMessageSchema.statics.getMessagesForRecord = async function(res_model, res_id, options = {}) {
    const {
        page = 1,
        limit = 50,
        message_type = null,
        is_internal = null,
        author_id = null,
        currentUserId = null,
        firmId = null
    } = options;

    const query = {
        res_model,
        res_id: new mongoose.Types.ObjectId(res_id)
    };

    // Filter by firm if provided
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    // Filter by message type
    if (message_type) {
        query.message_type = message_type;
    }

    // Filter by internal/public
    if (is_internal !== null) {
        query.is_internal = is_internal;
    }

    // Filter by author
    if (author_id) {
        query.author_id = new mongoose.Types.ObjectId(author_id);
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [messages, total] = await Promise.all([
        this.find(query)
            .populate('author_id', 'firstName lastName email avatar')
            .populate('partner_ids', 'firstName lastName email avatar')
            .populate('attachment_ids', 'fileName originalName fileType fileSize url')
            .populate({
                path: 'parent_id',
                select: 'subject body author_id createdAt',
                populate: {
                    path: 'author_id',
                    select: 'firstName lastName avatar'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    // Add is_starred virtual field based on current user
    if (currentUserId) {
        messages.forEach(msg => {
            msg.is_starred = msg.starred_partner_ids?.some(
                id => id.toString() === currentUserId.toString()
            ) || false;
        });
    }

    return {
        messages,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Post a new message to a record
 * @param {Object} data - Message data
 * @returns {Promise<Object>} Created message
 */
threadMessageSchema.statics.postMessage = async function(data) {
    const {
        firmId,
        res_model,
        res_id,
        parent_id,
        message_type = 'comment',
        subtype,
        subject,
        body,
        author_id,
        partner_ids = [],
        attachment_ids = [],
        is_internal = false,
        email_from,
        email_cc,
        reply_to
    } = data;

    // Validate required fields
    if (!res_model || !res_id || !author_id) {
        throw new Error('res_model, res_id, and author_id are required');
    }

    const message = await this.create({
        firmId,
        res_model,
        res_id,
        parent_id,
        message_type,
        subtype,
        subject,
        body,
        author_id,
        partner_ids,
        attachment_ids,
        is_internal,
        email_from,
        email_cc,
        reply_to
    });

    // Populate references before returning
    await message.populate([
        { path: 'author_id', select: 'firstName lastName email avatar' },
        { path: 'partner_ids', select: 'firstName lastName email avatar' },
        { path: 'attachment_ids', select: 'fileName originalName fileType fileSize url' }
    ]);

    // Send notifications to followers
    try {
        const chatterNotificationService = require('../services/chatterNotification.service');
        await chatterNotificationService.notifyFollowers(message);
    } catch (error) {
        logger.error('Failed to send chatter notifications:', error.message);
        // Don't throw - notification failures shouldn't block message creation
    }

    return message;
};

/**
 * Log field changes for a record (auto-log tracking)
 * @param {String} res_model - The model name
 * @param {ObjectId} res_id - The document ID
 * @param {Array} changes - Array of field changes
 * @param {ObjectId} authorId - User who made the changes
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} Created tracking message
 */
threadMessageSchema.statics.logFieldChanges = async function(res_model, res_id, changes, authorId, firmId = null) {
    if (!changes || changes.length === 0) {
        return null;
    }

    // Build tracking values
    const tracking_value_ids = changes.map(change => {
        const trackingValue = {
            field: change.field,
            field_desc: change.field_desc || change.field,
            field_type: change.field_type || 'char'
        };

        // Set old/new values based on field type
        switch (change.field_type) {
            case 'integer':
                trackingValue.old_value_integer = change.old_value;
                trackingValue.new_value_integer = change.new_value;
                trackingValue.old_value_char = String(change.old_value || '');
                trackingValue.new_value_char = String(change.new_value || '');
                break;
            case 'float':
                trackingValue.old_value_float = change.old_value;
                trackingValue.new_value_float = change.new_value;
                trackingValue.old_value_char = String(change.old_value || '');
                trackingValue.new_value_char = String(change.new_value || '');
                break;
            case 'datetime':
                trackingValue.old_value_datetime = change.old_value;
                trackingValue.new_value_datetime = change.new_value;
                trackingValue.old_value_char = change.old_value ? new Date(change.old_value).toISOString() : '';
                trackingValue.new_value_char = change.new_value ? new Date(change.new_value).toISOString() : '';
                break;
            case 'monetary':
                trackingValue.old_value_monetary = change.old_value;
                trackingValue.new_value_monetary = change.new_value;
                trackingValue.old_value_char = change.old_value ? `${change.old_value} ${change.currency_id || 'SAR'}` : '';
                trackingValue.new_value_char = change.new_value ? `${change.new_value} ${change.currency_id || 'SAR'}` : '';
                trackingValue.currency_id = change.currency_id || 'SAR';
                break;
            case 'boolean':
                trackingValue.old_value_char = change.old_value ? 'Yes' : 'No';
                trackingValue.new_value_char = change.new_value ? 'Yes' : 'No';
                break;
            default: // char, selection, many2one
                trackingValue.old_value_char = String(change.old_value || '');
                trackingValue.new_value_char = String(change.new_value || '');
        }

        return trackingValue;
    });

    // Build readable body from tracking values
    const changesList = tracking_value_ids.map(tv => {
        return `<li><strong>${tv.field_desc}</strong>: ${tv.old_value_char || '(empty)'} → ${tv.new_value_char || '(empty)'}</li>`;
    }).join('');
    const body = `<ul>${changesList}</ul>`;

    // Create tracking message
    const message = await this.create({
        firmId,
        res_model,
        res_id,
        message_type: 'auto_log',
        subtype: 'field_update',
        subject: 'Field Updates',
        body,
        author_id: authorId,
        tracking_value_ids,
        is_internal: false
    });

    await message.populate('author_id', 'firstName lastName email avatar');

    // Send notifications to followers
    try {
        const chatterNotificationService = require('../services/chatterNotification.service');
        await chatterNotificationService.notifyFollowers(message);
    } catch (error) {
        logger.error('Failed to send chatter notifications for field changes:', error.message);
        // Don't throw - notification failures shouldn't block message creation
    }

    return message;
};

/**
 * Get activity timeline for a user
 * @param {ObjectId} authorId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Messages
 */
threadMessageSchema.statics.getUserTimeline = async function(authorId, options = {}) {
    const {
        limit = 50,
        skip = 0,
        firmId = null,
        res_model = null,
        startDate = null,
        endDate = null
    } = options;

    const query = {
        author_id: new mongoose.Types.ObjectId(authorId)
    };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    if (res_model) {
        query.res_model = res_model;
    }

    // Date range
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return await this.find(query)
        .populate('author_id', 'firstName lastName email avatar')
        .populate('partner_ids', 'firstName lastName email avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
};

/**
 * Star/unstar a message for a user
 * @param {ObjectId} messageId - Message ID
 * @param {ObjectId} userId - User ID
 * @param {Boolean} star - true to star, false to unstar
 * @returns {Promise<Object>} Updated message
 */
threadMessageSchema.statics.toggleStar = async function(messageId, userId, star = true) {
    const update = star
        ? { $addToSet: { starred_partner_ids: userId } }
        : { $pull: { starred_partner_ids: userId } };

    return await this.findByIdAndUpdate(
        messageId,
        update,
        { new: true }
    ).populate('author_id', 'firstName lastName email avatar');
};

/**
 * Get unread message count for a user on a specific record
 * @param {String} res_model - The model name
 * @param {ObjectId} res_id - The document ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
threadMessageSchema.statics.getUnreadCount = async function(res_model, res_id, userId) {
    // This is a placeholder - requires a read tracking mechanism
    // Similar to Odoo's mail.message.partner table
    // For now, return 0 - implement when adding read tracking
    return 0;
};

module.exports = mongoose.model('ThreadMessage', threadMessageSchema);
