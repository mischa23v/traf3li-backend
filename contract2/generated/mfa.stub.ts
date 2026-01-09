/**
 * Mfa API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/mfa/setup
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// POST /api/mfa/verify-setup
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// POST /api/mfa/verify
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// POST /api/mfa/disable
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// GET /api/mfa/status
export interface MfaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MfaListResponse = PaginatedResponse<Mfa>;

// POST /api/mfa/backup-codes/generate
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// POST /api/mfa/backup-codes/verify
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// POST /api/mfa/backup-codes/regenerate
export interface CreateMfaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMfaResponse = ApiResponse<Mfa>;

// GET /api/mfa/backup-codes/count
export interface MfaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MfaListResponse = PaginatedResponse<Mfa>;
