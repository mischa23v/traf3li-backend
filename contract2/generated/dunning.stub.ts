/**
 * Dunning API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/dunning/dashboard
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/stats
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/report
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/report/export
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/overdue-invoices
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/upcoming-actions
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/paused-invoices
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/policies
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/policies/default
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// POST /api/dunning/policies
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// GET /api/dunning/policies/:id
export type GetDunningResponse = ApiResponse<Dunning>;

// PUT /api/dunning/policies/:id
export interface UpdateDunningRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateDunningResponse = ApiResponse<Dunning>;

// DELETE /api/dunning/policies/:id
export type DeleteDunningResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/dunning/policies/:id/set-default
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/policies/:id/toggle-status
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/policies/:id/duplicate
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/policies/:id/test
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/policies/:id/apply
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// GET /api/dunning/history
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// GET /api/dunning/history/invoice/:invoiceId
export interface DunningListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DunningListResponse = PaginatedResponse<Dunning>;

// POST /api/dunning/history
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/history/:invoiceId/pause
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/history/:invoiceId/resume
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;

// POST /api/dunning/history/:invoiceId/escalate
export interface CreateDunningRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDunningResponse = ApiResponse<Dunning>;
