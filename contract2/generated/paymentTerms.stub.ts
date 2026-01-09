/**
 * PaymentTerms API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/paymentTerms
export interface PaymentTermsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PaymentTermsListResponse = PaginatedResponse<PaymentTerms>;

// GET /api/paymentTerms/default
export interface PaymentTermsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PaymentTermsListResponse = PaginatedResponse<PaymentTerms>;

// POST /api/paymentTerms/initialize
export interface CreatePaymentTermsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentTermsResponse = ApiResponse<PaymentTerms>;

// GET /api/paymentTerms/:id
export type GetPaymentTermsResponse = ApiResponse<PaymentTerms>;

// POST /api/paymentTerms/:id/calculate-due-date
export interface CreatePaymentTermsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentTermsResponse = ApiResponse<PaymentTerms>;

// POST /api/paymentTerms/:id/calculate-installments
export interface CreatePaymentTermsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentTermsResponse = ApiResponse<PaymentTerms>;

// POST /api/paymentTerms
export interface CreatePaymentTermsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentTermsResponse = ApiResponse<PaymentTerms>;

// PUT /api/paymentTerms/:id
export interface UpdatePaymentTermsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePaymentTermsResponse = ApiResponse<PaymentTerms>;

// POST /api/paymentTerms/:id/set-default
export interface CreatePaymentTermsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePaymentTermsResponse = ApiResponse<PaymentTerms>;

// DELETE /api/paymentTerms/:id
export type DeletePaymentTermsResponse = ApiResponse<{ deleted: boolean }>;
