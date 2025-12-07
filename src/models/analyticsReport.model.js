const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Column configuration for report tables
const reportColumnSchema = new mongoose.Schema({
    field: { type: String, required: true },
    header: { type: String, required: true },
    headerAr: String,
    width: { type: Number, default: 150 },
    sortable: { type: Boolean, default: true },
    filterable: { type: Boolean, default: true },
    visible: { type: Boolean, default: true },
    format: {
        type: String,
        enum: ['text', 'number', 'currency', 'percentage', 'date', 'datetime', 'boolean', 'status', 'avatar', 'link', 'badge'],
        default: 'text'
    },
    aggregation: {
        type: String,
        enum: ['sum', 'avg', 'min', 'max', 'count', 'none'],
        default: 'none'
    },
    conditionalFormatting: [{
        condition: String, // 'greater_than', 'less_than', 'equals', 'contains', 'between'
        value: mongoose.Schema.Types.Mixed,
        value2: mongoose.Schema.Types.Mixed, // For 'between' condition
        style: {
            backgroundColor: String,
            textColor: String,
            fontWeight: String,
            icon: String
        }
    }],
    customRenderer: String // Custom renderer function name
}, { _id: false });

// Chart configuration
const reportChartSchema = new mongoose.Schema({
    chartId: { type: String, required: true },
    type: {
        type: String,
        enum: ['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'radar', 'treemap', 'heatmap', 'gauge', 'funnel', 'waterfall', 'combo'],
        required: true
    },
    title: { type: String, required: true },
    titleAr: String,
    subtitle: String,
    subtitleAr: String,
    dataSource: { type: String, required: true }, // Field path or aggregation name
    xAxis: {
        field: String,
        label: String,
        labelAr: String,
        type: { type: String, enum: ['category', 'time', 'value'], default: 'category' }
    },
    yAxis: {
        field: String,
        label: String,
        labelAr: String,
        min: Number,
        max: Number,
        format: { type: String, enum: ['number', 'currency', 'percentage'], default: 'number' }
    },
    series: [{
        name: String,
        nameAr: String,
        field: String,
        color: String,
        type: String // For combo charts
    }],
    legend: {
        show: { type: Boolean, default: true },
        position: { type: String, enum: ['top', 'bottom', 'left', 'right'], default: 'bottom' }
    },
    tooltip: {
        show: { type: Boolean, default: true },
        format: String
    },
    colors: [String],
    stacked: { type: Boolean, default: false },
    showDataLabels: { type: Boolean, default: false },
    showGrid: { type: Boolean, default: true },
    animate: { type: Boolean, default: true },
    height: { type: Number, default: 300 },
    width: String // Can be percentage or pixels
}, { _id: false });

// KPI Card configuration
const kpiCardSchema = new mongoose.Schema({
    cardId: { type: String, required: true },
    title: { type: String, required: true },
    titleAr: String,
    value: mongoose.Schema.Types.Mixed,
    previousValue: mongoose.Schema.Types.Mixed,
    format: {
        type: String,
        enum: ['number', 'currency', 'percentage', 'duration', 'count'],
        default: 'number'
    },
    trend: {
        direction: { type: String, enum: ['up', 'down', 'stable'] },
        percentage: Number,
        isPositive: Boolean // Whether increase is good or bad
    },
    icon: String,
    iconColor: String,
    backgroundColor: String,
    comparisonPeriod: {
        type: String,
        enum: ['previous_period', 'same_period_last_year', 'custom'],
        default: 'previous_period'
    },
    sparkline: {
        show: { type: Boolean, default: false },
        data: [Number],
        type: { type: String, enum: ['line', 'bar', 'area'], default: 'line' }
    },
    target: {
        value: Number,
        label: String,
        labelAr: String
    },
    drillDownReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalyticsReport' },
    size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' }
}, { _id: false });

// Filter configuration
const reportFilterSchema = new mongoose.Schema({
    filterId: { type: String, required: true },
    field: { type: String, required: true },
    label: { type: String, required: true },
    labelAr: String,
    type: {
        type: String,
        enum: ['text', 'number', 'date', 'daterange', 'select', 'multiselect', 'boolean', 'autocomplete', 'tree'],
        required: true
    },
    operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'in', 'not_in', 'is_null', 'is_not_null'],
        default: 'equals'
    },
    value: mongoose.Schema.Types.Mixed,
    defaultValue: mongoose.Schema.Types.Mixed,
    options: [{
        value: mongoose.Schema.Types.Mixed,
        label: String,
        labelAr: String
    }],
    optionsSource: String, // API endpoint or collection name
    required: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    allowMultiple: { type: Boolean, default: false },
    dependsOn: String, // Another filter ID
    cascading: { type: Boolean, default: false }
}, { _id: false });

