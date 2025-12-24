// Marketplace Models
const User = require('./user.model');
const Gig = require('./gig.model');
const Order = require('./order.model');
const Review = require('./review.model');
const Dispute = require('./dispute.model');
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
const Payout = require('./payout.model');
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

// View Configuration Models
const View = require('./view.model');

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
const TaskDocumentVersion = require('./taskDocumentVersion.model');

// Bank Account Models
const BankAccount = require('./bankAccount.model');
const BankTransfer = require('./bankTransfer.model');
const BankTransaction = require('./bankTransaction.model');
const BankReconciliation = require('./bankReconciliation.model');

// Vendor and Bills Models
const Vendor = require('./vendor.model');
const Bill = require('./bill.model');
const BillPayment = require('./billPayment.model');

// Authentication Models
const EmailOTP = require('./emailOtp.model');
const EmailVerification = require('./emailVerification.model');
const WebAuthnCredential = require('./webauthnCredential.model');
const Session = require('./session.model');
const RevokedToken = require('./revokedToken.model');
const RefreshToken = require('./refreshToken.model');
const MagicLink = require('./magicLink.model');

// Subscription & Billing Models
const Subscription = require('./subscription.model');

// Security Models
const SecurityIncident = require('./securityIncident.model');
const ArchivedAuditLog = require('./archivedAuditLog.model');
const PasswordHistory = require('./passwordHistory.model');

// CRM Models
const Lead = require('./lead.model');
const CrmActivity = require('./crmActivity.model');
const Referral = require('./referral.model');
const Staff = require('./staff.model');
const Pipeline = require('./pipeline.model');
const DealRoom = require('./dealRoom.model');

// HR Models
const Employee = require('./employee.model');
const SalarySlip = require('./salarySlip.model');
const PayrollRun = require('./payrollRun.model');
const LeaveRequest = require('./leaveRequest.model');
const LeaveBalance = require('./leaveBalance.model');
const AttendanceRecord = require('./attendanceRecord.model');
const PerformanceReview = require('./performanceReview.model');
const ReviewTemplate = require('./reviewTemplate.model');
const CalibrationSession = require('./calibrationSession.model');

// Recruitment Models
const JobPosting = require('./jobPosting.model');
const Applicant = require('./applicant.model');

// Onboarding Model
const Onboarding = require('./onboarding.model');

// Offboarding Model
const Offboarding = require('./offboarding.model');

// Lifecycle Workflow Models (HR-style lifecycle management)
const { LifecycleWorkflow, LifecycleInstance } = require('./lifecycleWorkflow.model');

// Setup Wizard Models (App Onboarding)
const SetupSection = require('./setupSection.model');
const SetupTask = require('./setupTask.model');
const UserSetupProgress = require('./userSetupProgress.model');

// User Activity Model (Command Palette)
const UserActivity = require('./userActivity.model');

// Employee Loan Model
const EmployeeLoan = require('./employeeLoan.model');

// Employee Advance Model
const EmployeeAdvance = require('./employeeAdvance.model');

// Expense Claim Model
const ExpenseClaim = require('./expenseClaim.model');

// Training Model
const Training = require('./training.model');

// Asset Assignment Model
const AssetAssignment = require('./assetAssignment.model');

// Firm Invitation Model
const FirmInvitation = require('./firmInvitation.model');

// IP Restriction Model
const TemporaryIPAllowance = require('./temporaryIPAllowance.model');

// Audit Models
const AuditLog = require('./auditLog.model');
const TeamActivityLog = require('./teamActivityLog.model');

// Approval Workflow Models
const ApprovalRule = require('./approvalRule.model');
const ApprovalRequest = require('./approvalRequest.model');
const { ApprovalWorkflow, ApprovalInstance } = require('./approvalWorkflow.model');

// Permission & Authorization Models
const PermissionConfig = require('./permission.model');
const RelationTuple = require('./relationTuple.model');
const PolicyDecision = require('./policyDecision.model');
const UIAccessConfig = require('./uiAccessConfig.model');

// Investment & Trading Journal Models
const Trade = require('./trade.model');
const Broker = require('./broker.model');
const TradingAccount = require('./tradingAccount.model');
const TradeStats = require('./tradeStats.model');

// Investment Portfolio Models
const Investment = require('./investment.model');
const InvestmentTransaction = require('./investmentTransaction.model');

// Analytics Report Model
const AnalyticsReport = require('./analyticsReport.model');

// Document Analysis Model (AI-powered)
const DocumentAnalysis = require('./documentAnalysis.model');

// Location Models
const UserLocation = require('./userLocation.model');
const GeofenceZone = require('./geofenceZone.model');

// AI Chat Models
const ChatHistory = require('./chatHistory.model');

// Churn Prediction Models
const CustomerHealthScore = require('./customerHealthScore.model');
const ChurnEvent = require('./churnEvent.model');

// CaseNotion Models (Notion-like workspace)
const CaseNotionBlock = require('./caseNotionBlock.model');
const CaseNotionPage = require('./caseNotionPage.model');
const SyncedBlock = require('./syncedBlock.model');
const PageTemplate = require('./pageTemplate.model');
const BlockComment = require('./blockComment.model');
const PageActivity = require('./pageActivity.model');

// Legal Contract Model (Najiz Integration)
const LegalContract = require('./legalContract.model');

// WhatsApp Models
const WhatsAppMessage = require('./whatsappMessage.model');
const WhatsAppConversation = require('./whatsappConversation.model');
const WhatsAppTemplate = require('./whatsappTemplate.model');
const WhatsAppBroadcast = require('./whatsappBroadcast.model');

