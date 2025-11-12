const mongoose = require('mongoose');

const peerReviewSchema = new mongoose.Schema({
    fromLawyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toLawyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    competence: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    integrity: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    ethics: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        required: false
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

peerReviewSchema.index({ toLawyer: 1, verified: 1 });

module.exports = mongoose.model('PeerReview', peerReviewSchema);
