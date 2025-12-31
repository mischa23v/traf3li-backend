/**
 * CRM Validation Schemas
 *
 * Joi validation schemas for CRM endpoints including:
 * - CRM Settings
 * - Territories
 * - Sales Persons
 * - Lead Sources
 * - Sales Stages
 * - Lost Reasons
 * - Competitors
 * - Appointments
 * - CRM Reports
 */

const Joi = require('joi');

// ═══════════════════════════════════════════════════════════════
// CUSTOM VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * MongoDB ObjectId validator
 */
const objectIdValidator = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'معرف غير صالح / Invalid ID format'
});

/**
 * Hex color validator
 */
const hexColorValidator = Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).messages({
    'string.pattern.base': 'لون غير صالح / Invalid hex color format'
});

/**
 * Time string validator (HH:MM format)
 */
const timeStringValidator = Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).messages({
    'string.pattern.base': 'صيغة الوقت غير صالحة / Invalid time format (use HH:MM)'
});

// ═══════════════════════════════════════════════════════════════
// CRM SETTINGS VALIDATORS
// ═══════════════════════════════════════════════════════════════

const leadSettingsSchema = Joi.object({
    allowDuplicateEmails: Joi.boolean(),
    allowDuplicatePhones: Joi.boolean(),
    autoCreateContact: Joi.boolean(),
    defaultLeadSource: objectIdValidator,
    defaultAssignee: objectIdValidator,
    leadScoringEnabled: Joi.boolean(),
    autoAssignmentEnabled: Joi.boolean(),
    autoAssignmentRule: Joi.string().valid('round_robin', 'load_balance', 'territory'),
    trackFirstResponseTime: Joi.boolean()
});

const caseSettingsSchema = Joi.object({
    autoCloseAfterDays: Joi.number().integer().min(1).max(365),
    autoCloseEnabled: Joi.boolean(),
    requireConflictCheck: Joi.boolean(),
    conflictCheckBeforeStage: objectIdValidator,
    defaultPipeline: Joi.string(),
    defaultSalesStage: objectIdValidator,
    autoCreateQuoteOnQualified: Joi.boolean()
});

const quoteSettingsSchema = Joi.object({
    defaultValidDays: Joi.number().integer().min(1).max(365),
    autoSendReminder: Joi.boolean(),
    reminderDaysBefore: Joi.number().integer().min(1).max(30),
    requireApproval: Joi.boolean(),
    approvalThreshold: Joi.number().min(0),
    approvers: Joi.array().items(objectIdValidator)
});

const communicationSettingsSchema = Joi.object({
    carryForwardCommunication: Joi.boolean(),
    updateTimestampOnCommunication: Joi.boolean(),
    autoLogEmails: Joi.boolean(),
    autoLogCalls: Joi.boolean(),
    autoLogWhatsApp: Joi.boolean(),
    defaultEmailTemplateId: Joi.string(),
    defaultSMSTemplateId: Joi.string()
});

const workingHoursSchema = Joi.object({
    enabled: Joi.boolean(),
    start: timeStringValidator,
    end: timeStringValidator
});

const appointmentSettingsSchema = Joi.object({
    enabled: Joi.boolean(),
    defaultDuration: Joi.number().integer().min(5).max(480),
    allowedDurations: Joi.array().items(Joi.number().integer().min(5).max(480)),
    advanceBookingDays: Joi.number().integer().min(1).max(365),
    minAdvanceBookingHours: Joi.number().integer().min(0).max(168),
    agentList: Joi.array().items(objectIdValidator),
    holidayListId: Joi.string(),
    bufferBetweenAppointments: Joi.number().integer().min(0).max(120),
    workingHours: Joi.object({
        sunday: workingHoursSchema,
        monday: workingHoursSchema,
        tuesday: workingHoursSchema,
        wednesday: workingHoursSchema,
        thursday: workingHoursSchema,
        friday: workingHoursSchema,
        saturday: workingHoursSchema
    }),
    sendReminders: Joi.boolean(),
    reminderHoursBefore: Joi.array().items(Joi.number().integer().min(1).max(168)),
    publicBookingEnabled: Joi.boolean(),
    publicBookingUrl: Joi.string().uri(),
    requirePhoneVerification: Joi.boolean()
});

