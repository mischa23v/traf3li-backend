/**
 * Product/Service Controller
 *
 * Security: All operations enforce multi-tenant isolation via firmQuery
 * Used for managing legal services and products for quoting
 */

const Product = require('../models/product.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════
// SECURITY CONSTANTS - ALLOWED FIELDS
// ═══════════════════════════════════════════════════════════════

/**
 * Allowed fields for product creation
 */
const ALLOWED_CREATE_FIELDS = [
    'name',
    'nameAr',
    'code',
    'description',
    'descriptionAr',
    'type',
    'category',
    'practiceArea',
    'pricing',
    'recurring',
    'hourly',
    'unit',
    'isActive',
    'isTaxable',
    'images',
    'tags'
];

/**
 * Allowed fields for product updates
 */
const ALLOWED_UPDATE_FIELDS = [
    'name',
    'nameAr',
    'code',
    'description',
    'descriptionAr',
    'type',
    'category',
    'practiceArea',
    'pricing',
    'recurring',
    'hourly',
    'unit',
    'isActive',
    'isTaxable',
    'images',
    'tags'
];

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate product data
 * @param {object} data - Product data to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
const validateProductData = (data) => {
    // Validate name
    if (data.name !== undefined) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            return {
                valid: false,
                error: 'اسم المنتج/الخدمة مطلوب / Product/Service name is required'
            };
        }
        if (data.name.length > 200) {
            return {
                valid: false,
                error: 'اسم المنتج/الخدمة طويل جداً (الحد الأقصى 200 حرف) / Name too long (max 200 characters)'
            };
        }
    }

    // Validate type
    if (data.type !== undefined) {
        const validTypes = ['service', 'product', 'subscription', 'retainer', 'hourly'];
        if (!validTypes.includes(data.type)) {
            return {
                valid: false,
                error: 'نوع المنتج/الخدمة غير صحيح / Invalid product/service type'
            };
        }
    }

    // Validate pricing if present
    if (data.pricing) {
        if (typeof data.pricing !== 'object') {
            return {
                valid: false,
                error: 'بيانات التسعير غير صحيحة / Invalid pricing data'
            };
        }

        // Validate unitPrice
        if (data.pricing.unitPrice !== undefined) {
            const price = parseFloat(data.pricing.unitPrice);
            if (isNaN(price) || price < 0) {
                return {
                    valid: false,
                    error: 'السعر يجب أن يكون رقماً موجباً / Price must be a positive number'
                };
            }
        }

        // Validate tax rate
        if (data.pricing.taxRate !== undefined) {
            const taxRate = parseFloat(data.pricing.taxRate);
            if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
                return {
                    valid: false,
                    error: 'نسبة الضريبة يجب أن تكون بين 0 و 100 / Tax rate must be between 0 and 100'
                };
            }
        }

        // Validate price range
        if (data.pricing.minPrice !== undefined && data.pricing.maxPrice !== undefined) {
            const minPrice = parseFloat(data.pricing.minPrice);
            const maxPrice = parseFloat(data.pricing.maxPrice);
            if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice > maxPrice) {
                return {
                    valid: false,
                    error: 'الحد الأدنى للسعر لا يمكن أن يكون أكبر من الحد الأقصى / Min price cannot be greater than max price'
                };
            }
        }
    }

    // Validate recurring if present
    if (data.recurring && data.recurring.isRecurring) {
        if (!data.recurring.interval) {
            return {
                valid: false,
                error: 'الفترة الزمنية مطلوبة للخدمات المتكررة / Interval is required for recurring services'
            };
        }
        const validIntervals = ['weekly', 'monthly', 'quarterly', 'yearly'];
        if (!validIntervals.includes(data.recurring.interval)) {
            return {
                valid: false,
                error: 'الفترة الزمنية غير صحيحة / Invalid interval'
            };
        }
    }

    return { valid: true, error: null };
};

// ═══════════════════════════════════════════════════════════════
// CREATE PRODUCT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new product/service
 * @route POST /api/products
 */
