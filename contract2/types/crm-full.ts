/**
 * CRM Full API Contracts
 *
 * CRM modules: lead, lead-scoring, lead-conversion, lead-source, contact, followup,
 * activity, crm-activity, competitor, organization, lost-reason, campaign, referral, cycle, view
 *
 * Total: ~195 endpoints
 * @module CRMFull
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD MODULE (21 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Lead {
  export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  export type LeadSource = 'website' | 'referral' | 'social_media' | 'advertisement' | 'cold_call' | 'event' | 'other';
  export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

  export interface LeadRecord {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    status: LeadStatus;
    source: LeadSource;
    priority: LeadPriority;
    pipelineId?: string;
    stageId?: string;
    score?: number;
    estimatedValue?: number;
    assignedTo?: string;
    tags?: string[];
    nationalId?: string;
    crNumber?: string;
    iqamaNumber?: string;
    nationalAddress?: NationalAddress;
    isVerified: boolean;
    verificationSource?: string;
    verifiedAt?: string;
    verificationData?: Record<string, unknown>;
    conflictCheckStatus?: 'pending' | 'clear' | 'potential_conflict';
    conflictCheckDate?: string;
    conflictNotes?: string;
    lastContactDate?: string;
    nextFollowUpDate?: string;
    conversionDate?: string;
    convertedClientId?: string;
    lostReason?: string;
    notes?: string;
    customFields?: Record<string, unknown>;
    firmId?: string;
    lawyerId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface NationalAddress {
    shortAddress?: string;
    buildingNumber?: string;
    streetName?: string;
    districtName?: string;
    cityName?: string;
    postalCode?: string;
    isVerified?: boolean;
    verifiedAt?: string;
  }

  export interface LeadActivity {
    _id: string;
    leadId: string;
    type: 'call' | 'email' | 'meeting' | 'note' | 'task';
    subject: string;
    description?: string;
    date: string;
    duration?: number;
    outcome?: string;
    nextAction?: string;
    createdBy: string;
    createdAt: string;
  }

  export interface LeadStats {
    total: number;
    byStatus: Record<LeadStatus, number>;
    bySource: Record<LeadSource, number>;
    conversionRate: number;
    averageValue: number;
    totalPipelineValue: number;
    needingFollowUp: number;
  }

  export interface CRMOverview {
    leads: LeadRecord[];
    stats: LeadStats;
    recentActivities: LeadActivity[];
    topLeads: LeadRecord[];
    pipelineValue: number;
  }

  export interface CreateLeadRequest {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    source: LeadSource;
    priority?: LeadPriority;
    estimatedValue?: number;
    assignedTo?: string;
    tags?: string[];
    notes?: string;
    customFields?: Record<string, unknown>;
  }

  export interface UpdateLeadRequest {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    priority?: LeadPriority;
    estimatedValue?: number;
    assignedTo?: string;
    tags?: string[];
    notes?: string;
    customFields?: Record<string, unknown>;
  }

  export interface ConvertToClientRequest {
    createCase?: boolean;
    caseDetails?: {
      title: string;
      category: string;
      description?: string;
    };
  }

  export interface LogActivityRequest {
    type: 'call' | 'email' | 'meeting' | 'note' | 'task';
    subject: string;
    description?: string;
    date?: string;
    duration?: number;
    outcome?: string;
    nextAction?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }
  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }

  // API ENDPOINTS (21)
  /** GET /api/lead/overview - Get CRM overview with stats */
  /** POST /api/lead/bulk-delete - Bulk delete leads */
  /** POST /api/lead - Create lead */
  /** GET /api/lead - Get leads */
  /** GET /api/lead/stats - Get lead statistics */
  /** GET /api/lead/follow-up - Get leads needing follow-up */
  /** GET /api/lead/pipeline/:pipelineId? - Get leads by pipeline */
  /** GET /api/lead/:id - Get lead by ID */
  /** PUT /api/lead/:id - Update lead */
  /** DELETE /api/lead/:id - Delete lead */
  /** POST /api/lead/:id/status - Update lead status */
  /** POST /api/lead/:id/move - Move to stage */
  /** GET /api/lead/:id/conversion-preview - Preview conversion */
  /** POST /api/lead/:id/convert - Convert to client */
  /** GET /api/lead/:id/activities - Get activities */
  /** POST /api/lead/:id/activities - Log activity */
  /** POST /api/lead/:id/follow-up - Schedule follow-up */
  /** POST /api/lead/:id/verify/wathq - Verify via Wathq */
  /** POST /api/lead/:id/verify/absher - Verify via Absher */
  /** POST /api/lead/:id/verify/address - Verify address */
  /** POST /api/lead/:id/conflict-check - Run conflict check */
}


