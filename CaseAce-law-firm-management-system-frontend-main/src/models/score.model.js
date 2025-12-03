const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    clientRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    peerRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    winRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    experience: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    engagement: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    overallScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
        index: true
    },
    badge: {
        type: String,
        enum: ['none', 'bronze', 'silver', 'gold', 'platinum'],
        default: 'none'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false,
    timestamps: true
});

scoreSchema.index({ overallScore: -1 });

module.exports = mongoose.model('Score', scoreSchema);
