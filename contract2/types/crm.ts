/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRM API TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive TypeScript type definitions for all CRM modules:
 * - Lead (21 endpoints)
 * - Contact (16 endpoints)
 * - Organization (12 endpoints)
 * - CRM Pipeline (14 endpoints)
 * - CRM Activity (15 endpoints)
 *
 * Total: 78 endpoints documented
 * Generated: 2026-01-06
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
}

export type ObjectId = string;

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum LeadType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company'
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  ON_HOLD = 'on_hold'
}

export enum LeadSourceType {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  COLD_CALL = 'cold_call',
  WALK_IN = 'walk_in',
  EVENT = 'event',
  OTHER = 'other'
}

export enum CaseType {
  CIVIL = 'civil',
  CRIMINAL = 'criminal',
  FAMILY = 'family',
  COMMERCIAL = 'commercial',
  LABOR = 'labor',
  REAL_ESTATE = 'real_estate',
  ADMINISTRATIVE = 'administrative',
  EXECUTION = 'execution',
  OTHER = 'other'
}

export enum Urgency {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum ContactType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization'
}

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked'
}

export enum ContactRole {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  LEGAL_COUNSEL = 'legal_counsel',
  PROCUREMENT = 'procurement',
  TECHNICAL = 'technical',
  FINANCIAL = 'financial',
  OTHER = 'other'
}

export enum ConflictCheckStatus {
  PENDING = 'pending',
  CLEAR = 'clear',
  POTENTIAL_CONFLICT = 'potential_conflict',
  CONFLICT = 'conflict'
}

export enum OrganizationType {
  LLC = 'llc',
  JOINT_STOCK = 'joint_stock',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  BRANCH = 'branch',
  GOVERNMENT = 'government',
  NONPROFIT = 'nonprofit',
  PROFESSIONAL = 'professional',
  HOLDING = 'holding',
  COMPANY = 'company',
  COURT = 'court',
  LAW_FIRM = 'law_firm',
  OTHER = 'other'
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DISSOLVED = 'dissolved',
  PENDING = 'pending',
  ARCHIVED = 'archived'
}

export enum OrganizationSize {
  MICRO = 'micro',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}

export enum PipelineType {
  LEAD = 'lead',
  CASE = 'case',
  DEAL = 'deal',
  CUSTOM = 'custom'
}

export enum PipelineCategory {
  GENERAL = 'general',
  CIVIL = 'civil',
  CRIMINAL = 'criminal',
  FAMILY = 'family',
  COMMERCIAL = 'commercial',
  LABOR = 'labor',
  REAL_ESTATE = 'real_estate',
  ADMINISTRATIVE = 'administrative',
  OTHER = 'other'
}

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  DOCUMENT = 'document',
  PROPOSAL = 'proposal',
  STATUS_CHANGE = 'status_change',
  STAGE_CHANGE = 'stage_change',
  ASSIGNMENT = 'assignment',
  LEAD_CREATED = 'lead_created',
  LEAD_CONVERTED = 'lead_converted',
  CASE_CREATED = 'case_created',
  CASE_UPDATED = 'case_updated',
  CASE_DELETED = 'case_deleted',
  OTHER = 'other'
}

