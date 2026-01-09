/**
 * Subcontracting API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/subcontracting/stats
export interface SubcontractingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SubcontractingListResponse = PaginatedResponse<Subcontracting>;

// GET /api/subcontracting/settings
export interface SubcontractingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SubcontractingListResponse = PaginatedResponse<Subcontracting>;

// PUT /api/subcontracting/settings
export interface UpdateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSubcontractingResponse = ApiResponse<Subcontracting>;

// POST /api/subcontracting/orders
export interface CreateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSubcontractingResponse = ApiResponse<Subcontracting>;

// GET /api/subcontracting/orders
export interface SubcontractingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SubcontractingListResponse = PaginatedResponse<Subcontracting>;

// GET /api/subcontracting/orders/:id
export type GetSubcontractingResponse = ApiResponse<Subcontracting>;

// PUT /api/subcontracting/orders/:id
export interface UpdateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSubcontractingResponse = ApiResponse<Subcontracting>;

// DELETE /api/subcontracting/orders/:id
export type DeleteSubcontractingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/subcontracting/orders/:id/submit
export interface CreateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSubcontractingResponse = ApiResponse<Subcontracting>;

// POST /api/subcontracting/orders/:id/cancel
export interface CreateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSubcontractingResponse = ApiResponse<Subcontracting>;

// POST /api/subcontracting/receipts
export interface CreateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSubcontractingResponse = ApiResponse<Subcontracting>;

// GET /api/subcontracting/receipts
export interface SubcontractingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SubcontractingListResponse = PaginatedResponse<Subcontracting>;

// GET /api/subcontracting/receipts/:id
export type GetSubcontractingResponse = ApiResponse<Subcontracting>;

// POST /api/subcontracting/receipts/:id/submit
export interface CreateSubcontractingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSubcontractingResponse = ApiResponse<Subcontracting>;
