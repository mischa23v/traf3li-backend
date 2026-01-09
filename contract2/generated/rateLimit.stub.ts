/**
 * RateLimit API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/rateLimit/config
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/overview
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/tiers/:tier
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/effective
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/users/:userId
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/users/:userId/stats
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// POST /api/rateLimit/users/:userId/reset
export interface CreateRateLimitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRateLimitResponse = ApiResponse<RateLimit>;

// POST /api/rateLimit/users/:userId/adjust
export interface CreateRateLimitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRateLimitResponse = ApiResponse<RateLimit>;

// GET /api/rateLimit/firms/:firmId
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/firms/:firmId/top-users
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// GET /api/rateLimit/firms/:firmId/throttled
export interface RateLimitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RateLimitListResponse = PaginatedResponse<RateLimit>;

// POST /api/rateLimit/firms/:firmId/reset
export interface CreateRateLimitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRateLimitResponse = ApiResponse<RateLimit>;
