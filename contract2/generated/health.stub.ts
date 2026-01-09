/**
 * Health API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/health
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/live
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/ready
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/detailed
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/deep
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/ping
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/circuits
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/cache
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;

// GET /api/health/debug-auth
export interface HealthListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HealthListResponse = PaginatedResponse<Health>;
