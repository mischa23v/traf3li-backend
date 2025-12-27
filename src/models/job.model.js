const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    userID: {  // ✅ CHANGED from clientId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    title: {
        type: String,
        required: false,
        trim: true
    },
    description: {
        type: String,
        required: false
    },
    category: {
        type: String,
        enum: ['labor', 'commercial', 'personal-status', 'criminal', 'real-estate', 'traffic', 'administrative', 'other'],  // ✅ Added missing categories
        required: false
    },
    budget: {
        min: {
            type: Number,
            required: false
        },
        max: {
            type: Number,
            required: false
        }
    },
    deadline: {
        type: Date,
        required: false
    },
    location: {
        type: String,
        required: false
    },
    requirements: {
        type: [String],
        default: []
    },
    attachments: [{
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['open', 'in-progress', 'completed', 'cancelled'],
        default: 'open'
    },
    proposalsCount: {
        type: Number,
        default: 0
    },
    acceptedProposal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proposal',
        default: null
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    versionKey: false,
    timestamps: true
});

jobSchema.index({ userID: 1, status: 1 });  // ✅ CHANGED from clientId
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ firmId: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
