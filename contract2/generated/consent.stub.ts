/**
 * Consent API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/consent
export interface ConsentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsentListResponse = PaginatedResponse<Consent>;

// POST /api/consent
export interface CreateConsentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConsentResponse = ApiResponse<Consent>;

// PUT /api/consent/:category
export interface UpdateConsentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateConsentResponse = ApiResponse<Consent>;

// DELETE /api/consent
export type DeleteConsentResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/consent/export
export interface CreateConsentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConsentResponse = ApiResponse<Consent>;

// GET /api/consent/history
export interface ConsentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsentListResponse = PaginatedResponse<Consent>;
