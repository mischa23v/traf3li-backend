/**
 * AnalyticsReport API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/analyticsReport/stats
export interface AnalyticsReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticsReportListResponse = PaginatedResponse<AnalyticsReport>;

// GET /api/analyticsReport/favorites
export interface AnalyticsReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticsReportListResponse = PaginatedResponse<AnalyticsReport>;

// GET /api/analyticsReport/pinned
export interface AnalyticsReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticsReportListResponse = PaginatedResponse<AnalyticsReport>;

// GET /api/analyticsReport/templates
export interface AnalyticsReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticsReportListResponse = PaginatedResponse<AnalyticsReport>;

// GET /api/analyticsReport/section/:section
export interface AnalyticsReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticsReportListResponse = PaginatedResponse<AnalyticsReport>;

// POST /api/analyticsReport/from-template/:templateId
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// GET /api/analyticsReport
export interface AnalyticsReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticsReportListResponse = PaginatedResponse<AnalyticsReport>;

// POST /api/analyticsReport
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// POST /api/analyticsReport/bulk-delete
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// GET /api/analyticsReport/:id
export type GetAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// PATCH /api/analyticsReport/:id
export interface UpdateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// PUT /api/analyticsReport/:id
export interface UpdateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// DELETE /api/analyticsReport/:id
export type DeleteAnalyticsReportResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/analyticsReport/:id/run
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// POST /api/analyticsReport/:id/clone
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// POST /api/analyticsReport/:id/export
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// POST /api/analyticsReport/:id/favorite
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// POST /api/analyticsReport/:id/pin
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// POST /api/analyticsReport/:id/schedule
export interface CreateAnalyticsReportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticsReportResponse = ApiResponse<AnalyticsReport>;

// DELETE /api/analyticsReport/:id/schedule
export type DeleteAnalyticsReportResponse = ApiResponse<{ deleted: boolean }>;
