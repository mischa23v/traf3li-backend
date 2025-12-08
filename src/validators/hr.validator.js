/**
 * HR Route Validation Schemas
 *
 * Uses Joi for request validation on HR/Employee endpoints.
 * Includes Saudi-specific validations for National IDs, IBANs, and phone numbers.
 */

const Joi = require('joi');

// ============================================
// CUSTOM VALIDATORS
// ============================================

/**
 * Saudi National ID / Iqama validation
 * Format: 1xxxxxxxxx (Saudi National) or 2xxxxxxxxx (Iqama)
 */
const saudiNationalIdPattern = /^[12]\d{9}$/;

/**
 * Saudi IBAN validation
 * Format: SA followed by 22 alphanumeric characters
 */
const saudiIBANPattern = /^SA\d{22}$/;

/**
 * Saudi phone number validation
 * Format: +966 followed by 9 digits, or 05 followed by 8 digits
 */
const saudiPhonePattern = /^(\+966|966|05)[0-9]{8,9}$/;

// ============================================
// EMPLOYEE SCHEMAS
// ============================================

/**
 * Create Employee validation schema
 */
const createEmployeeSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'الاسم قصير جداً / Name is too short',
            'string.max': 'الاسم طويل جداً / Name is too long',
            'any.required': 'الاسم مطلوب / Name is required'
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format',
            'any.required': 'البريد الإلكتروني مطلوب / Email is required'
        }),
    phone: Joi.string()
        .pattern(saudiPhonePattern)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح (يجب أن يبدأ بـ +966 أو 05) / Invalid phone number (must start with +966 or 05)'
        }),
    nationalId: Joi.string()
        .pattern(saudiNationalIdPattern)
        .messages({
            'string.pattern.base': 'رقم الهوية غير صالح (10 أرقام تبدأ بـ 1 أو 2) / Invalid National ID (10 digits starting with 1 or 2)'
        }),
    department: Joi.string()
        .max(100)
        .messages({
            'string.max': 'اسم القسم طويل جداً / Department name is too long'
        }),
    position: Joi.string()
        .max(100)
        .messages({
            'string.max': 'المسمى الوظيفي طويل جداً / Position title is too long'
        }),
    salary: Joi.number()
        .positive()
        .messages({
            'number.positive': 'الراتب يجب أن يكون رقماً موجباً / Salary must be a positive number',
            'number.base': 'الراتب يجب أن يكون رقماً / Salary must be a number'
        }),
    startDate: Joi.date()
        .iso()
        .messages({
            'date.format': 'تاريخ البداية غير صالح / Invalid start date format',
            'date.base': 'تاريخ البداية غير صالح / Invalid start date'
        }),
    bankAccount: Joi.string()
        .pattern(saudiIBANPattern)
        .messages({
            'string.pattern.base': 'رقم الآيبان غير صالح (يجب أن يبدأ بـ SA ويتبعه 22 رقم) / Invalid IBAN (must start with SA followed by 22 digits)'
        }),
    status: Joi.string()
        .valid('active', 'inactive', 'on-leave', 'terminated')
        .default('active')
        .messages({
            'any.only': 'الحالة غير صالحة / Invalid status'
        }),
    contractType: Joi.string()
        .valid('full-time', 'part-time', 'contract', 'temporary')
        .messages({
            'any.only': 'نوع العقد غير صالح / Invalid contract type'
        }),
    employeeNumber: Joi.string()
        .max(50)
        .messages({
            'string.max': 'رقم الموظف طويل جداً / Employee number is too long'
        }),
    nationality: Joi.string()
        .max(50)
        .messages({
            'string.max': 'الجنسية طويلة جداً / Nationality is too long'
        }),
    gender: Joi.string()
        .valid('male', 'female')
        .messages({
            'any.only': 'الجنس غير صالح / Invalid gender'
        }),
    dateOfBirth: Joi.date()
        .iso()
        .max('now')
        .messages({
            'date.format': 'تاريخ الميلاد غير صالح / Invalid date of birth format',
            'date.max': 'تاريخ الميلاد لا يمكن أن يكون في المستقبل / Date of birth cannot be in the future'
        }),
    maritalStatus: Joi.string()
        .valid('single', 'married', 'divorced', 'widowed')
        .messages({
            'any.only': 'الحالة الاجتماعية غير صالحة / Invalid marital status'
        }),
    address: Joi.string()
        .max(500)
        .messages({
            'string.max': 'العنوان طويل جداً / Address is too long'
        }),
    emergencyContact: Joi.object({
        name: Joi.string().max(100),
        relationship: Joi.string().max(50),
        phone: Joi.string().pattern(saudiPhonePattern)
    }),
    allowances: Joi.array().items(
        Joi.object({
            type: Joi.string().required(),
            amount: Joi.number().positive().required(),
            startDate: Joi.date().iso()
        })
    )
});

/**
 * Update Employee validation schema (partial)
 */
const updateEmployeeSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .messages({
            'string.min': 'الاسم قصير جداً / Name is too short',
            'string.max': 'الاسم طويل جداً / Name is too long'
        }),
    email: Joi.string()
        .email()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    phone: Joi.string()
        .pattern(saudiPhonePattern)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح / Invalid phone number'
        }),
    nationalId: Joi.string()
        .pattern(saudiNationalIdPattern)
        .messages({
            'string.pattern.base': 'رقم الهوية غير صالح / Invalid National ID'
        }),
    department: Joi.string().max(100),
    position: Joi.string().max(100),
    salary: Joi.number().positive(),
    startDate: Joi.date().iso(),
    bankAccount: Joi.string()
        .pattern(saudiIBANPattern)
        .messages({
            'string.pattern.base': 'رقم الآيبان غير صالح / Invalid IBAN'
        }),
    status: Joi.string()
        .valid('active', 'inactive', 'on-leave', 'terminated')
        .messages({
            'any.only': 'الحالة غير صالحة / Invalid status'
        }),
    contractType: Joi.string()
        .valid('full-time', 'part-time', 'contract', 'temporary'),
    nationality: Joi.string().max(50),
    gender: Joi.string().valid('male', 'female'),
    dateOfBirth: Joi.date().iso().max('now'),
    maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed'),
    address: Joi.string().max(500),
    emergencyContact: Joi.object({
        name: Joi.string().max(100),
        relationship: Joi.string().max(50),
        phone: Joi.string().pattern(saudiPhonePattern)
    })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Add Allowance validation schema
 */
const addAllowanceSchema = Joi.object({
    type: Joi.string()
        .required()
        .valid('housing', 'transportation', 'food', 'phone', 'other')
        .messages({
            'any.required': 'نوع البدل مطلوب / Allowance type is required',
            'any.only': 'نوع البدل غير صالح / Invalid allowance type'
        }),
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'المبلغ يجب أن يكون رقماً موجباً / Amount must be a positive number',
            'any.required': 'المبلغ مطلوب / Amount is required'
        }),
    description: Joi.string()
        .max(500)
        .messages({
            'string.max': 'الوصف طويل جداً / Description is too long'
        }),
    startDate: Joi.date()
        .iso()
        .messages({
            'date.format': 'تاريخ البداية غير صالح / Invalid start date format'
        }),
    endDate: Joi.date()
        .iso()
        .greater(Joi.ref('startDate'))
        .messages({
            'date.format': 'تاريخ النهاية غير صالح / Invalid end date format',
            'date.greater': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية / End date must be after start date'
        })
});

// ============================================
// PAYROLL SCHEMAS
// ============================================

/**
 * Create Payroll Run validation schema
 */
const createPayrollRunSchema = Joi.object({
    month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required()
        .messages({
            'number.min': 'الشهر يجب أن يكون بين 1 و 12 / Month must be between 1 and 12',
            'number.max': 'الشهر يجب أن يكون بين 1 و 12 / Month must be between 1 and 12',
            'any.required': 'الشهر مطلوب / Month is required'
        }),
    year: Joi.number()
        .integer()
        .min(2020)
        .max(2100)
        .required()
        .messages({
            'number.min': 'السنة غير صالحة / Invalid year',
            'number.max': 'السنة غير صالحة / Invalid year',
            'any.required': 'السنة مطلوبة / Year is required'
        }),
    employeeIds: Joi.array()
        .items(Joi.string())
        .messages({
            'array.base': 'معرفات الموظفين يجب أن تكون مصفوفة / Employee IDs must be an array'
        }),
    paymentDate: Joi.date()
        .iso()
        .messages({
            'date.format': 'تاريخ الدفع غير صالح / Invalid payment date format'
        }),
    description: Joi.string()
        .max(500)
        .messages({
            'string.max': 'الوصف طويل جداً / Description is too long'
        }),
    type: Joi.string()
        .valid('regular', 'bonus', 'final-settlement')
        .default('regular')
        .messages({
            'any.only': 'نوع الرواتب غير صالح / Invalid payroll type'
        })
});

/**
 * Update Payroll Run validation schema
 */
const updatePayrollRunSchema = Joi.object({
    paymentDate: Joi.date().iso(),
    description: Joi.string().max(500),
    status: Joi.string().valid('draft', 'calculated', 'validated', 'approved', 'processed', 'cancelled')
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Approve Payroll validation schema
 */
const approvePayrollSchema = Joi.object({
    payrollRunId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف دورة الرواتب مطلوب / Payroll run ID is required'
        }),
    approvalNotes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'ملاحظات الموافقة طويلة جداً / Approval notes are too long'
        })
});

/**
 * Generate Bulk Payroll validation schema
 */
const generateBulkPayrollSchema = Joi.object({
    month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required(),
    year: Joi.number()
        .integer()
        .min(2020)
        .max(2100)
        .required(),
    employeeIds: Joi.array()
        .items(Joi.string())
        .min(1)
        .messages({
            'array.min': 'يجب تحديد موظف واحد على الأقل / At least one employee must be specified'
        })
});

/**
 * Create Salary Slip validation schema
 */
const createSalarySlipSchema = Joi.object({
    employeeId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف الموظف مطلوب / Employee ID is required'
        }),
    month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required(),
    year: Joi.number()
        .integer()
        .min(2020)
        .max(2100)
        .required(),
    basicSalary: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'الراتب الأساسي يجب أن يكون رقماً موجباً / Basic salary must be a positive number',
            'any.required': 'الراتب الأساسي مطلوب / Basic salary is required'
        }),
    allowances: Joi.array().items(
        Joi.object({
            type: Joi.string().required(),
            amount: Joi.number().positive().required()
        })
    ),
    deductions: Joi.array().items(
        Joi.object({
            type: Joi.string().required(),
            amount: Joi.number().positive().required()
        })
    ),
    paymentDate: Joi.date().iso(),
    notes: Joi.string().max(1000)
});

