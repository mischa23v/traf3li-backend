/**
 * Verification, AI, and Biometric Modules API Contracts
 * Verify, Biometric, ML-Scoring, AI-Matching, AI-Chat, AI-Settings, Conflict-Check
 */

// ============================================================================
// VERIFY MODULE - 19 endpoints
// ============================================================================

export namespace VerifyContract {
  // Enums
  export enum VerificationType {
    YAKEEN = 'yakeen',
    SIMAH = 'simah',
    COMMERCIAL = 'commercial',
    ADDRESS = 'address',
    DOCUMENT = 'document'
  }

  export enum VerificationStatus {
    PENDING = 'pending',
    VERIFIED = 'verified',
    FAILED = 'failed',
    EXPIRED = 'expired'
  }

  // Interfaces
  export interface VerificationResult {
    _id: string;
    firmId: string;
    type: VerificationType;
    status: VerificationStatus;
    entityType: 'client' | 'lead' | 'contact';
    entityId: string;
    requestData: Record<string, any>;
    responseData?: Record<string, any>;
    errorMessage?: string;
    verifiedAt?: Date;
    expiresAt?: Date;
    verifiedBy?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface YakeenVerificationRequest {
    nationalId: string;
    dateOfBirth: string;
    idExpiryDate?: string;
  }

  export interface YakeenVerificationResponse {
    success: boolean;
    data?: {
      firstName: string;
      fatherName: string;
      grandFatherName: string;
      familyName: string;
      gender: string;
      dateOfBirth: string;
      idExpiryDate: string;
      nationality: string;
      status: string;
    };
    error?: string;
  }

  export interface AddressVerificationRequest {
    buildingNumber: string;
    streetName: string;
    district: string;
    city: string;
    postalCode: string;
    additionalNumber?: string;
  }

  /**
   * @endpoint POST /api/verify/yakeen
   * @description Verify individual via Yakeen
   */
  export type VerifyYakeen = (req: YakeenVerificationRequest) => Promise<YakeenVerificationResponse>;

  /**
   * @endpoint POST /api/verify/yakeen/address
   * @description Verify address via Yakeen
   */
  export type VerifyYakeenAddress = (req: AddressVerificationRequest) => Promise<{ success: boolean; data?: any; error?: string }>;

  /**
   * @endpoint GET /api/verify/yakeen/status
   * @description Get Yakeen verification status
   */
  export type GetYakeenStatus = () => Promise<{ success: boolean; data: { available: boolean; lastCheck: Date } }>;

  /**
   * @endpoint POST /api/verify/simah
   * @description Verify credit via SIMAH
   */
  export type VerifySIMAH = (req: { nationalId: string; consent: boolean }) => Promise<{ success: boolean; data?: { creditScore: number; report: any }; error?: string }>;

  /**
   * @endpoint POST /api/verify/commercial
   * @description Verify commercial registration
   */
  export type VerifyCommercial = (req: { crNumber: string }) => Promise<{ success: boolean; data?: { companyName: string; status: string; activities: string[]; expiryDate: string }; error?: string }>;

  /**
   * @endpoint POST /api/verify/document
   * @description Verify document authenticity
   */
  export type VerifyDocument = (req: { documentType: string; documentNumber: string; issuingAuthority?: string }) => Promise<{ success: boolean; data?: any; error?: string }>;

  /**
   * @endpoint GET /api/verify/history/:entityType/:entityId
   * @description Get verification history for entity
   */
  export type GetHistory = (entityType: string, entityId: string) => Promise<{ success: boolean; data: VerificationResult[] }>;

  /**
   * @endpoint GET /api/verify/stats
   * @description Get verification statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { total: number; byType: any; byStatus: any; successRate: number } }>;

  /**
   * @endpoint POST /api/verify/batch
   * @description Batch verification request
   */
  export type BatchVerify = (requests: Array<{ type: VerificationType; data: any }>) => Promise<{ success: boolean; results: VerificationResult[] }>;

  /**
   * @endpoint GET /api/verify/providers
   * @description Get available verification providers
   */
  export type GetProviders = () => Promise<{ success: boolean; data: Array<{ name: string; type: VerificationType; available: boolean }> }>;

  /**
   * @endpoint GET /api/verify/settings
   * @description Get verification settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint PUT /api/verify/settings
   * @description Update verification settings
   */
  export type UpdateSettings = (data: any) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint POST /api/verify/manual
   * @description Record manual verification
   */
  export type ManualVerify = (req: { entityType: string; entityId: string; type: VerificationType; notes: string }) => Promise<{ success: boolean; data: VerificationResult }>;

