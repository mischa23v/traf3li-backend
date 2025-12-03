const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coverLetter: {
        type: String,
        required: true
    },
    proposedAmount: {
        type: Number,
        required: true
    },
    deliveryTime: {
        type: Number, // in days
        required: true
    },
    attachments: [{
        name: String,
        url: String
    }],
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    }
}, {
    versionKey: false,
    timestamps: true
});

proposalSchema.index({ jobId: 1, status: 1 });
proposalSchema.index({ lawyerId: 1, status: 1 });
proposalSchema.index({ jobId: 1, lawyerId: 1 }, { unique: true }); // One proposal per lawyer per job

module.exports = mongoose.model('Proposal', proposalSchema);
