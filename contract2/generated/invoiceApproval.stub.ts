/**
 * InvoiceApproval API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/invoiceApproval/pending
export interface InvoiceApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceApprovalListResponse = PaginatedResponse<InvoiceApproval>;

// GET /api/invoiceApproval/stats
export interface InvoiceApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceApprovalListResponse = PaginatedResponse<InvoiceApproval>;

// GET /api/invoiceApproval/needing-escalation
export interface InvoiceApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceApprovalListResponse = PaginatedResponse<InvoiceApproval>;

// GET /api/invoiceApproval
export interface InvoiceApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InvoiceApprovalListResponse = PaginatedResponse<InvoiceApproval>;

// GET /api/invoiceApproval/:id
export type GetInvoiceApprovalResponse = ApiResponse<InvoiceApproval>;

// POST /api/invoiceApproval/:id/approve
export interface CreateInvoiceApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceApprovalResponse = ApiResponse<InvoiceApproval>;

// POST /api/invoiceApproval/:id/reject
export interface CreateInvoiceApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceApprovalResponse = ApiResponse<InvoiceApproval>;

// POST /api/invoiceApproval/:id/escalate
export interface CreateInvoiceApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceApprovalResponse = ApiResponse<InvoiceApproval>;

// POST /api/invoiceApproval/:id/cancel
export interface CreateInvoiceApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInvoiceApprovalResponse = ApiResponse<InvoiceApproval>;
