/**
 * TemporalCase API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/temporalCase/:id/start-workflow
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/complete-requirement
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/transition-stage
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// GET /api/temporalCase/:id/workflow/status
export type GetTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/add-deadline
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/add-court-date
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/pause
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/resume
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;

// POST /api/temporalCase/:id/workflow/cancel
export interface CreateTemporalCaseRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalCaseResponse = ApiResponse<TemporalCase>;
