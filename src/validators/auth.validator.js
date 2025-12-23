/**
 * Auth Route Validation Schemas
 *
 * Uses Joi for request validation on authentication endpoints.
 * Provides both validation schemas and middleware functions.
 */

const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Login validation schema
 * Accepts either 'email' or 'username' field (one is required) and password
 */
const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    username: Joi.string()
        .messages({}),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'كلمة المرور مطلوبة / Password is required'
        })
}).or('email', 'username').messages({
    'object.missing': 'البريد الإلكتروني أو اسم المستخدم مطلوب / Email or username is required'
});

/**
 * Registration validation schema
 */
const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format',
            'any.required': 'البريد الإلكتروني مطلوب / Email is required'
        }),
    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .required()
        .messages({
            'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل / Password must be at least 8 characters',
            'string.max': 'كلمة المرور طويلة جداً / Password is too long',
            'string.pattern.base': 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص / Password must contain uppercase, lowercase, number and special character',
            'any.required': 'كلمة المرور مطلوبة / Password is required'
        }),
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.alphanum': 'اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط / Username must be alphanumeric',
            'string.min': 'اسم المستخدم قصير جداً / Username is too short',
            'string.max': 'اسم المستخدم طويل جداً / Username is too long',
            'any.required': 'اسم المستخدم مطلوب / Username is required'
        }),
    phone: Joi.string()
        .pattern(/^\+?[0-9]{10,15}$/)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح / Invalid phone number format'
        }),
    firstName: Joi.string()
        .max(50)
        .messages({
            'string.max': 'الاسم الأول طويل جداً / First name is too long'
        }),
    lastName: Joi.string()
        .max(50)
        .messages({
            'string.max': 'اسم العائلة طويل جداً / Last name is too long'
        }),
    role: Joi.string()
        .valid('client', 'lawyer', 'paralegal', 'admin')
        .default('client')
});

/**
 * OTP send validation schema
 */
const sendOTPSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format',
            'any.required': 'البريد الإلكتروني مطلوب / Email is required'
        }),
    type: Joi.string()
        .valid('login', 'register', 'reset-password', 'verify-email')
        .default('login')
});

/**
 * OTP verify validation schema
 */
const verifyOTPSchema = Joi.object({
    email: Joi.string()
        .email()
        .required(),
    otp: Joi.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required()
        .messages({
            'string.length': 'رمز التحقق يجب أن يكون 6 أرقام / OTP must be 6 digits',
            'string.pattern.base': 'رمز التحقق يجب أن يحتوي على أرقام فقط / OTP must contain only numbers',
            'any.required': 'رمز التحقق مطلوب / OTP is required'
        })
});

/**
 * Check availability schema
 */
const checkAvailabilitySchema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string().alphanum().min(3).max(30),
    phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/)
}).or('email', 'username', 'phone').messages({
    'object.missing': 'يجب تقديم بريد إلكتروني أو اسم مستخدم أو رقم هاتف / Must provide email, username, or phone'
});

/**
 * Send magic link validation schema
 */
const sendMagicLinkSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format',
            'any.required': 'البريد الإلكتروني مطلوب / Email is required'
        }),
    purpose: Joi.string()
        .valid('login', 'register', 'verify_email')
        .default('login')
        .messages({
            'any.only': 'غرض غير صالح / Invalid purpose'
        }),
    redirectUrl: Joi.string()
        .uri()
        .optional()
        .messages({
            'string.uri': 'رابط إعادة التوجيه غير صالح / Invalid redirect URL'
        })
});

/**
 * Verify magic link validation schema
 */
const verifyMagicLinkSchema = Joi.object({
    token: Joi.string()
        .length(64)
        .pattern(/^[a-f0-9]{64}$/)
        .required()
        .messages({
            'string.length': 'رمز غير صالح / Invalid token',
            'string.pattern.base': 'رمز غير صالح / Invalid token',
            'any.required': 'الرمز مطلوب / Token is required'
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
        login: loginSchema,
        register: registerSchema,
        sendOTP: sendOTPSchema,
        verifyOTP: verifyOTPSchema,
        checkAvailability: checkAvailabilitySchema,
        sendMagicLink: sendMagicLinkSchema,
        verifyMagicLink: verifyMagicLinkSchema
    },

    // Middleware (for route use)
    validateLogin: validate(loginSchema),
    validateRegister: validate(registerSchema),
    validateSendOTP: validate(sendOTPSchema),
    validateVerifyOTP: validate(verifyOTPSchema),
    validateCheckAvailability: validate(checkAvailabilitySchema),
    validateSendMagicLink: validate(sendMagicLinkSchema),
    validateVerifyMagicLink: validate(verifyMagicLinkSchema),

    // Generic validate function
    validate
};
