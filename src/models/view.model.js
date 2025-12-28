const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Column schema for list view configuration
const columnSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    labelAr: {
        type: String,
        trim: true
    },
    visible: {
        type: Boolean,
        default: true
    },
    width: {
        type: Number,
        default: 150,
        min: 50
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    format: {
        type: {
            type: String,
            enum: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'badge', 'avatar', 'link', 'custom']
        },
        currencyCode: String,
        dateFormat: String,
        numberFormat: String,
        customFormatter: String
    }
}, { _id: true });

// Filter schema for dynamic filtering
const filterSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    operator: {
        type: String,
        required: true,
        enum: [
            'equals', 'not_equals',
            'contains', 'not_contains',
            'starts_with', 'ends_with',
            'greater_than', 'less_than',
            'greater_than_or_equal', 'less_than_or_equal',
            'between', 'not_between',
            'in', 'not_in',
            'is_empty', 'is_not_empty',
            'is_null', 'is_not_null',
            'before', 'after',
            'on_or_before', 'on_or_after',
            'today', 'yesterday', 'tomorrow',
            'this_week', 'last_week', 'next_week',
            'this_month', 'last_month', 'next_month',
            'this_year', 'last_year', 'next_year'
        ]
    },
    value: mongoose.Schema.Types.Mixed,
    valueEnd: mongoose.Schema.Types.Mixed, // For 'between' operator
    isUserInput: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// Sorting schema
const sortingSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    direction: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'asc'
    },
    order: {
        type: Number,
        default: 0
    }
}, { _id: true });

// Grouping schema
const groupingSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
    },
    collapsed: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    },
    aggregation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max', 'none'],
        default: 'count'
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// VIEW TYPE SPECIFIC SETTINGS
// ═══════════════════════════════════════════════════════════════

// Kanban view settings
const kanbanSettingsSchema = new mongoose.Schema({
    columnField: {
        type: String,
        required: true,
        trim: true
    },
    cardFields: [{
        field: String,
        label: String,
        visible: { type: Boolean, default: true },
        order: Number
    }],
    swimlaneField: {
        type: String,
        trim: true
    },
    colorField: {
        type: String,
        trim: true
    },
    sortBy: {
        type: String,
        enum: ['manual', 'created_date', 'due_date', 'priority', 'alphabetical'],
        default: 'manual'
    },
    collapsedColumns: [String],
    cardSize: {
        type: String,
        enum: ['compact', 'normal', 'detailed'],
        default: 'normal'
    }
}, { _id: false });

// Calendar view settings
const calendarSettingsSchema = new mongoose.Schema({
    startDateField: {
        type: String,
        required: true,
        trim: true
    },
    endDateField: {
        type: String,
        trim: true
    },
    titleField: {
        type: String,
        required: true,
        trim: true
    },
    colorField: {
        type: String,
        trim: true
    },
    defaultView: {
        type: String,
        enum: ['day', 'week', 'month', 'agenda', 'year'],
        default: 'month'
    },
    firstDayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        default: 0 // Sunday
    },
    timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h'
    },
    showWeekends: {
        type: Boolean,
        default: true
    },
    slotDuration: {
        type: Number,
        default: 30 // minutes
    }
}, { _id: false });

