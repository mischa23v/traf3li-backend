/**
 * TemporalInvoice API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/temporalInvoice/:id/submit-approval
export interface CreateTemporalInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalInvoiceResponse = ApiResponse<TemporalInvoice>;

// POST /api/temporalInvoice/:id/approve
export interface CreateTemporalInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalInvoiceResponse = ApiResponse<TemporalInvoice>;

// POST /api/temporalInvoice/:id/reject
export interface CreateTemporalInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalInvoiceResponse = ApiResponse<TemporalInvoice>;

// GET /api/temporalInvoice/:id/approval-status
export type GetTemporalInvoiceResponse = ApiResponse<TemporalInvoice>;

// POST /api/temporalInvoice/:id/cancel-approval
export interface CreateTemporalInvoiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTemporalInvoiceResponse = ApiResponse<TemporalInvoice>;

// GET /api/temporalInvoice/pending-approvals
export interface TemporalInvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TemporalInvoiceListResponse = PaginatedResponse<TemporalInvoice>;
