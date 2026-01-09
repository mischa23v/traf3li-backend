/**
 * CrmTransaction API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/crmTransaction
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/summary
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/daily-report
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/export
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/entity/:entityType/:entityId
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/user-activity/:userId
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/stale-leads
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/stale-leads/summary
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/stale-leads/by-stage
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/leads-needing-attention
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/revenue-forecast
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/revenue-forecast/by-period
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/pipeline-velocity
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/forecast-trends
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;

// GET /api/crmTransaction/forecast-by-category
export interface CrmTransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmTransactionListResponse = PaginatedResponse<CrmTransaction>;