  /**
   * @endpoint GET /api/verify/expiring
   * @description Get expiring verifications
   */
  export type GetExpiring = (days?: number) => Promise<{ success: boolean; data: VerificationResult[] }>;

  /**
   * @endpoint POST /api/verify/renew/:id
   * @description Renew verification
   */
  export type RenewVerification = (id: string) => Promise<{ success: boolean; data: VerificationResult }>;
}

// ============================================================================
// BIOMETRIC MODULE - 32 endpoints
// ============================================================================

export namespace BiometricContract {
  // Enums
  export enum DeviceType {
    FINGERPRINT = 'fingerprint',
    FACE_RECOGNITION = 'face_recognition',
    IRIS = 'iris',
    CARD_READER = 'card_reader'
  }

  export enum DeviceStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    MAINTENANCE = 'maintenance',
    ERROR = 'error'
  }

  export enum AttendanceType {
    CLOCK_IN = 'clock_in',
    CLOCK_OUT = 'clock_out',
    BREAK_START = 'break_start',
    BREAK_END = 'break_end'
  }

  // Interfaces
  export interface BiometricDevice {
    _id: string;
    firmId: string;
    name: string;
    serialNumber: string;
    type: DeviceType;
    status: DeviceStatus;
    location: string;
    ipAddress?: string;
    lastSyncAt?: Date;
    settings?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface BiometricEnrollment {
    _id: string;
    firmId: string;
    userId: string;
    deviceType: DeviceType;
    templateData: string;
    enrolledAt: Date;
    enrolledBy: string;
    lastUsedAt?: Date;
    status: 'active' | 'inactive' | 'blocked';
  }

  export interface BiometricLog {
    _id: string;
    firmId: string;
    deviceId: string;
    userId: string;
    type: AttendanceType;
    timestamp: Date;
    verificationMethod: DeviceType;
    confidence?: number;
    location?: string;
    photo?: string;
  }

  /**
   * @endpoint POST /api/biometric/devices
   * @description Register biometric device
   */
  export type CreateDevice = (data: Partial<BiometricDevice>) => Promise<{ success: boolean; data: BiometricDevice }>;

  /**
   * @endpoint GET /api/biometric/devices
   * @description Get all biometric devices
   */
  export type GetDevices = () => Promise<{ success: boolean; data: BiometricDevice[] }>;

  /**
   * @endpoint GET /api/biometric/devices/:id
   * @description Get single device
   */
  export type GetDevice = (id: string) => Promise<{ success: boolean; data: BiometricDevice }>;

  /**
   * @endpoint PUT /api/biometric/devices/:id
   * @description Update device
   */
  export type UpdateDevice = (id: string, data: Partial<BiometricDevice>) => Promise<{ success: boolean; data: BiometricDevice }>;

  /**
   * @endpoint DELETE /api/biometric/devices/:id
   * @description Remove device
   */
  export type DeleteDevice = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/biometric/devices/:id/sync
   * @description Sync device data
   */
  export type SyncDevice = (id: string) => Promise<{ success: boolean; syncedRecords: number }>;

  /**
   * @endpoint GET /api/biometric/devices/:id/status
   * @description Get device status
   */
  export type GetDeviceStatus = (id: string) => Promise<{ success: boolean; data: { status: DeviceStatus; lastSeen: Date; enrolledUsers: number } }>;

  /**
   * @endpoint POST /api/biometric/devices/:id/restart
   * @description Restart device
   */
  export type RestartDevice = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/biometric/enroll
   * @description Enroll user biometrics
   */
  export type EnrollUser = (data: { userId: string; deviceType: DeviceType; templateData: string }) => Promise<{ success: boolean; data: BiometricEnrollment }>;

  /**
   * @endpoint GET /api/biometric/enrollments
   * @description Get all enrollments
   */
  export type GetEnrollments = (params?: { userId?: string; deviceType?: DeviceType }) => Promise<{ success: boolean; data: BiometricEnrollment[] }>;

  /**
   * @endpoint GET /api/biometric/enrollments/:userId
   * @description Get user enrollments
   */
  export type GetUserEnrollments = (userId: string) => Promise<{ success: boolean; data: BiometricEnrollment[] }>;

  /**
   * @endpoint DELETE /api/biometric/enrollments/:id
   * @description Remove enrollment
   */
  export type DeleteEnrollment = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/biometric/enrollments/:id/block
   * @description Block enrollment
   */
  export type BlockEnrollment = (id: string, reason?: string) => Promise<{ success: boolean; data: BiometricEnrollment }>;

