/**
 * CaseNotion API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { CaseNotion } from './models';

// Standard Response Types
export type CaseNotionResponse = ApiResponse<CaseNotion>;
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// From: createPageSchema
export interface CreatePageRequest {
  title: string;
  titleAr?: string;
  pageType?: '...PAGE_TYPES';
  type: string;
  emoji: string;
  url: string;
  type: string;
  url: string;
  gradient: string;
  parentPageId?: string;
  templateId?: string;
}

// From: updatePageSchema
export interface UpdatePageRequest {
  title?: string;
  titleAr?: string;
  pageType?: '...PAGE_TYPES';
  type: string;
  emoji: string;
  url: string;
  type: string;
  url: string;
  gradient: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

// From: createBlockSchema
export interface CreateBlockRequest {
  type: '...BLOCK_TYPES';
  content?: any[];
  properties?: Record<string, any>;
  parentId?: string;
  afterBlockId?: string;
  order?: number;
  indent?: number;
  checked?: boolean;
  language?: string;
  icon?: string;
  color?: string;
  tableData?: Record<string, any>;
  fileUrl?: string;
  fileName?: string;
  caption?: string;
  partyType: string;
  statementDate?: string;
  evidenceType: string;
  evidenceDate?: string;
  evidenceSource?: string;
  citationType: string;
  citationReference?: string;
  eventDate?: string;
  eventType?: string;
}

// From: updateBlockSchema
export interface UpdateBlockRequest {
  data?: Record<string, any>;
  type?: '...BLOCK_TYPES';
  content?: any[];
  properties?: Record<string, any>;
  checked?: boolean;
  isCollapsed?: boolean;
  language?: string;
  icon?: string;
  color?: string;
  tableData?: Record<string, any>;
  fileUrl?: string;
  fileName?: string;
  caption?: string;
  order?: number;
  indent?: number;
  partyType: string;
  statementDate?: string;
  evidenceType: string;
  evidenceDate?: string;
  evidenceSource?: string;
  citationType: string;
  citationReference?: string;
  eventDate?: string;
  eventType?: string;
  canvasX?: number;
  canvasY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  blockColor?: '...BLOCK_COLORS';
  priority: string;
  linkedEventId?: string;
  linkedTaskId?: string;
  linkedHearingId?: string;
  linkedDocumentId?: string;
  groupId?: string;
  groupName?: string;
}

// From: moveBlockSchema
export interface MoveBlockRequest {
  targetPageId?: string;
  afterBlockId?: string;
  parentId?: string;
  newOrder?: number;
}

// From: mergePagesSchema
export interface MergePagesRequest {
  sourcePageIds: any[];
  targetTitle: string;
  deleteSourcePages?: boolean;
}

// From: searchSchema
export interface SearchRequest {
  q: string;
}

// From: createCommentSchema
export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
  mentions?: any[];
}

// From: linkTaskSchema
export interface LinkTaskRequest {
  taskId: string;
}

// From: applyTemplateSchema
export interface ApplyTemplateRequest {
  templateId: string;
}

// From: pageIdParamSchema
export interface PageIdParamRequest {
  caseId: string;
  pageId: string;
}

// From: blockIdParamSchema
export interface BlockIdParamRequest {
  caseId: string;
  blockId: string;
}

// From: createShapeSchema
export interface CreateShapeRequest {
  shapeType: '...SHAPE_TYPES';
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillStyle?: '...FILL_STYLES';
  blockColor: string;
  text?: string;
  roughness?: number;
  handles: any[];
  id: string;
  position: '...HANDLE_POSITIONS';
  type: string;
  offsetX?: number;
  offsetY?: number;
}

// From: createArrowSchema
export interface CreateArrowRequest {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startType?: '...ARROW_HEAD_TYPES';
  endType?: '...ARROW_HEAD_TYPES';
  strokeColor?: string;
  strokeWidth?: number;
  sourceBlockId?: string;
  targetBlockId?: string;
  sourceHandle?: '...HANDLE_POSITIONS';
  targetHandle?: '...HANDLE_POSITIONS';
}

// From: createFrameSchema
export interface CreateFrameRequest {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  backgroundColor: string;
}

// From: updateZIndexSchema
export interface UpdateZIndexRequest {
  action: string;
}

// From: batchUpdateSchema
export interface BatchUpdateRequest {
  updates: any[];
  id: string;
  canvasX?: number;
  canvasY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  angle?: number;
  opacity?: number;
}

// From: createConnectionSchema
export interface CreateConnectionRequest {
  sourceBlockId: string;
  targetBlockId: string;
  id?: string;
  position?: '...HANDLE_POSITIONS';
  id?: string;
  position?: '...HANDLE_POSITIONS';
  connectionType: string;
  pathType?: '...PATH_TYPES';
  label?: string;
  color?: string;
  strokeWidth?: number;
  animated?: boolean;
  type: string;
  color?: string;
  width?: number;
  height?: number;
  type: string;
  color?: string;
  width?: number;
  height?: number;
}

// From: updateStyleSchema
export interface UpdateStyleRequest {
  strokeColor?: string;
  strokeWidth?: number;
  fillStyle?: '...FILL_STYLES';
  roughness?: number;
}
