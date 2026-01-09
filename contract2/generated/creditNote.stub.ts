/**
 * CreditNote API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/creditNote
export interface CreditNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CreditNoteListResponse = PaginatedResponse<CreditNote>;

// GET /api/creditNote/stats
export interface CreditNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CreditNoteListResponse = PaginatedResponse<CreditNote>;

// GET /api/creditNote/invoice/:invoiceId
export interface CreditNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CreditNoteListResponse = PaginatedResponse<CreditNote>;

// GET /api/creditNote/:id
export type GetCreditNoteResponse = ApiResponse<CreditNote>;

// POST /api/creditNote
export interface CreateCreditNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCreditNoteResponse = ApiResponse<CreditNote>;

// PUT /api/creditNote/:id
export interface UpdateCreditNoteRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCreditNoteResponse = ApiResponse<CreditNote>;

// POST /api/creditNote/:id/issue
export interface CreateCreditNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCreditNoteResponse = ApiResponse<CreditNote>;

// POST /api/creditNote/:id/apply
export interface CreateCreditNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCreditNoteResponse = ApiResponse<CreditNote>;

// POST /api/creditNote/:id/void
export interface CreateCreditNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCreditNoteResponse = ApiResponse<CreditNote>;

// DELETE /api/creditNote/:id
export type DeleteCreditNoteResponse = ApiResponse<{ deleted: boolean }>;
