const mongoose = require('mongoose');

// Member entry schema
const memberSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['lead', 'contact', 'client'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'members.entityType'
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    name: String,
    status: {
        type: String,
        enum: ['active', 'unsubscribed', 'bounced', 'complained'],
        default: 'active'
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: false });

// Dynamic criteria for smart lists
const criteriaSchema = new mongoose.Schema({
    field: { type: String, required: true },
    operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'in', 'not_in', 'is_empty', 'is_not_empty', 'between'],
        required: true
    },
    value: mongoose.Schema.Types.Mixed,
    valueEnd: mongoose.Schema.Types.Mixed // For 'between' operator
}, { _id: false });

const contactListSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Identification
    listId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000
    },

    // List type
    listType: {
        type: String,
        enum: ['static', 'dynamic'],
        default: 'static'
    },

    // Entity type this list targets
    entityType: {
        type: String,
        enum: ['lead', 'contact', 'client', 'mixed'],
        default: 'mixed'
    },

    // Static list members
    members: [memberSchema],
    memberCount: {
        type: Number,
        default: 0
    },

    // Dynamic list criteria (for smart lists)
    criteria: [criteriaSchema],
    criteriaLogic: {
        type: String,
        enum: ['and', 'or'],
        default: 'and'
    },

    // Stats
    stats: {
        totalEmails: { type: Number, default: 0 },
        validEmails: { type: Number, default: 0 },
        unsubscribed: { type: Number, default: 0 },
        bounced: { type: Number, default: 0 },
        lastRefreshed: Date
    },

    // Usage
    usedInCampaigns: [{
        campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
        campaignName: String,
        usedAt: Date
    }],

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    },

    // Access control
    isPrivate: {
        type: Boolean,
        default: false
    },
    sharedWith: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Metadata
    tags: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
contactListSchema.index({ firmId: 1, status: 1 });
contactListSchema.index({ firmId: 1, listType: 1 });
contactListSchema.index({ firmId: 1, entityType: 1 });
contactListSchema.index({ 'members.entityId': 1 });
contactListSchema.index({ 'members.email': 1 });
contactListSchema.index({ tags: 1 });

// Generate list ID
contactListSchema.pre('save', async function(next) {
    if (!this.listId) {
        const count = await this.constructor.countDocuments({ firmId: this.firmId });
        this.listId = `LIST-${String(count + 1).padStart(5, '0')}`;
    }

    // Update member count for static lists
    if (this.listType === 'static') {
        this.memberCount = this.members?.length || 0;
        this.stats.totalEmails = this.members?.filter(m => m.email).length || 0;
        this.stats.validEmails = this.members?.filter(m => m.email && m.status === 'active').length || 0;
        this.stats.unsubscribed = this.members?.filter(m => m.status === 'unsubscribed').length || 0;
        this.stats.bounced = this.members?.filter(m => m.status === 'bounced').length || 0;
    }

    next();
});

// Instance methods
contactListSchema.methods.addMember = async function(entityType, entityId, email, name, userId) {
    const exists = this.members.some(m =>
        m.entityType === entityType && m.entityId.toString() === entityId.toString()
    );

    if (!exists) {
        this.members.push({
            entityType,
            entityId,
            email,
            name,
            addedBy: userId
        });
        await this.save();
        return true;
    }
    return false;
};

contactListSchema.methods.removeMember = async function(entityId) {
    this.members = this.members.filter(m => m.entityId.toString() !== entityId.toString());
    await this.save();
};

// Static methods
contactListSchema.statics.getLists = async function(firmId, filters = {}) {
    const query = { firmId, status: { $ne: 'archived' } };
    if (filters.listType) query.listType = filters.listType;
    if (filters.entityType) query.entityType = filters.entityType;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);
};

module.exports = mongoose.model('ContactList', contactListSchema);
