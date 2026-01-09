/**
 * Shift API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/shift/shift-types
export interface ShiftListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ShiftListResponse = PaginatedResponse<Shift>;

// GET /api/shift/shift-types/:id
export type GetShiftResponse = ApiResponse<Shift>;

// POST /api/shift/shift-types
export interface CreateShiftRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateShiftResponse = ApiResponse<Shift>;

// PATCH /api/shift/shift-types/:id
export interface UpdateShiftRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateShiftResponse = ApiResponse<Shift>;

// DELETE /api/shift/shift-types/:id
export type DeleteShiftResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/shift/shift-types/:id/set-default
export interface CreateShiftRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateShiftResponse = ApiResponse<Shift>;

// POST /api/shift/shift-types/:id/clone
export interface CreateShiftRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateShiftResponse = ApiResponse<Shift>;

// GET /api/shift/shift-types-stats
export interface ShiftListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ShiftListResponse = PaginatedResponse<Shift>;

// GET /api/shift/shift-types-ramadan
export interface ShiftListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ShiftListResponse = PaginatedResponse<Shift>;

// GET /api/shift/shift-assignments
export interface ShiftListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ShiftListResponse = PaginatedResponse<Shift>;

// GET /api/shift/shift-assignments/:id
export type GetShiftResponse = ApiResponse<Shift>;

// POST /api/shift/shift-assignments
export interface CreateShiftRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateShiftResponse = ApiResponse<Shift>;

// POST /api/shift/shift-assignments/bulk
export interface CreateShiftRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateShiftResponse = ApiResponse<Shift>;

// PATCH /api/shift/shift-assignments/:id
export interface UpdateShiftRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateShiftResponse = ApiResponse<Shift>;

// DELETE /api/shift/shift-assignments/:id
export type DeleteShiftResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/shift/shift-assignments/employee/:employeeId
export interface ShiftListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ShiftListResponse = PaginatedResponse<Shift>;

// GET /api/shift/shift-assignments/employee/:employeeId/current
export interface ShiftListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ShiftListResponse = PaginatedResponse<Shift>;