/**
 * Update Salary Slip validation schema
 */
const updateSalarySlipSchema = Joi.object({
    basicSalary: Joi.number().positive(),
    allowances: Joi.array().items(
        Joi.object({
            type: Joi.string().required(),
            amount: Joi.number().positive().required()
        })
    ),
    deductions: Joi.array().items(
        Joi.object({
            type: Joi.string().required(),
            amount: Joi.number().positive().required()
        })
    ),
    paymentDate: Joi.date().iso(),
    notes: Joi.string().max(1000),
    status: Joi.string().valid('draft', 'approved', 'paid', 'cancelled')
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// LEAVE REQUEST SCHEMAS
// ============================================

/**
 * Create Leave Request validation schema
 */
const createLeaveRequestSchema = Joi.object({
    employeeId: Joi.string()
        .messages({
            'string.base': 'معرف الموظف غير صالح / Invalid employee ID'
        }),
    type: Joi.string()
        .required()
        .valid('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'hajj', 'emergency', 'bereavement', 'study', 'compassionate')
        .messages({
            'any.required': 'نوع الإجازة مطلوب / Leave type is required',
            'any.only': 'نوع الإجازة غير صالح / Invalid leave type'
        }),
    startDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.format': 'تاريخ البداية غير صالح / Invalid start date format',
            'any.required': 'تاريخ البداية مطلوب / Start date is required'
        }),
    endDate: Joi.date()
        .iso()
        .required()
        .greater(Joi.ref('startDate'))
        .messages({
            'date.format': 'تاريخ النهاية غير صالح / Invalid end date format',
            'any.required': 'تاريخ النهاية مطلوب / End date is required',
            'date.greater': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية / End date must be after start date'
        }),
    reason: Joi.string()
        .min(10)
        .max(1000)
        .messages({
            'string.min': 'السبب قصير جداً (10 أحرف على الأقل) / Reason is too short (minimum 10 characters)',
            'string.max': 'السبب طويل جداً / Reason is too long'
        }),
    halfDay: Joi.boolean()
        .default(false),
    handoverTo: Joi.string()
        .messages({
            'string.base': 'معرف الموظف المستلم غير صالح / Invalid handover employee ID'
        }),
    handoverNotes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'ملاحظات التسليم طويلة جداً / Handover notes are too long'
        }),
    emergencyContact: Joi.object({
        name: Joi.string().max(100),
        phone: Joi.string().pattern(saudiPhonePattern)
    }),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Update Leave Request validation schema
 */
const updateLeaveRequestSchema = Joi.object({
    type: Joi.string()
        .valid('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'hajj', 'emergency', 'bereavement', 'study', 'compassionate'),
    startDate: Joi.date().iso(),
    endDate: Joi.date()
        .iso()
        .greater(Joi.ref('startDate'))
        .messages({
            'date.greater': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية / End date must be after start date'
        }),
    reason: Joi.string()
        .min(10)
        .max(1000),
    halfDay: Joi.boolean(),
    handoverTo: Joi.string(),
    handoverNotes: Joi.string().max(1000),
    emergencyContact: Joi.object({
        name: Joi.string().max(100),
        phone: Joi.string().pattern(saudiPhonePattern)
    })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Approve/Reject Leave Request validation schema
 */
const reviewLeaveRequestSchema = Joi.object({
    reviewNotes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'ملاحظات المراجعة طويلة جداً / Review notes are too long'
        }),
    alternativeDates: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().greater(Joi.ref('startDate'))
    })
});

/**
 * Request Extension validation schema
 */
const requestExtensionSchema = Joi.object({
    newEndDate: Joi.date()
        .iso()
        .required()
        .messages({
            'any.required': 'تاريخ النهاية الجديد مطلوب / New end date is required'
        }),
    extensionReason: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'any.required': 'سبب التمديد مطلوب / Extension reason is required',
            'string.min': 'سبب التمديد قصير جداً / Extension reason is too short'
        }),
    attachments: Joi.array().items(Joi.string())
});

// ============================================
// ATTENDANCE SCHEMAS
// ============================================

/**
 * Check-in validation schema
 */
const checkInSchema = Joi.object({
    employeeId: Joi.string()
        .messages({
            'string.base': 'معرف الموظف غير صالح / Invalid employee ID'
        }),
    date: Joi.date()
        .iso()
        .max('now')
        .messages({
            'date.format': 'التاريخ غير صالح / Invalid date format',
            'date.max': 'التاريخ لا يمكن أن يكون في المستقبل / Date cannot be in the future'
        }),
    checkIn: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .messages({
            'string.pattern.base': 'وقت الحضور غير صالح (HH:MM) / Invalid check-in time (HH:MM)'
        }),
    location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
    }),
    deviceId: Joi.string().max(100),
    notes: Joi.string().max(500)
});

/**
 * Check-out validation schema
 */
