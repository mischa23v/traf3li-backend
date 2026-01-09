/**
 * CrmSettings API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/crmSettings
export interface CrmSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmSettingsListResponse = PaginatedResponse<CrmSettings>;

// PUT /api/crmSettings
export interface UpdateCrmSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCrmSettingsResponse = ApiResponse<CrmSettings>;

// POST /api/crmSettings/reset
export interface CreateCrmSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmSettingsResponse = ApiResponse<CrmSettings>;
