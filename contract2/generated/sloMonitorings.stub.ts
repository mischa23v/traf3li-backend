/**
 * SloMonitorings API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/sloMonitorings/dashboard
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// GET /api/sloMonitorings/report
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// GET /api/sloMonitorings/categories
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// GET /api/sloMonitorings/time-windows
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// GET /api/sloMonitorings/breached
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// GET /api/sloMonitorings/metrics/availability
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// GET /api/sloMonitorings/metrics/latency
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// POST /api/sloMonitorings/initialize-defaults
export interface CreateSloMonitoringsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// POST /api/sloMonitorings/check-alerts
export interface CreateSloMonitoringsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// GET /api/sloMonitorings
export interface SloMonitoringsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SloMonitoringsListResponse = PaginatedResponse<SloMonitorings>;

// POST /api/sloMonitorings
export interface CreateSloMonitoringsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// GET /api/sloMonitorings/:id
export type GetSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// PUT /api/sloMonitorings/:id
export interface UpdateSloMonitoringsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// DELETE /api/sloMonitorings/:id
export type DeleteSloMonitoringsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/sloMonitorings/:id/measure
export interface CreateSloMonitoringsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// GET /api/sloMonitorings/:id/status
export type GetSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// GET /api/sloMonitorings/:id/history
export type GetSloMonitoringsResponse = ApiResponse<SloMonitorings>;

// GET /api/sloMonitorings/:id/error-budget
export type GetSloMonitoringsResponse = ApiResponse<SloMonitorings>;
