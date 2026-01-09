/**
 * SalesForecasts API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/salesForecasts/current-quarter
export interface SalesForecastsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesForecastsListResponse = PaginatedResponse<SalesForecasts>;

// GET /api/salesForecasts/by-period
export interface SalesForecastsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesForecastsListResponse = PaginatedResponse<SalesForecasts>;

// POST /api/salesForecasts
export interface CreateSalesForecastsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesForecastsResponse = ApiResponse<SalesForecasts>;

// GET /api/salesForecasts
export interface SalesForecastsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesForecastsListResponse = PaginatedResponse<SalesForecasts>;

// GET /api/salesForecasts/:id
export type GetSalesForecastsResponse = ApiResponse<SalesForecasts>;

// PUT /api/salesForecasts/:id
export interface UpdateSalesForecastsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesForecastsResponse = ApiResponse<SalesForecasts>;

// DELETE /api/salesForecasts/:id
export type DeleteSalesForecastsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/salesForecasts/:id/submit
export interface CreateSalesForecastsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesForecastsResponse = ApiResponse<SalesForecasts>;

// POST /api/salesForecasts/:id/approve
export interface CreateSalesForecastsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesForecastsResponse = ApiResponse<SalesForecasts>;

// POST /api/salesForecasts/:id/lock
export interface CreateSalesForecastsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesForecastsResponse = ApiResponse<SalesForecasts>;

// POST /api/salesForecasts/:id/adjustments
export interface CreateSalesForecastsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesForecastsResponse = ApiResponse<SalesForecasts>;
