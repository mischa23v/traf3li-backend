/**
 * SavedFilters API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/savedFilters
export interface SavedFiltersListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SavedFiltersListResponse = PaginatedResponse<SavedFilters>;

// POST /api/savedFilters
export interface CreateSavedFiltersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSavedFiltersResponse = ApiResponse<SavedFilters>;

// GET /api/savedFilters/popular/:entityType
export interface SavedFiltersListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SavedFiltersListResponse = PaginatedResponse<SavedFilters>;

// GET /api/savedFilters/:id
export type GetSavedFiltersResponse = ApiResponse<SavedFilters>;

// PUT /api/savedFilters/:id
export interface UpdateSavedFiltersRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSavedFiltersResponse = ApiResponse<SavedFilters>;

// PATCH /api/savedFilters/:id
export interface UpdateSavedFiltersRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSavedFiltersResponse = ApiResponse<SavedFilters>;

// DELETE /api/savedFilters/:id
export type DeleteSavedFiltersResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/savedFilters/:id/set-default
export interface CreateSavedFiltersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSavedFiltersResponse = ApiResponse<SavedFilters>;

// POST /api/savedFilters/:id/share
export interface CreateSavedFiltersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSavedFiltersResponse = ApiResponse<SavedFilters>;

// DELETE /api/savedFilters/:id/share/:userId
export type DeleteSavedFiltersResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/savedFilters/:id/duplicate
export interface CreateSavedFiltersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSavedFiltersResponse = ApiResponse<SavedFilters>;
