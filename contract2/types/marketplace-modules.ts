/**
 * Marketplace and Additional Modules API Contracts
 * Job, Proposal, Order, Gig, Review, Score, Apps, Question, Answer, Plan, Custom-Field,
 * Invitation, Lawyer, Timeline, Audit, Captcha, Dispute, SLA
 */

// ============================================================================
// JOB MODULE - 6 endpoints
// ============================================================================

export namespace JobContract {
  // Enums
  export enum JobStatus {
    DRAFT = 'draft',
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    ON_HOLD = 'on_hold'
  }

  export enum JobType {
    FULL_TIME = 'full_time',
    PART_TIME = 'part_time',
    CONTRACT = 'contract',
    FREELANCE = 'freelance',
    PROJECT = 'project'
  }

  // Interfaces
  export interface Job {
    _id: string;
    firmId: string;
    title: string;
    description: string;
    type: JobType;
    status: JobStatus;
    budget?: { min: number; max: number; currency: string };
    skills?: string[];
    requirements?: string[];
    deadline?: Date;
    clientId?: string;
    assignedTo?: string;
    proposals?: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/job
   * @description Create job posting
   */
  export type CreateJob = (data: Partial<Job>) => Promise<{ success: boolean; data: Job }>;

  /**
   * @endpoint GET /api/job
   * @description Get all jobs
   */
  export type GetJobs = (params?: { status?: JobStatus; type?: JobType; page?: number; limit?: number }) => Promise<{ success: boolean; data: Job[]; pagination: any }>;

  /**
   * @endpoint GET /api/job/my-jobs
   * @description Get my jobs
   */
  export type GetMyJobs = () => Promise<{ success: boolean; data: Job[] }>;

  /**
   * @endpoint GET /api/job/:id
   * @description Get single job
   */
  export type GetJob = (id: string) => Promise<{ success: boolean; data: Job }>;

  /**
   * @endpoint PUT /api/job/:id
   * @description Update job
   */
  export type UpdateJob = (id: string, data: Partial<Job>) => Promise<{ success: boolean; data: Job }>;

  /**
   * @endpoint DELETE /api/job/:id
   * @description Delete job
   */
  export type DeleteJob = (id: string) => Promise<{ success: boolean; message: string }>;
}

// ============================================================================
// PROPOSAL MODULE - 6 endpoints
// ============================================================================

export namespace ProposalContract {
  // Enums
  export enum ProposalStatus {
    PENDING = 'pending',
    VIEWED = 'viewed',
    SHORTLISTED = 'shortlisted',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    WITHDRAWN = 'withdrawn'
  }

  // Interfaces
  export interface Proposal {
    _id: string;
    firmId: string;
    jobId: string;
    lawyerId: string;
    coverLetter: string;
    proposedBudget: { amount: number; currency: string };
    estimatedDuration?: string;
    milestones?: Array<{ title: string; amount: number; duration: string }>;
    status: ProposalStatus;
    submittedAt: Date;
    viewedAt?: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/proposal
   * @description Submit proposal
   */
  export type CreateProposal = (data: Partial<Proposal>) => Promise<{ success: boolean; data: Proposal }>;

  /**
   * @endpoint GET /api/proposal/job/:jobId
   * @description Get proposals for job
   */
  export type GetByJob = (jobId: string) => Promise<{ success: boolean; data: Proposal[] }>;

  /**
   * @endpoint GET /api/proposal/my-proposals
   * @description Get my proposals
   */
  export type GetMyProposals = () => Promise<{ success: boolean; data: Proposal[] }>;

  /**
   * @endpoint GET /api/proposal/:id
   * @description Get single proposal
   */
  export type GetProposal = (id: string) => Promise<{ success: boolean; data: Proposal }>;

  /**
   * @endpoint PUT /api/proposal/:id
   * @description Update proposal
   */
  export type UpdateProposal = (id: string, data: Partial<Proposal>) => Promise<{ success: boolean; data: Proposal }>;

  /**
   * @endpoint POST /api/proposal/:id/withdraw
   * @description Withdraw proposal
   */
  export type WithdrawProposal = (id: string) => Promise<{ success: boolean; data: Proposal }>;
}

// ============================================================================
// ORDER MODULE - 6 endpoints
// ============================================================================

export namespace OrderContract {
  // Enums
  export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PAID = 'paid',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
  }

