/**
 * SalesQuota API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/salesQuota/leaderboard
export interface SalesQuotaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesQuotaListResponse = PaginatedResponse<SalesQuota>;

// GET /api/salesQuota/team-summary
export interface SalesQuotaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesQuotaListResponse = PaginatedResponse<SalesQuota>;

// GET /api/salesQuota/my-quota
export interface SalesQuotaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesQuotaListResponse = PaginatedResponse<SalesQuota>;

// GET /api/salesQuota/period-comparison
export interface SalesQuotaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesQuotaListResponse = PaginatedResponse<SalesQuota>;

// POST /api/salesQuota
export interface CreateSalesQuotaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesQuotaResponse = ApiResponse<SalesQuota>;

// GET /api/salesQuota
export interface SalesQuotaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesQuotaListResponse = PaginatedResponse<SalesQuota>;

// GET /api/salesQuota/:id
export type GetSalesQuotaResponse = ApiResponse<SalesQuota>;

// PUT /api/salesQuota/:id
export interface UpdateSalesQuotaRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesQuotaResponse = ApiResponse<SalesQuota>;

// PATCH /api/salesQuota/:id
export interface UpdateSalesQuotaRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesQuotaResponse = ApiResponse<SalesQuota>;

// DELETE /api/salesQuota/:id
export type DeleteSalesQuotaResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/salesQuota/:id/record-deal
export interface CreateSalesQuotaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesQuotaResponse = ApiResponse<SalesQuota>;
