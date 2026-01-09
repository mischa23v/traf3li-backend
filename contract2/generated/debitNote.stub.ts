/**
 * DebitNote API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/debitNote
export interface DebitNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DebitNoteListResponse = PaginatedResponse<DebitNote>;

// GET /api/debitNote/pending-approvals
export interface DebitNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DebitNoteListResponse = PaginatedResponse<DebitNote>;

// GET /api/debitNote/bill/:billId
export interface DebitNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DebitNoteListResponse = PaginatedResponse<DebitNote>;

// GET /api/debitNote/:id
export type GetDebitNoteResponse = ApiResponse<DebitNote>;

// POST /api/debitNote
export interface CreateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDebitNoteResponse = ApiResponse<DebitNote>;

// PUT /api/debitNote/:id
export interface UpdateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateDebitNoteResponse = ApiResponse<DebitNote>;

// POST /api/debitNote/:id/submit
export interface CreateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDebitNoteResponse = ApiResponse<DebitNote>;

// POST /api/debitNote/:id/approve
export interface CreateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDebitNoteResponse = ApiResponse<DebitNote>;

// POST /api/debitNote/:id/reject
export interface CreateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDebitNoteResponse = ApiResponse<DebitNote>;

// POST /api/debitNote/:id/apply
export interface CreateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDebitNoteResponse = ApiResponse<DebitNote>;

// POST /api/debitNote/:id/cancel
export interface CreateDebitNoteRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDebitNoteResponse = ApiResponse<DebitNote>;

// DELETE /api/debitNote/:id
export type DeleteDebitNoteResponse = ApiResponse<{ deleted: boolean }>;
