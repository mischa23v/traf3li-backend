/**
 * ConsolidatedReports API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/consolidatedReports/profit-loss
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;

// GET /api/consolidatedReports/balance-sheet
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;

// GET /api/consolidatedReports/cash-flow
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;

// GET /api/consolidatedReports/comparison
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;

// GET /api/consolidatedReports/eliminations
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;

// POST /api/consolidatedReports/eliminations
export interface CreateConsolidatedReportsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConsolidatedReportsResponse = ApiResponse<ConsolidatedReports>;

// GET /api/consolidatedReports/auto-eliminations
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;

// GET /api/consolidatedReports/full-statement
export interface ConsolidatedReportsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConsolidatedReportsListResponse = PaginatedResponse<ConsolidatedReports>;
