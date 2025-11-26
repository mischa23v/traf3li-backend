const mongoose = require('mongoose');

const stageHistorySchema = new mongoose.Schema({
    stageId: mongoose.Schema.Types.ObjectId,
    stageName: String,
    enteredAt: Date,
    exitedAt: Date,
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,
    duration: Number // in hours
});

const completedRequirementSchema = new mongoose.Schema({
    stageId: mongoose.Schema.Types.ObjectId,
    requirementId: mongoose.Schema.Types.ObjectId,
    completedAt: Date,
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: mongoose.Schema.Types.Mixed
});

const caseStageProgressSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkflowTemplate',
        required: true
    },
    currentStageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    currentStageName: String,
    stageHistory: [stageHistorySchema],
    completedRequirements: [completedRequirementSchema],
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    totalDuration: Number, // in hours
    status: {
        type: String,
        enum: ['active', 'completed', 'paused'],
        default: 'active'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
caseStageProgressSchema.index({ caseId: 1 }, { unique: true });
caseStageProgressSchema.index({ workflowId: 1 });
caseStageProgressSchema.index({ status: 1 });

// Static method: Initialize workflow for case
caseStageProgressSchema.statics.initializeForCase = async function(caseId, workflowId, initialStageId, initialStageName) {
    const existing = await this.findOne({ caseId });
    if (existing) {
        throw new Error('Workflow already initialized for this case');
    }

    return await this.create({
        caseId,
        workflowId,
        currentStageId: initialStageId,
        currentStageName: initialStageName,
        stageHistory: [{
            stageId: initialStageId,
            stageName: initialStageName,
            enteredAt: new Date()
        }]
    });
};

// Static method: Move to next stage
caseStageProgressSchema.statics.moveToStage = async function(caseId, newStageId, newStageName, completedBy, notes) {
    const progress = await this.findOne({ caseId });
    if (!progress) {
        throw new Error('No workflow progress found for this case');
    }

    const now = new Date();

    // Update current stage history
    const currentHistory = progress.stageHistory.find(
        h => h.stageId.toString() === progress.currentStageId.toString() && !h.exitedAt
    );
    if (currentHistory) {
        currentHistory.exitedAt = now;
        currentHistory.duration = Math.round((now - currentHistory.enteredAt) / (1000 * 60 * 60)); // hours
    }

    // Add new stage to history
    progress.stageHistory.push({
        stageId: newStageId,
        stageName: newStageName,
        enteredAt: now,
        completedBy,
        notes
    });

    progress.currentStageId = newStageId;
    progress.currentStageName = newStageName;

    return await progress.save();
};

// Static method: Complete requirement
caseStageProgressSchema.statics.completeRequirement = async function(caseId, stageId, requirementId, completedBy, metadata = {}) {
    return await this.findOneAndUpdate(
        { caseId },
        {
            $push: {
                completedRequirements: {
                    stageId,
                    requirementId,
                    completedAt: new Date(),
                    completedBy,
                    metadata
                }
            }
        },
        { new: true }
    );
};

module.exports = mongoose.model('CaseStageProgress', caseStageProgressSchema);
