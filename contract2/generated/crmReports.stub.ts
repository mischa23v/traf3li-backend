/**
 * CrmReports API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/crmReports/quick-stats
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/recent-activity
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/funnel/overview
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/funnel/velocity
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/funnel/bottlenecks
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/aging/overview
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/aging/by-stage
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/leads-source/overview
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/leads-source/trend
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/win-loss/overview
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/win-loss/reasons
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/win-loss/trend
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/activity/overview
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/activity/by-day-of-week
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/activity/by-hour
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/activity/leaderboard
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/forecast/overview
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/forecast/by-month
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/forecast/by-rep
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// POST /api/crmReports/export
export interface CreateCrmReportsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmReportsResponse = ApiResponse<CrmReports>;

// GET /api/crmReports/campaign-efficiency
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/lead-owner-efficiency
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/first-response-time
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/lost-opportunity
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/sales-pipeline
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/prospects-engaged
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;

// GET /api/crmReports/lead-conversion-time
export interface CrmReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmReportsListResponse = PaginatedResponse<CrmReports>;
