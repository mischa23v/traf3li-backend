// ============================================
// SENTRY INITIALIZATION - Must be first!
// ============================================
// Initialize Sentry before any other imports for proper error tracking
const {
    initSentry,
    getRequestHandler,
    getTracingHandler,
    getErrorHandler,
    setUserContext: sentrySetUserContext,
    addRequestBreadcrumb
} = require('./configs/sentry');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./configs/swagger');
const connectDB = require('./configs/db');
const { scheduleTaskReminders } = require('./utils/taskReminders');
const { startRecurringInvoiceJobs } = require('./jobs/recurringInvoice.job');
const { startTimeEntryJobs } = require('./jobs/timeEntryLocking.job');
const { startPlanJobs } = require('./jobs/planExpiration.job');
const { startDataRetentionJob } = require('./jobs/dataRetention.job');
const { initSocket } = require('./configs/socket');
const logger = require('./utils/logger');
const { apiRateLimiter, speedLimiter, smartRateLimiter, authRateLimiter } = require('./middlewares/rateLimiter.middleware');
const { sanitizeAll } = require('./middlewares/sanitize.middleware');
const {
    originCheck,
    noCache,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest
} = require('./middlewares/security.middleware');
const { checkSessionTimeout } = require('./middlewares/sessionTimeout.middleware');
const {
    apiVersionMiddleware,
    addNonVersionedDeprecationWarning
} = require('./middlewares/apiVersion.middleware');
const performanceMiddleware = require('./middlewares/performance.middleware');
const {
    // Marketplace
    gigRoute,
    authRoute,
    orderRoute,
    conversationRoute,
    messageRoute,
    reviewRoute,
    userRoute,
    jobRoute,
    proposalRoute,
    questionRoute,
    answerRoute,
    firmRoute,

    // Dashboard Core
    dashboardRoute,
    activityRoute,
    caseRoute,
    taskRoute,
    ganttRoute,
    notificationRoute,
    eventRoute,

    // Dashboard Finance
    invoiceRoute,
    expenseRoute,
    timeTrackingRoute,
    paymentRoute,
    retainerRoute,
    billingRateRoute,
    statementRoute,
    transactionRoute,
    reportRoute,

    // Dashboard Organization
    reminderRoute,
    clientRoute,
    calendarRoute,
    lawyerRoute,

    // New API Routes
    tagRoute,
    contactRoute,
    organizationRoute,
    documentRoute,
    followupRoute,
    workflowRoute,
    rateGroupRoute,
    rateCardRoute,
    invoiceTemplateRoute,
    dataExportRoute,
    conflictCheckRoute,
    trustAccountRoute,
    matterBudgetRoute,
    savedReportRoute,

    // Bank Accounts
    bankAccountRoute,
    bankTransferRoute,
    bankTransactionRoute,
    bankReconciliationRoute,
    currencyRoute,

    // Vendors and Bills
    vendorRoute,
    billRoute,
    billPaymentRoute,

    // CRM
    leadRoute,
    crmPipelineRoute,
    referralRoute,
    crmActivityRoute,
    staffRoute,
    leadScoringRoute,
    whatsappRoute,

    // HR
    hrRoute,
    payrollRoute,
    payrollRunRoute,
    leaveRequestRoute,
    attendanceRoute,
    performanceReviewRoute,
    recruitmentRoute,
    onboardingRoute,
    offboardingRoute,
    employeeLoanRoute,
    employeeAdvanceRoute,
    expenseClaimRoute,
    trainingRoute,
    assetAssignmentRoute,
    employeeBenefitRoute,
    grievanceRoute,
    organizationalUnitRoute,
    jobPositionRoute,
    successionPlanRoute,
    compensationRewardRoute,
    analyticsReportRoute,
    kpiAnalyticsRoute,

    // Accounting
    accountRoute,
    generalLedgerRoute,
    journalEntryRoute,
    recurringTransactionRoute,
    priceLevelRoute,
    fiscalPeriodRoute,

    // Finance Management
    financeSetupRoute,
    creditNoteRoute,
    debitNoteRoute,
    recurringInvoiceRoute,
    paymentTermsRoute,
    expensePolicyRoute,
    corporateCardRoute,
    paymentReceiptRoute,
    invoiceApprovalRoute,
    notificationSettingsRoute,

    // Investment & Trading Journal
    tradesRoute,
    brokersRoute,
    tradingAccountsRoute,

    // Investment Portfolio
    investmentsRoute,
    investmentSearchRoute,

    // Invitations
    invitationRoute,

    // Team Management
    teamRoute,

    // Audit & Approvals
    auditRoute,
    auditLogRoute,
    approvalRoute,

    // Permissions
    permissionRoute,

    // 10/10 Features
    biometricRoute,
    emailMarketingRoute,
    hrAnalyticsRoute,
    documentAnalysisRoute,
    smartSchedulingRoute,

    // Saudi Banking Integration
    saudiBankingRoute,

    // Webhooks
    webhookRoute,

    // Health Check & Monitoring
    healthRoute,
    metricsRoute,

    // Security Incident Reporting (NCA ECC-2:2024 Compliance)
    securityIncidentRoute,

    // PDPL Consent Management
    consentRoute,

    // Queue Management
    queueRoute,

    // AI Settings
    aiSettingsRoute,

    // AI Chat
    aiChatRoute,

    // CaseNotion (Notion-like case workspace)
    caseNotionRoute,

    // Legal Contracts (Najiz Integration)
    legalContractRoute,

    // PDFMe (Template-based PDF generation)
    pdfmeRoute,

    // Saudi Government API Integration
    verifyRoute,

    // Extended HR (ERPNext HRMS parity)
    shiftRoute,
    leaveManagementRoute,
    hrExtendedRoute,

    // Unified Data Flow
    unifiedDataRoute,

    // Plan & Subscription
    planRoute,
    apiKeyRoute
} = require('./routes');

