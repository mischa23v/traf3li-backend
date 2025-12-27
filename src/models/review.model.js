const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    gigID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gig',
        required: true
    },
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    star: {
        type: Number,
        required: true,
        max: 5
    },
    description: {
        type: String,
        required: true
    }
}, {
    versionKey: false
});

reviewSchema.index({ firmId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);