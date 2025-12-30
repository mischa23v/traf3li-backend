/**
 * CRM Settings Model
 *
 * Stores CRM configuration settings per firm/office.
 * Includes settings for leads, cases, quotes, communication,
 * appointments, naming, territories, sales persons, and conversions.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const leadSettingsSchema = new mongoose.Schema({
    allowDuplicateEmails: { type: Boolean, default: false },
    allowDuplicatePhones: { type: Boolean, default: false },
    autoCreateContact: { type: Boolean, default: true },
    defaultLeadSource: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSource' },
    defaultAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    leadScoringEnabled: { type: Boolean, default: false },
    autoAssignmentEnabled: { type: Boolean, default: false },
    autoAssignmentRule: {
        type: String,
        enum: ['round_robin', 'load_balance', 'territory'],
        default: 'round_robin'
    },
    trackFirstResponseTime: { type: Boolean, default: true }
}, { _id: false });

const caseSettingsSchema = new mongoose.Schema({
    autoCloseAfterDays: { type: Number, default: 90 },
    autoCloseEnabled: { type: Boolean, default: false },
    requireConflictCheck: { type: Boolean, default: true },
    conflictCheckBeforeStage: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesStage' },
    defaultPipeline: { type: String },
    defaultSalesStage: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesStage' },
    autoCreateQuoteOnQualified: { type: Boolean, default: false }
}, { _id: false });

const quoteSettingsSchema = new mongoose.Schema({
    defaultValidDays: { type: Number, default: 30 },
    autoSendReminder: { type: Boolean, default: false },
    reminderDaysBefore: { type: Number, default: 3 },
    requireApproval: { type: Boolean, default: false },
    approvalThreshold: { type: Number, default: 0 },
    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const communicationSettingsSchema = new mongoose.Schema({
    carryForwardCommunication: { type: Boolean, default: true },
    updateTimestampOnCommunication: { type: Boolean, default: true },
    autoLogEmails: { type: Boolean, default: true },
    autoLogCalls: { type: Boolean, default: true },
    autoLogWhatsApp: { type: Boolean, default: false },
    defaultEmailTemplateId: { type: String },
    defaultSMSTemplateId: { type: String }
}, { _id: false });

const workingHoursSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' }
}, { _id: false });

const appointmentSettingsSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: true },
    defaultDuration: { type: Number, default: 30 },
    allowedDurations: { type: [Number], default: [15, 30, 45, 60] },
    advanceBookingDays: { type: Number, default: 30 },
    minAdvanceBookingHours: { type: Number, default: 2 },
    agentList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    holidayListId: { type: String },
    bufferBetweenAppointments: { type: Number, default: 15 },
    workingHours: {
        sunday: { type: workingHoursSchema, default: () => ({ enabled: true, start: '09:00', end: '17:00' }) },
        monday: { type: workingHoursSchema, default: () => ({ enabled: true, start: '09:00', end: '17:00' }) },
        tuesday: { type: workingHoursSchema, default: () => ({ enabled: true, start: '09:00', end: '17:00' }) },
        wednesday: { type: workingHoursSchema, default: () => ({ enabled: true, start: '09:00', end: '17:00' }) },
        thursday: { type: workingHoursSchema, default: () => ({ enabled: true, start: '09:00', end: '17:00' }) },
        friday: { type: workingHoursSchema, default: () => ({ enabled: false, start: '09:00', end: '17:00' }) },
        saturday: { type: workingHoursSchema, default: () => ({ enabled: true, start: '09:00', end: '17:00' }) }
    },
    sendReminders: { type: Boolean, default: true },
    reminderHoursBefore: { type: [Number], default: [24, 1] },
    publicBookingEnabled: { type: Boolean, default: false },
    publicBookingUrl: { type: String },
    requirePhoneVerification: { type: Boolean, default: true }
}, { _id: false });

const namingSettingsSchema = new mongoose.Schema({
    campaignNamingBy: { type: String, enum: ['name', 'series'], default: 'series' },
    leadPrefix: { type: String, default: 'LEAD-' },
    casePrefix: { type: String, default: 'CASE-' },
    quotePrefix: { type: String, default: 'QT-' },
    contractPrefix: { type: String, default: 'CTR-' },
    appointmentPrefix: { type: String, default: 'APT-' },
    numberFormat: { type: String, enum: ['YYYY-####', 'YYMM-####', '####'], default: 'YYYY-####' },
    resetNumberingYearly: { type: Boolean, default: true }
}, { _id: false });

const territorySettingsSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    defaultTerritory: { type: mongoose.Schema.Types.ObjectId, ref: 'Territory' },
    autoAssignByTerritory: { type: Boolean, default: false },
    requireTerritoryOnLead: { type: Boolean, default: false },
    requireTerritoryOnCase: { type: Boolean, default: false }
}, { _id: false });

const salesPersonSettingsSchema = new mongoose.Schema({
    hierarchyEnabled: { type: Boolean, default: false },
    commissionTrackingEnabled: { type: Boolean, default: false },
    targetTrackingEnabled: { type: Boolean, default: false },
    requireSalesPersonOnCase: { type: Boolean, default: false },
    defaultCommissionRate: { type: Number, default: 5 }
}, { _id: false });

const conversionSettingsSchema = new mongoose.Schema({
    autoCreateCaseOnConsultation: { type: Boolean, default: false },
    requireBANTBeforeCase: { type: Boolean, default: false },
    autoCreateQuoteOnQualified: { type: Boolean, default: false },
    autoCreateSalesOrderOnAccept: { type: Boolean, default: false },
    linkSalesOrderToFinance: { type: Boolean, default: true },
    autoCreateClientOnSalesOrder: { type: Boolean, default: false },
    clientCreationTrigger: {
        type: String,
        enum: ['sales_order', 'payment_received', 'manual'],
        default: 'manual'
    },
    copyNotesToCase: { type: Boolean, default: true },
    copyActivityHistory: { type: Boolean, default: true },
    copyDocuments: { type: Boolean, default: true }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const crmSettingsSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    leadSettings: { type: leadSettingsSchema, default: () => ({}) },
    caseSettings: { type: caseSettingsSchema, default: () => ({}) },
    quoteSettings: { type: quoteSettingsSchema, default: () => ({}) },
    communicationSettings: { type: communicationSettingsSchema, default: () => ({}) },
    appointmentSettings: { type: appointmentSettingsSchema, default: () => ({}) },
    namingSettings: { type: namingSettingsSchema, default: () => ({}) },
    territorySettings: { type: territorySettingsSchema, default: () => ({}) },
    salesPersonSettings: { type: salesPersonSettingsSchema, default: () => ({}) },
    conversionSettings: { type: conversionSettingsSchema, default: () => ({}) }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create CRM settings for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} CRM settings document
 */
