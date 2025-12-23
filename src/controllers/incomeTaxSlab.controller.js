/**
 * Income Tax Slab Controller
 *
 * @module controllers/incomeTaxSlab
 */

const IncomeTaxSlab = require('../models/incomeTaxSlab.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId, pickAllowedFields } = require('../utils/securityUtils');

/**
 * Get all tax slabs for the firm
 * GET /api/tax-slabs
 */
const getTaxSlabs = asyncHandler(async (req, res) => {
    const { countryCode, fiscalYear, isActive } = req.query;

    const query = { firmId: req.firmId };
    if (countryCode) query.countryCode = countryCode.toUpperCase();
    if (fiscalYear) query.fiscalYear = parseInt(fiscalYear, 10);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const slabs = await IncomeTaxSlab.find(query)
        .sort({ countryCode: 1, fiscalYear: -1, effectiveFrom: -1 })
        .lean();

    res.json({
        success: true,
        data: slabs,
        meta: { total: slabs.length }
    });
});

/**
 * Get single tax slab
 * GET /api/tax-slabs/:id
 */
const getTaxSlab = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid tax slab ID | معرف شريحة الضريبة غير صالح', 400);
    }

    const slab = await IncomeTaxSlab.findOne({
        _id: id,
        firmId: req.firmId
    }).lean();

    if (!slab) {
        throw new CustomException('Tax slab not found | شريحة الضريبة غير موجودة', 404);
    }

    res.json({
        success: true,
        data: slab
    });
});

/**
 * Create tax slab
 * POST /api/tax-slabs
 */
const createTaxSlab = asyncHandler(async (req, res) => {
    const allowedFields = [
        'name', 'nameAr', 'countryCode', 'currency', 'fiscalYear',
        'effectiveFrom', 'effectiveTo', 'period', 'brackets',
        'standardDeductions', 'personalExemption', 'dependentExemption',
        'spouseExemption', 'filingStatuses', 'surcharge', 'cess', 'notes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.name || !safeData.countryCode || !safeData.fiscalYear) {
        throw new CustomException(
            'Name, country code, and fiscal year are required | الاسم ورمز الدولة والسنة المالية مطلوبة',
            400
        );
    }

    // Validate brackets
    if (!safeData.brackets || !Array.isArray(safeData.brackets) || safeData.brackets.length === 0) {
        throw new CustomException(
            'At least one tax bracket is required | مطلوب شريحة ضريبية واحدة على الأقل',
            400
        );
    }

    const slab = new IncomeTaxSlab({
        ...safeData,
        firmId: req.firmId,
        createdBy: req.userID,
        isActive: true
    });

    await slab.save();

    res.status(201).json({
        success: true,
        message: 'Tax slab created successfully | تم إنشاء شريحة الضريبة بنجاح',
        data: slab
    });
});

/**
 * Update tax slab
 * PUT /api/tax-slabs/:id
 */
const updateTaxSlab = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid tax slab ID | معرف شريحة الضريبة غير صالح', 400);
    }

    const slab = await IncomeTaxSlab.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!slab) {
        throw new CustomException('Tax slab not found | شريحة الضريبة غير موجودة', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'countryCode', 'currency', 'fiscalYear',
        'effectiveFrom', 'effectiveTo', 'period', 'brackets',
        'standardDeductions', 'personalExemption', 'dependentExemption',
        'spouseExemption', 'filingStatuses', 'surcharge', 'cess',
        'notes', 'isActive'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    Object.assign(slab, safeData, { updatedBy: req.userID });
    await slab.save();

    res.json({
        success: true,
        message: 'Tax slab updated successfully | تم تحديث شريحة الضريبة بنجاح',
        data: slab
    });
});

/**
 * Delete tax slab
 * DELETE /api/tax-slabs/:id
 */
