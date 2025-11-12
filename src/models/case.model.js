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
    
    status: {
        type: String,
        enum: ['active', 'on-hold', 'completed', 'won', 'lost', 'settled'],
        default: 'active'
    },
    outcome: {
        type: String,
        enum: ['won', 'lost', 'settled', 'ongoing'],
        default: 'ongoing'
    },
    notes: [{
        text: String,
        date: { type: Date, default: Date.now }
    }],
    documents: [{
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
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