// Data aggregation configuration
const aggregationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    pipeline: [mongoose.Schema.Types.Mixed], // MongoDB aggregation pipeline
    collection: { type: String, required: true },
    cacheEnabled: { type: Boolean, default: false },
    cacheDuration: { type: Number, default: 300 }, // seconds
    refreshOnFilter: { type: Boolean, default: true }
}, { _id: false });

// Drill-down configuration
const drillDownSchema = new mongoose.Schema({
    level: { type: Number, required: true },
    name: { type: String, required: true },
    nameAr: String,
    groupBy: String,
    aggregations: [String],
    columns: [String],
    childReport: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalyticsReport' }
}, { _id: false });

// Schedule configuration
const scheduleConfigSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'],
        default: 'monthly'
    },
    time: String, // HH:mm format
    timezone: { type: String, default: 'Asia/Riyadh' },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
    dayOfMonth: { type: Number, min: 1, max: 31 },
    monthOfYear: { type: Number, min: 1, max: 12 },
    cronExpression: String, // For custom schedules
    recipients: [{
        email: String,
        name: String,
        type: { type: String, enum: ['to', 'cc', 'bcc'], default: 'to' }
    }],
    format: {
        type: String,
        enum: ['pdf', 'excel', 'csv', 'html'],
        default: 'pdf'
    },
    includeCharts: { type: Boolean, default: true },
    emailSubject: String,
    emailSubjectAr: String,
    emailBody: String,
    emailBodyAr: String,
    lastRun: Date,
    nextRun: Date,
    lastRunStatus: {
        type: String,
        enum: ['success', 'failed', 'partial']
    },
    lastRunError: String,
    runCount: { type: Number, default: 0 }
}, { _id: false });

// Export configuration
const exportConfigSchema = new mongoose.Schema({
    formats: [{
        type: String,
        enum: ['pdf', 'excel', 'csv', 'json', 'html', 'xml']
    }],
    defaultFormat: { type: String, default: 'pdf' },
    includeCharts: { type: Boolean, default: true },
    includeFilters: { type: Boolean, default: true },
    includeSummary: { type: Boolean, default: true },
    paperSize: { type: String, enum: ['A4', 'A3', 'Letter', 'Legal'], default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    margins: {
        top: { type: Number, default: 20 },
        bottom: { type: Number, default: 20 },
        left: { type: Number, default: 20 },
        right: { type: Number, default: 20 }
    },
    header: {
        show: { type: Boolean, default: true },
        content: String,
        contentAr: String,
        logo: Boolean
    },
    footer: {
        show: { type: Boolean, default: true },
        content: String,
        contentAr: String,
        pageNumbers: { type: Boolean, default: true }
    },
    watermark: {
        show: { type: Boolean, default: false },
        text: String,
        textAr: String,
        opacity: { type: Number, default: 0.1 }
    }
}, { _id: false });

// Permission configuration
const reportPermissionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['public', 'private', 'role_based', 'user_based', 'department_based'],
        default: 'private'
    },
    roles: [String],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    departments: [String],
    canView: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    canEdit: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    canDelete: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    canExport: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    canSchedule: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// SECTION-SPECIFIC REPORT SCHEMAS
// ═══════════════════════════════════════════════════════════════

