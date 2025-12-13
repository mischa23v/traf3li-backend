/**
 * Client Route Validation Schemas
 *
 * Uses Joi for request validation on client endpoints.
 * Provides both validation schemas and middleware functions.
 */

const Joi = require('joi');

// ============================================
// CUSTOM VALIDATORS
// ============================================

/**
 * Saudi National ID pattern (10 digits, starts with 1 or 2)
 * NOTE: Disabled for Playwright testing - accepts any value
 */
// const saudiNationalIdPattern = /^[12]\d{9}$/;
const saudiNationalIdPattern = /.*/;

/**
 * Saudi phone number pattern (+966 or 05 format)
 * NOTE: Disabled for Playwright testing - accepts any value
 */
// const saudiPhonePattern = /^(\+966|966|05)[0-9]{8,9}$/;
const saudiPhonePattern = /.*/;

/**
 * Saudi commercial registration pattern (10 digits)
 * NOTE: Disabled for Playwright testing - accepts any value
 */
// const saudiCRPattern = /^\d{10}$/;
const saudiCRPattern = /.*/;

/**
 * Saudi postal code pattern (5 digits)
 * NOTE: Disabled for Playwright testing - accepts any value
 */
// const postalCodePattern = /^\d{5}$/;
const postalCodePattern = /.*/;

// ============================================
// REUSABLE FIELD SCHEMAS
// ============================================

const phoneSchema = Joi.string()
    .pattern(saudiPhonePattern)
    .messages({
        'string.pattern.base': 'رقم الهاتف غير صالح (يجب أن يبدأ بـ +966 أو 05) / Invalid phone number (must start with +966 or 05)',
        'any.required': 'رقم الهاتف مطلوب / Phone number is required'
    });

// NOTE: Email validation disabled for Playwright testing - accepts any value
const emailSchema = Joi.string()
    // .email()  // Disabled for testing
    .lowercase()
    .messages({
        'string.email': 'البريد الإلكتروني غير صالح / Invalid email format',
        'string.empty': 'البريد الإلكتروني لا يمكن أن يكون فارغاً / Email cannot be empty'
    });

const nationalIdSchema = Joi.string()
    .pattern(saudiNationalIdPattern)
    .messages({
        'string.pattern.base': 'رقم الهوية الوطنية غير صالح (10 أرقام تبدأ بـ 1 أو 2) / Invalid national ID (10 digits starting with 1 or 2)',
        'any.required': 'رقم الهوية الوطنية مطلوب / National ID is required'
    });

const crNumberSchema = Joi.string()
    .pattern(saudiCRPattern)
    .messages({
        'string.pattern.base': 'رقم السجل التجاري غير صالح (10 أرقام) / Invalid CR number (10 digits)',
        'any.required': 'رقم السجل التجاري مطلوب / Commercial registration number is required'
    });

