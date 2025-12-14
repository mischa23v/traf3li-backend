/**
 * Case Route Validation Schemas
 *
 * Uses Joi for request validation on case/matter management endpoints.
 * Provides both validation schemas and middleware functions.
 */

const Joi = require('joi');
const {
    ENTITY_TYPES,
    COURTS,
    COMMITTEES,
    ARBITRATION_CENTERS,
    REGIONS,
    CASE_CATEGORIES,
    POA_SCOPE,
    PARTY_TYPES,
    VALIDATION_PATTERNS,
    VALIDATION_MESSAGES
} = require('../configs/caseConstants');

// ============================================
// CUSTOM VALIDATION HELPERS
// ============================================

/**
 * Custom validation for unified national number
 * Must start with 7 and be exactly 10 digits
 */
const unifiedNumberValidator = Joi.string()
    .pattern(/^7\d{9}$/)
    .allow('', null)
    .messages({
        'string.pattern.base': VALIDATION_MESSAGES.unifiedNumber.ar + ' / ' + VALIDATION_MESSAGES.unifiedNumber.en
    });

/**
 * Custom validation for national ID
 * Must start with 1 or 2 and be exactly 10 digits
 */
const nationalIdValidator = Joi.string()
    .pattern(/^[12]\d{9}$/)
    .allow('', null)
    .messages({
        'string.pattern.base': VALIDATION_MESSAGES.nationalId.ar + ' / ' + VALIDATION_MESSAGES.nationalId.en
    });

/**
 * Custom validation for commercial registration number
 * Must be exactly 10 digits
 */
const crNumberValidator = Joi.string()
    .pattern(/^\d{10}$/)
    .allow('', null)
    .messages({
        'string.pattern.base': VALIDATION_MESSAGES.crNumber.ar + ' / ' + VALIDATION_MESSAGES.crNumber.en
    });

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Create case validation schema
 */
