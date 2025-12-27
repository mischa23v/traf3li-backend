const { Vendor, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Vendor creation validation schema
const vendorCreateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(300)
        .trim()
        .required()
        .messages({
            'string.min': 'Vendor name must be at least 2 characters',
            'string.max': 'Vendor name cannot exceed 300 characters',
            'any.required': 'Vendor name is required'
        }),
    nameAr: Joi.string()
        .max(300)
        .trim()
        .allow('', null)
        .optional(),
    email: Joi.string()
        .email()
        .trim()
        .lowercase()
        .max(255)
        .allow('', null)
        .optional(),
    phone: Joi.string()
        .pattern(/^[\d\s+()-]+$/)
        .max(30)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'Phone number contains invalid characters'
        }),
    taxNumber: Joi.string()
        .trim()
        .max(50)
        .allow('', null)
        .optional(),
    address: Joi.string()
        .max(500)
        .trim()
        .allow('', null)
        .optional(),
    city: Joi.string()
        .max(100)
        .trim()
        .allow('', null)
        .optional(),
    country: Joi.string()
        .length(2)
        .uppercase()
        .trim()
        .default('SA')
        .optional(),
    postalCode: Joi.string()
        .max(20)
        .trim()
        .allow('', null)
        .optional(),
    // Financial field validations
    bankName: Joi.string()
        .max(200)
        .trim()
        .allow('', null)
        .optional(),
    bankAccountNumber: Joi.string()
        .pattern(/^[A-Z0-9]+$/)
        .max(50)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'Bank account number must contain only alphanumeric characters'
        }),
    bankIban: Joi.string()
        .pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/)
        .min(15)
        .max(34)
        .trim()
        .uppercase()
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'IBAN format is invalid (must start with 2 letters, 2 digits, followed by alphanumeric)',
            'string.min': 'IBAN must be at least 15 characters',
            'string.max': 'IBAN cannot exceed 34 characters'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .trim()
        .pattern(/^[A-Z]{3}$/)
        .default('SAR')
        .optional()
        .messages({
            'string.pattern.base': 'Currency must be a valid 3-letter ISO code (e.g., SAR, USD, EUR)'
        }),
    paymentTerms: Joi.number()
        .integer()
        .min(0)
        .max(365)
        .default(30)
        .optional()
        .messages({
            'number.min': 'Payment terms must be at least 0 days',
            'number.max': 'Payment terms cannot exceed 365 days',
            'number.integer': 'Payment terms must be a whole number'
        }),
    defaultCategory: Joi.string()
        .max(100)
        .trim()
        .allow('', null)
        .optional(),
    website: Joi.string()
        .uri()
        .max(500)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.uri': 'Website must be a valid URL'
        }),
    contactPerson: Joi.string()
        .max(200)
        .trim()
        .allow('', null)
        .optional(),
    notes: Joi.string()
        .max(2000)
        .trim()
        .allow('', null)
        .optional(),
    // Financial fields - additional validation
    creditLimit: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.min': 'Credit limit cannot be negative'
        }),
    openingBalance: Joi.number()
        .integer()
        .optional(),
    openingBalanceDate: Joi.date()
        .optional(),
    defaultExpenseAccountId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid account ID format'
        }),
    payableAccountId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid account ID format'
        })
}).options({ stripUnknown: true, abortEarly: false });

