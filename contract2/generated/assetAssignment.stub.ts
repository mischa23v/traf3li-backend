/**
 * AssetAssignment API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/assetAssignment/stats
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// GET /api/assetAssignment/overdue
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// GET /api/assetAssignment/maintenance-due
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// GET /api/assetAssignment/warranty-expiring
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// GET /api/assetAssignment/export
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// GET /api/assetAssignment/policies
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// POST /api/assetAssignment/bulk-delete
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// GET /api/assetAssignment/by-employee/:employeeId
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// GET /api/assetAssignment
export interface AssetAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AssetAssignmentListResponse = PaginatedResponse<AssetAssignment>;

// POST /api/assetAssignment
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// GET /api/assetAssignment/:id
export type GetAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// PATCH /api/assetAssignment/:id
export interface UpdateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// DELETE /api/assetAssignment/:id
export type DeleteAssetAssignmentResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/assetAssignment/:id/acknowledge
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/return/initiate
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/return/complete
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// PUT /api/assetAssignment/:id/status
export interface UpdateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/transfer
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/clearance
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/maintenance
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/repair
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// PUT /api/assetAssignment/:id/repair/:repairId
export interface UpdateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAssetAssignmentResponse = ApiResponse<AssetAssignment>;

// POST /api/assetAssignment/:id/incident
export interface CreateAssetAssignmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAssetAssignmentResponse = ApiResponse<AssetAssignment>;
