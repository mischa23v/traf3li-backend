/**
 * Assets API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/assets/stats
export interface AssetsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetsListResponse = PaginatedResponse<Assets>;

// GET /api/assets/categories
export interface AssetsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetsListResponse = PaginatedResponse<Assets>;

// POST /api/assets/categories
export interface CreateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetsResponse = ApiResponse<Assets>;

// GET /api/assets/categories/:id
export type GetAssetsResponse = ApiResponse<Assets>;

// PUT /api/assets/categories/:id
export interface UpdateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetsResponse = ApiResponse<Assets>;

// DELETE /api/assets/categories/:id
export type DeleteAssetsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/assets/maintenance
export interface AssetsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetsListResponse = PaginatedResponse<Assets>;

// POST /api/assets/maintenance
export interface CreateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetsResponse = ApiResponse<Assets>;

// GET /api/assets/maintenance/:id
export type GetAssetsResponse = ApiResponse<Assets>;

// PUT /api/assets/maintenance/:id
export interface UpdateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetsResponse = ApiResponse<Assets>;

// POST /api/assets/maintenance/:id/complete
export interface CreateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetsResponse = ApiResponse<Assets>;

// GET /api/assets/movements
export interface AssetsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetsListResponse = PaginatedResponse<Assets>;

// POST /api/assets/movements
export interface CreateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetsResponse = ApiResponse<Assets>;

// GET /api/assets/settings
export interface AssetsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetsListResponse = PaginatedResponse<Assets>;

// PUT /api/assets/settings
export interface UpdateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetsResponse = ApiResponse<Assets>;

// GET /api/assets
export interface AssetsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetsListResponse = PaginatedResponse<Assets>;

// POST /api/assets
export interface CreateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetsResponse = ApiResponse<Assets>;

// GET /api/assets/:id
export type GetAssetsResponse = ApiResponse<Assets>;

// PUT /api/assets/:id
export interface UpdateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetsResponse = ApiResponse<Assets>;

// POST /api/assets/:id/submit
export interface CreateAssetsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetsResponse = ApiResponse<Assets>;

// DELETE /api/assets/:id
export type DeleteAssetsResponse = ApiResponse<{ deleted: boolean }>;
