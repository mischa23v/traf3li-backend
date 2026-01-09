/**
 * Churn API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/churn/health-score/:firmId
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/health-score/:firmId/history
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// POST /api/churn/health-score/:firmId/recalculate
export interface CreateChurnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChurnResponse = ApiResponse<Churn>;

// GET /api/churn/at-risk
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// POST /api/churn/events
export interface CreateChurnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChurnResponse = ApiResponse<Churn>;

// GET /api/churn/events
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// PUT /api/churn/events/:id/reason
export interface UpdateChurnRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateChurnResponse = ApiResponse<Churn>;

// POST /api/churn/events/:id/exit-survey
export interface CreateChurnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChurnResponse = ApiResponse<Churn>;

// GET /api/churn/analytics/dashboard
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/analytics/rate
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/analytics/reasons
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/analytics/cohorts
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/analytics/revenue-at-risk
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/interventions/:firmId
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// POST /api/churn/interventions/:firmId/trigger
export interface CreateChurnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChurnResponse = ApiResponse<Churn>;

// GET /api/churn/interventions/stats
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/reports/generate
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/reports/at-risk-export
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;

// GET /api/churn/reports/executive-summary
export interface ChurnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChurnListResponse = PaginatedResponse<Churn>;