const createCaseSchema = Joi.object({
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO (الخطوة 1: المعلومات الأساسية)
    // ═══════════════════════════════════════════════════════════════
    title: Joi.string()
        .min(3)
        .max(200)
        .messages({
            'string.min': 'عنوان القضية قصير جداً / Case title is too short',
            'string.max': 'عنوان القضية طويل جداً / Case title is too long'
        }),
    clientId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف العميل غير صالح / Invalid client ID format'
        }),
    category: Joi.string()
        .valid(...Object.keys(CASE_CATEGORIES))
        .messages({
            'any.only': 'تصنيف القضية غير صالح / Invalid case category'
        }),
    subCategory: Joi.string()
        .max(100)
        .messages({
            'string.max': 'التصنيف الفرعي طويل جداً / Sub-category is too long'
        }),
    caseType: Joi.string()
        .max(100)
        .messages({
            'string.max': 'نوع القضية طويل جداً / Case type is too long'
        }),
    caseNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم القضية طويل جداً / Case number is too long'
        }),
    internalReference: Joi.string()
        .max(20)
        .messages({
            'string.max': 'الرقم المرجعي الداخلي طويل جداً / Internal reference is too long'
        }),
    status: Joi.string()
        .valid('open', 'in_progress', 'pending', 'closed', 'won', 'lost', 'active', 'appeal', 'settlement', 'on-hold', 'completed', 'settled')
        .default('open')
        .messages({
            'any.only': 'حالة القضية غير صالحة / Invalid case status'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent', 'critical')
        .messages({
            'any.only': 'أولوية القضية غير صالحة / Invalid case priority'
        }),
    description: Joi.string()
        .max(5000)
        .allow('')
        .messages({
            'string.max': 'وصف القضية طويل جداً / Case description is too long'
        }),
    filingDate: Joi.date()
        .messages({
            'date.base': 'تاريخ التقديم غير صالح / Invalid filing date'
        }),

    // ═══════════════════════════════════════════════════════════════
    // ENTITY TYPE (نوع الجهة - محكمة/لجنة/تحكيم)
    // ═══════════════════════════════════════════════════════════════
    entityType: Joi.string()
        .valid(...Object.keys(ENTITY_TYPES))
        .default('court')
        .messages({
            'any.only': 'نوع الجهة غير صالح / Invalid entity type'
        }),
    court: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'اسم المحكمة طويل جداً / Court name is too long'
        }),
    committee: Joi.string()
        .valid(...Object.keys(COMMITTEES), '', null)
        .messages({
            'any.only': 'اللجنة غير صالحة / Invalid committee'
        }),
    arbitrationCenter: Joi.string()
        .valid(...Object.keys(ARBITRATION_CENTERS), '', null)
        .messages({
            'any.only': 'مركز التحكيم غير صالح / Invalid arbitration center'
        }),
    region: Joi.string()
        .valid(...Object.keys(REGIONS), '', null)
        .messages({
            'any.only': 'المنطقة غير صالحة / Invalid region'
        }),
    city: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'اسم المدينة طويل جداً / City name is too long'
        }),
    circuitNumber: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'رقم الدائرة طويل جداً / Circuit number is too long'
        }),
    judge: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'اسم القاضي طويل جداً / Judge name is too long'
        }),

    // ═══════════════════════════════════════════════════════════════
    // PLAINTIFF INFO (الخطوة 2: المدعي)
    // ═══════════════════════════════════════════════════════════════
    plaintiffType: Joi.string()
        .valid(...Object.keys(PARTY_TYPES))
        .messages({
            'any.only': 'نوع المدعي غير صالح / Invalid plaintiff type'
        }),
    plaintiffName: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم المدعي طويل جداً / Plaintiff name is too long'
        }),
    plaintiffNationalId: nationalIdValidator,
    plaintiffPhone: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'رقم هاتف المدعي طويل جداً / Plaintiff phone is too long'
        }),
    plaintiffEmail: Joi.string()
        .email()
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني للمدعي غير صالح / Invalid plaintiff email'
        }),
    plaintiffAddress: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'عنوان المدعي طويل جداً / Plaintiff address is too long'
        }),
    // Company plaintiff fields
    plaintiffCompanyName: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم شركة المدعي طويل جداً / Plaintiff company name is too long'
        }),
    plaintiffUnifiedNumber: unifiedNumberValidator,
    plaintiffCrNumber: crNumberValidator,
    plaintiffCompanyAddress: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'عنوان شركة المدعي طويل جداً / Plaintiff company address is too long'
        }),
    plaintiffRepresentativeName: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم ممثل المدعي طويل جداً / Plaintiff representative name is too long'
        }),
    plaintiffRepresentativePosition: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'صفة ممثل المدعي طويلة جداً / Plaintiff representative position is too long'
        }),
    // Government plaintiff fields
    plaintiffGovEntity: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم الجهة الحكومية طويل جداً / Government entity name is too long'
        }),
    plaintiffGovRepresentative: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم ممثل الجهة الحكومية طويل جداً / Government representative name is too long'
        }),

    // ═══════════════════════════════════════════════════════════════
    // DEFENDANT INFO (الخطوة 2: المدعى عليه)
    // ═══════════════════════════════════════════════════════════════
    defendantType: Joi.string()
        .valid(...Object.keys(PARTY_TYPES))
        .messages({
            'any.only': 'نوع المدعى عليه غير صالح / Invalid defendant type'
        }),
    defendantName: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم المدعى عليه طويل جداً / Defendant name is too long'
        }),
    defendantNationalId: nationalIdValidator,
    defendantPhone: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'رقم هاتف المدعى عليه طويل جداً / Defendant phone is too long'
        }),
    defendantEmail: Joi.string()
        .email()
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني للمدعى عليه غير صالح / Invalid defendant email'
        }),
    defendantAddress: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'عنوان المدعى عليه طويل جداً / Defendant address is too long'
        }),
    // Company defendant fields
    defendantCompanyName: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم شركة المدعى عليه طويل جداً / Defendant company name is too long'
        }),
    defendantUnifiedNumber: unifiedNumberValidator,
    defendantCrNumber: crNumberValidator,
    defendantCompanyAddress: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'عنوان شركة المدعى عليه طويل جداً / Defendant company address is too long'
        }),
    defendantRepresentativeName: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم ممثل المدعى عليه طويل جداً / Defendant representative name is too long'
        }),
    defendantRepresentativePosition: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'صفة ممثل المدعى عليه طويلة جداً / Defendant representative position is too long'
        }),
    // Government defendant fields
    defendantGovEntity: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم الجهة الحكومية طويل جداً / Government entity name is too long'
        }),
    defendantGovRepresentative: Joi.string()
        .max(255)
        .allow('', null)
        .messages({
            'string.max': 'اسم ممثل الجهة الحكومية طويل جداً / Government representative name is too long'
        }),

    // ═══════════════════════════════════════════════════════════════
    // CASE DETAILS (الخطوة 3: تفاصيل القضية)
    // ═══════════════════════════════════════════════════════════════
    caseSubject: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'موضوع الدعوى طويل جداً / Case subject is too long'
        }),
    legalBasis: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'السند النظامي طويل جداً / Legal basis is too long'
        }),
    claims: Joi.array()
        .items(Joi.object({
            type: Joi.string().max(100),
            amount: Joi.number().min(0),
            period: Joi.string().max(100).allow('', null),
            description: Joi.string().max(1000).allow('', null)
        }))
        .messages({
            'array.base': 'المطالبات يجب أن تكون مصفوفة / Claims must be an array'
        }),

    // Labor Details (if category === 'labor')
    jobTitle: Joi.string().max(200).allow('', null),
    monthlySalary: Joi.number().min(0).allow(null),
    employmentStartDate: Joi.date().allow(null),
    employmentEndDate: Joi.date().allow(null),
    terminationReason: Joi.string().max(1000).allow('', null),

    // Family Details (if category === 'family')
    marriageDate: Joi.date().allow(null),
    marriageCity: Joi.string().max(100).allow('', null),
    childrenCount: Joi.number().integer().min(0).allow(null),

    // Commercial Details (if category === 'commercial')
    contractDate: Joi.date().allow(null),
    contractValue: Joi.number().min(0).allow(null),

    // ═══════════════════════════════════════════════════════════════
    // POWER OF ATTORNEY (الخطوة 4: الوكالة الشرعية)
    // ═══════════════════════════════════════════════════════════════
    poaNumber: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رقم الوكالة طويل جداً / POA number is too long'
        }),
    poaDate: Joi.date()
        .allow(null)
        .messages({
            'date.base': 'تاريخ الوكالة غير صالح / Invalid POA date'
        }),
    poaExpiry: Joi.date()
        .allow(null)
        .messages({
            'date.base': 'تاريخ انتهاء الوكالة غير صالح / Invalid POA expiry date'
        }),
    poaScope: Joi.string()
        .valid(...Object.keys(POA_SCOPE), '', null)
        .messages({
            'any.only': 'نطاق الوكالة غير صالح / Invalid POA scope'
        }),

    // ═══════════════════════════════════════════════════════════════
    // TEAM ASSIGNMENT (الخطوة 4: الفريق)
    // ═══════════════════════════════════════════════════════════════
    assignedLawyer: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow('', null)
        .messages({
            'string.pattern.base': 'معرف المحامي غير صالح / Invalid lawyer ID format'
        }),
    lawyerId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow('', null)
        .messages({
            'string.pattern.base': 'معرف المحامي غير صالح / Invalid lawyer ID format'
        }),

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL FIELDS (حقول إضافية)
    // ═══════════════════════════════════════════════════════════════
    nextHearingDate: Joi.date()
        .allow(null)
        .messages({
            'date.base': 'تاريخ الجلسة القادمة غير صالح / Invalid next hearing date'
        }),
    nextHearing: Joi.date()
        .allow(null)
        .messages({
            'date.base': 'تاريخ الجلسة القادمة غير صالح / Invalid next hearing date'
        }),
    estimatedValue: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'القيمة التقديرية يجب أن تكون رقماً / Estimated value must be a number',
            'number.min': 'القيمة التقديرية لا يمكن أن تكون سالبة / Estimated value cannot be negative'
        }),
    claimAmount: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'مبلغ المطالبة يجب أن يكون رقماً / Claim amount must be a number',
            'number.min': 'مبلغ المطالبة لا يمكن أن تكون سالبة / Claim amount cannot be negative'
        }),
    expectedWinAmount: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'المبلغ المتوقع يجب أن يكون رقماً / Expected amount must be a number',
            'number.min': 'المبلغ المتوقع لا يمكن أن يكون سالباً / Expected amount cannot be negative'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        }),
    customFields: Joi.object()
        .messages({
            'object.base': 'الحقول المخصصة يجب أن تكون كائن / Custom fields must be an object'
        }),

    // Allow nested objects for plaintiff/defendant data
    plaintiff: Joi.object().unknown(true),
    defendant: Joi.object().unknown(true),
    laborCaseDetails: Joi.object().unknown(true),
    commercialCaseDetails: Joi.object().unknown(true),
    personalStatusDetails: Joi.object().unknown(true),
    powerOfAttorney: Joi.object({
        number: Joi.string().max(100).allow('', null),
        date: Joi.date().allow(null),
        expiry: Joi.date().allow(null),
        scope: Joi.string().valid(...Object.keys(POA_SCOPE), '', null)
    }),

    // Allow other fields to pass through
    startDate: Joi.date().allow(null),
    source: Joi.string().valid('platform', 'external'),
    clientName: Joi.string().max(255).allow('', null),
    clientPhone: Joi.string().max(20).allow('', null),
    documents: Joi.array()
}).custom((value, helpers) => {
    // Custom validation: arbitrationCenter is required when entityType is 'arbitration'
    if (value.entityType === 'arbitration' && !value.arbitrationCenter) {
        return helpers.message({
            custom: VALIDATION_MESSAGES.arbitrationCenterRequired.ar + ' / ' + VALIDATION_MESSAGES.arbitrationCenterRequired.en
        });
    }
    return value;
});