  /**
   * @endpoint POST /api/biometric/enrollments/:id/unblock
   * @description Unblock enrollment
   */
  export type UnblockEnrollment = (id: string) => Promise<{ success: boolean; data: BiometricEnrollment }>;

  /**
   * @endpoint POST /api/biometric/verify
   * @description Verify biometric
   */
  export type VerifyBiometric = (data: { userId: string; deviceType: DeviceType; templateData: string }) => Promise<{ success: boolean; verified: boolean; confidence?: number }>;

  /**
   * @endpoint GET /api/biometric/logs
   * @description Get biometric logs
   */
  export type GetLogs = (params?: { userId?: string; deviceId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: BiometricLog[]; pagination: any }>;

  /**
   * @endpoint GET /api/biometric/logs/:id
   * @description Get single log
   */
  export type GetLog = (id: string) => Promise<{ success: boolean; data: BiometricLog }>;

  /**
   * @endpoint GET /api/biometric/stats
   * @description Get biometric statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalDevices: number; onlineDevices: number; totalEnrollments: number; todayLogs: number } }>;

  /**
   * @endpoint GET /api/biometric/attendance/today
   * @description Get today's attendance from biometrics
   */
  export type GetTodayAttendance = () => Promise<{ success: boolean; data: BiometricLog[] }>;

  /**
   * @endpoint GET /api/biometric/attendance/report
   * @description Get attendance report from biometrics
   */
  export type GetAttendanceReport = (params: { startDate: string; endDate: string; userId?: string }) => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint POST /api/biometric/clock-in
   * @description Manual clock in
   */
  export type ClockIn = (data: { userId: string; deviceId?: string; location?: string }) => Promise<{ success: boolean; data: BiometricLog }>;

  /**
   * @endpoint POST /api/biometric/clock-out
   * @description Manual clock out
   */
  export type ClockOut = (data: { userId: string; deviceId?: string; location?: string }) => Promise<{ success: boolean; data: BiometricLog }>;

  /**
   * @endpoint GET /api/biometric/settings
   * @description Get biometric settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint PUT /api/biometric/settings
   * @description Update biometric settings
   */
  export type UpdateSettings = (data: any) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint POST /api/biometric/sync-all
   * @description Sync all devices
   */
  export type SyncAll = () => Promise<{ success: boolean; syncedDevices: number; totalRecords: number }>;

  /**
   * @endpoint GET /api/biometric/health
   * @description Get biometric system health
   */
  export type GetHealth = () => Promise<{ success: boolean; data: { devicesOnline: number; syncStatus: string; lastFullSync: Date } }>;
}

// ============================================================================
// ML-SCORING MODULE - 18 endpoints
// ============================================================================

export namespace MLScoringContract {
  // Enums
  export enum ScoreType {
    LEAD = 'lead',
    CHURN = 'churn',
    CONVERSION = 'conversion',
    ENGAGEMENT = 'engagement'
  }

  export enum ModelStatus {
    TRAINING = 'training',
    ACTIVE = 'active',
    DEPRECATED = 'deprecated',
    FAILED = 'failed'
  }

  // Interfaces
  export interface MLScore {
    _id: string;
    firmId: string;
    entityType: 'lead' | 'client' | 'contact';
    entityId: string;
    scoreType: ScoreType;
    score: number;
    confidence: number;
    factors: ScoreFactor[];
    modelVersion: string;
    calculatedAt: Date;
    expiresAt?: Date;
  }

  export interface ScoreFactor {
    name: string;
    value: number;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
    description?: string;
  }

  export interface MLModel {
    _id: string;
    firmId: string;
    name: string;
    type: ScoreType;
    version: string;
    status: ModelStatus;
    accuracy?: number;
    trainingDataSize?: number;
    lastTrainedAt?: Date;
    parameters?: Record<string, any>;
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/ml-scoring/scores
   * @description Get all scores
   */
  export type GetScores = (params?: { entityType?: string; scoreType?: ScoreType; minScore?: number; page?: number; limit?: number }) => Promise<{ success: boolean; data: MLScore[]; pagination: any }>;

  /**
   * @endpoint GET /api/ml-scoring/scores/:leadId
   * @description Get scores for lead
   */
  export type GetLeadScores = (leadId: string) => Promise<{ success: boolean; data: MLScore[] }>;

  /**
   * @endpoint POST /api/ml-scoring/scores/:leadId/calculate
   * @description Calculate score for lead
   */
  export type CalculateScore = (leadId: string, scoreType?: ScoreType) => Promise<{ success: boolean; data: MLScore }>;

