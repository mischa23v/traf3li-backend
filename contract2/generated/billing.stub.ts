/**
 * Billing API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/billing/plans
export interface BillingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BillingListResponse = PaginatedResponse<Billing>;

// GET /api/billing/subscription
export interface BillingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BillingListResponse = PaginatedResponse<Billing>;

// POST /api/billing/subscription
export interface CreateBillingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBillingResponse = ApiResponse<Billing>;

// PUT /api/billing/subscription
export interface UpdateBillingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBillingResponse = ApiResponse<Billing>;

// DELETE /api/billing/subscription
export type DeleteBillingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/billing/subscription/reactivate
export interface CreateBillingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBillingResponse = ApiResponse<Billing>;

// GET /api/billing/payment-methods
export interface BillingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BillingListResponse = PaginatedResponse<Billing>;

// POST /api/billing/payment-methods
export interface CreateBillingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBillingResponse = ApiResponse<Billing>;

// DELETE /api/billing/payment-methods/:id
export type DeleteBillingResponse = ApiResponse<{ deleted: boolean }>;

// PUT /api/billing/payment-methods/:id/default
export interface UpdateBillingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBillingResponse = ApiResponse<Billing>;

// POST /api/billing/setup-intent
export interface CreateBillingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBillingResponse = ApiResponse<Billing>;

// GET /api/billing/invoices
export interface BillingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BillingListResponse = PaginatedResponse<Billing>;

// GET /api/billing/invoices/:id
export type GetBillingResponse = ApiResponse<Billing>;

// GET /api/billing/invoices/:id/pdf
export type GetBillingResponse = ApiResponse<Billing>;

// GET /api/billing/usage
export interface BillingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BillingListResponse = PaginatedResponse<Billing>;

// POST /api/billing/webhook
export interface CreateBillingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBillingResponse = ApiResponse<Billing>;
