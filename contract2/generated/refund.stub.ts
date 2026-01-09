/**
 * Refund API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/refund/eligibility/:paymentId
export interface RefundListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RefundListResponse = PaginatedResponse<Refund>;

// POST /api/refund/request
export interface CreateRefundRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRefundResponse = ApiResponse<Refund>;

// GET /api/refund/history
export interface RefundListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RefundListResponse = PaginatedResponse<Refund>;

// GET /api/refund/:id
export type GetRefundResponse = ApiResponse<Refund>;

// GET /api/refund/admin/all
export interface RefundListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RefundListResponse = PaginatedResponse<Refund>;

// GET /api/refund/admin/pending
export interface RefundListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RefundListResponse = PaginatedResponse<Refund>;

// GET /api/refund/admin/statistics
export interface RefundListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RefundListResponse = PaginatedResponse<Refund>;

// POST /api/refund/admin/:id/approve
export interface CreateRefundRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRefundResponse = ApiResponse<Refund>;

// POST /api/refund/admin/:id/reject
export interface CreateRefundRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRefundResponse = ApiResponse<Refund>;

// POST /api/refund/admin/:id/execute
export interface CreateRefundRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRefundResponse = ApiResponse<Refund>;

// POST /api/refund/admin/:id/retry
export interface CreateRefundRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRefundResponse = ApiResponse<Refund>;
