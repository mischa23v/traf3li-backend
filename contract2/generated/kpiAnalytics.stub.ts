/**
 * KpiAnalytics API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/kpiAnalytics/kpi-dashboard
export interface KpiAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KpiAnalyticsListResponse = PaginatedResponse<KpiAnalytics>;

// GET /api/kpiAnalytics/revenue-by-case
export interface KpiAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KpiAnalyticsListResponse = PaginatedResponse<KpiAnalytics>;

// GET /api/kpiAnalytics/case-throughput
export interface KpiAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KpiAnalyticsListResponse = PaginatedResponse<KpiAnalytics>;

// GET /api/kpiAnalytics/user-activation
export interface KpiAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KpiAnalyticsListResponse = PaginatedResponse<KpiAnalytics>;