const namingSettingsSchema = Joi.object({
    campaignNamingBy: Joi.string().valid('name', 'series'),
    leadPrefix: Joi.string().max(10),
    casePrefix: Joi.string().max(10),
    quotePrefix: Joi.string().max(10),
    contractPrefix: Joi.string().max(10),
    appointmentPrefix: Joi.string().max(10),
    numberFormat: Joi.string().valid('YYYY-####', 'YYMM-####', '####'),
    resetNumberingYearly: Joi.boolean()
});

const territorySettingsSchema = Joi.object({
    enabled: Joi.boolean(),
    defaultTerritory: objectIdValidator,
    autoAssignByTerritory: Joi.boolean(),
    requireTerritoryOnLead: Joi.boolean(),
    requireTerritoryOnCase: Joi.boolean()
});

const salesPersonSettingsSchema = Joi.object({
    hierarchyEnabled: Joi.boolean(),
    commissionTrackingEnabled: Joi.boolean(),
    targetTrackingEnabled: Joi.boolean(),
    requireSalesPersonOnCase: Joi.boolean(),
    defaultCommissionRate: Joi.number().min(0).max(100)
});

const conversionSettingsSchema = Joi.object({
    autoCreateCaseOnConsultation: Joi.boolean(),
    requireBANTBeforeCase: Joi.boolean(),
    autoCreateQuoteOnQualified: Joi.boolean(),
    autoCreateSalesOrderOnAccept: Joi.boolean(),
    linkSalesOrderToFinance: Joi.boolean(),
    autoCreateClientOnSalesOrder: Joi.boolean(),
    clientCreationTrigger: Joi.string().valid('sales_order', 'payment_received', 'manual'),
    copyNotesToCase: Joi.boolean(),
    copyActivityHistory: Joi.boolean(),
    copyDocuments: Joi.boolean()
});

const updateCRMSettingsSchema = Joi.object({
    leadSettings: leadSettingsSchema,
    caseSettings: caseSettingsSchema,
    quoteSettings: quoteSettingsSchema,
    communicationSettings: communicationSettingsSchema,
    appointmentSettings: appointmentSettingsSchema,
    namingSettings: namingSettingsSchema,
    territorySettings: territorySettingsSchema,
    salesPersonSettings: salesPersonSettingsSchema,
    conversionSettings: conversionSettingsSchema
});

// ═══════════════════════════════════════════════════════════════
// TERRITORY VALIDATORS
// ═══════════════════════════════════════════════════════════════

const territoryTargetSchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required(),
    quarter: Joi.number().integer().min(1).max(4),
    targetAmount: Joi.number().min(0).required(),
    achievedAmount: Joi.number().min(0)
});

const createTerritorySchema = Joi.object({
    name: Joi.string().required().max(100).messages({
        'string.empty': 'اسم المنطقة مطلوب / Territory name is required',
        'string.max': 'اسم المنطقة طويل جداً / Territory name is too long'
    }),
    nameAr: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم العربي مطلوب / Arabic name is required'
    }),
    parentTerritoryId: objectIdValidator.allow(null),
    isGroup: Joi.boolean(),
    managerId: objectIdValidator,
    targets: Joi.array().items(territoryTargetSchema),
    enabled: Joi.boolean()
});

const updateTerritorySchema = Joi.object({
    name: Joi.string().max(100),
    nameAr: Joi.string().max(100),
    parentTerritoryId: objectIdValidator.allow(null),
    isGroup: Joi.boolean(),
    managerId: objectIdValidator.allow(null),
    targets: Joi.array().items(territoryTargetSchema),
    enabled: Joi.boolean()
});

// ═══════════════════════════════════════════════════════════════
// SALES PERSON VALIDATORS
// ═══════════════════════════════════════════════════════════════

const salesPersonTargetSchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required(),
    quarter: Joi.number().integer().min(1).max(4),
    month: Joi.number().integer().min(1).max(12),
    targetAmount: Joi.number().min(0),
    targetLeads: Joi.number().integer().min(0),
    targetCases: Joi.number().integer().min(0)
});

const createSalesPersonSchema = Joi.object({
    name: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم مطلوب / Name is required'
    }),
    nameAr: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم العربي مطلوب / Arabic name is required'
    }),
    parentSalesPersonId: objectIdValidator.allow(null),
    isGroup: Joi.boolean(),
    employeeId: objectIdValidator,
    userId: objectIdValidator,
    commissionRate: Joi.number().min(0).max(100),
    territoryIds: Joi.array().items(objectIdValidator),
    targets: Joi.array().items(salesPersonTargetSchema),
    enabled: Joi.boolean()
});

const updateSalesPersonSchema = Joi.object({
    name: Joi.string().max(100),
    nameAr: Joi.string().max(100),
    parentSalesPersonId: objectIdValidator.allow(null),
    isGroup: Joi.boolean(),
    employeeId: objectIdValidator.allow(null),
    userId: objectIdValidator.allow(null),
    commissionRate: Joi.number().min(0).max(100),
    territoryIds: Joi.array().items(objectIdValidator),
    targets: Joi.array().items(salesPersonTargetSchema),
    enabled: Joi.boolean()
});

// ═══════════════════════════════════════════════════════════════
// LEAD SOURCE VALIDATORS
// ═══════════════════════════════════════════════════════════════

const createLeadSourceSchema = Joi.object({
    name: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم مطلوب / Name is required'
    }),
    nameAr: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم العربي مطلوب / Arabic name is required'
    }),
    description: Joi.string().max(500),
    utmSource: Joi.string().max(50),
    utmMedium: Joi.string().max(50),
    enabled: Joi.boolean()
});

const updateLeadSourceSchema = Joi.object({
    name: Joi.string().max(100),
    nameAr: Joi.string().max(100),
    description: Joi.string().max(500),
    utmSource: Joi.string().max(50),
    utmMedium: Joi.string().max(50),
    enabled: Joi.boolean()
});

// ═══════════════════════════════════════════════════════════════
// SALES STAGE VALIDATORS
// ═══════════════════════════════════════════════════════════════

const createSalesStageSchema = Joi.object({
    name: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم مطلوب / Name is required'
    }),
    nameAr: Joi.string().required().max(100).messages({
        'string.empty': 'الاسم العربي مطلوب / Arabic name is required'
    }),
    order: Joi.number().integer().min(1).required().messages({
        'number.base': 'الترتيب مطلوب / Order is required'
    }),
    defaultProbability: Joi.number().min(0).max(100).required(),
    type: Joi.string().valid('open', 'won', 'lost').required(),
    color: hexColorValidator.required(),
    requiresConflictCheck: Joi.boolean(),
    requiresQualification: Joi.boolean(),
    autoCreateQuote: Joi.boolean(),
    enabled: Joi.boolean()
});

const updateSalesStageSchema = Joi.object({
    name: Joi.string().max(100),
    nameAr: Joi.string().max(100),
    order: Joi.number().integer().min(1),
    defaultProbability: Joi.number().min(0).max(100),
    type: Joi.string().valid('open', 'won', 'lost'),
    color: hexColorValidator,
    requiresConflictCheck: Joi.boolean(),
    requiresQualification: Joi.boolean(),
    autoCreateQuote: Joi.boolean(),
    enabled: Joi.boolean()
});

const reorderStagesSchema = Joi.object({
    stages: Joi.array().items(Joi.object({
        _id: objectIdValidator.required(),
        order: Joi.number().integer().min(1).required()
    })).min(1).required()
});

// ═══════════════════════════════════════════════════════════════
// LOST REASON VALIDATORS
// ═══════════════════════════════════════════════════════════════

const lostReasonCategories = ['price', 'competitor', 'timing', 'scope', 'relationship', 'internal', 'other'];

