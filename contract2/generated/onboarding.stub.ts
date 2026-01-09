/**
 * Onboarding API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/onboarding/stats
export interface OnboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OnboardingListResponse = PaginatedResponse<Onboarding>;

// GET /api/onboarding/upcoming-reviews
export interface OnboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OnboardingListResponse = PaginatedResponse<Onboarding>;

// POST /api/onboarding/bulk-delete
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// GET /api/onboarding/by-employee/:employeeId
export interface OnboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OnboardingListResponse = PaginatedResponse<Onboarding>;

// GET /api/onboarding
export interface OnboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OnboardingListResponse = PaginatedResponse<Onboarding>;

// POST /api/onboarding
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// GET /api/onboarding/:onboardingId
export interface OnboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OnboardingListResponse = PaginatedResponse<Onboarding>;

// PATCH /api/onboarding/:onboardingId
export interface UpdateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOnboardingResponse = ApiResponse<Onboarding>;

// DELETE /api/onboarding/:onboardingId
export type DeleteOnboardingResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/onboarding/:onboardingId/status
export interface UpdateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/complete
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/complete-first-day
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/complete-first-week
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/complete-first-month
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/tasks/:taskId/complete
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/probation-reviews
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/complete-probation
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/documents
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/documents/:type/verify
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/checklist/categories
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/checklist/categories/:categoryId/tasks
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;

// POST /api/onboarding/:onboardingId/feedback
export interface CreateOnboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOnboardingResponse = ApiResponse<Onboarding>;