// HR Reports Configuration
const hrReportConfigSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: [
            'employee_data', 'payroll', 'attendance', 'performance', 'recruitment',
            'training', 'benefits', 'compensation', 'compliance', 'workforce_planning',
            'turnover', 'diversity', 'skills_gap', 'succession', 'engagement'
        ],
        required: true
    },
    metrics: [{
        name: String,
        calculation: String,
        format: String
    }],
    // Employee Data Reports
    employeeFilters: {
        departments: [String],
        positions: [String],
        employmentTypes: [String],
        statuses: [String],
        locations: [String],
        managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HR' }],
        hireDate: {
            from: Date,
            to: Date
        },
        payGrades: [String],
        nationalities: [String]
    },
    // Payroll Reports
    payrollConfig: {
        payPeriods: [String],
        includeDeductions: { type: Boolean, default: true },
        includeAllowances: { type: Boolean, default: true },
        includeTaxes: { type: Boolean, default: true },
        includeGOSI: { type: Boolean, default: true },
        groupByDepartment: { type: Boolean, default: false },
        showNetVsGross: { type: Boolean, default: true },
        compareWithBudget: { type: Boolean, default: false }
    },
    // Attendance Reports
    attendanceConfig: {
        includeOvertime: { type: Boolean, default: true },
        includeLateArrivals: { type: Boolean, default: true },
        includeEarlyDepartures: { type: Boolean, default: true },
        includeAbsences: { type: Boolean, default: true },
        includeLeaves: { type: Boolean, default: true },
        attendanceThreshold: { type: Number, default: 90 } // percentage
    },
    // Performance Reports
    performanceConfig: {
        reviewPeriods: [String],
        includeGoals: { type: Boolean, default: true },
        includeCompetencies: { type: Boolean, default: true },
        includeRatings: { type: Boolean, default: true },
        includeFeedback: { type: Boolean, default: false },
        ratingScale: { type: Number, default: 5 },
        benchmarkAgainst: String
    },
    // Saudi-specific compliance
    complianceConfig: {
        saudizationReport: { type: Boolean, default: false },
        gosiReport: { type: Boolean, default: false },
        eosbReport: { type: Boolean, default: false },
        laborLawCompliance: { type: Boolean, default: false },
        visaExpiryTracking: { type: Boolean, default: false },
        iqamaExpiryTracking: { type: Boolean, default: false }
    }
}, { _id: false });

// Finance Reports Configuration
const financeReportConfigSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: [
            'invoices', 'expenses', 'payments', 'budgets', 'cash_flow',
            'accounts_receivable', 'accounts_payable', 'profitability',
            'revenue', 'collections', 'aging', 'tax', 'trust_accounting',
            'time_billing', 'realization', 'write_offs', 'retainers'
        ],
        required: true
    },
    metrics: [{
        name: String,
        calculation: String,
        format: String
    }],
    // Invoice Reports
    invoiceConfig: {
        statuses: [String],
        clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
        cases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case' }],
        dateRange: {
            from: Date,
            to: Date
        },
        amountRange: {
            min: Number,
            max: Number
        },
        includeLineItems: { type: Boolean, default: false },
        groupByClient: { type: Boolean, default: false },
        groupByCase: { type: Boolean, default: false },
        showAging: { type: Boolean, default: true }
    },
    // Expense Reports
    expenseConfig: {
        categories: [String],
        vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
        approvalStatuses: [String],
        billableOnly: { type: Boolean, default: false },
        reimbursableOnly: { type: Boolean, default: false },
        groupByCategory: { type: Boolean, default: false },
        compareWithBudget: { type: Boolean, default: false }
    },
    // Cash Flow Reports
    cashFlowConfig: {
        accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' }],
        includeProjected: { type: Boolean, default: true },
        includeRecurring: { type: Boolean, default: true },
        forecastPeriod: { type: Number, default: 90 }, // days
        showByCategory: { type: Boolean, default: true }
    },
    // Budget Reports
    budgetConfig: {
        budgetPeriod: String,
        departments: [String],
        categories: [String],
        showVariance: { type: Boolean, default: true },
        showPercentage: { type: Boolean, default: true },
        includeForecasts: { type: Boolean, default: false }
    },
    // Profitability Reports
    profitabilityConfig: {
        byClient: { type: Boolean, default: false },
        byCase: { type: Boolean, default: false },
        byPracticeArea: { type: Boolean, default: false },
        byAttorney: { type: Boolean, default: false },
        includeOverhead: { type: Boolean, default: true },
        costAllocation: String
    },
    // Trust Accounting Reports
    trustConfig: {
        accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TrustAccount' }],
        includeTransactions: { type: Boolean, default: true },
        showReconciliation: { type: Boolean, default: true },
        complianceCheck: { type: Boolean, default: true }
    }
}, { _id: false });

