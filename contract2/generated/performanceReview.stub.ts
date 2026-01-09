/**
 * PerformanceReview API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/performanceReview/stats
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// GET /api/performanceReview/overdue
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// GET /api/performanceReview/templates
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// POST /api/performanceReview/templates
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// PATCH /api/performanceReview/templates/:id
export interface UpdatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// GET /api/performanceReview/calibration-sessions
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// POST /api/performanceReview/calibration-sessions
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/calibration-sessions/:id/complete
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/bulk-create
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/bulk-delete
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// GET /api/performanceReview/employee/:employeeId/history
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// GET /api/performanceReview/team/:managerId/summary
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// GET /api/performanceReview
export interface PerformanceReviewListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PerformanceReviewListResponse = PaginatedResponse<PerformanceReview>;

// POST /api/performanceReview
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// GET /api/performanceReview/:id
export type GetPerformanceReviewResponse = ApiResponse<PerformanceReview>;

// PATCH /api/performanceReview/:id
export interface UpdatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// DELETE /api/performanceReview/:id
export type DeletePerformanceReviewResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/performanceReview/:id/self-assessment
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/manager-assessment
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/360-feedback/request
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/360-feedback/:providerId
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/development-plan
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// PATCH /api/performanceReview/:id/development-plan/:itemId
export interface UpdatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/calibration
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/calibration/apply
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/complete
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/acknowledge
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;

// POST /api/performanceReview/:id/reminder
export interface CreatePerformanceReviewRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePerformanceReviewResponse = ApiResponse<PerformanceReview>;
