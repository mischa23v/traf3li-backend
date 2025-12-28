/**
 * Product/Service Model
 * Security: Multi-tenant isolation with firmId
 *
 * Used for managing legal services and products in the CRM for quoting
 */

const mongoose = require('mongoose');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const productSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (REQUIRED)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // AUTO-GENERATED ID
    // ═══════════════════════════════════════════════════════════════
    productId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFORMATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    code: {
        type: String,
        trim: true,
        maxlength: 50,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['service', 'product', 'subscription', 'retainer', 'hourly'],
        required: true,
        default: 'service',
        index: true
    },
    category: {
        type: String,
        trim: true,
        maxlength: 100,
        index: true
    },
    practiceArea: {
        type: String,
        trim: true,
        maxlength: 100,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PRICING
    // ═══════════════════════════════════════════════════════════════
    pricing: {
        // Base price in halalas (smallest currency unit)
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        currency: {
            type: String,
            default: 'SAR',
            maxlength: 3
        },
        priceType: {
            type: String,
            enum: ['fixed', 'per_hour', 'per_day', 'per_month', 'per_year', 'custom'],
            default: 'fixed'
        },
        minPrice: {
            type: Number,
            min: 0
        },
        maxPrice: {
            type: Number,
            min: 0
        },
        taxRate: {
            type: Number,
            default: 15,
            min: 0,
            max: 100
        },
        taxInclusive: {
            type: Boolean,
            default: false
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RECURRING BILLING
    // ═══════════════════════════════════════════════════════════════
    recurring: {
        isRecurring: {
            type: Boolean,
            default: false
        },
        interval: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'yearly', null],
            default: null
        },
        intervalCount: {
            type: Number,
            min: 1,
            default: 1
        },
        trialDays: {
            type: Number,
            min: 0,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // HOURLY BILLING
    // ═══════════════════════════════════════════════════════════════
    hourly: {
        defaultHours: {
            type: Number,
            min: 0
        },
        ratePerHour: {
            type: Number,
            min: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL PROPERTIES
    // ═══════════════════════════════════════════════════════════════
    unit: {
        type: String,
        enum: ['hour', 'day', 'session', 'case', 'month', 'year', 'unit', 'other'],
        default: 'unit'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isTaxable: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        timesQuoted: {
            type: Number,
            default: 0,
            min: 0
        },
        timesSold: {
            type: Number,
            default: 0,
            min: 0
        },
        totalRevenue: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MEDIA & TAGS
    // ═══════════════════════════════════════════════════════════════
    images: [{
        type: String,
        maxlength: 500
    }],
    tags: [{
        type: String,
        maxlength: 50
    }],

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform: (doc, ret) => {
            // Remove internal fields from JSON output
            delete ret.__v;
            return ret;
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
productSchema.index({ firmId: 1, name: 1 });
productSchema.index({ firmId: 1, type: 1 });
productSchema.index({ firmId: 1, category: 1 });
productSchema.index({ firmId: 1, practiceArea: 1 });
productSchema.index({ firmId: 1, isActive: 1 });
productSchema.index({ firmId: 1, code: 1 });
productSchema.index({ firmId: 1, 'pricing.unitPrice': 1 });
productSchema.index({ firmId: 1, createdAt: -1 });

// Text index for search
productSchema.index({
    name: 'text',
    nameAr: 'text',
    description: 'text',
    descriptionAr: 'text',
    code: 'text',
    tags: 'text'
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOK - AUTO-GENERATE PRODUCT ID
// ═══════════════════════════════════════════════════════════════
productSchema.pre('save', async function(next) {
    // Generate product ID if new
    if (!this.productId && this.isNew) {
        const Counter = require('./counter.model');
        const counterId = `product_${this.firmId}`;
        const seq = await Counter.getNextSequence(counterId);
        this.productId = `PROD-${String(seq).padStart(4, '0')}`;
    }

    // Validate pricing ranges
    if (this.pricing.minPrice && this.pricing.maxPrice) {
        if (this.pricing.minPrice > this.pricing.maxPrice) {
            const error = new Error('Minimum price cannot be greater than maximum price');
            return next(error);
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get products with filters
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @param {object} filters - Filter options
 * @returns {Promise<Array>} - Products
 */
productSchema.statics.getProducts = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId: new mongoose.Types.ObjectId(firmId) };

    // Filter by type
    if (filters.type) {
        const validTypes = ['service', 'product', 'subscription', 'retainer', 'hourly'];
        if (validTypes.includes(filters.type)) {
            query.type = filters.type;
        }
    }

    // Filter by category
    if (filters.category) {
        query.category = filters.category;
    }

    // Filter by practice area
    if (filters.practiceArea) {
        query.practiceArea = filters.practiceArea;
    }

    // Filter by active status
    if (typeof filters.isActive === 'boolean') {
        query.isActive = filters.isActive;
    }

    // Search filter with escaped regex
    if (filters.search) {
        const searchRegex = new RegExp(escapeRegex(filters.search), 'i');
        query.$or = [
            { name: searchRegex },
            { nameAr: searchRegex },
            { code: searchRegex },
            { description: searchRegex },
            { descriptionAr: searchRegex }
        ];
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
        query['pricing.unitPrice'] = {};
        if (filters.minPrice) query['pricing.unitPrice'].$gte = parseInt(filters.minPrice);
        if (filters.maxPrice) query['pricing.unitPrice'].$lte = parseInt(filters.maxPrice);
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Sort
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [products, total] = await Promise.all([
        this.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        products,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
    };
};

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @returns {Promise<Object>} - Product
 */
productSchema.statics.getProductById = async function(productId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return this.findOne({
        _id: productId,
        firmId: new mongoose.Types.ObjectId(firmId)
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');
};

/**
 * Search products (text search)
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @param {string} searchText - Search query
 * @param {object} options - Additional options
 * @returns {Promise<Array>} - Products
 */
productSchema.statics.searchProducts = async function(firmId, searchText, options = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        $text: { $search: searchText }
    };

    // Filter by active status
    if (typeof options.isActive === 'boolean') {
        query.isActive = options.isActive;
    }

    const limit = Math.min(parseInt(options.limit) || 20, 100);

    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .select('productId name nameAr code type category pricing.unitPrice pricing.currency isActive')
        .lean();
};

/**
 * Get products by category
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @param {string} category - Category name
 * @returns {Promise<Array>} - Products
 */
productSchema.statics.getProductsByCategory = async function(firmId, category) {
    if (!firmId) throw new Error('firmId is required');

    return this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        category,
        isActive: true
    })
        .sort({ name: 1 })
        .select('productId name nameAr code pricing.unitPrice pricing.currency type')
        .lean();
};

/**
 * Update product statistics
 * @param {string} productId - Product ID
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @param {object} stats - Stats to update
 * @returns {Promise<Object>} - Updated product
 */
productSchema.statics.updateStats = async function(productId, firmId, stats) {
    if (!firmId) throw new Error('firmId is required');

    const update = {};
    if (stats.incrementQuoted) update.$inc = { ...update.$inc, 'stats.timesQuoted': 1 };
    if (stats.incrementSold) update.$inc = { ...update.$inc, 'stats.timesSold': 1 };
    if (stats.addRevenue) update.$inc = { ...update.$inc, 'stats.totalRevenue': stats.addRevenue };

    return this.findOneAndUpdate(
        {
            _id: productId,
            firmId: new mongoose.Types.ObjectId(firmId)
        },
        update,
        { new: true }
    );
};

/**
 * Get product statistics summary
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @param {object} filters - Filter options
 * @returns {Promise<Object>} - Statistics summary
 */
productSchema.statics.getStatsSummary = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (filters.type) matchStage.type = filters.type;
    if (filters.category) matchStage.category = filters.category;
    if (typeof filters.isActive === 'boolean') matchStage.isActive = filters.isActive;

    const summary = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalQuotes: { $sum: '$stats.timesQuoted' },
                totalSales: { $sum: '$stats.timesSold' },
                totalRevenue: { $sum: '$stats.totalRevenue' },
                avgPrice: { $avg: '$pricing.unitPrice' }
            }
        }
    ]);

    const byType = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$stats.totalRevenue' }
            }
        }
    ]);

    const byCategory = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$stats.totalRevenue' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    return {
        summary: summary[0] || {
            totalProducts: 0,
            totalQuotes: 0,
            totalSales: 0,
            totalRevenue: 0,
            avgPrice: 0
        },
        byType,
        byCategory
    };
};

module.exports = mongoose.model('Product', productSchema);
