/**
 * Sales Team Model
 *
 * Represents sales teams for CRM organization and lead/opportunity management.
 * Supports team hierarchy, member roles, targets, and assignment automation.
 * Security: Multi-tenant isolation via firmId
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const memberSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['leader', 'member', 'support'],
        default: 'member',
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const targetSchema = new mongoose.Schema({
    leads: { type: Number, default: 0, min: 0 },
    opportunities: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },
    wonDeals: { type: Number, default: 0, min: 0 }
}, { _id: false });

const targetsSchema = new mongoose.Schema({
    monthly: targetSchema,
    quarterly: targetSchema
}, { _id: false });

const settingsSchema = new mongoose.Schema({
    useLeads: {
        type: Boolean,
        default: true
    },
    useOpportunities: {
        type: Boolean,
        default: true
    },
    autoAssignmentEnabled: {
        type: Boolean,
        default: false
    },
    assignmentMethod: {
        type: String,
        enum: ['round_robin', 'load_balanced', 'manual'],
        default: 'manual'
    },
    maxLeadsPerMember: {
        type: Number,
        default: 50,
        min: 1
    },
    assignmentPeriodDays: {
        type: Number,
        default: 30,
        min: 1
    }
}, { _id: false });

const statsSchema = new mongoose.Schema({
    totalLeads: { type: Number, default: 0, min: 0 },
    activeOpportunities: { type: Number, default: 0, min: 0 },
    opportunityAmount: { type: Number, default: 0, min: 0 },
    overdueCount: { type: Number, default: 0, min: 0 },
    wonThisMonth: { type: Number, default: 0, min: 0 },
    lostThisMonth: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: Date
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const salesTeamSchema = new mongoose.Schema({
    // Multi-tenancy (REQUIRED)
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Team Identification
    teamId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500
    },

    // Visual Customization
    color: {
        type: String,
        default: '#3b82f6',
        match: /^#[0-9A-Fa-f]{6}$/
    },
    icon: {
        type: String,
        maxlength: 50
    },

    // Team Leadership
    leaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Team Members
    members: [memberSchema],

    // Pipeline Configuration
    defaultPipelineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pipeline'
    },
    pipelines: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pipeline'
    }],

    // Territory Assignment
    territories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory'
    }],

    // Contact & Communication
    emailAlias: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 100
    },

    // Performance Targets
    targets: {
        type: targetsSchema,
        default: () => ({
            monthly: { leads: 0, opportunities: 0, revenue: 0, wonDeals: 0 },
            quarterly: { leads: 0, opportunities: 0, revenue: 0, wonDeals: 0 }
        })
    },

    // Team Settings
    settings: {
        type: settingsSchema,
        default: () => ({
            useLeads: true,
            useOpportunities: true,
            autoAssignmentEnabled: false,
            assignmentMethod: 'manual',
            maxLeadsPerMember: 50,
            assignmentPeriodDays: 30
        })
    },

    // Performance Statistics
    stats: {
        type: statsSchema,
        default: () => ({
            totalLeads: 0,
            activeOpportunities: 0,
            opportunityAmount: 0,
            overdueCount: 0,
            wonThisMonth: 0,
            lostThisMonth: 0,
            conversionRate: 0,
            lastUpdated: new Date()
        })
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

salesTeamSchema.index({ firmId: 1, name: 1 });
salesTeamSchema.index({ firmId: 1, isActive: 1 });
salesTeamSchema.index({ firmId: 1, leaderId: 1 });
salesTeamSchema.index({ firmId: 1, isDefault: 1 });
salesTeamSchema.index({ firmId: 1, 'members.userId': 1 });
salesTeamSchema.index({ teamId: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

salesTeamSchema.pre('save', async function(next) {
    // Auto-generate teamId if not set
    if (!this.teamId && this.isNew) {
        const count = await mongoose.model('SalesTeam').countDocuments({ firmId: this.firmId });
        this.teamId = `TEAM-${String(count + 1).padStart(4, '0')}`;
    }

    // Ensure leader is in members array with leader role
    if (this.leaderId && this.isModified('leaderId')) {
        const leaderIndex = this.members.findIndex(m =>
            m.userId.toString() === this.leaderId.toString()
        );

        if (leaderIndex === -1) {
            // Add leader to members
            this.members.unshift({
                userId: this.leaderId,
                role: 'leader',
                joinedAt: new Date(),
                isActive: true
            });
        } else {
            // Update existing member to leader role
            this.members[leaderIndex].role = 'leader';
            this.members[leaderIndex].isActive = true;
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all teams for a firm with optional filtering
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of teams
 */
salesTeamSchema.statics.getTeams = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId };

    if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
    }

    if (filters.leaderId) {
        query.leaderId = filters.leaderId;
    }

    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: 'i' } },
            { nameAr: { $regex: filters.search, $options: 'i' } },
            { teamId: { $regex: filters.search, $options: 'i' } }
        ];
    }

    return this.find(query)
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar')
        .populate('defaultPipelineId', 'name nameAr')
        .populate('pipelines', 'name nameAr')
        .populate('territories', 'name nameAr')
        .sort({ isDefault: -1, name: 1 })
        .lean();
};

/**
 * Get team by ID with firm verification
 * @param {ObjectId} teamId - Team ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @returns {Promise<Object>} Team document
 */
