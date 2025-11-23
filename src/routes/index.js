// Marketplace Routes
const gigRoute = require('./gig.route');
const authRoute = require('./auth.route');
const orderRoute = require('./order.route');
const conversationRoute = require('./conversation.route');
const messageRoute = require('./message.route');
const reviewRoute = require('./review.route');
const userRoute = require('./user.route');
const jobRoute = require('./job.route');
const proposalRoute = require('./proposal.route');
const questionRoute = require('./question.route');
const answerRoute = require('./answer.route');

// Dashboard Core Routes
const dashboardRoute = require('./dashboard.route');
const activityRoute = require('./activity.route');
const caseRoute = require('./case.route');
const taskRoute = require('./task.route');
const notificationRoute = require('./notification.route');
const eventRoute = require('./event.route');

// Dashboard Finance Routes
const invoiceRoute = require('./invoice.route');
const expenseRoute = require('./expense.route');
const timeTrackingRoute = require('./timeTracking.route');
const paymentRoute = require('./payment.route');
const retainerRoute = require('./retainer.route');
const billingRateRoute = require('./billingRate.route');
const statementRoute = require('./statement.route');
const transactionRoute = require('./transaction.route');
const reportRoute = require('./report.route');

// Dashboard Organization Routes
const reminderRoute = require('./reminder.route');
const clientRoute = require('./client.route');
const calendarRoute = require('./calendar.route');

module.exports = {
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
    calendarRoute
};
