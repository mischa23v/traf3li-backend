/**
 * User Setup Progress Model
 *
 * Tracks individual user/firm progress through app onboarding tasks.
 * Different from HR onboarding - this is for initial app setup.
 *
 * Features:
 * - Per-user, per-firm, per-task tracking
 * - Completion and skip tracking
 * - Progress calculation
 * - Dependency validation
 */

const mongoose = require('mongoose');

const userSetupProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    taskId: {
        type: String,
        required: true,
        index: true
    },
    isCompleted: {
        type: Boolean,
        default: false,
        index: true
    },
    completedAt: {
        type: Date,
        required: false
    },
    skipped: {
        type: Boolean,
        default: false
    },
    skippedAt: {
        type: Date,
        required: false
    },
    skippedReason: {
        type: String,
        required: false
    },
    // Metadata
    attemptCount: {
        type: Number,
        default: 0
    },
    lastAttemptedAt: {
        type: Date,
        required: false
    },
    // Time tracking
    timeSpentSeconds: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes
userSetupProgressSchema.index({ userId: 1, firmId: 1, taskId: 1 }, { unique: true });
userSetupProgressSchema.index({ firmId: 1, isCompleted: 1 });
userSetupProgressSchema.index({ userId: 1, isCompleted: 1 });

// Static methods for getting progress
userSetupProgressSchema.statics.getUserProgress = async function(userId, firmId) {
    const SetupTask = mongoose.model('SetupTask');
    const allTasks = await SetupTask.find({ isActive: true }).lean();
    const progress = await this.find({ userId, firmId }).lean();

    const progressMap = {};
    progress.forEach(p => {
        progressMap[p.taskId] = p;
    });

    const tasksWithProgress = allTasks.map(task => ({
        ...task,
        progress: progressMap[task.taskId] || null,
        isCompleted: progressMap[task.taskId]?.isCompleted || false,
        skipped: progressMap[task.taskId]?.skipped || false
    }));

    return tasksWithProgress;
};

userSetupProgressSchema.statics.getFirmProgress = async function(firmId) {
    const SetupTask = mongoose.model('SetupTask');
    const allTasks = await SetupTask.find({ isActive: true }).lean();
    const progress = await this.find({ firmId }).lean();

    const completed = progress.filter(p => p.isCompleted).length;
    const skipped = progress.filter(p => p.skipped).length;
    const total = allTasks.length;

    return {
        total,
        completed,
        skipped,
        pending: total - completed - skipped,
        percentage: total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0
    };
};

userSetupProgressSchema.statics.getSectionProgress = async function(userId, firmId, sectionId) {
    const SetupTask = mongoose.model('SetupTask');
    const sectionTasks = await SetupTask.find({ sectionId, isActive: true }).lean();
    const taskIds = sectionTasks.map(t => t.taskId);

    const progress = await this.find({
        userId,
        firmId,
        taskId: { $in: taskIds }
    }).lean();

    const completed = progress.filter(p => p.isCompleted).length;
    const skipped = progress.filter(p => p.skipped).length;
    const total = sectionTasks.length;

    return {
        sectionId,
        total,
        completed,
        skipped,
        pending: total - completed - skipped,
        percentage: total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0
    };
};

userSetupProgressSchema.statics.getOverallProgress = async function(userId, firmId) {
    const SetupTask = mongoose.model('SetupTask');
    const SetupSection = mongoose.model('SetupSection');

    const allSections = await SetupSection.find({ isActive: true }).lean();
    const sectionProgress = await Promise.all(
        allSections.map(section =>
            this.getSectionProgress(userId, firmId, section.sectionId)
        )
    );

    const requiredTasks = await SetupTask.find({ isActive: true, isRequired: true }).lean();
    const requiredTaskIds = requiredTasks.map(t => t.taskId);
    const requiredProgress = await this.find({
        userId,
        firmId,
        taskId: { $in: requiredTaskIds }
    }).lean();

    const requiredCompleted = requiredProgress.filter(p => p.isCompleted || p.skipped).length;
    const isSetupComplete = requiredCompleted >= requiredTaskIds.length;

    return {
        sections: sectionProgress,
        overall: {
            totalTasks: sectionProgress.reduce((sum, s) => sum + s.total, 0),
            completedTasks: sectionProgress.reduce((sum, s) => sum + s.completed, 0),
            skippedTasks: sectionProgress.reduce((sum, s) => sum + s.skipped, 0),
            pendingTasks: sectionProgress.reduce((sum, s) => sum + s.pending, 0),
            percentage: sectionProgress.reduce((sum, s) => sum + s.percentage, 0) / (sectionProgress.length || 1)
        },
        required: {
            total: requiredTaskIds.length,
            completed: requiredCompleted,
            isComplete: isSetupComplete
        }
    };
};