  // Interfaces
  export interface Order {
    _id: string;
    firmId: string;
    orderNumber: string;
    clientId: string;
    items: Array<{
      type: 'service' | 'product' | 'gig';
      itemId: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    tax: number;
    discount?: number;
    total: number;
    status: OrderStatus;
    paymentIntentId?: string;
    proposalId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/order
   * @description Get all orders
   */
  export type GetOrders = (params?: { status?: OrderStatus; page?: number; limit?: number }) => Promise<{ success: boolean; data: Order[]; pagination: any }>;

  /**
   * @endpoint POST /api/order/create-payment-intent/:_id
   * @description Create payment intent for order
   */
  export type CreatePaymentIntent = (id: string) => Promise<{ success: boolean; data: { clientSecret: string; paymentIntentId: string } }>;

  /**
   * @endpoint POST /api/order/create-proposal-payment-intent/:_id
   * @description Create payment intent from proposal
   */
  export type CreateProposalPaymentIntent = (proposalId: string) => Promise<{ success: boolean; data: { clientSecret: string; orderId: string } }>;

  /**
   * @endpoint GET /api/order/:id
   * @description Get single order
   */
  export type GetOrder = (id: string) => Promise<{ success: boolean; data: Order }>;

  /**
   * @endpoint PUT /api/order/:id
   * @description Update order
   */
  export type UpdateOrder = (id: string, data: Partial<Order>) => Promise<{ success: boolean; data: Order }>;

  /**
   * @endpoint POST /api/order/:id/cancel
   * @description Cancel order
   */
  export type CancelOrder = (id: string, reason?: string) => Promise<{ success: boolean; data: Order }>;
}

// ============================================================================
// GIG MODULE - 4 endpoints
// ============================================================================

export namespace GigContract {
  // Enums
  export enum GigStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    PAUSED = 'paused',
    ARCHIVED = 'archived'
  }

  // Interfaces
  export interface Gig {
    _id: string;
    firmId: string;
    lawyerId: string;
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    pricing: {
      basic: { price: number; description: string; deliveryDays: number };
      standard?: { price: number; description: string; deliveryDays: number };
      premium?: { price: number; description: string; deliveryDays: number };
    };
    images?: string[];
    tags?: string[];
    requirements?: string[];
    faqs?: Array<{ question: string; answer: string }>;
    status: GigStatus;
    rating?: number;
    reviewCount?: number;
    orderCount?: number;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/gig
   * @description Create gig
   */
  export type CreateGig = (data: Partial<Gig>) => Promise<{ success: boolean; data: Gig }>;

  /**
   * @endpoint DELETE /api/gig/:_id
   * @description Delete gig
   */
  export type DeleteGig = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/gig/single/:_id
   * @description Get single gig
   */
  export type GetGig = (id: string) => Promise<{ success: boolean; data: Gig }>;

  /**
   * @endpoint GET /api/gig/my-gigs
   * @description Get my gigs
   */
  export type GetMyGigs = () => Promise<{ success: boolean; data: Gig[] }>;
}

// ============================================================================
// REVIEW MODULE - 3 endpoints
// ============================================================================

export namespace ReviewContract {
  // Interfaces
  export interface Review {
    _id: string;
    firmId: string;
    gigId: string;
    orderId?: string;
    reviewerId: string;
    rating: number;
    title?: string;
    comment: string;
    response?: { comment: string; respondedAt: Date };
    helpful?: number;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/review
   * @description Create review
   */
  export type CreateReview = (data: { gigId: string; rating: number; title?: string; comment: string }) => Promise<{ success: boolean; data: Review }>;

  /**
   * @endpoint GET /api/review/:gigID
   * @description Get reviews for gig
   */
  export type GetGigReviews = (gigId: string) => Promise<{ success: boolean; data: Review[] }>;

  /**
   * @endpoint DELETE /api/review/:_id
   * @description Delete review
   */
  export type DeleteReview = (id: string) => Promise<{ success: boolean; message: string }>;
}

// ============================================================================
// SCORE MODULE - 3 endpoints
// ============================================================================

export namespace ScoreContract {
  // Interfaces
  export interface LawyerScore {
    lawyerId: string;
    overallScore: number;
    components: {
      caseSuccess: number;
      clientSatisfaction: number;
      responsiveness: number;
      expertise: number;
      reliability: number;
    };
    totalCases: number;
    totalReviews: number;
    rank?: number;
    lastCalculated: Date;
  }

