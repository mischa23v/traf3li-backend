/**
 * API Contracts for Legal, Document, and Communication Modules
 *
 * This file contains TypeScript type definitions for all API endpoints in:
 * - Legal Contracts Management
 * - Legal Documents
 * - Matter Budgets
 * - Document Analysis
 * - Cloud Storage
 * - Offline Sync
 * - PDF Generation (PDFMe)
 * - Unified Data
 * - Saved Filters
 * - Saved Reports
 * - Prepared Reports
 * - Email Marketing
 * - Email Settings
 * - Email Templates
 * - Thread Messages
 * - Contact Lists
 * - Conversations
 * - Messages
 *
 * Total Endpoints: 219+
 *
 * @module contract2/types/legal-docs-comm
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  messageAr?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    messageAr?: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NationalAddress {
  buildingNumber?: string;
  streetName?: string;
  district?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  additionalNumber?: string;
  shortAddress?: string;
  country?: string;
}

export type ObjectId = string;

// ============================================================================
// 1. LEGAL CONTRACT MANAGEMENT
// Base: /api/contracts
// Endpoints: 36
// ============================================================================

export namespace LegalContract {
  // ========================================
  // Types & Enums
  // ========================================

  export type ContractType =
    | 'sale' | 'purchase' | 'lease' | 'rental' | 'service' | 'employment'
    | 'partnership' | 'joint_venture' | 'agency' | 'franchise' | 'distribution'
    | 'construction' | 'maintenance' | 'supply' | 'consulting' | 'license'
    | 'power_of_attorney' | 'settlement' | 'release' | 'non_disclosure'
    | 'non_compete' | 'guarantee' | 'mortgage' | 'pledge'
    | 'marriage_contract' | 'divorce_agreement' | 'custody_agreement'
    | 'alimony_agreement' | 'inheritance_distribution' | 'waqf_deed' | 'will'
    | 'memorandum_of_understanding' | 'letter_of_intent' | 'other';

  export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'under_review';

  export type PartyRole =
    | 'party_one' | 'party_two' | 'first_party' | 'second_party'
    | 'seller' | 'buyer' | 'lessor' | 'lessee' | 'employer' | 'employee'
    | 'principal' | 'agent' | 'guarantor' | 'beneficiary' | 'witness';

  export type PartyType = 'individual' | 'company' | 'government';

  export type IdentityType = 'national_id' | 'iqama' | 'visitor_id' | 'gcc_id' | 'passport';

  export type SignatureStatus = 'pending' | 'signed' | 'declined' | 'not_required';

  export type SignatureMethod = 'physical' | 'electronic' | 'nafath' | 'absher';

  export interface ContractParty {
    role: PartyRole;
    roleAr?: string;
    partyType: PartyType;

    // Individual Info
    fullNameArabic?: string;
    firstName?: string;
    fatherName?: string;
    grandfatherName?: string;
    familyName?: string;
    fullNameEnglish?: string;
    nationality?: string;
    nationalId?: string;
    identityType?: IdentityType;
    idExpiryDate?: string;
    gender?: 'male' | 'female';
    dateOfBirth?: string;
    profession?: string;

    // Company Info
    companyName?: string;
    companyNameEnglish?: string;
    crNumber?: string;
    unifiedNumber?: string;
    crExpiryDate?: string;
    capital?: number;
    mainActivity?: string;

    // Authorized Representative
    authorizedRep?: {
      name: string;
      nationalId: string;
      position: string;
      authorizationType: string;
    };

    // Contact
    phone?: string;
    email?: string;
    nationalAddress?: NationalAddress;

    // Signature
    signatureStatus?: SignatureStatus;
    signedDate?: string;
    signatureMethod?: SignatureMethod;
    signatureReference?: string;
  }

  export interface FinancialTerms {
    totalValue?: number;
    currency?: string;
    paymentSchedule?: Array<{
      description: string;
      amount: number;
      dueDate: string;
      paid?: boolean;
      paidDate?: string;
      paymentReference?: string;
    }>;
    advancePayment?: number;
    retentionAmount?: number;
    penaltyClause?: {
      hasClause: boolean;
      dailyPenalty?: number;
      maxPenalty?: number;
      description?: string;
    };
    vatIncluded?: boolean;
    vatAmount?: number;
  }

  export interface ContractClause {
    clauseNumber: string;
    titleAr?: string;
    titleEn?: string;
    textAr?: string;
    textEn?: string;
    isEdited?: boolean;
    editedBy?: ObjectId;
    editedAt?: string;
  }

  export interface Amendment {
    amendmentType: string;
    description: string;
    effectiveDate: string;
    changes: Record<string, any>;
    reason?: string;
    attachments?: string[];
    createdAt?: string;
    createdBy?: ObjectId;
  }

  export interface ContractVersion {
    versionNumber: number;
    versionNote?: string;
    snapshot: Record<string, any>;
    createdAt: string;
    createdBy: ObjectId;
  }

  export interface Notarization {
    najizReferenceNumber: string;
    notarizationDate: string;
    notaryName: string;
    notaryLicenseNumber?: string;
    certificateUrl?: string;
    metadata?: Record<string, any>;
  }

  export interface Breach {
    breachType: string;
    description: string;
    breachDate: string;
    partyIndex?: number;
    affectedClauses?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    evidence?: string[];
  }

  export interface Enforcement {
    enforcementType: string;
    description: string;
    initiatedDate: string;
    assignedLawyer?: ObjectId;
    status?: string;
    resolvedDate?: string;
    outcome?: string;
    details?: Record<string, any>;
  }

  export interface Contract {
    _id: ObjectId;
    firmId?: ObjectId;
    contractNumber: string;
    title: string;
    titleAr?: string;
    description?: string;
    descriptionAr?: string;
    contractType: ContractType;
    contractTypeAr?: string;
    status: ContractStatus;
    parties: ContractParty[];
    financialTerms?: FinancialTerms;
    startDate?: string;
    endDate?: string;
    draftDate?: string;
    executionDate?: string;
    effectiveDate?: string;
    expiryDate?: string;
    content?: {
      preamble?: string;
      preambleAr?: string;
      recitals?: string;
      recitalsAr?: string;
      clauses?: ContractClause[];
    };
    amendments?: Amendment[];
    versions?: ContractVersion[];
    notarization?: Notarization;
    breaches?: Breach[];
    enforcement?: Enforcement;
    linkedCases?: ObjectId[];
    tags?: string[];
    clientId?: ObjectId;
    caseId?: ObjectId;
    relatedDocuments?: ObjectId[];
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  // ========================================
  // API Endpoints
  // ========================================

  // SEARCH & REPORTING (4 endpoints)

  /**
   * Search contracts by text query
   * GET /api/contracts/search
   */
  export interface SearchContractsRequest {
    q: string;
    page?: number;
    limit?: number;
  }
  export type SearchContractsResponse = PaginatedResponse<Contract>;

  /**
   * Get expiring contracts
   * GET /api/contracts/expiring
   */
  export interface GetExpiringContractsRequest {
    days?: number;
    page?: number;
    limit?: number;
  }
  export type GetExpiringContractsResponse = PaginatedResponse<Contract>;

  /**
   * Get contract statistics
   * GET /api/contracts/statistics
   */
  export interface ContractStatistics {
    totalContracts: number;
    byStatus: Record<ContractStatus, number>;
    byType: Record<string, number>;
    expiringSoon: number;
    totalValue: number;
    activeValue: number;
  }
  export type GetContractStatisticsResponse = ApiResponse<ContractStatistics>;

  /**
   * Get contracts by client
   * GET /api/contracts/client/:clientId
   */
  export interface GetContractsByClientRequest {
    page?: number;
    limit?: number;
  }
  export type GetContractsByClientResponse = PaginatedResponse<Contract>;

  // TEMPLATES (2 endpoints)

  /**
   * Get contract templates
   * GET /api/contracts/templates
   */
  export interface GetTemplatesRequest {
    category?: string;
    contractType?: ContractType;
  }
  export interface ContractTemplate {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    category?: string;
    contractType: ContractType;
    template: Partial<Contract>;
    createdAt: string;
  }
  export type GetTemplatesResponse = ApiResponse<ContractTemplate[]>;

  /**
   * Create contract from template
   * POST /api/contracts/templates/:templateId/use
   */
  export interface CreateFromTemplateRequest {
    data: Partial<Contract>;
  }
  export type CreateFromTemplateResponse = ApiResponse<Contract>;

  // CRUD OPERATIONS (5 endpoints)

  /**
   * List contracts with filters
   * GET /api/contracts
   */
  export interface ListContractsRequest {
    page?: number;
    limit?: number;
    status?: ContractStatus;
    contractType?: ContractType;
    clientId?: ObjectId;
    startDate?: string;
    endDate?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  export type ListContractsResponse = PaginatedResponse<Contract>;

  /**
   * Create new contract
   * POST /api/contracts
   */
  export interface CreateContractRequest {
    title: string;
    titleAr?: string;
    contractType: ContractType;
    description?: string;
    parties: ContractParty[];
    startDate?: string;
    endDate?: string;
    financialTerms?: FinancialTerms;
    clientId?: ObjectId;
    caseId?: ObjectId;
    tags?: string[];
  }
  export type CreateContractResponse = ApiResponse<Contract>;

  /**
   * Get single contract
   * GET /api/contracts/:contractId
   */
  export type GetContractResponse = ApiResponse<Contract>;

  /**
   * Update contract
   * PATCH /api/contracts/:contractId
   */
  export interface UpdateContractRequest {
    title?: string;
    titleAr?: string;
    status?: ContractStatus;
    description?: string;
    financialTerms?: Partial<FinancialTerms>;
    tags?: string[];
    [key: string]: any;
  }
  export type UpdateContractResponse = ApiResponse<Contract>;

  /**
   * Delete contract
   * DELETE /api/contracts/:contractId
   */
  export type DeleteContractResponse = ApiResponse<{ message: string }>;

  // PARTY MANAGEMENT (3 endpoints)

  /**
   * Add party to contract
   * POST /api/contracts/:contractId/parties
   */
  export interface AddPartyRequest {
    party: ContractParty;
  }
  export type AddPartyResponse = ApiResponse<Contract>;

  /**
   * Update party information
   * PATCH /api/contracts/:contractId/parties/:partyIndex
   */
  export interface UpdatePartyRequest {
    updates: Partial<ContractParty>;
  }
  export type UpdatePartyResponse = ApiResponse<Contract>;

  /**
   * Remove party
   * DELETE /api/contracts/:contractId/parties/:partyIndex
   */
  export type RemovePartyResponse = ApiResponse<Contract>;

  // SIGNATURES (3 endpoints)

  /**
   * Initiate signature workflow
   * POST /api/contracts/:contractId/signatures/initiate
   */
  export interface InitiateSignatureRequest {
    partyIndexes?: number[];
    deadline?: string;
    method?: SignatureMethod;
  }
  export interface SignatureWorkflow {
    initiated: boolean;
    parties: Array<{
      partyIndex: number;
      status: SignatureStatus;
    }>;
  }
  export type InitiateSignatureResponse = ApiResponse<SignatureWorkflow>;

  /**
   * Record party signature
   * POST /api/contracts/:contractId/signatures/:partyIndex
   */
  export interface RecordSignatureRequest {
    signatureMethod: SignatureMethod;
    signatureData?: string;
    signedAt: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }
  export type RecordSignatureResponse = ApiResponse<Contract>;

  /**
   * Get signature status
   * GET /api/contracts/:contractId/signatures
   */
  export interface SignatureStatus {
    totalParties: number;
    signedParties: number;
    pendingParties: number;
    completionPercentage: number;
    parties: Array<{
      partyIndex: number;
      name: string;
      status: SignatureStatus;
      signedDate?: string;
    }>;
  }
  export type GetSignatureStatusResponse = ApiResponse<SignatureStatus>;

  // AMENDMENTS (2 endpoints)

  /**
   * Add amendment
   * POST /api/contracts/:contractId/amendments
   */
  export interface AddAmendmentRequest {
    amendmentType: string;
    description: string;
    effectiveDate: string;
    changes: Record<string, any>;
    reason?: string;
    attachments?: string[];
  }
  export type AddAmendmentResponse = ApiResponse<Contract>;

  /**
   * Get amendments
   * GET /api/contracts/:contractId/amendments
   */
  export type GetAmendmentsResponse = ApiResponse<Amendment[]>;

  // VERSIONS (3 endpoints)

  /**
   * Create version snapshot
   * POST /api/contracts/:contractId/versions
   */
  export interface CreateVersionRequest {
    versionNote?: string;
  }
  export type CreateVersionResponse = ApiResponse<{ versionNumber: number; createdAt: string }>;

  /**
   * Get version history
   * GET /api/contracts/:contractId/versions
   */
  export type GetVersionHistoryResponse = ApiResponse<ContractVersion[]>;

  /**
   * Revert to version
   * POST /api/contracts/:contractId/versions/:versionNumber/revert
   */
  export interface RevertToVersionRequest {
    reason?: string;
  }
  export type RevertToVersionResponse = ApiResponse<Contract>;

  // NAJIZ INTEGRATION (2 endpoints)

  /**
   * Record notarization
   * POST /api/contracts/:contractId/notarization
   */
  export interface RecordNotarizationRequest {
    najizReferenceNumber: string;
    notarizationDate: string;
    notaryName: string;
    notaryLicenseNumber?: string;
    certificateUrl?: string;
    metadata?: Record<string, any>;
  }
  export type RecordNotarizationResponse = ApiResponse<Contract>;

  /**
   * Verify notarization
   * GET /api/contracts/:contractId/notarization/verify
   */
  export interface NotarizationVerification {
    isValid: boolean;
    najizReferenceNumber: string;
    status: string;
    expiryDate?: string;
    verifiedAt: string;
  }
  export type VerifyNotarizationResponse = ApiResponse<NotarizationVerification>;

  // ENFORCEMENT (4 endpoints)

  /**
   * Record breach
   * POST /api/contracts/:contractId/breach
   */
  export interface RecordBreachRequest extends Breach {}
  export type RecordBreachResponse = ApiResponse<Contract>;

  /**
   * Initiate enforcement
   * POST /api/contracts/:contractId/enforcement
   */
  export interface InitiateEnforcementRequest {
    enforcementType: string;
    description: string;
    initiatedDate: string;
    assignedLawyer?: ObjectId;
    details?: Record<string, any>;
  }
  export type InitiateEnforcementResponse = ApiResponse<Contract>;

  /**
   * Update enforcement status
   * PATCH /api/contracts/:contractId/enforcement
   */
  export interface UpdateEnforcementStatusRequest {
    status?: string;
    resolvedDate?: string;
    outcome?: string;
    updates?: Record<string, any>;
  }
  export type UpdateEnforcementStatusResponse = ApiResponse<Contract>;

  /**
   * Link to case
   * POST /api/contracts/:contractId/link-case
   */
  export interface LinkToCaseRequest {
    caseId: ObjectId;
    relationship?: string;
  }
  export type LinkToCaseResponse = ApiResponse<Contract>;

  // REMINDERS (2 endpoints)

  /**
   * Set reminder
   * POST /api/contracts/:contractId/reminders
   */
  export interface SetReminderRequest {
    reminderType: string;
    reminderDate: string;
    description: string;
    recipients?: ObjectId[];
    priority?: string;
  }
  export interface Reminder {
    _id: ObjectId;
    reminderType: string;
    reminderDate: string;
    description: string;
    status: string;
  }
  export type SetReminderResponse = ApiResponse<Reminder>;

  /**
   * Get reminders
   * GET /api/contracts/:contractId/reminders
   */
  export interface GetRemindersRequest {
    activeOnly?: boolean;
  }
  export type GetRemindersResponse = ApiResponse<Reminder[]>;

  // EXPORT (2 endpoints)

  /**
   * Export to PDF
   * GET /api/contracts/:contractId/export/pdf
   */
  export interface ExportToPdfRequest {
    includeAmendments?: boolean;
    includeSignatures?: boolean;
    template?: string;
  }
  // Returns file download

  /**
   * Export to Word
   * GET /api/contracts/:contractId/export/word
   */
  export interface ExportToWordRequest {
    includeAmendments?: boolean;
    template?: string;
  }
  // Returns file download

  // TEMPLATE SAVE (1 endpoint)

  /**
   * Save as template
   * POST /api/contracts/:contractId/save-as-template
   */
  export interface SaveAsTemplateRequest {
    templateName: string;
    category?: string;
    description?: string;
    tags?: string[];
    isFirmWide?: boolean;
  }
  export type SaveAsTemplateResponse = ApiResponse<ContractTemplate>;
}

