/**
 * SaudiBanking API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/saudiBanking/lean/banks
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/customers
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// POST /api/saudiBanking/lean/customers
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/customers/:customerId/token
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/customers/:customerId/entities
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/entities/:entityId/accounts
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/accounts/:accountId/balance
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/accounts/:accountId/transactions
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/lean/entities/:entityId/identity
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// POST /api/saudiBanking/lean/payments
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// DELETE /api/saudiBanking/lean/entities/:entityId
export type DeleteSaudiBankingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/saudiBanking/lean/webhook
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/wps/generate
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/wps/download
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/wps/validate
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// GET /api/saudiBanking/wps/files
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/wps/sarie-banks
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/sadad/billers
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/sadad/billers/search
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// POST /api/saudiBanking/sadad/bills/inquiry
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/sadad/bills/pay
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// GET /api/saudiBanking/sadad/payments/:transactionId/status
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// GET /api/saudiBanking/sadad/payments/history
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/payroll/calculate
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/gosi/calculate
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/wps/generate
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/payroll/submit
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// GET /api/saudiBanking/mudad/submissions/:submissionId/status
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/gosi/report
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/compliance/nitaqat
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// POST /api/saudiBanking/mudad/compliance/minimum-wage
export interface CreateSaudiBankingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSaudiBankingResponse = ApiResponse<SaudiBanking>;

// GET /api/saudiBanking/compliance/deadlines
export interface SaudiBankingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SaudiBankingListResponse = PaginatedResponse<SaudiBanking>;
