const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    likes: {
        type: Number,
        default: 0
    },
    // SECURITY: Track who liked to prevent duplicate likes
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    verified: {
        type: Boolean,
        default: false
    },
    helpful: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

answerSchema.index({ questionId: 1, createdAt: -1 });

module.exports = mongoose.model('Answer', answerSchema);