// Timeline view settings
const timelineSettingsSchema = new mongoose.Schema({
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
    groupByField: {
        type: String,
        trim: true
    },
    milestoneField: {
        type: String,
        trim: true
    },
    colorField: {
        type: String,
        trim: true
    },
    defaultZoom: {
        type: String,
        enum: ['day', 'week', 'month', 'quarter', 'year'],
        default: 'month'
    },
    showToday: {
        type: Boolean,
        default: true
    },
    allowOverlap: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Gantt chart settings
const ganttSettingsSchema = new mongoose.Schema({
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
    dependencyField: {
        type: String,
        trim: true
    },
    progressField: {
        type: String,
        trim: true
    },
    criticalPathEnabled: {
        type: Boolean,
        default: false
    },
    baselineEnabled: {
        type: Boolean,
        default: false
    },
    showMilestones: {
        type: Boolean,
        default: true
    },
    autoScheduling: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Gallery view settings
const gallerySettingsSchema = new mongoose.Schema({
    imageField: {
        type: String,
        required: true,
        trim: true
    },
    titleField: {
        type: String,
        required: true,
        trim: true
    },
    subtitleField: {
        type: String,
        trim: true
    },
    cardSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
    },
    columns: {
        type: Number,
        min: 1,
        max: 6,
        default: 3
    },
    showOverlay: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Chart view settings
const chartSettingsSchema = new mongoose.Schema({
    chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'radar', 'polar', 'bubble'],
        required: true
    },
    xAxis: {
        field: String,
        label: String,
        type: {
            type: String,
            enum: ['category', 'time', 'linear', 'logarithmic']
        }
    },
    yAxis: {
        field: String,
        label: String,
        type: {
            type: String,
            enum: ['linear', 'logarithmic']
        }
    },
    aggregation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max'],
        default: 'count'
    },
    groupBy: String,
    colorScheme: [String],
    stacked: {
        type: Boolean,
        default: false
    },
    showLegend: {
        type: Boolean,
        default: true
    },
    showDataLabels: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Map view settings
const mapSettingsSchema = new mongoose.Schema({
    locationField: {
        type: String,
        required: true,
        trim: true
    },
    titleField: {
        type: String,
        required: true,
        trim: true
    },
    markerColorField: {
        type: String,
        trim: true
    },
    defaultCenter: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    defaultZoom: {
        type: Number,
        min: 1,
        max: 20,
        default: 10
    },
    clusterMarkers: {
        type: Boolean,
        default: true
    },
    showHeatmap: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Workload view settings
const workloadSettingsSchema = new mongoose.Schema({
    assigneeField: {
        type: String,
        required: true,
        trim: true
    },
    capacityField: {
        type: String,
        trim: true
    },
    effortField: {
        type: String,
        trim: true
    },
    timeUnit: {
        type: String,
        enum: ['hours', 'days', 'points'],
        default: 'hours'
    },
    showOverallocated: {
        type: Boolean,
        default: true
    },
    showCapacityLine: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Pivot table settings
const pivotSettingsSchema = new mongoose.Schema({
    rows: [{
        field: String,
        label: String,
        order: Number
    }],
    columns: [{
        field: String,
        label: String,
        order: Number
    }],
    values: [{
        field: String,
        label: String,
        aggregation: {
            type: String,
            enum: ['count', 'sum', 'avg', 'min', 'max'],
            default: 'sum'
        }
    }],
    showSubtotals: {
        type: Boolean,
        default: true
    },
    showGrandTotals: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN VIEW SCHEMA
// ═══════════════════════════════════════════════════════════════

const viewSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
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
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY & TYPE
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        required: true,
        enum: ['deal', 'contact', 'task', 'project', 'case', 'lead', 'invoice', 'expense', 'time_entry', 'document'],
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['list', 'kanban', 'calendar', 'timeline', 'gantt', 'gallery', 'chart', 'map', 'workload', 'pivot'],
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SCOPE & OWNERSHIP
    // ═══════════════════════════════════════════════════════════════
    scope: {
        type: String,
        required: true,
        enum: ['personal', 'team', 'global'],
        default: 'personal',
        index: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        index: true
    },
    // Users who can access this view (for team/global views)
    sharedWith: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // VIEW CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    columns: [columnSchema],
    filters: [filterSchema],
    sorting: [sortingSchema],
    grouping: [groupingSchema],

    // ═══════════════════════════════════════════════════════════════
    // VIEW TYPE SPECIFIC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    kanbanSettings: kanbanSettingsSchema,
    calendarSettings: calendarSettingsSchema,
    timelineSettings: timelineSettingsSchema,
    ganttSettings: ganttSettingsSchema,
    gallerySettings: gallerySettingsSchema,
    chartSettings: chartSettingsSchema,
    mapSettings: mapSettingsSchema,
    workloadSettings: workloadSettingsSchema,
    pivotSettings: pivotSettingsSchema,

    // ═══════════════════════════════════════════════════════════════
    // DISPLAY OPTIONS
    // ═══════════════════════════════════════════════════════════════
    icon: {
        type: String,
        default: '👁️'
    },
    color: {
        type: String,
        default: '#6366f1'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isFavorite: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // PAGINATION & LIMITS
    // ═══════════════════════════════════════════════════════════════
    defaultPageSize: {
        type: Number,
        default: 50,
        min: 10,
        max: 1000
    },
    maxRecords: {
        type: Number,
        default: 10000,
        min: 100,
        max: 100000
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    usageStats: {
        viewCount: { type: Number, default: 0 },
        lastViewedAt: Date,
        lastViewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
viewSchema.index({ firmId: 1, entityType: 1, type: 1 });
viewSchema.index({ firmId: 1, ownerId: 1, scope: 1 });
viewSchema.index({ firmId: 1, teamId: 1 });
viewSchema.index({ firmId: 1, isDefault: 1, entityType: 1 });
viewSchema.index({ firmId: 1, ownerId: 1, isFavorite: 1 });
viewSchema.index({ 'sharedWith.userId': 1 });
viewSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
viewSchema.pre('save', function(next) {
    // Ensure sorting array is ordered
    if (this.sorting && this.sorting.length > 0) {
        this.sorting.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Ensure grouping array is ordered
    if (this.grouping && this.grouping.length > 0) {
        this.grouping.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Ensure columns array is ordered
    if (this.columns && this.columns.length > 0) {
        this.columns.sort((a, b) => a.order - b.order);
    }

    // Validate view type specific settings
    if (this.type === 'kanban' && !this.kanbanSettings) {
        return next(new Error('Kanban views require kanbanSettings'));
    }
    if (this.type === 'calendar' && !this.calendarSettings) {
        return next(new Error('Calendar views require calendarSettings'));
    }
    if (this.type === 'timeline' && !this.timelineSettings) {
        return next(new Error('Timeline views require timelineSettings'));
    }
    if (this.type === 'gantt' && !this.ganttSettings) {
        return next(new Error('Gantt views require ganttSettings'));
    }
    if (this.type === 'gallery' && !this.gallerySettings) {
        return next(new Error('Gallery views require gallerySettings'));
    }
    if (this.type === 'chart' && !this.chartSettings) {
        return next(new Error('Chart views require chartSettings'));
    }
    if (this.type === 'map' && !this.mapSettings) {
        return next(new Error('Map views require mapSettings'));
    }
    if (this.type === 'workload' && !this.workloadSettings) {
        return next(new Error('Workload views require workloadSettings'));
    }
    if (this.type === 'pivot' && !this.pivotSettings) {
        return next(new Error('Pivot views require pivotSettings'));
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get views for a specific entity type and user
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type (deal, contact, task, etc.)
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Additional query options
 * @returns {Promise<Array>} Array of views
 */
viewSchema.statics.getViewsForEntity = async function(firmId, entityType, userId, options = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isArchived: false,
        $or: [
            { ownerId: new mongoose.Types.ObjectId(userId), scope: 'personal' },
            { scope: 'team', teamId: { $in: options.userTeams || [] } },
            { scope: 'global' },
            { 'sharedWith.userId': new mongoose.Types.ObjectId(userId) }
        ]
    };

    if (options.type) {
        query.type = options.type;
    }

    return await this.find(query)
        .sort({ isDefault: -1, isFavorite: -1, createdAt: -1 })
        .populate('ownerId', 'firstName lastName email')
        .populate('teamId', 'name')
        .lean();
};

/**
 * Get default view for an entity type
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Default view or null
 */
viewSchema.statics.getDefaultView = async function(firmId, entityType, userId) {
    return await this.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isDefault: true,
        isArchived: false,
        $or: [
            { ownerId: new mongoose.Types.ObjectId(userId), scope: 'personal' },
            { scope: 'global' }
        ]
    }).populate('ownerId', 'firstName lastName email');
};

/**
 * Clone a view
 * @param {ObjectId} viewId - View ID to clone
 * @param {ObjectId} userId - User ID who is cloning
 * @param {String} newName - New name for the cloned view
 * @returns {Promise<Object>} Cloned view
 */
viewSchema.statics.cloneView = async function(viewId, userId, newName) {
    const originalView = await this.findById(viewId);
    if (!originalView) {
        throw new Error('View not found');
    }

    const clonedView = originalView.toObject();
    delete clonedView._id;
    delete clonedView.createdAt;
    delete clonedView.updatedAt;

    clonedView.name = newName || `${originalView.name} (Copy)`;
    clonedView.ownerId = userId;
    clonedView.createdBy = userId;
    clonedView.scope = 'personal';
    clonedView.isDefault = false;
    clonedView.usageStats = {
        viewCount: 0
    };

    return await this.create(clonedView);
};

/**
 * Track view usage
 * @param {ObjectId} viewId - View ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Updated view
 */
viewSchema.statics.trackUsage = async function(viewId, userId) {
    return await this.findByIdAndUpdate(
        viewId,
        {
            $inc: { 'usageStats.viewCount': 1 },
            'usageStats.lastViewedAt': new Date(),
            'usageStats.lastViewedBy': userId
        },
        { new: true }
    );
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user can access this view
 * @param {ObjectId} userId - User ID
 * @param {Array} userTeams - User's team IDs
 * @returns {Boolean} Can access
 */
viewSchema.methods.canAccess = function(userId, userTeams = []) {
    // Owner can always access
    if (this.ownerId.toString() === userId.toString()) {
        return true;
    }

    // Global views are accessible to all
    if (this.scope === 'global') {
        return true;
    }

    // Team views are accessible to team members
    if (this.scope === 'team' && this.teamId && userTeams.includes(this.teamId.toString())) {
        return true;
    }

    // Check if explicitly shared
    const sharedAccess = this.sharedWith.find(s => s.userId.toString() === userId.toString());
    return !!sharedAccess;
};

/**
 * Check if user can edit this view
 * @param {ObjectId} userId - User ID
 * @returns {Boolean} Can edit
 */
viewSchema.methods.canEdit = function(userId) {
    // Owner can always edit
    if (this.ownerId.toString() === userId.toString()) {
        return true;
    }

    // Locked views cannot be edited by non-owners
    if (this.isLocked) {
        return false;
    }

    // Check if user has edit permission
    const sharedAccess = this.sharedWith.find(s => s.userId.toString() === userId.toString());
    return sharedAccess && sharedAccess.permission === 'edit';
};

/**
 * Add column to view
 * @param {Object} columnData - Column configuration
 * @returns {Promise<Object>} Updated view
 */
viewSchema.methods.addColumn = async function(columnData) {
    const maxOrder = this.columns.length > 0
        ? Math.max(...this.columns.map(c => c.order))
        : -1;

    this.columns.push({
        ...columnData,
        order: columnData.order ?? maxOrder + 1
    });

    return await this.save();
};

/**
 * Remove column from view
 * @param {String} columnId - Column ID to remove
 * @returns {Promise<Object>} Updated view
 */
viewSchema.methods.removeColumn = async function(columnId) {
    const columnIndex = this.columns.findIndex(c => c._id.toString() === columnId);
    if (columnIndex === -1) {
        throw new Error('Column not found');
    }

    this.columns.splice(columnIndex, 1);

    // Reorder remaining columns
    this.columns.forEach((column, index) => {
        column.order = index;
    });

    return await this.save();
};

/**
 * Update column order
 * @param {Array} columnOrders - Array of { columnId, order }
 * @returns {Promise<Object>} Updated view
 */
viewSchema.methods.reorderColumns = async function(columnOrders) {
    for (const item of columnOrders) {
        const column = this.columns.find(c => c._id.toString() === item.columnId);
        if (column) {
            column.order = item.order;
        }
    }

    this.columns.sort((a, b) => a.order - b.order);
    return await this.save();
};

module.exports = mongoose.model('View', viewSchema);