exports.createProduct = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Validate product data
        const validation = validateProductData(safeData);
        if (!validation.valid) {
            return res.status(400).json({
                error: true,
                message: validation.error
            });
        }

        // Check if code is unique within firm (if provided)
        if (safeData.code) {
            const existingProduct = await Product.findOne({
                firmId,
                code: safeData.code
            });
            if (existingProduct) {
                return res.status(400).json({
                    error: true,
                    message: 'رمز المنتج/الخدمة موجود بالفعل / Product/Service code already exists'
                });
            }
        }

        // Create product with firm context
        const product = new Product({
            ...safeData,
            firmId,
            createdBy: userId
        });

        await product.save();

        // Populate for response
        await product.populate([
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(201).json({
            error: false,
            message: 'تم إنشاء المنتج/الخدمة بنجاح / Product/Service created successfully',
            data: product
        });
    } catch (error) {
        logger.error('Error creating product:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في إنشاء المنتج/الخدمة / Error creating product/service';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET PRODUCTS (LIST WITH FILTERS)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all products with filters
 * @route GET /api/products
 */
exports.getProducts = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const {
            type,
            category,
            practiceArea,
            isActive,
            search,
            minPrice,
            maxPrice,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Validate type against allowlist if provided
        if (type) {
            const validTypes = ['service', 'product', 'subscription', 'retainer', 'hourly'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: true,
                    message: 'نوع المنتج/الخدمة غير صحيح / Invalid product type'
                });
            }
        }

        // Validate isActive
        let isActiveFilter;
        if (isActive !== undefined) {
            isActiveFilter = isActive === 'true' || isActive === true;
        }

        // Build filters
        const filters = {
            type,
            category,
            practiceArea,
            isActive: isActiveFilter,
            search,
            minPrice,
            maxPrice,
            page,
            limit,
            sortBy,
            sortOrder
        };

        // Use static method with firm isolation
        const result = await Product.getProducts(firmId, filters);

        return res.json({
            error: false,
            data: result.products,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch (error) {
        logger.error('Error getting products:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في جلب المنتجات/الخدمات / Error fetching products/services';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET PRODUCT BY ID
// ═══════════════════════════════════════════════════════════════

/**
 * Get single product by ID
 * @route GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                error: true,
                message: 'معرف المنتج/الخدمة غير صحيح / Invalid product ID'
            });
        }

        // IDOR Protection: Query includes firmQuery
        const product = await Product.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!product) {
            return res.status(404).json({
                error: true,
                message: 'المنتج/الخدمة غير موجود / Product/Service not found'
            });
        }

        return res.json({
            error: false,
            data: product
        });
    } catch (error) {
        logger.error('Error getting product:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في جلب المنتج/الخدمة / Error fetching product/service';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE PRODUCT
// ═══════════════════════════════════════════════════════════════

/**
 * Update a product/service
 * @route PUT /api/products/:id
 */
exports.updateProduct = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                error: true,
                message: 'معرف المنتج/الخدمة غير صحيح / Invalid product ID'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // Validate product data
        const validation = validateProductData(safeData);
        if (!validation.valid) {
            return res.status(400).json({
                error: true,
                message: validation.error
            });
        }

        // Check if code is unique within firm (if being updated)
        if (safeData.code) {
            const existingProduct = await Product.findOne({
                firmId,
                code: safeData.code,
                _id: { $ne: sanitizedId }
            });
            if (existingProduct) {
                return res.status(400).json({
                    error: true,
                    message: 'رمز المنتج/الخدمة موجود بالفعل / Product/Service code already exists'
                });
            }
        }

        // IDOR Protection: Update with firmQuery to prevent unauthorized access
        const product = await Product.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...safeData,
                    updatedBy: userId
                }
            },
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!product) {
            return res.status(404).json({
                error: true,
                message: 'المنتج/الخدمة غير موجود / Product/Service not found'
            });
        }

        return res.json({
            error: false,
            message: 'تم تحديث المنتج/الخدمة بنجاح / Product/Service updated successfully',
            data: product
        });
    } catch (error) {
        logger.error('Error updating product:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في تحديث المنتج/الخدمة / Error updating product/service';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE PRODUCT
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a product/service
 * @route DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                error: true,
                message: 'معرف المنتج/الخدمة غير صحيح / Invalid product ID'
            });
        }

        // IDOR Protection: Delete with firmQuery to prevent unauthorized access
        const product = await Product.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!product) {
            return res.status(404).json({
                error: true,
                message: 'المنتج/الخدمة غير موجود / Product/Service not found'
            });
        }

        return res.json({
            error: false,
            message: 'تم حذف المنتج/الخدمة بنجاح / Product/Service deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting product:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في حذف المنتج/الخدمة / Error deleting product/service';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SEARCH PRODUCTS
// ═══════════════════════════════════════════════════════════════

/**
 * Search products using text search
 * @route GET /api/products/search
 */
exports.searchProducts = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { q, isActive, limit = 20 } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            return res.status(400).json({
                error: true,
                message: 'نص البحث مطلوب / Search query is required'
            });
        }

        // Validate isActive
        let isActiveFilter;
        if (isActive !== undefined) {
            isActiveFilter = isActive === 'true' || isActive === true;
        }

        const options = {
            isActive: isActiveFilter,
            limit
        };

        // Use static method with firm isolation
        const products = await Product.searchProducts(firmId, q, options);

        return res.json({
            error: false,
            data: products
        });
    } catch (error) {
        logger.error('Error searching products:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في البحث / Error searching';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET PRODUCTS BY CATEGORY
// ═══════════════════════════════════════════════════════════════

/**
 * Get products by category
 * @route GET /api/products/category/:category
 */
exports.getProductsByCategory = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { category } = req.params;

        if (!category || typeof category !== 'string') {
            return res.status(400).json({
                error: true,
                message: 'الفئة مطلوبة / Category is required'
            });
        }

        // Use static method with firm isolation
        const products = await Product.getProductsByCategory(firmId, category);

        return res.json({
            error: false,
            data: products
        });
    } catch (error) {
        logger.error('Error getting products by category:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في جلب المنتجات/الخدمات / Error fetching products';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// BULK UPDATE PRICES
// ═══════════════════════════════════════════════════════════════

/**
 * Bulk update product prices
 * @route PUT /api/products/bulk-prices
 */
exports.bulkUpdatePrices = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;
        const { updates } = req.body;

        // Validate updates array
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'قائمة التحديثات مطلوبة / Updates array is required'
            });
        }

        // Limit bulk operations
        if (updates.length > 100) {
            return res.status(400).json({
                error: true,
                message: 'الحد الأقصى 100 عنصر في التحديث الجماعي / Maximum 100 items for bulk update'
            });
        }

        const results = {
            success: [],
            failed: []
        };

        // Process each update
        for (const update of updates) {
            try {
                const sanitizedId = sanitizeObjectId(update.productId);
                if (!sanitizedId) {
                    results.failed.push({
                        productId: update.productId,
                        error: 'Invalid product ID'
                    });
                    continue;
                }

                // Validate new price
                const newPrice = parseFloat(update.unitPrice);
                if (isNaN(newPrice) || newPrice < 0) {
                    results.failed.push({
                        productId: update.productId,
                        error: 'Invalid price'
                    });
                    continue;
                }

                // IDOR Protection: Update with firmQuery
                const product = await Product.findOneAndUpdate(
                    {
                        _id: sanitizedId,
                        firmId
                    },
                    {
                        $set: {
                            'pricing.unitPrice': newPrice,
                            updatedBy: userId
                        }
                    },
                    { new: true }
                );

                if (!product) {
                    results.failed.push({
                        productId: update.productId,
                        error: 'Product not found'
                    });
                } else {
                    results.success.push({
                        productId: product.productId,
                        name: product.name,
                        newPrice
                    });
                }
            } catch (err) {
                results.failed.push({
                    productId: update.productId,
                    error: err.message
                });
            }
        }

        return res.json({
            error: false,
            message: `تم تحديث ${results.success.length} من ${updates.length} منتج/خدمة / Updated ${results.success.length} of ${updates.length} products`,
            data: results
        });
    } catch (error) {
        logger.error('Error bulk updating prices:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في التحديث الجماعي / Error in bulk update';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET STATISTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get product statistics summary
 * @route GET /api/products/stats
 */
exports.getStats = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                error: true,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { type, category, isActive } = req.query;

        // Validate type against allowlist if provided
        if (type) {
            const validTypes = ['service', 'product', 'subscription', 'retainer', 'hourly'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: true,
                    message: 'نوع المنتج/الخدمة غير صحيح / Invalid product type'
                });
            }
        }

        // Validate isActive
        let isActiveFilter;
        if (isActive !== undefined) {
            isActiveFilter = isActive === 'true' || isActive === true;
        }

        const filters = {
            type,
            category,
            isActive: isActiveFilter
        };

        const stats = await Product.getStatsSummary(firmId, filters);

        return res.json({
            error: false,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting product stats:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'خطأ في جلب الإحصائيات / Error fetching statistics';
        return res.status(status).json({
            error: true,
            message
        });
    }
};
