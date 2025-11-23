const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
    contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false  // Optional for external cases
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // Optional for external cases
    },
    clientName: {
        type: String,
        required: false  // For external clients not on platform
    },
    clientPhone: {
        type: String,
        required: false  // For external clients
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: true
    },
    
    // ✅ NEW: Labor case specific details
    laborCaseDetails: {
        plaintiff: {
            name: { type: String, required: false },
            nationalId: { type: String, required: false },
            phone: { type: String, required: false },
            address: { type: String, required: false },
            city: { type: String, required: false }
        },
        company: {
            name: { type: String, required: false },
            registrationNumber: { type: String, required: false },
            address: { type: String, required: false },
            city: { type: String, required: false }
        }
    },
    
    // ✅ NEW: Case number and court
    caseNumber: {
        type: String,
        required: false
    },
    court: {
        type: String,
        required: false
    },
    judge: {
        type: String,
        required: false
    },
    nextHearing: {
        type: Date,
        required: false
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'closed', 'appeal', 'settlement', 'on-hold', 'completed', 'won', 'lost', 'settled'],
        default: 'active'
    },
    outcome: {
        type: String,
        enum: ['won', 'lost', 'settled', 'ongoing'],
        default: 'ongoing'
    },
    claimAmount: {
        type: Number,
        default: 0
    },
    expectedWinAmount: {
        type: Number,
        default: 0
    },
    timeline: [{
        event: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['court', 'filing', 'deadline', 'general'],
            default: 'general'
        },
        status: {
            type: String,
            enum: ['upcoming', 'completed'],
            default: 'upcoming'
        }
    }],
    claims: [{
        type: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        period: String,
        description: String
    }],
    notes: [{
        text: String,
        date: { type: Date, default: Date.now }
    }],
    documents: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: { type: Date, default: Date.now },
        category: {
            type: String,
            enum: ['contract', 'evidence', 'correspondence', 'other'],
            default: 'other'
        }
    }],
    hearings: [{
        date: Date,
        location: String,
        notes: String,
        attended: { type: Boolean, default: false }
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: false
    },
    source: {
        type: String,
        enum: ['platform', 'external'],
        default: 'external'  // Track where case came from
    }
}, {
    versionKey: false,
    timestamps: true
});

caseSchema.index({ lawyerId: 1, status: 1 });
caseSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model('Case', caseSchema);
