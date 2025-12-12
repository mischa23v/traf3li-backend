/**
 * Case Route Validation Schemas
 *
 * Uses Joi for request validation on case/matter management endpoints.
 * Provides both validation schemas and middleware functions.
 */

const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Create case validation schema
 */
const createCaseSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'عنوان القضية قصير جداً / Case title is too short',
            'string.max': 'عنوان القضية طويل جداً / Case title is too long',
            'any.required': 'عنوان القضية مطلوب / Case title is required'
        }),
    clientId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف العميل غير صالح / Invalid client ID format',
            'any.required': 'معرف العميل مطلوب / Client ID is required'
        }),
    caseType: Joi.string()
        .max(100)
        .messages({
            'string.max': 'نوع القضية طويل جداً / Case type is too long'
        }),
    court: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم المحكمة طويل جداً / Court name is too long'
        }),
    caseNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم القضية طويل جداً / Case number is too long'
        }),
    status: Joi.string()
        .valid('open', 'in_progress', 'pending', 'closed', 'won', 'lost')
        .default('open')
        .messages({
            'any.only': 'حالة القضية غير صالحة / Invalid case status'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .messages({
            'any.only': 'أولوية القضية غير صالحة / Invalid case priority'
        }),
    description: Joi.string()
        .max(2000)
        .allow('')
        .messages({
            'string.max': 'وصف القضية طويل جداً / Case description is too long'
        }),
    assignedLawyer: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف المحامي غير صالح / Invalid lawyer ID format'
        }),
    filingDate: Joi.date()
        .messages({
            'date.base': 'تاريخ التقديم غير صالح / Invalid filing date'
        }),
    nextHearingDate: Joi.date()
        .messages({
            'date.base': 'تاريخ الجلسة القادمة غير صالح / Invalid next hearing date'
        }),
    estimatedValue: Joi.number()
        .min(0)
        .messages({
            'number.base': 'القيمة التقديرية يجب أن تكون رقماً / Estimated value must be a number',
            'number.min': 'القيمة التقديرية لا يمكن أن تكون سالبة / Estimated value cannot be negative'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        }),
    customFields: Joi.object()
        .messages({
            'object.base': 'الحقول المخصصة يجب أن تكون كائن / Custom fields must be an object'
        })
});

/**
 * Update case validation schema (partial)
 */
const updateCaseSchema = Joi.object({
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
    caseType: Joi.string()
        .max(100)
        .messages({
            'string.max': 'نوع القضية طويل جداً / Case type is too long'
        }),
    court: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم المحكمة طويل جداً / Court name is too long'
        }),
    caseNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم القضية طويل جداً / Case number is too long'
        }),
    status: Joi.string()
        .valid('open', 'in_progress', 'pending', 'closed', 'won', 'lost')
        .messages({
            'any.only': 'حالة القضية غير صالحة / Invalid case status'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .messages({
            'any.only': 'أولوية القضية غير صالحة / Invalid case priority'
        }),
    description: Joi.string()
        .max(2000)
        .allow('')
        .messages({
            'string.max': 'وصف القضية طويل جداً / Case description is too long'
        }),
    assignedLawyer: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null)
        .messages({
            'string.pattern.base': 'معرف المحامي غير صالح / Invalid lawyer ID format'
        }),
    filingDate: Joi.date()
        .messages({
            'date.base': 'تاريخ التقديم غير صالح / Invalid filing date'
        }),
    nextHearingDate: Joi.date()
        .allow(null)
        .messages({
            'date.base': 'تاريخ الجلسة القادمة غير صالح / Invalid next hearing date'
        }),
    estimatedValue: Joi.number()
        .min(0)
        .messages({
            'number.base': 'القيمة التقديرية يجب أن تكون رقماً / Estimated value must be a number',
            'number.min': 'القيمة التقديرية لا يمكن أن تكون سالبة / Estimated value cannot be negative'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'array.base': 'الوسوم يجب أن تكون مصفوفة / Tags must be an array'
        }),
    customFields: Joi.object()
        .messages({
            'object.base': 'الحقول المخصصة يجب أن تكون كائن / Custom fields must be an object'
        })
}).min(1).messages({
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
    validate
};
