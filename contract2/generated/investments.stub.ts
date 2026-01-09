/**
 * Investments API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/investments/summary
export interface InvestmentsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentsListResponse = PaginatedResponse<Investments>;

// POST /api/investments/refresh-all
export interface CreateInvestmentsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvestmentsResponse = ApiResponse<Investments>;

// POST /api/investments
export interface CreateInvestmentsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvestmentsResponse = ApiResponse<Investments>;

// GET /api/investments
export interface InvestmentsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentsListResponse = PaginatedResponse<Investments>;

// GET /api/investments/:id
export type GetInvestmentsResponse = ApiResponse<Investments>;

// PUT /api/investments/:id
export interface UpdateInvestmentsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInvestmentsResponse = ApiResponse<Investments>;

// DELETE /api/investments/:id
export type DeleteInvestmentsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/investments/:id/refresh-price
export interface CreateInvestmentsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvestmentsResponse = ApiResponse<Investments>;

// POST /api/investments/:id/transactions
export interface CreateInvestmentsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvestmentsResponse = ApiResponse<Investments>;

// GET /api/investments/:id/transactions
export type GetInvestmentsResponse = ApiResponse<Investments>;

// DELETE /api/investments/:id/transactions/:transactionId
export type DeleteInvestmentsResponse = ApiResponse<{ deleted: boolean }>;