  /**
   * @endpoint POST /api/ml-scoring/calculate-batch
   * @description Batch calculate scores
   */
  export type CalculateBatch = (leadIds: string[], scoreType?: ScoreType) => Promise<{ success: boolean; calculated: number; scores: MLScore[] }>;

  /**
   * @endpoint GET /api/ml-scoring/models
   * @description Get ML models
   */
  export type GetModels = () => Promise<{ success: boolean; data: MLModel[] }>;

  /**
   * @endpoint GET /api/ml-scoring/models/:id
   * @description Get single model
   */
  export type GetModel = (id: string) => Promise<{ success: boolean; data: MLModel }>;

  /**
   * @endpoint POST /api/ml-scoring/models/:id/train
   * @description Trigger model training
   */
  export type TrainModel = (id: string) => Promise<{ success: boolean; message: string; jobId: string }>;

  /**
   * @endpoint GET /api/ml-scoring/models/:id/metrics
   * @description Get model metrics
   */
  export type GetModelMetrics = (id: string) => Promise<{ success: boolean; data: { accuracy: number; precision: number; recall: number; f1Score: number } }>;

  /**
   * @endpoint GET /api/ml-scoring/stats
   * @description Get ML scoring statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalScores: number; averageScore: number; modelsActive: number; lastCalculation: Date } }>;

  /**
   * @endpoint GET /api/ml-scoring/insights/:leadId
   * @description Get scoring insights
   */
  export type GetInsights = (leadId: string) => Promise<{ success: boolean; data: { score: number; topFactors: ScoreFactor[]; recommendations: string[] } }>;

  /**
   * @endpoint POST /api/ml-scoring/feedback
   * @description Submit feedback for model improvement
   */
  export type SubmitFeedback = (data: { scoreId: string; actualOutcome: string; notes?: string }) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/ml-scoring/distribution
   * @description Get score distribution
   */
  export type GetDistribution = (scoreType?: ScoreType) => Promise<{ success: boolean; data: { buckets: Array<{ range: string; count: number }> } }>;

  /**
   * @endpoint GET /api/ml-scoring/trends
   * @description Get scoring trends
   */
  export type GetTrends = (params: { startDate: string; endDate: string; scoreType?: ScoreType }) => Promise<{ success: boolean; data: Array<{ date: string; averageScore: number; count: number }> }>;

  /**
   * @endpoint GET /api/ml-scoring/settings
   * @description Get ML scoring settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint PUT /api/ml-scoring/settings
   * @description Update ML scoring settings
   */
  export type UpdateSettings = (data: any) => Promise<{ success: boolean; data: any }>;
}

// ============================================================================
// AI-MATCHING MODULE - 12 endpoints
// ============================================================================

export namespace AIMatchingContract {
  // Interfaces
  export interface MatchResult {
    entityType: string;
    entityId: string;
    score: number;
    confidence: number;
    matchedFields: MatchedField[];
    recommendations?: string[];
  }

  export interface MatchedField {
    field: string;
    sourceValue: any;
    matchedValue: any;
    similarity: number;
  }

  export interface AutoMatchConfig {
    enabled: boolean;
    threshold: number;
    entityTypes: string[];
    fields: string[];
    notifyOnMatch: boolean;
  }

  /**
   * @endpoint POST /api/ai-matching/match
   * @description Find matches for entity
   */
  export type FindMatches = (data: { entityType: string; entityId: string; searchIn?: string[] }) => Promise<{ success: boolean; data: MatchResult[] }>;

  /**
   * @endpoint POST /api/ai-matching/batch
   * @description Batch matching
   */
  export type BatchMatch = (data: { entities: Array<{ type: string; id: string }> }) => Promise<{ success: boolean; data: Array<{ entityId: string; matches: MatchResult[] }> }>;

  /**
   * @endpoint POST /api/ai-matching/auto-match
   * @description Trigger auto-matching
   */
  export type AutoMatch = (entityType?: string) => Promise<{ success: boolean; processed: number; matched: number }>;

  /**
   * @endpoint GET /api/ai-matching/suggestions/:entityType/:entityId
   * @description Get match suggestions
   */
  export type GetSuggestions = (entityType: string, entityId: string) => Promise<{ success: boolean; data: MatchResult[] }>;

