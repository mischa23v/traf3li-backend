/**
 * Workflow API Type Definitions
 * Auto-generated from /home/user/traf3li-backend/src/routes/workflow.route.js
 * and /home/user/traf3li-backend/src/controllers/workflow.controller.js
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface BaseResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type WorkflowTriggerType = 'manual' | 'event' | 'schedule';
export type WorkflowStageType = 'task' | 'reminder' | 'email' | 'action';
export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type WorkflowInstanceStatus = 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type EntityType = 'case' | 'client' | 'invoice' | 'appointment' | 'lead';

// ═══════════════════════════════════════════════════════════════
// WORKFLOW TEMPLATE TYPES
// ═══════════════════════════════════════════════════════════════

export interface WorkflowStage {
  id: string;
  name: string;
  type: WorkflowStageType;
  config: Record<string, any>;
  position: number;
  dependencies?: string[];
}

export interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, any>;
  stages: WorkflowStage[];
  status: WorkflowStatus;
  firmId?: string;
  lawyerId?: string;
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/workflow/templates
// ═══════════════════════════════════════════════════════════════

export interface ListWorkflowTemplatesQuery {
  page?: number;
  limit?: number;
  status?: WorkflowStatus;
  triggerType?: WorkflowTriggerType;
  search?: string;
}

export interface ListWorkflowTemplatesResponse extends BaseResponse {
  data: {
    templates: WorkflowTemplate[];
    pagination: Pagination;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/workflow/templates
// ═══════════════════════════════════════════════════════════════

export interface CreateWorkflowTemplateRequest {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, any>;
  stages: Omit<WorkflowStage, 'id'>[];
  isPublic?: boolean;
}

export interface CreateWorkflowTemplateResponse extends BaseResponse {
  data: WorkflowTemplate;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/workflow/templates/:id
// ═══════════════════════════════════════════════════════════════

export interface GetWorkflowTemplateResponse extends BaseResponse {
  data: WorkflowTemplate;
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/workflow/templates/:id
// ═══════════════════════════════════════════════════════════════

export interface UpdateWorkflowTemplateRequest {
  name?: string;
  description?: string;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: Record<string, any>;
  stages?: WorkflowStage[];
  status?: WorkflowStatus;
  isPublic?: boolean;
}

export interface UpdateWorkflowTemplateResponse extends BaseResponse {
  data: WorkflowTemplate;
}

// ═══════════════════════════════════════════════════════════════
// DELETE /api/workflow/templates/:id
// ═══════════════════════════════════════════════════════════════

export interface DeleteWorkflowTemplateResponse extends BaseResponse {}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW INSTANCE TYPES
// ═══════════════════════════════════════════════════════════════

export interface WorkflowStageExecution {
  stageId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface WorkflowInstance {
  _id: string;
  templateId: string;
  entityType: EntityType;
  entityId: string;
  status: WorkflowInstanceStatus;
  currentStageIndex: number;
  stageExecutions: WorkflowStageExecution[];
  context: Record<string, any>;
  firmId?: string;
  lawyerId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/workflow/instances
// ═══════════════════════════════════════════════════════════════

export interface ListWorkflowInstancesQuery {
  page?: number;
  limit?: number;
  status?: WorkflowInstanceStatus;
  templateId?: string;
  entityType?: EntityType;
  entityId?: string;
}

export interface ListWorkflowInstancesResponse extends BaseResponse {
  data: {
    instances: WorkflowInstance[];
    pagination: Pagination;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/workflow/instances
// ═══════════════════════════════════════════════════════════════

export interface CreateWorkflowInstanceRequest {
  templateId: string;
  entityType: EntityType;
  entityId: string;
  context?: Record<string, any>;
  autoStart?: boolean;
}

export interface CreateWorkflowInstanceResponse extends BaseResponse {
  data: WorkflowInstance;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/workflow/instances/:id
// ═══════════════════════════════════════════════════════════════

export interface GetWorkflowInstanceResponse extends BaseResponse {
  data: WorkflowInstance;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/workflow/instances/:id/pause
// ═══════════════════════════════════════════════════════════════

export interface PauseWorkflowInstanceResponse extends BaseResponse {
  data: WorkflowInstance;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/workflow/instances/:id/resume
// ═══════════════════════════════════════════════════════════════

export interface ResumeWorkflowInstanceResponse extends BaseResponse {
  data: WorkflowInstance;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/workflow/instances/:id/cancel
// ═══════════════════════════════════════════════════════════════

export interface CancelWorkflowInstanceResponse extends BaseResponse {
  data: WorkflowInstance;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/workflow/instances/:id/advance
// ═══════════════════════════════════════════════════════════════

export interface AdvanceWorkflowInstanceRequest {
  skipCurrent?: boolean;
}

export interface AdvanceWorkflowInstanceResponse extends BaseResponse {
  data: WorkflowInstance;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/workflow/entity/:entityType/:entityId
// ═══════════════════════════════════════════════════════════════

export interface GetEntityWorkflowsResponse extends BaseResponse {
  data: {
    active: WorkflowInstance[];
    completed: WorkflowInstance[];
    total: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT SUMMARY
// ═══════════════════════════════════════════════════════════════

export const WORKFLOW_ENDPOINTS = {
  // Template Management
  LIST_TEMPLATES: 'GET /api/workflow/templates',
  CREATE_TEMPLATE: 'POST /api/workflow/templates',
  GET_TEMPLATE: 'GET /api/workflow/templates/:id',
  UPDATE_TEMPLATE: 'PUT /api/workflow/templates/:id',
  DELETE_TEMPLATE: 'DELETE /api/workflow/templates/:id',

  // Instance Management
  LIST_INSTANCES: 'GET /api/workflow/instances',
  CREATE_INSTANCE: 'POST /api/workflow/instances',
  GET_INSTANCE: 'GET /api/workflow/instances/:id',
  PAUSE_INSTANCE: 'POST /api/workflow/instances/:id/pause',
  RESUME_INSTANCE: 'POST /api/workflow/instances/:id/resume',
  CANCEL_INSTANCE: 'POST /api/workflow/instances/:id/cancel',
  ADVANCE_INSTANCE: 'POST /api/workflow/instances/:id/advance',

  // Entity Workflows
  GET_ENTITY_WORKFLOWS: 'GET /api/workflow/entity/:entityType/:entityId',
} as const;

// Total endpoints: 13