// Tasks & Productivity Reports Configuration
const tasksReportConfigSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: [
            'task_completion', 'time_tracking', 'project_progress', 'team_productivity',
            'deadline_tracking', 'workload_distribution', 'efficiency', 'utilization',
            'billable_hours', 'capacity_planning', 'milestone_tracking'
        ],
        required: true
    },
    metrics: [{
        name: String,
        calculation: String,
        format: String
    }],
    // Task Reports
    taskConfig: {
        statuses: [String],
        priorities: [String],
        assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        cases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case' }],
        clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
        taskTypes: [String],
        dateRange: {
            from: Date,
            to: Date
        },
        includeSubtasks: { type: Boolean, default: true },
        showOverdue: { type: Boolean, default: true },
        showCompleted: { type: Boolean, default: true }
    },
    // Time Tracking Reports
    timeTrackingConfig: {
        billableOnly: { type: Boolean, default: false },
        nonBillableOnly: { type: Boolean, default: false },
        timekeepers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        activities: [String],
        minimumDuration: Number, // minutes
        showRoundedTime: { type: Boolean, default: false },
        roundingIncrement: { type: Number, default: 6 }, // minutes
        groupByActivity: { type: Boolean, default: false },
        groupByTimekeeper: { type: Boolean, default: false },
        compareWithTarget: { type: Boolean, default: false },
        targetHours: Number
    },
    // Productivity Reports
    productivityConfig: {
        utilizationTarget: { type: Number, default: 80 }, // percentage
        billableTarget: { type: Number, default: 6.5 }, // hours per day
        showEfficiencyRatio: { type: Boolean, default: true },
        showRealizationRate: { type: Boolean, default: true },
        comparePeriods: { type: Boolean, default: false },
        benchmarkAgainst: String
    },
    // Workload Reports
    workloadConfig: {
        showCapacity: { type: Boolean, default: true },
        showAssigned: { type: Boolean, default: true },
        showAvailable: { type: Boolean, default: true },
        alertThreshold: { type: Number, default: 100 }, // percentage
        forecastWeeks: { type: Number, default: 4 }
    }
}, { _id: false });

// CRM Reports Configuration
const crmReportConfigSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: [
            'leads', 'contacts', 'pipeline', 'customer_engagement',
            'communication_tracking', 'conversion', 'retention',
            'client_satisfaction', 'referrals', 'client_lifecycle',
            'touchpoints', 'relationship_health'
        ],
        required: true
    },
    metrics: [{
        name: String,
        calculation: String,
        format: String
    }],
    // Lead Reports
    leadConfig: {
        sources: [String],
        statuses: [String],
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        practiceAreas: [String],
        dateRange: {
            from: Date,
            to: Date
        },
        showConversionFunnel: { type: Boolean, default: true },
        showSourceAnalysis: { type: Boolean, default: true },
        showResponseTime: { type: Boolean, default: true },
        leadScoreRange: {
            min: Number,
            max: Number
        }
    },
    // Pipeline Reports
    pipelineConfig: {
        pipelines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CrmPipeline' }],
        stages: [String],
        showVelocity: { type: Boolean, default: true },
        showDropOff: { type: Boolean, default: true },
        showAverageTime: { type: Boolean, default: true },
        expectedValueRange: {
            min: Number,
            max: Number
        },
        probabilityThreshold: Number
    },
    // Communication Reports
    communicationConfig: {
        channels: [String], // email, phone, meeting, etc.
        includeEmails: { type: Boolean, default: true },
        includeCalls: { type: Boolean, default: true },
        includeMeetings: { type: Boolean, default: true },
        includeNotes: { type: Boolean, default: false },
        showResponseMetrics: { type: Boolean, default: true },
        showEngagementScore: { type: Boolean, default: true }
    },
    // Client Reports
    clientConfig: {
        segments: [String],
        industries: [String],
        clientTypes: [String],
        showLifetimeValue: { type: Boolean, default: true },
        showRetentionRate: { type: Boolean, default: true },
        showChurnRisk: { type: Boolean, default: true },
        includeInactive: { type: Boolean, default: false }
    },
    // Referral Reports
    referralConfig: {
        referralSources: [String],
        showConversionRate: { type: Boolean, default: true },
        showReferralValue: { type: Boolean, default: true },
        trackReferrers: { type: Boolean, default: true }
    }
}, { _id: false });

