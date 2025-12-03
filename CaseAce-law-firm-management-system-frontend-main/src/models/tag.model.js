const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
    color: {
        type: String,
        required: true,
        default: '#3B82F6'
    },
    description: {
        type: String,
        trim: true
    },
    entityType: {
        type: String,
        enum: ['case', 'client', 'contact', 'document', 'all'],
        default: 'all'
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, {
    versionKey: false,
    timestamps: true
});

// Compound indexes for faster lookups
tagSchema.index({ lawyerId: 1, name: 1 }, { unique: true });
tagSchema.index({ lawyerId: 1, entityType: 1 });
tagSchema.index({ lawyerId: 1, usageCount: -1 });

// Static method: Increment usage count
tagSchema.statics.incrementUsage = async function(tagId) {
    return await this.findByIdAndUpdate(
        tagId,
        { $inc: { usageCount: 1 } },
        { new: true }
    );
};

// Static method: Decrement usage count
tagSchema.statics.decrementUsage = async function(tagId) {
    return await this.findByIdAndUpdate(
        tagId,
        { $inc: { usageCount: -1 } },
        { new: true }
    );
};

// Static method: Get popular tags
tagSchema.statics.getPopularTags = async function(lawyerId, limit = 10, entityType = null) {
    const query = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };
    if (entityType && entityType !== 'all') {
        query.$or = [
            { entityType: entityType },
            { entityType: 'all' }
        ];
    }

    return await this.find(query)
        .sort({ usageCount: -1 })
        .limit(limit);
};

// Static method: Search tags
tagSchema.statics.searchTags = async function(lawyerId, searchTerm, entityType = null) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { nameAr: { $regex: searchTerm, $options: 'i' } }
        ]
    };

    if (entityType && entityType !== 'all') {
        query.$and = [
            { $or: [{ entityType: entityType }, { entityType: 'all' }] }
        ];
    }

    return await this.find(query)
        .sort({ usageCount: -1 })
        .limit(20);
};

module.exports = mongoose.model('Tag', tagSchema);
