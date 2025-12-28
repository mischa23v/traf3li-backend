/**
 * CRM Setup Wizard Model
 *
 * Manages the initial CRM configuration for a firm
 * Like Finance Setup - multi-step wizard with Basic/Advanced views
 *
 * Steps:
 * 1. Lead Sources & Channels
 * 2. Lead Scoring Configuration
 * 3. Pipeline Stages
 * 4. Lead Assignment Rules
 * 5. Qualification Criteria (BANT)
 * 6. Activity Types
 * 7. Conflict of Interest Rules
 * 8. Client Intake Forms
 * 9. Notifications & Reminders
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Lead source configuration
const LeadSourceSchema = new Schema({
    code: { type: String, required: true, maxlength: 50 },
    name: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, maxlength: 100 },
    category: {
        type: String,
        enum: ['digital', 'referral', 'direct', 'event', 'other'],
        default: 'other'
    },
    trackingEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { _id: true });

// Lead stage configuration
const LeadStageSchema = new Schema({
    code: { type: String, required: true, maxlength: 50 },
    name: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, maxlength: 100 },
    color: { type: String, default: '#3B82F6' },
    probability: { type: Number, default: 50, min: 0, max: 100 },
    rottenDays: { type: Number, default: 14 },
    order: { type: Number, default: 0 },
    isInitial: { type: Boolean, default: false },
    isFinal: { type: Boolean, default: false },
    requiresReason: { type: Boolean, default: false },
    nextStages: [{ type: String }] // Valid transitions
}, { _id: true });

// Activity type configuration
const ActivityTypeSchema = new Schema({
    code: { type: String, required: true, maxlength: 50 },
    name: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, maxlength: 100 },
    icon: { type: String, maxlength: 50 },
    color: { type: String, default: '#3B82F6' },
    category: {
        type: String,
        enum: ['communication', 'meeting', 'task', 'document', 'system'],
        default: 'task'
    },
    defaultDuration: { type: Number, default: 30 }, // minutes
    countsAsContact: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { _id: true });

// Lost reason configuration
const LostReasonSchema = new Schema({
    code: { type: String, required: true, maxlength: 50 },
    reason: { type: String, required: true, maxlength: 200 },
    reasonAr: { type: String, maxlength: 200 },
    category: {
        type: String,
        enum: ['price', 'competitor', 'timing', 'fit', 'internal', 'other'],
        default: 'other'
    },
    requiresNotes: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { _id: true });

// Conflict rule configuration
const ConflictRuleSchema = new Schema({
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, maxlength: 200 },
    ruleType: {
        type: String,
        enum: ['opposing_party', 'same_matter', 'related_party', 'industry', 'custom'],
        default: 'opposing_party'
    },
    severity: {
        type: String,
        enum: ['block', 'warn', 'info'],
        default: 'warn'
    },
    checkAgainst: {
        type: String,
        enum: ['clients', 'leads', 'cases', 'all'],
        default: 'all'
    },
    autoCheck: { type: Boolean, default: true },
    requiresWaiver: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { _id: false });

const crmSetupSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Lead Sources & Channels
    // ═══════════════════════════════════════════════════════════════
    leadSources: {
        sources: {
            type: [LeadSourceSchema],
            default: [
                { code: 'website', name: 'Website', nameAr: 'الموقع الإلكتروني', category: 'digital', order: 1 },
                { code: 'referral', name: 'Referral', nameAr: 'إحالة', category: 'referral', order: 2 },
                { code: 'social', name: 'Social Media', nameAr: 'وسائل التواصل الاجتماعي', category: 'digital', order: 3 },
                { code: 'advertising', name: 'Advertising', nameAr: 'إعلان', category: 'digital', order: 4 },
                { code: 'cold_call', name: 'Cold Call', nameAr: 'مكالمة باردة', category: 'direct', order: 5 },
                { code: 'walk_in', name: 'Walk-in', nameAr: 'حضور شخصي', category: 'direct', order: 6 },
                { code: 'event', name: 'Event', nameAr: 'فعالية', category: 'event', order: 7 },
                { code: 'other', name: 'Other', nameAr: 'أخرى', category: 'other', order: 8 }
            ]
        },
        trackUTM: { type: Boolean, default: true },
        requireSource: { type: Boolean, default: false },
        defaultSource: { type: String, default: 'website' }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Lead Scoring Configuration
    // ═══════════════════════════════════════════════════════════════
    leadScoring: {
        enabled: { type: Boolean, default: true },
        maxScore: { type: Number, default: 150 },
        // BANT Weights (0-30 each = 120 max)
        budgetWeight: { type: Number, default: 30, min: 0, max: 50 },
        authorityWeight: { type: Number, default: 30, min: 0, max: 50 },
        needWeight: { type: Number, default: 30, min: 0, max: 50 },
        timelineWeight: { type: Number, default: 30, min: 0, max: 50 },
        // Engagement Score (0-15)
        engagementWeight: { type: Number, default: 15, min: 0, max: 30 },
        // Fit Score (0-15)
        fitWeight: { type: Number, default: 15, min: 0, max: 30 },
        // Score thresholds
        hotLeadThreshold: { type: Number, default: 100 },
        warmLeadThreshold: { type: Number, default: 60 },
        coldLeadThreshold: { type: Number, default: 30 },
        // Decay settings
        enableDecay: { type: Boolean, default: true },
        decayDays: { type: Number, default: 30 },
        decayPercent: { type: Number, default: 10, min: 0, max: 50 },
        // Auto-qualification
        autoQualifyAbove: { type: Number, default: 80 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Pipeline Stages
    // ═══════════════════════════════════════════════════════════════
    pipelineSettings: {
        defaultPipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
        stages: {
            type: [LeadStageSchema],
            default: [
                { code: 'new', name: 'New', nameAr: 'جديد', probability: 10, order: 1, isInitial: true, color: '#9CA3AF', nextStages: ['contacted', 'lost'] },
                { code: 'contacted', name: 'Contacted', nameAr: 'تم التواصل', probability: 20, order: 2, color: '#3B82F6', nextStages: ['qualified', 'dormant', 'lost'] },
                { code: 'qualified', name: 'Qualified', nameAr: 'مؤهل', probability: 40, order: 3, color: '#8B5CF6', nextStages: ['proposal', 'dormant', 'lost'] },
                { code: 'proposal', name: 'Proposal', nameAr: 'عرض السعر', probability: 60, order: 4, color: '#F59E0B', nextStages: ['negotiation', 'lost'] },
                { code: 'negotiation', name: 'Negotiation', nameAr: 'التفاوض', probability: 80, order: 5, color: '#EF4444', nextStages: ['won', 'lost'] },
                { code: 'won', name: 'Won', nameAr: 'فاز', probability: 100, order: 6, isFinal: true, color: '#10B981' },
                { code: 'lost', name: 'Lost', nameAr: 'خسر', probability: 0, order: 7, isFinal: true, requiresReason: true, color: '#6B7280' },
                { code: 'dormant', name: 'Dormant', nameAr: 'خامل', probability: 5, order: 8, color: '#374151', nextStages: ['contacted', 'lost'] }
            ]
        },
        defaultRottenDays: { type: Number, default: 14 },
        requireLostReason: { type: Boolean, default: true },
        lostReasons: {
            type: [LostReasonSchema],
            default: [
                { code: 'price', reason: 'Price too high', reasonAr: 'السعر مرتفع', category: 'price', order: 1 },
                { code: 'competitor', reason: 'Chose competitor', reasonAr: 'اختار منافس', category: 'competitor', order: 2 },
                { code: 'no_response', reason: 'No response', reasonAr: 'لا يوجد رد', category: 'timing', order: 3 },
                { code: 'not_qualified', reason: 'Not qualified', reasonAr: 'غير مؤهل', category: 'fit', order: 4 },
                { code: 'timing', reason: 'Bad timing', reasonAr: 'توقيت غير مناسب', category: 'timing', order: 5 },
                { code: 'budget', reason: 'No budget', reasonAr: 'لا توجد ميزانية', category: 'price', order: 6 },
                { code: 'other', reason: 'Other', reasonAr: 'أخرى', category: 'other', requiresNotes: true, order: 7 }
            ]
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Lead Assignment Rules
    // ═══════════════════════════════════════════════════════════════
    assignmentSettings: {
        enabled: { type: Boolean, default: false },
        method: {
            type: String,
            enum: ['manual', 'round_robin', 'least_loaded', 'territory', 'skill_based'],
            default: 'manual'
        },
        defaultAssigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
        autoAssignOnCreate: { type: Boolean, default: false },
        notifyOnAssign: { type: Boolean, default: true },
        leadCapPerUser: { type: Number, default: 50 },
        considerActiveLeadsOnly: { type: Boolean, default: true },
        reassignOnInactivity: { type: Boolean, default: false },
        inactivityDays: { type: Number, default: 7 },
        // Territory rules
        enableTerritories: { type: Boolean, default: false },
        defaultTerritoryId: { type: Schema.Types.ObjectId, ref: 'Territory' }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Qualification Criteria (BANT)
    // ═══════════════════════════════════════════════════════════════
    qualificationSettings: {
        useBANT: { type: Boolean, default: true },
        // Budget options
        budgetOptions: {
            type: [String],
            default: ['unknown', 'low', 'medium', 'high', 'premium']
        },
        budgetThresholds: {
            low: { type: Number, default: 10000 },      // Up to 100 SAR
            medium: { type: Number, default: 50000 },   // Up to 500 SAR
            high: { type: Number, default: 200000 },    // Up to 2000 SAR
            premium: { type: Number, default: 200001 }  // Above 2000 SAR
        },
        // Authority options
        authorityOptions: {
            type: [String],
            default: ['unknown', 'researcher', 'influencer', 'decision_maker']
        },
        // Need options
        needOptions: {
            type: [String],
            default: ['unknown', 'exploring', 'planning', 'urgent']
        },
        // Timeline options
        timelineOptions: {
            type: [String],
            default: ['unknown', 'no_timeline', 'this_year', 'this_quarter', 'this_month', 'immediate']
        },
        requireAllForQualified: { type: Boolean, default: false },
        minimumFieldsForQualified: { type: Number, default: 2 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Activity Types
    // ═══════════════════════════════════════════════════════════════
    activityTypes: {
        types: {
            type: [ActivityTypeSchema],
            default: [
                { code: 'call', name: 'Phone Call', nameAr: 'مكالمة هاتفية', icon: 'phone', category: 'communication', defaultDuration: 15, order: 1 },
                { code: 'email', name: 'Email', nameAr: 'بريد إلكتروني', icon: 'mail', category: 'communication', defaultDuration: 10, order: 2 },
                { code: 'meeting', name: 'Meeting', nameAr: 'اجتماع', icon: 'users', category: 'meeting', defaultDuration: 60, order: 3 },
                { code: 'video_call', name: 'Video Call', nameAr: 'مكالمة فيديو', icon: 'video', category: 'meeting', defaultDuration: 30, order: 4 },
                { code: 'whatsapp', name: 'WhatsApp', nameAr: 'واتساب', icon: 'message-circle', category: 'communication', defaultDuration: 5, order: 5 },
                { code: 'note', name: 'Note', nameAr: 'ملاحظة', icon: 'file-text', category: 'document', countsAsContact: false, order: 6 },
                { code: 'task', name: 'Task', nameAr: 'مهمة', icon: 'check-square', category: 'task', countsAsContact: false, order: 7 },
                { code: 'document', name: 'Document', nameAr: 'مستند', icon: 'file', category: 'document', countsAsContact: false, order: 8 }
            ]
        },
        defaultActivityType: { type: String, default: 'call' },
        requireNotes: { type: Boolean, default: false },
        trackDuration: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Conflict of Interest Rules
    // ═══════════════════════════════════════════════════════════════
    conflictSettings: {
        enabled: { type: Boolean, default: true },
        autoCheckOnLeadCreate: { type: Boolean, default: true },
        autoCheckOnConvert: { type: Boolean, default: true },
        rules: {
            type: [ConflictRuleSchema],
            default: [
                { name: 'Opposing Party Check', nameAr: 'فحص الطرف المقابل', ruleType: 'opposing_party', severity: 'block', checkAgainst: 'all', autoCheck: true, requiresWaiver: true },
                { name: 'Same Matter Check', nameAr: 'فحص نفس القضية', ruleType: 'same_matter', severity: 'warn', checkAgainst: 'cases', autoCheck: true },
                { name: 'Related Party Check', nameAr: 'فحص الأطراف ذات العلاقة', ruleType: 'related_party', severity: 'info', checkAgainst: 'clients', autoCheck: false }
            ]
        },
        matchFields: {
            type: [String],
            default: ['nationalId', 'crNumber', 'phone', 'email', 'companyName']
        },
        requireWaiverForBlock: { type: Boolean, default: true },
        waiverApproverRoles: {
            type: [String],
            default: ['admin', 'partner']
        },
        conflictCooldownDays: { type: Number, default: 365 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 8: Client Intake Forms
    // ═══════════════════════════════════════════════════════════════
    intakeSettings: {
        enabled: { type: Boolean, default: true },
        defaultFormId: { type: Schema.Types.ObjectId, ref: 'IntakeForm' },
        requireIntakeBeforeConvert: { type: Boolean, default: true },
        caseTypes: {
            type: [String],
            default: ['civil', 'criminal', 'family', 'commercial', 'labor', 'real_estate', 'administrative', 'execution', 'other']
        },
        urgencyLevels: {
            type: [String],
            default: ['low', 'normal', 'high', 'urgent']
        },
        requireConflictCheck: { type: Boolean, default: true },
        requireDocuments: { type: Boolean, default: false },
        autoCreateCase: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 9: Notifications & Reminders
    // ═══════════════════════════════════════════════════════════════
    notificationSettings: {
        emailEnabled: { type: Boolean, default: true },
        pushEnabled: { type: Boolean, default: true },
        inAppEnabled: { type: Boolean, default: true },
        // Lead notifications
        notifyOnNewLead: { type: Boolean, default: true },
        notifyOnLeadAssigned: { type: Boolean, default: true },
        notifyOnLeadScoreChange: { type: Boolean, default: false },
        scoreChangeThreshold: { type: Number, default: 20 },
        // Status notifications
        notifyOnWon: { type: Boolean, default: true },
        notifyOnLost: { type: Boolean, default: true },
        notifyOnStageChange: { type: Boolean, default: false },
        // Activity reminders
        enableFollowUpReminders: { type: Boolean, default: true },
        reminderDays: {
            type: [Number],
            default: [1, 3, 7]
        },
        // Stale lead alerts
        enableStaleAlerts: { type: Boolean, default: true },
        staleAlertDays: { type: Number, default: 14 },
        // Daily digest
        enableDailyDigest: { type: Boolean, default: false },
        digestTime: { type: String, default: '08:00' }
    },

    // ═══════════════════════════════════════════════════════════════
    // Setup Progress Tracking
    // ═══════════════════════════════════════════════════════════════
    currentStep: { type: Number, default: 1, min: 1, max: 9 },
    completedSteps: [{ type: Number }],
    setupCompleted: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // Audit
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
crmSetupSchema.index({ firmId: 1 }, { unique: true, sparse: true });
crmSetupSchema.index({ lawyerId: 1 }, { unique: true, sparse: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create CRM setup for firm/lawyer
 */
