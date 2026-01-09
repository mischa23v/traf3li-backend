/**
 * GeneralLedger API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/generalLedger/stats
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/summary
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/trial-balance
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/profit-loss
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/balance-sheet
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/account-balance/:accountId
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/reference/:model/:id
export type GetGeneralLedgerResponse = ApiResponse<GeneralLedger>;

// GET /api/generalLedger/entries
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// GET /api/generalLedger/:id
export type GetGeneralLedgerResponse = ApiResponse<GeneralLedger>;

// POST /api/generalLedger/:id/void
export interface CreateGeneralLedgerRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGeneralLedgerResponse = ApiResponse<GeneralLedger>;

// GET /api/generalLedger
export interface GeneralLedgerListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GeneralLedgerListResponse = PaginatedResponse<GeneralLedger>;

// POST /api/generalLedger/void/:id
export interface CreateGeneralLedgerRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGeneralLedgerResponse = ApiResponse<GeneralLedger>;
