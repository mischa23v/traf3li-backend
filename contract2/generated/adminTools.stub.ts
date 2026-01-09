/**
 * AdminTools API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/adminTools/users/:id/data
export type GetAdminToolsResponse = ApiResponse<AdminTools>;

// DELETE /api/adminTools/users/:id/data
export type DeleteAdminToolsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/adminTools/firms/:id/export
export type GetAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/firms/:id/import
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/users/merge
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/clients/merge
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/firms/:id/recalculate-invoices
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/firms/:id/reindex
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/firms/:id/cleanup-orphaned
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// GET /api/adminTools/firms/:id/validate
export type GetAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/firms/:id/fix-currency
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// GET /api/adminTools/stats
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// GET /api/adminTools/activity-report
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// GET /api/adminTools/storage-usage
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// POST /api/adminTools/clear-cache
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// GET /api/adminTools/diagnostics
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// GET /api/adminTools/slow-queries
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// POST /api/adminTools/users/:id/reset-password
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/users/:id/impersonate
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/impersonation/:sessionId/end
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/users/:id/lock
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/users/:id/unlock
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// GET /api/adminTools/users/:id/login-history
export type GetAdminToolsResponse = ApiResponse<AdminTools>;

// GET /api/adminTools/key-rotation/status
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// GET /api/adminTools/key-rotation/check
export interface AdminToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminToolsListResponse = PaginatedResponse<AdminTools>;

// POST /api/adminTools/key-rotation/rotate
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/key-rotation/auto-rotate
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/key-rotation/generate
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/key-rotation/cleanup
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;

// POST /api/adminTools/key-rotation/initialize
export interface CreateAdminToolsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminToolsResponse = ApiResponse<AdminTools>;
