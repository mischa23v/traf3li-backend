const mongoose = require('mongoose');

/**
 * ReportDefinition Model - Self-Serve Report Builder
 *
 * This model stores user-defined report configurations for the self-serve
 * report builder. Users can create custom reports with flexible data sources,
 * columns, filters, grouping, and visualization options.
 */

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Join configuration schema for multi-model queries
const joinSchema = new mongoose.Schema({
    targetModel: {
        type: String,
        required: true
    },
    sourceField: {
        type: String,
        required: true
    },
    targetField: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['inner', 'left', 'right'],
        default: 'left',
        required: true
    }
}, { _id: false });

// Data source configuration schema
const dataSourceSchema = new mongoose.Schema({
    model: {
        type: String,
        required: true
    },
    alias: {
        type: String,
        required: false
    },
    joins: {
        type: [joinSchema],
        default: []
    }
}, { _id: false });

// Column configuration schema
const columnSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: false
    },
    aggregate: {
        type: String,
        enum: ['sum', 'avg', 'count', 'min', 'max', 'none'],
        default: 'none',
        required: false
    },
    format: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    }
}, { _id: false });

// Filter configuration schema
const filterSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    operator: {
        type: String,
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    userInput: {
        type: Boolean,
        default: false,
        required: false
    }
}, { _id: false });

// Visualization configuration schema
const visualizationSchema = new mongoose.Schema({
    chartType: {
        type: String,
        required: false
    },
    xAxis: {
        type: String,
        required: false
    },
    yAxis: {
        type: String,
        required: false
    },
    colors: {
        type: [String],
        default: []
    }
}, { _id: false });

// Schedule configuration schema
const scheduleSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false,
        required: false
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: false
    },
    recipients: {
        type: [String],
        default: []
    },
    format: {
        type: String,
        enum: ['pdf', 'excel', 'csv'],
        default: 'pdf',
        required: false
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const reportDefinitionSchema = new mongoose.Schema({
    // Basic info
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false
    },

    // Report type
    type: {
        type: String,
        enum: ['table', 'chart', 'pivot', 'funnel', 'cohort', 'dashboard'],
        required: true
    },

    // Data configuration
    dataSources: {
        type: [dataSourceSchema],
        default: []
    },
    columns: {
        type: [columnSchema],
        default: []
    },
    filters: {
        type: [filterSchema],
        default: []
    },
    groupBy: {
        type: [String],
        default: []
    },

    // Visualization
    visualization: {
        type: visualizationSchema,
        required: false
    },

    // Scheduling
    schedule: {
        type: scheduleSchema,
        required: false
    },

    // Sharing and permissions
    isPublic: {
        type: Boolean,
        default: false,
        required: false
    },
    scope: {
        type: String,
        enum: ['personal', 'team', 'global'],
        default: 'personal',
        required: true
    },

    // Ownership and multi-tenancy
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
reportDefinitionSchema.index({ firmId: 1, createdBy: 1, createdAt: -1 });
reportDefinitionSchema.index({ firmId: 1, scope: 1, isPublic: 1 });
reportDefinitionSchema.index({ type: 1 });
reportDefinitionSchema.index({ name: 'text', description: 'text' });
reportDefinitionSchema.index({ 'schedule.enabled': 1, 'schedule.frequency': 1 });

module.exports = mongoose.model('ReportDefinition', reportDefinitionSchema);
