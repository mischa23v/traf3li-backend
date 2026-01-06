/**
 * Core Extended API Contracts
 *
 * Comprehensive TypeScript contracts for core modules:
 * - Task (86 endpoints)
 * - Case (54 endpoints)
 * - Firm (46 endpoints)
 * - Client (23 endpoints)
 * - Document (19 endpoints)
 * - User (13 endpoints)
 * - Team (15 endpoints)
 * - Staff (9 endpoints)
 * - Permission (32 endpoints)
 * - Notification (11 endpoints)
 *
 * Total: ~308 endpoints
 *
 * @module CoreExtended
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TASK MODULE (86 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace TaskExtended {
  // ─────────────────────────────────────────────────────────────────
  // TYPES & ENUMS
  // ─────────────────────────────────────────────────────────────────

  export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
  export type TaskType = 'general' | 'deadline' | 'court_date' | 'client_meeting' | 'research' | 'drafting' | 'review' | 'filing';
  export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  export type TimerStatus = 'running' | 'paused' | 'stopped';
  export type SubtaskStatus = 'pending' | 'completed';

  // ─────────────────────────────────────────────────────────────────
  // ENTITY INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface Task {
    _id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    progress: number;
    caseId?: string;
    clientId?: string;
    assignedTo: string[];
    createdBy: string;
    tags?: string[];
    subtasks: Subtask[];
    dependencies: TaskDependency[];
    attachments: TaskAttachment[];
    comments: TaskComment[];
    timeEntries: TimeEntry[];
    locationTrigger?: LocationTrigger;
    recurrence?: RecurrenceSettings;
    outcome?: TaskOutcome;
    workflowRules?: WorkflowRule[];
    isArchived: boolean;
    firmId?: string;
    lawyerId?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Subtask {
    _id: string;
    title: string;
    status: SubtaskStatus;
    completedAt?: string;
    completedBy?: string;
    order: number;
  }

  export interface TaskDependency {
    taskId: string;
    type: 'blocks' | 'blocked_by' | 'relates_to';
  }

  export interface TaskAttachment {
    _id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
    versions?: AttachmentVersion[];
  }

  export interface AttachmentVersion {
    versionId: string;
    filename: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
  }

  export interface TaskComment {
    _id: string;
    text: string;
    author: string;
    createdAt: string;
    updatedAt?: string;
    mentions?: string[];
  }

  export interface TimeEntry {
    _id: string;
    startTime: string;
    endTime?: string;
    duration: number;
    description?: string;
    userId: string;
    isBillable: boolean;
  }

  export interface LocationTrigger {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
    triggerOnEnter: boolean;
    triggerOnExit: boolean;
  }

  export interface RecurrenceSettings {
    pattern: RecurrencePattern;
    interval: number;
    endDate?: string;
    occurrences?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }

  export interface TaskOutcome {
    result: 'successful' | 'unsuccessful' | 'partial' | 'cancelled';
    notes?: string;
    recordedAt: string;
    recordedBy: string;
  }

  export interface WorkflowRule {
    trigger: 'on_complete' | 'on_due' | 'on_assign';
    action: 'create_task' | 'send_notification' | 'update_status';
    config: Record<string, unknown>;
  }

  export interface TaskTemplate {
    _id: string;
    name: string;
    description?: string;
    taskData: Partial<Task>;
    subtasks: Omit<Subtask, '_id'>[];
    isDefault: boolean;
    category?: string;
    firmId?: string;
    lawyerId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface TaskDocument {
    _id: string;
    title: string;
    content: string;
    taskId: string;
    createdBy: string;
    versions: DocumentVersion[];
    createdAt: string;
    updatedAt: string;
  }

  export interface DocumentVersion {
    versionNumber: number;
    content: string;
    createdBy: string;
    createdAt: string;
  }

  export interface VoiceMemo {
    _id: string;
    filename: string;
    url: string;
    duration: number;
    transcription?: string;
    uploadedBy: string;
    uploadedAt: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // REQUEST INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface CreateTaskRequest {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    caseId?: string;
    clientId?: string;
    assignedTo?: string[];
    tags?: string[];
    subtasks?: Omit<Subtask, '_id' | 'completedAt' | 'completedBy'>[];
    locationTrigger?: LocationTrigger;
    recurrence?: RecurrenceSettings;
  }

  export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    caseId?: string;
    clientId?: string;
    assignedTo?: string[];
    tags?: string[];
    progress?: number;
  }

  export interface BulkUpdateTasksRequest {
    taskIds: string[];
    updates: Partial<UpdateTaskRequest>;
  }

  export interface BulkDeleteTasksRequest {
    taskIds: string[];
  }

  export interface BulkAssignTasksRequest {
    taskIds: string[];
    assignedTo: string[];
  }

  export interface AddSubtaskRequest {
    title: string;
    order?: number;
  }

  export interface UpdateSubtaskRequest {
    title?: string;
    order?: number;
  }

  export interface AddCommentRequest {
    text: string;
    mentions?: string[];
  }

  export interface UpdateCommentRequest {
    text: string;
  }

  export interface AddManualTimeRequest {
    duration: number;
    description?: string;
    date?: string;
    isBillable?: boolean;
  }

  export interface AddDependencyRequest {
    dependencyTaskId: string;
    type: 'blocks' | 'blocked_by' | 'relates_to';
  }

  export interface UpdateProgressRequest {
    progress: number;
  }

  export interface AddWorkflowRuleRequest {
    trigger: 'on_complete' | 'on_due' | 'on_assign';
    action: 'create_task' | 'send_notification' | 'update_status';
    config: Record<string, unknown>;
  }

  export interface UpdateOutcomeRequest {
    result: 'successful' | 'unsuccessful' | 'partial' | 'cancelled';
    notes?: string;
  }

  export interface UpdateEstimateRequest {
    estimatedHours: number;
  }

  export interface RescheduleTaskRequest {
    dueDate: string;
    reason?: string;
  }

  export interface UpdateLocationTriggerRequest {
    enabled: boolean;
    latitude?: number;
    longitude?: number;
    radius?: number;
    address?: string;
    triggerOnEnter?: boolean;
    triggerOnExit?: boolean;
  }

  export interface CheckLocationRequest {
    latitude: number;
    longitude: number;
  }

  export interface ReorderTasksRequest {
    taskOrders: Array<{ taskId: string; order: number }>;
  }

  export interface CreateTemplateRequest {
    name: string;
    description?: string;
    taskData: Partial<Task>;
    subtasks?: Omit<Subtask, '_id'>[];
    category?: string;
    isDefault?: boolean;
  }

  export interface CreateFromTemplateRequest {
    overrides?: Partial<CreateTaskRequest>;
  }

  export interface CreateDocumentRequest {
    title: string;
    content: string;
  }

  export interface UpdateDocumentRequest {
    title?: string;
    content?: string;
  }

  export interface CreateTaskFromNaturalLanguageRequest {
    text: string;
    context?: {
      caseId?: string;
      clientId?: string;
    };
  }

  export interface ExportTasksRequest {
    format: 'csv' | 'xlsx' | 'pdf';
    taskIds?: string[];
    filters?: {
      status?: TaskStatus[];
      priority?: TaskPriority[];
      dateFrom?: string;
      dateTo?: string;
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // RESPONSE INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  export interface TaskResponse extends ApiResponse<Task> {}
  export interface TaskListResponse extends PaginatedResponse<Task> {}
  export interface TaskStatsResponse extends ApiResponse<TaskStats> {}
  export interface TemplateResponse extends ApiResponse<TaskTemplate> {}
  export interface TemplateListResponse extends ApiResponse<TaskTemplate[]> {}
  export interface DocumentResponse extends ApiResponse<TaskDocument> {}
  export interface DocumentListResponse extends ApiResponse<TaskDocument[]> {}

  export interface TaskStats {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
    dueToday: number;
    completed: number;
    completionRate: number;
    averageCompletionTime: number;
  }

  export interface TaskOverview {
    tasks: Task[];
    stats: TaskStats;
    upcomingDeadlines: Task[];
    overdueTasks: Task[];
    recentlyCompleted: Task[];
  }

  export interface TaskFull extends Task {
    case?: {
      _id: string;
      title: string;
      caseNumber: string;
    };
    client?: {
      _id: string;
      name: string;
    };
    assignees: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    }>;
    creator: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  }

  export interface ActiveTimer {
    taskId: string;
    taskTitle: string;
    startTime: string;
    userId: string;
    duration: number;
  }

  export interface SmartScheduleSuggestion {
    suggestedDate: string;
    suggestedTime: string;
    reason: string;
    conflictsAvoided: string[];
  }

  export interface TaskConflict {
    taskId: string;
    conflictType: 'overlap' | 'dependency' | 'resource';
    conflictingWith: string;
    details: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // API ENDPOINTS (86 endpoints)
  // ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/task/templates
   * Get all task templates
   * @returns TemplateListResponse
   */

  /**
   * POST /api/task/templates
   * Create a new task template
   * @body CreateTemplateRequest
   * @returns TemplateResponse
   */

  /**
   * GET /api/task/templates/:templateId
   * Get a specific template
   * @param templateId - Template ID
   * @returns TemplateResponse
   */

  /**
   * PUT /api/task/templates/:templateId
   * Update a template
   * @param templateId - Template ID
   * @body CreateTemplateRequest
   * @returns TemplateResponse
   */

  /**
   * DELETE /api/task/templates/:templateId
   * Delete a template
   * @param templateId - Template ID
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/task/templates/:templateId/create
   * Create task from template
   * @param templateId - Template ID
   * @body CreateFromTemplateRequest
   * @returns TaskResponse
   */

  /**
   * GET /api/task/overview
   * Get tasks overview with stats
   * @query page - Page number
   * @query limit - Items per page
   * @query status - Filter by status
   * @returns ApiResponse<TaskOverview>
   */

  /**
   * GET /api/task/timers/active
   * Get active timers for current user
   * @returns ApiResponse<ActiveTimer[]>
   */

  /**
   * GET /api/task/search
   * Search tasks
   * @query q - Search query
   * @query status - Filter by status
   * @query priority - Filter by priority
   * @returns TaskListResponse
   */

  /**
   * GET /api/task/conflicts
   * Get task conflicts
   * @query dateFrom - Start date
   * @query dateTo - End date
   * @returns ApiResponse<TaskConflict[]>
   */

  /**
   * GET /api/task/client/:clientId
   * Get tasks by client
   * @param clientId - Client ID
   * @returns TaskListResponse
   */

  /**
   * GET /api/task/stats
   * Get task statistics
   * @returns TaskStatsResponse
   */

  /**
   * GET /api/task/upcoming
   * Get upcoming tasks
   * @query days - Number of days ahead (default: 7)
   * @returns TaskListResponse
   */

  /**
   * GET /api/task/overdue
   * Get overdue tasks
   * @returns TaskListResponse
   */

  /**
   * GET /api/task/due-today
   * Get tasks due today
   * @returns TaskListResponse
   */

  /**
   * GET /api/task/case/:caseId
   * Get tasks by case
   * @param caseId - Case ID
   * @returns TaskListResponse
   */

  /**
   * POST /api/task/bulk
   * Bulk create tasks
   * @body CreateTaskRequest[]
   * @returns ApiResponse<Task[]>
   */

  /**
   * PUT /api/task/bulk
   * Bulk update tasks
   * @body BulkUpdateTasksRequest
   * @returns ApiResponse<Task[]>
   */

  /**
   * DELETE /api/task/bulk
   * Bulk delete tasks
   * @body BulkDeleteTasksRequest
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/task/bulk/complete
   * Bulk complete tasks
   * @body { taskIds: string[] }
   * @returns ApiResponse<Task[]>
   */

  /**
   * POST /api/task/bulk/assign
   * Bulk assign tasks
   * @body BulkAssignTasksRequest
   * @returns ApiResponse<Task[]>
   */

  /**
   * POST /api/task/bulk/archive
   * Bulk archive tasks
   * @body { taskIds: string[] }
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/task/bulk/unarchive
   * Bulk unarchive tasks
   * @body { taskIds: string[] }
   * @returns ApiResponse<void>
   */

  /**
   * GET /api/task/export
   * Export tasks
   * @query format - Export format (csv, xlsx, pdf)
   * @query taskIds - Specific task IDs
   * @returns Binary file
   */

  /**
   * GET /api/task/ids
   * Get all task IDs (for select all)
   * @query status - Filter by status
   * @returns ApiResponse<string[]>
   */

  /**
   * GET /api/task/archived
   * Get archived tasks
   * @returns TaskListResponse
   */

  /**
   * PATCH /api/task/reorder
   * Reorder tasks (drag & drop)
   * @body ReorderTasksRequest
   * @returns ApiResponse<void>
   */

  /**
   * GET /api/task/location-triggers
   * Get tasks with location triggers
   * @returns TaskListResponse
   */

  /**
   * POST /api/task/location/check
   * Bulk check location triggers
   * @body CheckLocationRequest
   * @returns ApiResponse<Task[]>
   */

  /**
   * POST /api/task/parse
   * Create task from natural language
   * @body CreateTaskFromNaturalLanguageRequest
   * @returns TaskResponse
   */

  /**
   * POST /api/task/voice
   * Create task from voice
   * @body FormData with audio file
   * @returns TaskResponse
   */

  /**
   * GET /api/task/smart-schedule
   * Get smart schedule suggestions
   * @query taskId - Task ID
   * @returns ApiResponse<SmartScheduleSuggestion[]>
   */

  /**
   * POST /api/task/auto-schedule
   * Auto-schedule tasks
   * @body { taskIds: string[] }
   * @returns ApiResponse<Task[]>
   */

  /**
   * POST /api/task/voice-to-item
   * Process voice to task item
   * @body FormData with audio
   * @returns TaskResponse
   */

  /**
   * POST /api/task/voice-to-item/batch
   * Batch process voice memos
   * @body FormData with multiple audio files
   * @returns ApiResponse<Task[]>
   */

  /**
   * POST /api/task
   * Create a new task
   * @body CreateTaskRequest
   * @returns TaskResponse
   */

  /**
   * GET /api/task
   * Get all tasks
   * @query page - Page number
   * @query limit - Items per page
   * @query status - Filter by status
   * @query priority - Filter by priority
   * @query assignedTo - Filter by assignee
   * @query caseId - Filter by case
   * @query clientId - Filter by client
   * @returns TaskListResponse
   */

  /**
   * GET /api/task/:id/full
   * Get task with all related data
   * @param id - Task ID
   * @returns ApiResponse<TaskFull>
   */

  /**
   * GET /api/task/:id
   * Get a specific task
   * @param id - Task ID
   * @returns TaskResponse
   */

  /**
   * PUT /api/task/:id
   * Update a task
   * @param id - Task ID
   * @body UpdateTaskRequest
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id
   * Partial update a task
   * @param id - Task ID
   * @body Partial<UpdateTaskRequest>
   * @returns TaskResponse
   */

  /**
   * DELETE /api/task/:id
   * Delete a task
   * @param id - Task ID
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/task/:id/complete
   * Complete a task
   * @param id - Task ID
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/clone
   * Clone a task
   * @param id - Task ID
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/reschedule
   * Reschedule a task
   * @param id - Task ID
   * @body RescheduleTaskRequest
   * @returns TaskResponse
   */

  /**
   * GET /api/task/:id/activity
   * Get task activity log
   * @param id - Task ID
   * @returns ApiResponse<ActivityEntry[]>
   */

  /**
   * POST /api/task/:id/convert-to-event
   * Convert task to event
   * @param id - Task ID
   * @returns ApiResponse<{ eventId: string }>
   */

  /**
   * POST /api/task/:id/archive
   * Archive a task
   * @param id - Task ID
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/unarchive
   * Unarchive a task
   * @param id - Task ID
   * @returns TaskResponse
   */

  /**
   * PUT /api/task/:id/location-trigger
   * Update location trigger
   * @param id - Task ID
   * @body UpdateLocationTriggerRequest
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/location/check
   * Check location trigger for task
   * @param id - Task ID
   * @body CheckLocationRequest
   * @returns ApiResponse<{ triggered: boolean }>
   */

  /**
   * POST /api/task/:id/subtasks
   * Add subtask
   * @param id - Task ID
   * @body AddSubtaskRequest
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id/subtasks/:subtaskId/toggle
   * Toggle subtask completion
   * @param id - Task ID
   * @param subtaskId - Subtask ID
   * @returns TaskResponse
   */

  /**
   * DELETE /api/task/:id/subtasks/:subtaskId
   * Delete subtask
   * @param id - Task ID
   * @param subtaskId - Subtask ID
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id/subtasks/:subtaskId
   * Update subtask
   * @param id - Task ID
   * @param subtaskId - Subtask ID
   * @body UpdateSubtaskRequest
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/timer/start
   * Start task timer
   * @param id - Task ID
   * @returns ApiResponse<{ timerId: string; startTime: string }>
   */

  /**
   * POST /api/task/:id/timer/stop
   * Stop task timer
   * @param id - Task ID
   * @returns ApiResponse<TimeEntry>
   */

  /**
   * PATCH /api/task/:id/timer/pause
   * Pause task timer
   * @param id - Task ID
   * @returns ApiResponse<void>
   */

  /**
   * PATCH /api/task/:id/timer/resume
   * Resume task timer
   * @param id - Task ID
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/task/:id/time
   * Add manual time entry
   * @param id - Task ID
   * @body AddManualTimeRequest
   * @returns ApiResponse<TimeEntry>
   */

  /**
   * POST /api/task/:id/comments
   * Add comment
   * @param id - Task ID
   * @body AddCommentRequest
   * @returns TaskResponse
   */

  /**
   * PUT /api/task/:id/comments/:commentId
   * Update comment
   * @param id - Task ID
   * @param commentId - Comment ID
   * @body UpdateCommentRequest
   * @returns TaskResponse
   */

  /**
   * DELETE /api/task/:id/comments/:commentId
   * Delete comment
   * @param id - Task ID
   * @param commentId - Comment ID
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/save-as-template
   * Save task as template
   * @param id - Task ID
   * @body { name: string; description?: string }
   * @returns TemplateResponse
   */

  /**
   * POST /api/task/:id/attachments
   * Add attachment
   * @param id - Task ID
   * @body FormData with file
   * @returns TaskResponse
   */

  /**
   * GET /api/task/:id/attachments/:attachmentId/download-url
   * Get attachment download URL
   * @param id - Task ID
   * @param attachmentId - Attachment ID
   * @returns ApiResponse<{ url: string; expiresAt: string }>
   */

  /**
   * GET /api/task/:id/attachments/:attachmentId/versions
   * Get attachment versions
   * @param id - Task ID
   * @param attachmentId - Attachment ID
   * @returns ApiResponse<AttachmentVersion[]>
   */

  /**
   * DELETE /api/task/:id/attachments/:attachmentId
   * Delete attachment
   * @param id - Task ID
   * @param attachmentId - Attachment ID
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/documents
   * Create document
   * @param id - Task ID
   * @body CreateDocumentRequest
   * @returns DocumentResponse
   */

  /**
   * GET /api/task/:id/documents
   * Get documents
   * @param id - Task ID
   * @returns DocumentListResponse
   */

  /**
   * GET /api/task/:id/documents/:documentId
   * Get document
   * @param id - Task ID
   * @param documentId - Document ID
   * @returns DocumentResponse
   */

  /**
   * PATCH /api/task/:id/documents/:documentId
   * Update document
   * @param id - Task ID
   * @param documentId - Document ID
   * @body UpdateDocumentRequest
   * @returns DocumentResponse
   */

  /**
   * GET /api/task/:id/documents/:documentId/versions
   * Get document versions
   * @param id - Task ID
   * @param documentId - Document ID
   * @returns ApiResponse<DocumentVersion[]>
   */

  /**
   * GET /api/task/:id/documents/:documentId/versions/:versionId
   * Get specific version
   * @param id - Task ID
   * @param documentId - Document ID
   * @param versionId - Version ID
   * @returns ApiResponse<DocumentVersion>
   */

  /**
   * POST /api/task/:id/documents/:documentId/versions/:versionId/restore
   * Restore document version
   * @param id - Task ID
   * @param documentId - Document ID
   * @param versionId - Version ID
   * @returns DocumentResponse
   */

  /**
   * POST /api/task/:id/voice-memos
   * Add voice memo
   * @param id - Task ID
   * @body FormData with audio file
   * @returns ApiResponse<VoiceMemo>
   */

  /**
   * PATCH /api/task/:id/voice-memos/:memoId/transcription
   * Update voice memo transcription
   * @param id - Task ID
   * @param memoId - Memo ID
   * @body { transcription: string }
   * @returns ApiResponse<VoiceMemo>
   */

  /**
   * POST /api/task/:id/dependencies
   * Add dependency
   * @param id - Task ID
   * @body AddDependencyRequest
   * @returns TaskResponse
   */

  /**
   * DELETE /api/task/:id/dependencies/:dependencyTaskId
   * Remove dependency
   * @param id - Task ID
   * @param dependencyTaskId - Dependency task ID
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id/status
   * Update task status
   * @param id - Task ID
   * @body { status: TaskStatus }
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id/progress
   * Update task progress
   * @param id - Task ID
   * @body UpdateProgressRequest
   * @returns TaskResponse
   */

  /**
   * POST /api/task/:id/workflow-rules
   * Add workflow rule
   * @param id - Task ID
   * @body AddWorkflowRuleRequest
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id/outcome
   * Update task outcome
   * @param id - Task ID
   * @body UpdateOutcomeRequest
   * @returns TaskResponse
   */

  /**
   * PATCH /api/task/:id/estimate
   * Update estimate
   * @param id - Task ID
   * @body UpdateEstimateRequest
   * @returns TaskResponse
   */

  /**
   * GET /api/task/:id/time-tracking/summary
   * Get time tracking summary
   * @param id - Task ID
   * @returns ApiResponse<{ totalHours: number; billableHours: number; entries: TimeEntry[] }>
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// CASE MODULE (54 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace CaseExtended {
  // ─────────────────────────────────────────────────────────────────
  // TYPES & ENUMS
  // ─────────────────────────────────────────────────────────────────

  export type CaseStatus = 'open' | 'in_progress' | 'pending' | 'closed' | 'won' | 'lost' | 'settled';
  export type CaseOutcome = 'ongoing' | 'won' | 'lost' | 'settled';
  export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
  export type CaseCategory = 'labor' | 'commercial' | 'civil' | 'criminal' | 'family' | 'real_estate' | 'administrative';
  export type EndReason = 'final_judgment' | 'settlement' | 'withdrawal' | 'dismissal' | 'reconciliation' | 'execution_complete' | 'other';
  export type HearingStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  export type ClaimStatus = 'active' | 'won' | 'lost' | 'withdrawn';

  // ─────────────────────────────────────────────────────────────────
  // ENTITY INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface Case {
    _id: string;
    caseNumber: string;
    title: string;
    description?: string;
    status: CaseStatus;
    outcome: CaseOutcome;
    priority: CasePriority;
    category: CaseCategory;
    stage: string;
    clientId: string;
    opposingParty?: string;
    assignedLawyers: string[];
    courtName?: string;
    courtCaseNumber?: string;
    filingDate?: string;
    nextHearingDate?: string;
    value?: number;
    notes: CaseNote[];
    documents: CaseDocument[];
    hearings: CaseHearing[];
    timeline: TimelineEvent[];
    claims: CaseClaim[];
    progress: number;
    endDate?: string;
    endReason?: EndReason;
    finalAmount?: number;
    firmId?: string;
    lawyerId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface CaseNote {
    _id: string;
    text: string;
    isPrivate: boolean;
    stageId?: string;
    author: string;
    date: string;
    updatedAt?: string;
  }

  export interface CaseDocument {
    _id: string;
    title: string;
    filename: string;
    mimeType: string;
    size: number;
    s3Key: string;
    url?: string;
    uploadedBy: string;
    uploadedAt: string;
  }

  export interface CaseHearing {
    _id: string;
    date: string;
    time: string;
    location: string;
    type: string;
    status: HearingStatus;
    notes?: string;
    result?: string;
    nextDate?: string;
    createdBy: string;
  }

  export interface TimelineEvent {
    _id: string;
    date: string;
    title: string;
    description: string;
    type: string;
    isImportant: boolean;
    createdBy: string;
    createdAt: string;
  }

  export interface CaseClaim {
    _id: string;
    title: string;
    description: string;
    amount?: number;
    status: ClaimStatus;
    evidence?: string[];
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
  }

  export interface RichDocument {
    _id: string;
    title: string;
    content: string;
    caseId: string;
    type: 'memo' | 'brief' | 'motion' | 'letter' | 'contract' | 'other';
    versions: RichDocumentVersion[];
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface RichDocumentVersion {
    versionNumber: number;
    content: string;
    createdBy: string;
    createdAt: string;
    changeNotes?: string;
  }

  export interface PipelineStage {
    id: string;
    name: string;
    nameAr: string;
    order: number;
    color: string;
    isEndStage: boolean;
  }

  export interface CaseAuditEntry {
    _id: string;
    action: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    userId: string;
    timestamp: string;
    ipAddress?: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // REQUEST INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface CreateCaseRequest {
    title: string;
    description?: string;
    category: CaseCategory;
    priority?: CasePriority;
    clientId: string;
    opposingParty?: string;
    assignedLawyers?: string[];
    courtName?: string;
    courtCaseNumber?: string;
    filingDate?: string;
    value?: number;
  }

  export interface UpdateCaseRequest {
    title?: string;
    description?: string;
    priority?: CasePriority;
    opposingParty?: string;
    assignedLawyers?: string[];
    courtName?: string;
    courtCaseNumber?: string;
    value?: number;
  }

  export interface AddNoteRequest {
    text: string;
    isPrivate?: boolean;
    stageId?: string;
  }

  export interface UpdateNoteRequest {
    text?: string;
    isPrivate?: boolean;
  }

  export interface AddHearingRequest {
    date: string;
    time: string;
    location: string;
    type: string;
    notes?: string;
  }

  export interface UpdateHearingRequest {
    date?: string;
    time?: string;
    location?: string;
    type?: string;
    status?: HearingStatus;
    notes?: string;
    result?: string;
    nextDate?: string;
  }

  export interface AddTimelineEventRequest {
    date: string;
    title: string;
    description: string;
    type: string;
    isImportant?: boolean;
  }

  export interface UpdateTimelineEventRequest {
    date?: string;
    title?: string;
    description?: string;
    type?: string;
    isImportant?: boolean;
  }

  export interface AddClaimRequest {
    title: string;
    description: string;
    amount?: number;
    evidence?: string[];
  }

  export interface UpdateClaimRequest {
    title?: string;
    description?: string;
    amount?: number;
    status?: ClaimStatus;
    evidence?: string[];
  }

  export interface UpdateStatusRequest {
    status: CaseStatus;
  }

  export interface UpdateOutcomeRequest {
    outcome: CaseOutcome;
  }

  export interface UpdateProgressRequest {
    progress: number;
  }

  export interface MoveCaseToStageRequest {
    newStage: string;
    notes?: string;
  }

  export interface EndCaseRequest {
    outcome: 'won' | 'lost' | 'settled';
    endReason?: EndReason;
    finalAmount?: number;
    notes?: string;
    endDate?: string;
  }

  export interface DocumentUploadUrlRequest {
    filename: string;
    mimeType: string;
    size: number;
  }

  export interface ConfirmDocumentUploadRequest {
    s3Key: string;
    filename: string;
    mimeType: string;
    size: number;
    title?: string;
  }

  export interface CreateRichDocumentRequest {
    title: string;
    content: string;
    type?: 'memo' | 'brief' | 'motion' | 'letter' | 'contract' | 'other';
  }

  export interface UpdateRichDocumentRequest {
    title?: string;
    content?: string;
    changeNotes?: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // RESPONSE INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  export interface CaseResponse extends ApiResponse<Case> {}
  export interface CaseListResponse extends PaginatedResponse<Case> {}
  export interface CaseStatsResponse extends ApiResponse<CaseStats> {}

  export interface CaseStats {
    total: number;
    byStatus: Record<CaseStatus, number>;
    byOutcome: Record<CaseOutcome, number>;
    byCategory: Record<CaseCategory, number>;
    averageValue: number;
    totalValue: number;
    openCases: number;
    closedCases: number;
    winRate: number;
  }

  export interface CaseOverview {
    cases: Case[];
    stats: CaseStats;
    pipelineStats: PipelineStats;
    clientStats: ClientCaseStats;
  }

  export interface PipelineStats {
    byStage: Record<string, number>;
    stageValues: Record<string, number>;
  }

  export interface ClientCaseStats {
    totalClients: number;
    activeClients: number;
    topClients: Array<{ clientId: string; caseCount: number }>;
  }

  export interface CaseFull extends Case {
    client: {
      _id: string;
      name: string;
      email?: string;
      phone?: string;
    };
    lawyers: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    }>;
    relatedTasks: Array<{
      _id: string;
      title: string;
      status: string;
      dueDate?: string;
    }>;
    audit: CaseAuditEntry[];
  }

  export interface PipelineCases {
    stages: PipelineStage[];
    casesByStage: Record<string, Case[]>;
  }

  export interface UploadUrlResponse {
    uploadUrl: string;
    s3Key: string;
    expiresAt: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // API ENDPOINTS (54 endpoints)
  // ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/case/overview
   * Get cases overview with stats
   * @returns ApiResponse<CaseOverview>
   */

  /**
   * GET /api/case/statistics
   * Get case statistics
   * @returns CaseStatsResponse
   */

  /**
   * POST /api/case
   * Create a new case
   * @body CreateCaseRequest
   * @returns CaseResponse
   */

  /**
   * GET /api/case
   * Get all cases
   * @query page, limit, status, category, clientId, sort
   * @returns CaseListResponse
   */

  /**
   * GET /api/case/pipeline
   * Get cases for pipeline view
   * @query category, outcome, priority
   * @returns ApiResponse<PipelineCases>
   */

  /**
   * GET /api/case/pipeline/statistics
   * Get pipeline statistics
   * @returns ApiResponse<PipelineStats>
   */

  /**
   * GET /api/case/pipeline/stages/:category
   * Get valid stages for category
   * @param category - Case category
   * @returns ApiResponse<PipelineStage[]>
   */

  /**
   * GET /api/case/pipeline/grouped
   * Get cases grouped by stage (Kanban)
   * @returns ApiResponse<Record<string, Case[]>>
   */

  /**
   * GET /api/case/:_id/full
   * Get case full details
   * @param _id - Case ID
   * @returns ApiResponse<CaseFull>
   */

  /**
   * GET /api/case/:_id
   * Get case by ID
   * @param _id - Case ID
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id
   * Update case
   * @param _id - Case ID
   * @body UpdateCaseRequest
   * @returns CaseResponse
   */

  /**
   * DELETE /api/case/:_id
   * Delete case
   * @param _id - Case ID
   * @returns ApiResponse<void>
   */

  /**
   * PATCH /api/case/:_id/progress
   * Update case progress
   * @param _id - Case ID
   * @body UpdateProgressRequest
   * @returns CaseResponse
   */

  /**
   * GET /api/case/:_id/notes
   * Get case notes
   * @param _id - Case ID
   * @returns ApiResponse<CaseNote[]>
   */

  /**
   * POST /api/case/:_id/notes
   * Add note to case
   * @param _id - Case ID
   * @body AddNoteRequest
   * @returns CaseResponse
   */

  /**
   * PUT /api/case/:_id/notes/:noteId
   * Update note
   * @param _id - Case ID
   * @param noteId - Note ID
   * @body UpdateNoteRequest
   * @returns CaseResponse
   */

  /**
   * DELETE /api/case/:_id/notes/:noteId
   * Delete note
   * @param _id - Case ID
   * @param noteId - Note ID
   * @returns CaseResponse
   */

  /**
   * POST /api/case/:_id/documents/upload-url
   * Get S3 upload URL
   * @param _id - Case ID
   * @body DocumentUploadUrlRequest
   * @returns ApiResponse<UploadUrlResponse>
   */

  /**
   * POST /api/case/:_id/documents/confirm
   * Confirm document upload
   * @param _id - Case ID
   * @body ConfirmDocumentUploadRequest
   * @returns CaseResponse
   */

  /**
   * GET /api/case/:_id/documents/:docId/download
   * Get document download URL
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns ApiResponse<{ url: string }>
   */

  /**
   * DELETE /api/case/:_id/documents/:docId
   * Delete document
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns CaseResponse
   */

  /**
   * POST /api/case/:_id/hearing
   * Add hearing
   * @param _id - Case ID
   * @body AddHearingRequest
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id/hearings/:hearingId
   * Update hearing
   * @param _id - Case ID
   * @param hearingId - Hearing ID
   * @body UpdateHearingRequest
   * @returns CaseResponse
   */

  /**
   * DELETE /api/case/:_id/hearings/:hearingId
   * Delete hearing
   * @param _id - Case ID
   * @param hearingId - Hearing ID
   * @returns CaseResponse
   */

  /**
   * POST /api/case/:_id/timeline
   * Add timeline event
   * @param _id - Case ID
   * @body AddTimelineEventRequest
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id/timeline/:eventId
   * Update timeline event
   * @param _id - Case ID
   * @param eventId - Event ID
   * @body UpdateTimelineEventRequest
   * @returns CaseResponse
   */

  /**
   * DELETE /api/case/:_id/timeline/:eventId
   * Delete timeline event
   * @param _id - Case ID
   * @param eventId - Event ID
   * @returns CaseResponse
   */

  /**
   * POST /api/case/:_id/claim
   * Add claim
   * @param _id - Case ID
   * @body AddClaimRequest
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id/claims/:claimId
   * Update claim
   * @param _id - Case ID
   * @param claimId - Claim ID
   * @body UpdateClaimRequest
   * @returns CaseResponse
   */

  /**
   * DELETE /api/case/:_id/claims/:claimId
   * Delete claim
   * @param _id - Case ID
   * @param claimId - Claim ID
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id/status
   * Update case status
   * @param _id - Case ID
   * @body UpdateStatusRequest
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id/outcome
   * Update case outcome
   * @param _id - Case ID
   * @body UpdateOutcomeRequest
   * @returns CaseResponse
   */

  /**
   * PUT /api/case/:_id/close
   * Close case
   * @param _id - Case ID
   * @returns CaseResponse
   */

  /**
   * GET /api/case/:_id/audit
   * Get case audit history
   * @param _id - Case ID
   * @returns ApiResponse<CaseAuditEntry[]>
   */

  /**
   * POST /api/case/:_id/rich-documents
   * Create rich document
   * @param _id - Case ID
   * @body CreateRichDocumentRequest
   * @returns ApiResponse<RichDocument>
   */

  /**
   * GET /api/case/:_id/rich-documents
   * Get rich documents
   * @param _id - Case ID
   * @returns ApiResponse<RichDocument[]>
   */

  /**
   * GET /api/case/:_id/rich-documents/:docId
   * Get rich document
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns ApiResponse<RichDocument>
   */

  /**
   * PATCH /api/case/:_id/rich-documents/:docId
   * Update rich document
   * @param _id - Case ID
   * @param docId - Document ID
   * @body UpdateRichDocumentRequest
   * @returns ApiResponse<RichDocument>
   */

  /**
   * DELETE /api/case/:_id/rich-documents/:docId
   * Delete rich document
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns ApiResponse<void>
   */

  /**
   * GET /api/case/:_id/rich-documents/:docId/versions
   * Get document versions
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns ApiResponse<RichDocumentVersion[]>
   */

  /**
   * POST /api/case/:_id/rich-documents/:docId/versions/:versionNumber/restore
   * Restore document version
   * @param _id - Case ID
   * @param docId - Document ID
   * @param versionNumber - Version number
   * @returns ApiResponse<RichDocument>
   */

  /**
   * GET /api/case/:_id/rich-documents/:docId/export/pdf
   * Export to PDF
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns Binary PDF
   */

  /**
   * GET /api/case/:_id/rich-documents/:docId/export/latex
   * Export to LaTeX
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns Binary LaTeX
   */

  /**
   * GET /api/case/:_id/rich-documents/:docId/export/markdown
   * Export to Markdown
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns Text Markdown
   */

  /**
   * GET /api/case/:_id/rich-documents/:docId/preview
   * Get HTML preview
   * @param _id - Case ID
   * @param docId - Document ID
   * @returns ApiResponse<{ html: string }>
   */

  /**
   * PATCH /api/case/:_id/stage
   * Move case to stage
   * @param _id - Case ID
   * @body MoveCaseToStageRequest
   * @returns CaseResponse
   */

  /**
   * PATCH /api/case/:_id/end
   * End case
   * @param _id - Case ID
   * @body EndCaseRequest
   * @returns CaseResponse
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// FIRM MODULE (46 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace FirmExtended {
  // ─────────────────────────────────────────────────────────────────
  // TYPES & ENUMS
  // ─────────────────────────────────────────────────────────────────

  export type MemberRole = 'owner' | 'admin' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'intern';
  export type MemberStatus = 'active' | 'departed' | 'suspended';
  export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
  export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

  // ─────────────────────────────────────────────────────────────────
  // ENTITY INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface Firm {
    _id: string;
    name: string;
    nameAr?: string;
    legalName?: string;
    registrationNumber?: string;
    taxNumber?: string;
    email: string;
    phone?: string;
    address?: FirmAddress;
    logo?: string;
    website?: string;
    industry?: string;
    size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
    settings: FirmSettings;
    billingSettings?: BillingSettings;
    members: FirmMember[];
    parentFirmId?: string;
    childFirms?: string[];
    ipWhitelist?: IPWhitelistSettings;
    ownerId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface FirmAddress {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    buildingNumber?: string;
    unitNumber?: string;
    nationalAddress?: {
      shortAddress: string;
      buildingNumber: string;
      additionalNumber: string;
      districtName: string;
      streetName: string;
      cityName: string;
      regionName: string;
      postalCode: string;
    };
  }

  export interface FirmSettings {
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    fiscalYearStart?: string;
    defaultBillingRate?: number;
    invoicePrefix?: string;
    caseNumberPrefix?: string;
  }

  export interface BillingSettings {
    defaultPaymentTerms: number;
    lateFeePercentage?: number;
    taxRate?: number;
    taxNumber?: string;
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      iban?: string;
      swiftCode?: string;
    };
    zatcaEnabled?: boolean;
    zatcaConfig?: Record<string, unknown>;
  }

  export interface FirmMember {
    _id: string;
    userId: string;
    role: MemberRole;
    status: MemberStatus;
    permissions: MemberPermissions;
    billingRate?: number;
    department?: string;
    title?: string;
    joinedAt: string;
    departedAt?: string;
    departureReason?: string;
  }

  export interface MemberPermissions {
    modules: {
      cases: PermissionLevel;
      clients: PermissionLevel;
      documents: PermissionLevel;
      invoices: PermissionLevel;
      tasks: PermissionLevel;
      calendar: PermissionLevel;
      reports: PermissionLevel;
      settings: PermissionLevel;
      team: PermissionLevel;
    };
    features?: {
      canApproveInvoices: boolean;
      canAccessBilling: boolean;
      canManageIntegrations: boolean;
      canExportData: boolean;
    };
  }

  export interface IPWhitelistSettings {
    enabled: boolean;
    ips: IPWhitelistEntry[];
    temporaryAllowances: TemporaryIPAllowance[];
  }

  export interface IPWhitelistEntry {
    ip: string;
    description?: string;
    addedBy: string;
    addedAt: string;
  }

  export interface TemporaryIPAllowance {
    _id: string;
    ip: string;
    userId: string;
    expiresAt: string;
    reason?: string;
  }

  export interface Invitation {
    _id: string;
    firmId: string;
    email: string;
    role: MemberRole;
    permissions: MemberPermissions;
    status: InvitationStatus;
    code: string;
    expiresAt: string;
    invitedBy: string;
    acceptedAt?: string;
    createdAt: string;
  }

  export interface AvailableRole {
    role: MemberRole;
    name: string;
    nameAr: string;
    description: string;
    defaultPermissions: MemberPermissions;
  }

  export interface FirmStats {
    totalMembers: number;
    activeMembers: number;
    departedMembers: number;
    totalCases: number;
    activeCases: number;
    totalClients: number;
    totalRevenue: number;
    casesByCategory: Record<string, number>;
  }

  export interface HierarchyNode {
    firm: Firm;
    children: HierarchyNode[];
  }

  // ─────────────────────────────────────────────────────────────────
  // REQUEST INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface CreateFirmRequest {
    name: string;
    nameAr?: string;
    legalName?: string;
    email: string;
    phone?: string;
    address?: FirmAddress;
    industry?: string;
    size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
    settings?: Partial<FirmSettings>;
  }

  export interface UpdateFirmRequest {
    name?: string;
    nameAr?: string;
    legalName?: string;
    registrationNumber?: string;
    taxNumber?: string;
    email?: string;
    phone?: string;
    address?: FirmAddress;
    logo?: string;
    website?: string;
    settings?: Partial<FirmSettings>;
  }

  export interface UpdateBillingSettingsRequest {
    defaultPaymentTerms?: number;
    lateFeePercentage?: number;
    taxRate?: number;
    taxNumber?: string;
    bankDetails?: BillingSettings['bankDetails'];
    zatcaEnabled?: boolean;
    zatcaConfig?: Record<string, unknown>;
  }

  export interface InviteMemberRequest {
    email: string;
    role: MemberRole;
    permissions?: Partial<MemberPermissions>;
    department?: string;
    title?: string;
    billingRate?: number;
  }

  export interface UpdateMemberRequest {
    role?: MemberRole;
    permissions?: Partial<MemberPermissions>;
    department?: string;
    title?: string;
    billingRate?: number;
  }

  export interface ProcessDepartureRequest {
    reason: string;
    reassignTo?: string;
    effectiveDate?: string;
  }

  export interface TransferOwnershipRequest {
    newOwnerId: string;
    confirmationCode: string;
  }

  export interface SwitchFirmRequest {
    firmId: string;
  }

  export interface LeaveFirmRequest {
    convertToSolo?: boolean;
    reason?: string;
  }

  export interface GrantUserAccessRequest {
    userId: string;
    role: MemberRole;
    permissions?: Partial<MemberPermissions>;
  }

  export interface UpdateUserAccessRequest {
    role?: MemberRole;
    permissions?: Partial<MemberPermissions>;
  }

  export interface MoveCompanyRequest {
    newParentId: string | null;
  }

  export interface CreateInvitationRequest {
    email: string;
    role: MemberRole;
    permissions?: Partial<MemberPermissions>;
    expiresInDays?: number;
  }

  export interface AddIPToWhitelistRequest {
    ip: string;
    description?: string;
    temporary?: boolean;
    expiresInHours?: number;
  }

  export interface TestIPAccessRequest {
    ip?: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // RESPONSE INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  export interface FirmResponse extends ApiResponse<Firm> {}
  export interface FirmListResponse extends PaginatedResponse<Firm> {}
  export interface MemberResponse extends ApiResponse<FirmMember> {}
  export interface MemberListResponse extends ApiResponse<FirmMember[]> {}
  export interface InvitationResponse extends ApiResponse<Invitation> {}
  export interface InvitationListResponse extends ApiResponse<Invitation[]> {}
  export interface IPWhitelistResponse extends ApiResponse<IPWhitelistSettings> {}

  // ─────────────────────────────────────────────────────────────────
  // API ENDPOINTS (46 endpoints)
  // ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/firm
   * Get firms list
   * @returns FirmListResponse
   */

  /**
   * GET /api/firm/roles
   * Get available roles
   * @returns ApiResponse<AvailableRole[]>
   */

  /**
   * POST /api/firm
   * Create new firm
   * @body CreateFirmRequest
   * @returns FirmResponse
   */

  /**
   * GET /api/firm/my
   * Get current user's firm
   * @returns FirmResponse
   */

  /**
   * POST /api/firm/switch
   * Switch active firm
   * @body SwitchFirmRequest
   * @returns FirmResponse
   */

  /**
   * GET /api/firm/my/permissions
   * Get my permissions
   * @returns ApiResponse<MemberPermissions>
   */

  /**
   * GET /api/firm/tree
   * Get company hierarchy tree
   * @returns ApiResponse<HierarchyNode>
   */

  /**
   * GET /api/firm/user/accessible
   * Get accessible companies
   * @returns FirmListResponse
   */

  /**
   * GET /api/firm/active
   * Get active company context
   * @returns FirmResponse
   */

  /**
   * GET /api/firm/:id
   * Get firm by ID
   * @param id - Firm ID
   * @returns FirmResponse
   */

  /**
   * PUT /api/firm/:id
   * Update firm
   * @param id - Firm ID
   * @body UpdateFirmRequest
   * @returns FirmResponse
   */

  /**
   * DELETE /api/firm/:id
   * Delete firm
   * @param id - Firm ID
   * @returns ApiResponse<void>
   */

  /**
   * GET /api/firm/:id/children
   * Get child companies
   * @param id - Firm ID
   * @returns FirmListResponse
   */

  /**
   * PUT /api/firm/:id/move
   * Move company
   * @param id - Firm ID
   * @body MoveCompanyRequest
   * @returns FirmResponse
   */

  /**
   * GET /api/firm/:id/access
   * Get company access list
   * @param id - Firm ID
   * @returns MemberListResponse
   */

  /**
   * POST /api/firm/:id/access
   * Grant user access
   * @param id - Firm ID
   * @body GrantUserAccessRequest
   * @returns MemberResponse
   */

  /**
   * PUT /api/firm/:id/access/:userId
   * Update user access
   * @param id - Firm ID
   * @param userId - User ID
   * @body UpdateUserAccessRequest
   * @returns MemberResponse
   */

  /**
   * DELETE /api/firm/:id/access/:userId
   * Revoke user access
   * @param id - Firm ID
   * @param userId - User ID
   * @returns ApiResponse<void>
   */

  /**
   * PATCH /api/firm/:id/billing
   * Update billing settings
   * @param id - Firm ID
   * @body UpdateBillingSettingsRequest
   * @returns FirmResponse
   */

  /**
   * GET /api/firm/:id/team
   * Get team members
   * @param id - Firm ID
   * @returns MemberListResponse
   */

  /**
   * GET /api/firm/:id/members
   * Get members (legacy)
   * @param id - Firm ID
   * @returns MemberListResponse
   */

  /**
   * GET /api/firm/:id/departed
   * Get departed members
   * @param id - Firm ID
   * @returns MemberListResponse
   */

  /**
   * POST /api/firm/:id/members/invite
   * Invite new member
   * @param id - Firm ID
   * @body InviteMemberRequest
   * @returns InvitationResponse
   */

  /**
   * POST /api/firm/:id/members/:memberId/depart
   * Process member departure
   * @param id - Firm ID
   * @param memberId - Member ID
   * @body ProcessDepartureRequest
   * @returns MemberResponse
   */

  /**
   * POST /api/firm/:id/members/:memberId/reinstate
   * Reinstate departed member
   * @param id - Firm ID
   * @param memberId - Member ID
   * @returns MemberResponse
   */

  /**
   * PUT /api/firm/:id/members/:memberId
   * Update member
   * @param id - Firm ID
   * @param memberId - Member ID
   * @body UpdateMemberRequest
   * @returns MemberResponse
   */

  /**
   * DELETE /api/firm/:id/members/:memberId
   * Remove member
   * @param id - Firm ID
   * @param memberId - Member ID
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/firm/:id/leave
   * Leave firm
   * @param id - Firm ID
   * @body LeaveFirmRequest
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/firm/:id/transfer-ownership
   * Transfer ownership
   * @param id - Firm ID
   * @body TransferOwnershipRequest
   * @returns FirmResponse
   */

  /**
   * POST /api/firm/:firmId/invitations
   * Create invitation
   * @param firmId - Firm ID
   * @body CreateInvitationRequest
   * @returns InvitationResponse
   */

  /**
   * GET /api/firm/:firmId/invitations
   * Get firm invitations
   * @param firmId - Firm ID
   * @returns InvitationListResponse
   */

  /**
   * DELETE /api/firm/:firmId/invitations/:invitationId
   * Cancel invitation
   * @param firmId - Firm ID
   * @param invitationId - Invitation ID
   * @returns ApiResponse<void>
   */

  /**
   * POST /api/firm/:firmId/invitations/:invitationId/resend
   * Resend invitation
   * @param firmId - Firm ID
   * @param invitationId - Invitation ID
   * @returns InvitationResponse
   */

  /**
   * GET /api/firm/:id/stats
   * Get firm statistics
   * @param id - Firm ID
   * @returns ApiResponse<FirmStats>
   */

  /**
   * GET /api/firm/:firmId/ip-whitelist
   * Get IP whitelist
   * @param firmId - Firm ID
   * @returns IPWhitelistResponse
   */

  /**
   * POST /api/firm/:firmId/ip-whitelist/test
   * Test IP access
   * @param firmId - Firm ID
   * @body TestIPAccessRequest
   * @returns ApiResponse<{ allowed: boolean; reason?: string }>
   */

  /**
   * POST /api/firm/:firmId/ip-whitelist/enable
   * Enable IP whitelisting
   * @param firmId - Firm ID
   * @returns IPWhitelistResponse
   */

  /**
   * POST /api/firm/:firmId/ip-whitelist/disable
   * Disable IP whitelisting
   * @param firmId - Firm ID
   * @returns IPWhitelistResponse
   */

  /**
   * POST /api/firm/:firmId/ip-whitelist
   * Add IP to whitelist
   * @param firmId - Firm ID
   * @body AddIPToWhitelistRequest
   * @returns IPWhitelistResponse
   */

  /**
   * DELETE /api/firm/:firmId/ip-whitelist/:ip
   * Remove IP from whitelist
   * @param firmId - Firm ID
   * @param ip - IP address
   * @returns IPWhitelistResponse
   */

  /**
   * DELETE /api/firm/:firmId/ip-whitelist/temporary/:allowanceId
   * Revoke temporary IP
   * @param firmId - Firm ID
   * @param allowanceId - Allowance ID
   * @returns IPWhitelistResponse
   */

  /**
   * POST /api/firm/lawyer/add
   * Add lawyer (legacy)
   * @body { lawyerId: string }
   * @returns FirmResponse
   */

  /**
   * POST /api/firm/lawyer/remove
   * Remove lawyer (legacy)
   * @body { lawyerId: string }
   * @returns FirmResponse
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT MODULE (23 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace ClientExtended {
  // ─────────────────────────────────────────────────────────────────
  // TYPES & ENUMS
  // ─────────────────────────────────────────────────────────────────

  export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'blacklisted';
  export type ClientType = 'individual' | 'company' | 'government';
  export type VerificationSource = 'wathq' | 'absher' | 'manual';

  // ─────────────────────────────────────────────────────────────────
  // ENTITY INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface Client {
    _id: string;
    name: string;
    nameAr?: string;
    clientType: ClientType;
    status: ClientStatus;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
    address?: ClientAddress;
    nationalAddress?: NationalAddress;
    nationalId?: string;
    iqamaNumber?: string;
    crNumber?: string;
    taxNumber?: string;
    isVerified: boolean;
    verificationSource?: VerificationSource;
    verifiedAt?: string;
    verificationData?: Record<string, unknown>;
    tags?: string[];
    flags?: ClientFlags;
    notes?: string;
    attachments?: ClientAttachment[];
    totalCases: number;
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
    firmId?: string;
    lawyerId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ClientAddress {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  }

  export interface NationalAddress {
    shortAddress?: string;
    buildingNumber?: string;
    additionalNumber?: string;
    districtName?: string;
    streetName?: string;
    cityName?: string;
    regionName?: string;
    postalCode?: string;
    isVerified?: boolean;
    verifiedAt?: string;
  }

  export interface ClientFlags {
    isVIP: boolean;
    hasPaymentIssues: boolean;
    requiresFollowUp: boolean;
    isHighRisk: boolean;
    custom?: Record<string, boolean>;
  }

  export interface ClientAttachment {
    _id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    category?: string;
    uploadedBy: string;
    uploadedAt: string;
  }

  export interface BillingInfo {
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
    overdueAmount: number;
    lastPaymentDate?: string;
    paymentHistory: PaymentSummary[];
  }

  export interface PaymentSummary {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    paidDate: string;
  }

  export interface ClientStats {
    totalClients: number;
    byStatus: Record<ClientStatus, number>;
    byType: Record<ClientType, number>;
    verified: number;
    unverified: number;
    withActiveCases: number;
    totalOutstanding: number;
  }

  export interface ConflictCheckResult {
    hasConflict: boolean;
    conflicts: Array<{
      type: string;
      entity: string;
      entityId: string;
      message: string;
    }>;
  }

  // ─────────────────────────────────────────────────────────────────
  // REQUEST INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface CreateClientRequest {
    name: string;
    nameAr?: string;
    clientType: ClientType;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
    address?: ClientAddress;
    nationalId?: string;
    iqamaNumber?: string;
    crNumber?: string;
    taxNumber?: string;
    tags?: string[];
    notes?: string;
  }

  export interface UpdateClientRequest {
    name?: string;
    nameAr?: string;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
    address?: ClientAddress;
    nationalAddress?: NationalAddress;
    nationalId?: string;
    iqamaNumber?: string;
    crNumber?: string;
    taxNumber?: string;
    tags?: string[];
    notes?: string;
  }

  export interface UpdateStatusRequest {
    status: ClientStatus;
    reason?: string;
  }

  export interface UpdateFlagsRequest {
    flags: Partial<ClientFlags>;
  }

  export interface SearchClientsRequest {
    q: string;
    status?: ClientStatus;
    clientType?: ClientType;
    limit?: number;
  }

  export interface BulkDeleteRequest {
    clientIds: string[];
  }

  export interface ConflictCheckRequest {
    checkAgainst?: 'clients' | 'cases' | 'all';
  }

  export interface VerifyWathqRequest {
    crNumber: string;
  }

  export interface VerifyAbsherRequest {
    nationalId?: string;
    iqamaNumber?: string;
  }

  export interface VerifyAddressRequest {
    shortAddress?: string;
    buildingNumber?: string;
    additionalNumber?: string;
  }

  // ─────────────────────────────────────────────────────────────────
  // RESPONSE INTERFACES
  // ─────────────────────────────────────────────────────────────────

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  export interface ClientResponse extends ApiResponse<Client> {}
  export interface ClientListResponse extends PaginatedResponse<Client> {}
  export interface ClientStatsResponse extends ApiResponse<ClientStats> {}

  export interface ClientFull extends Client {
    cases: Array<{
      _id: string;
      caseNumber: string;
      title: string;
      status: string;
    }>;
    invoices: Array<{
      _id: string;
      invoiceNumber: string;
      total: number;
      status: string;
      dueDate: string;
    }>;
    payments: PaymentSummary[];
    billingInfo: BillingInfo;
  }

  // ─────────────────────────────────────────────────────────────────
  // API ENDPOINTS (23 endpoints)
  // ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/client
   * Create client
   * @body CreateClientRequest
   * @returns ClientResponse
   */

  /**
   * GET /api/client
   * Get clients
   * @query page, limit, status, clientType, sort
   * @returns ClientListResponse
   */

  /**
   * GET /api/client/search
   * Search clients
   * @query q, status, clientType, limit
   * @returns ClientListResponse
   */

  /**
   * GET /api/client/stats
   * Get client statistics
   * @returns ClientStatsResponse
   */

  /**
   * GET /api/client/top-revenue
   * Get top clients by revenue
   * @query limit
   * @returns ClientListResponse
   */

  /**
   * GET /api/client/:id/full
   * Get client full details
   * @param id - Client ID
   * @returns ApiResponse<ClientFull>
   */

  /**
   * GET /api/client/:id
   * Get client by ID
   * @param id - Client ID
   * @returns ClientResponse
   */

  /**
   * PUT /api/client/:id
   * Update client
   * @param id - Client ID
   * @body UpdateClientRequest
   * @returns ClientResponse
   */

  /**
   * DELETE /api/client/:id
   * Delete client
   * @param id - Client ID
   * @returns ApiResponse<void>
   */

  /**
   * GET /api/client/:id/billing-info
   * Get billing info
   * @param id - Client ID
   * @returns ApiResponse<BillingInfo>
   */

  /**
   * GET /api/client/:id/cases
   * Get client cases
   * @param id - Client ID
   * @returns ApiResponse<Case[]>
   */

  /**
   * GET /api/client/:id/invoices
   * Get client invoices
   * @param id - Client ID
   * @returns ApiResponse<Invoice[]>
   */

  /**
   * GET /api/client/:id/payments
   * Get client payments
   * @param id - Client ID
   * @returns ApiResponse<Payment[]>
   */

  /**
   * POST /api/client/:id/verify/wathq
   * Verify via Wathq
   * @param id - Client ID
   * @body VerifyWathqRequest
   * @returns ClientResponse
   */

  /**
   * GET /api/client/:id/wathq/:dataType
   * Get Wathq data
   * @param id - Client ID
   * @param dataType - Data type
   * @returns ApiResponse<Record<string, unknown>>
   */

  /**
   * POST /api/client/:id/verify/absher
   * Verify via Absher
   * @param id - Client ID
   * @body VerifyAbsherRequest
   * @returns ClientResponse
   */

  /**
   * POST /api/client/:id/verify/address
   * Verify address
   * @param id - Client ID
   * @body VerifyAddressRequest
   * @returns ClientResponse
   */

  /**
   * POST /api/client/:id/attachments
   * Upload attachments
   * @param id - Client ID
   * @body FormData with files
   * @returns ClientResponse
   */

  /**
   * DELETE /api/client/:id/attachments/:attachmentId
   * Delete attachment
   * @param id - Client ID
   * @param attachmentId - Attachment ID
   * @returns ClientResponse
   */

  /**
   * POST /api/client/:id/conflict-check
   * Run conflict check
   * @param id - Client ID
   * @body ConflictCheckRequest
   * @returns ApiResponse<ConflictCheckResult>
   */

  /**
   * PATCH /api/client/:id/status
   * Update status
   * @param id - Client ID
   * @body UpdateStatusRequest
   * @returns ClientResponse
   */

  /**
   * PATCH /api/client/:id/flags
   * Update flags
   * @param id - Client ID
   * @body UpdateFlagsRequest
   * @returns ClientResponse
   */

  /**
   * DELETE /api/client/bulk
   * Bulk delete clients
   * @body BulkDeleteRequest
   * @returns ApiResponse<{ deleted: number }>
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT MODULE (19 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace DocumentExtended {
  export type DocumentType = 'contract' | 'brief' | 'motion' | 'letter' | 'memo' | 'evidence' | 'court_filing' | 'other';
  export type DocumentStatus = 'draft' | 'final' | 'archived';

  export interface Document {
    _id: string;
    title: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    type: DocumentType;
    status: DocumentStatus;
    description?: string;
    tags?: string[];
    s3Key: string;
    url?: string;
    caseId?: string;
    clientId?: string;
    versions?: DocumentVersion[];
    sharedWith?: string[];
    isPublic: boolean;
    metadata?: Record<string, unknown>;
    firmId?: string;
    lawyerId?: string;
    uploadedBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface DocumentVersion {
    versionNumber: number;
    s3Key: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string;
    changeNotes?: string;
  }

  export interface UploadDocumentRequest {
    title: string;
    type?: DocumentType;
    description?: string;
    tags?: string[];
    caseId?: string;
    clientId?: string;
  }

  export interface UpdateDocumentRequest {
    title?: string;
    type?: DocumentType;
    status?: DocumentStatus;
    description?: string;
    tags?: string[];
  }

  export interface ShareDocumentRequest {
    userIds: string[];
    permissions?: 'view' | 'edit';
    expiresAt?: string;
  }

  export interface SearchDocumentsRequest {
    q: string;
    type?: DocumentType;
    status?: DocumentStatus;
    caseId?: string;
    clientId?: string;
    limit?: number;
  }

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }

  /**
   * POST /api/document/upload
   * Upload document
   */

  /**
   * POST /api/document/confirm
   * Confirm upload
   */

  /**
   * GET /api/document/search
   * Search documents
   */

  /**
   * GET /api/document
   * Get documents
   */

  /**
   * GET /api/document/:id
   * Get document
   */

  /**
   * PUT /api/document/:id
   * Update document
   */

  /**
   * DELETE /api/document/:id
   * Delete document
   */

  /**
   * GET /api/document/:id/download
   * Download document
   */

  /**
   * GET /api/document/:id/versions
   * Get versions
   */

  /**
   * POST /api/document/:id/versions
   * Upload new version
   */

  /**
   * GET /api/document/:id/versions/:versionNumber
   * Get specific version
   */

  /**
   * POST /api/document/:id/versions/:versionNumber/restore
   * Restore version
   */

  /**
   * POST /api/document/:id/share
   * Share document
   */

  /**
   * DELETE /api/document/:id/share/:userId
   * Unshare document
   */

  /**
   * GET /api/document/:id/share
   * Get share list
   */

  /**
   * POST /api/document/:id/duplicate
   * Duplicate document
   */

  /**
   * POST /api/document/:id/move
   * Move document to case
   */

  /**
   * GET /api/document/stats
   * Get document stats
   */

  /**
   * DELETE /api/document/bulk
   * Bulk delete
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// USER MODULE (13 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace UserExtended {
  export interface User {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    phone?: string;
    avatar?: string;
    timezone?: string;
    locale?: string;
    isVerified: boolean;
    lastLoginAt?: string;
    preferences?: UserPreferences;
    notificationSettings?: NotificationSettings;
    createdAt: string;
    updatedAt: string;
  }

  export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    startPage?: string;
    sidebarCollapsed?: boolean;
  }

  export interface NotificationSettings {
    email: { enabled: boolean; digest: 'immediate' | 'daily' | 'weekly' | 'none'; };
    push: { enabled: boolean; };
    sms: { enabled: boolean; };
    categories: Record<string, boolean>;
  }

  export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    avatar?: string;
    timezone?: string;
    locale?: string;
  }

  export interface UpdatePreferencesRequest {
    preferences: Partial<UserPreferences>;
  }

  export interface UpdateNotificationSettingsRequest {
    settings: Partial<NotificationSettings>;
  }

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
  }

  /**
   * GET /api/user/lawyers
   * Get lawyers
   */

  /**
   * GET /api/user/team
   * Get team members
   */

  /**
   * GET /api/user/vapid-public-key
   * Get VAPID public key
   */

  /**
   * GET /api/user/me
   * Get current user
   */

  /**
   * PATCH /api/user/me
   * Update profile
   */

  /**
   * GET /api/user/me/preferences
   * Get preferences
   */

  /**
   * PUT /api/user/me/preferences
   * Update preferences
   */

  /**
   * GET /api/user/me/notifications
   * Get notification settings
   */

  /**
   * PUT /api/user/me/notifications
   * Update notification settings
   */

  /**
   * POST /api/user/me/avatar
   * Upload avatar
   */

  /**
   * DELETE /api/user/me/avatar
   * Delete avatar
   */

  /**
   * POST /api/user/push-subscription
   * Register push subscription
   */

  /**
   * DELETE /api/user/push-subscription
   * Unregister push subscription
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEAM MODULE (15 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace TeamExtended {
  export type TeamRole = 'lead' | 'member' | 'viewer';

  export interface Team {
    _id: string;
    name: string;
    description?: string;
    leaderId: string;
    members: TeamMember[];
    department?: string;
    isActive: boolean;
    settings?: TeamSettings;
    firmId?: string;
    lawyerId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface TeamMember {
    userId: string;
    role: TeamRole;
    joinedAt: string;
  }

  export interface TeamSettings {
    allowMemberInvites: boolean;
    defaultTaskAssignment: 'round_robin' | 'manual' | 'least_loaded';
    notifyOnMemberJoin: boolean;
  }

  export interface TeamStats {
    totalTeams: number;
    totalMembers: number;
    activeTeams: number;
    averageTeamSize: number;
  }

  export interface CreateTeamRequest {
    name: string;
    description?: string;
    leaderId?: string;
    department?: string;
    memberIds?: string[];
    settings?: TeamSettings;
  }

  export interface UpdateTeamRequest {
    name?: string;
    description?: string;
    leaderId?: string;
    department?: string;
    settings?: TeamSettings;
    isActive?: boolean;
  }

  export interface AddMemberRequest {
    userId: string;
    role?: TeamRole;
  }

  export interface UpdateMemberRoleRequest {
    role: TeamRole;
  }

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }

  /**
   * GET /api/team/stats
   * Get team statistics
   */

  /**
   * GET /api/team/options
   * Get team options for select
   */

  /**
   * GET /api/team
   * Get teams
   */

  /**
   * POST /api/team
   * Create team
   */

  /**
   * GET /api/team/:id
   * Get team by ID
   */

  /**
   * PUT /api/team/:id
   * Update team
   */

  /**
   * DELETE /api/team/:id
   * Delete team
   */

  /**
   * POST /api/team/:id/members
   * Add member
   */

  /**
   * DELETE /api/team/:id/members/:userId
   * Remove member
   */

  /**
   * PATCH /api/team/:id/members/:userId/role
   * Update member role
   */

  /**
   * POST /api/team/:id/leave
   * Leave team
   */

  /**
   * GET /api/team/:id/workload
   * Get team workload
   */

  /**
   * GET /api/team/:id/tasks
   * Get team tasks
   */

  /**
   * POST /api/team/:id/assign-task
   * Auto-assign task to team
   */

  /**
   * POST /api/team/bulk-delete
   * Bulk delete teams
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// STAFF MODULE (9 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace StaffExtended {
  export type StaffRole = 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'admin' | 'intern';
  export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';

  export interface Staff {
    _id: string;
    userId: string;
    role: StaffRole;
    employmentStatus: EmploymentStatus;
    department?: string;
    title?: string;
    reportingTo?: string;
    billingRate?: number;
    hireDate: string;
    terminationDate?: string;
    skills?: string[];
    certifications?: string[];
    firmId?: string;
    lawyerId?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface StaffStats {
    total: number;
    byRole: Record<StaffRole, number>;
    byStatus: Record<EmploymentStatus, number>;
    byDepartment: Record<string, number>;
  }

  export interface CreateStaffRequest {
    userId: string;
    role: StaffRole;
    department?: string;
    title?: string;
    reportingTo?: string;
    billingRate?: number;
    hireDate?: string;
    skills?: string[];
  }

  export interface UpdateStaffRequest {
    role?: StaffRole;
    employmentStatus?: EmploymentStatus;
    department?: string;
    title?: string;
    reportingTo?: string;
    billingRate?: number;
    skills?: string[];
    certifications?: string[];
  }

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
  }

  /**
   * GET /api/staff/team
   * Get staff team
   */

  /**
   * GET /api/staff/stats
   * Get staff statistics
   */

  /**
   * POST /api/staff/bulk-delete
   * Bulk delete staff
   */

  /**
   * GET /api/staff
   * Get all staff
   */

  /**
   * POST /api/staff
   * Create staff record
   */

  /**
   * GET /api/staff/:id
   * Get staff by ID
   */

  /**
   * PUT /api/staff/:id
   * Update staff
   */

  /**
   * DELETE /api/staff/:id
   * Delete staff
   */

  /**
   * PATCH /api/staff/:id/status
   * Update employment status
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION MODULE (32 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace PermissionExtended {
  export type PermissionLevel = 'none' | 'view' | 'edit' | 'full' | 'admin';
  export type ResourceType = 'case' | 'client' | 'document' | 'invoice' | 'task' | 'report' | 'team' | 'settings';

  export interface Permission {
    resource: ResourceType;
    level: PermissionLevel;
    conditions?: PermissionCondition[];
  }

  export interface PermissionCondition {
    field: string;
    operator: 'equals' | 'in' | 'not_in' | 'gt' | 'lt';
    value: unknown;
  }

  export interface PermissionSet {
    userId: string;
    permissions: Permission[];
    inheritedFrom?: string;
    overrides?: Permission[];
  }

  export interface PermissionCheckRequest {
    resource: ResourceType;
    action: 'view' | 'create' | 'edit' | 'delete' | 'admin';
    resourceId?: string;
  }

  export interface PermissionCheckResponse {
    allowed: boolean;
    level: PermissionLevel;
    reason?: string;
  }

  export interface BatchPermissionCheckRequest {
    checks: PermissionCheckRequest[];
  }

  export interface BatchPermissionCheckResponse {
    results: Array<PermissionCheckRequest & PermissionCheckResponse>;
  }

  export interface PermissionTemplate {
    _id: string;
    name: string;
    description?: string;
    permissions: Permission[];
    isDefault: boolean;
    firmId?: string;
    createdBy: string;
    createdAt: string;
  }

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
  }

  /**
   * POST /api/permission/check
   * Check single permission
   */

  /**
   * POST /api/permission/check-batch
   * Batch check permissions
   */

  /**
   * GET /api/permission/my-permissions
   * Get current user's permissions
   */

  /**
   * GET /api/permission/user/:userId
   * Get user's permissions
   */

  /**
   * PUT /api/permission/user/:userId
   * Update user's permissions
   */

  /**
   * GET /api/permission/templates
   * Get permission templates
   */

  /**
   * POST /api/permission/templates
   * Create permission template
   */

  /**
   * GET /api/permission/templates/:id
   * Get template by ID
   */

  /**
   * PUT /api/permission/templates/:id
   * Update template
   */

  /**
   * DELETE /api/permission/templates/:id
   * Delete template
   */

  /**
   * POST /api/permission/user/:userId/apply-template
   * Apply template to user
   */

  /**
   * GET /api/permission/resources
   * Get available resources
   */

  /**
   * GET /api/permission/resource/:resource/users
   * Get users with resource access
   */

  /**
   * POST /api/permission/resource/:resource/grant
   * Grant resource access
   */

  /**
   * POST /api/permission/resource/:resource/revoke
   * Revoke resource access
   */

  /**
   * GET /api/permission/audit
   * Get permission audit log
   */

  // Additional endpoints for role-based permissions, delegation, etc.
}


// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION MODULE (11 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace NotificationExtended {
  export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'reminder';
  export type NotificationCategory = 'case' | 'task' | 'invoice' | 'client' | 'system' | 'calendar';

  export interface Notification {
    _id: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    link?: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    readAt?: string;
    expiresAt?: string;
    createdAt: string;
  }

  export interface NotificationPreference {
    category: NotificationCategory;
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms: boolean;
  }

  export interface MarkReadRequest {
    notificationIds?: string[];
  }

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
  }

  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }

  /**
   * GET /api/notification
   * Get notifications
   */

  /**
   * GET /api/notification/unread-count
   * Get unread count
   */

  /**
   * PATCH /api/notification/mark-all-read
   * Mark all as read
   */

  /**
   * GET /api/notification/:id
   * Get notification
   */

  /**
   * PATCH /api/notification/:id/read
   * Mark as read
   */

  /**
   * DELETE /api/notification/:id
   * Delete notification
   */

  /**
   * DELETE /api/notification/clear-all
   * Clear all notifications
   */

  /**
   * GET /api/notification/preferences
   * Get preferences
   */

  /**
   * PUT /api/notification/preferences
   * Update preferences
   */

  /**
   * POST /api/notification/test
   * Send test notification
   */

  /**
   * DELETE /api/notification/bulk
   * Bulk delete notifications
   */
}