// ============================================================================
// 2. LEGAL DOCUMENT MANAGEMENT
// Base: /api/legal-documents
// Endpoints: 6
// ============================================================================

export namespace LegalDocument {
  export interface Document {
    _id: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    title: string;
    titleAr?: string;
    documentType: string;
    category?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    downloads: number;
    tags?: string[];
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  /**
   * Create document
   * POST /api/legal-documents
   */
  export interface CreateDocumentRequest {
    title: string;
    titleAr?: string;
    documentType: string;
    category?: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    tags?: string[];
  }
  export type CreateDocumentResponse = ApiResponse<Document>;

  /**
   * Get all documents
   * GET /api/legal-documents
   */
  export interface GetDocumentsRequest {
    page?: number;
    limit?: number;
    documentType?: string;
    category?: string;
    search?: string;
  }
  export type GetDocumentsResponse = PaginatedResponse<Document>;

  /**
   * Get single document
   * GET /api/legal-documents/:_id
   */
  export type GetDocumentResponse = ApiResponse<Document>;

  /**
   * Update document
   * PATCH /api/legal-documents/:_id
   */
  export interface UpdateDocumentRequest {
    title?: string;
    titleAr?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }
  export type UpdateDocumentResponse = ApiResponse<Document>;

  /**
   * Delete document
   * DELETE /api/legal-documents/:_id
   */
  export type DeleteDocumentResponse = ApiResponse<{ message: string }>;

  /**
   * Increment download count
   * POST /api/legal-documents/:_id/download
   */
  export type IncrementDownloadResponse = ApiResponse<{ downloads: number }>;
}

// ============================================================================
// 3. MATTER BUDGET MANAGEMENT
// Base: /api/matter-budgets
// Endpoints: 17
// ============================================================================

export namespace MatterBudget {
  export interface BudgetPhase {
    _id?: ObjectId;
    name: string;
    nameAr?: string;
    budget: number;
    spent?: number;
    description?: string;
    startDate?: string;
    endDate?: string;
  }

  export interface BudgetEntry {
    _id: ObjectId;
    budgetId: ObjectId;
    phaseId?: ObjectId;
    description: string;
    descriptionAr?: string;
    amount: number;
    category: string;
    date: string;
    createdBy: ObjectId;
    createdAt: string;
  }

  export interface Budget {
    _id: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    caseId: ObjectId;
    clientId?: ObjectId;
    name: string;
    nameAr?: string;
    totalBudget: number;
    spent: number;
    remaining: number;
    phases: BudgetPhase[];
    alertThresholds: {
      warning: number;
      critical: number;
    };
    status: 'active' | 'on_track' | 'at_risk' | 'exceeded' | 'completed';
    notes?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  export interface BudgetTemplate {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    phases: BudgetPhase[];
    firmId: ObjectId;
    createdBy: ObjectId;
    createdAt: string;
  }

  // ALERTS (1 endpoint)

  /**
   * Get budget alerts
   * GET /api/matter-budgets/alerts
   */
  export interface BudgetAlert {
    budgetId: ObjectId;
    caseId: ObjectId;
    caseName: string;
    severity: 'warning' | 'critical';
    percentageUsed: number;
    remaining: number;
  }
  export type GetBudgetAlertsResponse = ApiResponse<BudgetAlert[]>;

  // TEMPLATES (4 endpoints)

  /**
   * Get templates
   * GET /api/matter-budgets/templates
   */
  export type GetTemplatesResponse = ApiResponse<BudgetTemplate[]>;

  /**
   * Create template
   * POST /api/matter-budgets/templates
   */
  export interface CreateTemplateRequest {
    name: string;
    nameAr?: string;
    description?: string;
    phases: BudgetPhase[];
  }
  export type CreateTemplateResponse = ApiResponse<BudgetTemplate>;

  /**
   * Update template
   * PATCH /api/matter-budgets/templates/:id
   */
  export interface UpdateTemplateRequest {
    name?: string;
    nameAr?: string;
    description?: string;
    phases?: BudgetPhase[];
  }
  export type UpdateTemplateResponse = ApiResponse<BudgetTemplate>;

  /**
   * Delete template
   * DELETE /api/matter-budgets/templates/:id
   */
  export type DeleteTemplateResponse = ApiResponse<{ message: string }>;

  // BY CASE (1 endpoint)

  /**
   * Get budget by case
   * GET /api/matter-budgets/case/:caseId
   */
  export type GetBudgetByCaseResponse = ApiResponse<Budget>;