const deleteTaxSlab = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid tax slab ID | معرف شريحة الضريبة غير صالح', 400);
    }

    const slab = await IncomeTaxSlab.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!slab) {
        throw new CustomException('Tax slab not found | شريحة الضريبة غير موجودة', 404);
    }

    await IncomeTaxSlab.deleteOne({ _id: id });

    res.json({
        success: true,
        message: 'Tax slab deleted successfully | تم حذف شريحة الضريبة بنجاح'
    });
});

/**
 * Calculate tax for an amount
 * POST /api/tax-slabs/:id/calculate
 */
const calculateTax = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid tax slab ID | معرف شريحة الضريبة غير صالح', 400);
    }

    const slab = await IncomeTaxSlab.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!slab) {
        throw new CustomException('Tax slab not found | شريحة الضريبة غير موجودة', 404);
    }

    const { grossIncome, dependents, hasSpouse, filingStatus, additionalDeductions } = req.body;

    if (grossIncome === undefined || grossIncome < 0) {
        throw new CustomException('Valid gross income is required | الدخل الإجمالي الصالح مطلوب', 400);
    }

    const result = slab.calculateTax(parseFloat(grossIncome), {
        dependents: parseInt(dependents, 10) || 0,
        hasSpouse: hasSpouse === true,
        filingStatus: filingStatus || 'single',
        additionalDeductions: parseFloat(additionalDeductions) || 0
    });

    res.json({
        success: true,
        data: result
    });
});

/**
 * Calculate tax using active slab for country
 * POST /api/tax-slabs/calculate-by-country
 */
const calculateTaxByCountry = asyncHandler(async (req, res) => {
    const { countryCode, grossIncome, dependents, hasSpouse, filingStatus, additionalDeductions, date } = req.body;

    if (!countryCode) {
        throw new CustomException('Country code is required | رمز الدولة مطلوب', 400);
    }

    if (grossIncome === undefined || grossIncome < 0) {
        throw new CustomException('Valid gross income is required | الدخل الإجمالي الصالح مطلوب', 400);
    }

    const effectiveDate = date ? new Date(date) : new Date();

    const slab = await IncomeTaxSlab.getActiveSlab(req.firmId, countryCode, effectiveDate);

    if (!slab) {
        throw new CustomException(
            `No active tax slab found for ${countryCode} | لم يتم العثور على شريحة ضريبية نشطة لـ ${countryCode}`,
            404
        );
    }

    const result = slab.calculateTax(parseFloat(grossIncome), {
        dependents: parseInt(dependents, 10) || 0,
        hasSpouse: hasSpouse === true,
        filingStatus: filingStatus || 'single',
        additionalDeductions: parseFloat(additionalDeductions) || 0
    });

    res.json({
        success: true,
        data: {
            ...result,
            taxSlab: {
                id: slab._id,
                name: slab.name,
                countryCode: slab.countryCode,
                fiscalYear: slab.fiscalYear
            }
        }
    });
});

/**
 * Initialize default tax slabs
 * POST /api/tax-slabs/initialize-defaults
 */
const initializeDefaults = asyncHandler(async (req, res) => {
    const created = await IncomeTaxSlab.createDefaultSlabs(req.firmId, req.userID);

    res.status(201).json({
        success: true,
        message: `Created ${created.length} default tax slabs | تم إنشاء ${created.length} شريحة ضريبية افتراضية`,
        data: created
    });
});

/**
 * Get supported countries
 * GET /api/tax-slabs/countries
 */
const getSupportedCountries = asyncHandler(async (req, res) => {
    const countries = await IncomeTaxSlab.distinct('countryCode', { firmId: req.firmId });

    res.json({
        success: true,
        data: countries.sort()
    });
});

module.exports = {
    getTaxSlabs,
    getTaxSlab,
    createTaxSlab,
    updateTaxSlab,
    deleteTaxSlab,
    calculateTax,
    calculateTaxByCountry,
    initializeDefaults,
    getSupportedCountries
};