// Vendor update validation schema (all fields optional)
const vendorUpdateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(300)
        .trim()
        .optional()
        .messages({
            'string.min': 'Vendor name must be at least 2 characters',
            'string.max': 'Vendor name cannot exceed 300 characters'
        }),
    nameAr: Joi.string()
        .max(300)
        .trim()
        .allow('', null)
        .optional(),
    email: Joi.string()
        .email()
        .trim()
        .lowercase()
        .max(255)
        .allow('', null)
        .optional(),
    phone: Joi.string()
        .pattern(/^[\d\s+()-]+$/)
        .max(30)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'Phone number contains invalid characters'
        }),
    taxNumber: Joi.string()
        .trim()
        .max(50)
        .allow('', null)
        .optional(),
    address: Joi.string()
        .max(500)
        .trim()
        .allow('', null)
        .optional(),
    city: Joi.string()
        .max(100)
        .trim()
        .allow('', null)
        .optional(),
    country: Joi.string()
        .length(2)
        .uppercase()
        .trim()
        .optional(),
    postalCode: Joi.string()
        .max(20)
        .trim()
        .allow('', null)
        .optional(),
    // Financial field validations
    bankName: Joi.string()
        .max(200)
        .trim()
        .allow('', null)
        .optional(),
    bankAccountNumber: Joi.string()
        .pattern(/^[A-Z0-9]+$/)
        .max(50)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'Bank account number must contain only alphanumeric characters'
        }),
    bankIban: Joi.string()
        .pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/)
        .min(15)
        .max(34)
        .trim()
        .uppercase()
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base': 'IBAN format is invalid',
            'string.min': 'IBAN must be at least 15 characters',
            'string.max': 'IBAN cannot exceed 34 characters'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .trim()
        .pattern(/^[A-Z]{3}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Currency must be a valid 3-letter ISO code'
        }),
    paymentTerms: Joi.number()
        .integer()
        .min(0)
        .max(365)
        .optional()
        .messages({
            'number.min': 'Payment terms must be at least 0 days',
            'number.max': 'Payment terms cannot exceed 365 days'
        }),
    defaultCategory: Joi.string()
        .max(100)
        .trim()
        .allow('', null)
        .optional(),
    website: Joi.string()
        .uri()
        .max(500)
        .trim()
        .allow('', null)
        .optional(),
    contactPerson: Joi.string()
        .max(200)
        .trim()
        .allow('', null)
        .optional(),
    notes: Joi.string()
        .max(2000)
        .trim()
        .allow('', null)
        .optional(),
    isActive: Joi.boolean()
        .optional(),
    creditLimit: Joi.number()
        .integer()
        .min(0)
        .optional(),
    openingBalance: Joi.number()
        .integer()
        .optional(),
    openingBalanceDate: Joi.date()
        .optional(),
    defaultExpenseAccountId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow('', null)
        .optional(),
    payableAccountId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow('', null)
        .optional()
}).options({ stripUnknown: true, abortEarly: false });

// Allowed fields for vendor creation (mass assignment protection)
const VENDOR_CREATE_ALLOWED_FIELDS = [
    'name',
    'nameAr',
    'email',
    'phone',
    'taxNumber',
    'address',
    'city',
    'country',
    'postalCode',
    'bankName',
    'bankAccountNumber',
    'bankIban',
    'currency',
    'paymentTerms',
    'defaultCategory',
    'website',
    'contactPerson',
    'notes',
    'creditLimit',
    'openingBalance',
    'openingBalanceDate',
    'defaultExpenseAccountId',
    'payableAccountId'
];

// Allowed fields for vendor update (mass assignment protection)
const VENDOR_UPDATE_ALLOWED_FIELDS = [
    'name',
    'nameAr',
    'email',
    'phone',
    'taxNumber',
    'address',
    'city',
    'country',
    'postalCode',
    'bankName',
    'bankAccountNumber',
    'bankIban',
    'currency',
    'paymentTerms',
    'defaultCategory',
    'website',
    'contactPerson',
    'notes',
    'isActive',
    'creditLimit',
    'openingBalance',
    'openingBalanceDate',
    'defaultExpenseAccountId',
    'payableAccountId'
];

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

// Create vendor
const createVendor = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // Mass assignment protection - only allow specific fields
    const filteredData = pickAllowedFields(req.body, VENDOR_CREATE_ALLOWED_FIELDS);

    // Validate input with Joi
    const { error, value: validatedData } = vendorCreateSchema.validate(filteredData);

    if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw CustomException(`Validation failed: ${errorMessages}`, 400);
    }

    // Additional validation: If IBAN is provided, ensure bank details are complete
    if (validatedData.bankIban && !validatedData.bankName) {
        throw CustomException('Bank name is required when IBAN is provided', 400);
    }

    // IDOR Protection: ownership is set from authenticated user, not from request body
    // Support both solo lawyers (lawyerId) and firm users (firmId)
    const vendorData = {
        ...validatedData,
        lawyerId
    };

    // Add firmId for firm users
    if (!isSoloLawyer && firmId) {
        vendorData.firmId = firmId;
    }

    const vendor = await Vendor.create(vendorData);

    await BillingActivity.logActivity({
        activityType: 'vendor_created',
        userId: lawyerId,
        relatedModel: 'Vendor',
        relatedId: vendor._id,
        description: `Vendor "${validatedData.name}" created`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        vendor
    });
});

