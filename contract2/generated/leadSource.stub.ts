/**
 * LeadSource API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/leadSource
export interface LeadSourceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadSourceListResponse = PaginatedResponse<LeadSource>;

// GET /api/leadSource/:id
export type GetLeadSourceResponse = ApiResponse<LeadSource>;

// POST /api/leadSource
export interface CreateLeadSourceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadSourceResponse = ApiResponse<LeadSource>;

// POST /api/leadSource/defaults
export interface CreateLeadSourceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadSourceResponse = ApiResponse<LeadSource>;

// PUT /api/leadSource/:id
export interface UpdateLeadSourceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeadSourceResponse = ApiResponse<LeadSource>;

// DELETE /api/leadSource/:id
export type DeleteLeadSourceResponse = ApiResponse<{ deleted: boolean }>;
