const mongoose = require('mongoose');

// Stage schema
const pipelineStageSchema = new mongoose.Schema({
    stageId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        maxlength: 100
    },
    color: {
        type: String,
        default: '#6366f1'
    },
    order: {
        type: Number,
        required: true
    },
    probability: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // Stage settings
    isWonStage: { type: Boolean, default: false },
    isLostStage: { type: Boolean, default: false },
    autoActions: [{
        trigger: {
            type: String,
            enum: ['enter', 'exit', 'time_in_stage']
        },
        action: {
            type: String,
            enum: ['send_email', 'create_task', 'notify_user', 'update_field']
        },
        config: mongoose.Schema.Types.Mixed,
        delayHours: Number
    }],
    // Requirements to move out of this stage
    requirements: [{
        field: String,
        label: String,
        labelAr: String,
        type: {
            type: String,
            enum: ['checkbox', 'document', 'approval', 'field_filled']
        },
        required: { type: Boolean, default: true }
    }],
    // Time tracking
    avgDaysInStage: { type: Number, default: 0 },
    maxDaysWarning: Number // Show warning if lead stays too long
}, { _id: false });

const pipelineSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    pipelineId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 1000
    },
    descriptionAr: {
        type: String,
        maxlength: 1000
    },
    icon: {
        type: String,
        default: '📊'
    },
    color: {
        type: String,
        default: '#6366f1'
    },

    // ═══════════════════════════════════════════════════════════════
    // TYPE & CATEGORY
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['lead', 'case', 'deal', 'custom'],
        default: 'lead'
    },
    category: {
        type: String,
        enum: [
            'general',
            'civil', 'criminal', 'family', 'commercial',
            'labor', 'real_estate', 'administrative', 'other'
        ],
        default: 'general'
    },

    // ═══════════════════════════════════════════════════════════════
    // STAGES
    // ═══════════════════════════════════════════════════════════════
    stages: [pipelineStageSchema],

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════
    settings: {
        allowSkipStages: { type: Boolean, default: false },
        requireReasonForLost: { type: Boolean, default: true },
        autoArchiveLostDays: { type: Number, default: 30 },
        autoArchiveWonDays: { type: Number, default: 90 },
        enableProbability: { type: Boolean, default: true },
        enableValue: { type: Boolean, default: true },
        defaultCurrency: { type: String, default: 'SAR' }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS (cached)
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalLeads: { type: Number, default: 0 },
        activeLeads: { type: Number, default: 0 },
        wonLeads: { type: Number, default: 0 },
        lostLeads: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },
        wonValue: { type: Number, default: 0 },
        avgConversionDays: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
        lastUpdated: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
