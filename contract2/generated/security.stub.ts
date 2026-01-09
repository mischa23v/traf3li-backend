/**
 * Security API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/security/dashboard
export interface SecurityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityListResponse = PaginatedResponse<Security>;

// GET /api/security/incidents
export interface SecurityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityListResponse = PaginatedResponse<Security>;

// GET /api/security/incidents/:id
export type GetSecurityResponse = ApiResponse<Security>;

// PUT /api/security/incidents/:id
export interface UpdateSecurityRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSecurityResponse = ApiResponse<Security>;

// POST /api/security/incidents/:id/acknowledge
export interface CreateSecurityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityResponse = ApiResponse<Security>;

// POST /api/security/incidents/:id/notes
export interface CreateSecurityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityResponse = ApiResponse<Security>;

// POST /api/security/detect/brute-force
export interface CreateSecurityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityResponse = ApiResponse<Security>;

// POST /api/security/detect/account-takeover
export interface CreateSecurityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityResponse = ApiResponse<Security>;

// POST /api/security/detect/anomalous-activity
export interface CreateSecurityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityResponse = ApiResponse<Security>;

// GET /api/security/stats
export interface SecurityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityListResponse = PaginatedResponse<Security>;

// GET /api/security/incidents/open
export interface SecurityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityListResponse = PaginatedResponse<Security>;
