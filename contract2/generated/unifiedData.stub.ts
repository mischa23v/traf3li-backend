/**
 * UnifiedData API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/unifiedData/billable-items
export interface UnifiedDataListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type UnifiedDataListResponse = PaginatedResponse<UnifiedData>;

// GET /api/unifiedData/open-invoices
export interface UnifiedDataListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type UnifiedDataListResponse = PaginatedResponse<UnifiedData>;

// GET /api/unifiedData/financial-summary
export interface UnifiedDataListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type UnifiedDataListResponse = PaginatedResponse<UnifiedData>;

// GET /api/unifiedData/client-portfolio/:clientId
export interface UnifiedDataListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type UnifiedDataListResponse = PaginatedResponse<UnifiedData>;

// GET /api/unifiedData/hr-dashboard
export interface UnifiedDataListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type UnifiedDataListResponse = PaginatedResponse<UnifiedData>;

// GET /api/unifiedData/case-financials/:caseId
export interface UnifiedDataListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type UnifiedDataListResponse = PaginatedResponse<UnifiedData>;