const checkOutSchema = Joi.object({
    employeeId: Joi.string()
        .messages({
            'string.base': 'معرف الموظف غير صالح / Invalid employee ID'
        }),
    date: Joi.date()
        .iso()
        .max('now')
        .messages({
            'date.format': 'التاريخ غير صالح / Invalid date format',
            'date.max': 'التاريخ لا يمكن أن يكون في المستقبل / Date cannot be in the future'
        }),
    checkOut: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .messages({
            'string.pattern.base': 'وقت الانصراف غير صالح (HH:MM) / Invalid check-out time (HH:MM)'
        }),
    location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
    }),
    deviceId: Joi.string().max(100),
    notes: Joi.string().max(500)
});

/**
 * Create Attendance Record validation schema
 */
const createAttendanceSchema = Joi.object({
    employeeId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف الموظف مطلوب / Employee ID is required'
        }),
    date: Joi.date()
        .iso()
        .required()
        .max('now')
        .messages({
            'any.required': 'التاريخ مطلوب / Date is required',
            'date.format': 'التاريخ غير صالح / Invalid date format',
            'date.max': 'التاريخ لا يمكن أن يكون في المستقبل / Date cannot be in the future'
        }),
    checkIn: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .messages({
            'string.pattern.base': 'وقت الحضور غير صالح (HH:MM) / Invalid check-in time (HH:MM)'
        }),
    checkOut: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .messages({
            'string.pattern.base': 'وقت الانصراف غير صالح (HH:MM) / Invalid check-out time (HH:MM)'
        }),
    status: Joi.string()
        .required()
        .valid('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'weekend')
        .messages({
            'any.required': 'الحالة مطلوبة / Status is required',
            'any.only': 'الحالة غير صالحة / Invalid status'
        }),
    workHours: Joi.number()
        .min(0)
        .max(24)
        .messages({
            'number.min': 'ساعات العمل لا يمكن أن تكون سالبة / Work hours cannot be negative',
            'number.max': 'ساعات العمل لا يمكن أن تتجاوز 24 ساعة / Work hours cannot exceed 24 hours'
        }),
    overtimeHours: Joi.number()
        .min(0)
        .max(24)
        .messages({
            'number.min': 'ساعات العمل الإضافي لا يمكن أن تكون سالبة / Overtime hours cannot be negative',
            'number.max': 'ساعات العمل الإضافي لا يمكن أن تتجاوز 24 ساعة / Overtime hours cannot exceed 24 hours'
        }),
    notes: Joi.string().max(1000),
    location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
    })
});

/**
 * Update Attendance Record validation schema
 */
const updateAttendanceSchema = Joi.object({
    checkIn: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    checkOut: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    status: Joi.string()
        .valid('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'weekend'),
    workHours: Joi.number().min(0).max(24),
    overtimeHours: Joi.number().min(0).max(24),
    notes: Joi.string().max(1000)
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Submit Correction validation schema
 */
const submitCorrectionSchema = Joi.object({
    field: Joi.string()
        .required()
        .valid('checkIn', 'checkOut', 'status', 'workHours', 'overtimeHours')
        .messages({
            'any.required': 'الحقل المراد تصحيحه مطلوب / Field to correct is required',
            'any.only': 'الحقل غير صالح / Invalid field'
        }),
    oldValue: Joi.alternatives().try(Joi.string(), Joi.number()),
    newValue: Joi.alternatives()
        .try(Joi.string(), Joi.number())
        .required()
        .messages({
            'any.required': 'القيمة الجديدة مطلوبة / New value is required'
        }),
    reason: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'any.required': 'سبب التصحيح مطلوب / Correction reason is required',
            'string.min': 'سبب التصحيح قصير جداً / Correction reason is too short'
        }),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Review Correction validation schema
 */
const reviewCorrectionSchema = Joi.object({
    status: Joi.string()
        .required()
        .valid('approved', 'rejected')
        .messages({
            'any.required': 'حالة المراجعة مطلوبة / Review status is required',
            'any.only': 'حالة المراجعة غير صالحة / Invalid review status'
        }),
    reviewNotes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'ملاحظات المراجعة طويلة جداً / Review notes are too long'
        })
});

// ============================================
// EMPLOYEE ADVANCE SCHEMAS
// ============================================

/**
 * Create Advance validation schema
 */
const createAdvanceSchema = Joi.object({
    employeeId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف الموظف مطلوب / Employee ID is required'
        }),
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'المبلغ يجب أن يكون رقماً موجباً / Amount must be a positive number',
            'any.required': 'المبلغ مطلوب / Amount is required'
        }),
    reason: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'any.required': 'السبب مطلوب / Reason is required',
            'string.min': 'السبب قصير جداً / Reason is too short'
        }),
    requestDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.format': 'تاريخ الطلب غير صالح / Invalid request date format'
        }),
    expectedRecoveryDate: Joi.date()
        .iso()
        .greater('now')
        .messages({
            'date.format': 'تاريخ الاسترداد المتوقع غير صالح / Invalid expected recovery date format',
            'date.greater': 'تاريخ الاسترداد يجب أن يكون في المستقبل / Expected recovery date must be in the future'
        }),
    recoveryMethod: Joi.string()
        .valid('salary-deduction', 'lump-sum', 'installments')
        .default('salary-deduction')
        .messages({
            'any.only': 'طريقة الاسترداد غير صالحة / Invalid recovery method'
        }),
    installments: Joi.number()
        .integer()
        .positive()
        .max(12)
        .when('recoveryMethod', {
            is: 'installments',
            then: Joi.required()
        })
        .messages({
            'number.max': 'عدد الأقساط لا يمكن أن يتجاوز 12 / Number of installments cannot exceed 12',
            'any.required': 'عدد الأقساط مطلوب عند اختيار طريقة الأقساط / Number of installments required when using installments method'
        }),
    isEmergency: Joi.boolean().default(false),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Update Advance validation schema
 */
