/**
 * Zatca API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/zatca/config
export interface ZatcaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZatcaListResponse = PaginatedResponse<Zatca>;

// PUT /api/zatca/config
export interface UpdateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateZatcaResponse = ApiResponse<Zatca>;

// POST /api/zatca/validate
export interface CreateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZatcaResponse = ApiResponse<Zatca>;

// POST /api/zatca/qr
export interface CreateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZatcaResponse = ApiResponse<Zatca>;

// POST /api/zatca/hash
export interface CreateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZatcaResponse = ApiResponse<Zatca>;

// POST /api/zatca/prepare/:invoiceId
export interface CreateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZatcaResponse = ApiResponse<Zatca>;

// POST /api/zatca/submit/:invoiceId
export interface CreateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZatcaResponse = ApiResponse<Zatca>;

// POST /api/zatca/submit/bulk
export interface CreateZatcaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZatcaResponse = ApiResponse<Zatca>;

// GET /api/zatca/status/:invoiceId
export interface ZatcaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZatcaListResponse = PaginatedResponse<Zatca>;

// GET /api/zatca/stats
export interface ZatcaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZatcaListResponse = PaginatedResponse<Zatca>;

// GET /api/zatca/pending
export interface ZatcaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZatcaListResponse = PaginatedResponse<Zatca>;

// GET /api/zatca/failed
export interface ZatcaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZatcaListResponse = PaginatedResponse<Zatca>;
