/**
 * Setup Task Model
 *
 * Defines individual tasks within setup sections for app onboarding.
 * Different from HR onboarding - this is for initial app setup.
 *
 * Features:
 * - Task categorization by section
 * - Ordering within sections
 * - Multilingual support (Arabic/English)
 * - API endpoint integration for completion checking
 * - Estimated time for each task
 * - Required vs optional tasks
 */

const mongoose = require('mongoose');

const setupTaskSchema = new mongoose.Schema({
    taskId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sectionId: {
        type: String,
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    name: {
        type: String,
        required: true
    },
    nameAr: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    descriptionAr: {
        type: String,
        required: false
    },
    orderIndex: {
        type: Number,
        required: true
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    checkEndpoint: {
        type: String,
        required: false
        // API to check if task is complete (e.g., '/api/setup/check/company-info')
    },
    actionUrl: {
        type: String,
        required: false
        // Where to redirect user to complete task (e.g., '/settings/company')
    },
    estimatedMinutes: {
        type: Number,
        default: 5,
        min: 1
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // Dependencies - task IDs that must be completed first
    dependencies: {
        type: [String],
        default: []
    },
    // Metadata for validation
    validationRules: {
        requiredFields: {
            type: [String],
            default: []
        },
        requiredModels: {
            type: [String],
            default: []
        },
        minimumCount: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes for efficient querying
setupTaskSchema.index({ sectionId: 1, orderIndex: 1 });
setupTaskSchema.index({ isActive: 1, sectionId: 1 });
setupTaskSchema.index({ isRequired: 1, isActive: 1 });
setupTaskSchema.index({ firmId: 1, createdAt: -1 });

// Static methods
setupTaskSchema.statics.getTasksBySection = async function(sectionId) {
    return this.find({ sectionId, isActive: true })
        .sort({ orderIndex: 1 })
        .lean();
};

setupTaskSchema.statics.getActiveTasksBySection = async function(sectionId) {
    return this.find({ sectionId, isActive: true })
        .sort({ orderIndex: 1 })
        .lean();
};

setupTaskSchema.statics.getRequiredTasks = async function() {
    return this.find({ isActive: true, isRequired: true })
        .sort({ sectionId: 1, orderIndex: 1 })
        .lean();
};

setupTaskSchema.statics.getTaskById = async function(taskId) {
    return this.findOne({ taskId, isActive: true }).lean();
};

setupTaskSchema.statics.getAllActiveTasks = async function() {
    return this.find({ isActive: true })
        .sort({ sectionId: 1, orderIndex: 1 })
        .lean();
};

setupTaskSchema.statics.getTasksWithDependencies = async function(taskId) {
    const task = await this.findOne({ taskId, isActive: true }).lean();
    if (!task || !task.dependencies || task.dependencies.length === 0) {
        return [];
    }

    return this.find({
        taskId: { $in: task.dependencies },
        isActive: true
    }).lean();
};

// Instance methods
setupTaskSchema.methods.activate = async function() {
    this.isActive = true;
    return this.save();
};

setupTaskSchema.methods.deactivate = async function() {
    this.isActive = false;
    return this.save();
};

setupTaskSchema.methods.hasDependencies = function() {
    return this.dependencies && this.dependencies.length > 0;
};

module.exports = mongoose.model('SetupTask', setupTaskSchema);
