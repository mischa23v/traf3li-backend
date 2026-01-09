/**
 * InterCompany API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/interCompany/transactions
export interface InterCompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InterCompanyListResponse = PaginatedResponse<InterCompany>;

// POST /api/interCompany/transactions
export interface CreateInterCompanyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInterCompanyResponse = ApiResponse<InterCompany>;

// GET /api/interCompany/transactions/:id
export type GetInterCompanyResponse = ApiResponse<InterCompany>;

// PUT /api/interCompany/transactions/:id
export interface UpdateInterCompanyRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInterCompanyResponse = ApiResponse<InterCompany>;

// POST /api/interCompany/transactions/:id/confirm
export interface CreateInterCompanyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInterCompanyResponse = ApiResponse<InterCompany>;

// POST /api/interCompany/transactions/:id/cancel
export interface CreateInterCompanyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInterCompanyResponse = ApiResponse<InterCompany>;

// GET /api/interCompany/balances
export interface InterCompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InterCompanyListResponse = PaginatedResponse<InterCompany>;

// GET /api/interCompany/balances/:firmId
export interface InterCompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InterCompanyListResponse = PaginatedResponse<InterCompany>;

// GET /api/interCompany/reconciliation
export interface InterCompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InterCompanyListResponse = PaginatedResponse<InterCompany>;

// POST /api/interCompany/reconciliation
export interface CreateInterCompanyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInterCompanyResponse = ApiResponse<InterCompany>;
