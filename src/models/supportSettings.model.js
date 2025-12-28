const mongoose = require('mongoose');

/**
 * Support Settings Model - Firm-level Support Configuration
 *
 * This model stores firm-specific support module settings including
 * default SLAs, auto-assignment rules, notification preferences,
 * and working hours configuration.
 */

// ═══════════════════════════════════════════════════════════════
// AUTO-ASSIGNMENT RULE SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const autoAssignmentRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        comment: 'Name of the assignment rule'
    },

    priority: {
        type: Number,
        default: 0,
        comment: 'Rule priority (higher number = higher priority)'
    },

    enabled: {
        type: Boolean,
        default: true,
        comment: 'Whether this rule is active'
    },

    conditions: {
        ticketTypes: {
            type: [String],
            default: [],
            comment: 'Ticket types this rule applies to (empty = all)'
        },
        priorities: {
            type: [String],
            default: [],
            comment: 'Ticket priorities this rule applies to (empty = all)'
        },
        tags: {
            type: [String],
            default: [],
            comment: 'Tags this rule applies to (empty = all)'
        },
        channels: {
            type: [String],
            default: [],
            comment: 'Communication channels this rule applies to (empty = all)'
        }
    },

    assignmentType: {
        type: String,
        enum: ['round_robin', 'load_balanced', 'specific_agent', 'skill_based', 'random'],
        default: 'round_robin',
        comment: 'How to assign tickets matching this rule'
    },

    assignToUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'Specific users to assign to (for specific_agent or skill_based)'
    }],

    assignToRoles: {
        type: [String],
        default: [],
        comment: 'Roles to assign to (e.g., "support_agent", "senior_agent")'
    }
}, { _id: true, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// EMAIL NOTIFICATION SETTINGS SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const emailNotificationSettingsSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: true,
        comment: 'Master switch for email notifications'
    },

    fromName: {
        type: String,
        default: 'Support Team',
        trim: true,
        comment: 'Display name for outgoing emails'
    },

    fromEmail: {
        type: String,
        trim: true,
        lowercase: true,
        comment: 'From email address (uses firm default if not set)'
    },

    replyToEmail: {
        type: String,
        trim: true,
        lowercase: true,
        comment: 'Reply-to email address'
    },

    notifyOnNew: {
        type: Boolean,
        default: true,
        comment: 'Send email when new ticket is created'
    },

    notifyOnAssigned: {
        type: Boolean,
        default: true,
        comment: 'Send email when ticket is assigned'
    },

    notifyOnReply: {
        type: Boolean,
        default: true,
        comment: 'Send email when there is a new reply'
    },

    notifyOnResolved: {
        type: Boolean,
        default: true,
        comment: 'Send email when ticket is resolved'
    },

    notifyOnClosed: {
        type: Boolean,
        default: false,
        comment: 'Send email when ticket is closed'
    },

    notifyOnSLABreach: {
        type: Boolean,
        default: true,
        comment: 'Send email on SLA breach or warning'
    },

    customerEmailTemplate: {
        type: String,
        comment: 'Custom email template for customers'
    },

    agentEmailTemplate: {
        type: String,
        comment: 'Custom email template for agents'
    }
}, { _id: false, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// WORKING HOURS SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const workingHoursConfigSchema = new mongoose.Schema({
    start: {
        type: String,
        default: '09:00',
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        comment: 'Start time in HH:mm format'
    },

    end: {
        type: String,
        default: '17:00',
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        comment: 'End time in HH:mm format'
    },

    timezone: {
        type: String,
        default: 'Asia/Riyadh',
        comment: 'Timezone for working hours'
    }
}, { _id: false, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// CUSTOMER PORTAL SETTINGS SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const customerPortalSettingsSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: true,
        comment: 'Whether customer portal is enabled'
    },

    allowTicketCreation: {
        type: Boolean,
        default: true,
        comment: 'Allow customers to create tickets'
    },

    allowAttachments: {
        type: Boolean,
        default: true,
        comment: 'Allow customers to upload attachments'
    },

    maxAttachmentSize: {
        type: Number,
        default: 10485760, // 10 MB in bytes
        comment: 'Maximum attachment size in bytes'
    },

    allowedFileTypes: {
        type: [String],
        default: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'],
        comment: 'Allowed file extensions'
    },

    requireAuthentication: {
        type: Boolean,
        default: true,
        comment: 'Require login to create tickets'
    },

    showKnowledgeBase: {
        type: Boolean,
        default: true,
        comment: 'Show knowledge base articles'
    },

    showFAQ: {
        type: Boolean,
        default: true,
        comment: 'Show FAQ section'
    }
}, { _id: false, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// AUTOMATION SETTINGS SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const automationSettingsSchema = new mongoose.Schema({
    autoCloseResolved: {
        enabled: {
            type: Boolean,
            default: false,
            comment: 'Automatically close resolved tickets'
        },
        daysAfterResolution: {
            type: Number,
            default: 7,
            min: 1,
            comment: 'Days to wait before auto-closing'
        }
    },

    autoResponseEnabled: {
        type: Boolean,
        default: true,
        comment: 'Send automatic acknowledgment on ticket creation'
    },

    autoResponseMessage: {
        type: String,
        comment: 'Auto-response message template'
    },

    satisfactionSurvey: {
        enabled: {
            type: Boolean,
            default: true,
            comment: 'Send satisfaction survey after resolution'
        },
        sendAfterDays: {
            type: Number,
            default: 0,
            min: 0,
            comment: 'Days to wait before sending survey (0 = immediate)'
        }
    },

    aiAssistant: {
        enabled: {
            type: Boolean,
            default: false,
            comment: 'Enable AI assistant for ticket responses'
        },
        autoSuggestReplies: {
            type: Boolean,
            default: true,
            comment: 'AI suggests replies to agents'
        },
        autoClassifyTickets: {
            type: Boolean,
            default: true,
            comment: 'AI automatically classifies tickets'
        }
    }
}, { _id: false, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// SUPPORT SETTINGS SCHEMA
// ═══════════════════════════════════════════════════════════════
const supportSettingsSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (One settings document per firm)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true,
        comment: 'Firm these settings belong to (one per firm)'
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // DEFAULT SLA
    // ═══════════════════════════════════════════════════════════════
    defaultSlaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportSLA',
        required: false,
        comment: 'Default SLA policy to apply to new tickets'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTO-ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    autoAssignTickets: {
        type: Boolean,
        default: false,
        comment: 'Enable automatic ticket assignment'
    },

    autoAssignmentRules: {
        type: [autoAssignmentRuleSchema],
        default: [],
        comment: 'Rules for automatic ticket assignment'
    },

    defaultAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'Default assignee if no rules match'
    },

    // ═══════════════════════════════════════════════════════════════
    // TICKET NUMBERING
    // ═══════════════════════════════════════════════════════════════
    ticketPrefixFormat: {
        type: String,
        default: 'TKT-YYYYMMDD-####',
        comment: 'Format for ticket IDs (e.g., "TKT-YYYYMMDD-####")'
    },

    ticketNumberingStartFrom: {
        type: Number,
        default: 1,
        min: 1,
        comment: 'Starting number for ticket numbering'
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    emailNotifications: {
        type: emailNotificationSettingsSchema,
        default: () => ({}),
        comment: 'Email notification settings'
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKING HOURS
    // ═══════════════════════════════════════════════════════════════
    workingHours: {
        type: workingHoursConfigSchema,
        default: () => ({}),
        comment: 'Default working hours for support'
    },

    workingDays: {
        type: [Number],
        default: [0, 1, 2, 3, 4], // Sunday to Thursday (Saudi work week)
        validate: {
            validator: function(days) {
                return days.every(day => day >= 0 && day <= 6);
            },
            message: 'Working days must be between 0 (Sunday) and 6 (Saturday)'
        },
        comment: 'Working days (0=Sunday, 1=Monday, ..., 6=Saturday)'
    },

    holidays: {
        type: [String],
        default: [],
        comment: 'Holiday dates in ISO format (YYYY-MM-DD)'
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER PORTAL
    // ═══════════════════════════════════════════════════════════════
    customerPortal: {
        type: customerPortalSettingsSchema,
        default: () => ({}),
        comment: 'Customer portal settings'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTOMATION
    // ═══════════════════════════════════════════════════════════════
    automation: {
        type: automationSettingsSchema,
        default: () => ({}),
        comment: 'Automation settings'
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIORITY SETTINGS
    // ═══════════════════════════════════════════════════════════════
    defaultPriority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        comment: 'Default priority for new tickets'
    },

    priorityEscalation: {
        enabled: {
            type: Boolean,
            default: false,
            comment: 'Enable automatic priority escalation'
        },
        escalateAfterHours: {
            type: Number,
            default: 24,
            min: 1,
            comment: 'Hours before escalating priority'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CATEGORIES & TAGS
    // ═══════════════════════════════════════════════════════════════
    enabledTicketTypes: {
        type: [String],
        default: ['question', 'problem', 'feature_request', 'incident', 'service_request'],
        comment: 'Enabled ticket types'
    },

    defaultTags: {
        type: [String],
        default: [],
        comment: 'Default tags to show in ticket creation'
    },

    requiredFields: {
        type: [String],
        default: ['subject', 'description'],
        comment: 'Required fields for ticket creation'
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATIONS
    // ═══════════════════════════════════════════════════════════════
    integrations: {
        slackNotifications: {
            type: Boolean,
            default: false,
            comment: 'Send Slack notifications'
        },
        teamsNotifications: {
            type: Boolean,
            default: false,
            comment: 'Send Microsoft Teams notifications'
        },
        webhookUrl: {
            type: String,
            trim: true,
            comment: 'Webhook URL for external integrations'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BRANDING
    // ═══════════════════════════════════════════════════════════════
    branding: {
        portalTitle: {
            type: String,
            default: 'Support Portal',
            trim: true,
            comment: 'Title for customer portal'
        },
        portalTitleAr: {
            type: String,
            trim: true,
            comment: 'Portal title in Arabic'
        },
        logoUrl: {
            type: String,
            trim: true,
            comment: 'Logo URL for portal'
        },
        primaryColor: {
            type: String,
            default: '#3b82f6',
            comment: 'Primary brand color'
        },
        welcomeMessage: {
            type: String,
            comment: 'Welcome message for portal'
        },
        welcomeMessageAr: {
            type: String,
            comment: 'Welcome message in Arabic'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ADVANCED SETTINGS
    // ═══════════════════════════════════════════════════════════════
    allowDuplicateTickets: {
        type: Boolean,
        default: true,
        comment: 'Allow creating duplicate tickets'
    },

    duplicateDetectionEnabled: {
        type: Boolean,
        default: false,
        comment: 'Enable automatic duplicate detection'
    },

    mergeTicketsEnabled: {
        type: Boolean,
        default: true,
        comment: 'Allow merging tickets'
    },

    internalNotesEnabled: {
        type: Boolean,
        default: true,
        comment: 'Enable internal notes feature'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who created these settings'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who last updated these settings'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
supportSettingsSchema.index({ firmId: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get settings for a firm (create default if not exists)
 */
supportSettingsSchema.statics.getOrCreateSettings = async function(firmId, userId = null) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = await this.create({
            firmId,
            createdBy: userId
        });
    }

    return settings;
};

/**
 * Get active auto-assignment rules
 */
supportSettingsSchema.statics.getActiveAssignmentRules = async function(firmId) {
    const settings = await this.findOne({ firmId });

    if (!settings || !settings.autoAssignTickets) {
        return [];
    }

    return settings.autoAssignmentRules
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add auto-assignment rule
 */
supportSettingsSchema.methods.addAssignmentRule = async function(ruleData, userId = null) {
    this.autoAssignmentRules.push(ruleData);
    this.updatedBy = userId;
    await this.save();
    return this.autoAssignmentRules[this.autoAssignmentRules.length - 1];
};

/**
 * Remove auto-assignment rule
 */
supportSettingsSchema.methods.removeAssignmentRule = async function(ruleId, userId = null) {
    this.autoAssignmentRules = this.autoAssignmentRules.filter(
        rule => rule._id.toString() !== ruleId.toString()
    );
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Update auto-assignment rule
 */
supportSettingsSchema.methods.updateAssignmentRule = async function(ruleId, updateData, userId = null) {
    const rule = this.autoAssignmentRules.id(ruleId);
    if (rule) {
        Object.assign(rule, updateData);
        this.updatedBy = userId;
        await this.save();
    }
    return rule;
};

/**
 * Enable email notifications
 */
supportSettingsSchema.methods.enableEmailNotifications = async function(userId = null) {
    this.emailNotifications.enabled = true;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Disable email notifications
 */
supportSettingsSchema.methods.disableEmailNotifications = async function(userId = null) {
    this.emailNotifications.enabled = false;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Update working hours
 */
supportSettingsSchema.methods.updateWorkingHours = async function(workingHoursData, userId = null) {
    this.workingHours = { ...this.workingHours, ...workingHoursData };
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Add holiday
 */
supportSettingsSchema.methods.addHoliday = async function(holidayDate, userId = null) {
    const dateStr = typeof holidayDate === 'string' ? holidayDate : holidayDate.toISOString().split('T')[0];
    if (!this.holidays.includes(dateStr)) {
        this.holidays.push(dateStr);
        this.updatedBy = userId;
        await this.save();
    }
    return this;
};

/**
 * Remove holiday
 */
supportSettingsSchema.methods.removeHoliday = async function(holidayDate, userId = null) {
    const dateStr = typeof holidayDate === 'string' ? holidayDate : holidayDate.toISOString().split('T')[0];
    this.holidays = this.holidays.filter(date => date !== dateStr);
    this.updatedBy = userId;
    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

// Pre-save hook to update updatedBy
supportSettingsSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew && !this.updatedBy) {
        this.updatedBy = this.createdBy;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = mongoose.model('SupportSettings', supportSettingsSchema);
