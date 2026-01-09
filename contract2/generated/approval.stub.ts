/**
 * Approval API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/approval/rules
export interface ApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApprovalListResponse = PaginatedResponse<Approval>;

// PUT /api/approval/rules
export interface UpdateApprovalRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateApprovalResponse = ApiResponse<Approval>;

// GET /api/approval/pending
export interface ApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApprovalListResponse = PaginatedResponse<Approval>;

// GET /api/approval/history
export interface ApprovalListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApprovalListResponse = PaginatedResponse<Approval>;

// GET /api/approval/:id
export type GetApprovalResponse = ApiResponse<Approval>;

// POST /api/approval/:id/approve
export interface CreateApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalResponse = ApiResponse<Approval>;

// POST /api/approval/:id/reject
export interface CreateApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalResponse = ApiResponse<Approval>;

// POST /api/approval/:id/cancel
export interface CreateApprovalRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalResponse = ApiResponse<Approval>;
