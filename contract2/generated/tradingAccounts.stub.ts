/**
 * TradingAccounts API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/tradingAccounts
export interface CreateTradingAccountsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTradingAccountsResponse = ApiResponse<TradingAccounts>;

// GET /api/tradingAccounts
export interface TradingAccountsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TradingAccountsListResponse = PaginatedResponse<TradingAccounts>;

// GET /api/tradingAccounts/:id
export type GetTradingAccountsResponse = ApiResponse<TradingAccounts>;

// PATCH /api/tradingAccounts/:id
export interface UpdateTradingAccountsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTradingAccountsResponse = ApiResponse<TradingAccounts>;

// DELETE /api/tradingAccounts/:id
export type DeleteTradingAccountsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/tradingAccounts/:id/balance
export type GetTradingAccountsResponse = ApiResponse<TradingAccounts>;

// POST /api/tradingAccounts/:id/set-default
export interface CreateTradingAccountsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTradingAccountsResponse = ApiResponse<TradingAccounts>;

// POST /api/tradingAccounts/:id/transaction
export interface CreateTradingAccountsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTradingAccountsResponse = ApiResponse<TradingAccounts>;