  /**
   * @endpoint POST /api/ai-matching/confirm
   * @description Confirm a match
   */
  export type ConfirmMatch = (data: { sourceType: string; sourceId: string; targetType: string; targetId: string }) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/ai-matching/reject
   * @description Reject a match suggestion
   */
  export type RejectMatch = (data: { sourceType: string; sourceId: string; targetType: string; targetId: string; reason?: string }) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/ai-matching/config
   * @description Get matching configuration
   */
  export type GetConfig = () => Promise<{ success: boolean; data: AutoMatchConfig }>;

  /**
   * @endpoint PUT /api/ai-matching/config
   * @description Update matching configuration
   */
  export type UpdateConfig = (data: Partial<AutoMatchConfig>) => Promise<{ success: boolean; data: AutoMatchConfig }>;

  /**
   * @endpoint GET /api/ai-matching/stats
   * @description Get matching statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalMatches: number; confirmedMatches: number; rejectedMatches: number; pendingSuggestions: number } }>;

  /**
   * @endpoint GET /api/ai-matching/history
   * @description Get matching history
   */
  export type GetHistory = (params?: { entityType?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: any[]; pagination: any }>;

  /**
   * @endpoint POST /api/ai-matching/train
   * @description Train matching model with feedback
   */
  export type TrainModel = () => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/ai-matching/duplicates
   * @description Find potential duplicates
   */
  export type FindDuplicates = (entityType: string) => Promise<{ success: boolean; data: Array<{ entities: string[]; similarity: number }> }>;
}

// ============================================================================
// AI-CHAT MODULE - 7 endpoints
// ============================================================================

export namespace AIChatContract {
  // Enums
  export enum AIProvider {
    OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    GOOGLE = 'google',
    AZURE = 'azure'
  }

  // Interfaces
  export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }

  export interface ChatSession {
    _id: string;
    firmId: string;
    userId: string;
    messages: ChatMessage[];
    context?: {
      entityType?: string;
      entityId?: string;
    };
    provider: AIProvider;
    model: string;
    tokensUsed: number;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ChatRequest {
    message: string;
    sessionId?: string;
    context?: {
      entityType?: string;
      entityId?: string;
    };
    provider?: AIProvider;
  }

  export interface ChatResponse {
    success: boolean;
    data: {
      sessionId: string;
      message: string;
      tokensUsed: number;
    };
  }

  /**
   * @endpoint GET /api/ai-chat/providers
   * @description Get available AI providers
   */
  export type GetProviders = () => Promise<{ success: boolean; data: Array<{ name: AIProvider; available: boolean; models: string[] }> }>;

  /**
   * @endpoint POST /api/ai-chat
   * @description Send chat message
   */
  export type SendMessage = (req: ChatRequest) => Promise<ChatResponse>;

  /**
   * @endpoint POST /api/ai-chat/stream
   * @description Send chat message with streaming response
   */
  export type SendMessageStream = (req: ChatRequest) => Promise<ReadableStream>;

  /**
   * @endpoint GET /api/ai-chat/sessions
   * @description Get chat sessions
   */
  export type GetSessions = (params?: { page?: number; limit?: number }) => Promise<{ success: boolean; data: ChatSession[]; pagination: any }>;

  /**
   * @endpoint GET /api/ai-chat/sessions/:id
   * @description Get single session
   */
  export type GetSession = (id: string) => Promise<{ success: boolean; data: ChatSession }>;

  /**
   * @endpoint DELETE /api/ai-chat/sessions/:id
   * @description Delete chat session
   */
  export type DeleteSession = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/ai-chat/usage
   * @description Get AI chat usage
   */
  export type GetUsage = () => Promise<{ success: boolean; data: { totalTokens: number; totalSessions: number; byProvider: any } }>;
}

// ============================================================================
// AI-SETTINGS MODULE - 7 endpoints
// ============================================================================

export namespace AISettingsContract {
  // Interfaces
  export interface AISettings {
    _id: string;
    firmId: string;
    enabled: boolean;
    defaultProvider: string;
    providers: {
      openai?: { apiKey?: string; model: string; enabled: boolean };
      anthropic?: { apiKey?: string; model: string; enabled: boolean };
      google?: { apiKey?: string; model: string; enabled: boolean };
    };
    features: {
      chat: boolean;
      documentAnalysis: boolean;
      summarization: boolean;
      translation: boolean;
    };
    limits: {
      dailyTokenLimit: number;
      maxTokensPerRequest: number;
    };
    updatedAt: Date;
  }

  export interface AIUsage {
    totalTokens: number;
    tokensToday: number;
    tokensThisMonth: number;
    byFeature: Record<string, number>;
    byProvider: Record<string, number>;
  }

