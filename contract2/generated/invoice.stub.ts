/**
 * Invoice API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/invoice/stats
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// GET /api/invoice/overdue
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// GET /api/invoice/billable-items
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// GET /api/invoice/open/:clientId
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// POST /api/invoice/confirm-payment
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/bulk-delete
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// GET /api/invoice
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// GET /api/invoice/:id
export type GetInvoiceResponse = ApiResponse<Invoice>;

// GET /api/invoice/:_id
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// PATCH /api/invoice/:id
export interface UpdateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInvoiceResponse = ApiResponse<Invoice>;

// PATCH /api/invoice/:_id
export interface UpdateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInvoiceResponse = ApiResponse<Invoice>;

// PUT /api/invoice/:id
export interface UpdateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInvoiceResponse = ApiResponse<Invoice>;

// DELETE /api/invoice/:id
export type DeleteInvoiceResponse = ApiResponse<{ deleted: boolean }>;

// DELETE /api/invoice/:_id
export type DeleteInvoiceResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/invoice/:id/send
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:_id/send
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/record-payment
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/payments
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:_id/payments
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/void
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/duplicate
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/send-reminder
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/convert-to-credit-note
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/apply-retainer
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/submit-for-approval
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/approve
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/reject
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/zatca/submit
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// GET /api/invoice/:id/zatca/status
export type GetInvoiceResponse = ApiResponse<Invoice>;

// GET /api/invoice/:id/pdf
export type GetInvoiceResponse = ApiResponse<Invoice>;

// GET /api/invoice/:id/xml
export type GetInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:id/payment
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;

// POST /api/invoice/:_id/payment
export interface CreateInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceResponse = ApiResponse<Invoice>;
