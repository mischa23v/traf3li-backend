/**
 * SsoConfig API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/ssoConfig/:firmId/sso
export interface SsoConfigListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SsoConfigListResponse = PaginatedResponse<SsoConfig>;

// PUT /api/ssoConfig/:firmId/sso
export interface UpdateSsoConfigRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSsoConfigResponse = ApiResponse<SsoConfig>;

// POST /api/ssoConfig/:firmId/sso/test
export interface CreateSsoConfigRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSsoConfigResponse = ApiResponse<SsoConfig>;

// POST /api/ssoConfig/:firmId/sso/upload-metadata
export interface CreateSsoConfigRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSsoConfigResponse = ApiResponse<SsoConfig>;

// DELETE /api/ssoConfig/:firmId/sso
export type DeleteSsoConfigResponse = ApiResponse<{ deleted: boolean }>;