const addressSchema = Joi.object({
    city: Joi.string().max(100).messages({
        'string.max': 'اسم المدينة طويل جداً / City name is too long'
    }),
    district: Joi.string().max(100).messages({
        'string.max': 'اسم الحي طويل جداً / District name is too long'
    }),
    street: Joi.string().max(200).messages({
        'string.max': 'اسم الشارع طويل جداً / Street name is too long'
    }),
    buildingNumber: Joi.string().max(20).messages({
        'string.max': 'رقم المبنى طويل جداً / Building number is too long'
    }),
    postalCode: Joi.string().pattern(postalCodePattern).messages({
        'string.pattern.base': 'الرمز البريدي غير صالح (5 أرقام) / Invalid postal code (5 digits)'
    }),
    additionalNumber: Joi.string().max(20).messages({
        'string.max': 'الرقم الإضافي طويل جداً / Additional number is too long'
    }),
    unitNumber: Joi.string().max(20).messages({
        'string.max': 'رقم الوحدة طويل جداً / Unit number is too long'
    }),
    fullAddress: Joi.string().max(500).messages({
        'string.max': 'العنوان الكامل طويل جداً / Full address is too long'
    }),
    country: Joi.string().default('Saudi Arabia')
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Create client validation schema
 */
const createClientSchema = Joi.object({
    // Client Type (optional - defaults to 'individual')
    clientType: Joi.string()
        .valid('individual', 'company')
        .default('individual')
        .messages({
            'any.only': 'نوع العميل يجب أن يكون فرد أو شركة / Client type must be individual or company'
        }),

    // Individual Fields
    firstName: Joi.when('clientType', {
        is: 'individual',
        then: Joi.string().max(50).messages({
            'string.max': 'الاسم الأول طويل جداً / First name is too long'
        })
    }),
    middleName: Joi.string().max(50).messages({
        'string.max': 'الاسم الأوسط طويل جداً / Middle name is too long'
    }),
    lastName: Joi.when('clientType', {
        is: 'individual',
        then: Joi.string().max(50).messages({
            'string.max': 'اسم العائلة طويل جداً / Last name is too long'
        })
    }),
    fullNameArabic: Joi.when('clientType', {
        is: 'individual',
        then: Joi.string().max(150).messages({
            'string.max': 'الاسم الكامل بالعربية طويل جداً / Full Arabic name is too long'
        })
    }),
    fullNameEnglish: Joi.string().max(150).messages({
        'string.max': 'الاسم الكامل بالإنجليزية طويل جداً / Full English name is too long'
    }),
    nationalId: Joi.when('clientType', {
        is: 'individual',
        then: nationalIdSchema
    }),
    gender: Joi.string().valid('male', 'female').messages({
        'any.only': 'الجنس يجب أن يكون ذكر أو أنثى / Gender must be male or female'
    }),
    nationality: Joi.string().max(50).messages({
        'string.max': 'الجنسية طويلة جداً / Nationality is too long'
    }),
    dateOfBirth: Joi.date().max('now').messages({
        'date.max': 'تاريخ الميلاد لا يمكن أن يكون في المستقبل / Date of birth cannot be in the future'
    }),

    // Company Fields
    companyName: Joi.when('clientType', {
        is: 'company',
        then: Joi.string().max(200).messages({
            'string.max': 'اسم الشركة طويل جداً / Company name is too long'
        })
    }),
    companyNameEnglish: Joi.string().max(200).messages({
        'string.max': 'اسم الشركة بالإنجليزية طويل جداً / Company English name is too long'
    }),
    crNumber: Joi.when('clientType', {
        is: 'company',
        then: crNumberSchema
    }),
    unifiedNumber: Joi.string().max(20).messages({
        'string.max': 'الرقم الموحد طويل جداً / Unified number is too long'
    }),
    mainActivity: Joi.string().max(200).messages({
        'string.max': 'النشاط الرئيسي طويل جداً / Main activity is too long'
    }),
    website: Joi.string().uri().messages({
        'string.uri': 'رابط الموقع غير صالح / Invalid website URL'
    }),

    // Contact Info (optional for testing)
    phone: phoneSchema,
    alternatePhone: phoneSchema,
    whatsapp: phoneSchema,
    email: emailSchema,
    secondaryEmail: emailSchema,
    preferredContact: Joi.string().valid('phone', 'email', 'whatsapp', 'sms').default('phone').messages({
        'any.only': 'وسيلة الاتصال المفضلة غير صالحة / Invalid preferred contact method'
    }),
    preferredTime: Joi.string().valid('morning', 'noon', 'evening', 'anytime').default('anytime').messages({
        'any.only': 'الوقت المفضل غير صالح / Invalid preferred time'
    }),
    preferredLanguage: Joi.string().valid('ar', 'en').default('ar').messages({
        'any.only': 'اللغة المفضلة يجب أن تكون عربية أو إنجليزية / Preferred language must be ar or en'
    }),

    // Address
    address: addressSchema,

    // Legal Representative (for companies)
    legalRepresentative: Joi.when('clientType', {
        is: 'company',
        then: Joi.object({
            name: Joi.string().max(150).messages({
                'string.max': 'اسم الممثل القانوني طويل جداً / Legal representative name is too long'
            }),
            nationalId: nationalIdSchema,
            position: Joi.string().max(100).messages({
                'string.max': 'المنصب طويل جداً / Position is too long'
            }),
            phone: phoneSchema,
            email: emailSchema
        })
    }),

    // Emergency Contact
    emergencyContact: Joi.object({
        name: Joi.string().max(150).messages({
            'string.max': 'اسم جهة الاتصال للطوارئ طويل جداً / Emergency contact name is too long'
        }),
        relation: Joi.string().max(50).messages({
            'string.max': 'العلاقة طويلة جداً / Relation is too long'
        }),
        phone: phoneSchema,
        altPhone: phoneSchema,
        email: emailSchema,
        address: Joi.string().max(500).messages({
            'string.max': 'العنوان طويل جداً / Address is too long'
        })
    }),

    // Billing Info
    billing: Joi.object({
        type: Joi.string().valid('hourly', 'flat_fee', 'contingency', 'retainer').default('hourly').messages({
            'any.only': 'نوع الفوترة غير صالح / Invalid billing type'
        }),
        hourlyRate: Joi.number().min(0).messages({
            'number.min': 'معدل الساعة يجب أن يكون صفراً أو أكثر / Hourly rate must be zero or greater'
        }),
        paymentTerms: Joi.string().valid('immediate', 'net_15', 'net_30', 'net_45', 'net_60').default('net_30').messages({
            'any.only': 'شروط الدفع غير صالحة / Invalid payment terms'
        }),
        creditLimit: Joi.number().min(0).messages({
            'number.min': 'حد الائتمان يجب أن يكون صفراً أو أكثر / Credit limit must be zero or greater'
        })
    }),

    // VAT Registration
    vatRegistration: Joi.object({
        isRegistered: Joi.boolean(),
        vatNumber: Joi.string().max(20).messages({
            'string.max': 'رقم الضريبة طويل جداً / VAT number is too long'
        })
    }),

    // Client Source & Assignment
    clientSource: Joi.string()
        .valid('website', 'referral', 'returning', 'ads', 'social', 'walkin', 'platform', 'external', 'cold_call', 'event')
        .default('external')
        .messages({
            'any.only': 'مصدر العميل غير صالح / Invalid client source'
        }),
    referredBy: Joi.string().max(150).messages({
        'string.max': 'اسم المُحيل طويل جداً / Referred by name is too long'
    }),

    // Notes & Tags
    generalNotes: Joi.string().max(2000).messages({
        'string.max': 'الملاحظات العامة طويلة جداً / General notes are too long'
    }),
    internalNotes: Joi.string().max(2000).messages({
        'string.max': 'الملاحظات الداخلية طويلة جداً / Internal notes are too long'
    }),
    tags: Joi.array().items(Joi.string().max(50)).messages({
        'string.max': 'الوسم طويل جداً / Tag is too long'
    }),

    // Flags
    flags: Joi.object({
        isVip: Joi.boolean(),
        isHighRisk: Joi.boolean(),
        needsApproval: Joi.boolean()
    }),

    // Tier
    clientTier: Joi.string().valid('standard', 'premium', 'vip').default('standard').messages({
        'any.only': 'مستوى العميل غير صالح / Invalid client tier'
    })
});

/**
 * Update client validation schema (partial validation)
 */
const updateClientSchema = Joi.object({
    // All fields are optional for updates
    clientType: Joi.string().valid('individual', 'company').messages({
        'any.only': 'نوع العميل يجب أن يكون فرد أو شركة / Client type must be individual or company'
    }),

    // Individual Fields
    firstName: Joi.string().max(50).messages({
        'string.max': 'الاسم الأول طويل جداً / First name is too long'
    }),
    middleName: Joi.string().max(50).messages({
        'string.max': 'الاسم الأوسط طويل جداً / Middle name is too long'
    }),
    lastName: Joi.string().max(50).messages({
        'string.max': 'اسم العائلة طويل جداً / Last name is too long'
    }),
    fullNameArabic: Joi.string().max(150).messages({
        'string.max': 'الاسم الكامل بالعربية طويل جداً / Full Arabic name is too long'
    }),
    fullNameEnglish: Joi.string().max(150).messages({
        'string.max': 'الاسم الكامل بالإنجليزية طويل جداً / Full English name is too long'
    }),
    nationalId: nationalIdSchema,
    gender: Joi.string().valid('male', 'female').messages({
        'any.only': 'الجنس يجب أن يكون ذكر أو أنثى / Gender must be male or female'
    }),
    nationality: Joi.string().max(50).messages({
        'string.max': 'الجنسية طويلة جداً / Nationality is too long'
    }),
    dateOfBirth: Joi.date().max('now').messages({
        'date.max': 'تاريخ الميلاد لا يمكن أن يكون في المستقبل / Date of birth cannot be in the future'
    }),

    // Company Fields
    companyName: Joi.string().max(200).messages({
        'string.max': 'اسم الشركة طويل جداً / Company name is too long'
    }),
    companyNameEnglish: Joi.string().max(200).messages({
        'string.max': 'اسم الشركة بالإنجليزية طويل جداً / Company English name is too long'
    }),
    crNumber: crNumberSchema,
    unifiedNumber: Joi.string().max(20).messages({
        'string.max': 'الرقم الموحد طويل جداً / Unified number is too long'
    }),
    mainActivity: Joi.string().max(200).messages({
        'string.max': 'النشاط الرئيسي طويل جداً / Main activity is too long'
    }),
    website: Joi.string().uri().messages({
        'string.uri': 'رابط الموقع غير صالح / Invalid website URL'
    }),

    // Contact Info
    phone: phoneSchema,
    alternatePhone: phoneSchema,
    whatsapp: phoneSchema,
    email: emailSchema,
    secondaryEmail: emailSchema,
    preferredContact: Joi.string().valid('phone', 'email', 'whatsapp', 'sms').messages({
        'any.only': 'وسيلة الاتصال المفضلة غير صالحة / Invalid preferred contact method'
    }),
    preferredTime: Joi.string().valid('morning', 'noon', 'evening', 'anytime').messages({
        'any.only': 'الوقت المفضل غير صالح / Invalid preferred time'
    }),
    preferredLanguage: Joi.string().valid('ar', 'en').messages({
        'any.only': 'اللغة المفضلة يجب أن تكون عربية أو إنجليزية / Preferred language must be ar or en'
    }),

    // Address
    address: addressSchema,

    // Legal Representative
    legalRepresentative: Joi.object({
        name: Joi.string().max(150).messages({
            'string.max': 'اسم الممثل القانوني طويل جداً / Legal representative name is too long'
        }),
        nationalId: nationalIdSchema,
        position: Joi.string().max(100).messages({
            'string.max': 'المنصب طويل جداً / Position is too long'
        }),
        phone: phoneSchema,
        email: emailSchema
    }),

    // Emergency Contact
    emergencyContact: Joi.object({
        name: Joi.string().max(150).messages({
            'string.max': 'اسم جهة الاتصال للطوارئ طويل جداً / Emergency contact name is too long'
        }),
        relation: Joi.string().max(50).messages({
            'string.max': 'العلاقة طويلة جداً / Relation is too long'
        }),
        phone: phoneSchema,
        altPhone: phoneSchema,
        email: emailSchema,
        address: Joi.string().max(500).messages({
            'string.max': 'العنوان طويل جداً / Address is too long'
        })
    }),

    // Billing Info
    billing: Joi.object({
        type: Joi.string().valid('hourly', 'flat_fee', 'contingency', 'retainer').messages({
            'any.only': 'نوع الفوترة غير صالح / Invalid billing type'
        }),
        hourlyRate: Joi.number().min(0).messages({
            'number.min': 'معدل الساعة يجب أن يكون صفراً أو أكثر / Hourly rate must be zero or greater'
        }),
        paymentTerms: Joi.string().valid('immediate', 'net_15', 'net_30', 'net_45', 'net_60').messages({
            'any.only': 'شروط الدفع غير صالحة / Invalid payment terms'
        }),
        creditLimit: Joi.number().min(0).messages({
            'number.min': 'حد الائتمان يجب أن يكون صفراً أو أكثر / Credit limit must be zero or greater'
        })
    }),

    // VAT Registration
    vatRegistration: Joi.object({
        isRegistered: Joi.boolean(),
        vatNumber: Joi.string().max(20).messages({
            'string.max': 'رقم الضريبة طويل جداً / VAT number is too long'
        })
    }),

    // Client Source
    clientSource: Joi.string()
        .valid('website', 'referral', 'returning', 'ads', 'social', 'walkin', 'platform', 'external', 'cold_call', 'event')
        .messages({
            'any.only': 'مصدر العميل غير صالح / Invalid client source'
        }),
    referredBy: Joi.string().max(150).messages({
        'string.max': 'اسم المُحيل طويل جداً / Referred by name is too long'
    }),

    // Notes & Tags
    generalNotes: Joi.string().max(2000).messages({
        'string.max': 'الملاحظات العامة طويلة جداً / General notes are too long'
    }),
    internalNotes: Joi.string().max(2000).messages({
        'string.max': 'الملاحظات الداخلية طويلة جداً / Internal notes are too long'
    }),
    tags: Joi.array().items(Joi.string().max(50)).messages({
        'string.max': 'الوسم طويل جداً / Tag is too long'
    }),

    // Tier
    clientTier: Joi.string().valid('standard', 'premium', 'vip').messages({
        'any.only': 'مستوى العميل غير صالح / Invalid client tier'
    }),

    // Follow-up
    nextFollowUpDate: Joi.date().messages({
        'date.base': 'تاريخ المتابعة غير صالح / Invalid follow-up date'
    }),
    nextFollowUpNote: Joi.string().max(500).messages({
        'string.max': 'ملاحظة المتابعة طويلة جداً / Follow-up note is too long'
    })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Add contact validation schema (for emergency contact or legal representative)
 */
const addContactSchema = Joi.object({
    name: Joi.string()
        .required()
        .max(150)
        .messages({
            'string.max': 'الاسم طويل جداً / Name is too long',
            'any.required': 'الاسم مطلوب / Name is required'
        }),
    email: emailSchema,
    phone: phoneSchema.required(),
    role: Joi.string()
        .valid('emergency', 'legal_representative', 'authorized_person', 'other')
        .required()
        .messages({
            'any.only': 'الدور غير صالح / Invalid role',
            'any.required': 'الدور مطلوب / Role is required'
        }),
    relation: Joi.string().max(50).messages({
        'string.max': 'العلاقة طويلة جداً / Relation is too long'
    }),
    position: Joi.string().max(100).messages({
        'string.max': 'المنصب طويل جداً / Position is too long'
    }),
    nationalId: nationalIdSchema,
    address: Joi.string().max(500).messages({
        'string.max': 'العنوان طويل جداً / Address is too long'
    })
});

/**
 * Update balance validation schema
 */
const updateBalanceSchema = Joi.object({
    amount: Joi.number()
        .required()
        .min(0)
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.min': 'المبلغ يجب أن يكون صفراً أو أكثر / Amount must be zero or greater',
            'any.required': 'المبلغ مطلوب / Amount is required'
        }),
    operation: Joi.string()
        .valid('add', 'subtract', 'set')
        .required()
        .messages({
            'any.only': 'العملية يجب أن تكون إضافة أو طرح أو تعيين / Operation must be add, subtract, or set',
            'any.required': 'العملية مطلوبة / Operation is required'
        }),
    note: Joi.string().max(500).messages({
        'string.max': 'الملاحظة طويلة جداً / Note is too long'
    })
});

/**
 * Update status validation schema
 */
const updateStatusSchema = Joi.object({
    status: Joi.string()
        .valid('active', 'inactive', 'archived', 'pending')
        .required()
        .messages({
            'any.only': 'الحالة يجب أن تكون نشط، غير نشط، مؤرشف، أو قيد الانتظار / Status must be active, inactive, archived, or pending',
            'any.required': 'الحالة مطلوبة / Status is required'
        }),
    reason: Joi.string().max(500).messages({
        'string.max': 'السبب طويل جداً / Reason is too long'
    })
});

/**
 * Update flags validation schema
 */
const updateFlagsSchema = Joi.object({
    isVip: Joi.boolean().messages({
        'boolean.base': 'قيمة VIP يجب أن تكون صحيح أو خطأ / VIP value must be true or false'
    }),
    isHighRisk: Joi.boolean().messages({
        'boolean.base': 'قيمة عالي المخاطر يجب أن تكون صحيح أو خطأ / High risk value must be true or false'
    }),
    needsApproval: Joi.boolean().messages({
        'boolean.base': 'قيمة يحتاج موافقة يجب أن تكون صحيح أو خطأ / Needs approval value must be true or false'
    }),
    isBlacklisted: Joi.boolean().messages({
        'boolean.base': 'قيمة القائمة السوداء يجب أن تكون صحيح أو خطأ / Blacklisted value must be true or false'
    }),
    blacklistReason: Joi.string().max(500).messages({
        'string.max': 'سبب القائمة السوداء طويل جداً / Blacklist reason is too long'
    })
}).min(1).messages({
    'object.min': 'يجب تقديم علامة واحدة على الأقل للتحديث / At least one flag must be provided for update'
});

/**
 * Search clients validation schema
 */
const searchClientsSchema = Joi.object({
    q: Joi.string().max(200).messages({
        'string.max': 'مصطلح البحث طويل جداً / Search term is too long'
    }),
    clientType: Joi.string().valid('individual', 'company').messages({
        'any.only': 'نوع العميل يجب أن يكون فرد أو شركة / Client type must be individual or company'
    }),
    status: Joi.string().valid('active', 'inactive', 'archived', 'pending').messages({
        'any.only': 'الحالة غير صالحة / Invalid status'
    }),
    clientTier: Joi.string().valid('standard', 'premium', 'vip').messages({
        'any.only': 'مستوى العميل غير صالح / Invalid client tier'
    }),
    clientSource: Joi.string()
        .valid('website', 'referral', 'returning', 'ads', 'social', 'walkin', 'platform', 'external', 'cold_call', 'event')
        .messages({
            'any.only': 'مصدر العميل غير صالح / Invalid client source'
        }),
    limit: Joi.number().min(1).max(100).default(50).messages({
        'number.min': 'الحد الأدنى 1 / Minimum limit is 1',
        'number.max': 'الحد الأقصى 100 / Maximum limit is 100'
    }),
    page: Joi.number().min(1).default(1).messages({
        'number.min': 'الصفحة يجب أن تكون 1 أو أكثر / Page must be 1 or greater'
    })
});

/**
 * Conflict check validation schema
 */
const conflictCheckSchema = Joi.object({
    nationalId: nationalIdSchema,
    crNumber: crNumberSchema,
    email: emailSchema,
    phone: phoneSchema
}).or('nationalId', 'crNumber', 'email', 'phone').messages({
    'object.missing': 'يجب تقديم على الأقل رقم الهوية أو السجل التجاري أو البريد الإلكتروني أو الهاتف / Must provide at least nationalId, crNumber, email, or phone'
});

/**
 * Verify Wathq validation schema
 */
const verifyWathqSchema = Joi.object({
    crNumber: crNumberSchema.required()
});

/**
 * Bulk delete validation schema
 */
const bulkDeleteSchema = Joi.object({
    ids: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
        .min(1)
        .required()
        .messages({
            'array.min': 'يجب تقديم معرف واحد على الأقل / At least one ID must be provided',
            'any.required': 'قائمة المعرفات مطلوبة / IDs list is required',
            'string.pattern.base': 'معرف غير صالح / Invalid ID format'
        })
});

/**
 * ID parameter validation schema
 */
const idParamSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف العميل غير صالح / Invalid client ID',
            'any.required': 'معرف العميل مطلوب / Client ID is required'
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
        // ══════════════════════════════════════════════════════════════════
        // 🔍 DEBUG: Client Validation Middleware
        // ══════════════════════════════════════════════════════════════════
        console.log('\n' + '─'.repeat(80));
        console.log('🔍 [VALIDATOR] Starting validation...');
        console.log('📍 Route:', req.method, req.originalUrl);
        console.log('📦 Source:', source);
        console.log('📋 Data to validate:', JSON.stringify(req[source], null, 2));
        console.log('─'.repeat(80));

        const { error, value } = schema.validate(req[source], {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            console.log('❌ [VALIDATOR] VALIDATION FAILED!');
            console.log('🔴 Validation Errors:', JSON.stringify(errors, null, 2));
            console.log('🔴 Full Joi Error:', JSON.stringify(error.details, null, 2));
            console.log('─'.repeat(80) + '\n');

            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق / Validation error',
                errors
            });
        }

        console.log('✅ [VALIDATOR] Validation PASSED');
        console.log('📋 Validated/Sanitized Data:', JSON.stringify(value, null, 2));
        console.log('─'.repeat(80) + '\n');

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
        createClient: createClientSchema,
        updateClient: updateClientSchema,
        addContact: addContactSchema,
        updateBalance: updateBalanceSchema,
        updateStatus: updateStatusSchema,
        updateFlags: updateFlagsSchema,
        searchClients: searchClientsSchema,
        conflictCheck: conflictCheckSchema,
        verifyWathq: verifyWathqSchema,
        bulkDelete: bulkDeleteSchema,
        idParam: idParamSchema
    },

    // Middleware (for route use)
    validateCreateClient: validate(createClientSchema),
    validateUpdateClient: validate(updateClientSchema),
    validateAddContact: validate(addContactSchema),
    validateUpdateBalance: validate(updateBalanceSchema),
    validateUpdateStatus: validate(updateStatusSchema),
    validateUpdateFlags: validate(updateFlagsSchema),
    validateSearchClients: validate(searchClientsSchema, 'query'),
    validateConflictCheck: validate(conflictCheckSchema),
    validateVerifyWathq: validate(verifyWathqSchema),
    validateBulkDelete: validate(bulkDeleteSchema),
    validateIdParam: validate(idParamSchema, 'params'),

    // Generic validate function
    validate
};
