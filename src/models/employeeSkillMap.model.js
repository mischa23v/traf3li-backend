/**
 * Employee Skill Map Model
 *
 * Maps skills to employees with SFIA 7-level proficiency framework.
 * Tracks skill development, certifications, and CPD credits.
 *
 * Enhanced Features:
 * - SFIA 7-level proficiency (1-7) with level progress (0-100%)
 * - 360-degree ratings (self, manager, peer)
 * - Certification tracking with CPD credits
 * - Skill development history and trends
 * - Expiry management and renewal alerts
 * - Learning path progress
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SKILL HISTORY SCHEMA
// ═══════════════════════════════════════════════════════════════

const skillHistorySchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    changeType: {
        type: String,
        enum: [
            'level_change',
            'certification_added',
            'certification_renewed',
            'certification_expired',
            'verification_updated',
            'assessment_completed',
            'cpd_added'
        ],
        default: 'level_change'
    },
    fromLevel: Number,
    toLevel: Number,
    fromProgress: Number,  // 0-100%
    toProgress: Number,
    reason: String,
    reasonAr: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    evidence: String  // URL or description
});

// ═══════════════════════════════════════════════════════════════
// CPD (CONTINUING PROFESSIONAL DEVELOPMENT) SCHEMA
// ═══════════════════════════════════════════════════════════════

const cpdRecordSchema = new mongoose.Schema({
    activityType: {
        type: String,
        enum: [
            'course',
            'conference',
            'webinar',
            'workshop',
            'self_study',
            'mentoring',
            'publication',
            'certification',
            'project',
            'other'
        ],
        required: true
    },
    activityName: { type: String, required: true },
    activityNameAr: String,
    provider: String,
    providerAr: String,
    startDate: Date,
    endDate: Date,
    credits: { type: Number, required: true, min: 0 },  // CPD credits earned
    verificationUrl: String,
    certificateUrl: String,
    description: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════════════════════════
// LEARNING PATH PROGRESS SCHEMA
// ═══════════════════════════════════════════════════════════════

const learningProgressSchema = new mongoose.Schema({
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    resourceType: {
        type: String,
        enum: ['course', 'book', 'video', 'article', 'practice', 'mentorship', 'certification']
    },
    resourceName: String,
    provider: String,
    targetLevel: { type: Number, min: 1, max: 7 },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
        default: 'not_started'
    },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    startedAt: Date,
    completedAt: Date,
    notes: String
});

// ═══════════════════════════════════════════════════════════════
// MAIN EMPLOYEE SKILL MAP SCHEMA
// ═══════════════════════════════════════════════════════════════

const employeeSkillMapSchema = new mongoose.Schema({
    // References
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee is required'],
        index: true
    },
    skillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: [true, 'Skill is required'],
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SFIA 7-LEVEL PROFICIENCY
    // ═══════════════════════════════════════════════════════════════

    // Current proficiency (1-7 SFIA levels)
    proficiencyLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 7,
        default: 1
    },

    // Progress within current level (0-100%)
    // e.g., Level 3 at 75% = close to Level 4
    levelProgress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // Effective proficiency = level + (progress/100)
    // e.g., Level 3 at 75% = 3.75
    effectiveProficiency: {
        type: Number,
        min: 1,
        max: 8
    },

    // ═══════════════════════════════════════════════════════════════
    // 360-DEGREE ASSESSMENTS
    // ═══════════════════════════════════════════════════════════════

    selfAssessedLevel: {
        type: Number,
        min: 1,
        max: 7
    },
    selfAssessedProgress: {
        type: Number,
        min: 0,
        max: 100
    },
    selfAssessedAt: Date,
    selfConfidence: {
        type: Number,
        min: 1,
        max: 5  // How confident in self-rating
    },

    managerAssessedLevel: {
        type: Number,
        min: 1,
        max: 7
    },
    managerAssessedProgress: {
        type: Number,
        min: 0,
        max: 100
    },
    managerAssessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managerAssessedAt: Date,
    managerNotes: String,

    // Peer ratings (aggregated from 360 reviews)
    peerAverageLevel: {
        type: Number,
        min: 1,
        max: 7
    },
    peerRatingsCount: {
        type: Number,
        default: 0
    },
    lastPeerReviewAt: Date,

    // Calibrated/final rating (after calibration sessions)
    calibratedLevel: {
        type: Number,
        min: 1,
        max: 7
    },
    calibratedProgress: {
        type: Number,
        min: 0,
        max: 100
    },
    calibratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    calibratedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // TARGET & GAP ANALYSIS
    // ═══════════════════════════════════════════════════════════════

    targetLevel: {
        type: Number,
        min: 1,
        max: 7
    },
    targetDate: Date,
    gap: {
        type: Number  // Target - Current (negative = exceeded target)
    },
    gapPercentage: {
        type: Number  // Gap as percentage of target
    },

    // Trend analysis
    trend: {
        type: String,
        enum: ['improving', 'stable', 'declining', 'new'],
        default: 'new'
    },
    trendPeriod: String,  // e.g., "Last 6 months"

    // ═══════════════════════════════════════════════════════════════
    // VERIFICATION & CERTIFICATION
    // ═══════════════════════════════════════════════════════════════

    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    verificationDate: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationMethod: {
        type: String,
        enum: [
            'certification',
            'test',
            'assessment',
            'portfolio',
            'reference',
            'manager_approval',
            'peer_endorsement',
            'project_evidence',
            'none'
        ],
        default: 'none'
    },
    verificationDetails: String,
    verificationEvidence: String,  // URL to evidence

    // Certification details
    hasCertification: {
        type: Boolean,
        default: false
    },
    certificationName: String,
    certificationNameAr: String,
    certificationNumber: String,
    certificationBody: String,
    certificationBodyAr: String,
    certificationBodyUrl: String,
    certificationDate: Date,
    certificationExpiry: {
        type: Date,
        index: true
    },
    isCertificationExpired: {
        type: Boolean,
        default: false
    },
    certificationDocumentUrl: String,
    certificationCredlyUrl: String,  // Digital badge URL

    // Renewal tracking
    renewalReminderSent: {
        type: Boolean,
        default: false
    },
    renewalReminderDate: Date,
    renewalInProgressDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // CPD (CONTINUING PROFESSIONAL DEVELOPMENT)
    // ═══════════════════════════════════════════════════════════════

    cpdRequired: {
        type: Boolean,
        default: false
    },
    cpdCreditsRequired: {
        type: Number,
        default: 0  // Credits required per year
    },
    cpdCreditsEarned: {
        type: Number,
        default: 0
    },
    cpdPeriodStart: Date,
    cpdPeriodEnd: Date,
    cpdRecords: [cpdRecordSchema],

    // ═══════════════════════════════════════════════════════════════
    // EXPERIENCE & ACQUISITION
    // ═══════════════════════════════════════════════════════════════

    yearsOfExperience: {
        type: Number,
        default: 0,
        min: 0
    },
    acquiredDate: {
        type: Date,
        default: Date.now
    },
    acquiredMethod: {
        type: String,
        enum: ['training', 'education', 'self_taught', 'on_job', 'certification', 'prior_experience'],
        default: 'on_job'
    },

    // Primary skill usage
    isPrimarySkill: {
        type: Boolean,
        default: false
    },
    usageFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'rarely', 'not_used'],
        default: 'weekly'
    },
    lastUsedDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // LEARNING & DEVELOPMENT
    // ═══════════════════════════════════════════════════════════════

    relatedTrainingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrainingProgram'
    },
    trainingCompletedDate: Date,

    developmentPlan: String,
    developmentPlanAr: String,
    developmentActions: [{
        action: String,
        actionAr: String,
        dueDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
        completedAt: Date
    }],

    nextReviewDate: Date,
    reviewCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi_annually', 'annually'],
        default: 'quarterly'
    },

    // Learning path progress
    learningProgress: [learningProgressSchema],

    // Mentor for this skill
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    mentorshipStartDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // ENDORSEMENTS (LinkedIn-style)
    // ═══════════════════════════════════════════════════════════════

    endorsements: [{
        endorsedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        endorserName: String,
        endorserRole: String,
        relationship: {
            type: String,
            enum: ['manager', 'peer', 'direct_report', 'client', 'external'],
            default: 'peer'
        },
        comment: String,
        endorsedAt: { type: Date, default: Date.now }
    }],
    endorsementCount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // HISTORY & AUDIT
    // ═══════════════════════════════════════════════════════════════

    skillHistory: [skillHistorySchema],

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Notes
    notes: String,
    notesAr: String,

    // Attachments (certificates, portfolios, etc.)
    attachments: [{
        name: String,
        url: String,
        type: {
            type: String,
            enum: ['certificate', 'portfolio', 'evidence', 'badge', 'transcript', 'other']
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANT
    // ═══════════════════════════════════════════════════════════════

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

employeeSkillMapSchema.index({ firmId: 1, employeeId: 1, skillId: 1 }, { unique: true });
employeeSkillMapSchema.index({ firmId: 1, skillId: 1, proficiencyLevel: -1 });
employeeSkillMapSchema.index({ firmId: 1, certificationExpiry: 1, isCertificationExpired: 1 });
employeeSkillMapSchema.index({ firmId: 1, employeeId: 1, isActive: 1, proficiencyLevel: -1 });
employeeSkillMapSchema.index({ firmId: 1, nextReviewDate: 1 });
employeeSkillMapSchema.index({ firmId: 1, 'cpdPeriodEnd': 1, cpdRequired: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

employeeSkillMapSchema.pre('save', function(next) {
    // Calculate effective proficiency
    this.effectiveProficiency = this.proficiencyLevel + (this.levelProgress || 0) / 100;

    // Check certification expiry
    if (this.certificationExpiry) {
        this.isCertificationExpired = new Date() > this.certificationExpiry;
    }

    // Calculate gap
    if (this.targetLevel) {
        this.gap = this.targetLevel - this.proficiencyLevel;
        this.gapPercentage = parseFloat(((this.gap / this.targetLevel) * 100).toFixed(1));
    }

    // Update endorsement count
    this.endorsementCount = this.endorsements?.length || 0;

    // Calculate CPD credits earned
    if (this.cpdRecords && this.cpdRecords.length > 0) {
        this.cpdCreditsEarned = this.cpdRecords.reduce((sum, r) => sum + (r.credits || 0), 0);
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Days until certification expiry
employeeSkillMapSchema.virtual('daysUntilCertificationExpiry').get(function() {
    if (!this.certificationExpiry) return null;
    const now = new Date();
    const diffTime = this.certificationExpiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// CPD compliance percentage
employeeSkillMapSchema.virtual('cpdCompliancePercent').get(function() {
    if (!this.cpdRequired || !this.cpdCreditsRequired || this.cpdCreditsRequired === 0) return 100;
    return Math.min(100, parseFloat(((this.cpdCreditsEarned / this.cpdCreditsRequired) * 100).toFixed(1)));
});

// Is skill at target
employeeSkillMapSchema.virtual('isAtTarget').get(function() {
    if (!this.targetLevel) return true;
    return this.proficiencyLevel >= this.targetLevel;
});

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════

employeeSkillMapSchema.methods.updateProficiency = async function(newLevel, newProgress, reason, userId) {
    // Add to history
    this.skillHistory.push({
        changeType: 'level_change',
        fromLevel: this.proficiencyLevel,
        toLevel: newLevel,
        fromProgress: this.levelProgress,
        toProgress: newProgress,
        reason,
        verifiedBy: userId,
        date: new Date()
    });

    // Determine trend
    if (newLevel > this.proficiencyLevel || (newLevel === this.proficiencyLevel && newProgress > this.levelProgress)) {
        this.trend = 'improving';
    } else if (newLevel < this.proficiencyLevel || (newLevel === this.proficiencyLevel && newProgress < this.levelProgress)) {
        this.trend = 'declining';
    } else {
        this.trend = 'stable';
    }

    this.proficiencyLevel = newLevel;
    this.levelProgress = newProgress;
    this.updatedBy = userId;

    return this.save();
};

employeeSkillMapSchema.methods.verify = async function(verificationData, userId) {
    this.isVerified = true;
    this.verificationDate = new Date();
    this.verifiedBy = userId;
    this.verificationMethod = verificationData.method || 'manager_approval';
    this.verificationDetails = verificationData.details;
    this.verificationEvidence = verificationData.evidenceUrl;

    this.skillHistory.push({
        changeType: 'verification_updated',
        fromLevel: this.proficiencyLevel,
        toLevel: this.proficiencyLevel,
        reason: `Verified via ${this.verificationMethod}`,
        verifiedBy: userId,
        date: new Date()
    });

    if (verificationData.certification) {
        this.hasCertification = true;
        this.certificationName = verificationData.certification.name;
        this.certificationNameAr = verificationData.certification.nameAr;
        this.certificationNumber = verificationData.certification.number;
        this.certificationBody = verificationData.certification.body;
        this.certificationBodyAr = verificationData.certification.bodyAr;
        this.certificationDate = verificationData.certification.date;
        this.certificationExpiry = verificationData.certification.expiry;
        this.certificationDocumentUrl = verificationData.certification.documentUrl;

        this.skillHistory.push({
            changeType: 'certification_added',
            fromLevel: this.proficiencyLevel,
            toLevel: this.proficiencyLevel,
            reason: `Certification: ${this.certificationName}`,
            verifiedBy: userId,
            date: new Date()
        });
    }

    this.updatedBy = userId;
    return this.save();
};

employeeSkillMapSchema.methods.renewCertification = async function(renewalData, userId) {
    this.certificationExpiry = renewalData.newExpiry;
    if (renewalData.newNumber) this.certificationNumber = renewalData.newNumber;
    if (renewalData.documentUrl) this.certificationDocumentUrl = renewalData.documentUrl;
    this.isCertificationExpired = false;
    this.verificationDate = new Date();
    this.renewalReminderSent = false;
    this.renewalReminderDate = null;
    this.renewalInProgressDate = null;
    this.updatedBy = userId;

    this.skillHistory.push({
        changeType: 'certification_renewed',
        fromLevel: this.proficiencyLevel,
        toLevel: this.proficiencyLevel,
        reason: renewalData.reason || 'Certification renewed',
        verifiedBy: userId,
        date: new Date()
    });

    return this.save();
};

employeeSkillMapSchema.methods.addCpdRecord = async function(cpdData, userId) {
    this.cpdRecords.push({
        ...cpdData,
        verifiedBy: userId,
        verifiedAt: new Date()
    });

    this.skillHistory.push({
        changeType: 'cpd_added',
        fromLevel: this.proficiencyLevel,
        toLevel: this.proficiencyLevel,
        reason: `CPD: ${cpdData.activityName} (${cpdData.credits} credits)`,
        verifiedBy: userId,
        date: new Date()
    });

    this.updatedBy = userId;
    return this.save();
};

employeeSkillMapSchema.methods.addEndorsement = async function(endorsementData, endorserInfo) {
    // Check if already endorsed by this user
    const existingEndorsement = this.endorsements.find(
        e => e.endorsedBy?.toString() === endorsementData.endorsedBy.toString()
    );

    if (existingEndorsement) {
        throw new Error('Already endorsed by this user');
    }

    this.endorsements.push({
        endorsedBy: endorsementData.endorsedBy,
        endorserName: endorserInfo.name,
        endorserRole: endorserInfo.role,
        relationship: endorsementData.relationship || 'peer',
        comment: endorsementData.comment,
        endorsedAt: new Date()
    });

    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════

employeeSkillMapSchema.statics.getEmployeeSkills = function(firmId, employeeId, options = {}) {
    const query = { firmId, employeeId, isActive: true };

    if (options.isVerified !== undefined) {
        query.isVerified = options.isVerified;
    }
    if (options.minLevel) {
        query.proficiencyLevel = { $gte: options.minLevel };
    }
    if (options.category) {
        // Need to join with Skill model
    }

    return this.find(query)
        .populate('skillId', 'name nameAr category proficiencyLevels isCoreSkill')
        .populate('verifiedBy', 'firstName lastName email')
        .populate('mentorId', 'firstName lastName employeeId')
        .sort({ proficiencyLevel: -1, endorsementCount: -1 });
};

employeeSkillMapSchema.statics.findEmployeesWithSkill = function(firmId, skillId, options = {}) {
    const query = { firmId, skillId, isActive: true };

    if (options.minLevel) {
        query.proficiencyLevel = { $gte: options.minLevel };
    }
    if (options.isVerified) {
        query.isVerified = true;
    }
    if (options.hasCertification) {
        query.hasCertification = true;
        query.isCertificationExpired = false;
    }

    return this.find(query)
        .populate('employeeId', 'employeeId firstName lastName department designation')
        .sort({ proficiencyLevel: -1, effectiveProficiency: -1 });
};

employeeSkillMapSchema.statics.getSkillMatrix = async function(firmId, departmentId = null) {
    const Employee = mongoose.model('Employee');
    const { Skill } = require('./skill.model');

    // Get all active skills
    const skills = await Skill.find({ firmId, isActive: true }).lean();

    // Get employees
    const employeeQuery = { firmId, status: 'active' };
    if (departmentId) employeeQuery.department = departmentId;
    const employees = await Employee.find(employeeQuery).select('employeeId firstName lastName').lean();

    // Get all skill mappings
    const mappings = await this.find({
        firmId,
        employeeId: { $in: employees.map(e => e._id) },
        isActive: true
    }).lean();

    // Build matrix
    const matrix = employees.map(employee => {
        const employeeSkills = mappings.filter(m => m.employeeId.equals(employee._id));
        const skillLevels = {};

        skills.forEach(skill => {
            const mapping = employeeSkills.find(m => m.skillId.equals(skill._id));
            skillLevels[skill._id.toString()] = {
                level: mapping?.proficiencyLevel || 0,
                progress: mapping?.levelProgress || 0,
                effective: mapping?.effectiveProficiency || 0,
                verified: mapping?.isVerified || false,
                certified: mapping?.hasCertification || false
            };
        });

        return {
            employee: {
                _id: employee._id,
                employeeId: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName}`
            },
            skills: skillLevels,
            avgProficiency: employeeSkills.length > 0
                ? parseFloat((employeeSkills.reduce((sum, m) => sum + m.effectiveProficiency, 0) / employeeSkills.length).toFixed(2))
                : 0
        };
    });

    return {
        skills: skills.map(s => ({ _id: s._id, name: s.name, category: s.category, isCoreSkill: s.isCoreSkill })),
        matrix
    };
};

employeeSkillMapSchema.statics.getExpiringCertifications = function(firmId, daysThreshold = 30) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.find({
        firmId,
        isActive: true,
        hasCertification: true,
        isCertificationExpired: false,
        certificationExpiry: { $gte: now, $lte: thresholdDate }
    })
        .populate('employeeId', 'employeeId firstName lastName email')
        .populate('skillId', 'name nameAr')
        .sort({ certificationExpiry: 1 });
};

employeeSkillMapSchema.statics.getCpdNonCompliant = function(firmId) {
    const now = new Date();

    return this.find({
        firmId,
        isActive: true,
        cpdRequired: true,
        cpdPeriodEnd: { $lte: now },
        $expr: { $lt: ['$cpdCreditsEarned', '$cpdCreditsRequired'] }
    })
        .populate('employeeId', 'employeeId firstName lastName email')
        .populate('skillId', 'name nameAr')
        .sort({ cpdPeriodEnd: 1 });
};

employeeSkillMapSchema.statics.getSkillGapAnalysis = async function(firmId, skillId, targetLevel = 3) {
    const result = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                skillId: new mongoose.Types.ObjectId(skillId),
                isActive: true
            }
        },
        {
            $group: {
                _id: '$proficiencyLevel',
                count: { $sum: 1 },
                employees: { $push: '$employeeId' },
                avgProgress: { $avg: '$levelProgress' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const belowTarget = result
        .filter(r => r._id < targetLevel)
        .reduce((sum, r) => sum + r.count, 0);

    const atOrAboveTarget = result
        .filter(r => r._id >= targetLevel)
        .reduce((sum, r) => sum + r.count, 0);

    return {
        distribution: result,
        targetLevel,
        belowTarget,
        atOrAboveTarget,
        gapPercentage: belowTarget > 0
            ? parseFloat(((belowTarget / (belowTarget + atOrAboveTarget)) * 100).toFixed(1))
            : 0
    };
};

employeeSkillMapSchema.statics.getSkillsNeedingReview = function(firmId, daysPast = 0) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysPast);

    return this.find({
        firmId,
        isActive: true,
        nextReviewDate: { $lte: targetDate }
    })
        .populate('employeeId', 'employeeId firstName lastName email')
        .populate('skillId', 'name nameAr')
        .sort({ nextReviewDate: 1 });
};

// ═══════════════════════════════════════════════════════════════
// JSON/OBJECT SETTINGS
// ═══════════════════════════════════════════════════════════════

employeeSkillMapSchema.set('toJSON', { virtuals: true });
employeeSkillMapSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeSkillMap', employeeSkillMapSchema);