  /**
   * @endpoint GET /api/score/:lawyerId
   * @description Get lawyer score
   */
  export type GetScore = (lawyerId: string) => Promise<{ success: boolean; data: LawyerScore }>;

  /**
   * @endpoint POST /api/score/recalculate/:lawyerId
   * @description Recalculate lawyer score
   */
  export type RecalculateScore = (lawyerId: string) => Promise<{ success: boolean; data: LawyerScore }>;

  /**
   * @endpoint GET /api/score/top/lawyers
   * @description Get top lawyers by score
   */
  export type GetTopLawyers = (params?: { limit?: number; category?: string }) => Promise<{ success: boolean; data: LawyerScore[] }>;
}

// ============================================================================
// APPS MODULE - 10 endpoints
// ============================================================================

export namespace AppsContract {
  // Enums
  export enum AppStatus {
    AVAILABLE = 'available',
    INSTALLED = 'installed',
    DISABLED = 'disabled',
    DEPRECATED = 'deprecated'
  }

  export enum AppCategory {
    PRODUCTIVITY = 'productivity',
    COMMUNICATION = 'communication',
    INTEGRATION = 'integration',
    ANALYTICS = 'analytics',
    FINANCE = 'finance',
    HR = 'hr',
    LEGAL = 'legal'
  }

  // Interfaces
  export interface App {
    _id: string;
    name: string;
    slug: string;
    description: string;
    category: AppCategory;
    icon: string;
    screenshots?: string[];
    developer: string;
    version: string;
    pricing: { type: 'free' | 'paid' | 'freemium'; price?: number };
    permissions: string[];
    status: AppStatus;
    rating?: number;
    installCount?: number;
    createdAt: Date;
  }

  export interface InstalledApp {
    _id: string;
    firmId: string;
    appId: string;
    settings?: Record<string, any>;
    installedBy: string;
    installedAt: Date;
    status: 'active' | 'disabled';
  }

  /**
   * @endpoint GET /api/apps/categories
   * @description Get app categories
   */
  export type GetCategories = () => Promise<{ success: boolean; data: Array<{ category: AppCategory; count: number }> }>;

  /**
   * @endpoint GET /api/apps
   * @description Get all apps
   */
  export type GetApps = (params?: { category?: AppCategory; search?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: App[]; pagination: any }>;

  /**
   * @endpoint GET /api/apps/stats
   * @description Get app stats
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalApps: number; installedApps: number; byCategory: any } }>;

  /**
   * @endpoint GET /api/apps/:id
   * @description Get single app
   */
  export type GetApp = (id: string) => Promise<{ success: boolean; data: App }>;

  /**
   * @endpoint POST /api/apps/:id/install
   * @description Install app
   */
  export type InstallApp = (id: string) => Promise<{ success: boolean; data: InstalledApp }>;

  /**
   * @endpoint POST /api/apps/:id/uninstall
   * @description Uninstall app
   */
  export type UninstallApp = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/apps/installed
   * @description Get installed apps
   */
  export type GetInstalled = () => Promise<{ success: boolean; data: InstalledApp[] }>;

  /**
   * @endpoint PUT /api/apps/:id/settings
   * @description Update app settings
   */
  export type UpdateSettings = (id: string, settings: Record<string, any>) => Promise<{ success: boolean; data: InstalledApp }>;

  /**
   * @endpoint POST /api/apps/:id/enable
   * @description Enable installed app
   */
  export type EnableApp = (id: string) => Promise<{ success: boolean; data: InstalledApp }>;

  /**
   * @endpoint POST /api/apps/:id/disable
   * @description Disable installed app
   */
  export type DisableApp = (id: string) => Promise<{ success: boolean; data: InstalledApp }>;
}

// ============================================================================
// QUESTION MODULE - 5 endpoints
// ============================================================================

export namespace QuestionContract {
  // Enums
  export enum QuestionStatus {
    OPEN = 'open',
    ANSWERED = 'answered',
    CLOSED = 'closed'
  }

  // Interfaces
  export interface Question {
    _id: string;
    firmId: string;
    title: string;
    body: string;
    category?: string;
    tags?: string[];
    askerId: string;
    status: QuestionStatus;
    answerCount: number;
    viewCount: number;
    acceptedAnswerId?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/question
   * @description Create question
   */
  export type CreateQuestion = (data: { title: string; body: string; category?: string; tags?: string[] }) => Promise<{ success: boolean; data: Question }>;

