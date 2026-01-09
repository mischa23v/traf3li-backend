/**
 * PaymentReceipt API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/paymentReceipt
export interface PaymentReceiptListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PaymentReceiptListResponse = PaginatedResponse<PaymentReceipt>;

// GET /api/paymentReceipt/stats
export interface PaymentReceiptListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PaymentReceiptListResponse = PaginatedResponse<PaymentReceipt>;

// GET /api/paymentReceipt/:id
export type GetPaymentReceiptResponse = ApiResponse<PaymentReceipt>;

// POST /api/paymentReceipt
export interface CreatePaymentReceiptRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentReceiptResponse = ApiResponse<PaymentReceipt>;

// POST /api/paymentReceipt/:id/void
export interface CreatePaymentReceiptRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentReceiptResponse = ApiResponse<PaymentReceipt>;

// GET /api/paymentReceipt/:id/download
export type GetPaymentReceiptResponse = ApiResponse<PaymentReceipt>;

// POST /api/paymentReceipt/:id/email
export interface CreatePaymentReceiptRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentReceiptResponse = ApiResponse<PaymentReceipt>;
