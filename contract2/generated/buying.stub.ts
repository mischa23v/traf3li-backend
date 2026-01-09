/**
 * Buying API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/buying/stats
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/settings
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// PUT /api/buying/settings
export interface UpdateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/supplier-groups
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// POST /api/buying/suppliers
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/suppliers
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/suppliers/:id
export type GetBuyingResponse = ApiResponse<Buying>;

// PUT /api/buying/suppliers/:id
export interface UpdateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBuyingResponse = ApiResponse<Buying>;

// DELETE /api/buying/suppliers/:id
export type DeleteBuyingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/buying/purchase-orders
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/purchase-orders
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/purchase-orders/:id
export type GetBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/purchase-orders/:id/submit
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/purchase-orders/:id/approve
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/purchase-orders/:id/cancel
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// DELETE /api/buying/purchase-orders/:id
export type DeleteBuyingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/buying/purchase-receipts
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/purchase-receipts
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/purchase-receipts/:id
export type GetBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/purchase-receipts/:id/submit
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/purchase-invoices
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/purchase-invoices
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/purchase-invoices/:id
export type GetBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/purchase-invoices/:id/submit
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/material-requests
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/material-requests
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/material-requests/:id
export type GetBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/rfqs
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// GET /api/buying/rfqs
export interface BuyingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BuyingListResponse = PaginatedResponse<Buying>;

// GET /api/buying/rfqs/:id
export type GetBuyingResponse = ApiResponse<Buying>;

// PUT /api/buying/rfqs/:id
export interface UpdateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBuyingResponse = ApiResponse<Buying>;

// POST /api/buying/rfqs/:id/submit
export interface CreateBuyingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBuyingResponse = ApiResponse<Buying>;

// DELETE /api/buying/rfqs/:id
export type DeleteBuyingResponse = ApiResponse<{ deleted: boolean }>;