  /**
   * @endpoint GET /api/question
   * @description Get all questions
   */
  export type GetQuestions = (params?: { status?: QuestionStatus; category?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: Question[]; pagination: any }>;

  /**
   * @endpoint GET /api/question/:_id
   * @description Get single question
   */
  export type GetQuestion = (id: string) => Promise<{ success: boolean; data: Question }>;

  /**
   * @endpoint PUT /api/question/:_id
   * @description Update question
   */
  export type UpdateQuestion = (id: string, data: Partial<Question>) => Promise<{ success: boolean; data: Question }>;

  /**
   * @endpoint DELETE /api/question/:_id
   * @description Delete question
   */
  export type DeleteQuestion = (id: string) => Promise<{ success: boolean; message: string }>;
}

// ============================================================================
// ANSWER MODULE - 6 endpoints
// ============================================================================

export namespace AnswerContract {
  // Interfaces
  export interface Answer {
    _id: string;
    questionId: string;
    body: string;
    authorId: string;
    isAccepted: boolean;
    upvotes: number;
    downvotes: number;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/answer
   * @description Create answer
   */
  export type CreateAnswer = (data: { questionId: string; body: string }) => Promise<{ success: boolean; data: Answer }>;

  /**
   * @endpoint GET /api/answer/:questionId
   * @description Get answers for question
   */
  export type GetAnswers = (questionId: string) => Promise<{ success: boolean; data: Answer[] }>;

  /**
   * @endpoint PATCH /api/answer/:_id
   * @description Update answer
   */
  export type UpdateAnswer = (id: string, data: { body: string }) => Promise<{ success: boolean; data: Answer }>;

  /**
   * @endpoint DELETE /api/answer/:_id
   * @description Delete answer
   */
  export type DeleteAnswer = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/answer/:_id/accept
   * @description Accept answer
   */
  export type AcceptAnswer = (id: string) => Promise<{ success: boolean; data: Answer }>;

  /**
   * @endpoint POST /api/answer/:_id/vote
   * @description Vote on answer
   */
  export type VoteAnswer = (id: string, vote: 'up' | 'down') => Promise<{ success: boolean; data: Answer }>;
}

// ============================================================================
// PLAN MODULE - 8 endpoints
// ============================================================================

export namespace PlanContract {
  // Enums
  export enum PlanTier {
    FREE = 'free',
    BASIC = 'basic',
    PROFESSIONAL = 'professional',
    ENTERPRISE = 'enterprise'
  }

  export enum BillingCycle {
    MONTHLY = 'monthly',
    YEARLY = 'yearly'
  }

  // Interfaces
  export interface Plan {
    _id: string;
    name: string;
    tier: PlanTier;
    description: string;
    features: string[];
    limits: {
      users: number;
      storage: number;
      cases: number;
      clients: number;
      apiCalls?: number;
    };
    pricing: {
      monthly: number;
      yearly: number;
      currency: string;
    };
    isActive: boolean;
    isPopular?: boolean;
    sortOrder: number;
  }

  export interface Subscription {
    _id: string;
    firmId: string;
    planId: string;
    billingCycle: BillingCycle;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId?: string;
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/plan
   * @description Get all plans
   */
  export type GetPlans = () => Promise<{ success: boolean; data: Plan[] }>;

  /**
   * @endpoint GET /api/plan/features
   * @description Get all features
   */
  export type GetFeatures = () => Promise<{ success: boolean; data: Array<{ feature: string; description: string; plans: PlanTier[] }> }>;

  /**
   * @endpoint GET /api/plan/current
   * @description Get current subscription
   */
  export type GetCurrent = () => Promise<{ success: boolean; data: { plan: Plan; subscription: Subscription } }>;

  /**
   * @endpoint GET /api/plan/:id
   * @description Get single plan
   */
  export type GetPlan = (id: string) => Promise<{ success: boolean; data: Plan }>;

  /**
   * @endpoint POST /api/plan/:id/subscribe
   * @description Subscribe to plan
   */
  export type Subscribe = (id: string, billingCycle: BillingCycle) => Promise<{ success: boolean; data: { subscription: Subscription; clientSecret?: string } }>;

