/**
 * Price Levels Extended Routes
 *
 * Extended price level operations - calculations, assignments, clients.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:id/calculate           - Calculate price for items
 * - POST /:id/assign              - Assign price level to clients
 * - GET /:id/clients              - Get clients with this price level
 * - POST /:id/duplicate           - Duplicate price level
 * - POST /:id/apply-discount      - Apply discount to price level
 * - GET /:id/usage-stats          - Get usage statistics
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const Client = require('../models/client.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

/**
 * POST /:id/calculate - Calculate price for items
 */
router.post('/:id/calculate', async (req, res, next) => {
    try {
        const priceLevelId = sanitizeObjectId(req.params.id, 'id');
        const { items, currency = 'SAR' } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw CustomException('Items array is required', 400);
        }

        if (items.length > 100) {
            throw CustomException('Maximum 100 items per calculation', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('settings.priceLevels products').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const priceLevel = (firm.settings?.priceLevels || []).find(
            p => p._id?.toString() === priceLevelId.toString()
        );

        if (!priceLevel) {
            throw CustomException('Price level not found', 404);
        }

        const products = firm.products || [];
        const productMap = {};
        products.forEach(p => {
            productMap[p._id?.toString()] = p;
        });

        // Calculate prices
        const calculations = items.map(item => {
            const product = productMap[item.productId];
            if (!product) {
                return {
                    productId: item.productId,
                    error: 'Product not found',
                    calculatedPrice: 0
                };
            }

            const basePrice = product.price || 0;
            let calculatedPrice = basePrice;

            // Apply price level rules
            if (priceLevel.type === 'percentage') {
                calculatedPrice = basePrice * (1 - (priceLevel.discountPercentage || 0) / 100);
            } else if (priceLevel.type === 'fixed') {
                // Check for product-specific pricing
                const productPricing = (priceLevel.productPrices || []).find(
                    pp => pp.productId?.toString() === item.productId
                );
                if (productPricing) {
                    calculatedPrice = productPricing.price;
                }
            } else if (priceLevel.type === 'markup') {
                const cost = product.cost || basePrice * 0.6; // Assume 60% cost if not specified
                calculatedPrice = cost * (1 + (priceLevel.markupPercentage || 0) / 100);
            }

            const quantity = item.quantity || 1;
            const lineTotal = calculatedPrice * quantity;

            return {
                productId: item.productId,
                productName: product.name,
                basePrice,
                calculatedPrice: Math.round(calculatedPrice * 100) / 100,
                quantity,
                lineTotal: Math.round(lineTotal * 100) / 100,
                discountApplied: Math.round((basePrice - calculatedPrice) * 100) / 100,
                discountPercentage: basePrice > 0
                    ? Math.round((1 - calculatedPrice / basePrice) * 10000) / 100
                    : 0
            };
        });

        const validCalculations = calculations.filter(c => !c.error);
        const subtotal = validCalculations.reduce((s, c) => s + c.lineTotal, 0);
        const totalDiscount = validCalculations.reduce((s, c) => s + (c.discountApplied * c.quantity), 0);

        res.json({
            success: true,
            data: {
                priceLevelId,
                priceLevelName: priceLevel.name,
                currency,
                items: calculations,
                summary: {
                    subtotal: Math.round(subtotal * 100) / 100,
                    totalDiscount: Math.round(totalDiscount * 100) / 100,
                    itemCount: validCalculations.length,
                    errorCount: calculations.filter(c => c.error).length
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/assign - Assign price level to clients
 */
router.post('/:id/assign', async (req, res, next) => {
    try {
        const priceLevelId = sanitizeObjectId(req.params.id, 'id');
        const { clientIds, removeExisting } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            throw CustomException('Client IDs array is required', 400);
        }

        if (clientIds.length > 50) {
            throw CustomException('Maximum 50 clients per assignment', 400);
        }

        const safeClientIds = clientIds.map(id => sanitizeObjectId(id, 'clientId'));

        // Verify price level exists
        const firm = await Firm.findOne(req.firmQuery).select('settings.priceLevels').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const priceLevel = (firm.settings?.priceLevels || []).find(
            p => p._id?.toString() === priceLevelId.toString()
        );

        if (!priceLevel) {
            throw CustomException('Price level not found', 404);
        }

        // Update clients
        const result = await Client.updateMany(
            { _id: { $in: safeClientIds }, ...req.firmQuery },
            { $set: { priceLevelId: priceLevelId, priceLevelUpdatedAt: new Date() } }
        );

        res.json({
            success: true,
            message: `Price level assigned to ${result.modifiedCount} client(s)`,
            data: {
                priceLevelId,
                priceLevelName: priceLevel.name,
                clientsUpdated: result.modifiedCount,
                clientsMatched: result.matchedCount
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/clients - Get clients with this price level
 */
router.get('/:id/clients', async (req, res, next) => {
    try {
        const priceLevelId = sanitizeObjectId(req.params.id, 'id');
        const { page, limit } = sanitizePagination(req.query);

        // Verify price level exists
        const firm = await Firm.findOne(req.firmQuery).select('settings.priceLevels').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const priceLevel = (firm.settings?.priceLevels || []).find(
            p => p._id?.toString() === priceLevelId.toString()
        );

        if (!priceLevel) {
            throw CustomException('Price level not found', 404);
        }

        // Get clients
        const query = { ...req.firmQuery, priceLevelId };
        const total = await Client.countDocuments(query);

        const clients = await Client.find(query)
            .select('name email phone company status priceLevelUpdatedAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ name: 1 })
            .lean();

        res.json({
            success: true,
            data: {
                priceLevelId,
                priceLevelName: priceLevel.name,
                clients
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/duplicate - Duplicate price level
 */
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const priceLevelId = sanitizeObjectId(req.params.id, 'id');
        const { newName, adjustPercentage } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('settings.priceLevels');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const sourceLevel = (firm.settings?.priceLevels || []).find(
            p => p._id?.toString() === priceLevelId.toString()
        );

        if (!sourceLevel) {
            throw CustomException('Price level not found', 404);
        }

        const name = newName || `${sourceLevel.name} (Copy)`;

        // Check for duplicate name
        const existing = firm.settings.priceLevels.find(
            p => p.name?.toLowerCase() === name.toLowerCase()
        );

        if (existing) {
            throw CustomException('A price level with this name already exists', 400);
        }

        // Create duplicate
        const duplicate = {
            _id: new mongoose.Types.ObjectId(),
            name,
            description: sourceLevel.description,
            type: sourceLevel.type,
            discountPercentage: sourceLevel.discountPercentage,
            markupPercentage: sourceLevel.markupPercentage,
            productPrices: (sourceLevel.productPrices || []).map(pp => ({
                ...pp,
                _id: new mongoose.Types.ObjectId(),
                // Apply adjustment if specified
                price: adjustPercentage
                    ? Math.round(pp.price * (1 + adjustPercentage / 100) * 100) / 100
                    : pp.price
            })),
            isActive: true,
            isDefault: false,
            createdBy: req.userID,
            createdAt: new Date()
        };

        // Apply percentage adjustment to discount/markup if specified
        if (adjustPercentage) {
            if (duplicate.discountPercentage) {
                duplicate.discountPercentage = Math.max(0, Math.min(100,
                    duplicate.discountPercentage + adjustPercentage
                ));
            }
            if (duplicate.markupPercentage) {
                duplicate.markupPercentage = Math.max(0,
                    duplicate.markupPercentage + adjustPercentage
                );
            }
        }

        firm.settings.priceLevels.push(duplicate);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Price level duplicated',
            data: duplicate
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/apply-discount - Apply discount to price level
 */
router.post('/:id/apply-discount', async (req, res, next) => {
    try {
        const priceLevelId = sanitizeObjectId(req.params.id, 'id');
        const { discountPercentage, discountType = 'additional', productIds } = req.body;

        if (discountPercentage === undefined || discountPercentage < 0 || discountPercentage > 100) {
            throw CustomException('Valid discount percentage (0-100) is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('settings.priceLevels');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const priceLevel = (firm.settings?.priceLevels || []).find(
            p => p._id?.toString() === priceLevelId.toString()
        );

        if (!priceLevel) {
            throw CustomException('Price level not found', 404);
        }

        let updatedCount = 0;

        if (productIds && Array.isArray(productIds) && productIds.length > 0) {
            // Apply to specific products
            const safeProductIds = new Set(productIds.map(id => sanitizeObjectId(id, 'productId').toString()));

            (priceLevel.productPrices || []).forEach(pp => {
                if (safeProductIds.has(pp.productId?.toString())) {
                    if (discountType === 'replace') {
                        pp.discountPercentage = discountPercentage;
                    } else {
                        // Additional discount
                        const currentDiscount = pp.discountPercentage || 0;
                        pp.discountPercentage = Math.min(100, currentDiscount + discountPercentage);
                    }
                    updatedCount++;
                }
            });
        } else {
            // Apply to entire price level
            if (discountType === 'replace') {
                priceLevel.discountPercentage = discountPercentage;
            } else {
                const currentDiscount = priceLevel.discountPercentage || 0;
                priceLevel.discountPercentage = Math.min(100, currentDiscount + discountPercentage);
            }
            updatedCount = 1;
        }

        priceLevel.lastDiscountApplied = {
            percentage: discountPercentage,
            type: discountType,
            appliedAt: new Date(),
            appliedBy: req.userID
        };

        await firm.save();

        res.json({
            success: true,
            message: 'Discount applied',
            data: {
                priceLevelId,
                discountApplied: discountPercentage,
                discountType,
                itemsUpdated: updatedCount,
                currentDiscount: priceLevel.discountPercentage
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/usage-stats - Get usage statistics
 */
router.get('/:id/usage-stats', async (req, res, next) => {
    try {
        const priceLevelId = sanitizeObjectId(req.params.id, 'id');
        const { period = '30d' } = req.query;

        // Verify price level exists
        const firm = await Firm.findOne(req.firmQuery).select('settings.priceLevels').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const priceLevel = (firm.settings?.priceLevels || []).find(
            p => p._id?.toString() === priceLevelId.toString()
        );

        if (!priceLevel) {
            throw CustomException('Price level not found', 404);
        }

        // Count clients using this price level
        const clientCount = await Client.countDocuments({
            ...req.firmQuery,
            priceLevelId
        });

        // Get recent client additions
        let cutoffDate = new Date();
        const days = parseInt(period) || 30;
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const recentClients = await Client.countDocuments({
            ...req.firmQuery,
            priceLevelId,
            priceLevelUpdatedAt: { $gte: cutoffDate }
        });

        res.json({
            success: true,
            data: {
                priceLevelId,
                priceLevelName: priceLevel.name,
                stats: {
                    totalClients: clientCount,
                    recentAssignments: recentClients,
                    period: `Last ${days} days`,
                    isDefault: priceLevel.isDefault || false,
                    isActive: priceLevel.isActive !== false,
                    productPricesCount: (priceLevel.productPrices || []).length,
                    discountPercentage: priceLevel.discountPercentage || 0,
                    markupPercentage: priceLevel.markupPercentage || 0
                },
                lastModified: priceLevel.updatedAt || priceLevel.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
