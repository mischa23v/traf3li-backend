/**
 * Apps API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/apps/categories
export interface AppsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppsListResponse = PaginatedResponse<Apps>;

// GET /api/apps
export interface AppsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppsListResponse = PaginatedResponse<Apps>;

// GET /api/apps/stats
export interface AppsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppsListResponse = PaginatedResponse<Apps>;

// GET /api/apps/:appId
export interface AppsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppsListResponse = PaginatedResponse<Apps>;

// POST /api/apps/:appId/connect
export interface CreateAppsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppsResponse = ApiResponse<Apps>;

// POST /api/apps/:appId/disconnect
export interface CreateAppsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppsResponse = ApiResponse<Apps>;

// GET /api/apps/:appId/settings
export interface AppsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppsListResponse = PaginatedResponse<Apps>;

// PUT /api/apps/:appId/settings
export interface UpdateAppsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppsResponse = ApiResponse<Apps>;

// POST /api/apps/:appId/sync
export interface CreateAppsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppsResponse = ApiResponse<Apps>;

// POST /api/apps/:appId/test
export interface CreateAppsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppsResponse = ApiResponse<Apps>;