  /**
   * @endpoint POST /api/plan/upgrade
   * @description Upgrade plan
   */
  export type Upgrade = (planId: string) => Promise<{ success: boolean; data: Subscription }>;

  /**
   * @endpoint POST /api/plan/downgrade
   * @description Downgrade plan
   */
  export type Downgrade = (planId: string) => Promise<{ success: boolean; data: Subscription }>;

  /**
   * @endpoint POST /api/plan/cancel
   * @description Cancel subscription
   */
  export type Cancel = (immediate?: boolean) => Promise<{ success: boolean; data: Subscription }>;
}

// ============================================================================
// CUSTOM-FIELD MODULE - 17 endpoints
// ============================================================================

export namespace CustomFieldContract {
  // Enums
  export enum FieldType {
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
    DATETIME = 'datetime',
    BOOLEAN = 'boolean',
    SELECT = 'select',
    MULTI_SELECT = 'multi_select',
    EMAIL = 'email',
    PHONE = 'phone',
    URL = 'url',
    TEXTAREA = 'textarea',
    FILE = 'file',
    USER = 'user',
    CURRENCY = 'currency'
  }

  // Interfaces
  export interface CustomField {
    _id: string;
    firmId: string;
    name: string;
    label: string;
    type: FieldType;
    entityType: 'case' | 'client' | 'lead' | 'contact' | 'invoice' | 'task';
    description?: string;
    placeholder?: string;
    defaultValue?: any;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
    validation?: {
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    };
    displayOrder: number;
    isActive: boolean;
    showInList: boolean;
    showInForm: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CustomFieldValue {
    _id: string;
    firmId: string;
    fieldId: string;
    entityType: string;
    entityId: string;
    value: any;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/custom-field/export
   * @description Export custom field definitions
   */
  export type ExportFields = (entityType?: string) => Promise<{ success: boolean; data: CustomField[] }>;

  /**
   * @endpoint POST /api/custom-field/import
   * @description Import custom field definitions
   */
  export type ImportFields = (fields: Partial<CustomField>[]) => Promise<{ success: boolean; imported: number; errors: any[] }>;

  /**
   * @endpoint POST /api/custom-field/search
   * @description Search entities by custom field values
   */
  export type SearchByFields = (data: { entityType: string; filters: Array<{ fieldId: string; operator: string; value: any }> }) => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint GET /api/custom-field
   * @description Get all custom fields
   */
  export type GetFields = (params?: { entityType?: string; isActive?: boolean }) => Promise<{ success: boolean; data: CustomField[] }>;

  /**
   * @endpoint POST /api/custom-field
   * @description Create custom field
   */
  export type CreateField = (data: Partial<CustomField>) => Promise<{ success: boolean; data: CustomField }>;

  /**
   * @endpoint GET /api/custom-field/:id
   * @description Get single custom field
   */
  export type GetField = (id: string) => Promise<{ success: boolean; data: CustomField }>;

  /**
   * @endpoint PUT /api/custom-field/:id
   * @description Update custom field
   */
  export type UpdateField = (id: string, data: Partial<CustomField>) => Promise<{ success: boolean; data: CustomField }>;

  /**
   * @endpoint DELETE /api/custom-field/:id
   * @description Delete custom field
   */
  export type DeleteField = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/custom-field/entity/:entityType/:entityId
   * @description Get custom field values for entity
   */
  export type GetEntityValues = (entityType: string, entityId: string) => Promise<{ success: boolean; data: CustomFieldValue[] }>;

  /**
   * @endpoint PUT /api/custom-field/entity/:entityType/:entityId
   * @description Update custom field values for entity
   */
  export type UpdateEntityValues = (entityType: string, entityId: string, values: Record<string, any>) => Promise<{ success: boolean; data: CustomFieldValue[] }>;

  /**
   * @endpoint POST /api/custom-field/:id/reorder
   * @description Reorder custom field
   */
  export type ReorderField = (id: string, newOrder: number) => Promise<{ success: boolean; data: CustomField }>;

  /**
   * @endpoint POST /api/custom-field/:id/options
   * @description Add option to select field
   */
  export type AddOption = (id: string, option: { value: string; label: string }) => Promise<{ success: boolean; data: CustomField }>;

  /**
   * @endpoint DELETE /api/custom-field/:id/options/:value
   * @description Remove option from select field
   */
  export type RemoveOption = (id: string, value: string) => Promise<{ success: boolean; data: CustomField }>;

  /**
   * @endpoint POST /api/custom-field/bulk-update
   * @description Bulk update custom field values
   */
  export type BulkUpdate = (data: { entityType: string; entityIds: string[]; values: Record<string, any> }) => Promise<{ success: boolean; updated: number }>;

  /**
   * @endpoint GET /api/custom-field/stats
   * @description Get custom field usage stats
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalFields: number; byEntityType: any; byFieldType: any } }>;

  /**
   * @endpoint POST /api/custom-field/validate
   * @description Validate custom field value
   */
  export type ValidateValue = (data: { fieldId: string; value: any }) => Promise<{ success: boolean; valid: boolean; errors?: string[] }>;
}

// ============================================================================
// INVITATION MODULE - 3 endpoints
// ============================================================================

export namespace InvitationContract {
  // Enums
  export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled'
  }

