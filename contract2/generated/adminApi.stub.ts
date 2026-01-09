/**
 * AdminApi API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/adminApi/dashboard/summary
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/dashboard/revenue
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/dashboard/active-users
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/dashboard/system-health
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/dashboard/pending-approvals
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/dashboard/recent-activity
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/users
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/users/export
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/users/:id
export type GetAdminApiResponse = ApiResponse<AdminApi>;

// PATCH /api/adminApi/users/:id/status
export interface UpdateAdminApiRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAdminApiResponse = ApiResponse<AdminApi>;

// POST /api/adminApi/users/:id/revoke-tokens
export interface CreateAdminApiRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminApiResponse = ApiResponse<AdminApi>;

// POST /api/adminApi/users/:id/reset-password
export interface CreateAdminApiRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAdminApiResponse = ApiResponse<AdminApi>;

// GET /api/adminApi/audit/logs
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/audit/security-events
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/audit/compliance-report
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/audit/export
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/audit/login-history
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/firms
export interface AdminApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AdminApiListResponse = PaginatedResponse<AdminApi>;

// GET /api/adminApi/firms/:id
export type GetAdminApiResponse = ApiResponse<AdminApi>;

// GET /api/adminApi/firms/:id/usage
export type GetAdminApiResponse = ApiResponse<AdminApi>;

// PATCH /api/adminApi/firms/:id/plan
export interface UpdateAdminApiRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAdminApiResponse = ApiResponse<AdminApi>;

// PATCH /api/adminApi/firms/:id/suspend
export interface UpdateAdminApiRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAdminApiResponse = ApiResponse<AdminApi>;
