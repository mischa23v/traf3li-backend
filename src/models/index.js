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

// New Service Models
const Tag = require('./tag.model');
const Contact = require('./contact.model');
const Organization = require('./organization.model');
const Document = require('./document.model');
const Followup = require('./followup.model');

// Workflow Models
const WorkflowTemplate = require('./workflowTemplate.model');
const CaseStageProgress = require('./caseStageProgress.model');

// Enhanced Billing Models
const RateGroup = require('./rateGroup.model');
const RateCard = require('./rateCard.model');

// Invoice Template Model
const InvoiceTemplate = require('./invoiceTemplate.model');

// Export/Import Models
const ExportJob = require('./exportJob.model');
const ImportJob = require('./importJob.model');
const ExportTemplate = require('./exportTemplate.model');

// Enhanced Report Models
const SavedReport = require('./savedReport.model');
const DashboardWidget = require('./dashboardWidget.model');

// Conflict Check Model
const ConflictCheck = require('./conflictCheck.model');

// Trust Account Models
const TrustAccount = require('./trustAccount.model');
const ClientTrustBalance = require('./clientTrustBalance.model');
const TrustTransaction = require('./trustTransaction.model');
const TrustReconciliation = require('./trustReconciliation.model');
const ThreeWayReconciliation = require('./threeWayReconciliation.model');

// Matter Budget Models
const MatterBudget = require('./matterBudget.model');
const BudgetEntry = require('./budgetEntry.model');
const BudgetTemplate = require('./budgetTemplate.model');

// Audit Trail Models
const CaseAuditLog = require('./caseAuditLog.model');
const DocumentVersion = require('./documentVersion.model');

// Bank Account Models
const BankAccount = require('./bankAccount.model');
const BankTransfer = require('./bankTransfer.model');
const BankTransaction = require('./bankTransaction.model');
const BankReconciliation = require('./bankReconciliation.model');

// Vendor and Bills Models
const Vendor = require('./vendor.model');
const Bill = require('./bill.model');
const BillPayment = require('./billPayment.model');

// Wiki Models
const WikiPage = require('./wikiPage.model');
const WikiRevision = require('./wikiRevision.model');
const WikiBacklink = require('./wikiBacklink.model');
const WikiFolder = require('./wikiFolder.model');
const WikiComment = require('./wikiComment.model');

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
    Report,

    // New Services
    Tag,
    Contact,
    Organization,
    Document,
    Followup,

    // Workflows
    WorkflowTemplate,
    CaseStageProgress,

    // Enhanced Billing
    RateGroup,
    RateCard,

    // Invoice Templates
    InvoiceTemplate,

    // Export/Import
    ExportJob,
    ImportJob,
    ExportTemplate,

    // Enhanced Reports
    SavedReport,
    DashboardWidget,

    // Conflict Check
    ConflictCheck,

    // Trust Accounts
    TrustAccount,
    ClientTrustBalance,
    TrustTransaction,
    TrustReconciliation,
    ThreeWayReconciliation,

    // Matter Budgets
    MatterBudget,
    BudgetEntry,
    BudgetTemplate,

    // Audit Trail
    CaseAuditLog,
    DocumentVersion,

    // Bank Accounts
    BankAccount,
    BankTransfer,
    BankTransaction,
    BankReconciliation,

    // Vendors and Bills
    Vendor,
    Bill,
    BillPayment,

    // Wiki
    WikiPage,
    WikiRevision,
    WikiBacklink,
    WikiFolder,
    WikiComment
};