// Omnichannel Inbox Model
const OmnichannelConversation = require('./omnichannelConversation.model');

// API Key Model
const ApiKey = require('./apiKey.model');

// Webhook Model
const Webhook = require('./webhook.model');

// PDPL Consent Model
const Consent = require('./consent.model');

// Odoo-Inspired Models
const Activity = require('./activity.model');
const ActivityType = require('./activityType.model');
const ThreadMessage = require('./threadMessage.model');
const LockDate = require('./lockDate.model');
const AutomatedAction = require('./automatedAction.model');
const Automation = require('./automation.model');
const Macro = require('./macro.model');

// SLA Models
const { SLA, SLAInstance } = require('./sla.model');

// Formula Field Models
const { FormulaField, FieldDependency } = require('./formulaField.model');

// Cycle Model
const Cycle = require('./cycle.model');

// Report Definition Model
const ReportDefinition = require('./reportDefinition.model');

// Compliance Audit Model
const ComplianceAudit = require('./complianceAudit.model');

// Inter-Company Transaction Models
const InterCompanyTransaction = require('./interCompanyTransaction.model');
const InterCompanyBalance = require('./interCompanyBalance.model');

// Email System Models
const SmtpConfig = require('./smtpConfig.model');
const EmailTemplate = require('./emailTemplate.model');
const EmailSignature = require('./emailSignature.model');

// OAuth SSO Models
const SsoProvider = require('./ssoProvider.model');
const SsoUserLink = require('./ssoUserLink.model');

// Migration Models
const MigrationLog = require('./migrationLog.model');

module.exports = {
    // Marketplace
    User,
    Gig,
    Order,
    Review,
    Dispute,
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
    Payout,
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

    // View Configuration
    View,

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
    TaskDocumentVersion,

    // Bank Accounts
    BankAccount,
    BankTransfer,
    BankTransaction,
    BankReconciliation,

    // Vendors and Bills
    Vendor,
    Bill,
    BillPayment,

    // Authentication
    EmailOTP,
    EmailVerification,
    WebAuthnCredential,
    Session,
    MagicLink,

    // Subscription & Billing
    Subscription,

    // CRM
    Lead,
    CrmActivity,
    Referral,
    Staff,
    Pipeline,
    DealRoom,

    // HR
    Employee,
    SalarySlip,
    PayrollRun,
    LeaveRequest,
    LeaveBalance,
    AttendanceRecord,
    PerformanceReview,
    ReviewTemplate,
    CalibrationSession,

    // Recruitment
    JobPosting,
    Applicant,

    // Onboarding
    Onboarding,

    // Offboarding
    Offboarding,

    // Lifecycle Workflows
    LifecycleWorkflow,
    LifecycleInstance,

    // Setup Wizard (App Onboarding)
    SetupSection,
    SetupTask,
    UserSetupProgress,

    // User Activity (Command Palette)
    UserActivity,

    // Employee Loans
    EmployeeLoan,

    // Employee Advances
    EmployeeAdvance,

    // Expense Claims
    ExpenseClaim,

    // Training
    Training,

    // Asset Assignment
    AssetAssignment,

    // Firm Invitation
    FirmInvitation,

    // IP Restriction
    TemporaryIPAllowance,

    // Audit
    AuditLog,
    TeamActivityLog,

    // Approval Workflow
    ApprovalRule,
    ApprovalWorkflow,
    ApprovalInstance,
    ApprovalRequest,

    // Permission & Authorization
    PermissionConfig,
    RelationTuple,
    PolicyDecision,
    UIAccessConfig,

    // Investment & Trading Journal
    Trade,
    Broker,
    TradingAccount,
    TradeStats,

    // Investment Portfolio
    Investment,
    InvestmentTransaction,

    // Analytics Reports
    AnalyticsReport,

    // Document Analysis
    DocumentAnalysis,

    // Location Services
    UserLocation,
    GeofenceZone,

    // AI Chat
    ChatHistory,

    // Churn Prediction
    CustomerHealthScore,
    ChurnEvent,

    // CaseNotion (Notion-like workspace)
    CaseNotionBlock,
    CaseNotionPage,
    SyncedBlock,
    PageTemplate,
    BlockComment,
    PageActivity,

    // Legal Contracts (Najiz Integration)
    LegalContract,

    // WhatsApp
    WhatsAppMessage,
    WhatsAppConversation,
    WhatsAppTemplate,
    WhatsAppBroadcast,

    // Omnichannel Inbox
    OmnichannelConversation,

    // API Keys
    ApiKey,

    // Webhooks
    Webhook,

    // PDPL Consent
    Consent,

    // Security
    RevokedToken,
    RefreshToken,
    SecurityIncident,
    ArchivedAuditLog,
    PasswordHistory,

    // Odoo-Inspired
    Activity,
    ActivityType,
    ThreadMessage,
    LockDate,
    AutomatedAction,
    Automation,
    Macro,

    // SLA
    SLA,
    SLAInstance,

    // Formula Fields
    FormulaField,
    FieldDependency,

    // Cycle
    Cycle,

    // Report Definition
    ReportDefinition,

    // Compliance Audit
    ComplianceAudit,

    // Inter-Company Transactions
    InterCompanyTransaction,
    InterCompanyBalance,

    // Email System
    SmtpConfig,
    EmailTemplate,
    EmailSignature,

    // OAuth SSO
    SsoProvider,
    SsoUserLink,

    // Migration
    MigrationLog
};
