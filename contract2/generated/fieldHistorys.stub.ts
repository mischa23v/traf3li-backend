/**
 * FieldHistorys API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/fieldHistorys/recent
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// GET /api/fieldHistorys/user/:userId
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// GET /api/fieldHistorys/:entityType/:entityId
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// GET /api/fieldHistorys/:entityType/:entityId/stats
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// GET /api/fieldHistorys/:entityType/:entityId/field/:fieldName
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// GET /api/fieldHistorys/:entityType/:entityId/timeline/:fieldName
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// GET /api/fieldHistorys/:entityType/:entityId/compare
export interface FieldHistorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type FieldHistorysListResponse = PaginatedResponse<FieldHistorys>;

// POST /api/fieldHistorys/:historyId/revert
export interface CreateFieldHistorysRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateFieldHistorysResponse = ApiResponse<FieldHistorys>;