  // Interfaces
  export interface Invitation {
    _id: string;
    firmId: string;
    email: string;
    role: string;
    permissions?: Record<string, any>;
    invitedBy: string;
    code: string;
    status: InvitationStatus;
    expiresAt: Date;
    acceptedAt?: Date;
    acceptedBy?: string;
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/invitation/:code
   * @description Get invitation by code
   */
  export type GetByCode = (code: string) => Promise<{ success: boolean; data: Invitation }>;

  /**
   * @endpoint GET /api/invitation/:code/validate
   * @description Validate invitation code
   */
  export type Validate = (code: string) => Promise<{ success: boolean; data: { valid: boolean; invitation?: Invitation; reason?: string } }>;

  /**
   * @endpoint POST /api/invitation/:code/accept
   * @description Accept invitation
   */
  export type Accept = (code: string, userData?: { password: string; name?: string }) => Promise<{ success: boolean; data: { user: any; firm: any } }>;
}

// ============================================================================
// LAWYER MODULE - 3 endpoints
// ============================================================================

export namespace LawyerContract {
  // Interfaces
  export interface Lawyer {
    _id: string;
    userId: string;
    firmId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    licenseNumber?: string;
    barAssociation?: string;
    practiceAreas?: string[];
    yearsOfExperience?: number;
    bio?: string;
    avatar?: string;
    rating?: number;
    caseCount?: number;
    isAvailable: boolean;
    hourlyRate?: number;
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/lawyer/team
   * @description Get lawyers in team
   */
  export type GetTeam = () => Promise<{ success: boolean; data: Lawyer[] }>;

  /**
   * @endpoint GET /api/lawyer
   * @description Get all lawyers
   */
  export type GetLawyers = (params?: { practiceArea?: string; search?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: Lawyer[]; pagination: any }>;

  /**
   * @endpoint GET /api/lawyer/:_id
   * @description Get single lawyer
   */
  export type GetLawyer = (id: string) => Promise<{ success: boolean; data: Lawyer }>;
}

// ============================================================================
// TIMELINE MODULE - 2 endpoints
// ============================================================================

export namespace TimelineContract {
  // Interfaces
  export interface TimelineEntry {
    _id: string;
    entityType: string;
    entityId: string;
    type: 'activity' | 'change' | 'comment' | 'system';
    action: string;
    description: string;
    metadata?: Record<string, any>;
    changes?: Array<{ field: string; oldValue: any; newValue: any }>;
    performedBy: string;
    performedByName: string;
    timestamp: Date;
  }

  /**
   * @endpoint GET /api/timeline/:entityType/:entityId
   * @description Get timeline for entity
   */
  export type GetTimeline = (entityType: string, entityId: string, params?: { page?: number; limit?: number; types?: string[] }) => Promise<{ success: boolean; data: TimelineEntry[]; pagination: any }>;

  /**
   * @endpoint GET /api/timeline/:entityType/:entityId/summary
   * @description Get timeline summary
   */
  export type GetSummary = (entityType: string, entityId: string) => Promise<{ success: boolean; data: { totalActivities: number; lastActivity: Date; byType: any } }>;
}

// ============================================================================
// AUDIT MODULE - 5 endpoints
// ============================================================================

export namespace AuditContract {
  // Interfaces
  export interface AuditEntry {
    _id: string;
    firmId: string;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    changes?: Array<{ field: string; oldValue: any; newValue: any }>;
    metadata?: Record<string, any>;
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
  }

