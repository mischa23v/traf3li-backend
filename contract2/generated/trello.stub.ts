/**
 * Trello API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/trello/auth-url
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// GET /api/trello/callback
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// GET /api/trello/status
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// POST /api/trello/disconnect
export interface CreateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrelloResponse = ApiResponse<Trello>;

// GET /api/trello/boards
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// GET /api/trello/boards/:boardId
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// GET /api/trello/boards/:boardId/lists
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// GET /api/trello/lists/:listId/cards
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// POST /api/trello/cards
export interface CreateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrelloResponse = ApiResponse<Trello>;

// PUT /api/trello/cards/:cardId
export interface UpdateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTrelloResponse = ApiResponse<Trello>;

// POST /api/trello/cards/:cardId/move
export interface CreateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrelloResponse = ApiResponse<Trello>;

// POST /api/trello/cards/:cardId/comments
export interface CreateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrelloResponse = ApiResponse<Trello>;

// GET /api/trello/settings
export interface TrelloListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrelloListResponse = PaginatedResponse<Trello>;

// PUT /api/trello/settings
export interface UpdateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTrelloResponse = ApiResponse<Trello>;

// POST /api/trello/sync
export interface CreateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrelloResponse = ApiResponse<Trello>;

// POST /api/trello/webhook
export interface CreateTrelloRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrelloResponse = ApiResponse<Trello>;
