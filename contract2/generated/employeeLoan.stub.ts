/**
 * EmployeeLoan API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/employeeLoan/stats
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// GET /api/employeeLoan/pending-approvals
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// GET /api/employeeLoan/overdue-installments
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// POST /api/employeeLoan/check-eligibility
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/bulk-delete
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// GET /api/employeeLoan/by-employee/:employeeId
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// GET /api/employeeLoan
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// POST /api/employeeLoan
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// GET /api/employeeLoan/:loanId
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// PATCH /api/employeeLoan/:loanId
export interface UpdateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// DELETE /api/employeeLoan/:loanId
export type DeleteEmployeeLoanResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/employeeLoan/:loanId/submit
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/approve
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/reject
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/disburse
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/payments
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/payroll-deduction
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// GET /api/employeeLoan/:loanId/early-settlement-calculation
export interface EmployeeLoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeLoanListResponse = PaginatedResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/early-settlement
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/default
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/restructure
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/issue-clearance
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/documents
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;

// POST /api/employeeLoan/:loanId/communications
export interface CreateEmployeeLoanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeLoanResponse = ApiResponse<EmployeeLoan>;
