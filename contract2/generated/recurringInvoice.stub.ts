/**
 * RecurringInvoice API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/recurringInvoice
export interface RecurringInvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecurringInvoiceListResponse = PaginatedResponse<RecurringInvoice>;

// GET /api/recurringInvoice/stats
export interface RecurringInvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecurringInvoiceListResponse = PaginatedResponse<RecurringInvoice>;

// GET /api/recurringInvoice/:id
export type GetRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// GET /api/recurringInvoice/:id/history
export type GetRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// GET /api/recurringInvoice/:id/preview
export type GetRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// POST /api/recurringInvoice
export interface CreateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// PUT /api/recurringInvoice/:id
export interface UpdateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// POST /api/recurringInvoice/:id/pause
export interface CreateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// POST /api/recurringInvoice/:id/resume
export interface CreateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// POST /api/recurringInvoice/:id/cancel
export interface CreateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// POST /api/recurringInvoice/:id/generate
export interface CreateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// POST /api/recurringInvoice/:id/duplicate
export interface CreateRecurringInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecurringInvoiceResponse = ApiResponse<RecurringInvoice>;

// DELETE /api/recurringInvoice/:id
export type DeleteRecurringInvoiceResponse = ApiResponse<{ deleted: boolean }>;