pipelineSchema.index({ lawyerId: 1, firmId: 1 });
pipelineSchema.index({ lawyerId: 1, type: 1 });
pipelineSchema.index({ lawyerId: 1, isDefault: 1 });
pipelineSchema.index({ lawyerId: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
pipelineSchema.pre('save', async function(next) {
    if (!this.pipelineId) {
        const count = await this.constructor.countDocuments({ lawyerId: this.lawyerId });
        this.pipelineId = `PIPE-${String(count + 1).padStart(4, '0')}`;
    }

    // Ensure stages are ordered
    this.stages.sort((a, b) => a.order - b.order);

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get pipelines for a lawyer
pipelineSchema.statics.getPipelines = async function(lawyerId, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        isArchived: false
    };

    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return await this.find(query).sort({ isDefault: -1, createdAt: -1 });
};

// Get default pipeline
pipelineSchema.statics.getDefault = async function(lawyerId, type = 'lead') {
    let pipeline = await this.findOne({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        type,
        isDefault: true,
        isArchived: false
    });

    if (!pipeline) {
        // Create default pipeline if none exists
        pipeline = await this.createDefaultPipeline(lawyerId, type);
    }

    return pipeline;
};

// Create default pipeline
pipelineSchema.statics.createDefaultPipeline = async function(lawyerId, type = 'lead') {
    const defaultStages = type === 'lead' ? [
        { name: 'New', nameAr: 'جديد', color: '#94a3b8', order: 0, probability: 10 },
        { name: 'Contacted', nameAr: 'تم التواصل', color: '#60a5fa', order: 1, probability: 20 },
        { name: 'Qualified', nameAr: 'مؤهل', color: '#a78bfa', order: 2, probability: 40 },
        { name: 'Proposal', nameAr: 'عرض السعر', color: '#f59e0b', order: 3, probability: 60 },
        { name: 'Negotiation', nameAr: 'التفاوض', color: '#fb923c', order: 4, probability: 80 },
        { name: 'Won', nameAr: 'ناجح', color: '#22c55e', order: 5, probability: 100, isWonStage: true },
        { name: 'Lost', nameAr: 'خاسر', color: '#ef4444', order: 6, probability: 0, isLostStage: true }
    ] : [
        { name: 'Intake', nameAr: 'الاستقبال', color: '#94a3b8', order: 0, probability: 10 },
        { name: 'Review', nameAr: 'المراجعة', color: '#60a5fa', order: 1, probability: 30 },
        { name: 'Active', nameAr: 'نشط', color: '#22c55e', order: 2, probability: 50 },
        { name: 'Pending', nameAr: 'معلق', color: '#f59e0b', order: 3, probability: 50 },
        { name: 'Closed', nameAr: 'مغلق', color: '#6366f1', order: 4, probability: 100, isWonStage: true }
    ];

    const pipelineName = type === 'lead' ? 'Sales Pipeline' : 'Case Pipeline';
    const pipelineNameAr = type === 'lead' ? 'مسار المبيعات' : 'مسار القضايا';

    return await this.create({
        lawyerId,
        name: pipelineName,
        nameAr: pipelineNameAr,
        type,
        stages: defaultStages,
        isDefault: true,
        createdBy: lawyerId
    });
};

// Update pipeline statistics
pipelineSchema.statics.updateStats = async function(pipelineId) {
    const Lead = mongoose.model('Lead');

    const pipeline = await this.findById(pipelineId);
    if (!pipeline) return;

    const stats = await Lead.aggregate([
        { $match: { pipelineId: new mongoose.Types.ObjectId(pipelineId) } },
        {
            $group: {
                _id: null,
                totalLeads: { $sum: 1 },
                activeLeads: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']] }, 1, 0]
                    }
                },
                wonLeads: {
                    $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
                },
                lostLeads: {
                    $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
                },
                totalValue: { $sum: '$estimatedValue' },
                wonValue: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0]
                    }
                }
            }
        }
    ]);

    if (stats.length > 0) {
        const s = stats[0];
        const closedLeads = s.wonLeads + s.lostLeads;

        pipeline.stats = {
            totalLeads: s.totalLeads,
            activeLeads: s.activeLeads,
            wonLeads: s.wonLeads,
            lostLeads: s.lostLeads,
            totalValue: s.totalValue,
            wonValue: s.wonValue,
            conversionRate: closedLeads > 0 ? ((s.wonLeads / closedLeads) * 100).toFixed(2) : 0,
            lastUpdated: new Date()
        };

        await pipeline.save();
    }

    return pipeline;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Add a stage
pipelineSchema.methods.addStage = async function(stageData) {
    const maxOrder = Math.max(...this.stages.map(s => s.order), -1);

    this.stages.push({
        ...stageData,
        order: stageData.order ?? maxOrder + 1
    });

    // Reorder
    this.stages.sort((a, b) => a.order - b.order);
    this.stages.forEach((stage, index) => {
        stage.order = index;
    });

    return await this.save();
};

// Remove a stage
pipelineSchema.methods.removeStage = async function(stageId) {
    const stageIndex = this.stages.findIndex(s => s.stageId === stageId);
    if (stageIndex === -1) throw new Error('Stage not found');

    const stage = this.stages[stageIndex];
    if (stage.isWonStage || stage.isLostStage) {
        throw new Error('Cannot remove won/lost stages');
    }

    this.stages.splice(stageIndex, 1);

    // Reorder remaining stages
    this.stages.forEach((stage, index) => {
        stage.order = index;
    });

    return await this.save();
};

// Reorder stages
pipelineSchema.methods.reorderStages = async function(stageOrders) {
    // stageOrders: [{ stageId: 'xxx', order: 0 }, ...]
    for (const item of stageOrders) {
        const stage = this.stages.find(s => s.stageId === item.stageId);
        if (stage) {
            stage.order = item.order;
        }
    }

    this.stages.sort((a, b) => a.order - b.order);
    return await this.save();
};

// Get stage by ID
pipelineSchema.methods.getStage = function(stageId) {
    return this.stages.find(s => s.stageId === stageId);
};

// Get next stage
pipelineSchema.methods.getNextStage = function(currentStageId) {
    const currentIndex = this.stages.findIndex(s => s.stageId === currentStageId);
    if (currentIndex === -1 || currentIndex >= this.stages.length - 1) return null;
    return this.stages[currentIndex + 1];
};

// Get previous stage
pipelineSchema.methods.getPreviousStage = function(currentStageId) {
    const currentIndex = this.stages.findIndex(s => s.stageId === currentStageId);
    if (currentIndex <= 0) return null;
    return this.stages[currentIndex - 1];
};

module.exports = mongoose.model('Pipeline', pipelineSchema);