  /**
   * @endpoint GET /api/ai-settings
   * @description Get AI settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: AISettings }>;

  /**
   * @endpoint GET /api/ai-settings/features
   * @description Get enabled AI features
   */
  export type GetFeatures = () => Promise<{ success: boolean; data: Record<string, boolean> }>;

  /**
   * @endpoint GET /api/ai-settings/usage
   * @description Get AI usage statistics
   */
  export type GetUsage = () => Promise<{ success: boolean; data: AIUsage }>;

  /**
   * @endpoint PUT /api/ai-settings
   * @description Update AI settings
   */
  export type UpdateSettings = (data: Partial<AISettings>) => Promise<{ success: boolean; data: AISettings }>;

  /**
   * @endpoint POST /api/ai-settings/test-provider
   * @description Test AI provider connection
   */
  export type TestProvider = (provider: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint PUT /api/ai-settings/features
   * @description Update AI features
   */
  export type UpdateFeatures = (features: Record<string, boolean>) => Promise<{ success: boolean; data: Record<string, boolean> }>;

  /**
   * @endpoint PUT /api/ai-settings/limits
   * @description Update AI limits
   */
  export type UpdateLimits = (limits: { dailyTokenLimit?: number; maxTokensPerRequest?: number }) => Promise<{ success: boolean; data: any }>;
}

// ============================================================================
// CONFLICT-CHECK MODULE - 8 endpoints
// ============================================================================

export namespace ConflictCheckContract {
  // Enums
  export enum ConflictStatus {
    CLEAR = 'clear',
    POTENTIAL = 'potential',
    CONFIRMED = 'confirmed',
    WAIVED = 'waived'
  }

  export enum ConflictType {
    CLIENT = 'client',
    MATTER = 'matter',
    PARTY = 'party',
    BUSINESS = 'business'
  }

  // Interfaces
  export interface ConflictCheck {
    _id: string;
    firmId: string;
    searchTerms: string[];
    entityType: 'client' | 'lead' | 'case';
    entityId?: string;
    status: ConflictStatus;
    results: ConflictResult[];
    checkedBy: string;
    checkedAt: Date;
    resolvedBy?: string;
    resolvedAt?: Date;
    resolution?: string;
    createdAt: Date;
  }

  export interface ConflictResult {
    type: ConflictType;
    entityType: string;
    entityId: string;
    entityName: string;
    matchedField: string;
    matchedValue: string;
    similarity: number;
    severity: 'low' | 'medium' | 'high';
  }

  /**
   * @endpoint POST /api/conflict-check/quick
   * @description Quick conflict check
   */
  export type QuickCheck = (data: { searchTerms: string[] }) => Promise<{ success: boolean; hasConflict: boolean; results: ConflictResult[] }>;

  /**
   * @endpoint GET /api/conflict-check/stats
   * @description Get conflict check statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalChecks: number; conflictsFound: number; resolvedConflicts: number } }>;

  /**
   * @endpoint GET /api/conflict-check
   * @description Get all conflict checks
   */
  export type GetChecks = (params?: { status?: ConflictStatus; page?: number; limit?: number }) => Promise<{ success: boolean; data: ConflictCheck[]; pagination: any }>;

  /**
   * @endpoint POST /api/conflict-check
   * @description Create full conflict check
   */
  export type CreateCheck = (data: { searchTerms: string[]; entityType?: string; entityId?: string }) => Promise<{ success: boolean; data: ConflictCheck }>;

  /**
   * @endpoint GET /api/conflict-check/:id
   * @description Get single conflict check
   */
  export type GetCheck = (id: string) => Promise<{ success: boolean; data: ConflictCheck }>;

  /**
   * @endpoint POST /api/conflict-check/:id/resolve
   * @description Resolve conflict
   */
  export type ResolveConflict = (id: string, data: { status: ConflictStatus; resolution: string }) => Promise<{ success: boolean; data: ConflictCheck }>;

  /**
   * @endpoint GET /api/conflict-check/entity/:type/:id
   * @description Get conflict checks for entity
   */
  export type GetByEntity = (type: string, id: string) => Promise<{ success: boolean; data: ConflictCheck[] }>;

