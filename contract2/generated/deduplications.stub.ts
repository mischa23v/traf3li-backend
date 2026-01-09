/**
 * Deduplications API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/deduplications/contacts/:id/duplicates
export type GetDeduplicationsResponse = ApiResponse<Deduplications>;

// POST /api/deduplications/contacts/scan-duplicates
export interface CreateDeduplicationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDeduplicationsResponse = ApiResponse<Deduplications>;

// GET /api/deduplications/contacts/duplicate-suggestions
export interface DeduplicationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DeduplicationsListResponse = PaginatedResponse<Deduplications>;

// POST /api/deduplications/contacts/merge
export interface CreateDeduplicationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDeduplicationsResponse = ApiResponse<Deduplications>;

// POST /api/deduplications/contacts/auto-merge
export interface CreateDeduplicationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDeduplicationsResponse = ApiResponse<Deduplications>;

// POST /api/deduplications/contacts/not-duplicate
export interface CreateDeduplicationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDeduplicationsResponse = ApiResponse<Deduplications>;