export enum ActivityStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ActivityEntityType {
  LEAD = 'lead',
  CLIENT = 'client',
  CONTACT = 'contact',
  CASE = 'case',
  ORGANIZATION = 'organization'
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum MeetingType {
  IN_PERSON = 'in_person',
  VIDEO = 'video',
  PHONE = 'phone',
  COURT = 'court',
  CONSULTATION = 'consultation'
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// ═══════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════

export interface UserReference {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  avatar?: string;
  email?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  country?: string;
}

export interface LeadSource {
  type?: LeadSourceType;
  referralId?: ObjectId;
  referralName?: string;
  campaign?: string;
  medium?: string;
  notes?: string;
}

export interface IntakeInfo {
  practiceArea?: string;
  caseType?: CaseType;
  caseDescription?: string;
  urgency?: Urgency;
  estimatedValue?: number;
  opposingParty?: string;
  courtName?: string;
  courtDeadline?: string;
  statuteOfLimitations?: string;
  currentStatus?: string;
  desiredOutcome?: string;
  deadline?: string;
  hasDocuments?: boolean;
  conflictCheckCompleted?: boolean;
  conflictCheckResult?: 'clear' | 'potential_conflict' | 'conflict';
  conflictCheckNotes?: string;
  intakeFormId?: ObjectId;
  intakeCompletedAt?: string;
}

export interface PipelineStage {
  stageId: string;
  name: string;
  nameAr?: string;
  color?: string;
  order: number;
  probability?: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
  autoActions?: Array<{
    trigger: 'enter' | 'exit' | 'time_in_stage';
    action: 'send_email' | 'create_task' | 'notify_user' | 'update_field';
    config?: any;
    delayHours?: number;
  }>;
  requirements?: Array<{
    field: string;
    label: string;
    labelAr?: string;
    type: 'checkbox' | 'document' | 'approval' | 'field_filled';
    required?: boolean;
  }>;
  avgDaysInStage?: number;
  maxDaysWarning?: number;
}

// ═══════════════════════════════════════════════════════════════
// LEAD MODULE (21 ENDPOINTS)
// ═══════════════════════════════════════════════════════════════

// GET /api/crm/overview - CRM Overview (Batch Endpoint)
export interface GetCrmOverviewResponse {
  success: boolean;
  data: {
    leads: {
      total: number;
      new: number;
      converted: number;
      qualified: number;
      totalValue: number;
      conversionRate: number;
    };
    activities: {
      today: number;
      week: number;
      upcoming: number;
    };
    pipeline: {
      byStage: Record<string, { count: number; value: number }>;
    };
    performance: {
      team: Array<{
        _id: ObjectId;
        count: number;
        converted: number;
        userName: string;
      }>;
    };
    recentActivities: any[];
    upcomingFollowUps: Array<{
      _id: ObjectId;
      leadId: string;
      displayName: string;
      nextFollowUpDate: string;
      nextFollowUpNote?: string;
      status: LeadStatus;
    }>;
  };
}

// POST /api/leads - Create Lead
export interface CreateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  notes?: string;
  assignedTo?: ObjectId;
  // Additional fields based on type
  type?: LeadType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactPerson?: string;
  jobTitle?: string;
  estimatedValue?: number;
  pipelineId?: ObjectId;
  pipelineStageId?: string;
}

export interface CreateLeadResponse {
  success: boolean;
  message: string;
  data: {
    lead: Lead;
    automation?: any;
  };
}

// GET /api/leads - Get Leads
export interface GetLeadsQuery {
  status?: LeadStatus;
  source?: LeadSourceType;
  assignedTo?: ObjectId;
  pipelineId?: ObjectId;
  search?: string;
  convertedToClient?: 'true' | 'false';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface Lead {
  _id: ObjectId;
  leadId: string;
  firmId?: ObjectId;
  lawyerId: ObjectId;
  type: LeadType;
  displayName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  source?: LeadSource;
  status: LeadStatus;
  pipelineId?: ObjectId;
  pipelineStageId?: string;
  probability?: number;
  estimatedValue?: number;
  actualCloseDate?: string;
  assignedTo?: ObjectId | UserReference;
  teamMembers?: ObjectId[] | UserReference[];
  contactPerson?: string;
  jobTitle?: string;
  intake?: IntakeInfo;
  convertedToClient?: boolean;
  clientId?: ObjectId;
  caseId?: ObjectId;
  organizationId?: ObjectId;
  contactId?: ObjectId;
  notes?: string;
  address?: Address;
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  lastActivityAt?: string;
  lastContactedAt?: string;
  activityCount?: number;
  callCount?: number;
  emailCount?: number;
  meetingCount?: number;
  nationalId?: string;
  commercialRegistration?: string;
  crNumber?: string;
  iqamaNumber?: string;
  isVerified?: boolean;
  verificationSource?: string;
  verifiedAt?: string;
  verificationData?: any;
  nationalAddress?: any;
  conflictCheckStatus?: ConflictCheckStatus;
  conflictCheckDate?: string;
  conflictNotes?: string;
  createdBy: ObjectId;
  lastModifiedBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export type GetLeadsResponse = PaginatedResponse<Lead>;

// GET /api/leads/stats - Get Lead Statistics
export interface GetLeadStatsQuery {
  startDate?: string;
  endDate?: string;
}

export interface GetLeadStatsResponse {
  success: boolean;
  data: {
    stats: any;
    needsFollowUp: Lead[];
    recentLeads: Lead[];
  };
}

// GET /api/leads/follow-up - Get Leads Needing Follow-up
export interface GetNeedingFollowUpQuery {
  limit?: number;
}

export interface GetNeedingFollowUpResponse {
  success: boolean;
  data: Lead[];
}

// GET /api/leads/pipeline/:pipelineId? - Get Leads by Pipeline
export interface GetByPipelineParams {
  pipelineId?: ObjectId;
}

export interface GetByPipelineResponse {
  success: boolean;
  data: {
    pipeline: Pipeline;
    leadsByStage: Record<string, Lead[]>;
  };
}

// GET /api/leads/:id - Get Single Lead
export interface GetLeadParams {
  id: ObjectId;
}

export interface GetLeadResponse {
  success: boolean;
  data: {
    lead: Lead;
    activities: CrmActivity[];
  };
}

// PUT /api/leads/:id - Update Lead
export interface UpdateLeadParams {
  id: ObjectId;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  notes?: string;
  assignedTo?: ObjectId;
}

export interface UpdateLeadResponse {
  success: boolean;
  message: string;
  data: Lead;
}

// DELETE /api/leads/:id - Delete Lead
export interface DeleteLeadParams {
  id: ObjectId;
}

export interface DeleteLeadResponse {
  success: boolean;
  message: string;
}

// POST /api/leads/bulk-delete - Bulk Delete Leads
export interface BulkDeleteLeadsRequest {
  ids: ObjectId[];
}

export interface BulkDeleteLeadsResponse {
  success: boolean;
  message: string;
  deletedCount: number;
}

// POST /api/leads/:id/status - Update Lead Status
export interface UpdateLeadStatusParams {
  id: ObjectId;
}

export interface UpdateLeadStatusRequest {
  status: LeadStatus;
  notes?: string;
  lostReason?: string;
}

export interface UpdateLeadStatusResponse {
  success: boolean;
  message: string;
  data: Lead;
}

// POST /api/leads/:id/move - Move Lead to Stage
export interface MoveLeadToStageParams {
  id: ObjectId;
}

export interface MoveLeadToStageRequest {
  stageId: string;
  notes?: string;
}

export interface MoveLeadToStageResponse {
  success: boolean;
  message: string;
  data: {
    lead: Lead;
    automation?: any;
  };
}

// GET /api/leads/:id/conversion-preview - Preview Lead Conversion
export interface PreviewConversionParams {
  id: ObjectId;
}

export interface PreviewConversionResponse {
  success: boolean;
  data: {
    clientData: {
      clientType: 'individual' | 'company';
      displayName: string;
      email?: string;
      phone?: string;
      alternatePhone?: string;
      whatsapp?: string;
      nationalId?: string;
      crNumber?: string;
      address?: Address;
      proposedBilling?: {
        type: string;
        amount: number;
      } | null;
    };
    caseData: {
      canCreateCase: boolean;
      suggestedTitle?: string;
      caseType?: CaseType;
      urgency?: Urgency;
      estimatedValue?: number;
      opposingParty?: string;
      court?: string;
      reason?: string;
    };
  };
}

// POST /api/leads/:id/convert - Convert Lead to Client
export interface ConvertLeadToClientParams {
  id: ObjectId;
}

export interface ConvertLeadToClientRequest {
  createCase?: boolean;
  caseTitle?: string;
}

export interface ConvertLeadToClientResponse {
  success: boolean;
  message: string;
  data: {
    lead: Lead;
    client: any; // Client type from client module
    case?: any; // Case type from case module
  };
}

// GET /api/leads/:id/activities - Get Lead Activities
export interface GetLeadActivitiesParams {
  id: ObjectId;
}

export interface GetLeadActivitiesQuery {
  type?: ActivityType;
  page?: number;
  limit?: number;
}

export interface GetLeadActivitiesResponse {
  success: boolean;
  data: CrmActivity[];
}

// POST /api/leads/:id/activities - Log Lead Activity
export interface LogLeadActivityParams {
  id: ObjectId;
}

export interface LogLeadActivityRequest {
  type: ActivityType;
  title: string;
  description?: string;
  duration?: number;
  scheduledAt?: string;
  status?: ActivityStatus;
  emailData?: any;
  callData?: any;
  meetingData?: any;
  taskData?: any;
}

export interface LogLeadActivityResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// POST /api/leads/:id/follow-up - Schedule Follow-up
export interface ScheduleFollowUpParams {
  id: ObjectId;
}

export interface ScheduleFollowUpRequest {
  date: string;
  note?: string;
}

export interface ScheduleFollowUpResponse {
  success: boolean;
  message: string;
  data: Lead;
}

// POST /api/leads/:id/verify/wathq - Verify with Wathq
export interface VerifyWathqParams {
  id: ObjectId;
}

export interface VerifyWathqRequest {
  crNumber?: string;
}

export interface VerifyWathqResponse {
  success: boolean;
  message: string;
  data: {
    isVerified: boolean;
    verificationSource: string;
    verifiedAt: string;
  };
}

// POST /api/leads/:id/verify/absher - Verify with Absher
export interface VerifyAbsherParams {
  id: ObjectId;
}

export interface VerifyAbsherRequest {
  nationalId?: string;
  iqamaNumber?: string;
}

export interface VerifyAbsherResponse {
  success: boolean;
  message: string;
  data: {
    isVerified: boolean;
    verificationSource: string;
    verifiedAt: string;
  };
}

// POST /api/leads/:id/verify/address - Verify National Address
export interface VerifyAddressParams {
  id: ObjectId;
}

export interface VerifyAddressRequest {
  [key: string]: any; // National address fields
}

export interface VerifyAddressResponse {
  success: boolean;
  message: string;
  data: {
    nationalAddress: any;
  };
}

// POST /api/leads/:id/conflict-check - Run Conflict Check
export interface ConflictCheckParams {
  id: ObjectId;
}

export interface ConflictCheckResponse {
  success: boolean;
  hasConflict: boolean;
  conflicts: Array<{
    type: string;
    entity: string;
    entityId: ObjectId;
    message: string;
  }>;
  data: {
    conflictCheckStatus: ConflictCheckStatus;
    conflictCheckDate: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONTACT MODULE (16 ENDPOINTS)
// ═══════════════════════════════════════════════════════════════

// POST /api/contacts - Create Contact
export interface CreateContactRequest {
  salutation?: string;
  salutationAr?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  suffix?: string;
  fullNameArabic?: string;
  arabicName?: {
    firstName?: string;
    fatherName?: string;
    grandfatherName?: string;
    familyName?: string;
    fullName?: string;
  };
  type?: ContactType;
  primaryRole?: ContactRole;
  relationshipTypes?: string[];
  email?: string;
  phone?: string;
  alternatePhone?: string;
  emails?: string[];
  phones?: string[];
  company?: string;
  organizationId?: ObjectId;
  title?: string;
  department?: string;
  nationalId?: string;
  iqamaNumber?: string;
  passportNumber?: string;
  passportCountry?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  preferredLanguage?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  doNotContact?: boolean;
  doNotEmail?: boolean;
  doNotCall?: boolean;
  doNotSMS?: boolean;
  conflictCheckStatus?: ConflictCheckStatus;
  conflictNotes?: string;
  conflictCheckDate?: string;
  conflictCheckedBy?: ObjectId;
  status?: ContactStatus;
  priority?: string;
  vipStatus?: boolean;
  riskLevel?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  tags?: string[];
  practiceAreas?: string[];
  notes?: string;
}

export interface Contact {
  _id: ObjectId;
  firmId?: ObjectId;
  lawyerId: ObjectId;
  salutation?: string;
  salutationAr?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  suffix?: string;
  fullNameArabic?: string;
  arabicName?: {
    firstName?: string;
    fatherName?: string;
    grandfatherName?: string;
    familyName?: string;
    fullName?: string;
  };
  type: ContactType;
  primaryRole?: ContactRole;
  relationshipTypes?: string[];
  email?: string;
  phone?: string;
  alternatePhone?: string;
  emails?: string[];
  phones?: string[];
  company?: string;
  organizationId?: ObjectId;
  title?: string;
  department?: string;
  nationalId?: string;
  iqamaNumber?: string;
  passportNumber?: string;
  passportCountry?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  preferredLanguage?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  doNotContact?: boolean;
  doNotEmail?: boolean;
  doNotCall?: boolean;
  doNotSMS?: boolean;
  conflictCheckStatus?: ConflictCheckStatus;
  conflictNotes?: string;
  conflictCheckDate?: string;
  conflictCheckedBy?: ObjectId;
  status: ContactStatus;
  priority?: string;
  vipStatus?: boolean;
  riskLevel?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  tags?: string[];
  practiceAreas?: string[];
  notes?: string;
  linkedCases?: ObjectId[];
  linkedClients?: ObjectId[];
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactResponse {
  success: boolean;
  message: string;
  data: Contact;
}

// GET /api/contacts - Get Contacts
export interface GetContactsQuery {
  type?: ContactType;
  status?: ContactStatus;
  primaryRole?: ContactRole;
  search?: string;
  organizationId?: ObjectId;
  conflictCheckStatus?: ConflictCheckStatus;
  vipStatus?: 'true' | 'false';
  tags?: string | string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type GetContactsResponse = PaginatedResponse<Contact>;

// GET /api/contacts/search - Search Contacts (Autocomplete)
export interface SearchContactsQuery {
  q: string;
  limit?: number;
}

export interface SearchContactsResponse {
  success: boolean;
  data: Contact[];
  count: number;
}

// GET /api/contacts/case/:caseId - Get Contacts by Case
export interface GetContactsByCaseParams {
  caseId: ObjectId;
}

export interface GetContactsByCaseResponse {
  success: boolean;
  data: Contact[];
}

// GET /api/contacts/client/:clientId - Get Contacts by Client
export interface GetContactsByClientParams {
  clientId: ObjectId;
}

export interface GetContactsByClientResponse {
  success: boolean;
  data: Contact[];
}

// DELETE /api/contacts/bulk - Bulk Delete Contacts
export interface BulkDeleteContactsRequest {
  ids: ObjectId[];
}

export interface BulkDeleteContactsResponse {
  success: boolean;
  message: string;
  count: number;
}

// GET /api/contacts/:id - Get Single Contact
export interface GetContactParams {
  id: ObjectId;
}

export interface GetContactResponse {
  success: boolean;
  data: Contact;
}

// PUT /api/contacts/:id - Update Contact
// PATCH /api/contacts/:id - Update Contact (same as PUT)
export interface UpdateContactParams {
  id: ObjectId;
}

export type UpdateContactRequest = Partial<CreateContactRequest>;

export interface UpdateContactResponse {
  success: boolean;
  message: string;
  data: Contact;
}

// DELETE /api/contacts/:id - Delete Contact
export interface DeleteContactParams {
  id: ObjectId;
}

export interface DeleteContactResponse {
  success: boolean;
  message: string;
}

// POST /api/contacts/:id/link-case - Link Contact to Case
export interface LinkContactToCaseParams {
  id: ObjectId;
}

export interface LinkContactToCaseRequest {
  caseId: ObjectId;
  role?: string;
}

export interface LinkContactToCaseResponse {
  success: boolean;
  message: string;
  data: Contact;
}

// DELETE /api/contacts/:id/unlink-case/:caseId - Unlink Contact from Case
// POST /api/contacts/:id/unlink-case - Unlink Contact from Case (legacy)
export interface UnlinkContactFromCaseParams {
  id: ObjectId;
  caseId?: ObjectId; // Optional for DELETE method
}

export interface UnlinkContactFromCaseRequest {
  caseId?: ObjectId; // For POST method (legacy)
}

export interface UnlinkContactFromCaseResponse {
  success: boolean;
  message: string;
  data: Contact;
}

// POST /api/contacts/:id/link-client - Link Contact to Client
export interface LinkContactToClientParams {
  id: ObjectId;
}

export interface LinkContactToClientRequest {
  clientId: ObjectId;
}

export interface LinkContactToClientResponse {
  success: boolean;
  message: string;
  data: Contact;
}

// DELETE /api/contacts/:id/unlink-client/:clientId - Unlink Contact from Client
// POST /api/contacts/:id/unlink-client - Unlink Contact from Client (legacy)
export interface UnlinkContactFromClientParams {
  id: ObjectId;
  clientId?: ObjectId; // Optional for DELETE method
}

export interface UnlinkContactFromClientRequest {
  clientId?: ObjectId; // For POST method (legacy)
}

export interface UnlinkContactFromClientResponse {
  success: boolean;
  message: string;
  data: Contact;
}

// ═══════════════════════════════════════════════════════════════
// ORGANIZATION MODULE (12 ENDPOINTS)
// ═══════════════════════════════════════════════════════════════

// POST /api/organizations - Create Organization
export interface CreateOrganizationRequest {
  legalName: string;
  legalNameAr?: string;
  tradeName?: string;
  tradeNameAr?: string;
  name?: string;
  nameAr?: string;
  type: OrganizationType;
  status?: OrganizationStatus;
  industry?: string;
  subIndustry?: string;
  size?: OrganizationSize;
  employeeCount?: number;
  commercialRegistration?: string;
  crIssueDate?: string;
  crExpiryDate?: string;
  crIssuingCity?: string;
  vatNumber?: string;
  unifiedNumber?: string;
  municipalLicense?: string;
  chamberMembership?: string;
  registrationNumber?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  address?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  nationalAddress?: any;
  poBox?: string;
  parentCompany?: string;
  subsidiaries?: string[];
  foundedDate?: string;
  capital?: number;
  annualRevenue?: number;
  creditLimit?: number;
  paymentTerms?: string;
  bankName?: string;
  iban?: string;
  accountHolderName?: string;
  swiftCode?: string;
  billingType?: string;
  preferredPaymentMethod?: string;
  billingCycle?: string;
  billingEmail?: string;
  billingContact?: ObjectId;
  conflictCheckStatus?: ConflictCheckStatus;
  conflictNotes?: string;
  conflictCheckDate?: string;
  conflictCheckedBy?: ObjectId;
  keyContacts?: Array<{
    contactId: ObjectId;
    role: string;
    isPrimary?: boolean;
  }>;
  tags?: string[];
  practiceAreas?: string[];
  notes?: string;
  description?: string;
}

export interface Organization {
  _id: ObjectId;
  firmId?: ObjectId;
  lawyerId: ObjectId;
  legalName: string;
  legalNameAr?: string;
  tradeName?: string;
  tradeNameAr?: string;
  name?: string;
  nameAr?: string;
  type: OrganizationType;
  status: OrganizationStatus;
  industry?: string;
  subIndustry?: string;
  size?: OrganizationSize;
  employeeCount?: number;
  commercialRegistration?: string;
  crIssueDate?: string;
  crExpiryDate?: string;
  crIssuingCity?: string;
  vatNumber?: string;
  unifiedNumber?: string;
  municipalLicense?: string;
  chamberMembership?: string;
  registrationNumber?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  address?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  nationalAddress?: any;
  poBox?: string;
  parentCompany?: string;
  subsidiaries?: string[];
  foundedDate?: string;
  capital?: number;
  annualRevenue?: number;
  creditLimit?: number;
  paymentTerms?: string;
  bankName?: string;
  iban?: string;
  accountHolderName?: string;
  swiftCode?: string;
  billingType?: string;
  preferredPaymentMethod?: string;
  billingCycle?: string;
  billingEmail?: string;
  billingContact?: ObjectId;
  conflictCheckStatus?: ConflictCheckStatus;
  conflictNotes?: string;
  conflictCheckDate?: string;
  conflictCheckedBy?: ObjectId;
  keyContacts?: Array<{
    contactId: ObjectId;
    role: string;
    isPrimary?: boolean;
  }>;
  linkedClients?: ObjectId[];
  linkedContacts?: ObjectId[];
  linkedCases?: ObjectId[];
  tags?: string[];
  practiceAreas?: string[];
  notes?: string;
  description?: string;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationResponse {
  success: boolean;
  message: string;
  data: Organization;
}

// GET /api/organizations - Get Organizations
export interface GetOrganizationsQuery {
  type?: OrganizationType;
  status?: OrganizationStatus;
  industry?: string;
  search?: string;
  conflictCheckStatus?: ConflictCheckStatus;
  tags?: string | string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type GetOrganizationsResponse = PaginatedResponse<Organization>;

// GET /api/organizations/search - Search Organizations (Autocomplete)
export interface SearchOrganizationsQuery {
  q: string;
  limit?: number;
}

export interface SearchOrganizationsResponse {
  success: boolean;
  data: Organization[];
  count: number;
}

// GET /api/organizations/client/:clientId - Get Organizations by Client
export interface GetOrganizationsByClientParams {
  clientId: ObjectId;
}

export interface GetOrganizationsByClientResponse {
  success: boolean;
  data: Organization[];
}

// DELETE /api/organizations/bulk - Bulk Delete Organizations
export interface BulkDeleteOrganizationsRequest {
  ids?: ObjectId[];
  organizationIds?: ObjectId[]; // Legacy support
}

export interface BulkDeleteOrganizationsResponse {
  success: boolean;
  message: string;
  count: number;
}

// GET /api/organizations/:id - Get Single Organization
export interface GetOrganizationParams {
  id: ObjectId;
}

export interface GetOrganizationResponse {
  success: boolean;
  data: Organization;
}

// PUT /api/organizations/:id - Update Organization
// PATCH /api/organizations/:id - Update Organization (same as PUT)
export interface UpdateOrganizationParams {
  id: ObjectId;
}

export type UpdateOrganizationRequest = Partial<CreateOrganizationRequest>;

export interface UpdateOrganizationResponse {
  success: boolean;
  message: string;
  data: Organization;
}

// DELETE /api/organizations/:id - Delete Organization
export interface DeleteOrganizationParams {
  id: ObjectId;
}

export interface DeleteOrganizationResponse {
  success: boolean;
  message: string;
}

// POST /api/organizations/:id/link-case - Link Organization to Case
export interface LinkOrganizationToCaseParams {
  id: ObjectId;
}

export interface LinkOrganizationToCaseRequest {
  caseId: ObjectId;
}

export interface LinkOrganizationToCaseResponse {
  success: boolean;
  message: string;
  data: Organization;
}

// POST /api/organizations/:id/link-client - Link Organization to Client
export interface LinkOrganizationToClientParams {
  id: ObjectId;
}

export interface LinkOrganizationToClientRequest {
  clientId: ObjectId;
}

export interface LinkOrganizationToClientResponse {
  success: boolean;
  message: string;
  data: Organization;
}

// POST /api/organizations/:id/link-contact - Link Organization to Contact
export interface LinkOrganizationToContactParams {
  id: ObjectId;
}

export interface LinkOrganizationToContactRequest {
  contactId: ObjectId;
}

export interface LinkOrganizationToContactResponse {
  success: boolean;
  message: string;
  data: Organization;
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE MODULE (14 ENDPOINTS)
// ═══════════════════════════════════════════════════════════════

// POST /api/crm-pipelines - Create Pipeline
export interface CreatePipelineRequest {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  type?: PipelineType;
  category?: PipelineCategory;
  icon?: string;
  color?: string;
  stages?: Array<{
    name: string;
    nameAr?: string;
    color?: string;
    order: number;
    probability?: number;
    isWonStage?: boolean;
    isLostStage?: boolean;
    autoActions?: any[];
    requirements?: any[];
  }>;
  settings?: {
    allowSkipStages?: boolean;
    requireReasonForLost?: boolean;
    autoArchiveLostDays?: number;
    autoArchiveWonDays?: number;
    enableProbability?: boolean;
    enableValue?: boolean;
    defaultCurrency?: string;
  };
  isActive?: boolean;
}

export interface Pipeline {
  _id: ObjectId;
  pipelineId: string;
  lawyerId: ObjectId;
  firmId?: ObjectId;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  color?: string;
  type: PipelineType;
  category: PipelineCategory;
  stages: PipelineStage[];
  settings: {
    allowSkipStages: boolean;
    requireReasonForLost: boolean;
    autoArchiveLostDays: number;
    autoArchiveWonDays: number;
    enableProbability: boolean;
    enableValue: boolean;
    defaultCurrency: string;
  };
  stats: {
    totalLeads: number;
    activeLeads: number;
    wonLeads: number;
    lostLeads: number;
    totalValue: number;
    wonValue: number;
    avgConversionDays: number;
    conversionRate: number;
    lastUpdated?: string;
  };
  isDefault: boolean;
  isActive: boolean;
  isArchived: boolean;
  createdBy: ObjectId;
  lastModifiedBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelineResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// GET /api/crm-pipelines - Get Pipelines
export interface GetPipelinesQuery {
  type?: PipelineType;
  isActive?: 'true' | 'false';
}

export interface GetPipelinesResponse {
  success: boolean;
  data: Pipeline[];
}

// GET /api/crm-pipelines/:id - Get Single Pipeline
export interface GetPipelineParams {
  id: ObjectId;
}

export interface GetPipelineResponse {
  success: boolean;
  data: {
    pipeline: Pipeline;
    stageCounts: Record<string, number>;
  };
}

// PUT /api/crm-pipelines/:id - Update Pipeline
export interface UpdatePipelineParams {
  id: ObjectId;
}

export interface UpdatePipelineRequest {
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  color?: string;
  settings?: Partial<Pipeline['settings']>;
  isActive?: boolean;
}

export interface UpdatePipelineResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// DELETE /api/crm-pipelines/:id - Delete Pipeline
export interface DeletePipelineParams {
  id: ObjectId;
}

export interface DeletePipelineResponse {
  success: boolean;
  message: string;
}

// POST /api/crm-pipelines/:id/stages - Add Stage to Pipeline
export interface AddStageParams {
  id: ObjectId;
}

export interface AddStageRequest {
  name: string;
  nameAr?: string;
  color?: string;
  order?: number;
  probability?: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
  autoActions?: any[];
  requirements?: any[];
}

export interface AddStageResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// PUT /api/crm-pipelines/:id/stages/:stageId - Update Stage
export interface UpdateStageParams {
  id: ObjectId;
  stageId: string;
}

export interface UpdateStageRequest {
  name?: string;
  nameAr?: string;
  color?: string;
  probability?: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
  autoActions?: any[];
  requirements?: any[];
}

export interface UpdateStageResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// DELETE /api/crm-pipelines/:id/stages/:stageId - Remove Stage
export interface RemoveStageParams {
  id: ObjectId;
  stageId: string;
}

export interface RemoveStageResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// POST /api/crm-pipelines/:id/stages/reorder - Reorder Stages
export interface ReorderStagesParams {
  id: ObjectId;
}

export interface ReorderStagesRequest {
  stageOrders: Array<{
    stageId: string;
    order: number;
  }>;
}

export interface ReorderStagesResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// GET /api/crm-pipelines/:id/stats - Get Pipeline Statistics
export interface GetPipelineStatsParams {
  id: ObjectId;
}

export interface GetPipelineStatsResponse {
  success: boolean;
  data: {
    pipeline: Pipeline;
    stageStats: Array<{
      stageId: string;
      stageName: string;
      stageNameAr?: string;
      color: string;
      count: number;
      totalValue: number;
    }>;
  };
}

// POST /api/crm-pipelines/:id/default - Set Default Pipeline
export interface SetDefaultPipelineParams {
  id: ObjectId;
}

export interface SetDefaultPipelineResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// POST /api/crm-pipelines/:id/duplicate - Duplicate Pipeline
export interface DuplicatePipelineParams {
  id: ObjectId;
}

export interface DuplicatePipelineRequest {
  name?: string;
  nameAr?: string;
}

export interface DuplicatePipelineResponse {
  success: boolean;
  message: string;
  data: Pipeline;
}

// ═══════════════════════════════════════════════════════════════
// CRM ACTIVITY MODULE (15 ENDPOINTS)
// ═══════════════════════════════════════════════════════════════

// POST /api/crm-activities - Create Activity
export interface CreateActivityRequest {
  type: ActivityType;
  subType?: string;
  entityType: ActivityEntityType;
  entityId: ObjectId;
  entityName?: string;
  secondaryEntityType?: ActivityEntityType;
  secondaryEntityId?: ObjectId;
  secondaryEntityName?: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  emailData?: {
    messageId?: string;
    threadId?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    bodyPreview?: string;
    hasAttachments?: boolean;
    attachmentCount?: number;
    isIncoming?: boolean;
  };
  callData?: {
    direction: CallDirection;
    phoneNumber?: string;
    duration?: number;
    startedAt?: string;
    endedAt?: string;
    outcome?: string;
    recordingUrl?: string;
    transcription?: string;
    callNotes?: string;
  };
  meetingData?: {
    meetingType?: MeetingType;
    location?: string;
    locationAr?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    actualStart?: string;
    actualEnd?: string;
    actualDuration?: number;
    outcome?: string;
    meetingUrl?: string;
    agenda?: string;
    summary?: string;
    nextSteps?: string;
    participants?: Array<{
      type: 'user' | 'contact' | 'client' | 'lead';
      entityId: ObjectId;
      name?: string;
      email?: string;
      phone?: string;
      attended?: boolean;
    }>;
  };
  taskData?: {
    dueDate?: string;
    priority?: TaskPriority;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    completedAt?: string;
    completedBy?: ObjectId;
    reminderDate?: string;
    reminderSent?: boolean;
  };
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
  performedBy?: ObjectId;
  assignedTo?: ObjectId;
  attachments?: any[];
  status?: ActivityStatus;
  outcome?: string;
  outcomeNotes?: string;
  isPrivate?: boolean;
  visibleTo?: ObjectId[];
  tags?: string[];
  source?: string;
  externalId?: string;
  metadata?: any;
}

export interface CrmActivity {
  _id: ObjectId;
  activityId: string;
  lawyerId: ObjectId;
  firmId?: ObjectId;
  type: ActivityType;
  subType?: string;
  entityType: ActivityEntityType;
  entityId: ObjectId;
  entityName?: string;
  secondaryEntityType?: ActivityEntityType;
  secondaryEntityId?: ObjectId;
  secondaryEntityName?: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  emailData?: any;
  callData?: any;
  meetingData?: any;
  taskData?: any;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
  performedBy: ObjectId | UserReference;
  assignedTo?: ObjectId | UserReference;
  attachments?: any[];
  status: ActivityStatus;
  outcome?: string;
  outcomeNotes?: string;
  isPrivate?: boolean;
  visibleTo?: ObjectId[];
  tags?: string[];
  source?: string;
  externalId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// GET /api/crm-activities - Get Activities
export interface GetActivitiesQuery {
  type?: ActivityType;
  entityType?: ActivityEntityType;
  entityId?: ObjectId;
  performedBy?: ObjectId;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export type GetActivitiesResponse = PaginatedResponse<CrmActivity>;

// GET /api/crm-activities/timeline - Get Activity Timeline
export interface GetTimelineQuery {
  entityTypes?: string; // Comma-separated list
  types?: string; // Comma-separated list
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface GetTimelineResponse {
  success: boolean;
  data: CrmActivity[];
}

// GET /api/crm-activities/stats - Get Activity Statistics
export interface GetActivityStatsQuery {
  startDate?: string;
  endDate?: string;
}

export interface GetActivityStatsResponse {
  success: boolean;
  data: any; // Stats object structure depends on implementation
}

// GET /api/crm-activities/tasks/upcoming - Get Upcoming Tasks
export interface GetUpcomingTasksQuery {
  assignedTo?: ObjectId;
  endDate?: string;
  limit?: number;
}

export interface GetUpcomingTasksResponse {
  success: boolean;
  data: CrmActivity[];
}

// POST /api/crm-activities/log/call - Log a Call
export interface LogCallRequest {
  entityType: ActivityEntityType;
  entityId: ObjectId;
  entityName?: string;
  direction: CallDirection;
  phoneNumber?: string;
  duration?: number;
  outcome?: string;
  notes?: string;
}

export interface LogCallResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// POST /api/crm-activities/log/email - Log an Email
export interface LogEmailRequest {
  entityType: ActivityEntityType;
  entityId: ObjectId;
  entityName?: string;
  subject?: string;
  from?: string;
  to?: string | string[];
  cc?: string | string[];
  bodyPreview?: string;
  isIncoming?: boolean;
}

export interface LogEmailResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// POST /api/crm-activities/log/meeting - Log a Meeting
export interface LogMeetingRequest {
  entityType: ActivityEntityType;
  entityId: ObjectId;
  entityName?: string;
  meetingType?: MeetingType;
  location?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  agenda?: string;
  summary?: string;
  nextSteps?: string;
  participants?: any[];
  outcome?: string;
}

export interface LogMeetingResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// POST /api/crm-activities/log/note - Add a Note
export interface AddNoteRequest {
  entityType: ActivityEntityType;
  entityId: ObjectId;
  entityName?: string;
  title?: string;
  content?: string;
  isPrivate?: boolean;
  tags?: string[];
}

export interface AddNoteResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// GET /api/crm-activities/entity/:entityType/:entityId - Get Entity Activities
export interface GetEntityActivitiesParams {
  entityType: ActivityEntityType;
  entityId: ObjectId;
}

export interface GetEntityActivitiesQuery {
  type?: ActivityType;
  page?: number;
  limit?: number;
}

export type GetEntityActivitiesResponse = PaginatedResponse<CrmActivity>;

// GET /api/crm-activities/:id - Get Single Activity
export interface GetActivityParams {
  id: ObjectId;
}

export interface GetActivityResponse {
  success: boolean;
  data: CrmActivity;
}

// PUT /api/crm-activities/:id - Update Activity
export interface UpdateActivityParams {
  id: ObjectId;
}

export type UpdateActivityRequest = Partial<CreateActivityRequest>;

export interface UpdateActivityResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// DELETE /api/crm-activities/:id - Delete Activity
export interface DeleteActivityParams {
  id: ObjectId;
}

export interface DeleteActivityResponse {
  success: boolean;
  message: string;
}

// POST /api/crm-activities/:id/complete - Complete Task
export interface CompleteTaskParams {
  id: ObjectId;
}

export interface CompleteTaskRequest {
  outcomeNotes?: string;
}

export interface CompleteTaskResponse {
  success: boolean;
  message: string;
  data: CrmActivity;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * TOTAL ENDPOINTS DOCUMENTED: 78
 *
 * BREAKDOWN BY MODULE:
 * - Lead Module: 21 endpoints
 * - Contact Module: 16 endpoints
 * - Organization Module: 12 endpoints
 * - Pipeline Module: 14 endpoints
 * - CRM Activity Module: 15 endpoints
 *
 * USAGE:
 *
 * import {
 *   Lead,
 *   CreateLeadRequest,
 *   CreateLeadResponse,
 *   GetLeadsQuery,
 *   GetLeadsResponse,
 *   // ... other types
 * } from './types/crm';
 *
 * // Example: Type-safe API call
 * const createLead = async (data: CreateLeadRequest): Promise<CreateLeadResponse> => {
 *   const response = await fetch('/api/leads', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(data)
 *   });
 *   return response.json();
 * };
 */
