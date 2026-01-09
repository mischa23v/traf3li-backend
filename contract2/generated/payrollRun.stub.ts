/**
 * PayrollRun API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/payrollRun/stats
export interface PayrollRunListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayrollRunListResponse = PaginatedResponse<PayrollRun>;

// POST /api/payrollRun/bulk-delete
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// GET /api/payrollRun
export interface PayrollRunListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PayrollRunListResponse = PaginatedResponse<PayrollRun>;

// POST /api/payrollRun
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// GET /api/payrollRun/:id
export type GetPayrollRunResponse = ApiResponse<PayrollRun>;

// PATCH /api/payrollRun/:id
export interface UpdatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePayrollRunResponse = ApiResponse<PayrollRun>;

// DELETE /api/payrollRun/:id
export type DeletePayrollRunResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/payrollRun/:id/calculate
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/validate
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/approve
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/process-payments
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/cancel
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/generate-wps
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/send-notifications
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// GET /api/payrollRun/:id/export
export type GetPayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/employees/:empId/hold
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/employees/:empId/unhold
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/employees/:empId/exclude
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/employees/:empId/include
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;

// POST /api/payrollRun/:id/employees/:empId/recalculate
export interface CreatePayrollRunRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePayrollRunResponse = ApiResponse<PayrollRun>;