  /**
   * @endpoint GET /api/audit
   * @description Get audit logs
   */
  export type GetLogs = (params?: { userId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: AuditEntry[]; pagination: any }>;

  /**
   * @endpoint GET /api/audit/export
   * @description Export audit logs
   */
  export type Export = (params: { startDate: string; endDate: string; format: 'csv' | 'json' }) => Promise<{ success: boolean; data: Buffer }>;

  /**
   * @endpoint GET /api/audit/stats
   * @description Get audit statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalLogs: number; byAction: any; byUser: any; byEntity: any } }>;

  /**
   * @endpoint GET /api/audit/entity/:type/:id
   * @description Get audit logs for entity
   */
  export type GetByEntity = (type: string, id: string) => Promise<{ success: boolean; data: AuditEntry[] }>;

  /**
   * @endpoint GET /api/audit/user/:userId
   * @description Get audit logs for user
   */
  export type GetByUser = (userId: string) => Promise<{ success: boolean; data: AuditEntry[] }>;
}

// ============================================================================
// CAPTCHA MODULE - 3 endpoints
// ============================================================================

export namespace CaptchaContract {
  // Enums
  export enum CaptchaProvider {
    RECAPTCHA = 'recaptcha',
    HCAPTCHA = 'hcaptcha',
    TURNSTILE = 'turnstile'
  }

  // Interfaces
  export interface CaptchaVerifyRequest {
    token: string;
    provider?: CaptchaProvider;
    action?: string;
  }

  export interface CaptchaStatus {
    provider: CaptchaProvider;
    enabled: boolean;
    siteKey?: string;
    lastVerification?: Date;
    successRate?: number;
  }

  /**
   * @endpoint POST /api/captcha/verify-captcha
   * @description Verify captcha token
   */
  export type Verify = (req: CaptchaVerifyRequest) => Promise<{ success: boolean; data: { valid: boolean; score?: number } }>;

  /**
   * @endpoint GET /api/captcha/captcha/providers
   * @description Get available captcha providers
   */
  export type GetProviders = () => Promise<{ success: boolean; data: Array<{ provider: CaptchaProvider; name: string; available: boolean }> }>;

  /**
   * @endpoint GET /api/captcha/captcha/status/:provider
   * @description Get captcha provider status
   */
  export type GetStatus = (provider: string) => Promise<{ success: boolean; data: CaptchaStatus }>;
}

// ============================================================================
// DISPUTE MODULE - 10 endpoints
// ============================================================================

export namespace DisputeContract {
  // Enums
  export enum DisputeStatus {
    OPEN = 'open',
    UNDER_REVIEW = 'under_review',
    PENDING_EVIDENCE = 'pending_evidence',
    RESOLVED = 'resolved',
    ESCALATED = 'escalated',
    CLOSED = 'closed'
  }

  export enum DisputeType {
    INVOICE = 'invoice',
    SERVICE = 'service',
    PAYMENT = 'payment',
    CONTRACT = 'contract',
    OTHER = 'other'
  }

  // Interfaces
  export interface Dispute {
    _id: string;
    firmId: string;
    disputeNumber: string;
    type: DisputeType;
    status: DisputeStatus;
    clientId: string;
    relatedTo?: { type: string; id: string };
    amount?: number;
    description: string;
    evidence?: Array<{ type: string; url: string; uploadedAt: Date }>;
    messages: Array<{ senderId: string; message: string; sentAt: Date }>;
    resolution?: { type: string; description: string; amount?: number; resolvedAt: Date; resolvedBy: string };
    assignedTo?: string;
    dueDate?: Date;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/dispute
   * @description Create dispute
   */
  export type CreateDispute = (data: Partial<Dispute>) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint GET /api/dispute
   * @description Get all disputes
   */
  export type GetDisputes = (params?: { status?: DisputeStatus; type?: DisputeType; page?: number; limit?: number }) => Promise<{ success: boolean; data: Dispute[]; pagination: any }>;

