const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const connectDB = require('./configs/db');
const { scheduleTaskReminders } = require('./utils/taskReminders');
const { initSocket } = require('./configs/socket');
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

    // HR
    hrRoute,
    payrollRoute,
    payrollRunRoute,
    leaveRequestRoute,
    attendanceRoute,
    performanceReviewRoute,

    // Accounting
    accountRoute,
    generalLedgerRoute,
    journalEntryRoute,
    recurringTransactionRoute,
    priceLevelRoute,
    fiscalPeriodRoute,

    // Investment & Trading Journal
    tradesRoute,
    brokersRoute,
    tradingAccountsRoute,

    // Investment Portfolio
    investmentsRoute,
    investmentSearchRoute,

    // Invitations
    invitationRoute
} = require('./routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middlewares
app.use(helmet());

// ✅ PERFORMANCE: Response compression (gzip)
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6, // Balanced compression level (1-9, 6 is default)
    threshold: 1024 // Only compress responses > 1KB
}));

// ✅ ENHANCED CORS CONFIGURATION - Supports Vercel deployments
const allowedOrigins = [
    // Production URLs
    'https://traf3li.com',
    'https://dashboard.traf3li.com',
    'https://www.traf3li.com',
    'https://www.dashboard.traf3li.com',

    // Vercel Deployments
    'https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app',

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

        // Allow all Vercel preview deployments
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
        'X-File-Name'
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

// ✅ PERFORMANCE: Static files with caching
app.use('/uploads', express.static('uploads', {
    maxAge: '7d', // Cache static files for 7 days
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Set cache control headers
        if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days
        } else if (path.match(/\.(pdf|doc|docx)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    }
}));

// Marketplace Routes
app.use('/api/gigs', gigRoute);
app.use('/api/auth', authRoute);
app.use('/api/orders', orderRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/messages', messageRoute);
app.use('/api/reviews', reviewRoute);
app.use('/api/users', userRoute);
app.use('/api/jobs', jobRoute);
app.use('/api/proposals', proposalRoute);
app.use('/api/questions', questionRoute);
app.use('/api/answers', answerRoute);
app.use('/api/firms', firmRoute);

// Dashboard Core Routes
app.use('/api/dashboard', dashboardRoute);
app.use('/api/activities', activityRoute);
app.use('/api/cases', caseRoute);
app.use('/api/tasks', taskRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/events', eventRoute);

// Dashboard Finance Routes
app.use('/api/invoices', invoiceRoute);
app.use('/api/expenses', expenseRoute);
app.use('/api/time-tracking', timeTrackingRoute);
app.use('/api/payments', paymentRoute);
app.use('/api/retainers', retainerRoute);
app.use('/api/billing-rates', billingRateRoute);
app.use('/api/statements', statementRoute);
app.use('/api/transactions', transactionRoute);
app.use('/api/reports', reportRoute);

// Dashboard Organization Routes
app.use('/api/reminders', reminderRoute);
app.use('/api/clients', clientRoute);
app.use('/api/calendar', calendarRoute);
app.use('/api/lawyers', lawyerRoute);

// New API Routes
app.use('/api/tags', tagRoute);
app.use('/api/contacts', contactRoute);
app.use('/api/organizations', organizationRoute);
app.use('/api/documents', documentRoute);
app.use('/api/followups', followupRoute);
app.use('/api/workflows', workflowRoute);
app.use('/api/rate-groups', rateGroupRoute);
app.use('/api/rate-cards', rateCardRoute);
app.use('/api/invoice-templates', invoiceTemplateRoute);
app.use('/api/data-export', dataExportRoute);
app.use('/api/conflict-checks', conflictCheckRoute);
app.use('/api/trust-accounts', trustAccountRoute);
app.use('/api/matter-budgets', matterBudgetRoute);
app.use('/api/saved-reports', savedReportRoute);

// Bank Account Routes
app.use('/api/bank-accounts', bankAccountRoute);
app.use('/api/bank-transfers', bankTransferRoute);
app.use('/api/bank-transactions', bankTransactionRoute);
app.use('/api/bank-reconciliations', bankReconciliationRoute);

// Vendor and Bills Routes
app.use('/api/vendors', vendorRoute);
app.use('/api/bills', billRoute);
app.use('/api/bill-payments', billPaymentRoute);

// CRM Routes
app.use('/api/leads', leadRoute);
app.use('/api/crm-pipelines', crmPipelineRoute);
app.use('/api/referrals', referralRoute);
app.use('/api/crm-activities', crmActivityRoute);
app.use('/api/staff', staffRoute);

// HR Routes
app.use('/api/hr', hrRoute);
app.use('/api/hr/payroll', payrollRoute);
app.use('/api/hr/payroll-runs', payrollRunRoute);
app.use('/api/leave-requests', leaveRequestRoute);
app.use('/api/attendance', attendanceRoute);
app.use('/api/hr/performance-reviews', performanceReviewRoute);

// Accounting Routes
app.use('/api/accounts', accountRoute);
app.use('/api/general-ledger', generalLedgerRoute);
app.use('/api/journal-entries', journalEntryRoute);
app.use('/api/recurring-transactions', recurringTransactionRoute);
app.use('/api/price-levels', priceLevelRoute);
app.use('/api/fiscal-periods', fiscalPeriodRoute);

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
// ALIAS ROUTES (for frontend compatibility)
// ============================================

// Case workflows alias (frontend expects /api/case-workflows)
app.use('/api/case-workflows', workflowRoute);

// Billing aliases (frontend expects /api/billing/rates and /api/billing/groups)
app.use('/api/billing/rates', billingRateRoute);
app.use('/api/billing/groups', rateGroupRoute);

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

// Health check endpoint (useful for monitoring)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Log error details for debugging
    console.error('❌ Error:', {
        message: err.message,
        status: err.status || err.statusCode,
        name: err.name,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            error: true,
            message: messages.join(', '),
            details: process.env.NODE_ENV !== 'production' ? err.errors : undefined
        });
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: true,
            message: `Invalid ${err.path}: ${err.value}`
        });
    }

    // Handle duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            error: true,
            message: `Duplicate value for field: ${field}`
        });
    }

    // Handle custom exceptions and other errors
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Something went wrong!';

    res.status(status).json({
        error: true,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    connectDB();
    scheduleTaskReminders();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`⚡ Socket.io ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 CORS enabled for:`);
    console.log(`   - https://traf3li.com`);
    console.log(`   - https://dashboard.traf3li.com`);
    console.log(`   - https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app`);
    console.log(`   - All *.vercel.app domains (preview deployments)`);
    console.log(`   - http://localhost:5173`);
    console.log(`   - http://localhost:5174`);
    console.log(`🍪 Cookie settings: httpOnly, sameSite=${process.env.NODE_ENV === 'production' ? 'none' : 'strict'}, secure=${process.env.NODE_ENV === 'production'}`);
});