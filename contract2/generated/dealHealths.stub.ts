/**
 * DealHealths API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/dealHealths/distribution
export interface DealHealthsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DealHealthsListResponse = PaginatedResponse<DealHealths>;

// GET /api/dealHealths/attention
export interface DealHealthsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DealHealthsListResponse = PaginatedResponse<DealHealths>;

// GET /api/dealHealths/stuck
export interface DealHealthsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DealHealthsListResponse = PaginatedResponse<DealHealths>;

// GET /api/dealHealths/:id
export type GetDealHealthsResponse = ApiResponse<DealHealths>;

// POST /api/dealHealths/:id/refresh
export interface CreateDealHealthsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealHealthsResponse = ApiResponse<DealHealths>;

// POST /api/dealHealths/:id/unstuck
export interface CreateDealHealthsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealHealthsResponse = ApiResponse<DealHealths>;
