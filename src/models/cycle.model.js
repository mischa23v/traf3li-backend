const mongoose = require('mongoose');

// Goal schema for cycle goals
const goalSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: Date
}, { _id: true });

const cycleSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMING
    // ═══════════════════════════════════════════════════════════════
    duration: {
        type: Number,
        default: 14,
        min: 1,
        max: 365
    },

    startDate: {
        type: Date,
        required: true,
        index: true
    },

    endDate: {
        type: Date,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['upcoming', 'active', 'completed'],
        default: 'upcoming',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTOMATION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    autoStart: {
        type: Boolean,
        default: true
    },

    autoRollover: {
        type: Boolean,
        default: true
    },

    cooldownDays: {
        type: Number,
        default: 0,
        min: 0,
        max: 30
    },

    // ═══════════════════════════════════════════════════════════════
    // GOALS
    // ═══════════════════════════════════════════════════════════════
    goals: [goalSchema],

    // ═══════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════
    metrics: {
        plannedItems: {
            type: Number,
            default: 0,
            min: 0
        },
        completedItems: {
            type: Number,
            default: 0,
            min: 0
        },
        addedMidCycle: {
            type: Number,
            default: 0,
            min: 0
        },
        rolledOver: {
            type: Number,
            default: 0,
            min: 0
        },
        velocity: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
cycleSchema.index({ teamId: 1, status: 1 });
cycleSchema.index({ teamId: 1, startDate: -1 });
cycleSchema.index({ firmId: 1, status: 1 });
cycleSchema.index({ firmId: 1, teamId: 1 });
cycleSchema.index({ status: 1, startDate: 1 });
cycleSchema.index({ status: 1, endDate: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

cycleSchema.pre('save', async function(next) {
    // Auto-generate name if not provided
    if (!this.name || this.name === '') {
        const count = await this.constructor.countDocuments({ teamId: this.teamId });
        this.name = `Sprint ${count + 1}`;
    }

    // Calculate endDate if not provided based on startDate and duration
    if (this.startDate && this.duration && !this.endDate) {
        const end = new Date(this.startDate);
        end.setDate(end.getDate() + this.duration);
        this.endDate = end;
    }

    // Auto-update status based on dates
    const now = new Date();
    if (this.startDate && this.endDate) {
        if (now < this.startDate) {
            this.status = 'upcoming';
        } else if (now >= this.startDate && now <= this.endDate) {
            this.status = 'active';
        } else if (now > this.endDate && this.status !== 'completed') {
            // Only auto-complete if not already manually completed
            if (this.status === 'active') {
                this.status = 'completed';
            }
        }
    }

    // Calculate velocity: completed items / duration
    if (this.metrics && this.duration > 0) {
        this.metrics.velocity = parseFloat(
            (this.metrics.completedItems / this.duration).toFixed(2)
        );
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get cycles for a team
 * @param {ObjectId} teamId - Team ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of cycles
 */
cycleSchema.statics.getCyclesForTeam = async function(teamId, filters = {}) {
    const query = {
        teamId: new mongoose.Types.ObjectId(teamId)
    };

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.firmId) {
        query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    }

    return await this.find(query).sort({ startDate: -1 });
};

/**
 * Get active cycle for a team
 * @param {ObjectId} teamId - Team ID
 * @returns {Promise<Object|null>} Active cycle or null
 */
cycleSchema.statics.getActiveCycle = async function(teamId) {
    return await this.findOne({
        teamId: new mongoose.Types.ObjectId(teamId),
        status: 'active'
    });
};

/**
 * Get upcoming cycle for a team
 * @param {ObjectId} teamId - Team ID
 * @returns {Promise<Object|null>} Next upcoming cycle or null
 */
cycleSchema.statics.getUpcomingCycle = async function(teamId) {
    return await this.findOne({
        teamId: new mongoose.Types.ObjectId(teamId),
        status: 'upcoming'
    }).sort({ startDate: 1 });
};

/**
 * Create next cycle with rollover
 * @param {ObjectId} teamId - Team ID
 * @param {Object} options - Cycle options
 * @returns {Promise<Object>} New cycle
 */
cycleSchema.statics.createNextCycle = async function(teamId, options = {}) {
    const lastCycle = await this.findOne({
        teamId: new mongoose.Types.ObjectId(teamId)
    }).sort({ endDate: -1 });

    const count = await this.countDocuments({ teamId });
    const name = options.name || `Sprint ${count + 1}`;

    let startDate;
    if (lastCycle) {
        // Start after the last cycle's end date plus cooldown
        startDate = new Date(lastCycle.endDate);
        const cooldown = options.cooldownDays ?? lastCycle.cooldownDays ?? 0;
        startDate.setDate(startDate.getDate() + cooldown + 1);
    } else {
        // First cycle - start from today or provided date
        startDate = options.startDate || new Date();
    }

    const duration = options.duration || lastCycle?.duration || 14;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    const cycleData = {
        name,
        teamId,
        duration,
        startDate,
        endDate,
        autoStart: options.autoStart ?? lastCycle?.autoStart ?? true,
        autoRollover: options.autoRollover ?? lastCycle?.autoRollover ?? true,
        cooldownDays: options.cooldownDays ?? lastCycle?.cooldownDays ?? 0,
        goals: options.goals || [],
        metrics: {
            plannedItems: 0,
            completedItems: 0,
            addedMidCycle: 0,
            rolledOver: 0,
            velocity: 0
        }
    };

    if (options.firmId) {
        cycleData.firmId = options.firmId;
    }

    return await this.create(cycleData);
};

/**
 * Get cycle statistics
 * @param {ObjectId} cycleId - Cycle ID
 * @returns {Promise<Object>} Cycle statistics
 */
cycleSchema.statics.getCycleStats = async function(cycleId) {
    const cycle = await this.findById(cycleId);
    if (!cycle) return null;

    const totalGoals = cycle.goals.length;
    const completedGoals = cycle.goals.filter(g => g.completed).length;
    const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    const totalItems = cycle.metrics.plannedItems + cycle.metrics.addedMidCycle;
    const completionRate = totalItems > 0 ? (cycle.metrics.completedItems / totalItems) * 100 : 0;

    const daysElapsed = Math.max(0,
        Math.floor((new Date() - cycle.startDate) / (1000 * 60 * 60 * 24))
    );
    const daysRemaining = Math.max(0,
        Math.floor((cycle.endDate - new Date()) / (1000 * 60 * 60 * 24))
    );

    return {
        cycleId: cycle._id,
        name: cycle.name,
        status: cycle.status,
        duration: cycle.duration,
        daysElapsed: Math.min(daysElapsed, cycle.duration),
        daysRemaining,
        goals: {
            total: totalGoals,
            completed: completedGoals,
            completionRate: parseFloat(goalCompletionRate.toFixed(2))
        },
        items: {
            planned: cycle.metrics.plannedItems,
            completed: cycle.metrics.completedItems,
            addedMidCycle: cycle.metrics.addedMidCycle,
            rolledOver: cycle.metrics.rolledOver,
            total: totalItems,
            completionRate: parseFloat(completionRate.toFixed(2))
        },
        velocity: cycle.metrics.velocity
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Complete the cycle
 * @returns {Promise<Object>} Updated cycle
 */
cycleSchema.methods.complete = async function() {
    this.status = 'completed';
    return await this.save();
};

/**
 * Start the cycle
 * @returns {Promise<Object>} Updated cycle
 */
cycleSchema.methods.start = async function() {
    if (this.status === 'upcoming') {
        this.status = 'active';
        return await this.save();
    }
    throw new Error('Cycle must be in upcoming status to start');
};

/**
 * Add a goal to the cycle
 * @param {String} description - Goal description
 * @returns {Promise<Object>} Updated cycle
 */
cycleSchema.methods.addGoal = async function(description) {
    this.goals.push({ description, completed: false });
    return await this.save();
};

/**
 * Complete a goal
 * @param {ObjectId} goalId - Goal ID
 * @returns {Promise<Object>} Updated cycle
 */
cycleSchema.methods.completeGoal = async function(goalId) {
    const goal = this.goals.id(goalId);
    if (!goal) {
        throw new Error('Goal not found');
    }
    goal.completed = true;
    goal.completedAt = new Date();
    return await this.save();
};

/**
 * Update metrics
 * @param {Object} metrics - Metrics to update
 * @returns {Promise<Object>} Updated cycle
 */
cycleSchema.methods.updateMetrics = async function(metrics) {
    if (metrics.plannedItems !== undefined) {
        this.metrics.plannedItems = metrics.plannedItems;
    }
    if (metrics.completedItems !== undefined) {
        this.metrics.completedItems = metrics.completedItems;
    }
    if (metrics.addedMidCycle !== undefined) {
        this.metrics.addedMidCycle = metrics.addedMidCycle;
    }
    if (metrics.rolledOver !== undefined) {
        this.metrics.rolledOver = metrics.rolledOver;
    }
    return await this.save();
};

module.exports = mongoose.model('Cycle', cycleSchema);
