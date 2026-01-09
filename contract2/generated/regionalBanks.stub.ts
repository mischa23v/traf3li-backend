/**
 * RegionalBanks API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/regionalBanks/countries
export interface RegionalBanksListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RegionalBanksListResponse = PaginatedResponse<RegionalBanks>;

// GET /api/regionalBanks/countries/:countryCode/banks
export interface RegionalBanksListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RegionalBanksListResponse = PaginatedResponse<RegionalBanks>;

// GET /api/regionalBanks/find-by-iban
export interface RegionalBanksListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RegionalBanksListResponse = PaginatedResponse<RegionalBanks>;

// GET /api/regionalBanks/stats
export interface RegionalBanksListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RegionalBanksListResponse = PaginatedResponse<RegionalBanks>;

// POST /api/regionalBanks/connect
export interface CreateRegionalBanksRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRegionalBanksResponse = ApiResponse<RegionalBanks>;

// GET /api/regionalBanks/callback
export interface RegionalBanksListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RegionalBanksListResponse = PaginatedResponse<RegionalBanks>;

// POST /api/regionalBanks/sync/:accountId
export interface CreateRegionalBanksRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRegionalBanksResponse = ApiResponse<RegionalBanks>;

// GET /api/regionalBanks/status/:accountId
export interface RegionalBanksListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RegionalBanksListResponse = PaginatedResponse<RegionalBanks>;

// POST /api/regionalBanks/disconnect/:accountId
export interface CreateRegionalBanksRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRegionalBanksResponse = ApiResponse<RegionalBanks>;
