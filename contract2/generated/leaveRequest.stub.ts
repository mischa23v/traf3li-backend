/**
 * LeaveRequest API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/leaveRequest/types
export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveRequestListResponse = PaginatedResponse<LeaveRequest>;

// GET /api/leaveRequest/stats
export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveRequestListResponse = PaginatedResponse<LeaveRequest>;

// GET /api/leaveRequest/calendar
export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveRequestListResponse = PaginatedResponse<LeaveRequest>;

// GET /api/leaveRequest/pending-approvals
export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveRequestListResponse = PaginatedResponse<LeaveRequest>;

// POST /api/leaveRequest/check-conflicts
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/bulk-delete
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// GET /api/leaveRequest/balance/:employeeId
export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveRequestListResponse = PaginatedResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/submit
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/approve
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/reject
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/cancel
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/confirm-return
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/request-extension
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/complete-handover
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// POST /api/leaveRequest/:id/documents
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// GET /api/leaveRequest
export interface LeaveRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveRequestListResponse = PaginatedResponse<LeaveRequest>;

// POST /api/leaveRequest
export interface CreateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// GET /api/leaveRequest/:id
export type GetLeaveRequestResponse = ApiResponse<LeaveRequest>;

// PATCH /api/leaveRequest/:id
export interface UpdateLeaveRequestRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeaveRequestResponse = ApiResponse<LeaveRequest>;

// DELETE /api/leaveRequest/:id
export type DeleteLeaveRequestResponse = ApiResponse<{ deleted: boolean }>;
