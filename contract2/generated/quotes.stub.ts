/**
 * Quotes API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/quotes
export interface QuotesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type QuotesListResponse = PaginatedResponse<Quotes>;

// GET /api/quotes/:id
export type GetQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// PUT /api/quotes/:id
export interface UpdateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateQuotesResponse = ApiResponse<Quotes>;

// DELETE /api/quotes/:id
export type DeleteQuotesResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/quotes/:id/send
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes/:id/accept
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes/:id/reject
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// GET /api/quotes/:id/pdf
export type GetQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes/:id/duplicate
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes/:id/revise
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes/:id/view
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// POST /api/quotes/:id/items
export interface CreateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQuotesResponse = ApiResponse<Quotes>;

// PUT /api/quotes/:id/items/:itemId
export interface UpdateQuotesRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateQuotesResponse = ApiResponse<Quotes>;

// DELETE /api/quotes/:id/items/:itemId
export type DeleteQuotesResponse = ApiResponse<{ deleted: boolean }>;
