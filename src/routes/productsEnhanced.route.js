/**
 * Products Enhanced Routes
 *
 * Extended routes for products at /api/products/enhanced
 * Adds variants, barcodes, cost pricing, margins
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ALLOWED_PRODUCT_FIELDS = [
    'name', 'nameAr', 'sku', 'description', 'descriptionAr', 'category',
    'subcategory', 'brand', 'unit', 'costPrice', 'sellingPrice', 'taxRate',
    'weight', 'dimensions', 'images', 'isActive', 'minStock', 'maxStock',
    'reorderPoint', 'leadTime', 'supplier', 'attributes'
];

const ALLOWED_VARIANT_FIELDS = [
    'name', 'sku', 'costPrice', 'sellingPrice', 'attributes', 'images',
    'weight', 'dimensions', 'isActive', 'stock'
];

/**
 * GET /api/products/enhanced
 * List enhanced products with full details
 */
router.get('/', async (req, res) => {
    try {
        const { search, category, isActive, hasVariants, minPrice, maxPrice } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery };

        if (typeof isActive === 'string') {
            query.isActive = isActive === 'true';
        }

        if (category) {
            query.category = category;
        }

        if (hasVariants === 'true') {
            query['variants.0'] = { $exists: true };
        }

        if (minPrice) {
            query.sellingPrice = { ...query.sellingPrice, $gte: parseFloat(minPrice) };
        }

        if (maxPrice) {
            query.sellingPrice = { ...query.sellingPrice, $lte: parseFloat(maxPrice) };
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            query.$or = [
                { name: searchRegex },
                { nameAr: searchRegex },
                { sku: searchRegex },
                { 'variants.sku': searchRegex }
            ];
        }

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('category', 'name nameAr')
                .populate('supplier', 'name'),
            Product.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: products.length,
            data: products,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/products/enhanced/:productId
 * Get single enhanced product with full details
 */
router.get('/:productId', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const product = await Product.findOne({ _id: sanitizedId, ...req.firmQuery })
            .populate('category', 'name nameAr')
            .populate('supplier', 'name')
            .populate('variants.supplier', 'name');

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.json({ success: true, data: product });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/products/enhanced
 * Create enhanced product
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_PRODUCT_FIELDS);

        if (!allowedFields.name || !allowedFields.sku) {
            throw CustomException('Name and SKU are required', 400);
        }

        // Check for duplicate SKU
        const existing = await Product.findOne({
            sku: allowedFields.sku,
            ...req.firmQuery
        });

        if (existing) {
            throw CustomException('Product with this SKU already exists', 400);
        }

        const product = new Product(req.addFirmId({
            ...allowedFields,
            createdBy: req.userID
        }));

        await product.save();

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/products/enhanced/:productId
 * Update enhanced product
 */
router.put('/:productId', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_PRODUCT_FIELDS);

        const product = await Product.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedAt: new Date(),
                    updatedBy: req.userID
                }
            },
            { new: true }
        );

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/products/enhanced/:productId
 * Delete enhanced product
 */
