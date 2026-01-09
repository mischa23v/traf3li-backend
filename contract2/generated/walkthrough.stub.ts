/**
 * Walkthrough API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/walkthrough
export interface WalkthroughListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WalkthroughListResponse = PaginatedResponse<Walkthrough>;

// GET /api/walkthrough/progress
export interface WalkthroughListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WalkthroughListResponse = PaginatedResponse<Walkthrough>;

// GET /api/walkthrough/:id
export type GetWalkthroughResponse = ApiResponse<Walkthrough>;

// POST /api/walkthrough/:id/start
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// POST /api/walkthrough/:id/step/next
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// POST /api/walkthrough/:id/step/:stepOrder/skip
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// POST /api/walkthrough/:id/complete
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// POST /api/walkthrough/:id/skip
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// POST /api/walkthrough/:id/reset
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// GET /api/walkthrough/stats
export interface WalkthroughListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WalkthroughListResponse = PaginatedResponse<Walkthrough>;

// GET /api/walkthrough/admin
export interface WalkthroughListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WalkthroughListResponse = PaginatedResponse<Walkthrough>;

// POST /api/walkthrough/admin
export interface CreateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWalkthroughResponse = ApiResponse<Walkthrough>;

// PUT /api/walkthrough/admin/:id
export interface UpdateWalkthroughRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWalkthroughResponse = ApiResponse<Walkthrough>;

// DELETE /api/walkthrough/admin/:id
export type DeleteWalkthroughResponse = ApiResponse<{ deleted: boolean }>;
