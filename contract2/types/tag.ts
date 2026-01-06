/**
 * Tag API Type Definitions
 * Auto-generated from /home/user/traf3li-backend/src/routes/tag.route.js
 * and /home/user/traf3li-backend/src/controllers/tag.controller.js
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface BaseResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type EntityType = 'case' | 'client' | 'invoice' | 'document' | 'task' | 'appointment' | 'contact' | 'lead' | 'expense' | 'note';

// ═══════════════════════════════════════════════════════════════
// TAG MODEL
// ═══════════════════════════════════════════════════════════════

export interface Tag {
  _id: string;
  name: string;
  nameAr?: string;
  color?: string;
  icon?: string;
  description?: string;
  category?: string;
  entityTypes: EntityType[];
  usageCount: number;
  isSystem: boolean;
  firmId?: string;
  lawyerId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/tags
// ═══════════════════════════════════════════════════════════════

export interface ListTagsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  entityType?: EntityType;
  sortBy?: 'name' | 'usageCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListTagsResponse extends BaseResponse {
  data: {
    tags: Tag[];
    pagination: Pagination;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/tags
// ═══════════════════════════════════════════════════════════════

export interface CreateTagRequest {
  name: string;
  nameAr?: string;
  color?: string;
  icon?: string;
  description?: string;
  category?: string;
  entityTypes?: EntityType[];
}

export interface CreateTagResponse extends BaseResponse {
  data: Tag;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/tags/:id
// ═══════════════════════════════════════════════════════════════

export interface GetTagResponse extends BaseResponse {
  data: Tag;
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/tags/:id
// ═══════════════════════════════════════════════════════════════

export interface UpdateTagRequest {
  name?: string;
  nameAr?: string;
  color?: string;
  icon?: string;
  description?: string;
  category?: string;
  entityTypes?: EntityType[];
}

export interface UpdateTagResponse extends BaseResponse {
  data: Tag;
}

// ═══════════════════════════════════════════════════════════════
// DELETE /api/tags/:id
// ═══════════════════════════════════════════════════════════════

export interface DeleteTagResponse extends BaseResponse {}

// ═══════════════════════════════════════════════════════════════
// GET /api/tags/popular?limit=10
// ═══════════════════════════════════════════════════════════════

export interface PopularTagsQuery {
  limit?: number;
  entityType?: EntityType;
}

export interface PopularTagsResponse extends BaseResponse {
  data: {
    tags: Tag[];
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/tags/merge
// ═══════════════════════════════════════════════════════════════

export interface MergeTagsRequest {
  sourceTagIds: string[];
  targetTagId: string;
}

export interface MergeTagsResponse extends BaseResponse {
  data: {
    mergedTag: Tag;
    deletedCount: number;
    updatedEntitiesCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/tags/bulk
// ═══════════════════════════════════════════════════════════════

export interface BulkTagOperationRequest {
  operation: 'add' | 'remove';
  tagIds: string[];
  entityType: EntityType;
  entityIds: string[];
}

export interface BulkTagOperationResponse extends BaseResponse {
  data: {
    processedCount: number;
    failedCount: number;
    errors?: Array<{
      entityId: string;
      error: string;
    }>;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/tags/entity/:entityType
// ═══════════════════════════════════════════════════════════════

export interface GetEntityTypeTagsResponse extends BaseResponse {
  data: {
    tags: Tag[];
    count: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT SUMMARY
// ═══════════════════════════════════════════════════════════════

export const TAG_ENDPOINTS = {
  LIST: 'GET /api/tags',
  CREATE: 'POST /api/tags',
  GET: 'GET /api/tags/:id',
  UPDATE: 'PUT /api/tags/:id',
  DELETE: 'DELETE /api/tags/:id',
  POPULAR: 'GET /api/tags/popular',
  MERGE: 'POST /api/tags/merge',
  BULK: 'POST /api/tags/bulk',
  ENTITY_TYPE: 'GET /api/tags/entity/:entityType',
} as const;

// Total endpoints: 9
