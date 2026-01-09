/**
 * FinanceSetup API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/financeSetup/status
export interface FinanceSetupListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FinanceSetupListResponse = PaginatedResponse<FinanceSetup>;

// GET /api/financeSetup/templates
export interface FinanceSetupListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FinanceSetupListResponse = PaginatedResponse<FinanceSetup>;

// GET /api/financeSetup
export interface FinanceSetupListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FinanceSetupListResponse = PaginatedResponse<FinanceSetup>;

// PUT /api/financeSetup
export interface UpdateFinanceSetupRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateFinanceSetupResponse = ApiResponse<FinanceSetup>;

// PUT /api/financeSetup/step/:step
export interface UpdateFinanceSetupRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateFinanceSetupResponse = ApiResponse<FinanceSetup>;

// POST /api/financeSetup/complete
export interface CreateFinanceSetupRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateFinanceSetupResponse = ApiResponse<FinanceSetup>;

// POST /api/financeSetup/reset
export interface CreateFinanceSetupRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateFinanceSetupResponse = ApiResponse<FinanceSetup>;
