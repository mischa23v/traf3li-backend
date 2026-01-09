// ============================================
// DOTENV INITIALIZATION - Must be FIRST!
// ============================================
// Load environment variables from .env file BEFORE any other code runs
// This ensures all subsequent code has access to environment variables
require('dotenv').config();

// ============================================
// LOGGER INITIALIZATION - Must be after dotenv!
// ============================================
// Initialize logger early so it can be used for startup errors
const logger = require('./utils/logger');

// ============================================
// ENVIRONMENT VALIDATION - Must be after dotenv!
// ============================================
// Validate all required environment variables before starting the server
// This ensures we fail fast with clear error messages if configuration is missing
const { validateRequiredEnvVars, displayConfigSummary } = require('./utils/startupValidation');

try {
    validateRequiredEnvVars();
    displayConfigSummary();
} catch (error) {
    logger.error('\n❌ STARTUP FAILED:', error.message);
    logger.error('\nServer cannot start without required environment variables.');
    logger.error('Please fix the configuration errors above and try again.\n');
    process.exit(1);
}

// ============================================
// SENTRY INITIALIZATION - Must be after validation!
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
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const connectDB = require('./configs/db');
const { scheduleTaskReminders } = require('./utils/taskReminders');
const { startRecurringInvoiceJobs } = require('./jobs/recurringInvoice.job');
const { startTimeEntryJobs } = require('./jobs/timeEntryLocking.job');
const { startPlanJobs } = require('./jobs/planExpiration.job');
const { startDataRetentionJob } = require('./jobs/dataRetention.job');
const { scheduleSessionCleanup } = require('./jobs/sessionCleanup.job');
const { scheduleSandboxCleanup } = require('./jobs/sandboxCleanup.job');
const { startCustomerHealthJobs } = require('./jobs/customerHealth.job');
const { startEmailCampaignJobs } = require('./jobs/emailCampaign.job');
const { startNotificationDigestJobs } = require('./jobs/notificationDigest.job');
const { startAllJobs: startMLScoringJobs } = require('./jobs/mlScoring.job');
const { startPriceUpdater } = require('./jobs/priceUpdater');
const runAuditLogArchiving = require('./jobs/auditLogArchiving.job');
const { startSLABreachJob } = require('./jobs/slaBreachCheck.job');
const { startSLOMonitoringJob } = require('./jobs/sloMonitoring.job');
const { startStuckDealJob } = require('./jobs/stuckDealDetection.job');
const { startDealHealthJob } = require('./jobs/dealHealthScoring.job');
const { startCycleAutoCompleteJob } = require('./jobs/cycleAutoComplete.job');
const { startDunningJob } = require('./jobs/dunning.job');
const { startIntegrationSyncJob } = require('./jobs/integrationSync.job');
const { startWebhookDeliveryJob } = require('./jobs/webhookDelivery.job');
const { startWorkflowJob } = require('./jobs/workflow.job');
const cron = require('node-cron');
const { initSocket, shutdownSocket } = require('./configs/socket');
const mongoose = require('mongoose');
const {
    smartRateLimiter,
    speedLimiter,
    authRateLimiter,
    sensitiveRateLimiter,
    paymentRateLimiter,
    uploadRateLimiter,
    searchRateLimiter
} = require('./middlewares/rateLimiter.middleware');
const { sanitizeAll } = require('./middlewares/sanitize.middleware');
const { inputSanitizer } = require('./middlewares/inputSanitizer.middleware');
const {
    originCheck,
    noCache,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest
} = require('./middlewares/security.middleware');
const { generateNonce } = require('./middlewares/nonce.middleware');
const { enhancedSecurityHeaders, apiSecurityHeaders } = require('./middlewares/securityHeaders.middleware');
const { initAggressiveDebug, aggressiveErrorHandler } = require('./middlewares/aggressiveDebug');
const { checkSessionTimeout } = require('./middlewares/sessionTimeout.middleware');
const {
    apiVersionMiddleware,
    addNonVersionedDeprecationWarning
} = require('./middlewares/apiVersion.middleware');
const performanceMiddleware = require('./middlewares/performance.middleware');
const { metricsMiddleware } = require('./routes/metrics.route');
const {
    // Marketplace
    gigRoute,
    authRoute,
    mfaRoute,
    captchaRoute,
    adminRoute,
    adminApiRoute,
    adminToolsRoute,
    orderRoute,
    conversationRoute,
    messageRoute,
    reviewRoute,
    disputeRoute,
    userRoute,
    jobRoute,
    proposalRoute,
    questionRoute,
    answerRoute,
    firmRoute,
    organizationTemplateRoute,

    // Dashboard Core
    dashboardRoute,
    activityRoute,
    caseRoute,
    temporalCaseRoute,
    taskRoute,
    ganttRoute,
    notificationRoute,
    notificationPreferenceRoute,
    eventRoute,

    // Dashboard Finance
    invoiceRoute,
    temporalInvoiceRoute,
    expenseRoute,
    timeTrackingRoute,
    paymentRoute,
    retainerRoute,
    billingRateRoute,
    statementRoute,
    transactionRoute,
    reportRoute,
    dunningRoute,

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
    workflowRoutes,
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

    // AI Transaction Matching & Regional Banks
    aiMatchingRoute,
    regionalBanksRoute,

    // Vendors and Bills
    vendorRoute,
    billRoute,
    billPaymentRoute,

    // Subcontracting
    subcontractingRoute,

    // ERPNext-style Modules
    inventoryRoute,
    buyingRoute,
    supportRoute,
    qualityRoute,
    manufacturingRoute,
    assetsRoute,

    // CRM
    leadRoute,
    crmPipelineRoute,
    referralRoute,
    crmActivityRoute,
    staffRoute,
    leadScoringRoute,
    mlScoringRoute,
    contactListRoutes,
    activityPlanRoutes,
    competitorRoutes,
    interestAreaRoutes,

    // Sales Forecasting
    salesForecastRoutes,

    // Sales Quota & CRM Transactions
    salesQuotaRoute,
    crmTransactionRoute,

    // CRM Reports
    crmReportsRoute,
    crmReportsAliasRoute,
    crmReportsExtendedRoute,

    // Appointments
    appointmentRoute,

    // Sales Module
    salesRoute,

    whatsappRoute,
    telegramRoute,
    slackRoute,
    discordRoute,
    zoomRoute,
    githubRoute,
    trelloRoute,
    gmailRoute,
    docusignRoute,
    appsRoute,

    // CRM Enhancement
    slaRoutes,
    conversationRoutes,
    macroRoutes,
    approvalRoutes,
    bulkActionsRoutes,
    viewRoutes,
    automationRoutes,
    timelineRoutes,
    cycleRoutes,
    dealRoomRoutes,
    reportRoutes,
    deduplicationRoutes,
    commandPaletteRoutes,
    keyboardShortcutRoutes,
    lifecycleRoutes,
    dealHealthRoutes,

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

    // Who's Out Calendar & Compliance Dashboard
    whosOutRoute,
    complianceDashboardRoute,
    employeeSelfServiceRoute,

    // Advanced HR Features (ZenHR/Jisr Parity)
    skillMatrixRoute,
    surveyRoute,
    okrRoute,
    fleetRoute,

    // Accounting
    accountRoute,
    generalLedgerRoute,
    journalEntryRoute,
    recurringTransactionRoute,
    priceLevelRoute,
    fiscalPeriodRoute,
    interCompanyRoute,

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

    // Setup Wizard (App Onboarding)
    setupWizardRoute,

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

    // Security Monitoring & Alerting
    securityRoute,

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

    // KYC/AML Verification
    kycRoute,

    // Extended HR (ERPNext HRMS parity)
    shiftRoute,
    leaveManagementRoute,
    hrExtendedRoute,

    // HR Frontend-Expected Routes
    employeeIncentiveRoute,
    employeePromotionRoute,
    skillMapRoute,
    employeeTransferRoute,

    // HR Setup Wizard Routes
    hrSetupRoute,

    // HR Policy Routes
    hrExpensePolicyRoute,
    hrLeavePolicyRoute,
    hrLeavePolicyAssignmentRoute,
    hrAttendanceRulesRoute,
    hrSalaryComponentsRoute,

    // Settings Alias Routes
    settingsAliasRoute,

    // CRM Alias Routes
    crmAliasRoute,

    // Leave Management Routes
    leaveEncashmentRoute,
    leaveAllocationRoute,
    compensatoryLeaveRoute,

    // Batch 4 Routes
    eventsExtendedRoute,
    authExtendedRoute,
    interCompanyExtendedRoute,
    productsEnhancedRoute,
    subscriptionsRoute,
    corporateCardsRoute,

    // Batch 5 Routes (HR recruitment extended, retention bonuses, payroll extended)
    hrRecruitmentExtendedRoute,
    hrRetentionBonusRoute,
    hrPayrollExtendedRoute,

    // Batch 6 Routes (activities, shifts, transactions, workflows extended)
    activitiesExtendedRoute,
    shiftAssignmentsRoute,
    shiftRequestsRoute,
    transactionsExtendedRoute,
    workflowExtendedRoute,

    // Batch 7 Routes (approvals, assets, attendance extended)
    approvalsExtendedRoute,
    assetsExtendedRoute,
    attendanceExtendedRoute,

    // Batch 8 Routes (automated actions, budgets, audit logs extended)
    automatedActionsExtendedRoute,
    budgetsRoute,
    auditLogsExtendedRoute,

    // Unified Data Flow
    unifiedDataRoute,

    // User Settings (View Mode Preferences)
    userSettingsRoute,

    // Plan & Subscription
    planRoute,
    apiKeyRoute,

    // WebAuthn (Hardware Security Keys & Biometric Authentication)
    webauthnRoute,

    // SAML/SSO (Enterprise SSO Authentication)
    samlRoute,

    // SSO Configuration (Enterprise SSO Management UI)
    ssoConfigRoute,

    // LDAP/Active Directory (Enterprise LDAP Authentication)
    ldapRoute,

    // Odoo Integration
    activityRoutes,
    threadMessageRoutes,
    chatterFollowerRoutes,
    lockDateRoutes,
    automatedActionRoutes,
    smartButtonRoute,

    // Additional Enterprise Features
    billingRoute,
    emailSettingsRoute,
    consolidatedReportsRoute,
    oauthRoute,

    // Churn Management
    churnRoute,

    // Saved Filters
    savedFilterRoutes,

    // Google Calendar Integration
    googleCalendarRoute,

    // Analytics (Event-based Analytics System)
    analyticsRoutes,

    // Cloud Storage Integration
    cloudStorageRoutes,

    // Offline Sync
    offlineSyncRoutes,

    // Sandbox/Demo Environment
    sandboxRoute,

    // AR Aging
    arAgingRoute,

    // Integrations (QuickBooks, Xero)
    integrationsRoute,

    // Walkthrough
    walkthroughRoute,

    // Status Page
    statusRoute,

    // Field History
    fieldHistoryRoutes,

    // SLO Monitoring
    sloMonitoringRoutes,

    // Custom Fields
    customFieldRoutes,

    // Plugins
    pluginRoutes,

    // Rate Limiting
    rateLimitRoute,

    // GOSI and ZATCA Plugins
    gosiRoute,
    zatcaRoute
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
// Using 1 instead of true to trust only the first proxy hop (fixes express-rate-limit ERR_ERL_PERMISSIVE_TRUST_PROXY)
app.set('trust proxy', 1);

// ============================================
// SENTRY REQUEST HANDLERS - Must be first middleware
// ============================================
// Initialize Sentry with the Express app
initSentry(app);

// Add Sentry request handler - tracks all incoming requests
app.use(getRequestHandler());

// Add Sentry tracing handler - performance monitoring
app.use(getTracingHandler());

// ============================================
// AGGRESSIVE DEBUG MODE - Enable with DEBUG_MODE=aggressive
// ============================================
// Provides comprehensive error logging with:
// - Full stack traces with exact file/line numbers
// - Source code context for errors
// - Request/response logging with timing
// - MongoDB query logging
// ALWAYS ENABLED - Aggressive debug mode for all environments
let debugMiddleware = null;
debugMiddleware = initAggressiveDebug(app, mongoose);
logger.info('🔍 Aggressive debug mode enabled - all errors will show detailed traces');

// Initialize Socket.io
initSocket(server);

// ✅ SECURITY: Generate CSP nonce for each request (must be before Helmet)
app.use(generateNonce);

// ✅ SECURITY: Enhanced Helmet Configuration with strict CSP and nonce-based script execution
app.use((req, res, next) => {
    // Get nonce from res.locals (generated by generateNonce middleware)
    const nonce = res.locals.cspNonce;

    helmet({
        // Content Security Policy - Strict configuration with nonce and strict-dynamic
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // scriptSrc: Use nonce-based execution with strict-dynamic
                // strict-dynamic allows scripts loaded by nonce-trusted scripts
                // This eliminates need for unsafe-inline/unsafe-eval while maintaining flexibility
                scriptSrc: [
                    "'self'",
                    `'nonce-${nonce}'`,
                    "'strict-dynamic'", // Allow scripts loaded by trusted scripts
                    // Fallback for browsers that don't support strict-dynamic
                    "https://www.googletagmanager.com",
                    "https://www.google-analytics.com",
                    "https://ssl.google-analytics.com",
                    "https://static.cloudflareinsights.com",
                    // Cloudflare Turnstile CAPTCHA
                    "https://challenges.cloudflare.com"
                ],
                // styleSrc: Allow inline styles with nonce (or use external stylesheets)
                styleSrc: [
                    "'self'",
                    `'nonce-${nonce}'`,
                    // Keep unsafe-inline for now for compatibility, will be ignored if nonce is present
                    "'unsafe-inline'"
                ],
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
                    "https://cloudflareinsights.com",
                    // Cloudflare Turnstile CAPTCHA
                    "https://challenges.cloudflare.com",
                    // CSP report endpoint
                    `${process.env.API_URL || 'https://api.traf3li.com'}/api/security/csp-report`
                ],
                fontSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: [
                    "'self'",
                    // Cloudflare Turnstile CAPTCHA iframe
                    "https://challenges.cloudflare.com"
                ],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
                // CSP violation reporting
                reportUri: ["/api/security/csp-report"],
                // Modern reporting endpoint (Report-To header)
                reportTo: "csp-endpoint",
                // Upgrade insecure requests in production
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
            },
            // Enforce CSP policy (not report-only mode)
            reportOnly: false
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
        // Cross-Origin policies (configured via enhancedSecurityHeaders middleware)
        crossOriginEmbedderPolicy: false, // Set via middleware for more control
        crossOriginResourcePolicy: false, // Set via middleware for more control
        crossOriginOpenerPolicy: false, // Set via middleware for more control
        // Remove X-Powered-By header
        hidePoweredBy: true,
        // DNS Prefetch Control
        dnsPrefetchControl: { allow: false },
        // IE No Open - prevents IE from executing downloads
        ieNoOpen: true,
        // X-XSS-Protection (legacy but defense-in-depth)
        xssFilter: true
    })(req, res, next);
});

