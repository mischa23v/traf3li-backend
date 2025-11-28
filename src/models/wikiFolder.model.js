const mongoose = require('mongoose');

const wikiFolderSchema = new mongoose.Schema({
    // Identification
    folderId: {
        type: String,
        unique: true,
        index: true
    },

    // Names
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
    description: {
        type: String,
        maxlength: 500
    },

    // Display
    icon: {
        type: String,
        default: 'folder'
    },
    color: {
        type: String,
        default: '#6366f1'
    },

    // Hierarchy
    parentFolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiFolder'
    },
    order: {
        type: Number,
        default: 0
    },
    depth: {
        type: Number,
        default: 0
    },
    path: {
        type: String,
        index: true
    },

    // Associations
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

    // Folder type (for default folders)
    folderType: {
        type: String,
        enum: ['custom', 'pleadings', 'evidence', 'research', 'correspondence', 'notes', 'timeline', 'witnesses'],
        default: 'custom'
    },
    isDefault: {
        type: Boolean,
        default: false
    },

    // Metadata
    pageCount: {
        type: Number,
        default: 0
    },
    subfolderCount: {
        type: Number,
        default: 0
    },

    // Permissions
    visibility: {
        type: String,
        enum: ['private', 'team', 'case_team'],
        default: 'case_team'
    },

    // Audit
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

// Indexes
wikiFolderSchema.index({ caseId: 1, order: 1 });
wikiFolderSchema.index({ parentFolderId: 1, order: 1 });
wikiFolderSchema.index({ caseId: 1, folderType: 1 });
wikiFolderSchema.index({ name: 1, caseId: 1 });

// Generate folder ID
wikiFolderSchema.pre('save', async function(next) {
    if (!this.folderId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.folderId = `WFLD-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Generate path
    if (!this.path) {
        if (this.parentFolderId) {
            const parent = await this.constructor.findById(this.parentFolderId);
            this.path = parent ? `${parent.path}/${this.name.toLowerCase().replace(/\s+/g, '-')}` : `/${this.name.toLowerCase().replace(/\s+/g, '-')}`;
            this.depth = parent ? parent.depth + 1 : 0;
        } else {
            this.path = `/${this.name.toLowerCase().replace(/\s+/g, '-')}`;
            this.depth = 0;
        }
    }

    next();
});

// Static: Get folders for a case
wikiFolderSchema.statics.getCaseFolders = async function(caseId, options = {}) {
    const query = { caseId: new mongoose.Types.ObjectId(caseId) };

    if (options.parentFolderId === null) {
        query.parentFolderId = { $exists: false };
    } else if (options.parentFolderId) {
        query.parentFolderId = new mongoose.Types.ObjectId(options.parentFolderId);
    }

    return await this.find(query)
        .sort({ order: 1, name: 1 })
        .populate('createdBy', 'firstName lastName');
};

// Static: Get folder tree
wikiFolderSchema.statics.getFolderTree = async function(caseId) {
    const folders = await this.find({
        caseId: new mongoose.Types.ObjectId(caseId)
    })
    .select('folderId name nameAr icon color parentFolderId order depth folderType isDefault pageCount')
    .sort({ order: 1, name: 1 })
    .lean();

    // Build tree structure
    const buildTree = (parentId = null) => {
        return folders
            .filter(f => {
                if (parentId === null) return !f.parentFolderId;
                return f.parentFolderId && f.parentFolderId.toString() === parentId.toString();
            })
            .map(folder => ({
                ...folder,
                children: buildTree(folder._id)
            }));
    };

    return buildTree();
};

// Static: Create default folders for a case
wikiFolderSchema.statics.createDefaultFolders = async function(caseId, lawyerId, createdBy) {
    const defaultFolders = [
        { name: 'Pleadings', nameAr: 'المرافعات', icon: 'file-text', folderType: 'pleadings', color: '#ef4444', order: 0 },
        { name: 'Evidence', nameAr: 'الأدلة', icon: 'archive', folderType: 'evidence', color: '#f97316', order: 1 },
        { name: 'Research', nameAr: 'البحث', icon: 'search', folderType: 'research', color: '#8b5cf6', order: 2 },
        { name: 'Correspondence', nameAr: 'المراسلات', icon: 'mail', folderType: 'correspondence', color: '#06b6d4', order: 3 },
        { name: 'Notes', nameAr: 'الملاحظات', icon: 'edit', folderType: 'notes', color: '#22c55e', order: 4 },
        { name: 'Timeline', nameAr: 'الجدول الزمني', icon: 'clock', folderType: 'timeline', color: '#eab308', order: 5 },
        { name: 'Witnesses', nameAr: 'الشهود', icon: 'users', folderType: 'witnesses', color: '#ec4899', order: 6 }
    ];

    const folders = defaultFolders.map(folder => ({
        ...folder,
        caseId,
        lawyerId,
        createdBy,
        isDefault: true
    }));

    return await this.insertMany(folders);
};

// Static: Update page count
wikiFolderSchema.statics.updatePageCount = async function(folderId) {
    const WikiPage = mongoose.model('WikiPage');

    const count = await WikiPage.countDocuments({
        folderId: new mongoose.Types.ObjectId(folderId),
        status: { $ne: 'archived' }
    });

    await this.findByIdAndUpdate(folderId, { pageCount: count });

    return count;
};

// Static: Update subfolder count
wikiFolderSchema.statics.updateSubfolderCount = async function(parentFolderId) {
    const count = await this.countDocuments({
        parentFolderId: new mongoose.Types.ObjectId(parentFolderId)
    });

    await this.findByIdAndUpdate(parentFolderId, { subfolderCount: count });

    return count;
};

// Static: Move folder
wikiFolderSchema.statics.moveFolder = async function(folderId, newParentId, newOrder) {
    const folder = await this.findById(folderId);
    if (!folder) throw new Error('Folder not found');

    const oldParentId = folder.parentFolderId;

    // Update folder
    folder.parentFolderId = newParentId || undefined;
    folder.order = newOrder;

    // Regenerate path
    if (newParentId) {
        const parent = await this.findById(newParentId);
        folder.path = parent ? `${parent.path}/${folder.name.toLowerCase().replace(/\s+/g, '-')}` : `/${folder.name.toLowerCase().replace(/\s+/g, '-')}`;
        folder.depth = parent ? parent.depth + 1 : 0;
    } else {
        folder.path = `/${folder.name.toLowerCase().replace(/\s+/g, '-')}`;
        folder.depth = 0;
    }

    await folder.save();

    // Update counts
    if (oldParentId) {
        await this.updateSubfolderCount(oldParentId);
    }
    if (newParentId) {
        await this.updateSubfolderCount(newParentId);
    }

    return folder;
};

// Instance: Delete folder and move pages to parent
wikiFolderSchema.methods.deleteAndMovePages = async function() {
    const WikiPage = mongoose.model('WikiPage');

    // Move all pages to parent folder (or root)
    await WikiPage.updateMany(
        { folderId: this._id },
        { $set: { folderId: this.parentFolderId || null } }
    );

    // Move subfolders to parent
    await this.constructor.updateMany(
        { parentFolderId: this._id },
        { $set: { parentFolderId: this.parentFolderId || null } }
    );

    // Update parent's counts
    if (this.parentFolderId) {
        await this.constructor.updateSubfolderCount(this.parentFolderId);
        await this.constructor.updatePageCount(this.parentFolderId);
    }

    // Delete the folder
    await this.deleteOne();

    return true;
};

module.exports = mongoose.model('WikiFolder', wikiFolderSchema);
