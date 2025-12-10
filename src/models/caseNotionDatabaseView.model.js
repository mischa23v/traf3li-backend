const mongoose = require('mongoose');

// Filter schema for Notion-style filtering
const filterSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    operator: {
        type: String,
        enum: [
            'equals',
            'not_equals',
            'contains',
            'does_not_contain',
            'starts_with',
            'ends_with',
            'is_empty',
            'is_not_empty',
            'greater_than',
            'greater_than_or_equal',
            'less_than',
            'less_than_or_equal',
            'is_within',
            'is_before',
            'is_after',
            'is_on_or_before',
            'is_on_or_after',
            'checkbox_is',
            'checkbox_is_not'
        ],
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed
    },
    conjunction: {
        type: String,
        enum: ['and', 'or'],
        default: 'and'
    }
}, { _id: false });

// Sort schema
const sortSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    direction: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'asc'
    }
}, { _id: false });

// Property configuration schema
const propertySchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    visible: {
        type: Boolean,
        default: true
    },
    width: {
        type: Number,
        default: 150
    },
    order: {
        type: Number,
        required: true
    }
}, { _id: false });

// Group by configuration
const groupBySchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    hideEmpty: {
        type: Boolean,
        default: false
    },
    order: [{
        type: String
    }]
}, { _id: false });

// View-specific configuration schemas
const boardConfigSchema = new mongoose.Schema({
    columnField: {
        type: String,
        required: true,
        trim: true
    },
    showColumnCount: {
        type: Boolean,
        default: true
    },
    cardPreview: {
        type: String,
        enum: ['none', 'small', 'medium', 'large'],
        default: 'medium'
    },
    columnWidth: {
        type: Number,
        default: 300
    }
}, { _id: false });

const timelineConfigSchema = new mongoose.Schema({
    startField: {
        type: String,
        required: true,
        trim: true
    },
    endField: {
        type: String,
        required: true,
        trim: true
    },
    showToday: {
        type: Boolean,
        default: true
    },
    defaultTimespan: {
        type: String,
        enum: ['day', 'week', 'month', 'quarter', 'year'],
        default: 'month'
    },
    colorByField: String
}, { _id: false });

const calendarConfigSchema = new mongoose.Schema({
    dateField: {
        type: String,
        required: true,
        trim: true
    },
    endDateField: String,
    showWeekends: {
        type: Boolean,
        default: true
    },
    defaultView: {
        type: String,
        enum: ['month', 'week', 'day', 'agenda'],
        default: 'month'
    },
    firstDayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        default: 0
    }
}, { _id: false });

const galleryConfigSchema = new mongoose.Schema({
    coverField: String,
    cardSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
    },
    fitStyle: {
        type: String,
        enum: ['cover', 'contain', 'fill'],
        default: 'cover'
    },
    cardsPerRow: {
        type: Number,
        min: 1,
        max: 6,
        default: 3
    }
}, { _id: false });

const chartConfigSchema = new mongoose.Schema({
    chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'donut', 'area', 'scatter'],
        required: true
    },
    xAxis: {
        type: String,
        required: true,
        trim: true
    },
    yAxis: {
        type: String,
        required: true,
        trim: true
    },
    aggregate: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max', 'median'],
        default: 'count'
    },
    groupBy: String,
    showLegend: {
        type: Boolean,
        default: true
    },
    showDataLabels: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const listConfigSchema = new mongoose.Schema({
    compact: {
        type: Boolean,
        default: false
    },
    showPreview: {
        type: Boolean,
        default: true
    },
    previewLines: {
        type: Number,
        default: 2
    }
}, { _id: false });

// Rollup configuration
const rollupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    field: {
        type: String,
        required: true,
        trim: true
    },
    relation: {
        type: String,
        required: true,
        trim: true
    },
    aggregation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max', 'percent_checked', 'percent_unchecked', 'count_unique'],
        required: true
    },
    filterBy: [filterSchema]
}, { _id: false });

// Formula configuration
const formulaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    formula: {
        type: String,
        required: true
    },
    resultType: {
        type: String,
        enum: ['number', 'text', 'date', 'boolean'],
        required: true
    },
    description: String
}, { _id: false });

// Calculation configuration for aggregations
const calculationConfigSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['sum', 'avg', 'count', 'min', 'max', 'median', 'range', 'count_unique', 'percent_empty', 'percent_not_empty'],
        required: true
    }
}, { _id: false });

