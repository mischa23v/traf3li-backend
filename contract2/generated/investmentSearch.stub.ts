/**
 * InvestmentSearch API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/investmentSearch/symbols
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// GET /api/investmentSearch/quote
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// POST /api/investmentSearch/quotes
export interface CreateInvestmentSearchRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvestmentSearchResponse = ApiResponse<InvestmentSearch>;

// GET /api/investmentSearch/markets
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// GET /api/investmentSearch/types
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// GET /api/investmentSearch/sectors
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// GET /api/investmentSearch/market/:market
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// GET /api/investmentSearch/type/:type
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;

// GET /api/investmentSearch/symbol/:symbol
export interface InvestmentSearchListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvestmentSearchListResponse = PaginatedResponse<InvestmentSearch>;