/**
 * Update case validation schema (partial)
 * Inherits all fields from createCaseSchema with min(1) requirement
 */
const updateCaseSchema = createCaseSchema.fork(
    Object.keys(createCaseSchema.describe().keys),
    (schema) => schema.optional()
).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field is required for update'
});

/**
 * Update status validation schema
 */
const updateStatusSchema = Joi.object({
    status: Joi.string()
        .valid('open', 'in_progress', 'pending', 'closed', 'won', 'lost')
        .required()
        .messages({
            'any.only': 'حالة القضية غير صالحة. القيم المسموحة: open, in_progress, pending, closed, won, lost / Invalid case status. Allowed values: open, in_progress, pending, closed, won, lost',
            'any.required': 'حالة القضية مطلوبة / Case status is required'
        }),
    reason: Joi.string()
        .max(500)
        .messages({
            'string.max': 'سبب تغيير الحالة طويل جداً / Status change reason is too long'
        }),
    notes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        })
});

/**
 * Assign lawyer validation schema
 */
const assignLawyerSchema = Joi.object({
    lawyerId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف المحامي غير صالح / Invalid lawyer ID format',
            'any.required': 'معرف المحامي مطلوب / Lawyer ID is required'
        }),
    role: Joi.string()
        .valid('lead', 'associate', 'consultant')
        .messages({
            'any.only': 'دور المحامي غير صالح / Invalid lawyer role'
        }),
    notes: Joi.string()
        .max(500)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        })
});

