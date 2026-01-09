/**
 * EmployeeSelfService API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/employeeSelfService/dashboard
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/profile
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// PATCH /api/employeeSelfService/profile
export interface UpdateEmployeeSelfServiceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmployeeSelfServiceResponse = ApiResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/leave/balances
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/leave/requests
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// POST /api/employeeSelfService/leave/request
export interface CreateEmployeeSelfServiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeSelfServiceResponse = ApiResponse<EmployeeSelfService>;

// POST /api/employeeSelfService/leave/request/:requestId/cancel
export interface CreateEmployeeSelfServiceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmployeeSelfServiceResponse = ApiResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/loans
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/advances
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/payslips
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;

// GET /api/employeeSelfService/approvals/pending
export interface EmployeeSelfServiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmployeeSelfServiceListResponse = PaginatedResponse<EmployeeSelfService>;
