const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    gigID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gig',
        required: false,  // Changed to optional for job-based orders
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    title: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    sellerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    buyerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    payment_intent: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    terms: {
        type: String,
        required: false
    },
    acceptedAt: {
        type: Date,
        required: false
    },
    completedAt: {
        type: Date,
        required: false
    },
    conversationID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: false
    }
}, {
    versionKey: false,
    timestamps: true
});

orderSchema.index({ sellerID: 1, status: 1 });
orderSchema.index({ buyerID: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