/**
 * Add party validation schema
 */
const addPartySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'اسم الطرف قصير جداً / Party name is too short',
            'string.max': 'اسم الطرف طويل جداً / Party name is too long',
            'any.required': 'اسم الطرف مطلوب / Party name is required'
        }),
    role: Joi.string()
        .valid('plaintiff', 'defendant', 'witness', 'expert', 'third_party', 'intervenor')
        .required()
        .messages({
            'any.only': 'دور الطرف غير صالح. القيم المسموحة: plaintiff, defendant, witness, expert, third_party, intervenor / Invalid party role. Allowed values: plaintiff, defendant, witness, expert, third_party, intervenor',
            'any.required': 'دور الطرف مطلوب / Party role is required'
        }),
    type: Joi.string()
        .valid('individual', 'organization')
        .messages({
            'any.only': 'نوع الطرف غير صالح / Invalid party type'
        }),
    email: Joi.string()
        .email()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    phone: Joi.string()
        .pattern(/^\+?[0-9]{10,15}$/)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح / Invalid phone number format'
        }),
    address: Joi.string()
        .max(300)
        .messages({
            'string.max': 'العنوان طويل جداً / Address is too long'
        }),
    nationalId: Joi.string()
        .max(50)
        .messages({
            'string.max': 'رقم الهوية طويل جداً / National ID is too long'
        }),
    companyRegistration: Joi.string()
        .max(50)
        .messages({
            'string.max': 'رقم تسجيل الشركة طويل جداً / Company registration is too long'
        }),
    notes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        }),
    contactInfo: Joi.object({
        email: Joi.string().email(),
        phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/),
        mobile: Joi.string().pattern(/^\+?[0-9]{10,15}$/),
        fax: Joi.string().pattern(/^\+?[0-9]{10,15}$/),
        address: Joi.string().max(300),
        city: Joi.string().max(100),
        country: Joi.string().max(100),
        postalCode: Joi.string().max(20)
    }).messages({
        'object.base': 'معلومات الاتصال يجب أن تكون كائن / Contact info must be an object'
    })
});

/**
 * Link document validation schema
 */
const linkDocumentSchema = Joi.object({
    documentId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف المستند غير صالح / Invalid document ID format',
            'any.required': 'معرف المستند مطلوب / Document ID is required'
        }),
    category: Joi.string()
        .valid('contract', 'evidence', 'pleading', 'correspondence', 'court_order', 'expert_report', 'exhibit', 'other')
        .messages({
            'any.only': 'فئة المستند غير صالحة / Invalid document category'
        }),
    description: Joi.string()
        .max(500)
        .messages({
            'string.max': 'وصف المستند طويل جداً / Document description is too long'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        }),
    confidential: Joi.boolean()
        .messages({
            'boolean.base': 'حقل السرية يجب أن يكون قيمة منطقية / Confidential must be a boolean'
        })
});

/**
 * Add note validation schema
 */
const addNoteSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(5000)
        .required()
        .messages({
            'string.min': 'محتوى الملاحظة فارغ / Note content is empty',
            'string.max': 'محتوى الملاحظة طويل جداً / Note content is too long',
            'any.required': 'محتوى الملاحظة مطلوب / Note content is required'
        }),
    type: Joi.string()
        .valid('general', 'important', 'reminder', 'meeting', 'phone_call', 'email')
        .default('general')
        .messages({
            'any.only': 'نوع الملاحظة غير صالح / Invalid note type'
        }),
    isPrivate: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'حقل الخصوصية يجب أن يكون قيمة منطقية / Private field must be a boolean'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        })
});

/**
 * Update note validation schema
 */
const updateNoteSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(5000)
        .messages({
            'string.min': 'محتوى الملاحظة فارغ / Note content is empty',
            'string.max': 'محتوى الملاحظة طويل جداً / Note content is too long'
        }),
    type: Joi.string()
        .valid('general', 'important', 'reminder', 'meeting', 'phone_call', 'email')
        .messages({
            'any.only': 'نوع الملاحظة غير صالح / Invalid note type'
        }),
    isPrivate: Joi.boolean()
        .messages({
            'boolean.base': 'حقل الخصوصية يجب أن يكون قيمة منطقية / Private field must be a boolean'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field is required for update'
});

/**
 * Add hearing validation schema
 */
const addHearingSchema = Joi.object({
    date: Joi.date()
        .required()
        .messages({
            'date.base': 'تاريخ الجلسة غير صالح / Invalid hearing date',
            'any.required': 'تاريخ الجلسة مطلوب / Hearing date is required'
        }),
    time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
            'string.pattern.base': 'وقت الجلسة غير صالح (يجب أن يكون بصيغة HH:MM) / Invalid hearing time (must be HH:MM format)'
        }),
    type: Joi.string()
        .max(100)
        .messages({
            'string.max': 'نوع الجلسة طويل جداً / Hearing type is too long'
        }),
    location: Joi.string()
        .max(200)
        .messages({
            'string.max': 'موقع الجلسة طويل جداً / Hearing location is too long'
        }),
    judge: Joi.string()
        .max(100)
        .messages({
            'string.max': 'اسم القاضي طويل جداً / Judge name is too long'
        }),
    notes: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        }),
    status: Joi.string()
        .valid('scheduled', 'completed', 'postponed', 'cancelled')
        .default('scheduled')
        .messages({
            'any.only': 'حالة الجلسة غير صالحة / Invalid hearing status'
        }),
    reminder: Joi.boolean()
        .messages({
            'boolean.base': 'حقل التذكير يجب أن يكون قيمة منطقية / Reminder must be a boolean'
        })
});

/**
 * Update hearing validation schema
 */
const updateHearingSchema = Joi.object({
    date: Joi.date()
        .messages({
            'date.base': 'تاريخ الجلسة غير صالح / Invalid hearing date'
        }),
    time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
            'string.pattern.base': 'وقت الجلسة غير صالح (يجب أن يكون بصيغة HH:MM) / Invalid hearing time (must be HH:MM format)'
        }),
    type: Joi.string()
        .max(100)
        .messages({
            'string.max': 'نوع الجلسة طويل جداً / Hearing type is too long'
        }),
    location: Joi.string()
        .max(200)
        .messages({
            'string.max': 'موقع الجلسة طويل جداً / Hearing location is too long'
        }),
    judge: Joi.string()
        .max(100)
        .messages({
            'string.max': 'اسم القاضي طويل جداً / Judge name is too long'
        }),
    notes: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        }),
    status: Joi.string()
        .valid('scheduled', 'completed', 'postponed', 'cancelled')
        .messages({
            'any.only': 'حالة الجلسة غير صالحة / Invalid hearing status'
        }),
    reminder: Joi.boolean()
        .messages({
            'boolean.base': 'حقل التذكير يجب أن يكون قيمة منطقية / Reminder must be a boolean'
        }),
    outcome: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'نتيجة الجلسة طويلة جداً / Hearing outcome is too long'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field is required for update'
});

/**
 * Add timeline event validation schema
 */
const addTimelineEventSchema = Joi.object({
    date: Joi.date()
        .required()
        .messages({
            'date.base': 'تاريخ الحدث غير صالح / Invalid event date',
            'any.required': 'تاريخ الحدث مطلوب / Event date is required'
        }),
    title: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'عنوان الحدث قصير جداً / Event title is too short',
            'string.max': 'عنوان الحدث طويل جداً / Event title is too long',
            'any.required': 'عنوان الحدث مطلوب / Event title is required'
        }),
    description: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'وصف الحدث طويل جداً / Event description is too long'
        }),
    type: Joi.string()
        .valid('filing', 'hearing', 'decision', 'motion', 'settlement', 'appeal', 'other')
        .messages({
            'any.only': 'نوع الحدث غير صالح / Invalid event type'
        }),
    importance: Joi.string()
        .valid('low', 'medium', 'high', 'critical')
        .messages({
            'any.only': 'أهمية الحدث غير صالحة / Invalid event importance'
        })
});

