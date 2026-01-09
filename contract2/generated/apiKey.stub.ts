/**
 * ApiKey API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/apiKey
export interface ApiKeyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApiKeyListResponse = PaginatedResponse<ApiKey>;

// GET /api/apiKey/stats
export interface ApiKeyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApiKeyListResponse = PaginatedResponse<ApiKey>;

// GET /api/apiKey/:id
export type GetApiKeyResponse = ApiResponse<ApiKey>;

// POST /api/apiKey
export interface CreateApiKeyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApiKeyResponse = ApiResponse<ApiKey>;

// PATCH /api/apiKey/:id
export interface UpdateApiKeyRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateApiKeyResponse = ApiResponse<ApiKey>;

// DELETE /api/apiKey/:id
export type DeleteApiKeyResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/apiKey/:id/regenerate
export interface CreateApiKeyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApiKeyResponse = ApiResponse<ApiKey>;
