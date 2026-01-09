/**
 * ExpensePolicy API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/expensePolicy
export interface ExpensePolicyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpensePolicyListResponse = PaginatedResponse<ExpensePolicy>;

// GET /api/expensePolicy/default
export interface ExpensePolicyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpensePolicyListResponse = PaginatedResponse<ExpensePolicy>;

// GET /api/expensePolicy/my-policy
export interface ExpensePolicyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpensePolicyListResponse = PaginatedResponse<ExpensePolicy>;

// POST /api/expensePolicy/create-default
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// GET /api/expensePolicy/:id
export type GetExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// POST /api/expensePolicy
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// PUT /api/expensePolicy/:id
export interface UpdateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// POST /api/expensePolicy/:id/set-default
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// POST /api/expensePolicy/:id/toggle-status
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// POST /api/expensePolicy/:id/duplicate
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// POST /api/expensePolicy/:policyId/check-compliance
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// POST /api/expensePolicy/check-compliance
export interface CreateExpensePolicyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpensePolicyResponse = ApiResponse<ExpensePolicy>;

// DELETE /api/expensePolicy/:id
export type DeleteExpensePolicyResponse = ApiResponse<{ deleted: boolean }>;