/**
 * Update timeline event validation schema
 */
const updateTimelineEventSchema = Joi.object({
    date: Joi.date()
        .messages({
            'date.base': 'تاريخ الحدث غير صالح / Invalid event date'
        }),
    title: Joi.string()
        .min(3)
        .max(200)
        .messages({
            'string.min': 'عنوان الحدث قصير جداً / Event title is too short',
            'string.max': 'عنوان الحدث طويل جداً / Event title is too long'
        }),
    description: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'وصف الحدث طويل جداً / Event description is too long'
        }),
    type: Joi.string()
        .valid('filing', 'hearing', 'decision', 'motion', 'settlement', 'appeal', 'other')
        .messages({
            'any.only': 'نوع الحدث غير صالح / Invalid event type'
        }),
    importance: Joi.string()
        .valid('low', 'medium', 'high', 'critical')
        .messages({
            'any.only': 'أهمية الحدث غير صالحة / Invalid event importance'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field is required for update'
});

/**
 * Add claim validation schema
 */
const addClaimSchema = Joi.object({
    type: Joi.string()
        .max(100)
        .required()
        .messages({
            'string.max': 'نوع المطالبة طويل جداً / Claim type is too long',
            'any.required': 'نوع المطالبة مطلوب / Claim type is required'
        }),
    amount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'مبلغ المطالبة يجب أن يكون رقماً / Claim amount must be a number',
            'number.min': 'مبلغ المطالبة لا يمكن أن يكون سالباً / Claim amount cannot be negative'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .default('USD')
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    description: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'وصف المطالبة طويل جداً / Claim description is too long'
        }),
    status: Joi.string()
        .valid('pending', 'approved', 'rejected', 'partially_approved')
        .default('pending')
        .messages({
            'any.only': 'حالة المطالبة غير صالحة / Invalid claim status'
        })
});

/**
 * Update claim validation schema
 */
const updateClaimSchema = Joi.object({
    type: Joi.string()
        .max(100)
        .messages({
            'string.max': 'نوع المطالبة طويل جداً / Claim type is too long'
        }),
    amount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'مبلغ المطالبة يجب أن يكون رقماً / Claim amount must be a number',
            'number.min': 'مبلغ المطالبة لا يمكن أن يكون سالباً / Claim amount cannot be negative'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    description: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'وصف المطالبة طويل جداً / Claim description is too long'
        }),
    status: Joi.string()
        .valid('pending', 'approved', 'rejected', 'partially_approved')
        .messages({
            'any.only': 'حالة المطالبة غير صالحة / Invalid claim status'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field is required for update'
});

/**
 * Update outcome validation schema
 */
const updateOutcomeSchema = Joi.object({
    outcome: Joi.string()
        .valid('won', 'lost', 'settled', 'dismissed', 'withdrawn', 'pending')
        .required()
        .messages({
            'any.only': 'نتيجة القضية غير صالحة / Invalid case outcome',
            'any.required': 'نتيجة القضية مطلوبة / Case outcome is required'
        }),
    description: Joi.string()
        .max(2000)
        .messages({
            'string.max': 'وصف النتيجة طويل جداً / Outcome description is too long'
        }),
    settlementAmount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'مبلغ التسوية يجب أن يكون رقماً / Settlement amount must be a number',
            'number.min': 'مبلغ التسوية لا يمكن أن يكون سالباً / Settlement amount cannot be negative'
        }),
    awardedAmount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المبلغ المحكوم به يجب أن يكون رقماً / Awarded amount must be a number',
            'number.min': 'المبلغ المحكوم به لا يمكن أن يكون سالباً / Awarded amount cannot be negative'
        }),
    closingDate: Joi.date()
        .messages({
            'date.base': 'تاريخ الإغلاق غير صالح / Invalid closing date'
        })
});

/**
 * Update progress validation schema
 */
const updateProgressSchema = Joi.object({
    progress: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
            'number.base': 'التقدم يجب أن يكون رقماً / Progress must be a number',
            'number.min': 'التقدم لا يمكن أن يكون أقل من 0 / Progress cannot be less than 0',
            'number.max': 'التقدم لا يمكن أن يكون أكثر من 100 / Progress cannot be more than 100',
            'any.required': 'التقدم مطلوب / Progress is required'
        }),
    notes: Joi.string()
        .max(500)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        })
});

/**
 * Document upload URL validation schema
 */
