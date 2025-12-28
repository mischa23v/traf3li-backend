const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['labor', 'commercial', 'family', 'criminal', 'real-estate', 'corporate', 'immigration', 'tax', 'intellectual-property', 'other'],
        default: 'other'
    },
    tags: {
        type: [String],
        default: []
    },
    views: {
        type: Number,
        default: 0
    },
    answers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer'
    }],
    status: {
        type: String,
        enum: ['open', 'answered', 'closed'],
        default: 'open'
    }
}, {
    versionKey: false,
    timestamps: true
});

// FIXED: Separated text index from regular index
// Text index for search (title and description only)
questionSchema.index({ title: 'text', description: 'text' });

// Regular index for tags (separate from text index)
questionSchema.index({ tags: 1 });

// Category and status index
questionSchema.index({ category: 1, status: 1 });

// Compound index for firmId and createdAt
questionSchema.index({ firmId: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
