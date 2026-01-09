/**
 * ExpenseClaim API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/expenseClaim/stats
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim/pending-approvals
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim/pending-payments
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim/mileage-rates
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim/policies
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim/export
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// POST /api/expenseClaim/bulk-delete
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// GET /api/expenseClaim/by-employee/:employeeId
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim/corporate-card/:employeeId
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// GET /api/expenseClaim
export interface ExpenseClaimListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ExpenseClaimListResponse = PaginatedResponse<ExpenseClaim>;

// POST /api/expenseClaim
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// GET /api/expenseClaim/:id
export type GetExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// PATCH /api/expenseClaim/:id
export interface UpdateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// DELETE /api/expenseClaim/:id
export type DeleteExpenseClaimResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/expenseClaim/:id/submit
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/approve
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/reject
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/request-changes
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/process-payment
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/confirm-payment
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/line-items
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// PATCH /api/expenseClaim/:id/line-items/:lineItemId
export interface UpdateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// DELETE /api/expenseClaim/:id/line-items/:lineItemId
export type DeleteExpenseClaimResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/expenseClaim/:id/receipts
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// DELETE /api/expenseClaim/:id/receipts/:receiptId
export type DeleteExpenseClaimResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/expenseClaim/:id/receipts/:receiptId/verify
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/reconcile-card
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/check-compliance
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/approve-exception
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/mark-billable
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/create-invoice
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;

// POST /api/expenseClaim/:id/duplicate
export interface CreateExpenseClaimRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateExpenseClaimResponse = ApiResponse<ExpenseClaim>;