const documentUploadUrlSchema = Joi.object({
    fileName: Joi.string()
        .min(1)
        .max(255)
        .required()
        .messages({
            'string.min': 'اسم الملف فارغ / File name is empty',
            'string.max': 'اسم الملف طويل جداً / File name is too long',
            'any.required': 'اسم الملف مطلوب / File name is required'
        }),
    fileType: Joi.string()
        .required()
        .messages({
            'any.required': 'نوع الملف مطلوب / File type is required'
        }),
    fileSize: Joi.number()
        .min(1)
        .max(100 * 1024 * 1024) // 100MB max
        .required()
        .messages({
            'number.min': 'حجم الملف غير صالح / Invalid file size',
            'number.max': 'حجم الملف كبير جداً (الحد الأقصى 100MB) / File size too large (max 100MB)',
            'any.required': 'حجم الملف مطلوب / File size is required'
        }),
    category: Joi.string()
        .valid('contract', 'evidence', 'pleading', 'correspondence', 'court_order', 'expert_report', 'exhibit', 'other')
        .messages({
            'any.only': 'فئة المستند غير صالحة / Invalid document category'
        })
});

/**
 * Confirm document upload validation schema
 */
const confirmDocumentUploadSchema = Joi.object({
    key: Joi.string()
        .required()
        .messages({
            'any.required': 'مفتاح المستند مطلوب / Document key is required'
        }),
    title: Joi.string()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.min': 'عنوان المستند فارغ / Document title is empty',
            'string.max': 'عنوان المستند طويل جداً / Document title is too long',
            'any.required': 'عنوان المستند مطلوب / Document title is required'
        }),
    description: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'وصف المستند طويل جداً / Document description is too long'
        }),
    category: Joi.string()
        .valid('contract', 'evidence', 'pleading', 'correspondence', 'court_order', 'expert_report', 'exhibit', 'other')
        .messages({
            'any.only': 'فئة المستند غير صالحة / Invalid document category'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        })
});

/**
 * Rich document validation schema
 */
const createRichDocumentSchema = Joi.object({
    title: Joi.string()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.min': 'عنوان المستند فارغ / Document title is empty',
            'string.max': 'عنوان المستند طويل جداً / Document title is too long',
            'any.required': 'عنوان المستند مطلوب / Document title is required'
        }),
    content: Joi.string()
        .allow('')
        .messages({
            'string.base': 'محتوى المستند يجب أن يكون نصاً / Document content must be a string'
        }),
    type: Joi.string()
        .valid('contract', 'brief', 'memo', 'letter', 'pleading', 'motion', 'order', 'agreement', 'notice', 'other')
        .messages({
            'any.only': 'نوع المستند غير صالح / Invalid document type'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        })
});

/**
 * Update rich document validation schema
 */
const updateRichDocumentSchema = Joi.object({
    title: Joi.string()
        .min(1)
        .max(200)
        .messages({
            'string.min': 'عنوان المستند فارغ / Document title is empty',
            'string.max': 'عنوان المستند طويل جداً / Document title is too long'
        }),
    content: Joi.string()
        .allow('')
        .messages({
            'string.base': 'محتوى المستند يجب أن يكون نصاً / Document content must be a string'
        }),
    type: Joi.string()
        .valid('contract', 'brief', 'memo', 'letter', 'pleading', 'motion', 'order', 'agreement', 'notice', 'other')
        .messages({
            'any.only': 'نوع المستند غير صالح / Invalid document type'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field is required for update'
});

/**
 * MongoDB ObjectId parameter validation schema
 */
const objectIdParamSchema = Joi.object({
    _id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف القضية غير صالح / Invalid case ID format',
            'any.required': 'معرف القضية مطلوب / Case ID is required'
        })
});

/**
 * Nested ID parameter validation (for sub-resources)
 */
const nestedIdParamSchema = Joi.object({
    _id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف القضية غير صالح / Invalid case ID format',
            'any.required': 'معرف القضية مطلوب / Case ID is required'
        }),
    noteId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف الملاحظة غير صالح / Invalid note ID format'
        }),
    hearingId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف الجلسة غير صالح / Invalid hearing ID format'
        }),
    docId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف المستند غير صالح / Invalid document ID format'
        }),
    documentId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف المستند غير صالح / Invalid document ID format'
        }),
    claimId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف المطالبة غير صالح / Invalid claim ID format'
        }),
    eventId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف الحدث غير صالح / Invalid event ID format'
        }),
    versionNumber: Joi.number()
        .integer()
        .min(1)
        .messages({
            'number.base': 'رقم الإصدار يجب أن يكون رقماً / Version number must be a number',
            'number.integer': 'رقم الإصدار يجب أن يكون عدداً صحيحاً / Version number must be an integer',
            'number.min': 'رقم الإصدار غير صالح / Invalid version number'
        })
}).unknown(true); // Allow other params to pass through

