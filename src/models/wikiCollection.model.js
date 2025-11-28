const mongoose = require('mongoose');

const wikiCollectionSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    collectionId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // NAMES & DISPLAY
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 100
    },
    urlSlug: {
        type: String,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    descriptionAr: {
        type: String,
        maxlength: 500
    },
    icon: {
        type: String,
        default: '📁'
    },
    color: {
        type: String,
        default: '#6366f1'
    },

    // ═══════════════════════════════════════════════════════════════
    // HIERARCHY
    // ═══════════════════════════════════════════════════════════════
    parentCollectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiCollection'
    },
    order: {
        type: Number,
        default: 0
    },
    depth: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSOCIATIONS
    // ═══════════════════════════════════════════════════════════════
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // COLLECTION TYPE
    // ═══════════════════════════════════════════════════════════════
    collectionType: {
        type: String,
        enum: [
            'custom',
            'pleadings',
            'evidence',
            'research',
            'correspondence',
            'notes',
            'timeline',
            'witnesses',
            'court_documents',
            'client_communications',
            'internal_memos'
        ],
        default: 'custom'
    },
    isDefault: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    pageCount: {
        type: Number,
        default: 0
    },
    subCollectionCount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // PERMISSIONS
    // ═══════════════════════════════════════════════════════════════
    visibility: {
        type: String,
        enum: ['private', 'case_team', 'firm_wide'],
        default: 'case_team'
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULTS FOR NEW PAGES
    // ═══════════════════════════════════════════════════════════════
    defaultPageType: {
        type: String,
        enum: [
            'note', 'general', 'pleading', 'motion', 'brief', 'petition',
            'timeline', 'evidence_log', 'witness_notes', 'interview_notes', 'deposition',
            'legal_research', 'precedent', 'case_analysis', 'strategy',
            'correspondence', 'client_memo', 'internal_memo', 'meeting_notes',
            'court_documents', 'hearing_notes', 'judgment_analysis', 'template'
        ]
    },
    defaultConfidentialityLevel: {
        type: String,
        enum: ['public', 'internal', 'confidential', 'highly_confidential'],
        default: 'internal'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
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
wikiCollectionSchema.index({ caseId: 1, order: 1 });
wikiCollectionSchema.index({ parentCollectionId: 1, order: 1 });
wikiCollectionSchema.index({ caseId: 1, collectionType: 1 });
wikiCollectionSchema.index({ name: 1, caseId: 1 });
wikiCollectionSchema.index({ urlSlug: 1, caseId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
wikiCollectionSchema.pre('save', async function(next) {
    // Generate collection ID
    if (!this.collectionId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.collectionId = `WCOL-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Generate URL slug
    if (!this.urlSlug && this.name) {
        this.urlSlug = this.name
            .toLowerCase()
            .replace(/[^\w\s\u0600-\u06FF-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);
    }

    // Calculate depth
    if (this.parentCollectionId) {
        const parent = await this.constructor.findById(this.parentCollectionId);
        this.depth = parent ? Math.min(parent.depth + 1, 5) : 0;
    } else {
        this.depth = 0;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get collections for a case
wikiCollectionSchema.statics.getCaseCollections = async function(caseId, options = {}) {
    const query = { caseId: new mongoose.Types.ObjectId(caseId) };

    if (options.parentCollectionId === null) {
        query.parentCollectionId = { $exists: false };
    } else if (options.parentCollectionId) {
        query.parentCollectionId = new mongoose.Types.ObjectId(options.parentCollectionId);
    }

    return await this.find(query)
        .sort({ order: 1, name: 1 })
        .populate('createdBy', 'firstName lastName');
};

// Get collection tree
wikiCollectionSchema.statics.getCollectionTree = async function(caseId) {
    const collections = await this.find({
        caseId: new mongoose.Types.ObjectId(caseId)
    })
    .select('collectionId name nameAr urlSlug icon color parentCollectionId order depth collectionType isDefault pageCount')
    .sort({ order: 1, name: 1 })
    .lean();

    const buildTree = (parentId = null) => {
        return collections
            .filter(c => {
                if (parentId === null) return !c.parentCollectionId;
                return c.parentCollectionId && c.parentCollectionId.toString() === parentId.toString();
            })
            .map(collection => ({
                ...collection,
                children: buildTree(collection._id)
            }));
    };

    return buildTree();
};

// Create default collections for a case
wikiCollectionSchema.statics.createDefaultCollections = async function(caseId, lawyerId, createdBy) {
    const defaultCollections = [
        {
            name: 'Pleadings',
            nameAr: 'المرافعات',
            icon: '📜',
            collectionType: 'pleadings',
            color: '#ef4444',
            order: 0,
            defaultPageType: 'pleading'
        },
        {
            name: 'Evidence',
            nameAr: 'الأدلة',
            icon: '📎',
            collectionType: 'evidence',
            color: '#f97316',
            order: 1,
            defaultPageType: 'evidence_log'
        },
        {
            name: 'Research',
            nameAr: 'البحث القانوني',
            icon: '🔍',
            collectionType: 'research',
            color: '#8b5cf6',
            order: 2,
            defaultPageType: 'legal_research'
        },
        {
            name: 'Correspondence',
            nameAr: 'المراسلات',
            icon: '✉️',
            collectionType: 'correspondence',
            color: '#06b6d4',
            order: 3,
            defaultPageType: 'correspondence'
        },
        {
            name: 'Notes',
            nameAr: 'الملاحظات',
            icon: '📝',
            collectionType: 'notes',
            color: '#22c55e',
            order: 4,
            defaultPageType: 'note'
        },
        {
            name: 'Timeline',
            nameAr: 'الجدول الزمني',
            icon: '📅',
            collectionType: 'timeline',
            color: '#eab308',
            order: 5,
            defaultPageType: 'timeline'
        },
        {
            name: 'Witnesses',
            nameAr: 'الشهود',
            icon: '👥',
            collectionType: 'witnesses',
            color: '#ec4899',
            order: 6,
            defaultPageType: 'witness_notes'
        },
        {
            name: 'Court Documents',
            nameAr: 'وثائق المحكمة',
            icon: '⚖️',
            collectionType: 'court_documents',
            color: '#64748b',
            order: 7,
            defaultPageType: 'court_documents'
        }
    ];

    const collections = defaultCollections.map(collection => ({
        ...collection,
        caseId,
        lawyerId,
        createdBy,
        isDefault: true
    }));

    return await this.insertMany(collections);
};

// Update page count
wikiCollectionSchema.statics.updatePageCount = async function(collectionId) {
    const WikiPage = mongoose.model('WikiPage');

    const count = await WikiPage.countDocuments({
        collectionId: new mongoose.Types.ObjectId(collectionId),
        status: { $nin: ['archived'] }
    });

    await this.findByIdAndUpdate(collectionId, { pageCount: count });

    return count;
};

// Update sub-collection count
wikiCollectionSchema.statics.updateSubCollectionCount = async function(parentCollectionId) {
    const count = await this.countDocuments({
        parentCollectionId: new mongoose.Types.ObjectId(parentCollectionId)
    });

    await this.findByIdAndUpdate(parentCollectionId, { subCollectionCount: count });

    return count;
};

// Move collection
wikiCollectionSchema.statics.moveCollection = async function(collectionId, newParentId, newOrder) {
    const collection = await this.findById(collectionId);
    if (!collection) throw new Error('Collection not found');

    const oldParentId = collection.parentCollectionId;

    collection.parentCollectionId = newParentId || undefined;
    collection.order = newOrder;

    // Recalculate depth
    if (newParentId) {
        const parent = await this.findById(newParentId);
        collection.depth = parent ? Math.min(parent.depth + 1, 5) : 0;
    } else {
        collection.depth = 0;
    }

    await collection.save();

    // Update counts
    if (oldParentId) {
        await this.updateSubCollectionCount(oldParentId);
    }
    if (newParentId) {
        await this.updateSubCollectionCount(newParentId);
    }

    return collection;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Delete collection and move pages to parent
wikiCollectionSchema.methods.deleteAndMovePages = async function() {
    const WikiPage = mongoose.model('WikiPage');

    // Move all pages to parent collection (or root)
    await WikiPage.updateMany(
        { collectionId: this._id },
        { $set: { collectionId: this.parentCollectionId || null } }
    );

    // Move sub-collections to parent
    await this.constructor.updateMany(
        { parentCollectionId: this._id },
        { $set: { parentCollectionId: this.parentCollectionId || null } }
    );

    // Update parent's counts
    if (this.parentCollectionId) {
        await this.constructor.updateSubCollectionCount(this.parentCollectionId);
        await this.constructor.updatePageCount(this.parentCollectionId);
    }

    // Delete the collection
    await this.deleteOne();

    return true;
};

module.exports = mongoose.model('WikiCollection', wikiCollectionSchema);