// Get all vendors
const getVendors = asyncHandler(async (req, res) => {
    const {
        search,
        isActive,
        country,
        page = 1,
        limit = 20
    } = req.query;

    // IDOR Protection: Use firmQuery for firm isolation
    const filters = { ...req.firmQuery };

    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (country) filters.country = country;

    if (search) {
        filters.$or = [
            { name: { $regex: search, $options: 'i' } },
            { nameAr: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filters)
        .sort({ name: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Vendor.countDocuments(filters);

    return res.json({
        success: true,
        vendors,
        total
    });
});

// Get single vendor
const getVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid vendor ID format', 400);
    }

    // IDOR Protection: Use firmQuery for firm isolation
    const vendor = await Vendor.findOne({ _id: sanitizedId, ...req.firmQuery });

    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    return res.json({
        success: true,
        vendor
    });
});

// Update vendor
const updateVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid vendor ID format', 400);
    }

    // IDOR Protection: Verify vendor exists and user has access
    const vendor = await Vendor.findOne({ _id: sanitizedId, ...req.firmQuery });

    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    // Mass assignment protection - only allow specific fields
    const filteredData = pickAllowedFields(req.body, VENDOR_UPDATE_ALLOWED_FIELDS);

    // Validate input with Joi
    const { error, value: validatedData } = vendorUpdateSchema.validate(filteredData);

    if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw CustomException(`Validation failed: ${errorMessages}`, 400);
    }

    // Ensure no attempt to change ownership (lawyerId/firmId should never be updated from request)
    delete validatedData.lawyerId;
    delete validatedData.firmId;

    // Additional validation: If IBAN is provided, ensure bank details are complete
    if (validatedData.bankIban && !validatedData.bankName && !vendor.bankName) {
        throw CustomException('Bank name is required when IBAN is provided', 400);
    }

    // IDOR Protection: Update with firmQuery to prevent race condition
    const updatedVendor = await Vendor.findOneAndUpdate(
        { _id: sanitizedId, ...req.firmQuery },
        { $set: validatedData },
        { new: true, runValidators: true }
    );

    return res.json({
        success: true,
        message: 'Vendor updated successfully',
        vendor: updatedVendor
    });
});

// Delete vendor
const deleteVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid vendor ID format', 400);
    }

    // IDOR Protection: Verify vendor exists and user has access
    const vendor = await Vendor.findOne({ _id: sanitizedId, ...req.firmQuery });

    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    // IDOR Protection: Check for existing bills with firm isolation
    const Bill = require('../models').Bill;
    const billCount = await Bill.countDocuments({ vendorId: sanitizedId, ...req.firmQuery });
    if (billCount > 0) {
        throw CustomException('Cannot delete vendor with existing bills. Deactivate instead.', 400);
    }

    // IDOR Protection: Delete with firmQuery to prevent race condition
    await Vendor.findOneAndDelete({ _id: sanitizedId, ...req.firmQuery });

    return res.json({
        success: true,
        message: 'Vendor deleted successfully'
    });
});

// Get vendor summary with bills
const getVendorSummary = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid vendor ID format', 400);
    }

    // IDOR Protection: Verify vendor exists and user has access first
    const vendor = await Vendor.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    // Get summary with firm isolation (pass firmQuery for proper isolation)
    const summary = await Vendor.getVendorSummary(sanitizedId, req.userID, req.firmQuery);

    if (!summary) {
        throw CustomException('Vendor not found', 404);
    }

    return res.json({
        success: true,
        summary
    });
});

module.exports = {
    createVendor,
    getVendors,
    getVendor,
    updateVendor,
    deleteVendor,
    getVendorSummary
};
