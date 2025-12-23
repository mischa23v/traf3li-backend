/**
 * Temporal.io Type Definitions
 *
 * Type definitions for Temporal workflows, activities, and client operations
 * used throughout the application.
 */

import { WorkflowHandle, WorkflowClient } from '@temporalio/client';

// ==========================================
// WORKFLOW PARAMETER TYPES
// ==========================================

/**
 * Invoice Approval Workflow Parameters
 */
export interface InvoiceApprovalWorkflowParams {
  invoiceId: string;
  amount: number;
  approvers: string[];
  firmId: string;
  createdBy?: string;
  dueDate?: string;
  metadata?: Record<string, any>;
}

/**
 * Employee Onboarding Workflow Parameters
 */
export interface OnboardingWorkflowParams {
  employeeId: string;
  email: string;
  department: string;
  role: string;
  startDate: Date | string;
  managerId?: string;
  firmId: string;
  personalInfo?: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Employee Offboarding Workflow Parameters
 */
export interface OffboardingWorkflowParams {
  employeeId: string;
  offboardingData: {
    exitType: 'resignation' | 'termination' | 'retirement' | 'death' | 'contract_end';
    lastWorkingDay: string | Date;
    department: string;
    email: string;
    employeeName: string;
    employeeNameAr?: string;
    jobTitle: string;
    managerId?: string;
    firmId: string;
    lawyerId?: string;
    [key: string]: any;
  };
}

/**
 * Case Lifecycle Workflow Parameters
 */
export interface CaseLifecycleWorkflowParams {
  caseId: string;
  caseType: string;
  clientId: string;
  firmId: string;
  lawyerId?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// WORKFLOW RESULT TYPES
// ==========================================

/**
 * Base workflow result interface
 */
export interface BaseWorkflowResult {
  success: boolean;
  error?: string;
  completedAt?: string;
}

/**
 * Invoice Approval Workflow Result
 */
export interface InvoiceApprovalResult extends BaseWorkflowResult {
  invoiceId: string;
  approvalStatus: 'approved' | 'rejected' | 'pending';
  approvers: {
    userId: string;
    status: 'approved' | 'rejected' | 'pending';
    timestamp?: string;
  }[];
}

/**
 * Onboarding Workflow Result
 */
export interface OnboardingResult extends BaseWorkflowResult {
  employeeId: string;
  status: 'completed' | 'in_progress' | 'failed';
  completedTasks: string[];
  pendingTasks: string[];
}

/**
 * Offboarding Workflow Result
 */
export interface OffboardingResult extends BaseWorkflowResult {
  employeeId: string;
  status: 'completed' | 'in_progress' | 'failed';
  complianceScore: number;
  phases: Record<string, {
    status: string;
    startTime: string | null;
    endTime: string | null;
    errors: string[];
  }>;
  timeline: Array<{
    phase: string;
    event: string;
    timestamp: string;
    error?: string;
  }>;
  escalations: any[];
  manualOverrides: any[];
}

/**
 * Case Lifecycle Result
 */
export interface CaseLifecycleResult extends BaseWorkflowResult {
  caseId: string;
  status: 'active' | 'closed' | 'archived';
  completedStages: string[];
}

// ==========================================
// TEMPORAL CLIENT TYPES
// ==========================================

/**
 * Extended Temporal Client with custom methods
 */
export interface TemporalClientExtended extends WorkflowClient {
  // Custom workflow starter methods
  startInvoiceApprovalWorkflow(
    params: InvoiceApprovalWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<InvoiceApprovalResult>>;

  startOnboardingWorkflow(
    params: OnboardingWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<OnboardingResult>>;

  startOffboardingWorkflow(
    params: OffboardingWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<OffboardingResult>>;

  startCaseLifecycleWorkflow(
    params: CaseLifecycleWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<CaseLifecycleResult>>;
}

/**
 * Workflow start options
 */
export interface WorkflowStartOptions {
  workflowId?: string;
  taskQueue?: string;
  workflowExecutionTimeout?: string | number;
  retryPolicy?: RetryPolicy;
  memo?: Record<string, any>;
  searchAttributes?: Record<string, any>;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  initialInterval: string | number;
  backoffCoefficient: number;
  maximumInterval: string | number;
  maximumAttempts: number;
  nonRetryableErrorTypes?: string[];
}

// ==========================================
// TASK QUEUES
// ==========================================

/**
 * Available task queues for different workflow types
 */
export interface TaskQueues {
  INVOICE_APPROVAL: string;
  ONBOARDING: string;
  OFFBOARDING: string;
  CASE_LIFECYCLE: string;
  PAYMENT_PROCESSING: string;
  DOCUMENT_PROCESSING: string;
  NOTIFICATION: string;
  BATCH_PROCESSING: string;
}

// ==========================================
// WORKFLOW TIMEOUTS
// ==========================================

/**
 * Workflow execution timeout configurations (in milliseconds)
 */
export interface WorkflowTimeouts {
  DEFAULT_EXECUTION_TIMEOUT: number;
  INVOICE_APPROVAL_TIMEOUT: number;
  ONBOARDING_TIMEOUT: number;
  OFFBOARDING_TIMEOUT: number;
  CASE_LIFECYCLE_TIMEOUT: number;
  PAYMENT_PROCESSING_TIMEOUT: number;
  DOCUMENT_PROCESSING_TIMEOUT: number;
  NOTIFICATION_TIMEOUT: number;
  BATCH_PROCESSING_TIMEOUT: number;
}

// ==========================================
// RETRY POLICIES
// ==========================================

/**
 * Predefined retry policies for different activity types
 */
export interface RetryPolicies {
  DEFAULT: RetryPolicy;
  CRITICAL: RetryPolicy;
  NON_CRITICAL: RetryPolicy;
  NETWORK: RetryPolicy;
}

// ==========================================
// ACTIVITY TYPES
// ==========================================

/**
 * Generic activity result
 */
export interface ActivityResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Notification activity parameters
 */
export interface NotificationActivityParams {
  employeeId: string;
  department: string;
  notificationType: string;
  message: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Database update activity parameters
 */
export interface DatabaseUpdateActivityParams {
  entityType: string;
  entityId: string;
  updates: Record<string, any>;
}

// ==========================================
// WORKFLOW HELPERS
// ==========================================

/**
 * Workflow context for logging and tracking
 */
export interface WorkflowContext {
  workflowId: string;
  workflowType: string;
  startTime: string;
  params: any;
  metadata: {
    environment: string;
    version: string;
  };
}

/**
 * Workflow search attributes for filtering
 */
export interface WorkflowSearchAttributes {
  [key: string]: string | number | boolean;
  createdAt: string;
}

// ==========================================
// TEMPORAL MODULE EXPORTS
// ==========================================

/**
 * Temporal module export interface
 */
export interface TemporalModule {
  // Client functions
  getTemporalClient(): Promise<TemporalClientExtended>;
  closeTemporalConnection(): Promise<void>;

  // Constants
  TASK_QUEUES: TaskQueues;
  WORKFLOW_TIMEOUTS: WorkflowTimeouts;
  RETRY_POLICIES: RetryPolicies;

  // Client operations
  startInvoiceApprovalWorkflow(
    params: InvoiceApprovalWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<InvoiceApprovalResult>>;

  startOnboardingWorkflow(
    params: OnboardingWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<OnboardingResult>>;

  startOffboardingWorkflow(
    params: OffboardingWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<OffboardingResult>>;

  startCaseLifecycleWorkflow(
    params: CaseLifecycleWorkflowParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<CaseLifecycleResult>>;

  getWorkflowHandle(workflowId: string): Promise<WorkflowHandle>;
  signalWorkflow(workflowId: string, signalName: string, ...args: any[]): Promise<void>;
  queryWorkflow(workflowId: string, queryName: string, ...args: any[]): Promise<any>;
  cancelWorkflow(workflowId: string): Promise<void>;
  terminateWorkflow(workflowId: string, reason?: string): Promise<void>;
  describeWorkflow(workflowId: string): Promise<any>;
  getWorkflowResult(workflowId: string): Promise<any>;
}

// ==========================================
// WORKER TYPES
// ==========================================

/**
 * Worker configuration options
 */
export interface WorkerConfig {
  taskQueue: string;
  workflowsPath: string;
  activities: Record<string, Function>;
  maxConcurrentActivityTaskExecutions?: number;
  maxConcurrentWorkflowTaskExecutions?: number;
}

/**
 * Worker module exports
 */
export interface WorkerModule {
  createWorker(config: WorkerConfig): Promise<any>;
  startWorkers(): Promise<void>;
  stopWorkers(): Promise<void>;
  setupGracefulShutdown(): void;
}

// Augment global namespace for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEMPORAL_ADDRESS?: string;
      TEMPORAL_NAMESPACE?: string;
      TEMPORAL_WORKER_ENABLED?: string;
      TEMPORAL_CLOUD_NAMESPACE?: string;
      TEMPORAL_CLOUD_API_KEY?: string;
      TEMPORAL_CLOUD_API_SECRET?: string;
      IT_EMAIL?: string;
      HR_EMAIL?: string;
      FINANCE_EMAIL?: string;
    }
  }
}

export {};