  // CRUD (5 endpoints)

  /**
   * Get all budgets
   * GET /api/matter-budgets
   */
  export interface GetBudgetsRequest {
    page?: number;
    limit?: number;
    caseId?: ObjectId;
    clientId?: ObjectId;
    status?: string;
  }
  export type GetBudgetsResponse = PaginatedResponse<Budget>;

  /**
   * Create budget
   * POST /api/matter-budgets
   */
  export interface CreateBudgetRequest {
    caseId: ObjectId;
    clientId?: ObjectId;
    name?: string;
    nameAr?: string;
    totalBudget: number;
    phases?: BudgetPhase[];
    alertThresholds?: {
      warning: number;
      critical: number;
    };
    notes?: string;
    templateId?: ObjectId;
  }
  export type CreateBudgetResponse = ApiResponse<Budget>;

  /**
   * Get single budget
   * GET /api/matter-budgets/:id
   */
  export type GetBudgetResponse = ApiResponse<Budget>;

  /**
   * Update budget
   * PATCH /api/matter-budgets/:id
   */
  export interface UpdateBudgetRequest {
    name?: string;
    nameAr?: string;
    totalBudget?: number;
    alertThresholds?: {
      warning: number;
      critical: number;
    };
    notes?: string;
    status?: string;
  }
  export type UpdateBudgetResponse = ApiResponse<Budget>;

  /**
   * Delete budget
   * DELETE /api/matter-budgets/:id
   */
  export type DeleteBudgetResponse = ApiResponse<{ message: string }>;

  // ANALYSIS (1 endpoint)

  /**
   * Get budget analysis
   * GET /api/matter-budgets/:id/analysis
   */
  export interface BudgetAnalysis {
    budget: Budget;
    utilization: number;
    status: string;
    phaseAnalysis: Array<{
      phase: BudgetPhase;
      utilization: number;
      status: string;
    }>;
    spending: {
      byCategory: Record<string, number>;
      byMonth: Array<{ month: string; amount: number }>;
    };
    forecast: {
      projectedCompletion: string;
      estimatedOverrun: number;
    };
  }
  export type GetBudgetAnalysisResponse = ApiResponse<BudgetAnalysis>;

  // ENTRIES (4 endpoints)

  /**
   * Get entries
   * GET /api/matter-budgets/:id/entries
   */
  export interface GetEntriesRequest {
    phaseId?: ObjectId;
    category?: string;
    startDate?: string;
    endDate?: string;
  }
  export type GetEntriesResponse = ApiResponse<BudgetEntry[]>;

  /**
   * Add entry
   * POST /api/matter-budgets/:id/entries
   */
  export interface AddEntryRequest {
    phaseId?: ObjectId;
    description: string;
    descriptionAr?: string;
    amount: number;
    category: string;
    date: string;
  }
  export type AddEntryResponse = ApiResponse<BudgetEntry>;

  /**
   * Update entry
   * PATCH /api/matter-budgets/:id/entries/:entryId
   */
  export interface UpdateEntryRequest {
    description?: string;
    descriptionAr?: string;
    amount?: number;
    category?: string;
    date?: string;
  }
  export type UpdateEntryResponse = ApiResponse<BudgetEntry>;

  /**
   * Delete entry
   * DELETE /api/matter-budgets/:id/entries/:entryId
   */
  export type DeleteEntryResponse = ApiResponse<{ message: string }>;

  // PHASES (3 endpoints)

  /**
   * Add phase
   * POST /api/matter-budgets/:id/phases
   */
  export interface AddPhaseRequest {
    name: string;
    nameAr?: string;
    budget: number;
    description?: string;
    startDate?: string;
    endDate?: string;
  }
  export type AddPhaseResponse = ApiResponse<Budget>;

  /**
   * Update phase
   * PATCH /api/matter-budgets/:id/phases/:phaseId
   */
  export interface UpdatePhaseRequest {
    name?: string;
    nameAr?: string;
    budget?: number;
    description?: string;
    startDate?: string;
    endDate?: string;
  }
  export type UpdatePhaseResponse = ApiResponse<Budget>;

  /**
   * Delete phase
   * DELETE /api/matter-budgets/:id/phases/:phaseId
   */
  export type DeletePhaseResponse = ApiResponse<Budget>;
}

// ============================================================================
// 4. DOCUMENT ANALYSIS
// Base: /api/document-analysis
// Endpoints: 10
// ============================================================================

export namespace DocumentAnalysis {
  export type AnalysisType = 'all' | 'classification' | 'entities' | 'summary' | 'risk' | 'compliance';
  export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

  export interface Entity {
    type: string;
    value: string;
    confidence: number;
  }

  export interface RiskItem {
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation?: string;
  }

  export interface Analysis {
    _id: ObjectId;
    documentId: ObjectId;
    firmId?: ObjectId;
    status: AnalysisStatus;
    analysisTypes: AnalysisType[];
    results: {
      classification?: {
        documentType: string;
        confidence: number;
        categories: string[];
      };
      entities?: Entity[];
      summary?: {
        text: string;
        keyPoints: string[];
      };
      risk?: {
        overallRisk: 'low' | 'medium' | 'high';
        risks: RiskItem[];
      };
      compliance?: {
        compliant: boolean;
        issues: string[];
        recommendations: string[];
      };
    };
    error?: string;
    processingTime?: number;
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  // STATS & SEARCH (2 endpoints)

  /**
   * Get analysis stats
   * GET /api/document-analysis/stats
   */
  export interface AnalysisStats {
    total: number;
    byStatus: Record<AnalysisStatus, number>;
    byType: Record<string, number>;
    averageProcessingTime: number;
  }
  export type GetStatsResponse = ApiResponse<AnalysisStats>;

  /**
   * Semantic search
   * GET /api/document-analysis/search
   */
  export interface SemanticSearchRequest {
    query: string;
    limit?: number;
    threshold?: number;
  }
  export interface SearchResult {
    documentId: ObjectId;
    analysisId: ObjectId;
    score: number;
    snippet: string;
  }
  export type SemanticSearchResponse = ApiResponse<SearchResult[]>;

  // BATCH (1 endpoint)

  /**
   * Batch analyze
   * POST /api/document-analysis/batch
   */
  export interface BatchAnalyzeRequest {
    documentIds: ObjectId[];
    analysisTypes?: AnalysisType[];
    async?: boolean;
  }
  export type BatchAnalyzeResponse = ApiResponse<Analysis[]>;

  // DOCUMENT OPERATIONS (4 endpoints)

  /**
   * Analyze document
   * POST /api/document-analysis/:documentId
   */
  export interface AnalyzeDocumentRequest {
    analysisTypes?: AnalysisType[];
    async?: boolean;
  }
  export type AnalyzeDocumentResponse = ApiResponse<Analysis>;

  /**
   * Get analysis
   * GET /api/document-analysis/:documentId
   */
  export type GetAnalysisResponse = ApiResponse<Analysis>;

  /**
   * Delete analysis
   * DELETE /api/document-analysis/:documentId
   */
  export type DeleteAnalysisResponse = ApiResponse<{ message: string }>;

  /**
   * Re-analyze document
   * POST /api/document-analysis/:documentId/reanalyze
   */
  export interface ReanalyzeDocumentRequest {
    analysisTypes?: AnalysisType[];
  }
  export type ReanalyzeDocumentResponse = ApiResponse<Analysis>;

  // STATUS & HISTORY (2 endpoints)

  /**
   * Get analysis status
   * GET /api/document-analysis/:documentId/status
   */
  export interface AnalysisStatusResponse {
    status: AnalysisStatus;
    progress?: number;
    estimatedCompletion?: string;
  }
  export type GetAnalysisStatusResponse = ApiResponse<AnalysisStatusResponse>;

  /**
   * Get analysis history
   * GET /api/document-analysis/:documentId/history
   */
  export type GetAnalysisHistoryResponse = ApiResponse<Analysis[]>;

  // SIMILAR & REPORT (2 endpoints)

  /**
   * Find similar documents
   * GET /api/document-analysis/:documentId/similar
   */
  export interface FindSimilarRequest {
    limit?: number;
    threshold?: number;
  }
  export interface SimilarDocument {
    documentId: ObjectId;
    similarity: number;
    title: string;
  }
  export type FindSimilarResponse = ApiResponse<SimilarDocument[]>;

  /**
   * Generate report
   * GET /api/document-analysis/:documentId/report
   */
  export interface GenerateReportRequest {
    format?: 'pdf' | 'json' | 'html';
  }
  // Returns file download or JSON
}

// ============================================================================
// 5. CLOUD STORAGE
// Base: /api/storage
// Endpoints: 13
// ============================================================================

export namespace CloudStorage {
  export type Provider = 'google_drive' | 'onedrive' | 'dropbox';
  export type FileType = 'file' | 'folder';

  export interface CloudFile {
    id: string;
    name: string;
    type: FileType;
    mimeType?: string;
    size?: number;
    modifiedTime?: string;
    webViewLink?: string;
    thumbnailLink?: string;
    path?: string;
  }

  export interface ConnectionStatus {
    connected: boolean;
    provider: Provider;
    email?: string;
    expiresAt?: string;
  }

  // PROVIDER MANAGEMENT (1 endpoint)

  /**
   * Get available providers
   * GET /api/storage/providers
   */
  export interface ProviderInfo {
    id: Provider;
    name: string;
    icon: string;
    features: string[];
  }
  export type GetProvidersResponse = ApiResponse<ProviderInfo[]>;

  // OAUTH (3 endpoints)

  /**
   * Get OAuth authorization URL
   * GET /api/storage/:provider/auth
   */
  export interface GetAuthUrlResponse {
    authUrl: string;
    state: string;
  }
  export type GetAuthUrlResponseType = ApiResponse<GetAuthUrlResponse>;

  /**
   * Handle OAuth callback
   * GET /api/storage/:provider/callback
   */
  export interface HandleCallbackRequest {
    code: string;
    state: string;
  }
  export type HandleCallbackResponse = ApiResponse<{ success: boolean; message: string }>;

  /**
   * Get connection status
   * GET /api/storage/:provider/status
   */
  export type GetConnectionStatusResponse = ApiResponse<ConnectionStatus>;

  /**
   * Disconnect from provider
   * POST /api/storage/:provider/disconnect
   */
  export type DisconnectResponse = ApiResponse<{ message: string }>;

  // FILE OPERATIONS (7 endpoints)

  /**
   * List files
   * GET /api/storage/:provider/files
   */
  export interface ListFilesRequest {
    path?: string;
    pageSize?: number;
    pageToken?: string;
    query?: string;
  }
  export interface ListFilesResponse {
    files: CloudFile[];
    nextPageToken?: string;
  }
  export type ListFilesResponseType = ApiResponse<ListFilesResponse>;

