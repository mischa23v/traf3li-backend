/**
 * Metrics API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/metrics
export interface MetricsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MetricsListResponse = PaginatedResponse<Metrics>;

// GET /api/metrics/json
export interface MetricsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MetricsListResponse = PaginatedResponse<Metrics>;

// GET /api/metrics/performance
export interface MetricsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MetricsListResponse = PaginatedResponse<Metrics>;

// POST /api/metrics/reset
export interface CreateMetricsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMetricsResponse = ApiResponse<Metrics>;
