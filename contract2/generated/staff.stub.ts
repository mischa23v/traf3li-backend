/**
 * Staff API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/staff/team
export interface StaffListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StaffListResponse = PaginatedResponse<Staff>;

// GET /api/staff/stats
export interface StaffListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StaffListResponse = PaginatedResponse<Staff>;

// POST /api/staff/bulk-delete
export interface CreateStaffRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStaffResponse = ApiResponse<Staff>;

// GET /api/staff
export interface StaffListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type StaffListResponse = PaginatedResponse<Staff>;

// POST /api/staff
export interface CreateStaffRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateStaffResponse = ApiResponse<Staff>;

// GET /api/staff/:id
export type GetStaffResponse = ApiResponse<Staff>;

// PUT /api/staff/:id
export interface UpdateStaffRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateStaffResponse = ApiResponse<Staff>;

// PATCH /api/staff/:id
export interface UpdateStaffRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateStaffResponse = ApiResponse<Staff>;

// DELETE /api/staff/:id
export type DeleteStaffResponse = ApiResponse<{ deleted: boolean }>;
