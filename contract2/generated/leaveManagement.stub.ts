/**
 * LeaveManagement API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/leaveManagement/leave-periods
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-periods/current
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-periods/:id
export type GetLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-periods
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// PUT /api/leaveManagement/leave-periods/:id
export interface UpdateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// DELETE /api/leaveManagement/leave-periods/:id
export type DeleteLeaveManagementResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/leaveManagement/leave-periods/:id/activate
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-periods/:id/close
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-policies
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-policies/default
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-policies/:id
export type GetLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-policies
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// PUT /api/leaveManagement/leave-policies/:id
export interface UpdateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// DELETE /api/leaveManagement/leave-policies/:id
export type DeleteLeaveManagementResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/leaveManagement/leave-policies/:id/clone
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-allocations
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-allocations/employee/:employeeId
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-allocations/balance/:employeeId/:leaveTypeId
export interface LeaveManagementListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeaveManagementListResponse = PaginatedResponse<LeaveManagement>;

// GET /api/leaveManagement/leave-allocations/:id
export type GetLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-allocations
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-allocations/bulk
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// PUT /api/leaveManagement/leave-allocations/:id
export interface UpdateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// DELETE /api/leaveManagement/leave-allocations/:id
export type DeleteLeaveManagementResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/leaveManagement/leave-allocations/:id/approve
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-allocations/:id/adjust
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;

// POST /api/leaveManagement/leave-allocations/generate
export interface CreateLeaveManagementRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeaveManagementResponse = ApiResponse<LeaveManagement>;