  /**
   * Upload file
   * POST /api/storage/:provider/files
   */
  export interface UploadFileRequest {
    file: File;
    path?: string;
  }
  export type UploadFileResponse = ApiResponse<CloudFile>;

  /**
   * Get file metadata
   * GET /api/storage/:provider/files/:fileId/metadata
   */
  export type GetFileMetadataResponse = ApiResponse<CloudFile>;

  /**
   * Download file
   * GET /api/storage/:provider/files/:fileId
   */
  // Returns file download

  /**
   * Delete file
   * DELETE /api/storage/:provider/files/:fileId
   */
  export type DeleteFileResponse = ApiResponse<{ message: string }>;

  /**
   * Move file
   * POST /api/storage/:provider/files/:fileId/move
   */
  export interface MoveFileRequest {
    fromPath: string;
    toPath: string;
  }
  export type MoveFileResponse = ApiResponse<CloudFile>;

  /**
   * Share file
   * POST /api/storage/:provider/files/:fileId/share
   */
  export interface ShareFileRequest {
    email?: string;
    role: 'reader' | 'writer' | 'commenter';
    type: 'user' | 'anyone';
  }
  export interface ShareResponse {
    shareUrl: string;
    permissions: any[];
  }
  export type ShareFileResponse = ApiResponse<ShareResponse>;

  // FOLDER OPERATIONS (1 endpoint)

  /**
   * Create folder
   * POST /api/storage/:provider/folders
   */
  export interface CreateFolderRequest {
    name: string;
    path?: string;
    parentId?: string;
  }
  export type CreateFolderResponse = ApiResponse<CloudFile>;
}

// ============================================================================
// 6. OFFLINE SYNC
// Base: /api/offline
// Endpoints: 6
// ============================================================================

export namespace OfflineSync {
  export type EntityType = 'cases' | 'clients' | 'tasks' | 'appointments' | 'documents' | 'invoices';
  export type ChangeAction = 'create' | 'update' | 'delete';
  export type ConflictResolution = 'server' | 'client' | 'merge';

  export interface SyncManifest {
    version: string;
    timestamp: string;
    entities: {
      [K in EntityType]?: {
        lastSync: string;
        count: number;
      };
    };
  }

  export interface OfflineChange {
    entityType: EntityType;
    entityId: ObjectId;
    action: ChangeAction;
    data: any;
    timestamp: string;
    clientId: string;
  }

  export interface SyncConflict {
    entityType: EntityType;
    entityId: ObjectId;
    clientVersion: any;
    serverVersion: any;
    conflictingFields: string[];
  }

  export interface SyncStatus {
    lastSync?: string;
    pendingChanges: number;
    syncInProgress: boolean;
    conflicts: number;
  }

  /**
   * Get sync manifest
   * GET /api/offline/manifest
   */
  export interface GetSyncManifestRequest {
    firmId?: ObjectId;
  }
  export type GetSyncManifestResponse = ApiResponse<SyncManifest>;

  /**
   * Get offline data
   * GET /api/offline/data
   */
  export interface GetOfflineDataRequest {
    firmId?: ObjectId;
    entityTypes?: string;
  }
  export interface OfflineData {
    [K in EntityType]?: any[];
  }
  export type GetOfflineDataResponse = ApiResponse<OfflineData>;

  /**
   * Sync offline changes
   * POST /api/offline/sync
   */
  export interface SyncOfflineChangesRequest {
    changes: OfflineChange[];
  }
  export interface SyncResult {
    successful: number;
    failed: number;
    conflicts: SyncConflict[];
    errors: Array<{
      entityType: EntityType;
      entityId: ObjectId;
      error: string;
    }>;
  }
  export type SyncOfflineChangesResponse = ApiResponse<SyncResult>;

  /**
   * Get changes since last sync
   * GET /api/offline/changes
   */
  export interface GetChangesSinceLastSyncRequest {
    since?: string;
    firmId?: ObjectId;
    entityTypes?: string;
  }
  export interface Changes {
    timestamp: string;
    changes: Array<{
      entityType: EntityType;
      entityId: ObjectId;
      action: ChangeAction;
      data: any;
    }>;
  }
  export type GetChangesSinceLastSyncResponse = ApiResponse<Changes>;

  /**
   * Resolve conflicts
   * POST /api/offline/conflicts/resolve
   */
  export interface ResolveConflictsRequest {
    conflicts: Array<{
      entityType: EntityType;
      entityId: ObjectId;
      resolution: ConflictResolution;
      mergedData?: any;
    }>;
  }
  export type ResolveConflictsResponse = ApiResponse<{ resolved: number }>;

  /**
   * Get sync status
   * GET /api/offline/status
   */
  export type GetSyncStatusResponse = ApiResponse<SyncStatus>;
}

// ============================================================================
// 7. PDF GENERATION (PDFMe)
// Base: /api/pdfme
// Endpoints: 16
// ============================================================================

export namespace PDFMe {
  export type TemplateCategory =
    | 'invoice' | 'contract' | 'receipt' | 'report'
    | 'statement' | 'letter' | 'certificate' | 'custom';

  export type TemplateType = 'standard' | 'detailed' | 'summary' | 'minimal' | 'custom';

  export interface Template {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    category: TemplateCategory;
    type: TemplateType;
    basePdf?: string;
    schemas: any[];
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  // TEMPLATES (8 endpoints)

  /**
   * List templates
   * GET /api/pdfme/templates
   */
  export interface ListTemplatesRequest {
    category?: TemplateCategory;
    type?: TemplateType;
    limit?: number;
    skip?: number;
  }
  export type ListTemplatesResponse = ApiResponse<Template[]>;

  /**
   * Get default template for category
   * GET /api/pdfme/templates/default/:category
   */
  export type GetDefaultTemplateResponse = ApiResponse<Template>;

  /**
   * Get template by ID
   * GET /api/pdfme/templates/:id
   */
  export type GetTemplateResponse = ApiResponse<Template>;

  /**
   * Create template
   * POST /api/pdfme/templates
   */
  export interface CreateTemplateRequest {
    name: string;
    nameAr?: string;
    category: TemplateCategory;
    type?: TemplateType;
    basePdf?: string;
    schemas: any[];
  }
  export type CreateTemplateResponse = ApiResponse<Template>;

  /**
   * Update template
   * PUT /api/pdfme/templates/:id
   */
  export interface UpdateTemplateRequest {
    name?: string;
    nameAr?: string;
    type?: TemplateType;
    basePdf?: string;
    schemas?: any[];
  }
  export type UpdateTemplateResponse = ApiResponse<Template>;

  /**
   * Delete template
   * DELETE /api/pdfme/templates/:id
   */
  export type DeleteTemplateResponse = ApiResponse<{ message: string }>;

  /**
   * Clone template
   * POST /api/pdfme/templates/:id/clone
   */
  export interface CloneTemplateRequest {
    name?: string;
  }
  export type CloneTemplateResponse = ApiResponse<Template>;

  /**
   * Set as default template
   * POST /api/pdfme/templates/:id/set-default
   */
  export type SetDefaultTemplateResponse = ApiResponse<{ message: string }>;

  /**
   * Preview template
   * POST /api/pdfme/templates/:id/preview
   */
  export interface PreviewTemplateRequest {
    inputs?: Record<string, any>;
  }
  export interface PreviewResponse {
    pdf: string; // base64
  }
  export type PreviewTemplateResponse = ApiResponse<PreviewResponse>;

  // GENERATION (5 endpoints)

  /**
   * Generate PDF synchronously
   * POST /api/pdfme/generate
   */
  export interface GeneratePDFRequest {
    templateId?: ObjectId;
    template?: any;
    inputs: Record<string, any>;
    type?: string;
  }
  export interface PDFResult {
    pdf: string; // base64
    fileName: string;
  }
  export type GeneratePDFResponse = ApiResponse<PDFResult>;

  /**
   * Generate PDF asynchronously
   * POST /api/pdfme/generate/async
   */
  export interface GeneratePDFAsyncRequest {
    templateId?: ObjectId;
    template?: any;
    inputs: Record<string, any>;
    type?: string;
    priority?: number;
  }
  export interface AsyncJobResponse {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
  }
  export type GeneratePDFAsyncResponse = ApiResponse<AsyncJobResponse>;

  /**
   * Generate invoice PDF
   * POST /api/pdfme/generate/invoice
   */
  export interface GenerateInvoicePDFRequest {
    invoiceData: any;
    templateId?: ObjectId;
    includeQR?: boolean;
    qrData?: string;
  }
  export type GenerateInvoicePDFResponse = ApiResponse<PDFResult>;

  /**
   * Generate contract PDF
   * POST /api/pdfme/generate/contract
   */
  export interface GenerateContractPDFRequest {
    contractData: any;
    templateId?: ObjectId;
  }
  export type GenerateContractPDFResponse = ApiResponse<PDFResult>;

  /**
   * Generate receipt PDF
   * POST /api/pdfme/generate/receipt
   */
  export interface GenerateReceiptPDFRequest {
    receiptData: any;
    templateId?: ObjectId;
  }
  export type GenerateReceiptPDFResponse = ApiResponse<PDFResult>;

  // DOWNLOAD (1 endpoint)

  /**
   * Download PDF
   * GET /api/pdfme/download/:fileName
   */
  export interface DownloadPDFRequest {
    subDir?: string;
  }
  // Returns file download
}

// ============================================================================
// 8. UNIFIED DATA
// Base: /api/unified
// Endpoints: 6
// ============================================================================

export namespace UnifiedData {
  /**
   * Get billable items
   * GET /api/unified/billable-items
   */
  export interface GetBillableItemsRequest {
    clientId?: ObjectId;
    caseId?: ObjectId;
    startDate?: string;
    endDate?: string;
  }
  export interface BillableItemsData {
    entries: any[];
    summary: {
      totalEntries: number;
      totalHours: number;
      totalAmount: number;
      currency: string;
    };
    byClient: Array<{
      client: any;
      entries: any[];
      totalHours: number;
      totalAmount: number;
    }>;
  }
  export type GetBillableItemsResponse = ApiResponse<BillableItemsData>;

