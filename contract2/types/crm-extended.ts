/**
 * CRM Extended API Contracts
 *
 * Comprehensive TypeScript type definitions for 21 CRM/SALES modules
 * Total Endpoints: 228
 *
 * Modules:
 * - Activity Plan
 * - CRM Pipeline
 * - CRM Reports
 * - CRM Settings
 * - CRM Transaction
 * - Chatter Follower
 * - Churn Management
 * - Sales Order
 * - Sales Forecast
 * - Sales Person
 * - Sales Quota
 * - Sales Stage
 * - Sales Team
 * - Price Level
 * - Deal Health
 * - Deal Room
 * - Deduplication
 * - Lifecycle Workflow
 * - Playbook
 * - Territory
 * - Brokers
 */

import { ObjectId } from 'mongodb';

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
    totalPages: number;
    pages?: number;
  };
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

// ═══════════════════════════════════════════════════════════════
// 1. ACTIVITY PLAN (6 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace ActivityPlan {
  export interface ActivityPlan {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    entityType: 'lead' | 'client' | 'opportunity' | 'case';
    activities: Activity[];
    isActive: boolean;
    isDefault: boolean;
    firmId: ObjectId;
    lawyerId?: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Activity {
    type: 'task' | 'call' | 'email' | 'meeting';
    subject: string;
    description?: string;
    daysOffset: number;
    duration?: number;
    priority?: 'low' | 'medium' | 'high';
    assignTo?: 'owner' | 'specific';
    assignedUserId?: ObjectId;
  }

  export interface CreateRequest {
    name: string;
    nameAr?: string;
    description?: string;
    entityType: 'lead' | 'client' | 'opportunity' | 'case';
    activities: Activity[];
    isActive?: boolean;
    isDefault?: boolean;
  }

  export interface UpdateRequest extends Partial<CreateRequest> {}

  export interface GetAllQuery {
    entityType?: 'lead' | 'client' | 'opportunity' | 'case';
    isActive?: string;
    search?: string;
    page?: number;
    limit?: number;
  }

  /**
   * POST /api/activity-plans
   * Create a new activity plan
   */
  export interface CreateActivityPlan {
    request: CreateRequest;
    response: ApiResponse<ActivityPlan>;
  }

  /**
   * GET /api/activity-plans
   * Get all activity plans with filters
   */
  export interface GetActivityPlans {
    query: GetAllQuery;
    response: PaginatedResponse<ActivityPlan>;
  }

  /**
   * GET /api/activity-plans/:id
   * Get single activity plan by ID
   */
  export interface GetActivityPlan {
    params: { id: string };
    response: ApiResponse<ActivityPlan>;
  }

  /**
   * PUT /api/activity-plans/:id
   * Update activity plan
   */
  export interface UpdateActivityPlan {
    params: { id: string };
    request: UpdateRequest;
    response: ApiResponse<ActivityPlan>;
  }

  /**
   * DELETE /api/activity-plans/:id
   * Delete activity plan
   */
  export interface DeleteActivityPlan {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/activity-plans/:id/duplicate
   * Duplicate an activity plan
   */
  export interface DuplicateActivityPlan {
    params: { id: string };
    request: { name?: string };
    response: ApiResponse<ActivityPlan>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. CRM PIPELINE (13 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace CrmPipeline {
  export interface Pipeline {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    pipelineId: string;
    stages: Stage[];
    isDefault: boolean;
    isActive: boolean;
    entityType: 'lead' | 'opportunity' | 'case';
    automations?: Automation[];
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Stage {
    _id?: ObjectId;
    name: string;
    nameAr?: string;
    order: number;
    probability?: number;
    isFinal?: boolean;
    isWon?: boolean;
    color?: string;
    requirements?: string[];
  }

  export interface Automation {
    trigger: string;
    action: string;
    config?: any;
  }

  export interface CreateRequest {
    name: string;
    nameAr?: string;
    description?: string;
    entityType: 'lead' | 'opportunity' | 'case';
    stages?: Stage[];
    isDefault?: boolean;
    automations?: Automation[];
  }

  export interface UpdateRequest extends Partial<CreateRequest> {}

  export interface StageRequest {
    name: string;
    nameAr?: string;
    order?: number;
    probability?: number;
    isFinal?: boolean;
    isWon?: boolean;
    color?: string;
    requirements?: string[];
  }

  export interface ReorderRequest {
    stages: Array<{ _id: string; order: number }>;
  }

  export interface PipelineStats {
    totalDeals: number;
    totalValue: number;
    stageBreakdown: Array<{
      stageId: ObjectId;
      stageName: string;
      count: number;
      value: number;
    }>;
    conversionRates: Record<string, number>;
  }

  /**
   * POST /api/pipelines
   * Create a new pipeline
   */
  export interface CreatePipeline {
    request: CreateRequest;
    response: ApiResponse<Pipeline>;
  }

  /**
   * GET /api/pipelines
   * Get all pipelines
   */
  export interface GetPipelines {
    query: {
      entityType?: string;
      isActive?: string;
      search?: string;
    };
    response: ApiResponse<Pipeline[]>;
  }

  /**
   * GET /api/pipelines/:id
   * Get single pipeline
   */
  export interface GetPipeline {
    params: { id: string };
    response: ApiResponse<Pipeline>;
  }

  /**
   * PUT /api/pipelines/:id
   * Update pipeline
   */
  export interface UpdatePipeline {
    params: { id: string };
    request: UpdateRequest;
    response: ApiResponse<Pipeline>;
  }

  /**
   * DELETE /api/pipelines/:id
   * Delete pipeline
   */
  export interface DeletePipeline {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/pipelines/:id/stages
   * Add stage to pipeline
   */
  export interface AddStage {
    params: { id: string };
    request: StageRequest;
    response: ApiResponse<Pipeline>;
  }

  /**
   * PUT /api/pipelines/:id/stages/:stageId
   * Update stage in pipeline
   */
  export interface UpdateStage {
    params: { id: string; stageId: string };
    request: Partial<StageRequest>;
    response: ApiResponse<Pipeline>;
  }

  /**
   * DELETE /api/pipelines/:id/stages/:stageId
   * Remove stage from pipeline
   */
  export interface RemoveStage {
    params: { id: string; stageId: string };
    response: ApiResponse<Pipeline>;
  }

  /**
   * POST /api/pipelines/:id/reorder-stages
   * Reorder pipeline stages
   */
  export interface ReorderStages {
    params: { id: string };
    request: ReorderRequest;
    response: ApiResponse<Pipeline>;
  }

  /**
   * GET /api/pipelines/:id/stats
   * Get pipeline statistics
   */
  export interface GetStats {
    params: { id: string };
    query: DateRange;
    response: ApiResponse<PipelineStats>;
  }

  /**
   * POST /api/pipelines/:id/default
   * Set pipeline as default
   */
  export interface SetDefault {
    params: { id: string };
    response: ApiResponse<Pipeline>;
  }

  /**
   * POST /api/pipelines/:id/duplicate
   * Duplicate pipeline
   */
  export interface DuplicatePipeline {
    params: { id: string };
    request: { name?: string };
    response: ApiResponse<Pipeline>;
  }

  /**
   * GET /api/pipelines/:id/performance
   * Get pipeline performance metrics
   */
  export interface GetPerformance {
    params: { id: string };
    query: DateRange;
    response: ApiResponse<{
      averageTimePerStage: Record<string, number>;
      conversionRates: Record<string, number>;
      bottlenecks: string[];
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. CRM REPORTS (27 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace CrmReports {
  /**
   * GET /api/crm-reports/campaign-efficiency
   * Campaign efficiency report
   */
  export interface GetCampaignEfficiency {
    query: DateRange & { campaignId?: string };
    response: ApiResponse<{
      campaigns: Array<{
        campaignId: ObjectId;
        campaignName: string;
        leadsGenerated: number;
        converted: number;
        conversionRate: number;
        costPerLead?: number;
        roi?: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/lead-owner-efficiency
   * Lead owner efficiency report
   */
  export interface GetLeadOwnerEfficiency {
    query: DateRange & { userId?: string };
    response: ApiResponse<{
      owners: Array<{
        userId: ObjectId;
        userName: string;
        totalLeads: number;
        qualified: number;
        converted: number;
        conversionRate: number;
        avgResponseTime: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/first-response-time
   * First response time analysis
   */
  export interface GetFirstResponseTime {
    query: DateRange;
    response: ApiResponse<{
      average: number;
      median: number;
      byOwner: Array<{
        userId: ObjectId;
        userName: string;
        avgResponseTime: number;
      }>;
      distribution: Record<string, number>;
    }>;
  }

  /**
   * GET /api/crm-reports/lost-opportunity
   * Lost opportunity analysis
   */
  export interface GetLostOpportunity {
    query: DateRange;
    response: ApiResponse<{
      totalLost: number;
      totalValue: number;
      lostReasons: Array<{
        reason: string;
        count: number;
        value: number;
      }>;
      byOwner: Array<{
        userId: ObjectId;
        userName: string;
        lostCount: number;
        lostValue: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/sales-pipeline
   * Sales pipeline report
   */
  export interface GetSalesPipeline {
    query: { pipelineId?: string } & DateRange;
    response: ApiResponse<{
      stages: Array<{
        stageId: ObjectId;
        stageName: string;
        count: number;
        value: number;
        avgAge: number;
      }>;
      totalValue: number;
      totalDeals: number;
    }>;
  }

  /**
   * GET /api/crm-reports/prospects-engaged
   * Prospects engagement report
   */
  export interface GetProspectsEngaged {
    query: DateRange;
    response: ApiResponse<{
      total: number;
      engaged: number;
      notEngaged: number;
      engagementRate: number;
      byChannel: Record<string, number>;
    }>;
  }

  /**
   * GET /api/crm-reports/lead-conversion-time
   * Lead conversion time analysis
   */
  export interface GetLeadConversionTime {
    query: DateRange;
    response: ApiResponse<{
      average: number;
      median: number;
      bySource: Record<string, number>;
      distribution: Array<{
        range: string;
        count: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/quick-stats
   * Quick stats dashboard
   */
  export interface GetQuickStats {
    query: DateRange;
    response: ApiResponse<{
      totalLeads: number;
      totalOpportunities: number;
      totalRevenue: number;
      conversionRate: number;
      avgDealSize: number;
      winRate: number;
    }>;
  }

  /**
   * GET /api/crm-reports/recent-activity
   * Recent activity feed
   */
  export interface GetRecentActivity {
    query: { limit?: number; userId?: string };
    response: ApiResponse<{
      activities: Array<{
        _id: ObjectId;
        type: string;
        entityType: string;
        entityId: ObjectId;
        description: string;
        performedBy: ObjectId;
        createdAt: Date;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/funnel-overview
   * Sales funnel overview
   */
  export interface GetFunnelOverview {
    query: DateRange & { pipelineId?: string };
    response: ApiResponse<{
      stages: Array<{
        stageName: string;
        count: number;
        value: number;
        conversionRate: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/funnel-velocity
   * Funnel velocity analysis
   */
  export interface GetFunnelVelocity {
    query: DateRange;
    response: ApiResponse<{
      avgTimeToClose: number;
      avgTimePerStage: Record<string, number>;
      velocity: number;
    }>;
  }

  /**
   * GET /api/crm-reports/funnel-bottlenecks
   * Identify funnel bottlenecks
   */
  export interface GetFunnelBottlenecks {
    query: DateRange;
    response: ApiResponse<{
      bottlenecks: Array<{
        stage: string;
        avgTime: number;
        stuck: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/aging-overview
   * Deals aging overview
   */
  export interface GetAgingOverview {
    query: DateRange;
    response: ApiResponse<{
      byAge: Array<{
        range: string;
        count: number;
        value: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/aging-by-stage
   * Aging breakdown by stage
   */
  export interface GetAgingByStage {
    query: DateRange;
    response: ApiResponse<{
      stages: Array<{
        stageName: string;
        avgAge: number;
        oldest: number;
        count: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/leads-source-overview
   * Lead source overview
   */
  export interface GetLeadsSourceOverview {
    query: DateRange;
    response: ApiResponse<{
      sources: Array<{
        source: string;
        count: number;
        converted: number;
        conversionRate: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/leads-source-trend
   * Lead source trend over time
   */
  export interface GetLeadsSourceTrend {
    query: DateRange & { groupBy?: 'day' | 'week' | 'month' };
    response: ApiResponse<{
      trend: Array<{
        period: string;
        sources: Record<string, number>;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/win-loss-overview
   * Win/loss overview
   */
  export interface GetWinLossOverview {
    query: DateRange;
    response: ApiResponse<{
      won: number;
      lost: number;
      winRate: number;
      wonValue: number;
      lostValue: number;
    }>;
  }

  /**
   * GET /api/crm-reports/lost-reasons
   * Lost reasons breakdown
   */
  export interface GetLostReasons {
    query: DateRange;
    response: ApiResponse<{
      reasons: Array<{
        reason: string;
        count: number;
        percentage: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/win-loss-trend
   * Win/loss trend over time
   */
  export interface GetWinLossTrend {
    query: DateRange & { groupBy?: 'day' | 'week' | 'month' };
    response: ApiResponse<{
      trend: Array<{
        period: string;
        won: number;
        lost: number;
        winRate: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/activity-overview
   * Activity overview
   */
  export interface GetActivityOverview {
    query: DateRange & { userId?: string };
    response: ApiResponse<{
      total: number;
      byType: Record<string, number>;
      completed: number;
      pending: number;
    }>;
  }

  /**
   * GET /api/crm-reports/activity-by-day-of-week
   * Activity distribution by day of week
   */
  export interface GetActivityByDayOfWeek {
    query: DateRange;
    response: ApiResponse<{
      byDay: Record<string, number>;
    }>;
  }

  /**
   * GET /api/crm-reports/activity-by-hour
   * Activity distribution by hour
   */
  export interface GetActivityByHour {
    query: DateRange;
    response: ApiResponse<{
      byHour: Record<number, number>;
    }>;
  }

  /**
   * GET /api/crm-reports/activity-leaderboard
   * Activity leaderboard
   */
  export interface GetActivityLeaderboard {
    query: DateRange & { limit?: number };
    response: ApiResponse<{
      leaderboard: Array<{
        userId: ObjectId;
        userName: string;
        totalActivities: number;
        completed: number;
        completionRate: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/forecast-overview
   * Sales forecast overview
   */
  export interface GetForecastOverview {
    query: { period?: string };
    response: ApiResponse<{
      pipeline: number;
      bestCase: number;
      commit: number;
      closedWon: number;
      quota: number;
      attainment: number;
    }>;
  }

  /**
   * GET /api/crm-reports/forecast-by-month
   * Forecast by month
   */
  export interface GetForecastByMonth {
    query: { year?: number };
    response: ApiResponse<{
      months: Array<{
        month: string;
        pipeline: number;
        commit: number;
        closedWon: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-reports/forecast-by-rep
   * Forecast by sales rep
   */
  export interface GetForecastByRep {
    query: DateRange;
    response: ApiResponse<{
      reps: Array<{
        userId: ObjectId;
        userName: string;
        pipeline: number;
        commit: number;
        closedWon: number;
        quota: number;
        attainment: number;
      }>;
    }>;
  }

  /**
   * POST /api/crm-reports/export
   * Export report data
   */
  export interface ExportReport {
    request: {
      reportType: string;
      format: 'csv' | 'excel' | 'pdf';
      filters?: any;
    };
    response: ApiResponse<{
      downloadUrl: string;
      expiresAt: Date;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. CRM SETTINGS (3 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace CrmSettings {
  export interface Settings {
    _id: ObjectId;
    firmId: ObjectId;
    leadScoring: {
      enabled: boolean;
      rules: Array<{
        field: string;
        value: any;
        score: number;
      }>;
    };
    autoAssignment: {
      enabled: boolean;
      strategy: 'round-robin' | 'load-balanced' | 'territory';
      assignTo?: ObjectId[];
    };
    duplicateDetection: {
      enabled: boolean;
      matchFields: string[];
      autoMerge: boolean;
    };
    staleLeadThreshold: number;
    defaultPipelineId?: ObjectId;
    notifications: {
      newLead: boolean;
      leadAssigned: boolean;
      stageChanged: boolean;
      dealWon: boolean;
      dealLost: boolean;
    };
    customFields: Array<{
      name: string;
      type: string;
      required: boolean;
      options?: string[];
    }>;
    updatedAt: Date;
  }

  export interface UpdateRequest extends Partial<Omit<Settings, '_id' | 'firmId' | 'updatedAt'>> {}

  /**
   * GET /api/crm-settings
   * Get CRM settings
   */
  export interface GetSettings {
    response: ApiResponse<Settings>;
  }

  /**
   * PUT /api/crm-settings
   * Update CRM settings
   */
  export interface UpdateSettings {
    request: UpdateRequest;
    response: ApiResponse<Settings>;
  }

  /**
   * POST /api/crm-settings/reset
   * Reset settings to defaults
   */
  export interface ResetSettings {
    response: ApiResponse<Settings>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. CRM TRANSACTION (15 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace CrmTransaction {
  export interface Transaction {
    _id: ObjectId;
    type: 'lead' | 'opportunity' | 'activity' | 'stage_change';
    entityType: string;
    entityId: ObjectId;
    userId: ObjectId;
    action: string;
    changes?: any;
    metadata?: any;
    firmId: ObjectId;
    createdAt: Date;
  }

  /**
   * GET /api/crm-transactions
   * Get all transactions with filters
   */
  export interface GetTransactions {
    query: {
      type?: string;
      entityType?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<Transaction>;
  }

  /**
   * GET /api/crm-transactions/entity/:entityType/:entityId
   * Get entity timeline
   */
  export interface GetEntityTimeline {
    params: { entityType: string; entityId: string };
    query: { limit?: number };
    response: ApiResponse<Transaction[]>;
  }

  /**
   * GET /api/crm-transactions/summary
   * Get transactions summary
   */
  export interface GetSummary {
    query: DateRange;
    response: ApiResponse<{
      total: number;
      byType: Record<string, number>;
      byUser: Array<{
        userId: ObjectId;
        count: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-transactions/user-activity/:userId
   * Get user activity log
   */
  export interface GetUserActivity {
    params: { userId: string };
    query: DateRange & { limit?: number };
    response: ApiResponse<Transaction[]>;
  }

  /**
   * GET /api/crm-transactions/daily-report
   * Get daily activity report
   */
  export interface GetDailyReport {
    query: { date?: string };
    response: ApiResponse<{
      date: string;
      totalActivities: number;
      byType: Record<string, number>;
      topUsers: Array<{
        userId: ObjectId;
        userName: string;
        count: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-transactions/export
   * Export transactions
   */
  export interface ExportTransactions {
    query: {
      format: 'csv' | 'excel';
      startDate?: string;
      endDate?: string;
    };
    response: ApiResponse<{
      downloadUrl: string;
      expiresAt: Date;
    }>;
  }

  /**
   * GET /api/crm-transactions/stale-leads
   * Get stale leads
   */
  export interface GetStaleLeads {
    query: {
      threshold?: number;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<any>;
  }

  /**
   * GET /api/crm-transactions/stale-leads/summary
   * Get stale leads summary
   */
  export interface GetStaleSummary {
    response: ApiResponse<{
      total: number;
      byAge: Record<string, number>;
    }>;
  }

  /**
   * GET /api/crm-transactions/stale-leads/by-stage
   * Get stale leads by stage
   */
  export interface GetStalenessbyStage {
    response: ApiResponse<{
      stages: Array<{
        stageName: string;
        staleCount: number;
        avgAge: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-transactions/leads-needing-attention
   * Get leads needing attention
   */
  export interface GetLeadsNeedingAttention {
    query: { limit?: number };
    response: ApiResponse<any[]>;
  }

  /**
   * GET /api/crm-transactions/revenue-forecast
   * Get revenue forecast
   */
  export interface GetRevenueForecast {
    query: DateRange;
    response: ApiResponse<{
      total: number;
      byMonth: Record<string, number>;
      confidence: 'high' | 'medium' | 'low';
    }>;
  }

  /**
   * GET /api/crm-transactions/revenue-forecast/by-period
   * Get forecast by period
   */
  export interface GetForecastByPeriod {
    query: {
      period: 'month' | 'quarter' | 'year';
      count?: number;
    };
    response: ApiResponse<{
      periods: Array<{
        period: string;
        forecast: number;
        actual?: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-transactions/pipeline-velocity
   * Get pipeline velocity
   */
  export interface GetPipelineVelocity {
    query: DateRange;
    response: ApiResponse<{
      velocity: number;
      avgDealSize: number;
      avgTimeToClose: number;
      winRate: number;
    }>;
  }

  /**
   * GET /api/crm-transactions/forecast-trends
   * Get forecast trends
   */
  export interface GetForecastTrends {
    query: {
      months?: number;
    };
    response: ApiResponse<{
      trend: Array<{
        month: string;
        forecast: number;
        actual: number;
        variance: number;
      }>;
    }>;
  }

  /**
   * GET /api/crm-transactions/forecast-by-category
   * Get forecast by category
   */
  export interface GetForecastByCategory {
    query: DateRange;
    response: ApiResponse<{
      pipeline: number;
      bestCase: number;
      commit: number;
      closedWon: number;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. CHATTER FOLLOWER (7 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace ChatterFollower {
  export interface Follower {
    _id: ObjectId;
    entityType: 'lead' | 'client' | 'case' | 'opportunity';
    entityId: ObjectId;
    userId: ObjectId;
    notificationPreferences: {
      email: boolean;
      inApp: boolean;
      updates: boolean;
      comments: boolean;
    };
    firmId: ObjectId;
    createdAt: Date;
  }

  /**
   * GET /api/chatter-followers/followers
   * Get followers for an entity
   */
  export interface GetFollowers {
    query: {
      entityType: string;
      entityId: string;
    };
    response: ApiResponse<Follower[]>;
  }

  /**
   * POST /api/chatter-followers/followers
   * Add follower to entity
   */
  export interface AddFollower {
    request: {
      entityType: 'lead' | 'client' | 'case' | 'opportunity';
      entityId: string;
      userId: string;
      notificationPreferences?: {
        email?: boolean;
        inApp?: boolean;
        updates?: boolean;
        comments?: boolean;
      };
    };
    response: ApiResponse<Follower>;
  }

  /**
   * DELETE /api/chatter-followers/:id
   * Remove follower
   */
  export interface RemoveFollower {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * PATCH /api/chatter-followers/:id/preferences
   * Update notification preferences
   */
  export interface UpdateNotificationPreference {
    params: { id: string };
    request: {
      email?: boolean;
      inApp?: boolean;
      updates?: boolean;
      comments?: boolean;
    };
    response: ApiResponse<Follower>;
  }

  /**
   * GET /api/chatter-followers/my-followed
   * Get my followed records
   */
  export interface GetMyFollowedRecords {
    query: {
      entityType?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<Follower>;
  }

  /**
   * POST /api/chatter-followers/followers/bulk
   * Add multiple followers
   */
  export interface BulkAddFollowers {
    request: {
      entityType: string;
      entityId: string;
      userIds: string[];
    };
    response: ApiResponse<Follower[]>;
  }

  /**
   * POST /api/chatter-followers/toggle-follow
   * Toggle follow status
   */
  export interface ToggleFollow {
    request: {
      entityType: string;
      entityId: string;
    };
    response: ApiResponse<{
      following: boolean;
      follower?: Follower;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. CHURN MANAGEMENT (24 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace Churn {
  export interface HealthScore {
    _id: ObjectId;
    firmId: ObjectId;
    score: number;
    factors: {
      engagement: number;
      billingHealth: number;
      supportTickets: number;
      featureAdoption: number;
    };
    trend: 'improving' | 'stable' | 'declining';
    risk: 'low' | 'medium' | 'high' | 'critical';
    lastCalculated: Date;
    history: Array<{
      date: Date;
      score: number;
    }>;
  }

  export interface ChurnEvent {
    _id: ObjectId;
    firmId: ObjectId;
    eventType: 'churned' | 'at_risk' | 'retained';
    reason?: string;
    churnDate?: Date;
    exitSurvey?: any;
    revenueImpact: number;
    createdBy: ObjectId;
    createdAt: Date;
  }

  export interface Intervention {
    _id: ObjectId;
    firmId: ObjectId;
    type: 'email' | 'call' | 'discount' | 'meeting';
    description: string;
    triggeredBy: 'auto' | 'manual';
    status: 'pending' | 'completed' | 'failed';
    outcome?: string;
    createdAt: Date;
    completedAt?: Date;
  }

  /**
   * GET /api/churn/health-score/:firmId
   * Get health score for a firm
   */
  export interface GetHealthScore {
    params: { firmId: string };
    response: ApiResponse<HealthScore>;
  }

  /**
   * GET /api/churn/health-score/:firmId/history
   * Get health score history
   */
  export interface GetHealthScoreHistory {
    params: { firmId: string };
    query: { months?: number };
    response: ApiResponse<{
      history: Array<{
        date: Date;
        score: number;
      }>;
    }>;
  }

  /**
   * POST /api/churn/health-score/:firmId/recalculate
   * Recalculate health score
   */
  export interface RecalculateHealthScore {
    params: { firmId: string };
    response: ApiResponse<HealthScore>;
  }

  /**
   * GET /api/churn/at-risk
   * Get at-risk firms
   */
  export interface GetAtRiskFirms {
    query: {
      threshold?: number;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<HealthScore>;
  }

  /**
   * POST /api/churn/events
   * Record churn event
   */
  export interface RecordChurnEvent {
    request: {
      firmId: string;
      eventType: 'churned' | 'at_risk' | 'retained';
      reason?: string;
      churnDate?: string;
      revenueImpact: number;
    };
    response: ApiResponse<ChurnEvent>;
  }

  /**
   * GET /api/churn/events
   * Get churn events
   */
  export interface GetChurnEvents {
    query: {
      eventType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<ChurnEvent>;
  }

  /**
   * PUT /api/churn/events/:id/reason
   * Update churn reason
   */
  export interface UpdateChurnReason {
    params: { id: string };
    request: { reason: string };
    response: ApiResponse<ChurnEvent>;
  }

  /**
   * POST /api/churn/events/:id/exit-survey
   * Record exit survey
   */
  export interface RecordExitSurvey {
    params: { id: string };
    request: {
      satisfaction: number;
      reasonForLeaving: string;
      features: any;
      feedback: string;
    };
    response: ApiResponse<ChurnEvent>;
  }

  /**
   * GET /api/churn/analytics/dashboard
   * Get churn dashboard metrics
   */
  export interface GetDashboardMetrics {
    query: DateRange;
    response: ApiResponse<{
      currentChurnRate: number;
      atRiskCount: number;
      revenueAtRisk: number;
      retentionRate: number;
      avgHealthScore: number;
    }>;
  }

  /**
   * GET /api/churn/analytics/rate
   * Get churn rate over time
   */
  export interface GetChurnRate {
    query: DateRange & { groupBy?: 'month' | 'quarter' };
    response: ApiResponse<{
      periods: Array<{
        period: string;
        churnRate: number;
        churned: number;
        total: number;
      }>;
    }>;
  }

  /**
   * GET /api/churn/analytics/reasons
   * Get churn reasons breakdown
   */
  export interface GetChurnReasons {
    query: DateRange;
    response: ApiResponse<{
      reasons: Array<{
        reason: string;
        count: number;
        percentage: number;
      }>;
    }>;
  }

  /**
   * GET /api/churn/analytics/cohorts
   * Get cohort analysis
   */
  export interface GetCohortAnalysis {
    query: {
      startMonth: string;
      months?: number;
    };
    response: ApiResponse<{
      cohorts: Array<{
        cohort: string;
        retention: number[];
      }>;
    }>;
  }

  /**
   * GET /api/churn/analytics/revenue-at-risk
   * Get revenue at risk analysis
   */
  export interface GetRevenueAtRisk {
    response: ApiResponse<{
      total: number;
      byRiskLevel: {
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
      topAtRiskFirms: Array<{
        firmId: ObjectId;
        firmName: string;
        mrr: number;
        riskLevel: string;
      }>;
    }>;
  }

  /**
   * GET /api/churn/interventions/:firmId
   * Get intervention history
   */
  export interface GetInterventionHistory {
    params: { firmId: string };
    response: ApiResponse<Intervention[]>;
  }

  /**
   * POST /api/churn/interventions/:firmId/trigger
   * Trigger intervention
   */
  export interface TriggerIntervention {
    params: { firmId: string };
    request: {
      type: 'email' | 'call' | 'discount' | 'meeting';
      description: string;
    };
    response: ApiResponse<Intervention>;
  }

  /**
   * GET /api/churn/interventions/stats
   * Get intervention effectiveness stats
   */
  export interface GetInterventionStats {
    query: DateRange;
    response: ApiResponse<{
      total: number;
      successful: number;
      successRate: number;
      byType: Record<string, {
        total: number;
        successful: number;
        successRate: number;
      }>;
    }>;
  }

  /**
   * GET /api/churn/reports/generate
   * Generate churn report
   */
  export interface GenerateReport {
    query: {
      reportType: 'executive' | 'detailed' | 'cohort';
      format: 'pdf' | 'excel';
    } & DateRange;
    response: ApiResponse<{
      downloadUrl: string;
      expiresAt: Date;
    }>;
  }

  /**
   * GET /api/churn/reports/at-risk-export
   * Export at-risk firms list
   */
  export interface ExportAtRiskList {
    query: {
      threshold?: number;
      format: 'csv' | 'excel';
    };
    response: ApiResponse<{
      downloadUrl: string;
      expiresAt: Date;
    }>;
  }

  /**
   * GET /api/churn/reports/executive-summary
   * Get executive summary
   */
  export interface GetExecutiveSummary {
    query: DateRange;
    response: ApiResponse<{
      churnRate: number;
      retentionRate: number;
      revenueAtRisk: number;
      interventionsNeeded: number;
      topRisks: string[];
      trends: {
        churnTrend: 'up' | 'down' | 'stable';
        healthTrend: 'improving' | 'declining' | 'stable';
      };
    }>;
  }

  /**
   * POST /api/churn/predictions/run
   * Run churn prediction model
   */
  export interface RunPrediction {
    request: {
      firmIds?: string[];
      threshold?: number;
    };
    response: ApiResponse<{
      predictions: Array<{
        firmId: ObjectId;
        churnProbability: number;
        riskFactors: string[];
      }>;
    }>;
  }

  /**
   * GET /api/churn/predictions/accuracy
   * Get prediction model accuracy
   */
  export interface GetPredictionAccuracy {
    query: DateRange;
    response: ApiResponse<{
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    }>;
  }

  /**
   * POST /api/churn/alerts/configure
   * Configure churn alerts
   */
  export interface ConfigureAlerts {
    request: {
      scoreThreshold: number;
      notifyUsers: string[];
      channels: Array<'email' | 'slack' | 'sms'>;
      frequency: 'daily' | 'weekly';
    };
    response: ApiResponse<any>;
  }

  /**
   * GET /api/churn/retention/initiatives
   * Get retention initiatives
   */
  export interface GetRetentionInitiatives {
    response: ApiResponse<{
      initiatives: Array<{
        name: string;
        status: 'active' | 'planned' | 'completed';
        firmsEnrolled: number;
        successRate: number;
      }>;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 8. SALES ORDER (18 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace SalesOrder {
  export interface OrderItem {
    productId?: ObjectId;
    productName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    unitOfMeasure?: string;
    total?: number;
  }

  export interface SalesOrder {
    _id: ObjectId;
    orderNumber: string;
    customerId?: ObjectId;
    leadId?: ObjectId;
    quoteId?: ObjectId;
    items: OrderItem[];
    billingAddress?: any;
    shippingAddress?: any;
    currency: string;
    subtotal: number;
    discount: number;
    tax: number;
    shippingCost: number;
    total: number;
    status: 'draft' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
    orderDate: Date;
    expectedDeliveryDate?: Date;
    paymentTerms?: string;
    notes?: string;
    salespersonId?: ObjectId;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateOrderRequest {
    customerId?: string;
    leadId?: string;
    quoteId?: string;
    items: OrderItem[];
    billingAddress?: any;
    shippingAddress?: any;
    currency?: string;
    orderDate?: string;
    expectedDeliveryDate?: string;
    paymentTerms?: string;
    notes?: string;
    salespersonId?: string;
    discount?: number;
  }

  /**
   * GET /api/sales-orders
   * Get sales orders list
   */
  export interface GetSalesOrders {
    query: {
      status?: string;
      customerId?: string;
      salespersonId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };
    response: PaginatedResponse<SalesOrder>;
  }

  /**
   * GET /api/sales-orders/:id
   * Get single sales order
   */
  export interface GetSalesOrder {
    params: { id: string };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/from-quote
   * Create order from quote
   */
  export interface CreateFromQuote {
    request: CreateOrderRequest;
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/for-client
   * Create order for client
   */
  export interface CreateForClient {
    request: CreateOrderRequest;
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/from-lead
   * Create order from lead
   */
  export interface CreateFromLead {
    request: CreateOrderRequest;
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/:id/confirm
   * Confirm order
   */
  export interface ConfirmOrder {
    params: { id: string };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/:id/cancel
   * Cancel order
   */
  export interface CancelOrder {
    params: { id: string };
    request: { reason: string };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/:id/complete
   * Complete order
   */
  export interface CompleteOrder {
    params: { id: string };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/:id/items
   * Add item to order
   */
  export interface AddItem {
    params: { id: string };
    request: OrderItem;
    response: ApiResponse<SalesOrder>;
  }

  /**
   * PUT /api/sales-orders/:id/items/:itemId
   * Update item in order
   */
  export interface UpdateItem {
    params: { id: string; itemId: string };
    request: Partial<OrderItem>;
    response: ApiResponse<SalesOrder>;
  }

  /**
   * DELETE /api/sales-orders/:id/items/:itemId
   * Remove item from order
   */
  export interface RemoveItem {
    params: { id: string; itemId: string };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/:id/pricing-rules
   * Apply pricing rules
   */
  export interface ApplyPricingRules {
    params: { id: string };
    response: ApiResponse<{
      order: SalesOrder;
      appliedRules: any[];
    }>;
  }

  /**
   * POST /api/sales-orders/:id/discount
   * Apply discount to order
   */
  export interface ApplyDiscount {
    params: { id: string };
    request: {
      type: 'percentage' | 'fixed';
      value: number;
      reason?: string;
    };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * POST /api/sales-orders/:id/delivery-note
   * Create delivery note
   */
  export interface CreateDeliveryNote {
    params: { id: string };
    request: {
      items?: any[];
      shippingAddress?: any;
      scheduledDate?: string;
      deliveryMethod?: string;
      carrier?: string;
      specialInstructions?: string;
    };
    response: ApiResponse<any>;
  }

  /**
   * POST /api/sales-orders/:id/invoice
   * Create invoice from order
   */
  export interface CreateInvoice {
    params: { id: string };
    request: {
      items?: any[];
      dueDate?: string;
      notes?: string;
    };
    response: ApiResponse<any>;
  }

  /**
   * POST /api/sales-orders/:id/payment
   * Record payment
   */
  export interface RecordPayment {
    params: { id: string };
    request: {
      amount: number;
      method: string;
      reference?: string;
      date?: string;
    };
    response: ApiResponse<SalesOrder>;
  }

  /**
   * GET /api/sales-orders/statistics
   * Get order statistics
   */
  export interface GetStatistics {
    query: DateRange;
    response: ApiResponse<{
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
      byStatus: Record<string, number>;
    }>;
  }

  /**
   * GET /api/sales-orders/by-salesperson
   * Get sales by salesperson
   */
  export interface GetSalesBySalesperson {
    query: DateRange;
    response: ApiResponse<Array<{
      salespersonId: ObjectId;
      salespersonName: string;
      totalOrders: number;
      totalRevenue: number;
    }>>;
  }

  /**
   * GET /api/sales-orders/top-customers
   * Get top customers
   */
  export interface GetTopCustomers {
    query: DateRange & { limit?: number };
    response: ApiResponse<Array<{
      customerId: ObjectId;
      customerName: string;
      totalOrders: number;
      totalRevenue: number;
    }>>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 9. SALES FORECAST (11 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace SalesForecast {
  export interface Forecast {
    _id: ObjectId;
    forecastId: string;
    name: string;
    nameAr?: string;
    periodType: 'monthly' | 'quarterly' | 'yearly';
    periodStart: Date;
    periodEnd: Date;
    fiscalYear?: number;
    fiscalQuarter?: number;
    scopeType: 'individual' | 'team' | 'territory' | 'company';
    salesTeamId?: ObjectId;
    territoryId?: ObjectId;
    userId?: ObjectId;
    quota: number;
    pipeline: number;
    bestCase: number;
    commit: number;
    closedWon: number;
    achieved: number;
    currency: string;
    status: 'draft' | 'submitted' | 'approved' | 'locked';
    adjustments: Array<{
      date: Date;
      type: string;
      amount: number;
      reason: string;
      adjustedBy: ObjectId;
    }>;
    notes?: string;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateForecastRequest {
    name: string;
    nameAr?: string;
    periodType: 'monthly' | 'quarterly' | 'yearly';
    periodStart: string;
    periodEnd: string;
    fiscalYear?: number;
    fiscalQuarter?: number;
    scopeType: 'individual' | 'team' | 'territory' | 'company';
    salesTeamId?: string;
    territoryId?: string;
    userId?: string;
    quota: number;
    currency?: string;
    pipeline?: number;
    bestCase?: number;
    commit?: number;
    closedWon?: number;
    notes?: string;
  }

  /**
   * POST /api/sales-forecasts
   * Create a new sales forecast
   */
  export interface CreateForecast {
    request: CreateForecastRequest;
    response: ApiResponse<Forecast>;
  }

  /**
   * GET /api/sales-forecasts
   * Get all forecasts with filters
   */
  export interface GetForecasts {
    query: {
      status?: string;
      periodType?: string;
      scopeType?: string;
      fiscalYear?: number;
      fiscalQuarter?: number;
      salesTeamId?: string;
      territoryId?: string;
      userId?: string;
      search?: string;
      periodStart?: string;
      periodEnd?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };
    response: PaginatedResponse<Forecast>;
  }

  /**
   * GET /api/sales-forecasts/:id
   * Get single forecast by ID
   */
  export interface GetForecastById {
    params: { id: string };
    response: ApiResponse<Forecast>;
  }

  /**
   * PUT /api/sales-forecasts/:id
   * Update forecast
   */
  export interface UpdateForecast {
    params: { id: string };
    request: Partial<CreateForecastRequest>;
    response: ApiResponse<Forecast>;
  }

  /**
   * DELETE /api/sales-forecasts/:id
   * Delete forecast
   */
  export interface DeleteForecast {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/sales-forecasts/:id/submit
   * Submit forecast for approval
   */
  export interface SubmitForecast {
    params: { id: string };
    response: ApiResponse<Forecast>;
  }

  /**
   * POST /api/sales-forecasts/:id/approve
   * Approve forecast
   */
  export interface ApproveForecast {
    params: { id: string };
    response: ApiResponse<Forecast>;
  }

  /**
   * POST /api/sales-forecasts/:id/lock
   * Lock forecast
   */
  export interface LockForecast {
    params: { id: string };
    response: ApiResponse<Forecast>;
  }

  /**
   * POST /api/sales-forecasts/:id/adjustments
   * Add adjustment to forecast
   */
  export interface AddAdjustment {
    params: { id: string };
    request: {
      type: string;
      amount: number;
      reason: string;
    };
    response: ApiResponse<Forecast>;
  }

  /**
   * GET /api/sales-forecasts/current-quarter
   * Get current quarter forecasts
   */
  export interface GetCurrentQuarter {
    response: ApiResponse<Forecast[]>;
  }

  /**
   * GET /api/sales-forecasts/by-period
   * Get forecasts by period
   */
  export interface GetByPeriod {
    query: {
      periodStart: string;
      periodEnd: string;
    };
    response: ApiResponse<Forecast[]>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 10. SALES PERSON (7 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace SalesPerson {
  export interface SalesPerson {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    userId?: ObjectId;
    employeeId?: ObjectId;
    isGroup: boolean;
    parentSalesPersonId?: ObjectId;
    level: number;
    commissionRate?: number;
    territoryIds: ObjectId[];
    enabled: boolean;
    salesTargets?: Array<{
      year: number;
      targetAmount: number;
      targetLeads: number;
      targetCases: number;
      achievedAmount: number;
      achievedLeads: number;
      achievedCases: number;
    }>;
    email?: string;
    phone?: string;
    description?: string;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateRequest {
    name: string;
    nameAr?: string;
    userId?: string;
    employeeId?: string;
    isGroup?: boolean;
    parentSalesPersonId?: string;
    level?: number;
    commissionRate?: number;
    territoryIds?: string[];
    enabled?: boolean;
    salesTargets?: any[];
    email?: string;
    phone?: string;
    description?: string;
  }

  export interface SalesPersonStats {
    salesPersonId: ObjectId;
    period: {
      start: string;
      end: string;
    };
    leads: {
      total: number;
      converted: number;
      conversionRate: number;
    };
    cases: {
      total: number;
      won: number;
      lost: number;
      open: number;
      winRate: number;
      totalValue: number;
      wonValue: number;
    };
    targets?: {
      amount: any;
      leads: any;
      cases: any;
    };
    avgResponseTime: number;
    avgDealSize: number;
  }

  /**
   * GET /api/sales-persons
   * Get all sales persons with filters
   */
  export interface GetAll {
    query: {
      enabled?: string;
      parentId?: string;
      isGroup?: string;
      territoryId?: string;
      search?: string;
      page?: number;
      limit?: number;
    };
    response: ApiResponse<{
      salesPersons: SalesPerson[];
      total: number;
      page: number;
      limit: number;
    }>;
  }

  /**
   * GET /api/sales-persons/tree
   * Get sales persons in hierarchical tree structure
   */
  export interface GetTree {
    query: { enabledOnly?: string };
    response: ApiResponse<any[]>;
  }

  /**
   * GET /api/sales-persons/:id
   * Get sales person by ID
   */
  export interface GetById {
    params: { id: string };
    response: ApiResponse<SalesPerson>;
  }

  /**
   * GET /api/sales-persons/:id/stats
   * Get performance statistics for a sales person
   */
  export interface GetStats {
    params: { id: string };
    query: DateRange;
    response: ApiResponse<SalesPersonStats>;
  }

  /**
   * POST /api/sales-persons
   * Create a new sales person
   */
  export interface Create {
    request: CreateRequest;
    response: ApiResponse<SalesPerson>;
  }

  /**
   * PUT /api/sales-persons/:id
   * Update a sales person
   */
  export interface Update {
    params: { id: string };
    request: Partial<CreateRequest>;
    response: ApiResponse<SalesPerson>;
  }

  /**
   * DELETE /api/sales-persons/:id
   * Delete a sales person
   */
  export interface Delete {
    params: { id: string };
    response: ApiResponse<void>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 11. SALES QUOTA (10 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace SalesQuota {
  export interface Quota {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    description?: string;
    userId?: ObjectId;
    teamId?: ObjectId;
    isCompanyWide: boolean;
    period: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
    target: number;
    achieved: number;
    currency: string;
    breakdownByType?: {
      newBusiness: number;
      upsell: number;
      renewal: number;
    };
    dealsTarget?: number;
    activityTargets?: {
      calls: number;
      meetings: number;
      emails: number;
    };
    pipelineTargets?: {
      stage1: number;
      stage2: number;
      stage3: number;
    };
    status: 'active' | 'completed' | 'exceeded' | 'missed';
    adjustments: Array<{
      date: Date;
      previousTarget: number;
      newTarget: number;
      reason: string;
      adjustedBy: ObjectId;
    }>;
    linkedDeals: Array<{
      dealId: ObjectId;
      value: number;
    }>;
    progressPercentage?: number;
    remaining?: number;
    daysRemaining?: number;
    dailyTargetRequired?: number;
    isOnTrack?: boolean;
    attainmentStatus?: 'on-track' | 'at-risk' | 'behind';
    notes?: string;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateQuotaRequest {
    name: string;
    nameAr?: string;
    description?: string;
    userId?: string;
    teamId?: string;
    isCompanyWide?: boolean;
    period: 'monthly' | 'quarterly' | 'yearly';
    startDate: string;
    endDate: string;
    target: number;
    currency?: string;
    breakdownByType?: any;
    dealsTarget?: number;
    activityTargets?: any;
    pipelineTargets?: any;
    notes?: string;
  }

  /**
   * POST /api/sales-quotas
   * Create a new sales quota
   */
  export interface CreateQuota {
    request: CreateQuotaRequest;
    response: ApiResponse<Quota>;
  }

  /**
   * GET /api/sales-quotas
   * Get all quotas with filters
   */
  export interface GetQuotas {
    query: {
      userId?: string;
      teamId?: string;
      period?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sort?: string;
    };
    response: PaginatedResponse<Quota>;
  }

  /**
   * GET /api/sales-quotas/:id
   * Get a single quota
   */
  export interface GetQuota {
    params: { id: string };
    response: ApiResponse<Quota>;
  }

  /**
   * PUT /api/sales-quotas/:id
   * Update a quota
   */
  export interface UpdateQuota {
    params: { id: string };
    request: Partial<CreateQuotaRequest> & { adjustmentReason?: string };
    response: ApiResponse<Quota>;
  }

  /**
   * DELETE /api/sales-quotas/:id
   * Delete a quota
   */
  export interface DeleteQuota {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/sales-quotas/:id/record-deal
   * Record deal achievement
   */
  export interface RecordDeal {
    params: { id: string };
    request: {
      dealValue: number;
      dealType?: 'newBusiness' | 'upsell' | 'renewal';
      dealId?: string;
    };
    response: ApiResponse<{
      achieved: number;
      progressPercentage: number;
      remaining: number;
    }>;
  }

  /**
   * GET /api/sales-quotas/leaderboard
   * Get leaderboard
   */
  export interface GetLeaderboard {
    query: {
      period?: string;
      limit?: number;
    };
    response: ApiResponse<Array<{
      rank: number;
      userId: ObjectId;
      userName: string;
      target: number;
      achieved: number;
      progressPercentage: number;
    }>>;
  }

  /**
   * GET /api/sales-quotas/team-summary
   * Get team summary
   */
  export interface GetTeamSummary {
    query: {
      teamId?: string;
      period?: string;
    };
    response: ApiResponse<{
      totalTarget: number;
      totalAchieved: number;
      memberCount: number;
      teamProgressPercentage: number;
      members: Array<{
        userId: ObjectId;
        userName: string;
        target: number;
        achieved: number;
        progressPercentage: number;
      }>;
    }>;
  }

  /**
   * GET /api/sales-quotas/my-quota
   * Get my current quota
   */
  export interface GetMyQuota {
    response: ApiResponse<Quota>;
  }

  /**
   * GET /api/sales-quotas/period-comparison
   * Get period comparison
   */
  export interface GetPeriodComparison {
    query: {
      userId?: string;
      periods?: number;
    };
    response: ApiResponse<Array<{
      period: string;
      target: number;
      achieved: number;
      progressPercentage: number;
      status: string;
    }>>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 12. SALES STAGE (7 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace SalesStage {
  export interface Stage {
    _id: ObjectId;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type: 'open' | 'won' | 'lost';
    probability: number;
    order: number;
    enabled: boolean;
    isDefault: boolean;
    metadata?: any;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateRequest {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: 'open' | 'won' | 'lost';
    probability?: number;
    order?: number;
    enabled?: boolean;
    isDefault?: boolean;
    metadata?: any;
  }

  export interface ReorderRequest {
    stages: Array<{
      id: string;
      order: number;
    }>;
  }

  /**
   * GET /api/sales-stages
   * Get all sales stages
   */
  export interface GetAll {
    query: {
      enabled?: string;
      type?: string;
    };
    response: ApiResponse<Stage[]>;
  }

  /**
   * GET /api/sales-stages/:id
   * Get sales stage by ID
   */
  export interface GetById {
    params: { id: string };
    response: ApiResponse<Stage>;
  }

  /**
   * POST /api/sales-stages
   * Create a new sales stage
   */
  export interface Create {
    request: CreateRequest;
    response: ApiResponse<Stage>;
  }

  /**
   * PUT /api/sales-stages/:id
   * Update a sales stage
   */
  export interface Update {
    params: { id: string };
    request: Partial<CreateRequest>;
    response: ApiResponse<Stage>;
  }

  /**
   * DELETE /api/sales-stages/:id
   * Delete a sales stage
   */
  export interface Delete {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/sales-stages/reorder
   * Reorder sales stages
   */
  export interface Reorder {
    request: ReorderRequest;
    response: ApiResponse<Stage[]>;
  }

  /**
   * POST /api/sales-stages/create-defaults
   * Create default sales stages for a firm
   */
  export interface CreateDefaults {
    response: ApiResponse<Stage[]>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 13. SALES TEAM (10 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace SalesTeam {
  export interface Team {
    _id: ObjectId;
    teamId: string;
    name: string;
    nameAr?: string;
    description?: string;
    color?: string;
    icon?: string;
    leaderId: ObjectId;
    members: Array<{
      userId: ObjectId;
      role: 'leader' | 'member' | 'support';
      joinedAt: Date;
      isActive: boolean;
    }>;
    defaultPipelineId?: ObjectId;
    pipelines: ObjectId[];
    territories: ObjectId[];
    emailAlias?: string;
    targets?: {
      monthly?: number;
      quarterly?: number;
      yearly?: number;
    };
    stats?: {
      totalLeads: number;
      totalOpportunities: number;
      totalRevenue: number;
      winRate: number;
    };
    settings?: {
      autoAssignLeads: boolean;
      useOpportunities: boolean;
    };
    isActive: boolean;
    isDefault: boolean;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateTeamRequest {
    name: string;
    nameAr?: string;
    description?: string;
    color?: string;
    icon?: string;
    leaderId: string;
    defaultPipelineId?: string;
    pipelines?: string[];
    territories?: string[];
    emailAlias?: string;
    targets?: any;
    settings?: any;
    isDefault?: boolean;
  }

  /**
   * POST /api/sales-teams
   * Create a new sales team
   */
  export interface CreateTeam {
    request: CreateTeamRequest;
    response: ApiResponse<Team>;
  }

  /**
   * GET /api/sales-teams
   * Get all sales teams
   */
  export interface GetTeams {
    query: {
      search?: string;
      isActive?: string;
      leaderId?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<Team>;
  }

  /**
   * GET /api/sales-teams/:id
   * Get single sales team by ID
   */
  export interface GetTeamById {
    params: { id: string };
    response: ApiResponse<Team>;
  }

  /**
   * PUT /api/sales-teams/:id
   * Update sales team
   */
  export interface UpdateTeam {
    params: { id: string };
    request: Partial<CreateTeamRequest>;
    response: ApiResponse<Team>;
  }

  /**
   * DELETE /api/sales-teams/:id
   * Delete sales team
   */
  export interface DeleteTeam {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/sales-teams/:id/members
   * Add member to team
   */
  export interface AddMember {
    params: { id: string };
    request: {
      userId: string;
      role?: 'leader' | 'member' | 'support';
    };
    response: ApiResponse<Team>;
  }

  /**
   * DELETE /api/sales-teams/:id/members/:userId
   * Remove member from team
   */
  export interface RemoveMember {
    params: { id: string; userId: string };
    response: ApiResponse<Team>;
  }

  /**
   * GET /api/sales-teams/:id/stats
   * Get team statistics
   */
  export interface GetTeamStats {
    params: { id: string };
    response: ApiResponse<{
      stats: any;
      targets: any;
    }>;
  }

  /**
   * GET /api/sales-teams/:id/leaderboard
   * Get team leaderboard (member performance)
   */
  export interface GetLeaderboard {
    params: { id: string };
    response: ApiResponse<Array<{
      user: any;
      role: string;
      stats: {
        totalLeads: number;
        totalOpportunities: number;
        wonDeals: number;
        totalRevenue: number;
      };
    }>>;
  }

  /**
   * POST /api/sales-teams/:id/default
   * Set team as default
   */
  export interface SetDefault {
    params: { id: string };
    response: ApiResponse<Team>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 14. PRICE LEVEL (7 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace PriceLevel {
  export interface PriceLevel {
    _id: ObjectId;
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    pricingType: 'percentage' | 'fixed' | 'custom';
    percentageAdjustment?: number;
    fixedAdjustment?: number;
    customRates?: Array<{
      serviceType: string;
      hourlyRate?: number;
      flatFee?: number;
      minimumFee?: number;
    }>;
    priority: number;
    minimumRevenue?: number;
    minimumCases?: number;
    effectiveDate: Date;
    expiryDate?: Date;
    isActive: boolean;
    isDefault: boolean;
    incomeAccountId?: ObjectId;
    firmId: ObjectId;
    lawyerId?: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateRequest {
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    pricingType: 'percentage' | 'fixed' | 'custom';
    percentageAdjustment?: number;
    fixedAdjustment?: number;
    customRates?: any[];
    priority?: number;
    minimumRevenue?: number;
    minimumCases?: number;
    effectiveDate?: string;
    expiryDate?: string;
    isDefault?: boolean;
    incomeAccountId?: string;
  }

  /**
   * GET /api/price-levels
   * Get all price levels
   */
  export interface GetPriceLevels {
    query: { active?: string };
    response: ApiResponse<PriceLevel[]>;
  }

  /**
   * GET /api/price-levels/:id
   * Get single price level
   */
  export interface GetPriceLevel {
    params: { id: string };
    response: ApiResponse<PriceLevel>;
  }

  /**
   * POST /api/price-levels
   * Create price level
   */
  export interface CreatePriceLevel {
    request: CreateRequest;
    response: ApiResponse<PriceLevel>;
  }

  /**
   * PUT /api/price-levels/:id
   * Update price level
   */
  export interface UpdatePriceLevel {
    params: { id: string };
    request: Partial<CreateRequest>;
    response: ApiResponse<PriceLevel>;
  }

  /**
   * DELETE /api/price-levels/:id
   * Delete price level
   */
  export interface DeletePriceLevel {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * GET /api/price-levels/client-rate
   * Get effective rate for a client
   */
  export interface GetClientRate {
    query: {
      clientId: string;
      baseRate: string;
      serviceType?: string;
    };
    response: ApiResponse<{
      baseRate: number;
      effectiveRate: number;
      priceLevel: {
        code: string;
        name: string;
        adjustment: string;
      } | null;
    }>;
  }

  /**
   * POST /api/price-levels/:id/default
   * Set default price level
   */
  export interface SetDefault {
    params: { id: string };
    response: ApiResponse<PriceLevel>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 15. DEAL HEALTH (6 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace DealHealth {
  export interface HealthScore {
    score: number;
    status: 'healthy' | 'at_risk' | 'critical';
    factors: {
      engagement: number;
      velocity: number;
      stakeholders: number;
      budget: number;
      timeline: number;
    };
    recommendations: string[];
    lastUpdated: Date;
  }

  /**
   * GET /api/deals/:id/health
   * Get deal health score
   */
  export interface GetDealHealth {
    params: { id: string };
    response: ApiResponse<HealthScore>;
  }

  /**
   * POST /api/deals/:id/health/refresh
   * Refresh deal health score
   */
  export interface RefreshDealHealth {
    params: { id: string };
    response: ApiResponse<HealthScore>;
  }

  /**
   * GET /api/deals/health/stuck
   * Get stuck deals
   */
  export interface GetStuckDeals {
    query: {
      threshold?: number;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<any>;
  }

  /**
   * POST /api/deals/:id/health/unstuck
   * Mark deal as unstuck
   */
  export interface UnstuckDeal {
    params: { id: string };
    request: { action: string; notes?: string };
    response: ApiResponse<any>;
  }

  /**
   * GET /api/deals/health/distribution
   * Get health distribution
   */
  export interface GetHealthDistribution {
    response: ApiResponse<{
      healthy: number;
      at_risk: number;
      critical: number;
    }>;
  }

  /**
   * GET /api/deals/health/attention
   * Get deals needing attention
   */
  export interface GetDealsNeedingAttention {
    query: { threshold?: number };
    response: ApiResponse<any[]>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 16. DEAL ROOM (11 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace DealRoom {
  export interface DealRoom {
    _id: ObjectId;
    dealId: ObjectId;
    name: string;
    pages: Array<{
      _id: ObjectId;
      title: string;
      content: string;
      order: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    documents: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
      description?: string;
      uploadedAt: Date;
      uploadedBy: ObjectId;
      views: Array<{
        userId?: ObjectId;
        viewedAt: Date;
        ipAddress?: string;
      }>;
    }>;
    externalAccess: Array<{
      email: string;
      name: string;
      company?: string;
      token: string;
      permissions: string[];
      expiresAt?: Date;
      lastAccessedAt?: Date;
    }>;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * GET /api/deals/:dealId/room
   * Get deal room
   */
  export interface GetDealRoom {
    params: { dealId: string };
    response: ApiResponse<DealRoom>;
  }

  /**
   * POST /api/deals/:dealId/room
   * Create deal room
   */
  export interface CreateDealRoom {
    params: { dealId: string };
    request: { name: string };
    response: ApiResponse<DealRoom>;
  }

  /**
   * POST /api/deal-rooms/:id/pages
   * Add page to deal room
   */
  export interface AddPage {
    params: { id: string };
    request: {
      title: string;
      content: string;
    };
    response: ApiResponse<DealRoom>;
  }

  /**
   * PUT /api/deal-rooms/:id/pages/:pageId
   * Update page
   */
  export interface UpdatePage {
    params: { id: string; pageId: string };
    request: {
      title?: string;
      content?: string;
    };
    response: ApiResponse<DealRoom>;
  }

  /**
   * DELETE /api/deal-rooms/:id/pages/:pageId
   * Delete page
   */
  export interface DeletePage {
    params: { id: string; pageId: string };
    response: ApiResponse<DealRoom>;
  }

  /**
   * POST /api/deal-rooms/:id/documents
   * Upload document to deal room
   */
  export interface UploadDocument {
    params: { id: string };
    request: {
      name: string;
      url: string;
      type: string;
      size: number;
      description?: string;
    };
    response: ApiResponse<DealRoom>;
  }

  /**
   * POST /api/deal-rooms/:id/documents/:index/view
   * Track document view
   */
  export interface TrackDocumentView {
    params: { id: string; index: string };
    response: ApiResponse<DealRoom>;
  }

  /**
   * POST /api/deal-rooms/:id/access
   * Grant external access
   */
  export interface GrantExternalAccess {
    params: { id: string };
    request: {
      email: string;
      name: string;
      company?: string;
      permissions?: string[];
      expiresAt?: string;
    };
    response: ApiResponse<{
      accessToken: string;
      accessUrl: string;
    }>;
  }

  /**
   * DELETE /api/deal-rooms/:id/access/:token
   * Revoke external access
   */
  export interface RevokeExternalAccess {
    params: { id: string; token: string };
    response: ApiResponse<DealRoom>;
  }

  /**
   * GET /api/deal-rooms/external/:token
   * Verify external access (public)
   */
  export interface VerifyExternalAccess {
    params: { token: string };
    response: ApiResponse<DealRoom>;
  }

  /**
   * GET /api/deal-rooms/:id/activity
   * Get activity feed
   */
  export interface GetActivityFeed {
    params: { id: string };
    query: { limit?: number };
    response: ApiResponse<any[]>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 17. DEDUPLICATION (6 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace Deduplication {
  export interface DuplicateContact {
    _id: ObjectId;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    similarity: number;
  }

  /**
   * GET /api/contacts/:id/duplicates
   * Find duplicates for a specific contact
   */
  export interface FindDuplicates {
    params: { id: string };
    query: { threshold?: number };
    response: ApiResponse<{
      contactId: ObjectId;
      contactName: string;
      threshold: number;
      duplicates: DuplicateContact[];
    }>;
  }

  /**
   * POST /api/contacts/scan-duplicates
   * Scan for all duplicates in the firm
   */
  export interface ScanDuplicates {
    request: {
      threshold?: number;
      limit?: number;
      status?: 'active' | 'inactive' | 'archived';
    };
    response: ApiResponse<{
      threshold: number;
      total: number;
      pairs: Array<{
        contact1: DuplicateContact;
        contact2: DuplicateContact;
        similarity: number;
      }>;
    }>;
  }

  /**
   * POST /api/contacts/merge
   * Merge two contacts
   */
  export interface MergeContacts {
    request: {
      masterId: string;
      duplicateId: string;
    };
    response: ApiResponse<any>;
  }

  /**
   * POST /api/contacts/auto-merge
   * Auto-merge high confidence duplicates
   */
  export interface AutoMerge {
    request: {
      threshold?: number;
      dryRun?: boolean;
    };
    response: ApiResponse<{
      threshold: number;
      dryRun: boolean;
      merged?: number;
      pairs: any[];
    }>;
  }

  /**
   * GET /api/contacts/duplicate-suggestions
   * Get duplicate suggestions for manual review
   */
  export interface GetDuplicateSuggestions {
    query: { limit?: number };
    response: ApiResponse<{
      total: number;
      suggestions: any[];
    }>;
  }

  /**
   * POST /api/contacts/not-duplicate
   * Mark two contacts as not duplicates
   */
  export interface MarkNotDuplicate {
    request: {
      contactId1: string;
      contactId2: string;
    };
    response: ApiResponse<any>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 18. LIFECYCLE WORKFLOW (10 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace Lifecycle {
  export interface Workflow {
    _id: ObjectId;
    name: string;
    entityType: 'lead' | 'client' | 'opportunity' | 'case';
    lifecycleType: 'onboarding' | 'nurture' | 'retention' | 'offboarding';
    description?: string;
    stages: Array<{
      _id: ObjectId;
      name: string;
      order: number;
      durationDays?: number;
      tasks: Array<{
        name: string;
        type: 'manual' | 'automated';
        assignTo?: 'owner' | 'specific';
        assignedUserId?: ObjectId;
      }>;
      automations?: any[];
    }>;
    notifications?: any;
    isActive: boolean;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface WorkflowInstance {
    _id: ObjectId;
    workflowId: ObjectId;
    entityType: string;
    entityId: ObjectId;
    entityName: string;
    currentStage: number;
    status: 'active' | 'completed' | 'cancelled';
    startedAt: Date;
    completedAt?: Date;
    metadata?: any;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * GET /api/lifecycle/workflows
   * List all workflows
   */
  export interface ListWorkflows {
    query: {
      page?: number;
      limit?: number;
      entityType?: string;
      lifecycleType?: string;
      isActive?: string;
    };
    response: PaginatedResponse<Workflow>;
  }

  /**
   * POST /api/lifecycle/workflows
   * Create workflow
   */
  export interface CreateWorkflow {
    request: {
      name: string;
      entityType: 'lead' | 'client' | 'opportunity' | 'case';
      lifecycleType: 'onboarding' | 'nurture' | 'retention' | 'offboarding';
      description?: string;
      stages: any[];
      notifications?: any;
      isActive?: boolean;
    };
    response: ApiResponse<Workflow>;
  }

  /**
   * GET /api/lifecycle/workflows/:id
   * Get workflow by ID
   */
  export interface GetWorkflow {
    params: { id: string };
    response: ApiResponse<Workflow>;
  }

  /**
   * PUT /api/lifecycle/workflows/:id
   * Update workflow
   */
  export interface UpdateWorkflow {
    params: { id: string };
    request: Partial<{
      name: string;
      description: string;
      stages: any[];
      notifications: any;
      isActive: boolean;
    }>;
    response: ApiResponse<Workflow>;
  }

  /**
   * DELETE /api/lifecycle/workflows/:id
   * Delete workflow
   */
  export interface DeleteWorkflow {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/lifecycle/initiate
   * Initiate workflow for entity
   */
  export interface InitiateWorkflow {
    request: {
      workflowId: string;
      entityType: string;
      entityId: string;
      entityName: string;
      metadata?: any;
    };
    response: ApiResponse<WorkflowInstance>;
  }

  /**
   * GET /api/lifecycle/:entityType/:entityId
   * Get active workflows for entity
   */
  export interface GetActiveWorkflows {
    params: { entityType: string; entityId: string };
    response: ApiResponse<WorkflowInstance[]>;
  }

  /**
   * GET /api/lifecycle/instance/:id/progress
   * Get workflow progress
   */
  export interface GetProgress {
    params: { id: string };
    response: ApiResponse<{
      instance: WorkflowInstance;
      progress: number;
      currentStage: any;
      nextStage?: any;
    }>;
  }

  /**
   * POST /api/lifecycle/instance/:id/advance
   * Advance to next stage
   */
  export interface AdvanceStage {
    params: { id: string };
    response: ApiResponse<WorkflowInstance>;
  }

  /**
   * POST /api/lifecycle/instance/:id/cancel
   * Cancel workflow
   */
  export interface CancelWorkflow {
    params: { id: string };
    request: { reason: string };
    response: ApiResponse<WorkflowInstance>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 19. PLAYBOOK (15 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace Playbook {
  export interface Playbook {
    _id: ObjectId;
    name: string;
    description?: string;
    category: 'sales' | 'customer_success' | 'support' | 'general';
    trigger: {
      type: 'manual' | 'automatic';
      conditions?: any[];
    };
    steps: Array<{
      _id: ObjectId;
      name: string;
      description?: string;
      order: number;
      type: 'task' | 'email' | 'call' | 'meeting' | 'decision';
      config?: any;
      required: boolean;
    }>;
    isActive: boolean;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface PlaybookExecution {
    _id: ObjectId;
    playbookId: ObjectId;
    entityType: string;
    entityId: ObjectId;
    currentStep: number;
    status: 'active' | 'completed' | 'aborted';
    steps: Array<{
      stepId: ObjectId;
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      startedAt?: Date;
      completedAt?: Date;
      result?: any;
    }>;
    startedBy: ObjectId;
    startedAt: Date;
    completedAt?: Date;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * GET /api/playbooks
   * List all playbooks
   */
  export interface ListPlaybooks {
    query: {
      category?: string;
      isActive?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<Playbook>;
  }

  /**
   * POST /api/playbooks
   * Create playbook
   */
  export interface CreatePlaybook {
    request: {
      name: string;
      description?: string;
      category: 'sales' | 'customer_success' | 'support' | 'general';
      trigger: any;
      steps: any[];
      isActive?: boolean;
    };
    response: ApiResponse<Playbook>;
  }

  /**
   * GET /api/playbooks/:id
   * Get playbook by ID
   */
  export interface GetPlaybook {
    params: { id: string };
    response: ApiResponse<Playbook>;
  }

  /**
   * PUT /api/playbooks/:id
   * Update playbook
   */
  export interface UpdatePlaybook {
    params: { id: string };
    request: Partial<{
      name: string;
      description: string;
      category: string;
      trigger: any;
      steps: any[];
      isActive: boolean;
    }>;
    response: ApiResponse<Playbook>;
  }

  /**
   * DELETE /api/playbooks/:id
   * Delete playbook
   */
  export interface DeletePlaybook {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/playbooks/:id/execute
   * Start playbook execution
   */
  export interface StartExecution {
    params: { id: string };
    request: {
      entityType: string;
      entityId: string;
    };
    response: ApiResponse<PlaybookExecution>;
  }

  /**
   * POST /api/playbook-executions/:id/advance
   * Advance to next step
   */
  export interface AdvanceStep {
    params: { id: string };
    request: { result?: any };
    response: ApiResponse<PlaybookExecution>;
  }

  /**
   * POST /api/playbook-executions/:id/skip
   * Skip current step
   */
  export interface SkipStep {
    params: { id: string };
    request: { reason: string };
    response: ApiResponse<PlaybookExecution>;
  }

  /**
   * POST /api/playbook-executions/:id/abort
   * Abort execution
   */
  export interface AbortExecution {
    params: { id: string };
    request: { reason: string };
    response: ApiResponse<PlaybookExecution>;
  }

  /**
   * POST /api/playbook-executions/:id/retry
   * Retry failed step
   */
  export interface RetryStep {
    params: { id: string };
    response: ApiResponse<PlaybookExecution>;
  }

  /**
   * GET /api/playbook-executions/:id
   * Get execution status
   */
  export interface GetExecutionStatus {
    params: { id: string };
    response: ApiResponse<PlaybookExecution>;
  }

  /**
   * GET /api/playbook-executions/history
   * Get execution history
   */
  export interface GetExecutionHistory {
    query: {
      playbookId?: string;
      entityType?: string;
      entityId?: string;
      status?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<PlaybookExecution>;
  }

  /**
   * POST /api/playbooks/match
   * Match playbook to entity
   */
  export interface MatchPlaybook {
    request: {
      entityType: string;
      entityId: string;
      context?: any;
    };
    response: ApiResponse<Playbook[]>;
  }

  /**
   * GET /api/playbooks/:id/stats
   * Get playbook statistics
   */
  export interface GetPlaybookStats {
    params: { id: string };
    response: ApiResponse<{
      totalExecutions: number;
      completed: number;
      aborted: number;
      avgCompletionTime: number;
      successRate: number;
    }>;
  }

  /**
   * GET /api/playbook-executions/stats
   * Get execution statistics
   */
  export interface GetExecutionStats {
    query: DateRange;
    response: ApiResponse<{
      total: number;
      byStatus: Record<string, number>;
      byCategory: Record<string, number>;
      avgCompletionTime: number;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 20. TERRITORY (9 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace Territory {
  export interface Territory {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    code?: string;
    description?: string;
    type: 'geographic' | 'industry' | 'account_size' | 'custom';
    parentId?: ObjectId;
    level: number;
    rules?: {
      geographic?: {
        countries?: string[];
        regions?: string[];
        cities?: string[];
      };
      industry?: string[];
      accountSize?: {
        min?: number;
        max?: number;
      };
      custom?: any;
    };
    assignedTo: ObjectId[];
    stats?: {
      totalLeads: number;
      totalClients: number;
      totalRevenue: number;
    };
    isActive: boolean;
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateRequest {
    name: string;
    nameAr?: string;
    code?: string;
    description?: string;
    type: 'geographic' | 'industry' | 'account_size' | 'custom';
    parentId?: string;
    rules?: any;
    assignedTo?: string[];
  }

  /**
   * POST /api/territories
   * Create territory
   */
  export interface CreateTerritory {
    request: CreateRequest;
    response: ApiResponse<Territory>;
  }

  /**
   * GET /api/territories
   * Get all territories
   */
  export interface GetTerritories {
    query: {
      type?: string;
      parentId?: string;
      assignedTo?: string;
      isActive?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<Territory>;
  }

  /**
   * GET /api/territories/:id
   * Get territory by ID
   */
  export interface GetTerritoryById {
    params: { id: string };
    response: ApiResponse<Territory>;
  }

  /**
   * PUT /api/territories/:id
   * Update territory
   */
  export interface UpdateTerritory {
    params: { id: string };
    request: Partial<CreateRequest>;
    response: ApiResponse<Territory>;
  }

  /**
   * DELETE /api/territories/:id
   * Delete territory
   */
  export interface DeleteTerritory {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * GET /api/territories/tree
   * Get territory tree
   */
  export interface GetTree {
    query: { includeInactive?: string };
    response: ApiResponse<any[]>;
  }

  /**
   * GET /api/territories/:id/children
   * Get child territories
   */
  export interface GetChildren {
    params: { id: string };
    response: ApiResponse<Territory[]>;
  }

  /**
   * GET /api/territories/:id/stats
   * Get territory statistics
   */
  export interface GetTerritoryStats {
    params: { id: string };
    query: DateRange;
    response: ApiResponse<{
      totalLeads: number;
      totalClients: number;
      totalRevenue: number;
      conversionRate: number;
      topPerformers: any[];
    }>;
  }

  /**
   * POST /api/territories/:id/move
   * Move territory to new parent
   */
  export interface MoveTerritory {
    params: { id: string };
    request: { newParentId?: string };
    response: ApiResponse<Territory>;
  }
}

// ═══════════════════════════════════════════════════════════════
// 21. BROKERS (6 endpoints)
// ═══════════════════════════════════════════════════════════════

export namespace Brokers {
  export interface Broker {
    _id: ObjectId;
    name: string;
    nameAr?: string;
    email?: string;
    phone?: string;
    company?: string;
    commissionRate?: number;
    isDefault: boolean;
    isActive: boolean;
    stats?: {
      totalReferrals: number;
      convertedReferrals: number;
      totalCommission: number;
    };
    firmId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateRequest {
    name: string;
    nameAr?: string;
    email?: string;
    phone?: string;
    company?: string;
    commissionRate?: number;
    isDefault?: boolean;
  }

  /**
   * POST /api/brokers
   * Create broker
   */
  export interface CreateBroker {
    request: CreateRequest;
    response: ApiResponse<Broker>;
  }

  /**
   * GET /api/brokers
   * Get all brokers
   */
  export interface GetBrokers {
    query: {
      isActive?: string;
      search?: string;
      page?: number;
      limit?: number;
    };
    response: PaginatedResponse<Broker>;
  }

  /**
   * GET /api/brokers/:id
   * Get broker by ID
   */
  export interface GetBroker {
    params: { id: string };
    response: ApiResponse<Broker>;
  }

  /**
   * PUT /api/brokers/:id
   * Update broker
   */
  export interface UpdateBroker {
    params: { id: string };
    request: Partial<CreateRequest>;
    response: ApiResponse<Broker>;
  }

  /**
   * DELETE /api/brokers/:id
   * Delete broker
   */
  export interface DeleteBroker {
    params: { id: string };
    response: ApiResponse<void>;
  }

  /**
   * POST /api/brokers/:id/set-default
   * Set broker as default
   */
  export interface SetDefaultBroker {
    params: { id: string };
    response: ApiResponse<Broker>;
  }
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * ENDPOINT SUMMARY
 *
 * 1. Activity Plan: 6 endpoints
 * 2. CRM Pipeline: 13 endpoints
 * 3. CRM Reports: 27 endpoints
 * 4. CRM Settings: 3 endpoints
 * 5. CRM Transaction: 15 endpoints
 * 6. Chatter Follower: 7 endpoints
 * 7. Churn Management: 24 endpoints
 * 8. Sales Order: 18 endpoints
 * 9. Sales Forecast: 11 endpoints
 * 10. Sales Person: 7 endpoints
 * 11. Sales Quota: 10 endpoints
 * 12. Sales Stage: 7 endpoints
 * 13. Sales Team: 10 endpoints
 * 14. Price Level: 7 endpoints
 * 15. Deal Health: 6 endpoints
 * 16. Deal Room: 11 endpoints
 * 17. Deduplication: 6 endpoints
 * 18. Lifecycle Workflow: 10 endpoints
 * 19. Playbook: 15 endpoints
 * 20. Territory: 9 endpoints
 * 21. Brokers: 6 endpoints
 *
 * TOTAL: 228 ENDPOINTS
 *
 * All endpoints enforce:
 * - Multi-tenant isolation via firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 * - IDOR protection via firm-level access control
 * - Input validation and error handling
 */
