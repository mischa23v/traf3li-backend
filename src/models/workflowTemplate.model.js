const mongoose = require('mongoose');

// Stage Requirement Schema
const stageRequirementSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['document_upload', 'approval', 'payment', 'signature', 'review', 'task_completion'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    isRequired: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
});

// Workflow Stage Schema
const workflowStageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    nameAr: {
        type: String,
        required: true
    },
    description: String,
    descriptionAr: String,
    color: {
        type: String,
        required: true,
        default: '#3B82F6'
    },
    order: {
        type: Number,
        required: true
    },
    durationDays: Number,
    requirements: [stageRequirementSchema],
    autoTransition: {
        type: Boolean,
        default: false
    },
    notifyOnEntry: {
        type: Boolean,
        default: true
    },
    notifyOnExit: {
        type: Boolean,
        default: false
    },
    allowedActions: [String],
    isInitial: {
        type: Boolean,
        default: false
    },
    isFinal: {
        type: Boolean,
        default: false
    }
});

// Stage Transition Schema
const stageTransitionSchema = new mongoose.Schema({
    fromStageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    toStageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    nameAr: {
        type: String,
        required: true
    },
    requiresApproval: {
        type: Boolean,
        default: false
    },
    approverRoles: [String],
    conditions: [String]
});

const workflowTemplateSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    descriptionAr: String,
    caseCategory: {
        type: String,
        required: true
    },
    stages: [workflowStageSchema],
    transitions: [stageTransitionSchema],
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
workflowTemplateSchema.index({ lawyerId: 1, caseCategory: 1 });
workflowTemplateSchema.index({ lawyerId: 1, isDefault: 1 });
workflowTemplateSchema.index({ lawyerId: 1, isActive: 1 });

// Pre-save hook to ensure only one default per category
workflowTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            {
                lawyerId: this.lawyerId,
                caseCategory: this.caseCategory,
                _id: { $ne: this._id }
            },
            { isDefault: false }
        );
    }
    next();
});

// Static method: Get workflow by category
workflowTemplateSchema.statics.getByCategory = async function(lawyerId, category) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        caseCategory: category,
        isActive: true
    }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method: Get default workflow for category
workflowTemplateSchema.statics.getDefaultForCategory = async function(lawyerId, category) {
    return await this.findOne({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        caseCategory: category,
        isDefault: true,
        isActive: true
    });
};

module.exports = mongoose.model('WorkflowTemplate', workflowTemplateSchema);