  /**
   * Get open invoices
   * GET /api/unified/open-invoices
   */
  export interface GetOpenInvoicesRequest {
    clientId?: ObjectId;
  }
  export interface OpenInvoicesData {
    invoices: any[];
    summary: {
      totalInvoices: number;
      totalOutstanding: number;
      currency: string;
    };
    aging: {
      current: { count: number; amount: number };
      days1_30: { count: number; amount: number };
      days31_60: { count: number; amount: number };
      days61_90: { count: number; amount: number };
      over90: { count: number; amount: number };
    };
  }
  export type GetOpenInvoicesResponse = ApiResponse<OpenInvoicesData>;

  /**
   * Get financial summary
   * GET /api/unified/financial-summary
   */
  export interface GetFinancialSummaryRequest {
    year?: number;
    month?: number;
  }
  export interface FinancialSummaryData {
    period: {
      year: number;
      month: number;
      start: string;
      end: string;
    };
    invoices: {
      byStatus: any[];
      total: number;
      count: number;
    };
    payments: {
      byMethod: any[];
      total: number;
      count: number;
    };
    ytd: {
      revenue: number;
      paymentCount: number;
    };
    outstanding: {
      balance: number;
      invoiceCount: number;
    };
    billableHours: {
      totalHours: number;
      billedHours: number;
      unbilledHours: number;
    };
    monthlyTrend: any[];
    currency: string;
  }
  export type GetFinancialSummaryResponse = ApiResponse<FinancialSummaryData>;

  /**
   * Get client portfolio
   * GET /api/unified/client-portfolio/:clientId
   */
  export interface ClientPortfolioData {
    client: any;
    cases: {
      list: any[];
      total: number;
      active: number;
    };
    invoices: {
      list: any[];
      total: number;
      totalBilled: number;
      totalPaid: number;
      outstandingBalance: number;
    };
    payments: {
      list: any[];
      total: number;
      totalAmount: number;
    };
    unbilled: {
      hours: number;
      amount: number;
    };
    currency: string;
  }
  export type GetClientPortfolioResponse = ApiResponse<ClientPortfolioData>;

  /**
   * Get HR dashboard
   * GET /api/unified/hr-dashboard
   */
  export interface HRDashboardData {
    employees: {
      total: number;
      active: number;
      byStatus: any[];
    };
    leave: {
      thisMonth: any[];
      pendingApproval: number;
    };
    attendance: {
      today: any[];
      present: number;
      absent: number;
    };
    alerts: {
      upcomingBirthdays: any[];
      probationEnding: any[];
    };
    payroll: any[];
  }
  export type GetHRDashboardResponse = ApiResponse<HRDashboardData>;

  /**
   * Get case financials
   * GET /api/unified/case-financials/:caseId
   */
  export interface CaseFinancialsData {
    case: {
      _id: ObjectId;
      caseNumber: string;
      title: string;
      client: any;
    };
    timeTracking: {
      billable: { hours: number; amount: number };
      nonBillable: { hours: number; amount: number };
      total: { hours: number; amount: number };
    };
    invoicing: {
      invoices: any[];
      totalInvoiced: number;
      totalPaid: number;
      outstanding: number;
    };
    unbilled: {
      hours: number;
      amount: number;
    };
    profitability: {
      revenue: number;
      estimatedValue: number;
      unbilledValue: number;
    };
    currency: string;
  }
  export type GetCaseFinancialsResponse = ApiResponse<CaseFinancialsData>;
}

// ============================================================================
// 9. SAVED FILTERS
// Base: /api/saved-filters
// Endpoints: 10
// ============================================================================

export namespace SavedFilter {
  export type EntityType =
    | 'invoices' | 'clients' | 'cases' | 'leads' | 'tasks'
    | 'events' | 'reminders' | 'expenses' | 'payments'
    | 'documents' | 'contacts' | 'deals' | 'projects' | 'time_entries';

  export interface Filter {
    _id: ObjectId;
    firmId: ObjectId;
    userId: ObjectId;
    lawyerId?: ObjectId;
    name: string;
    entityType: EntityType;
    filters: Record<string, any>;
    sort: Record<string, any>;
    columns: string[];
    isDefault: boolean;
    isFavorite?: boolean;
    sharedWith?: ObjectId[];
    usageCount?: number;
    createdAt: string;
    updatedAt: string;
  }

  /**
   * List filters
   * GET /api/saved-filters
   */
  export interface ListFiltersRequest {
    entityType?: EntityType;
    page?: number;
    limit?: number;
  }
  export type ListFiltersResponse = PaginatedResponse<Filter>;

  /**
   * Create filter
   * POST /api/saved-filters
   */
  export interface CreateFilterRequest {
    name: string;
    entityType: EntityType;
    filters: Record<string, any>;
    sort?: Record<string, any>;
    columns?: string[];
    isDefault?: boolean;
  }
  export type CreateFilterResponse = ApiResponse<Filter>;

  /**
   * Get popular filters
   * GET /api/saved-filters/popular/:entityType
   */
  export interface GetPopularFiltersRequest {
    limit?: number;
  }
  export type GetPopularFiltersResponse = ApiResponse<Filter[]>;

  /**
   * Get single filter
   * GET /api/saved-filters/:id
   */
  export type GetFilterResponse = ApiResponse<Filter>;

  /**
   * Update filter
   * PUT/PATCH /api/saved-filters/:id
   */
  export interface UpdateFilterRequest {
    name?: string;
    filters?: Record<string, any>;
    sort?: Record<string, any>;
    columns?: string[];
    isDefault?: boolean;
  }
  export type UpdateFilterResponse = ApiResponse<Filter>;

  /**
   * Delete filter
   * DELETE /api/saved-filters/:id
   */
  export type DeleteFilterResponse = ApiResponse<{ message: string }>;

  /**
   * Set as default
   * POST /api/saved-filters/:id/set-default
   */
  export type SetAsDefaultResponse = ApiResponse<Filter>;

  /**
   * Share filter
   * POST /api/saved-filters/:id/share
   */
  export interface ShareFilterRequest {
    userIds: ObjectId[];
  }
  export type ShareFilterResponse = ApiResponse<Filter>;

  /**
   * Unshare filter
   * DELETE /api/saved-filters/:id/share/:userId
   */
  export type UnshareFilterResponse = ApiResponse<Filter>;

  /**
   * Duplicate filter
   * POST /api/saved-filters/:id/duplicate
   */
  export interface DuplicateFilterRequest {
    name?: string;
  }
  export type DuplicateFilterResponse = ApiResponse<Filter>;
}

// ============================================================================
// 10. SAVED REPORTS & WIDGETS
// Base: /api/saved-reports
// Endpoints: 13
// ============================================================================

export namespace SavedReport {
  export type ReportType = 'table' | 'chart' | 'metric' | 'list' | 'custom';
  export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  export type DataSource = 'invoices' | 'cases' | 'clients' | 'tasks' | 'time_entries' | 'expenses';

  export interface Report {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    type: ReportType;
    dataSource: DataSource;
    config: {
      filters?: Record<string, any>;
      groupBy?: string[];
      aggregations?: any[];
      chartType?: ChartType;
      columns?: string[];
    };
    schedule?: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: ObjectId[];
    };
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  export interface Widget {
    _id: ObjectId;
    firmId: ObjectId;
    userId: ObjectId;
    type: 'metric' | 'chart' | 'list' | 'table';
    title: string;
    titleAr?: string;
    dataSource: DataSource;
    config: any;
    layout: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    refreshInterval?: number;
    createdAt: string;
  }

  // REPORTS (6 endpoints)

  /**
   * Get reports
   * GET /api/saved-reports/reports
   */
  export interface GetReportsRequest {
    type?: ReportType;
    dataSource?: DataSource;
  }
  export type GetReportsResponse = ApiResponse<Report[]>;

  /**
   * Create report
   * POST /api/saved-reports/reports
   */
  export interface CreateReportRequest {
    name: string;
    nameAr?: string;
    description?: string;
    type: ReportType;
    dataSource: DataSource;
    config: Report['config'];
    schedule?: Report['schedule'];
  }
  export type CreateReportResponse = ApiResponse<Report>;

  /**
   * Get single report
   * GET /api/saved-reports/reports/:id
   */
  export type GetReportResponse = ApiResponse<Report>;

  /**
   * Update report
   * PATCH /api/saved-reports/reports/:id
   */
  export interface UpdateReportRequest {
    name?: string;
    nameAr?: string;
    description?: string;
    config?: Partial<Report['config']>;
    schedule?: Report['schedule'];
  }
  export type UpdateReportResponse = ApiResponse<Report>;

  /**
   * Delete report
   * DELETE /api/saved-reports/reports/:id
   */
  export type DeleteReportResponse = ApiResponse<{ message: string }>;

  /**
   * Run report
   * POST /api/saved-reports/reports/:id/run
   */
  export interface RunReportRequest {
    startDate?: string;
    endDate?: string;
    filters?: Record<string, any>;
  }
  export interface ReportResult {
    data: any[];
    summary?: any;
    generatedAt: string;
  }
  export type RunReportResponse = ApiResponse<ReportResult>;

  /**
   * Duplicate report
   * POST /api/saved-reports/reports/:id/duplicate
   */
  export interface DuplicateReportRequest {
    name?: string;
  }
  export type DuplicateReportResponse = ApiResponse<Report>;

  // WIDGETS (7 endpoints)

  /**
   * Get default widgets
   * GET /api/saved-reports/widgets/defaults
   */
  export type GetDefaultWidgetsResponse = ApiResponse<Widget[]>;

  /**
   * Update layout
   * PATCH /api/saved-reports/widgets/layout
   */
  export interface UpdateLayoutRequest {
    layouts: Array<{
      widgetId: ObjectId;
      layout: Widget['layout'];
    }>;
  }
  export type UpdateLayoutResponse = ApiResponse<{ message: string }>;

  /**
   * Get widgets
   * GET /api/saved-reports/widgets
   */
  export type GetWidgetsResponse = ApiResponse<Widget[]>;

  /**
   * Create widget
   * POST /api/saved-reports/widgets
   */
  export interface CreateWidgetRequest {
    type: Widget['type'];
    title: string;
    titleAr?: string;
    dataSource: DataSource;
    config: any;
    layout: Widget['layout'];
    refreshInterval?: number;
  }
  export type CreateWidgetResponse = ApiResponse<Widget>;

  /**
   * Get single widget
   * GET /api/saved-reports/widgets/:id
   */
  export type GetWidgetResponse = ApiResponse<Widget>;

  /**
   * Update widget
   * PATCH /api/saved-reports/widgets/:id
   */
  export interface UpdateWidgetRequest {
    title?: string;
    titleAr?: string;
    config?: any;
    layout?: Partial<Widget['layout']>;
    refreshInterval?: number;
  }
  export type UpdateWidgetResponse = ApiResponse<Widget>;

