/**
 * Analyticss API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/analyticss/events
export interface CreateAnalyticssRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAnalyticssResponse = ApiResponse<Analyticss>;

// GET /api/analyticss/events/counts
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/dashboard
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/features
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/features/popular
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/engagement
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/retention
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/funnel
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/dropoff
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/users/:userId/journey
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/app/export
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/dashboard
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/pipeline
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/sales-funnel
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/forecast
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/lead-sources
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/win-loss
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/activity
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/team-performance
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/territory
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/campaign-roi
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/first-response
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/conversion-rates
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/cohort
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/revenue
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;

// GET /api/analyticss/crm/forecast-accuracy
export interface AnalyticssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AnalyticssListResponse = PaginatedResponse<Analyticss>;
