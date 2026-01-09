/**
 * Views API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/views
export interface ViewsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ViewsListResponse = PaginatedResponse<Views>;

// POST /api/views
export interface CreateViewsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateViewsResponse = ApiResponse<Views>;

// GET /api/views/:id
export type GetViewsResponse = ApiResponse<Views>;

// PUT /api/views/:id
export interface UpdateViewsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateViewsResponse = ApiResponse<Views>;

// PATCH /api/views/:id
export interface UpdateViewsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateViewsResponse = ApiResponse<Views>;

// DELETE /api/views/:id
export type DeleteViewsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/views/:id/render
export type GetViewsResponse = ApiResponse<Views>;

// POST /api/views/:id/clone
export interface CreateViewsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateViewsResponse = ApiResponse<Views>;

// POST /api/views/:id/share
export interface CreateViewsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateViewsResponse = ApiResponse<Views>;

// POST /api/views/:id/favorite
export interface CreateViewsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateViewsResponse = ApiResponse<Views>;

// POST /api/views/:id/default
export interface CreateViewsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateViewsResponse = ApiResponse<Views>;
