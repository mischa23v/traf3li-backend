/**
 * ExchangeRateRevaluation API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/exchangeRateRevaluation/report
export interface ExchangeRateRevaluationListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExchangeRateRevaluationListResponse = PaginatedResponse<ExchangeRateRevaluation>;

// GET /api/exchangeRateRevaluation/accounts
export interface ExchangeRateRevaluationListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExchangeRateRevaluationListResponse = PaginatedResponse<ExchangeRateRevaluation>;

// POST /api/exchangeRateRevaluation/preview
export interface CreateExchangeRateRevaluationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExchangeRateRevaluationResponse = ApiResponse<ExchangeRateRevaluation>;

// GET /api/exchangeRateRevaluation
export interface ExchangeRateRevaluationListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExchangeRateRevaluationListResponse = PaginatedResponse<ExchangeRateRevaluation>;

// POST /api/exchangeRateRevaluation
export interface CreateExchangeRateRevaluationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExchangeRateRevaluationResponse = ApiResponse<ExchangeRateRevaluation>;

// GET /api/exchangeRateRevaluation/:id
export type GetExchangeRateRevaluationResponse = ApiResponse<ExchangeRateRevaluation>;

// DELETE /api/exchangeRateRevaluation/:id
export type DeleteExchangeRateRevaluationResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/exchangeRateRevaluation/:id/post
export interface CreateExchangeRateRevaluationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExchangeRateRevaluationResponse = ApiResponse<ExchangeRateRevaluation>;

// POST /api/exchangeRateRevaluation/:id/reverse
export interface CreateExchangeRateRevaluationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExchangeRateRevaluationResponse = ApiResponse<ExchangeRateRevaluation>;
