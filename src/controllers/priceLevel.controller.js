/**
 * Price Level Controller
 */

const PriceLevel = require('../models/priceLevel.model');
const { toHalalas, toSAR } = require('../utils/currency');

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
        const priceLevel = await PriceLevel.findOne({
            _id: req.params.id,
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
        const {
            code,
            name,
            nameAr,
            description,
            descriptionAr,
            pricingType,
            percentageAdjustment,
            fixedAdjustment,
            customRates,
            priority,
            minimumRevenue,
            minimumCases,
            effectiveDate,
            expiryDate,
            isDefault,
            incomeAccountId
        } = req.body;

        // Check for duplicate code
        const existing = await PriceLevel.findOne({
            lawyerId: req.user._id,
            code: code.toUpperCase()
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Price level with code ${code} already exists`
            });
        }

        // Process custom rates to convert to halalas
        const processedCustomRates = customRates?.map(rate => ({
            ...rate,
            hourlyRate: rate.hourlyRate ? toHalalas(rate.hourlyRate) : undefined,
            flatFee: rate.flatFee ? toHalalas(rate.flatFee) : undefined,
            minimumFee: rate.minimumFee ? toHalalas(rate.minimumFee) : undefined
        }));

        const priceLevel = new PriceLevel({
            code: code.toUpperCase(),
            name,
            nameAr,
            description,
            descriptionAr,
            pricingType,
            percentageAdjustment,
            fixedAdjustment: fixedAdjustment ? toHalalas(fixedAdjustment) : 0,
            customRates: processedCustomRates,
            priority: priority || 0,
            minimumRevenue: minimumRevenue ? toHalalas(minimumRevenue) : 0,
            minimumCases: minimumCases || 0,
            effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            isDefault: isDefault || false,
            incomeAccountId,
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
        const priceLevel = await PriceLevel.findOne({
            _id: req.params.id,
            lawyerId: req.user._id
        });

        if (!priceLevel) {
            return res.status(404).json({ success: false, message: 'Price level not found' });
        }

        const allowedUpdates = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'pricingType', 'percentageAdjustment', 'fixedAdjustment',
            'customRates', 'priority', 'minimumRevenue', 'minimumCases',
            'effectiveDate', 'expiryDate', 'isActive', 'isDefault',
            'incomeAccountId'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'fixedAdjustment' || field === 'minimumRevenue') {
                    priceLevel[field] = toHalalas(req.body[field]);
                } else if (field === 'customRates') {
                    priceLevel.customRates = req.body.customRates?.map(rate => ({
                        ...rate,
                        hourlyRate: rate.hourlyRate ? toHalalas(rate.hourlyRate) : undefined,
                        flatFee: rate.flatFee ? toHalalas(rate.flatFee) : undefined,
                        minimumFee: rate.minimumFee ? toHalalas(rate.minimumFee) : undefined
                    }));
                } else {
                    priceLevel[field] = req.body[field];
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
        const priceLevel = await PriceLevel.findOne({
            _id: req.params.id,
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

        if (!clientId || !baseRate) {
            return res.status(400).json({
                success: false,
                message: 'clientId and baseRate are required'
            });
        }

        const baseRateHalalas = toHalalas(parseFloat(baseRate));
        const effectiveRate = await PriceLevel.getEffectiveRate(
            lawyerId,
            clientId,
            baseRateHalalas,
            serviceType
        );

        const priceLevel = await PriceLevel.getBestPriceLevel(lawyerId, clientId);

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
        const priceLevel = await PriceLevel.findOne({
            _id: req.params.id,
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
