/**
 * Status API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/status
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// GET /api/status/components
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// GET /api/status/components/:id
export type GetStatusResponse = ApiResponse<Status>;

// GET /api/status/incidents
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// GET /api/status/incidents/:id
export type GetStatusResponse = ApiResponse<Status>;

// GET /api/status/maintenance
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// POST /api/status/subscribe
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// GET /api/status/unsubscribe/:token
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// GET /api/status/admin/components
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// POST /api/status/admin/components
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// PUT /api/status/admin/components/:id
export interface UpdateStatusRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateStatusResponse = ApiResponse<Status>;

// DELETE /api/status/admin/components/:id
export type DeleteStatusResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/status/admin/incidents
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// PUT /api/status/admin/incidents/:id
export interface UpdateStatusRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateStatusResponse = ApiResponse<Status>;

// POST /api/status/admin/incidents/:id/resolve
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// POST /api/status/admin/maintenance
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// PUT /api/status/admin/maintenance/:id
export interface UpdateStatusRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateStatusResponse = ApiResponse<Status>;

// POST /api/status/admin/maintenance/:id/start
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// POST /api/status/admin/maintenance/:id/complete
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// POST /api/status/admin/maintenance/:id/cancel
export interface CreateStatusRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStatusResponse = ApiResponse<Status>;

// GET /api/status/admin/subscribers
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;

// GET /api/status/admin/history
export interface StatusListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StatusListResponse = PaginatedResponse<Status>;