// Import versioned routes
const v1Routes = require('./routes/v1');
const v2Routes = require('./routes/v2');

const app = express();
const server = http.createServer(app);

// ============================================
// TRUST PROXY CONFIGURATION
// ============================================
// Required when running behind a reverse proxy (Render, Cloudflare, etc.)
// This allows express-rate-limit to correctly identify client IPs from X-Forwarded-For header
// See: https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', true);

// ============================================
// SENTRY REQUEST HANDLERS - Must be first middleware
// ============================================
// Initialize Sentry with the Express app
initSentry(app);

// Add Sentry request handler - tracks all incoming requests
app.use(getRequestHandler());

// Add Sentry tracing handler - performance monitoring
app.use(getTracingHandler());

// Initialize Socket.io
initSocket(server);

// ✅ SECURITY: Enhanced Helmet Configuration with strict security headers
app.use(helmet({
    // Content Security Policy - Restrict resource loading
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'", // Required for some analytics
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://ssl.google-analytics.com",
                "https://static.cloudflareinsights.com"
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "blob:",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com"
            ],
            connectSrc: [
                "'self'",
                "wss:",
                "ws:",
                "https://www.google-analytics.com",
                "https://analytics.google.com",
                "https://region1.google-analytics.com",
                "https://cloudflareinsights.com"
            ],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    // Prevent clickjacking attacks
    frameguard: {
        action: 'deny' // X-Frame-Options: DENY
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true, // Apply to all subdomains
        preload: true // Submit to HSTS preload list
    },
    // Prevent MIME type sniffing
    noSniff: true, // X-Content-Type-Options: nosniff
    // Referrer Policy - Control referrer information
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin' // Send origin only for cross-origin requests
    },
    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Disable for API flexibility
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for API
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Remove X-Powered-By header
    hidePoweredBy: true,
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    // IE No Open - prevents IE from executing downloads
    ieNoOpen: true,
    // X-XSS-Protection (legacy but defense-in-depth)
    xssFilter: true
}));

// ✅ SECURITY: Additional security headers
app.use(securityHeaders);

// ✅ PERFORMANCE: Response compression (gzip with optimized settings)
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Skip compression for already compressed responses
        const contentType = res.getHeader('Content-Type');
        if (contentType && /image|video|audio|font/.test(contentType)) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6, // Balanced compression level (1-9)
    threshold: 512, // Compress responses > 512 bytes for API responses
    memLevel: 8, // Higher memory for better compression
    chunkSize: 16384 // 16KB chunks for streaming
}));

