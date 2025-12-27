/**
 * Activity Plan Execution Model
 * Tracks execution of activity plans on entities (leads, clients, contacts)
 * Security: Includes firmId for multi-tenant isolation
 */

const mongoose = require('mongoose');

const stepExecutionSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    stepId: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String, required: true },
    name: { type: String, required: true },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'in_progress', 'completed', 'skipped', 'failed'],
        default: 'pending'
    },
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
    },
    skipReason: String,
    completionNotes: String,
    outcome: String
}, { _id: true });

const activityPlanExecutionSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Plan reference
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityPlan',
        required: true,
        index: true
    },
    planName: String,
    planType: String,

    // Entity (what the plan is being executed on)
    entityType: {
        type: String,
        enum: ['lead', 'client', 'contact'],
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    entityName: String,

    // Execution status
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled', 'failed'],
        default: 'active',
        index: true
    },

    // Progress tracking
    currentStep: {
        type: Number,
        default: 0
    },
    totalSteps: {
        type: Number,
        required: true
    },
    completedSteps: {
        type: Number,
        default: 0
    },
    skippedSteps: {
        type: Number,
        default: 0
    },
    progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Steps execution details
    steps: [stepExecutionSchema],

    // Dates
    startedAt: {
        type: Date,
        default: Date.now
    },
    pausedAt: Date,
    resumedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    expectedCompletionDate: Date,

    // Pause/Cancel reasons
    pauseReason: String,
    cancelReason: String,

    // User tracking
    startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pausedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resumedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Settings (copied from plan at execution start)
    settings: {
        allowWeekends: { type: Boolean, default: false },
        businessHoursOnly: { type: Boolean, default: true },
        timezone: { type: String, default: 'Asia/Riyadh' },
        stopOnConversion: { type: Boolean, default: true },
        stopOnReply: { type: Boolean, default: true }
    },

    // Execution metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed

}, {
    timestamps: true,
    versionKey: false
});

// Indexes
activityPlanExecutionSchema.index({ firmId: 1, status: 1, createdAt: -1 });
activityPlanExecutionSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
activityPlanExecutionSchema.index({ firmId: 1, planId: 1 });
activityPlanExecutionSchema.index({ firmId: 1, lawyerId: 1, status: 1 });
activityPlanExecutionSchema.index({ status: 1, currentStep: 1 });

// Calculate progress percentage before save
activityPlanExecutionSchema.pre('save', function(next) {
    if (this.totalSteps > 0) {
        this.progressPercentage = Math.round((this.completedSteps / this.totalSteps) * 100);
    }
    next();
});

// Virtual for duration
activityPlanExecutionSchema.virtual('durationDays').get(function() {
    if (!this.startedAt) return null;
    const endDate = this.completedAt || this.cancelledAt || new Date();
    return Math.ceil((endDate - this.startedAt) / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
activityPlanExecutionSchema.virtual('isOverdue').get(function() {
    if (this.status !== 'active' || !this.expectedCompletionDate) return false;
    return new Date() > this.expectedCompletionDate;
});

// Enable virtuals in JSON
activityPlanExecutionSchema.set('toJSON', { virtuals: true });
activityPlanExecutionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ActivityPlanExecution', activityPlanExecutionSchema);
