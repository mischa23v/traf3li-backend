/**
 * ComplianceDashboard API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/complianceDashboard/dashboard
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/gosi
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/nitaqat
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/wps
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/documents/expiring
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/probation/ending
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/contracts/expiring
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;

// GET /api/complianceDashboard/labor-law
export interface ComplianceDashboardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ComplianceDashboardListResponse = PaginatedResponse<ComplianceDashboard>;
