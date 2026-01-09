/**
 * Payout API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/payout/stripe/connect
export interface CreatePayoutRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayoutResponse = ApiResponse<Payout>;

// GET /api/payout/stripe/callback
export interface PayoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayoutListResponse = PaginatedResponse<Payout>;

// GET /api/payout/stripe/dashboard
export interface PayoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayoutListResponse = PaginatedResponse<Payout>;

// GET /api/payout/stripe/account
export interface PayoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayoutListResponse = PaginatedResponse<Payout>;

// GET /api/payout/payouts/stats
export interface PayoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayoutListResponse = PaginatedResponse<Payout>;

// POST /api/payout/payouts/request
export interface CreatePayoutRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayoutResponse = ApiResponse<Payout>;

// GET /api/payout/payouts
export interface PayoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayoutListResponse = PaginatedResponse<Payout>;

// GET /api/payout/payouts/:id
export type GetPayoutResponse = ApiResponse<Payout>;

// POST /api/payout/payouts/:id/cancel
export interface CreatePayoutRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayoutResponse = ApiResponse<Payout>;

// POST /api/payout/payouts/:id/retry
export interface CreatePayoutRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayoutResponse = ApiResponse<Payout>;