// ═══════════════════════════════════════════════════════════════════════════════
// LEAD SCORING MODULE (19 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace LeadScoring {
  export interface ScoringRule {
    _id: string;
    name: string;
    description?: string;
    conditions: ScoringCondition[];
    points: number;
    isActive: boolean;
    category: 'demographic' | 'behavioral' | 'engagement' | 'fit';
    firmId?: string;
    createdAt: string;
  }

  export interface ScoringCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: unknown;
  }

  export interface LeadScore {
    leadId: string;
    totalScore: number;
    scoreBreakdown: { ruleId: string; ruleName: string; points: number }[];
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    lastCalculatedAt: string;
    history: ScoreHistory[];
  }

  export interface ScoreHistory {
    score: number;
    grade: string;
    calculatedAt: string;
    trigger: 'manual' | 'auto' | 'rule_change';
  }

  export interface ScoringModel {
    _id: string;
    name: string;
    rules: string[];
    gradeThresholds: { grade: string; minScore: number }[];
    isDefault: boolean;
    firmId?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (19)
  /** POST /api/lead-scoring/calculate/:leadId - Calculate score for lead */
  /** POST /api/lead-scoring/calculate-all - Calculate scores for all leads */
  /** POST /api/lead-scoring/calculate-batch - Batch calculate scores */
  /** GET /api/lead-scoring/scores - Get all scores */
  /** GET /api/lead-scoring/scores/:leadId - Get score for lead */
  /** GET /api/lead-scoring/scores/top - Get top scored leads */
  /** GET /api/lead-scoring/rules - Get scoring rules */
  /** POST /api/lead-scoring/rules - Create rule */
  /** GET /api/lead-scoring/rules/:id - Get rule */
  /** PUT /api/lead-scoring/rules/:id - Update rule */
  /** DELETE /api/lead-scoring/rules/:id - Delete rule */
  /** POST /api/lead-scoring/rules/:id/toggle - Toggle rule active */
  /** GET /api/lead-scoring/models - Get scoring models */
  /** POST /api/lead-scoring/models - Create model */
  /** GET /api/lead-scoring/models/:id - Get model */
  /** PUT /api/lead-scoring/models/:id - Update model */
  /** DELETE /api/lead-scoring/models/:id - Delete model */
  /** POST /api/lead-scoring/models/:id/default - Set as default */
  /** GET /api/lead-scoring/report - Get scoring report */
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT MODULE (17 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Contact {
  export interface ContactRecord {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    mobile?: string;
    title?: string;
    department?: string;
    clientId?: string;
    organizationId?: string;
    isPrimary: boolean;
    address?: ContactAddress;
    socialProfiles?: { platform: string; url: string }[];
    tags?: string[];
    notes?: string;
    lastContactDate?: string;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ContactAddress {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }

  export interface CreateContactRequest {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    mobile?: string;
    title?: string;
    department?: string;
    clientId?: string;
    organizationId?: string;
    isPrimary?: boolean;
    address?: ContactAddress;
    tags?: string[];
    notes?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (17)
  /** GET /api/contact/search - Search contacts */
  /** GET /api/contact/case/:caseId - Get contacts by case */
  /** GET /api/contact/client/:clientId - Get contacts by client */
  /** GET /api/contact/organization/:orgId - Get contacts by organization */
  /** GET /api/contact - Get contacts */
  /** POST /api/contact - Create contact */
  /** GET /api/contact/:id - Get contact */
  /** PUT /api/contact/:id - Update contact */
  /** DELETE /api/contact/:id - Delete contact */
  /** POST /api/contact/:id/primary - Set as primary */
  /** POST /api/contact/:id/link - Link to entity */
  /** DELETE /api/contact/:id/link/:entityId - Unlink from entity */
  /** GET /api/contact/stats - Get contact stats */
  /** POST /api/contact/merge - Merge contacts */
  /** POST /api/contact/bulk-delete - Bulk delete */
  /** GET /api/contact/export - Export contacts */
  /** POST /api/contact/import - Import contacts */
}


// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOWUP MODULE (16 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Followup {
  export type FollowupType = 'call' | 'email' | 'meeting' | 'task' | 'reminder';
  export type FollowupStatus = 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  export type FollowupPriority = 'low' | 'medium' | 'high' | 'urgent';

  export interface FollowupRecord {
    _id: string;
    type: FollowupType;
    subject: string;
    description?: string;
    dueDate: string;
    dueTime?: string;
    status: FollowupStatus;
    priority: FollowupPriority;
    entityType: 'lead' | 'client' | 'case' | 'contact';
    entityId: string;
    assignedTo: string;
    completedAt?: string;
    completedBy?: string;
    outcome?: string;
    nextFollowupId?: string;
    reminders: FollowupReminder[];
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface FollowupReminder {
    _id: string;
    time: string;
    method: 'email' | 'push' | 'sms';
    sent: boolean;
    sentAt?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (16)
  /** GET /api/followup/upcoming - Get upcoming follow-ups */
  /** GET /api/followup/overdue - Get overdue follow-ups */
  /** GET /api/followup/today - Get today's follow-ups */
  /** GET /api/followup/calendar - Get follow-up calendar */
  /** GET /api/followup/stats - Get follow-up stats */
  /** GET /api/followup - Get follow-ups */
  /** POST /api/followup - Create follow-up */
  /** GET /api/followup/:id - Get follow-up */
  /** PUT /api/followup/:id - Update follow-up */
  /** DELETE /api/followup/:id - Delete follow-up */
  /** POST /api/followup/:id/complete - Mark complete */
  /** POST /api/followup/:id/reschedule - Reschedule */
  /** POST /api/followup/:id/snooze - Snooze */
  /** POST /api/followup/bulk-complete - Bulk complete */
  /** POST /api/followup/bulk-delete - Bulk delete */
  /** GET /api/followup/entity/:type/:id - Get by entity */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY MODULE (18 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Activity {
  export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change' | 'deal_update';

  export interface ActivityRecord {
    _id: string;
    type: ActivityType;
    subject: string;
    description?: string;
    entityType: 'lead' | 'client' | 'case' | 'contact' | 'deal';
    entityId: string;
    relatedEntities?: { type: string; id: string }[];
    metadata?: Record<string, unknown>;
    date: string;
    duration?: number;
    outcome?: string;
    performedBy: string;
    firmId?: string;
    createdAt: string;
  }

  export interface ActivitySummary {
    total: number;
    byType: Record<ActivityType, number>;
    byUser: { userId: string; count: number }[];
    byEntity: Record<string, number>;
    timeline: { date: string; count: number }[];
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (18)
  /** GET /api/activity/summary - Get activity summary */
  /** GET /api/activity/overview - Get activity overview */
  /** GET /api/activity/entity/:entityType/:entityId - Get by entity */
  /** GET /api/activity/user/:userId - Get by user */
  /** GET /api/activity/timeline - Get activity timeline */
  /** GET /api/activity/recent - Get recent activities */
  /** GET /api/activity - Get activities */
  /** POST /api/activity - Log activity */
  /** GET /api/activity/:id - Get activity */
  /** PUT /api/activity/:id - Update activity */
  /** DELETE /api/activity/:id - Delete activity */
  /** GET /api/activity/stats - Get activity stats */
  /** GET /api/activity/report/daily - Daily report */
  /** GET /api/activity/report/weekly - Weekly report */
  /** GET /api/activity/report/by-user - By user report */
  /** GET /api/activity/report/by-type - By type report */
  /** POST /api/activity/bulk-delete - Bulk delete */
  /** GET /api/activity/export - Export activities */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL CRM MODULES (Condensed)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace CRMActivity {
  export interface CRMActivityRecord {
    _id: string;
    type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal';
    entityType: string;
    entityId: string;
    subject: string;
    notes?: string;
    outcome?: string;
    nextSteps?: string;
    date: string;
    duration?: number;
    participants?: string[];
    firmId?: string;
    createdBy: string;
    createdAt: string;
  }
  // 14 endpoints: timeline, stats, upcoming tasks, CRUD
}

export namespace Competitor {
  export interface CompetitorRecord {
    _id: string;
    name: string;
    website?: string;
    description?: string;
    strengths?: string[];
    weaknesses?: string[];
    pricing?: string;
    marketShare?: number;
    dealsLostTo: number;
    totalDealsCompeted: number;
    notes?: string;
    firmId?: string;
    createdAt: string;
  }
  // 13 endpoints: CRUD, top-losses, by-deal
}

export namespace Organization {
  export interface OrganizationRecord {
    _id: string;
    name: string;
    industry?: string;
    size?: 'small' | 'medium' | 'large' | 'enterprise';
    website?: string;
    phone?: string;
    address?: { street?: string; city?: string; country?: string };
    contacts: string[];
    parentOrganizationId?: string;
    childOrganizations?: string[];
    annualRevenue?: number;
    employeeCount?: number;
    tags?: string[];
    firmId?: string;
    createdAt: string;
  }
  // 13 endpoints: search, by-client, hierarchy, CRUD
}

export namespace LostReason {
  export interface LostReasonRecord {
    _id: string;
    name: string;
    nameAr?: string;
    category: 'price' | 'competitor' | 'timing' | 'fit' | 'budget' | 'other';
    description?: string;
    usageCount: number;
    isActive: boolean;
    firmId?: string;
    createdAt: string;
  }
  // 14 endpoints: CRUD, categories, stats, by-category
}

export namespace LeadConversion {
  export interface ConversionRecord {
    _id: string;
    leadId: string;
    clientId: string;
    caseId?: string;
    conversionDate: string;
    value?: number;
    notes?: string;
    convertedBy: string;
    firmId?: string;
  }
  // 6 endpoints: convert, cases, stage update
}

export namespace LeadSource {
  export interface LeadSourceRecord {
    _id: string;
    name: string;
    nameAr?: string;
    description?: string;
    cost?: number;
    leadsGenerated: number;
    conversions: number;
    conversionRate: number;
    roi?: number;
    isActive: boolean;
    firmId?: string;
    createdAt: string;
  }
  // 6 endpoints: CRUD, stats
}

export namespace Campaign {
  export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  export type CampaignType = 'email' | 'social' | 'event' | 'referral' | 'content' | 'paid_ads';

  export interface CampaignRecord {
    _id: string;
    name: string;
    type: CampaignType;
    status: CampaignStatus;
    startDate: string;
    endDate?: string;
    budget?: number;
    spent?: number;
    targetAudience?: string;
    goals?: string[];
    metrics: CampaignMetrics;
    firmId?: string;
    createdBy: string;
    createdAt: string;
  }

  export interface CampaignMetrics {
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpl: number;
    roi: number;
  }
  // 12 endpoints: CRUD, stats, metrics, by-type
}

export namespace Referral {
  export interface ReferralRecord {
    _id: string;
    referrerType: 'client' | 'contact' | 'partner' | 'employee';
    referrerId: string;
    referredLeadId: string;
    referredClientId?: string;
    status: 'pending' | 'converted' | 'lost';
    value?: number;
    commission?: number;
    commissionPaid: boolean;
    paidAt?: string;
    notes?: string;
    firmId?: string;
    createdAt: string;
  }
  // 11 endpoints: stats, top referrers, CRUD, mark-paid
}

export namespace Cycle {
  export type CycleStatus = 'planning' | 'active' | 'review' | 'completed';

  export interface CycleRecord {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: CycleStatus;
    goals: CycleGoal[];
    metrics?: CycleMetrics;
    firmId?: string;
    createdAt: string;
  }

  export interface CycleGoal {
    name: string;
    target: number;
    actual: number;
    unit: string;
  }

  export interface CycleMetrics {
    totalRevenue: number;
    newClients: number;
    dealsWon: number;
    conversionRate: number;
  }
  // 11 endpoints: active, stats, CRUD, complete
}

export namespace View {
  export interface ViewRecord {
    _id: string;
    name: string;
    entityType: 'lead' | 'client' | 'case' | 'task' | 'invoice';
    filters: ViewFilter[];
    columns: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDefault: boolean;
    isShared: boolean;
    sharedWith?: string[];
    userId: string;
    firmId?: string;
    createdAt: string;
  }

  export interface ViewFilter {
    field: string;
    operator: string;
    value: unknown;
  }
  // 11 endpoints: CRUD, share, set-default, by-entity
}


/**
 * CRM FULL API CONTRACTS SUMMARY
 *
 * Total Modules: 15
 * Total Endpoints: ~195
 *
 * Breakdown:
 * - Lead: 21 endpoints
 * - LeadScoring: 19 endpoints
 * - Activity: 18 endpoints
 * - Contact: 17 endpoints
 * - Followup: 16 endpoints
 * - CRMActivity: 14 endpoints
 * - LostReason: 14 endpoints
 * - Competitor: 13 endpoints
 * - Organization: 13 endpoints
 * - Campaign: 12 endpoints
 * - Referral: 11 endpoints
 * - Cycle: 11 endpoints
 * - View: 11 endpoints
 * - LeadConversion: 6 endpoints
 * - LeadSource: 6 endpoints
 */