router.delete('/:productId', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const product = await Product.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/products/enhanced/:productId/cost-price
 * Update cost price
 */
router.patch('/:productId/cost-price', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const { costPrice, effectiveDate, reason } = req.body;

        if (typeof costPrice !== 'number' || costPrice < 0) {
            throw CustomException('Valid cost price is required', 400);
        }

        const product = await Product.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!product) {
            throw CustomException('Product not found', 404);
        }

        const oldCostPrice = product.costPrice;

        await Product.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: { costPrice, costPriceUpdatedAt: new Date() },
                $push: {
                    costPriceHistory: {
                        oldPrice: oldCostPrice,
                        newPrice: costPrice,
                        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
                        reason,
                        changedAt: new Date(),
                        changedBy: req.userID
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Cost price updated',
            data: { oldPrice: oldCostPrice, newPrice: costPrice }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/products/enhanced/:productId/margin
 * Get product margin analysis
 */
router.get('/:productId/margin', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const product = await Product.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).select('name sku costPrice sellingPrice taxRate');

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        const costPrice = product.costPrice || 0;
        const sellingPrice = product.sellingPrice || 0;
        const taxRate = product.taxRate || 0;

        const grossMargin = sellingPrice - costPrice;
        const grossMarginPercent = sellingPrice > 0
            ? ((grossMargin / sellingPrice) * 100)
            : 0;

        const markup = costPrice > 0
            ? ((grossMargin / costPrice) * 100)
            : 0;

        const netSellingPrice = sellingPrice / (1 + taxRate / 100);
        const netMargin = netSellingPrice - costPrice;

        return res.json({
            success: true,
            data: {
                product: {
                    name: product.name,
                    sku: product.sku
                },
                pricing: {
                    costPrice,
                    sellingPrice,
                    taxRate
                },
                margins: {
                    grossMargin: Math.round(grossMargin * 100) / 100,
                    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
                    markup: Math.round(markup * 100) / 100,
                    netMargin: Math.round(netMargin * 100) / 100
                }
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/products/enhanced/bulk-update-prices
 * Bulk update product prices
 */
router.post('/bulk-update-prices', async (req, res) => {
    try {
        const { updates, updateType } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            throw CustomException('Array of updates is required', 400);
        }

        if (updates.length > 100) {
            throw CustomException('Maximum 100 products per bulk update', 400);
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
            try {
                const sanitizedId = sanitizeObjectId(update.productId);
                if (!sanitizedId) {
                    throw new Error('Invalid product ID');
                }

                const updateData = {};

                if (updateType === 'percentage') {
                    const product = await Product.findOne({
                        _id: sanitizedId,
                        ...req.firmQuery
                    }).select('costPrice sellingPrice');

                    if (!product) {
                        throw new Error('Product not found');
                    }

                    if (update.costPriceChange) {
                        updateData.costPrice = product.costPrice * (1 + update.costPriceChange / 100);
                    }
                    if (update.sellingPriceChange) {
                        updateData.sellingPrice = product.sellingPrice * (1 + update.sellingPriceChange / 100);
                    }
                } else {
                    if (update.costPrice !== undefined) updateData.costPrice = update.costPrice;
                    if (update.sellingPrice !== undefined) updateData.sellingPrice = update.sellingPrice;
                }

                await Product.findOneAndUpdate(
                    { _id: sanitizedId, ...req.firmQuery },
                    {
                        $set: {
                            ...updateData,
                            priceUpdatedAt: new Date(),
                            priceUpdatedBy: req.userID
                        }
                    }
                );

                results.push({ productId: sanitizedId, success: true });
            } catch (error) {
                errors.push({ productId: update.productId, success: false, error: error.message });
            }
        }

        return res.json({
            success: true,
            message: `Updated ${results.length} products, ${errors.length} failed`,
            data: { updated: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/products/enhanced/:productId/variants
 * Get product variants
 */
router.get('/:productId/variants', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const product = await Product.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).select('name sku variants');

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.json({
            success: true,
            count: product.variants?.length || 0,
            data: product.variants || []
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/products/enhanced/:productId/variants/:variantId
 * Get single variant
 */
router.get('/:productId/variants/:variantId', async (req, res) => {
    try {
        const productId = sanitizeObjectId(req.params.productId);
        const variantId = sanitizeObjectId(req.params.variantId);

        if (!productId || !variantId) {
            throw CustomException('Invalid ID format', 400);
        }

        const product = await Product.findOne({
            _id: productId,
            ...req.firmQuery,
            'variants._id': variantId
        }).select('name sku variants');

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            throw CustomException('Variant not found', 404);
        }

        return res.json({
            success: true,
            data: variant
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/products/enhanced/:productId/variants
 * Add variant to product
 */
router.post('/:productId/variants', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_VARIANT_FIELDS);

        if (!allowedFields.sku) {
            throw CustomException('Variant SKU is required', 400);
        }

        const variantId = new mongoose.Types.ObjectId();
        const variant = {
            _id: variantId,
            ...allowedFields,
            createdAt: new Date(),
            createdBy: req.userID
        };

        const product = await Product.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $push: { variants: variant } },
            { new: true }
        );

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.status(201).json({
            success: true,
            message: 'Variant added',
            data: variant
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/products/enhanced/:productId/variants/:variantId
 * Update variant
 */
router.put('/:productId/variants/:variantId', async (req, res) => {
    try {
        const productId = sanitizeObjectId(req.params.productId);
        const variantId = sanitizeObjectId(req.params.variantId);

        if (!productId || !variantId) {
            throw CustomException('Invalid ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_VARIANT_FIELDS);

        const result = await Product.findOneAndUpdate(
            {
                _id: productId,
                ...req.firmQuery,
                'variants._id': variantId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`variants.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'variants.$.updatedAt': new Date(),
                    'variants.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Product or variant not found', 404);
        }

        return res.json({
            success: true,
            message: 'Variant updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/products/enhanced/:productId/variants/:variantId
 * Delete variant
 */
router.delete('/:productId/variants/:variantId', async (req, res) => {
    try {
        const productId = sanitizeObjectId(req.params.productId);
        const variantId = sanitizeObjectId(req.params.variantId);

        if (!productId || !variantId) {
            throw CustomException('Invalid ID format', 400);
        }

        await Product.findOneAndUpdate(
            { _id: productId, ...req.firmQuery },
            { $pull: { variants: { _id: variantId } } }
        );

        return res.json({
            success: true,
            message: 'Variant deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/products/enhanced/:productId/variants/generate
 * Generate variants from attributes
 */
router.post('/:productId/variants/generate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const { attributes, basePrice, skuPrefix } = req.body;

        if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
            throw CustomException('Attributes are required', 400);
        }

        const product = await Product.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        // Generate combinations
        const combinations = [];
        const generateCombinations = (attrs, index = 0, current = {}) => {
            if (index === attrs.length) {
                combinations.push({ ...current });
                return;
            }

            const attr = attrs[index];
            for (const value of attr.values) {
                current[attr.name] = value;
                generateCombinations(attrs, index + 1, current);
            }
        };

        generateCombinations(attributes);

        // Create variants
        const variants = combinations.map((combo, i) => {
            const attrString = Object.values(combo).join('-');
            return {
                _id: new mongoose.Types.ObjectId(),
                name: `${product.name} - ${attrString}`,
                sku: `${skuPrefix || product.sku}-${i + 1}`,
                attributes: combo,
                costPrice: basePrice?.costPrice || product.costPrice,
                sellingPrice: basePrice?.sellingPrice || product.sellingPrice,
                isActive: true,
                createdAt: new Date(),
                createdBy: req.userID
            };
        });

        await Product.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $push: { variants: { $each: variants } } }
        );

        return res.status(201).json({
            success: true,
            message: `Generated ${variants.length} variants`,
            data: variants
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/products/enhanced/:productId/barcodes
 * Get product barcodes
 */
router.get('/:productId/barcodes', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const product = await Product.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).select('name sku barcodes');

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.json({
            success: true,
            count: product.barcodes?.length || 0,
            data: product.barcodes || []
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/products/enhanced/:productId/barcodes
 * Add barcode to product
 */
router.post('/:productId/barcodes', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.productId);
        if (!sanitizedId) {
            throw CustomException('Invalid product ID format', 400);
        }

        const { barcode, type, isPrimary } = req.body;

        if (!barcode) {
            throw CustomException('Barcode is required', 400);
        }

        const barcodeId = new mongoose.Types.ObjectId();
        const barcodeData = {
            _id: barcodeId,
            code: barcode,
            type: type || 'EAN13',
            isPrimary: isPrimary || false,
            createdAt: new Date(),
            createdBy: req.userID
        };

        // If setting as primary, unset other primaries
        if (isPrimary) {
            await Product.findOneAndUpdate(
                { _id: sanitizedId, ...req.firmQuery },
                { $set: { 'barcodes.$[].isPrimary': false } }
            );
        }

        const product = await Product.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $push: { barcodes: barcodeData } },
            { new: true }
        );

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        return res.status(201).json({
            success: true,
            message: 'Barcode added',
            data: barcodeData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/products/enhanced/:productId/barcodes/:barcodeId
 * Delete barcode
 */
router.delete('/:productId/barcodes/:barcodeId', async (req, res) => {
    try {
        const productId = sanitizeObjectId(req.params.productId);
        const barcodeId = sanitizeObjectId(req.params.barcodeId);

        if (!productId || !barcodeId) {
            throw CustomException('Invalid ID format', 400);
        }

        await Product.findOneAndUpdate(
            { _id: productId, ...req.firmQuery },
            { $pull: { barcodes: { _id: barcodeId } } }
        );

        return res.json({
            success: true,
            message: 'Barcode deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/products/enhanced/lookup/barcode
 * Lookup product by barcode
 */
router.get('/lookup/barcode', async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            throw CustomException('Barcode is required', 400);
        }

        const product = await Product.findOne({
            ...req.firmQuery,
            $or: [
                { 'barcodes.code': code },
                { sku: code },
                { 'variants.sku': code },
                { 'variants.barcodes.code': code }
            ]
        });

        if (!product) {
            throw CustomException('Product not found', 404);
        }

        // Check if it's a variant
        const variant = product.variants?.find(v =>
            v.sku === code || v.barcodes?.some(b => b.code === code)
        );

        return res.json({
            success: true,
            data: {
                product,
                variant: variant || null,
                matchedBy: variant ? 'variant' : 'product'
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
