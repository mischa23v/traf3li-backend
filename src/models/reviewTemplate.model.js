const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Review Template Model
 * Used to define templates for performance reviews
 */

// Template Competency Schema
const TemplateCompetencySchema = new Schema({
    competencyId: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: String,

    category: {
        type: String,
        enum: ['core', 'leadership', 'technical', 'legal', 'client_service', 'behavioral', 'functional'],
        required: true
    },

    description: String,
    descriptionAr: String,

    // Rating scale descriptions
    ratingDescriptions: [{
        level: { type: Number, min: 1, max: 5 },
        description: String,
        descriptionAr: String
    }],

    // Behavioral indicators
    behavioralIndicators: [{
        indicator: String,
        indicatorAr: String
    }],

    weight: { type: Number, default: 10, min: 0, max: 100 },

    isRequired: { type: Boolean, default: true },

    // Role-specific
    applicableRoles: [String],
    applicableLevels: [String]
}, { _id: false });

// Template Goal Schema
const TemplateGoalSchema = new Schema({
    goalId: String,
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    descriptionAr: String,
    goalType: {
        type: String,
        enum: ['individual', 'team', 'company', 'project', 'developmental']
    },
    weight: { type: Number, default: 20 },
    isRequired: { type: Boolean, default: false }
}, { _id: false });

// Template KPI Schema
const TemplateKPISchema = new Schema({
    kpiId: String,
    name: { type: String, required: true },
    nameAr: String,
    category: {
        type: String,
        enum: ['financial', 'operational', 'customer', 'quality', 'efficiency']
    },
    metric: String,
    unit: String,
    defaultTarget: Number,
    weight: { type: Number, default: 10 },
    isRequired: { type: Boolean, default: false },
    applicableRoles: [String]
}, { _id: false });

// Main Review Template Schema
const ReviewTemplateSchema = new Schema({
    templateId: {
        type: String,
        unique: true,
        required: true
    },

    // Basic Info
    name: { type: String, required: true },
    nameAr: String,

    description: String,
    descriptionAr: String,

    // Review Type
    reviewType: {
        type: String,
        enum: ['annual', 'mid_year', 'quarterly', 'probation', 'project', 'ad_hoc'],
        required: true,
        index: true
    },

    // Version
    version: { type: Number, default: 1 },
    isLatestVersion: { type: Boolean, default: true },

    // Components
    competencies: [TemplateCompetencySchema],

    // Options
    includeGoals: { type: Boolean, default: true },
    goalTemplates: [TemplateGoalSchema],
    minGoals: { type: Number, default: 3 },
    maxGoals: { type: Number, default: 10 },

    includeKPIs: { type: Boolean, default: true },
    kpiTemplates: [TemplateKPISchema],

    include360Feedback: { type: Boolean, default: false },
    min360Providers: { type: Number, default: 3 },

    includeSelfAssessment: { type: Boolean, default: true },
    selfAssessmentRequired: { type: Boolean, default: true },

    includeAttorneyMetrics: { type: Boolean, default: false },

    includeDevelopmentPlan: { type: Boolean, default: true },

    // Rating Configuration
    ratingScale: { type: String, enum: ['1-5', '1-100'], default: '1-5' },

    ratingLabels: [{
        value: Number,
        label: String,
        labelAr: String,
        description: String
    }],

    // Weights
    competencyWeight: { type: Number, default: 40 },
    goalsWeight: { type: Number, default: 40 },
    kpiWeight: { type: Number, default: 20 },

    // Approval Workflow
    approvalWorkflowSteps: [{
        stepNumber: Number,
        role: String,
        isRequired: Boolean
    }],

    requireCalibration: { type: Boolean, default: false },

    // Instructions
    instructions: String,
    instructionsAr: String,

    managerInstructions: String,
    managerInstructionsAr: String,

    employeeInstructions: String,
    employeeInstructionsAr: String,

    // Applicability
    applicableDepartments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    applicableRoles: [String],
    applicableLevels: [String],
    isDefault: { type: Boolean, default: false },

    // Status
    isActive: { type: Boolean, default: true },

    // Multi-tenancy
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true
});

// Indexes
ReviewTemplateSchema.index({ firmId: 1, reviewType: 1, isActive: 1 });
ReviewTemplateSchema.index({ firmId: 1, isDefault: 1 });

// Pre-save hook to generate templateId
ReviewTemplateSchema.pre('save', async function(next) {
    if (this.isNew && !this.templateId) {
        const count = await mongoose.model('ReviewTemplate').countDocuments({
            firmId: this.firmId
        });
        this.templateId = `TMPL-${String(count + 1).padStart(4, '0')}`;
    }
    this.updatedAt = new Date();
    next();
});

// Static: Get active templates by review type
ReviewTemplateSchema.statics.getByReviewType = function(firmId, reviewType) {
    return this.find({
        firmId,
        reviewType,
        isActive: true
    }).sort({ name: 1 });
};

// Static: Get default template
ReviewTemplateSchema.statics.getDefaultTemplate = function(firmId, reviewType) {
    return this.findOne({
        firmId,
        reviewType,
        isDefault: true,
        isActive: true
    });
};

module.exports = mongoose.model('ReviewTemplate', ReviewTemplateSchema);
