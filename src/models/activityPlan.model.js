const mongoose = require('mongoose');

const activityStepSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    type: {
        type: String,
        enum: ['call', 'email', 'meeting', 'task', 'whatsapp', 'sms', 'linkedin'],
        required: true
    },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    delayDays: { type: Number, default: 0 },
    delayHours: { type: Number, default: 0 },
    emailTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    taskDetails: {
        priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'] },
        durationMinutes: Number
    },
    isOptional: { type: Boolean, default: false },
    stopOnReply: { type: Boolean, default: true }
}, { _id: true });

const activityPlanSchema = new mongoose.Schema({
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    planId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: String,

    // Target entity type
    entityType: {
        type: String,
        enum: ['lead', 'contact', 'client'],
        default: 'lead'
    },

    // Plan type
    planType: {
        type: String,
        enum: ['nurture', 'onboarding', 'follow_up', 'win_back', 'custom'],
        default: 'follow_up'
    },

    // Steps
    steps: [activityStepSchema],
    totalSteps: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },

    // Settings
    settings: {
        allowWeekends: { type: Boolean, default: false },
        businessHoursOnly: { type: Boolean, default: true },
        timezone: { type: String, default: 'Asia/Riyadh' },
        stopOnConversion: { type: Boolean, default: true },
        stopOnReply: { type: Boolean, default: true }
    },

    // Usage stats
    stats: {
        timesUsed: { type: Number, default: 0 },
        activeEnrollments: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        avgTimeToComplete: { type: Number, default: 0 }
    },

    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
    tags: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false });

activityPlanSchema.index({ firmId: 1, status: 1 });
activityPlanSchema.index({ firmId: 1, planType: 1 });
activityPlanSchema.index({ firmId: 1, entityType: 1 });

activityPlanSchema.pre('save', async function(next) {
    if (!this.planId) {
        const count = await this.constructor.countDocuments({ firmId: this.firmId });
        this.planId = `PLAN-${String(count + 1).padStart(4, '0')}`;
    }
    this.totalSteps = this.steps?.length || 0;
    this.totalDays = this.steps?.reduce((sum, s) => sum + (s.delayDays || 0), 0) || 0;
    next();
});

module.exports = mongoose.model('ActivityPlan', activityPlanSchema);