  /**
   * @endpoint GET /api/conflict-check/settings
   * @description Get conflict check settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: any }>;
}

// ============================================================================
// HR-EXTENDED MODULE - 49 endpoints
// ============================================================================

export namespace HRExtendedContract {
  // Enums
  export enum EncashmentStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    PAID = 'paid'
  }

  export enum SeparationType {
    RESIGNATION = 'resignation',
    TERMINATION = 'termination',
    RETIREMENT = 'retirement',
    END_OF_CONTRACT = 'end_of_contract'
  }

  // Interfaces
  export interface LeaveEncashment {
    _id: string;
    firmId: string;
    employeeId: string;
    leaveType: string;
    days: number;
    amount: number;
    status: EncashmentStatus;
    requestedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
    paidAt?: Date;
    notes?: string;
  }

  export interface EndOfService {
    _id: string;
    firmId: string;
    employeeId: string;
    separationType: SeparationType;
    lastWorkingDate: Date;
    yearsOfService: number;
    basicSalary: number;
    eosAmount: number;
    deductions: { type: string; amount: number }[];
    additions: { type: string; amount: number }[];
    netAmount: number;
    status: 'draft' | 'pending' | 'approved' | 'paid';
    createdAt: Date;
  }

  export interface EmployeeTransfer {
    _id: string;
    firmId: string;
    employeeId: string;
    fromDepartment: string;
    toDepartment: string;
    fromPosition: string;
    toPosition?: string;
    effectiveDate: Date;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approvedBy?: string;
  }

  /**
   * @endpoint GET /api/hr-extended/leave-encashment
   * @description Get leave encashment requests
   */
  export type GetLeaveEncashments = (params?: { status?: EncashmentStatus; page?: number; limit?: number }) => Promise<{ success: boolean; data: LeaveEncashment[]; pagination: any }>;

  /**
   * @endpoint POST /api/hr-extended/leave-encashment
   * @description Create leave encashment request
   */
  export type CreateLeaveEncashment = (data: Partial<LeaveEncashment>) => Promise<{ success: boolean; data: LeaveEncashment }>;

  /**
   * @endpoint POST /api/hr-extended/leave-encashment/:id/approve
   * @description Approve leave encashment
   */
  export type ApproveLeaveEncashment = (id: string) => Promise<{ success: boolean; data: LeaveEncashment }>;

  /**
   * @endpoint POST /api/hr-extended/leave-encashment/:id/reject
   * @description Reject leave encashment
   */
  export type RejectLeaveEncashment = (id: string, reason?: string) => Promise<{ success: boolean; data: LeaveEncashment }>;

  /**
   * @endpoint POST /api/hr-extended/leave-encashment/:id/pay
   * @description Mark encashment as paid
   */
  export type PayLeaveEncashment = (id: string) => Promise<{ success: boolean; data: LeaveEncashment }>;

