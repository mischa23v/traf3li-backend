/**
 * Regional & Miscellaneous Modules API Contracts
 *
 * Comprehensive TypeScript interfaces for 35 regional/misc modules
 * covering Saudi-specific integrations, workflow automation, analytics,
 * and specialized business features.
 *
 * Total endpoints documented: 400+
 *
 * @module regional-misc
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. REGIONAL BANKS - Saudi/GCC Open Banking Integration
// ═══════════════════════════════════════════════════════════════════════════

export namespace RegionalBanks {
  // Discovery
  export interface GetSupportedCountriesRequest {}
  export interface GetSupportedCountriesResponse {
    success: boolean;
    countries: Array<{
      code: string;
      name: string;
      supportedBanks: number;
    }>;
  }

  export interface GetBanksByCountryRequest {
    countryCode: string; // Path param
  }
  export interface GetBanksByCountryResponse {
    success: boolean;
    banks: Array<{
      id: string;
      name: string;
      logo: string;
      bic: string;
    }>;
  }

  export interface FindBankByIBANRequest {
    iban: string; // Query param
  }
  export interface FindBankByIBANResponse {
    success: boolean;
    bank: {
      id: string;
      name: string;
      country: string;
      bic: string;
    };
  }

  export interface GetProviderStatsRequest {}
  export interface GetProviderStatsResponse {
    success: boolean;
    stats: {
      totalConnections: number;
      activeConnections: number;
      transactionsSynced: number;
    };
  }

  // Connection Management
  export interface InitializeConnectionRequest {
    bankId: string;
    accountId: string;
    redirectUrl: string;
  }
  export interface InitializeConnectionResponse {
    success: boolean;
    linkUrl: string;
    sessionId: string;
  }

  export interface HandleCallbackRequest {
    code: string; // Query param
    state: string; // Query param
  }
  export interface HandleCallbackResponse {
    success: boolean;
    message: string;
    accountId: string;
  }

  export interface SyncTransactionsRequest {
    accountId: string; // Path param
    fromDate?: string;
    toDate?: string;
  }
  export interface SyncTransactionsResponse {
    success: boolean;
    transactionsSynced: number;
    lastSyncDate: string;
  }

  export interface GetConnectionStatusRequest {
    accountId: string; // Path param
  }
  export interface GetConnectionStatusResponse {
    success: boolean;
    status: 'active' | 'expired' | 'disconnected';
    lastSync: string;
    expiresAt: string;
  }

  export interface DisconnectAccountRequest {
    accountId: string; // Path param
  }
  export interface DisconnectAccountResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. SAUDI BANKING - Lean, WPS, SADAD, Mudad Integration
// ═══════════════════════════════════════════════════════════════════════════

export namespace SaudiBanking {
  // Lean Technologies - Open Banking
  export interface GetBanksRequest {}
  export interface GetBanksResponse {
    success: boolean;
    banks: Array<{
      id: string;
      name: string;
      nameAr: string;
      logo: string;
      supported: boolean;
    }>;
  }

  export interface GetLeanCustomersRequest {}
  export interface GetLeanCustomersResponse {
    success: boolean;
    customers: Array<{
      customerId: string;
      appUserId: string;
      status: string;
      createdAt: string;
    }>;
  }

  export interface CreateLeanCustomerRequest {
    appUserId: string;
  }
  export interface CreateLeanCustomerResponse {
    success: boolean;
    customerId: string;
  }

  export interface GetCustomerTokenRequest {
    customerId: string; // Path param
  }
  export interface GetCustomerTokenResponse {
    success: boolean;
    token: string;
    expiresIn: number;
  }

  export interface GetEntitiesRequest {
    customerId: string; // Path param
  }
  export interface GetEntitiesResponse {
    success: boolean;
    entities: Array<{
      entityId: string;
      bankName: string;
      status: string;
      connectedAt: string;
    }>;
  }

  export interface GetAccountsRequest {
    entityId: string; // Path param
  }
  export interface GetAccountsResponse {
    success: boolean;
    accounts: Array<{
      accountId: string;
      accountNumber: string;
      type: string;
      currency: string;
      balance: number;
    }>;
  }

  export interface GetBalanceRequest {
    accountId: string; // Path param
  }
  export interface GetBalanceResponse {
    success: boolean;
    balance: {
      current: number;
      available: number;
      currency: string;
      lastUpdated: string;
    };
  }

  export interface GetTransactionsRequest {
    accountId: string; // Path param
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
  }
  export interface GetTransactionsResponse {
    success: boolean;
    transactions: Array<{
      id: string;
      date: string;
      amount: number;
      description: string;
      type: 'debit' | 'credit';
      balance: number;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }

  export interface GetIdentityRequest {
    entityId: string; // Path param
  }
  export interface GetIdentityResponse {
    success: boolean;
    identity: {
      fullName: string;
      nationalId: string;
      dateOfBirth: string;
      address: string;
    };
  }

  export interface InitiatePaymentRequest {
    amount: number;
    currency: string;
    paymentSourceId: string;
    paymentDestinationId: string;
    description: string;
  }
  export interface InitiatePaymentResponse {
    success: boolean;
    paymentId: string;
    status: string;
    confirmationUrl?: string;
  }

  export interface DisconnectEntityRequest {
    entityId: string; // Path param
  }
  export interface DisconnectEntityResponse {
    success: boolean;
    message: string;
  }

  export interface HandleLeanWebhookRequest {
    // Webhook payload (varies by event type)
    event: string;
    data: any;
  }
  export interface HandleLeanWebhookResponse {
    success: boolean;
  }

  // WPS - Wage Protection System
  export interface GenerateWPSFileRequest {
    establishment: {
      labourOfficeId: string;
      establishmentId: string;
      bankId: string;
    };
    employees: Array<{
      employeeId: string;
      name: string;
      iban: string;
      basicSalary: number;
      allowances: number;
      deductions: number;
    }>;
    paymentDate: string;
    batchReference: string;
  }
  export interface GenerateWPSFileResponse {
    success: boolean;
    fileId: string;
    fileName: string;
    recordCount: number;
    totalAmount: number;
  }

  export interface DownloadWPSFileRequest {
    establishment: any;
    employees: any[];
    paymentDate: string;
    batchReference: string;
  }
  export interface DownloadWPSFileResponse {
    // File download response
  }

  export interface ValidateWPSDataRequest {
    establishment: any;
    employees: any[];
  }
  export interface ValidateWPSDataResponse {
    success: boolean;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }

  export interface GetWPSFilesRequest {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
  export interface GetWPSFilesResponse {
    success: boolean;
    files: Array<{
      fileId: string;
      fileName: string;
      generatedAt: string;
      recordCount: number;
      totalAmount: number;
    }>;
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetSarieBankIdsRequest {}
  export interface GetSarieBankIdsResponse {
    success: boolean;
    banks: Array<{
      name: string;
      sarieId: string;
    }>;
  }

  // SADAD - Bill Payments
  export interface GetSadadBillersRequest {
    category?: string;
  }
  export interface GetSadadBillersResponse {
    success: boolean;
    billers: Array<{
      billerCode: string;
      nameEn: string;
      nameAr: string;
      category: string;
    }>;
  }

  export interface SearchBillersRequest {
    query: string;
  }
  export interface SearchBillersResponse {
    success: boolean;
    results: Array<{
      billerCode: string;
      nameEn: string;
      nameAr: string;
      category: string;
    }>;
  }

  export interface InquireBillRequest {
    billerCode: string;
    billNumber: string;
  }
  export interface InquireBillResponse {
    success: boolean;
    bill: {
      billNumber: string;
      amount: number;
      dueDate: string;
      status: string;
      details: any;
    };
  }

  export interface PayBillRequest {
    billerCode: string;
    billNumber: string;
    amount: number;
    debitAccount: string;
    reference?: string;
    remarks?: string;
  }
  export interface PayBillResponse {
    success: boolean;
    transactionId: string;
    status: string;
    confirmationNumber: string;
  }

  export interface GetSadadPaymentStatusRequest {
    transactionId: string; // Path param
  }
  export interface GetSadadPaymentStatusResponse {
    success: boolean;
    status: string;
    transactionDate: string;
    amount: number;
  }

  export interface GetSadadPaymentHistoryRequest {
    fromDate?: string;
    toDate?: string;
    billerCode?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }
  export interface GetSadadPaymentHistoryResponse {
    success: boolean;
    payments: Array<{
      transactionId: string;
      billerCode: string;
      amount: number;
      status: string;
      date: string;
    }>;
    pagination: { page: number; pageSize: number; total: number };
  }

  // Mudad - Payroll Compliance
  export interface CalculatePayrollRequest {
    employees: Array<{
      employeeId: string;
      nationality: string;
      basicSalary: number;
      allowances: number;
    }>;
  }
  export interface CalculatePayrollResponse {
    success: boolean;
    payroll: Array<{
      employeeId: string;
      grossSalary: number;
      gosiEmployee: number;
      gosiEmployer: number;
      netSalary: number;
    }>;
    totals: {
      grossSalary: number;
      totalGosi: number;
      netSalary: number;
    };
  }

  export interface CalculateGOSIRequest {
    nationality: 'saudi' | 'non-saudi';
    basicSalary: number;
  }
  export interface CalculateGOSIResponse {
    success: boolean;
    gosi: {
      employeeContribution: number;
      employerContribution: number;
      total: number;
      percentage: {
        employee: number;
        employer: number;
      };
    };
  }

  export interface GenerateMudadWPSRequest {
    establishment: any;
    employees: any[];
    paymentDate: string;
    batchReference: string;
  }
  export interface GenerateMudadWPSResponse {
    success: boolean;
    fileId: string;
    fileName: string;
    recordCount: number;
    totalAmount: number;
  }

  export interface SubmitPayrollRequest {
    establishment: any;
    employees: any[];
    paymentDate: string;
  }
  export interface SubmitPayrollResponse {
    success: boolean;
    submissionId: string;
    status: string;
  }

  export interface GetSubmissionStatusRequest {
    submissionId: string; // Path param
  }
  export interface GetSubmissionStatusResponse {
    success: boolean;
    status: string;
    submittedAt: string;
    processedAt?: string;
  }

  export interface GenerateGOSIReportRequest {
    employees: any[];
    month: string; // YYYY-MM
  }
  export interface GenerateGOSIReportResponse {
    success: boolean;
    reportId: string;
    downloadUrl: string;
  }

  export interface CheckNitaqatRequest {
    employees: Array<{
      nationality: string;
    }>;
  }
  export interface CheckNitaqatResponse {
    success: boolean;
    saudization: {
      saudiCount: number;
      totalCount: number;
      percentage: number;
      nitaqatBand: 'platinum' | 'green' | 'yellow' | 'red';
      compliant: boolean;
    };
  }

  export interface CheckMinimumWageRequest {
    employees: Array<{
      nationality: string;
      basicSalary: number;
    }>;
  }
  export interface CheckMinimumWageResponse {
    success: boolean;
    violations: Array<{
      employeeId: string;
      currentSalary: number;
      minimumWage: number;
      shortfall: number;
    }>;
    compliant: boolean;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. TEMPORAL CASE - Case Lifecycle Workflows
// ═══════════════════════════════════════════════════════════════════════════

export namespace TemporalCase {
  export interface StartWorkflowRequest {
    id: string; // Path param (case ID)
    workflowTemplateId: string;
  }
  export interface StartWorkflowResponse {
    success: boolean;
    message: string;
    workflowId: string;
    runId: string;
  }

  export interface CompleteRequirementRequest {
    id: string; // Path param (case ID)
    requirementId: string;
    metadata?: any;
  }
  export interface CompleteRequirementResponse {
    success: boolean;
    message: string;
  }

  export interface TransitionStageRequest {
    id: string; // Path param (case ID)
    stageId: string;
    notes?: string;
  }
  export interface TransitionStageResponse {
    success: boolean;
    message: string;
  }

  export interface GetWorkflowStatusRequest {
    id: string; // Path param (case ID)
  }
  export interface GetWorkflowStatusResponse {
    success: boolean;
    status: {
      workflowId: string;
      status: string;
      startTime: string;
      executionTime: number;
      historyLength: number;
    };
    workflowState: any;
    currentStage: any;
    requirements: any[];
    databaseProgress: any;
  }

  export interface AddDeadlineRequest {
    id: string; // Path param (case ID)
    title: string;
    date: string;
    description?: string;
  }
  export interface AddDeadlineResponse {
    success: boolean;
    message: string;
  }

  export interface AddCourtDateRequest {
    id: string; // Path param (case ID)
    title?: string;
    date: string;
    location?: string;
    notes?: string;
  }
  export interface AddCourtDateResponse {
    success: boolean;
    message: string;
  }

  export interface PauseWorkflowRequest {
    id: string; // Path param (case ID)
  }
  export interface PauseWorkflowResponse {
    success: boolean;
    message: string;
  }

  export interface ResumeWorkflowRequest {
    id: string; // Path param (case ID)
  }
  export interface ResumeWorkflowResponse {
    success: boolean;
    message: string;
  }

  export interface CancelWorkflowRequest {
    id: string; // Path param (case ID)
  }
  export interface CancelWorkflowResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. TEMPORAL INVOICE - Invoice Approval Workflows
// ═══════════════════════════════════════════════════════════════════════════

export namespace TemporalInvoice {
  export interface SubmitApprovalRequest {
    id: string; // Path param (invoice ID)
    approvalLevels?: number;
    notes?: string;
  }
  export interface SubmitApprovalResponse {
    message: string;
    workflowId: string;
    workflowRunId: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
    };
  }

  export interface ApproveInvoiceRequest {
    id: string; // Path param (invoice ID)
    comment?: string;
  }
  export interface ApproveInvoiceResponse {
    message: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
    };
  }

  export interface RejectInvoiceRequest {
    id: string; // Path param (invoice ID)
    reason: string;
  }
  export interface RejectInvoiceResponse {
    message: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
    };
  }

  export interface GetApprovalStatusRequest {
    id: string; // Path param (invoice ID)
  }
  export interface GetApprovalStatusResponse {
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
    };
    workflow: {
      workflowId: string;
      runId: string;
      status: string;
      startTime: string;
      closeTime?: string;
    };
    approval: any;
  }

  export interface CancelApprovalRequest {
    id: string; // Path param (invoice ID)
    reason?: string;
  }
  export interface CancelApprovalResponse {
    message: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
    };
  }

  export interface GetPendingApprovalsRequest {}
  export interface GetPendingApprovalsResponse {
    count: number;
    approvals: Array<{
      invoice: any;
      approval: any;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TEMPORAL OFFBOARDING - Employee Offboarding Workflows
// ═══════════════════════════════════════════════════════════════════════════

export namespace TemporalOffboarding {
  export interface StartOffboardingRequest {
    id: string; // Path param (employee ID)
    exitType: 'resignation' | 'termination' | 'contract_end' | 'retirement' | 'death' | 'mutual_agreement';
    lastWorkingDay: string;
    noticeDate?: string;
    exitReason?: string;
    managerId?: string;
    noticePeriodDays?: number;
    knowledgeTransferRecipients?: string[];
  }
  export interface StartOffboardingResponse {
    success: boolean;
    message: string;
    data: {
      offboardingId: string;
      workflowId: string;
      employeeId: string;
      employeeName: string;
      exitType: string;
      lastWorkingDay: string;
      status: string;
    };
  }

  export interface CompleteTaskRequest {
    id: string; // Path param (employee ID)
    phase: 'notification' | 'knowledge_transfer' | 'access_revocation' | 'equipment_return' | 'exit_interview' | 'clearance';
    notes?: string;
    completedBy?: string;
  }
  export interface CompleteTaskResponse {
    success: boolean;
    message: string;
    data: {
      phase: string;
      completedAt: string;
      workflowId: string;
    };
  }

  export interface GetOffboardingStatusRequest {
    id: string; // Path param (employee ID)
  }
  export interface GetOffboardingStatusResponse {
    success: boolean;
    data: {
      offboardingId: string;
      employee: any;
      exitType: string;
      status: string;
      dates: any;
      progress: {
        percentage: number;
        completedPhases: number;
        totalPhases: number;
        phases: any[];
      };
      phaseDetails: any;
      timeline: any[];
      completion: any;
      workflow: any;
      createdAt: string;
      updatedAt: string;
    };
  }

  export interface EscalateRequest {
    id: string; // Path param (employee ID)
    action: 'escalate' | 'override';
    phase: string;
    reason: string;
    escalatedTo?: string;
    approvedBy?: string;
  }
  export interface EscalateResponse {
    success: boolean;
    message: string;
    data: {
      action: string;
      phase: string;
      timestamp: string;
    };
  }

  export interface CancelOffboardingRequest {
    id: string; // Path param (employee ID)
    reason: string;
  }
  export interface CancelOffboardingResponse {
    success: boolean;
    message: string;
    data: {
      offboardingId: string;
      status: string;
      reason: string;
      cancelledAt: string;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. TEMPORAL ONBOARDING - Employee Onboarding Workflows
// ═══════════════════════════════════════════════════════════════════════════

export namespace TemporalOnboarding {
  export interface StartOnboardingRequest {
    id: string; // Path param (employee ID)
    onboardingId: string;
    role?: string;
    config?: {
      skipPreBoarding?: boolean;
      skipTraining?: boolean;
    };
  }
  export interface StartOnboardingResponse {
    success: boolean;
    message: string;
    data: {
      workflowId: string;
      runId: string;
      employeeId: string;
      onboardingId: string;
    };
  }

  export interface CompleteDocumentsRequest {
    id: string; // Path param (employee ID)
    verifiedCount?: number;
    pendingCount?: number;
  }
  export interface CompleteDocumentsResponse {
    success: boolean;
    message: string;
    data: {
      workflowId: string;
      verifiedCount: number;
      pendingCount: number;
    };
  }

  export interface CompleteTrainingRequest {
    id: string; // Path param (employee ID)
    sessionsCompleted?: number;
  }
  export interface CompleteTrainingResponse {
    success: boolean;
    message: string;
    data: {
      workflowId: string;
      sessionsCompleted: number;
    };
  }

  export interface CompleteReviewRequest {
    id: string; // Path param (employee ID)
    reviewType: '30_day' | '60_day' | '90_day' | 'final';
    outcome?: string;
  }
  export interface CompleteReviewResponse {
    success: boolean;
    message: string;
    data: {
      workflowId: string;
      reviewType: string;
      outcome: string;
    };
  }

  export interface GetOnboardingStatusRequest {
    id: string; // Path param (employee ID)
  }
  export interface GetOnboardingStatusResponse {
    success: boolean;
    data: {
      onboardingId: string;
      employeeId: any;
      workflowId: string;
      workflowStatus: string;
      startTime: string;
      closeTime?: string;
      currentPhase: any;
      progress: any;
      pendingTasks: any;
      onboardingRecord: any;
    };
  }

  export interface SkipPhaseRequest {
    id: string; // Path param (employee ID)
    phase: 'pre_boarding' | 'documentation' | 'training' | 'probation';
  }
  export interface SkipPhaseResponse {
    success: boolean;
    message: string;
    data: {
      workflowId: string;
      phase: string;
    };
  }

  export interface CancelOnboardingRequest {
    id: string; // Path param (employee ID)
  }
  export interface CancelOnboardingResponse {
    success: boolean;
    message: string;
    data: {
      workflowId: string;
      employeeId: string;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. INVESTMENTS - Investment Portfolio Management
// ═══════════════════════════════════════════════════════════════════════════

export namespace Investments {
  export interface Investment {
    _id: string;
    symbol: string;
    name: string;
    type: 'stock' | 'etf' | 'crypto' | 'commodity' | 'bond';
    market: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    value: number;
    gain: number;
    gainPercentage: number;
    currency: string;
    purchaseDate: string;
    firmId: string;
    lawyerId?: string;
  }

  export interface GetPortfolioSummaryRequest {}
  export interface GetPortfolioSummaryResponse {
    success: boolean;
    summary: {
      totalValue: number;
      totalCost: number;
      totalGain: number;
      totalGainPercentage: number;
      byType: Record<string, { value: number; count: number }>;
      byMarket: Record<string, { value: number; count: number }>;
      topPerformers: Investment[];
      worstPerformers: Investment[];
    };
  }

  export interface RefreshAllPricesRequest {}
  export interface RefreshAllPricesResponse {
    success: boolean;
    updated: number;
    failed: number;
  }

  export interface CreateInvestmentRequest {
    symbol: string;
    name: string;
    type: string;
    market: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
    notes?: string;
  }
  export interface CreateInvestmentResponse {
    success: boolean;
    investment: Investment;
  }

  export interface GetInvestmentsRequest {
    type?: string;
    market?: string;
    search?: string;
  }
  export interface GetInvestmentsResponse {
    success: boolean;
    investments: Investment[];
  }

  export interface GetInvestmentRequest {
    id: string; // Path param
  }
  export interface GetInvestmentResponse {
    success: boolean;
    investment: Investment;
  }

  export interface UpdateInvestmentRequest {
    id: string; // Path param
    quantity?: number;
    notes?: string;
  }
  export interface UpdateInvestmentResponse {
    success: boolean;
    investment: Investment;
  }

  export interface DeleteInvestmentRequest {
    id: string; // Path param
  }
  export interface DeleteInvestmentResponse {
    success: boolean;
    message: string;
  }

  export interface RefreshPriceRequest {
    id: string; // Path param
  }
  export interface RefreshPriceResponse {
    success: boolean;
    oldPrice: number;
    newPrice: number;
    investment: Investment;
  }

  export interface AddTransactionRequest {
    id: string; // Path param (investment ID)
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    date: string;
    fees?: number;
    notes?: string;
  }
  export interface AddTransactionResponse {
    success: boolean;
    transaction: any;
    investment: Investment;
  }

  export interface GetTransactionsRequest {
    id: string; // Path param (investment ID)
  }
  export interface GetTransactionsResponse {
    success: boolean;
    transactions: any[];
  }

  export interface DeleteTransactionRequest {
    id: string; // Path param (investment ID)
    transactionId: string; // Path param
  }
  export interface DeleteTransactionResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. INVESTMENT SEARCH - Market Data & Symbol Search
// ═══════════════════════════════════════════════════════════════════════════

export namespace InvestmentSearch {
  export interface SearchSymbolsRequest {
    q: string; // Query param
    market?: string;
    type?: string;
  }
  export interface SearchSymbolsResponse {
    success: boolean;
    results: Array<{
      symbol: string;
      name: string;
      type: string;
      market: string;
      currency: string;
    }>;
  }

  export interface GetQuoteRequest {
    symbol: string; // Query param
  }
  export interface GetQuoteResponse {
    success: boolean;
    quote: {
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      marketCap: number;
      high: number;
      low: number;
      open: number;
      close: number;
      timestamp: string;
    };
  }

  export interface GetBatchQuotesRequest {
    symbols: string[];
  }
  export interface GetBatchQuotesResponse {
    success: boolean;
    quotes: Record<string, any>;
  }

  export interface GetMarketsRequest {}
  export interface GetMarketsResponse {
    success: boolean;
    markets: Array<{
      code: string;
      name: string;
      country: string;
    }>;
  }

  export interface GetTypesRequest {}
  export interface GetTypesResponse {
    success: boolean;
    types: string[];
  }

  export interface GetSectorsRequest {
    market?: string;
  }
  export interface GetSectorsResponse {
    success: boolean;
    sectors: string[];
  }

  export interface GetSymbolsByMarketRequest {
    market: string; // Path param
  }
  export interface GetSymbolsByMarketResponse {
    success: boolean;
    symbols: any[];
  }

  export interface GetSymbolsByTypeRequest {
    type: string; // Path param
  }
  export interface GetSymbolsByTypeResponse {
    success: boolean;
    symbols: any[];
  }

  export interface GetSymbolDetailsRequest {
    symbol: string; // Path param
  }
  export interface GetSymbolDetailsResponse {
    success: boolean;
    details: {
      symbol: string;
      name: string;
      description: string;
      sector: string;
      industry: string;
      marketCap: number;
      employees: number;
      website: string;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. INTEREST AREA - Legal Practice Areas
// ═══════════════════════════════════════════════════════════════════════════

export namespace InterestArea {
  export interface InterestArea {
    _id: string;
    name: string;
    nameAr: string;
    category: string;
    parentId?: string;
    status: 'active' | 'inactive';
    firmId: string;
    lawyerId?: string;
  }

  export interface CreateInterestAreaRequest {
    name: string;
    nameAr: string;
    category: string;
    parentId?: string;
  }
  export interface CreateInterestAreaResponse {
    success: boolean;
    interestArea: InterestArea;
  }

  export interface GetInterestAreasTreeRequest {
    category?: string;
    status?: string;
  }
  export interface GetInterestAreasTreeResponse {
    success: boolean;
    tree: any[];
  }

  export interface GetInterestAreasRequest {
    search?: string;
    status?: string;
    category?: string;
    parentId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetInterestAreasResponse {
    success: boolean;
    interestAreas: InterestArea[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetInterestAreaRequest {
    id: string; // Path param
  }
  export interface GetInterestAreaResponse {
    success: boolean;
    interestArea: InterestArea;
  }

  export interface UpdateInterestAreaRequest {
    id: string; // Path param
    name?: string;
    nameAr?: string;
    status?: string;
  }
  export interface UpdateInterestAreaResponse {
    success: boolean;
    interestArea: InterestArea;
  }

  export interface DeleteInterestAreaRequest {
    id: string; // Path param
  }
  export interface DeleteInterestAreaResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. TRADES - Trading Journal
// ═══════════════════════════════════════════════════════════════════════════

export namespace Trades {
  export interface Trade {
    _id: string;
    symbol: string;
    type: 'long' | 'short';
    entryDate: string;
    entryPrice: number;
    quantity: number;
    exitDate?: string;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    status: 'open' | 'closed';
    profit?: number;
    profitPercentage?: number;
    notes?: string;
    firmId: string;
    lawyerId?: string;
  }

  export interface GetTradeStatsRequest {}
  export interface GetTradeStatsResponse {
    success: boolean;
    stats: {
      totalTrades: number;
      openTrades: number;
      closedTrades: number;
      winRate: number;
      totalProfit: number;
      avgProfit: number;
      largestWin: number;
      largestLoss: number;
    };
  }

  export interface GetChartDataRequest {
    period?: string;
  }
  export interface GetChartDataResponse {
    success: boolean;
    data: Array<{
      date: string;
      profit: number;
      cumulativeProfit: number;
    }>;
  }

  export interface BulkDeleteTradesRequest {
    ids: string[];
  }
  export interface BulkDeleteTradesResponse {
    success: boolean;
    deleted: number;
  }

  export interface ImportFromCsvRequest {
    // CSV file data
  }
  export interface ImportFromCsvResponse {
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  }

  export interface CreateTradeRequest {
    symbol: string;
    type: 'long' | 'short';
    entryDate: string;
    entryPrice: number;
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    notes?: string;
  }
  export interface CreateTradeResponse {
    success: boolean;
    trade: Trade;
  }

  export interface GetTradesRequest {
    status?: string;
    symbol?: string;
    type?: string;
  }
  export interface GetTradesResponse {
    success: boolean;
    trades: Trade[];
  }

  export interface GetTradeRequest {
    id: string; // Path param
  }
  export interface GetTradeResponse {
    success: boolean;
    trade: Trade;
  }

  export interface UpdateTradeRequest {
    id: string; // Path param
    stopLoss?: number;
    takeProfit?: number;
    notes?: string;
  }
  export interface UpdateTradeResponse {
    success: boolean;
    trade: Trade;
  }

  export interface CloseTradeRequest {
    id: string; // Path param
    exitPrice: number;
    exitDate: string;
  }
  export interface CloseTradeResponse {
    success: boolean;
    trade: Trade;
  }

  export interface DeleteTradeRequest {
    id: string; // Path param
  }
  export interface DeleteTradeResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. TRADING ACCOUNTS - Brokerage Account Management
// ═══════════════════════════════════════════════════════════════════════════

export namespace TradingAccounts {
  export interface TradingAccount {
    _id: string;
    name: string;
    broker: string;
    accountNumber: string;
    accountType: 'cash' | 'margin';
    initialBalance: number;
    currentBalance: number;
    currency: string;
    isDefault: boolean;
    firmId: string;
    lawyerId?: string;
  }

  export interface CreateTradingAccountRequest {
    name: string;
    broker: string;
    accountNumber: string;
    accountType: 'cash' | 'margin';
    initialBalance: number;
    currency: string;
  }
  export interface CreateTradingAccountResponse {
    success: boolean;
    account: TradingAccount;
  }

  export interface GetTradingAccountsRequest {}
  export interface GetTradingAccountsResponse {
    success: boolean;
    accounts: TradingAccount[];
  }

  export interface GetTradingAccountRequest {
    id: string; // Path param
  }
  export interface GetTradingAccountResponse {
    success: boolean;
    account: TradingAccount;
  }

  export interface UpdateTradingAccountRequest {
    id: string; // Path param
    name?: string;
    notes?: string;
  }
  export interface UpdateTradingAccountResponse {
    success: boolean;
    account: TradingAccount;
  }

  export interface DeleteTradingAccountRequest {
    id: string; // Path param
  }
  export interface DeleteTradingAccountResponse {
    success: boolean;
    message: string;
  }

  export interface GetAccountBalanceRequest {
    id: string; // Path param
  }
  export interface GetAccountBalanceResponse {
    success: boolean;
    balance: {
      current: number;
      available: number;
      currency: string;
    };
  }

  export interface SetDefaultAccountRequest {
    id: string; // Path param
  }
  export interface SetDefaultAccountResponse {
    success: boolean;
    message: string;
  }

  export interface AddTransactionRequest {
    id: string; // Path param (account ID)
    type: 'deposit' | 'withdrawal';
    amount: number;
    date: string;
    description?: string;
  }
  export interface AddTransactionResponse {
    success: boolean;
    transaction: any;
    account: TradingAccount;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. BUYING - Procurement & Purchasing
// ═══════════════════════════════════════════════════════════════════════════

export namespace Buying {
  // Stats & Settings
  export interface GetStatsRequest {}
  export interface GetStatsResponse {
    success: boolean;
    stats: {
      totalPurchaseOrders: number;
      pendingOrders: number;
      totalSpend: number;
      activeSuppliers: number;
    };
  }

  export interface GetSettingsRequest {}
  export interface GetSettingsResponse {
    success: boolean;
    settings: any;
  }

  export interface UpdateSettingsRequest {
    approvalThreshold?: number;
    defaultPaymentTerms?: string;
  }
  export interface UpdateSettingsResponse {
    success: boolean;
    settings: any;
  }

  // Suppliers
  export interface GetSupplierGroupsRequest {}
  export interface GetSupplierGroupsResponse {
    success: boolean;
    groups: string[];
  }

  export interface CreateSupplierRequest {
    name: string;
    email: string;
    phone: string;
    address?: string;
    taxId?: string;
    paymentTerms?: string;
  }
  export interface CreateSupplierResponse {
    success: boolean;
    supplier: any;
  }

  export interface GetSuppliersRequest {
    search?: string;
    group?: string;
    page?: number;
    limit?: number;
  }
  export interface GetSuppliersResponse {
    success: boolean;
    suppliers: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetSupplierByIdRequest {
    id: string; // Path param
  }
  export interface GetSupplierByIdResponse {
    success: boolean;
    supplier: any;
  }

  export interface UpdateSupplierRequest {
    id: string; // Path param
    name?: string;
    email?: string;
    phone?: string;
  }
  export interface UpdateSupplierResponse {
    success: boolean;
    supplier: any;
  }

  export interface DeleteSupplierRequest {
    id: string; // Path param
  }
  export interface DeleteSupplierResponse {
    success: boolean;
    message: string;
  }

  // Purchase Orders
  export interface CreatePurchaseOrderRequest {
    supplierId: string;
    items: Array<{
      itemId: string;
      quantity: number;
      unitPrice: number;
    }>;
    deliveryDate?: string;
    notes?: string;
  }
  export interface CreatePurchaseOrderResponse {
    success: boolean;
    purchaseOrder: any;
  }

  export interface GetPurchaseOrdersRequest {
    status?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetPurchaseOrdersResponse {
    success: boolean;
    purchaseOrders: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetPurchaseOrderByIdRequest {
    id: string; // Path param
  }
  export interface GetPurchaseOrderByIdResponse {
    success: boolean;
    purchaseOrder: any;
  }

  export interface SubmitPurchaseOrderRequest {
    id: string; // Path param
  }
  export interface SubmitPurchaseOrderResponse {
    success: boolean;
    message: string;
  }

  export interface ApprovePurchaseOrderRequest {
    id: string; // Path param
  }
  export interface ApprovePurchaseOrderResponse {
    success: boolean;
    message: string;
  }

  export interface CancelPurchaseOrderRequest {
    id: string; // Path param
    reason: string;
  }
  export interface CancelPurchaseOrderResponse {
    success: boolean;
    message: string;
  }

  export interface DeletePurchaseOrderRequest {
    id: string; // Path param
  }
  export interface DeletePurchaseOrderResponse {
    success: boolean;
    message: string;
  }

  // Purchase Receipts
  export interface CreatePurchaseReceiptRequest {
    purchaseOrderId: string;
    receivedDate: string;
    items: Array<{
      itemId: string;
      receivedQuantity: number;
    }>;
  }
  export interface CreatePurchaseReceiptResponse {
    success: boolean;
    purchaseReceipt: any;
  }

  export interface GetPurchaseReceiptsRequest {
    purchaseOrderId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetPurchaseReceiptsResponse {
    success: boolean;
    purchaseReceipts: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetPurchaseReceiptByIdRequest {
    id: string; // Path param
  }
  export interface GetPurchaseReceiptByIdResponse {
    success: boolean;
    purchaseReceipt: any;
  }

  export interface SubmitPurchaseReceiptRequest {
    id: string; // Path param
  }
  export interface SubmitPurchaseReceiptResponse {
    success: boolean;
    message: string;
  }

  // Purchase Invoices
  export interface CreatePurchaseInvoiceRequest {
    purchaseOrderId: string;
    supplierId: string;
    invoiceNumber: string;
    invoiceDate: string;
    items: Array<{
      itemId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }
  export interface CreatePurchaseInvoiceResponse {
    success: boolean;
    purchaseInvoice: any;
  }

  export interface GetPurchaseInvoicesRequest {
    supplierId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }
  export interface GetPurchaseInvoicesResponse {
    success: boolean;
    purchaseInvoices: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetPurchaseInvoiceByIdRequest {
    id: string; // Path param
  }
  export interface GetPurchaseInvoiceByIdResponse {
    success: boolean;
    purchaseInvoice: any;
  }

  export interface SubmitPurchaseInvoiceRequest {
    id: string; // Path param
  }
  export interface SubmitPurchaseInvoiceResponse {
    success: boolean;
    message: string;
  }

  // Material Requests
  export interface CreateMaterialRequestRequest {
    items: Array<{
      itemId: string;
      quantity: number;
      requiredDate: string;
    }>;
    requestor: string;
    notes?: string;
  }
  export interface CreateMaterialRequestResponse {
    success: boolean;
    materialRequest: any;
  }

  export interface GetMaterialRequestsRequest {
    status?: string;
    page?: number;
    limit?: number;
  }
  export interface GetMaterialRequestsResponse {
    success: boolean;
    materialRequests: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetMaterialRequestByIdRequest {
    id: string; // Path param
  }
  export interface GetMaterialRequestByIdResponse {
    success: boolean;
    materialRequest: any;
  }

  // RFQs (Request for Quotation)
  export interface CreateRFQRequest {
    title: string;
    suppliers: string[];
    items: Array<{
      itemId: string;
      quantity: number;
      specifications?: string;
    }>;
    deadline: string;
  }
  export interface CreateRFQResponse {
    success: boolean;
    rfq: any;
  }

  export interface GetRFQsRequest {
    status?: string;
    page?: number;
    limit?: number;
  }
  export interface GetRFQsResponse {
    success: boolean;
    rfqs: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetRFQByIdRequest {
    id: string; // Path param
  }
  export interface GetRFQByIdResponse {
    success: boolean;
    rfq: any;
  }

  export interface UpdateRFQRequest {
    id: string; // Path param
    deadline?: string;
    notes?: string;
  }
  export interface UpdateRFQResponse {
    success: boolean;
    rfq: any;
  }

  export interface SubmitRFQRequest {
    id: string; // Path param
  }
  export interface SubmitRFQResponse {
    success: boolean;
    message: string;
  }

  export interface DeleteRFQRequest {
    id: string; // Path param
  }
  export interface DeleteRFQResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. BULK ACTIONS - Enterprise Bulk Operations
// ═══════════════════════════════════════════════════════════════════════════

export namespace BulkActions {
  export interface ExecuteBulkActionRequest {
    entityType: string; // Path param
    action: string;
    ids: string[];
    params?: any;
  }
  export interface ExecuteBulkActionResponse {
    success: boolean;
    jobId: string;
    message: string;
  }

  export interface ValidateBulkActionRequest {
    entityType: string; // Path param
    action: string;
    ids: string[];
  }
  export interface ValidateBulkActionResponse {
    success: boolean;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }

  export interface GetBulkActionProgressRequest {
    jobId: string; // Path param
  }
  export interface GetBulkActionProgressResponse {
    success: boolean;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    processed: number;
    total: number;
    errors: string[];
  }

  export interface CancelBulkActionRequest {
    jobId: string; // Path param
  }
  export interface CancelBulkActionResponse {
    success: boolean;
    message: string;
  }

  export interface GetSupportedActionsRequest {
    entityType?: string; // Path param (optional)
  }
  export interface GetSupportedActionsResponse {
    success: boolean;
    actions: Record<string, string[]>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. CONSENT - PDPL Consent Management
// ═══════════════════════════════════════════════════════════════════════════

export namespace Consent {
  export interface GetConsentRequest {}
  export interface GetConsentResponse {
    success: boolean;
    data: {
      consents: Record<string, {
        granted: boolean;
        timestamp: string;
        version: string;
      }>;
      policyVersion: string;
      lastReviewedAt: string;
      deletionRequest?: any;
      exportRequest?: any;
    };
  }

  export interface UpdateConsentsRequest {
    consents: Record<string, boolean>;
    policyVersion?: string;
  }
  export interface UpdateConsentsResponse {
    success: boolean;
    message: string;
    message_en: string;
    data: any;
  }

  export interface UpdateConsentCategoryRequest {
    category: string; // Path param
    granted: boolean;
    version?: string;
  }
  export interface UpdateConsentCategoryResponse {
    success: boolean;
    message: string;
    data: {
      category: string;
      granted: boolean;
      timestamp: string;
    };
  }

  export interface WithdrawAllConsentsRequest {
    reason?: string;
  }
  export interface WithdrawAllConsentsResponse {
    success: boolean;
    message: string;
    message_en: string;
    data: {
      deletionRequest: {
        status: string;
        requestedAt: string;
        estimatedCompletion: string;
      };
    };
  }

  export interface RequestDataExportRequest {}
  export interface RequestDataExportResponse {
    success: boolean;
    message: string;
    message_en: string;
    data: {
      status: string;
      requestedAt: string;
      estimatedCompletion: string;
      note: string;
    };
  }

  export interface GetConsentHistoryRequest {
    limit?: number;
  }
  export interface GetConsentHistoryResponse {
    success: boolean;
    data: any[];
    total: number;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. GANTT - Project Management & Scheduling
// ═══════════════════════════════════════════════════════════════════════════

export namespace Gantt {
  // Data & Productivity
  export interface GetProductivityDataRequest {}
  export interface GetProductivityDataResponse {
    success: boolean;
    tasks: any[];
    reminders: any[];
    events: any[];
  }

  export interface FilterGanttDataRequest {
    filters: any;
  }
  export interface FilterGanttDataResponse {
    success: boolean;
    data: any[];
  }

  export interface GetGanttDataRequest {}
  export interface GetGanttDataResponse {
    success: boolean;
    data: any[];
  }

  export interface GetGanttDataForCaseRequest {
    caseId: string; // Path param
  }
  export interface GetGanttDataForCaseResponse {
    success: boolean;
    data: any[];
  }

  export interface GetGanttDataByAssigneeRequest {
    userId: string; // Path param
  }
  export interface GetGanttDataByAssigneeResponse {
    success: boolean;
    data: any[];
  }

  export interface GetTaskHierarchyRequest {
    taskId: string; // Path param
  }
  export interface GetTaskHierarchyResponse {
    success: boolean;
    hierarchy: any;
  }

  // Task Operations
  export interface UpdateTaskDatesRequest {
    id: string; // Path param
    startDate: string;
    endDate: string;
  }
  export interface UpdateTaskDatesResponse {
    success: boolean;
    task: any;
  }

  export interface UpdateTaskDurationRequest {
    id: string; // Path param
    duration: number;
  }
  export interface UpdateTaskDurationResponse {
    success: boolean;
    task: any;
  }

  export interface UpdateTaskProgressRequest {
    id: string; // Path param
    progress: number;
  }
  export interface UpdateTaskProgressResponse {
    success: boolean;
    task: any;
  }

  export interface UpdateTaskParentRequest {
    id: string; // Path param
    parentId: string | null;
  }
  export interface UpdateTaskParentResponse {
    success: boolean;
    task: any;
  }

  export interface ReorderTasksRequest {
    tasks: Array<{ id: string; order: number }>;
  }
  export interface ReorderTasksResponse {
    success: boolean;
    message: string;
  }

  // Dependencies
  export interface CreateLinkRequest {
    source: string;
    target: string;
    type: 'FS' | 'SS' | 'FF' | 'SF';
  }
  export interface CreateLinkResponse {
    success: boolean;
    link: any;
  }

  export interface DeleteLinkRequest {
    source: string; // Path param
    target: string; // Path param
  }
  export interface DeleteLinkResponse {
    success: boolean;
    message: string;
  }

  export interface GetDependencyChainRequest {
    taskId: string; // Path param
  }
  export interface GetDependencyChainResponse {
    success: boolean;
    dependencies: any;
  }

  // Critical Path Analysis
  export interface GetCriticalPathRequest {
    projectId: string; // Path param
  }
  export interface GetCriticalPathResponse {
    success: boolean;
    criticalPath: any[];
    duration: number;
  }

  export interface GetSlackTimeRequest {
    taskId: string; // Path param
  }
  export interface GetSlackTimeResponse {
    success: boolean;
    slack: number;
  }

  export interface GetBottlenecksRequest {
    projectId: string; // Path param
  }
  export interface GetBottlenecksResponse {
    success: boolean;
    bottlenecks: any[];
  }

  export interface GetProjectTimelineRequest {
    projectId: string; // Path param
  }
  export interface GetProjectTimelineResponse {
    success: boolean;
    timeline: any;
  }

  // Resources
  export interface GetResourceAllocationRequest {}
  export interface GetResourceAllocationResponse {
    success: boolean;
    allocation: any[];
  }

  export interface GetUserWorkloadRequest {
    userId: string; // Path param
  }
  export interface GetUserWorkloadResponse {
    success: boolean;
    workload: any;
  }

  export interface GetResourceConflictsRequest {}
  export interface GetResourceConflictsResponse {
    success: boolean;
    conflicts: any[];
  }

  export interface SuggestAssigneeRequest {
    taskRequirements: any;
  }
  export interface SuggestAssigneeResponse {
    success: boolean;
    suggestions: any[];
  }

  // Baselines
  export interface CreateBaselineRequest {
    projectId: string; // Path param
    name: string;
  }
  export interface CreateBaselineResponse {
    success: boolean;
    baseline: any;
  }

  export interface GetBaselineRequest {
    projectId: string; // Path param
  }
  export interface GetBaselineResponse {
    success: boolean;
    baseline: any;
  }

  export interface CompareToBaselineRequest {
    projectId: string; // Path param
  }
  export interface CompareToBaselineResponse {
    success: boolean;
    comparison: any;
  }

  // Auto-scheduling
  export interface AutoScheduleRequest {
    projectId: string; // Path param
  }
  export interface AutoScheduleResponse {
    success: boolean;
    message: string;
  }

  export interface LevelResourcesRequest {
    projectId: string; // Path param
  }
  export interface LevelResourcesResponse {
    success: boolean;
    message: string;
  }

  // Milestones
  export interface CreateMilestoneRequest {
    name: string;
    date: string;
    projectId: string;
  }
  export interface CreateMilestoneResponse {
    success: boolean;
    milestone: any;
  }

  export interface GetMilestonesRequest {
    projectId: string; // Path param
  }
  export interface GetMilestonesResponse {
    success: boolean;
    milestones: any[];
  }

  // Export
  export interface ExportToMSProjectRequest {
    projectId: string; // Path param
  }
  export interface ExportToMSProjectResponse {
    // File download
  }

  export interface ExportToPDFRequest {
    projectId: string; // Path param
  }
  export interface ExportToPDFResponse {
    // File download
  }

  export interface ExportToExcelRequest {
    projectId: string; // Path param
  }
  export interface ExportToExcelResponse {
    // File download
  }

  // Collaboration
  export interface GetActiveUsersRequest {
    resourceId: string; // Path param
  }
  export interface GetActiveUsersResponse {
    success: boolean;
    users: any[];
  }

  export interface UpdatePresenceRequest {
    resourceId: string;
    status: string;
  }
  export interface UpdatePresenceResponse {
    success: boolean;
    message: string;
  }

  export interface GetRecentActivitiesRequest {
    firmId: string; // Path param
  }
  export interface GetRecentActivitiesResponse {
    success: boolean;
    activities: any[];
  }

  export interface GetCollaborationStatsRequest {}
  export interface GetCollaborationStatsResponse {
    success: boolean;
    stats: any;
  }
}

// Continue with remaining 20 modules in next section due to length...
// (Inter-Company, KPI Analytics, KYC, Lock Date, SLO Monitoring, Smart Button,
// Smart Scheduling, Subcontracting, Asset Assignment, Field History,
// Notification Settings, User Settings, Organization Template, Automated Action,
// Debit Note, Exchange Rate Revaluation, Macro, GOSI, ZATCA, Case Notion)

// ═══════════════════════════════════════════════════════════════════════════
// 16. INTER-COMPANY - Inter-Company Transactions
// ═══════════════════════════════════════════════════════════════════════════

export namespace InterCompany {
  export interface GetTransactionsRequest {
    status?: string;
    firmId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetTransactionsResponse {
    success: boolean;
    transactions: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface CreateTransactionRequest {
    fromFirmId: string;
    toFirmId: string;
    amount: number;
    currency: string;
    type: string;
    description: string;
  }
  export interface CreateTransactionResponse {
    success: boolean;
    transaction: any;
  }

  export interface GetTransactionRequest {
    id: string; // Path param
  }
  export interface GetTransactionResponse {
    success: boolean;
    transaction: any;
  }

  export interface UpdateTransactionRequest {
    id: string; // Path param
    amount?: number;
    description?: string;
  }
  export interface UpdateTransactionResponse {
    success: boolean;
    transaction: any;
  }

  export interface ConfirmTransactionRequest {
    id: string; // Path param
  }
  export interface ConfirmTransactionResponse {
    success: boolean;
    message: string;
  }

  export interface CancelTransactionRequest {
    id: string; // Path param
    reason: string;
  }
  export interface CancelTransactionResponse {
    success: boolean;
    message: string;
  }

  export interface GetBalancesRequest {}
  export interface GetBalancesResponse {
    success: boolean;
    balances: any[];
  }

  export interface GetBalanceWithFirmRequest {
    firmId: string; // Path param
  }
  export interface GetBalanceWithFirmResponse {
    success: boolean;
    balance: any;
  }

  export interface GetReconciliationItemsRequest {}
  export interface GetReconciliationItemsResponse {
    success: boolean;
    items: any[];
  }

  export interface ReconcileTransactionsRequest {
    transactions: string[];
  }
  export interface ReconcileTransactionsResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 17. KPI ANALYTICS - Key Performance Indicators
// ═══════════════════════════════════════════════════════════════════════════

export namespace KPIAnalytics {
  export interface GetKPIDashboardRequest {
    period?: number; // Days
  }
  export interface GetKPIDashboardResponse {
    error: boolean;
    data: {
      caseMetrics: {
        total: number;
        active: number;
        closed: number;
        closedThisPeriod: number;
        avgCycleTime: number;
      };
      revenueMetrics: {
        totalInvoiced: number;
        totalPaid: number;
        collectionRate: number;
        revenuePerCase: number;
      };
      activationMetrics: {
        timeEntriesThisPeriod: number;
        documentsThisPeriod: number;
        activationRate: number;
      };
      period: number;
      generatedAt: string;
    };
  }

  export interface GetRevenueByCaseRequest {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
  export interface GetRevenueByCaseResponse {
    error: boolean;
    data: any[];
  }

  export interface GetCaseThroughputRequest {
    period?: number;
    groupBy?: 'day' | 'week' | 'month';
  }
  export interface GetCaseThroughputResponse {
    error: boolean;
    data: any;
  }

  export interface GetUserActivationRequest {
    period?: number;
  }
  export interface GetUserActivationResponse {
    error: boolean;
    data: any[];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 18. KYC - Know Your Customer / AML
// ═══════════════════════════════════════════════════════════════════════════

export namespace KYC {
  export interface HandleWebhookRequest {
    // Webhook payload from Yakeen/Wathq
  }
  export interface HandleWebhookResponse {
    success: boolean;
  }

  export interface InitiateVerificationRequest {
    documentType: string;
  }
  export interface InitiateVerificationResponse {
    success: boolean;
    verificationId: string;
  }

  export interface VerifyIdentityRequest {
    documentType: string;
    nationalId?: string;
    birthDate?: string;
    crNumber?: string;
  }
  export interface VerifyIdentityResponse {
    success: boolean;
    verified: boolean;
    data?: any;
  }

  export interface SubmitDocumentRequest {
    type: string;
    documentNumber?: string;
    fileUrl: string;
  }
  export interface SubmitDocumentResponse {
    success: boolean;
    documentId: string;
  }

  export interface GetStatusRequest {}
  export interface GetStatusResponse {
    success: boolean;
    status: string;
    documents: any[];
  }

  export interface GetHistoryRequest {}
  export interface GetHistoryResponse {
    success: boolean;
    history: any[];
  }

  export interface ReviewKYCRequest {
    userId: string;
    approved: boolean;
    notes?: string;
    documentIndex?: number;
  }
  export interface ReviewKYCResponse {
    success: boolean;
    message: string;
  }

  export interface GetPendingVerificationsRequest {}
  export interface GetPendingVerificationsResponse {
    success: boolean;
    verifications: any[];
  }

  export interface GetKYCStatsRequest {}
  export interface GetKYCStatsResponse {
    success: boolean;
    stats: {
      pending: number;
      approved: number;
      rejected: number;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 19. LOCK DATE - Fiscal Period Locking
// ═══════════════════════════════════════════════════════════════════════════

export namespace LockDate {
  export interface UpdateFiscalYearEndRequest {
    fiscalYearEnd: string; // MM-DD
  }
  export interface UpdateFiscalYearEndResponse {
    success: boolean;
    message: string;
  }

  export interface GetLockHistoryRequest {}
  export interface GetLockHistoryResponse {
    success: boolean;
    history: any[];
  }

  export interface CheckDateRequest {
    date: string;
    module: string;
  }
  export interface CheckDateResponse {
    success: boolean;
    locked: boolean;
    lockType?: string;
  }

  export interface GetFiscalPeriodsRequest {}
  export interface GetFiscalPeriodsResponse {
    success: boolean;
    periods: any[];
  }

  export interface LockPeriodRequest {
    periodId: string;
    lockType: 'soft' | 'hard';
  }
  export interface LockPeriodResponse {
    success: boolean;
    message: string;
  }

  export interface ReopenPeriodRequest {
    periodId: string;
    reason: string;
  }
  export interface ReopenPeriodResponse {
    success: boolean;
    message: string;
  }

  export interface GetLockDatesRequest {}
  export interface GetLockDatesResponse {
    success: boolean;
    lockDates: any;
  }

  export interface UpdateLockDateRequest {
    lockType: string; // Path param
    date: string;
    module?: string;
  }
  export interface UpdateLockDateResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 20. SLO MONITORING - Service Level Objectives
// ═══════════════════════════════════════════════════════════════════════════

export namespace SLOMonitoring {
  export interface GetDashboardRequest {}
  export interface GetDashboardResponse {
    success: boolean;
    dashboard: any;
  }

  export interface GenerateReportRequest {
    startDate?: string;
    endDate?: string;
  }
  export interface GenerateReportResponse {
    success: boolean;
    report: any;
  }

  export interface GetCategoriesRequest {}
  export interface GetCategoriesResponse {
    success: boolean;
    categories: string[];
  }

  export interface GetTimeWindowsRequest {}
  export interface GetTimeWindowsResponse {
    success: boolean;
    windows: string[];
  }

  export interface GetBreachedSLOsRequest {}
  export interface GetBreachedSLOsResponse {
    success: boolean;
    breached: any[];
  }

  export interface CalculateAvailabilityRequest {
    startDate?: string;
    endDate?: string;
  }
  export interface CalculateAvailabilityResponse {
    success: boolean;
    availability: number;
  }

  export interface CalculateLatencyRequest {
    startDate?: string;
    endDate?: string;
  }
  export interface CalculateLatencyResponse {
    success: boolean;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  }

  export interface InitializeDefaultsRequest {}
  export interface InitializeDefaultsResponse {
    success: boolean;
    message: string;
  }

  export interface CheckAlertsRequest {}
  export interface CheckAlertsResponse {
    success: boolean;
    alerts: any[];
  }

  export interface ListSLOsRequest {
    category?: string;
  }
  export interface ListSLOsResponse {
    success: boolean;
    slos: any[];
  }

  export interface CreateSLORequest {
    name: string;
    category: string;
    target: number;
    timeWindow: string;
  }
  export interface CreateSLOResponse {
    success: boolean;
    slo: any;
  }

  export interface GetSLORequest {
    id: string; // Path param
  }
  export interface GetSLOResponse {
    success: boolean;
    slo: any;
  }

  export interface UpdateSLORequest {
    id: string; // Path param
    name?: string;
    target?: number;
  }
  export interface UpdateSLOResponse {
    success: boolean;
    slo: any;
  }

  export interface DeleteSLORequest {
    id: string; // Path param
  }
  export interface DeleteSLOResponse {
    success: boolean;
    message: string;
  }

  export interface MeasureSLORequest {
    id: string; // Path param
    value: number;
    timestamp?: string;
  }
  export interface MeasureSLOResponse {
    success: boolean;
    measurement: any;
  }

  export interface GetSLOStatusRequest {
    id: string; // Path param
  }
  export interface GetSLOStatusResponse {
    success: boolean;
    status: any;
  }

  export interface GetSLOHistoryRequest {
    id: string; // Path param
    days?: number;
  }
  export interface GetSLOHistoryResponse {
    success: boolean;
    history: any[];
  }

  export interface GetErrorBudgetRequest {
    id: string; // Path param
  }
  export interface GetErrorBudgetResponse {
    success: boolean;
    errorBudget: {
      total: number;
      consumed: number;
      remaining: number;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 21. SMART BUTTON - Odoo-style Smart Buttons
// ═══════════════════════════════════════════════════════════════════════════

export namespace SmartButton {
  export interface GetCountsRequest {
    model: string; // Path param
    recordId: string; // Path param
  }
  export interface GetCountsResponse {
    success: boolean;
    data: Record<string, number>; // e.g., { cases: 5, invoices: 12, documents: 23 }
  }

  export interface GetBatchCountsRequest {
    model: string; // Path param
    recordIds: string[];
  }
  export interface GetBatchCountsResponse {
    success: boolean;
    data: Record<string, Record<string, number>>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 22. SMART SCHEDULING - AI-powered Scheduling
// ═══════════════════════════════════════════════════════════════════════════

export namespace SmartScheduling {
  export interface GetUserPatternsRequest {}
  export interface GetUserPatternsResponse {
    success: boolean;
    patterns: {
      productivityPeaks: string[];
      preferredSlots: any[];
      averageTaskDuration: number;
    };
  }

  export interface SuggestBestTimeRequest {
    taskType: string;
    duration: number;
    dateRange: { start: string; end: string };
  }
  export interface SuggestBestTimeResponse {
    success: boolean;
    suggestions: Array<{
      startTime: string;
      endTime: string;
      score: number;
      reason: string;
    }>;
  }

  export interface PredictDurationRequest {
    taskType: string;
    complexity?: string;
    description?: string;
  }
  export interface PredictDurationResponse {
    success: boolean;
    predictedDuration: number;
    confidence: number;
  }

  export interface AnalyzeWorkloadRequest {
    startDate: string;
    endDate: string;
  }
  export interface AnalyzeWorkloadResponse {
    success: boolean;
    workload: {
      totalHours: number;
      availableHours: number;
      utilizationRate: number;
      overloadedDays: string[];
    };
  }

  export interface GetDailyNudgesRequest {}
  export interface GetDailyNudgesResponse {
    success: boolean;
    nudges: Array<{
      type: string;
      message: string;
      action: string;
    }>;
  }

  export interface AutoScheduleTasksRequest {
    taskIds: string[];
    constraints?: any;
  }
  export interface AutoScheduleTasksResponse {
    success: boolean;
    scheduled: number;
    failed: number;
    schedule: any[];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 23. SUBCONTRACTING - Subcontracting Management
// ═══════════════════════════════════════════════════════════════════════════

export namespace Subcontracting {
  export interface GetStatsRequest {}
  export interface GetStatsResponse {
    success: boolean;
    stats: {
      totalOrders: number;
      pendingOrders: number;
      completedOrders: number;
      totalValue: number;
    };
  }

  export interface GetSettingsRequest {}
  export interface GetSettingsResponse {
    success: boolean;
    settings: any;
  }

  export interface UpdateSettingsRequest {
    autoCreateReceipt?: boolean;
    defaultQualityCheck?: boolean;
  }
  export interface UpdateSettingsResponse {
    success: boolean;
    settings: any;
  }

  export interface CreateOrderRequest {
    supplierId: string;
    items: Array<{
      rawMaterialId: string;
      finishedGoodId: string;
      quantity: number;
    }>;
    expectedDeliveryDate: string;
  }
  export interface CreateOrderResponse {
    success: boolean;
    order: any;
  }

  export interface GetOrdersRequest {
    status?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetOrdersResponse {
    success: boolean;
    orders: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetOrderRequest {
    id: string; // Path param
  }
  export interface GetOrderResponse {
    success: boolean;
    order: any;
  }

  export interface UpdateOrderRequest {
    id: string; // Path param
    expectedDeliveryDate?: string;
    notes?: string;
  }
  export interface UpdateOrderResponse {
    success: boolean;
    order: any;
  }

  export interface DeleteOrderRequest {
    id: string; // Path param
  }
  export interface DeleteOrderResponse {
    success: boolean;
    message: string;
  }

  export interface SubmitOrderRequest {
    id: string; // Path param
  }
  export interface SubmitOrderResponse {
    success: boolean;
    message: string;
  }

  export interface CancelOrderRequest {
    id: string; // Path param
    reason: string;
  }
  export interface CancelOrderResponse {
    success: boolean;
    message: string;
  }

  export interface CreateReceiptRequest {
    orderId: string;
    receivedDate: string;
    items: Array<{
      itemId: string;
      receivedQuantity: number;
      qualityStatus: string;
    }>;
  }
  export interface CreateReceiptResponse {
    success: boolean;
    receipt: any;
  }

  export interface GetReceiptsRequest {
    orderId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetReceiptsResponse {
    success: boolean;
    receipts: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetReceiptRequest {
    id: string; // Path param
  }
  export interface GetReceiptResponse {
    success: boolean;
    receipt: any;
  }

  export interface SubmitReceiptRequest {
    id: string; // Path param
  }
  export interface SubmitReceiptResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 24. ASSET ASSIGNMENT - HR Asset Management
// ═══════════════════════════════════════════════════════════════════════════

export namespace AssetAssignment {
  export interface GetAssignmentStatsRequest {}
  export interface GetAssignmentStatsResponse {
    success: boolean;
    stats: {
      totalAssignments: number;
      activeAssignments: number;
      pendingReturns: number;
      overdueReturns: number;
    };
  }

  export interface GetOverdueReturnsRequest {}
  export interface GetOverdueReturnsResponse {
    success: boolean;
    overdue: any[];
  }

  export interface GetMaintenanceDueRequest {}
  export interface GetMaintenanceDueResponse {
    success: boolean;
    due: any[];
  }

  export interface GetWarrantyExpiringRequest {}
  export interface GetWarrantyExpiringResponse {
    success: boolean;
    expiring: any[];
  }

  export interface ExportAssignmentsRequest {}
  export interface ExportAssignmentsResponse {
    // CSV/Excel file download
  }

  export interface GetPoliciesRequest {}
  export interface GetPoliciesResponse {
    success: boolean;
    policies: any;
  }

  export interface BulkDeleteAssignmentsRequest {
    ids: string[];
  }
  export interface BulkDeleteAssignmentsResponse {
    success: boolean;
    deleted: number;
  }

  export interface GetAssignmentsByEmployeeRequest {
    employeeId: string; // Path param
  }
  export interface GetAssignmentsByEmployeeResponse {
    success: boolean;
    assignments: any[];
  }

  export interface GetAssignmentsRequest {
    status?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetAssignmentsResponse {
    success: boolean;
    assignments: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface CreateAssignmentRequest {
    employeeId: string;
    assetId: string;
    assignedDate: string;
    returnDate?: string;
    notes?: string;
  }
  export interface CreateAssignmentResponse {
    success: boolean;
    assignment: any;
  }

  export interface GetAssignmentRequest {
    id: string; // Path param
  }
  export interface GetAssignmentResponse {
    success: boolean;
    assignment: any;
  }

  export interface UpdateAssignmentRequest {
    id: string; // Path param
    returnDate?: string;
    notes?: string;
  }
  export interface UpdateAssignmentResponse {
    success: boolean;
    assignment: any;
  }

  export interface DeleteAssignmentRequest {
    id: string; // Path param
  }
  export interface DeleteAssignmentResponse {
    success: boolean;
    message: string;
  }

  export interface AcknowledgeAssignmentRequest {
    id: string; // Path param
  }
  export interface AcknowledgeAssignmentResponse {
    success: boolean;
    message: string;
  }

  export interface InitiateReturnRequest {
    id: string; // Path param
    returnDate: string;
  }
  export interface InitiateReturnResponse {
    success: boolean;
    message: string;
  }

  export interface CompleteReturnRequest {
    id: string; // Path param
    condition: string;
    notes?: string;
  }
  export interface CompleteReturnResponse {
    success: boolean;
    message: string;
  }

  export interface UpdateStatusRequest {
    id: string; // Path param
    status: string;
  }
  export interface UpdateStatusResponse {
    success: boolean;
    assignment: any;
  }

  export interface TransferAssetRequest {
    id: string; // Path param
    newEmployeeId: string;
    transferDate: string;
  }
  export interface TransferAssetResponse {
    success: boolean;
    message: string;
  }

  export interface IssueClearanceRequest {
    id: string; // Path param
  }
  export interface IssueClearanceResponse {
    success: boolean;
    clearance: any;
  }

  export interface RecordMaintenanceRequest {
    id: string; // Path param
    maintenanceType: string;
    date: string;
    cost?: number;
    notes?: string;
  }
  export interface RecordMaintenanceResponse {
    success: boolean;
    maintenance: any;
  }

  export interface ReportRepairRequest {
    id: string; // Path param
    issue: string;
    urgency: string;
  }
  export interface ReportRepairResponse {
    success: boolean;
    repair: any;
  }

  export interface UpdateRepairStatusRequest {
    id: string; // Path param (assignment ID)
    repairId: string; // Path param
    status: string;
  }
  export interface UpdateRepairStatusResponse {
    success: boolean;
    repair: any;
  }

  export interface ReportIncidentRequest {
    id: string; // Path param
    incidentType: string;
    description: string;
    date: string;
  }
  export interface ReportIncidentResponse {
    success: boolean;
    incident: any;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 25. FIELD HISTORY - Field-Level Change Tracking
// ═══════════════════════════════════════════════════════════════════════════

export namespace FieldHistory {
  export interface GetRecentChangesRequest {}
  export interface GetRecentChangesResponse {
    success: boolean;
    changes: any[];
  }

  export interface GetUserChangesRequest {
    userId: string; // Path param
  }
  export interface GetUserChangesResponse {
    success: boolean;
    changes: any[];
  }

  export interface GetEntityHistoryRequest {
    entityType: string; // Path param
    entityId: string; // Path param
  }
  export interface GetEntityHistoryResponse {
    success: boolean;
    history: any[];
  }

  export interface GetEntityHistoryStatsRequest {
    entityType: string; // Path param
    entityId: string; // Path param
  }
  export interface GetEntityHistoryStatsResponse {
    success: boolean;
    stats: {
      totalChanges: number;
      fieldsChanged: number;
      contributors: number;
    };
  }

  export interface GetFieldHistoryRequest {
    entityType: string; // Path param
    entityId: string; // Path param
    fieldName: string; // Path param
  }
  export interface GetFieldHistoryResponse {
    success: boolean;
    history: any[];
  }

  export interface GetFieldTimelineRequest {
    entityType: string; // Path param
    entityId: string; // Path param
    fieldName: string; // Path param
  }
  export interface GetFieldTimelineResponse {
    success: boolean;
    timeline: any[];
  }

  export interface CompareVersionsRequest {
    entityType: string; // Path param
    entityId: string; // Path param
    version1: string; // Query param
    version2: string; // Query param
  }
  export interface CompareVersionsResponse {
    success: boolean;
    comparison: any;
  }

  export interface RevertFieldRequest {
    historyId: string; // Path param
  }
  export interface RevertFieldResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 26. NOTIFICATION SETTINGS - User Notification Preferences
// ═══════════════════════════════════════════════════════════════════════════

export namespace NotificationSettings {
  export interface GetNotificationSettingsRequest {}
  export interface GetNotificationSettingsResponse {
    success: boolean;
    data: any;
  }

  export interface UpdateNotificationSettingsRequest {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
    emailAddress?: string;
    emailDigest?: string;
    emailDigestTime?: string;
    phoneNumber?: string;
    smsUrgentOnly?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursExceptions?: string[];
    mutedTypes?: string[];
    preferredLanguage?: string;
    soundEnabled?: boolean;
    soundName?: string;
    badgeEnabled?: boolean;
  }
  export interface UpdateNotificationSettingsResponse {
    success: boolean;
    message: string;
    messageAr: string;
    data: any;
  }

  export interface UpdatePreferenceRequest {
    type: string; // Path param
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
  }
  export interface UpdatePreferenceResponse {
    success: boolean;
    message: string;
    messageAr: string;
    data: any;
  }

  export interface MuteTypeRequest {
    type: string; // Path param
  }
  export interface MuteTypeResponse {
    success: boolean;
    message: string;
    messageAr: string;
    data: any;
  }

  export interface UnmuteTypeRequest {
    type: string; // Path param
  }
  export interface UnmuteTypeResponse {
    success: boolean;
    message: string;
    messageAr: string;
    data: any;
  }

  export interface ResetSettingsRequest {}
  export interface ResetSettingsResponse {
    success: boolean;
    message: string;
    messageAr: string;
    data: any;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 27. USER SETTINGS - Dashboard Preferences
// ═══════════════════════════════════════════════════════════════════════════

export namespace UserSettings {
  export interface GetSettingsRequest {}
  export interface GetSettingsResponse {
    success: boolean;
    settings: any;
  }

  export interface GetModuleViewModeRequest {
    module: string; // Path param
  }
  export interface GetModuleViewModeResponse {
    success: boolean;
    viewMode: string;
  }

  export interface UpdateModuleViewModeRequest {
    module: string; // Path param
    viewMode: string;
  }
  export interface UpdateModuleViewModeResponse {
    success: boolean;
    message: string;
  }

  export interface UpdateGlobalViewModeRequest {
    viewMode: string;
  }
  export interface UpdateGlobalViewModeResponse {
    success: boolean;
    message: string;
  }

  export interface UpdateModuleSettingsRequest {
    module: string; // Path param
    settings: any;
  }
  export interface UpdateModuleSettingsResponse {
    success: boolean;
    message: string;
  }

  export interface ToggleSectionRequest {
    section: string;
    collapsed: boolean;
  }
  export interface ToggleSectionResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 28. ORGANIZATION TEMPLATE - Firm Configuration Templates
// ═══════════════════════════════════════════════════════════════════════════

export namespace OrganizationTemplate {
  export interface GetAvailableTemplatesRequest {}
  export interface GetAvailableTemplatesResponse {
    success: boolean;
    templates: any[];
  }

  export interface GetDefaultTemplateRequest {}
  export interface GetDefaultTemplateResponse {
    success: boolean;
    template: any;
  }

  export interface PreviewTemplateRequest {
    id: string; // Path param
  }
  export interface PreviewTemplateResponse {
    success: boolean;
    preview: any;
  }

  export interface GetTemplateStatsRequest {}
  export interface GetTemplateStatsResponse {
    success: boolean;
    stats: {
      totalTemplates: number;
      activeTemplates: number;
      usageCount: Record<string, number>;
    };
  }

  export interface ListTemplatesRequest {}
  export interface ListTemplatesResponse {
    success: boolean;
    templates: any[];
  }

  export interface CreateTemplateRequest {
    name: string;
    description: string;
    configuration: any;
  }
  export interface CreateTemplateResponse {
    success: boolean;
    template: any;
  }

  export interface GetTemplateRequest {
    id: string; // Path param
  }
  export interface GetTemplateResponse {
    success: boolean;
    template: any;
  }

  export interface UpdateTemplateRequest {
    id: string; // Path param
    name?: string;
    description?: string;
    configuration?: any;
  }
  export interface UpdateTemplateResponse {
    success: boolean;
    template: any;
  }

  export interface DeleteTemplateRequest {
    id: string; // Path param
  }
  export interface DeleteTemplateResponse {
    success: boolean;
    message: string;
  }

  export interface CloneTemplateRequest {
    id: string; // Path param
  }
  export interface CloneTemplateResponse {
    success: boolean;
    template: any;
  }

  export interface SetAsDefaultRequest {
    id: string; // Path param
  }
  export interface SetAsDefaultResponse {
    success: boolean;
    message: string;
  }

  export interface ApplyTemplateToFirmRequest {
    id: string; // Path param (template ID)
    firmId: string; // Path param
  }
  export interface ApplyTemplateToFirmResponse {
    success: boolean;
    message: string;
  }

  export interface CompareWithTemplateRequest {
    id: string; // Path param (template ID)
    firmId: string; // Path param
  }
  export interface CompareWithTemplateResponse {
    success: boolean;
    differences: any[];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 29. AUTOMATED ACTION - Workflow Automation
// ═══════════════════════════════════════════════════════════════════════════

export namespace AutomatedAction {
  export interface GetAvailableModelsRequest {}
  export interface GetAvailableModelsResponse {
    success: boolean;
    models: string[];
  }

  export interface GetModelFieldsRequest {
    modelName: string; // Path param
  }
  export interface GetModelFieldsResponse {
    success: boolean;
    fields: any[];
  }

  export interface GetAllLogsRequest {}
  export interface GetAllLogsResponse {
    success: boolean;
    logs: any[];
  }

  export interface BulkEnableRequest {
    ids: string[];
  }
  export interface BulkEnableResponse {
    success: boolean;
    enabled: number;
  }

  export interface BulkDisableRequest {
    ids: string[];
  }
  export interface BulkDisableResponse {
    success: boolean;
    disabled: number;
  }

  export interface BulkDeleteRequest {
    ids: string[];
  }
  export interface BulkDeleteResponse {
    success: boolean;
    deleted: number;
  }

  export interface GetActionsRequest {
    model?: string;
    active?: boolean;
  }
  export interface GetActionsResponse {
    success: boolean;
    actions: any[];
  }

  export interface CreateActionRequest {
    name: string;
    model: string;
    trigger: string;
    conditions?: any[];
    actions: any[];
  }
  export interface CreateActionResponse {
    success: boolean;
    action: any;
  }

  export interface GetActionRequest {
    id: string; // Path param
  }
  export interface GetActionResponse {
    success: boolean;
    action: any;
  }

  export interface UpdateActionRequest {
    id: string; // Path param
    name?: string;
    conditions?: any[];
    actions?: any[];
  }
  export interface UpdateActionResponse {
    success: boolean;
    action: any;
  }

  export interface DeleteActionRequest {
    id: string; // Path param
  }
  export interface DeleteActionResponse {
    success: boolean;
    message: string;
  }

  export interface ToggleActiveRequest {
    id: string; // Path param
  }
  export interface ToggleActiveResponse {
    success: boolean;
    active: boolean;
  }

  export interface TestActionRequest {
    id: string; // Path param
    testData?: any;
  }
  export interface TestActionResponse {
    success: boolean;
    result: any;
  }

  export interface GetActionLogsRequest {
    id: string; // Path param
  }
  export interface GetActionLogsResponse {
    success: boolean;
    logs: any[];
  }

  export interface DuplicateActionRequest {
    id: string; // Path param
  }
  export interface DuplicateActionResponse {
    success: boolean;
    action: any;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 30. DEBIT NOTE - Vendor Debit Notes
// ═══════════════════════════════════════════════════════════════════════════

export namespace DebitNote {
  export interface GetDebitNotesRequest {
    status?: string;
    billId?: string;
    page?: number;
    limit?: number;
  }
  export interface GetDebitNotesResponse {
    success: boolean;
    debitNotes: any[];
    pagination: { page: number; limit: number; total: number };
  }

  export interface GetPendingApprovalsRequest {}
  export interface GetPendingApprovalsResponse {
    success: boolean;
    pending: any[];
  }

  export interface GetDebitNotesForBillRequest {
    billId: string; // Path param
  }
  export interface GetDebitNotesForBillResponse {
    success: boolean;
    debitNotes: any[];
  }

  export interface GetDebitNoteRequest {
    id: string; // Path param
  }
  export interface GetDebitNoteResponse {
    success: boolean;
    debitNote: any;
  }

  export interface CreateDebitNoteRequest {
    billId: string;
    amount: number;
    reason: string;
    items?: any[];
  }
  export interface CreateDebitNoteResponse {
    success: boolean;
    debitNote: any;
  }

  export interface UpdateDebitNoteRequest {
    id: string; // Path param
    amount?: number;
    reason?: string;
  }
  export interface UpdateDebitNoteResponse {
    success: boolean;
    debitNote: any;
  }

  export interface SubmitDebitNoteRequest {
    id: string; // Path param
  }
  export interface SubmitDebitNoteResponse {
    success: boolean;
    message: string;
  }

  export interface ApproveDebitNoteRequest {
    id: string; // Path param
  }
  export interface ApproveDebitNoteResponse {
    success: boolean;
    message: string;
  }

  export interface RejectDebitNoteRequest {
    id: string; // Path param
    reason: string;
  }
  export interface RejectDebitNoteResponse {
    success: boolean;
    message: string;
  }

  export interface ApplyDebitNoteRequest {
    id: string; // Path param
  }
  export interface ApplyDebitNoteResponse {
    success: boolean;
    message: string;
  }

  export interface CancelDebitNoteRequest {
    id: string; // Path param
    reason: string;
  }
  export interface CancelDebitNoteResponse {
    success: boolean;
    message: string;
  }

  export interface DeleteDebitNoteRequest {
    id: string; // Path param
  }
  export interface DeleteDebitNoteResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 31. EXCHANGE RATE REVALUATION - Multi-Currency Accounting
// ═══════════════════════════════════════════════════════════════════════════

export namespace ExchangeRateRevaluation {
  export interface GetRevaluationReportRequest {}
  export interface GetRevaluationReportResponse {
    success: boolean;
    report: any;
  }

  export interface GetRevaluationAccountsRequest {}
  export interface GetRevaluationAccountsResponse {
    success: boolean;
    accounts: any[];
  }

  export interface PreviewRevaluationRequest {
    date: string;
    accounts: string[];
  }
  export interface PreviewRevaluationResponse {
    success: boolean;
    preview: any;
  }

  export interface GetRevaluationsRequest {
    startDate?: string;
    endDate?: string;
  }
  export interface GetRevaluationsResponse {
    success: boolean;
    revaluations: any[];
  }

  export interface RunRevaluationRequest {
    date: string;
    accounts: string[];
  }
  export interface RunRevaluationResponse {
    success: boolean;
    revaluation: any;
  }

  export interface GetRevaluationRequest {
    id: string; // Path param
  }
  export interface GetRevaluationResponse {
    success: boolean;
    revaluation: any;
  }

  export interface DeleteRevaluationRequest {
    id: string; // Path param
  }
  export interface DeleteRevaluationResponse {
    success: boolean;
    message: string;
  }

  export interface PostRevaluationRequest {
    id: string; // Path param
  }
  export interface PostRevaluationResponse {
    success: boolean;
    message: string;
  }

  export interface ReverseRevaluationRequest {
    id: string; // Path param
  }
  export interface ReverseRevaluationResponse {
    success: boolean;
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 32. MACRO - Response Macros
// ═══════════════════════════════════════════════════════════════════════════

export namespace Macro {
  export interface ListMacrosRequest {
    category?: string;
  }
  export interface ListMacrosResponse {
    success: boolean;
    macros: any[];
  }

  export interface CreateMacroRequest {
    name: string;
    shortcut: string;
    content: string;
    category?: string;
  }
  export interface CreateMacroResponse {
    success: boolean;
    macro: any;
  }

  export interface GetPopularMacrosRequest {}
  export interface GetPopularMacrosResponse {
    success: boolean;
    macros: any[];
  }

  export interface GetByShortcutRequest {
    shortcut: string; // Path param
  }
  export interface GetByShortcutResponse {
    success: boolean;
    macro: any;
  }

  export interface SuggestMacrosRequest {
    conversationId: string; // Path param
  }
  export interface SuggestMacrosResponse {
    success: boolean;
    suggestions: any[];
  }

  export interface GetMacroRequest {
    id: string; // Path param
  }
  export interface GetMacroResponse {
    success: boolean;
    macro: any;
  }

  export interface UpdateMacroRequest {
    id: string; // Path param
    name?: string;
    content?: string;
    shortcut?: string;
  }
  export interface UpdateMacroResponse {
    success: boolean;
    macro: any;
  }

  export interface DeleteMacroRequest {
    id: string; // Path param
  }
  export interface DeleteMacroResponse {
    success: boolean;
    message: string;
  }

  export interface ApplyMacroRequest {
    id: string; // Path param (macro ID)
    conversationId: string; // Path param
  }
  export interface ApplyMacroResponse {
    success: boolean;
    message: any;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 33. GOSI - Saudi GOSI Calculations
// ═══════════════════════════════════════════════════════════════════════════

export namespace GOSI {
  export interface GetConfigRequest {}
  export interface GetConfigResponse {
    success: boolean;
    config: {
      rates: any;
      ceilings: any;
    };
  }

  export interface UpdateConfigRequest {
    rates?: any;
    ceilings?: any;
  }
  export interface UpdateConfigResponse {
    success: boolean;
    config: any;
  }

  export interface CalculateRequest {
    nationality: 'saudi' | 'non-saudi';
    basicSalary: number;
    allowances?: number;
  }
  export interface CalculateResponse {
    success: boolean;
    calculation: {
      employeeContribution: number;
      employerContribution: number;
      total: number;
    };
  }

  export interface CalculateForEmployeeRequest {
    employeeId: string; // Path param
  }
  export interface CalculateForEmployeeResponse {
    success: boolean;
    calculation: any;
  }

  export interface GetReportRequest {
    month: string; // YYYY-MM
  }
  export interface GetReportResponse {
    success: boolean;
    report: any;
  }

  export interface GetStatsRequest {}
  export interface GetStatsResponse {
    success: boolean;
    stats: {
      totalEmployees: number;
      totalContributions: number;
      byNationality: any;
    };
  }

  export interface ExportReportRequest {
    month: string;
    format?: 'xlsx' | 'pdf';
  }
  export interface ExportReportResponse {
    // File download
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 34. ZATCA - Saudi E-Invoicing
// ═══════════════════════════════════════════════════════════════════════════

export namespace ZATCA {
  export interface GetConfigRequest {}
  export interface GetConfigResponse {
    success: boolean;
    config: any;
  }

  export interface UpdateConfigRequest {
    csid?: string;
    deviceSerial?: string;
    environment?: 'sandbox' | 'production';
  }
  export interface UpdateConfigResponse {
    success: boolean;
    config: any;
  }

  export interface ValidateInvoiceRequest {
    invoiceData: any;
  }
  export interface ValidateInvoiceResponse {
    success: boolean;
    valid: boolean;
    errors: string[];
  }

  export interface GenerateQRRequest {
    invoiceData: any;
  }
  export interface GenerateQRResponse {
    success: boolean;
    qrCode: string;
  }

  export interface GenerateHashRequest {
    invoiceData: any;
  }
  export interface GenerateHashResponse {
    success: boolean;
    hash: string;
  }

  export interface PrepareInvoiceRequest {
    invoiceId: string; // Path param
  }
  export interface PrepareInvoiceResponse {
    success: boolean;
    prepared: any;
  }

  export interface SubmitInvoiceRequest {
    invoiceId: string; // Path param
  }
  export interface SubmitInvoiceResponse {
    success: boolean;
    submissionId: string;
    status: string;
  }

  export interface BulkSubmitRequest {
    invoiceIds: string[];
  }
  export interface BulkSubmitResponse {
    success: boolean;
    submitted: number;
    failed: number;
    results: any[];
  }

  export interface GetInvoiceStatusRequest {
    invoiceId: string; // Path param
  }
  export interface GetInvoiceStatusResponse {
    success: boolean;
    status: string;
    submittedAt?: string;
    zatcaResponse?: any;
  }

  export interface GetStatsRequest {}
  export interface GetStatsResponse {
    success: boolean;
    stats: {
      totalSubmitted: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  }

  export interface GetPendingRequest {}
  export interface GetPendingResponse {
    success: boolean;
    pending: any[];
  }

  export interface GetFailedRequest {}
  export interface GetFailedResponse {
    success: boolean;
    failed: any[];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 35. CASE NOTION - Notion-like Case Pages
// ═══════════════════════════════════════════════════════════════════════════

export namespace CaseNotion {
  // Case List
  export interface ListCasesWithNotionRequest {}
  export interface ListCasesWithNotionResponse {
    success: boolean;
    cases: Array<{
      caseId: string;
      title: string;
      pageCount: number;
    }>;
  }

  // Pages (44+ endpoints - showing key ones)
  export interface ListPagesRequest {
    caseId: string; // Path param
  }
  export interface ListPagesResponse {
    success: boolean;
    pages: any[];
  }

  export interface GetPageRequest {
    caseId: string; // Path param
    pageId: string; // Path param
  }
  export interface GetPageResponse {
    success: boolean;
    page: any;
    blocks: any[];
  }

  export interface CreatePageRequest {
    caseId: string; // Path param
    title: string;
    icon?: string;
    coverImage?: string;
  }
  export interface CreatePageResponse {
    success: boolean;
    page: any;
  }

  export interface UpdatePageRequest {
    caseId: string; // Path param
    pageId: string; // Path param
    title?: string;
    icon?: string;
  }
  export interface UpdatePageResponse {
    success: boolean;
    page: any;
  }

  export interface DeletePageRequest {
    caseId: string; // Path param
    pageId: string; // Path param
  }
  export interface DeletePageResponse {
    success: boolean;
    message: string;
  }

  // Blocks
  export interface CreateBlockRequest {
    caseId: string; // Path param
    pageId: string; // Path param
    type: string;
    content: any;
    parentBlockId?: string;
  }
  export interface CreateBlockResponse {
    success: boolean;
    block: any;
  }

  export interface UpdateBlockRequest {
    caseId: string; // Path param
    blockId: string; // Path param
    content?: any;
    properties?: any;
  }
  export interface UpdateBlockResponse {
    success: boolean;
    block: any;
  }

  // Whiteboard
  export interface CreateShapeRequest {
    caseId: string; // Path param
    pageId: string; // Path param
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: any;
  }
  export interface CreateShapeResponse {
    success: boolean;
    shape: any;
  }

  export interface CreateArrowRequest {
    caseId: string; // Path param
    pageId: string; // Path param
    start: { x: number; y: number };
    end: { x: number; y: number };
    properties?: any;
  }
  export interface CreateArrowResponse {
    success: boolean;
    arrow: any;
  }

  // Export
  export interface ExportPdfRequest {
    caseId: string; // Path param
    pageId: string; // Path param
  }
  export interface ExportPdfResponse {
    // PDF file download
  }

  export interface ExportMarkdownRequest {
    caseId: string; // Path param
    pageId: string; // Path param
  }
  export interface ExportMarkdownResponse {
    // Markdown file download
  }

  export interface ExportHtmlRequest {
    caseId: string; // Path param
    pageId: string; // Path param
  }
  export interface ExportHtmlResponse {
    // HTML file download
  }

  // Templates
  export interface GetTemplatesRequest {}
  export interface GetTemplatesResponse {
    success: boolean;
    templates: any[];
  }

  export interface ApplyTemplateRequest {
    caseId: string; // Path param
    pageId: string; // Path param
    templateId: string;
  }
  export interface ApplyTemplateResponse {
    success: boolean;
    message: string;
  }

  // Collaboration
  export interface AddCommentRequest {
    caseId: string; // Path param
    blockId: string; // Path param
    text: string;
  }
  export interface AddCommentResponse {
    success: boolean;
    comment: any;
  }

  export interface SearchRequest {
    caseId: string; // Path param
    query: string;
  }
  export interface SearchResponse {
    success: boolean;
    results: any[];
  }

  // Note: Case Notion has 96 endpoints total covering:
  // - Pages (create, read, update, delete, archive, restore, duplicate, favorite, pin, merge)
  // - Blocks (create, update, delete, move, lock/unlock)
  // - Synced blocks (create, get, unsync)
  // - Comments (get, add, resolve, delete)
  // - Activity (get page activity)
  // - Search
  // - Export (PDF, Markdown, HTML)
  // - Templates (get, apply, save as template)
  // - Task linking (link, unlink, create from block)
  // - Whiteboard features (position, size, color, priority, z-index, rotation, opacity, style)
  // - Entity linking (events, hearings, documents)
  // - Connections (create, update, delete)
  // - Shapes and arrows
  // - Frames (add/remove children, auto-detect, move with children)
  // - Undo/redo
  // - Multi-select operations (duplicate, delete, group, ungroup, align, distribute)
}

/**
 * SUMMARY
 *
 * Total modules documented: 35
 * Total endpoints documented: 400+
 *
 * Module Breakdown:
 * 1. Regional Banks: 10 endpoints
 * 2. Saudi Banking (Lean/WPS/SADAD/Mudad): 34 endpoints
 * 3. Temporal Case: 10 endpoints
 * 4. Temporal Invoice: 6 endpoints
 * 5. Temporal Offboarding: 5 endpoints
 * 6. Temporal Onboarding: 6 endpoints
 * 7. Investments: 12 endpoints
 * 8. Investment Search: 10 endpoints
 * 9. Interest Area: 6 endpoints
 * 10. Trades: 10 endpoints
 * 11. Trading Accounts: 7 endpoints
 * 12. Buying: 31 endpoints
 * 13. Bulk Actions: 6 endpoints (5 documented)
 * 14. Consent: 6 endpoints
 * 15. Gantt: 44 endpoints
 * 16. Inter-Company: 10 endpoints
 * 17. KPI Analytics: 4 endpoints
 * 18. KYC: 11 endpoints (8 documented)
 * 19. Lock Date: 8 endpoints
 * 20. SLO Monitoring: 19 endpoints
 * 21. Smart Button: 2 endpoints
 * 22. Smart Scheduling: 6 endpoints
 * 23. Subcontracting: 15 endpoints
 * 24. Asset Assignment: 22 endpoints
 * 25. Field History: 8 endpoints
 * 26. Notification Settings: 6 endpoints
 * 27. User Settings: 5 endpoints
 * 28. Organization Template: 11 endpoints
 * 29. Automated Action: 17 endpoints (15 documented)
 * 30. Debit Note: 11 endpoints
 * 31. Exchange Rate Revaluation: 9 endpoints
 * 32. Macro: 10 endpoints
 * 33. GOSI: 8 endpoints (6 documented)
 * 34. ZATCA: 11 endpoints
 * 35. Case Notion: 96 endpoints (15 documented - module has extensive whiteboard features)
 */
