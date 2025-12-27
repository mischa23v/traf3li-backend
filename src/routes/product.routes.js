/**
 * Product/Service Routes
 *
 * All routes are protected with userMiddleware for authentication
 * and multi-tenant isolation
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductsByCategory,
    bulkUpdatePrices,
    getStats
} = require('../controllers/product.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES!)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/products/stats
 * Get product statistics summary
 */
router.get('/stats', userMiddleware, getStats);

/**
 * GET /api/products/search
 * Search products using text search
 * Query params: q (search query), isActive, limit
 */
router.get('/search', userMiddleware, searchProducts);

/**
 * GET /api/products/category/:category
 * Get products by category
 */
router.get('/category/:category', userMiddleware, getProductsByCategory);

/**
 * PUT /api/products/bulk-prices
 * Bulk update product prices
 * Body: { updates: [{ productId, unitPrice }, ...] }
 */
router.put('/bulk-prices', userMiddleware, bulkUpdatePrices);

// ═══════════════════════════════════════════════════════════════
// PRODUCT CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/products
 * Get all products with filters
 * Query params: type, category, practiceArea, isActive, search, minPrice, maxPrice, page, limit, sortBy, sortOrder
 */
router.get('/', userMiddleware, getProducts);

/**
 * POST /api/products
 * Create a new product/service
 * Body: { name, type, pricing, ... }
 */
router.post('/', userMiddleware, createProduct);

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', userMiddleware, getProductById);

/**
 * PUT /api/products/:id
 * Update a product/service
 * Body: { name, pricing, ... }
 */
router.put('/:id', userMiddleware, updateProduct);

/**
 * DELETE /api/products/:id
 * Delete a product/service
 */
router.delete('/:id', userMiddleware, deleteProduct);

module.exports = router;
