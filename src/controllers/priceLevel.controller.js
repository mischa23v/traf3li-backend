/**
 * Price Level Controller
 */

const PriceLevel = require('../models/priceLevel.model');
const { toHalalas, toSAR } = require('../utils/currency');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Get all price levels
 */
const getPriceLevels = async (req, res) => {
    try {
        const { active } = req.query;
        const lawyerId = req.user._id;

        const query = { lawyerId };
        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        const priceLevels = await PriceLevel.find(query)
            .sort({ priority: -1, name: 1 });

        res.json({ success: true, data: priceLevels });
    } catch (error) {
        console.error('Error fetching price levels:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get single price level
 */
const getPriceLevel = async (req, res) => {
    try {
        // IDOR Protection: Sanitize ObjectId
        const priceLevelId = sanitizeObjectId(req.params.id);
        if (!priceLevelId) {
            return res.status(400).json({ success: false, message: 'Invalid price level ID' });
        }

        const priceLevel = await PriceLevel.findOne({
            _id: priceLevelId,
            lawyerId: req.user._id
        });

        if (!priceLevel) {
            return res.status(404).json({ success: false, message: 'Price level not found' });
        }

        res.json({ success: true, data: priceLevel });
    } catch (error) {
        console.error('Error fetching price level:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create price level
 */
const createPriceLevel = async (req, res) => {
    try {
        // Mass Assignment Protection: Define allowed fields
        const allowedFields = [
            'code',
            'name',
            'nameAr',
            'description',
            'descriptionAr',
            'pricingType',
            'percentageAdjustment',
            'fixedAdjustment',
            'customRates',
            'priority',
            'minimumRevenue',
            'minimumCases',
            'effectiveDate',
            'expiryDate',
            'isDefault',
            'incomeAccountId'
        ];

        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input Validation: Required fields
        if (!sanitizedData.code || typeof sanitizedData.code !== 'string') {
            return res.status(400).json({ success: false, message: 'Code is required and must be a string' });
        }
        if (!sanitizedData.name || typeof sanitizedData.name !== 'string') {
            return res.status(400).json({ success: false, message: 'Name is required and must be a string' });
        }
        if (!sanitizedData.pricingType || !['percentage', 'fixed', 'custom'].includes(sanitizedData.pricingType)) {
            return res.status(400).json({ success: false, message: 'Valid pricingType is required (percentage, fixed, or custom)' });
        }

        // Validate pricing type specific fields
        if (sanitizedData.pricingType === 'percentage') {
            if (sanitizedData.percentageAdjustment === undefined || typeof sanitizedData.percentageAdjustment !== 'number') {
                return res.status(400).json({ success: false, message: 'Percentage adjustment is required for percentage pricing type' });
            }
            if (sanitizedData.percentageAdjustment < -100 || sanitizedData.percentageAdjustment > 1000) {
                return res.status(400).json({ success: false, message: 'Percentage adjustment must be between -100 and 1000' });
            }
        }

        if (sanitizedData.pricingType === 'fixed' && sanitizedData.fixedAdjustment === undefined) {
            return res.status(400).json({ success: false, message: 'Fixed adjustment is required for fixed pricing type' });
        }

        if (sanitizedData.pricingType === 'custom' && (!sanitizedData.customRates || !Array.isArray(sanitizedData.customRates))) {
            return res.status(400).json({ success: false, message: 'Custom rates array is required for custom pricing type' });
        }

        // Validate numeric fields
        if (sanitizedData.priority !== undefined && (typeof sanitizedData.priority !== 'number' || sanitizedData.priority < 0)) {
            return res.status(400).json({ success: false, message: 'Priority must be a non-negative number' });
        }

        if (sanitizedData.minimumCases !== undefined && (typeof sanitizedData.minimumCases !== 'number' || sanitizedData.minimumCases < 0)) {
            return res.status(400).json({ success: false, message: 'Minimum cases must be a non-negative number' });
        }

        // Sanitize incomeAccountId if provided
        if (sanitizedData.incomeAccountId) {
            const sanitizedAccountId = sanitizeObjectId(sanitizedData.incomeAccountId);
            if (!sanitizedAccountId) {
                return res.status(400).json({ success: false, message: 'Invalid income account ID' });
            }
            sanitizedData.incomeAccountId = sanitizedAccountId;
        }

        // Check for duplicate code
        const existing = await PriceLevel.findOne({
            lawyerId: req.user._id,
            code: sanitizedData.code.toUpperCase()
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Price level with code ${sanitizedData.code} already exists`
            });
        }

        // Process custom rates to convert to halalas
        const processedCustomRates = sanitizedData.customRates?.map(rate => ({
            ...rate,
            hourlyRate: rate.hourlyRate ? toHalalas(rate.hourlyRate) : undefined,
            flatFee: rate.flatFee ? toHalalas(rate.flatFee) : undefined,
            minimumFee: rate.minimumFee ? toHalalas(rate.minimumFee) : undefined
        }));

        const priceLevel = new PriceLevel({
            code: sanitizedData.code.toUpperCase(),
            name: sanitizedData.name,
            nameAr: sanitizedData.nameAr,
            description: sanitizedData.description,
            descriptionAr: sanitizedData.descriptionAr,
            pricingType: sanitizedData.pricingType,
            percentageAdjustment: sanitizedData.percentageAdjustment,
            fixedAdjustment: sanitizedData.fixedAdjustment ? toHalalas(sanitizedData.fixedAdjustment) : 0,
            customRates: processedCustomRates,
            priority: sanitizedData.priority || 0,
            minimumRevenue: sanitizedData.minimumRevenue ? toHalalas(sanitizedData.minimumRevenue) : 0,
            minimumCases: sanitizedData.minimumCases || 0,
            effectiveDate: sanitizedData.effectiveDate ? new Date(sanitizedData.effectiveDate) : new Date(),
            expiryDate: sanitizedData.expiryDate ? new Date(sanitizedData.expiryDate) : undefined,
            isDefault: sanitizedData.isDefault || false,
            incomeAccountId: sanitizedData.incomeAccountId,
            lawyerId: req.user._id,
            createdBy: req.user._id
        });

        await priceLevel.save();

        res.status(201).json({ success: true, data: priceLevel });
    } catch (error) {
        console.error('Error creating price level:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update price level
 */
const updatePriceLevel = async (req, res) => {
    try {
        // IDOR Protection: Sanitize ObjectId
        const priceLevelId = sanitizeObjectId(req.params.id);
        if (!priceLevelId) {
            return res.status(400).json({ success: false, message: 'Invalid price level ID' });
        }

        const priceLevel = await PriceLevel.findOne({
            _id: priceLevelId,
            lawyerId: req.user._id
        });

        if (!priceLevel) {
            return res.status(404).json({ success: false, message: 'Price level not found' });
        }

        // Mass Assignment Protection: Define allowed fields
        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'pricingType', 'percentageAdjustment', 'fixedAdjustment',
            'customRates', 'priority', 'minimumRevenue', 'minimumCases',
            'effectiveDate', 'expiryDate', 'isActive', 'isDefault',
            'incomeAccountId'
        ];

        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input Validation: Validate pricingType if provided
        if (sanitizedData.pricingType && !['percentage', 'fixed', 'custom'].includes(sanitizedData.pricingType)) {
            return res.status(400).json({ success: false, message: 'Valid pricingType is required (percentage, fixed, or custom)' });
        }

        // Validate percentage adjustment range
        if (sanitizedData.percentageAdjustment !== undefined) {
            if (typeof sanitizedData.percentageAdjustment !== 'number') {
                return res.status(400).json({ success: false, message: 'Percentage adjustment must be a number' });
            }
            if (sanitizedData.percentageAdjustment < -100 || sanitizedData.percentageAdjustment > 1000) {
                return res.status(400).json({ success: false, message: 'Percentage adjustment must be between -100 and 1000' });
            }
        }

        // Validate numeric fields
        if (sanitizedData.priority !== undefined && (typeof sanitizedData.priority !== 'number' || sanitizedData.priority < 0)) {
            return res.status(400).json({ success: false, message: 'Priority must be a non-negative number' });
        }

        if (sanitizedData.minimumCases !== undefined && (typeof sanitizedData.minimumCases !== 'number' || sanitizedData.minimumCases < 0)) {
            return res.status(400).json({ success: false, message: 'Minimum cases must be a non-negative number' });
        }

        // Validate customRates if provided
        if (sanitizedData.customRates !== undefined && !Array.isArray(sanitizedData.customRates)) {
            return res.status(400).json({ success: false, message: 'Custom rates must be an array' });
        }

        // Sanitize incomeAccountId if provided
        if (sanitizedData.incomeAccountId) {
            const sanitizedAccountId = sanitizeObjectId(sanitizedData.incomeAccountId);
            if (!sanitizedAccountId) {
                return res.status(400).json({ success: false, message: 'Invalid income account ID' });
            }
            sanitizedData.incomeAccountId = sanitizedAccountId;
        }

        // Apply updates
        allowedFields.forEach(field => {
            if (sanitizedData[field] !== undefined) {
                if (field === 'fixedAdjustment' || field === 'minimumRevenue') {
                    priceLevel[field] = toHalalas(sanitizedData[field]);
                } else if (field === 'customRates') {
                    priceLevel.customRates = sanitizedData.customRates?.map(rate => ({
                        ...rate,
                        hourlyRate: rate.hourlyRate ? toHalalas(rate.hourlyRate) : undefined,
                        flatFee: rate.flatFee ? toHalalas(rate.flatFee) : undefined,
                        minimumFee: rate.minimumFee ? toHalalas(rate.minimumFee) : undefined
                    }));
                } else {
                    priceLevel[field] = sanitizedData[field];
                }
            }
        });

        await priceLevel.save();

        res.json({ success: true, data: priceLevel });
    } catch (error) {
        console.error('Error updating price level:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete price level
 */
const deletePriceLevel = async (req, res) => {
    try {
        // IDOR Protection: Sanitize ObjectId
        const priceLevelId = sanitizeObjectId(req.params.id);
        if (!priceLevelId) {
            return res.status(400).json({ success: false, message: 'Invalid price level ID' });
        }

        const priceLevel = await PriceLevel.findOne({
            _id: priceLevelId,
            lawyerId: req.user._id
        });

        if (!priceLevel) {
            return res.status(404).json({ success: false, message: 'Price level not found' });
        }

        if (priceLevel.isDefault) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete default price level. Set another as default first.'
            });
        }

        await priceLevel.deleteOne();

        res.json({ success: true, message: 'Price level deleted' });
    } catch (error) {
        console.error('Error deleting price level:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get effective rate for a client
 */
const getClientRate = async (req, res) => {
    try {
        const { clientId, baseRate, serviceType } = req.query;
        const lawyerId = req.user._id;

        // Input Validation: Required fields
        if (!clientId || !baseRate) {
            return res.status(400).json({
                success: false,
                message: 'clientId and baseRate are required'
            });
        }

        // IDOR Protection: Sanitize clientId
        const sanitizedClientId = sanitizeObjectId(clientId);
        if (!sanitizedClientId) {
            return res.status(400).json({ success: false, message: 'Invalid client ID' });
        }

        // Input Validation: Validate baseRate
        const parsedBaseRate = parseFloat(baseRate);
        if (isNaN(parsedBaseRate) || parsedBaseRate < 0) {
            return res.status(400).json({ success: false, message: 'Base rate must be a non-negative number' });
        }

        const baseRateHalalas = toHalalas(parsedBaseRate);
        const effectiveRate = await PriceLevel.getEffectiveRate(
            lawyerId,
            sanitizedClientId,
            baseRateHalalas,
            serviceType
        );

        const priceLevel = await PriceLevel.getBestPriceLevel(lawyerId, sanitizedClientId);

        res.json({
            success: true,
            data: {
                baseRate: toSAR(baseRateHalalas),
                effectiveRate: toSAR(effectiveRate),
                priceLevel: priceLevel ? {
                    code: priceLevel.code,
                    name: priceLevel.name,
                    adjustment: priceLevel.pricingType === 'percentage' ?
                        `${priceLevel.percentageAdjustment}%` :
                        toSAR(priceLevel.fixedAdjustment)
                } : null
            }
        });
    } catch (error) {
        console.error('Error getting client rate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Set default price level
 */
const setDefault = async (req, res) => {
    try {
        // IDOR Protection: Sanitize ObjectId
        const priceLevelId = sanitizeObjectId(req.params.id);
        if (!priceLevelId) {
            return res.status(400).json({ success: false, message: 'Invalid price level ID' });
        }

        const priceLevel = await PriceLevel.findOne({
            _id: priceLevelId,
            lawyerId: req.user._id
        });

        if (!priceLevel) {
            return res.status(404).json({ success: false, message: 'Price level not found' });
        }

        priceLevel.isDefault = true;
        await priceLevel.save();

        res.json({ success: true, data: priceLevel });
    } catch (error) {
        console.error('Error setting default price level:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPriceLevels,
    getPriceLevel,
    createPriceLevel,
    updatePriceLevel,
    deletePriceLevel,
    getClientRate,
    setDefault
};