  /**
   * Delete widget
   * DELETE /api/saved-reports/widgets/:id
   */
  export type DeleteWidgetResponse = ApiResponse<{ message: string }>;

  /**
   * Get widget data
   * GET /api/saved-reports/widgets/:id/data
   */
  export interface GetWidgetDataRequest {
    startDate?: string;
    endDate?: string;
  }
  export type GetWidgetDataResponse = ApiResponse<any>;
}

// ============================================================================
// 11. PREPARED REPORTS
// Base: /api/prepared-reports
// Endpoints: 7
// ============================================================================

export namespace PreparedReport {
  export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'expired';

  export interface PreparedReport {
    _id: ObjectId;
    firmId: ObjectId;
    reportId: ObjectId;
    reportName: string;
    status: ReportStatus;
    data?: any;
    generatedAt?: string;
    expiresAt?: string;
    parameters?: Record<string, any>;
    error?: string;
    createdBy: ObjectId;
    createdAt: string;
  }

  export interface CacheStats {
    totalReports: number;
    ready: number;
    generating: number;
    failed: number;
    expired: number;
    cacheHitRate: number;
    averageGenerationTime: number;
  }

  /**
   * Get cache stats
   * GET /api/prepared-reports/stats
   */
  export type GetCacheStatsResponse = ApiResponse<CacheStats>;

  /**
   * Request prepared report
   * POST /api/prepared-reports/request
   */
  export interface RequestPreparedReportRequest {
    reportId: ObjectId;
    parameters?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high';
  }
  export type RequestPreparedReportResponse = ApiResponse<PreparedReport>;

  /**
   * Cleanup reports
   * POST /api/prepared-reports/cleanup
   */
  export interface CleanupReportsRequest {
    olderThan?: number; // days
  }
  export type CleanupReportsResponse = ApiResponse<{ deleted: number }>;

  /**
   * Get prepared reports
   * GET /api/prepared-reports
   */
  export interface GetPreparedReportsRequest {
    status?: ReportStatus;
    reportId?: ObjectId;
  }
  export type GetPreparedReportsResponse = ApiResponse<PreparedReport[]>;

  /**
   * Get single prepared report
   * GET /api/prepared-reports/:id
   */
  export type GetPreparedReportResponse = ApiResponse<PreparedReport>;

  /**
   * Delete prepared report
   * DELETE /api/prepared-reports/:id
   */
  export type DeletePreparedReportResponse = ApiResponse<{ message: string }>;

  /**
   * Refresh prepared report
   * POST /api/prepared-reports/:id/refresh
   */
  export type RefreshPreparedReportResponse = ApiResponse<PreparedReport>;
}

// ============================================================================
// 12. EMAIL MARKETING
// Base: /api/email-marketing
// Endpoints: 32
// ============================================================================

export namespace EmailMarketing {
  export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  export type CampaignType = 'regular' | 'automated' | 'transactional' | 'drip';

  export interface Campaign {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    subject: string;
    subjectAr?: string;
    content: string;
    contentAr?: string;
    type: CampaignType;
    status: CampaignStatus;
    templateId?: ObjectId;
    segmentId?: ObjectId;
    scheduledAt?: string;
    sentAt?: string;
    stats: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      unsubscribed: number;
    };
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  export interface Template {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    content: string;
    contentAr?: string;
    thumbnail?: string;
    isPublic: boolean;
    category?: string;
    createdAt: string;
    createdBy: ObjectId;
  }

  export interface Subscriber {
    _id: ObjectId;
    firmId: ObjectId;
    email: string;
    firstName?: string;
    lastName?: string;
    status: 'subscribed' | 'unsubscribed' | 'bounced';
    tags?: string[];
    customFields?: Record<string, any>;
    subscribedAt: string;
    unsubscribedAt?: string;
  }

  export interface Segment {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    criteria: Record<string, any>;
    subscriberCount?: number;
    isDynamic: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  // CAMPAIGNS (8 endpoints)

  /**
   * Create campaign
   * POST /api/email-marketing/campaigns
   */
  export interface CreateCampaignRequest {
    name: string;
    nameAr?: string;
    subject: string;
    subjectAr?: string;
    content: string;
    contentAr?: string;
    type?: CampaignType;
    templateId?: ObjectId;
    segmentId?: ObjectId;
  }
  export type CreateCampaignResponse = ApiResponse<Campaign>;

  /**
   * Get campaigns
   * GET /api/email-marketing/campaigns
   */
  export interface GetCampaignsRequest {
    status?: CampaignStatus;
    type?: CampaignType;
    page?: number;
    limit?: number;
  }
  export type GetCampaignsResponse = PaginatedResponse<Campaign>;

  /**
   * Get single campaign
   * GET /api/email-marketing/campaigns/:id
   */
  export type GetCampaignResponse = ApiResponse<Campaign>;

  /**
   * Update campaign
   * PUT /api/email-marketing/campaigns/:id
   */
  export interface UpdateCampaignRequest {
    name?: string;
    nameAr?: string;
    subject?: string;
    subjectAr?: string;
    content?: string;
    contentAr?: string;
    segmentId?: ObjectId;
  }
  export type UpdateCampaignResponse = ApiResponse<Campaign>;

  /**
   * Delete campaign
   * DELETE /api/email-marketing/campaigns/:id
   */
  export type DeleteCampaignResponse = ApiResponse<{ message: string }>;

  /**
   * Duplicate campaign
   * POST /api/email-marketing/campaigns/:id/duplicate
   */
  export interface DuplicateCampaignRequest {
    name?: string;
  }
  export type DuplicateCampaignResponse = ApiResponse<Campaign>;

  /**
   * Schedule campaign
   * POST /api/email-marketing/campaigns/:id/schedule
   */
  export interface ScheduleCampaignRequest {
    scheduledAt: string;
  }
  export type ScheduleCampaignResponse = ApiResponse<Campaign>;

  /**
   * Send campaign
   * POST /api/email-marketing/campaigns/:id/send
   */
  export interface SendCampaignRequest {
    sendNow?: boolean;
  }
  export type SendCampaignResponse = ApiResponse<{ message: string; campaign: Campaign }>;

  /**
   * Pause campaign
   * POST /api/email-marketing/campaigns/:id/pause
   */
  export type PauseCampaignResponse = ApiResponse<Campaign>;

  /**
   * Resume campaign
   * POST /api/email-marketing/campaigns/:id/resume
   */
  export type ResumeCampaignResponse = ApiResponse<Campaign>;

  /**
   * Cancel campaign
   * POST /api/email-marketing/campaigns/:id/cancel
   */
  export type CancelCampaignResponse = ApiResponse<Campaign>;

  /**
   * Send test email
   * POST /api/email-marketing/campaigns/:id/test
   */
  export interface SendTestEmailRequest {
    email: string;
  }
  export type SendTestEmailResponse = ApiResponse<{ message: string }>;

  /**
   * Get campaign analytics
   * GET /api/email-marketing/campaigns/:id/analytics
   */
  export interface CampaignAnalytics {
    campaign: Campaign;
    timeline: Array<{
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }>;
    topLinks: Array<{
      url: string;
      clicks: number;
    }>;
    devices: Record<string, number>;
    locations: Record<string, number>;
  }
  export type GetCampaignAnalyticsResponse = ApiResponse<CampaignAnalytics>;

  // TEMPLATES (7 endpoints)

  /**
   * Create template
   * POST /api/email-marketing/templates
   */
  export interface CreateTemplateRequest {
    name: string;
    nameAr?: string;
    content: string;
    contentAr?: string;
    thumbnail?: string;
    isPublic?: boolean;
    category?: string;
  }
  export type CreateTemplateResponse = ApiResponse<Template>;

  /**
   * Get templates
   * GET /api/email-marketing/templates
   */
  export interface GetTemplatesRequest {
    category?: string;
    isPublic?: boolean;
  }
  export type GetTemplatesResponse = ApiResponse<Template[]>;

  /**
   * Get public templates
   * GET /api/email-marketing/templates/public
   */
  export type GetPublicTemplatesResponse = ApiResponse<Template[]>;

  /**
   * Get single template
   * GET /api/email-marketing/templates/:id
   */
  export type GetTemplateResponse = ApiResponse<Template>;

  /**
   * Update template
   * PUT /api/email-marketing/templates/:id
   */
  export interface UpdateTemplateRequest {
    name?: string;
    nameAr?: string;
    content?: string;
    contentAr?: string;
    thumbnail?: string;
    isPublic?: boolean;
    category?: string;
  }
  export type UpdateTemplateResponse = ApiResponse<Template>;

  /**
   * Delete template
   * DELETE /api/email-marketing/templates/:id
   */
  export type DeleteTemplateResponse = ApiResponse<{ message: string }>;

  /**
   * Preview template
   * POST /api/email-marketing/templates/:id/preview
   */
  export interface PreviewTemplateRequest {
    data?: Record<string, any>;
  }
  export interface PreviewResponse {
    html: string;
  }
  export type PreviewTemplateResponse = ApiResponse<PreviewResponse>;

  // SUBSCRIBERS (7 endpoints)

  /**
   * Create subscriber
   * POST /api/email-marketing/subscribers
   */
  export interface CreateSubscriberRequest {
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }
  export type CreateSubscriberResponse = ApiResponse<Subscriber>;

  /**
   * Get subscribers
   * GET /api/email-marketing/subscribers
   */
  export interface GetSubscribersRequest {
    status?: string;
    tags?: string;
    page?: number;
    limit?: number;
  }
  export type GetSubscribersResponse = PaginatedResponse<Subscriber>;

  /**
   * Update subscriber
   * PUT /api/email-marketing/subscribers/:id
   */
  export interface UpdateSubscriberRequest {
    firstName?: string;
    lastName?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }
  export type UpdateSubscriberResponse = ApiResponse<Subscriber>;

  /**
   * Delete subscriber
   * DELETE /api/email-marketing/subscribers/:id
   */
  export type DeleteSubscriberResponse = ApiResponse<{ message: string }>;

  /**
   * Import subscribers
   * POST /api/email-marketing/subscribers/import
   */
  export interface ImportSubscribersRequest {
    subscribers: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      tags?: string[];
    }>;
  }
  export interface ImportResult {
    imported: number;
    skipped: number;
    errors: Array<{ email: string; error: string }>;
  }
  export type ImportSubscribersResponse = ApiResponse<ImportResult>;

  /**
   * Export subscribers
   * POST /api/email-marketing/subscribers/export
   */
  export interface ExportSubscribersRequest {
    format?: 'csv' | 'json';
    filters?: Record<string, any>;
  }
  // Returns file download

