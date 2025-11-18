const User = require('./user.model');
const Gig = require('./gig.model');
const Order = require('./order.model');
const Review = require('./review.model');
const Message = require('./message.model');
const Conversation = require('./conversation.model');
const Job = require('./job.model');
const Proposal = require('./proposal.model');
const Case = require('./case.model');
const Question = require('./question.model');
const Answer = require('./answer.model');
const Invoice = require('./invoice.model');
const LegalDocument = require('./legalDocument.model');
const Firm = require('./firm.model');
const Score = require('./score.model');
const PeerReview = require('./peerReview.model');
const Task = require('./task.model');
const Notification = require('./notification.model');
const Event = require('./event.model'); // ✅ ADDED
const Expense = require('./expense.model');
const TimeEntry = require('./timeEntry.model');

module.exports = {
    User,
    Gig,
    Order,
    Review,
    Message,
    Conversation,
    Job,
    Proposal,
    Case,
    Question,
    Answer,
    Invoice,
    LegalDocument,
    Firm,
    Score,
    PeerReview,
    Task,
    Notification,
    Event, // ✅ ADDED
    Expense,
    TimeEntry
};
