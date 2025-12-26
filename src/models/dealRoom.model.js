const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
// PAGE SCHEMA
// Block-based content for collaborative editing
// ═══════════════════════════════════════════════════════════════
const pageSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(12),
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    content: {
        type: mongoose.Schema.Types.Mixed,  // Block-based content (Notion-like structure)
        default: {}
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    version: {
        type: Number,
        default: 1
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// DOCUMENT SCHEMA
// Uploaded files with viewing tracking
// ═══════════════════════════════════════════════════════════════
const viewedBySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    viewedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const documentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    url: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    viewedBy: [viewedBySchema]
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// EXTERNAL ACCESS SCHEMA
// Secure external sharing with granular permissions
// ═══════════════════════════════════════════════════════════════
const externalAccessSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        trim: true
    },
    accessToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    permissions: [{
        type: String,
        enum: ['view', 'comment', 'edit', 'upload', 'download'],
        default: 'view'
    }],
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    lastAccessedAt: {
        type: Date
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// ACTIVITY SCHEMA
// Audit trail for all dealroom actions
// ═══════════════════════════════════════════════════════════════
const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'created',
            'page_created',
            'page_updated',
            'page_deleted',
            'document_uploaded',
            'document_deleted',
            'document_viewed',
            'external_access_granted',
            'external_access_revoked',
            'external_user_viewed',
            'comment_added',
            'settings_updated'
        ]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// DEAL ROOM SCHEMA
// Collaborative workspace for deal management
// ═══════════════════════════════════════════════════════════════
const dealRoomSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // DEAL REFERENCE
    // Link to Lead or Deal entity
    // ═══════════════════════════════════════════════════════════════
    dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFORMATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // ═══════════════════════════════════════════════════════════════
    // COLLABORATIVE PAGES
    // Notion-like pages with block-based content
    // ═══════════════════════════════════════════════════════════════
    pages: [pageSchema],

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS
    // File storage with view tracking
    // ═══════════════════════════════════════════════════════════════
    documents: [documentSchema],

    // ═══════════════════════════════════════════════════════════════
    // EXTERNAL ACCESS
    // Secure sharing with external parties
    // ═══════════════════════════════════════════════════════════════
    externalAccess: [externalAccessSchema],

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY LOG
    // Complete audit trail
    // ═══════════════════════════════════════════════════════════════
    activity: [activitySchema],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
dealRoomSchema.index({ firmId: 1, dealId: 1 });
dealRoomSchema.index({ firmId: 1, createdAt: -1 });
dealRoomSchema.index({ 'externalAccess.accessToken': 1 });
dealRoomSchema.index({ 'externalAccess.expiresAt': 1 });
dealRoomSchema.index({ 'pages.id': 1 });
dealRoomSchema.index({ 'activity.timestamp': -1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate secure access token for external sharing
 */
dealRoomSchema.statics.generateAccessToken = function() {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Get dealroom by deal ID
 */
dealRoomSchema.statics.getByDealId = async function(dealId, firmId) {
    const query = { dealId: new mongoose.Types.ObjectId(dealId) };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    return await this.findOne(query)
        .populate('dealId', 'leadId firstName lastName companyName status')
        .populate('createdBy', 'firstName lastName avatar')
        .populate('lastModifiedBy', 'firstName lastName avatar')
        .populate('pages.createdBy', 'firstName lastName avatar')
        .populate('documents.uploadedBy', 'firstName lastName avatar')
        .populate('activity.userId', 'firstName lastName avatar');
};

/**
 * Verify external access token
 */
dealRoomSchema.statics.verifyAccessToken = async function(accessToken) {
    const dealRoom = await this.findOne({
        'externalAccess.accessToken': accessToken
    });

    if (!dealRoom) {
        return null;
    }

    const access = dealRoom.externalAccess.find(a => a.accessToken === accessToken);

    // Check if token is expired
    if (access && access.expiresAt < new Date()) {
        return null;
    }

    return { dealRoom, access };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add a new page to the dealroom
 */
dealRoomSchema.methods.addPage = async function(title, content, userId) {
    const page = {
        title,
        content,
        createdBy: userId
    };

    this.pages.push(page);

    // Log activity
    this.activity.push({
        type: 'page_created',
        userId,
        details: { pageTitle: title }
    });

    this.lastModifiedBy = userId;
    await this.save();

    return this.pages[this.pages.length - 1];
};

/**
 * Update an existing page
 */
dealRoomSchema.methods.updatePage = async function(pageId, updates, userId) {
    const page = this.pages.find(p => p.id === pageId);

    if (!page) {
        throw new Error('Page not found');
    }

    // Update page fields
    if (updates.title !== undefined) page.title = updates.title;
    if (updates.content !== undefined) page.content = updates.content;

    page.updatedAt = new Date();
    page.version += 1;

    // Log activity
    this.activity.push({
        type: 'page_updated',
        userId,
        details: {
            pageId: page.id,
            pageTitle: page.title,
            version: page.version
        }
    });

    this.lastModifiedBy = userId;
    await this.save();

    return page;
};

/**
 * Upload a document
 */
dealRoomSchema.methods.uploadDocument = async function(document, userId) {
    const doc = {
        ...document,
        uploadedBy: userId,
        viewedBy: []
    };

    this.documents.push(doc);

    // Log activity
    this.activity.push({
        type: 'document_uploaded',
        userId,
        details: { documentName: document.name, documentType: document.type }
    });

    this.lastModifiedBy = userId;
    await this.save();

    return this.documents[this.documents.length - 1];
};

/**
 * Track document view
 */
dealRoomSchema.methods.trackDocumentView = async function(documentIndex, userId) {
    if (documentIndex < 0 || documentIndex >= this.documents.length) {
        throw new Error('Document not found');
    }

    const document = this.documents[documentIndex];

    // Check if user already viewed
    const existingView = document.viewedBy.find(v => v.userId.toString() === userId.toString());

    if (existingView) {
        existingView.viewedAt = new Date();
    } else {
        document.viewedBy.push({ userId, viewedAt: new Date() });
    }

    // Log activity
    this.activity.push({
        type: 'document_viewed',
        userId,
        details: { documentName: document.name }
    });

    await this.save();

    return document;
};

/**
 * Grant external access
 */
dealRoomSchema.methods.grantExternalAccess = async function(accessData, userId) {
    const accessToken = this.constructor.generateAccessToken();

    const access = {
        ...accessData,
        accessToken,
        expiresAt: accessData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
    };

    this.externalAccess.push(access);

    // Log activity
    this.activity.push({
        type: 'external_access_granted',
        userId,
        details: {
            email: access.email,
            name: access.name,
            permissions: access.permissions,
            expiresAt: access.expiresAt
        }
    });

    this.lastModifiedBy = userId;
    await this.save();

    return {
        ...access,
        accessUrl: `/dealrooms/external/${accessToken}`
    };
};

/**
 * Revoke external access
 */
dealRoomSchema.methods.revokeExternalAccess = async function(accessToken, userId) {
    const index = this.externalAccess.findIndex(a => a.accessToken === accessToken);

    if (index === -1) {
        throw new Error('Access not found');
    }

    const access = this.externalAccess[index];
    this.externalAccess.splice(index, 1);

    // Log activity
    this.activity.push({
        type: 'external_access_revoked',
        userId,
        details: {
            email: access.email,
            name: access.name
        }
    });

    this.lastModifiedBy = userId;
    await this.save();

    return true;
};

/**
 * Update last accessed time for external user
 */
dealRoomSchema.methods.updateExternalAccess = async function(accessToken) {
    const access = this.externalAccess.find(a => a.accessToken === accessToken);

    if (access) {
        access.lastAccessedAt = new Date();

        // Log activity (without userId since it's external)
        this.activity.push({
            type: 'external_user_viewed',
            details: {
                email: access.email,
                name: access.name
            }
        });

        await this.save();
    }
};

module.exports = mongoose.model('DealRoom', dealRoomSchema);