const createLostReasonSchema = Joi.object({
    reason: Joi.string().required().max(200).messages({
        'string.empty': 'السبب مطلوب / Reason is required'
    }),
    reasonAr: Joi.string().required().max(200).messages({
        'string.empty': 'السبب العربي مطلوب / Arabic reason is required'
    }),
    category: Joi.string().valid(...lostReasonCategories).required(),
    enabled: Joi.boolean()
});

const updateLostReasonSchema = Joi.object({
    reason: Joi.string().max(200),
    reasonAr: Joi.string().max(200),
    category: Joi.string().valid(...lostReasonCategories),
    enabled: Joi.boolean()
});

// ═══════════════════════════════════════════════════════════════
// COMPETITOR VALIDATORS
// ═══════════════════════════════════════════════════════════════

const createCompetitorSchema = Joi.object({
    name: Joi.string().required().max(200).messages({
        'string.empty': 'الاسم مطلوب / Name is required'
    }),
    nameAr: Joi.string().max(200),
    website: Joi.string().uri().max(255),
    description: Joi.string().max(1000),
    enabled: Joi.boolean()
});

const updateCompetitorSchema = Joi.object({
    name: Joi.string().max(200),
    nameAr: Joi.string().max(200),
    website: Joi.string().uri().max(255).allow(''),
    description: Joi.string().max(1000).allow(''),
    enabled: Joi.boolean()
});

// ═══════════════════════════════════════════════════════════════
// APPOINTMENT VALIDATORS
// ═══════════════════════════════════════════════════════════════

const createAppointmentSchema = Joi.object({
    scheduledTime: Joi.date().iso().greater('now').required().messages({
        'date.greater': 'الموعد يجب أن يكون في المستقبل / Appointment must be in the future'
    }),
    duration: Joi.number().integer().valid(15, 30, 45, 60, 90, 120).required(),
    customerName: Joi.string().required().max(200).messages({
        'string.empty': 'اسم العميل مطلوب / Customer name is required'
    }),
    customerEmail: Joi.string().email().required().messages({
        'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
    }),
    customerPhone: Joi.string().pattern(/^\+?[0-9]{10,15}$/),
    customerNotes: Joi.string().max(1000),
    // Party linkage - optional (model has default: 'lead' for appointmentWith)
    appointmentWith: Joi.string().valid('lead', 'client', 'contact').default('lead'),
    partyId: objectIdValidator,
    caseId: objectIdValidator,
    // assignedTo is optional - controller defaults to current user if not provided (supports solo lawyers)
    assignedTo: objectIdValidator,
    locationType: Joi.string().valid('office', 'virtual', 'client_site', 'other').default('office'),
    location: Joi.string().max(500),
    meetingLink: Joi.string().uri(),
    sendReminder: Joi.boolean(),
    // Additional optional fields
    type: Joi.string().valid('consultation', 'follow_up', 'initial', 'general'),
    source: Joi.string().valid('manual', 'public_booking', 'marketplace', 'referral'),
    price: Joi.number().min(0),
    currency: Joi.string().max(3)
});

const updateAppointmentSchema = Joi.object({
    scheduledTime: Joi.date().iso(),
    duration: Joi.number().integer().valid(15, 30, 45, 60, 90, 120),
    customerName: Joi.string().max(200),
    customerEmail: Joi.string().email(),
    customerPhone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).allow(''),
    customerNotes: Joi.string().max(1000).allow(''),
    appointmentWith: Joi.string().valid('lead', 'client', 'contact'),
    partyId: objectIdValidator,
    caseId: objectIdValidator.allow(null),
    assignedTo: objectIdValidator,
    locationType: Joi.string().valid('office', 'virtual', 'client_site', 'other'),
    location: Joi.string().max(500).allow(''),
    meetingLink: Joi.string().uri().allow(''),
    sendReminder: Joi.boolean(),
    status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'),
    outcome: Joi.string().max(2000),
    followUpRequired: Joi.boolean(),
    followUpDate: Joi.date().iso(),
    cancellationReason: Joi.string().max(500),
    // Additional optional fields
    type: Joi.string().valid('consultation', 'follow_up', 'initial', 'general'),
    source: Joi.string().valid('manual', 'public_booking', 'marketplace', 'referral'),
    price: Joi.number().min(0),
    currency: Joi.string().max(3),
    isPaid: Joi.boolean(),
    paymentId: Joi.string().max(100),
    paymentMethod: Joi.string().max(50)
});

