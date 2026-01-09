/**
 * BulkActionss API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/bulkActionss/:entityType
export interface CreateBulkActionssRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBulkActionssResponse = ApiResponse<BulkActionss>;

// POST /api/bulkActionss/:entityType/validate
export interface CreateBulkActionssRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBulkActionssResponse = ApiResponse<BulkActionss>;

// GET /api/bulkActionss/:jobId/progress
export interface BulkActionssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BulkActionssListResponse = PaginatedResponse<BulkActionss>;

// POST /api/bulkActionss/:jobId/cancel
export interface CreateBulkActionssRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBulkActionssResponse = ApiResponse<BulkActionss>;

// GET /api/bulkActionss/supported/:entityType?
export interface BulkActionssListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BulkActionssListResponse = PaginatedResponse<BulkActionss>;