  /**
   * @endpoint GET /api/dispute/stats
   * @description Get dispute statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { total: number; open: number; resolved: number; byType: any } }>;

  /**
   * @endpoint GET /api/dispute/:id
   * @description Get single dispute
   */
  export type GetDispute = (id: string) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint PUT /api/dispute/:id
   * @description Update dispute
   */
  export type UpdateDispute = (id: string, data: Partial<Dispute>) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint POST /api/dispute/:id/message
   * @description Add message to dispute
   */
  export type AddMessage = (id: string, message: string) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint POST /api/dispute/:id/evidence
   * @description Add evidence to dispute
   */
  export type AddEvidence = (id: string, evidence: { type: string; url: string }) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint POST /api/dispute/:id/resolve
   * @description Resolve dispute
   */
  export type ResolveDispute = (id: string, resolution: { type: string; description: string; amount?: number }) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint POST /api/dispute/:id/escalate
   * @description Escalate dispute
   */
  export type EscalateDispute = (id: string, reason?: string) => Promise<{ success: boolean; data: Dispute }>;

  /**
   * @endpoint POST /api/dispute/:id/close
   * @description Close dispute
   */
  export type CloseDispute = (id: string, reason?: string) => Promise<{ success: boolean; data: Dispute }>;
}

// ============================================================================
// SLA MODULE - 10 endpoints
// ============================================================================

export namespace SLAContract {
  // Enums
  export enum SLAStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BREACHED = 'breached'
  }

  export enum SLAMetric {
    RESPONSE_TIME = 'response_time',
    RESOLUTION_TIME = 'resolution_time',
    UPTIME = 'uptime',
    FIRST_RESPONSE = 'first_response'
  }

  // Interfaces
  export interface SLA {
    _id: string;
    firmId: string;
    name: string;
    description?: string;
    targets: Array<{
      metric: SLAMetric;
      target: number;
      unit: 'minutes' | 'hours' | 'days' | 'percent';
      priority?: string;
    }>;
    applicableTo?: { clientIds?: string[]; caseTypes?: string[] };
    penalties?: Array<{ threshold: number; action: string; amount?: number }>;
    status: SLAStatus;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface SLAPerformance {
    slaId: string;
    period: { start: Date; end: Date };
    metrics: Array<{
      metric: SLAMetric;
      target: number;
      actual: number;
      compliance: number;
      breaches: number;
    }>;
    overallCompliance: number;
  }

  /**
   * @endpoint GET /api/sla/stats
   * @description Get SLA statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalSLAs: number; active: number; avgCompliance: number } }>;

  /**
   * @endpoint GET /api/sla
   * @description Get all SLAs
   */
  export type GetSLAs = () => Promise<{ success: boolean; data: SLA[] }>;

  /**
   * @endpoint POST /api/sla
   * @description Create SLA
   */
  export type CreateSLA = (data: Partial<SLA>) => Promise<{ success: boolean; data: SLA }>;

  /**
   * @endpoint GET /api/sla/:id
   * @description Get single SLA
   */
  export type GetSLA = (id: string) => Promise<{ success: boolean; data: SLA }>;

  /**
   * @endpoint PUT /api/sla/:id
   * @description Update SLA
   */
  export type UpdateSLA = (id: string, data: Partial<SLA>) => Promise<{ success: boolean; data: SLA }>;

  /**
   * @endpoint DELETE /api/sla/:id
   * @description Delete SLA
   */
  export type DeleteSLA = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/sla/:id/performance
   * @description Get SLA performance
   */
  export type GetPerformance = (id: string, params?: { startDate?: string; endDate?: string }) => Promise<{ success: boolean; data: SLAPerformance }>;

  /**
   * @endpoint GET /api/sla/:id/breaches
   * @description Get SLA breaches
   */
  export type GetBreaches = (id: string) => Promise<{ success: boolean; data: Array<{ entityType: string; entityId: string; metric: SLAMetric; target: number; actual: number; breachedAt: Date }> }>;

  /**
   * @endpoint POST /api/sla/:id/activate
   * @description Activate SLA
   */
  export type ActivateSLA = (id: string) => Promise<{ success: boolean; data: SLA }>;

  /**
   * @endpoint POST /api/sla/:id/deactivate
   * @description Deactivate SLA
   */
  export type DeactivateSLA = (id: string) => Promise<{ success: boolean; data: SLA }>;
}

// Export all contracts
export {
  JobContract,
  ProposalContract,
  OrderContract,
  GigContract,
  ReviewContract,
  ScoreContract,
  AppsContract,
  QuestionContract,
  AnswerContract,
  PlanContract,
  CustomFieldContract,
  InvitationContract,
  LawyerContract,
  TimelineContract,
  AuditContract,
  CaptchaContract,
  DisputeContract,
  SLAContract
};
