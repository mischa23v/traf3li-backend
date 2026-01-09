/**
 * Attendance API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/attendance/today
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance/violations
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance/corrections/pending
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance/report/monthly
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance/stats/department
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// POST /api/attendance/check-in
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/check-out
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/mark-absences
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/import
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// GET /api/attendance/status/:employeeId
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance/summary/:employeeId
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance/employee/:employeeId/date/:date
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// GET /api/attendance
export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AttendanceListResponse = PaginatedResponse<Attendance>;

// POST /api/attendance
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// GET /api/attendance/:id
export type GetAttendanceResponse = ApiResponse<Attendance>;

// PUT /api/attendance/:id
export interface UpdateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAttendanceResponse = ApiResponse<Attendance>;

// DELETE /api/attendance/:id
export type DeleteAttendanceResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/attendance/:id/break/start
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/break/end
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// GET /api/attendance/:id/breaks
export type GetAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/corrections
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// PUT /api/attendance/:id/corrections/:correctionId
export interface UpdateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/approve
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/reject
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/violations
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// PUT /api/attendance/:id/violations/:violationIndex/resolve
export interface UpdateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/violations/:violationIndex/appeal
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;

// POST /api/attendance/:id/overtime/approve
export interface CreateAttendanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAttendanceResponse = ApiResponse<Attendance>;