// ✅ ENHANCED CORS CONFIGURATION - Supports Cloudflare Pages deployments
const allowedOrigins = [
    // Production URLs
    'https://traf3li.com',
    'https://dashboard.traf3li.com',
    'https://www.traf3li.com',
    'https://www.dashboard.traf3li.com',

    // Cloudflare Pages
    'https://traf3li-dashboard.pages.dev',

    // Development URLs
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:8080',

    // Environment variables
    process.env.CLIENT_URL,
    process.env.DASHBOARD_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // Allow Cloudflare Pages preview deployments (*.pages.dev)
        if (origin.includes('.pages.dev')) {
            return callback(null, true);
        }

        // Allow Vercel preview deployments (for backward compatibility)
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        // Check against whitelist
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Log blocked origins for debugging
        console.log('🚫 CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // CRITICAL: Allows HttpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name',
        'X-CSRF-Token', // Allow CSRF token header
        'X-XSRF-Token',  // Alternative CSRF token header
        'API-Version' // API versioning header
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // 24 hours - cache preflight requests
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ✅ PERFORMANCE: JSON body parser with size limit
app.use(express.json({ limit: '10mb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ✅ SECURITY: Request sanitization (remove null bytes, limit string length)
app.use(sanitizeRequest);

// ✅ SECURITY: Input sanitization (XSS and injection attack prevention)
app.use(sanitizeAll);

// ✅ SECURITY: Content-Type validation for POST/PUT/PATCH
app.use(validateContentType);

// ✅ SECURITY: CSRF token generation (double-submit cookie pattern)
app.use(setCsrfToken);

// ✅ SECURITY: Request logging with correlation IDs
app.use(logger.requestMiddleware);

// ✅ PERFORMANCE: Track API response times (target: < 300ms)
app.use(performanceMiddleware);

// ✅ SENTRY: Add user context for authenticated requests
app.use(sentrySetUserContext);

// ✅ SENTRY: Add request breadcrumbs for error tracking
app.use(addRequestBreadcrumb);

// ✅ SECURITY: Smart API rate limiting (per-user for authenticated, per-IP for unauthenticated)
// Uses user ID for authenticated requests (100 req/min), IP for unauthenticated (20 req/min)
// This allows dashboard parallel API calls while still protecting against abuse
app.use('/api', smartRateLimiter);

// ✅ SECURITY: Speed limiter - adds progressive delay after threshold
// Tuned for SPA: 200 requests/min at full speed, then 200ms delays (max 5s)
app.use('/api', speedLimiter);

// ✅ SECURITY: Origin check for state-changing operations (CSRF defense-in-depth)
app.use('/api', originCheck);

// ✅ SECURITY: CSRF token validation for state-changing operations
// Note: Can be selectively disabled for specific routes if needed
app.use('/api', validateCsrfToken);

// ✅ SECURITY: Session timeout check (30 min idle, 24 hour absolute)
// Validates session hasn't exceeded idle or absolute timeout limits
app.use('/api', checkSessionTimeout);

// ✅ API VERSIONING: Extract and validate API version from URL or headers
app.use('/api', apiVersionMiddleware);


// ✅ PERFORMANCE: Static files with caching (optimized for frontend service worker)
app.use('/uploads', express.static('uploads', {
    maxAge: '7d', // Cache static files for 7 days
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Set cache control headers based on file type
        // These headers coordinate with frontend service worker caching strategies
        if (path.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
            // Fonts: cache for 1 year (immutable - they rarely change)
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
            // Images: cache for 1 month
            res.setHeader('Cache-Control', 'public, max-age=2592000');
        } else if (path.match(/\.(css|js)$/i)) {
            // CSS/JS with hashes: cache for 1 year (immutable)
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (path.match(/\.(pdf|doc|docx)$/i)) {
            // Documents: cache for 1 day
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ============================================
// API VERSIONED ROUTES (v1, v2, etc.)
// ============================================
// Mount versioned routes - these are the primary endpoints going forward
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// ============================================
// BACKWARD COMPATIBILITY ROUTES (LEGACY)
// ============================================
// Keep /api/* routes for backward compatibility (maps to v1)
// Add deprecation warning headers to encourage migration
app.use('/api', addNonVersionedDeprecationWarning);

// ============================================
// MARKETPLACE ROUTES (LEGACY - maps to v1)
// ============================================
app.use('/api/gigs', gigRoute);
app.use('/api/auth', noCache, authRoute); // No cache for auth endpoints
app.use('/api/orders', orderRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/messages', messageRoute);
app.use('/api/reviews', reviewRoute);
app.use('/api/users', noCache, userRoute); // No cache for user data
app.use('/api/jobs', jobRoute);
app.use('/api/proposals', proposalRoute);
app.use('/api/questions', questionRoute);
app.use('/api/answers', answerRoute);
app.use('/api/firms', firmRoute);

// ============================================
// DASHBOARD CORE ROUTES
// ============================================
app.use('/api/dashboard', noCache, dashboardRoute); // No cache for dashboard data
app.use('/api/activities', activityRoute);
app.use('/api/cases', caseRoute);
app.use('/api/tasks', taskRoute);
app.use('/api/gantt', ganttRoute);
app.use('/api/notifications', noCache, notificationRoute); // No cache for notifications
app.use('/api/events', eventRoute);

// ============================================
// DASHBOARD FINANCE ROUTES (Sensitive Data)
// ============================================
app.use('/api/invoices', noCache, invoiceRoute); // No cache for financial data
app.use('/api/expenses', noCache, expenseRoute);
app.use('/api/time-tracking', timeTrackingRoute);
app.use('/api/payments', noCache, paymentRoute); // Critical: No cache for payments
app.use('/api/retainers', noCache, retainerRoute);
app.use('/api/billing-rates', billingRateRoute);
app.use('/api/statements', noCache, statementRoute);
app.use('/api/transactions', noCache, transactionRoute);
app.use('/api/reports', noCache, reportRoute);

// ============================================
// DASHBOARD ORGANIZATION ROUTES
// ============================================
app.use('/api/reminders', reminderRoute);
app.use('/api/clients', clientRoute);
app.use('/api/calendar', calendarRoute);
app.use('/api/lawyers', lawyerRoute);

// ============================================
// NEW API ROUTES
// ============================================
app.use('/api/tags', tagRoute);
app.use('/api/contacts', contactRoute);
app.use('/api/organizations', organizationRoute);
app.use('/api/documents', documentRoute);
app.use('/api/followups', followupRoute);
app.use('/api/workflows', workflowRoute);
app.use('/api/rate-groups', rateGroupRoute);
app.use('/api/rate-cards', rateCardRoute);
app.use('/api/invoice-templates', invoiceTemplateRoute);
app.use('/api/data-export', noCache, dataExportRoute); // No cache for data exports
app.use('/api/conflict-checks', conflictCheckRoute);
app.use('/api/trust-accounts', noCache, trustAccountRoute); // No cache for trust accounts
app.use('/api/matter-budgets', matterBudgetRoute);
app.use('/api/saved-reports', savedReportRoute);

// ============================================
// BANK ACCOUNT ROUTES (Highly Sensitive)
// ============================================
app.use('/api/bank-accounts', noCache, bankAccountRoute);
app.use('/api/bank-transfers', noCache, bankTransferRoute);
app.use('/api/bank-transactions', noCache, bankTransactionRoute);
app.use('/api/bank-reconciliations', noCache, bankReconciliationRoute);
app.use('/api/currency', currencyRoute);

// ============================================
// VENDOR AND BILLS ROUTES
// ============================================
app.use('/api/vendors', vendorRoute);
app.use('/api/bills', noCache, billRoute);
app.use('/api/bill-payments', noCache, billPaymentRoute);

// CRM Routes
app.use('/api/leads', leadRoute);
app.use('/api/crm-pipelines', crmPipelineRoute);
app.use('/api/referrals', referralRoute);
app.use('/api/crm-activities', crmActivityRoute);
app.use('/api/staff', staffRoute);
app.use('/api/lead-scoring', leadScoringRoute);
app.use('/api/whatsapp', whatsappRoute);

// ============================================
// HR ROUTES (Sensitive Employee Data)
// ============================================
app.use('/api/hr', noCache, hrRoute); // No cache for HR data
app.use('/api/hr/payroll', noCache, payrollRoute); // Critical: No cache for payroll
app.use('/api/hr/payroll-runs', noCache, payrollRunRoute);
app.use('/api/leave-requests', leaveRequestRoute);
app.use('/api/attendance', noCache, attendanceRoute);
app.use('/api/hr/performance-reviews', noCache, performanceReviewRoute);
app.use('/api/hr/recruitment', recruitmentRoute);
app.use('/api/hr/onboarding', onboardingRoute);
app.use('/api/hr/offboarding', offboardingRoute);
app.use('/api/hr/employee-loans', noCache, employeeLoanRoute);
app.use('/api/hr/advances', noCache, employeeAdvanceRoute);
app.use('/api/hr/expense-claims', noCache, expenseClaimRoute);
app.use('/api/hr/trainings', trainingRoute);
app.use('/api/hr/asset-assignments', assetAssignmentRoute);
app.use('/api/hr/benefits', noCache, employeeBenefitRoute);
app.use('/api/hr/employee-benefits', noCache, employeeBenefitRoute);  // Alias for frontend
app.use('/api/hr/grievances', noCache, grievanceRoute);
app.use('/api/hr/organizational-structure', organizationalUnitRoute);
app.use('/api/hr/job-positions', jobPositionRoute);
app.use('/api/hr/succession-plans', successionPlanRoute);
app.use('/api/succession-plans', successionPlanRoute);  // Alias for frontend (also available at /hr/succession-plans)
app.use('/api/hr/compensation', noCache, compensationRewardRoute);
app.use('/api/hr/compensation-rewards', noCache, compensationRewardRoute);  // Alias for frontend

// Analytics Reports Routes
app.use('/api/analytics-reports', analyticsReportRoute);

// KPI Analytics Routes
app.use('/api/analytics', kpiAnalyticsRoute);

// Accounting Routes
app.use('/api/accounts', accountRoute);
app.use('/api/general-ledger', generalLedgerRoute);
app.use('/api/journal-entries', journalEntryRoute);
app.use('/api/recurring-transactions', recurringTransactionRoute);
app.use('/api/price-levels', priceLevelRoute);
app.use('/api/fiscal-periods', fiscalPeriodRoute);

// ============================================
// FINANCE MANAGEMENT ROUTES
// ============================================
app.use('/api/finance-setup', noCache, financeSetupRoute);
app.use('/api/credit-notes', noCache, creditNoteRoute);
app.use('/api/debit-notes', noCache, debitNoteRoute);
app.use('/api/recurring-invoices', noCache, recurringInvoiceRoute);
app.use('/api/payment-terms', paymentTermsRoute);
app.use('/api/expense-policies', expensePolicyRoute);
app.use('/api/corporate-cards', noCache, corporateCardRoute);
app.use('/api/payment-receipts', noCache, paymentReceiptRoute);
app.use('/api/invoice-approvals', noCache, invoiceApprovalRoute);
app.use('/api/notification-settings', noCache, notificationSettingsRoute);

// Investment & Trading Journal Routes
app.use('/api/v1/trades', tradesRoute);
app.use('/api/v1/brokers', brokersRoute);
app.use('/api/v1/trading-accounts', tradingAccountsRoute);

// Investment Portfolio Routes
app.use('/api/investments', investmentsRoute);
app.use('/api/investment-search', investmentSearchRoute);

// Invitation Routes
app.use('/api/invitations', invitationRoute);

// ============================================
// TEAM MANAGEMENT ROUTES
// ============================================
app.use('/api/team', noCache, teamRoute); // No cache for team data

// ============================================
// AUDIT & APPROVAL ROUTES
// ============================================
app.use('/api/audit', noCache, auditRoute); // No cache for audit logs (team activity)
app.use('/api/audit-logs', noCache, auditLogRoute); // System-wide audit logs
app.use('/api/approvals', noCache, approvalRoute);

// ============================================
// PERMISSION ROUTES
// ============================================
app.use('/api/permissions', noCache, permissionRoute); // No cache for permissions

// ============================================
// 10/10 FEATURE ROUTES (Competitive Analysis)
// ============================================

// Biometric & Geo-Fencing (HR 10/10)
app.use('/api/biometric', biometricRoute);

// Email Marketing (CRM 10/10)
app.use('/api/email-marketing', emailMarketingRoute);

// HR Analytics & AI Predictions (HR 10/10)
app.use('/api/hr-analytics', hrAnalyticsRoute);

// AI Document Analysis (Document Management 10/10)
app.use('/api/document-analysis', documentAnalysisRoute);

// Smart Scheduling & NLP (Task Management 10/10)
app.use('/api/smart-scheduling', smartSchedulingRoute);

// AI Settings (API Keys Management)
app.use('/api/settings/ai', aiSettingsRoute);

// AI Chat (Chat popup with Claude/GPT)
app.use('/api/chat', aiChatRoute);

// CaseNotion (Notion-like case workspace)
app.use('/api/case-notion', caseNotionRoute);

// Legal Contracts (Najiz Integration)
app.use('/api/contracts', legalContractRoute);

// PDFMe (Template-based PDF generation)
app.use('/api/pdfme', pdfmeRoute);

// Saudi Banking Integration (Lean, WPS, SADAD, Mudad)
app.use('/api/saudi-banking', noCache, saudiBankingRoute); // No cache for banking integration

// ============================================
// SAUDI GOVERNMENT API INTEGRATION ROUTES
// ============================================
// Yakeen, Wathq, MOJ verification endpoints
app.use('/api/verify', noCache, verifyRoute); // No cache for verification data

// ============================================
// EXTENDED HR ROUTES (ERPNext HRMS Parity)
// ============================================
// Shift management (shift types, assignments)
app.use('/api/hr/shifts', noCache, shiftRoute);

// Leave management (periods, policies, allocations)
app.use('/api/hr/leave-management', noCache, leaveManagementRoute);

// Extended HR features (encashment, compensatory, promotions, transfers, etc.)
app.use('/api/hr/extended', noCache, hrExtendedRoute);

// ============================================
// UNIFIED DATA FLOW ROUTES
// ============================================
// Consolidated data endpoints for dashboard integration
app.use('/api/unified', noCache, unifiedDataRoute);

// Plan & Subscription Routes
app.use('/api/plans', planRoute);
app.use('/api/api-keys', apiKeyRoute);

// ============================================
// WEBHOOK ROUTES (Third-Party Integrations)
// ============================================
app.use('/api/webhooks', noCache, webhookRoute); // No cache for webhook management

// ============================================
// ALIAS ROUTES (for frontend compatibility)
// ============================================

// Case workflows alias (frontend expects /api/case-workflows)
app.use('/api/case-workflows', workflowRoute);

// Billing aliases (frontend expects /api/billing/rates and /api/billing/groups)
app.use('/api/billing/rates', billingRateRoute);
app.use('/api/billing/groups', rateGroupRoute);

// HR aliases (frontend expects routes without /hr/ prefix)
app.use('/api/payroll-runs', noCache, payrollRunRoute); // No cache for payroll

// Bank reconciliation alias (frontend expects singular form)
app.use('/api/bank-reconciliation', noCache, bankReconciliationRoute);

// Apps endpoint (placeholder for app integrations)
app.get('/api/apps', (req, res) => {
    // Return empty apps list for now - can be expanded later
    res.json({
        success: true,
        data: {
            apps: [],
            installed: [],
            available: []
        },
        message: 'Apps feature coming soon'
    });
});

// ============================================
// API DOCUMENTATION (SWAGGER)
// ============================================
// Swagger UI - Interactive API documentation at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Traf3li API Documentation',
    customfavIcon: '/favicon.ico'
}));

// Swagger JSON spec endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ============================================
// HEALTH CHECK & MONITORING ROUTES
// ============================================
// Health check endpoints (no auth required for basic checks)
// These endpoints are exempt from rate limiting, CSRF, and other middleware
app.use('/health', healthRoute);

// Metrics endpoint (requires auth)
app.use('/metrics', metricsRoute);

// Security Incident Reporting (NCA ECC-2:2024 Compliance)
app.use('/api/security', noCache, securityIncidentRoute);

// PDPL Consent Management (NCA ECC-2:2024 & PDPL Compliance)
app.use('/api/consent', noCache, consentRoute);

// Queue management endpoint (requires auth + admin)
app.use('/api/queues', noCache, queueRoute);

// ============================================
// 404 HANDLER - Must be after all routes
// ============================================
// Handle 404 errors with CORS headers
app.use((req, res, next) => {
    // Set CORS headers for 404 responses
    const origin = req.headers.origin;
    if (origin) {
        // Check if origin is allowed
        const isAllowed = allowedOrigins.includes(origin) || origin.includes('.pages.dev') || origin.includes('.vercel.app');
        if (isAllowed) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            messageAr: `المسار ${req.method} ${req.originalUrl} غير موجود`
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id
        }
    });
});

// ============================================
// SENTRY ERROR HANDLER - Must be before custom error handler
// ============================================
// Sentry error handler - captures errors and sends to Sentry
app.use(getErrorHandler());

// ============================================
// CUSTOM ERROR HANDLER - Must be last
// ============================================
// Error handling middleware with bilingual support
app.use((err, req, res, next) => {
    // Set CORS headers for error responses
    const origin = req.headers.origin;
    if (origin) {
        const isAllowed = allowedOrigins.includes(origin) || origin.includes('.pages.dev') || origin.includes('.vercel.app');
        if (isAllowed) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    // Log error with structured logger
    logger.logError(err, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        userId: req.userID,
        firmId: req.firmId
    });

    // Helper to create bilingual error response
    const createErrorResponse = (code, message, messageAr, status, details = null) => {
        const response = {
            success: false,
            error: {
                code,
                message,
                messageAr
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        };

        if (details && process.env.NODE_ENV !== 'production') {
            response.error.details = details;
        }

        if (process.env.NODE_ENV !== 'production' && err.stack) {
            response.stack = err.stack;
        }

        return res.status(status).json(response);
    };

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return createErrorResponse(
            'VALIDATION_ERROR',
            messages.join(', '),
            'خطأ في التحقق من البيانات',
            400,
            err.errors
        );
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        return createErrorResponse(
            'INVALID_INPUT',
            `Invalid ${err.path}: ${err.value}`,
            `قيمة غير صالحة للحقل: ${err.path}`,
            400
        );
    }

    // Handle duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return createErrorResponse(
            'ALREADY_EXISTS',
            `Duplicate value for field: ${field}`,
            `قيمة مكررة للحقل: ${field}`,
            400
        );
    }

    // Handle custom exceptions with bilingual support
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Something went wrong!';
    const messageAr = err.messageAr || 'حدث خطأ ما!';
    const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR');

    createErrorResponse(code, message, messageAr, status);
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    connectDB();
    scheduleTaskReminders();
    startRecurringInvoiceJobs();
    startTimeEntryJobs();
    startPlanJobs();
    startDataRetentionJob();

    logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid
    });

    logger.info('Security features enabled', {
        helmet: 'enhanced with CSP, HSTS, and strict headers',
        cors: 'enabled with origin validation',
        rateLimiting: 'API rate limiter + speed limiter',
        requestLogging: 'enabled with correlation IDs',
        csrf: 'double-submit cookie pattern',
        originCheck: 'enabled for state-changing operations',
        contentTypeValidation: 'enabled for POST/PUT/PATCH',
        requestSanitization: 'enabled (null bytes, XSS prevention)',
        noCacheHeaders: 'applied to sensitive endpoints',
        securityHeaders: 'X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy'
    });

    // Keep console output for development convenience
    if (process.env.NODE_ENV !== 'production') {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`⚡ Socket.io ready`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔐 CORS enabled for: traf3li.com, *.pages.dev, *.vercel.app, localhost`);
        console.log(`📊 Request logging: enabled`);
        console.log(`🛡️  Rate limiting: enabled`);
    }
});