const publicBookingSchema = Joi.object({
    customerName: Joi.string().required().max(200),
    customerEmail: Joi.string().email().required(),
    customerPhone: Joi.string().pattern(/^\+?[0-9]{10,15}$/),
    scheduledTime: Joi.date().iso().greater('now').required(),
    duration: Joi.number().integer().valid(15, 30, 45, 60).required(),
    customerNotes: Joi.string().max(1000),
    // Additional optional fields that may come from frontend
    type: Joi.string().valid('consultation', 'follow_up', 'initial', 'general'),
    locationType: Joi.string().valid('office', 'virtual', 'client_site', 'other')
});

const getAvailableSlotsSchema = Joi.object({
    date: Joi.date().iso().required(),
    assignedTo: objectIdValidator.required(),
    duration: Joi.number().integer().valid(15, 30, 45, 60, 90, 120).default(30)
});

// ═══════════════════════════════════════════════════════════════
// CRM REPORT VALIDATORS
// ═══════════════════════════════════════════════════════════════

const dateRangeSchema = Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
});

const campaignEfficiencySchema = dateRangeSchema.keys({
    campaign: Joi.string(),
    source: Joi.string(),
    medium: Joi.string(),
    salesPersonId: objectIdValidator
});

const leadOwnerEfficiencySchema = dateRangeSchema.keys({
    salesPersonId: objectIdValidator,
    territoryId: objectIdValidator,
    leadSourceId: objectIdValidator
});

const firstResponseTimeSchema = dateRangeSchema.keys({
    groupBy: Joi.string().valid('day', 'week', 'month').default('day'),
    salesPersonId: objectIdValidator,
    leadSourceId: objectIdValidator,
    territoryId: objectIdValidator
});

const lostOpportunitySchema = dateRangeSchema.keys({
    lostReasonId: objectIdValidator,
    competitorId: objectIdValidator,
    salesPersonId: objectIdValidator,
    caseTypeId: objectIdValidator
});

const salesPipelineSchema = dateRangeSchema.keys({
    viewBy: Joi.string().valid('stage', 'owner', 'period').default('stage'),
    salesPersonId: objectIdValidator,
    territoryId: objectIdValidator,
    caseTypeId: objectIdValidator,
    periodType: Joi.string().valid('month', 'quarter')
});

