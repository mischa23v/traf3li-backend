const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationID: {
        type: String,
        required: true,
    },
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    description: {
        type: String,
        required: false, // ✅ CHANGED: Not required if there's an attachment
    },
    // ✅ ADDED: Attachments
    attachments: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String,
        type: {
            type: String,
            enum: ['image', 'document', 'video', 'other'],
            default: 'other'
        }
    }],
    // ✅ ADDED: Read status
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    // ✅ ADDED: Edited status
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('Message', messageSchema);
