/**
 * Hr API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/hr/options
export interface HrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrListResponse = PaginatedResponse<Hr>;

// GET /api/hr/employees/stats
export interface HrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrListResponse = PaginatedResponse<Hr>;

// POST /api/hr/employees/bulk-delete
export interface CreateHrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrResponse = ApiResponse<Hr>;

// POST /api/hr/employees
export interface CreateHrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrResponse = ApiResponse<Hr>;

// GET /api/hr/employees
export interface HrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrListResponse = PaginatedResponse<Hr>;

// GET /api/hr/employees/:id
export type GetHrResponse = ApiResponse<Hr>;

// PUT /api/hr/employees/:id
export interface UpdateHrRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateHrResponse = ApiResponse<Hr>;

// DELETE /api/hr/employees/:id
export type DeleteHrResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/hr/employees/:id/allowances
export interface CreateHrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrResponse = ApiResponse<Hr>;

// DELETE /api/hr/employees/:id/allowances/:allowanceId
export type DeleteHrResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/hr/employees/:id/documents
export type GetHrResponse = ApiResponse<Hr>;

// POST /api/hr/employees/:id/documents
export interface CreateHrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrResponse = ApiResponse<Hr>;

// DELETE /api/hr/employees/:id/documents/:docId
export type DeleteHrResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/hr/employees/:id/documents/:docId/verify
export interface CreateHrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrResponse = ApiResponse<Hr>;
