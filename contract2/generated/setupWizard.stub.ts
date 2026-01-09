/**
 * SetupWizard API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/setupWizard/status
export interface SetupWizardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SetupWizardListResponse = PaginatedResponse<SetupWizard>;

// GET /api/setupWizard/sections
export interface SetupWizardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SetupWizardListResponse = PaginatedResponse<SetupWizard>;

// POST /api/setupWizard/tasks/:taskId/complete
export interface CreateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSetupWizardResponse = ApiResponse<SetupWizard>;

// POST /api/setupWizard/tasks/:taskId/skip
export interface CreateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSetupWizardResponse = ApiResponse<SetupWizard>;

// GET /api/setupWizard/next-task
export interface SetupWizardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SetupWizardListResponse = PaginatedResponse<SetupWizard>;

// GET /api/setupWizard/progress-percentage
export interface SetupWizardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SetupWizardListResponse = PaginatedResponse<SetupWizard>;

// POST /api/setupWizard/reset
export interface CreateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSetupWizardResponse = ApiResponse<SetupWizard>;

// POST /api/setupWizard/admin/sections
export interface CreateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSetupWizardResponse = ApiResponse<SetupWizard>;

// PATCH /api/setupWizard/admin/sections/:sectionId
export interface UpdateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSetupWizardResponse = ApiResponse<SetupWizard>;

// DELETE /api/setupWizard/admin/sections/:sectionId
export type DeleteSetupWizardResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/setupWizard/admin/tasks
export interface CreateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSetupWizardResponse = ApiResponse<SetupWizard>;

// PATCH /api/setupWizard/admin/tasks/:taskId
export interface UpdateSetupWizardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSetupWizardResponse = ApiResponse<SetupWizard>;

// DELETE /api/setupWizard/admin/tasks/:taskId
export type DeleteSetupWizardResponse = ApiResponse<{ deleted: boolean }>;