const prospectsEngagedSchema = Joi.object({
    daysSinceContact: Joi.number().integer().min(1).default(60),
    minInteractions: Joi.number().integer().min(1).default(2),
    leadSourceId: objectIdValidator,
    salesPersonId: objectIdValidator,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

const leadConversionTimeSchema = dateRangeSchema.keys({
    caseTypeId: objectIdValidator,
    salesPersonId: objectIdValidator,
    territoryId: objectIdValidator
});

// ═══════════════════════════════════════════════════════════════
// LEAD-TO-CASE CONVERSION VALIDATORS
// ═══════════════════════════════════════════════════════════════

const createCaseFromLeadSchema = Joi.object({
    title: Joi.string().required().max(200).messages({
        'string.empty': 'عنوان القضية مطلوب / Case title is required'
    }),
    caseType: Joi.string().valid('civil', 'criminal', 'family', 'commercial', 'labor', 'real_estate', 'administrative', 'execution', 'other'),
    description: Joi.string().max(2000),
    estimatedValue: Joi.number().min(0),
    salesStageId: objectIdValidator,
    copyNotes: Joi.boolean().default(true),
    copyDocuments: Joi.boolean().default(true)
});

const updateCrmStageSchema = Joi.object({
    stageId: objectIdValidator.required(),
    probability: Joi.number().min(0).max(100),
    expectedCloseDate: Joi.date().iso()
});

const markWonSchema = Joi.object({
    wonValue: Joi.number().min(0),
    acceptedQuoteId: objectIdValidator,
    createClient: Joi.boolean().default(false),
    notes: Joi.string().max(2000)
});

const markLostSchema = Joi.object({
    lostReasonId: objectIdValidator.required(),
    lostReasonDetails: Joi.string().max(2000),
    competitorId: objectIdValidator
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = source === 'query' ? req.query : req.body;
            const { error, value } = schema.validate(data, {
                abortEarly: false,
                stripUnknown: true
            });

            if (error) {
                console.log('[VALIDATION-ERROR]', {
                    path: req.path,
                    source,
                    data,
                    errors: error.details.map(e => e.message)
                });
                return res.status(400).json({
                    success: false,
                    message: 'خطأ في التحقق / Validation error',
                    errors: error.details.map(e => e.message)
                });
            }

            if (source === 'query') {
                req.query = value;
            } else {
                req.body = value;
            }
            next();
        } catch (err) {
            console.error('[VALIDATION-EXCEPTION]', {
                path: req.path,
                source,
                error: err.message,
                stack: err.stack
            });
            return res.status(500).json({
                success: false,
                message: 'Validation processing error',
                error: err.message
            });
        }
    };
};

const validateIdParam = (req, res, next) => {
    const { error } = objectIdValidator.validate(req.params.id);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'معرف غير صالح / Invalid ID format'
        });
    }
    next();
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Helper
    validate,
    validateIdParam,
    objectIdValidator,

    // CRM Settings
    validateUpdateCRMSettings: validate(updateCRMSettingsSchema),

    // Territory
    validateCreateTerritory: validate(createTerritorySchema),
    validateUpdateTerritory: validate(updateTerritorySchema),

    // Sales Person
    validateCreateSalesPerson: validate(createSalesPersonSchema),
    validateUpdateSalesPerson: validate(updateSalesPersonSchema),

    // Lead Source
    validateCreateLeadSource: validate(createLeadSourceSchema),
    validateUpdateLeadSource: validate(updateLeadSourceSchema),

    // Sales Stage
    validateCreateSalesStage: validate(createSalesStageSchema),
    validateUpdateSalesStage: validate(updateSalesStageSchema),
    validateReorderStages: validate(reorderStagesSchema),

    // Lost Reason
    validateCreateLostReason: validate(createLostReasonSchema),
    validateUpdateLostReason: validate(updateLostReasonSchema),

    // Competitor
    validateCreateCompetitor: validate(createCompetitorSchema),
    validateUpdateCompetitor: validate(updateCompetitorSchema),

    // Appointment
    validateCreateAppointment: validate(createAppointmentSchema),
    validateUpdateAppointment: validate(updateAppointmentSchema),
    validatePublicBooking: validate(publicBookingSchema),
    validateGetAvailableSlots: validate(getAvailableSlotsSchema, 'query'),

    // Reports
    validateCampaignEfficiency: validate(campaignEfficiencySchema, 'query'),
    validateLeadOwnerEfficiency: validate(leadOwnerEfficiencySchema, 'query'),
    validateFirstResponseTime: validate(firstResponseTimeSchema, 'query'),
    validateLostOpportunity: validate(lostOpportunitySchema, 'query'),
    validateSalesPipeline: validate(salesPipelineSchema, 'query'),
    validateProspectsEngaged: validate(prospectsEngagedSchema, 'query'),
    validateLeadConversionTime: validate(leadConversionTimeSchema, 'query'),

    // Lead-to-Case Conversion
    validateCreateCaseFromLead: validate(createCaseFromLeadSchema),
    validateUpdateCrmStage: validate(updateCrmStageSchema),
    validateMarkWon: validate(markWonSchema),
    validateMarkLost: validate(markLostSchema)
};
