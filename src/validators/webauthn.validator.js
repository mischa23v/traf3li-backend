/**
 * WebAuthn Route Validation Schemas
 *
 * Uses Joi for request validation on WebAuthn endpoints.
 * Provides validation for registration, authentication, and credential management.
 */

const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Start authentication validation schema
 * Accepts either 'email' or 'username' (one is required)
 */
const startAuthenticationSchema = Joi.object({
    email: Joi.string()
        .email()
        .messages({
            'string.email': 'Invalid email format'
        }),
    username: Joi.string()
        .min(3)
        .max(50)
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 50 characters'
        })
}).or('email', 'username').messages({
    'object.missing': 'Email or username is required'
});

/**
 * Finish authentication validation schema
 */
const finishAuthenticationSchema = Joi.object({
    credential: Joi.object().required().messages({
        'any.required': 'Credential is required',
        'object.base': 'Credential must be an object'
    }),
    userId: Joi.string()
        .required()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'any.required': 'User ID is required',
            'string.pattern.base': 'Invalid user ID format'
        })
});

/**
 * Finish registration validation schema
 */
const finishRegistrationSchema = Joi.object({
    credential: Joi.object().required().messages({
        'any.required': 'Credential is required',
        'object.base': 'Credential must be an object'
    }),
    credentialName: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Credential name cannot exceed 100 characters'
        })
});

/**
 * Update credential name validation schema
 */
const updateCredentialNameSchema = Joi.object({
    name: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'any.required': 'Credential name is required',
            'string.min': 'Credential name cannot be empty',
            'string.max': 'Credential name cannot exceed 100 characters',
            'string.empty': 'Credential name cannot be empty'
        })
});

/**
 * Credential ID parameter validation schema
 */
const credentialIdParamSchema = Joi.object({
    id: Joi.string()
        .required()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'any.required': 'Credential ID is required',
            'string.pattern.base': 'Invalid credential ID format'
        })
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Validates request against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Replace request property with validated value
        req[property] = value;
        next();
    };
};

// ============================================
// EXPORTED VALIDATORS
// ============================================

module.exports = {
    // Validation schemas
    startAuthenticationSchema,
    finishAuthenticationSchema,
    finishRegistrationSchema,
    updateCredentialNameSchema,
    credentialIdParamSchema,

    // Validation middleware
    validateStartAuthentication: validate(startAuthenticationSchema, 'body'),
    validateFinishAuthentication: validate(finishAuthenticationSchema, 'body'),
    validateFinishRegistration: validate(finishRegistrationSchema, 'body'),
    validateUpdateCredentialName: validate(updateCredentialNameSchema, 'body'),
    validateCredentialIdParam: validate(credentialIdParamSchema, 'params')
};