  /**
   * Unsubscribe
   * POST /api/email-marketing/subscribers/:id/unsubscribe
   */
  export interface UnsubscribeRequest {
    reason?: string;
  }
  export type UnsubscribeResponse = ApiResponse<{ message: string }>;

  // SEGMENTS (6 endpoints)

  /**
   * Create segment
   * POST /api/email-marketing/segments
   */
  export interface CreateSegmentRequest {
    name: string;
    nameAr?: string;
    description?: string;
    criteria: Record<string, any>;
    isDynamic?: boolean;
  }
  export type CreateSegmentResponse = ApiResponse<Segment>;

  /**
   * Get segments
   * GET /api/email-marketing/segments
   */
  export type GetSegmentsResponse = ApiResponse<Segment[]>;

  /**
   * Get single segment
   * GET /api/email-marketing/segments/:id
   */
  export type GetSegmentResponse = ApiResponse<Segment>;

  /**
   * Update segment
   * PUT /api/email-marketing/segments/:id
   */
  export interface UpdateSegmentRequest {
    name?: string;
    nameAr?: string;
    description?: string;
    criteria?: Record<string, any>;
  }
  export type UpdateSegmentResponse = ApiResponse<Segment>;

  /**
   * Delete segment
   * DELETE /api/email-marketing/segments/:id
   */
  export type DeleteSegmentResponse = ApiResponse<{ message: string }>;

  /**
   * Get segment subscribers
   * GET /api/email-marketing/segments/:id/subscribers
   */
  export interface GetSegmentSubscribersRequest {
    page?: number;
    limit?: number;
  }
  export type GetSegmentSubscribersResponse = PaginatedResponse<Subscriber>;

  /**
   * Refresh segment
   * POST /api/email-marketing/segments/:id/refresh
   */
  export type RefreshSegmentResponse = ApiResponse<{ subscriberCount: number }>;

  // ANALYTICS (2 endpoints)

  /**
   * Get overview analytics
   * GET /api/email-marketing/analytics/overview
   */
  export interface OverviewAnalytics {
    campaigns: {
      total: number;
      sent: number;
      scheduled: number;
    };
    subscribers: {
      total: number;
      subscribed: number;
      unsubscribed: number;
    };
    performance: {
      totalSent: number;
      totalDelivered: number;
      totalOpened: number;
      totalClicked: number;
      averageOpenRate: number;
      averageClickRate: number;
    };
  }
  export type GetOverviewAnalyticsResponse = ApiResponse<OverviewAnalytics>;

  /**
   * Get trends analytics
   * GET /api/email-marketing/analytics/trends
   */
  export interface GetTrendsAnalyticsRequest {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }
  export interface TrendsAnalytics {
    timeline: Array<{
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }>;
  }
  export type GetTrendsAnalyticsResponse = ApiResponse<TrendsAnalytics>;

  // WEBHOOKS (3 endpoints - public)

  /**
   * Handle Resend webhook
   * POST /api/email-marketing/webhooks/email/resend
   */
  export interface ResendWebhookPayload {
    type: string;
    data: any;
  }
  export type HandleResendWebhookResponse = ApiResponse<{ received: boolean }>;

  /**
   * Track open
   * GET /api/email-marketing/webhooks/email/track/open/:trackingId
   */
  // Returns 1x1 pixel image

  /**
   * Handle unsubscribe
   * GET /api/email-marketing/webhooks/email/unsubscribe/:email
   */
  export type HandleUnsubscribeResponse = ApiResponse<{ message: string }>;
}

// ============================================================================
// 13. EMAIL SETTINGS
// Base: /api/email-settings
// Endpoints: 11
// ============================================================================

export namespace EmailSettings {
  export interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    fromEmail: string;
    fromName: string;
    fromNameAr?: string;
  }

  export interface EmailTemplate {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    subject: string;
    subjectAr?: string;
    body: string;
    bodyAr?: string;
    variables: string[];
    category?: string;
    createdAt: string;
    createdBy: ObjectId;
  }

  export interface EmailSignature {
    _id: ObjectId;
    userId: ObjectId;
    firmId: ObjectId;
    name: string;
    content: string;
    contentAr?: string;
    isDefault: boolean;
    createdAt: string;
  }

  // SMTP (3 endpoints)

  /**
   * Get SMTP config
   * GET /api/email-settings/smtp
   */
  export type GetSmtpConfigResponse = ApiResponse<SMTPConfig>;

  /**
   * Save SMTP config
   * PUT /api/email-settings/smtp
   */
  export interface SaveSmtpConfigRequest {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    fromEmail: string;
    fromName: string;
    fromNameAr?: string;
  }
  export type SaveSmtpConfigResponse = ApiResponse<SMTPConfig>;

  /**
   * Test SMTP connection
   * POST /api/email-settings/smtp/test
   */
  export interface TestSmtpConnectionRequest {
    testEmail?: string;
  }
  export type TestSmtpConnectionResponse = ApiResponse<{ success: boolean; message: string }>;

  // EMAIL TEMPLATES (5 endpoints)

  /**
   * Get templates
   * GET /api/email-settings/templates
   */
  export interface GetTemplatesRequest {
    category?: string;
  }
  export type GetTemplatesResponse = ApiResponse<EmailTemplate[]>;

  /**
   * Get single template
   * GET /api/email-settings/templates/:id
   */
  export type GetTemplateResponse = ApiResponse<EmailTemplate>;

  /**
   * Create template
   * POST /api/email-settings/templates
   */
  export interface CreateTemplateRequest {
    name: string;
    nameAr?: string;
    subject: string;
    subjectAr?: string;
    body: string;
    bodyAr?: string;
    variables?: string[];
    category?: string;
  }
  export type CreateTemplateResponse = ApiResponse<EmailTemplate>;

  /**
   * Update template
   * PUT /api/email-settings/templates/:id
   */
  export interface UpdateTemplateRequest {
    name?: string;
    nameAr?: string;
    subject?: string;
    subjectAr?: string;
    body?: string;
    bodyAr?: string;
    variables?: string[];
    category?: string;
  }
  export type UpdateTemplateResponse = ApiResponse<EmailTemplate>;

  /**
   * Delete template
   * DELETE /api/email-settings/templates/:id
   */
  export type DeleteTemplateResponse = ApiResponse<{ message: string }>;

  /**
   * Preview template
   * POST /api/email-settings/templates/:id/preview
   */
  export interface PreviewTemplateRequest {
    data?: Record<string, any>;
  }
  export interface PreviewResponse {
    subject: string;
    body: string;
  }
  export type PreviewTemplateResponse = ApiResponse<PreviewResponse>;

  // EMAIL SIGNATURES (5 endpoints)

  /**
   * Get signatures
   * GET /api/email-settings/signatures
   */
  export type GetSignaturesResponse = ApiResponse<EmailSignature[]>;

  /**
   * Create signature
   * POST /api/email-settings/signatures
   */
  export interface CreateSignatureRequest {
    name: string;
    content: string;
    contentAr?: string;
    isDefault?: boolean;
  }
  export type CreateSignatureResponse = ApiResponse<EmailSignature>;

  /**
   * Update signature
   * PUT /api/email-settings/signatures/:id
   */
  export interface UpdateSignatureRequest {
    name?: string;
    content?: string;
    contentAr?: string;
  }
  export type UpdateSignatureResponse = ApiResponse<EmailSignature>;

  /**
   * Delete signature
   * DELETE /api/email-settings/signatures/:id
   */
  export type DeleteSignatureResponse = ApiResponse<{ message: string }>;

  /**
   * Set default signature
   * PUT /api/email-settings/signatures/:id/default
   */
  export type SetDefaultSignatureResponse = ApiResponse<EmailSignature>;
}

// ============================================================================
// 14. EMAIL TEMPLATES (CRM)
// Base: /api/email-templates
// Endpoints: 8
// ============================================================================

export namespace EmailTemplate {
  export type TriggerEvent =
    | 'case_created' | 'case_updated' | 'case_closed'
    | 'appointment_scheduled' | 'appointment_reminder'
    | 'invoice_created' | 'invoice_overdue'
    | 'payment_received' | 'document_shared';

  export interface Template {
    _id: ObjectId;
    firmId: ObjectId;
    lawyerId?: ObjectId;
    name: string;
    nameAr?: string;
    subject: string;
    subjectAr?: string;
    body: string;
    bodyAr?: string;
    triggerEvent?: TriggerEvent;
    isActive: boolean;
    variables: string[];
    attachments?: string[];
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  export interface AvailableVariables {
    [category: string]: Array<{
      key: string;
      description: string;
      descriptionAr?: string;
    }>;
  }

  /**
   * Get available variables
   * GET /api/email-templates/variables
   */
  export type GetAvailableVariablesResponse = ApiResponse<AvailableVariables>;

  /**
   * Get templates by trigger
   * GET /api/email-templates/trigger/:triggerEvent
   */
  export type GetByTriggerResponse = ApiResponse<Template[]>;

  /**
   * Get all templates
   * GET /api/email-templates
   */
  export interface GetTemplatesRequest {
    triggerEvent?: TriggerEvent;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }
  export type GetTemplatesResponse = PaginatedResponse<Template>;

  /**
   * Create template
   * POST /api/email-templates
   */
  export interface CreateTemplateRequest {
    name: string;
    nameAr?: string;
    subject: string;
    subjectAr?: string;
    body: string;
    bodyAr?: string;
    triggerEvent?: TriggerEvent;
    isActive?: boolean;
    variables?: string[];
    attachments?: string[];
  }
  export type CreateTemplateResponse = ApiResponse<Template>;

  /**
   * Get single template
   * GET /api/email-templates/:id
   */
  export type GetTemplateByIdResponse = ApiResponse<Template>;

  /**
   * Update template
   * PUT /api/email-templates/:id
   */
  export interface UpdateTemplateRequest {
    name?: string;
    nameAr?: string;
    subject?: string;
    subjectAr?: string;
    body?: string;
    bodyAr?: string;
    triggerEvent?: TriggerEvent;
    isActive?: boolean;
    variables?: string[];
    attachments?: string[];
  }
  export type UpdateTemplateResponse = ApiResponse<Template>;

  /**
   * Delete template
   * DELETE /api/email-templates/:id
   */
  export type DeleteTemplateResponse = ApiResponse<{ message: string }>;

  /**
   * Preview template
   * POST /api/email-templates/:id/preview
   */
  export interface PreviewTemplateRequest {
    data?: Record<string, any>;
  }
  export interface PreviewResponse {
    subject: string;
    body: string;
  }
  export type PreviewTemplateResponse = ApiResponse<PreviewResponse>;

