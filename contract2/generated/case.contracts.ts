/**
 * Case API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Case } from './models';

// Standard Response Types
export type CaseResponse = ApiResponse<Case>;
export type CaseListResponse = PaginatedResponse<Case>;

// From: createCaseSchema
export interface CreateCaseRequest {
  title: string;
  clientId: string;
  category: '...Object.keys(CASE_CATEGORIES';
  subCategory: string;
  caseType: string;
  caseNumber: string;
  internalReference: string;
  status: string;
  priority: string;
  description?: string;
  filingDate: string;
  entityType?: '...Object.keys(ENTITY_TYPES';
  court?: string;
  committee: '...Object.keys(COMMITTEES';
  arbitrationCenter: '...Object.keys(ARBITRATION_CENTERS';
  region: '...Object.keys(REGIONS';
  city?: string;
  circuitNumber?: string;
  judge?: string;
  plaintiffType: '...Object.keys(PARTY_TYPES';
  plaintiffName?: string;
  plaintiffPhone?: string;
  plaintiffEmail?: string;
  plaintiffAddress?: string;
  plaintiffCompanyName?: string;
  plaintiffCompanyAddress?: string;
  plaintiffRepresentativeName?: string;
  plaintiffRepresentativePosition?: string;
  plaintiffGovEntity?: string;
  plaintiffGovRepresentative?: string;
  defendantType: '...Object.keys(PARTY_TYPES';
  defendantName?: string;
  defendantPhone?: string;
  defendantEmail?: string;
  defendantAddress?: string;
  defendantCompanyName?: string;
  defendantCompanyAddress?: string;
  defendantRepresentativeName?: string;
  defendantRepresentativePosition?: string;
  defendantGovEntity?: string;
  defendantGovRepresentative?: string;
  caseSubject?: string;
  legalBasis?: string;
  claims: any[];
  type: string;
  amount: number;
  period?: string;
  description?: string;
  jobTitle?: string;
  monthlySalary?: number;
  employmentStartDate?: string;
  employmentEndDate?: string;
  terminationReason?: string;
  marriageDate?: string;
  marriageCity?: string;
  childrenCount?: number;
  contractDate?: string;
  contractValue?: number;
  poaNumber?: string;
  poaDate?: string;
  poaExpiry?: string;
  poaScope: '...Object.keys(POA_SCOPE';
  assignedLawyer?: string;
  lawyerId?: string;
  nextHearingDate?: string;
  nextHearing?: string;
  estimatedValue?: number;
  claimAmount?: number;
  expectedWinAmount?: number;
  tags: any[];
  customFields: Record<string, any>;
  plaintiff: Record<string, any>;
  defendant: Record<string, any>;
  laborCaseDetails: Record<string, any>;
  commercialCaseDetails: Record<string, any>;
  personalStatusDetails: Record<string, any>;
  number?: string;
  date?: string;
  expiry?: string;
  scope: '...Object.keys(POA_SCOPE';
  startDate?: string;
  source: string;
  clientName?: string;
  clientPhone?: string;
  documents: any[];
}

// From: updateStatusSchema
export interface UpdateStatusRequest {
  status: string;
  reason: string;
  notes: string;
}

// From: assignLawyerSchema
export interface AssignLawyerRequest {
  lawyerId: string;
  role: string;
  notes: string;
}

// From: addPartySchema
export interface AddPartyRequest {
  name: string;
  role: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  nationalId: string;
  companyRegistration: string;
  notes: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

// From: linkDocumentSchema
export interface LinkDocumentRequest {
  documentId: string;
  category: string;
  description: string;
  tags: any[];
  confidential: boolean;
}

// From: addNoteSchema
export interface AddNoteRequest {
  content: string;
  type: string;
  isPrivate?: boolean;
  tags: any[];
}

// From: updateNoteSchema
export interface UpdateNoteRequest {
  content: string;
  type: string;
  isPrivate: boolean;
  tags: any[];
}

// From: addHearingSchema
export interface AddHearingRequest {
  date: string;
  time: string;
  type: string;
  location: string;
  judge: string;
  notes: string;
  status: string;
  reminder: boolean;
}

// From: updateHearingSchema
export interface UpdateHearingRequest {
  date: string;
  time: string;
  type: string;
  location: string;
  judge: string;
  notes: string;
  status: string;
  reminder: boolean;
  outcome: string;
}

// From: addTimelineEventSchema
export interface AddTimelineEventRequest {
  date: string;
  title: string;
  description: string;
  type: string;
  importance: string;
}

// From: updateTimelineEventSchema
export interface UpdateTimelineEventRequest {
  date: string;
  title: string;
  description: string;
  type: string;
  importance: string;
}

// From: addClaimSchema
export interface AddClaimRequest {
  type: string;
  amount: number;
  currency?: string;
  description: string;
  status: string;
}

// From: updateClaimSchema
export interface UpdateClaimRequest {
  type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
}

// From: updateOutcomeSchema
export interface UpdateOutcomeRequest {
  outcome: string;
  description: string;
  settlementAmount: number;
  awardedAmount: number;
  closingDate: string;
}

// From: updateProgressSchema
export interface UpdateProgressRequest {
  progress: number;
  notes: string;
}

// From: documentUploadUrlSchema
export interface DocumentUploadUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
}

// From: confirmDocumentUploadSchema
export interface ConfirmDocumentUploadRequest {
  key: string;
  title: string;
  description: string;
  category: string;
  tags: any[];
}

// From: createRichDocumentSchema
export interface CreateRichDocumentRequest {
  title: string;
  content?: string;
  type: string;
  tags: any[];
}

// From: updateRichDocumentSchema
export interface UpdateRichDocumentRequest {
  title: string;
  content?: string;
  type: string;
  tags: any[];
}

// From: objectIdParamSchema
export interface ObjectIdParamRequest {
  _id: string;
}

// From: nestedIdParamSchema
export interface NestedIdParamRequest {
  _id: string;
  noteId: string;
  hearingId: string;
  docId: string;
  documentId: string;
  claimId: string;
  eventId: string;
  versionNumber: number;
}

// From: moveCaseToStageSchema
export interface MoveCaseToStageRequest {
  newStage: string;
  notes?: string;
}

// From: endCaseSchema
export interface EndCaseRequest {
  outcome: string;
  endReason: string;
  finalAmount: number;
  notes?: string;
  endDate: string;
}