// Static methods for completing tasks
userSetupProgressSchema.statics.completeTask = async function(userId, firmId, taskId) {
    const SetupTask = mongoose.model('SetupTask');
    const task = await SetupTask.findOne({ taskId, isActive: true });

    if (!task) {
        throw new Error('Task not found');
    }

    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
        const dependencies = await this.find({
            userId,
            firmId,
            taskId: { $in: task.dependencies }
        });

        const incompleteDeps = task.dependencies.filter(depId => {
            const dep = dependencies.find(d => d.taskId === depId);
            return !dep || (!dep.isCompleted && !dep.skipped);
        });

        if (incompleteDeps.length > 0) {
            const SetupTask = mongoose.model('SetupTask');
            const depTasks = await SetupTask.find({
                taskId: { $in: incompleteDeps },
                isActive: true
            }).select('name').lean();
            const depNames = depTasks.map(t => t.name).join(', ');
            throw new Error(`Please complete these tasks first: ${depNames}`);
        }
    }

    const progress = await this.findOneAndUpdate(
        { userId, firmId, taskId },
        {
            $set: {
                isCompleted: true,
                completedAt: new Date(),
                skipped: false,
                skippedAt: null,
                skippedReason: null
            },
            $inc: { attemptCount: 1 },
            $setOnInsert: {
                userId,
                firmId,
                taskId,
                timeSpentSeconds: 0
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return progress;
};

userSetupProgressSchema.statics.skipTask = async function(userId, firmId, taskId, reason = null) {
    const SetupTask = mongoose.model('SetupTask');
    const task = await SetupTask.findOne({ taskId, isActive: true });

    if (!task) {
        throw new Error('Task not found');
    }

    if (task.isRequired) {
        throw new Error('Cannot skip required tasks');
    }

    const progress = await this.findOneAndUpdate(
        { userId, firmId, taskId },
        {
            $set: {
                skipped: true,
                skippedAt: new Date(),
                skippedReason: reason,
                isCompleted: false,
                completedAt: null
            },
            $setOnInsert: {
                userId,
                firmId,
                taskId,
                attemptCount: 0,
                timeSpentSeconds: 0
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return progress;
};

userSetupProgressSchema.statics.resetTask = async function(userId, firmId, taskId) {
    const progress = await this.findOneAndUpdate(
        { userId, firmId, taskId },
        {
            $set: {
                isCompleted: false,
                completedAt: null,
                skipped: false,
                skippedAt: null,
                skippedReason: null
            }
        },
        { new: true }
    );

    return progress;
};

userSetupProgressSchema.statics.resetAllProgress = async function(userId, firmId) {
    await this.deleteMany({ userId, firmId });
    return { message: 'All progress reset successfully' };
};

userSetupProgressSchema.statics.trackTimeSpent = async function(userId, firmId, taskId, seconds) {
    const progress = await this.findOneAndUpdate(
        { userId, firmId, taskId },
        {
            $inc: { timeSpentSeconds: seconds },
            $set: { lastAttemptedAt: new Date() },
            $setOnInsert: {
                userId,
                firmId,
                taskId,
                isCompleted: false,
                attemptCount: 0
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return progress;
};

// Get next task to complete
userSetupProgressSchema.statics.getNextTask = async function(userId, firmId) {
    const SetupTask = mongoose.model('SetupTask');
    const SetupSection = mongoose.model('SetupSection');

    const allTasks = await SetupTask.find({ isActive: true })
        .sort({ sectionId: 1, orderIndex: 1 })
        .lean();

    const progress = await this.find({ userId, firmId }).lean();
    const progressMap = {};
    progress.forEach(p => {
        progressMap[p.taskId] = p;
    });

    // Find first incomplete task
    for (const task of allTasks) {
        const taskProgress = progressMap[task.taskId];

        // Skip if already completed or skipped
        if (taskProgress && (taskProgress.isCompleted || taskProgress.skipped)) {
            continue;
        }

        // Check if dependencies are met
        if (task.dependencies && task.dependencies.length > 0) {
            const allDepsMet = task.dependencies.every(depId => {
                const depProgress = progressMap[depId];
                return depProgress && (depProgress.isCompleted || depProgress.skipped);
            });

            if (!allDepsMet) {
                continue;
            }
        }

        // Get section info
        const section = await SetupSection.findOne({ sectionId: task.sectionId, isActive: true }).lean();

        return {
            task,
            section,
            progress: taskProgress || null
        };
    }

    return null; // All tasks completed
};

// Instance methods
userSetupProgressSchema.methods.complete = async function() {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.skipped = false;
    this.skippedAt = null;
    this.skippedReason = null;
    return this.save();
};

userSetupProgressSchema.methods.skip = async function(reason = null) {
    this.skipped = true;
    this.skippedAt = new Date();
    this.skippedReason = reason;
    this.isCompleted = false;
    this.completedAt = null;
    return this.save();
};

userSetupProgressSchema.methods.reset = async function() {
    this.isCompleted = false;
    this.completedAt = null;
    this.skipped = false;
    this.skippedAt = null;
    this.skippedReason = null;
    return this.save();
};

module.exports = mongoose.model('UserSetupProgress', userSetupProgressSchema);