const updateAdvanceSchema = Joi.object({
    amount: Joi.number().positive(),
    reason: Joi.string().min(10).max(1000),
    expectedRecoveryDate: Joi.date().iso().greater('now'),
    recoveryMethod: Joi.string().valid('salary-deduction', 'lump-sum', 'installments'),
    installments: Joi.number().integer().positive().max(12),
    isEmergency: Joi.boolean()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Approve/Reject Advance validation schema
 */
const reviewAdvanceSchema = Joi.object({
    approverNotes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'ملاحظات الموافقة طويلة جداً / Approval notes are too long'
        }),
    approvedAmount: Joi.number()
        .positive()
        .messages({
            'number.positive': 'المبلغ المعتمد يجب أن يكون رقماً موجباً / Approved amount must be a positive number'
        })
});

/**
 * Disburse Advance validation schema
 */
const disburseAdvanceSchema = Joi.object({
    disbursementDate: Joi.date()
        .iso()
        .max('now')
        .default(() => new Date())
        .messages({
            'date.max': 'تاريخ الصرف لا يمكن أن يكون في المستقبل / Disbursement date cannot be in the future'
        }),
    disbursementMethod: Joi.string()
        .required()
        .valid('bank-transfer', 'cash', 'check')
        .messages({
            'any.required': 'طريقة الصرف مطلوبة / Disbursement method is required',
            'any.only': 'طريقة الصرف غير صالحة / Invalid disbursement method'
        }),
    referenceNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'الرقم المرجعي طويل جداً / Reference number is too long'
        }),
    notes: Joi.string().max(1000)
});

/**
 * Record Recovery validation schema
 */
const recordRecoverySchema = Joi.object({
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'مبلغ الاسترداد يجب أن يكون رقماً موجباً / Recovery amount must be a positive number',
            'any.required': 'مبلغ الاسترداد مطلوب / Recovery amount is required'
        }),
    recoveryDate: Joi.date()
        .iso()
        .max('now')
        .default(() => new Date())
        .messages({
            'date.max': 'تاريخ الاسترداد لا يمكن أن يكون في المستقبل / Recovery date cannot be in the future'
        }),
    method: Joi.string()
        .required()
        .valid('salary-deduction', 'cash', 'bank-transfer')
        .messages({
            'any.required': 'طريقة الاسترداد مطلوبة / Recovery method is required'
        }),
    notes: Joi.string().max(1000)
});

// ============================================
// EMPLOYEE LOAN SCHEMAS
// ============================================

/**
 * Create Loan validation schema
 */
const createLoanSchema = Joi.object({
    employeeId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف الموظف مطلوب / Employee ID is required'
        }),
    loanType: Joi.string()
        .required()
        .valid('personal', 'housing', 'education', 'medical', 'vehicle', 'emergency', 'other')
        .messages({
            'any.required': 'نوع القرض مطلوب / Loan type is required',
            'any.only': 'نوع القرض غير صالح / Invalid loan type'
        }),
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'مبلغ القرض يجب أن يكون رقماً موجباً / Loan amount must be a positive number',
            'any.required': 'مبلغ القرض مطلوب / Loan amount is required'
        }),
    interestRate: Joi.number()
        .min(0)
        .max(100)
        .default(0)
        .messages({
            'number.min': 'معدل الفائدة لا يمكن أن يكون سالباً / Interest rate cannot be negative',
            'number.max': 'معدل الفائدة غير صالح / Invalid interest rate'
        }),
    installments: Joi.number()
        .integer()
        .positive()
        .max(60)
        .required()
        .messages({
            'number.positive': 'عدد الأقساط يجب أن يكون رقماً موجباً / Number of installments must be positive',
            'number.max': 'عدد الأقساط لا يمكن أن يتجاوز 60 / Number of installments cannot exceed 60',
            'any.required': 'عدد الأقساط مطلوب / Number of installments is required'
        }),
    purpose: Joi.string()
        .min(20)
        .max(2000)
        .required()
        .messages({
            'any.required': 'الغرض من القرض مطلوب / Loan purpose is required',
            'string.min': 'الغرض من القرض قصير جداً / Loan purpose is too short'
        }),
    startDate: Joi.date()
        .iso()
        .min('now')
        .messages({
            'date.min': 'تاريخ البداية يجب أن يكون في المستقبل / Start date must be in the future'
        }),
    guarantors: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            nationalId: Joi.string().pattern(saudiNationalIdPattern),
            relationship: Joi.string().required(),
            phone: Joi.string().pattern(saudiPhonePattern)
        })
    ),
    collateral: Joi.object({
        type: Joi.string().valid('none', 'property', 'vehicle', 'savings', 'other'),
        description: Joi.string().max(1000),
        estimatedValue: Joi.number().positive()
    }),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Update Loan validation schema
 */