crmSettingsSchema.statics.getOrCreate = async function(firmId) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = await this.create({ firmId });
    }

    return settings;
};

/**
 * Update specific settings section
 * @param {ObjectId} firmId - Firm ID
 * @param {String} section - Settings section name
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated settings
 */
crmSettingsSchema.statics.updateSection = async function(firmId, section, updates) {
    const validSections = [
        'leadSettings', 'caseSettings', 'quoteSettings',
        'communicationSettings', 'appointmentSettings', 'namingSettings',
        'territorySettings', 'salesPersonSettings', 'conversionSettings'
    ];

    if (!validSections.includes(section)) {
        throw new Error(`Invalid settings section: ${section}`);
    }

    const updateObj = {};
    for (const [key, value] of Object.entries(updates)) {
        updateObj[`${section}.${key}`] = value;
    }

    return this.findOneAndUpdate(
        { firmId },
        { $set: updateObj },
        { new: true, upsert: true }
    );
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get working hours for a specific day
 * @param {String} dayName - Day name (sunday, monday, etc.)
 * @returns {Object} Working hours configuration
 */
crmSettingsSchema.methods.getWorkingHours = function(dayName) {
    const day = dayName.toLowerCase();
    return this.appointmentSettings?.workingHours?.[day] || {
        enabled: false,
        start: '09:00',
        end: '17:00'
    };
};

/**
 * Check if a user is an approver
 * @param {ObjectId} userId - User ID to check
 * @returns {Boolean} True if user is an approver
 */
crmSettingsSchema.methods.isApprover = function(userId) {
    return this.quoteSettings?.approvers?.some(
        approverId => approverId.toString() === userId.toString()
    ) || false;
};

module.exports = mongoose.model('CRMSettings', crmSettingsSchema);
