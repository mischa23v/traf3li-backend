/**
 * Account API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/account/types
export interface AccountListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AccountListResponse = PaginatedResponse<Account>;

// GET /api/account
export interface AccountListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AccountListResponse = PaginatedResponse<Account>;

// GET /api/account/:id
export type GetAccountResponse = ApiResponse<Account>;

// GET /api/account/:id/balance
export type GetAccountResponse = ApiResponse<Account>;

// POST /api/account
export interface CreateAccountRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAccountResponse = ApiResponse<Account>;

// PATCH /api/account/:id
export interface UpdateAccountRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAccountResponse = ApiResponse<Account>;

// DELETE /api/account/:id
export type DeleteAccountResponse = ApiResponse<{ deleted: boolean }>;