const updateLoanSchema = Joi.object({
    loanType: Joi.string()
        .valid('personal', 'housing', 'education', 'medical', 'vehicle', 'emergency', 'other'),
    amount: Joi.number().positive(),
    interestRate: Joi.number().min(0).max(100),
    installments: Joi.number().integer().positive().max(60),
    purpose: Joi.string().min(20).max(2000),
    startDate: Joi.date().iso().min('now'),
    guarantors: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            nationalId: Joi.string().pattern(saudiNationalIdPattern),
            relationship: Joi.string().required(),
            phone: Joi.string().pattern(saudiPhonePattern)
        })
    ),
    collateral: Joi.object({
        type: Joi.string().valid('none', 'property', 'vehicle', 'savings', 'other'),
        description: Joi.string().max(1000),
        estimatedValue: Joi.number().positive()
    })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Approve/Reject Loan validation schema
 */
const reviewLoanSchema = Joi.object({
    approverNotes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'ملاحظات الموافقة طويلة جداً / Approval notes are too long'
        }),
    approvedAmount: Joi.number()
        .positive()
        .messages({
            'number.positive': 'المبلغ المعتمد يجب أن يكون رقماً موجباً / Approved amount must be a positive number'
        }),
    approvedInstallments: Joi.number()
        .integer()
        .positive()
        .max(60)
        .messages({
            'number.max': 'عدد الأقساط المعتمد لا يمكن أن يتجاوز 60 / Approved installments cannot exceed 60'
        }),
    approvedInterestRate: Joi.number().min(0).max(100)
});

/**
 * Disburse Loan validation schema
 */
const disburseLoanSchema = Joi.object({
    disbursementDate: Joi.date()
        .iso()
        .max('now')
        .default(() => new Date())
        .messages({
            'date.max': 'تاريخ الصرف لا يمكن أن يكون في المستقبل / Disbursement date cannot be in the future'
        }),
    disbursementMethod: Joi.string()
        .required()
        .valid('bank-transfer', 'check')
        .messages({
            'any.required': 'طريقة الصرف مطلوبة / Disbursement method is required'
        }),
    bankAccount: Joi.string()
        .pattern(saudiIBANPattern)
        .messages({
            'string.pattern.base': 'رقم الآيبان غير صالح / Invalid IBAN'
        }),
    referenceNumber: Joi.string().max(100),
    notes: Joi.string().max(1000)
});

/**
 * Record Payment validation schema
 */
const recordPaymentSchema = Joi.object({
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'مبلغ الدفع يجب أن يكون رقماً موجباً / Payment amount must be a positive number',
            'any.required': 'مبلغ الدفع مطلوب / Payment amount is required'
        }),
    paymentDate: Joi.date()
        .iso()
        .max('now')
        .default(() => new Date())
        .messages({
            'date.max': 'تاريخ الدفع لا يمكن أن يكون في المستقبل / Payment date cannot be in the future'
        }),
    method: Joi.string()
        .required()
        .valid('salary-deduction', 'cash', 'bank-transfer', 'check')
        .messages({
            'any.required': 'طريقة الدفع مطلوبة / Payment method is required'
        }),
    referenceNumber: Joi.string().max(100),
    notes: Joi.string().max(1000)
});

/**
 * Restructure Loan validation schema
 */
const restructureLoanSchema = Joi.object({
    newInstallments: Joi.number()
        .integer()
        .positive()
        .max(60)
        .required()
        .messages({
            'any.required': 'عدد الأقساط الجديد مطلوب / New number of installments is required',
            'number.max': 'عدد الأقساط لا يمكن أن يتجاوز 60 / Number of installments cannot exceed 60'
        }),
    newInterestRate: Joi.number()
        .min(0)
        .max(100)
        .messages({
            'number.min': 'معدل الفائدة لا يمكن أن يكون سالباً / Interest rate cannot be negative',
            'number.max': 'معدل الفائدة غير صالح / Invalid interest rate'
        }),
    reason: Joi.string()
        .min(20)
        .max(1000)
        .required()
        .messages({
            'any.required': 'سبب إعادة الهيكلة مطلوب / Restructuring reason is required',
            'string.min': 'سبب إعادة الهيكلة قصير جداً / Restructuring reason is too short'
        }),
    effectiveDate: Joi.date()
        .iso()
        .min('now')
        .messages({
            'date.min': 'تاريخ السريان يجب أن يكون في المستقبل / Effective date must be in the future'
        })
});

// ============================================
// EMPLOYEE BENEFIT SCHEMAS
// ============================================

/**
 * Create Benefit validation schema
 */
const createBenefitSchema = Joi.object({
    employeeId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف الموظف مطلوب / Employee ID is required'
        }),
    benefitType: Joi.string()
        .required()
        .valid('health-insurance', 'life-insurance', 'dental', 'vision', 'retirement', 'stock-options', 'gym-membership', 'transportation', 'education', 'other')
        .messages({
            'any.required': 'نوع الميزة مطلوب / Benefit type is required',
            'any.only': 'نوع الميزة غير صالح / Invalid benefit type'
        }),
    provider: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم مقدم الخدمة طويل جداً / Provider name is too long'
        }),
    policyNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم البوليصة طويل جداً / Policy number is too long'
        }),
    startDate: Joi.date()
        .iso()
        .required()
        .messages({
            'any.required': 'تاريخ البداية مطلوب / Start date is required'
        }),
    endDate: Joi.date()
        .iso()
        .greater(Joi.ref('startDate'))
        .messages({
            'date.greater': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية / End date must be after start date'
        }),
    employeeCost: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.min': 'تكلفة الموظف لا يمكن أن تكون سالبة / Employee cost cannot be negative'
        }),
    employerCost: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.min': 'تكلفة صاحب العمل لا يمكن أن تكون سالبة / Employer cost cannot be negative'
        }),
    coverageAmount: Joi.number()
        .positive()
        .messages({
            'number.positive': 'مبلغ التغطية يجب أن يكون رقماً موجباً / Coverage amount must be a positive number'
        }),
    dependents: Joi.array().items(
        Joi.object({
            name: Joi.string().required().max(100),
            relationship: Joi.string().required().valid('spouse', 'child', 'parent', 'sibling', 'other'),
            dateOfBirth: Joi.date().iso().max('now'),
            nationalId: Joi.string().pattern(saudiNationalIdPattern)
        })
    ),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Update Benefit validation schema
 */
