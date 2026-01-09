/**
 * EmployeeBenefit API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/employeeBenefit/stats
export interface EmployeeBenefitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeBenefitListResponse = PaginatedResponse<EmployeeBenefit>;

// GET /api/employeeBenefit/expiring
export interface EmployeeBenefitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeBenefitListResponse = PaginatedResponse<EmployeeBenefit>;

// GET /api/employeeBenefit/cost-summary
export interface EmployeeBenefitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeBenefitListResponse = PaginatedResponse<EmployeeBenefit>;

// GET /api/employeeBenefit/export
export interface EmployeeBenefitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeBenefitListResponse = PaginatedResponse<EmployeeBenefit>;

// GET /api/employeeBenefit
export interface EmployeeBenefitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeBenefitListResponse = PaginatedResponse<EmployeeBenefit>;

// POST /api/employeeBenefit
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// POST /api/employeeBenefit/bulk-delete
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// GET /api/employeeBenefit/employee/:employeeId
export interface EmployeeBenefitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeBenefitListResponse = PaginatedResponse<EmployeeBenefit>;

// GET /api/employeeBenefit/:id
export type GetEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// PATCH /api/employeeBenefit/:id
export interface UpdateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// DELETE /api/employeeBenefit/:id
export type DeleteEmployeeBenefitResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/employeeBenefit/:id/activate
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// POST /api/employeeBenefit/:id/suspend
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// POST /api/employeeBenefit/:id/terminate
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// POST /api/employeeBenefit/:id/dependents
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// DELETE /api/employeeBenefit/:id/dependents/:memberId
export type DeleteEmployeeBenefitResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/employeeBenefit/:id/beneficiaries
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// PATCH /api/employeeBenefit/:id/beneficiaries/:beneficiaryId
export interface UpdateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// DELETE /api/employeeBenefit/:id/beneficiaries/:beneficiaryId
export type DeleteEmployeeBenefitResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/employeeBenefit/:id/claims
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// PATCH /api/employeeBenefit/:id/claims/:claimId
export interface UpdateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// POST /api/employeeBenefit/:id/pre-auth
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;

// POST /api/employeeBenefit/:id/qualifying-events
export interface CreateEmployeeBenefitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeBenefitResponse = ApiResponse<EmployeeBenefit>;
