/**
 * Gosi API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/gosi/config
export interface GosiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GosiListResponse = PaginatedResponse<Gosi>;

// PUT /api/gosi/config
export interface UpdateGosiRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGosiResponse = ApiResponse<Gosi>;

// POST /api/gosi/calculate
export interface CreateGosiRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGosiResponse = ApiResponse<Gosi>;

// POST /api/gosi/calculate/:employeeId
export interface CreateGosiRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGosiResponse = ApiResponse<Gosi>;

// GET /api/gosi/report
export interface GosiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GosiListResponse = PaginatedResponse<Gosi>;

// GET /api/gosi/stats
export interface GosiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GosiListResponse = PaginatedResponse<Gosi>;

// GET /api/gosi/export
export interface GosiListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GosiListResponse = PaginatedResponse<Gosi>;
