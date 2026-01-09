/**
 * Kyc API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/kyc/webhook
export interface CreateKycRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKycResponse = ApiResponse<Kyc>;

// POST /api/kyc/initiate
export interface CreateKycRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKycResponse = ApiResponse<Kyc>;

// POST /api/kyc/verify
export interface CreateKycRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKycResponse = ApiResponse<Kyc>;

// POST /api/kyc/submit
export interface CreateKycRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKycResponse = ApiResponse<Kyc>;

// GET /api/kyc/status
export interface KycListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KycListResponse = PaginatedResponse<Kyc>;

// GET /api/kyc/history
export interface KycListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KycListResponse = PaginatedResponse<Kyc>;

// POST /api/kyc/review
export interface CreateKycRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKycResponse = ApiResponse<Kyc>;

// GET /api/kyc/admin/pending
export interface KycListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KycListResponse = PaginatedResponse<Kyc>;

// GET /api/kyc/admin/stats
export interface KycListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KycListResponse = PaginatedResponse<Kyc>;
