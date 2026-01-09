/**
 * PreparedReport API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/preparedReport/stats
export interface PreparedReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PreparedReportListResponse = PaginatedResponse<PreparedReport>;

// POST /api/preparedReport/request
export interface CreatePreparedReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePreparedReportResponse = ApiResponse<PreparedReport>;

// POST /api/preparedReport/cleanup
export interface CreatePreparedReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePreparedReportResponse = ApiResponse<PreparedReport>;

// GET /api/preparedReport
export interface PreparedReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PreparedReportListResponse = PaginatedResponse<PreparedReport>;

// GET /api/preparedReport/:id
export type GetPreparedReportResponse = ApiResponse<PreparedReport>;

// DELETE /api/preparedReport/:id
export type DeletePreparedReportResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/preparedReport/:id/refresh
export interface CreatePreparedReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePreparedReportResponse = ApiResponse<PreparedReport>;
