/**
 * Payroll API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/payroll/stats
export interface PayrollListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayrollListResponse = PaginatedResponse<Payroll>;

// POST /api/payroll/generate
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// POST /api/payroll/approve
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// POST /api/payroll/pay
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// POST /api/payroll/bulk-delete
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// POST /api/payroll/wps/submit
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// POST /api/payroll/:id/approve
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// POST /api/payroll/:id/pay
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// GET /api/payroll
export interface PayrollListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayrollListResponse = PaginatedResponse<Payroll>;

// POST /api/payroll
export interface CreatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollResponse = ApiResponse<Payroll>;

// GET /api/payroll/:id
export type GetPayrollResponse = ApiResponse<Payroll>;

// PUT /api/payroll/:id
export interface UpdatePayrollRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePayrollResponse = ApiResponse<Payroll>;

// DELETE /api/payroll/:id
export type DeletePayrollResponse = ApiResponse<{ deleted: boolean }>;
