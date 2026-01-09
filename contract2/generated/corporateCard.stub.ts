/**
 * CorporateCard API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/corporateCard
export interface CorporateCardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CorporateCardListResponse = PaginatedResponse<CorporateCard>;

// GET /api/corporateCard/summary
export interface CorporateCardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CorporateCardListResponse = PaginatedResponse<CorporateCard>;

// GET /api/corporateCard/spending-stats
export interface CorporateCardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CorporateCardListResponse = PaginatedResponse<CorporateCard>;

// GET /api/corporateCard/:id
export type GetCorporateCardResponse = ApiResponse<CorporateCard>;

// GET /api/corporateCard/:id/transactions
export type GetCorporateCardResponse = ApiResponse<CorporateCard>;

// GET /api/corporateCard/:id/transactions/unmatched
export type GetCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// PUT /api/corporateCard/:id
export interface UpdateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard/:id/block
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard/:id/unblock
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard/:id/transactions/import
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard/:id/transactions/:transactionId/reconcile
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard/:id/transactions/:transactionId/dispute
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// POST /api/corporateCard/:id/transactions/:transactionId/categorize
export interface CreateCorporateCardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCorporateCardResponse = ApiResponse<CorporateCard>;

// DELETE /api/corporateCard/:id
export type DeleteCorporateCardResponse = ApiResponse<{ deleted: boolean }>;