// Sales Reports Configuration
const salesReportConfigSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: [
            'sales_performance', 'revenue', 'conversions', 'forecasting',
            'pipeline_value', 'win_loss', 'sales_cycle', 'quotations',
            'deals', 'targets', 'commissions', 'territory'
        ],
        required: true
    },
    metrics: [{
        name: String,
        calculation: String,
        format: String
    }],
    // Performance Reports
    performanceConfig: {
        salesReps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        teams: [String],
        territories: [String],
        products: [String],
        services: [String],
        dateRange: {
            from: Date,
            to: Date
        },
        showTargetVsActual: { type: Boolean, default: true },
        showRanking: { type: Boolean, default: true },
        showTrend: { type: Boolean, default: true }
    },
    // Revenue Reports
    revenueConfig: {
        revenueTypes: [String],
        groupByPeriod: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
        showRecurring: { type: Boolean, default: true },
        showOneTime: { type: Boolean, default: true },
        showBySource: { type: Boolean, default: true },
        showByService: { type: Boolean, default: true },
        compareWithPrevious: { type: Boolean, default: true }
    },
    // Win/Loss Reports
    winLossConfig: {
        showReasons: { type: Boolean, default: true },
        showCompetitors: { type: Boolean, default: true },
        showByStage: { type: Boolean, default: true },
        showBySource: { type: Boolean, default: true },
        showAverageSize: { type: Boolean, default: true },
        showCycleTime: { type: Boolean, default: true }
    },
    // Forecasting Reports
    forecastingConfig: {
        forecastPeriod: { type: Number, default: 90 }, // days
        confidenceLevel: { type: Number, default: 80 }, // percentage
        includeWeighted: { type: Boolean, default: true },
        includeBestCase: { type: Boolean, default: true },
        includeWorstCase: { type: Boolean, default: true },
        showPipelineContribution: { type: Boolean, default: true }
    },
    // Commission Reports
    commissionConfig: {
        commissionPlans: [String],
        showEarned: { type: Boolean, default: true },
        showPending: { type: Boolean, default: true },
        showPaid: { type: Boolean, default: true },
        groupBySalesRep: { type: Boolean, default: true }
    }
}, { _id: false });

// Dashboard Widget Schema
const dashboardWidgetSchema = new mongoose.Schema({
    widgetId: { type: String, required: true },
    type: {
        type: String,
        enum: ['kpi_card', 'chart', 'table', 'list', 'progress', 'map', 'calendar', 'timeline', 'custom'],
        required: true
    },
    title: { type: String, required: true },
    titleAr: String,
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalyticsReport' },
    config: mongoose.Schema.Types.Mixed,
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 4 },
        height: { type: Number, default: 3 }
    },
    refreshInterval: { type: Number, default: 0 }, // 0 = no auto refresh, otherwise seconds
    lastRefreshed: Date,
    visible: { type: Boolean, default: true }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYTICS REPORT SCHEMA
// ═══════════════════════════════════════════════════════════════

