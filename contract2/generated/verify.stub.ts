/**
 * Verify API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/verify/yakeen
export interface CreateVerifyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateVerifyResponse = ApiResponse<Verify>;

// POST /api/verify/yakeen/address
export interface CreateVerifyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateVerifyResponse = ApiResponse<Verify>;

// GET /api/verify/yakeen/status
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber/basic
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber/status
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber/managers
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber/owners
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber/capital
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/:crNumber/branches
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/wathq/config/status
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/moj/attorney/:attorneyId
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// POST /api/verify/moj/attorney
export interface CreateVerifyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateVerifyResponse = ApiResponse<Verify>;

// GET /api/verify/moj/license/:licenseNumber
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/moj/poa/:poaNumber
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// POST /api/verify/moj/poa
export interface CreateVerifyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateVerifyResponse = ApiResponse<Verify>;

// GET /api/verify/moj/poa/list/:idNumber
export type GetVerifyResponse = ApiResponse<Verify>;

// GET /api/verify/moj/status
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;

// GET /api/verify/status
export interface VerifyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type VerifyListResponse = PaginatedResponse<Verify>;