  /**
   * @endpoint GET /api/hr-extended/end-of-service
   * @description Get end of service calculations
   */
  export type GetEndOfServices = (params?: { status?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: EndOfService[]; pagination: any }>;

  /**
   * @endpoint POST /api/hr-extended/end-of-service
   * @description Create end of service calculation
   */
  export type CreateEndOfService = (data: Partial<EndOfService>) => Promise<{ success: boolean; data: EndOfService }>;

  /**
   * @endpoint GET /api/hr-extended/end-of-service/:id
   * @description Get single EOS
   */
  export type GetEndOfService = (id: string) => Promise<{ success: boolean; data: EndOfService }>;

  /**
   * @endpoint PUT /api/hr-extended/end-of-service/:id
   * @description Update EOS
   */
  export type UpdateEndOfService = (id: string, data: Partial<EndOfService>) => Promise<{ success: boolean; data: EndOfService }>;

  /**
   * @endpoint POST /api/hr-extended/end-of-service/:id/approve
   * @description Approve EOS
   */
  export type ApproveEndOfService = (id: string) => Promise<{ success: boolean; data: EndOfService }>;

  /**
   * @endpoint POST /api/hr-extended/end-of-service/calculate
   * @description Calculate EOS amount
   */
  export type CalculateEndOfService = (data: { employeeId: string; separationType: SeparationType; lastWorkingDate: string }) => Promise<{ success: boolean; data: { yearsOfService: number; amount: number; breakdown: any } }>;

  /**
   * @endpoint GET /api/hr-extended/transfers
   * @description Get employee transfers
   */
  export type GetTransfers = (params?: { status?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: EmployeeTransfer[]; pagination: any }>;

  /**
   * @endpoint POST /api/hr-extended/transfers
   * @description Create transfer request
   */
  export type CreateTransfer = (data: Partial<EmployeeTransfer>) => Promise<{ success: boolean; data: EmployeeTransfer }>;

  /**
   * @endpoint GET /api/hr-extended/transfers/:id
   * @description Get single transfer
   */
  export type GetTransfer = (id: string) => Promise<{ success: boolean; data: EmployeeTransfer }>;

  /**
   * @endpoint POST /api/hr-extended/transfers/:id/approve
   * @description Approve transfer
   */
  export type ApproveTransfer = (id: string) => Promise<{ success: boolean; data: EmployeeTransfer }>;

  /**
   * @endpoint POST /api/hr-extended/transfers/:id/reject
   * @description Reject transfer
   */
  export type RejectTransfer = (id: string, reason?: string) => Promise<{ success: boolean; data: EmployeeTransfer }>;

  /**
   * @endpoint GET /api/hr-extended/stats
   * @description Get HR extended statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { pendingEncashments: number; pendingEOS: number; pendingTransfers: number } }>;

  /**
   * @endpoint GET /api/hr-extended/employee/:id/history
   * @description Get employee HR history
   */
  export type GetEmployeeHistory = (id: string) => Promise<{ success: boolean; data: { transfers: EmployeeTransfer[]; encashments: LeaveEncashment[] } }>;

  /**
   * @endpoint GET /api/hr-extended/reports/eos
   * @description Get EOS report
   */
  export type GetEOSReport = (params: { startDate: string; endDate: string }) => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint GET /api/hr-extended/reports/encashment
   * @description Get encashment report
   */
  export type GetEncashmentReport = (params: { startDate: string; endDate: string }) => Promise<{ success: boolean; data: any[] }>;
}

// ============================================================================
// NOTIFICATION-PREFERENCE MODULE - 12 endpoints
// ============================================================================

export namespace NotificationPreferenceContract {
  // Interfaces
  export interface NotificationPreference {
    _id: string;
    userId: string;
    firmId: string;
    email: {
      enabled: boolean;
      frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
      categories: Record<string, boolean>;
    };
    push: {
      enabled: boolean;
      categories: Record<string, boolean>;
    };
    sms: {
      enabled: boolean;
      categories: Record<string, boolean>;
    };
    inApp: {
      enabled: boolean;
      categories: Record<string, boolean>;
    };
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    updatedAt: Date;
  }

  export interface NotificationCategory {
    key: string;
    name: string;
    description: string;
    defaultEnabled: boolean;
    channels: ('email' | 'push' | 'sms' | 'inApp')[];
  }

  /**
   * @endpoint GET /api/notification-preference/defaults
   * @description Get default preferences
   */
  export type GetDefaults = () => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint GET /api/notification-preference/stats
   * @description Get preference statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalUsers: number; emailEnabled: number; pushEnabled: number } }>;

  /**
   * @endpoint POST /api/notification-preference/reset
   * @description Reset to defaults
   */
  export type Reset = () => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint GET /api/notification-preference
   * @description Get user preferences
   */
  export type GetPreferences = () => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint PUT /api/notification-preference
   * @description Update preferences
   */
  export type UpdatePreferences = (data: Partial<NotificationPreference>) => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint GET /api/notification-preference/categories
   * @description Get notification categories
   */
  export type GetCategories = () => Promise<{ success: boolean; data: NotificationCategory[] }>;

  /**
   * @endpoint PUT /api/notification-preference/channel/:channel
   * @description Update channel preferences
   */
  export type UpdateChannel = (channel: string, data: { enabled: boolean; categories?: Record<string, boolean> }) => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint PUT /api/notification-preference/quiet-hours
   * @description Update quiet hours
   */
  export type UpdateQuietHours = (data: { enabled: boolean; start?: string; end?: string; timezone?: string }) => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint POST /api/notification-preference/test/:channel
   * @description Send test notification
   */
  export type TestChannel = (channel: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint PUT /api/notification-preference/category/:category
   * @description Update category preferences
   */
  export type UpdateCategory = (category: string, data: { email?: boolean; push?: boolean; sms?: boolean; inApp?: boolean }) => Promise<{ success: boolean; data: NotificationPreference }>;

  /**
   * @endpoint POST /api/notification-preference/unsubscribe/:token
   * @description Unsubscribe via token
   */
  export type Unsubscribe = (token: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/notification-preference/devices
   * @description Get registered devices
   */
  export type GetDevices = () => Promise<{ success: boolean; data: Array<{ id: string; type: string; name: string; lastUsed: Date }> }>;
}

// Export all contracts
export {
  VerifyContract,
  BiometricContract,
  MLScoringContract,
  AIMatchingContract,
  AIChatContract,
  AISettingsContract,
  ConflictCheckContract,
  HRExtendedContract,
  NotificationPreferenceContract
};
