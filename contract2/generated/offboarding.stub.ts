/**
 * Offboarding API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/offboarding/stats
export interface OffboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OffboardingListResponse = PaginatedResponse<Offboarding>;

// GET /api/offboarding/pending-clearances
export interface OffboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OffboardingListResponse = PaginatedResponse<Offboarding>;

// GET /api/offboarding/pending-settlements
export interface OffboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OffboardingListResponse = PaginatedResponse<Offboarding>;

// POST /api/offboarding/bulk-delete
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// GET /api/offboarding/by-employee/:employeeId
export interface OffboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OffboardingListResponse = PaginatedResponse<Offboarding>;

// GET /api/offboarding
export interface OffboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OffboardingListResponse = PaginatedResponse<Offboarding>;

// POST /api/offboarding
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// GET /api/offboarding/:offboardingId
export interface OffboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OffboardingListResponse = PaginatedResponse<Offboarding>;

// PATCH /api/offboarding/:offboardingId
export interface UpdateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOffboardingResponse = ApiResponse<Offboarding>;

// DELETE /api/offboarding/:offboardingId
export type DeleteOffboardingResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/offboarding/:offboardingId/status
export interface UpdateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/complete
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/exit-interview
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/clearance/items
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// PATCH /api/offboarding/:offboardingId/clearance/items/:itemId
export interface UpdateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/clearance/:section/complete
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/calculate-settlement
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/approve-settlement
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/process-payment
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// POST /api/offboarding/:offboardingId/issue-experience-certificate
export interface CreateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOffboardingResponse = ApiResponse<Offboarding>;

// PATCH /api/offboarding/:offboardingId/rehire-eligibility
export interface UpdateOffboardingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOffboardingResponse = ApiResponse<Offboarding>;
