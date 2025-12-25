const mongoose = require('mongoose');

/**
 * Walkthrough Model - Interactive User Onboarding & Feature Guidance
 *
 * Provides step-by-step walkthroughs to guide users through onboarding,
 * new features, workflows, and tips. Supports firm-specific and global walkthroughs.
 */

// Step schema for embedded walkthrough steps
const stepSchema = new mongoose.Schema({
    order: {
        type: Number,
        required: true,
        min: 0
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    titleAr: {
        type: String,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    contentAr: {
        type: String,
        trim: true
    },
    // CSS selector for the element to highlight/interact with
    targetElement: {
        type: String,
        trim: true
    },
    // Position of the tooltip/popover relative to target element
    position: {
        type: String,
        enum: ['top', 'bottom', 'left', 'right', 'center'],
        default: 'bottom'
    },
    // Action to perform on this step
    action: {
        type: String,
        enum: ['highlight', 'click', 'input', 'wait'],
        default: 'highlight'
    },
    // Additional data for the action (e.g., wait duration, input validation)
    actionData: {
        type: mongoose.Schema.Types.Mixed
    },
    // Optional media
    videoUrl: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    // Whether user can skip this step
    skippable: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const walkthroughSchema = new mongoose.Schema({
    // Multi-tenancy: null for global walkthroughs, firmId for firm-specific
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        default: null
    },

    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    nameAr: {
        type: String,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },
    descriptionAr: {
        type: String,
        trim: true
    },

    // Category of the walkthrough
    category: {
        type: String,
        enum: ['onboarding', 'feature', 'workflow', 'tips'],
        required: true,
        index: true
    },

    // Who should see this walkthrough
    targetAudience: {
        type: String,
        enum: ['all', 'admin', 'lawyer', 'accountant', 'new_user'],
        default: 'all',
        index: true
    },

    // Ordered steps in the walkthrough
    steps: [stepSchema],

    // Conditions for when to trigger/show this walkthrough
    triggerConditions: {
        // Show on specific routes
        routes: [{
            type: String,
            trim: true
        }],
        // Show after user has been active for X days
        minDaysActive: {
            type: Number,
            min: 0
        },
        // Show only if user hasn't completed certain actions
        requiredFeatures: [{
            type: String,
            trim: true
        }],
        // Show only once, or on every visit
        showOnce: {
            type: Boolean,
            default: true
        },
        // Show based on user role
        roles: [{
            type: String,
            enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant']
        }],
        // Custom conditions (JSON format)
        custom: {
            type: mongoose.Schema.Types.Mixed
        }
    },

    // Whether this walkthrough is active and should be shown
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Display priority (higher = shown first)
    priority: {
        type: Number,
        default: 0,
        index: true
    },

    // Version number for tracking updates
    version: {
        type: Number,
        default: 1,
        min: 1
    },

    // Creator of the walkthrough
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Statistics
    stats: {
        views: {
            type: Number,
            default: 0
        },
        completions: {
            type: Number,
            default: 0
        },
        skips: {
            type: Number,
            default: 0
        },
        averageCompletionTime: {
            type: Number,
            default: 0  // in seconds
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
walkthroughSchema.index({ firmId: 1, category: 1, isActive: 1 });
walkthroughSchema.index({ firmId: 1, targetAudience: 1, isActive: 1 });
walkthroughSchema.index({ isActive: 1, priority: -1 });
walkthroughSchema.index({ category: 1, targetAudience: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Increment view count
walkthroughSchema.methods.incrementViews = async function() {
    this.stats.views += 1;
    return await this.save();
};

// Increment completion count
walkthroughSchema.methods.incrementCompletions = async function(completionTimeSeconds) {
    this.stats.completions += 1;

    // Update average completion time
    if (this.stats.averageCompletionTime === 0) {
        this.stats.averageCompletionTime = completionTimeSeconds;
    } else {
        this.stats.averageCompletionTime =
            (this.stats.averageCompletionTime * (this.stats.completions - 1) + completionTimeSeconds) / this.stats.completions;
    }

    return await this.save();
};

// Increment skip count
walkthroughSchema.methods.incrementSkips = async function() {
    this.stats.skips += 1;
    return await this.save();
};

// Check if user matches target audience
walkthroughSchema.methods.matchesUser = function(user) {
    // Check target audience
    if (this.targetAudience !== 'all') {
        if (this.targetAudience === 'new_user') {
            // User is "new" if created within last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (user.createdAt < thirtyDaysAgo) {
                return false;
            }
        } else if (this.targetAudience === 'admin') {
            if (user.firmRole !== 'owner' && user.firmRole !== 'admin') {
                return false;
            }
        } else {
            // Check if user's role matches (lawyer, accountant, etc.)
            if (user.firmRole !== this.targetAudience) {
                return false;
            }
        }
    }

    // Check if user's role is in the allowed roles (if specified)
    if (this.triggerConditions?.roles && this.triggerConditions.roles.length > 0) {
        if (!this.triggerConditions.roles.includes(user.firmRole)) {
            return false;
        }
    }

    // Check minimum days active
    if (this.triggerConditions?.minDaysActive) {
        const daysActive = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
        if (daysActive < this.triggerConditions.minDaysActive) {
            return false;
        }
    }

    return true;
};

// Get completion rate
walkthroughSchema.methods.getCompletionRate = function() {
    if (this.stats.views === 0) return 0;
    return (this.stats.completions / this.stats.views) * 100;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get active walkthroughs for a user
walkthroughSchema.statics.getForUser = async function(userId, firmId = null, category = null) {
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) return [];

    const query = {
        isActive: true,
        $or: [
            { firmId: null },  // Global walkthroughs
            { firmId: firmId }  // Firm-specific walkthroughs
        ]
    };

    if (category) {
        query.category = category;
    }

    const walkthroughs = await this.find(query).sort({ priority: -1, createdAt: -1 });

    // Filter by user matching
    return walkthroughs.filter(w => w.matchesUser(user));
};

// Get walkthrough by route
walkthroughSchema.statics.getForRoute = async function(route, userId, firmId = null) {
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) return [];

    const query = {
        isActive: true,
        'triggerConditions.routes': route,
        $or: [
            { firmId: null },
            { firmId: firmId }
        ]
    };

    const walkthroughs = await this.find(query).sort({ priority: -1 });

    // Filter by user matching
    return walkthroughs.filter(w => w.matchesUser(user));
};

// Get popular walkthroughs
walkthroughSchema.statics.getPopular = async function(limit = 10, firmId = null) {
    const query = {
        isActive: true,
        $or: [
            { firmId: null },
            { firmId: firmId }
        ]
    };

    return await this.find(query)
        .sort({ 'stats.completions': -1, 'stats.views': -1 })
        .limit(limit);
};

// Clone walkthrough (create a copy with new version)
walkthroughSchema.statics.cloneWalkthrough = async function(walkthroughId, userId) {
    const original = await this.findById(walkthroughId);
    if (!original) throw new Error('Walkthrough not found');

    const clone = new this({
        firmId: original.firmId,
        name: `${original.name} (Copy)`,
        nameAr: original.nameAr ? `${original.nameAr} (نسخة)` : null,
        description: original.description,
        descriptionAr: original.descriptionAr,
        category: original.category,
        targetAudience: original.targetAudience,
        steps: original.steps.map(step => ({ ...step.toObject() })),
        triggerConditions: original.triggerConditions,
        isActive: false,  // Clones start as inactive
        priority: original.priority,
        version: 1,
        createdBy: userId
    });

    await clone.save();
    return clone;
};

const Walkthrough = mongoose.model('Walkthrough', walkthroughSchema);

// ═══════════════════════════════════════════════════════════════
// WALKTHROUGH PROGRESS MODEL
// ═══════════════════════════════════════════════════════════════

const walkthroughProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    walkthroughId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Walkthrough',
        required: true,
        index: true
    },

    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'skipped'],
        default: 'not_started',
        index: true
    },

    currentStep: {
        type: Number,
        default: 0,
        min: 0
    },

    completedSteps: [{
        type: Number,
        min: 0
    }],

    startedAt: {
        type: Date,
        index: true
    },

    completedAt: {
        type: Date,
        index: true
    },

    skippedAt: {
        type: Date,
        index: true
    },

    // Time spent on walkthrough (in seconds)
    timeSpent: {
        type: Number,
        default: 0
    },

    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
walkthroughProgressSchema.index({ userId: 1, walkthroughId: 1 }, { unique: true });
walkthroughProgressSchema.index({ userId: 1, status: 1 });
walkthroughProgressSchema.index({ walkthroughId: 1, status: 1 });
walkthroughProgressSchema.index({ status: 1, completedAt: -1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Start the walkthrough
walkthroughProgressSchema.methods.start = async function() {
    if (this.status !== 'not_started') {
        throw new Error('Walkthrough already started');
    }

    this.status = 'in_progress';
    this.startedAt = new Date();
    this.currentStep = 0;

    // Increment view count on the walkthrough
    const walkthrough = await Walkthrough.findById(this.walkthroughId);
    if (walkthrough) {
        await walkthrough.incrementViews();
    }

    return await this.save();
};

// Mark a step as completed
walkthroughProgressSchema.methods.completeStep = async function(stepOrder) {
    if (this.status !== 'in_progress') {
        throw new Error('Walkthrough not in progress');
    }

    // Add to completed steps if not already there
    if (!this.completedSteps.includes(stepOrder)) {
        this.completedSteps.push(stepOrder);
    }

    // Update current step to next
    this.currentStep = stepOrder + 1;

    return await this.save();
};

// Complete the entire walkthrough
walkthroughProgressSchema.methods.complete = async function() {
    if (this.status === 'completed') {
        throw new Error('Walkthrough already completed');
    }

    this.status = 'completed';
    this.completedAt = new Date();

    // Calculate time spent
    if (this.startedAt) {
        this.timeSpent = Math.floor((this.completedAt - this.startedAt) / 1000);
    }

    // Increment completion count on the walkthrough
    const walkthrough = await Walkthrough.findById(this.walkthroughId);
    if (walkthrough) {
        await walkthrough.incrementCompletions(this.timeSpent);
    }

    return await this.save();
};

// Skip the walkthrough
walkthroughProgressSchema.methods.skip = async function() {
    if (this.status === 'completed') {
        throw new Error('Cannot skip a completed walkthrough');
    }

    this.status = 'skipped';
    this.skippedAt = new Date();

    // Calculate time spent before skipping
    if (this.startedAt) {
        this.timeSpent = Math.floor((this.skippedAt - this.startedAt) / 1000);
    }

    // Increment skip count on the walkthrough
    const walkthrough = await Walkthrough.findById(this.walkthroughId);
    if (walkthrough) {
        await walkthrough.incrementSkips();
    }

    return await this.save();
};

// Reset the walkthrough
walkthroughProgressSchema.methods.reset = async function() {
    this.status = 'not_started';
    this.currentStep = 0;
    this.completedSteps = [];
    this.startedAt = null;
    this.completedAt = null;
    this.skippedAt = null;
    this.timeSpent = 0;

    return await this.save();
};

// Get completion percentage
walkthroughProgressSchema.methods.getCompletionPercentage = async function() {
    const walkthrough = await Walkthrough.findById(this.walkthroughId);
    if (!walkthrough || walkthrough.steps.length === 0) return 0;

    return (this.completedSteps.length / walkthrough.steps.length) * 100;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get or create progress for a user and walkthrough
walkthroughProgressSchema.statics.getOrCreate = async function(userId, walkthroughId) {
    let progress = await this.findOne({ userId, walkthroughId });

    if (!progress) {
        progress = new this({
            userId,
            walkthroughId,
            status: 'not_started'
        });
        await progress.save();
    }

    return progress;
};

// Get all progress for a user
walkthroughProgressSchema.statics.getUserProgress = async function(userId, status = null) {
    const query = { userId };
    if (status) {
        query.status = status;
    }

    return await this.find(query)
        .populate('walkthroughId')
        .sort({ updatedAt: -1 });
};

// Get completion statistics for a user
walkthroughProgressSchema.statics.getUserStats = async function(userId) {
    const total = await this.countDocuments({ userId });
    const completed = await this.countDocuments({ userId, status: 'completed' });
    const inProgress = await this.countDocuments({ userId, status: 'in_progress' });
    const skipped = await this.countDocuments({ userId, status: 'skipped' });

    return {
        total,
        completed,
        inProgress,
        skipped,
        notStarted: total - completed - inProgress - skipped,
        completionRate: total > 0 ? (completed / total) * 100 : 0
    };
};

// Get walkthrough statistics
walkthroughProgressSchema.statics.getWalkthroughStats = async function(walkthroughId) {
    const total = await this.countDocuments({ walkthroughId });
    const completed = await this.countDocuments({ walkthroughId, status: 'completed' });
    const inProgress = await this.countDocuments({ walkthroughId, status: 'in_progress' });
    const skipped = await this.countDocuments({ walkthroughId, status: 'skipped' });

    // Calculate average completion time
    const completedProgress = await this.find({
        walkthroughId,
        status: 'completed',
        timeSpent: { $gt: 0 }
    });

    let averageTime = 0;
    if (completedProgress.length > 0) {
        const totalTime = completedProgress.reduce((sum, p) => sum + p.timeSpent, 0);
        averageTime = totalTime / completedProgress.length;
    }

    return {
        total,
        completed,
        inProgress,
        skipped,
        notStarted: total - completed - inProgress - skipped,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        averageCompletionTime: averageTime
    };
};

// Check if user has completed a specific walkthrough
walkthroughProgressSchema.statics.hasCompleted = async function(userId, walkthroughId) {
    const progress = await this.findOne({ userId, walkthroughId, status: 'completed' });
    return !!progress;
};

// Clean up old progress records
walkthroughProgressSchema.statics.cleanupOld = async function(daysOld = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.deleteMany({
        status: { $in: ['completed', 'skipped'] },
        updatedAt: { $lt: cutoffDate }
    });
};

const WalkthroughProgress = mongoose.model('WalkthroughProgress', walkthroughProgressSchema);

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    Walkthrough,
    WalkthroughProgress
};