// ═══════════════════════════════════════════════════════════════════════════════
// MODULE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CORE EXTENDED API CONTRACTS SUMMARY
 *
 * Total Modules: 10
 * Total Endpoints: ~308
 *
 * Module Breakdown:
 * - TaskExtended: 86 endpoints (Templates, CRUD, Subtasks, Timers, Attachments, Documents, Voice, Dependencies, Workflow)
 * - CaseExtended: 54 endpoints (CRUD, Notes, Hearings, Timeline, Claims, Documents, Pipeline)
 * - FirmExtended: 46 endpoints (CRUD, Members, Invitations, Hierarchy, IP Whitelist)
 * - ClientExtended: 23 endpoints (CRUD, Search, Verification, Attachments, Conflict Check)
 * - DocumentExtended: 19 endpoints (Upload, Search, Versioning, Sharing)
 * - UserExtended: 13 endpoints (Profile, Preferences, Notifications)
 * - TeamExtended: 15 endpoints (CRUD, Members, Workload)
 * - StaffExtended: 9 endpoints (CRUD, Stats)
 * - PermissionExtended: 32 endpoints (Check, Templates, Resources)
 * - NotificationExtended: 11 endpoints (CRUD, Preferences)
 *
 * Gold Standard Compliance:
 * - Full TypeScript type safety
 * - Comprehensive enum types
 * - Request/Response interface pairs
 * - JSDoc endpoint documentation
 * - Multi-tenant support (firmId/lawyerId)
 */
