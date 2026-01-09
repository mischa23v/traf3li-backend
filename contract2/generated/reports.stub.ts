/**
 * Reports API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/reports/validate
export interface CreateReportsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReportsResponse = ApiResponse<Reports>;

// GET /api/reports
export interface ReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ReportsListResponse = PaginatedResponse<Reports>;

// POST /api/reports
export interface CreateReportsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReportsResponse = ApiResponse<Reports>;

// GET /api/reports/:id
export type GetReportsResponse = ApiResponse<Reports>;

// PUT /api/reports/:id
export interface UpdateReportsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateReportsResponse = ApiResponse<Reports>;

// DELETE /api/reports/:id
export type DeleteReportsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/reports/:id/execute
export type GetReportsResponse = ApiResponse<Reports>;

// POST /api/reports/:id/clone
export interface CreateReportsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReportsResponse = ApiResponse<Reports>;

// PUT /api/reports/:id/schedule
export interface UpdateReportsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateReportsResponse = ApiResponse<Reports>;

// GET /api/reports/:id/export/:format
export type GetReportsResponse = ApiResponse<Reports>;
