const gigRoute = require('./gig.route');
const authRoute = require('./auth.route');
const orderRoute = require('./order.route');
const conversationRoute = require('./conversation.route');
const messageRoute = require('./message.route');
const reviewRoute = require('./review.route');
const userRoute = require('./user.route');  // ✅ ADD THIS
const jobRoute = require('./job.route');
const proposalRoute = require('./proposal.route');
const caseRoute = require('./case.route');
const questionRoute = require('./question.route');
const answerRoute = require('./answer.route');
const taskRoute = require('./task.route');
const notificationRoute = require('./notification.route');
const eventRoute = require('./event.route');

module.exports = {
    gigRoute,
    authRoute,
    orderRoute,
    conversationRoute,
    messageRoute,
    reviewRoute,
    userRoute,  // ✅ ADD THIS
    jobRoute,
    proposalRoute,
    caseRoute,
    questionRoute,
    answerRoute,
    taskRoute,
    notificationRoute,
    eventRoute
};
