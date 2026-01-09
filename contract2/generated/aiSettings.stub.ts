/**
 * AiSettings API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/aiSettings
export interface AiSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiSettingsListResponse = PaginatedResponse<AiSettings>;

// GET /api/aiSettings/features
export interface AiSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiSettingsListResponse = PaginatedResponse<AiSettings>;

// GET /api/aiSettings/usage
export interface AiSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiSettingsListResponse = PaginatedResponse<AiSettings>;

// POST /api/aiSettings/keys
export interface CreateAiSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiSettingsResponse = ApiResponse<AiSettings>;

// POST /api/aiSettings/validate
export interface CreateAiSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiSettingsResponse = ApiResponse<AiSettings>;

// DELETE /api/aiSettings/keys/:provider
export type DeleteAiSettingsResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/aiSettings/preferences
export interface UpdateAiSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAiSettingsResponse = ApiResponse<AiSettings>;