// ✅ SECURITY: Additional security headers (legacy - keep for compatibility)
app.use(securityHeaders);

// ✅ SECURITY: Enhanced security headers (Permissions-Policy, COOP, COEP, CORP)
app.use(enhancedSecurityHeaders);

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
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
    'http://127.0.0.1:3000',

    // Environment variables
    process.env.CLIENT_URL,
    process.env.DASHBOARD_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // In production, be stricter about origin validation
        const isProduction = process.env.NODE_ENV === 'production';

        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        // In production, you may want to restrict this further
        if (!origin) {
            return callback(null, true);
        }

        // ALWAYS allow localhost and 127.0.0.1 (any port) - still in early development
        // To disable later: set DISABLE_LOCALHOST_CORS=true in production
        if (origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin === 'http://localhost' ||
            origin === 'http://127.0.0.1') {
            return callback(null, true);
        }

        // In production, disable wildcard preview deployments (security hardening)
        // Only allow specific preview URLs added to allowedOrigins
        if (!isProduction) {
            // Allow Cloudflare Pages preview deployments in dev/staging (*.pages.dev)
            if (origin.includes('.pages.dev')) {
                return callback(null, true);
            }

            // Allow Vercel preview deployments in dev/staging (for backward compatibility)
            if (origin.includes('.vercel.app')) {
                return callback(null, true);
            }
        }

        // Check against whitelist
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Log blocked origins for debugging and security monitoring
        logger.warn('CORS blocked origin', {
            origin,
            isProduction,
            timestamp: new Date().toISOString()
        });
        logger.info('🚫 CORS blocked origin:', origin);
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
    exposedHeaders: ['Set-Cookie', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours - cache preflight requests
    optionsSuccessStatus: 204,
    // Vary header is now set by enhancedSecurityHeaders middleware
    preflightContinue: false
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ✅ PERFORMANCE: JSON body parser with size limit
// ✅ SECURITY: Preserve raw body for webhook signature validation
app.use(express.json({
    limit: '10mb', // Prevent large payload attacks
    verify: (req, res, buf, encoding) => {
        // Save raw body for webhook signature verification
        // Required by: Stripe, Zoom, DocuSign, Slack, GitHub, and other webhook providers
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ✅ SECURITY: Request sanitization (remove null bytes, limit string length)
app.use(sanitizeRequest);

// ✅ SECURITY: Input sanitization (XSS and injection attack prevention)
app.use(sanitizeAll);

// ✅ SECURITY: NoSQL injection prevention and input sanitization
app.use(inputSanitizer);

// ✅ SECURITY: Content-Type validation for POST/PUT/PATCH
app.use(validateContentType);

// ✅ SECURITY: CSRF token generation (double-submit cookie pattern)
app.use(setCsrfToken);

// ✅ SECURITY: Request logging with correlation IDs
app.use(logger.requestMiddleware);

// ✅ PERFORMANCE: Track API response times (target: < 300ms)
app.use(performanceMiddleware);

// ✅ METRICS: Track HTTP metrics for Prometheus monitoring
app.use(metricsMiddleware);

// ✅ SENTRY: Add user context for authenticated requests
app.use(sentrySetUserContext);

// ✅ SENTRY: Add request breadcrumbs for error tracking
app.use(addRequestBreadcrumb);

// ============================================
// CENTRALIZED RATE LIMITING (Best Practice)
// ============================================
// Layer 1: Specific stricter limits for sensitive routes (applied first)
// Layer 2: General smart rate limiter for all other routes

// ✅ SECURITY: Authentication routes - strict limits to prevent brute force
// 15 attempts per 15 minutes, skips successful requests
app.use('/api/auth', authRateLimiter);
app.use('/api/v1/auth', authRateLimiter);

// ✅ SECURITY: MFA and security-sensitive operations - very strict
// 3 attempts per hour for password reset, account deletion, etc.
app.use('/api/v1/mfa', sensitiveRateLimiter);
app.use('/api/v1/security', sensitiveRateLimiter);

// ✅ SECURITY: Payment routes - prevent payment spam
// 10 payment attempts per hour
app.use('/api/payments', paymentRateLimiter);
app.use('/api/v1/billing', paymentRateLimiter);
app.use('/api/v1/invoices', paymentRateLimiter);
app.use('/api/v1/subscriptions', paymentRateLimiter);

// ✅ SECURITY: File upload routes - prevent upload abuse
// 50 uploads per hour
app.use('/api/v1/documents/upload', uploadRateLimiter);
app.use('/api/v1/files/upload', uploadRateLimiter);

// ✅ SECURITY: Search routes - prevent search abuse
// 30 searches per minute
app.use('/api/v1/search', searchRateLimiter);

// ✅ SECURITY: Smart API rate limiting (per-user for authenticated, per-IP for unauthenticated)
// Uses user ID for authenticated requests (400 req/min), IP for unauthenticated (30 req/min)
// This allows dashboard parallel API calls while still protecting against abuse
// NOTE: This is the fallback for all routes not covered by specific limiters above
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

// ============================================
// GLOBAL AUTHENTICATED API (Enterprise Gold Standard)
// ============================================
// Combines JWT authentication + firm context in ONE middleware.
// Pattern used by: AWS, Google Cloud, Microsoft Azure, Salesforce
//
// Benefits:
// 1. No need to add userMiddleware + firmFilter to individual routes
// 2. Fail-secure: all /api routes require auth by default
// 3. Public routes are explicitly whitelisted
// 4. Firm context (req.firmQuery) is always available after auth
const { authenticatedApi } = require('./middlewares/authenticatedApi.middleware');
app.use('/api', authenticatedApi);

// ✅ DOCUMENT LOGGING: Debug logging for document operations (Gold Standard)
// Mount on specific routes only - NOT globally (performance optimization)
const { documentLoggingMiddleware } = require('./services/documentLogger.service');
app.use('/api/documents', documentLoggingMiddleware);
app.use('/api/v1/documents', documentLoggingMiddleware);
app.use('/api/tasks', documentLoggingMiddleware); // For task attachments
app.use('/api/v1/tasks', documentLoggingMiddleware);
app.use('/api/storage', documentLoggingMiddleware);
app.use('/api/v1/storage', documentLoggingMiddleware);

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
// SECURITY.TXT - RFC 9116 Compliance
// ============================================
// Security vulnerability reporting endpoint following RFC 9116 standard
// This allows security researchers to report vulnerabilities responsibly
app.get('/.well-known/security.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'static', '.well-known', 'security.txt'));
});

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
app.use('/api/auth/mfa', noCache, mfaRoute); // MFA/TOTP authentication endpoints
app.use('/api/auth', noCache, captchaRoute); // CAPTCHA verification endpoints
app.use('/api/auth', noCache, authExtendedRoute); // Auth extended (MFA, onboarding, sessions)
app.use('/api/admin', noCache, adminRoute); // Admin endpoints for token management
app.use('/api/admin-api', noCache, adminApiRoute); // Comprehensive Admin API for Appsmith/Budibase integration
app.use('/api/admin/tools', noCache, adminToolsRoute); // Admin tools for system management
app.use('/api/auth/webauthn', noCache, webauthnRoute); // WebAuthn/FIDO2 authentication
app.use('/api/auth/saml', noCache, samlRoute); // SAML/SSO enterprise authentication
app.use('/api/auth/ldap', noCache, ldapRoute); // LDAP/Active Directory authentication (public login endpoint)
app.use('/api/admin/ldap', noCache, ldapRoute); // LDAP configuration management (admin endpoints)
app.use('/api/orders', orderRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/messages', messageRoute);
app.use('/api/reviews', reviewRoute);
app.use('/api/disputes', noCache, disputeRoute); // Dispute resolution system
app.use('/api/users', noCache, userRoute); // No cache for user data
app.use('/api/jobs', jobRoute);
app.use('/api/proposals', proposalRoute);
app.use('/api/questions', questionRoute);
app.use('/api/answers', answerRoute);
app.use('/api/firms', firmRoute);
app.use('/api/firms', noCache, ssoConfigRoute); // SSO configuration management (Enterprise)
app.use('/api/templates', organizationTemplateRoute); // Organization template management

// ============================================
// DASHBOARD CORE ROUTES
// ============================================
app.use('/api/dashboard', noCache, dashboardRoute); // No cache for dashboard data
app.use('/api/activities', activityRoute);
app.use('/api/cases', caseRoute);
app.use('/api/cases', noCache, temporalCaseRoute); // Temporal workflow routes for cases
app.use('/api/tasks', taskRoute);
app.use('/api/gantt', ganttRoute);
app.use('/api/notifications', noCache, notificationRoute); // No cache for notifications
app.use('/api/notification-preferences', noCache, notificationPreferenceRoute); // No cache for preferences
app.use('/api/events', eventRoute);
app.use('/api/events', eventsExtendedRoute); // Events extended (actions, recurring, templates)

// ============================================
// DASHBOARD FINANCE ROUTES (Sensitive Data)
// ============================================
app.use('/api/invoices', noCache, invoiceRoute); // No cache for financial data
app.use('/api/temporal-invoices', noCache, temporalInvoiceRoute); // Temporal workflow-based invoice approval
app.use('/api/expenses', noCache, expenseRoute);
app.use('/api/time-tracking', timeTrackingRoute);
app.use('/api/payments', noCache, paymentRoute); // Critical: No cache for payments
app.use('/api/retainers', noCache, retainerRoute);
app.use('/api/billing-rates', billingRateRoute);
app.use('/api/statements', noCache, statementRoute);
app.use('/api/transactions', noCache, transactionRoute);
app.use('/api/reports', noCache, reportRoute);
app.use('/api/dunning', noCache, dunningRoute); // No cache for dunning data

// ============================================
// DASHBOARD ORGANIZATION ROUTES
// ============================================
app.use('/api/reminders', reminderRoute);
app.use('/api/clients', clientRoute);
app.use('/api/calendar', calendarRoute);
app.use('/api/lawyers', lawyerRoute);

// ============================================
// CALENDAR INTEGRATIONS
// ============================================
app.use('/api/google-calendar', noCache, googleCalendarRoute); // No cache for calendar integration

// ============================================
// CLOUD STORAGE INTEGRATIONS
// ============================================
app.use('/api/storage', noCache, cloudStorageRoutes); // No cache for cloud storage operations

// ============================================
// OFFLINE SYNC (PWA OFFLINE FUNCTIONALITY)
// ============================================
app.use('/api/offline', noCache, offlineSyncRoutes); // No cache for offline sync operations

// ============================================
// NEW API ROUTES
// ============================================
app.use('/api/tags', tagRoute);
app.use('/api/contacts', contactRoute);
app.use('/api/organizations', organizationRoute);
app.use('/api/documents', documentRoute);
app.use('/api/followups', followupRoute);
app.use('/api/workflows', workflowRoute);
app.use('/api/workflows', workflowRoutes);
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
// AI TRANSACTION MATCHING & REGIONAL BANKS
// ============================================
app.use('/api/ai-matching', noCache, aiMatchingRoute);
app.use('/api/regional-banks', noCache, regionalBanksRoute);

// ============================================
// VENDOR AND BILLS ROUTES
// ============================================
app.use('/api/vendors', vendorRoute);
app.use('/api/bills', noCache, billRoute);
app.use('/api/bill-payments', noCache, billPaymentRoute);

// ============================================
// SUBCONTRACTING ROUTES
// ============================================
app.use('/api/subcontracting', noCache, subcontractingRoute);

// ============================================
// ERPNEXT-STYLE MODULE ROUTES
// ============================================
app.use('/api/inventory', noCache, inventoryRoute);
app.use('/api/buying', noCache, buyingRoute);
app.use('/api/support', noCache, supportRoute);
app.use('/api/quality', noCache, qualityRoute);
app.use('/api/manufacturing', noCache, manufacturingRoute);
app.use('/api/assets', noCache, assetsRoute);

// CRM Routes
app.use('/api/leads', leadRoute);
app.use('/api/crm-pipelines', crmPipelineRoute);
app.use('/api/referrals', referralRoute);
app.use('/api/crm-activities', crmActivityRoute);
app.use('/api/staff', staffRoute);
app.use('/api/lead-scoring', leadScoringRoute);
app.use('/api/ml', mlScoringRoute);  // ML-enhanced lead scoring
app.use('/api/contact-lists', contactListRoutes);  // Email list management
app.use('/api/activity-plans', activityPlanRoutes);  // Activity sequences/cadences
app.use('/api/competitors', competitorRoutes);  // Competitor tracking
app.use('/api/interest-areas', interestAreaRoutes);  // Interest areas/topics
app.use('/api/sales-forecasts', salesForecastRoutes);  // Sales forecasting & quota management
app.use('/api/sales-quotas', salesQuotaRoute);  // Sales quota management
app.use('/api/crm-transactions', noCache, crmTransactionRoute);  // CRM transaction logging & analytics
app.use('/api/crm-reports', noCache, crmReportsRoute);  // CRM reports & analytics dashboard
app.use('/api/crm/reports', noCache, crmReportsAliasRoute);  // CRM reports alias for frontend expected paths
app.use('/api/crm-reports', noCache, crmReportsExtendedRoute);  // CRM reports extended (revenue, performance, customer analytics)
app.use('/api/crm', noCache, crmAliasRoute);  // CRM alias (leads, appointments, lead-sources, sales-stages, reports)
app.use('/api/appointments', appointmentRoute);  // Appointments, availability, and scheduling
app.use('/api/sales', noCache, salesRoute);  // Sales module (orders, deliveries, returns, commissions)
app.use('/api/whatsapp', whatsappRoute);
app.use('/api/telegram', noCache, telegramRoute);
app.use('/api/slack', noCache, slackRoute);
app.use('/api/discord', noCache, discordRoute);
app.use('/api/zoom', noCache, zoomRoute);
app.use('/api/github', githubRoute);
app.use('/api/trello', trelloRoute);
app.use('/api/gmail', noCache, gmailRoute);
app.use('/api/docusign', noCache, docusignRoute);

// ============================================
// CRM ENHANCEMENT ROUTES
// ============================================
app.use('/api/sla', slaRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/macros', macroRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/bulk-actions', bulkActionsRoutes);
app.use('/api/views', viewRoutes);
app.use('/api/saved-filters', savedFilterRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/deal-rooms', dealRoomRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/deduplication', deduplicationRoutes);
app.use('/api/command-palette', commandPaletteRoutes);
app.use('/api/keyboard-shortcuts', keyboardShortcutRoutes);
app.use('/api/lifecycle', lifecycleRoutes);
app.use('/api/deals/health', dealHealthRoutes);

// ============================================
// HR ROUTES (Sensitive Employee Data)
// ============================================
app.use('/api/hr', noCache, hrRoute); // No cache for HR data
app.use('/api/hr', noCache, hrSetupRoute); // HR setup wizard (departments, designations, leave-types, shift-types)
app.use('/api/hr/expense-policies', noCache, hrExpensePolicyRoute); // HR expense policies
app.use('/api/hr/leave-policies', noCache, hrLeavePolicyRoute); // HR leave policies
app.use('/api/hr/leave-policy-assignments', noCache, hrLeavePolicyAssignmentRoute); // HR leave policy assignments
app.use('/api/hr/attendance-rules', noCache, hrAttendanceRulesRoute); // HR attendance rules
app.use('/api/hr/salary-components', noCache, hrSalaryComponentsRoute); // HR salary components
app.use('/api/hr/payroll', noCache, payrollRoute); // Critical: No cache for payroll
app.use('/api/hr/payroll-runs', noCache, payrollRunRoute);
app.use('/api/leave-requests', leaveRequestRoute);
app.use('/api/leave-encashments', noCache, leaveEncashmentRoute); // Leave encashment requests
app.use('/api/leave-allocations', noCache, leaveAllocationRoute); // Leave allocations & balances
app.use('/api/compensatory-leave-requests', noCache, compensatoryLeaveRoute); // Compensatory leave
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

// Who's Out Calendar & Compliance Dashboard
app.use('/api/hr/whos-out', noCache, whosOutRoute);
app.use('/api/hr/compliance', noCache, complianceDashboardRoute);
app.use('/api/hr/self-service', noCache, employeeSelfServiceRoute);

// Advanced HR Features (ZenHR/Jisr Parity)
app.use('/api/hr/skills', noCache, skillMatrixRoute);
app.use('/api/hr/surveys', noCache, surveyRoute);
app.use('/api/hr/okrs', noCache, okrRoute);
app.use('/api/hr/fleet', noCache, fleetRoute);

// Analytics Reports Routes
app.use('/api/analytics-reports', analyticsReportRoute);

// Event-based Analytics Routes (Comprehensive Analytics System)
app.use('/api/analytics', noCache, analyticsRoutes);

// KPI Analytics Routes (Legacy - consider migrating to /api/analytics/kpi)
app.use('/api/analytics/kpi', kpiAnalyticsRoute);

// Accounting Routes
app.use('/api/accounts', accountRoute);
app.use('/api/general-ledger', generalLedgerRoute);
app.use('/api/journal-entries', journalEntryRoute);
app.use('/api/recurring-transactions', recurringTransactionRoute);
app.use('/api/price-levels', priceLevelRoute);
app.use('/api/fiscal-periods', fiscalPeriodRoute);
app.use('/api/inter-company', noCache, interCompanyRoute);
app.use('/api/inter-company', noCache, interCompanyExtendedRoute); // Inter-company extended (reconciliation, reports)
app.use('/api/reports/consolidated', noCache, consolidatedReportsRoute);

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
app.use('/api/corporate-cards', noCache, corporateCardsRoute); // Corporate cards extended (transactions, analytics)
app.use('/api/subscriptions', noCache, subscriptionsRoute); // Subscription management
app.use('/api/products/enhanced', noCache, productsEnhancedRoute); // Enhanced products (variants, barcodes)
app.use('/api/payment-receipts', noCache, paymentReceiptRoute);
app.use('/api/invoice-approvals', noCache, invoiceApprovalRoute);
app.use('/api/notification-settings', noCache, notificationSettingsRoute);

// ============================================
// SETUP WIZARD ROUTES (App Onboarding)
// ============================================
app.use('/api/setup', noCache, setupWizardRoute);

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

// General Settings (general, HR, taxes, payment modes)
app.use('/api/settings', noCache, settingsAliasRoute);

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
// KYC/AML VERIFICATION ROUTES
// ============================================
// Know Your Customer and Anti-Money Laundering verification
app.use('/api/kyc', noCache, kycRoute); // No cache for KYC verification data

// ============================================
// EXTENDED HR ROUTES (ERPNext HRMS Parity)
// ============================================
// Shift management (shift types, assignments)
app.use('/api/hr/shifts', noCache, shiftRoute);

// Leave management (periods, policies, allocations)
app.use('/api/hr/leave-management', noCache, leaveManagementRoute);

// Extended HR features (encashment, compensatory, promotions, transfers, etc.)
app.use('/api/hr/extended', noCache, hrExtendedRoute);

// HR Frontend-Expected Routes (employee-incentives, employee-promotions, skill-maps, transfers)
app.use('/api/hr/employee-incentives', noCache, employeeIncentiveRoute);
app.use('/api/hr/employee-promotions', noCache, employeePromotionRoute);
app.use('/api/hr/skill-maps', noCache, skillMapRoute);
app.use('/api/hr/transfers', noCache, employeeTransferRoute);

// Batch 5 Routes (HR recruitment extended, retention bonuses, payroll extended)
app.use('/api/hr/recruitment', noCache, hrRecruitmentExtendedRoute); // Extended recruitment endpoints
app.use('/api/hr/retention-bonuses', noCache, hrRetentionBonusRoute); // Retention bonus management
app.use('/api/hr/payroll-runs', noCache, hrPayrollExtendedRoute); // Extended payroll run operations

// Batch 6 Routes (activities, shifts, transactions, workflows extended)
app.use('/api/activities', noCache, activitiesExtendedRoute); // Extended activities management
app.use('/api/shift-assignments', noCache, shiftAssignmentsRoute); // Shift assignment management
app.use('/api/shift-requests', noCache, shiftRequestsRoute); // Shift request management
app.use('/api/transactions', noCache, transactionsExtendedRoute); // Extended transaction operations
app.use('/api/workflow', noCache, workflowExtendedRoute); // Extended workflow operations

// Batch 7 Routes (approvals, assets, attendance extended)
app.use('/api/approvals', noCache, approvalsExtendedRoute); // Extended approval management
app.use('/api/assets', noCache, assetsExtendedRoute); // Extended asset management
app.use('/api/attendance', noCache, attendanceExtendedRoute); // Extended attendance operations

// Batch 8 Routes (automated actions, budgets, audit logs extended)
app.use('/api/automated-actions', noCache, automatedActionsExtendedRoute); // Extended automated actions
app.use('/api/budgets', noCache, budgetsRoute); // Budget management
app.use('/api/audit-logs', noCache, auditLogsExtendedRoute); // Extended audit log operations

// ============================================
// UNIFIED DATA FLOW ROUTES
// ============================================
// Consolidated data endpoints for dashboard integration
app.use('/api/unified', noCache, unifiedDataRoute);

// User Settings Routes (View Mode Preferences)
app.use('/api/user-settings', noCache, userSettingsRoute);

// Plan & Subscription Routes
app.use('/api/plans', planRoute);
app.use('/api/api-keys', apiKeyRoute);

// Sandbox/Demo Environment Routes
app.use('/api/sandbox', noCache, sandboxRoute); // No cache for sandbox operations

// ============================================
// NEW ERP/FINANCE ENHANCEMENT ROUTES
// ============================================

// AR Aging Reports
app.use('/api/ar-aging', noCache, arAgingRoute); // No cache for financial reports

// External Integrations (QuickBooks, Xero)
app.use('/api/integrations', noCache, integrationsRoute); // No cache for integration data

// In-App Walkthroughs
app.use('/api/walkthroughs', walkthroughRoute);

// Status Page (Public & Admin)
app.use('/api/status', statusRoute);

// Field History (Audit Trail)
app.use('/api/field-history', noCache, fieldHistoryRoutes); // No cache for audit data

// SLO Monitoring
app.use('/api/slo', noCache, sloMonitoringRoutes); // No cache for SLO metrics

// Custom Fields
app.use('/api/custom-fields', customFieldRoutes);

// Plugins
app.use('/api/plugins', pluginRoutes);

// Rate Limiting Configuration
app.use('/api/rate-limits', noCache, rateLimitRoute); // No cache for rate limit config

// ============================================
// GOSI AND ZATCA PLUGIN ROUTES (Saudi Compliance)
// ============================================
app.use('/api/gosi', noCache, gosiRoute); // GOSI calculations and reporting
app.use('/api/zatca', noCache, zatcaRoute); // ZATCA e-invoice submission

// ============================================
// WEBHOOK ROUTES (Third-Party Integrations)
// ============================================
app.use('/api/webhooks', noCache, webhookRoute); // No cache for webhook management

// ============================================
// ODOO INTEGRATION ROUTES
// ============================================
app.use('/api/record-activities', activityRoutes);  // Renamed to avoid conflict with /api/activities
app.use('/api/chatter', threadMessageRoutes);  // Renamed to avoid conflict with /api/messages
app.use('/api/chatter-followers', chatterFollowerRoutes);
app.use('/api/lock-dates', noCache, lockDateRoutes);
app.use('/api/automated-actions', noCache, automatedActionRoutes);
app.use('/api/smart-buttons', smartButtonRoute);  // Odoo-style smart buttons for related record counts

// ============================================
// ADDITIONAL ENTERPRISE FEATURES
// ============================================
app.use('/api/billing', noCache, billingRoute);  // Billing and subscription management
app.use('/api/settings/email', noCache, emailSettingsRoute);  // Email server configuration
app.use('/api/auth/sso', noCache, oauthRoute);  // OAuth/SSO authentication

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

// Apps Integration Routes (Unified Apps API)
app.use('/api/apps', noCache, appsRoute);

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

// Security Monitoring & Alerting (Automated Security Detection)
app.use('/api/security', noCache, securityRoute);

// PDPL Consent Management (NCA ECC-2:2024 & PDPL Compliance)
app.use('/api/consent', noCache, consentRoute);

// Queue management endpoint (requires auth + admin)
app.use('/api/queues', noCache, queueRoute);

// ============================================
// CHURN MANAGEMENT ROUTES
// ============================================
// Churn prediction, tracking, and intervention management
app.use('/api/churn', noCache, churnRoute);

// ============================================
// 404 HANDLER - Must be after all routes
// ============================================
// Handle 404 errors
// Note: CORS headers are not set here to prevent exposing error details to unauthorized origins
// CORS preflight requests are handled by the main CORS middleware
app.use((req, res, next) => {
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
// AGGRESSIVE DEBUG ERROR HANDLER - Logs detailed error info
// ============================================
// Logs full stack traces, source context, and request details
// ALWAYS ENABLED - for all environments including production
app.use(aggressiveErrorHandler);

// ============================================
// CUSTOM ERROR HANDLER - Must be last
// ============================================
// Error handling middleware with bilingual support
// Note: CORS headers are not set here to prevent exposing error details to unauthorized origins
// CORS preflight requests are handled by the main CORS middleware
app.use((err, req, res, next) => {
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

// ═══════════════════════════════════════════════════════════════
// AGGRESSIVE STARTUP OPTIMIZATION
// ═══════════════════════════════════════════════════════════════
// 1. Start server immediately (for health checks)
// 2. Connect to DB with warmup
// 3. Delay cron jobs to allow connections to stabilize
const startServer = async () => {
    try {
        // Connect to DB first with warmup
        await connectDB();

        // Small delay to ensure all connections are warm before cron jobs
        // This prevents "cold query" on first cron execution
        const CRON_STARTUP_DELAY_MS = parseInt(process.env.CRON_STARTUP_DELAY_MS) || 3000;

        setTimeout(() => {
            logger.info('🕐 Starting scheduled jobs after warmup delay...');
            scheduleTaskReminders();
            startRecurringInvoiceJobs();
            startTimeEntryJobs();
            startPlanJobs();
            startDataRetentionJob();
            scheduleSessionCleanup();
            scheduleSandboxCleanup();
            startCustomerHealthJobs();

            // Email Marketing Campaign Jobs
            try {
                startEmailCampaignJobs();
                logger.info('✅ Email campaign jobs started');
            } catch (error) {
                logger.warn('⚠️ Email campaign jobs failed to start:', error.message);
            }

            // Notification Digest Jobs
            try {
                startNotificationDigestJobs();
                logger.info('✅ Notification digest jobs started');
            } catch (error) {
                logger.warn('⚠️ Notification digest jobs failed to start:', error.message);
            }

            // ML Scoring Jobs
            try {
                startMLScoringJobs();
                logger.info('✅ ML scoring jobs started');
            } catch (error) {
                logger.warn('⚠️ ML scoring jobs failed to start:', error.message);
            }

            // Price Updater Jobs
            try {
                startPriceUpdater();
                logger.info('✅ Price updater jobs started');
            } catch (error) {
                logger.warn('⚠️ Price updater jobs failed to start:', error.message);
            }

            // SLA Breach Check Job
            try {
                startSLABreachJob();
                logger.info('✅ SLA breach check job started');
            } catch (error) {
                logger.warn('⚠️ SLA breach check job failed to start:', error.message);
            }

            // SLO Monitoring Job
            try {
                startSLOMonitoringJob();
                logger.info('✅ SLO monitoring job started');
            } catch (error) {
                logger.warn('⚠️ SLO monitoring job failed to start:', error.message);
            }

            // Stuck Deal Detection Job
            try {
                startStuckDealJob();
                logger.info('✅ Stuck deal detection job started');
            } catch (error) {
                logger.warn('⚠️ Stuck deal detection job failed to start:', error.message);
            }

            // Deal Health Scoring Job
            try {
                startDealHealthJob();
                logger.info('✅ Deal health scoring job started');
            } catch (error) {
                logger.warn('⚠️ Deal health scoring job failed to start:', error.message);
            }

            // Cycle Auto-Complete Job
            try {
                startCycleAutoCompleteJob();
                logger.info('✅ Cycle auto-complete job started');
            } catch (error) {
                logger.warn('⚠️ Cycle auto-complete job failed to start:', error.message);
            }

            // Dunning Automation Job
            try {
                startDunningJob();
                logger.info('✅ Dunning automation job started');
            } catch (error) {
                logger.warn('⚠️ Dunning automation job failed to start:', error.message);
            }

            // Integration Sync Job (QuickBooks, Xero)
            try {
                startIntegrationSyncJob();
                logger.info('✅ Integration sync job started');
            } catch (error) {
                logger.warn('⚠️ Integration sync job failed to start:', error.message);
            }

            // Webhook Delivery Job
            try {
                startWebhookDeliveryJob();
                logger.info('✅ Webhook delivery job started');
            } catch (error) {
                logger.warn('⚠️ Webhook delivery job failed to start:', error.message);
            }

            // Workflow Automation Job
            try {
                startWorkflowJob();
                logger.info('✅ Workflow automation job started');
            } catch (error) {
                logger.warn('⚠️ Workflow automation job failed to start:', error.message);
            }

            // Audit Log Archiving - Run daily at 2:30 AM
            cron.schedule('30 2 * * *', async () => {
                try {
                    logger.info('🗄️ Starting audit log archiving...');
                    await runAuditLogArchiving();
                    logger.info('✅ Audit log archiving completed');
                } catch (error) {
                    logger.error('❌ Audit log archiving failed:', error.message);
                }
            });
            logger.info('✅ Audit log archiving scheduled (daily at 2:30 AM)');

            logger.info('✅ All scheduled jobs started');
        }, CRON_STARTUP_DELAY_MS);

    } catch (err) {
        logger.error('❌ Failed to initialize server:', err.message);
        // Continue running - health checks should still work
    }
};

server.listen(PORT, () => {
    // Start DB and cron jobs asynchronously
    startServer();

    logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid
    });

    logger.info('Security features enabled', {
        helmet: 'enhanced with CSP, HSTS, and strict headers',
        csp: 'nonce-based script execution with strict-dynamic',
        cspReporting: 'enabled at /api/security/csp-report',
        cors: 'enabled with strict origin validation (production hardened)',
        rateLimiting: 'API rate limiter + speed limiter',
        requestLogging: 'enabled with correlation IDs',
        csrf: 'double-submit cookie pattern',
        originCheck: 'enabled for state-changing operations',
        contentTypeValidation: 'enabled for POST/PUT/PATCH',
        requestSanitization: 'enabled (null bytes, XSS prevention)',
        noCacheHeaders: 'applied to sensitive endpoints',
        securityHeaders: 'X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy',
        crossOriginPolicies: 'COOP, COEP, CORP configured',
        permissionsPolicy: 'browser features restricted (camera, microphone, geolocation disabled)',
        varyHeader: 'enabled for proper CORS caching'
    });

    // Keep console output for development convenience
    if (process.env.NODE_ENV !== 'production') {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`⚡ Socket.io ready`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔐 CORS enabled for: traf3li.com, *.pages.dev, *.vercel.app, localhost`);
        logger.info(`📊 Request logging: enabled`);
        logger.info(`🛡️  Rate limiting: enabled`);
    }
});

// ============================================
// GLOBAL ERROR HANDLERS - Prevent Server Crashes
// ============================================
// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep server running
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Log the error but don't crash in production
    if (process.env.NODE_ENV === 'development') {
        process.exit(1);
    }
});

// ============================================
// GRACEFUL SHUTDOWN - Clean resource cleanup
// ============================================
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        logger.warn(`Shutdown already in progress, ignoring ${signal}`);
        return;
    }

    isShuttingDown = true;
    logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Set a hard timeout for shutdown (30 seconds)
    const shutdownTimeout = setTimeout(() => {
        logger.error('❌ Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
    }, 30000);

    try {
        // 1. Stop accepting new connections
        logger.info('📡 Closing HTTP server...');
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    logger.error('Error closing HTTP server:', err.message);
                    reject(err);
                } else {
                    logger.info('✅ HTTP server closed');
                    resolve();
                }
            });
        });

        // 2. Close Socket.io connections
        logger.info('🔌 Closing Socket.io connections...');
        await shutdownSocket();

        // 3. Close MongoDB connection
        logger.info('🗄️ Closing MongoDB connection...');
        await mongoose.connection.close();
        logger.info('✅ MongoDB connection closed');

        // 4. Stop cron jobs (node-cron doesn't have a global stop, but tasks will be GC'd)
        logger.info('⏰ Cron jobs will be stopped on process exit');

        clearTimeout(shutdownTimeout);
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        clearTimeout(shutdownTimeout);
        logger.error('❌ Error during graceful shutdown:', error.message);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle HTTP server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
    } else if (error.code === 'EACCES') {
        logger.error(`❌ Permission denied to use port ${PORT}`);
        process.exit(1);
    } else {
        logger.error('❌ HTTP server error:', error);
    }
});