// Data source configuration
const dataSourceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['tasks', 'documents', 'events', 'reminders', 'custom', 'cases', 'contacts', 'invoices', 'expenses', 'time_entries'],
        required: true
    },
    filters: [filterSchema],
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    customQuery: mongoose.Schema.Types.Mixed
}, { _id: false });

// Main view schema
const caseNotionDatabaseViewSchema = new mongoose.Schema({
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    type: {
        type: String,
        enum: ['table', 'board', 'timeline', 'calendar', 'gallery', 'list', 'chart'],
        required: true,
        index: true
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },
    dataSource: {
        type: dataSourceSchema,
        required: true
    },
    properties: {
        type: [propertySchema],
        default: []
    },
    sorts: {
        type: [sortSchema],
        default: []
    },
    filters: {
        type: [filterSchema],
        default: []
    },
    groupBy: {
        type: groupBySchema,
        default: null
    },
    viewConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    cardProperties: [{
        type: String,
        trim: true
    }],
    rollups: {
        type: [rollupSchema],
        default: []
    },
    formulas: {
        type: [formulaSchema],
        default: []
    },
    wrapCells: {
        type: Boolean,
        default: false
    },
    showCalculations: {
        type: Boolean,
        default: false
    },
    calculationConfig: {
        type: [calculationConfigSchema],
        default: []
    },
    order: {
        type: Number,
        default: 0,
        index: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    sharedWith: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Performance optimization
    cacheEnabled: {
        type: Boolean,
        default: false
    },
    cacheTTL: {
        type: Number,
        default: 300 // 5 minutes in seconds
    },
    lastCached: Date,
    // Access tracking
    lastAccessedAt: Date,
    accessCount: {
        type: Number,
        default: 0
    },
    // View preferences
    preferences: {
        rowHeight: {
            type: String,
            enum: ['compact', 'normal', 'comfortable'],
            default: 'normal'
        },
        fontSize: {
            type: String,
            enum: ['small', 'medium', 'large'],
            default: 'medium'
        },
        showGridLines: {
            type: Boolean,
            default: true
        },
        showRowNumbers: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes for performance
caseNotionDatabaseViewSchema.index({ pageId: 1, order: 1 });
caseNotionDatabaseViewSchema.index({ caseId: 1, type: 1 });
caseNotionDatabaseViewSchema.index({ firmId: 1, type: 1 });
caseNotionDatabaseViewSchema.index({ createdBy: 1, updatedAt: -1 });
caseNotionDatabaseViewSchema.index({ pageId: 1, isDefault: 1 });
caseNotionDatabaseViewSchema.index({ 'dataSource.type': 1 });

// Pre-save middleware
caseNotionDatabaseViewSchema.pre('save', async function(next) {
    // If this view is set as default, unset other defaults for the same page
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            {
                pageId: this.pageId,
                _id: { $ne: this._id }
            },
            { $set: { isDefault: false } }
        );
    }

    // Set order if not specified
    if (this.isNew && !this.order) {
        const maxOrder = await this.constructor.findOne({ pageId: this.pageId })
            .sort({ order: -1 })
            .select('order');
        this.order = maxOrder ? maxOrder.order + 1 : 0;
    }

    next();
});

// Instance Methods

/**
 * Apply filters to data array
 * @param {Array} data - Array of data items to filter
 * @returns {Array} Filtered data
 */
caseNotionDatabaseViewSchema.methods.applyFilters = function(data) {
    if (!this.filters || this.filters.length === 0) {
        return data;
    }

    return data.filter(item => {
        let result = true;
        let orResults = [];

        for (const filter of this.filters) {
            const fieldValue = getNestedValue(item, filter.field);
            const filterMatch = evaluateFilter(fieldValue, filter.operator, filter.value);

            if (filter.conjunction === 'or') {
                orResults.push(filterMatch);
            } else {
                if (!filterMatch && filter.conjunction === 'and') {
                    result = false;
                    break;
                }
            }
        }

        if (orResults.length > 0) {
            result = result && orResults.some(r => r === true);
        }

        return result;
    });
};

/**
 * Apply sorts to data array
 * @param {Array} data - Array of data items to sort
 * @returns {Array} Sorted data
 */
caseNotionDatabaseViewSchema.methods.applySorts = function(data) {
    if (!this.sorts || this.sorts.length === 0) {
        return data;
    }

    return [...data].sort((a, b) => {
        for (const sort of this.sorts) {
            const aValue = getNestedValue(a, sort.field);
            const bValue = getNestedValue(b, sort.field);

            const comparison = compareValues(aValue, bValue);

            if (comparison !== 0) {
                return sort.direction === 'asc' ? comparison : -comparison;
            }
        }
        return 0;
    });
};

/**
 * Group data for board view
 * @param {Array} data - Array of data items to group
 * @returns {Object} Grouped data by field value
 */
caseNotionDatabaseViewSchema.methods.groupData = function(data) {
    if (!this.groupBy) {
        return { ungrouped: data };
    }

    const grouped = {};
    const field = this.groupBy.field;

    data.forEach(item => {
        const value = getNestedValue(item, field) || 'No ' + field;
        const key = String(value);

        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(item);
    });

    // Apply custom order if specified
    if (this.groupBy.order && this.groupBy.order.length > 0) {
        const orderedGrouped = {};
        this.groupBy.order.forEach(key => {
            if (grouped[key]) {
                orderedGrouped[key] = grouped[key];
            }
        });
        // Add any remaining groups not in order
        Object.keys(grouped).forEach(key => {
            if (!orderedGrouped[key]) {
                orderedGrouped[key] = grouped[key];
            }
        });
        return orderedGrouped;
    }

    // Filter out empty groups if configured
    if (this.groupBy.hideEmpty) {
        Object.keys(grouped).forEach(key => {
            if (grouped[key].length === 0) {
                delete grouped[key];
            }
        });
    }

    return grouped;
};

/**
 * Calculate rollup values
 * @param {Array} data - Array of data items
 * @returns {Object} Rollup calculations
 */
caseNotionDatabaseViewSchema.methods.calculateRollups = function(data) {
    const rollupResults = {};

    if (!this.rollups || this.rollups.length === 0) {
        return rollupResults;
    }

    this.rollups.forEach(rollup => {
        const values = data.map(item => getNestedValue(item, rollup.field));

        switch (rollup.aggregation) {
            case 'count':
                rollupResults[rollup.name] = values.length;
                break;
            case 'sum':
                rollupResults[rollup.name] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
                break;
            case 'avg':
                const sum = values.reduce((s, val) => s + (Number(val) || 0), 0);
                rollupResults[rollup.name] = values.length > 0 ? sum / values.length : 0;
                break;
            case 'min':
                rollupResults[rollup.name] = Math.min(...values.filter(v => v != null).map(Number));
                break;
            case 'max':
                rollupResults[rollup.name] = Math.max(...values.filter(v => v != null).map(Number));
                break;
            case 'percent_checked':
                const checked = values.filter(v => v === true).length;
                rollupResults[rollup.name] = values.length > 0 ? (checked / values.length) * 100 : 0;
                break;
            case 'percent_unchecked':
                const unchecked = values.filter(v => v === false).length;
                rollupResults[rollup.name] = values.length > 0 ? (unchecked / values.length) * 100 : 0;
                break;
            case 'count_unique':
                rollupResults[rollup.name] = new Set(values.filter(v => v != null)).size;
                break;
        }
    });

    return rollupResults;
};

/**
 * Evaluate formula fields
 * @param {Array} data - Array of data items
 * @returns {Array} Data with evaluated formulas
 */
caseNotionDatabaseViewSchema.methods.evaluateFormulas = function(data) {
    if (!this.formulas || this.formulas.length === 0) {
        return data;
    }

    return data.map(item => {
        const enhancedItem = { ...item };

        this.formulas.forEach(formula => {
            try {
                // Simple formula evaluation - in production, use a safe expression evaluator
                const result = evaluateFormula(formula.formula, item);
                enhancedItem[formula.name] = result;
            } catch (error) {
                enhancedItem[formula.name] = null;
            }
        });

        return enhancedItem;
    });
};

/**
 * Duplicate this view with a new name
 * @param {String} newName - Name for the duplicated view
 * @returns {Promise<Object>} New view document
 */
caseNotionDatabaseViewSchema.methods.duplicate = async function(newName) {
    const viewData = this.toObject();
    delete viewData._id;
    delete viewData.createdAt;
    delete viewData.updatedAt;
    delete viewData.lastCached;
    delete viewData.lastAccessedAt;
    delete viewData.accessCount;

    viewData.name = newName;
    viewData.isDefault = false;
    viewData.order = this.order + 1;

    const duplicatedView = new this.constructor(viewData);
    await duplicatedView.save();

    return duplicatedView;
};

/**
 * Track view access
 */
caseNotionDatabaseViewSchema.methods.trackAccess = async function() {
    this.lastAccessedAt = new Date();
    this.accessCount = (this.accessCount || 0) + 1;
    await this.save();
};

// Static Methods

/**
 * Get all views for a page
 * @param {ObjectId} pageId - Page ID
 * @returns {Promise<Array>} Array of views
 */
caseNotionDatabaseViewSchema.statics.getPageViews = async function(pageId) {
    return await this.find({ pageId })
        .sort({ order: 1 })
        .populate('createdBy', 'firstName lastName email')
        .populate('sharedWith', 'firstName lastName email');
};

/**
 * Get the default view for a page
 * @param {ObjectId} pageId - Page ID
 * @returns {Promise<Object>} Default view or first view
 */
caseNotionDatabaseViewSchema.statics.getDefaultView = async function(pageId) {
    let defaultView = await this.findOne({ pageId, isDefault: true })
        .populate('createdBy', 'firstName lastName email');

    if (!defaultView) {
        defaultView = await this.findOne({ pageId })
            .sort({ order: 1 })
            .populate('createdBy', 'firstName lastName email');
    }

    return defaultView;
};

/**
 * Execute view - fetch and transform data according to view settings
 * @param {ObjectId} viewId - View ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Transformed data and metadata
 */
caseNotionDatabaseViewSchema.statics.executeView = async function(viewId, options = {}) {
    const view = await this.findById(viewId)
        .populate('createdBy', 'firstName lastName email');

    if (!view) {
        throw new Error('View not found');
    }

    // Track access
    if (!options.skipTracking) {
        await view.trackAccess();
    }

    // Fetch data based on dataSource
    let rawData = await fetchDataForView(view.dataSource);

    // Apply view transformations in order
    let transformedData = rawData;

    // 1. Apply data source filters
    if (view.dataSource.filters && view.dataSource.filters.length > 0) {
        transformedData = applyFiltersToData(transformedData, view.dataSource.filters);
    }

    // 2. Apply view filters
    transformedData = view.applyFilters(transformedData);

    // 3. Evaluate formulas
    transformedData = view.evaluateFormulas(transformedData);

    // 4. Apply sorts
    transformedData = view.applySorts(transformedData);

    // 5. Group data if needed
    let groupedData = null;
    if (view.type === 'board' || view.groupBy) {
        groupedData = view.groupData(transformedData);
    }

    // 6. Calculate rollups
    const rollups = view.calculateRollups(transformedData);

    // 7. Calculate aggregations if enabled
    let calculations = null;
    if (view.showCalculations && view.calculationConfig.length > 0) {
        calculations = calculateAggregations(transformedData, view.calculationConfig);
    }

    // 8. Apply property visibility
    if (view.properties && view.properties.length > 0) {
        const visibleFields = view.properties
            .filter(p => p.visible)
            .sort((a, b) => a.order - b.order)
            .map(p => p.field);

        transformedData = transformedData.map(item =>
            filterObjectFields(item, visibleFields)
        );
    }

    return {
        view: {
            id: view._id,
            name: view.name,
            type: view.type,
            description: view.description
        },
        data: transformedData,
        grouped: groupedData,
        rollups,
        calculations,
        metadata: {
            totalCount: rawData.length,
            filteredCount: transformedData.length,
            hasMore: false, // Implement pagination if needed
            viewConfig: view.viewConfig
        }
    };
};

/**
 * Clone view from template
 * @param {Object} templateView - Template view object
 * @param {ObjectId} newPageId - New page ID
 * @param {ObjectId} userId - User creating the clone
 * @returns {Promise<Object>} Cloned view
 */
caseNotionDatabaseViewSchema.statics.cloneFromTemplate = async function(templateView, newPageId, userId) {
    const viewData = {
        ...templateView,
        pageId: newPageId,
        createdBy: userId,
        isDefault: templateView.isDefault || false
    };

    delete viewData._id;
    delete viewData.createdAt;
    delete viewData.updatedAt;

    const clonedView = new this(viewData);
    await clonedView.save();

    return clonedView;
};

// Helper Functions

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Evaluate filter condition
 */
function evaluateFilter(value, operator, filterValue) {
    switch (operator) {
        case 'equals':
            return value === filterValue;
        case 'not_equals':
            return value !== filterValue;
        case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'does_not_contain':
            return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
        case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
        case 'is_empty':
            return value === null || value === undefined || value === '';
        case 'is_not_empty':
            return value !== null && value !== undefined && value !== '';
        case 'greater_than':
            return Number(value) > Number(filterValue);
        case 'greater_than_or_equal':
            return Number(value) >= Number(filterValue);
        case 'less_than':
            return Number(value) < Number(filterValue);
        case 'less_than_or_equal':
            return Number(value) <= Number(filterValue);
        case 'is_before':
            return new Date(value) < new Date(filterValue);
        case 'is_after':
            return new Date(value) > new Date(filterValue);
        case 'is_on_or_before':
            return new Date(value) <= new Date(filterValue);
        case 'is_on_or_after':
            return new Date(value) >= new Date(filterValue);
        case 'checkbox_is':
            return value === filterValue;
        case 'checkbox_is_not':
            return value !== filterValue;
        default:
            return true;
    }
}

/**
 * Compare values for sorting
 */
function compareValues(a, b) {
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;

    if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }

    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Simple formula evaluator (placeholder - use a proper expression parser in production)
 */
function evaluateFormula(formula, item) {
    // This is a simplified example - use a library like mathjs or expr-eval in production
    // For security, never use eval() directly

    // Replace field references with values
    let expression = formula;
    const fieldPattern = /\{([^}]+)\}/g;

    expression = expression.replace(fieldPattern, (match, field) => {
        const value = getNestedValue(item, field);
        return JSON.stringify(value);
    });

    // In production, use a safe expression evaluator
    // For now, return the expression as-is
    return expression;
}

/**
 * Fetch data based on data source configuration
 */
async function fetchDataForView(dataSource) {
    // This is a placeholder - implement actual data fetching based on dataSource.type
    // In production, query the appropriate model based on type

    const modelMap = {
        'tasks': 'Task',
        'documents': 'Document',
        'events': 'Event',
        'reminders': 'Reminder',
        'cases': 'Case',
        'contacts': 'Contact',
        'invoices': 'Invoice',
        'expenses': 'Expense',
        'time_entries': 'TimeEntry'
    };

    const modelName = modelMap[dataSource.type];
    if (!modelName) {
        return [];
    }

    // Return empty array - implement actual model querying
    return [];
}

/**
 * Apply filters to data array
 */
function applyFiltersToData(data, filters) {
    return data.filter(item => {
        return filters.every(filter => {
            const value = getNestedValue(item, filter.field);
            return evaluateFilter(value, filter.operator, filter.value);
        });
    });
}

/**
 * Calculate aggregations
 */
function calculateAggregations(data, configs) {
    const results = {};

    configs.forEach(config => {
        const values = data.map(item => getNestedValue(item, config.field));

        switch (config.type) {
            case 'sum':
                results[config.field] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
                break;
            case 'avg':
                const sum = values.reduce((s, val) => s + (Number(val) || 0), 0);
                results[config.field] = values.length > 0 ? sum / values.length : 0;
                break;
            case 'count':
                results[config.field] = values.length;
                break;
            case 'min':
                results[config.field] = Math.min(...values.filter(v => v != null).map(Number));
                break;
            case 'max':
                results[config.field] = Math.max(...values.filter(v => v != null).map(Number));
                break;
            case 'median':
                const sorted = values.filter(v => v != null).map(Number).sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                results[config.field] = sorted.length % 2 === 0
                    ? (sorted[mid - 1] + sorted[mid]) / 2
                    : sorted[mid];
                break;
            case 'range':
                const numValues = values.filter(v => v != null).map(Number);
                results[config.field] = Math.max(...numValues) - Math.min(...numValues);
                break;
            case 'count_unique':
                results[config.field] = new Set(values.filter(v => v != null)).size;
                break;
            case 'percent_empty':
                const empty = values.filter(v => v == null || v === '').length;
                results[config.field] = values.length > 0 ? (empty / values.length) * 100 : 0;
                break;
            case 'percent_not_empty':
                const notEmpty = values.filter(v => v != null && v !== '').length;
                results[config.field] = values.length > 0 ? (notEmpty / values.length) * 100 : 0;
                break;
        }
    });

    return results;
}

/**
 * Filter object to only include specified fields
 */
function filterObjectFields(obj, fields) {
    const filtered = {};
    fields.forEach(field => {
        const value = getNestedValue(obj, field);
        if (value !== undefined) {
            // Reconstruct nested structure
            const parts = field.split('.');
            let current = filtered;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
        }
    });
    return filtered;
}

module.exports = mongoose.model('CaseNotionDatabaseView', caseNotionDatabaseViewSchema);
