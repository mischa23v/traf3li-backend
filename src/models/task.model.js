const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        required: false
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
        required: true
    },
    status: {
        type: String,
        enum: ['backlog', 'todo', 'in progress', 'in-progress', 'done', 'canceled'],
        default: 'todo',
        required: true
    },
    label: {
        type: String,
        enum: ['bug', 'feature', 'documentation'],
        required: false
    },
    dueDate: {
        type: Date,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: false
    },
    recurring: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            required: false
        },
        nextDue: {
            type: Date,
            required: false
        }
    },
    tags: [{
        type: String
    }],
    subtasks: [{
        title: {
            type: String,
            required: true
        },
        completed: {
            type: Boolean,
            default: false
        }
    }],
    attachments: [{
        filename: String,
        url: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    completedAt: {
        type: Date,
        required: false
    },
    notes: {
        type: String,
        required: false
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ caseId: 1 });

module.exports = mongoose.model('Task', taskSchema);
