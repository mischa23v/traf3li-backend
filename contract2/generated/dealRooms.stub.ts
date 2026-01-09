/**
 * DealRooms API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/dealRooms/external/:token
export interface DealRoomsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DealRoomsListResponse = PaginatedResponse<DealRooms>;

// GET /api/dealRooms/deals/:dealId/room
export interface DealRoomsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DealRoomsListResponse = PaginatedResponse<DealRooms>;

// POST /api/dealRooms/deals/:dealId/room
export interface CreateDealRoomsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealRoomsResponse = ApiResponse<DealRooms>;

// GET /api/dealRooms/:id/activity
export type GetDealRoomsResponse = ApiResponse<DealRooms>;

// POST /api/dealRooms/:id/pages
export interface CreateDealRoomsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealRoomsResponse = ApiResponse<DealRooms>;

// PUT /api/dealRooms/:id/pages/:pageId
export interface UpdateDealRoomsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateDealRoomsResponse = ApiResponse<DealRooms>;

// DELETE /api/dealRooms/:id/pages/:pageId
export type DeleteDealRoomsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/dealRooms/:id/documents
export interface CreateDealRoomsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealRoomsResponse = ApiResponse<DealRooms>;

// POST /api/dealRooms/:id/documents/:index/view
export interface CreateDealRoomsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealRoomsResponse = ApiResponse<DealRooms>;

// POST /api/dealRooms/:id/access
export interface CreateDealRoomsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDealRoomsResponse = ApiResponse<DealRooms>;

// DELETE /api/dealRooms/:id/access/:token
export type DeleteDealRoomsResponse = ApiResponse<{ deleted: boolean }>;
