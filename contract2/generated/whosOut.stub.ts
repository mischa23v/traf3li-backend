/**
 * WhosOut API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/whosOut/today
export interface WhosOutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhosOutListResponse = PaginatedResponse<WhosOut>;

// GET /api/whosOut/week
export interface WhosOutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhosOutListResponse = PaginatedResponse<WhosOut>;

// GET /api/whosOut/month
export interface WhosOutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhosOutListResponse = PaginatedResponse<WhosOut>;

// GET /api/whosOut/upcoming
export interface WhosOutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhosOutListResponse = PaginatedResponse<WhosOut>;

// GET /api/whosOut/departments
export interface WhosOutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhosOutListResponse = PaginatedResponse<WhosOut>;

// GET /api/whosOut/coverage/:department
export interface WhosOutListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhosOutListResponse = PaginatedResponse<WhosOut>;
