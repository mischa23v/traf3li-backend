/**
 * TemporalOnboarding API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/temporalOnboarding/:id/start-onboarding
export interface CreateTemporalOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOnboardingResponse = ApiResponse<TemporalOnboarding>;

// POST /api/temporalOnboarding/:id/onboarding/complete-documents
export interface CreateTemporalOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOnboardingResponse = ApiResponse<TemporalOnboarding>;

// POST /api/temporalOnboarding/:id/onboarding/complete-training
export interface CreateTemporalOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOnboardingResponse = ApiResponse<TemporalOnboarding>;

// POST /api/temporalOnboarding/:id/onboarding/complete-review
export interface CreateTemporalOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOnboardingResponse = ApiResponse<TemporalOnboarding>;

// GET /api/temporalOnboarding/:id/onboarding/status
export type GetTemporalOnboardingResponse = ApiResponse<TemporalOnboarding>;

// POST /api/temporalOnboarding/:id/onboarding/skip-phase
export interface CreateTemporalOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalOnboardingResponse = ApiResponse<TemporalOnboarding>;

// DELETE /api/temporalOnboarding/:id/onboarding/cancel
export type DeleteTemporalOnboardingResponse = ApiResponse<{ deleted: boolean }>;
