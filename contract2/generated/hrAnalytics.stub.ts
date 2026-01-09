/**
 * HrAnalytics API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/hrAnalytics/dashboard
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/demographics
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/turnover
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/absenteeism
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/attendance
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/performance
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/recruitment
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/compensation
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/training
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/leave
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/saudization
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// POST /api/hrAnalytics/snapshot
export interface CreateHrAnalyticsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrAnalyticsResponse = ApiResponse<HrAnalytics>;

// GET /api/hrAnalytics/trends
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/export
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/attrition
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/attrition/:employeeId
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/workforce
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/high-potential
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/flight-risk
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/absence
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;

// GET /api/hrAnalytics/predictions/engagement
export interface HrAnalyticsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrAnalyticsListResponse = PaginatedResponse<HrAnalytics>;