const updateBenefitSchema = Joi.object({
    benefitType: Joi.string()
        .valid('health-insurance', 'life-insurance', 'dental', 'vision', 'retirement', 'stock-options', 'gym-membership', 'transportation', 'education', 'other'),
    provider: Joi.string().max(200),
    policyNumber: Joi.string().max(100),
    startDate: Joi.date().iso(),
    endDate: Joi.date()
        .iso()
        .greater(Joi.ref('startDate'))
        .messages({
            'date.greater': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية / End date must be after start date'
        }),
    employeeCost: Joi.number().min(0),
    employerCost: Joi.number().min(0),
    coverageAmount: Joi.number().positive(),
    status: Joi.string().valid('active', 'suspended', 'terminated', 'expired')
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Add Dependent validation schema
 */
const addDependentSchema = Joi.object({
    name: Joi.string()
        .required()
        .max(100)
        .messages({
            'any.required': 'اسم التابع مطلوب / Dependent name is required',
            'string.max': 'الاسم طويل جداً / Name is too long'
        }),
    relationship: Joi.string()
        .required()
        .valid('spouse', 'child', 'parent', 'sibling', 'other')
        .messages({
            'any.required': 'العلاقة مطلوبة / Relationship is required',
            'any.only': 'العلاقة غير صالحة / Invalid relationship'
        }),
    dateOfBirth: Joi.date()
        .iso()
        .max('now')
        .messages({
            'date.max': 'تاريخ الميلاد لا يمكن أن يكون في المستقبل / Date of birth cannot be in the future'
        }),
    nationalId: Joi.string()
        .pattern(saudiNationalIdPattern)
        .messages({
            'string.pattern.base': 'رقم الهوية غير صالح / Invalid National ID'
        }),
    gender: Joi.string().valid('male', 'female')
});

/**
 * Add Beneficiary validation schema
 */
const addBeneficiarySchema = Joi.object({
    name: Joi.string()
        .required()
        .max(100)
        .messages({
            'any.required': 'اسم المستفيد مطلوب / Beneficiary name is required',
            'string.max': 'الاسم طويل جداً / Name is too long'
        }),
    relationship: Joi.string()
        .required()
        .max(50)
        .messages({
            'any.required': 'العلاقة مطلوبة / Relationship is required'
        }),
    percentage: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
            'any.required': 'النسبة المئوية مطلوبة / Percentage is required',
            'number.min': 'النسبة المئوية لا يمكن أن تكون سالبة / Percentage cannot be negative',
            'number.max': 'النسبة المئوية لا يمكن أن تتجاوز 100 / Percentage cannot exceed 100'
        }),
    nationalId: Joi.string()
        .pattern(saudiNationalIdPattern)
        .messages({
            'string.pattern.base': 'رقم الهوية غير صالح / Invalid National ID'
        }),
    phone: Joi.string()
        .pattern(saudiPhonePattern)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح / Invalid phone number'
        }),
    address: Joi.string().max(500)
});

/**
 * Submit Claim validation schema
 */
const submitClaimSchema = Joi.object({
    claimType: Joi.string()
        .required()
        .valid('medical', 'dental', 'vision', 'prescription', 'hospital', 'emergency', 'preventive', 'other')
        .messages({
            'any.required': 'نوع المطالبة مطلوب / Claim type is required',
            'any.only': 'نوع المطالبة غير صالح / Invalid claim type'
        }),
    claimDate: Joi.date()
        .iso()
        .max('now')
        .required()
        .messages({
            'any.required': 'تاريخ المطالبة مطلوب / Claim date is required',
            'date.max': 'تاريخ المطالبة لا يمكن أن يكون في المستقبل / Claim date cannot be in the future'
        }),
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'مبلغ المطالبة يجب أن يكون رقماً موجباً / Claim amount must be a positive number',
            'any.required': 'مبلغ المطالبة مطلوب / Claim amount is required'
        }),
    provider: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم مقدم الخدمة طويل جداً / Provider name is too long'
        }),
    diagnosis: Joi.string()
        .max(500)
        .messages({
            'string.max': 'التشخيص طويل جداً / Diagnosis is too long'
        }),
    treatmentDate: Joi.date()
        .iso()
        .max('now')
        .messages({
            'date.max': 'تاريخ العلاج لا يمكن أن يكون في المستقبل / Treatment date cannot be in the future'
        }),
    receipts: Joi.array()
        .items(Joi.string())
        .min(1)
        .messages({
            'array.min': 'يجب إرفاق إيصال واحد على الأقل / At least one receipt must be attached'
        }),
    notes: Joi.string().max(1000)
});

