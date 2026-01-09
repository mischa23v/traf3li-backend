/**
 * TemporalOffboarding API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/temporalOffboarding/:id/start-offboarding
export interface CreateTemporalOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOffboardingResponse = ApiResponse<TemporalOffboarding>;

// POST /api/temporalOffboarding/:id/offboarding/complete-task
export interface CreateTemporalOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOffboardingResponse = ApiResponse<TemporalOffboarding>;

// GET /api/temporalOffboarding/:id/offboarding/status
export type GetTemporalOffboardingResponse = ApiResponse<TemporalOffboarding>;

// POST /api/temporalOffboarding/:id/offboarding/escalate
export interface CreateTemporalOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOffboardingResponse = ApiResponse<TemporalOffboarding>;

// POST /api/temporalOffboarding/:id/offboarding/cancel
export interface CreateTemporalOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOffboardingResponse = ApiResponse<TemporalOffboarding>;
