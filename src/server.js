const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
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

    // Dashboard Core
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

    // Dashboard Organization
    reminderRoute,
    clientRoute,
    calendarRoute
} = require('./routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middlewares
app.use(helmet());

// ✅ UPDATED CORS CONFIGURATION - Added Dashboard URLs
app.use(cors({
    origin: [
        // Production URLs
        'https://traf3li.com',                    // Marketplace
        'https://dashboard.traf3li.com',          // Dashboard (NEW)
        'https://www.traf3li.com',                // Marketplace with www
        'https://www.dashboard.traf3li.com',      // Dashboard with www
        
        // Development URLs
        'http://localhost:5173',                  // Marketplace (Vite default)
        'http://localhost:5174',                  // Dashboard (Vite alternate)
        'http://localhost:3000',                  // Alternative port
        
        // Environment variable (if set)
        process.env.CLIENT_URL,
        process.env.DASHBOARD_URL
    ].filter(Boolean), // Remove undefined values
    credentials: true  // CRITICAL: Allows HttpOnly cookies
}));

app.use(express.json());
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static('uploads'));

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

// Dashboard Core Routes
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

// Dashboard Organization Routes
app.use('/api/reminders', reminderRoute);
app.use('/api/clients', clientRoute);
app.use('/api/calendar', calendarRoute);

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
    console.error(err.stack);
    res.status(500).send({ error: true, message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    connectDB();
    scheduleTaskReminders();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`⚡ Socket.io ready`);
    console.log(`🔐 CORS enabled for:`);
    console.log(`   - https://traf3li.com`);
    console.log(`   - https://dashboard.traf3li.com`);
    console.log(`   - http://localhost:5173`);
    console.log(`   - http://localhost:5174`);
});