const analyticsReportSchema = new mongoose.Schema({
    // Identifiers
    reportId: {
        type: String,
        unique: true,
        sparse: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Basic Information
    name: {
        type: String,
        required: [true, 'Report name is required'],
        trim: true,
        maxlength: [200, 'Report name cannot exceed 200 characters']
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: [200, 'Arabic report name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: [1000, 'Arabic description cannot exceed 1000 characters']
    },

    // Report Classification
    section: {
        type: String,
        enum: ['hr', 'finance', 'tasks', 'crm', 'sales', 'general', 'custom'],
        required: [true, 'Report section is required'],
        index: true
    },
    category: {
        type: String,
        required: [true, 'Report category is required'],
        index: true
    },
    subcategory: String,
    tags: [String],

    // Report Type
    reportType: {
        type: String,
        enum: ['standard', 'custom', 'template', 'dashboard', 'ad_hoc'],
        default: 'standard'
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnalyticsReport'
    },

    // Section-specific configurations
    hrConfig: hrReportConfigSchema,
    financeConfig: financeReportConfigSchema,
    tasksConfig: tasksReportConfigSchema,
    crmConfig: crmReportConfigSchema,
    salesConfig: salesReportConfigSchema,

    // Data Configuration
    dataSource: {
        type: {
            type: String,
            enum: ['collection', 'aggregation', 'api', 'custom'],
            default: 'collection'
        },
        collection: String,
        apiEndpoint: String,
        customQuery: mongoose.Schema.Types.Mixed
    },
    aggregations: [aggregationSchema],

    // Display Configuration
    columns: [reportColumnSchema],
    charts: [reportChartSchema],
    kpiCards: [kpiCardSchema],
    filters: [reportFilterSchema],
    drillDowns: [drillDownSchema],

    // Layout Configuration
    layout: {
        type: {
            type: String,
            enum: ['tabular', 'summary', 'dashboard', 'mixed', 'custom'],
            default: 'tabular'
        },
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        pageSize: {
            type: String,
            enum: ['A4', 'A3', 'Letter', 'Legal'],
            default: 'A4'
        },
        gridColumns: { type: Number, default: 12 },
        sections: [{
            sectionId: String,
            title: String,
            titleAr: String,
            type: { type: String, enum: ['header', 'kpis', 'charts', 'table', 'summary', 'footer'] },
            order: Number,
            config: mongoose.Schema.Types.Mixed
        }]
    },

    // Sorting & Pagination
    defaultSort: {
        field: String,
        order: { type: String, enum: ['asc', 'desc'], default: 'desc' }
    },
    pagination: {
        enabled: { type: Boolean, default: true },
        pageSize: { type: Number, default: 25 },
        pageSizeOptions: { type: [Number], default: [10, 25, 50, 100] }
    },

    // Date Range
    dateRange: {
        type: {
            type: String,
            enum: ['custom', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days'],
            default: 'this_month'
        },
        startDate: Date,
        endDate: Date,
        comparePeriod: {
            enabled: { type: Boolean, default: false },
            type: { type: String, enum: ['previous_period', 'same_period_last_year', 'custom'] },
            startDate: Date,
            endDate: Date
        }
    },

    // Scheduling
    schedule: scheduleConfigSchema,

    // Export Configuration
    exportConfig: exportConfigSchema,

    // Permissions
    permissions: reportPermissionSchema,

    // Dashboard Widgets (when used as dashboard)
    dashboardWidgets: [dashboardWidgetSchema],

    // Favorites & Pinning
    isFavorite: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    pinnedOrder: Number,

    // Status
    status: {
        type: String,
        enum: ['draft', 'active', 'archived', 'disabled'],
        default: 'active',
        index: true
    },

    // Audit Trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastRunAt: Date,
    lastRunBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    runCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },

    // Versioning
    version: {
        type: Number,
        default: 1
    },
    previousVersions: [{
        version: Number,
        config: mongoose.Schema.Types.Mixed,
        updatedAt: Date,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Notes
    notes: String,
    notesAr: String
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

analyticsReportSchema.index({ firmId: 1, lawyerId: 1 });
analyticsReportSchema.index({ firmId: 1, section: 1, category: 1 });
analyticsReportSchema.index({ firmId: 1, status: 1 });
analyticsReportSchema.index({ firmId: 1, isTemplate: 1 });
analyticsReportSchema.index({ firmId: 1, isFavorite: 1 });
analyticsReportSchema.index({ firmId: 1, isPinned: 1, pinnedOrder: 1 });
analyticsReportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });
analyticsReportSchema.index({ name: 'text', nameAr: 'text', description: 'text', descriptionAr: 'text', tags: 'text' });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

analyticsReportSchema.pre('save', async function(next) {
    // Generate reportId if not exists
    if (!this.reportId) {
        const count = await this.constructor.countDocuments({ firmId: this.firmId });
        const sectionPrefix = this.section.toUpperCase().substring(0, 3);
        this.reportId = `RPT-${sectionPrefix}-${String(count + 1).padStart(5, '0')}`;
    }

    // Update version on significant changes
    if (this.isModified() && !this.isNew) {
        this.version += 1;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get reports by section
analyticsReportSchema.statics.getBySection = async function(firmId, section, options = {}) {
    const query = { firmId, section, status: 'active' };
    if (options.category) query.category = options.category;
    if (options.isTemplate !== undefined) query.isTemplate = options.isTemplate;

    return await this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .populate('createdBy', 'firstName lastName');
};

// Get scheduled reports due for execution
analyticsReportSchema.statics.getScheduledReportsDue = async function() {
    const now = new Date();
    return await this.find({
        'schedule.enabled': true,
        'schedule.nextRun': { $lte: now },
        status: 'active'
    }).populate('firmId lawyerId');
};

// Get report templates
analyticsReportSchema.statics.getTemplates = async function(firmId, section) {
    const query = { isTemplate: true, status: 'active' };
    if (firmId) query.$or = [{ firmId }, { firmId: { $exists: false } }]; // Include global templates
    if (section) query.section = section;

    return await this.find(query).sort({ name: 1 });
};

// Get favorite reports
analyticsReportSchema.statics.getFavorites = async function(firmId, lawyerId) {
    return await this.find({
        firmId,
        lawyerId,
        isFavorite: true,
        status: 'active'
    }).sort({ name: 1 });
};

// Get pinned reports for dashboard
analyticsReportSchema.statics.getPinnedReports = async function(firmId, lawyerId) {
    return await this.find({
        firmId,
        lawyerId,
        isPinned: true,
        status: 'active'
    }).sort({ pinnedOrder: 1 });
};

// Get report statistics
analyticsReportSchema.statics.getStats = async function(firmId) {
    return await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId), status: 'active' } },
        {
            $group: {
                _id: '$section',
                count: { $sum: 1 },
                scheduled: { $sum: { $cond: ['$schedule.enabled', 1, 0] } },
                templates: { $sum: { $cond: ['$isTemplate', 1, 0] } },
                totalRuns: { $sum: '$runCount' },
                totalViews: { $sum: '$viewCount' }
            }
        },
        {
            $project: {
                section: '$_id',
                count: 1,
                scheduled: 1,
                templates: 1,
                totalRuns: 1,
                totalViews: 1,
                _id: 0
            }
        }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Record a report run
analyticsReportSchema.methods.recordRun = async function(userId) {
    this.lastRunAt = new Date();
    this.lastRunBy = userId;
    this.runCount += 1;
    await this.save();
};

// Record a report view
analyticsReportSchema.methods.recordView = async function() {
    this.viewCount += 1;
    await this.save();
};

// Toggle favorite
analyticsReportSchema.methods.toggleFavorite = async function() {
    this.isFavorite = !this.isFavorite;
    await this.save();
    return this.isFavorite;
};

// Toggle pinned
analyticsReportSchema.methods.togglePinned = async function(order) {
    this.isPinned = !this.isPinned;
    if (this.isPinned && order !== undefined) {
        this.pinnedOrder = order;
    }
    await this.save();
    return this.isPinned;
};

// Clone report
analyticsReportSchema.methods.clone = async function(newName, userId) {
    const cloneData = this.toObject();
    delete cloneData._id;
    delete cloneData.reportId;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;

    cloneData.name = newName || `${this.name} (Copy)`;
    cloneData.nameAr = this.nameAr ? `${this.nameAr} (نسخة)` : undefined;
    cloneData.createdBy = userId;
    cloneData.updatedBy = userId;
    cloneData.isFavorite = false;
    cloneData.isPinned = false;
    cloneData.runCount = 0;
    cloneData.viewCount = 0;
    cloneData.version = 1;
    cloneData.previousVersions = [];

    // Disable scheduling for cloned reports
    if (cloneData.schedule) {
        cloneData.schedule.enabled = false;
    }

    return await this.constructor.create(cloneData);
};

// Calculate next run time for scheduled reports
analyticsReportSchema.methods.calculateNextRun = function() {
    if (!this.schedule || !this.schedule.enabled) return null;

    const now = new Date();
    const [hours, minutes] = (this.schedule.time || '09:00').split(':').map(Number);

    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (this.schedule.frequency) {
        case 'daily':
            if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
            break;
        case 'weekly':
            const dayDiff = (this.schedule.dayOfWeek || 1) - nextRun.getDay();
            nextRun.setDate(nextRun.getDate() + (dayDiff <= 0 ? dayDiff + 7 : dayDiff));
            if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 7);
            break;
        case 'monthly':
            nextRun.setDate(this.schedule.dayOfMonth || 1);
            if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 1);
            break;
        case 'quarterly':
            const currentMonth = nextRun.getMonth();
            const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
            nextRun.setMonth(nextQuarterMonth);
            nextRun.setDate(this.schedule.dayOfMonth || 1);
            if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 3);
            break;
        case 'yearly':
            nextRun.setMonth((this.schedule.monthOfYear || 1) - 1);
            nextRun.setDate(this.schedule.dayOfMonth || 1);
            if (nextRun <= now) nextRun.setFullYear(nextRun.getFullYear() + 1);
            break;
    }

    this.schedule.nextRun = nextRun;
    return nextRun;
};

module.exports = mongoose.model('AnalyticsReport', analyticsReportSchema);
