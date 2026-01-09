/**
 * Automations API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/automations
export interface AutomationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AutomationsListResponse = PaginatedResponse<Automations>;

// POST /api/automations
export interface CreateAutomationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomationsResponse = ApiResponse<Automations>;

// GET /api/automations/:id
export type GetAutomationsResponse = ApiResponse<Automations>;

// PUT /api/automations/:id
export interface UpdateAutomationsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAutomationsResponse = ApiResponse<Automations>;

// DELETE /api/automations/:id
export type DeleteAutomationsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/automations/:id/enable
export interface CreateAutomationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomationsResponse = ApiResponse<Automations>;

// POST /api/automations/:id/disable
export interface CreateAutomationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomationsResponse = ApiResponse<Automations>;

// POST /api/automations/:id/test
export interface CreateAutomationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAutomationsResponse = ApiResponse<Automations>;

// GET /api/automations/:id/stats
export type GetAutomationsResponse = ApiResponse<Automations>;

// GET /api/automations/:id/logs
export type GetAutomationsResponse = ApiResponse<Automations>;
