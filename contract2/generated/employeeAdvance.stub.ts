/**
 * EmployeeAdvance API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/employeeAdvance/stats
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// GET /api/employeeAdvance/pending-approvals
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// GET /api/employeeAdvance/overdue-recoveries
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// GET /api/employeeAdvance/emergency
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/check-eligibility
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/bulk-delete
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// GET /api/employeeAdvance/by-employee/:employeeId
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// GET /api/employeeAdvance
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// POST /api/employeeAdvance
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// GET /api/employeeAdvance/:advanceId
export interface EmployeeAdvanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeAdvanceListResponse = PaginatedResponse<EmployeeAdvance>;

// PATCH /api/employeeAdvance/:advanceId
export interface UpdateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// DELETE /api/employeeAdvance/:advanceId
export type DeleteEmployeeAdvanceResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/employeeAdvance/:advanceId/approve
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/reject
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/cancel
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/disburse
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/recover
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/payroll-deduction
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/early-recovery
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/write-off
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/issue-clearance
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/documents
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;

// POST /api/employeeAdvance/:advanceId/communications
export interface CreateEmployeeAdvanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeAdvanceResponse = ApiResponse<EmployeeAdvance>;
