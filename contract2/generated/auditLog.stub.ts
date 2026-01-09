/**
 * AuditLog API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/auditLog
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/entity/:type/:id
export type GetAuditLogResponse = ApiResponse<AuditLog>;

// GET /api/auditLog/user/:id
export type GetAuditLogResponse = ApiResponse<AuditLog>;

// GET /api/auditLog/security
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/export
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/failed-logins
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/suspicious
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// POST /api/auditLog/check-brute-force
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// GET /api/auditLog/summary
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/security-events
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/compliance-report
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/archiving/stats
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/archiving/summary
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// POST /api/auditLog/archiving/run
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/archiving/verify
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/archiving/restore
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/log-with-diff
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/log-bulk-action
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/log-security-event
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// GET /api/auditLog/search
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/by-action/:action
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/by-date-range
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/analytics/activity-summary
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/analytics/top-users
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/analytics/top-actions
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/analytics/anomalies
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// POST /api/auditLog/compliance/generate-report
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/compliance/verify-integrity
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/compliance/export-for-audit
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// GET /api/auditLog/compliance/retention-status
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// GET /api/auditLog/archive/stats
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AuditLogListResponse = PaginatedResponse<AuditLog>;

// POST /api/auditLog/archive/run
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;

// POST /api/auditLog/archive/verify
export interface CreateAuditLogRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAuditLogResponse = ApiResponse<AuditLog>;
