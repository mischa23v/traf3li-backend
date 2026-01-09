/**
 * CloudStorages API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/cloudStorages/providers
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// GET /api/cloudStorages/:provider/auth
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// GET /api/cloudStorages/:provider/callback
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// GET /api/cloudStorages/:provider/status
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// POST /api/cloudStorages/:provider/disconnect
export interface CreateCloudStoragesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCloudStoragesResponse = ApiResponse<CloudStorages>;

// GET /api/cloudStorages/:provider/files
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// POST /api/cloudStorages/:provider/files
export interface CreateCloudStoragesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCloudStoragesResponse = ApiResponse<CloudStorages>;

// GET /api/cloudStorages/:provider/files/:fileId/metadata
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// GET /api/cloudStorages/:provider/files/:fileId
export interface CloudStoragesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CloudStoragesListResponse = PaginatedResponse<CloudStorages>;

// DELETE /api/cloudStorages/:provider/files/:fileId
export type DeleteCloudStoragesResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/cloudStorages/:provider/files/:fileId/move
export interface CreateCloudStoragesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCloudStoragesResponse = ApiResponse<CloudStorages>;

// POST /api/cloudStorages/:provider/files/:fileId/share
export interface CreateCloudStoragesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCloudStoragesResponse = ApiResponse<CloudStorages>;

// POST /api/cloudStorages/:provider/folders
export interface CreateCloudStoragesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCloudStoragesResponse = ApiResponse<CloudStorages>;