salesTeamSchema.statics.getTeamById = async function(teamId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return this.findOne({ _id: teamId, firmId })
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar')
        .populate('defaultPipelineId', 'name nameAr stages')
        .populate('pipelines', 'name nameAr stages')
        .populate('territories', 'name nameAr');
};

/**
 * Add member to team
 * @param {ObjectId} teamId - Team ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @param {Object} memberData - Member data
 * @returns {Promise<Object>} Updated team
 */
salesTeamSchema.statics.addMember = async function(teamId, firmId, memberData) {
    if (!firmId) throw new Error('firmId is required');

    const team = await this.findOne({ _id: teamId, firmId });
    if (!team) throw new Error('Team not found');

    // Check if user is already a member
    const existingIndex = team.members.findIndex(m =>
        m.userId.toString() === memberData.userId.toString()
    );

    if (existingIndex !== -1) {
        // Update existing member
        team.members[existingIndex] = {
            ...team.members[existingIndex],
            ...memberData,
            isActive: true
        };
    } else {
        // Add new member
        team.members.push({
            userId: memberData.userId,
            role: memberData.role || 'member',
            joinedAt: new Date(),
            isActive: true
        });
    }

    await team.save();
    return team.populate('members.userId', 'firstName lastName email avatar');
};

/**
 * Remove member from team
 * @param {ObjectId} teamId - Team ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @param {ObjectId} userId - User ID to remove
 * @returns {Promise<Object>} Updated team
 */
salesTeamSchema.statics.removeMember = async function(teamId, firmId, userId) {
    if (!firmId) throw new Error('firmId is required');

    const team = await this.findOne({ _id: teamId, firmId });
    if (!team) throw new Error('Team not found');

    // Cannot remove team leader
    if (team.leaderId.toString() === userId.toString()) {
        throw new Error('Cannot remove team leader. Assign a new leader first.');
    }

    // Remove member from array
    team.members = team.members.filter(m =>
        m.userId.toString() !== userId.toString()
    );

    await team.save();
    return team;
};

/**
 * Update team statistics
 * @param {ObjectId} teamId - Team ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @returns {Promise<Object>} Updated team
 */
salesTeamSchema.statics.updateStats = async function(teamId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    const team = await this.findOne({ _id: teamId, firmId });
    if (!team) throw new Error('Team not found');

    // Get member IDs
    const memberIds = team.members.filter(m => m.isActive).map(m => m.userId);

    // Calculate stats from Lead and Opportunity models
    const Lead = mongoose.model('Lead');
    const Opportunity = mongoose.model('Opportunity');

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count total leads
    const totalLeads = await Lead.countDocuments({
        firmId,
        assignedTo: { $in: memberIds }
    });

    // Count active opportunities (if using opportunities)
    let activeOpportunities = 0;
    let opportunityAmount = 0;
    let wonThisMonth = 0;
    let lostThisMonth = 0;

    if (team.settings.useOpportunities && Opportunity) {
        activeOpportunities = await Opportunity.countDocuments({
            firmId,
            assignedTo: { $in: memberIds },
            status: { $in: ['open', 'in_progress'] }
        });

        const opportunityStats = await Opportunity.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    assignedTo: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
                    status: { $in: ['open', 'in_progress'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$estimatedValue' }
                }
            }
        ]);

        opportunityAmount = opportunityStats[0]?.total || 0;

        // Count won/lost this month
        wonThisMonth = await Opportunity.countDocuments({
            firmId,
            assignedTo: { $in: memberIds },
            status: 'won',
            closedDate: { $gte: firstDayOfMonth }
        });

        lostThisMonth = await Opportunity.countDocuments({
            firmId,
            assignedTo: { $in: memberIds },
            status: 'lost',
            closedDate: { $gte: firstDayOfMonth }
        });
    }

    // Calculate conversion rate
    const totalClosed = wonThisMonth + lostThisMonth;
    const conversionRate = totalClosed > 0
        ? Math.round((wonThisMonth / totalClosed) * 100)
        : 0;

    // Update stats
    team.stats = {
        totalLeads,
        activeOpportunities,
        opportunityAmount,
        overdueCount: 0, // Can be calculated based on due dates
        wonThisMonth,
        lostThisMonth,
        conversionRate,
        lastUpdated: new Date()
    };

    await team.save();
    return team;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user is a member of this team
 * @param {ObjectId} userId - User ID
 * @returns {Boolean} True if user is a member
 */
salesTeamSchema.methods.isMember = function(userId) {
    return this.members.some(m =>
        m.userId.toString() === userId.toString() && m.isActive
    );
};

/**
 * Check if user is the team leader
 * @param {ObjectId} userId - User ID
 * @returns {Boolean} True if user is the leader
 */
salesTeamSchema.methods.isLeader = function(userId) {
    return this.leaderId.toString() === userId.toString();
};

/**
 * Get active members count
 * @returns {Number} Count of active members
 */
salesTeamSchema.methods.getActiveMembersCount = function() {
    return this.members.filter(m => m.isActive).length;
};

/**
 * Get next member for round-robin assignment
 * @returns {ObjectId} User ID of next member
 */
salesTeamSchema.methods.getNextMemberForAssignment = function() {
    const activeMembers = this.members.filter(m => m.isActive);
    if (activeMembers.length === 0) return null;

    // Simple round-robin: return first member
    // In production, this should track last assigned member
    return activeMembers[0].userId;
};

module.exports = mongoose.model('SalesTeam', salesTeamSchema);
