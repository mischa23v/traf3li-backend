/**
 * Trades API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/trades/stats
export interface TradesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TradesListResponse = PaginatedResponse<Trades>;

// GET /api/trades/stats/chart
export interface TradesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TradesListResponse = PaginatedResponse<Trades>;

// DELETE /api/trades/bulk
export type DeleteTradesResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/trades/import/csv
export interface CreateTradesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTradesResponse = ApiResponse<Trades>;

// POST /api/trades
export interface CreateTradesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTradesResponse = ApiResponse<Trades>;

// GET /api/trades
export interface TradesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TradesListResponse = PaginatedResponse<Trades>;

// GET /api/trades/:id
export type GetTradesResponse = ApiResponse<Trades>;

// PATCH /api/trades/:id
export interface UpdateTradesRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTradesResponse = ApiResponse<Trades>;

// DELETE /api/trades/:id
export type DeleteTradesResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/trades/:id/close
export interface CreateTradesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTradesResponse = ApiResponse<Trades>;
