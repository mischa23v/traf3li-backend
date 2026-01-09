/**
 * Referral API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/referral/stats
export interface ReferralListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ReferralListResponse = PaginatedResponse<Referral>;

// GET /api/referral/top
export interface ReferralListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ReferralListResponse = PaginatedResponse<Referral>;

// POST /api/referral
export interface CreateReferralRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReferralResponse = ApiResponse<Referral>;

// GET /api/referral
export interface ReferralListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ReferralListResponse = PaginatedResponse<Referral>;

// GET /api/referral/:id
export type GetReferralResponse = ApiResponse<Referral>;

// PUT /api/referral/:id
export interface UpdateReferralRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateReferralResponse = ApiResponse<Referral>;

// DELETE /api/referral/:id
export type DeleteReferralResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/referral/:id/leads
export interface CreateReferralRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReferralResponse = ApiResponse<Referral>;

// POST /api/referral/:id/leads/:leadId/convert
export interface CreateReferralRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReferralResponse = ApiResponse<Referral>;

// POST /api/referral/:id/payments
export interface CreateReferralRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateReferralResponse = ApiResponse<Referral>;

// GET /api/referral/:id/calculate-fee
export type GetReferralResponse = ApiResponse<Referral>;