crmSetupSchema.statics.getOrCreate = async function(firmId, lawyerId, userId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    let setup = await this.findOne(query);
    if (!setup) {
        setup = new this({
            ...query,
            createdBy: userId,
            currentStep: 1,
            completedSteps: []
        });
        await setup.save();
    }
    return setup;
};

/**
 * Mark a step as completed
 */
crmSetupSchema.methods.completeStep = async function(stepNumber, userId) {
    if (!this.completedSteps.includes(stepNumber)) {
        this.completedSteps.push(stepNumber);
        this.completedSteps.sort((a, b) => a - b);
    }

    if (stepNumber === this.currentStep && stepNumber < 9) {
        this.currentStep = stepNumber + 1;
    }

    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Complete the entire setup
 */
crmSetupSchema.methods.completeSetup = async function(userId) {
    this.setupCompleted = true;
    this.completedAt = new Date();
    this.completedBy = userId;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Check if all required steps are completed
 * Required: Lead Sources, Lead Scoring, Pipeline, Activity Types
 */
crmSetupSchema.methods.canComplete = function() {
    const requiredSteps = [1, 2, 3, 6];
    return requiredSteps.every(step => this.completedSteps.includes(step));
};

/**
 * Get stage by code
 */
crmSetupSchema.methods.getStage = function(stageCode) {
    return this.pipelineSettings.stages.find(s => s.code === stageCode);
};

/**
 * Get valid next stages for a given stage
 */
crmSetupSchema.methods.getNextStages = function(currentStageCode) {
    const stage = this.getStage(currentStageCode);
    if (!stage || !stage.nextStages) return [];
    return stage.nextStages.map(code => this.getStage(code)).filter(Boolean);
};

/**
 * Calculate lead score based on settings
 */
crmSetupSchema.methods.calculateLeadScore = function(qualification, activityData = {}) {
    if (!this.leadScoring.enabled) return 0;

    const scoring = {
        budget: { unknown: 0, low: 8, medium: 15, high: 23, premium: 30 },
        authority: { unknown: 0, researcher: 8, influencer: 18, decision_maker: 30 },
        need: { unknown: 0, exploring: 8, planning: 18, urgent: 30 },
        timeline: { unknown: 0, no_timeline: 0, this_year: 8, this_quarter: 15, this_month: 23, immediate: 30 }
    };

    // Scale scores based on weights
    const budgetScore = (scoring.budget[qualification.budget] || 0) * (this.leadScoring.budgetWeight / 30);
    const authorityScore = (scoring.authority[qualification.authority] || 0) * (this.leadScoring.authorityWeight / 30);
    const needScore = (scoring.need[qualification.need] || 0) * (this.leadScoring.needWeight / 30);
    const timelineScore = (scoring.timeline[qualification.timeline] || 0) * (this.leadScoring.timelineWeight / 30);

    // Engagement score
    const engagementScore = Math.min(this.leadScoring.engagementWeight, Math.floor(
        (activityData.activityCount || 0) * 1.5 +
        (activityData.callCount || 0) * 2 +
        (activityData.meetingCount || 0) * 3
    ));

    // Fit score
    let fitScore = 0;
    if (activityData.estimatedValue > 0) fitScore += 5;
    if (activityData.estimatedValue > 50000) fitScore += 5;
    if (activityData.conflictCheckCompleted) fitScore += 3;
    if (activityData.caseType) fitScore += 2;
    fitScore = Math.min(this.leadScoring.fitWeight, fitScore);

    return Math.round(budgetScore + authorityScore + needScore + timelineScore + engagementScore + fitScore);
};

/**
 * Get lead temperature based on score
 */
crmSetupSchema.methods.getLeadTemperature = function(score) {
    if (score >= this.leadScoring.hotLeadThreshold) return 'hot';
    if (score >= this.leadScoring.warmLeadThreshold) return 'warm';
    if (score >= this.leadScoring.coldLeadThreshold) return 'cold';
    return 'ice';
};

module.exports = mongoose.model('CrmSetup', crmSetupSchema);
