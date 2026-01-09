/**
 * AutomatedActions API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/automatedActions/models
export interface AutomatedActionsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AutomatedActionsListResponse = PaginatedResponse<AutomatedActions>;

// GET /api/automatedActions/models/:modelName/fields
export interface AutomatedActionsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AutomatedActionsListResponse = PaginatedResponse<AutomatedActions>;

// GET /api/automatedActions/logs
export interface AutomatedActionsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AutomatedActionsListResponse = PaginatedResponse<AutomatedActions>;

// POST /api/automatedActions/bulk/enable
export interface CreateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// POST /api/automatedActions/bulk/disable
export interface CreateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// DELETE /api/automatedActions/bulk
export type DeleteAutomatedActionsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/automatedActions
export interface AutomatedActionsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AutomatedActionsListResponse = PaginatedResponse<AutomatedActions>;

// POST /api/automatedActions
export interface CreateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// GET /api/automatedActions/:id
export type GetAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// PATCH /api/automatedActions/:id
export interface UpdateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// DELETE /api/automatedActions/:id
export type DeleteAutomatedActionsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/automatedActions/:id/toggle
export interface CreateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// POST /api/automatedActions/:id/test
export interface CreateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// GET /api/automatedActions/:id/logs
export type GetAutomatedActionsResponse = ApiResponse<AutomatedActions>;

// POST /api/automatedActions/:id/duplicate
export interface CreateAutomatedActionsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomatedActionsResponse = ApiResponse<AutomatedActions>;