  /**
   * Duplicate template
   * POST /api/email-templates/:id/duplicate
   */
  export interface DuplicateTemplateRequest {
    name?: string;
  }
  export type DuplicateTemplateResponse = ApiResponse<Template>;

  /**
   * Send test email
   * POST /api/email-templates/:id/test
   */
  export interface TestSendRequest {
    email: string;
    data?: Record<string, any>;
  }
  export type TestSendResponse = ApiResponse<{ message: string }>;
}

// ============================================================================
// 15. THREAD MESSAGES
// Base: /api/thread-messages
// Endpoints: 10
// ============================================================================

export namespace ThreadMessage {
  export type MessageType = 'message' | 'note';
  export type RecordModel = 'Case' | 'Client' | 'Invoice' | 'Task' | 'Appointment';

  export interface Message {
    _id: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    model: RecordModel;
    recordId: ObjectId;
    type: MessageType;
    content: string;
    mentions: ObjectId[];
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>;
    isStarred: boolean;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  /**
   * Get mentions
   * GET /api/thread-messages/mentions
   */
  export interface GetMyMentionsRequest {
    page?: number;
    limit?: number;
  }
  export type GetMyMentionsResponse = PaginatedResponse<Message>;

  /**
   * Get starred messages
   * GET /api/thread-messages/starred
   */
  export interface GetStarredRequest {
    page?: number;
    limit?: number;
  }
  export type GetStarredResponse = PaginatedResponse<Message>;

  /**
   * Search messages
   * GET /api/thread-messages/search
   */
  export interface SearchMessagesRequest {
    q: string;
    model?: RecordModel;
    type?: MessageType;
    page?: number;
    limit?: number;
  }
  export type SearchMessagesResponse = PaginatedResponse<Message>;

  /**
   * Get thread by record
   * GET /api/thread-messages/thread/:model/:id
   */
  export interface GetRecordThreadRequest {
    page?: number;
    limit?: number;
  }
  export type GetRecordThreadResponse = PaginatedResponse<Message>;

  /**
   * Post message
   * POST /api/thread-messages
   */
  export interface PostMessageRequest {
    model: RecordModel;
    recordId: ObjectId;
    type?: MessageType;
    content: string;
    mentions?: ObjectId[];
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>;
  }
  export type PostMessageResponse = ApiResponse<Message>;

  /**
   * Post note
   * POST /api/thread-messages/note
   */
  export interface PostNoteRequest {
    model: RecordModel;
    recordId: ObjectId;
    content: string;
    mentions?: ObjectId[];
  }
  export type PostNoteResponse = ApiResponse<Message>;

  /**
   * Get messages
   * GET /api/thread-messages
   */
  export interface GetMessagesRequest {
    model?: RecordModel;
    recordId?: ObjectId;
    type?: MessageType;
    page?: number;
    limit?: number;
  }
  export type GetMessagesResponse = PaginatedResponse<Message>;

  /**
   * Get single message
   * GET /api/thread-messages/:id
   */
  export type GetMessageResponse = ApiResponse<Message>;

  /**
   * Star message
   * POST /api/thread-messages/:id/star
   */
  export interface StarMessageRequest {
    isStarred: boolean;
  }
  export type StarMessageResponse = ApiResponse<Message>;

  /**
   * Delete message
   * DELETE /api/thread-messages/:id
   */
  export type DeleteMessageResponse = ApiResponse<{ message: string }>;
}

// ============================================================================
// 16. CONTACT LISTS
// Base: /api/contact-lists
// Endpoints: 10
// ============================================================================

export namespace ContactList {
  export type ListType = 'static' | 'dynamic';
  export type EntityType = 'Client' | 'Lead' | 'Contact' | 'Subscriber';
  export type ListStatus = 'active' | 'archived';

  export interface ContactListMember {
    entityType: EntityType;
    entityId: ObjectId;
    email: string;
    name?: string;
    addedAt: string;
  }

  export interface ContactList {
    _id: ObjectId;
    firmId: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    listType: ListType;
    entityType: EntityType;
    status: ListStatus;
    members: ContactListMember[];
    memberCount: number;
    criteria?: Record<string, any>;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    createdBy: ObjectId;
  }

  /**
   * Create contact list
   * POST /api/contact-lists
   */
  export interface CreateContactListRequest {
    name: string;
    nameAr?: string;
    description?: string;
    listType: ListType;
    entityType: EntityType;
    criteria?: Record<string, any>;
    tags?: string[];
  }
  export type CreateContactListResponse = ApiResponse<ContactList>;

  /**
   * Get all contact lists
   * GET /api/contact-lists
   */
  export interface GetContactListsRequest {
    search?: string;
    listType?: ListType;
    entityType?: EntityType;
    status?: ListStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
  export type GetContactListsResponse = PaginatedResponse<ContactList>;

  /**
   * Get single contact list
   * GET /api/contact-lists/:id
   */
  export type GetContactListByIdResponse = ApiResponse<ContactList>;

  /**
   * Update contact list
   * PUT /api/contact-lists/:id
   */
  export interface UpdateContactListRequest {
    name?: string;
    nameAr?: string;
    description?: string;
    status?: ListStatus;
    criteria?: Record<string, any>;
    tags?: string[];
  }
  export type UpdateContactListResponse = ApiResponse<ContactList>;

  /**
   * Delete contact list
   * DELETE /api/contact-lists/:id
   */
  export type DeleteContactListResponse = ApiResponse<{ message: string }>;

  /**
   * Add member
   * POST /api/contact-lists/:id/members
   */
  export interface AddMemberRequest {
    entityType: EntityType;
    entityId: ObjectId;
    email: string;
    name?: string;
  }
  export type AddMemberResponse = ApiResponse<ContactList>;

  /**
   * Remove member
   * DELETE /api/contact-lists/:id/members/:memberId
   */
  export type RemoveMemberResponse = ApiResponse<ContactList>;

  /**
   * Get list members
   * GET /api/contact-lists/:id/members
   */
  export interface GetListMembersRequest {
    page?: number;
    limit?: number;
  }
  export type GetListMembersResponse = PaginatedResponse<ContactListMember>;

  /**
   * Refresh dynamic list
   * POST /api/contact-lists/:id/refresh
   */
  export type RefreshDynamicListResponse = ApiResponse<{ memberCount: number }>;

  /**
   * Duplicate contact list
   * POST /api/contact-lists/:id/duplicate
   */
  export interface DuplicateContactListRequest {
    name?: string;
  }
  export type DuplicateContactListResponse = ApiResponse<ContactList>;
}

// ============================================================================
// 17. CONVERSATIONS (Direct Messaging)
// Base: /api/conversations
// Endpoints: 4
// ============================================================================

export namespace Conversation {
  export interface Conversation {
    _id: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    participants: ObjectId[];
    sellerID: ObjectId;
    buyerID: ObjectId;
    lastMessageAt?: string;
    unreadCount?: Record<string, number>;
    createdAt: string;
    updatedAt: string;
  }

  /**
   * Get all conversations
   * GET /api/conversations
   */
  export interface GetConversationsRequest {
    page?: number;
    limit?: number;
  }
  export type GetConversationsResponse = PaginatedResponse<Conversation>;

  /**
   * Create conversation
   * POST /api/conversations
   */
  export interface CreateConversationRequest {
    sellerID: ObjectId;
    buyerID: ObjectId;
  }
  export type CreateConversationResponse = ApiResponse<Conversation>;

  /**
   * Get single conversation
   * GET /api/conversations/single/:sellerID/:buyerID
   */
  export type GetSingleConversationResponse = ApiResponse<Conversation>;

  /**
   * Update conversation
   * PATCH /api/conversations/:conversationID
   */
  export interface UpdateConversationRequest {
    lastMessageAt?: string;
    unreadCount?: Record<string, number>;
  }
  export type UpdateConversationResponse = ApiResponse<Conversation>;
}

// ============================================================================
// 18. MESSAGES (Direct Messaging)
// Base: /api/messages
// Endpoints: 4
// ============================================================================

export namespace Message {
  export interface Attachment {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    type: 'image' | 'document' | 'video' | 'other';
  }

  export interface ReadStatus {
    userId: ObjectId;
    readAt: string;
  }

  export interface Message {
    _id: ObjectId;
    conversationID: string;
    userID: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    description?: string;
    attachments: Attachment[];
    readBy: ReadStatus[];
    isEdited: boolean;
    editedAt?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface MessageStats {
    totalMessages: number;
    unreadMessages: number;
    activeConversations: number;
  }

  /**
   * Create message
   * POST /api/messages
   */
  export interface CreateMessageRequest {
    conversationID: string;
    description?: string;
    files?: File[];
  }
  export type CreateMessageResponse = ApiResponse<Message>;

  /**
   * Get message stats
   * GET /api/messages/stats
   */
  export type GetMessageStatsResponse = ApiResponse<MessageStats>;

  /**
   * Get messages
   * GET /api/messages/:conversationID
   */
  export interface GetMessagesRequest {
    page?: number;
    limit?: number;
  }
  export type GetMessagesResponse = PaginatedResponse<Message>;

  /**
   * Mark as read
   * PATCH /api/messages/:conversationID/read
   */
  export type MarkAsReadResponse = ApiResponse<{ message: string }>;
}

// ============================================================================
// ENDPOINT SUMMARY
// ============================================================================

/**
 * Total Endpoints Documented: 219
 *
 * Breakdown by Module:
 * 1.  Legal Contracts:     36 endpoints
 * 2.  Legal Documents:      6 endpoints
 * 3.  Matter Budgets:      17 endpoints
 * 4.  Document Analysis:   10 endpoints
 * 5.  Cloud Storage:       13 endpoints
 * 6.  Offline Sync:         6 endpoints
 * 7.  PDF Generation:      16 endpoints
 * 8.  Unified Data:         6 endpoints
 * 9.  Saved Filters:       10 endpoints
 * 10. Saved Reports:       13 endpoints
 * 11. Prepared Reports:     7 endpoints
 * 12. Email Marketing:     32 endpoints
 * 13. Email Settings:      11 endpoints
 * 14. Email Templates:      8 endpoints
 * 15. Thread Messages:     10 endpoints
 * 16. Contact Lists:       10 endpoints
 * 17. Conversations:        4 endpoints
 * 18. Messages:             4 endpoints
 *
 * All endpoints include:
 * - Full request/response types
 * - Comprehensive data models
 * - Query parameters
 * - Request bodies
 * - Pagination support where applicable
 * - Multi-tenant security patterns
 * - Bilingual support (Arabic/English)
 */
