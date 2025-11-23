// Marketplace Models
const User = require('./user.model');
const Gig = require('./gig.model');
const Order = require('./order.model');
const Review = require('./review.model');
const Message = require('./message.model');
const Conversation = require('./conversation.model');
const Job = require('./job.model');
const Proposal = require('./proposal.model');
const LegalDocument = require('./legalDocument.model');
const Firm = require('./firm.model');
const Score = require('./score.model');
const PeerReview = require('./peerReview.model');
const Question = require('./question.model');
const Answer = require('./answer.model');

// Dashboard Core Models
const Case = require('./case.model');
const Task = require('./task.model');
const Event = require('./event.model');
const Notification = require('./notification.model');

// Dashboard Finance Models
const Invoice = require('./invoice.model');
const Expense = require('./expense.model');
const TimeEntry = require('./timeEntry.model');
const Payment = require('./payment.model');
const Retainer = require('./retainer.model');
const Statement = require('./statement.model');
const Transaction = require('./transaction.model');
const BillingRate = require('./billingRate.model');
const BillingActivity = require('./billingActivity.model');

// Dashboard Organization Models
const Reminder = require('./reminder.model');
const Client = require('./client.model');
const Report = require('./report.model');

module.exports = {
    // Marketplace
    User,
    Gig,
    Order,
    Review,
    Message,
    Conversation,
    Job,
    Proposal,
    LegalDocument,
    Firm,
    Score,
    PeerReview,
    Question,
    Answer,

    // Dashboard Core
    Case,
    Task,
    Event,
    Notification,

    // Dashboard Finance
    Invoice,
    Expense,
    TimeEntry,
    Payment,
    Retainer,
    Statement,
    Transaction,
    BillingRate,
    BillingActivity,

    // Dashboard Organization
    Reminder,
    Client,
    Report
};
