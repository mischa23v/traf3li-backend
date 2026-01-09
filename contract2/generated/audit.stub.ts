/**
 * Audit API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/audit
export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditListResponse = PaginatedResponse<Audit>;

// GET /api/audit/export
export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditListResponse = PaginatedResponse<Audit>;

// GET /api/audit/stats
export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditListResponse = PaginatedResponse<Audit>;

// GET /api/audit/options
export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditListResponse = PaginatedResponse<Audit>;

// GET /api/audit/user/:userId
export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditListResponse = PaginatedResponse<Audit>;
