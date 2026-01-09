/**
 * Permission API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/permission/check
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// POST /api/permission/check-batch
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// GET /api/permission/my-permissions
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/expand/:namespace/:resourceId/:relation
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/user-resources/:userId
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/config
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// PUT /api/permission/config
export interface UpdatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePermissionResponse = ApiResponse<Permission>;

// POST /api/permission/policies
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// PUT /api/permission/policies/:policyId
export interface UpdatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePermissionResponse = ApiResponse<Permission>;

// DELETE /api/permission/policies/:policyId
export type DeletePermissionResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/permission/relations/stats
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// POST /api/permission/relations
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// DELETE /api/permission/relations
export type DeletePermissionResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/permission/relations/:namespace/:object
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/decisions
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/decisions/stats
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/decisions/denied
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/decisions/compliance-report
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/cache/stats
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// POST /api/permission/cache/clear
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// GET /api/permission/ui/sidebar
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// GET /api/permission/ui/sidebar/all
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// PUT /api/permission/ui/sidebar/:itemId/visibility
export interface UpdatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePermissionResponse = ApiResponse<Permission>;

// POST /api/permission/ui/check-page
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// GET /api/permission/ui/pages/all
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// PUT /api/permission/ui/pages/:pageId/access
export interface UpdatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePermissionResponse = ApiResponse<Permission>;

// GET /api/permission/ui/config
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// PUT /api/permission/ui/config
export interface UpdatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePermissionResponse = ApiResponse<Permission>;

// GET /api/permission/ui/matrix
export interface PermissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PermissionListResponse = PaginatedResponse<Permission>;

// PUT /api/permission/ui/roles/:role/bulk
export interface UpdatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePermissionResponse = ApiResponse<Permission>;

// POST /api/permission/ui/overrides
export interface CreatePermissionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePermissionResponse = ApiResponse<Permission>;

// DELETE /api/permission/ui/overrides/:userId
export type DeletePermissionResponse = ApiResponse<{ deleted: boolean }>;
