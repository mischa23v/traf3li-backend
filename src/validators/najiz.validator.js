/**
 * Najiz Integration Validation Middleware
 *
 * Validates Saudi-specific fields like National ID, Iqama, CR Number, VAT Number,
 * National Address, and Hijri dates.
 */

const { body, validationResult } = require('express-validator');

// ═══════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Saudi National ID validation
 * Format: 10 digits starting with 1
 */
const validateNationalId = body('nationalId')
    .optional()
    .matches(/^1\d{9}$/)
    .withMessage('National ID must be 10 digits starting with 1');

/**
 * Iqama Number validation
 * Format: 10 digits starting with 2
 */
const validateIqamaNumber = body('iqamaNumber')
    .optional()
    .matches(/^2\d{9}$/)
    .withMessage('Iqama number must be 10 digits starting with 2');

/**
 * Commercial Registration (CR) Number validation
 * Format: 10 digits
 */
const validateCrNumber = body('crNumber')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('CR Number must be 10 digits');

/**
 * VAT Number validation
 * Format: 15 digits starting with 3
 */
const validateVatNumber = body('vatNumber')
    .optional()
    .matches(/^3\d{14}$/)
    .withMessage('VAT Number must be 15 digits starting with 3');

/**
 * Postal Code validation (Saudi National Address)
 * Format: 5 digits
 */
const validatePostalCode = body('nationalAddress.postalCode')
    .optional()
    .matches(/^\d{5}$/)
    .withMessage('Postal code must be 5 digits');

/**
 * Building Number validation (Saudi National Address)
 * Format: 4 digits
 */
const validateBuildingNumber = body('nationalAddress.buildingNumber')
    .optional()
    .matches(/^\d{4}$/)
    .withMessage('Building number must be 4 digits');

/**
 * Additional Number validation (Saudi National Address)
 * Format: 4 digits
 */
const validateAdditionalNumber = body('nationalAddress.additionalNumber')
    .optional()
    .matches(/^\d{4}$/)
    .withMessage('Additional number must be 4 digits');

/**
 * Region Code validation (Saudi National Address)
 * Format: 01-13
 */
const validateRegionCode = body('nationalAddress.regionCode')
    .optional()
    .matches(/^(0[1-9]|1[0-3])$/)
    .withMessage('Region code must be between 01 and 13');

/**
 * Hijri Date validation
 * Format: YYYY/MM/DD (e.g., 1445/06/15)
 */
const validateHijriDate = body('dateOfBirthHijri')
    .optional()
    .matches(/^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|30)$/)
    .withMessage('Hijri date must be in format YYYY/MM/DD (e.g., 1445/06/15)');

/**
 * Identity Type validation
 */
const validateIdentityType = body('identityType')
    .optional()
    .isIn([
        'national_id',
        'iqama',
        'gcc_id',
        'passport',
        'border_number',
        'visitor_id',
        'temporary_id',
        'diplomatic_id'
    ])
    .withMessage('Invalid identity type');

/**
 * GCC Country validation
 */
const validateGccCountry = body('gccCountry')
    .optional()
    .isIn(['SA', 'AE', 'KW', 'BH', 'OM', 'QA'])
    .withMessage('Invalid GCC country code');

/**
 * Gender validation
 */
const validateGender = body('gender')
    .optional()
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female');

/**
 * Marital Status validation
 */
const validateMaritalStatus = body('maritalStatus')
    .optional()
    .isIn(['single', 'married', 'divorced', 'widowed'])
    .withMessage('Invalid marital status');

/**
 * Risk Level validation
 */
const validateRiskLevel = body('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk level must be low, medium, or high');

/**
 * Conflict Check Status validation
 */
const validateConflictCheckStatus = body('conflictCheckStatus')
    .optional()
    .isIn(['not_checked', 'clear', 'potential_conflict', 'confirmed_conflict'])
    .withMessage('Invalid conflict check status');

// ═══════════════════════════════════════════════════════════════
// COMBINED VALIDATION ARRAYS
// ═══════════════════════════════════════════════════════════════

/**
 * Full Najiz validation for Client/Lead create/update
 */
const najizValidation = [
    validateNationalId,
    validateIqamaNumber,
    validateCrNumber,
    validateVatNumber,
    validatePostalCode,
    validateBuildingNumber,
    validateAdditionalNumber,
    validateRegionCode,
    validateHijriDate,
    validateIdentityType,
    validateGccCountry,
    validateGender,
    validateMaritalStatus,
    validateRiskLevel,
    validateConflictCheckStatus
];

/**
 * National Address validation only
 */
const nationalAddressValidation = [
    validatePostalCode,
    validateBuildingNumber,
    validateAdditionalNumber,
    validateRegionCode,
    body('nationalAddress.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('nationalAddress.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
];

/**
 * Identity validation (National ID, Iqama, Passport)
 */
const identityValidation = [
    validateNationalId,
    validateIqamaNumber,
    validateIdentityType,
    validateGccCountry,
    body('passportNumber')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Passport number must be 20 characters or less')
];

/**
 * Company (CR) validation
 */
const companyValidation = [
    validateCrNumber,
    validateVatNumber,
    body('unifiedNumber')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Unified number must be 20 characters or less'),
    body('capital')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Capital must be a positive number')
];

// ═══════════════════════════════════════════════════════════════
// VALIDATION RESULT HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware to handle validation errors
 */
const handleNajizValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Individual validators
    validateNationalId,
    validateIqamaNumber,
    validateCrNumber,
    validateVatNumber,
    validatePostalCode,
    validateBuildingNumber,
    validateAdditionalNumber,
    validateRegionCode,
    validateHijriDate,
    validateIdentityType,
    validateGccCountry,
    validateGender,
    validateMaritalStatus,
    validateRiskLevel,
    validateConflictCheckStatus,

    // Combined validation arrays
    najizValidation,
    nationalAddressValidation,
    identityValidation,
    companyValidation,

    // Error handler
    handleNajizValidationErrors
};