// ============================================
// ID PARAMETER VALIDATION
// ============================================

/**
 * MongoDB ObjectId validation
 */
const idParamSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف غير صالح / Invalid ID format',
            'any.required': 'المعرف مطلوب / ID is required'
        })
});

/**
 * Employee ID parameter validation
 */
const employeeIdParamSchema = Joi.object({
    employeeId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف الموظف غير صالح / Invalid employee ID format',
            'any.required': 'معرف الموظف مطلوب / Employee ID is required'
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
        // Employee
        createEmployee: createEmployeeSchema,
        updateEmployee: updateEmployeeSchema,
        addAllowance: addAllowanceSchema,

        // Payroll
        createPayrollRun: createPayrollRunSchema,
        updatePayrollRun: updatePayrollRunSchema,
        approvePayroll: approvePayrollSchema,
        generateBulkPayroll: generateBulkPayrollSchema,
        createSalarySlip: createSalarySlipSchema,
        updateSalarySlip: updateSalarySlipSchema,

        // Leave Requests
        createLeaveRequest: createLeaveRequestSchema,
        updateLeaveRequest: updateLeaveRequestSchema,
        reviewLeaveRequest: reviewLeaveRequestSchema,
        requestExtension: requestExtensionSchema,

        // Attendance
        checkIn: checkInSchema,
        checkOut: checkOutSchema,
        createAttendance: createAttendanceSchema,
        updateAttendance: updateAttendanceSchema,
        submitCorrection: submitCorrectionSchema,
        reviewCorrection: reviewCorrectionSchema,

        // Employee Advances
        createAdvance: createAdvanceSchema,
        updateAdvance: updateAdvanceSchema,
        reviewAdvance: reviewAdvanceSchema,
        disburseAdvance: disburseAdvanceSchema,
        recordRecovery: recordRecoverySchema,

        // Employee Loans
        createLoan: createLoanSchema,
        updateLoan: updateLoanSchema,
        reviewLoan: reviewLoanSchema,
        disburseLoan: disburseLoanSchema,
        recordPayment: recordPaymentSchema,
        restructureLoan: restructureLoanSchema,

        // Employee Benefits
        createBenefit: createBenefitSchema,
        updateBenefit: updateBenefitSchema,
        addDependent: addDependentSchema,
        addBeneficiary: addBeneficiarySchema,
        submitClaim: submitClaimSchema,

        // Common
        idParam: idParamSchema,
        employeeIdParam: employeeIdParamSchema
    },

    // Middleware (for route use)
    // Employee
    validateCreateEmployee: validate(createEmployeeSchema),
    validateUpdateEmployee: validate(updateEmployeeSchema),
    validateAddAllowance: validate(addAllowanceSchema),

    // Payroll
    validateCreatePayrollRun: validate(createPayrollRunSchema),
    validateUpdatePayrollRun: validate(updatePayrollRunSchema),
    validateApprovePayroll: validate(approvePayrollSchema),
    validateGenerateBulkPayroll: validate(generateBulkPayrollSchema),
    validateCreateSalarySlip: validate(createSalarySlipSchema),
    validateUpdateSalarySlip: validate(updateSalarySlipSchema),

    // Leave Requests
    validateCreateLeaveRequest: validate(createLeaveRequestSchema),
    validateUpdateLeaveRequest: validate(updateLeaveRequestSchema),
    validateReviewLeaveRequest: validate(reviewLeaveRequestSchema),
    validateRequestExtension: validate(requestExtensionSchema),

    // Attendance
    validateCheckIn: validate(checkInSchema),
    validateCheckOut: validate(checkOutSchema),
    validateCreateAttendance: validate(createAttendanceSchema),
    validateUpdateAttendance: validate(updateAttendanceSchema),
    validateSubmitCorrection: validate(submitCorrectionSchema),
    validateReviewCorrection: validate(reviewCorrectionSchema),

    // Employee Advances
    validateCreateAdvance: validate(createAdvanceSchema),
    validateUpdateAdvance: validate(updateAdvanceSchema),
    validateReviewAdvance: validate(reviewAdvanceSchema),
    validateDisburseAdvance: validate(disburseAdvanceSchema),
    validateRecordRecovery: validate(recordRecoverySchema),

    // Employee Loans
    validateCreateLoan: validate(createLoanSchema),
    validateUpdateLoan: validate(updateLoanSchema),
    validateReviewLoan: validate(reviewLoanSchema),
    validateDisburseLoan: validate(disburseLoanSchema),
    validateRecordPayment: validate(recordPaymentSchema),
    validateRestructureLoan: validate(restructureLoanSchema),

    // Employee Benefits
    validateCreateBenefit: validate(createBenefitSchema),
    validateUpdateBenefit: validate(updateBenefitSchema),
    validateAddDependent: validate(addDependentSchema),
    validateAddBeneficiary: validate(addBeneficiarySchema),
    validateSubmitClaim: validate(submitClaimSchema),

    // Common
    validateIdParam: validate(idParamSchema, 'params'),
    validateEmployeeIdParam: validate(employeeIdParamSchema, 'params'),

    // Generic validate function
    validate
};