// ============================================
// PIPELINE VALIDATION SCHEMAS
// ============================================

/**
 * Move case to stage validation schema
 */
const moveCaseToStageSchema = Joi.object({
    newStage: Joi.string()
        .required()
        .messages({
            'any.required': 'المرحلة الجديدة مطلوبة / New stage is required',
            'string.empty': 'المرحلة الجديدة مطلوبة / New stage is required'
        }),
    notes: Joi.string()
        .max(1000)
        .allow('')
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        })
});

/**
 * End case validation schema
 */
const endCaseSchema = Joi.object({
    outcome: Joi.string()
        .valid('won', 'lost', 'settled')
        .required()
        .messages({
            'any.only': 'نتيجة القضية غير صالحة / Invalid case outcome',
            'any.required': 'نتيجة القضية مطلوبة / Case outcome is required'
        }),
    endReason: Joi.string()
        .valid('final_judgment', 'settlement', 'withdrawal', 'dismissal', 'reconciliation', 'execution_complete', 'other')
        .messages({
            'any.only': 'سبب الإنهاء غير صالح / Invalid end reason'
        }),
    finalAmount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المبلغ النهائي يجب أن يكون رقماً / Final amount must be a number',
            'number.min': 'المبلغ النهائي لا يمكن أن يكون سالباً / Final amount cannot be negative'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('')
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        }),
    endDate: Joi.date()
        .messages({
            'date.base': 'تاريخ الإنهاء غير صالح / Invalid end date'
        })
});

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Creates validation middleware for a given schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق / Validation error',
                errors
            });
        }

        // Replace request data with validated/sanitized data
        req[source] = value;
        next();
    };
};

// ============================================
// EXPORT MIDDLEWARE
// ============================================

module.exports = {
    // Schemas (for direct use)
    schemas: {
        createCase: createCaseSchema,
        updateCase: updateCaseSchema,
        updateStatus: updateStatusSchema,
        assignLawyer: assignLawyerSchema,
        addParty: addPartySchema,
        linkDocument: linkDocumentSchema,
        addNote: addNoteSchema,
        updateNote: updateNoteSchema,
        addHearing: addHearingSchema,
        updateHearing: updateHearingSchema,
        addTimelineEvent: addTimelineEventSchema,
        updateTimelineEvent: updateTimelineEventSchema,
        addClaim: addClaimSchema,
        updateClaim: updateClaimSchema,
        updateOutcome: updateOutcomeSchema,
        updateProgress: updateProgressSchema,
        documentUploadUrl: documentUploadUrlSchema,
        confirmDocumentUpload: confirmDocumentUploadSchema,
        createRichDocument: createRichDocumentSchema,
        updateRichDocument: updateRichDocumentSchema,
        objectIdParam: objectIdParamSchema,
        nestedIdParam: nestedIdParamSchema,
        moveCaseToStage: moveCaseToStageSchema,
        endCase: endCaseSchema
    },

    // Middleware (for route use)
    validateCreateCase: validate(createCaseSchema),
    validateUpdateCase: validate(updateCaseSchema),
    validateUpdateStatus: validate(updateStatusSchema),
    validateAssignLawyer: validate(assignLawyerSchema),
    validateAddParty: validate(addPartySchema),
    validateLinkDocument: validate(linkDocumentSchema),
    validateAddNote: validate(addNoteSchema),
    validateUpdateNote: validate(updateNoteSchema),
    validateAddHearing: validate(addHearingSchema),
    validateUpdateHearing: validate(updateHearingSchema),
    validateAddTimelineEvent: validate(addTimelineEventSchema),
    validateUpdateTimelineEvent: validate(updateTimelineEventSchema),
    validateAddClaim: validate(addClaimSchema),
    validateUpdateClaim: validate(updateClaimSchema),
    validateUpdateOutcome: validate(updateOutcomeSchema),
    validateUpdateProgress: validate(updateProgressSchema),
    validateDocumentUploadUrl: validate(documentUploadUrlSchema),
    validateConfirmDocumentUpload: validate(confirmDocumentUploadSchema),
    validateCreateRichDocument: validate(createRichDocumentSchema),
    validateUpdateRichDocument: validate(updateRichDocumentSchema),
    validateObjectIdParam: validate(objectIdParamSchema, 'params'),
    validateNestedIdParam: validate(nestedIdParamSchema, 'params'),
    validateMoveCaseToStage: validate(moveCaseToStageSchema),
    validateEndCase: validate(endCaseSchema),

    // Generic validate function
    validate,

    // Custom validators
    customValidators: {
        unifiedNumberValidator,
        nationalIdValidator,
        crNumberValidator
    }
};
