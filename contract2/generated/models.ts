/**
 * Auto-generated TypeScript types from Mongoose models
 * Generated: 2026-01-09T08:00:42.877Z
 *
 * DO NOT EDIT - Regenerate with: npm run contracts:models
 */

export interface Account {
  _id: string;
  code?: string;
  name?: string;
  nameAr?: string;
  type?: string;
  subType?: string;
  parentAccountId?: string; // Ref: Account
  isSystem?: boolean;
  isActive?: boolean;
  normalBalance: 'debit' | 'credit';
  level?: number;
  path?: string;
  description?: string;
  descriptionAr?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  group?: any;
  group?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  res_model: string;
  res_id: string;
  activity_type_id: string; // Ref: ActivityType
  summary: string;
  note?: string;
  date_deadline: string;
  startDateTime?: string;
  endDateTime?: string;
  duration?: number;
  isAllDay?: boolean;
  reminder?: boolean;
  recurrence?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'[]; // Ref: Activity
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: 'call' | 'meeting' | 'email' | 'task' | 'deadline' | 'follow_up' | 'reminder' | 'event' | 'other';
  direction?: 'inbound' | 'outbound' | 'internal';
  user_id: string; // Ref: User
  create_user_id: string; // Ref: User
  state?: 'scheduled' | 'done' | 'cancelled';
  done_date?: string;
  done_by?: string; // Ref: User
  feedback?: string;
  calendar_event_id?: string; // Ref: Event
  recommended_activity_type_id?: string; // Ref: ActivityType
  previous_activity_type_id?: string; // Ref: ActivityType
  chained_from_id?: string; // Ref: Activity
  automated?: boolean;
  userId?: string; // Ref: User
  contactId?: string; // Ref: Contact
  email?: string;
  name?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'tentative';
  organizer?: string; // Ref: User
  relatedLeadId?: string; // Ref: Lead
  relatedClientId?: string; // Ref: Client
  relatedContactId?: string; // Ref: Contact
  relatedCaseId?: string; // Ref: Case
  relatedQuoteId?: string; // Ref: Quote
  relatedOrderId?: string; // Ref: Order
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  meetingProvider?: 'zoom' | 'teams' | 'google_meet' | 'webex' | 'other';
  dialInNumber?: string;
  callRecordingUrl?: string;
  outcome?: 'completed' | 'no_answer' | 'left_voicemail' | 'busy' | 'wrong_number' | 'rescheduled' | 'cancelled' | 'positive' | 'negative' | 'neutral';
  nextSteps?: string;
  followUpDate?: string;
  conversionResult?: 'opportunity' | 'client' | 'case' | 'order';
  callDetails?: 'inbound' | 'outbound' | 'missed' | 'scheduled';
  emailDetails?: 'sent' | 'received';
  integration?: string;
  type?: string;
  customFields?: string;
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  date_deadline?: any;
  date_deadline?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPlan {
  _id: string;
  stepNumber: number;
  type: 'call' | 'email' | 'meeting' | 'task' | 'whatsapp' | 'sms' | 'linkedin';
  name: string;
  nameAr?: string;
  description?: string;
  delayDays?: number;
  delayHours?: number;
  emailTemplateId?: string; // Ref: EmailTemplate
  taskDetails?: 'low' | 'normal' | 'high' | 'urgent';
  isOptional?: boolean;
  stopOnReply?: boolean;
  planId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  entityType?: 'lead' | 'contact' | 'client';
  planType?: 'nurture' | 'onboarding' | 'follow_up' | 'win_back' | 'custom';
  totalSteps?: number;
  totalDays?: number;
  settings?: boolean;
  stats?: number;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  type?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPlanExecution {
  _id: string;
  stepNumber: number;
  stepId?: string;
  type: string;
  name: string;
  scheduledDate?: string;
  completedDate?: string;
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  activityId?: string; // Ref: Activity
  skipReason?: string;
  completionNotes?: string;
  outcome?: string;
  planId: string; // Ref: ActivityPlan
  planName?: string;
  planType?: string;
  entityType: 'lead' | 'client' | 'contact';
  entityId: string;
  entityName?: string;
  status?: 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
  currentStep?: number;
  totalSteps: number;
  completedSteps?: number;
  skippedSteps?: number;
  progressPercentage?: number;
  startedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  expectedCompletionDate?: string;
  pauseReason?: string;
  cancelReason?: string;
  startedBy?: string; // Ref: User
  pausedBy?: string; // Ref: User
  resumedBy?: string; // Ref: User
  completedBy?: string; // Ref: User
  cancelledBy?: string; // Ref: User
  settings?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityType {
  _id: string;
  name?: string;
  nameAr?: string;
  summary?: string;
  icon?: string;
  decoration_type?: 'warning' | 'danger' | 'success' | 'info';
  res_model?: string;
  delay_count?: number;
  delay_unit?: 'days' | 'weeks' | 'months';
  delay_from?: 'current_date' | 'previous_activity';
  category?: 'default' | 'upload_file' | 'phonecall' | 'meeting' | 'email' | 'reminder' | 'todo';
  chaining_type?: 'suggest' | 'trigger';
  type?: string;
  triggered_next_type_id?: string; // Ref: ActivityType
  keep_done?: boolean;
  isSystem?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiInteraction {
  _id: string;
  userId: string; // Ref: User
  provider: 'anthropic' | 'openai';
  model: string;
  input: string;
  output: string;
  type?: 'prompt_injection' | 'pii_detected' | 'harmful_content' | 'jailbreak_attempt' | 'excessive_length';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  description?: string;
  type?: 'pii_leakage' | 'harmful_content' | 'hallucination' | 'low_confidence' | 'legal_disclaimer_missing';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  description?: string;
  inputSanitized?: boolean;
  outputFiltered?: boolean;
  safetyScore?: number;
  rateLimiting?: boolean;
  validation?: 'legal' | 'case_management' | 'scheduling' | 'general' | 'null';
  metadata?: string; // Ref: ChatHistory
  usage?: number;
  status?: 'success' | 'blocked' | 'filtered' | 'rate_limited' | 'error';
  blockedReason?: string;
  error?: any;
  flaggedForReview?: boolean;
  flaggedReason?: string;
  reviewed?: boolean;
  reviewedBy?: string; // Ref: User
  reviewedAt?: string;
  reviewNotes?: string;
  match?: any;
  totalInteractions?: any;
  totalTokens?: any;
  totalCost?: any;
  sum?: any;
  match?: any;
  unwind?: any;
  unwind?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEvent {
  _id: string;
  eventType: 'page_view' | 'feature_used' | 'action_completed' | 'error' | 'api_call' | 'search' | 'form_submit' | 'login' | 'logout' | 'signup' | 'user_action' | 'custom';
  eventName: string;
  userId?: string; // Ref: User
  sessionId?: string;
  properties?: any;
  metadata?: string;
  timestamp: string;
  duration?: number;
  expiresAt?: string;
  timeseries?: any;
  match?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsReport {
  _id: string;
  field: string;
  header: string;
  headerAr?: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'boolean' | 'status' | 'avatar' | 'link' | 'badge';
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
  condition?: string;
  style?: any;
  customRenderer?: string;
  chartId: string;
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'radar' | 'treemap' | 'heatmap' | 'gauge' | 'funnel' | 'waterfall' | 'combo';
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  dataSource: string;
  xAxis?: 'category' | 'time' | 'value';
  yAxis?: 'number' | 'currency' | 'percentage';
  name?: string;
  nameAr?: string;
  field?: string;
  color?: string;
  type?: string;
  legend?: 'top' | 'bottom' | 'left' | 'right';
  tooltip?: boolean;
  colors?: string;
  stacked?: boolean;
  showDataLabels?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  height?: number;
  width?: string;
  cardId: string;
  title: string;
  titleAr?: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration' | 'count';
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
  iconColor?: string;
  backgroundColor?: string;
  comparisonPeriod?: 'previous_period' | 'same_period_last_year' | 'custom';
  sparkline?: 'line' | 'bar' | 'area';
  target?: any;
  drillDownReportId?: string; // Ref: AnalyticsReport
  size?: 'small' | 'medium' | 'large';
  filterId: string;
  field: string;
  label: string;
  labelAr?: string;
  type: 'text' | 'number' | 'date' | 'daterange' | 'select' | 'multiselect' | 'boolean' | 'autocomplete' | 'tree';
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  label?: string;
  labelAr?: string;
  optionsSource?: string;
  required?: boolean;
  visible?: boolean;
  allowMultiple?: boolean;
  dependsOn?: string;
  cascading?: boolean;
  name: string;
  collection: string;
  cacheEnabled?: boolean;
  cacheDuration?: number;
  refreshOnFilter?: boolean;
  level: number;
  name: string;
  nameAr?: string;
  groupBy?: string;
  aggregations?: string;
  columns?: string;
  childReport?: string; // Ref: AnalyticsReport
  enabled?: boolean;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  time?: string;
  timezone?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  cronExpression?: string;
  email?: string;
  name?: string;
  type?: 'to' | 'cc' | 'bcc';
  format?: 'pdf' | 'excel' | 'csv' | 'html';
  includeCharts?: boolean;
  emailSubject?: string;
  emailSubjectAr?: string;
  emailBody?: string;
  emailBodyAr?: string;
  lastRun?: string;
  nextRun?: string;
  lastRunStatus?: 'success' | 'failed' | 'partial';
  lastRunError?: string;
  runCount?: number;
  type?: string;
  defaultFormat?: string;
  includeCharts?: boolean;
  includeFilters?: boolean;
  includeSummary?: boolean;
  paperSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: number;
  header?: boolean;
  footer?: boolean;
  watermark?: boolean;
  type?: 'public' | 'private' | 'role_based' | 'user_based' | 'department_based';
  roles?: string;
  type?: string[];
  departments?: string;
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  category: 'employee_data' | 'payroll' | 'attendance' | 'performance' | 'recruitment' | 'training' | 'benefits' | 'compensation' | 'compliance' | 'workforce_planning' | 'turnover' | 'diversity' | 'skills_gap' | 'succession' | 'engagement';
  name?: string;
  calculation?: string;
  format?: string;
  employeeFilters?: string[]; // Ref: HR
  payrollConfig?: boolean;
  attendanceConfig?: boolean;
  performanceConfig?: boolean;
  complianceConfig?: boolean;
  category: 'invoices' | 'expenses' | 'payments' | 'budgets' | 'cash_flow' | 'accounts_receivable' | 'accounts_payable' | 'profitability' | 'revenue' | 'collections' | 'aging' | 'tax' | 'trust_accounting' | 'time_billing' | 'realization' | 'write_offs' | 'retainers';
  name?: string;
  calculation?: string;
  format?: string;
  invoiceConfig?: string[]; // Ref: Client
  expenseConfig?: string[]; // Ref: Vendor
  cashFlowConfig?: string[]; // Ref: BankAccount
  budgetConfig?: boolean;
  profitabilityConfig?: boolean;
  trustConfig?: string[]; // Ref: TrustAccount
  category: 'task_completion' | 'time_tracking' | 'project_progress' | 'team_productivity' | 'deadline_tracking' | 'workload_distribution' | 'efficiency' | 'utilization' | 'billable_hours' | 'capacity_planning' | 'milestone_tracking';
  name?: string;
  calculation?: string;
  format?: string;
  taskConfig?: string[]; // Ref: User
  timeTrackingConfig?: boolean[]; // Ref: User
  productivityConfig?: number;
  workloadConfig?: boolean;
  category: 'leads' | 'contacts' | 'pipeline' | 'customer_engagement' | 'communication_tracking' | 'conversion' | 'retention' | 'client_satisfaction' | 'referrals' | 'client_lifecycle' | 'touchpoints' | 'relationship_health';
  name?: string;
  calculation?: string;
  format?: string;
  leadConfig?: string[]; // Ref: User
  pipelineConfig?: string[]; // Ref: CrmPipeline
  communicationConfig?: boolean;
  clientConfig?: boolean;
  referralConfig?: boolean;
  category: 'sales_performance' | 'revenue' | 'conversions' | 'forecasting' | 'pipeline_value' | 'win_loss' | 'sales_cycle' | 'quotations' | 'deals' | 'targets' | 'commissions' | 'territory';
  name?: string;
  calculation?: string;
  format?: string;
  performanceConfig?: string[]; // Ref: User
  revenueConfig?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  winLossConfig?: boolean;
  forecastingConfig?: number;
  commissionConfig?: boolean;
  widgetId: string;
  type: 'kpi_card' | 'chart' | 'table' | 'list' | 'progress' | 'map' | 'calendar' | 'timeline' | 'custom';
  title: string;
  titleAr?: string;
  reportId?: string; // Ref: AnalyticsReport
  position?: number;
  refreshInterval?: number;
  lastRefreshed?: string;
  visible?: boolean;
  reportId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  section?: 'hr' | 'finance' | 'tasks' | 'crm' | 'sales' | 'general' | 'custom';
  category?: string;
  subcategory?: string;
  tags?: string;
  reportType?: 'standard' | 'custom' | 'template' | 'dashboard' | 'ad_hoc';
  isTemplate?: boolean;
  templateId?: string; // Ref: AnalyticsReport
  dataSource?: 'collection' | 'aggregation' | 'api' | 'custom';
  type?: 'tabular' | 'summary' | 'dashboard' | 'mixed' | 'custom';
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  gridColumns?: number;
  sectionId?: string;
  title?: string;
  titleAr?: string;
  type?: 'header' | 'kpis' | 'charts' | 'table' | 'summary' | 'footer';
  order?: number;
  defaultSort?: 'asc' | 'desc';
  pagination?: boolean;
  type?: 'custom' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_365_days';
  startDate?: string;
  endDate?: string;
  comparePeriod?: 'previous_period' | 'same_period_last_year' | 'custom';
  isFavorite?: boolean;
  isPinned?: boolean;
  pinnedOrder?: number;
  status?: 'draft' | 'active' | 'archived' | 'disabled';
  lastRunAt?: string;
  lastRunBy?: string; // Ref: User
  runCount?: number;
  viewCount?: number;
  version?: number;
  version?: number;
  updatedAt?: string;
  notes?: string;
  notesAr?: string;
  match?: any;
  count?: any;
  scheduled?: any;
  templates?: any;
  totalRuns?: any;
  totalViews?: any;
  project?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  _id: string;
  questionId: string; // Ref: Question
  content: string;
  likes?: number;
  type?: string;
  verified?: boolean;
  helpful?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  _id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  keyHash: string;
  type?: string;
  lastUsedAt?: string;
  usageCount?: number;
  lastUsedIp?: string;
  rateLimit?: number;
  isActive?: boolean;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string; // Ref: User
  revocationReason?: string;
  type?: string;
  metadata?: any;
  partialFilterExpression?: any;
  expiresAt?: any;
  expiresAt?: any;
  match?: any;
  totalKeys?: any;
  activeKeys?: any;
  sum?: any;
  totalUsage?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AppConnection {
  _id: string;
  appId: '// Communication
            slack' | 'discord' | 'telegram' | 'zoom' | 'whatsapp' | '// Productivity
            github' | 'trello' | 'notion' | '// Email
            gmail' | '// Accounting
            quickbooks' | 'xero' | '// Calendars
            google-calendar' | 'microsoft-calendar' | '// Storage
            google-drive' | 'dropbox' | 'onedrive' | '// E-Signatures
            docusign' | '// Payments
            stripe';
  appName: string;
  appDescription?: string;
  appIcon?: string;
  status?: 'connected' | 'disconnected' | 'error' | 'pending';
  connectedBy: string; // Ref: User
  disconnectedBy?: string; // Ref: User
  connectedAt?: string;
  disconnectedAt?: string;
  lastSyncAt?: string;
  lastError?: boolean;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  integrationRef?: string;
  integrationModel?: 'SlackIntegration' | 'DiscordIntegration' | 'TelegramIntegration' | 'ZoomIntegration' | 'GithubIntegration' | 'GmailIntegration' | 'TrelloIntegration' | 'GoogleCalendarIntegration' | 'WhatsappConversation // For WhatsApp integration';
  stats?: number;
  isActive?: boolean;
  autoSync?: boolean;
  disconnectReason?: string;
  notes?: string;
  stats?: any;
  lastSyncAt?: any;
  lastSyncAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Applicant {
  _id: string;
  degree?: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'professional' | 'other';
  degreeName?: string;
  degreeNameAr?: string;
  institution?: string;
  institutionAr?: string;
  country?: string;
  countryAr?: string;
  fieldOfStudy?: string;
  fieldOfStudyAr?: string;
  startDate?: string;
  endDate?: string;
  graduationYear?: number;
  gpa?: number;
  maxGpa?: number;
  honors?: string;
  honorsAr?: string;
  verified?: boolean;
  verificationDate?: string;
  verifiedBy?: string; // Ref: User
  company?: string;
  companyAr?: string;
  industry?: string;
  position?: string;
  positionAr?: string;
  department?: string;
  departmentAr?: string;
  location?: string;
  locationAr?: string;
  country?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  responsibilities?: string;
  responsibilitiesAr?: string;
  achievements?: string;
  achievementsAr?: string;
  reasonForLeaving?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  canContact?: boolean;
  verified?: boolean;
  verificationDate?: string;
  verifiedBy?: string; // Ref: User
  skillName?: string;
  skillNameAr?: string;
  category?: 'technical' | 'soft' | 'language' | 'legal' | 'software' | 'other';
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  certifiedIn?: boolean;
  certificationName?: string;
  lastUsed?: string;
  language?: string;
  languageAr?: string;
  readingLevel?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
  writingLevel?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
  speakingLevel?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
  isNative?: boolean;
  name?: string;
  score?: string;
  date?: string;
  name?: string;
  nameAr?: string;
  issuingOrganization?: string;
  issuingOrganizationAr?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  verified?: boolean;
  verificationDate?: string;
  name?: string;
  nameAr?: string;
  relationship?: 'supervisor' | 'colleague' | 'client' | 'professor' | 'mentor' | 'other';
  company?: string;
  companyAr?: string;
  position?: string;
  positionAr?: string;
  email?: string;
  phone?: string;
  preferredContact?: 'email' | 'phone' | 'any';
  notes?: string;
  contacted?: boolean;
  contactedDate?: string;
  contactedBy?: string; // Ref: User
  response?: 'excellent' | 'good' | 'satisfactory' | 'poor' | 'no_response';
  documentType?: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'transcript' | 'id' | 'passport' | 'visa' | 'work_permit' | 'driving_license' | 'reference_letter' | 'writing_sample' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verifiedAt?: string;
  notes?: string;
  interviewId?: string;
  jobPostingId?: string; // Ref: JobPosting
  stage?: string;
  stageOrder?: number;
  interviewType?: 'phone' | 'video' | 'in_person' | 'panel' | 'technical' | 'hr' | 'final';
  scheduledDate?: string;
  scheduledEndTime?: string;
  duration?: number;
  timezone?: string;
  location?: string;
  meetingLink?: string;
  phoneNumber?: string;
  userId?: string; // Ref: User
  name?: string;
  nameAr?: string;
  role?: string;
  email?: string;
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  interviewerId?: string; // Ref: User
  interviewerName?: string;
  submittedAt?: string;
  overallRating?: number;
  recommendation?: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
  strengths?: string;
  weaknesses?: string;
  cultureFit?: number;
  technicalSkills?: number;
  communication?: number;
  experience?: number;
  detailedNotes?: string;
  question?: string;
  answer?: string;
  rating?: number;
  aggregatedScore?: number;
  finalRecommendation?: string;
  notes?: string;
  notesAr?: string;
  cancelReason?: string;
  rescheduledFrom?: string;
  assessmentId?: string;
  assessmentType?: 'technical_test' | 'aptitude_test' | 'personality_test' | 'case_study' | 'coding_challenge' | 'writing_sample' | 'presentation' | 'group_exercise' | 'simulation';
  assessmentName?: string;
  assessmentNameAr?: string;
  provider?: string;
  sentAt?: string;
  deadline?: string;
  completedAt?: string;
  status?: 'pending' | 'sent' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  score?: number;
  maxScore?: number;
  percentile?: number;
  passed?: boolean;
  reportUrl?: string;
  notes?: string;
  offerId?: string;
  jobPostingId?: string; // Ref: JobPosting
  status?: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'negotiating' | 'expired' | 'withdrawn';
  salary?: 'monthly' | 'annual';
  housingAllowance?: number;
  transportationAllowance?: number;
  name?: string;
  amount?: number;
  totalCompensation?: number;
  benefits?: string;
  startDate?: string;
  positionTitle?: string;
  positionTitleAr?: string;
  department?: string;
  departmentAr?: string;
  reportsTo?: string;
  employmentType?: string;
  probationPeriod?: number;
  workLocation?: string;
  workSchedule?: string;
  conditions?: string;
  contingencies?: string;
  offerValidUntil?: string;
  sentAt?: string;
  respondedAt?: string;
  candidateResponse?: string;
  declineReason?: string;
  negotiationNotes?: string;
  counterOffer?: any;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  comments?: string;
  offerLetterUrl?: string;
  signedOfferUrl?: string;
  createdAt?: string;
  activityType?: 'application_submitted' | 'status_change' | 'stage_change' | 'note_added' | 'document_uploaded' | 'email_sent' | 'email_received' | 'call_made' | 'interview_scheduled' | 'interview_completed' | 'assessment_sent' | 'assessment_completed' | 'reference_checked' | 'offer_sent' | 'offer_accepted' | 'offer_declined' | 'hired' | 'rejected' | 'withdrawn' | 'tag_added' | 'tag_removed' | 'rating_updated' | 'assigned' | 'other';
  description?: string;
  descriptionAr?: string;
  previousValue?: string;
  newValue?: string;
  performedBy?: string; // Ref: User
  performedByName?: string;
  timestamp?: string;
  noteType?: 'general' | 'interview' | 'assessment' | 'reference' | 'offer' | 'concern' | 'private';
  content?: string;
  contentAr?: string;
  isPrivate?: boolean;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: 'email' | 'phone' | 'sms' | 'whatsapp' | 'in_person' | 'video_call';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  contentAr?: string;
  templateUsed?: string;
  sentAt?: string;
  receivedAt?: string;
  sentBy?: string; // Ref: User
  sentByName?: string;
  status?: 'draft' | 'sent' | 'delivered' | 'read' | 'replied' | 'bounced' | 'failed';
  fileName?: string;
  fileUrl?: string;
  callDuration?: number;
  callNotes?: string;
  applicantId?: string;
  firstName?: string;
  firstNameAr?: string;
  lastName?: string;
  lastNameAr?: string;
  middleName?: string;
  middleNameAr?: string;
  fullName?: string;
  fullNameAr?: string;
  email?: string;
  emailSecondary?: string;
  phone?: string;
  phoneSecondary?: string;
  whatsapp?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  nationalityAr?: string;
  nationalId?: string;
  passportNumber?: string;
  passportExpiry?: string;
  currentLocation?: any;
  willingToRelocate?: boolean;
  preferredLocations?: string;
  workAuthorization?: 'citizen' | 'resident' | 'work_visa' | 'visit_visa' | 'requires_sponsorship' | 'other';
  profilePhoto?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  platform?: string;
  url?: string;
  currentPosition?: boolean;
  totalYearsExperience?: number;
  relevantYearsExperience?: number;
  highestEducation?: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'professional';
  jurisdiction?: string;
  admissionDate?: string;
  barNumber?: string;
  status?: 'active' | 'inactive' | 'suspended';
  verified?: boolean;
  scaLicense?: boolean;
  practiceAreas?: string;
  casesHandled?: number;
  courtExperience?: string;
  jobPostingId?: string; // Ref: JobPosting
  jobTitle?: string;
  jobTitleAr?: string;
  appliedAt?: string;
  source?: 'company_website' | 'linkedin' | 'indeed' | 'bayt' | 'glassdoor' | 'referral' | 'recruitment_agency' | 'job_fair' | 'direct' | 'other';
  sourceName?: string;
  coverLetter?: string;
  coverLetterAr?: string;
  question?: string;
  answer?: string;
  currentStage?: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'hr_interview' | 'panel_interview' | 'assessment' | 'reference_check' | 'background_check' | 'offer' | 'negotiation' | 'hired' | 'rejected' | 'withdrawn';
  stage?: string;
  enteredAt?: string;
  exitedAt?: string;
  outcome?: string;
  notes?: string;
  status?: 'active' | 'on_hold' | 'hired' | 'rejected' | 'withdrawn';
  rejectionReason?: string;
  rejectionReasonAr?: string;
  withdrawalReason?: string;
  fitScore?: number;
  aiScreeningScore?: number;
  assignedTo?: string; // Ref: User
  assignedToName?: string;
  lastActivityAt?: string;
  closedAt?: string;
  hiredAt?: string;
  primaryApplication?: string; // Ref: JobPosting
  resumeUrl?: string;
  resumeText?: string;
  preferredCommunication?: 'email' | 'phone' | 'whatsapp';
  overallRating?: number;
  ratings?: number;
  recommendation?: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
  salaryExpectations?: 'monthly' | 'annual';
  availability?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'issues_found' | 'cleared';
  provider?: string;
  initiatedAt?: string;
  completedAt?: string;
  results?: 'clear' | 'issues' | 'pending';
  notes?: string;
  reportUrl?: string;
  tags?: string;
  talentPool?: 'hot' | 'warm' | 'cold' | 'passive' | 'active' | 'blacklisted';
  isBlacklisted?: boolean;
  blacklistReason?: string;
  blacklistedAt?: string;
  blacklistedBy?: string; // Ref: User
  employeeId?: string; // Ref: Employee
  hiredForJobId?: string; // Ref: JobPosting
  startDate?: string;
  onboardingStatus?: 'pending' | 'in_progress' | 'completed';
  item?: string;
  itemAr?: string;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  consent?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdAt?: any;
  elemMatch?: any;
  match?: any;
  match?: any;
  group?: any;
  text?: any;
  score?: any;
  score?: any;
  isBlacklisted?: any;
  totalApplicants?: any;
  totalApplications?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  avgFitScore?: any;
  project?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  _id: string;
  appointmentNumber: string;
  scheduledTime: string;
  duration: number;
  endTime?: string;
  status?: string;
  type?: string;
  source?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
  subject?: string;
  appointmentWith?: string;
  partyId?: string;
  partyModel?: 'Lead' | 'Client' | 'Contact';
  caseId?: string; // Ref: Case
  assignedTo: string; // Ref: User
  locationType?: string;
  location?: string;
  meetingLink?: string;
  calendarEventId?: string;
  microsoftCalendarEventId?: string;
  price?: number;
  currency?: string;
  isPaid?: boolean;
  paymentId?: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'online' | 'other' | 'null';
  paidAt?: string;
  sendReminder?: boolean;
  reminderSentAt?: string;
  sentAt?: string;
  type?: 'email' | 'sms' | 'push';
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt?: any;
  scheduledTime?: any;
  status?: any;
  scheduledTime?: any;
  status?: any;
  startDateTime?: any;
  endDateTime?: any;
  scheduledTime?: any;
  status?: any;
  reminderSentAt?: any;
  scheduledTime?: any;
  sum?: any;
  totalAppointments?: any;
  sum?: any;
  sum?: any;
  group?: any;
  sum?: any;
  scheduledTime?: any;
  scheduledTime?: any;
  scheduledTime?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalChain {
  _id: string;
  order: number;
  name: string;
  approverType: 'specific' | 'role' | 'manager' | 'dynamic' | 'requester_manager';
  type?: string;
  role?: string;
  dynamicField?: string;
  requirementType?: 'any' | 'all' | 'majority' | 'count';
  requiredCount?: number;
  allowDelegation?: boolean;
  skipConditions?: any;
  timeoutHours?: number;
  name: string;
  description?: string;
  type?: string;
  validate?: any;
  allowFutureApproval?: boolean;
  preventSelfApproval?: boolean;
  escalation?: boolean[]; // Ref: User
  notifications?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  toJSON?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  _id: string;
  approverId: string; // Ref: User
  order: number;
  status?: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped';
  actionDate?: string;
  notes?: string;
  delegatedTo?: string; // Ref: User
  delegatedReason?: string;
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'info_requested' | 'delegated' | 'escalated' | 'reminded' | 'auto_approved';
  performedBy?: string; // Ref: User
  timestamp: string;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: any;
  sentAt: string;
  to: string; // Ref: User
  requestNumber: string;
  entityType: string;
  entityId: string;
  requesterId: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'info_requested';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string;
  validate?: any;
  currentLevel?: number;
  data: any;
  history?: any[];
  remindersSent?: any[];
  autoApproved?: boolean;
  autoApprovalReason?: string;
  autoApprovalAt?: string;
  completedAt?: string;
  completedBy?: string; // Ref: User
  toJSON?: any;
  requestNumber?: any;
  elemMatch?: any;
  dueDate?: any;
  createdAt?: any;
  group?: any;
  status?: any;
  completedAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRule {
  _id: string;
  module: 'cases' | 'clients' | 'finance' | 'invoices' | 'payments' | 'expenses' | 'documents' | 'tasks' | 'staff' | 'settings' | 'reports';
  action: '// CRUD actions
            create' | 'update' | 'delete' | '// Finance-specific
            approve_invoice' | 'refund_payment' | 'write_off' | '// Staff-specific
            invite_member' | 'remove_member' | 'change_role' | 'update_permissions' | '// Document-specific
            share_external' | 'delete_permanent' | '// Case-specific
            close_case' | 'reopen_case' | 'assign_case' | '// Client-specific
            delete_client' | 'merge_clients' | '// Expense-specific
            approve_expense' | 'reimburse_expense';
  isActive?: boolean;
  thresholdAmount?: number;
  thresholdCurrency?: string;
  type?: string;
  type?: string;
  minApprovals?: number;
  autoApproveAfterHours?: number;
  escalation?: boolean[]; // Ref: User
  notifications?: boolean;
  conditions?: any;
  description?: string;
  settings?: boolean;
  settings?: any;
  push?: any;
  set?: any;
  set?: any;
  pull?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflow {
  _id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value?: any;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value?: any;
  type: 'specific' | 'role' | 'manager' | 'dynamic';
  type?: string;
  roleId?: string;
  dynamicField?: string;
  enabled?: boolean;
  afterHours?: number;
  type?: string;
  enabled?: boolean;
  delegateTo?: string; // Ref: User
  validFrom?: string;
  validTo?: string;
  order: number;
  name: string;
  approvers: any;
  approvalType?: 'any' | 'all' | 'majority';
  action: 'send_email' | 'send_notification' | 'update_field' | 'create_task' | 'webhook' | 'run_script';
  params: any;
  name: string;
  description?: string;
  entityType: 'deal' | 'quote' | 'expense' | 'leave_request' | 'invoice' | 'purchase_order' | 'contract' | 'payment' | 'refund' | 'time_off' | 'reimbursement' | 'custom';
  validate?: any;
  slaHours?: number;
  notifyOnPending?: boolean;
  auditRequired?: boolean;
  isActive?: boolean;
  userId: string; // Ref: User
  decision: 'approved' | 'rejected' | 'abstained';
  decidedAt: string;
  comments?: string;
  delegatedFrom?: string; // Ref: User
  level: number;
  startedAt: string;
  completedAt?: string;
  skipped?: boolean;
  skipReason?: string;
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'escalated' | 'delegated' | 'cancelled' | 'level_completed' | 'level_skipped' | 'reassigned';
  userId?: string; // Ref: User
  timestamp: string;
  details?: any;
  ipAddress?: string;
  workflowId: string; // Ref: ApprovalWorkflow
  entityType: string;
  entityId: string;
  requestedBy: string; // Ref: User
  requestedAt: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  currentLevel?: number;
  completedAt?: string;
  completedBy?: string; // Ref: User
  finalComments?: string;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  group?: any;
  status?: any;
  completedAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedAuditLog {
  _id: string;
  field: string;
  oldValue?: any;
  newValue?: any;
  userId: string; // Ref: User
  userEmail: string;
  userRole: 'client' | 'lawyer' | 'admin';
  userName?: string;
  action: string;
  entityType?: string;
  resourceType?: string;
  entityId?: string;
  resourceId?: string;
  resourceName?: string;
  beforeState?: any;
  afterState?: any;
  details?: any;
  metadata?: any;
  ipAddress: string;
  userAgent?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  endpoint?: string;
  sessionId?: string;
  status?: 'success' | 'failed' | 'suspicious' | 'pending';
  errorMessage?: string;
  statusCode?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  integrity?: string;
  timestamp: string;
  archivedAt: string;
  archivedBy?: 'system' | 'admin' | 'scheduled-job';
  originalLogId: string;
  archiveReason?: 'aged-out' | 'manual-archive' | 'compliance-requirement';
  compressed?: boolean;
  compressionAlgorithm?: 'none' | 'gzip' | 'zlib';
  group?: any;
  count?: any;
  sort?: any;
  dateRange?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  _id: string;
  insurer?: string;
  policyNo?: string;
  startDate?: string;
  endDate?: string;
  insuredValue?: number;
  scheduleDate: string;
  depreciationAmount?: number;
  accumulatedDepreciation?: number;
  valueAfterDepreciation?: number;
  journalEntry?: string; // Ref: JournalEntry
  assetId?: string;
  assetNumber?: string;
  assetName: string;
  assetNameAr?: string;
  description?: string;
  serialNo?: string;
  image?: string;
  type?: string;
  assetCategory?: string; // Ref: AssetCategory
  itemId?: string; // Ref: Item
  itemCode?: string;
  status?: 'draft' | 'submitted' | 'partially_depreciated' | 'fully_depreciated' | 'sold' | 'scrapped' | 'in_maintenance';
  isExistingAsset?: boolean;
  location?: string;
  custodian?: string; // Ref: User
  custodianName?: string;
  department?: string;
  company?: string;
  purchaseDate?: string;
  purchaseInvoiceId?: string; // Ref: Invoice
  supplierId?: string; // Ref: Vendor
  supplierName?: string;
  grossPurchaseAmount: number;
  purchaseReceiptAmount?: number;
  currency?: string;
  assetQuantity?: number;
  availableForUseDate?: string;
  depreciationMethod?: 'straight_line' | 'double_declining_balance' | 'written_down_value';
  totalNumberOfDepreciations?: number;
  frequencyOfDepreciation?: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  depreciationStartDate?: string;
  expectedValueAfterUsefulLife?: number;
  openingAccumulatedDepreciation?: number;
  currentValue?: number;
  accumulatedDepreciation?: number;
  valueAfterDepreciation?: number;
  warrantyExpiryDate?: string;
  type?: string;
  type?: string;
  toJSON?: any;
  toObject?: any;
  createdAt?: any;
  totalAssets?: any;
  totalValue?: any;
  totalDepreciation?: any;
  netValue?: any;
  sum?: any;
  sum?: any;
  group?: any;
  lookup?: any;
  unwind?: any;
  project?: any;
  sort?: any;
  warrantyExpiryDate?: any;
  status?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignment {
  _id: string;
  depreciationRates?: any;
  maintenanceIntervals?: any;
  liabilityThresholds?: any;
  photoType?: 'asset' | 'serial_number' | 'damage' | 'accessories' | 'return_condition';
  photoUrl?: string;
  capturedDate?: string;
  notes?: string;
  specName?: string;
  specValue?: string;
  accessoryType?: string;
  description?: string;
  serialNumber?: string;
  quantity?: number;
  returned?: boolean;
  returnedDate?: string;
  condition?: string;
  item?: string;
  checked?: boolean;
  notes?: string;
  maintenanceId?: string;
  maintenanceType?: 'preventive' | 'corrective' | 'inspection' | 'upgrade';
  maintenanceDate?: string;
  performedBy?: 'internal' | 'vendor' | 'manufacturer';
  technician?: string;
  vendorName?: string;
  workOrder?: string;
  description?: string;
  mileageAtMaintenance?: number;
  partName?: string;
  partNumber?: string;
  quantity?: number;
  cost?: number;
  laborCost?: number;
  totalCost?: number;
  downtime?: number;
  warranty?: any;
  nextServiceDue?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  maintenanceReport?: string;
  notes?: string;
  repairId?: string;
  reportedDate?: string;
  reportedBy?: string; // Ref: User
  issueDescription?: string;
  severity?: 'minor' | 'moderate' | 'major' | 'critical';
  causeOfDamage?: 'normal_wear' | 'accident' | 'misuse' | 'manufacturing_defect' | 'external_factors' | 'unknown';
  employeeLiable?: boolean;
  liabilityAmount?: number;
  repairStatus?: 'reported' | 'assessed' | 'approved' | 'in_progress' | 'completed' | 'unrepairable';
  assessment?: 'repair' | 'replace' | 'write_off';
  approvalRequired?: boolean;
  approved?: boolean;
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  repairStartDate?: string;
  repairCompletionDate?: string;
  repairedBy?: string;
  vendorName?: string;
  workOrder?: string;
  partName?: string;
  partNumber?: string;
  quantity?: number;
  cost?: number;
  laborCost?: number;
  totalRepairCost?: number;
  employeeCharge?: boolean;
  repairWarranty?: any;
  assetFunctional?: boolean;
  invoiceNumber?: string;
  invoiceUrl?: string;
  repairReport?: string;
  photos?: string;
  notes?: string;
  incidentId?: string;
  incidentType?: 'loss' | 'theft' | 'damage' | 'malfunction' | 'data_breach' | 'unauthorized_access' | 'misuse' | 'accident';
  incidentDate?: string;
  reportedDate?: string;
  reportedBy?: string; // Ref: User
  incidentDescription?: string;
  location?: string;
  circumstances?: boolean[];
  investigation?: boolean;
  impact?: 'minor' | 'moderate' | 'major' | 'critical';
  insuranceClaim?: 'pending' | 'approved' | 'rejected' | 'settled';
  liability?: 'salary_deduction' | 'payment_plan' | 'insurance' | 'write_off' | 'legal_action';
  resolution?: 'asset_recovered' | 'asset_replaced' | 'asset_repaired' | 'insurance_settled' | 'employee_charged' | 'written_off';
  disciplinaryAction?: 'verbal_warning' | 'written_warning' | 'suspension' | 'termination' | 'legal_action';
  incidentReport?: string;
  photos?: string;
  notes?: string;
  documentType?: 'assignment_form' | 'acknowledgment' | 'handover_checklist' | 'warranty' | 'insurance_policy' | 'invoice' | 'receipt' | 'maintenance_record' | 'repair_invoice' | 'incident_report' | 'return_inspection' | 'clearance_certificate' | 'destruction_certificate' | 'photo' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  expiryDate?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  transferId?: string;
  transferType?: 'employee_transfer' | 'department_transfer' | 'location_transfer' | 'temporary_reassignment';
  transferDate?: string;
  transferFrom?: string; // Ref: Employee
  transferTo?: string; // Ref: Employee
  transferReason?: string;
  temporary?: boolean;
  expectedReturnDate?: string;
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  transferCompleted?: boolean;
  notes?: string;
  communicationId?: string;
  communicationType?: 'email' | 'sms' | 'system_notification' | 'letter';
  date?: string;
  purpose?: 'assignment_notification' | 'return_reminder' | 'maintenance_due' | 'warranty_expiry' | 'insurance_renewal' | 'violation_notice' | 'damage_charge' | 'clearance_issued' | 'other';
  recipient?: string;
  subject?: string;
  message?: string;
  attachments?: string;
  sent?: boolean;
  sentDate?: string;
  delivered?: boolean;
  read?: boolean;
  readDate?: string;
  responded?: boolean;
  responseDate?: string;
  assignmentId?: string;
  assignmentNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  department?: string;
  departmentId?: string; // Ref: Department
  jobTitle?: string;
  location?: string;
  workType?: 'on_site' | 'remote' | 'hybrid' | 'field';
  managerId?: string; // Ref: Employee
  managerName?: string;
  employmentStatus?: 'active' | 'on_notice' | 'terminated';
  lastWorkingDay?: string;
  assetId?: string;
  assetTag?: string;
  assetNumber?: string;
  serialNumber?: string;
  modelNumber?: string;
  assetName?: string;
  assetNameAr?: string;
  assetType?: 'laptop' | 'desktop' | 'mobile_phone' | 'tablet' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'printer' | 'scanner' | 'vehicle' | 'access_card' | 'id_badge' | 'keys' | 'uniform' | 'tools' | 'equipment' | 'furniture' | 'books' | 'software_license' | 'other';
  assetTypeAr?: string;
  assetCategory?: 'IT_equipment' | 'office_equipment' | 'vehicle' | 'security_items' | 'tools' | 'furniture' | 'mobile_devices' | 'software' | 'other';
  assetCategoryAr?: string;
  brand?: string;
  model?: string;
  specifications?: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  conditionAtAssignment?: 'new' | 'excellent' | 'good' | 'fair' | 'poor';
  conditionNotes?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  currency?: string;
  depreciationRate?: number;
  warranty?: 'manufacturer' | 'extended' | 'insurance';
  insurance?: boolean;
  ownership?: 'company_owned' | 'leased' | 'rented' | 'employee_owned_reimbursed';
  leaseDetails?: boolean;
  defaultLocation?: any;
  tracking?: boolean;
  assignmentRequest?: 'employee' | 'manager' | 'it' | 'hr' | 'admin'; // Ref: User
  assignmentType?: 'permanent' | 'temporary' | 'project_based' | 'pool';
  assignedDate?: string;
  expectedReturnDate?: string;
  indefiniteAssignment?: boolean;
  assignmentPurpose?: string;
  assignmentPurposeCategory?: 'job_requirement' | 'project' | 'training' | 'replacement' | 'temporary_need';
  projectAssignment?: boolean;
  assignmentLocation?: boolean;
  handover?: 'in_person' | 'courier' | 'mail'; // Ref: User
  acknowledged?: boolean;
  acknowledgmentDate?: string;
  acknowledgmentMethod?: 'digital_signature' | 'physical_signature' | 'email_confirmation' | 'system_acceptance';
  term?: string;
  termAr?: string;
  accepted?: boolean;
  signature?: string;
  signatureUrl?: string;
  witnessName?: string;
  witnessSignature?: string;
  acceptableUse?: boolean;
  employeeResponsibilities?: string;
  maintenanceRequired?: boolean;
  maintenanceSchedule?: string;
  cleaningRequired?: boolean;
  cleaningFrequency?: string;
  storageRequirements?: string;
  damageReporting?: boolean;
  liability?: boolean;
  returnRequired?: boolean;
  trigger?: 'resignation' | 'termination' | 'project_end' | 'replacement' | 'request' | 'lease_end';
  returnTimeline?: string;
  returnConditionRequired?: 'same_as_received' | 'good_working_order' | 'normal_wear_accepted';
  cleaningRequired?: boolean;
  dataWipingRequired?: boolean;
  accessoriesReturnRequired?: boolean;
  penaltyForLateReturn?: 'daily_charge' | 'salary_deduction' | 'warning';
  confidentialDataAccess?: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  encryptionRequired?: boolean;
  backupRequired?: boolean;
  backupFrequency?: string;
  dataRetentionPolicy?: string;
  dataDestructionOnReturn?: 'software_wipe' | 'physical_destruction' | 'secure_erase';
  status?: 'assigned' | 'in_use' | 'returned' | 'lost' | 'damaged' | 'maintenance' | 'stolen' | 'retired';
  statusDate?: string;
  currentLocation?: 'office' | 'home' | 'field' | 'transit' | 'storage' | 'other';
  location?: string;
  movedOn?: string;
  movedBy?: string;
  reason?: string;
  usageTracking?: 'manual' | 'automatic' | 'software_agent'[];
  checkType?: 'check_out' | 'check_in';
  checkDate?: string;
  checkTime?: string;
  checkedBy?: string; // Ref: User
  checkedByName?: string;
  location?: string;
  purpose?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  condition?: string;
  notes?: string;
  maintenanceSchedule?: 'preventive' | 'periodic' | 'condition_based';
  totalMaintenanceCost?: number;
  totalRepairCost?: number;
  totalCostToDate?: number;
  softwareLicense?: 'perpetual' | 'subscription' | 'concurrent' | 'named_user' | 'device'[];
  isVehicle?: boolean;
  vehicleType?: 'car' | 'van' | 'truck' | 'motorcycle' | 'bus';
  registration?: any;
  vehicleInsurance?: 'comprehensive' | 'third_party' | 'third_party_fire_theft';
  driverId?: string; // Ref: Employee
  driverName?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseVerified?: boolean;
  authorizedDate?: string;
  restrictions?: string;
  usageLimits?: any;
  date?: string;
  fuelType?: string;
  liters?: number;
  pricePerLiter?: number;
  totalCost?: number;
  mileage?: number;
  receiptUrl?: string;
  paidBy?: 'company_card' | 'employee_reimbursed';
  totalFuelCost?: number;
  violationDate?: string;
  violationType?: string;
  location?: string;
  fineAmount?: number;
  driverAtFault?: string;
  employeeLiable?: boolean;
  paid?: boolean;
  paidBy?: 'company' | 'employee';
  receiptUrl?: string;
  points?: number;
  returnInitiated?: boolean;
  returnInitiatedDate?: string;
  returnInitiatedBy?: 'employee' | 'manager' | 'hr' | 'it' | 'system';
  returnReason?: 'resignation' | 'termination' | 'upgrade' | 'project_end' | 'replacement' | 'no_longer_needed' | 'defective' | 'lease_end';
  returnReasonDetails?: string;
  returnDueDate?: string;
  reminderDate?: string;
  reminderMethod?: 'email' | 'sms' | 'system_notification';
  acknowledged?: boolean;
  actualReturnDate?: string;
  returnedBy?: string;
  returnMethod?: 'hand_delivery' | 'courier' | 'mail' | 'pickup';
  returnLocation?: string;
  receivedBy?: string; // Ref: User
  receivedByName?: string;
  inspected?: boolean;
  inspectionDate?: string;
  inspectedBy?: string; // Ref: User
  inspectedByName?: string;
  conditionAtReturn?: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged' | 'not_functional';
  completenessCheck?: number[];
  dataCheck?: 'software' | 'physical_destruction';
  functionalityTest?: any;
  inspectionReport?: string;
  inspectionPhotos?: string;
  inspectionNotes?: string;
  hasCharges?: boolean;
  chargeType?: 'damage' | 'missing_item' | 'cleaning' | 'data_recovery' | 'late_return' | 'lost_asset';
  description?: string;
  amount?: number;
  totalCharges?: number;
  recoveryMethod?: 'salary_deduction' | 'final_settlement' | 'payment' | 'waived';
  recovered?: boolean;
  recoveryAmount?: number;
  recoveryDate?: string;
  waived?: boolean;
  waiverReason?: string;
  waivedBy?: string; // Ref: User
  clearance?: boolean; // Ref: User
  nextSteps?: 'available_for_reassignment' | 'needs_repair' | 'needs_maintenance' | 'retired' | 'disposed';
  returnCompleted?: boolean;
  returnCompletionDate?: string;
  retired?: boolean;
  retirementDate?: string;
  retirementReason?: 'end_of_life' | 'obsolete' | 'damaged_beyond_repair' | 'upgrade' | 'lease_end' | 'cost_ineffective';
  retirementApproved?: boolean;
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  bookValue?: number;
  disposalMethod?: 'sale' | 'donation' | 'recycling' | 'trade_in' | 'return_to_vendor' | 'destruction' | 'storage';
  disposalDate?: string;
  sale?: any;
  donation?: any;
  recycling?: any;
  tradeIn?: any;
  dataDestruction?: 'software_wipe' | 'degaussing' | 'physical_destruction' | 'shredding';
  accounting?: any;
  disposalDocument?: string;
  notes?: string;
  itSecurityCompliance?: boolean;
  assetTaggingCompliance?: 'barcode' | 'qr_code' | 'rfid' | 'serial_number';
  lastAuditDate?: string;
  nextAuditDue?: string;
  auditFrequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  finding?: string;
  severity?: 'low' | 'medium' | 'high';
  correctionRequired?: boolean;
  corrected?: boolean;
  correctionDate?: string;
  compliant?: boolean;
  legalCompliance?: boolean[];
  notes?: any;
  assignmentDuration?: number;
  utilizationRate?: number;
  totalCostOfOwnership?: number;
  costPerDay?: number;
  maintenanceCostPercentage?: number;
  uptimePercentage?: number;
  meanTimeBetweenFailures?: number;
  vsAssetTypeAverage?: 'above' | 'at' | 'below';
  relatedRecords?: string[]; // Ref: AssetAssignment
  createdOn?: string;
  lastModifiedOn?: string;
  lastModifiedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface AssetCategory {
  _id: string;
  categoryId?: string;
  name: string;
  nameAr?: string;
  parentCategory?: string; // Ref: AssetCategory
  isGroup?: boolean;
  depreciationMethod?: 'straight_line' | 'double_declining_balance' | 'written_down_value';
  totalNumberOfDepreciations?: number;
  frequencyOfDepreciation?: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  enableCwip?: boolean;
  fixedAssetAccount?: string; // Ref: Account
  accumulatedDepreciationAccount?: string; // Ref: Account
  depreciationExpenseAccount?: string; // Ref: Account
  isActive?: boolean;
  toJSON?: any;
  toObject?: any;
  match?: any;
  populate?: any;
  group?: any;
  lookup?: any;
  unwind?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMovement {
  _id: string;
  movementId?: string;
  assetId: string; // Ref: Asset
  assetName?: string;
  movementType: 'transfer' | 'issue' | 'receipt';
  transactionDate?: string;
  sourceLocation?: string;
  targetLocation?: string;
  fromCustodian?: string; // Ref: User
  toCustodian?: string; // Ref: User
  fromDepartment?: string;
  toDepartment?: string;
  reason?: string;
  remarks?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  toJSON?: any;
  toObject?: any;
  createdAt?: any;
  totalMovements?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  count?: any;
  sum?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRepair {
  _id: string;
  repairId?: string;
  assetId: string; // Ref: Asset
  assetName?: string;
  repairType: 'repair' | 'service' | 'upgrade';
  failureDate?: string;
  completionDate?: string;
  repairCost?: number;
  description: string;
  actionsPerformed?: string;
  vendorId?: string; // Ref: Vendor
  vendorName?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  toJSON?: any;
  toObject?: any;
  totalRepairs?: any;
  totalCost?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  avgCost?: any;
  count?: any;
  totalCost?: any;
  sum?: any;
  project?: any;
  sort?: any;
  group?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSettings {
  _id: string;
  autoDepreciation?: boolean;
  depreciationFrequency?: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  enableMaintenanceAlerts?: boolean;
  maintenanceAlertDays?: number;
  enableWarrantyAlerts?: boolean;
  warrantyAlertDays?: number;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  type?: 'Point';
  coordinates?: number;
  address?: string;
  addressAr?: string;
  isWithinGeofence?: boolean;
  geofenceId?: string; // Ref: Geofence
  distanceFromOffice?: number;
  accuracy?: number;
  method?: 'fingerprint' | 'facial' | 'card' | 'pin' | 'mobile' | 'manual' | 'qr_code';
  deviceId?: string;
  deviceName?: string;
  verified?: boolean;
  verificationScore?: number;
  rawData?: string;
  time?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet' | 'biometric_terminal' | 'other';
  source?: 'web' | 'mobile_app' | 'biometric' | 'manual_entry' | 'import' | 'api';
  notes?: string;
  notesAr?: string;
  photo?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  type?: 'prayer' | 'lunch' | 'personal' | 'medical' | 'other';
  typeAr?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  isPaid?: boolean;
  isScheduled?: boolean;
  notes?: string;
  status?: 'ongoing' | 'completed' | 'exceeded';
  exceededBy?: number;
  isLate?: boolean;
  scheduledTime?: string;
  actualTime?: string;
  lateBy?: number;
  reason?: string;
  reasonAr?: string;
  reasonCategory?: 'traffic' | 'medical' | 'family_emergency' | 'transportation' | 'weather' | 'other' | 'no_reason';
  isExcused?: boolean;
  excusedBy?: string; // Ref: User
  excusedAt?: string;
  excuseNotes?: string;
  deductionApplied?: boolean;
  deductionAmount?: number;
  deductionType?: 'hours' | 'percentage' | 'fixed';
  isEarly?: boolean;
  scheduledTime?: string;
  actualTime?: string;
  earlyBy?: number;
  reason?: string;
  reasonAr?: string;
  reasonCategory?: 'medical' | 'family_emergency' | 'appointment' | 'personal' | 'other' | 'no_reason';
  isApproved?: boolean;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  deductionApplied?: boolean;
  deductionAmount?: number;
  isAbsent?: boolean;
  type?: 'unauthorized' | 'authorized' | 'leave' | 'holiday' | 'sick' | 'pending';
  typeAr?: string;
  reason?: string;
  reasonAr?: string;
  linkedLeaveRequest?: string; // Ref: LeaveRequest
  isExcused?: boolean;
  excusedBy?: string; // Ref: User
  excusedAt?: string;
  documentProvided?: boolean;
  documentUrl?: string;
  deductionApplied?: boolean;
  deductionDays?: number;
  hasOvertime?: boolean;
  regularOvertime?: number;
  weekendOvertime?: number;
  holidayOvertime?: number;
  totalOvertimeMinutes?: number;
  preApproved?: boolean;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  approvalNotes?: string;
  reason?: string;
  reasonAr?: string;
  taskDescription?: string;
  taskDescriptionAr?: string;
  compensation?: 'payment' | 'time_off' | 'both'; // Ref: PayrollRun
  type?: 'late_arrival' | 'early_departure' | 'unauthorized_absence' | 'missed_check_in' | 'missed_check_out' | 'exceeded_break' | 'unauthorized_overtime' | 'location_violation' | 'multiple_check_in' | 'proxy_attendance' | 'other';
  typeAr?: string;
  severity?: 'minor' | 'moderate' | 'major' | 'critical';
  description?: string;
  descriptionAr?: string;
  detectedAt?: string;
  autoDetected?: boolean;
  resolved?: boolean;
  resolvedBy?: string; // Ref: User
  resolvedAt?: string;
  resolution?: string;
  penaltyApplied?: boolean;
  penaltyType?: 'warning' | 'deduction' | 'suspension' | 'termination_warning' | 'none';
  penaltyAmount?: number;
  penaltyNotes?: string;
  appealSubmitted?: boolean;
  appealDate?: string;
  appealReason?: string;
  appealStatus?: 'pending' | 'approved' | 'rejected';
  appealDecidedBy?: string; // Ref: User
  appealDecidedAt?: string;
  dailyHoursCompliant?: boolean;
  weeklyHoursCompliant?: boolean;
  maxDailyHours?: number;
  maxWeeklyHours?: number;
  actualDailyHours?: number;
  actualWeeklyHours?: number;
  fridayRestCompliant?: boolean;
  workedOnFriday?: boolean;
  restPeriodCompliant?: boolean;
  restPeriodMinutes?: number;
  requiredRestMinutes?: number;
  ramadanHoursApplied?: boolean;
  ramadanMaxHours?: number;
  overtimeCompliant?: boolean;
  monthlyOvertimeHours?: number;
  maxMonthlyOvertime?: number;
  isFullyCompliant?: boolean;
  violations?: string;
  checkedAt?: string;
  requestId?: string;
  requestedBy?: string; // Ref: User
  requestedAt?: string;
  field?: 'checkIn' | 'checkOut' | 'breaks' | 'overtime' | 'status' | 'other';
  reason?: string;
  reasonAr?: string;
  supportingDocument?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string; // Ref: User
  reviewedAt?: string;
  reviewNotes?: string;
  appliedAt?: string;
  type?: 'work_from_home' | 'field_work' | 'client_visit' | 'training' | 'conference' | 'flexible_hours' | 'shift_swap' | 'other';
  typeAr?: string;
  description?: string;
  descriptionAr?: string;
  startDate?: string;
  endDate?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
  attendanceId?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  employeeNumber?: string;
  department?: string;
  departmentAr?: string;
  position?: string;
  positionAr?: string;
  date?: string;
  dayOfWeek?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  dayOfWeekAr?: string;
  weekNumber?: number;
  month?: number;
  year?: number;
  isWeekend?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  holidayNameAr?: string;
  isRamadan?: boolean;
  shift?: 'regular' | 'morning' | 'evening' | 'night' | 'flexible' | 'split' | 'custom'; // Ref: Shift
  reason?: string;
  duration?: number;
  hours?: number;
  status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend' | 'work_from_home' | 'field_work' | 'training' | 'incomplete' | '// checked in but not out
            pending';
  statusAr?: string;
  statusDetails?: boolean;
  breakSummary?: number;
  violationSummary?: number;
  processed?: boolean;
  processedAt?: string;
  payrollRunId?: string; // Ref: PayrollRun
  regularPayHours?: number;
  overtimePayHours?: number;
  deductions?: number;
  additions?: number;
  notes?: string;
  notesAr?: string;
  managerNotes?: string;
  managerNotesAr?: string;
  systemNotes?: string;
  approval?: 'not_required' | 'pending' | 'approved' | 'rejected'; // Ref: User
  lastModifiedBy?: string; // Ref: User
  lastModifiedAt?: string;
  action?: string;
  field?: string;
  changedBy?: string; // Ref: User
  changedAt?: string;
  reason?: string;
  toJSON?: any;
  toObject?: any;
  date?: any;
  date?: any;
  absence?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  field: string;
  oldValue?: any;
  newValue?: any;
  userId: string; // Ref: User
  userEmail: string;
  userRole: 'client' | 'lawyer' | 'admin';
  userName?: string;
  action: '// CRUD operations
        create' | 'read' | 'update' | 'delete' | '// Document actions
        view_judgment' | 'download_judgment' | 'view_document' | 'download_document' | 'upload_document' | 'delete_document' | '// Case actions
        view_case' | 'create_case' | 'update_case' | 'delete_case' | '// Client actions
        create_client' | 'update_client' | 'delete_client' | 'view_client' | '// User actions
        view_profile' | 'update_profile' | 'delete_user' | 'ban_user' | 'unban_user' | 'verify_lawyer' | '// Payment/Invoice actions
        create_payment' | 'update_payment' | 'delete_payment' | 'refund_payment' | 'view_invoice' | 'create_invoice' | 'update_invoice' | 'delete_invoice' | 'generate_invoice' | 'send_invoice' | 'approve_invoice' | '// Admin actions
        view_all_users' | 'view_audit_logs' | 'system_settings' | 'data_export' | '// Authentication
        login_success' | 'login_failed' | 'logout' | 'password_reset' | 'password_change' | 'token_refresh' | 'two_factor_enable' | 'two_factor_disable' | '// Permission changes
        update_permissions' | 'update_role' | 'grant_access' | 'revoke_access' | '// Sensitive data access
        access_sensitive_data' | 'export_data' | 'bulk_export' | 'bulk_delete' | 'bulk_update' | '// Trust account operations
        trust_deposit' | 'trust_withdrawal' | 'trust_transfer' | '// Other operations
        share' | 'import' | 'approve' | 'reject' | '// Security events
        suspicious_activity' | 'session_hijack_attempt' | 'brute_force_detected';
  entityType?: string;
  resourceType?: string;
  entityId?: string;
  resourceId?: string;
  resourceName?: string;
  beforeState?: any;
  afterState?: any;
  details?: any;
  metadata?: any;
  ipAddress: string;
  userAgent?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  endpoint?: string;
  sessionId?: string;
  status?: 'success' | 'failed' | 'suspicious' | 'pending';
  errorMessage?: string;
  statusCode?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  integrity?: string;
  timestamp: string;
  action?: any;
  severity?: any;
  timestamp?: any;
  timestamp?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AutomatedAction {
  _id: string;
  name?: string;
  nameAr?: string;
  model_name?: string;
  trigger?: 'on_create' | 'on_write' | 'on_unlink' | 'on_time' | 'on_stage_change';
  trigger_field_ids?: string[];
  default?: any;
  priority?: any;
  filter_domain?: any;
  trg_date_id?: string;
  trg_date_range?: number;
  trg_date_range_type?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  action_type?: 'update_record' | 'create_activity' | 'send_email' | 'send_notification' | 'execute_code' | 'webhook';
  update_values?: any;
  activity_type_id?: string; // Ref: ActivityType
  activity_user_type?: 'specific_user' | 'record_owner' | 'activity_creator';
  activity_user_id?: string; // Ref: User
  type?: string;
  activity_note?: string;
  email_template_id?: string; // Ref: EmailTemplate
  notification_template?: string;
  type?: string;
  webhook_method?: 'POST' | 'PUT' | 'PATCH';
  code?: string;
  sequence?: number;
  isActive?: boolean;
  last_run?: string;
  run_count?: number;
  created_by: string; // Ref: User
  updated_by?: string; // Ref: User
  offset?: any;
  payload?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Automation {
  _id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in' | 'changed' | 'changed_to' | 'changed_from';
  value?: any;
  type: 'interval' | 'cron' | 'relative';
  value: string;
  timezone?: string;
  type: 'record_created' | 'record_updated' | 'field_changed' | 'time_based' | 'webhook' | 'form_submitted' | 'status_changed' | 'date_arrived';
  conditions?: any[];
  schedule?: any;
  watchFields?: string[];
  order: number;
  type: 'update_record' | 'create_record' | 'send_email' | 'send_notification' | 'create_task' | 'update_field' | 'call_webhook' | 'send_slack' | 'assign_to' | 'add_to_campaign' | 'create_activity' | 'delay';
  default?: any;
  update_record?: any;
  create_task?: any;
  call_webhook?: any;
  delay?: any;
  continueOnError?: boolean;
  enabled?: boolean;
  maxPerHour?: number;
  maxPerDay?: number;
  totalRuns?: number;
  successfulRuns?: number;
  failedRuns?: number;
  lastRun?: string;
  lastError?: string;
  lastErrorAt?: string;
  averageExecutionTime?: number;
  name?: string;
  description?: string;
  entityType?: 'lead' | 'deal' | 'contact' | 'case' | 'task' | 'invoice';
  enabled?: boolean;
  isActive?: boolean;
  trigger: any;
  validate?: any;
  rateLimit?: any;
  stats?: any;
  priority?: number;
  timeout?: number;
  tags?: string[];
  category?: string;
  version?: number;
  disabledAt?: string;
  disabledBy?: string; // Ref: User
  disabledReason?: string;
  toJSON?: any;
  toObject?: any;
  match?: any;
  totalAutomations?: any;
  sum?: any;
  disabledAutomations?: any;
  totalRuns?: any;
  successfulRuns?: any;
  failedRuns?: any;
  match?: any;
  count?: any;
  sum?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  slotDuration?: number;
  breakBetweenSlots?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  _id: string;
  provider?: '// International Providers
            plaid' | 'yodlee' | 'saltedge' | '// Regional Saudi/GCC Providers
            lean' | '// Lean Technologies - Saudi Arabia
            tarabut' | '// Tarabut Gateway - MENA
            fintech_galaxy' | '// Fintech Galaxy - GCC
            sama_open_banking' | '// SAMA Open Banking
            // Direct Bank APIs
            alrajhi_direct' | 'snb_direct' | 'riyad_direct' | 'sabb_direct' | 'alinma_direct' | 'fab_direct' | 'enbd_direct';
  institutionId?: string;
  institutionName?: string;
  institutionNameAr?: string;
  countryCode?: string;
  bicCode?: string;
  status?: 'connected' | 'disconnected' | 'error' | 'expired' | 'pending' | 'requires_reauth';
  lastSyncedAt?: string;
  expiresAt?: string;
  error?: string;
  errorCode?: string;
  accessToken?: string;
  refreshToken?: string;
  entityId?: string;
  consentId?: string;
  permissions?: string;
  accountNumber?: string;
  name: string;
  nameAr?: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan' | 'other';
  bankName?: string;
  bankCode?: string;
  currency?: string;
  balance?: number;
  availableBalance?: number;
  openingBalance?: number;
  isDefault?: boolean;
  isActive?: boolean;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  branchName?: string;
  branchCode?: string;
  accountHolder?: string;
  accountHolderAddress?: string;
  minBalance?: number;
  overdraftLimit?: number;
  interestRate?: number;
  description?: string;
  notes?: string;
  color?: string;
  icon?: string;
  lastSyncedAt?: string;
  group?: any;
  group?: any;
  project?: any;
  group?: any;
  project?: any;
  inc?: any;
  inc?: any;
  match?: any;
  sort?: any;
  lastBalance?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BankFeed {
  _id: string;
  date?: string;
  description?: string;
  amount?: string;
  reference?: string;
  type?: string;
  balance?: string;
  fileFormat?: 'csv' | 'ofx' | 'qif' | 'mt940';
  dateFormat?: string;
  delimiter?: string;
  columnMapping?: any;
  skipRows?: number;
  debitColumn?: string;
  creditColumn?: string;
  hasHeader?: boolean;
  encoding?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  itemId?: string;
  metadata?: any;
  bankAccountId: string; // Ref: BankAccount
  provider: '// Manual/Import
            manual' | 'csv_import' | 'ofx_import' | 'mt940_import' | '// International Providers
            plaid' | 'yodlee' | 'saltedge' | 'open_banking' | 'api' | '// Regional Saudi/GCC Providers
            lean' | '// Lean Technologies - Saudi Arabias leading open banking
            tarabut' | '// Tarabut Gateway - MENA region
            fintech_galaxy' | '// Fintech Galaxy - GCC aggregator
            sama_open_banking' | '// SAMA Open Banking - Saudi regulatory API
            // Direct Bank APIs (for banks with direct integration)
            alrajhi_direct' | '// Al Rajhi Bank direct API
            snb_direct' | '// Saudi National Bank direct API
            riyad_direct' | '// Riyad Bank direct API
            sabb_direct' | '// SABB direct API
            alinma_direct' | '// Alinma Bank direct API
            fab_direct' | '// First Abu Dhabi Bank direct API
            enbd_direct        // Emirates NBD direct API';
  bankIdentifier?: string;
  countryCode?: string;
  institutionId?: string;
  institutionName?: string;
  institutionNameAr?: string;
  name: string;
  description?: string;
  importSettings?: any;
  lastImportAt?: string;
  lastImportCount?: number;
  totalImported?: number;
  lastImportBatchId?: string;
  status?: 'active' | 'error' | 'disconnected' | 'pending';
  errorMessage?: string;
  errorCount?: number;
  lastErrorAt?: string;
  autoImport?: boolean;
  importFrequency?: 'manual' | 'daily' | 'weekly' | 'monthly';
  nextImportAt?: string;
  isActive?: boolean;
  nextImportAt?: any;
  totalFeeds?: any;
  sum?: any;
  sum?: any;
  totalImported?: any;
  avgImportCount?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BankMatchRule {
  _id: string;
  type?: 'exact' | 'range' | 'percentage';
  tolerance?: number;
  type?: 'exact' | 'range';
  daysTolerance?: number;
  type?: 'contains' | 'exact' | 'regex' | 'fuzzy' | 'starts_with' | 'ends_with';
  patterns?: string[];
  minSimilarity?: number;
  caseSensitive?: boolean;
  amountMatch?: any;
  dateMatch?: any;
  descriptionMatch?: any;
  referenceMatch?: boolean;
  vendorMatch?: boolean;
  clientMatch?: boolean;
  categoryMatch?: string;
  minAmount?: number;
  maxAmount?: number;
  transactionTypes?: 'credit' | 'debit'[];
  autoMatch?: boolean;
  autoReconcile?: boolean;
  autoCategory?: string;
  accountCode?: string;
  addTags?: string[];
  setPayee?: string;
  requireConfirmation?: boolean;
  name: string;
  description?: string;
  priority: number;
  isActive?: boolean;
  criteria: any;
  actions: any;
  matchType?: 'invoice' | 'expense' | 'payment' | 'bill' | 'transfer' | 'journal' | 'any';
  bankAccountIds?: string[]; // Ref: BankAccount
  timesMatched?: number;
  timesApplied?: number;
  lastMatchedAt?: string;
  successRate?: number;
  lastModifiedBy?: string; // Ref: User
  scores?: any;
  bankAccountIds?: any;
  totalRules?: any;
  sum?: any;
  totalMatches?: any;
  avgSuccessRate?: any;
  timesApplied?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BankReconciliation {
  _id: string;
  transactionId?: string; // Ref: BankTransaction
  amount?: number;
  date?: string;
  type?: 'credit' | 'debit';
  description?: string;
  isCleared?: boolean;
  clearedAt?: string;
  clearedBy?: string; // Ref: User
  reconciliationNumber?: string;
  accountId?: string; // Ref: BankAccount
  startDate?: string;
  endDate?: string;
  openingBalance?: number;
  closingBalance?: number;
  statementBalance?: number;
  difference?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  totalCredits?: number;
  totalDebits?: number;
  clearedCredits?: number;
  clearedDebits?: number;
  startedBy?: string; // Ref: User
  startedAt?: string;
  completedBy?: string; // Ref: User
  completedAt?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  notes?: string;
  createdAt?: any;
  date?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  _id: string;
  transactionId?: string;
  accountId: string; // Ref: BankAccount
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  balance?: number;
  description?: string;
  reference?: string;
  category?: string;
  payee?: string;
  matched?: boolean;
  matchedTransactionId?: string;
  matchedType?: 'Invoice' | 'Expense' | 'Payment' | 'BankTransfer';
  reconciliationId?: string; // Ref: BankReconciliation
  isReconciled?: boolean;
  reconciledAt?: string;
  importBatchId?: string;
  importSource?: 'manual' | 'csv' | 'ofx' | 'qif' | 'api' | 'sync';
  rawData?: any;
  notes?: string;
  createdAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionMatch {
  _id: string;
  matchType: 'invoice' | 'expense' | 'payment' | 'bill' | 'transfer' | 'journal';
  matchedRecordId: string;
  amount: number;
  description?: string;
  category?: string;
  bankTransactionId: string; // Ref: BankTransaction
  matchType: 'invoice' | 'expense' | 'payment' | 'bill' | 'transfer' | 'journal' | 'other';
  matchedRecordId?: string;
  matchScore: number;
  matchMethod: 'manual' | 'rule_based' | 'ai_suggested' | 'reference' | 'auto';
  matchedBy?: string; // Ref: User
  matchedAt?: string;
  ruleId?: string; // Ref: BankMatchRule
  status: 'suggested' | 'confirmed' | 'rejected' | 'auto_confirmed';
  isSplit?: boolean;
  splits?: any[];
  confidence?: 'low' | 'medium' | 'high' | 'exact';
  matchReasons?: string[];
  rejectionReason?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  notes?: string;
  metadata?: any;
  partialFilterExpression?: any;
  status?: any;
  totalMatches?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  avgScore?: any;
  splitMatches?: any;
  group?: any;
  count?: any;
  sum?: any;
  group?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransfer {
  _id: string;
  transferNumber?: string;
  fromAccountId: string; // Ref: BankAccount
  toAccountId: string; // Ref: BankAccount
  amount: number;
  fromCurrency?: string;
  toCurrency?: string;
  exchangeRate?: number;
  convertedAmount?: number;
  fee?: number;
  date: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  description?: string;
  notes?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  failureReason?: string;
  createdAt?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  _id: string;
  batchId?: string;
  batchNo?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  expiryDate?: string;
  manufactureDate?: string;
  supplier?: string; // Ref: Vendor
  reference?: string;
  qty?: number;
  status?: 'active' | 'expired' | 'depleted' | 'quarantine';
  toJSON?: any;
  toObject?: any;
  expiryDate?: any;
  expiryDate?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  _id: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total?: number;
  categoryId?: string;
  caseId?: string; // Ref: Case
  expenseAccountId?: string; // Ref: Account
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  action: 'created' | 'updated' | 'received' | 'paid' | 'partial_paid' | 'cancelled' | 'attachment_added' | 'attachment_removed';
  performedBy?: string; // Ref: User
  performedAt?: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval?: number;
  startDate: string;
  endDate?: string;
  nextBillDate?: string;
  autoGenerate?: boolean;
  autoSend?: boolean;
  isActive?: boolean;
  billNumber?: string;
  vendorId: string; // Ref: Vendor
  payableAccountId?: string; // Ref: Account
  type?: string;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountType?: 'fixed' | 'percentage' | 'null';
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  currency?: string;
  exchangeRate?: number;
  billDate: string;
  dueDate: string;
  paidDate?: string;
  status?: 'draft' | 'received' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  caseId?: string; // Ref: Case
  categoryId?: string;
  isRecurring?: boolean;
  parentBillId?: string; // Ref: Bill
  notes?: string;
  internalNotes?: string;
  reference?: string;
  createdAt?: any;
  group?: any;
  match?: any;
  group?: any;
  group?: any;
  project?: any;
  match?: any;
  group?: any;
  project?: any;
  status?: any;
  status?: any;
  dueDate?: any;
  details?: any;
  meta?: any;
  meta?: any;
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BillPayment {
  _id: string;
  paymentNumber?: string;
  billId: string; // Ref: Bill
  vendorId: string; // Ref: Vendor
  amount: number;
  currency?: string;
  paymentDate: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'credit_card' | 'debit_card' | 'online';
  bankAccountId?: string; // Ref: BankAccount
  reference?: string;
  checkNumber?: string;
  transactionId?: string;
  notes?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  failureReason?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt?: any;
  details?: any;
  inc?: any;
  details?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BillingActivity {
  _id: string;
  activityType: 'invoice_created' | 'invoice_updated' | 'invoice_sent' | 'invoice_viewed' | 'invoice_paid' | 'invoice_cancelled' | 'invoice_approved' | 'invoice_rejected' | 'payment_received' | 'payment_failed' | 'payment_refunded' | 'time_entry_created' | 'time_entry_updated' | 'time_entry_approved' | 'time_entry_rejected' | 'time_entry_invoiced' | 'expense_created' | 'expense_updated' | 'expense_approved' | 'expense_rejected' | 'expense_invoiced' | 'retainer_created' | 'retainer_consumed' | 'retainer_replenished' | 'retainer_refunded' | 'statement_generated' | 'statement_sent' | 'rate_changed' | 'bulk_operation';
  userId: string; // Ref: User
  clientId?: string; // Ref: User
  relatedModel?: 'Invoice' | 'Payment' | 'TimeEntry' | 'Expense' | 'Retainer' | 'Statement' | 'BillingRate';
  relatedId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  _id: string;
  subscriptionId?: string; // Ref: Subscription
  invoiceNumber?: string;
  subtotalCents: number;
  taxCents?: number;
  discountCents?: number;
  totalCents: number;
  currency?: string;
  status?: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  invoiceDate?: string;
  dueDate?: string;
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
  description?: string;
  quantity?: number;
  unitAmountCents?: number;
  amountCents?: number;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  notes?: string;
  attemptCount?: number;
  lastAttemptAt?: string;
  lastError?: string;
  pagination?: any;
  totalInvoices?: any;
  totalAmountCents?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  dueDate?: any;
  dueDate?: any;
  periodStart?: any;
  periodEnd?: any;
  dateToString?: any;
  dateToString?: any;
  dateToString?: any;
  dateToString?: any;
  group?: any;
  sort?: any;
  attemptCount?: any;
  lastError?: any;
  dates?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BillingRate {
  _id: string;
  rateType: 'standard' | 'custom_client' | 'custom_case_type' | 'activity_based';
  standardHourlyRate: number;
  clientId?: string; // Ref: User
  caseType?: string;
  activityCode?: 'court_appearance' | 'client_meeting' | 'research' | 'document_preparation' | 'phone_call' | 'email' | 'travel' | 'administrative' | 'other';
  customRate?: number;
  effectiveDate: string;
  endDate?: string;
  isActive?: boolean;
  currency?: string;
  notes?: string;
  effectiveDate?: any;
  endDate?: any;
  endDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Bin {
  _id: string;
  itemId: string; // Ref: Item
  warehouseId: string; // Ref: Warehouse
  actualQty?: number;
  plannedQty?: number;
  reservedQty?: number;
  orderedQty?: number;
  projectedQty?: number;
  indentedQty?: number;
  valuationRate?: number;
  stockValue?: number;
  toJSON?: any;
  toObject?: any;
  reorderLevel?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BiometricDevice {
  _id: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'fingerprint' | 'facial' | 'card_reader' | 'iris' | 'palm' | 'multi_modal';
  manufacturer?: 'zkteco' | 'suprema' | 'hikvision' | 'dahua' | 'generic';
  model?: string;
  serialNumber?: string;
  connection?: 'tcp' | 'usb' | 'api' | 'cloud';
  location?: number;
  status?: 'online' | 'offline' | 'maintenance' | 'error';
  lastHeartbeat?: string;
  lastSyncAt?: string;
  errorMessage?: string;
  capabilities?: boolean;
  verificationThreshold?: number;
  identificationThreshold?: number;
  allowFallback?: boolean;
  requirePhoto?: boolean;
  maxRetries?: number;
  timeoutSeconds?: number;
  workingHours?: string;
  stats?: number;
  isActive?: boolean;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BiometricEnrollment {
  _id: string;
  employeeId?: string; // Ref: Employee
  status?: 'pending' | 'enrolled' | 'failed' | 'expired' | 'revoked';
  enrolledAt?: string;
  expiresAt?: string;
  finger?: 'thumb_r' | 'index_r' | 'middle_r' | 'ring_r' | 'pinky_r' | 'thumb_l' | 'index_l' | 'middle_l' | 'ring_l' | 'pinky_l';
  quality?: number;
  deviceId?: string; // Ref: BiometricDevice
  enrolledAt?: string;
  facial?: string; // Ref: BiometricDevice
  card?: 'rfid' | 'nfc' | 'magnetic' | 'smartcard';
  pin?: number;
  type?: string[];
  enrolledBy?: string; // Ref: User
  revokedBy?: string; // Ref: User
  revokedAt?: string;
  revokeReason?: string;
  notes?: string;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BiometricLog {
  _id: string;
  employeeId?: string; // Ref: Employee
  deviceId?: string; // Ref: BiometricDevice
  eventType?: 'check_in' | 'check_out' | 'break_start' | 'break_end' | 'verify_success' | 'verify_fail' | 'identify_success' | 'identify_fail' | 'enrollment' | 'device_error' | 'spoofing_detected';
  verificationMethod?: 'fingerprint' | 'facial' | 'card' | 'pin' | 'multi' | 'manual' | 'mobile_gps';
  verification?: number;
  location?: any;
  capturedData?: any;
  attendanceRecordId?: string; // Ref: AttendanceRecord
  deviceInfo?: any;
  timestamp?: string;
  processedAt?: string;
  isProcessed?: boolean;
  eventType?: any;
  count?: any;
  avgVerificationTime?: any;
  successRate?: any;
  methods?: any;
  totalCount?: any;
  timestamp?: any;
  eventType?: any;
  timestamp?: any;
  match?: any;
  group?: any;
  project?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BlockComment {
  _id: string;
  blockId: string; // Ref: CaseNotionBlock
  pageId: string; // Ref: CaseNotionPage
  content: string;
  parentCommentId?: string; // Ref: BlockComment
  type?: string[];
  isResolved?: boolean;
  resolvedBy?: string; // Ref: User
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockConnection {
  _id: string;
  pageId: string; // Ref: CaseNotionPage
  sourceBlockId: string; // Ref: CaseNotionBlock
  targetBlockId: string; // Ref: CaseNotionBlock
  connectionType?: string;
  label?: string;
  color?: string;
  sourceHandle?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  targetHandle?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  pathType?: 'straight' | 'bezier' | 'smoothstep' | 'step';
  x?: number;
  y?: number;
  curvature?: number;
  strokeWidth?: number;
  animated?: boolean;
  markerStart?: 'none' | 'arrow' | 'arrowclosed' | 'circle' | 'diamond';
  markerEnd?: 'none' | 'arrow' | 'arrowclosed' | 'circle' | 'diamond';
  zIndex?: number;
  selectable?: boolean;
  deletable?: boolean;
  interactionWidth?: number;
  version?: number;
  addToSet?: any;
  addToSet?: any;
  pull?: any;
  pull?: any;
  pull?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedTime {
  _id: string;
  frequency: string;
  interval?: number;
  endDate?: string;
  type?: number;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: any;
  parentBlockId?: string; // Ref: BlockedTime
  startDateTime?: any;
  endDateTime?: any;
  startDateTime?: any;
  endDateTime?: any;
  startDateTime?: any;
  endDateTime?: any;
  startDateTime?: any;
  endDateTime?: any;
  startDateTime?: any;
  endDateTime?: any;
  endDateTime?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Bom {
  _id: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  qty: number;
  uom?: string;
  rate?: number;
  amount?: number;
  sourceWarehouse?: string; // Ref: Warehouse
  includeInManufacturing?: boolean;
  operation: string;
  operationAr?: string;
  workstation?: string; // Ref: Workstation
  timeInMins?: number;
  operatingCost?: number;
  description?: string;
  sequence?: number;
  bomId?: string;
  bomNumber?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  bomType?: 'standard' | 'template' | 'subcontract';
  quantity: number;
  uom?: string;
  isActive?: boolean;
  isDefault?: boolean;
  routingId?: string; // Ref: Routing
  totalCost?: number;
  remarks?: string;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Broker {
  _id: string;
  type?: string;
  value?: number;
  minimumCommission?: number;
  maximumCommission?: number;
  userId: string; // Ref: User
  brokerId?: string;
  name: string;
  displayName?: string;
  type: string;
  apiSupported?: boolean;
  apiConnected?: boolean;
  lastSyncAt?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  timezone?: string;
  defaultCurrency?: string;
  status?: string;
  isDefault?: boolean;
  website?: string;
  supportEmail?: string;
  supportPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  _id: string;
  accountId: string; // Ref: Account
  period?: number;
  budgetedAmount: number;
  departmentId?: string; // Ref: CostCenter
  costCenterId?: string; // Ref: CostCenter
  notes?: string;
  varianceThreshold?: number;
  budgetNumber?: string;
  fiscalYear?: number;
  name?: string;
  nameAr?: string;
  description?: string;
  periodType?: 'monthly' | 'quarterly' | 'annual';
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';
  startDate: string;
  endDate: string;
  departmentId?: string; // Ref: CostCenter
  costCenterId?: string; // Ref: CostCenter
  isMasterBudget?: boolean;
  varianceAlertThreshold?: number;
  varianceAlertType?: 'percentage' | 'amount';
  submittedBy?: string; // Ref: User
  submittedAt?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  closedBy?: string; // Ref: User
  closedAt?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
  notes?: string;
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  toJSON?: any;
  toObject?: any;
  match?: any;
  sum?: any;
  sum?: any;
  budget?: any;
  totals?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetEntry {
  _id: string;
  budgetId: string; // Ref: MatterBudget
  phaseId?: string;
  categoryId?: string;
  entryType: 'time' | 'expense';
  sourceId: string;
  sourceType: 'time_entry' | 'expense' | 'invoice_line';
  description: string;
  amount: number;
  date: string;
  staffId?: string; // Ref: User
  staffName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetTemplate {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  type: 'fixed' | 'time_based' | 'phased' | 'contingency' | 'hybrid';
  name?: string;
  nameAr?: string;
  budgetPercent?: number;
  order?: number;
  name?: string;
  nameAr?: string;
  code?: string;
  budgetPercent?: number;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuyingSettings {
  _id: string;
  defaultPurchaseUom?: string;
  purchaseOrderApprovalRequired?: boolean;
  autoCreatePurchaseReceipt?: boolean;
  defaultPaymentTerms?: string;
  maintainStockLedger?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationSession {
  _id: string;
  participantId: string; // Ref: User
  name?: string;
  nameAr?: string;
  role?: string;
  department?: string;
  isLeader?: boolean;
  rating: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  count?: number;
  targetPercentage?: number;
  actualPercentage?: number;
  withinTarget?: boolean;
  reviewId: string; // Ref: PerformanceReview
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  originalRating?: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  originalScore?: number;
  adjustedRating?: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  adjustedScore?: number;
  wasAdjusted?: boolean;
  adjustmentReason?: string;
  comparativeRanking?: number;
  discussionNotes?: string;
  adjustedBy?: string; // Ref: User
  adjustedAt?: string;
  sessionId: string;
  sessionName: string;
  sessionNameAr?: string;
  description?: string;
  descriptionAr?: string;
  periodYear: number;
  periodQuarter?: number;
  reviewType: 'annual' | 'mid_year' | 'quarterly' | 'probation' | 'project' | 'ad_hoc';
  departmentId?: string; // Ref: Department
  departmentName?: string;
  departmentNameAr?: string;
  departmentId?: string; // Ref: Department
  name?: string;
  nameAr?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  meetingLocation?: string;
  meetingLink?: string;
  facilitator?: string; // Ref: User
  type?: string[];
  totalReviewsCount?: number;
  targetDistribution?: number;
  enforceDistribution?: boolean;
  statistics?: number;
  topic?: string;
  notes?: string;
  decisions?: string;
  action?: string;
  assignee?: string;
  dueDate?: string;
  status?: 'pending' | 'completed';
  notes?: string;
  notesAr?: string;
  keyDecisions?: string;
  completedAt?: string;
  completedBy?: string; // Ref: User
  createdAt?: string;
  updatedAt?: string;
  scheduledDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  _id: string;
  campaignId: string;
  name: string;
  nameAr?: string;
  description?: string;
  type: string;
  channel?: string;
  startDate: string;
  endDate?: string;
  status?: string;
  budget?: number;
  targets?: number;
  utm?: string;
  parentCampaignId?: string; // Ref: Campaign
  ownerId: string; // Ref: User
  teamId?: string; // Ref: SalesTeam
  targetAudience?: string[];
  results?: number;
  emailSettings?: string; // Ref: EmailTemplate
  type?: string;
  notes?: string;
  customFields?: string;
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  integration?: 'synced' | 'pending' | 'failed' | 'never'[];
  launchedAt?: string;
  launchedBy?: string; // Ref: User
  completedAt?: string;
  completedBy?: string; // Ref: User
  createdAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  _id: string;
  contractId?: string; // Ref: Order
  clientId?: string; // Ref: Client
  clientName?: string;
  clientPhone?: string;
  title?: string;
  description?: string;
  category?: string;
  plaintiff?: string;
  company?: string;
  laborOfficeReferral?: boolean;
  employee?: 'definite' | 'indefinite' | 'part_time' | 'seasonal';
  employer?: any;
  type?: 'wages' | 'overtime' | 'end_of_service' | 'leave_balance' | 'work_injury' | 'wrongful_termination' | 'housing_allowance' | 'transport_allowance' | 'medical_insurance' | 'gosi_subscription' | 'certificate_of_experience' | 'contract_violation' | 'discrimination' | 'harassment';
  amount?: number;
  period?: string;
  description?: string;
  gosiComplaint?: boolean;
  isSmallClaim?: boolean;
  totalClaimAmount?: number;
  caseNumber?: string;
  entityType?: 'court' | 'committee' | 'arbitration';
  court?: string;
  committee?: 'banking' | 'securities' | 'insurance' | 'customs' | 'tax' | 'zakat' | 'real_estate' | 'competition' | 'capital_market' | 'intellectual_property' | 'null';
  arbitrationCenter?: 'scca' | 'sba_arbitration' | 'riyadh_chamber' | 'jeddah_chamber' | 'eastern_chamber' | 'gcc_commercial' | 'other' | 'null';
  region?: 'riyadh' | 'makkah' | 'madinah' | 'qassim' | 'eastern' | 'asir' | 'tabuk' | 'hail' | 'northern' | 'jazan' | 'najran' | 'baha' | 'jawf' | 'null';
  city?: string;
  circuitNumber?: string;
  judge?: string;
  nextHearing?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  progress?: number;
  status?: 'active' | 'closed' | 'appeal' | 'settlement' | 'on-hold' | 'completed' | 'won' | 'lost' | 'settled';
  outcome?: 'won' | 'lost' | 'settled' | 'ongoing';
  claimAmount?: number;
  expectedWinAmount?: number;
  event?: string;
  date?: string;
  type?: 'court' | 'filing' | 'deadline' | 'general';
  status?: 'upcoming' | 'completed';
  type?: string;
  amount?: number;
  period?: string;
  description?: string;
  text?: string;
  date?: string;
  createdAt?: string;
  isPrivate?: boolean;
  stageId?: string;
  filename?: string;
  url?: string;
  size?: number;
  filename?: string;
  url?: string;
  fileKey?: string;
  type?: string;
  size?: number;
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  category?: 'contract' | 'evidence' | 'correspondence' | 'pleading' | 'judgment' | 'other';
  bucket?: 'general' | 'judgments';
  description?: string;
  title?: string;
  titleAr?: string;
  content?: string;
  contentPlainText?: string;
  documentType?: 'legal_memo' | 'contract_draft' | 'pleading' | 'motion' | 'brief' | 'letter' | 'notice' | 'agreement' | 'report' | 'notes' | 'other';
  status?: 'draft' | 'review' | 'final' | 'archived';
  language?: 'ar' | 'en' | 'mixed';
  textDirection?: 'rtl' | 'ltr' | 'auto';
  version?: number;
  content?: string;
  version?: number;
  editedBy?: string; // Ref: User
  editedAt?: string;
  changeNote?: string;
  wordCount?: number;
  characterCount?: number;
  lastExportedAt?: string;
  lastExportFormat?: 'pdf' | 'docx' | 'latex' | 'html' | 'markdown';
  exportCount?: number;
  showOnCalendar?: boolean;
  calendarDate?: string;
  calendarColor?: string;
  lastEditedBy?: string; // Ref: User
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  location?: string;
  notes?: string;
  status?: 'scheduled' | 'attended' | 'missed';
  attended?: boolean;
  startDate?: string;
  endDate?: string;
  dateOpened?: string;
  dateClosed?: string;
  closedBy?: string; // Ref: User
  daysOpen?: number;
  status?: string;
  changedAt?: string;
  changedBy?: string; // Ref: User
  notes?: string;
  source?: 'platform' | 'external';
  internalReference?: string;
  filingDate?: string;
  caseSubject?: string;
  legalBasis?: string;
  powerOfAttorney?: 'general' | 'specific' | 'litigation' | 'null';
  caseNumber?: string;
  applicationNumber?: string;
  referenceNumber?: string;
  yearHijri?: string;
  yearGregorian?: number;
  filingDate?: string;
  filingDateHijri?: string;
  registrationDate?: string;
  mainClassification?: 'عامة' | 'جزائية' | 'أحوال_شخصية' | 'تجارية' | 'عمالية' | 'تنفيذ';
  mainClassificationEn?: 'general' | 'criminal' | 'personal_status' | 'commercial' | 'labor' | 'enforcement';
  subClassification?: string;
  caseType?: string;
  caseTypeCode?: string;
  court?: 'supreme' | 'appeal' | 'general' | 'criminal' | 'personal_status' | 'commercial' | 'labor' | 'enforcement';
  judicialPanel?: any;
  najizStatus?: 'pending_registration' | 'registered' | 'scheduled' | 'in_session' | 'postponed' | 'judgment_issued' | 'appealed' | 'final' | 'enforcement' | 'closed' | 'archived';
  status?: string;
  date?: string;
  notes?: string;
  sessionNumber?: number;
  date?: string;
  dateHijri?: string;
  time?: string;
  location?: string;
  type?: 'first_session' | 'follow_up' | 'judgment' | 'objection' | 'reconciliation';
  status?: 'scheduled' | 'held' | 'postponed' | 'cancelled';
  postponementReason?: string;
  nextSessionDate?: string;
  role?: string;
  name?: string;
  attended?: boolean;
  minutes?: string;
  decisions?: string;
  recordedBy?: string; // Ref: User
  judgment?: 'in_favor' | 'against' | 'partial' | 'dismissed' | 'settled';
  hasAppeal?: boolean;
  appealNumber?: string;
  appealDate?: string;
  appealDeadline?: string;
  appealCourt?: string;
  appealStatus?: 'filed' | 'under_review' | 'hearing_scheduled' | 'decided' | 'rejected' | 'accepted';
  appealResult?: string;
  supremeCourtReview?: boolean;
  eLitigation?: boolean[];
  lastSyncedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
  date?: string[];
  error?: string;
  type?: 'individual' | 'company' | 'government';
  nationalId?: string;
  identityType?: 'national_id' | 'iqama' | 'visitor_id' | 'gcc_id' | 'passport';
  fullNameArabic?: string;
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  familyName?: string;
  fullNameEnglish?: string;
  nationality?: string;
  gender?: 'male' | 'female';
  crNumber?: string;
  companyName?: string;
  companyNameEnglish?: string;
  unifiedNumber?: string;
  authorizedRepresentative?: any;
  phone?: string;
  email?: string;
  nationalAddress?: any;
  powerOfAttorney?: boolean;
  type?: 'individual' | 'company' | 'government';
  nationalId?: string;
  identityType?: 'national_id' | 'iqama' | 'visitor_id' | 'gcc_id' | 'passport';
  fullNameArabic?: string;
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  familyName?: string;
  fullNameEnglish?: string;
  nationality?: string;
  gender?: 'male' | 'female';
  crNumber?: string;
  companyName?: string;
  companyNameEnglish?: string;
  unifiedNumber?: string;
  authorizedRepresentative?: any;
  phone?: string;
  email?: string;
  nationalAddress?: any;
  powerOfAttorney?: boolean;
  responseStatus?: 'not_notified' | 'notified' | 'responded' | 'no_response';
  responseDate?: string;
  defenseStatement?: string;
  claimValue?: number;
  currency?: string;
  isAboveThreshold?: boolean;
  contract?: 'sale' | 'lease' | 'service' | 'partnership' | 'agency' | 'franchise' | 'construction' | 'other';
  bankingDetails?: any;
  bankruptcy?: 'protective_settlement' | 'financial_restructuring' | 'liquidation'[];
  preLitigationNotice?: boolean;
  attorneyRequired?: boolean;
  caseCategory?: 'marriage' | 'divorce' | 'custody' | 'alimony' | 'visitation' | 'inheritance' | 'guardianship' | 'waqf' | 'will';
  marriageInfo?: 'talaq' | 'khula' | 'judicial' | 'faskh';
  name?: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  currentCustodian?: string;
  requestedCustodian?: string;
  visitationSchedule?: string;
  travelPermission?: string;
  supportInfo?: 'child_support' | 'wife_support' | 'parent_support';
  inheritanceInfo?: boolean[];
  guardianshipInfo?: 'minor' | 'interdiction' | 'property';
  feeExempt?: boolean;
  hasEnforcementRequest?: boolean;
  enforcementRequest?: any;
  enforcementDocument?: 'judgment' | 'judicial_decision' | 'judicial_order' | 'cheque' | 'promissory_note' | 'bill_of_exchange' | 'notarized_contract' | 'settlement' | 'arbitration_award' | 'foreign_judgment';
  type?: 'notification' | 'publication' | 'service_suspension' | 'account_freeze' | 'asset_attachment' | 'travel_ban' | 'id_suspension' | 'property_seizure';
  date?: string;
  status?: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  details?: string;
  totalDue?: number;
  amountPaid?: number;
  remainingBalance?: number;
  dueDate?: string;
  amount?: number;
  paid?: boolean;
  paidDate?: string;
  ibanNumber?: string;
  debtorStatus?: boolean;
  isExempt?: boolean;
  exemptionReason?: string;
  filingFee?: 'sadad' | 'mada' | 'credit_card';
  type?: string;
  amount?: number;
  paidDate?: string;
  receiptNumber?: string;
  totalPaid?: number;
  calculatorUsed?: boolean;
  currentStage?: string;
  pipelineStage?: string;
  stageEnteredAt?: string;
  stage?: string;
  enteredAt?: string;
  exitedAt?: string;
  notes?: string;
  changedBy?: string; // Ref: User
  endDetails?: 'final_judgment' | 'settlement' | 'withdrawal' | 'dismissal' | 'reconciliation' | 'execution_complete' | 'other'; // Ref: User
  plaintiffName?: string;
  defendantName?: string;
  linkedCounts?: number;
  toJSON?: any;
  toObject?: any;
  match?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CaseAuditLog {
  _id: string;
  userId: string; // Ref: User
  action: 'create' | 'update' | 'delete' | 'view';
  resource: 'case' | 'document' | 'hearing' | 'note' | 'claim' | 'timeline';
  resourceId: string;
  caseId: string; // Ref: Case
  changes?: any;
  metadata?: any;
  pagination?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNotionBlock {
  _id: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
  type?: 'text' | 'mention' | 'equation';
  text?: any;
  mention?: 'user' | 'page' | 'date' | 'task' | 'case' | 'client';
  equation?: any;
  plainText?: string;
  headers?: string;
  hasHeaderRow?: boolean;
  hasHeaderColumn?: boolean;
  pageId: string; // Ref: CaseNotionPage
  type: string;
  properties?: any;
  parentId?: string; // Ref: CaseNotionBlock
  order?: number;
  indent?: number;
  isCollapsed?: boolean;
  isSyncedBlock?: boolean;
  syncedFromBlockId?: string; // Ref: CaseNotionBlock
  checked?: boolean;
  language?: string;
  icon?: string;
  color?: string;
  fileUrl?: string;
  fileName?: string;
  caption?: string;
  partyType?: string;
  statementDate?: string;
  evidenceType?: string;
  evidenceDate?: string;
  evidenceSource?: string;
  citationType?: string;
  citationReference?: string;
  eventDate?: string;
  eventType?: string;
  type?: string[];
  canvasX?: number;
  canvasY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  blockColor?: string;
  priority?: '...PRIORITY_LEVELS' | 'null';
  shapeType?: 'note' | 'rectangle' | 'ellipse' | 'diamond' | 'triangle' | 'hexagon' | 'star' | 'arrow' | 'line' | 'sticky' | 'frame' | 'image' | 'embed' | 'text_shape';
  angle?: number;
  opacity?: number;
  zIndex?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch' | 'none';
  roughness?: number;
  version?: number;
  versionNonce?: number;
  isFrame?: boolean;
  type?: string;
  frameName?: string;
  id?: string; // Ref: BlockConnection
  type?: 'arrow' | 'line' | 'text';
  id: string;
  position: 'top' | 'right' | 'bottom' | 'left' | 'center';
  type?: 'source' | 'target' | 'both';
  offsetX?: number;
  offsetY?: number;
  arrowStart?: 'none' | 'arrow' | 'triangle' | 'circle' | 'diamond' | 'bar';
  arrowEnd?: 'none' | 'arrow' | 'triangle' | 'circle' | 'diamond' | 'bar';
  x?: number;
  y?: number;
  linkedEventId?: string;
  linkedTaskId?: string; // Ref: Task
  linkedHearingId?: string;
  linkedDocumentId?: string;
  groupId?: string;
  groupName?: string;
  lockedBy?: string; // Ref: User
  lockedAt?: string;
  lastEditedBy?: string; // Ref: User
  lastEditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNotionDatabaseView {
  _id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'does_not_contain' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'is_within' | 'is_before' | 'is_after' | 'is_on_or_before' | 'is_on_or_after' | 'checkbox_is' | 'checkbox_is_not';
  value?: any;
  conjunction?: 'and' | 'or';
  field: string;
  direction?: 'asc' | 'desc';
  field: string;
  visible?: boolean;
  width?: number;
  order: number;
  field: string;
  hideEmpty?: boolean;
  type?: string;
  columnField: string;
  showColumnCount?: boolean;
  cardPreview?: 'none' | 'small' | 'medium' | 'large';
  columnWidth?: number;
  startField: string;
  endField: string;
  showToday?: boolean;
  defaultTimespan?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  colorByField?: string;
  dateField: string;
  endDateField?: string;
  showWeekends?: boolean;
  defaultView?: 'month' | 'week' | 'day' | 'agenda';
  firstDayOfWeek?: number;
  coverField?: string;
  cardSize?: 'small' | 'medium' | 'large';
  fitStyle?: 'cover' | 'contain' | 'fill';
  cardsPerRow?: number;
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter';
  xAxis: string;
  yAxis: string;
  aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median';
  groupBy?: string;
  showLegend?: boolean;
  showDataLabels?: boolean;
  compact?: boolean;
  showPreview?: boolean;
  previewLines?: number;
  name: string;
  field: string;
  relation: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percent_checked' | 'percent_unchecked' | 'count_unique';
  name: string;
  formula: string;
  resultType: 'number' | 'text' | 'date' | 'boolean';
  description?: string;
  field: string;
  type: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'range' | 'count_unique' | 'percent_empty' | 'percent_not_empty';
  type: 'tasks' | 'documents' | 'events' | 'reminders' | 'custom' | 'cases' | 'contacts' | 'invoices' | 'expenses' | 'time_entries';
  caseId?: string; // Ref: Case
  pageId: string; // Ref: CaseNotionPage
  caseId?: string; // Ref: Case
  name: string;
  description?: string;
  type: 'table' | 'board' | 'timeline' | 'calendar' | 'gallery' | 'list' | 'chart';
  isDefault?: boolean;
  dataSource: any;
  properties?: any[];
  sorts?: any[];
  filters?: any[];
  groupBy?: any;
  viewConfig?: any;
  type?: string;
  rollups?: any[];
  formulas?: any[];
  wrapCells?: boolean;
  showCalculations?: boolean;
  calculationConfig?: any[];
  order?: number;
  isLocked?: boolean;
  type?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  lastCached?: string;
  lastAccessedAt?: string;
  accessCount?: number;
  preferences?: 'compact' | 'normal' | 'comfortable';
  set?: any;
  view?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNotionPage {
  _id: string;
  type?: 'emoji' | 'file' | 'external';
  emoji?: string;
  url?: string;
  type?: 'external' | 'file' | 'gradient';
  url?: string;
  gradient?: string;
  pageId?: string; // Ref: CaseNotionPage
  blockId?: string;
  pageTitle?: string;
  userId?: string; // Ref: User
  permission?: 'view' | 'comment' | 'edit';
  name?: string;
  type?: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'person' | 'checkbox' | 'url' | 'email' | 'phone' | 'relation' | 'formula' | 'rollup';
  value?: string;
  color?: string;
  viewType?: 'table' | 'board' | 'timeline' | 'calendar' | 'gallery' | 'list' | 'chart';
  property?: string;
  direction?: 'asc' | 'desc';
  groupBy?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
  gridEnabled?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  gridColor?: string;
  snapToObjects?: boolean;
  snapDistance?: number;
  backgroundColor?: string;
  backgroundPattern?: 'none' | 'dots' | 'lines' | 'cross';
  minZoom?: number;
  maxZoom?: number;
  panBounds?: number;
  defaultStrokeColor?: string;
  defaultFillColor?: string;
  defaultStrokeWidth?: number;
  showOtherCursors?: boolean;
  showOtherSelections?: boolean;
  caseId: string; // Ref: Case
  title: string;
  titleAr?: string;
  pageType?: string;
  parentPageId?: string; // Ref: CaseNotionPage
  type?: string[];
  hasDatabase?: boolean;
  viewMode?: string;
  whiteboardConfig?: any;
  isTemplate?: boolean;
  templateCategory?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  isPublic?: boolean;
  version?: number;
  lastVersionAt?: string;
  lastEditedBy?: string; // Ref: User
  archivedAt?: string;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStageProgress {
  _id: string;
  stageId?: string;
  stageName?: string;
  enteredAt?: string;
  exitedAt?: string;
  completedBy?: string; // Ref: User
  notes?: string;
  duration?: number;
  stageId?: string;
  requirementId?: string;
  completedAt?: string;
  completedBy?: string; // Ref: User
  caseId: string; // Ref: Case
  workflowId: string; // Ref: WorkflowTemplate
  currentStageId: string;
  currentStageName?: string;
  startedAt?: string;
  completedAt?: string;
  totalDuration?: number;
  status?: 'active' | 'completed' | 'paused';
  push?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistory {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens?: number;
  userId: string; // Ref: User
  provider: 'anthropic' | 'openai';
  conversationId: string;
  title?: string;
  validate?: any;
  metadata?: any;
  status?: 'active' | 'archived';
  lastMessageAt?: string;
  totalTokens?: number;
  byRole?: any;
  title?: any;
  pagination?: any;
  match?: any;
  totalConversations?: any;
  sum?: any;
  sum?: any;
  totalMessages?: any;
  totalTokens?: any;
  sum?: any;
  sum?: any;
  updatedAt?: any;
  title?: any;
  pagination?: any;
  conversationId?: any;
  set?: any;
  group?: any;
  anthropic?: any;
  openai?: any;
  total?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChatterFollower {
  _id: string;
  res_model: string;
  res_id: string;
  user_id: string; // Ref: User
  notification_type?: 'all' | 'mentions' | 'none';
  follow_type?: 'manual' | 'auto_creator' | 'auto_assigned' | 'auto_mentioned';
  added_by?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface ChurnEvent {
  _id: string;
  eventType: 'churned' | 'downgraded' | 'paused' | 'reactivated' | 'expanded' | 'renewed';
  eventDate: string;
  preEventSnapshot?: any;
  reason?: 'price_too_high' | 'budget_cuts' | 'competitor' | 'product_fit' | 'missing_features' | 'poor_support' | 'technical_issues' | 'business_closed' | 'merger_acquisition' | 'internal_solution' | 'not_using' | 'contract_ended' | 'payment_failed' | 'other' | 'unknown';
  interventionType?: string;
  date?: string;
  channel?: 'email' | 'call' | 'meeting' | 'in_app' | 'offer';
  outcome?: 'no_response' | 'positive' | 'negative' | 'neutral';
  notes?: string;
  performedBy?: string; // Ref: User
  revenueImpact?: any;
  exitSurvey?: boolean;
  winBack?: boolean;
  recordedBy?: string; // Ref: User
  notes?: string;
  tags?: string;
  eventDate?: any;
  createdAt?: any;
  status?: any;
  period?: any;
  match?: any;
  group?: any;
  sort?: any;
  project?: any;
  match?: any;
  group?: any;
  project?: any;
  eventDate?: any;
  match?: any;
  group?: any;
  outcomes?: any;
  total?: any;
  sort?: any;
  project?: any;
  eventDate?: any;
  period?: any;
  revenueImpact?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  _id: string;
  clientNumber?: string;
  clientType?: 'individual' | 'company';
  nationalId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  gender?: 'male' | 'female' | 'null';
  nationality?: string;
  dateOfBirth?: string;
  dateOfBirthHijri?: string;
  idStatus?: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  salutationAr?: string;
  identityType?: string;
  iqamaNumber?: string;
  gccId?: string;
  gccCountry?: string;
  borderNumber?: string;
  visitorId?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  identityIssueDate?: string;
  identityExpiryDate?: string;
  placeOfBirth?: string;
  maritalStatus?: string;
  nationalityCode?: string;
  crNumber?: string;
  companyName?: string;
  companyNameEnglish?: string;
  unifiedNumber?: string;
  crStatus?: string;
  entityDuration?: number;
  capital?: number;
  companyPhone?: string;
  crIssueDate?: string;
  crExpiryDate?: string;
  mainActivity?: string;
  website?: string;
  ecommerceLink?: string;
  companyCity?: string;
  companyAddress?: string;
  name?: string;
  nationalId?: string;
  nationality?: string;
  share?: number;
  name?: string;
  nationalId?: string;
  position?: string;
  wathqVerified?: boolean;
  wathqVerifiedAt?: string;
  industry?: string;
  industryCode?: string;
  numberOfEmployees?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  annualRevenue?: number;
  annualRevenueRange?: 'under_100k' | '100k_500k' | '500k_1m' | '1m_5m' | '5m_10m' | '10m_50m' | '50m_plus';
  tradingCurrency?: string;
  legalRepresentative?: any;
  companyNameAr?: string;
  legalForm?: string;
  legalFormAr?: string;
  capitalCurrency?: string;
  authorizedPerson?: string;
  authorizedPersonAr?: string;
  authorizedPersonIdentityType?: string;
  authorizedPersonIdentityNumber?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  secondaryEmail?: string;
  preferredContact?: 'phone' | 'email' | 'whatsapp' | 'sms';
  preferredTime?: 'morning' | 'noon' | 'evening' | 'anytime';
  preferredLanguage?: 'ar' | 'en';
  address?: string;
  mailingAddress?: boolean;
  doNotContact?: boolean;
  doNotEmail?: boolean;
  doNotCall?: boolean;
  doNotSMS?: boolean;
  riskLevel?: string;
  conflictCheckStatus?: string;
  conflictNotes?: string;
  conflictCheckDate?: string;
  isVerified?: boolean;
  verificationSource?: string;
  verifiedAt?: string;
  powerOfAttorney?: 'notary' | 'embassy' | 'court' | 'other' | 'null';
  assignments?: string; // Ref: User
  clientSource?: 'website' | 'referral' | 'returning' | 'ads' | 'social' | 'walkin' | 'platform' | 'external' | 'cold_call' | 'event';
  referredBy?: string;
  referralCommission?: number;
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  accountManagerId?: string; // Ref: User
  platformUserId?: string; // Ref: User
  type?: 'hourly' | 'flat_fee' | 'contingency' | 'retainer';
  hourlyRate?: number;
  currency?: string;
  paymentTerms?: 'immediate' | 'net_15' | 'net_30' | 'net_45' | 'net_60';
  creditLimit?: number;
  creditBalance?: number;
  creditHold?: boolean;
  creditStatus?: 'good' | 'warning' | 'hold' | 'blacklisted';
  discount?: boolean;
  invoiceDelivery?: 'email' | 'mail' | 'hand';
  invoiceLanguage?: 'ar' | 'en' | 'both';
  vatRegistration?: boolean;
  employment?: boolean;
  emergencyContact?: any;
  notifications?: boolean;
  conflictCheck?: boolean; // Ref: User
  flags?: boolean;
  status?: 'active' | 'inactive' | 'archived' | 'pending';
  generalNotes?: string;
  internalNotes?: string;
  type?: string[];
  type?: string;
  convertedFromLead?: boolean;
  leadId?: string; // Ref: Lead
  convertedAt?: string;
  referralId?: string; // Ref: Referral
  referralName?: string;
  parentClientId?: string; // Ref: Client
  type?: string;
  accountFamily?: string;
  hierarchyLevel?: 'parent' | 'child' | 'standalone';
  businessIntelligence?: 'aaa' | 'aa' | 'a' | 'bbb' | 'bb' | 'b' | 'c' | 'unknown';
  clientSince?: string;
  dateOpened?: string;
  dateLastStageUpdate?: string;
  stage?: string;
  date?: string;
  changedBy?: string; // Ref: User
  notes?: string;
  sla?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'enterprise' | 'custom';
  campaignId?: string; // Ref: Campaign
  marketingScore?: number;
  engagementScore?: number;
  lastMarketingTouch?: string;
  campaignId?: string; // Ref: Campaign
  respondedAt?: string;
  response?: string;
  channel?: 'email' | 'sms' | 'phone' | 'social' | 'event' | 'web' | 'other';
  integration?: 'synced' | 'pending' | 'failed' | 'never'[];
  organizationId?: string; // Ref: Organization
  contactId?: string; // Ref: Contact
  lifetimeValue?: number;
  clientRating?: number;
  clientTier?: 'standard' | 'premium' | 'vip';
  lastContactedAt?: string;
  lastActivityAt?: string;
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  activityCount?: number;
  callCount?: number;
  emailCount?: number;
  meetingCount?: number;
  acquisitionCost?: number;
  firstPurchaseDate?: string;
  timezone?: string;
  totalCases?: number;
  activeCases?: number;
  totalInvoices?: number;
  totalPaid?: number;
  totalOutstanding?: number;
  lastInteraction?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  category?: 'id' | 'cr' | 'poa' | 'contract' | 'other';
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  customFields?: string;
  followUp?: 'phone' | 'email' | 'whatsapp' | 'meeting' | 'sms' | 'other'; // Ref: User
  match?: any;
  numericPart?: any;
  sort?: any;
  clientId?: any;
  clientId?: any;
  status?: any;
  fullNameArabic?: any;
  companyName?: any;
  email?: any;
  phone?: any;
  clientNumber?: any;
  nationalId?: any;
  crNumber?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ClientTrustBalance {
  _id: string;
  accountId: string; // Ref: TrustAccount
  clientId: string; // Ref: Client
  caseId?: string; // Ref: Case
  balance?: number;
  availableBalance?: number;
  pendingBalance?: number;
  lastTransaction?: string;
  lastTransactionType?: string;
  lastTransactionAmount?: number;
  inc?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPlan {
  _id: string;
  minValue: number;
  maxValue?: number;
  rate: number;
  flatAmount?: number;
  label?: string;
  labelAr?: string;
  productId?: string; // Ref: Product
  productCode?: string;
  productName?: string;
  rate: number;
  categoryId?: string; // Ref: ProductCategory
  categoryCode?: string;
  categoryName?: string;
  rate: number;
  achievementPercent: number;
  multiplier: number;
  bonusAmount?: number;
  label?: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  isActive?: boolean;
  isDefault?: boolean;
  priority?: number;
  planType: 'flat' | '// Fixed percentage on all sales
            tiered' | '// Tiered based on amount/achievement
            product_based' | '// Different rates per product/category
            target_based' | '// Based on target achievement
            margin_based' | '// Based on gross margin
            hybrid             // Combination';
  commissionBasis?: 'invoice_amount' | '// Commission on invoiced amount
            payment_received' | '// Commission when payment received
            order_amount' | '// Commission on order confirmation
            gross_profit' | '// Commission on margin
            net_profit          // Commission after all costs';
  includeShipping?: boolean;
  includeTax?: boolean;
  includeDiscounts?: boolean;
  flatRate?: number;
  tierBasis?: 'sales_amount' | 'units_sold' | 'achievement_percent';
  defaultProductRate?: number;
  targetPeriod?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  baseCommissionRate?: number;
  minimumAchievementPercent?: number;
  marginRate?: number;
  minimumMarginPercent?: number;
  minCommissionAmount?: number;
  maxCommissionAmount?: number;
  maxCommissionPerDeal?: number;
  enableTeamSplit?: boolean;
  role: string;
  sharePercent: number;
  enableManagerOverride?: boolean;
  managerOverridePercent?: number;
  enableClawback?: boolean;
  clawbackPeriodDays?: number;
  clawbackOnReturn?: boolean;
  clawbackOnNonPayment?: boolean;
  clawbackOnCancellation?: boolean;
  paymentTiming?: 'on_invoice' | '// When invoice is created
            on_payment' | '// When customer pays
            on_full_payment' | '// When fully paid
            end_of_period       // Settlement at period end';
  holdPeriodDays?: number;
  settlementFrequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  validFrom?: string;
  validTo?: string;
  currency?: string;
  notes?: string;
  termsAndConditions?: string;
  toJSON?: any;
  toObject?: any;
  validFrom?: any;
  applicableToSalesPersonIds?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSettlement {
  _id: string;
  sourceType: 'sales_order' | 'invoice' | 'payment' | 'subscription' | 'renewal' | 'upsell' | 'cross_sell';
  sourceId: string;
  sourceModel: 'SalesOrder' | 'Invoice' | 'Payment' | 'Subscription';
  sourceReference?: string;
  sourceDate?: string;
  customerId?: string; // Ref: Customer
  customerName?: string;
  productId?: string; // Ref: Product
  productName?: string;
  productCategory?: string;
  baseAmount: number;
  commissionableAmount: number;
  rate: number;
  rateType?: 'percentage' | 'fixed' | 'tiered' | 'marginal';
  calculatedAmount: number;
  planId?: string; // Ref: CommissionPlan
  planName?: string;
  tierName?: string;
  acceleratorApplied?: boolean;
  acceleratorMultiplier?: number;
  type: 'bonus' | 'penalty' | 'correction' | 'clawback' | 'split' | 'override' | 'manual';
  reason?: string;
  amount?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  notes?: string;
  splitPercentage?: number;
  splitFrom?: string; // Ref: User
  isManagerOverride?: boolean;
  overridePercentage?: number;
  finalAmount: number;
  status?: 'pending' | 'approved' | 'disputed' | 'clawback' | 'paid';
  clawbackEligible?: boolean;
  clawbackDeadline?: string;
  clawbackReason?: string;
  clawbackAmount?: number;
  notes?: string;
  targetType: 'revenue' | 'units' | 'deals' | 'margin' | 'new_customers' | 'retention';
  targetAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  tierReached?: string;
  acceleratorEarned?: number;
  bonusEarned?: number;
  periodStart?: string;
  periodEnd?: string;
  originalSettlementId?: string; // Ref: CommissionSettlement
  originalLineId?: string;
  sourceType?: string;
  sourceId?: string;
  sourceReference?: string;
  reason: 'customer_churn' | 'order_cancelled' | 'payment_reversed' | 'refund' | 'return' | 'fraud' | 'error_correction';
  description?: string;
  originalAmount: number;
  clawbackAmount: number;
  clawbackPercentage: number;
  eventDate?: string;
  processedAt?: string;
  processedBy?: string; // Ref: User
  status?: 'pending' | 'applied' | 'waived' | 'disputed';
  disputeReason?: string;
  disputeResolution?: string;
  waivedBy?: string; // Ref: User
  waivedReason?: string;
  step: number;
  role: 'manager' | 'finance' | 'hr' | 'director' | 'vp_sales' | 'cfo';
  approver?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  action?: 'approve' | 'reject' | 'request_changes' | 'escalate';
  actionDate?: string;
  comments?: string;
  changesRequested?: string;
  escalatedTo?: string; // Ref: User
  dueDate?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  settlementNumber: string;
  salespersonId: string; // Ref: User
  salespersonName?: string;
  salespersonEmail?: string;
  employeeId?: string;
  department?: string;
  team?: string;
  manager?: string; // Ref: User
  managerName?: string;
  periodType?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  planId?: string; // Ref: CommissionPlan
  planName?: string;
  planVersion?: string;
  summary?: number;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseCurrencyAmount?: number;
  status?: 'draft' | 'calculated' | 'pending_approval' | 'approved' | 'disputed' | 'processing_payment' | 'paid' | 'partially_paid' | 'cancelled';
  currentApprovalStep?: number;
  requiresApproval?: boolean;
  approvalThreshold?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  approverNotes?: string;
  disputeReason?: string;
  disputeDetails?: string;
  disputeRaisedBy?: string; // Ref: User
  disputeRaisedAt?: string;
  disputeResolvedBy?: string; // Ref: User
  disputeResolvedAt?: string;
  disputeResolution?: string;
  paymentMethod?: 'bank_transfer' | 'payroll' | 'check' | 'cash' | 'other';
  paymentReference?: string;
  paymentBatch?: string;
  scheduledPaymentDate?: string;
  actualPaymentDate?: string;
  paymentStatus?: 'not_scheduled' | 'scheduled' | 'processing' | 'completed' | 'failed';
  bankDetails?: any;
  statementGenerated?: boolean;
  statementUrl?: string;
  statementGeneratedAt?: string;
  statementSentAt?: string;
  statementSentTo?: string;
  calculatedAt?: string;
  calculatedBy?: string; // Ref: User
  calculationMethod?: 'automatic' | 'manual' | 'hybrid';
  lastRecalculatedAt?: string;
  recalculationReason?: string;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string; // Ref: User
  lockReason?: string;
  action?: 'created' | 'calculated' | 'recalculated' | 'submitted' | 'approved' | 'rejected' | 'disputed' | 'dispute_resolved' | 'payment_scheduled' | 'payment_processed' | 'payment_failed' | 'adjusted' | 'clawback_applied' | 'locked' | 'unlocked' | 'cancelled';
  performedBy?: string; // Ref: User
  performedAt?: string;
  details?: string;
  previousStatus?: string;
  newStatus?: string;
  previousAmount?: number;
  newAmount?: number;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  internalNotes?: string;
  name?: string;
  type?: 'statement' | 'calculation_detail' | 'supporting_doc' | 'dispute_doc' | 'approval_doc';
  url?: string;
  size?: number;
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  payrollSystemId?: string;
  erpSystemId?: string;
  exportedToPayroll?: boolean;
  exportedAt?: string;
  tags?: string;
  toJSON?: any;
  toObject?: any;
  periodStart?: any;
  periodEnd?: any;
  elemMatch?: any;
  paymentStatus?: any;
  match?: any;
  totalSettlements?: any;
  totalPayable?: any;
  totalPaid?: any;
  sum?: any;
  byStatus?: any;
  match?: any;
  month?: any;
  grossCommission?: any;
  netCommission?: any;
  paid?: any;
  clawbacks?: any;
  bonuses?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CompensationReward {
  _id: string;
  allowanceId?: string;
  allowanceType?: 'housing' | 'transportation' | 'mobile' | 'education' | 'meal' | 'clothing' | 'hazard' | 'technical' | 'responsibility' | 'travel' | 'remote_work' | 'shift' | 'overtime_base' | 'cost_of_living' | 'professional' | 'language' | 'relocation' | 'utilities' | 'other';
  allowanceName?: string;
  allowanceNameAr?: string;
  amount?: number;
  calculationType?: 'fixed' | 'percentage_of_basic' | 'percentage_of_gross' | 'daily_rate' | 'hourly_rate';
  percentage?: number;
  frequency?: string;
  taxable?: boolean;
  includedInGOSI?: boolean;
  includedInEOSB?: boolean;
  startDate?: string;
  endDate?: string;
  temporary?: boolean;
  eligibilityCriteria?: string;
  bonusId?: string;
  year?: number;
  fiscalYear?: string;
  targetBonus?: number;
  actualBonus?: number;
  payoutPercentage?: number;
  payoutDate?: string;
  performanceRating?: string;
  individualPerformance?: number;
  departmentPerformance?: number;
  companyPerformance?: number;
  paid?: boolean;
  notes?: string;
  changeId?: string;
  effectiveDate?: string;
  previousBasicSalary?: number;
  newBasicSalary?: number;
  previousGrossSalary?: number;
  grossSalary?: number;
  increaseAmount?: number;
  increasePercentage?: number;
  changeType?: 'new_hire' | 'merit_increase' | 'promotion' | 'demotion' | 'cost_of_living' | 'market_adjustment' | 'equity_adjustment' | 'annual_review' | 'probation_completion' | 'contract_renewal' | 'transfer' | 'retention' | 'reclassification' | 'correction' | 'other';
  changeReason?: string;
  performanceRating?: number;
  promotionToJobTitle?: string;
  promotionFromJobLevel?: string;
  promotionToJobLevel?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  annualizedImpact?: number;
  notes?: string;
  awardId?: string;
  programId?: string;
  programName?: string;
  programNameAr?: string;
  programType?: 'peer_recognition' | 'manager_recognition' | 'service_award' | 'performance_award' | 'innovation_award' | 'values_award' | 'spot_award' | 'other';
  awardName?: string;
  awardDate?: string;
  awardedBy?: string; // Ref: User
  awardCategory?: string;
  monetaryValue?: number;
  nonMonetaryBenefit?: string;
  rewardType?: 'certificate' | 'trophy' | 'gift' | 'points' | 'experience' | 'time_off' | 'cash';
  nominatedBy?: string;
  description?: string;
  publicRecognition?: boolean;
  certificateUrl?: string;
  awardId?: string;
  yearsOfService?: number;
  milestoneDate?: string;
  awardValue?: number;
  gift?: string;
  ceremonyHeld?: boolean;
  ceremonyDate?: string;
  documentId?: string;
  documentType?: 'employment_contract' | 'offer_letter' | 'salary_review_form' | 'increase_letter' | 'bonus_statement' | 'total_rewards_statement' | 'compensation_plan' | 'commission_agreement' | 'stock_option_agreement' | 'partner_agreement' | 'receipt' | 'other';
  documentName?: string;
  documentNameAr?: string;
  documentUrl?: string;
  version?: string;
  effectiveDate?: string;
  expiryDate?: string;
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  signed?: boolean;
  signedDate?: string;
  confidential?: boolean;
  loanId?: string;
  loanType?: string;
  monthlyDeduction?: number;
  remainingBalance?: number;
  startDate?: string;
  endDate?: string;
  deductionId?: string;
  deductionType?: 'loan_repayment' | 'advance_recovery' | 'pension_contribution' | 'savings_plan' | 'insurance_premium' | 'union_dues' | 'charity' | 'other';
  deductionName?: string;
  amount?: number;
  frequency?: 'monthly' | 'bi_weekly' | 'one_time';
  description?: string;
  startDate?: string;
  endDate?: string;
  relatedRecordId?: string;
  communicationId?: string;
  communicationType?: 'email' | 'letter' | 'meeting' | 'portal_notification';
  date?: string;
  purpose?: 'offer_letter' | 'salary_review' | 'increase_notification' | 'bonus_notification' | 'total_rewards_statement' | 'promotion_letter' | 'adjustment_notification' | 'other';
  subject?: string;
  sentTo?: string;
  sentBy?: string; // Ref: User
  attachments?: string;
  delivered?: boolean;
  acknowledged?: boolean;
  acknowledgmentDate?: string;
  clientId?: string;
  clientName?: string;
  creditPercentage?: number;
  ytdRevenue?: number;
  compensationId?: string;
  recordNumber?: string;
  officeId?: string; // Ref: Office
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  departmentId?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  positionId?: string;
  basicSalary?: number;
  totalAllowances?: number;
  grossSalary?: number;
  currency?: string;
  payGrade?: string;
  salaryRangeMin?: number;
  salaryRangeMid?: number;
  salaryRangeMax?: number;
  compaRatio?: number;
  compaRatioCategory?: 'below_range' | 'in_range_low' | 'in_range_mid' | 'in_range_high' | 'above_range';
  rangePenetration?: number;
  distanceToMidpoint?: any;
  distanceToMaximum?: any;
  status?: 'active' | 'pending' | 'historical' | 'cancelled';
  effectiveDate?: string;
  reviewDate?: string;
  nextReviewDate?: string;
  paymentFrequency?: 'monthly' | 'bi_weekly' | 'weekly';
  paymentMethod?: 'bank_transfer' | 'check' | 'cash';
  salaryBasis?: 'monthly' | 'hourly' | 'daily' | 'annual';
  hourlyRate?: number;
  dailyRate?: number;
  bankAccountNumber?: string;
  bankName?: string;
  iban?: string;
  employeeDetails?: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern' | 'consultant'; // Ref: Employee
  provided?: boolean;
  amount?: number;
  calculationType?: 'fixed' | 'percentage_of_basic';
  percentage?: number;
  companyProvided?: boolean;
  taxable?: boolean;
  includedInGOSI?: boolean;
  includedInEOSB?: boolean;
  rentSubsidy?: any;
  companyHousing?: 'apartment' | 'villa' | 'compound' | 'shared';
  transportationAllowance?: 'fixed' | 'percentage_of_basic';
  mobileAllowance?: any;
  provided?: boolean;
  totalAmount?: number;
  amountPerChild?: number;
  maxChildren?: number;
  eligibleDependents?: number;
  taxable?: boolean;
  includedInGOSI?: boolean;
  includedInEOSB?: boolean;
  dependentId?: string;
  dependentName?: string;
  age?: number;
  educationLevel?: 'kindergarten' | 'primary' | 'intermediate' | 'secondary' | 'university' | 'postgraduate';
  schoolName?: string;
  annualAllowance?: number;
  totalClaimed?: number;
  totalClaimed?: number;
  remainingAllowance?: number;
  mealAllowance?: boolean;
  eligibleForVariablePay?: boolean;
  eligible?: boolean;
  bonusType?: 'discretionary' | 'performance_based' | 'profit_sharing' | 'guaranteed';
  targetPercentage?: number;
  targetAmount?: number;
  maxPercentage?: number;
  maxAmount?: number;
  paymentSchedule?: string;
  paymentTiming?: 'calendar_year_end' | 'fiscal_year_end' | 'anniversary' | 'other';
  prorationRules?: 'full_year' | 'prorated' | 'not_eligible';
  performanceCriteria?: any;
  eligible?: boolean;
  commissionStructure?: 'percentage' | 'tiered' | 'flat_rate' | 'hybrid';
  commissionPlan?: string;
  commissionRate?: number;
  commissionBase?: 'revenue' | 'gross_profit' | 'net_profit' | 'billable_hours' | 'collections';
  tierNumber?: number;
  from?: number;
  to?: number;
  rate?: number;
  flatAmount?: number;
  draw?: 'recoverable' | 'non_recoverable';
  commissionCap?: 'monthly' | 'quarterly' | 'annual';
  paymentTiming?: 'upon_sale' | 'upon_invoice' | 'upon_collection' | 'monthly' | 'quarterly';
  ytdCommission?: number;
  lastYearCommission?: number;
  profitSharing?: 'equal' | 'proportional_to_salary' | 'performance_based' | 'tenure_based';
  stockOptions?: 'stock_options' | 'restricted_stock' | 'stock_appreciation_rights' | 'phantom_stock';
  eligible?: boolean;
  billableHoursBonus?: any;
  originationBonus?: 'upon_engagement' | 'upon_collection' | 'annual';
  realizationBonus?: any;
  caseSuccessBonus?: 'per_case' | 'percentage_of_recovery' | 'tiered';
  totalVariableTarget?: number;
  totalVariableActual?: number;
  variablePayRatio?: number;
  eligible?: boolean;
  endOfServiceBenefit?: any;
  retirementPlan?: 'defined_benefit' | 'defined_contribution' | 'hybrid';
  savingsPlan?: any;
  programId?: string;
  programName?: string;
  programType?: 'stock_options' | 'restricted_stock' | 'performance_shares' | 'phantom_stock' | 'sars' | 'retention_bonus' | 'deferred_compensation';
  awardValue?: number;
  grantDate?: string;
  vestingPeriod?: number;
  vestingType?: 'time_based' | 'performance_based' | 'hybrid';
  vestedValue?: number;
  unvestedValue?: number;
  status?: 'active' | 'vested' | 'forfeited' | 'cancelled';
  totalLTIValue?: number;
  attorneyCompensation?: 'salary' | 'salary_plus_bonus' | 'eat_what_you_kill' | 'hybrid' | 'lockstep' | 'modified_lockstep';
  eligibleForReview?: boolean;
  lastReviewDate?: string;
  nextReviewDate?: string;
  reviewCycle?: 'annual' | 'anniversary' | 'quarterly' | 'other';
  reviewOverdue?: boolean;
  reviewStatus?: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'implemented' | 'deferred' | 'declined';
  currentReview?: 'merit' | 'promotion' | 'market' | 'equity' | 'retention' | 'none'; // Ref: User
  approvedIncrease?: number;
  approvedPercentage?: number;
  approvalDate?: string;
  approvedBy?: string; // Ref: User
  implementationStatus?: 'pending' | 'processed' | 'paid';
  implementationDate?: string;
  managerRecommendation?: string;
  hrRecommendation?: string;
  budgetImpact?: number;
  communicated?: boolean;
  communicationDate?: string;
  communicationMethod?: 'meeting' | 'letter' | 'email';
  employeeAcknowledged?: boolean;
  acknowledgmentDate?: string;
  totalRewards?: 'significantly_below' | 'below' | 'competitive' | 'above' | 'significantly_above';
  marketPositioning?: 'significantly_below' | 'below' | 'competitive' | 'above' | 'significantly_above';
  internalEquity?: any;
  totalRecognitions?: number;
  totalAwardValue?: number;
  gosiEmployeeContribution?: number;
  gosiEmployerContribution?: number;
  gosiContributionBase?: number;
  gosiEmployeeRate?: number;
  gosiEmployerRate?: number;
  gosiRegistrationNumber?: string;
  incomeTax?: boolean;
  totalStatutoryDeductions?: number;
  totalVoluntaryDeductions?: number;
  totalDeductions?: number;
  netPay?: number;
  compliance?: boolean; // Ref: User
  taxAccounting?: 'monthly' | 'bi_weekly' | 'weekly';
  offerLetterSent?: boolean;
  offerLetterDate?: string;
  compensationStatementSent?: boolean;
  lastStatementDate?: string;
  increaseLetterSent?: boolean;
  increaseLetterDate?: string;
  notes?: any;
  costToCompany?: number;
  totalEmploymentCost?: number;
  costPerHour?: number;
  revenuePerEmployee?: number;
  revenuePerEmployeeCost?: number;
  laborCostRatio?: number;
  compensationIndex?: number;
  timeInGrade?: number;
  averageIncreasePerYear?: number;
  yearsToMidpoint?: number;
  yearsToMaximum?: number;
  vsCompanyAverage?: 'below' | 'average' | 'above';
  vsDepartmentAverage?: 'below' | 'average' | 'above';
  marketComparison?: any;
  equityAnalysis?: any;
  relatedRecords?: string[]; // Ref: Evaluation
  count?: any;
  averageSalary?: any;
  minSalary?: any;
  maxSalary?: any;
  averageCompaRatio?: any;
  sum?: any;
  sum?: any;
  totalPayroll?: any;
  sort?: any;
  totalRecords?: any;
  averageBasicSalary?: any;
  averageGrossSalary?: any;
  averageCompaRatio?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalPayroll?: any;
  minSalary?: any;
  maxSalary?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CompensatoryLeave {
  _id: string;
  compLeaveId?: string;
  employeeId?: string; // Ref: Employee
  leaveTypeId?: string; // Ref: LeaveType
  workDate?: string;
  workReason: 'holiday_work' | 'weekend_work' | 'overtime' | 'emergency' | 'project_deadline' | 'other';
  workReasonDetails?: string;
  hoursWorked: number;
  daysEarned: number;
  daysUsed?: number;
  daysRemaining?: number;
  daysExpired?: number;
  expiryDate: string;
  isExpired?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'partially_used' | 'fully_used' | 'expired' | 'cancelled';
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  leaveRequestId?: string; // Ref: LeaveRequest
  daysUsed?: number;
  usedOn?: string;
  usedBy?: string; // Ref: User
  holidayId?: string; // Ref: Holiday
  holidayName?: string;
  notes?: string;
  hrComments?: string;
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  inc?: any;
  match?: any;
  group?: any;
  status?: any;
  status?: any;
  expiryDate?: any;
  daysRemaining?: any;
  status?: any;
  expiryDate?: any;
  daysRemaining?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Competitor {
  _id: string;
  name: string;
  nameAr?: string;
  website?: string;
  description?: string;
  descriptionAr?: string;
  competitorType?: 'direct' | 'indirect' | 'potential';
  threatLevel?: 'low' | 'medium' | 'high';
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  pricing?: 'hourly' | 'fixed' | 'retainer' | 'hybrid' | 'unknown';
  marketShare?: number;
  type?: string[];
  type?: string[];
  stats?: number;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'archived';
  type?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAudit {
  _id: string;
  country?: string;
  city?: string;
  type?: number;
  validate?: any;
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: string; // Ref: User
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  geoLocation?: any;
  previousState?: any;
  newState?: any;
  changedFields?: string[];
  sensitivityLevel?: 'low' | 'medium' | 'high' | 'critical';
  regulatoryTags?: 'GDPR' | 'HIPAA' | 'SOC2' | 'ZATCA' | 'LABOR_LAW' | 'PDPL'[];
  checksum: string;
  previousLogHash?: string;
  retentionCategory?: string;
  expiresAt?: string;
  timestamp: string;
  sensitivityLevel?: any;
  expiresAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictCheck {
  _id: string;
  partySearched: string;
  matchedEntity: 'client' | 'contact' | 'organization' | 'case_party';
  matchScore: number;
  matchType: 'client' | 'adverse_party' | 'related_party' | 'witness' | 'previous_representation' | 'business_relationship' | 'family_relationship';
  severity: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
  caseId?: string;
  caseNumber?: string;
  caseName?: string;
  role?: string;
  status?: string;
  matterId?: string;
  matterNumber?: string;
  description?: string;
  notes?: string;
  resolution?: 'cleared' | 'flagged' | 'waived'; // Ref: User
  name: string;
  type?: 'individual' | 'organization';
  aliases?: string;
  type?: string;
  value?: string;
  relatedParties?: string;
  entityType: 'client' | 'case' | 'matter';
  entityId?: string;
  searchScope?: boolean;
  status?: 'pending' | 'cleared' | 'flagged' | 'waived';
  totalMatches?: number;
  clearanceNotes?: string;
  waiverDetails?: string; // Ref: User
  checkedBy?: string; // Ref: User
  matchedEntity?: any;
  matchedEntity?: any;
  matchedEntity?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Consent {
  _id: string;
  category: string;
  granted: boolean;
  version: string;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: 'explicit' | 'implicit' | 'withdrawal' | 'policy_update';
  userId: string; // Ref: User
  essential?: boolean;
  analytics?: boolean;
  marketing?: boolean;
  thirdParty?: boolean;
  aiProcessing?: boolean;
  communications?: boolean;
  policyVersion?: string;
  deletionRequest?: 'pending' | 'processing' | 'completed' | 'denied';
  exportRequest?: 'pending' | 'processing' | 'completed' | 'denied';
  lastReviewedAt?: string;
  nextReviewDue?: string;
  consents?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  _id: string;
  type?: 'work' | 'personal' | 'other';
  email?: string;
  isPrimary?: boolean;
  canContact?: boolean;
  type?: 'mobile' | 'work' | 'home' | 'fax' | 'other';
  number?: string;
  countryCode?: string;
  isPrimary?: boolean;
  canSMS?: boolean;
  canWhatsApp?: boolean;
  salutation?: 'mr' | 'mrs' | 'ms' | 'dr' | 'eng' | 'prof' | 'sheikh' | 'his_excellency' | 'her_excellency' | 'null';
  salutationAr?: 'السيد' | 'السيدة' | 'الآنسة' | 'الدكتور' | 'الدكتورة' | 'المهندس' | 'المهندسة' | 'الأستاذ' | 'الأستاذة' | 'الشيخ' | 'الشيخة' | 'صاحب السمو' | 'صاحبة السمو' | 'صاحب المعالي' | 'صاحبة المعالي' | 'null';
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  suffix?: string;
  nickname?: string;
  maidenName?: string;
  type?: string;
  arabicName?: string;
  fullNameArabic?: string;
  gender?: string;
  maritalStatus?: string;
  type?: 'individual' | 'organization' | 'court' | 'attorney' | 'expert' | 'government' | 'other';
  primaryRole?: 'client_contact' | 'opposing_party' | 'opposing_counsel' | 'witness' | 'expert_witness' | 'judge' | 'court_clerk' | 'mediator' | 'arbitrator' | 'referral_source' | 'vendor' | 'other' | 'null';
  type?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  mobile?: string;
  fax?: string;
  workEmail?: string;
  personalEmail?: string;
  workPhone?: string;
  homePhone?: string;
  mobile2?: string;
  pager?: string;
  skype?: string;
  zoomId?: string;
  whatsapp?: string;
  telegram?: string;
  website?: string;
  company?: string;
  organizationId?: string; // Ref: Organization
  title?: string;
  department?: string;
  role?: string;
  yearsInPosition?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'vp' | 'c_level' | 'executive' | 'owner';
  licenseType?: string;
  licenseNumber?: string;
  issuingBody?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: 'active' | 'expired' | 'suspended' | 'revoked';
  type?: string;
  reportsTo?: string; // Ref: Contact
  assistantName?: string;
  assistantPhone?: string;
  socialProfiles?: string;
  contactId?: string; // Ref: Contact
  relationshipType?: 'spouse' | 'parent' | 'child' | 'sibling' | 'colleague' | 'supervisor' | 'subordinate' | 'business_partner' | 'referral' | 'other';
  notes?: string;
  clientId?: string; // Ref: Client
  role?: 'primary_contact' | 'billing_contact' | 'technical_contact' | 'decision_maker' | 'influencer' | 'user' | 'executive_sponsor' | 'other';
  isPrimary?: boolean;
  startDate?: string;
  endDate?: string;
  influenceLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  decisionRole?: 'decision_maker' | 'influencer' | 'gatekeeper' | 'user' | 'technical_buyer' | 'economic_buyer' | 'champion' | 'blocker' | 'other';
  type?: string;
  type?: string;
  lastActivityDate?: string;
  leadSource?: string;
  campaignId?: string; // Ref: Campaign
  marketingScore?: number;
  engagementScore?: number;
  lastMarketingTouch?: string;
  campaignId?: string; // Ref: Campaign
  respondedAt?: string;
  response?: string;
  channel?: 'email' | 'sms' | 'phone' | 'social' | 'event' | 'web' | 'other';
  referralSource?: string;
  referredBy?: string; // Ref: Contact
  emailOptOut?: boolean;
  identityType?: string;
  type?: string;
  type?: string;
  gccId?: string;
  gccCountry?: 'UAE' | 'Kuwait' | 'Bahrain' | 'Oman' | 'Qatar' | 'null';
  borderNumber?: string;
  visitorId?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportIssuePlace?: string;
  identityIssueDate?: string;
  identityExpiryDate?: string;
  identityIssuePlace?: string;
  dateOfBirth?: string;
  dateOfBirthHijri?: string;
  placeOfBirth?: string;
  nationality?: string;
  nationalityCode?: string;
  sponsor?: string;
  address?: string;
  type?: string;
  streetName?: string;
  streetNameAr?: string;
  district?: string;
  districtAr?: string;
  city?: string;
  cityAr?: string;
  region?: string;
  regionCode?: '...REGION_CODES' | 'null';
  type?: string;
  type?: string;
  unitNumber?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
  isVerified?: boolean;
  verifiedAt?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  workAddress?: '...REGION_CODES' | 'null';
  poBox?: string;
  preferredLanguage?: 'ar' | 'en';
  preferredContactMethod?: 'email' | 'phone' | 'sms' | 'whatsapp' | 'in_person' | 'null';
  bestTimeToContact?: string;
  doNotContact?: boolean;
  doNotEmail?: boolean;
  doNotCall?: boolean;
  doNotSMS?: boolean;
  doNotMail?: boolean;
  emailOptIn?: boolean;
  smsOptIn?: boolean;
  newsletterSubscription?: boolean;
  communicationFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'as_needed';
  clientSince?: string;
  barAssociation?: string;
  licenseNumber?: string;
  creditStatus?: 'good' | 'fair' | 'poor' | 'no_credit' | 'unknown';
  paymentTerms?: 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90' | 'due_on_receipt' | 'custom';
  isBillingContact?: boolean;
  isPrimaryContact?: boolean;
  conflictCheckStatus?: 'not_checked' | 'clear' | 'potential_conflict' | 'confirmed_conflict';
  conflictNotes?: string;
  conflictCheckDate?: string;
  conflictCheckedBy?: string; // Ref: User
  status?: 'active' | 'inactive' | 'archived' | 'deceased';
  priority?: 'low' | 'normal' | 'high' | 'vip';
  vipStatus?: boolean;
  riskLevel?: 'low' | 'medium' | 'high' | 'null';
  isBlacklisted?: boolean;
  blacklistReason?: string;
  type?: string;
  type?: string;
  notes?: string;
  type?: string;
  type?: string;
  duplicateOf?: string; // Ref: Contact
  duplicateScore?: number;
  duplicateCheckedAt?: string;
  type?: string;
  mergedAt?: string;
  mergedBy?: string; // Ref: User
  isMaster?: boolean;
  enrichmentData?: any;
  businessIntelligence?: 'aaa' | 'aa' | 'a' | 'bbb' | 'bb' | 'b' | 'c' | 'unknown';
  integration?: 'synced' | 'pending' | 'failed' | 'never'[];
  communicationPreferences?: 'email' | 'phone' | 'whatsapp' | 'sms';
  customFields?: string;
  followUp?: 'phone' | 'email' | 'whatsapp' | 'meeting' | 'sms' | 'other'; // Ref: User
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  accountManagerId?: string; // Ref: User
  status?: any;
  firstName?: any;
  lastName?: any;
  fullNameArabic?: any;
  email?: any;
  phone?: any;
  company?: any;
  nationalId?: any;
  firstName?: any;
  lastName?: any;
  fullNameArabic?: any;
  email?: any;
  phone?: any;
  company?: any;
  firstName?: any;
  lastName?: any;
  fullNameArabic?: any;
  email?: any;
  phone?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ContactList {
  _id: string;
  entityType: 'lead' | 'contact' | 'client';
  entityId: string;
  email?: string;
  name?: string;
  status?: 'active' | 'unsubscribed' | 'bounced' | 'complained';
  addedAt?: string;
  addedBy?: string; // Ref: User
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty' | 'between';
  listId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  listType?: 'static' | 'dynamic';
  entityType?: 'lead' | 'contact' | 'client' | 'mixed';
  memberCount?: number;
  criteriaLogic?: 'and' | 'or';
  stats?: number;
  campaignId?: string; // Ref: Campaign
  campaignName?: string;
  usedAt?: string;
  status?: 'active' | 'inactive' | 'archived';
  isPrivate?: boolean;
  type?: string;
  type?: string[];
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  conversationID?: string;
  sellerID: string; // Ref: User
  buyerID: string; // Ref: User
  readBySeller: boolean;
  readByBuyer: boolean;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateCard {
  _id: string;
  transactionId: string;
  transactionDate: string;
  postingDate?: string;
  merchantName: string;
  merchantCategory?: string;
  merchantCategoryCode?: string;
  description?: string;
  amount: number;
  currency?: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  status?: 'pending' | 'matched' | 'reconciled' | 'disputed' | 'ignored';
  matchedExpenseId?: string; // Ref: Expense
  matchedBillId?: string; // Ref: Bill
  reconciledAt?: string;
  reconciledBy?: string; // Ref: User
  category?: string;
  categoryAr?: string;
  autoCategoirzed?: boolean;
  categoryConfidence?: number;
  isBillable?: boolean;
  clientId?: string; // Ref: Client
  caseId?: string; // Ref: Case
  disputeReason?: string;
  disputeStatus?: 'pending' | 'resolved' | 'won' | 'lost';
  disputeReference?: string;
  disputedAt?: string;
  disputeResolvedAt?: string;
  notes?: string;
  importedAt?: string;
  cardName: string;
  cardNameAr?: string;
  cardType: 'credit' | 'debit' | 'prepaid' | 'corporate' | 'virtual';
  cardBrand: 'visa' | 'mastercard' | 'amex' | 'mada' | 'other';
  cardNumber: string;
  issuingBank?: string;
  issuingBankAr?: string;
  cardHolderId?: string; // Ref: User
  cardHolderName?: string;
  departmentId?: string; // Ref: Department
  creditLimit?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  singleTransactionLimit?: number;
  currentBalance?: number;
  availableCredit?: number;
  pendingAmount?: number;
  billingCycle?: number;
  statementClosingDay?: number;
  linkedBankAccountId?: string; // Ref: BankAccount
  linkedGLAccountId?: string; // Ref: Account
  expensePolicyId?: string; // Ref: ExpensePolicy
  status?: 'active' | 'blocked' | 'expired' | 'cancelled' | 'pending_activation';
  expiryDate?: string;
  activatedAt?: string;
  blockedAt?: string;
  blockedBy?: string; // Ref: User
  blockReason?: string;
  lastSyncAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'error';
  syncError?: string;
  enabled?: boolean;
  merchantPattern?: string;
  category?: string;
  isBillable?: boolean;
  alerts?: number;
  stats?: number;
  notes?: string;
  internalNotes?: string;
  status?: any;
  match?: any;
  match?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenter {
  _id: string;
  code?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  type?: 'department' | 'project' | 'location' | 'practice_area' | 'custom';
  parentId?: string; // Ref: CostCenter
  isActive?: boolean;
  isGroup?: boolean;
  level?: number;
  path?: string;
  budgetAllocationPercentage?: number;
  annualBudget?: number;
  managerId?: string; // Ref: User
  budgetYear?: number;
  caseId?: string; // Ref: Case
  clientId?: string; // Ref: Client
  meta?: any;
  notes?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  status?: any;
  group?: any;
  period?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Counter {
  _id: string;
  seq?: number;
  inc?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreditNote {
  _id: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  originalInvoiceItemId?: string;
  creditNoteNumber: string;
  invoiceId: string; // Ref: Invoice
  invoiceNumber?: string;
  clientId: string; // Ref: Client
  clientName?: string;
  clientNameAr?: string;
  clientVatNumber?: string;
  caseId?: string; // Ref: Case
  creditNoteDate?: string;
  creditType: 'full' | 'partial';
  reasonCategory: 'error' | '// Billing error
            discount' | '// Post-sale discount
            return' | '// Service cancellation/return
            cancellation' | '// Contract cancellation
            adjustment' | '// Price adjustment
            duplicate' | '// Duplicate invoice
            other';
  reason?: string;
  reasonAr?: string;
  validate?: any;
  subtotal: number;
  discountTotal?: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  currency?: string;
  status?: 'draft' | 'issued' | 'applied' | 'void';
  zatcaSubmissionStatus?: 'not_required' | 'pending' | 'submitted' | 'accepted' | 'rejected' | 'warning';
  zatcaInvoiceHash?: string;
  zatcaQrCode?: string;
  zatcaUuid?: string;
  zatcaSubmittedAt?: string;
  zatcaResponse?: any;
  type?: string[];
  glEntryId?: string; // Ref: GeneralLedger
  journalEntryId?: string; // Ref: JournalEntry
  issuedAt?: string;
  issuedBy?: string; // Ref: User
  appliedAt?: string;
  appliedBy?: string; // Ref: User
  invoiceId?: string; // Ref: Invoice
  amount?: number;
  appliedAt?: string;
  voidedAt?: string;
  voidedBy?: string; // Ref: User
  voidReason?: string;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  name?: string;
  url?: string;
  uploadedAt?: string;
  action: string;
  performedBy?: string; // Ref: User
  performedAt?: string;
  details?: any;
  ipAddress?: string;
  creditNoteNumber?: any;
  details?: any;
  details?: any;
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  _id: string;
  type: 'user' | 'contact' | 'client' | 'lead';
  entityId: string;
  name?: string;
  email?: string;
  phone?: string;
  attended?: boolean;
  messageId?: string;
  threadId?: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  bodyPreview?: string;
  hasAttachments?: boolean;
  attachmentCount?: number;
  isIncoming?: boolean;
  opened?: boolean;
  openedAt?: string;
  openCount?: number;
  clicked?: boolean;
  clickedLinks?: string;
  replied?: boolean;
  repliedAt?: string;
  direction: 'inbound' | 'outbound';
  phoneNumber?: string;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
  outcome?: 'connected' | 'no_answer' | 'busy' | 'voicemail' | 'wrong_number' | 'callback_requested';
  recordingUrl?: string;
  transcription?: string;
  callNotes?: string;
  meetingType?: 'in_person' | 'video' | 'phone' | 'court' | 'consultation';
  location?: string;
  locationAr?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  actualDuration?: number;
  outcome?: 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  meetingUrl?: string;
  agenda?: string;
  summary?: string;
  nextSteps?: string;
  dueDate?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  completedBy?: string; // Ref: User
  reminderDate?: string;
  reminderSent?: boolean;
  activityId?: string;
  type: '// Communication
            call' | '// مكالمة
            email' | '// بريد إلكتروني
            sms' | '// رسالة نصية
            whatsapp' | '// واتساب
            meeting' | '// اجتماع

            // Actions
            note' | '// ملاحظة
            task' | '// مهمة
            document' | '// مستند
            proposal' | '// عرض سعر

            // Status changes
            status_change' | '// تغيير الحالة
            stage_change' | '// تغيير المرحلة
            assignment' | '// تعيين

            // Leads
            lead_created' | '// إنشاء عميل محتمل
            lead_updated' | '// تحديث عميل محتمل
            lead_converted' | '// تحويل العميل المحتمل
            lead_escalated' | '// تصعيد عميل محتمل
            lead_reengaged' | '// إعادة تفعيل عميل محتمل

            // Cases
            case_created' | '// إنشاء قضية
            case_updated' | '// تحديث قضية
            case_deleted' | '// حذف قضية
            case_created_from_lead' | '// إنشاء قضية من عميل محتمل
            case_won' | '// كسب قضية
            case_lost' | '// خسارة قضية
            stage_changed' | '// تغيير مرحلة

            // Appointments
            appointment_created' | '// إنشاء موعد
            appointment_updated' | '// تحديث موعد
            appointment_deleted' | '// حذف موعد
            appointment_cancelled' | '// إلغاء موعد
            appointment_completed' | '// إكمال موعد
            appointment_confirmed' | '// تأكيد موعد
            appointment_rescheduled' | '// إعادة جدولة موعد
            appointment_no_show' | '// عدم حضور
            appointment_synced' | '// مزامنة موعد

            // Sales Stages
            sales_stage_created' | '// إنشاء مرحلة مبيعات
            sales_stage_updated' | '// تحديث مرحلة مبيعات
            sales_stage_deleted' | '// حذف مرحلة مبيعات
            sales_stages_reordered' | '// إعادة ترتيب مراحل المبيعات

            // Lead Sources
            lead_source_created' | '// إنشاء مصدر عميل محتمل
            lead_source_updated' | '// تحديث مصدر عميل محتمل
            lead_source_deleted' | '// حذف مصدر عميل محتمل

            // Sales Persons
            sales_person_created' | '// إنشاء مندوب مبيعات
            sales_person_updated' | '// تحديث مندوب مبيعات
            sales_person_deleted' | '// حذف مندوب مبيعات

            // Settings
            settings_updated' | '// تحديث الإعدادات
            settings_reset' | '// إعادة تعيين الإعدادات

            // Other
            other';
  subType?: string;
  entityType: 'lead' | 'client' | 'contact' | 'case' | 'organization' | 'appointment' | 'sales_stage' | 'lead_source' | 'sales_person' | 'settings';
  entityId: string;
  entityName?: string;
  secondaryEntityType?: string;
  secondaryEntityId?: string;
  secondaryEntityName?: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
  performedBy: string; // Ref: User
  assignedTo?: string; // Ref: User
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  outcome?: string;
  outcomeNotes?: string;
  isPrivate?: boolean;
  type?: string;
  type?: string[];
  source?: 'manual' | 'email_sync' | 'calendar_sync' | 'phone_integration' | 'automation' | 'import';
  externalId?: string;
  createdAt?: any;
  group?: any;
  sort?: any;
  group?: any;
  sort?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CrmSettings {
  _id: string;
  allowDuplicateEmails?: boolean;
  allowDuplicatePhones?: boolean;
  autoCreateContact?: boolean;
  defaultLeadSource?: string; // Ref: LeadSource
  defaultAssignee?: string; // Ref: User
  leadScoringEnabled?: boolean;
  autoAssignmentEnabled?: boolean;
  autoAssignmentRule?: 'round_robin' | 'load_balance' | 'territory';
  trackFirstResponseTime?: boolean;
  autoCloseAfterDays?: number;
  autoCloseEnabled?: boolean;
  requireConflictCheck?: boolean;
  conflictCheckBeforeStage?: string; // Ref: SalesStage
  defaultPipeline?: string;
  defaultSalesStage?: string; // Ref: SalesStage
  autoCreateQuoteOnQualified?: boolean;
  defaultValidDays?: number;
  autoSendReminder?: boolean;
  reminderDaysBefore?: number;
  requireApproval?: boolean;
  approvalThreshold?: number;
  type?: string[];
  carryForwardCommunication?: boolean;
  updateTimestampOnCommunication?: boolean;
  autoLogEmails?: boolean;
  autoLogCalls?: boolean;
  autoLogWhatsApp?: boolean;
  defaultEmailTemplateId?: string;
  defaultSMSTemplateId?: string;
  enabled?: boolean;
  start?: string;
  end?: string;
  enabled?: boolean;
  defaultDuration?: number;
  allowedDurations?: number[];
  advanceBookingDays?: number;
  minAdvanceBookingHours?: number;
  type?: string[];
  holidayListId?: string;
  bufferBetweenAppointments?: number;
  sunday?: any;
  monday?: any;
  tuesday?: any;
  wednesday?: any;
  thursday?: any;
  friday?: any;
  saturday?: any;
  sendReminders?: boolean;
  reminderHoursBefore?: number[];
  publicBookingEnabled?: boolean;
  publicBookingUrl?: string;
  requirePhoneVerification?: boolean;
  campaignNamingBy?: 'name' | 'series';
  leadPrefix?: string;
  casePrefix?: string;
  quotePrefix?: string;
  contractPrefix?: string;
  appointmentPrefix?: string;
  numberFormat?: 'YYYY-####' | 'YYMM-####' | '####';
  resetNumberingYearly?: boolean;
  enabled?: boolean;
  defaultTerritory?: string; // Ref: Territory
  autoAssignByTerritory?: boolean;
  requireTerritoryOnLead?: boolean;
  requireTerritoryOnCase?: boolean;
  hierarchyEnabled?: boolean;
  commissionTrackingEnabled?: boolean;
  targetTrackingEnabled?: boolean;
  requireSalesPersonOnCase?: boolean;
  defaultCommissionRate?: number;
  autoCreateCaseOnConsultation?: boolean;
  requireBANTBeforeCase?: boolean;
  autoCreateQuoteOnQualified?: boolean;
  autoCreateSalesOrderOnAccept?: boolean;
  linkSalesOrderToFinance?: boolean;
  autoCreateClientOnSalesOrder?: boolean;
  clientCreationTrigger?: 'sales_order' | 'payment_received' | 'manual';
  copyNotesToCase?: boolean;
  copyActivityHistory?: boolean;
  copyDocuments?: boolean;
  leadSettings?: any;
  caseSettings?: any;
  quoteSettings?: any;
  communicationSettings?: any;
  appointmentSettings?: any;
  namingSettings?: any;
  territorySettings?: any;
  salesPersonSettings?: any;
  conversionSettings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CrmSetup {
  _id: string;
  code: string;
  name: string;
  nameAr?: string;
  category?: 'digital' | 'referral' | 'direct' | 'event' | 'other';
  trackingEnabled?: boolean;
  isActive?: boolean;
  order?: number;
  code: string;
  name: string;
  nameAr?: string;
  color?: string;
  probability?: number;
  rottenDays?: number;
  order?: number;
  isInitial?: boolean;
  isFinal?: boolean;
  requiresReason?: boolean;
  type?: string[];
  code: string;
  name: string;
  nameAr?: string;
  icon?: string;
  color?: string;
  category?: 'communication' | 'meeting' | 'task' | 'document' | 'system';
  defaultDuration?: number;
  countsAsContact?: boolean;
  isActive?: boolean;
  order?: number;
  code: string;
  reason: string;
  reasonAr?: string;
  category?: 'price' | 'competitor' | 'timing' | 'fit' | 'internal' | 'other';
  requiresNotes?: boolean;
  isActive?: boolean;
  order?: number;
  name: string;
  nameAr?: string;
  ruleType?: 'opposing_party' | 'same_matter' | 'related_party' | 'industry' | 'custom';
  severity?: 'block' | 'warn' | 'info';
  checkAgainst?: 'clients' | 'leads' | 'cases' | 'all';
  autoCheck?: boolean;
  requiresWaiver?: boolean;
  isActive?: boolean;
  sources?: any[];
  trackUTM?: boolean;
  requireSource?: boolean;
  defaultSource?: string;
  leadScoring?: boolean;
  defaultPipelineId?: string; // Ref: Pipeline
  stages?: any[];
  defaultRottenDays?: number;
  requireLostReason?: boolean;
  lostReasons?: any[];
  assignmentSettings?: 'manual' | 'round_robin' | 'least_loaded' | 'territory' | 'skill_based'; // Ref: User
  useBANT?: boolean;
  budgetOptions?: string[];
  budgetThresholds?: number;
  authorityOptions?: string[];
  needOptions?: string[];
  timelineOptions?: string[];
  requireAllForQualified?: boolean;
  minimumFieldsForQualified?: number;
  types?: any[];
  defaultActivityType?: string;
  requireNotes?: boolean;
  trackDuration?: boolean;
  enabled?: boolean;
  autoCheckOnLeadCreate?: boolean;
  autoCheckOnConvert?: boolean;
  rules?: any[];
  matchFields?: string[];
  requireWaiverForBlock?: boolean;
  waiverApproverRoles?: string[];
  conflictCooldownDays?: number;
  intakeSettings?: boolean; // Ref: IntakeForm
  notificationSettings?: boolean;
  currentStep?: number;
  type?: number[];
  setupCompleted?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  budget?: any;
  authority?: any;
  need?: any;
  timeline?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CrmTransaction {
  _id: string;
  type: '// Lead lifecycle
            lead_created' | 'lead_updated' | 'lead_viewed' | 'lead_assigned' | 'lead_qualified' | 'lead_disqualified' | 'lead_converted' | 'lead_lost' | 'lead_reopened' | 'lead_merged' | 'lead_duplicated' | '// Contact events
            contact_created' | 'contact_updated' | 'contact_linked' | 'contact_unlinked' | '// Organization events
            org_created' | 'org_updated' | 'org_linked' | '// Stage/Pipeline events
            stage_changed' | 'stage_entered' | 'stage_exited' | 'pipeline_changed' | 'probability_updated' | '// Deal events
            deal_created' | 'deal_updated' | 'deal_won' | 'deal_lost' | 'deal_value_changed' | 'deal_close_date_changed' | '// Activity events
            activity_created' | 'activity_completed' | 'activity_cancelled' | 'call_logged' | 'email_logged' | 'meeting_logged' | 'note_added' | '// Communication events
            email_sent' | 'email_opened' | 'email_clicked' | 'email_bounced' | 'sms_sent' | 'whatsapp_sent' | '// Quote events
            quote_created' | 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_rejected' | 'quote_expired' | '// Campaign events
            campaign_enrolled' | 'campaign_completed' | 'campaign_removed' | '// Scoring events
            score_updated' | 'grade_changed' | 'temperature_changed' | '// Duplicate events
            duplicate_detected' | 'duplicate_merged' | 'duplicate_dismissed' | '// Assignment events
            assigned' | 'reassigned' | 'unassigned' | '// Custom events
            custom_event';
  category: 'lead' | 'contact' | 'organization' | 'activity' | 'deal' | 'quote' | 'campaign' | 'scoring' | 'duplicate' | 'assignment' | 'system';
  entityType: 'lead' | 'contact' | 'organization' | 'activity' | 'quote' | 'campaign' | 'case';
  entityId: string;
  entityName?: string;
  description?: string;
  descriptionAr?: string;
  value?: number;
  previousValue?: number;
  valueDelta?: number;
  currency?: string;
  fromStage?: string; // Ref: PipelineStage
  toStage?: string; // Ref: PipelineStage
  timeInPreviousStage?: number;
  field?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  relationship?: string;
  performedBy?: string; // Ref: User
  performedByName?: string;
  source?: 'web' | 'mobile' | 'api' | 'automation' | 'import' | 'system' | 'integration';
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  isSystemEvent?: boolean;
  isVisible?: boolean;
  toJSON?: any;
  toObject?: any;
  count?: any;
  totalValue?: any;
  sort?: any;
  createdAt?: any;
  type?: any;
  value?: any;
  count?: any;
  totalValue?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CustomField {
  _id: string;
  name: string;
  nameAr?: string;
  fieldKey: string;
  description?: string;
  entityType: 'client' | 'case' | 'invoice' | 'contact' | 'lead' | 'deal' | 'task' | 'project' | 'document' | 'expense' | 'bill' | 'payment';
  fieldType: 'text' | '// Short text input
            textarea' | '// Long text input
            number' | '// Numeric input
            decimal' | '// Decimal number
            date' | '// Date picker
            datetime' | '// Date and time picker
            boolean' | '// Checkbox/toggle
            select' | '// Single select dropdown
            multiselect' | '// Multiple select
            email' | '// Email input
            phone' | '// Phone number input
            url' | '// URL input
            currency' | '// Currency input
            file' | '// File upload
            user' | '// User reference
            client' | '// Client reference
            case' | '// Case reference
            contact         // Contact reference';
  label: string;
  labelAr?: string;
  value: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  isRequired?: boolean;
  isUnique?: boolean;
  validation?: any;
  fieldKey: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  condition?: any;
  validation?: any;
  isSearchable?: boolean;
  isFilterable?: boolean;
  showInList?: boolean;
  showInDetail?: boolean;
  showInCreate?: boolean;
  showInEdit?: boolean;
  order?: number;
  group?: string;
  placeholder?: string;
  placeholderAr?: string;
  helpText?: string;
  helpTextAr?: string;
  isComputed?: boolean;
  formula?: string;
  isActive?: boolean;
  isSystem?: boolean;
  valid?: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  _id: string;
  fieldId: string; // Ref: CustomField
  entityType: 'client' | 'case' | 'invoice' | 'contact' | 'lead' | 'deal' | 'task' | 'project' | 'document' | 'expense' | 'bill' | 'payment';
  entityId: string;
  value?: any;
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueBoolean?: boolean;
  type?: string;
  valueRef?: string;
  updatedAt?: string;
  entityId?: any;
  set?: any;
  setOnInsert?: any;
  filter?: any;
  update?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerHealthScore {
  _id: string;
  healthScore: number;
  previousScore?: number;
  scoreChange?: number;
  riskTier: 'healthy' | 'warning' | 'atRisk' | 'critical';
  previousRiskTier?: 'healthy' | 'warning' | 'atRisk' | 'critical';
  usage?: number;
  financial?: number;
  engagement?: number;
  contract?: number;
  trend?: 'improving' | 'stable' | 'declining';
  churnProbability?: number;
  predictedChurnDate?: string;
  confidence?: 'low' | 'medium' | 'high';
  factor?: string;
  category?: 'usage' | 'financial' | 'engagement' | 'contract';
  impact?: number;
  recommendation?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  triggeredAt?: string;
  status?: 'pending' | 'sent' | 'completed' | 'failed';
  outcome?: string;
  notes?: string;
  modelVersion?: string;
  dataQuality?: number;
  dataCompleteness?: any;
  calculatedAt?: string;
  nextCalculation?: string;
  riskTier?: any;
  sort?: any;
  group?: any;
  group?: any;
  sort?: any;
  match?: any;
  sort?: any;
  group?: any;
  match?: any;
  project?: any;
  sort?: any;
  sort?: any;
  group?: any;
  replaceRoot?: any;
  churnProbability?: any;
  healthScore?: any;
  lookup?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Cycle {
  _id: string;
  description: string;
  completed?: boolean;
  completedAt?: string;
  name: string;
  teamId: string; // Ref: Team
  duration?: number;
  startDate: string;
  endDate: string;
  status?: 'upcoming' | 'active' | 'completed';
  autoStart?: boolean;
  autoRollover?: boolean;
  cooldownDays?: number;
  metrics?: number;
  metrics?: any;
  goals?: any;
  items?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSettings {
  _id: string;
  viewMode?: 'basic' | 'advanced';
  type?: string;
  type?: string;
  defaultPeriod?: 'week' | 'month' | 'quarter' | 'year';
  preferredChartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  defaultSort?: 'asc' | 'desc';
  pageSize?: number;
  format?: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeSummary?: boolean;
  emailOnGeneration?: boolean;
  reportType?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  type?: string[];
  enabled?: boolean;
  email?: boolean;
  push?: boolean;
  inApp?: boolean;
  newLead?: boolean;
  leadScoreChange?: boolean;
  dealWon?: boolean;
  dealLost?: boolean;
  quoteExpiring?: boolean;
  orderStatusChange?: boolean;
  paymentReceived?: boolean;
  taskDue?: boolean;
  targetProgress?: boolean;
  userId: string; // Ref: User
  globalViewMode?: 'basic' | 'advanced';
  crm?: any;
  sales?: any;
  finance?: any;
  hr?: any;
  cases?: any;
  reports?: any;
  notifications?: any;
  defaultModule?: 'dashboard' | 'crm' | 'sales' | 'finance' | 'hr' | 'cases';
  widgetId?: string;
  position?: number;
  visible?: boolean;
  showWelcomeCard?: boolean;
  showQuickActions?: boolean;
  showRecentActivity?: boolean;
  name?: string;
  isDefault?: boolean;
  name?: string;
  isDefault?: boolean;
  name?: string;
  isDefault?: boolean;
  name?: string;
  isDefault?: boolean;
  onboarding?: boolean[];
  accessibility?: 'small' | 'medium' | 'large';
  keyboardShortcuts?: boolean;
  lastModifiedAt?: string;
  version?: number;
  toJSON?: any;
  toObject?: any;
  crm?: any;
  sales?: any;
  finance?: any;
  set?: any;
  inc?: any;
  set?: any;
  inc?: any;
  addToSet?: any;
  set?: any;
  inc?: any;
  set?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  _id: string;
  type: 'metric' | 'chart' | 'table' | 'list';
  title: string;
  titleAr?: string;
  reportType: string;
  config?: any;
  size?: 'small' | 'medium' | 'large' | 'full';
  position?: number;
  refreshInterval?: number;
  isVisible?: boolean;
  order?: number;
  config?: any;
  position?: any;
  config?: any;
  position?: any;
  config?: any;
  position?: any;
  config?: any;
  position?: any;
  config?: any;
  position?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DealRoom {
  _id: string;
  id?: string;
  title: string;
  content?: any;
  updatedAt?: string;
  version?: number;
  userId: string; // Ref: User
  viewedAt?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string; // Ref: User
  uploadedAt?: string;
  email: string;
  name: string;
  company?: string;
  accessToken: string;
  type?: string;
  expiresAt: string;
  lastAccessedAt?: string;
  type: 'created' | 'page_created' | 'page_updated' | 'page_deleted' | 'document_uploaded' | 'document_deleted' | 'document_viewed' | 'external_access_granted' | 'external_access_revoked' | 'external_user_viewed' | 'comment_added' | 'settings_updated';
  userId?: string; // Ref: User
  timestamp?: string;
  details?: any;
  dealId: string; // Ref: Lead
  name: string;
  lastModifiedBy?: string; // Ref: User
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DebitNote {
  _id: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  debitNoteNumber: string;
  billId: string; // Ref: Bill
  billNumber?: string;
  vendorId: string; // Ref: Vendor
  vendorName?: string;
  vendorNameAr?: string;
  vendorVatNumber?: string;
  debitNoteDate?: string;
  isPartial?: boolean;
  reasonType: 'goods_returned' | 'damaged_goods' | 'pricing_error' | 'quality_issue' | 'overcharge' | 'duplicate_billing' | 'service_not_rendered' | 'contract_termination' | 'other';
  reason?: string;
  reasonAr?: string;
  validate?: any;
  subtotal: number;
  taxAmount?: number;
  total: number;
  currency?: string;
  status?: 'draft' | 'pending' | 'approved' | 'applied' | 'rejected' | 'cancelled';
  glEntryId?: string; // Ref: GeneralLedger
  journalEntryId?: string; // Ref: JournalEntry
  submittedAt?: string;
  submittedBy?: string; // Ref: User
  approvedAt?: string;
  approvedBy?: string; // Ref: User
  approvalNotes?: string;
  rejectedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectionReason?: string;
  appliedAt?: string;
  appliedBy?: string; // Ref: User
  billId?: string; // Ref: Bill
  amount?: number;
  appliedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string; // Ref: User
  cancellationReason?: string;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  name?: string;
  url?: string;
  uploadedAt?: string;
  action: string;
  performedBy?: string; // Ref: User
  performedAt?: string;
  details?: any;
  debitNoteNumber?: any;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNote {
  _id: string;
  addressLine1?: string;
  addressLine1Ar?: string;
  addressLine2?: string;
  city?: string;
  cityAr?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  district?: string;
  districtAr?: string;
  buildingNumber?: string;
  additionalNumber?: string;
  latitude?: number;
  longitude?: number;
  lineId?: string;
  lineNumber: number;
  salesOrderId?: string; // Ref: SalesOrder
  salesOrderNumber?: string;
  salesOrderItemId?: string;
  productId?: string; // Ref: Product
  productCode?: string;
  productName: string;
  productNameAr?: string;
  description?: string;
  quantityOrdered?: number;
  quantityToDeliver: number;
  quantityDelivered?: number;
  quantityRejected?: number;
  quantityDamaged?: number;
  unit?: string;
  warehouseId?: string; // Ref: Warehouse
  warehouseName?: string;
  binLocation?: string;
  type?: string[];
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  pickedBy?: string; // Ref: User
  pickedAt?: string;
  pickingNotes?: string;
  type?: string[];
  notes?: string;
  status?: 'pending' | 'picked' | 'packed' | 'shipped' | 'delivered' | 'partial' | 'rejected';
  packageId?: string;
  packageNumber: number;
  packageType?: 'box' | 'pallet' | 'envelope' | 'crate' | 'tube' | 'bag' | 'custom';
  description?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'cm' | 'in' | 'm';
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  type?: string[];
  trackingNumber?: string;
  labelUrl?: string;
  labelGeneratedAt?: string;
  packedBy?: string; // Ref: User
  packedAt?: string;
  status?: 'pending' | 'packed' | 'labeled' | 'shipped' | 'delivered';
  eventTime?: string;
  status: string;
  statusCode?: string;
  description?: string;
  descriptionAr?: string;
  location?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  signedBy?: string;
  source?: 'carrier_api' | 'manual' | 'driver_app' | 'webhook';
  deliveredAt: string;
  receivedBy: string;
  receivedByTitle?: string;
  receivedByIdNumber?: string;
  receivedByPhone?: string;
  signatureUrl?: string;
  signatureType?: 'digital' | 'image' | 'name_only';
  type?: string[];
  type?: string[];
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  locationAddress?: string;
  deviceId?: string;
  deviceType?: string;
  appVersion?: string;
  conditionOnDelivery?: 'good' | 'minor_damage' | 'major_damage' | 'refused';
  damageNotes?: string;
  rating?: number;
  feedback?: string;
  verificationCode?: string;
  verifiedAt?: string;
  action: string;
  timestamp?: string;
  performedBy?: string; // Ref: User
  performedByName?: string;
  details?: string;
  oldStatus?: string;
  newStatus?: string;
  location?: any;
  deliveryNumber: string;
  deliveryDate: string;
  type?: string[];
  type?: string[];
  primarySalesOrderId?: string; // Ref: SalesOrder
  returnOrderId?: string; // Ref: ReturnOrder
  returnOrderNumber?: string;
  isReturn?: boolean;
  customerId: string; // Ref: Client
  customerName?: string;
  customerNameAr?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddressId?: string;
  contactPersonId?: string; // Ref: Contact
  contactPersonName?: string;
  contactPersonPhone?: string;
  status?: 'draft' | 'confirmed' | 'picking' | 'picked' | 'packing' | 'packed' | 'ready_to_ship' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'partially_delivered' | 'failed' | 'returned' | 'cancelled';
  billingStatus?: 'not_billed' | 'billed';
  totalPackages?: number;
  warehouseId?: string; // Ref: Warehouse
  warehouseName?: string;
  shippingMethod?: 'own_fleet' | 'third_party' | 'customer_pickup' | 'dropship';
  carrierId?: string; // Ref: ShippingCarrier
  carrierName?: string;
  carrierService?: string;
  carrierAccountNumber?: string;
  masterTrackingNumber?: string;
  type?: string[];
  trackingUrl?: string;
  awbNumber?: string;
  awbUrl?: string;
  shippingCost?: number;
  shippingCostCurrency?: string;
  insuranceValue?: number;
  incoterms?: 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP' | 'FAS' | 'FOB' | 'CFR' | 'CIF';
  totalWeight?: number;
  weightUnit?: 'kg' | 'g' | 'lb';
  volumetricWeight?: number;
  dimensions?: 'cm' | 'in' | 'm';
  vehicleId?: string; // Ref: Vehicle
  vehiclePlate?: string;
  vehicleType?: string;
  driverId?: string; // Ref: User
  driverName?: string;
  driverPhone?: string;
  driverLicense?: string;
  deliveryTripId?: string; // Ref: DeliveryTrip
  stopNumber?: number;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  pickedAt?: string;
  packedAt?: string;
  shippedAt?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  firstAttemptDate?: string;
  commitmentDate?: string;
  isUrgent?: boolean;
  priorityLevel?: 'low' | 'normal' | 'high' | 'critical';
  lastTrackingUpdate?: string;
  attemptNumber: number;
  attemptDate: string;
  attemptedBy?: string; // Ref: User
  result: 'delivered' | 'no_one_home' | 'wrong_address' | 'refused' | 'damaged' | 'other';
  notes?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  maxDeliveryAttempts?: number;
  invoiceId?: string; // Ref: Invoice
  invoiceNumber?: string;
  packingSlipUrl?: string;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  specialInstructions?: string;
  deliveryInstructions?: string;
  cancellationReason?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  printCount?: number;
  lastPrintedAt?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  customFields?: Record<string, any>;
  type?: string[];
  confirmedBy?: string; // Ref: User
  confirmedAt?: string;
  toJSON?: any;
  toObject?: any;
  pagination?: any;
  totalDeliveries?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DiscordIntegration {
  _id: string;
  userId: string; // Ref: User
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  guildId: string;
  guildName: string;
  guildIcon?: string;
  webhookUrl: string;
  webhookId: string;
  webhookToken: string;
  webhookChannelId: string;
  webhookChannelName: string;
  botPermissions?: number;
  id: string;
  name: string;
  type: number;
  position?: number;
  parentId?: string;
  events?: boolean;
  mentionRole?: string;
  embedColor?: string;
  includeDetails?: boolean;
  maxNotificationsPerHour?: number;
  digestMode?: boolean;
  isActive?: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  stats?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Dispute {
  _id: string;
  caseId?: string; // Ref: Case
  paymentId?: string; // Ref: Payment
  clientId: string; // Ref: User
  type: string;
  status: string;
  priority: string;
  description: string;
  type?: 'document' | 'image' | 'video' | 'audio' | 'other';
  url: string;
  filename?: string;
  fileKey?: string;
  description?: string;
  uploadedAt?: string;
  lawyerResponse?: string;
  lawyerResponseDate?: string;
  type?: 'document' | 'image' | 'video' | 'audio' | 'other';
  url: string;
  filename?: string;
  fileKey?: string;
  description?: string;
  uploadedAt?: string;
  mediatorId?: string; // Ref: User
  note: string;
  createdAt?: string;
  resolution?: string; // Ref: User
  action: string;
  by: string; // Ref: User
  at?: string;
  notes?: string;
  closedAt?: string;
  closedBy?: string; // Ref: User
  escalatedAt?: string;
  escalatedBy?: string; // Ref: User
  escalationReason?: string;
  totalDisputes?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  version: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  url: string;
  fileKey: string;
  uploadedBy: string; // Ref: User
  changeNote?: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  url: string;
  fileKey: string;
  bucket?: string;
  module?: 'crm' | 'finance' | 'hr' | 'documents' | 'tasks' | 'judgments' | 'general';
  category: 'contract' | 'judgment' | 'evidence' | 'correspondence' | 'pleading' | 'other';
  caseId?: string; // Ref: Case
  clientId?: string; // Ref: Client
  description?: string;
  type?: string;
  isConfidential?: boolean;
  isEncrypted?: boolean;
  uploadedBy: string; // Ref: User
  version?: number;
  parentDocumentId?: string; // Ref: Document
  shareToken?: string;
  shareExpiresAt?: string;
  accessCount?: number;
  lastAccessedAt?: string;
  metadata?: any;
  fileName?: any;
  originalName?: any;
  description?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAnalysis {
  _id: string;
  documentId: string; // Ref: Document
  documentVersionId?: string; // Ref: DocumentVersion
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  classification?: any;
  type?: string;
  value?: string;
  normalizedValue?: string;
  confidence?: number;
  position?: any;
  role?: string;
  name?: string;
  type?: string;
  type?: string;
  date?: string;
  isEstimate?: boolean;
  type?: string;
  amount?: number;
  currency?: string;
  type?: string;
  value?: string;
  summary?: any;
  overallRisk?: 'low' | 'medium' | 'high';
  riskScore?: number;
  type?: string;
  severity?: string;
  description?: string;
  clause?: string;
  recommendation?: string;
  type?: string;
  text?: string;
  analysis?: string;
  isStandard?: boolean;
  concerns?: string;
  ocr?: any;
  processingTime?: number;
  aiModel?: string;
  tokensUsed?: number;
  cost?: number;
  group?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  _id: string;
  documentId: string; // Ref: Document
  version: number;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  fileType?: string;
  storageKey: string;
  url?: string;
  uploadedBy: string; // Ref: User
  changeNote?: string;
  checksum?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DocusignIntegration {
  _id: string;
  userId: string; // Ref: User
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  tokenExpiresAt: string;
  scope?: string;
  accountId: string;
  accountName?: string;
  baseUri: string;
  email?: string;
  userName?: string;
  isActive?: boolean;
  connectedAt?: string;
  disconnectedAt?: string;
  disconnectedBy?: string; // Ref: User
  disconnectReason?: string;
  templateId: string;
  templateName?: string;
  description?: string;
  type?: 'contract' | 'nda' | 'agreement' | 'consent_form' | 'retainer' | 'other';
  isDefault?: boolean;
  addedAt?: string;
  webhooksEnabled?: boolean;
  events?: boolean;
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  envelopeId: string;
  subject?: string;
  status?: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
  linkedTo?: 'case' | 'client' | 'contact' | 'deal' | 'other';
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  signedAt?: string;
  createdAt?: string;
  sentAt?: string;
  completedAt?: string;
  lastStatusChange?: string;
  webhook?: 'active' | 'inactive' | 'error';
  stats?: number;
  lastSyncedAt?: string;
  lastSyncError?: string;
  events?: any;
  tokenExpiresAt?: any;
  total?: any;
  active?: any;
  totalEnvelopesSent?: any;
  totalEnvelopesCompleted?: any;
  totalEnvelopesDeclined?: any;
  totalEnvelopesVoided?: any;
  totalDocumentsSigned?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DownPayment {
  _id: string;
  applicationId?: string;
  invoiceId: string; // Ref: Invoice
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceTotal?: number;
  appliedAmount: number;
  appliedDate?: string;
  appliedBy?: string; // Ref: User
  appliedByName?: string;
  notes?: string;
  refundId?: string;
  refundAmount: number;
  refundDate?: string;
  refundReason?: string;
  refundMethod?: 'bank_transfer' | 'cheque' | 'cash' | 'credit_note' | 'original_method';
  refundReference?: string;
  creditNoteId?: string; // Ref: CreditNote
  creditNoteNumber?: string;
  processedBy?: string; // Ref: User
  processedByName?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  notes?: string;
  paymentId?: string;
  paymentAmount: number;
  paymentDate?: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'mada' | 'apple_pay' | 'stc_pay' | 'other';
  paymentReference?: string;
  bankAccountId?: string; // Ref: BankAccount
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  transactionId?: string;
  receivedBy?: string; // Ref: User
  receivedByName?: string;
  notes?: string;
  action: string;
  timestamp?: string;
  performedBy?: string; // Ref: User
  performedByName?: string;
  details?: string;
  downPaymentNumber: string;
  sourceType: 'quote' | 'sales_order' | 'manual';
  sourceId: string;
  sourceNumber?: string;
  sourceDate?: string;
  sourceTotalAmount?: number;
  customerId: string; // Ref: Client
  customerName?: string;
  customerNameAr?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerVatNumber?: string;
  calculationType: 'percentage' | 'fixed_amount';
  percentageValue?: number;
  fixedAmountValue?: number;
  amount: number;
  currency?: string;
  vatRate?: number;
  vatAmount?: number;
  amountExcludingVat?: number;
  amountIncludingVat?: number;
  vatIncluded?: boolean;
  invoiceId?: string; // Ref: Invoice
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceStatus?: 'not_generated' | 'draft' | 'sent' | 'paid' | 'cancelled';
  status?: 'draft' | 'pending' | 'partially_paid' | 'paid' | 'partially_applied' | 'fully_applied' | 'partially_refunded' | 'refunded' | 'cancelled';
  paidAmount?: number;
  paidDate?: string;
  paymentDueDate?: string;
  appliedAmount?: number;
  refundedAmount?: number;
  refundInvoiceId?: string; // Ref: Invoice
  requestedDate?: string;
  dueDate: string;
  expiryDate?: string;
  termsAndConditions?: string;
  termsAndConditionsAr?: string;
  refundPolicy?: string;
  refundPolicyAr?: string;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  cancellationReason?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  pdfUrl?: string;
  receiptUrl?: string;
  toJSON?: any;
  toObject?: any;
  pagination?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DunningHistory {
  _id: string;
  stage: number;
  enteredAt: string;
  action: 'email' | 'sms' | 'call' | 'collection_agency';
  result: 'sent' | 'failed' | 'responded' | 'skipped';
  notes?: string;
  sentTo?: string;
  lateFeeApplied?: number;
  escalatedTo?: string; // Ref: User
  invoiceId: string; // Ref: Invoice
  policyId: string; // Ref: DunningPolicy
  currentStage?: number;
  stageHistory?: any[];
  isPaused?: boolean;
  pauseReason?: string;
  pausedAt?: string;
  pausedBy?: string; // Ref: User
  nextActionDate?: string;
  lastActionDate?: string;
  totalLateFees?: number;
  status?: 'active' | 'completed' | 'cancelled' | 'collected';
  completedAt?: string;
  completedReason?: string;
  toJSON?: any;
  toObject?: any;
  nextActionDate?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DunningPolicy {
  _id: string;
  order: number;
  daysOverdue: '7' | '14' | '30' | '60' | '90';
  action: 'email' | 'sms' | 'call' | 'collection_agency';
  template?: string;
  addLateFee?: boolean;
  lateFeeAmount?: number;
  lateFeeType?: 'fixed' | 'percentage';
  escalateTo?: string; // Ref: User
  name: string;
  validate?: any;
  pauseConditions?: 'dispute_open' | 'payment_plan_active'[];
  isDefault?: boolean;
  isActive?: boolean;
  toJSON?: any;
  toObject?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateDetectionSettings {
  _id: string;
  field: 'email' | 'phone' | 'mobile' | 'name' | 'firstName' | 'lastName' | 'organization' | 'website' | 'nationalId' | 'crNumber' | 'vatNumber';
  matchType: 'exact' | 'fuzzy' | 'phonetic' | 'normalized';
  weight: number;
  isEnabled?: boolean;
  threshold?: number;
  isEnabled?: boolean;
  autoDetect?: boolean;
  minMatchScore?: number;
  highConfidenceThreshold?: number;
  rules?: any[];
  entityTypes?: boolean;
  actions?: boolean;
  mergePreferences?: boolean;
  scheduledScan?: 'daily' | 'weekly' | 'monthly';
  stats?: number;
  exclusions?: string[];
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaign {
  _id: string;
  name?: string;
  description?: string;
  type?: 'one_time' | 'drip' | 'automated' | 'triggered';
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  subject?: string;
  previewText?: string;
  templateId?: string; // Ref: EmailTemplate
  htmlContent?: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  audienceType?: 'all_leads' | 'segment' | 'custom' | 'clients';
  segmentId?: string; // Ref: EmailSegment
  type?: string[];
  type?: string[];
  totalRecipients?: number;
  scheduledAt?: string;
  sentAt?: string;
  completedAt?: string;
  timezone?: string;
  enabled?: boolean;
  order?: number;
  name?: string;
  delayDays?: number;
  delayHours?: number;
  subject?: string;
  templateId?: string; // Ref: EmailTemplate
  htmlContent?: string;
  sentCount?: number;
  openedCount?: number;
  clickedCount?: number;
  triggerSettings?: 'lead_created' | 'stage_changed' | 'tag_added' | 'form_submitted' | 'inactivity' | 'birthday' | 'anniversary';
  enabled?: boolean;
  name?: string;
  subject?: string;
  htmlContent?: string;
  templateId?: string; // Ref: EmailTemplate
  percentage?: number;
  stats?: number;
  winnerCriteria?: 'open_rate' | 'click_rate';
  testDuration?: number;
  winnerSelected?: boolean;
  winnerId?: string;
  personalization?: boolean;
  stats?: number;
  openRate?: number;
  clickRate?: number;
  bounceRate?: number;
  unsubscribeRate?: number;
  type?: string[];
  folderId?: string; // Ref: EmailFolder
  createdAt: string;
  updatedAt: string;
}

export interface EmailEvent {
  _id: string;
  campaignId?: string; // Ref: EmailCampaign
  subscriberId?: string; // Ref: EmailSubscriber
  email?: string;
  eventType?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'complained' | 'failed';
  trackingId?: string;
  messageId?: string;
  metadata?: 'desktop' | 'mobile' | 'tablet' | 'other';
  timestamp?: string;
  dripStep?: number;
  source?: 'campaign' | 'drip' | 'trigger' | 'transactional';
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  project?: any;
  sort?: any;
  match?: any;
  group?: any;
  sum?: any;
  sum?: any;
  match?: any;
  project?: any;
  group?: any;
  sort?: any;
  dateToString?: any;
  dateToString?: any;
  match?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailOtp {
  _id: string;
  email: string;
  otpHash: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'email_verification' | 'transaction';
  expiresAt: string;
  verified?: boolean;
  attempts?: number;
  ipAddress?: string;
  userAgent?: string;
  requestCount?: number;
  lastRequestAt?: string;
  ipAddress?: string;
  attemptedAt?: string;
  set?: any;
  expiresAt?: any;
  createdAt?: any;
  match?: any;
  unwind?: any;
  match?: any;
  match?: any;
  unwind?: any;
  match?: any;
  expiresAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSegment {
  _id: string;
  name?: string;
  description?: string;
  field?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'between';
  conditionLogic?: 'AND' | 'OR';
  subscriberCount?: number;
  type?: string[];
  lastCalculatedAt?: string;
  isDynamic?: boolean;
  type?: string[];
  usageCount?: number;
  lastUsedAt?: string;
  isActive?: boolean;
  type?: string[];
  color?: string;
  not?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSignature {
  _id: string;
  userId: string; // Ref: User
  name: string;
  contentHtml: string;
  isDefault?: boolean;
  set?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSubscriber {
  _id: string;
  email?: string;
  leadId?: string; // Ref: Lead
  clientId?: string; // Ref: Client
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  companyName?: string;
  status?: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  type?: string[];
  subscriptionSource?: 'manual' | 'import' | 'form' | 'api' | 'lead_conversion' | 'client_creation';
  subscribedAt?: string;
  unsubscribedAt?: string;
  unsubscribeReason?: string;
  engagement?: number;
  bounceDetails?: 'soft' | 'hard';
  preferences?: 'daily' | 'weekly' | 'monthly' | 'digest';
  campaignId?: string; // Ref: EmailCampaign
  startedAt?: string;
  currentStep?: number;
  completedSteps?: number;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  lastEmailSentAt?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verifiedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  _id: string;
  name: string;
  code?: string;
  subject: string;
  subjectAr?: string;
  bodyHtml: string;
  bodyHtmlAr?: string;
  bodyText?: string;
  bodyTextAr?: string;
  previewText?: string;
  type?: 'manual' | 'automation' | 'campaign' | 'notification' | 'quote' | 'invoice';
  category?: 'welcome' | 'follow_up' | 'newsletter' | 'promotional' | 'legal_update' | 'reminder' | 'notification' | 'custom';
  triggerEvent?: string;
  name: string;
  description?: string;
  example?: string;
  required?: boolean;
  name: string;
  url: string;
  type?: string;
  isActive?: boolean;
  isDefault?: boolean;
  isSystemTemplate?: boolean;
  isPublic?: boolean;
  stats?: number;
  layout?: 'simple' | 'modern' | 'professional' | 'newsletter' | 'custom';
  thumbnailUrl?: string;
  type?: string;
  notes?: string;
  lastUsedAt?: string;
  toJSON?: any;
  inc?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTracking {
  _id: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  device?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  location?: any;
  timestamp: string;
  url: string;
  linkId: string;
  ip?: string;
  userAgent?: string;
  device?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  trackingId: string;
  emailId: string;
  entityType: 'lead' | 'contact' | 'client';
  entityId: string;
  recipientEmail: string;
  opens?: any[];
  openCount?: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  clicks?: any[];
  clickCount?: number;
  firstClickedAt?: string;
  lastClickedAt?: string;
  subject?: string;
  sentAt?: string;
  campaignId?: string; // Ref: EmailCampaign
  templateId?: string; // Ref: EmailTemplate
  engagementScore?: number;
  match?: any;
  totalEmails?: any;
  totalOpens?: any;
  totalClicks?: any;
  sum?: any;
  sum?: any;
  avgEngagementScore?: any;
  match?: any;
  totalRecipients?: any;
  totalOpens?: any;
  totalClicks?: any;
  sum?: any;
  sum?: any;
  avgEngagementScore?: any;
  openRate?: any;
  clickRate?: any;
  match?: any;
  group?: any;
  project?: any;
  sort?: any;
  match?: any;
  group?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailVerification {
  _id: string;
  token: string;
  userId: string; // Ref: User
  email: string;
  expiresAt: string;
  isUsed?: boolean;
  usedAt?: string;
  sentCount?: number;
  lastSentAt?: string;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  usedAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  name?: string;
  nameAr?: string;
  amount?: number;
  taxable?: boolean;
  includedInEOSB?: boolean;
  includedInGOSI?: boolean;
  city?: string;
  region?: string;
  country?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  bankName?: string;
  iban?: string;
  weeklyHours?: number;
  dailyHours?: number;
  type?: string[];
  restDay?: string;
  employeeId?: string;
  officeType?: 'solo' | 'small' | 'medium' | 'firm';
  fullNameArabic?: string;
  fullNameEnglish?: string;
  type?: string;
  validate?: any;
  nationalIdType?: 'saudi_id' | 'iqama' | 'gcc_id' | 'passport';
  nationalIdExpiry?: string;
  nationality?: string;
  isSaudi?: boolean;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
  personalEmail?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  numberOfDependents?: number;
  religion?: 'muslim' | 'non_muslim';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'null';
  medicalConditions?: string;
  employmentStatus?: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
  jobTitle?: string;
  jobTitleArabic?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'temporary';
  contractType?: 'indefinite' | 'fixed_term';
  contractStartDate?: string;
  contractEndDate?: string;
  hireDate?: string;
  probationPeriod?: number;
  probationExtendedTo?: string;
  onProbation?: boolean;
  reportsTo?: string; // Ref: Employee
  departmentName?: string;
  terminationDate?: string;
  terminationReason?: string;
  terminationDetails?: 'article_74_mutual' | '// Mutual agreement
                    article_75_expiry' | '// Contract expiry
                    article_77_indefinite' | '// Party termination (indefinite)
                    article_80_employer' | '// Employer termination without compensation (serious misconduct)
                    article_81_employee' | '// Employee termination without notice (employer breach)
                    resignation' | '// Standard resignation
                    retirement' | '// Retirement
                    death' | '// Death of employee
                    force_majeure          // Force majeure';
  compensation?: 'monthly' | 'bi_weekly' | 'weekly';
  gosi?: boolean;
  organization?: string; // Ref: Employee
  leave?: number;
  totalEmployees?: any;
  sum?: any;
  totalBasicSalary?: any;
  byDepartment?: any;
  byStatus?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAdvance {
  _id: string;
  installmentNumber?: number;
  dueDate?: string;
  installmentAmount?: number;
  status?: 'pending' | 'paid' | 'partial' | 'missed' | 'waived';
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: 'payroll_deduction' | 'bank_transfer' | 'cash' | 'final_settlement' | 'lump_sum';
  paymentReference?: string;
  remainingBalance?: number;
  daysMissed?: number;
  notes?: string;
  recoveryId?: string;
  recoveryDate?: string;
  installmentNumber?: number;
  recoveredAmount?: number;
  recoveryMethod?: 'payroll_deduction' | 'bank_transfer' | 'cash' | 'final_settlement' | 'lump_sum';
  recoveryReference?: string;
  processedBy?: string; // Ref: User
  remainingBalance?: number;
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  stepNumber?: number;
  stepName?: string;
  stepNameAr?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  decision?: 'approve' | 'reject' | 'reduce_amount';
  approvedAmount?: number;
  approvedInstallments?: number;
  comments?: string;
  responseTime?: number;
  notificationSent?: boolean;
  notificationDate?: string;
  checkType?: 'minimum_service' | 'maximum_advances' | 'advance_limit' | 'salary_ratio' | 'probation' | 'existing_deductions' | 'previous_defaults' | 'employment_type' | 'disciplinary';
  checkName?: string;
  checkNameAr?: string;
  passed?: boolean;
  requirement?: string;
  actualValue?: string;
  notes?: string;
  documentType?: 'medical_report' | 'hospital_bill' | 'police_report' | 'death_certificate' | 'travel_booking' | 'rental_agreement' | 'request_form' | 'approval_letter' | 'disbursement_receipt' | 'recovery_receipt' | 'acknowledgment' | 'clearance_letter' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verifiedDate?: string;
  signed?: boolean;
  signedDate?: string;
  expiryDate?: string;
  notes?: string;
  communicationId?: string;
  communicationType?: 'email' | 'sms' | 'system_notification' | 'meeting' | 'phone';
  date?: string;
  purpose?: 'request_received' | 'approval' | 'rejection' | 'disbursement' | 'recovery_reminder' | 'missed_recovery' | 'completion' | 'other';
  subject?: string;
  message?: string;
  sentTo?: string;
  sentBy?: string; // Ref: User
  attachments?: string;
  responseReceived?: boolean;
  responseDate?: string;
  automated?: boolean;
  payrollRunId?: string; // Ref: PayrollRun
  payrollDate?: string;
  failureReason?: 'insufficient_salary' | 'employee_on_leave' | 'unpaid_leave' | 'salary_on_hold' | 'manual_hold' | 'other';
  scheduledAmount?: number;
  resolved?: boolean;
  resolutionDate?: string;
  resolutionMethod?: 'next_payroll' | 'manual_payment' | 'adjusted_schedule';
  impact?: string;
  advanceId?: string;
  advanceNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  department?: string;
  jobTitle?: string;
  advanceType?: 'salary' | 'emergency' | 'travel' | 'relocation' | 'medical' | 'education' | 'housing' | 'end_of_year' | 'other';
  advanceTypeAr?: string;
  advanceCategory?: 'regular' | 'emergency' | 'special';
  advanceAmount?: number;
  approvedAmount?: number;
  currency?: string;
  reason?: string;
  reasonAr?: string;
  detailedReason?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  isEmergency?: boolean;
  emergencyDetails?: 'medical' | 'family' | 'accident' | 'death' | 'natural_disaster' | 'legal' | 'other';
  repayment?: 'monthly' | 'bi_weekly';
  balance?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'recovering' | 'completed' | 'cancelled';
  requestStatus?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  requestDate?: string;
  approvalDate?: string;
  disbursementDate?: string;
  eligible?: boolean;
  ineligibilityReasons?: string;
  serviceRequirement?: number;
  probationCheck?: any;
  activeAdvances?: number;
  advanceLimit?: 'percentage_of_salary' | 'fixed_amount' | 'tenure_based';
  deductionsCheck?: number;
  paymentHistory?: 'excellent' | 'good' | 'fair' | 'poor';
  required?: boolean;
  fastTrack?: boolean;
  currentStep?: number;
  totalSteps?: number;
  finalStatus?: 'pending' | 'approved' | 'rejected';
  finalApprover?: string;
  finalApprovalDate?: string;
  rejectionReason?: string;
  autoApproval?: boolean[];
  totalApprovalTime?: number;
  disbursementMethod?: 'bank_transfer' | 'cash' | 'check' | 'payroll_addition';
  bankTransfer?: 'pending' | 'processed' | 'completed' | 'failed';
  cash?: string; // Ref: User
  check?: boolean;
  payrollAddition?: boolean; // Ref: PayrollRun
  disbursed?: boolean;
  disbursementDate?: string;
  actualDisbursedAmount?: number;
  deductionType?: 'processing_fee' | 'existing_advance' | 'other';
  deductionAmount?: number;
  description?: string;
  netDisbursedAmount?: number;
  urgentDisbursement?: boolean;
  disbursementTargetTime?: number;
  actualDisbursementTime?: number;
  confirmationRequired?: boolean;
  confirmed?: boolean;
  confirmedBy?: string; // Ref: User
  confirmationDate?: string;
  scheduleGenerated?: boolean;
  generatedDate?: string;
  summary?: number;
  recoveryPerformance?: 'excellent' | 'good' | 'fair' | 'poor';
  payrollDeduction?: 'monthly' | 'bi_weekly';
  payrollRunId?: string; // Ref: PayrollRun
  payrollMonth?: number;
  payrollYear?: number;
  deductionDate?: string;
  installmentNumber?: number;
  deductedAmount?: number;
  remainingBalance?: number;
  processedBy?: string; // Ref: User
  salarySlipReference?: string;
  insufficientSalary?: 'defer_to_next_month' | 'partial_recovery' | 'extend_schedule' | 'lump_sum_later';
  requested?: boolean;
  requestDate?: string;
  requestedBy?: 'employee' | 'employer';
  recoveryOption?: 'lump_sum' | 'from_bonus' | 'from_allowance' | 'from_final_settlement' | 'accelerated_schedule';
  lumpSum?: 'bank_transfer' | 'cash' | 'check';
  fromBonus?: boolean;
  approved?: boolean;
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  completed?: boolean;
  completionDate?: string;
  employeeExiting?: boolean;
  exitDate?: string;
  exitType?: 'resignation' | 'termination' | 'contract_end' | 'retirement' | 'death';
  outstandingBalance?: number;
  recoveryFromFinalSettlement?: boolean;
  hasShortfall?: boolean;
  shortfallAmount?: number;
  shortfallReason?: 'insufficient_settlement' | 'negative_balance' | 'multiple_advances';
  recoveryPlan?: 'payment_plan' | 'guarantor' | 'legal_recovery' | 'write_off';
  deathCase?: boolean; // Ref: User
  clearanceLetter?: boolean;
  offboardingId?: string; // Ref: Offboarding
  onUnpaidLeave?: boolean;
  leaveStartDate?: string;
  leaveEndDate?: string;
  recoveryPaused?: boolean;
  pauseStartDate?: string;
  resumeDate?: string;
  scheduleAdjustment?: boolean;
  salaryReduced?: boolean;
  reductionDate?: string;
  reductionPercentage?: number;
  newNetSalary?: number;
  installmentAdjustment?: boolean;
  suspension?: boolean;
  writtenOff?: boolean;
  writeOffDate?: string;
  writeOffReason?: 'death' | 'absconding' | 'bankruptcy' | 'uncollectible' | 'compassionate' | 'legal_settlement' | 'other';
  writeOffAmount?: number;
  detailedReason?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  approved?: boolean;
  approvalDate?: string;
  comments?: string;
  finalApproved?: boolean;
  finalApprovalBy?: string; // Ref: User
  finalApprovalDate?: string;
  accountingEntry?: boolean;
  advanceId?: string;
  advanceDate?: string;
  advanceType?: string;
  advanceAmount?: number;
  repaymentStatus?: 'completed' | 'ongoing' | 'defaulted';
  completionDate?: string;
  paymentPerformance?: 'excellent' | 'good' | 'fair' | 'poor';
  statistics?: number;
  notes?: any;
  advanceCompleted?: boolean;
  completionDate?: string;
  completionMethod?: 'full_recovery' | 'early_recovery' | 'exit_settlement' | 'write_off' | 'waived';
  finalRecovery?: any;
  clearanceLetter?: boolean;
  impactOnFutureEligibility?: 'excellent' | 'good' | 'fair' | 'poor';
  caseClosed?: boolean;
  closedDate?: string;
  closedBy?: string; // Ref: User
  analytics?: 'low' | 'medium' | 'high';
  relatedRecords?: string[]; // Ref: Offboarding
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  group?: any;
  group?: any;
  sum?: any;
  sum?: any;
  totalRecovered?: any;
  match?: any;
  requests?: any;
  sum?: any;
  sum?: any;
  match?: any;
  status?: any;
  status?: any;
  elemMatch?: any;
  thisMonth?: any;
  status?: any;
  requestStatus?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeBenefit {
  _id: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  customerServiceNumber?: string;
  emergencyNumber?: string;
  memberId?: string;
  name?: string;
  nameAr?: string;
  relationship?: 'spouse' | 'child' | 'parent' | 'other';
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female';
  nationalId?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  documentsVerified?: boolean;
  verificationDate?: string;
  documentType?: 'birth_certificate' | 'marriage_certificate' | 'family_card' | 'student_id' | 'disability_certificate' | 'other';
  documentUrl?: string;
  expiryDate?: string;
  verified?: boolean;
  beneficiaryId?: string;
  beneficiaryType?: 'primary' | 'contingent';
  name?: string;
  nameAr?: string;
  relationship?: string;
  dateOfBirth?: string;
  nationalId?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  percentage?: number;
  designation?: number;
  documentType?: string;
  documentUrl?: string;
  verified?: boolean;
  claimId?: string;
  claimNumber?: string;
  claimDate?: string;
  serviceDate?: string;
  claimType?: 'inpatient' | 'outpatient' | 'emergency' | 'pharmacy' | 'dental' | 'optical' | 'maternity' | 'other';
  provider?: string;
  diagnosis?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
  employeeShare?: number;
  insuranceShare?: number;
  claimStatus?: 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'rejected' | 'paid';
  statusDate?: string;
  rejectionReason?: string;
  claimDocument?: string;
  approvalNumber?: string;
  paidDate?: string;
  authId?: string;
  authNumber?: string;
  authDate?: string;
  procedure?: string;
  provider?: string;
  estimatedCost?: number;
  approvedAmount?: number;
  validFrom?: string;
  validUntil?: string;
  used?: boolean;
  usedDate?: string;
  status?: 'pending' | 'approved' | 'denied' | 'expired';
  eventId?: string;
  eventType?: 'marriage' | 'birth' | 'adoption' | 'death' | 'divorce' | 'dependent_age_out' | 'employment_status_change' | 'loss_of_other_coverage' | 'residence_change' | 'other';
  eventDate?: string;
  reportedDate?: string;
  eventDescription?: string;
  documentsRequired?: boolean;
  documentType?: string;
  documentUrl?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  allowsBenefitChange?: boolean;
  changeDeadline?: string;
  changeType?: 'add_dependent' | 'remove_dependent' | 'change_coverage_level' | 'enroll_new_benefit' | 'terminate_benefit';
  changeDescription?: string;
  effectiveDate?: string;
  previousCost?: number;
  newCost?: number;
  processed?: boolean;
  processedDate?: string;
  processedBy?: string; // Ref: User
  communicationId?: string;
  communicationType?: 'email' | 'sms' | 'mail' | 'portal_notification';
  date?: string;
  purpose?: 'enrollment_confirmation' | 'card_delivery' | 'premium_change' | 'coverage_change' | 'renewal_notice' | 'termination_notice' | 'claim_status' | 'document_request' | 'other';
  subject?: string;
  message?: string;
  attachments?: string;
  sent?: boolean;
  sentDate?: string;
  delivered?: boolean;
  read?: boolean;
  readDate?: string;
  documentType?: 'enrollment_form' | 'beneficiary_designation' | 'insurance_card' | 'policy_document' | 'summary_of_benefits' | 'claim_form' | 'medical_certificate' | 'dependent_proof' | 'termination_notice' | 'continuation_notice' | 'receipt' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  expiryDate?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  benefitEnrollmentId?: string;
  enrollmentNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  benefitType?: 'health_insurance' | 'life_insurance' | 'disability_insurance' | 'dental_insurance' | 'vision_insurance' | 'pension' | 'savings_plan' | 'education_allowance' | 'transportation' | 'housing' | 'meal_allowance' | 'mobile_allowance' | 'gym_membership' | 'professional_membership' | 'other';
  benefitCategory?: 'insurance' | 'allowance' | 'retirement' | 'perks' | 'flexible_benefits' | 'mandatory' | 'voluntary';
  benefitName?: string;
  benefitNameAr?: string;
  benefitDescription?: string;
  benefitDescriptionAr?: string;
  planId?: string;
  planCode?: string;
  planName?: string;
  planNameAr?: string;
  providerType?: 'insurance_company' | 'fund' | 'company_managed' | 'third_party';
  providerName?: string;
  providerNameAr?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  policyNumber?: string;
  enrollmentType?: 'new_hire' | 'annual_enrollment' | 'qualifying_event' | 'mid_year_change' | 're_enrollment';
  enrollmentDate?: string;
  effectiveDate?: string;
  coverageEndDate?: string;
  enrolledBy?: 'employee' | 'hr' | 'auto_enrollment';
  coverageLevel?: 'employee_only' | 'employee_spouse' | 'employee_children' | 'employee_family' | 'employee_parents';
  totalBeneficiaryPercentage?: number;
  status?: 'pending' | 'active' | 'suspended' | 'terminated' | 'expired';
  statusDate?: string;
  statusReason?: string;
  employerCost?: number;
  employeeCost?: number;
  totalCost?: number;
  currency?: string;
  employeeCost?: boolean;
  employerCost?: number;
  totalBenefitValue?: number;
  employerSharePercentage?: number;
  employeeSharePercentage?: number;
  insuranceProvider?: string;
  policyNumber?: string;
  groupNumber?: string;
  memberNumber?: string;
  memberId?: string;
  cardNumber?: string;
  cardIssueDate?: string;
  cardExpiryDate?: string;
  coverageType?: 'individual' | 'family';
  planType?: 'basic' | 'standard' | 'premium' | 'executive';
  networkType?: 'in_network' | 'out_of_network' | 'both';
  annualDeductible?: number;
  deductibleMet?: number;
  deductibleRemaining?: number;
  copayPercentage?: number;
  outOfPocketMaximum?: number;
  outOfPocketMet?: number;
  annualMaximum?: number;
  inpatientCoverage?: boolean;
  inpatientLimit?: number;
  roomType?: 'shared' | 'semi_private' | 'private' | 'suite';
  outpatientCoverage?: boolean;
  outpatientLimit?: number;
  emergencyCoverage?: boolean;
  emergencyLimit?: number;
  maternityCoverage?: boolean;
  maternityLimit?: number;
  maternityWaitingPeriod?: number;
  dentalCoverage?: boolean;
  dentalLimit?: number;
  visionCoverage?: boolean;
  visionLimit?: number;
  pharmacyCoverage?: boolean;
  pharmacyLimit?: number;
  prescriptionCopay?: number;
  mentalHealthCoverage?: boolean;
  therapySessions?: number;
  chronicDiseaseCoverage?: boolean;
  preExistingConditions?: boolean;
  preExistingWaitingPeriod?: number;
  preventiveCare?: boolean;
  geographicCoverage?: 'saudi_only' | 'gcc' | 'mena' | 'worldwide';
  emergencyTravelCoverage?: boolean;
  preAuthRequired?: boolean;
  totalClaimsSubmitted?: number;
  totalClaimsPaid?: number;
  totalClaimsAmount?: number;
  insuranceCard?: boolean;
  insuranceProvider?: string;
  policyNumber?: string;
  certificateNumber?: string;
  coverageAmount?: number;
  coverageMultiple?: number;
  coverageType?: 'term' | 'whole_life' | 'group_term';
  accidentalDeath?: boolean;
  accidentalDeathMultiplier?: number;
  dismemberment?: boolean;
  injury?: string;
  percentage?: number;
  criticalIllness?: boolean;
  criticalIllnessBenefit?: number;
  terminalIllness?: boolean;
  terminalIllnessAdvance?: number;
  waiversOfPremium?: boolean;
  primaryBeneficiaries?: number;
  contingentBeneficiaries?: number;
  claimId?: string;
  claimDate?: string;
  eventDate?: string;
  claimType?: 'death' | 'accidental_death' | 'critical_illness' | 'terminal_illness' | 'dismemberment';
  claimAmount?: number;
  claimant?: string;
  relationship?: string;
  claimStatus?: 'submitted' | 'under_review' | 'approved' | 'paid' | 'denied';
  documents?: string;
  approvedAmount?: number;
  paidAmount?: number;
  paidDate?: string;
  denialReason?: string;
  planType?: 'defined_benefit' | 'defined_contribution' | 'hybrid';
  planName?: string;
  vesting?: 'immediate' | 'graded' | 'cliff';
  employeeContribution?: 'percentage' | 'fixed_amount';
  employerContribution?: 'percentage' | 'fixed_amount' | 'matching';
  totalAccountValue?: number;
  retirementEligibility?: boolean;
  allowanceType?: 'housing' | 'transportation' | 'meal' | 'mobile' | 'education' | 'professional_development' | 'relocation' | 'cost_of_living' | 'hazard' | 'shift' | 'other';
  allowanceName?: string;
  allowanceNameAr?: string;
  allowanceAmount?: number;
  calculationType?: 'fixed' | 'percentage_of_salary' | 'tiered' | 'reimbursement';
  percentageOfSalary?: number;
  tierDetails?: 'job_level' | 'location' | 'dependents' | 'performance'[];
  paymentFrequency?: 'monthly' | 'quarterly' | 'annual' | 'one_time' | 'as_incurred';
  annualLimit?: number;
  usedToDate?: number;
  remainingLimit?: number;
  taxable?: boolean;
  includedInGOSI?: boolean;
  includedInEOSB?: boolean;
  reimbursementId?: string;
  reimbursementDate?: string;
  claimPeriod?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  receipts?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  paidDate?: string;
  gymMembership?: 'individual' | 'family';
  organizationName?: string;
  membershipType?: string;
  membershipNumber?: string;
  annualFee?: number;
  companyPaid?: boolean;
  validFrom?: string;
  validUntil?: string;
  renewalDue?: boolean;
  programName?: string;
  programNameAr?: string;
  programType?: 'fitness' | 'nutrition' | 'mental_health' | 'smoking_cessation' | 'weight_management' | 'stress_management' | 'other';
  enrolled?: boolean;
  enrollmentDate?: string;
  completed?: boolean;
  completionDate?: string;
  incentive?: 'cash' | 'points' | 'discount';
  perkType?: string;
  perkName?: string;
  perkValue?: number;
  description?: string;
  active?: boolean;
  eligible?: boolean;
  eligibilityReason?: 'termination' | 'hours_reduction' | 'other';
  benefitType?: string;
  benefitName?: string;
  continuationPeriod?: number;
  monthlyCost?: number;
  elected?: boolean;
  effectiveDate?: string;
  expiryDate?: string;
  electionDeadline?: string;
  elected?: boolean;
  electionDate?: string;
  paymentMonth?: string;
  dueDate?: string;
  amountDue?: number;
  paid?: boolean;
  paidDate?: string;
  late?: boolean;
  terminatedForNonPayment?: boolean;
  continuationStatus?: 'active' | 'terminated' | 'expired';
  terminated?: boolean;
  terminationDate?: string;
  terminationReason?: 'employee_resignation' | 'employee_termination' | 'retirement' | 'death' | 'contract_end' | 'other';
  terminationTriggeredBy?: 'employment_end' | 'employee_request' | 'dependent_ineligibility' | 'non_payment' | 'plan_termination';
  coverageEndDate?: string;
  gracePeriod?: any;
  finalCosts?: any;
  continuationOffered?: boolean;
  continuationNoticeDate?: string;
  conversionOption?: boolean;
  cleared?: boolean;
  clearanceDate?: string;
  cardReturned?: boolean;
  cardReturnDate?: string;
  outstandingClaims?: number;
  finalSettlement?: boolean;
  cchiCompliant?: boolean;
  cchiRegistrationNumber?: string;
  gosiReported?: boolean;
  compliesWithLaborLaw?: boolean;
  requirement?: string;
  compliant?: boolean;
  notes?: string;
  planCompliance?: boolean;
  auditDate?: string;
  auditor?: string;
  findings?: string;
  correctiveActions?: string;
  passed?: boolean;
  portalAvailable?: boolean;
  portalUrl?: string;
  loginCredentials?: boolean;
  selfServiceFeatures?: boolean;
  notes?: any;
  utilizationRate?: number;
  costPerUse?: number;
  roi?: number;
  vsCompanyAverage?: 'above' | 'at' | 'below';
  satisfactionRating?: number;
  coverageEndDate?: any;
  coverageEndDate?: any;
  coverageEndDate?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeIncentive {
  _id: string;
  incentiveId?: string;
  employeeId?: string; // Ref: Employee
  incentiveType: 'performance_bonus' | 'spot_award' | 'referral_bonus' | 'project_bonus' | 'sales_commission' | 'annual_bonus' | 'quarterly_bonus' | 'recognition_award' | 'innovation_award' | 'team_bonus' | 'other';
  incentiveName: string;
  description?: string;
  amount: number;
  currency?: string;
  calculationBasis?: 'fixed' | 'percentage_of_salary' | 'percentage_of_target' | 'custom';
  percentage?: number;
  baseAmount?: number;
  periodType?: 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'one_time';
  periodStartDate?: string;
  periodEndDate?: string;
  awardDate: string;
  paymentDate?: string;
  performanceMetrics?: any;
  projectId?: string; // Ref: Project
  referredEmployee?: string; // Ref: Employee
  salesAmount?: number;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  level?: number;
  approver?: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  date?: string;
  currentApprovalLevel?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  payrollRunId?: string; // Ref: PayrollRun
  payrollProcessed?: boolean;
  payrollProcessedAt?: string;
  isTaxable?: boolean;
  taxAmount?: number;
  netAmount?: number;
  reason?: string;
  notes?: string;
  hrComments?: string;
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  inc?: any;
  elemMatch?: any;
  match?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeLoan {
  _id: string;
  installmentNumber?: number;
  dueDate?: string;
  principalAmount?: number;
  interestAmount?: number;
  processingFeeAmount?: number;
  installmentAmount?: number;
  status?: 'pending' | 'paid' | 'partial' | 'missed' | 'waived';
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: 'payroll_deduction' | 'bank_transfer' | 'cash' | 'check';
  paymentReference?: string;
  remainingBalance?: number;
  lateFee?: number;
  lateDays?: number;
  notes?: string;
  stepNumber?: number;
  stepName?: string;
  stepNameAr?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  decision?: 'approve' | 'reject' | 'request_changes' | 'escalate';
  approvedAmount?: number;
  approvedInstallments?: number;
  comments?: string;
  conditions?: string;
  notificationSent?: boolean;
  notificationDate?: string;
  paymentId?: string;
  paymentDate?: string;
  installmentNumber?: number;
  principalPaid?: number;
  interestPaid?: number;
  feesPaid?: number;
  lateFeesPaid?: number;
  totalPaid?: number;
  paymentMethod?: 'payroll_deduction' | 'bank_transfer' | 'cash' | 'check';
  paymentReference?: string;
  processedBy?: string; // Ref: User
  remainingBalance?: number;
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  checkType?: 'minimum_service' | 'maximum_loans' | 'credit_limit' | 'salary_ratio' | 'employment_type' | 'probation' | 'performance' | 'disciplinary' | 'existing_defaults' | 'overdue';
  checkName?: string;
  checkNameAr?: string;
  passed?: boolean;
  requirement?: string;
  actualValue?: string;
  notes?: string;
  documentType?: 'salary_certificate' | 'quotation' | 'invoice' | 'medical_report' | 'admission_letter' | 'marriage_contract' | 'application_form' | 'approval_letter' | 'loan_agreement' | 'disbursement_receipt' | 'payment_receipt' | 'guarantor_agreement' | 'clearance_letter' | 'legal_notice' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verifiedDate?: string;
  signed?: boolean;
  signedDate?: string;
  expiryDate?: string;
  notes?: string;
  guarantorId?: string; // Ref: Employee
  guarantorName?: string;
  guarantorNameAr?: string;
  relationship?: string;
  nationalId?: string;
  employer?: string;
  jobTitle?: string;
  monthlySalary?: number;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  guaranteeAmount?: number;
  documentType?: 'national_id' | 'salary_certificate' | 'bank_statement' | 'other';
  documentName?: string;
  fileUrl?: string;
  verified?: boolean;
  consentGiven?: boolean;
  consentDate?: string;
  consentDocument?: string;
  guarantorSignature?: string;
  notifiedOfDefault?: boolean;
  notificationDate?: string;
  actionId?: string;
  actionType?: 'reminder' | 'warning' | 'meeting' | 'salary_attachment' | 'guarantor_contact' | 'legal_notice' | 'legal_action' | 'other';
  actionDate?: string;
  actionBy?: string; // Ref: User
  description?: string;
  response?: string;
  effective?: boolean;
  restructureId?: string;
  restructureDate?: string;
  restructureReason?: 'financial_hardship' | 'salary_reduction' | 'emergency' | 'mutual_agreement' | 'other';
  requestedBy?: 'employee' | 'employer';
  originalTerms?: any;
  newTerms?: any;
  approved?: boolean;
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  restructureAgreement?: boolean;
  effectiveDate?: string;
  communicationId?: string;
  communicationType?: 'email' | 'sms' | 'letter' | 'meeting' | 'phone';
  date?: string;
  purpose?: 'application_received' | 'approval' | 'rejection' | 'disbursement' | 'payment_reminder' | 'missed_payment' | 'default_warning' | 'clearance' | 'other';
  subject?: string;
  message?: string;
  sentTo?: string;
  sentBy?: string; // Ref: User
  attachments?: string;
  responseReceived?: boolean;
  responseDate?: string;
  loanId?: string;
  loanNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  department?: string;
  jobTitle?: string;
  loanType?: 'personal' | 'housing' | 'vehicle' | 'education' | 'emergency' | 'marriage' | 'medical' | 'hajj' | 'furniture' | 'computer' | 'travel' | 'debt_consolidation' | 'other';
  loanTypeAr?: string;
  loanCategory?: 'regular' | 'emergency' | 'special';
  loanAmount?: number;
  approvedAmount?: number;
  currency?: string;
  purpose?: string;
  purposeAr?: string;
  detailedPurpose?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  repayment?: 'monthly' | 'bi_weekly' | 'quarterly';
  balance?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted' | 'cancelled';
  applicationStatus?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  applicationDate?: string;
  approvalDate?: string;
  disbursementDate?: string;
  principalAmount?: number;
  interestRate?: number;
  interestType?: 'simple' | 'compound' | 'flat' | 'none';
  islamicFinance?: 'murabaha' | 'tawarruq' | 'qard_hassan' | 'musharaka';
  processingFee?: 'loan_amount' | 'salary' | 'separate_payment';
  totalAmountPayable?: number;
  earlyRepayment?: boolean;
  latePayment?: number;
  eligible?: boolean;
  ineligibilityReasons?: string;
  creditLimit?: boolean;
  salaryDeductionRatio?: number;
  approvalWorkflow?: 'pending' | 'approved' | 'rejected';
  disbursementMethod?: 'bank_transfer' | 'cash' | 'check' | 'third_party_payment';
  bankTransfer?: 'pending' | 'processed' | 'completed' | 'failed';
  check?: boolean;
  cash?: string; // Ref: User
  thirdPartyPayment?: any;
  disbursed?: boolean;
  disbursementDate?: string;
  actualDisbursedAmount?: number;
  deductionType?: 'processing_fee' | 'insurance' | 'advance_installment' | 'other';
  deductionAmount?: number;
  description?: string;
  netDisbursedAmount?: number;
  confirmationRequired?: boolean;
  confirmed?: boolean;
  confirmedBy?: string; // Ref: User
  confirmationDate?: string;
  paymentPerformance?: 'excellent' | 'good' | 'fair' | 'poor';
  guaranteeRequired?: boolean;
  guaranteeType?: 'personal_guarantee' | 'collateral' | 'salary_assignment' | 'bank_guarantee' | 'insurance';
  salaryAssignment?: boolean;
  inDefault?: boolean;
  defaultDate?: string;
  defaultReason?: 'non_payment' | 'employment_termination' | 'bankruptcy' | 'whereabouts_unknown' | 'other';
  consecutiveMissedPayments?: number;
  totalMissedPayments?: number;
  outstandingAmount?: number;
  penaltiesAccrued?: number;
  totalAmountDue?: number;
  guarantorNotified?: boolean;
  guarantorNotificationDate?: string;
  guarantorPayment?: boolean;
  legalAction?: 'filed' | 'ongoing' | 'judgment' | 'settled' | 'closed';
  recovered?: boolean;
  recoveryDate?: string;
  recoveryAmount?: number;
  writeOff?: boolean; // Ref: User
  requested?: boolean;
  requestDate?: string;
  calculation?: any;
  approved?: boolean;
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  settlement?: 'lump_sum' | 'from_settlement' | 'from_salary' | 'bank_transfer';
  clearanceLetter?: boolean;
  guaranteeReleased?: boolean;
  releaseDate?: string;
  collateralReturned?: boolean;
  returnDate?: string;
  employeeExiting?: boolean;
  exitDate?: string;
  exitType?: 'resignation' | 'termination' | 'retirement' | 'death';
  outstandingBalance?: number;
  settledFromFinalSettlement?: boolean;
  settlementAmount?: number;
  settlementDate?: string;
  shortfall?: boolean;
  beneficiary?: string;
  insuranceClaim?: boolean;
  waiver?: boolean; // Ref: User
  clearanceLetter?: boolean;
  offboardingId?: string; // Ref: Offboarding
  payrollDeduction?: 'monthly' | 'bi_weekly';
  payrollRunId?: string; // Ref: PayrollRun
  payrollMonth?: number;
  payrollYear?: number;
  deductionDate?: string;
  installmentNumber?: number;
  deductedAmount?: number;
  remainingBalance?: number;
  processedBy?: string; // Ref: User
  salarySlipReference?: string;
  payrollRunId?: string; // Ref: PayrollRun
  payrollDate?: string;
  failureReason?: 'insufficient_salary' | 'employee_on_leave' | 'salary_not_processed' | 'manual_hold' | 'other';
  scheduledAmount?: number;
  resolved?: boolean;
  resolutionDate?: string;
  resolutionMethod?: string;
  loanCompleted?: boolean;
  completionDate?: string;
  completionMethod?: 'full_repayment' | 'early_settlement' | 'write_off' | 'exit_settlement' | 'guarantor_payment' | 'legal_recovery';
  finalPayment?: any;
  clearanceLetter?: boolean;
  guaranteeReleased?: boolean;
  releaseDate?: string;
  collateralReturned?: boolean;
  caseClosed?: boolean;
  closedDate?: string;
  closedBy?: string; // Ref: User
  notes?: any;
  analytics?: number;
  relatedRecords?: string; // Ref: Employee
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  group?: any;
  group?: any;
  sum?: any;
  sum?: any;
  totalRepaid?: any;
  match?: any;
  applications?: any;
  sum?: any;
  sum?: any;
  elemMatch?: any;
  thisMonth?: any;
  applicationStatus?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePromotion {
  _id: string;
  promotionId?: string;
  employeeId?: string; // Ref: Employee
  fromDesignation: string; // Ref: Designation
  fromDepartment?: string; // Ref: Department
  fromGrade?: string;
  fromSalary: number;
  toDesignation: string; // Ref: Designation
  toDepartment?: string; // Ref: Department
  toGrade?: string;
  toSalary: number;
  salaryIncrement?: number;
  incrementPercentage?: number;
  incrementType?: 'fixed' | 'percentage' | 'grade_based';
  componentId?: string; // Ref: SalaryComponent
  componentName?: string;
  fromAmount?: number;
  toAmount?: number;
  changeAmount?: number;
  promotionDate?: string;
  effectiveDate?: string;
  promotionType?: 'regular' | 'merit' | 'position_change' | 'acting' | 'interim';
  promotionReason: string;
  performanceRating?: string;
  achievements?: string;
  notes?: string;
  hrComments?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'applied' | 'cancelled';
  level?: number;
  approver?: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  date?: string;
  currentApprovalLevel?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  isApplied?: boolean;
  appliedAt?: string;
  appliedBy?: string; // Ref: User
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  inc?: any;
  elemMatch?: any;
  effectiveDate?: any;
  match?: any;
  count?: any;
  avgIncrementPercentage?: any;
  totalSalaryIncrease?: any;
  sort?: any;
  match?: any;
  totalPromotions?: any;
  avgIncrementPercentage?: any;
  totalSalaryIncrease?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSkillMap {
  _id: string;
  date?: string;
  changeType?: 'level_change' | 'certification_added' | 'certification_renewed' | 'certification_expired' | 'verification_updated' | 'assessment_completed' | 'cpd_added';
  fromLevel?: number;
  toLevel?: number;
  fromProgress?: number;
  toProgress?: number;
  reason?: string;
  reasonAr?: string;
  verifiedBy?: string; // Ref: User
  notes?: string;
  evidence?: string;
  activityType: 'course' | 'conference' | 'webinar' | 'workshop' | 'self_study' | 'mentoring' | 'publication' | 'certification' | 'project' | 'other';
  activityName: string;
  activityNameAr?: string;
  provider?: string;
  providerAr?: string;
  startDate?: string;
  endDate?: string;
  credits: number;
  verificationUrl?: string;
  certificateUrl?: string;
  description?: string;
  verifiedBy?: string; // Ref: User
  verifiedAt?: string;
  createdAt?: string;
  resourceId?: string;
  resourceType?: 'course' | 'book' | 'video' | 'article' | 'practice' | 'mentorship' | 'certification';
  resourceName?: string;
  provider?: string;
  targetLevel?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  progressPercent?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  employeeId?: string; // Ref: Employee
  skillId?: string; // Ref: Skill
  proficiencyLevel: number;
  levelProgress?: number;
  effectiveProficiency?: number;
  selfAssessedLevel?: number;
  selfAssessedProgress?: number;
  selfAssessedAt?: string;
  selfConfidence?: number;
  managerAssessedLevel?: number;
  managerAssessedProgress?: number;
  managerAssessedBy?: string; // Ref: User
  managerAssessedAt?: string;
  managerNotes?: string;
  peerAverageLevel?: number;
  peerRatingsCount?: number;
  lastPeerReviewAt?: string;
  calibratedLevel?: number;
  calibratedProgress?: number;
  calibratedBy?: string; // Ref: User
  calibratedAt?: string;
  targetLevel?: number;
  targetDate?: string;
  gap?: number;
  gapPercentage?: number;
  trend?: 'improving' | 'stable' | 'declining' | 'new';
  trendPeriod?: string;
  isVerified?: boolean;
  verificationDate?: string;
  verifiedBy?: string; // Ref: User
  verificationMethod?: 'certification' | 'test' | 'assessment' | 'portfolio' | 'reference' | 'manager_approval' | 'peer_endorsement' | 'project_evidence' | 'none';
  verificationDetails?: string;
  verificationEvidence?: string;
  hasCertification?: boolean;
  certificationName?: string;
  certificationNameAr?: string;
  certificationNumber?: string;
  certificationBody?: string;
  certificationBodyAr?: string;
  certificationBodyUrl?: string;
  certificationDate?: string;
  certificationExpiry?: string;
  isCertificationExpired?: boolean;
  certificationDocumentUrl?: string;
  certificationCredlyUrl?: string;
  renewalReminderSent?: boolean;
  renewalReminderDate?: string;
  renewalInProgressDate?: string;
  cpdRequired?: boolean;
  cpdCreditsRequired?: number;
  cpdCreditsEarned?: number;
  cpdPeriodStart?: string;
  cpdPeriodEnd?: string;
  yearsOfExperience?: number;
  acquiredDate?: string;
  acquiredMethod?: 'training' | 'education' | 'self_taught' | 'on_job' | 'certification' | 'prior_experience';
  isPrimarySkill?: boolean;
  usageFrequency?: 'daily' | 'weekly' | 'monthly' | 'rarely' | 'not_used';
  lastUsedDate?: string;
  relatedTrainingId?: string; // Ref: TrainingProgram
  trainingCompletedDate?: string;
  developmentPlan?: string;
  developmentPlanAr?: string;
  action?: string;
  actionAr?: string;
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  nextReviewDate?: string;
  reviewCycle?: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  mentorId?: string; // Ref: Employee
  mentorshipStartDate?: string;
  endorsedBy?: string; // Ref: User
  endorserName?: string;
  endorserRole?: string;
  relationship?: 'manager' | 'peer' | 'direct_report' | 'client' | 'external';
  comment?: string;
  endorsedAt?: string;
  endorsementCount?: number;
  isActive?: boolean;
  notes?: string;
  notesAr?: string;
  name?: string;
  url?: string;
  type?: 'certificate' | 'portfolio' | 'evidence' | 'badge' | 'transcript' | 'other';
  uploadedAt?: string;
  uploadedBy?: string; // Ref: User
  employeeId?: any;
  employee?: any;
  certificationExpiry?: any;
  cpdPeriodEnd?: any;
  expr?: any;
  match?: any;
  group?: any;
  sort?: any;
  nextReviewDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTransfer {
  _id: string;
  transferId?: string;
  employeeId?: string; // Ref: Employee
  fromDepartment: string; // Ref: Department
  fromBranch?: string; // Ref: Branch
  fromLocation?: string;
  fromCity?: string;
  fromReportingManager?: string; // Ref: Employee
  toDepartment: string; // Ref: Department
  toBranch?: string; // Ref: Branch
  toLocation?: string;
  toCity?: string;
  toReportingManager?: string; // Ref: Employee
  transferType: 'permanent' | 'temporary' | 'deputation' | 'secondment';
  requestDate?: string;
  transferDate?: string;
  effectiveDate?: string;
  endDate?: string;
  transferReason: 'business_requirement' | 'employee_request' | 'restructuring' | 'project_assignment' | 'career_development' | 'disciplinary' | 'performance_based' | 'other';
  reasonDetails?: string;
  salaryChange?: number;
  transferAllowance?: number;
  relocationAllowance?: number;
  allowanceDuration?: number;
  designationChange?: boolean;
  fromDesignation?: string; // Ref: Designation
  toDesignation?: string; // Ref: Designation
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'applied' | 'completed' | 'cancelled';
  level?: number;
  approver?: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  date?: string;
  currentApprovalLevel?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  isApplied?: boolean;
  appliedAt?: string;
  appliedBy?: string; // Ref: User
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  notes?: string;
  hrComments?: string;
  handoverNotes?: string;
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  inc?: any;
  elemMatch?: any;
  effectiveDate?: any;
  transferType?: any;
  endDate?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  _id: string;
  name?: string;
  address?: string;
  room?: string;
  virtualLink?: string;
  virtualPlatform?: 'zoom' | 'teams' | 'google_meet' | 'webex' | 'other';
  instructions?: string;
  coordinates?: any;
  userId?: string; // Ref: User
  email?: string;
  name?: string;
  phone?: string;
  role?: 'organizer' | 'required' | 'optional' | 'resource';
  status?: 'invited' | 'confirmed' | 'declined' | 'tentative' | 'no_response';
  responseStatus?: 'pending' | 'accepted' | 'declined' | 'tentative';
  isRequired?: boolean;
  responseNote?: string;
  respondedAt?: string;
  notificationSent?: boolean;
  title: string;
  description?: string;
  duration?: number;
  presenter?: string; // Ref: User
  presenterName?: string;
  notes?: string;
  order?: number;
  completed?: boolean;
  description: string;
  assignedTo?: string; // Ref: User
  assigneeName?: string;
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: 'notification' | 'push' | 'email' | 'sms' | 'whatsapp';
  beforeMinutes: number;
  sent?: boolean;
  sentAt?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  eventId?: string;
  title?: string;
  description?: string;
  type?: 'hearing' | 'court_date' | 'meeting' | 'client_meeting' | 'deposition' | 'mediation' | 'arbitration' | 'deadline' | 'filing_deadline' | 'conference_call' | 'internal_meeting' | 'training' | 'webinar' | 'consultation' | 'task' | 'other';
  status?: 'scheduled' | 'confirmed' | 'tentative' | 'canceled' | 'cancelled' | 'postponed' | 'completed' | 'in_progress' | 'rescheduled';
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  timezone?: string;
  locationString?: string;
  organizer?: string; // Ref: User
  caseId?: string; // Ref: Case
  clientId?: string; // Ref: User
  taskId?: string; // Ref: Task
  reminderId?: string; // Ref: Reminder
  invoiceId?: string; // Ref: Invoice
  courtDetails?: 'general_court' | 'criminal_court' | 'family_court' | 'commercial_court' | 'labor_court' | 'appeal_court' | 'supreme_court' | 'administrative_court' | 'enforcement_court';
  virtualMeeting?: 'zoom' | 'teams' | 'google_meet' | 'webex' | 'other';
  minutesNotes?: string;
  minutesRecordedBy?: string; // Ref: User
  minutesRecordedAt?: string;
  recurrence?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'[]; // Ref: Event
  isRecurringInstance?: boolean;
  parentEventId?: string; // Ref: Event
  calendarSync?: 'synced' | 'pending' | 'failed' | 'not_synced';
  locationTrigger?: 'arrive' | 'leave' | 'nearby';
  color?: string;
  visibility?: 'public' | 'private' | 'confidential';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  billing?: 'hourly' | 'fixed_fee' | 'retainer' | 'pro_bono' | 'not_billable'; // Ref: Invoice
  completedAt?: string;
  completedBy?: string; // Ref: User
  outcome?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string; // Ref: User
  sortOrder?: number;
  followUpRequired?: boolean;
  followUpTaskId?: string; // Ref: Task
  followUpNotes?: string;
  cancelledAt?: string;
  cancelledBy?: string; // Ref: User
  cancellationReason?: string;
  postponedTo?: string;
  postponementReason?: string;
  notes?: string;
  type?: string[];
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  createdAt?: any;
  startDateTime?: any;
  endDateTime?: any;
  endDateTime?: any;
  status?: any;
  startDateTime?: any;
  status?: any;
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  group?: any;
  sort?: any;
  startDateTime?: any;
  status?: any;
  startDateTime?: any;
  status?: any;
  byStatus?: any;
  status?: any;
  startDateTime?: any;
  endDateTime?: any;
  startDateTime?: any;
  endDateTime?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  _id: string;
  baseCurrency?: string;
  targetCurrency?: string;
  rate?: number;
  inverseRate?: number;
  source?: 'manual' | 'api' | 'bank' | 'ecb' | 'openexchange' | 'currencyapi' | 'sama';
  effectiveDate?: string;
  expiresAt?: string;
  isActive?: boolean;
  provider?: string;
  metadata?: any;
  lastSyncedAt?: string;
  notes?: string;
  effectiveDate?: any;
  effectiveDate?: any;
  sort?: any;
  group?: any;
  project?: any;
  sort?: any;
  effectiveDate?: any;
  expiresAt?: any;
  group?: any;
  project?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRateRevaluation {
  _id: string;
  accountId: string; // Ref: Account
  accountCode: string;
  accountName: string;
  currency: string;
  foreignBalance: number;
  previousRate: number;
  currentRate: number;
  previousBookValue: number;
  currentValue: number;
  gainLoss: number;
  type: 'gain' | 'loss' | 'none';
  glEntryId?: string; // Ref: GeneralLedger
  revaluationNumber: string;
  revaluationDate: string;
  baseCurrency: string;
  type?: string;
  fiscalYear: number;
  fiscalMonth: number;
  summary?: number;
  gainAccountId?: string; // Ref: Account
  lossAccountId?: string; // Ref: Account
  status?: 'draft' | 'posted' | 'reversed';
  notes?: string;
  postedBy?: string; // Ref: User
  postedAt?: string;
  reversedBy?: string; // Ref: User
  reversedAt?: string;
  reversalReason?: string;
  revaluationNumber?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  meta?: any;
  meta?: any;
  status?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  expenseId?: string;
  expenseNumber?: string;
  description?: string;
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  category?: string;
  date?: string;
  paymentMethod?: string;
  vendor?: string;
  receiptNumber?: string;
  currency?: string;
  expenseType?: 'reimbursable' | 'non_reimbursable' | 'company' | 'personal';
  employeeId?: string; // Ref: Employee
  reimbursementStatus?: 'pending' | 'approved' | 'paid' | 'rejected';
  reimbursedAmount?: number;
  reimbursedAt?: string;
  isBillable?: boolean;
  clientId?: string; // Ref: Client
  caseId?: string; // Ref: Case
  markupType?: 'none' | 'percentage' | 'fixed';
  markupValue?: number;
  billableAmount?: number;
  billingStatus?: 'unbilled' | 'billed' | 'invoiced';
  invoiceId?: string; // Ref: Invoice
  invoicedAt?: string;
  taxRate?: number;
  taxReclaimable?: boolean;
  type?: string;
  purpose?: string;
  departureLocation?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  numberOfDays?: number;
  type?: string;
  mileage?: 'company_car' | 'personal_car' | 'rental';
  perDiem?: boolean;
  governmentReference?: string;
  departmentId?: string; // Ref: Department
  locationId?: string; // Ref: Location
  projectId?: string; // Ref: Project
  costCenterId?: string; // Ref: CostCenter
  receipt?: any;
  type?: 'invoice' | 'authorization' | 'quote' | 'other';
  filename?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  uploadedAt?: string;
  receiptUrl?: string;
  hasReceipt?: boolean;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid' | 'invoiced';
  submittedBy?: string; // Ref: User
  submittedAt?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  internalNotes?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  recurringEndDate?: string;
  expenseAccountId?: string; // Ref: Account
  bankAccountId?: string; // Ref: Account
  glEntryId?: string; // Ref: GeneralLedger
  createdAt?: any;
  totalExpenses?: any;
  totalAmount?: any;
  totalTax?: any;
  billableExpenses?: any;
  nonBillableExpenses?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  expenseCount?: any;
  group?: any;
  project?: any;
  sort?: any;
  set?: any;
  expenseType?: any;
  reimbursementStatus?: any;
  group?: any;
  lookup?: any;
  unwind?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseClaim {
  _id: string;
  dailyLimits?: any;
  requiresReceipt?: any;
  requiresApproval?: any;
  mileageRates?: any;
  travelPolicies?: any;
  lineItemId?: string;
  category?: 'travel' | 'meals' | 'accommodation' | 'transportation' | 'office_supplies' | 'communication' | 'professional_services' | 'training' | 'entertainment' | 'court_fees' | 'legal_research' | 'client_expenses' | 'mileage' | 'parking' | 'tolls' | 'other';
  description?: string;
  descriptionAr?: string;
  expenseDate?: string;
  vendor?: string;
  vendorAr?: string;
  amount?: number;
  vatAmount?: number;
  totalAmount?: number;
  currency?: string;
  exchangeRate?: number;
  amountInSAR?: number;
  receiptStatus?: 'attached' | 'missing' | 'invalid' | 'verified';
  receiptUrl?: string;
  receiptNumber?: string;
  isBillable?: boolean;
  clientId?: string; // Ref: Client
  clientName?: string;
  caseId?: string; // Ref: Case
  caseNumber?: string;
  projectCode?: string;
  costCenter?: string;
  notes?: string;
  mileage?: 'personal' | 'rental' | 'company';
  perDiem?: 'breakfast' | 'lunch' | 'dinner' | 'daily_allowance';
  policyCompliance?: boolean; // Ref: User
  approved?: boolean;
  approvedAmount?: number;
  rejectionReason?: string;
  flagged?: boolean;
  flagReason?: string;
  flightNumber?: string;
  airline?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureDate?: string;
  departureTime?: string;
  class?: 'economy' | 'premium_economy' | 'business' | 'first';
  ticketCost?: number;
  baggageCost?: number;
  bookingReference?: string;
  policyCompliant?: boolean;
  policyClass?: string;
  ticketUrl?: string;
  boardingPassUrl?: string;
  hotelName?: string;
  city?: string;
  country?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  roomRate?: number;
  totalCost?: number;
  bookingReference?: string;
  policyCompliant?: boolean;
  policyRate?: number;
  invoiceUrl?: string;
  type?: 'taxi' | 'uber' | 'rental' | 'company_driver' | 'train' | 'bus' | 'metro' | 'other';
  date?: string;
  description?: string;
  from?: string;
  to?: string;
  amount?: number;
  purpose?: string;
  receiptUrl?: string;
  journeyId?: string;
  journeyDate?: string;
  fromLocation?: string;
  toLocation?: string;
  purpose?: string;
  purposeAr?: string;
  distanceKm?: number;
  roundTrip?: boolean;
  vehicleType?: 'personal_car' | 'company_car' | 'rental';
  vehiclePlate?: string;
  mileageRate?: number;
  mileageAmount?: number;
  routeVerified?: boolean;
  actualDistance?: number;
  googleMapsUrl?: string;
  clientId?: string; // Ref: Client
  clientName?: string;
  caseId?: string; // Ref: Case
  billable?: boolean;
  notes?: string;
  transactionId?: string;
  cardLastFour?: string;
  transactionDate?: string;
  postingDate?: string;
  merchantName?: string;
  merchantCategory?: string;
  originalAmount?: number;
  originalCurrency?: string;
  billedAmount?: number;
  billedCurrency?: string;
  isReconciled?: boolean;
  reconciledLineItemId?: string;
  reconciledDate?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  status?: 'matched' | 'unmatched' | 'disputed' | 'personal';
  personalTransaction?: boolean;
  notes?: string;
  receiptId?: string;
  lineItemId?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  ocrExtracted?: boolean;
  extractedData?: any;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verifiedOn?: string;
  thumbnail?: string;
  stepNumber?: number;
  stepName?: string;
  stepNameAr?: string;
  approverRole?: string;
  approvalThreshold?: any;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'returned' | 'skipped';
  actionDate?: string;
  decision?: 'approve' | 'reject' | 'reduce_amount' | 'request_clarification';
  itemId?: string;
  approved?: boolean;
  approvedAmount?: number;
  rejectionReason?: string;
  totalApprovedAmount?: number;
  comments?: string;
  commentsAr?: string;
  question?: string;
  response?: string;
  respondedDate?: string;
  attachments?: string;
  notificationSent?: boolean;
  notificationDate?: string;
  responseTime?: number;
  violationType?: string;
  violationTypeAr?: string;
  description?: string;
  descriptionAr?: string;
  severity?: 'warning' | 'violation' | 'exception_required';
  lineItemId?: string;
  amount?: number;
  requiresJustification?: boolean;
  justificationProvided?: boolean;
  justification?: string;
  requiresException?: boolean;
  exceptionGranted?: boolean;
  exceptionGrantedBy?: string; // Ref: User
  communicationId?: string;
  communicationType?: 'email' | 'sms' | 'system_notification' | 'comment';
  date?: string;
  purpose?: 'submission_confirmation' | 'approval_request' | 'clarification_request' | 'approval_notification' | 'rejection_notification' | 'payment_notification' | 'reminder' | 'other';
  from?: string;
  to?: string;
  subject?: string;
  message?: string;
  attachments?: string;
  read?: boolean;
  readDate?: string;
  responseRequired?: boolean;
  responseReceived?: boolean;
  responseDate?: string;
  documentType?: 'receipt' | 'invoice' | 'ticket' | 'boarding_pass' | 'hotel_bill' | 'taxi_receipt' | 'expense_report' | 'approval_email' | 'travel_authorization' | 'affidavit' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  linkedToItem?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  ocrProcessed?: boolean;
  ocrData?: any;
  thumbnail?: string;
  court?: string;
  caseNumber?: string;
  feeType?: 'filing_fee' | 'hearing_fee' | 'judgment_fee' | 'execution_fee' | 'other';
  amount?: number;
  receiptNumber?: string;
  receiptUrl?: string;
  billableToClient?: boolean;
  serviceType?: 'expert_witness' | 'translator' | 'notary' | 'court_reporter' | 'process_server' | 'investigator' | 'appraiser' | 'other';
  providerName?: string;
  serviceDate?: string;
  amount?: number;
  caseNumber?: string;
  billableToClient?: boolean;
  invoiceNumber?: string;
  invoiceUrl?: string;
  claimId?: string;
  claimNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  departmentId?: string; // Ref: Department
  jobTitle?: string;
  costCenter?: string;
  managerId?: string; // Ref: User
  managerName?: string;
  bankDetails?: any;
  hasCorporateCard?: boolean;
  corporateCardNumber?: string;
  claimTitle?: string;
  claimTitleAr?: string;
  expenseType?: 'reimbursement' | 'corporate_card' | 'petty_cash' | 'advance_settlement';
  claimCategory?: 'business_travel' | 'client_related' | 'professional_development' | 'office_operations' | 'legal_professional' | 'personal_reimbursement';
  claimPeriod?: any;
  description?: string;
  descriptionAr?: string;
  businessPurpose?: string;
  businessPurposeAr?: string;
  allocation?: 'project' | 'case' | 'client' | 'department' | 'cost_center' | 'none'; // Ref: Project
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  lineItemsCount?: number;
  totals?: number[];
  isTravelClaim?: boolean;
  tripPurpose?: string;
  tripPurposeAr?: string;
  tripType?: 'domestic' | 'international';
  destination?: string;
  destinationCity?: string;
  destinationCountry?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureDate?: string;
  returnDate?: string;
  tripDays?: number;
  travelApprovalRequired?: boolean;
  travelApproved?: boolean;
  travelApprovalNumber?: string;
  approvedBy?: string; // Ref: User
  totalFlightCost?: number;
  totalAccommodationCost?: number;
  totalTransportationCost?: number;
  perDiem?: boolean;
  visaFees?: number;
  totalTravelCost?: number;
  mileageClaim?: 'personal_car' | 'company_car' | 'rental';
  hasCardTransactions?: boolean;
  cardNumber?: string;
  cardholderName?: string;
  statementPeriod?: any;
  reconciliationSummary?: number;
  advanceSettlement?: boolean; // Ref: EmployeeAdvance
  billable?: boolean; // Ref: Client
  isAttorneyExpense?: boolean;
  courtExpenses?: number;
  professionalServices?: number;
  serviceName?: string;
  subscriptionType?: 'monthly' | 'annual' | 'per_use';
  amount?: number;
  billingPeriod?: string;
  allocated?: boolean;
  allocationMethod?: 'per_case' | 'department' | 'firm_wide';
  totalResearchCosts?: number;
  feeType?: 'document_filing' | 'certified_copy' | 'authentication' | 'registration' | 'publication' | 'other';
  description?: string;
  amount?: number;
  officeName?: string;
  caseNumber?: string;
  billableToClient?: boolean;
  totalFilingFees?: number;
  expenseType?: 'client_meal' | 'client_entertainment' | 'client_gift' | 'conference' | 'networking_event' | 'sponsorship';
  clientName?: string;
  purpose?: string;
  amount?: number;
  attendees?: string;
  numberOfAttendees?: number;
  billable?: boolean;
  totalClientDevelopment?: number;
  status?: 'draft' | 'submitted' | 'under_review' | 'pending_approval' | 'approved' | 'rejected' | 'processing' | 'paid' | 'cancelled';
  vatApplicable?: boolean;
  vatRate?: number;
  totalVatAmount?: number;
  vatRate?: number;
  baseAmount?: number;
  vatAmount?: number;
  vatReceiptAttached?: boolean;
  vendorVatNumbers?: string;
  vatRecovery?: number;
  allReceiptsAttached?: boolean;
  missingReceiptsCount?: number;
  count?: number;
  totalAmount?: number;
  itemId?: string;
  expenseType?: string;
  amount?: number;
  missingReason?: 'lost' | 'electronic_only' | 'vendor_no_receipt' | 'other';
  affidavitProvided?: boolean;
  affidavitUrl?: string;
  withinThreshold?: boolean;
  thresholdAmount?: number;
  compliant?: boolean;
  checkType?: 'receipt_requirement' | 'approval_limit' | 'expense_limit' | 'travel_class' | 'hotel_rate' | 'meal_allowance' | 'per_diem_rate' | 'mileage_rate' | 'entertainment_limit' | 'advance_booking' | 'preferred_vendor';
  checkName?: string;
  checkNameAr?: string;
  passed?: boolean;
  policyRequirement?: string;
  actualValue?: string;
  variance?: number;
  notes?: string;
  overallCompliant?: boolean;
  violationCount?: number;
  exceptionType?: string;
  exceptionReason?: string;
  requestedBy?: string;
  requestDate?: string;
  grantedBy?: string;
  grantedDate?: string;
  conditions?: string;
  amount?: number;
  exceptionsCount?: number;
  advanceApproval?: boolean; // Ref: User
  approvalWorkflow?: 'pending' | 'approved' | 'partially_approved' | 'rejected'[];
  paymentMethod?: 'bank_transfer' | 'cash' | 'check' | 'payroll_addition' | 'corporate_card_credit';
  paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  paymentDate?: string;
  paymentReference?: string;
  approvedAmount?: number;
  deductionType?: 'advance_recovered' | 'personal_card_transaction' | 'policy_violation' | 'tax_withholding' | 'other';
  deductionAmount?: number;
  description?: string;
  totalDeductions?: number;
  netReimbursementAmount?: number;
  bankTransfer?: 'pending' | 'processed' | 'completed' | 'failed';
  check?: boolean;
  payrollAddition?: boolean; // Ref: PayrollRun
  cardOffset?: boolean;
  processedBy?: string; // Ref: User
  processedOn?: string;
  employeeConfirmed?: boolean;
  confirmationDate?: string;
  reimbursementReceipt?: boolean;
  itemId?: string;
  glAccount?: string;
  glAccountName?: string;
  costCenter?: string;
  department?: string;
  project?: string;
  amount?: number;
  vatCode?: string;
  vatAmount?: number;
  journalEntry?: boolean[]; // Ref: JournalEntry
  billableExpenses?: number;
  invoiced?: boolean;
  invoiceNumber?: string;
  invoiceId?: string; // Ref: Invoice
  invoiceDate?: string;
  clientName?: string;
  expenseItems?: string;
  totalBilled?: number;
  paymentReceived?: boolean;
  paymentDate?: string;
  vatSummary?: number[];
  withholdingTax?: boolean;
  internationalTax?: boolean[];
  submissionDate?: string;
  reviewDate?: string;
  approvalDate?: string;
  paymentDate?: string;
  employeeNotes?: string;
  managerNotes?: string;
  managerComments?: string;
  financeNotes?: string;
  financeComments?: string;
  internalNotes?: string;
  itemId?: string;
  commentBy?: string;
  commentDate?: string;
  comment?: string;
  visibility?: 'internal' | 'employee' | 'all';
  submission?: 'web' | 'mobile' | 'email' | 'paper';
  modificationId?: string;
  modifiedOn?: string;
  modifiedBy?: string;
  modificationType?: 'edit' | 'add_item' | 'remove_item' | 'update_amount' | 'add_receipt' | 'status_change';
  field?: string;
  reason?: string;
  approvedBy?: string;
  status?: string;
  changedOn?: string;
  changedBy?: string;
  reason?: string;
  duration?: number;
  stepNumber?: number;
  approver?: string;
  decision?: string;
  actionDate?: string;
  comments?: string;
  action?: string;
  actionDate?: string;
  actionBy?: string;
  amount?: number;
  reference?: string;
  status?: string;
  analytics?: boolean;
  relatedRecords?: string[]; // Ref: Employee
  createdOn?: string;
  lastModifiedOn?: string;
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  group?: any;
  group?: any;
  totalClaimed?: any;
  totalApproved?: any;
  totalPaid?: any;
  sum?: any;
  totalBillable?: any;
  match?: any;
  submissions?: any;
  amount?: any;
  sum?: any;
  sum?: any;
  group?: any;
  status?: any;
  thisMonth?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePolicy {
  _id: string;
  category: string;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  singleTransactionLimit?: number;
  requiresReceipt?: boolean;
  receiptThreshold?: number;
  requiresPreApproval?: boolean;
  preApprovalThreshold?: number;
  type?: string[];
  notes?: string;
  minAmount: number;
  maxAmount?: number;
  approverRole?: string;
  approverUserId?: string; // Ref: User
  requiresMultipleApprovers?: boolean;
  minimumApprovers?: number;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  policyType?: 'standard' | 'travel' | 'client_entertainment' | 'project' | 'custom';
  applicableTo?: 'all' | 'roles' | 'departments' | 'individuals';
  type?: string[];
  type?: string[];
  type?: string[];
  globalLimits?: number;
  receiptPolicy?: boolean[];
  autoApproveBelow?: number;
  requiresManagerApproval?: boolean;
  requiresFinanceApproval?: boolean;
  financeApprovalThreshold?: number;
  reimbursement?: 'bank_transfer' | 'payroll' | 'cash' | 'check';
  perDiem?: boolean;
  mileage?: boolean;
  billableRules?: boolean;
  currency?: 'manual' | 'automatic'[];
  auditSettings?: number[];
  violationPolicy?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  effectiveDate?: string;
  expiryDate?: string;
  usageCount?: number;
  totalExpensesProcessed?: number;
  set?: any;
  globalLimits?: any;
  receiptPolicy?: any;
  reimbursement?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExportJob {
  _id: string;
  entityType: 'clients' | 'cases' | 'contacts' | 'organizations' | 'staff' | 'invoices' | 'time_entries' | 'documents' | 'followups' | 'tags';
  format: 'xlsx' | 'csv' | 'pdf' | 'json';
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  totalRecords?: number;
  error?: string;
  columns?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportTemplate {
  _id: string;
  name: string;
  nameAr?: string;
  entityType: 'clients' | 'cases' | 'contacts' | 'organizations' | 'invoices' | 'time_entries' | 'expenses' | 'documents' | 'followups' | 'tags';
  format: 'xlsx' | 'csv' | 'pdf' | 'json';
  field?: string;
  label?: string;
  labelAr?: string;
  order?: number;
  width?: number;
  format?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldHistory {
  _id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  valueType: 'string' | 'number' | 'date' | 'object' | 'array' | 'boolean' | 'null';
  changeType: 'created' | 'updated' | 'deleted' | 'restored';
  changedBy: string; // Ref: User
  changedAt: string;
  changeReason?: string;
  metadata?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  isReverted?: boolean;
  revertedAt?: string;
  revertedBy?: string; // Ref: User
  changedAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FinalSettlement {
  _id: string;
  settlementNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeSnapshot?: any;
  terminationType?: 'resignation' | '// Standard resignation
            article_74_mutual' | '// Mutual agreement
            article_75_expiry' | '// Contract expiry
            article_77_indefinite' | '// Party termination (indefinite)
            article_80_employer' | '// Employer termination - misconduct
            article_81_employee' | '// Employee resignation - employer breach
            retirement' | '// Retirement
            death' | '// Death of employee
            force_majeure          // Force majeure';
  terminationReason?: string;
  lastWorkingDay?: string;
  noticePeriod?: 'employer' | 'employee' | 'mutual' | 'null';
  serviceDetails: string;
  compensation?: number;
  eosb?: number;
  unpaidSalary?: number;
  accruedLeave?: number;
  overtime?: number;
  bonusCommission?: string;
  description?: string;
  amount?: number;
  totalEarnings?: number;
  advanceBalance?: number;
  loanBalance?: number;
  noticePeriodCompensation?: number;
  item?: string;
  value?: number;
  description?: string;
  amount?: number;
  totalDeductions?: number;
  netSettlement?: number;
  netSettlementInWords?: string;
  netSettlementInWordsArabic?: string;
  payment?: 'pending' | 'approved' | 'processing' | 'paid' | 'cancelled';
  hrClearance?: boolean;
  financeClearance?: boolean;
  itClearance?: boolean;
  adminClearance?: boolean;
  allClearancesCompleted?: boolean;
  documents?: boolean;
  workflow?: string; // Ref: User
  action?: 'created' | 'calculated' | 'reviewed' | 'approved' | 'rejected' | 'paid' | 'modified';
  performedBy?: string; // Ref: User
  performedAt?: string;
  details?: string;
  notes?: string;
  internalNotes?: string;
  inc?: any;
  totalSettlements?: any;
  totalEOSB?: any;
  totalLeaveEncashment?: any;
  totalPaidOut?: any;
  sum?: any;
  sum?: any;
  byTerminationType?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSetup {
  _id: string;
  bankName?: string;
  bankNameAr?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  isDefault?: boolean;
  companyInfo?: string;
  fiscalYear?: number;
  chartOfAccounts?: 'saudi_standard' | 'ifrs' | 'custom';
  currency?: 'manual' | 'daily' | 'weekly'[];
  taxSettings?: 'exclusive' | 'inclusive'[];
  openingBalances?: string; // Ref: JournalEntry
  invoiceSettings?: string[];
  bankTransfer?: boolean;
  cash?: boolean;
  creditCard?: boolean;
  check?: boolean;
  onlinePayment?: boolean;
  mada?: boolean;
  applePay?: boolean;
  tabby?: boolean;
  tamara?: boolean;
  defaultBankAccount?: string;
  currentStep?: number;
  type?: number[];
  setupCompleted?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface Firm {
  _id: string;
  userId: string; // Ref: User
  role?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'departed';
  previousRole?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'null';
  permissions?: 'none' | 'view' | 'edit' | 'full';
  title?: string;
  department?: string;
  joinedAt?: string;
  status?: 'active' | 'departed' | 'suspended' | 'pending';
  departedAt?: string;
  departureReason?: string;
  departureNotes?: string;
  type?: string;
  departureProcessedBy?: string; // Ref: User
  name: string;
  nameArabic?: string;
  nameEnglish?: string;
  description?: string;
  descriptionArabic?: string;
  logo?: string;
  website?: string;
  parentFirmId?: string; // Ref: Firm
  level?: number;
  code?: string;
  industry?: string;
  hierarchySettings?: boolean;
  crNumber?: string;
  unifiedNumber?: string;
  licenseNumber?: string;
  vatRegistration?: boolean;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  name?: string;
  city?: string;
  address?: string;
  phone?: string;
  isHeadquarters?: boolean;
  practiceAreas?: string[];
  ownerId: string; // Ref: User
  defaultCurrency?: string;
  defaultPaymentTerms?: number;
  invoicePrefix?: string;
  invoiceStartNumber?: number;
  currentInvoiceNumber?: number;
  zatcaEnabled?: boolean;
  zatcaEnvironment?: 'sandbox' | 'production';
  showLogo?: boolean;
  invoiceFooter?: string;
  invoiceFooterArabic?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  isDefault?: boolean;
  settings?: string;
  openai?: string;
  anthropic?: string;
  google?: string;
  features?: boolean;
  preferences?: 'openai' | 'google';
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  status?: 'active' | 'trial' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  billingCycle?: 'monthly' | 'annual';
  maxUsers?: number;
  maxCases?: number;
  maxClients?: number;
  maxStorageGB?: number;
  features?: boolean;
  usage?: number;
  enabled?: boolean;
  provider?: 'azure' | 'okta' | 'google' | 'custom' | 'null';
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  metadataUrl?: string;
  attributeMapping?: string;
  allowedDomains?: string;
  autoProvision?: boolean;
  defaultRole?: 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'partner';
  requireEmailVerification?: boolean;
  syncUserAttributes?: boolean;
  lastTested?: string;
  lastTestedBy?: string; // Ref: User
  configuredAt?: string;
  configuredBy?: string; // Ref: User
  ssoEnabled?: boolean;
  ssoProvider?: 'azure' | 'okta' | 'google' | 'custom' | 'null';
  ssoEntityId?: string;
  ssoSsoUrl?: string;
  ssoCertificate?: string;
  ssoMetadataUrl?: string;
  enforce2FA?: boolean;
  passwordPolicy?: number;
  passwordMaxAgeDays?: number;
  passwordHistoryCount?: number;
  requirePasswordChange?: boolean;
  requirePasswordChangeSetAt?: string;
  enablePasswordExpiration?: boolean;
  passwordExpiryWarningDays?: number;
  minPasswordStrengthScore?: number;
  sessionTimeoutMinutes?: number;
  maxSessionsPerUser?: number;
  allowRememberMe?: boolean;
  rememberMeDays?: number;
  ipWhitelist?: string;
  ipWhitelistEnabled?: boolean;
  customLogo?: string;
  customFavicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  whiteLabelEnabled?: boolean;
  companyDisplayName?: string;
  companyDisplayNameAr?: string;
  customEmailDomain?: string;
  customSupportEmail?: string;
  dataRetentionDays?: number;
  autoDeleteOldData?: boolean;
  gdprToolsEnabled?: boolean;
  dataExportEnabled?: boolean;
  dataResidency?: 'me-south-1' | 'eu-central-1' | 'us-east-1' | 'ap-southeast-1';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentMethod?: 'card' | 'bank_transfer' | 'invoice' | 'null';
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  nextBillingDate?: string;
  invoiceEmail?: string;
  billingAddress?: string;
  taxId?: string;
  autoRenew?: boolean;
  marketplace?: boolean;
  connected?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  tenantId?: string;
  tenantName?: string;
  tenantType?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastSyncedAt?: string;
  lastRefreshedAt?: string;
  autoSync?: boolean;
  syncInterval?: 'manual' | 'hourly' | 'daily' | 'weekly';
  syncDirection?: 'to_xero' | 'from_xero' | 'bidirectional';
  lastSync?: any;
  defaultAccountCode?: string;
  defaultTaxType?: string;
  currencyMapping?: Record<string, any>;
  webhooks?: boolean;
  quickbooks?: boolean;
  zohoBooks?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: any;
  unset?: any;
  owner?: any;
  admin?: any;
  partner?: any;
  lawyer?: any;
  paralegal?: any;
  secretary?: any;
  accountant?: any;
  departed?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FirmInvitation {
  _id: string;
  code: string;
  email: string;
  role: 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant';
  permissions?: 'none' | 'view' | 'edit' | 'full';
  message?: string;
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled' | 'declined';
  expiresAt: string;
  invitedBy: string; // Ref: User
  acceptedAt?: string;
  acceptedBy?: string; // Ref: User
  cancelledAt?: string;
  cancelledBy?: string; // Ref: User
  emailSentCount?: number;
  lastEmailSentAt?: string;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalPeriod {
  _id: string;
  periodNumber: number;
  fiscalYear: number;
  name: string;
  nameAr?: string;
  startDate: string;
  endDate: string;
  periodType?: 'monthly' | 'quarterly' | 'annual' | 'adjustment';
  status?: 'future' | 'open' | 'closed' | 'locked';
  closingEntry?: string; // Ref: JournalEntry
  periodBalances?: number;
  lockedBy?: string; // Ref: User
  lockedAt?: string;
  lockReason?: string;
  startDate?: any;
  endDate?: any;
  periodType?: any;
  startDate?: any;
  endDate?: any;
  periodType?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Fleet {
  _id: string;
  vehicleId?: string;
  plateNumber?: string;
  plateNumberAr?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  colorAr?: string;
  vin?: string;
  engineNumber?: string;
  chassisNumber?: string;
  vehicleType: string;
  vehicleClass?: string;
  grossWeight?: number;
  netWeight?: number;
  loadCapacity?: number;
  ownershipType?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  depreciationMethod?: 'straight_line' | 'declining_balance' | 'sum_of_years';
  depreciationRate?: number;
  leaseEndDate?: string;
  monthlyLeaseCost?: number;
  financingDetails?: any;
  fuelType?: string;
  engineCapacity?: number;
  horsepower?: number;
  torque?: number;
  transmission?: 'manual' | 'automatic' | 'cvt' | 'dct';
  driveType?: 'fwd' | 'rwd' | 'awd' | '4wd';
  tankCapacity?: number;
  batteryCapacity?: number;
  seatingCapacity?: number;
  doors?: number;
  currentOdometer?: number;
  odometerUnit?: 'km' | 'mi';
  averageDailyKm?: number;
  lifetimeDistance?: number;
  engineHours?: number;
  status?: string;
  statusReason?: string;
  statusChangedAt?: string;
  status?: string;
  reason?: string;
  changedBy?: string; // Ref: User
  changedAt?: string;
  currentDriverId?: string; // Ref: Employee
  currentDriverName?: string;
  currentDriverNameAr?: string;
  assignedDepartmentId?: string; // Ref: Department
  assignedDepartmentName?: string;
  costCenter?: string;
  registration?: 'private' | 'commercial' | 'government' | 'diplomatic';
  provider?: string;
  providerAr?: string;
  policyNumber?: string;
  startDate?: string;
  expiryDate?: string;
  premium?: number;
  premiumFrequency?: 'monthly' | 'quarterly' | 'annual';
  coverageType?: string;
  coverageAmount?: number;
  deductible?: number;
  beneficiaries?: string;
  documentUrl?: string;
  renewalAlertDays?: number;
  claimNumber?: string;
  incidentDate?: string;
  claimDate?: string;
  amount?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  description?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
  nextServiceOdometer?: number;
  serviceIntervalDays?: number;
  serviceIntervalKm?: number;
  maintenanceAlertDays?: number;
  lastInspectionDate?: string;
  lastInspectionStatus?: string;
  nextInspectionDue?: string;
  inspectionFrequency?: 'daily' | 'weekly' | 'monthly';
  gpsEnabled?: boolean;
  gpsDeviceId?: string;
  lastKnownLocation?: 'inside' | 'outside' | 'unknown';
  name?: string;
  nameAr?: string;
  type?: 'circle' | 'polygon';
  center?: any;
  radius?: number;
  latitude?: number;
  longitude?: number;
  alertOnEntry?: boolean;
  alertOnExit?: boolean;
  isActive?: boolean;
  recallId?: string;
  manufacturer?: string;
  description?: string;
  descriptionAr?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recallDate?: string;
  remedy?: string;
  remedyAr?: string;
  status?: 'open' | 'scheduled' | 'completed';
  completedDate?: string;
  completedBy?: string;
  documentType?: 'registration' | 'insurance' | 'inspection' | 'title' | 'service_record' | 'manual' | 'warranty' | 'other';
  name?: string;
  nameAr?: string;
  url?: string;
  expiryDate?: string;
  uploadedAt?: string;
  uploadedBy?: string; // Ref: User
  url?: string;
  caption?: string;
  captionAr?: string;
  imageType?: 'exterior' | 'interior' | 'damage' | 'document' | 'other';
  uploadedAt?: string;
  telematics?: any;
  metrics?: number;
  disposalInfo?: 'sold' | 'traded' | 'scrapped' | 'donated' | 'stolen';
  notes?: string;
  notesAr?: string;
  tags?: string;
  isActive?: boolean;
  logId?: string;
  vehicleId: string; // Ref: Vehicle
  driverId?: string; // Ref: Employee
  date: string;
  time?: string;
  odometerReading: number;
  previousOdometer?: number;
  distanceTraveled?: number;
  fuelType: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  fullTank?: boolean;
  missedFillups?: number;
  fuelEfficiency?: number;
  co2Emissions?: number;
  station?: string;
  stationAr?: string;
  stationBrand?: string;
  stationLocation?: string;
  stationLatitude?: number;
  stationLongitude?: number;
  paymentMethod?: 'cash' | 'card' | 'fuel_card' | 'corporate_account' | 'mobile';
  fuelCardNumber?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  isVerified?: boolean;
  verifiedBy?: string; // Ref: User
  verifiedAt?: string;
  notes?: string;
  recordId?: string;
  vehicleId: string; // Ref: Vehicle
  maintenanceType: 'scheduled_service' | 'oil_change' | 'tire_rotation' | 'tire_replacement' | 'brake_service' | 'brake_replacement' | 'battery_replacement' | 'air_filter' | 'cabin_filter' | 'spark_plugs' | 'transmission_service' | 'transmission_repair' | 'engine_repair' | 'body_repair' | 'ac_service' | 'alignment' | 'suspension' | 'exhaust' | 'electrical' | 'inspection' | 'recall' | 'accident_repair' | 'windshield' | 'detailing' | 'other';
  maintenanceTypeAr?: string;
  maintenanceCategory?: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  descriptionAr?: string;
  workPerformed?: string;
  workPerformedAr?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
  requestedDate?: string;
  scheduledDate?: string;
  startDate?: string;
  completionDate?: string;
  deferredReason?: string;
  odometerAtService?: number;
  laborCost?: number;
  laborHours?: number;
  laborRate?: number;
  partsCost?: number;
  taxAmount?: number;
  discount?: number;
  totalCost?: number;
  partName?: string;
  partNameAr?: string;
  partNumber?: string;
  manufacturer?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  warrantyMonths?: number;
  isOem?: boolean;
  serviceProvider?: string;
  serviceProviderAr?: string;
  serviceLocation?: string;
  serviceLocationAr?: string;
  technicianName?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  workOrderNumber?: string;
  isWarrantyClaim?: boolean;
  warrantyClaimNumber?: string;
  warrantyPeriodDays?: number;
  warrantyExpiryDate?: string;
  warrantyMileage?: number;
  qualityCheck?: string; // Ref: User
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  approvalNotes?: string;
  name?: string;
  url?: string;
  type?: 'invoice' | 'photo' | 'report' | 'warranty' | 'other';
  uploadedAt?: string;
  notes?: string;
  assignmentId?: string;
  vehicleId: string; // Ref: Vehicle
  driverId: string; // Ref: Employee
  driverName?: string;
  driverNameAr?: string;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string;
  status?: 'active' | 'ended' | 'cancelled' | 'suspended';
  assignmentType?: 'permanent' | 'temporary' | 'trip' | 'pool' | 'project' | 'replacement';
  purpose?: string;
  purposeAr?: string;
  projectId?: string; // Ref: Project
  caseId?: string; // Ref: Case
  startOdometer?: number;
  endOdometer?: number;
  distanceTraveled?: number;
  driverLicenseVerified?: boolean;
  driverLicenseNumber?: string;
  driverLicenseExpiry?: string;
  dailyKmLimit?: number;
  personalUseAllowed?: boolean;
  weekendUseAllowed?: boolean;
  fuelCardProvided?: boolean;
  fuelCardNumber?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  keyHandedOver?: boolean;
  keyHandedOverAt?: string;
  documentsHandedOver?: boolean;
  initialCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  returnCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  approvedBy?: string; // Ref: User
  approvalDate?: string;
  approvalNotes?: string;
  notes?: string;
  inspectionId?: string;
  vehicleId: string; // Ref: Vehicle
  inspectorId: string; // Ref: Employee
  inspectorName?: string;
  inspectionType: string;
  inspectionDate: string;
  odometerReading?: number;
  engineHours?: number;
  location?: string;
  locationAr?: string;
  latitude?: number;
  longitude?: number;
  overallStatus: string;
  code?: string;
  name?: string;
  nameAr?: string;
  category?: string;
  status?: 'pass' | 'fail' | 'na' | 'needs_attention';
  severity?: 'minor' | 'major' | 'critical';
  notes?: string;
  photoUrl?: string;
  description?: string;
  descriptionAr?: string;
  severity?: 'minor' | 'major' | 'critical';
  category?: string;
  photoUrl?: string;
  requiresImmediate?: boolean;
  workOrderCreated?: boolean;
  workOrderId?: string; // Ref: MaintenanceRecord
  driverCertification?: boolean;
  url?: string;
  caption?: string;
  category?: string;
  takenAt?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  maintenanceScheduled?: boolean;
  startTime?: string;
  endTime?: string;
  duration?: number;
  notes?: string;
  notesAr?: string;
  tripId?: string;
  vehicleId: string; // Ref: Vehicle
  driverId: string; // Ref: Employee
  tripType: string;
  purpose?: string;
  purposeAr?: string;
  projectId?: string; // Ref: Project
  caseId?: string; // Ref: Case
  clientId?: string; // Ref: Client
  startTime: string;
  endTime?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startLocation?: any;
  endLocation?: any;
  name?: string;
  nameAr?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  arrivalTime?: string;
  departureTime?: string;
  duration?: number;
  purpose?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
  startOdometer?: number;
  endOdometer?: number;
  distance?: number;
  estimatedDistance?: number;
  drivingMetrics?: number;
  fuelUsed?: number;
  fuelCost?: number;
  tollCost?: number;
  parkingCost?: number;
  otherCosts?: number;
  totalCost?: number;
  costPerKm?: number;
  isReimbursable?: boolean;
  reimbursementRate?: number;
  reimbursementAmount?: number;
  reimbursementStatus?: 'not_requested' | 'pending' | 'approved' | 'rejected' | 'paid';
  reimbursementApprovedBy?: string; // Ref: User
  type?: 'fuel' | 'toll' | 'parking' | 'other';
  amount?: number;
  url?: string;
  description?: string;
  notes?: string;
  notesAr?: string;
  incidentId?: string;
  vehicleId: string; // Ref: Vehicle
  driverId?: string; // Ref: Employee
  driverName?: string;
  incidentType: string;
  severity: string;
  incidentDate: string;
  incidentTime?: string;
  reportedDate?: string;
  location?: string;
  locationAr?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  odometerReading?: number;
  description: string;
  descriptionAr?: string;
  driverStatement?: string;
  accidentDetails?: 'clear' | 'rain' | 'fog' | 'sandstorm' | 'other'[];
  violationDetails?: 'not_contested' | 'pending' | 'won' | 'lost';
  personName?: string;
  personType?: 'driver' | 'passenger' | 'pedestrian' | 'other_driver';
  injurySeverity?: 'minor' | 'moderate' | 'serious' | 'fatal';
  description?: string;
  medicalTreatment?: string;
  hospitalized?: boolean;
  vehicleDamages?: 'pending' | 'in_progress' | 'completed'; // Ref: MaintenanceRecord
  description?: string;
  owner?: string;
  estimatedCost?: number;
  claimFiled?: boolean;
  insuranceClaim?: 'not_filed' | 'pending' | 'approved' | 'rejected' | 'paid';
  investigation?: 'pending' | 'in_progress' | 'completed'; // Ref: User
  url?: string;
  caption?: string;
  category?: 'scene' | 'vehicle_damage' | 'other_vehicle' | 'document' | 'other';
  uploadedAt?: string;
  name?: string;
  url?: string;
  type?: 'police_report' | 'medical' | 'insurance' | 'witness_statement' | 'other';
  uploadedAt?: string;
  status?: 'reported' | 'under_investigation' | 'resolved' | 'closed';
  resolution?: string;
  resolutionDate?: string;
  closedBy?: string; // Ref: User
  totalCost?: number;
  costBreakdown?: number;
  notes?: string;
  notesAr?: string;
  vehicleId: string; // Ref: Vehicle
  timestamp: string;
  location: number;
  speed?: number;
  heading?: number;
  engineStatus?: 'on' | 'off' | 'idle';
  ignitionOn?: boolean;
  odometer?: number;
  address?: string;
  type?: 'speeding' | 'harsh_braking' | 'harsh_acceleration' | 'idle' | 'geofence_entry' | 'geofence_exit';
  value?: number;
  threshold?: number;
  profileId?: string;
  employeeId: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  license: string; // Ref: User
  type?: string;
  number?: string;
  issuedDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  documentUrl?: string;
  medicalCertificate?: boolean;
  drivingHistory?: any;
  safetyRecord?: number[];
  name?: string;
  nameAr?: string;
  type?: 'defensive_driving' | 'first_aid' | 'hazmat' | 'passenger' | 'eco_driving' | 'other';
  provider?: string;
  completedDate?: string;
  expiryDate?: string;
  certificateUrl?: string;
  score?: number;
  overallScore?: number;
  safetyScore?: number;
  efficiencyScore?: number;
  totalTrips?: number;
  totalDistance?: number;
  avgFuelEfficiency?: number;
  harshEvents?: number;
  idleTime?: number;
  lastCalculated?: string;
  name?: string;
  nameAr?: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  availability?: boolean[];
  type?: 'license' | 'medical' | 'training' | 'id' | 'other';
  name?: string;
  url?: string;
  expiryDate?: string;
  uploadedAt?: string;
  status?: 'active' | 'suspended' | 'inactive' | 'terminated';
  statusReason?: string;
  notes?: string;
  notesAr?: string;
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  status?: any;
  nextServiceDue?: any;
  nextServiceOdometer?: any;
  match?: any;
  totalVehicles?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalValue?: any;
  avgOdometer?: any;
  byType?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Followup {
  _id: string;
  action: 'created' | 'updated' | 'completed' | 'cancelled' | 'rescheduled' | 'note_added';
  note?: string;
  previousDueDate?: string;
  newDueDate?: string;
  performedBy?: string; // Ref: User
  performedAt?: string;
  title: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'court_date' | 'document_deadline' | 'payment_reminder' | 'general';
  status?: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  dueTime?: string;
  entityType: 'case' | 'client' | 'contact' | 'organization';
  entityId: string;
  assignedTo?: string; // Ref: User
  completedAt?: string;
  completedBy?: string; // Ref: User
  completionNotes?: string;
  recurring?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  remindBefore?: number;
  dueDate?: any;
  dueDate?: any;
  dueDate?: any;
  dueDate?: any;
  dueDate?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FormulaField {
  _id: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  dateFormat?: string;
  fieldName: string;
  entityType: string;
  relationshipPath?: string;
  type: 'formula' | 'validation' | 'workflow' | 'report';
  referenceId: string;
  referenceName?: string;
  name: string;
  entityType: string;
  formula: string;
  returnType: 'number' | 'text' | 'date' | 'boolean' | 'currency';
  dependencies?: string[];
  cacheEnabled?: boolean;
  cacheInvalidateOn?: string[];
  format?: any;
  isActive?: boolean;
  description?: string;
  entityType: string;
  fieldName: string;
  dependsOn?: any[];
  usedBy?: any[];
  canDelete?: boolean;
  deleteBlockedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneralLedger {
  _id: string;
  entryNumber: string;
  transactionDate?: string;
  description?: string;
  descriptionAr?: string;
  debitAccountId?: string; // Ref: Account
  creditAccountId?: string; // Ref: Account
  amount?: number;
  referenceId?: string;
  referenceModel?: 'Invoice' | 'Payment' | 'Bill' | 'BillPayment' | 'Expense' | 'Retainer' | 'TrustTransaction' | 'JournalEntry' | 'BankTransaction' | 'Payroll';
  referenceNumber?: string;
  caseId?: string; // Ref: Case
  clientId?: string; // Ref: Client
  status?: 'draft' | 'posted' | 'void';
  voidedAt?: string;
  voidedBy?: string; // Ref: User
  voidReason?: string;
  reversingEntryId?: string; // Ref: GeneralLedger
  meta?: any;
  notes?: string;
  postedBy?: string; // Ref: User
  postedAt?: string;
  fiscalYear?: number;
  fiscalMonth?: number;
  toJSON?: any;
  toObject?: any;
  entryNumber?: any;
  meta?: any;
  group?: any;
  group?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceZone {
  _id: string;
  name?: string;
  nameAr?: string;
  description?: string;
  type?: 'circle' | 'polygon';
  center?: number;
  radius?: number;
  latitude?: number;
  longitude?: number;
  settings?: boolean;
  restrictions?: number[]; // Ref: Employee
  type?: string[];
  address?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Gig {
  _id: string;
  userID: string; // Ref: User
  title: string;
  description: string;
  totalStars?: number;
  starNumber?: number;
  category: string;
  price: number;
  cover: string;
  images?: string[];
  shortTitle: string;
  shortDesc: string;
  deliveryTime: string;
  revisionNumber: number;
  features?: string[];
  sales?: number;
  consultationType?: 'video' | 'phone' | 'in-person' | 'document-review' | 'email';
  languages?: string[];
  duration?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GithubIntegration {
  _id: string;
  repoId: number;
  repoName: string;
  fullName: string;
  owner: string;
  description?: string;
  isPrivate?: boolean;
  defaultBranch?: string;
  url?: string;
  htmlUrl?: string;
  connectedAt?: string;
  isActive?: boolean;
  webhookId?: number;
  webhookSecret?: string;
  syncSettings?: boolean;
  commitSha: string;
  caseId: string; // Ref: Case
  repository?: string;
  message?: string;
  author?: string;
  url?: string;
  linkedAt?: string;
  userId: string; // Ref: User
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: string;
  githubUserId: number;
  githubUsername: string;
  githubEmail?: string;
  avatarUrl?: string;
  profileUrl?: string;
  githubName?: string;
  company?: string;
  location?: string;
  bio?: string;
  autoSync?: boolean;
  syncInterval?: 'manual' | 'hourly' | 'daily';
  notifications?: boolean;
  enabled?: boolean;
  tagPattern?: string;
  autoCreateIssues?: boolean;
  autoLinkCommits?: boolean;
  lastSync?: any;
  isActive?: boolean;
  connectedAt?: string;
  disconnectedAt?: string;
  lastSyncedAt?: string;
  lastRefreshedAt?: string;
  rateLimit?: any;
  syncSettings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface GmailIntegration {
  _id: string;
  userId: string; // Ref: User
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresAt: string;
  scope?: string;
  email: string;
  historyId?: string;
  isActive?: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
  connectedAt?: string;
  watchExpiration?: string;
  watchHistoryId?: string;
  syncSettings?: string[];
  syncStats?: number;
  disconnectedAt?: string;
  disconnectedBy?: string; // Ref: User
  disconnectReason?: string;
  expiresAt?: any;
  watchExpiration?: any;
  total?: any;
  active?: any;
  totalSyncs?: any;
  successfulSyncs?: any;
  failedSyncs?: any;
  emailsImported?: any;
  emailsSent?: any;
  attachmentsSynced?: any;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarIntegration {
  _id: string;
  userId: string; // Ref: User
  email?: string;
  displayName?: string;
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresAt: string;
  scope?: string;
  isConnected?: boolean;
  lastSyncedAt?: string;
  lastSyncError?: string;
  calendarId: string;
  name?: string;
  backgroundColor?: string;
  isPrimary?: boolean;
  syncEnabled?: boolean;
  primaryCalendarId?: string;
  autoSync?: 'both' | 'import_only' | 'export_only';
  showExternalEvents?: boolean;
  webhook?: any;
  syncStats?: number;
  connectedAt?: string;
  disconnectedAt?: string;
  disconnectedBy?: string; // Ref: User
  disconnectReason?: string;
  expiresAt?: any;
  expiresAt?: any;
  lastSyncedAt?: any;
  total?: any;
  active?: any;
  autoSyncEnabled?: any;
  totalSyncs?: any;
  successfulSyncs?: any;
  failedSyncs?: any;
  eventsImported?: any;
  eventsExported?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Grievance {
  _id: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  jobTitle?: string;
  department?: string;
  relationshipToComplainant?: 'manager' | 'supervisor' | 'colleague' | 'subordinate' | 'hr' | 'senior_management' | 'other';
  witnessId?: string;
  witnessName?: string;
  witnessNameAr?: string;
  witnessType?: 'employee' | 'external' | 'anonymous';
  contactInfo?: string;
  relationshipToIncident?: string;
  statementProvided?: boolean;
  statementDate?: string;
  statementUrl?: string;
  willingToTestify?: boolean;
  interviewed?: boolean;
  interviewDate?: string;
  interviewNotes?: string;
  evidenceId?: string;
  evidenceType?: 'document' | 'email' | 'message' | 'photo' | 'video' | 'audio' | 'record' | 'testimony' | 'other';
  evidenceDescription?: string;
  evidenceUrl?: string;
  dateObtained?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  admissible?: boolean;
  date?: string;
  transferredFrom?: string;
  transferredTo?: string;
  purpose?: string;
  interviewId?: string;
  interviewDate?: string;
  intervieweeName?: string;
  intervieweeType?: 'complainant' | 'respondent' | 'witness' | 'expert' | 'other';
  interviewer?: string;
  duration?: number;
  location?: string;
  representativePresent?: boolean;
  representativeName?: string;
  recorded?: boolean;
  recordingType?: 'audio' | 'video' | 'written_notes';
  transcriptPrepared?: boolean;
  transcriptUrl?: string;
  summaryOfStatement?: string;
  credibilityAssessment?: 'consistent' | 'inconsistent' | 'neutral';
  followUpRequired?: boolean;
  followUpDate?: string;
  eventId?: string;
  eventType?: 'filed' | 'acknowledged' | 'assessed' | 'investigation_started' | 'interview' | 'evidence_collected' | 'investigation_completed' | 'mediation' | 'resolution' | 'appeal' | 'labor_office' | 'court' | 'closure' | 'other';
  eventDate?: string;
  eventDescription?: string;
  eventDescriptionAr?: string;
  performedBy?: string; // Ref: User
  dueDate?: string;
  onTime?: boolean;
  documents?: string;
  notes?: string;
  communicationId?: string;
  communicationType?: 'email' | 'letter' | 'meeting' | 'phone' | 'portal_notification';
  date?: string;
  from?: string;
  to?: string;
  purpose?: 'acknowledgment' | 'information_request' | 'interview_invitation' | 'interim_update' | 'resolution_notice' | 'appeal_notification' | 'reminder' | 'other';
  subject?: string;
  message?: string;
  attachments?: string;
  sent?: boolean;
  delivered?: boolean;
  read?: boolean;
  readDate?: string;
  responseRequired?: boolean;
  responseReceived?: boolean;
  responseDate?: string;
  documentType?: 'complaint_form' | 'evidence' | 'witness_statement' | 'interview_transcript' | 'investigation_report' | 'mediation_agreement' | 'settlement_agreement' | 'resolution_letter' | 'appeal_notice' | 'labor_office_submission' | 'court_filing' | 'judgment' | 'closure_document' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  confidential?: boolean;
  accessLevel?: 'complainant' | 'respondent' | 'investigators' | 'management' | 'legal' | 'all_parties' | 'restricted';
  expiryDate?: string;
  measureType?: 'separation' | 'suspension' | 'transfer' | 'schedule_change' | 'supervision' | 'access_restriction' | 'no_contact_order' | 'other';
  measureDescription?: string;
  appliedTo?: 'complainant' | 'respondent' | 'both';
  implementationDate?: string;
  duration?: 'temporary' | 'until_resolution' | 'indefinite';
  endDate?: string;
  suspension?: 'with_pay' | 'without_pay';
  transfer?: 'department' | 'location' | 'shift';
  justification?: string;
  implemented?: boolean;
  implementationNotes?: string;
  sessionDate?: string;
  sessionNumber?: number;
  duration?: number;
  location?: string;
  attendees?: string;
  sessionSummary?: string;
  progress?: 'significant' | 'some' | 'none' | 'setback';
  agreementReached?: boolean;
  grievanceId?: string;
  grievanceNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  departmentId?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  grievanceType?: 'compensation' | 'benefits' | 'working_conditions' | 'safety' | 'harassment' | 'discrimination' | 'bullying' | 'retaliation' | 'wrongful_termination' | 'disciplinary_action' | 'performance_evaluation' | 'promotion' | 'transfer' | 'leave' | 'overtime' | 'contract_violation' | 'unfair_treatment' | 'whistleblower' | 'other';
  grievanceTypeAr?: string;
  grievanceCategory?: 'individual' | 'collective' | 'policy_related' | 'legal_violation' | 'ethical_violation';
  grievanceSubject?: string;
  grievanceSubjectAr?: string;
  grievanceDescription?: string;
  grievanceDescriptionAr?: string;
  detailedDescription?: string;
  incidentDetails?: 'one_time' | 'recurring' | 'ongoing';
  type?: 'person' | 'department' | 'policy' | 'decision' | 'practice';
  entity?: 'department' | 'policy' | 'procedure' | 'decision';
  filedDate?: string;
  incidentDate?: string;
  status?: 'submitted' | 'under_review' | 'investigating' | 'resolved' | 'escalated' | 'closed' | 'withdrawn';
  statusDate?: string;
  statusReason?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  severity?: 'minor' | 'moderate' | 'serious' | 'critical';
  urgency?: boolean;
  confidential?: boolean;
  confidentialityLevel?: 'restricted' | 'confidential' | 'highly_confidential';
  anonymousComplaint?: boolean;
  protectedDisclosure?: boolean;
  whistleblowerProtectionRequested?: boolean;
  outcomeSought?: string;
  outcomeSoughtAr?: string;
  request?: string;
  requestType?: 'compensation' | 'apology' | 'policy_change' | 'disciplinary_action' | 'transfer' | 'reinstatement' | 'training' | 'other';
  compensationSought?: 'back_pay' | 'damages' | 'legal_fees' | 'punitive' | 'other';
  filedTime?: string;
  filingMethod?: 'online_portal' | 'email' | 'written_letter' | 'in_person' | 'phone' | 'anonymous_hotline' | 'union';
  receivedBy?: string; // Ref: User
  receivedByName?: string;
  acknowledgment?: 'email' | 'letter' | 'portal_notification' | 'in_person';
  documentType?: string;
  documentName?: string;
  fileUrl?: string;
  uploadedDate?: string;
  verified?: boolean;
  hasRepresentation?: boolean;
  representativeType?: 'union' | 'attorney' | 'colleague' | 'family_member' | 'other';
  representativeName?: string;
  representativeContact?: string;
  powerOfAttorney?: boolean;
  assessed?: boolean;
  assessmentDate?: string;
  assessedBy?: string; // Ref: User
  reviewDate?: string;
  reviewedBy?: string; // Ref: User
  jurisdictionCheck?: 'internal_hr' | 'labor_office' | 'court' | 'external_authority' | 'other';
  validityCheck?: boolean;
  riskAssessment?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  subcategory?: string;
  relatedPolicies?: string;
  violationType?: 'policy' | 'law' | 'regulation' | 'contract';
  reference?: string;
  description?: string;
  recommendation?: 'investigate' | 'mediate' | 'dismiss' | 'escalate' | 'refer';
  reviewNotes?: string;
  approvalToInvestigate?: boolean; // Ref: User
  interimMeasures?: boolean;
  investigationRequired?: boolean;
  investigationStartDate?: string;
  investigationEndDate?: string;
  investigationDuration?: number;
  investigatorId?: string; // Ref: User
  investigatorName?: string;
  investigatorType?: 'internal_hr' | 'internal_legal' | 'external_investigator' | 'external_law_firm' | 'labor_inspector' | 'committee';
  role?: 'lead' | 'assistant' | 'advisor' | 'observer';
  qualifications?: string;
  independentOfParties?: boolean;
  conflictOfInterest?: boolean;
  conflictDetails?: string;
  scope?: string;
  methodology?: string;
  estimatedDuration?: number;
  keyIssues?: string;
  personsToInterview?: string;
  documentsToReview?: string;
  milestone?: string;
  targetDate?: string;
  completed?: boolean;
  completionDate?: string;
  evidenceId?: string;
  evidenceType?: string;
  collectionDate?: string;
  collectedBy?: string;
  sourceLocation?: string;
  description?: string;
  fileUrl?: string;
  date?: string;
  transferredFrom?: string;
  transferredTo?: string;
  purpose?: string;
  analyzed?: boolean;
  analysisDate?: string;
  analysisBy?: string;
  findings?: string;
  documentType?: string;
  documentName?: string;
  reviewDate?: string;
  reviewedBy?: string;
  relevance?: 'high' | 'medium' | 'low';
  keyFindings?: string;
  consultationType?: 'legal' | 'medical' | 'technical' | 'expert';
  consultantName?: string;
  consultationDate?: string;
  purpose?: string;
  findings?: string;
  reportUrl?: string;
  findingsDate?: string;
  substantiated?: boolean;
  findingLevel?: 'substantiated' | 'unsubstantiated' | 'inconclusive' | 'partially_substantiated';
  findingsNarrative?: string;
  findingsNarrativeAr?: string;
  allegation?: string;
  substantiated?: boolean;
  evidence?: string;
  conclusion?: string;
  violationType?: 'policy' | 'law' | 'regulation' | 'contract' | 'ethics';
  violationReference?: string;
  violationDescription?: string;
  violator?: string;
  severity?: 'minor' | 'moderate' | 'serious' | 'severe';
  saudiLaborLawArticle?: string;
  contributingFactors?: string;
  mitigatingFactors?: string;
  aggravatingFactors?: string;
  credibilityAssessment?: 'high' | 'medium' | 'low';
  reportPrepared?: boolean;
  reportDate?: string;
  preparedBy?: string;
  reportUrl?: string;
  executiveSummary?: string;
  recommendation?: string;
  recommendationType?: 'disciplinary' | 'policy_change' | 'training' | 'process_improvement' | 'no_action' | 'other';
  priority?: 'immediate' | 'high' | 'medium' | 'low';
  responsibleParty?: string;
  targetDate?: string;
  reportReviewed?: boolean;
  reviewedBy?: string;
  reviewDate?: string;
  investigationCompleted?: boolean;
  completionDate?: string;
  mediationOffered?: boolean;
  mediationType?: 'voluntary' | 'mandatory' | 'court_ordered';
  complainantAgreed?: boolean;
  respondentAgreed?: boolean;
  bothPartiesAgreed?: boolean;
  mediator?: 'internal' | 'external' | 'labor_office' | 'judicial';
  successful?: boolean;
  settlementReached?: boolean;
  settlementDate?: string;
  termsConfidential?: boolean;
  summary?: string;
  monetarySettlement?: 'lump_sum' | 'installments';
  term?: string;
  termType?: 'apology' | 'policy_change' | 'training' | 'transfer' | 'promotion' | 'reinstatement' | 'reference' | 'other';
  implementationDeadline?: string;
  mutualRelease?: boolean;
  nonAdmissionClause?: boolean;
  confidentialityClause?: boolean;
  nonDisparagement?: boolean;
  settlementAgreement?: boolean;
  failureReason?: string;
  resolved?: boolean;
  resolutionDate?: string;
  resolutionMethod?: 'investigation_findings' | 'mediation_settlement' | 'management_decision' | 'labor_office_decision' | 'court_judgment' | 'withdrawal' | 'dismissal';
  decision?: 'grievance_upheld' | 'grievance_partially_upheld' | 'grievance_denied' | 'settlement_reached' | 'withdrawn' | 'dismissed';
  actionType?: 'disciplinary' | 'corrective' | 'remedial' | 'preventive' | 'compensatory';
  actionDescription?: string;
  actionTarget?: string;
  implementationDate?: string;
  completed?: boolean;
  completionDate?: string;
  verifiedBy?: string;
  disciplinaryAction?: 'verbal_warning' | 'written_warning' | 'suspension' | 'demotion' | 'salary_reduction' | 'termination';
  actionType?: 'compensation' | 'reinstatement' | 'promotion' | 'transfer' | 'back_pay' | 'expungement' | 'apology' | 'training' | 'other';
  actionDescription?: string;
  monetaryValue?: number;
  implementationDeadline?: string;
  implemented?: boolean;
  implementationDate?: string;
  changeType?: 'policy' | 'procedure' | 'training' | 'structure' | 'culture';
  changeDescription?: string;
  responsibleParty?: string;
  targetDate?: string;
  implemented?: boolean;
  resolutionLetter?: 'email' | 'hand_delivery' | 'registered_mail';
  appealAllowed?: boolean;
  appealDeadline?: string;
  appealFiled?: boolean;
  appealFiledDate?: string;
  appealBy?: 'complainant' | 'respondent' | 'both';
  ground?: 'procedural_error' | 'new_evidence' | 'incorrect_findings' | 'excessive_penalty' | 'bias' | 'legal_error' | 'other';
  groundDescription?: string;
  newEvidenceProvided?: boolean;
  newEvidenceUrls?: string;
  appealNarrative?: string;
  reliefSought?: string;
  appealReview?: 'management' | 'senior_management' | 'ceo' | 'board' | 'external';
  escalatedToLaborOffice?: boolean;
  escalationReason?: 'unresolved_internally' | 'employee_request' | 'legal_requirement' | 'serious_violation' | 'mass_dispute';
  escalationDate?: string;
  laborOffice?: any;
  submittedBy?: 'employee' | 'employer' | 'both';
  submissionDate?: string;
  submissionMethod?: 'in_person' | 'online' | 'mail';
  documentType?: 'employment_contract' | 'salary_slips' | 'termination_letter' | 'work_certificate' | 'complaint_letter' | 'evidence' | 'other';
  documentName?: string;
  documentUrl?: string;
  submitted?: boolean;
  receiptNumber?: string;
  receiptDate?: string;
  proceedingDate?: string;
  proceedingType?: 'conciliation' | 'hearing' | 'evidence_review' | 'inspection' | 'decision';
  attendees?: string;
  summary?: string;
  outcome?: string;
  conciliationAttempt?: boolean;
  laborOfficeDecision?: 'in_favor_employee' | 'in_favor_employer' | 'partial' | 'no_jurisdiction'[];
  compliance?: any;
  withdrawn?: boolean;
  withdrawalDate?: string;
  withdrawnBy?: 'complainant' | 'employer_request';
  withdrawalStage?: 'initial' | 'investigation' | 'resolution' | 'appeal' | 'legal';
  withdrawalReason?: string;
  withdrawalReasonCategory?: 'settled_informally' | 'resolved_satisfactorily' | 'lack_of_evidence' | 'fear_of_retaliation' | 'found_other_employment' | 'personal_reasons' | 'other';
  coerced?: boolean;
  withdrawalAgreement?: boolean;
  acceptedBy?: string;
  acceptanceDate?: string;
  monitoringRequired?: boolean;
  monitoringPeriod?: number;
  monitoringStartDate?: string;
  monitoringEndDate?: string;
  incidentDate?: string;
  incidentType?: 'adverse_action' | 'harassment' | 'intimidation' | 'isolation' | 'demotion' | 'termination' | 'other';
  incidentDescription?: string;
  reportedBy?: string;
  reportDate?: string;
  investigated?: boolean;
  retaliatory?: boolean;
  actionTaken?: string;
  protectionType?: string;
  protectionDescription?: string;
  implementationDate?: string;
  active?: boolean;
  closed?: boolean;
  closureDate?: string;
  closureReason?: 'resolved' | 'settled' | 'withdrawn' | 'dismissed' | 'referred_to_authority' | 'judgment_rendered';
  closureApproved?: boolean;
  closedBy?: string; // Ref: User
  lessonsLearned?: any;
  fileRetention?: boolean;
  closureDocument?: string;
  notes?: any;
  compliant?: boolean;
  requirement?: string;
  article?: string;
  compliant?: boolean;
  notes?: string;
  timelyProcessing?: boolean;
  fairProcedure?: boolean;
  rightToDefend?: boolean;
  rightToAppeal?: boolean;
  writtenNotification?: boolean;
  violations?: string;
  confidentialityMaintained?: boolean;
  breachDate?: string;
  breachType?: string;
  breachBy?: string;
  remedialAction?: string;
  processCompliance?: boolean;
  totalDuration?: number;
  investigationDuration?: number;
  resolutionDuration?: number;
  favorableToComplainant?: boolean;
  totalCost?: any;
  vsSimilarGrievances?: 'faster' | 'average' | 'slower';
  status?: any;
  status?: any;
  filedDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface HrAnalyticsSnapshot {
  _id: string;
  snapshotId: string;
  snapshotType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  snapshotDate: string;
  period?: any;
  totalEmployees?: number;
  activeEmployees?: number;
  inactiveEmployees?: number;
  ageRange?: string;
  count?: number;
  percentage?: number;
  averageAge?: number;
  medianAge?: number;
  genderBreakdown?: number;
  department?: string;
  count?: number;
  percentage?: number;
  headcount?: number;
  tenureRange?: string;
  count?: number;
  percentage?: number;
  averageTenure?: number;
  medianTenure?: number;
  nationality?: string;
  count?: number;
  percentage?: number;
  saudization?: 'compliant' | 'at_risk' | 'non_compliant';
  employmentTypeBreakdown?: number;
  level?: string;
  count?: number;
  percentage?: number;
  turnover?: number[];
  totalAbsences?: number;
  totalAbsenceDays?: number;
  absenteeismRate?: number;
  averageAbsencesPerEmployee?: number;
  byType?: number;
  department?: string;
  absences?: number;
  absenceRate?: number;
  patterns?: any;
  costOfAbsenteeism?: any;
  sickLeave?: any;
  totalLeaveRequests?: number;
  approvedLeaves?: number;
  rejectedLeaves?: number;
  pendingLeaves?: number;
  approvalRate?: number;
  totalLeaveDaysTaken?: number;
  averageLeaveDaysPerEmployee?: number;
  leaveType?: string;
  leaveTypeName?: string;
  leaveTypeNameAr?: string;
  count?: number;
  totalDays?: number;
  averageDuration?: number;
  balanceTrends?: any;
  upcomingLeaves?: any;
  carryForward?: any;
  totalAttendanceRecords?: number;
  presentDays?: number;
  absentDays?: number;
  attendanceRate?: number;
  punctuality?: any;
  workingHours?: any;
  overtime?: any;
  complianceIssues?: any;
  averageCheckInTime?: string;
  averageCheckOutTime?: string;
  totalReviews?: number;
  completedReviews?: number;
  pendingReviews?: number;
  overdueReviews?: number;
  completionRate?: number;
  ratingDistribution?: number;
  averageOverallScore?: number;
  averageCompetencyScore?: number;
  averageGoalsScore?: number;
  averageKPIScore?: number;
  performanceTrend?: 'improving' | 'stable' | 'declining';
  ratingChange?: number;
  department?: string;
  averageScore?: number;
  reviewsCompleted?: number;
  topPerformers?: number;
  lowPerformers?: number;
  goalMetrics?: any;
  highPerformers?: number;
  lowPerformers?: number;
  activePIPs?: number;
  completedPIPs?: number;
  totalJobPostings?: number;
  activePostings?: number;
  closedPostings?: number;
  filledPositions?: number;
  fillRate?: number;
  totalApplications?: number;
  screenedApplications?: number;
  interviewedCandidates?: number;
  offersExtended?: number;
  offersAccepted?: number;
  offerAcceptanceRate?: number;
  averageTimeToHire?: number;
  medianTimeToHire?: number;
  position?: string;
  averageDays?: number;
  totalRecruitmentCost?: number;
  costPerHire?: number;
  costBreakdown?: any;
  source?: string;
  applications?: number;
  hires?: number;
  conversionRate?: number;
  costPerHire?: number;
  qualityOfHire?: number;
  pipeline?: any;
  qualityOfHire?: any;
  diversityMetrics?: any;
  totalPayroll?: number;
  averageSalary?: number;
  medianSalary?: number;
  salaryRange?: any;
  range?: string;
  count?: number;
  percentage?: number;
  department?: string;
  averageSalary?: number;
  medianSalary?: number;
  totalPayroll?: number;
  headcount?: number;
  level?: string;
  averageSalary?: number;
  medianSalary?: number;
  count?: number;
  payEquity?: any;
  compaRatio?: any;
  salaryChanges?: any;
  benefits?: any;
  gosiContributions?: any;
  training?: any;
  comparison?: string; // Ref: HRAnalyticsSnapshot
  metadata?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface HrSettings {
  _id: string;
  general?: string;
  workingHours?: number;
  overtime?: number;
  attendance?: boolean;
  leave?: number;
  payroll?: string;
  gosi?: boolean;
  endOfService?: boolean;
  probation?: number;
  noticePeriod?: number;
  holidays?: boolean;
  approvals?: number;
  employeeId?: string;
  documents?: boolean;
  notifications?: boolean;
  lastUpdatedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface HrSetupWizard {
  _id: string;
  stepId: string;
  name: string;
  nameAr?: string;
  description?: string;
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  isOptional?: boolean;
  order: number;
  category: 'basics' | 'structure' | 'policies' | 'payroll' | 'compliance' | 'advanced';
  dependencies?: string;
  validationRules?: any;
  status?: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  totalSteps?: number;
  completedSteps?: number;
  progressPercentage?: number;
  currentStep?: string;
  completedAt?: string;
  completedBy?: string; // Ref: User
  skippedAt?: string;
  skippedBy?: string; // Ref: User
  skipReason?: string;
  lastReminderSent?: string;
  remindersSent?: number;
  doNotRemind?: boolean;
  startedAt?: string;
  startedBy?: string; // Ref: User
  lastUpdatedBy?: string; // Ref: User
  validationRules?: any;
  validationRules?: any;
  validationRules?: any;
  validationRules?: any;
  validationRules?: any;
  validationRules?: any;
  validationRules?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ImportJob {
  _id: string;
  row: number;
  column?: string;
  message: string;
  severity?: 'error' | 'warning';
  userId: string; // Ref: User
  entityType: 'clients' | 'invoices' | 'expenses' | 'cases' | 'contacts' | 'time_entries' | 'payments' | 'organizations' | 'staff' | 'documents' | 'followups' | 'tags';
  fileName: string;
  fileUrl: string;
  sourceFileUrl?: string;
  sourceFileName?: string;
  fileKey?: string;
  fileSize?: number;
  fileMimeType?: string;
  status?: 'pending' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'partial';
  progress?: number;
  totalRows?: number;
  totalRecords?: number;
  processedRows?: number;
  successCount?: number;
  errorCount?: number;
  warningCount?: number;
  skippedCount?: number;
  errorMessages?: any[];
  warnings?: any[];
  importErrors?: any;
  errorReportUrl?: string;
  mapping?: any;
  detectedHeaders?: string[];
  options?: boolean;
  rollbackable?: boolean;
  rolledBack?: boolean;
  rolledBackAt?: string;
  rolledBackBy?: string; // Ref: User
  createdIds?: string[];
  updatedIds?: string[];
  startedAt?: string;
  completedAt?: string;
  validatedAt?: string;
  expiresAt?: string;
  metadata?: any;
  errorMessage?: string;
  options?: any;
  validating?: any;
  validated?: any;
  processing?: any;
  completed?: any;
  failed?: any;
  cancelled?: any;
  partial?: any;
  push?: any;
  inc?: any;
  push?: any;
  inc?: any;
  push?: any;
  inc?: any;
  push?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  _id: string;
  message: string;
  messageAr?: string;
  status: string;
  createdAt?: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'none' | 'minor' | 'major' | 'critical';
  type?: string;
  startedAt: string;
  resolvedAt?: string;
  isPublic?: boolean;
  postmortemUrl?: string;
  group?: any;
  group?: any;
  match?: any;
  project?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentExecution {
  _id: string;
  stepOrder: number;
  stepTitle: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'timeout';
  startedAt?: string;
  completedAt?: string;
  executedBy?: string; // Ref: User
  result?: any;
  error?: string;
  retryCount?: number;
  output?: string;
  notes?: string;
  incidentId: string; // Ref: Incident
  playbookId: string; // Ref: Playbook
  status: 'running' | 'completed' | 'failed' | 'aborted' | 'escalated';
  startedAt: string;
  completedAt?: string;
  currentStep?: number;
  totalSteps: number;
  stepResults?: any[];
  executedBy: string; // Ref: User
  completedBy?: string; // Ref: User
  abortedBy?: string; // Ref: User
  notes?: string;
  escalatedTo?: string; // Ref: User
  escalatedAt?: string;
  escalationReason?: string;
  group?: any;
  match?: any;
  project?: any;
  group?: any;
  total?: any;
  sum?: any;
  successRate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeTaxSlab {
  _id: string;
  fromAmount: number;
  toAmount?: number;
  rate: number;
  fixedAmount?: number;
  name: string;
  nameAr?: string;
  type?: 'fixed' | 'percentage';
  amount?: number;
  percentage?: number;
  maxAmount?: number;
  name: string;
  nameAr?: string;
  countryCode: string;
  currency: string;
  fiscalYear: number;
  effectiveFrom: string;
  effectiveTo?: string;
  period?: 'annual' | 'monthly' | 'weekly';
  personalExemption?: number;
  dependentExemption?: number;
  spouseExemption?: number;
  code: string;
  name?: string;
  nameAr?: string;
  exemptionMultiplier?: number;
  surcharge?: boolean;
  cess?: boolean;
  isActive?: boolean;
  notes?: string;
  deductions?: any;
  exemptions?: any;
  effectiveFrom?: any;
  effectiveTo?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InterCompanyBalance {
  _id: string;
  sourceFirmId: string; // Ref: Firm
  targetFirmId: string; // Ref: Firm
  currentBalance: number;
  currency?: string;
  totalTransactions?: number;
  totalDebits?: number;
  totalCredits?: number;
  lastTransactionId?: string; // Ref: InterCompanyTransaction
  lastTransactionDate?: string;
  lastReconciledBalance?: number;
  lastReconciledAt?: string;
  lastReconciledBy?: string; // Ref: User
  reconciledTransactionCount?: number;
  status?: 'active' | 'suspended' | 'closed';
  notes?: string;
  creditLimit?: number;
  paymentTerms?: number;
  expr?: any;
  creditLimit?: any;
  expr?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InterCompanyTransaction {
  _id: string;
  sourceFirmId: string; // Ref: Firm
  targetFirmId: string; // Ref: Firm
  transactionType: 'sale' | 'purchase' | 'transfer' | 'loan' | 'reimbursement';
  reference?: string;
  description?: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  transactionDate: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  targetDocumentType?: string;
  targetDocumentId?: string;
  status?: 'draft' | 'pending' | 'confirmed' | 'reconciled' | 'cancelled';
  reconciledAt?: string;
  reconciledBy?: string; // Ref: User
  confirmedBy?: string; // Ref: User
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterestArea {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: 'legal_service' | 'practice_area' | 'industry' | 'topic' | 'product' | 'other';
  parentId?: string; // Ref: InterestArea
  color?: string;
  icon?: string;
  usageCount?: number;
  status?: 'active' | 'inactive';
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySettings {
  _id: string;
  defaultWarehouse?: string; // Ref: Warehouse
  defaultValuationMethod?: 'fifo' | 'moving_average' | 'lifo';
  autoCreateBatch?: boolean;
  autoCreateSerialNo?: boolean;
  batchNumberSeries?: string;
  serialNumberSeries?: string;
  allowNegativeStock?: boolean;
  defaultUom?: string;
  enableStockAging?: boolean;
  agingBasedOn?: 'fifo' | 'lifo';
  showItemPriceInListing?: boolean;
  allowItemToBeAddedMultipleTimes?: boolean;
  autoCreatePurchaseOrder?: boolean;
  reorderEmailNotification?: boolean;
  type?: string;
  freezeStockEntries?: 'never' | 'yearly' | 'monthly' | 'weekly';
  roleAllowedToOverrideStopAction?: string;
  enableQualityInspection?: boolean;
  inspectionRequiredBeforeDelivery?: boolean;
  inspectionRequiredBeforePurchase?: boolean;
  overDeliveryAllowance?: number;
  overReceiptAllowance?: number;
  defaultTransitWarehouse?: string; // Ref: Warehouse
  enableWarehouseWiseStockBalance?: boolean;
  includeUomInReport?: boolean;
  convertItemDescToCleanHtml?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  _id: string;
  userId: string; // Ref: User
  companyId?: string;
  investmentId?: string;
  symbol: string;
  name: string;
  nameEn?: string;
  type: string;
  market: string;
  sector?: string;
  sectorEn?: string;
  category?: string;
  tradingViewSymbol?: string;
  yahooSymbol?: string;
  purchaseDate: string;
  purchasePrice: number;
  quantity: number;
  totalCost?: number;
  fees?: number;
  currentPrice?: number;
  currentValue?: number;
  previousClose?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
  lastPriceUpdate?: string;
  priceSource?: 'tradingview' | 'yahoo' | 'manual' | 'tadawul';
  gainLoss?: number;
  gainLossPercent?: number;
  dividendsReceived?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
  dayHigh?: number;
  dayLow?: number;
  weekHigh52?: number;
  weekLow52?: number;
  volume?: number;
  marketCap?: number;
  status?: string;
  notes?: string;
  type?: string;
  currency?: string;
  originalCurrency?: string;
  exchangeRate?: number;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentTransaction {
  _id: string;
  userId: string; // Ref: User
  investmentId: string; // Ref: Investment
  transactionId?: string;
  type: string;
  date: string;
  quantity?: number;
  pricePerUnit?: number;
  amount: number;
  fees?: number;
  netAmount?: number;
  description?: string;
  notes?: string;
  currency?: string;
  exchangeRate?: number;
  referenceNumber?: string;
  brokerName?: string;
  match?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  type?: 'time' | 'expense' | 'flat_fee' | 'product' | 'discount' | 'subtotal' | 'comment';
  date?: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  lineTotal?: number;
  taxable?: boolean;
  attorneyId?: string; // Ref: User
  activityCode?: 'L110' | 'L120' | 'L130' | 'L140' | 'L210' | 'L220' | 'L230' | 'L240';
  timeEntryId?: string; // Ref: TimeEntry
  expenseId?: string; // Ref: Expense
  dueDate: string;
  amount: number;
  status?: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
  paidAmount?: number;
  approverId: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected';
  date?: string;
  notes?: string;
  invoiceNumber: string;
  status?: 'draft' | 'pending_approval' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void' | 'written_off' | 'cancelled';
  clientId: string; // Ref: Client
  clientType?: 'individual' | 'corporate' | 'government';
  caseId?: string; // Ref: Case
  contractId?: string; // Ref: Order
  responsibleAttorneyId?: string; // Ref: User
  issueDate?: string;
  dueDate: string;
  paymentTerms?: 'due_on_receipt' | 'net_7' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90' | 'eom' | 'custom';
  currency?: string;
  firmSize?: 'solo' | 'small' | 'medium' | 'large';
  departmentId?: 'commercial' | 'criminal' | 'corporate' | 'real_estate' | 'labor' | 'family';
  locationId?: 'riyadh' | 'jeddah' | 'dammam' | 'makkah' | 'madinah';
  billingArrangement?: 'hourly' | 'flat_fee' | 'contingency' | 'blended' | 'monthly_retainer' | 'percentage';
  customerPONumber?: string;
  matterNumber?: string;
  subtotal?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  taxableAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  depositAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentProcessing?: boolean;
  paidDate?: string;
  applyFromRetainer?: number;
  retainerTransactionId?: string; // Ref: Retainer
  notes?: string;
  customerNotes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  termsTemplate?: 'standard' | 'corporate' | 'government' | 'custom';
  invoiceType?: '388' | '386' | '383' | '381';
  invoiceSubtype?: '0100000' | '0200000';
  invoiceUUID?: string;
  invoiceHash?: string;
  previousInvoiceHash?: string;
  qrCode?: string;
  xmlInvoice?: string;
  cryptographicStamp?: string;
  status?: 'draft' | 'pending' | 'cleared' | 'reported' | 'rejected';
  clearanceDate?: string;
  rejectionReason?: string;
  sellerVATNumber?: string;
  sellerCR?: string;
  sellerAddress?: string;
  buyerVATNumber?: string;
  buyerCR?: string;
  buyerAddress?: string;
  wip?: 'client_relationship' | 'collection_risk' | 'quality_issue' | 'competitive_pricing' | 'pro_bono';
  budget?: number;
  paymentPlan?: '2' | '3' | '4' | '6' | '12';
  bankAccountId?: string; // Ref: BankAccount
  paymentInstructions?: string;
  enableOnlinePayment?: boolean;
  paymentLink?: string;
  qrCodePayment?: string;
  paymentIntent?: string;
  lateFees?: 'daily_percentage' | 'monthly_percentage' | 'fixed';
  approval?: boolean; // Ref: User
  email?: 'standard' | 'reminder' | 'final_notice' | 'thank_you';
  filename?: string;
  url?: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
  incomeAccountId?: string; // Ref: Account
  receivableAccountId?: string; // Ref: Account
  type?: string;
  accounting?: 'immediate' | 'percentage_completion' | 'milestone' | 'deferred'; // Ref: JournalEntry
  pdfUrl?: string;
  action?: 'created' | 'updated' | 'sent' | 'viewed' | 'paid' | 'partial_payment' | 'cancelled' | 'voided' | 'reminded' | 'approved' | 'rejected' | 'payment_received';
  date?: string;
  user?: string; // Ref: User
  note?: string;
  sentAt?: string;
  viewedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  toJSON?: any;
  toObject?: any;
  match?: any;
  group?: any;
  status?: any;
  dueDate?: any;
  match?: any;
  group?: any;
  meta?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceApproval {
  _id: string;
  level: number;
  userId: string; // Ref: User
  role?: 'manager' | 'director' | 'partner' | 'cfo' | 'admin';
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionAt?: string;
  comments?: string;
  invoiceId: string; // Ref: Invoice
  invoiceAmount: number;
  currentLevel?: number;
  maxLevel?: number;
  status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  escalatedAt?: string;
  escalatedTo?: string; // Ref: User
  escalationReason?: string;
  autoEscalateAfterHours?: number;
  dueDate?: string;
  submittedAt?: string;
  submittedBy: string; // Ref: User
  completedAt?: string;
  submissionNotes?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  status?: any;
  approvers?: any;
  status?: any;
  submittedAt?: any;
  group?: any;
  match?: any;
  approvalTime?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTemplate {
  _id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  type?: 'standard' | 'detailed' | 'summary' | 'retainer' | 'pro_bono' | 'custom';
  isDefault?: boolean;
  isActive?: boolean;
  header?: 'left' | 'center' | 'right';
  clientSection?: boolean;
  itemsSection?: boolean;
  footer?: boolean;
  styling?: 'cairo' | 'tajawal' | 'arial' | 'times';
  numberingFormat?: string;
  taxSettings?: 'inclusive' | 'exclusive' | 'none';
  createdAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  _id: string;
  uom: string;
  conversionFactor: number;
  supplierId: string; // Ref: Vendor
  supplierPartNo?: string;
  leadTimeDays?: number;
  minOrderQty?: number;
  isPreferred?: boolean;
  itemId?: string;
  itemCode?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemType?: 'product' | 'service' | 'consumable' | 'fixed_asset';
  itemGroup?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  stockUom?: string;
  purchaseUom?: string;
  salesUom?: string;
  standardRate?: number;
  valuationRate?: number;
  lastPurchaseRate?: number;
  currency?: string;
  taxRate?: number;
  taxTemplateId?: string; // Ref: TaxTemplate
  isZeroRated?: boolean;
  isExempt?: boolean;
  isStockItem?: boolean;
  hasVariants?: boolean;
  hasBatchNo?: boolean;
  hasSerialNo?: boolean;
  hasExpiryDate?: boolean;
  shelfLifeInDays?: number;
  warrantyPeriod?: number;
  safetyStock?: number;
  reorderLevel?: number;
  reorderQty?: number;
  leadTimeDays?: number;
  valuationMethod?: 'fifo' | 'moving_average' | 'lifo';
  status?: 'active' | 'inactive' | 'discontinued';
  disabled?: boolean;
  image?: string;
  type?: string;
  weightPerUnit?: number;
  weightUom?: string;
  defaultSupplier?: string; // Ref: Vendor
  type?: string;
  customFields?: Record<string, any>;
  toJSON?: any;
  toObject?: any;
  reorderLevel?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ItemGroup {
  _id: string;
  itemGroupId?: string;
  name?: string;
  nameAr?: string;
  parentGroup?: string; // Ref: ItemGroup
  isGroup?: boolean;
  disabled?: boolean;
  defaultTaxRate?: number;
  defaultValuationMethod?: 'fifo' | 'moving_average' | 'lifo';
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ItemPrice {
  _id: string;
  itemId: string; // Ref: Item
  priceListId: string; // Ref: PriceList
  rate?: number;
  currency?: string;
  validFrom?: string;
  validTo?: string;
  minQty?: number;
  uom?: string;
  toJSON?: any;
  toObject?: any;
  minQty?: any;
  validFrom?: any;
  validFrom?: any;
  validTo?: any;
  validTo?: any;
  filter?: any;
  update?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  _id: string;
  userID?: string; // Ref: User
  title?: string;
  description?: string;
  category?: 'labor' | 'commercial' | 'personal-status' | 'criminal' | 'real-estate' | 'traffic' | 'administrative' | 'other';
  budget?: number;
  deadline?: string;
  location?: string;
  requirements?: string[];
  name?: string;
  url?: string;
  uploadedAt?: string;
  status?: 'open' | 'in-progress' | 'completed' | 'cancelled';
  proposalsCount?: number;
  acceptedProposal?: string; // Ref: Proposal
  views?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobCard {
  _id: string;
  jobCardId?: string;
  jobCardNumber?: string;
  workOrderId: string; // Ref: WorkOrder
  workOrderNumber?: string;
  operation: string;
  workstation?: string; // Ref: Workstation
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName?: string;
  forQty?: number;
  completedQty?: number;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  totalTime?: number;
  employee?: string; // Ref: User
  employeeName?: string;
  status?: 'pending' | 'work_in_progress' | 'completed' | 'on_hold';
  remarks?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface JobPosition {
  _id: string;
  responsibilityId?: string;
  responsibility?: string;
  responsibilityAr?: string;
  category?: 'primary' | 'secondary' | 'occasional';
  priority?: number;
  timeAllocation?: number;
  essentialFunction?: boolean;
  keyDeliverables?: string;
  successMetrics?: string;
  jurisdiction?: string;
  jurisdictionAr?: string;
  dateAdmitted?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'retired';
  barNumber?: string;
  expiryDate?: string;
  goodStanding?: boolean;
  courtType?: 'general' | 'commercial' | 'labor' | 'administrative' | 'family' | 'criminal' | 'appeals' | 'supreme' | 'arbitration';
  courtTypeAr?: string;
  minimumCases?: number;
  minimumYears?: number;
  required?: boolean;
  language?: string;
  languageAr?: string;
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
  speaking?: 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
  writing?: 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
  reading?: 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
  required?: boolean;
  certificationRequired?: boolean;
  certificationName?: string;
  minimumScore?: number;
  skill?: string;
  skillAr?: string;
  category?: 'technical' | 'software' | 'systems' | 'tools' | 'methodology' | 'legal';
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  required?: boolean;
  yearsExperience?: number;
  certificationName?: string;
  certificationNameAr?: string;
  certificationBody?: string;
  required?: boolean;
  mustHaveBeforeHire?: boolean;
  obtainmentTimeline?: string;
  renewalRequired?: boolean;
  renewalPeriod?: number;
  companySponsored?: boolean;
  competencyId?: string;
  competencyName?: string;
  competencyNameAr?: string;
  competencyDescription?: string;
  category?: 'core' | 'functional' | 'leadership' | 'technical';
  requiredLevel?: 'basic' | 'proficient' | 'advanced' | 'expert';
  weight?: number;
  criticalCompetency?: boolean;
  assessmentMethod?: 'interview' | 'test' | 'simulation' | 'assessment_center' | 'reference';
  positionId?: string; // Ref: JobPosition
  positionNumber?: string;
  positionTitle?: string;
  positionTitleAr?: string;
  incumbentId?: string; // Ref: Employee
  incumbentName?: string;
  incumbentNameAr?: string;
  filled?: boolean;
  fte?: number;
  positionId?: string; // Ref: JobPosition
  positionNumber?: string;
  positionTitle?: string;
  positionTitleAr?: string;
  typicalTimeframe?: string;
  requiredExperience?: number;
  keyRequirements?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  assignmentType?: 'permanent' | 'acting' | 'temporary' | 'probation' | 'secondment';
  assignmentDate?: string;
  probationEnd?: string;
  performanceRating?: string;
  flightRisk?: 'low' | 'medium' | 'high';
  activity?: 'sitting' | 'standing' | 'walking' | 'lifting' | 'carrying' | 'bending' | 'climbing' | 'reaching' | 'typing' | 'driving' | 'other';
  frequency?: 'rarely' | 'occasionally' | 'frequently' | 'constantly';
  duration?: string;
  weight?: number;
  documentType?: 'job_description' | 'position_charter' | 'competency_profile' | 'job_posting' | 'evaluation_report' | 'approval_form' | 'organizational_chart' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  version?: string;
  effectiveDate?: string;
  expiryDate?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  signed?: boolean;
  signedBy?: string;
  signedDate?: string;
  confidential?: boolean;
  historyId?: string;
  eventType?: 'created' | 'modified' | 'filled' | 'vacated' | 'frozen' | 'unfrozen' | 'eliminated' | 'reinstated' | 'title_change' | 'level_change' | 'salary_change' | 'reporting_change';
  eventDate?: string;
  eventBy?: string; // Ref: User
  eventByName?: string;
  fieldChanged?: string;
  reason?: string;
  notes?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  assignmentType?: string;
  separationReason?: string;
  performanceSummary?: string;
  positionId?: string;
  positionNumber?: string;
  positionCode?: string;
  requisitionNumber?: string;
  jobId?: string;
  jobCode?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  workingTitle?: string;
  workingTitleAr?: string;
  title?: string;
  titleAr?: string;
  context?: string;
  positionType?: 'regular' | 'temporary' | 'project_based' | 'seasonal' | 'acting' | 'secondment' | 'pool_position';
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'temporary' | 'internship';
  temporaryDetails?: 'replacement' | 'project' | 'seasonal_demand' | 'trial_period' | 'other';
  jobFamily?: 'legal' | 'finance' | 'hr' | 'it' | 'operations' | 'marketing' | 'sales' | 'administration' | 'management' | 'support' | 'other';
  jobFamilyAr?: string;
  jobSubFamily?: string;
  jobSubFamilyAr?: string;
  occupationalCategory?: 'executive' | 'management' | 'professional' | 'technical' | 'administrative' | 'operational' | 'support';
  occupationalCategoryAr?: string;
  iscoCode?: string;
  iscoTitle?: string;
  saudiOccupationCode?: string;
  jobLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'senior_manager' | 'director' | 'senior_director' | 'vp' | 'svp' | 'evp' | 'c_level';
  jobLevelAr?: string;
  levelNumber?: number;
  jobGrade?: string;
  gradeNumber?: number;
  careerBand?: 'individual_contributor' | 'professional' | 'management' | 'leadership' | 'executive';
  exemptStatus?: 'exempt' | 'non_exempt';
  exemptionReason?: string;
  evaluationMethod?: 'point_factor' | 'ranking' | 'classification' | 'factor_comparison' | 'market_pricing';
  totalPoints?: number;
  factor?: 'skill' | 'effort' | 'responsibility' | 'working_conditions' | 'other';
  subfactor?: string;
  points?: number;
  weight?: number;
  evaluationDate?: string;
  evaluatedBy?: string;
  benchmarkJobs?: string;
  marketPricing?: any;
  organizationalUnitId?: string; // Ref: OrganizationalUnit
  departmentId?: string; // Ref: OrganizationalUnit
  departmentName?: string;
  departmentNameAr?: string;
  divisionId?: string; // Ref: OrganizationalUnit
  divisionName?: string;
  teamId?: string; // Ref: OrganizationalUnit
  teamName?: string;
  costCenter?: string;
  costCenterName?: string;
  businessUnit?: string;
  function?: 'core' | 'support' | 'shared_services' | 'overhead';
  geographicScope?: 'local' | 'regional' | 'national' | 'international';
  location?: 'fully_remote' | 'hybrid' | 'on_site';
  reportsTo?: 'direct' | 'solid_line' | 'dotted_line' | 'functional' | 'matrix'; // Ref: JobPosition
  jobTitle?: string;
  incumbentName?: string;
  reportingType?: 'dotted_line' | 'functional' | 'matrix';
  reportingPurpose?: string;
  supervisoryPosition?: boolean;
  directReportsCount?: number;
  indirectReportsCount?: number;
  spanOfControl?: number;
  managementLevel?: number;
  jobSummary?: string;
  jobSummaryAr?: string;
  jobPurpose?: string;
  jobPurposeAr?: string;
  totalTimeAllocation?: number;
  duty?: string;
  dutyAr?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed';
  category?: string;
  decisionMakingLevel?: 'strategic' | 'tactical' | 'operational' | 'limited';
  decisionType?: string;
  autonomyLevel?: 'full_autonomy' | 'recommend' | 'input_only';
  approvalRequired?: boolean;
  approvalLevel?: string;
  financialLimit?: number;
  keyChallenges?: string;
  successFactors?: string;
  performanceExpectations?: string;
  minimumEducation?: 'high_school' | 'diploma' | 'bachelors' | 'masters' | 'doctorate' | 'professional';
  minimumEducationAr?: string;
  degreeLevel?: string;
  fieldOfStudy?: string;
  fieldOfStudyAr?: string;
  required?: boolean;
  accreditation?: string;
  equivalencyCertificate?: boolean;
  degreeLevel?: string;
  fieldOfStudy?: string;
  educationalInstitutions?: any;
  minimumYears?: number;
  preferredYears?: number;
  type?: 'general' | 'industry_specific' | 'role_specific' | 'functional';
  descriptionAr?: string;
  years?: number;
  required?: boolean;
  area?: string;
  years?: number;
  required?: boolean;
  industryExperience?: any;
  managementExperience?: any;
  certifications?: any;
  skill?: string;
  skillAr?: string;
  category?: 'communication' | 'leadership' | 'interpersonal' | 'analytical' | 'organizational' | 'creative';
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  required?: boolean;
  software?: string;
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  required?: boolean;
  requirement?: string;
  frequency?: 'rarely' | 'occasionally' | 'frequently' | 'constantly';
  essentialFunction?: boolean;
  backgroundCheck?: 'criminal' | 'credit' | 'employment' | 'education' | 'professional_license' | 'reference'[];
  medicalRequirements?: any;
  ageRequirements?: any;
  nationalityRequirements?: any;
  availability?: any;
  isAttorneyPosition?: boolean;
  barAdmission?: any;
  practiceArea?: 'corporate' | 'litigation' | 'real_estate' | 'family' | 'criminal' | 'labor' | 'intellectual_property' | 'tax' | 'banking' | 'insurance' | 'administrative' | 'commercial' | 'arbitration' | 'sharia_compliant' | 'other';
  practiceAreaAr?: string;
  yearsExperience?: number;
  expertiseLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  secondaryPracticeAreas?: string;
  courtExperience?: any;
  caseExperience?: any;
  experienceRequired?: boolean;
  documentType?: 'contracts' | 'briefs' | 'motions' | 'memoranda' | 'opinions' | 'pleadings' | 'agreements' | 'other';
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  publicationsPreferred?: boolean;
  writingSampleRequired?: boolean;
  legalResearch?: 'basic' | 'intermediate' | 'advanced' | 'expert'[];
  clientManagement?: 'individual' | 'corporate' | 'government' | 'international'[];
  ethicalRequirements?: any;
  environmentType?: 'office' | 'field' | 'hybrid' | 'remote' | 'client_site' | 'court' | 'manufacturing' | 'outdoor' | 'laboratory' | 'mixed';
  environmentDescription?: string;
  officeConditions?: any;
  factor?: 'noise' | 'temperature_extremes' | 'outdoor_elements' | 'confined_spaces' | 'heights' | 'hazardous_materials' | 'other';
  exposure?: 'rare' | 'occasional' | 'frequent' | 'constant';
  safetyConsiderations?: any;
  workSchedule?: 'standard' | 'flexible' | 'shift' | 'compressed' | 'variable';
  travelRequired?: boolean;
  travelPercentage?: number;
  type?: 'local' | 'domestic' | 'international';
  frequency?: 'rare' | 'occasional' | 'frequent' | 'regular';
  averageDuration?: string;
  overnightTravel?: boolean;
  hasPassport?: boolean;
  willingToRelocate?: boolean;
  physicalDemands?: any;
  mentalDemands?: 'low' | 'moderate' | 'high' | 'very_high';
  salaryGrade?: string;
  gradeLevel?: number;
  salaryRange?: 'hourly' | 'monthly' | 'annual';
  marketPositioning?: any;
  compaRatio?: number;
  rangePenetration?: number;
  allowances?: any;
  bonusEligible?: boolean;
  targetBonus?: 'annual' | 'quarterly' | 'project_based';
  commissionEligible?: boolean;
  commissionStructure?: string;
  profitSharing?: boolean;
  stockOptions?: boolean;
  benefits?: boolean[];
  careerLadder?: any;
  pathType?: 'specialist' | 'management' | 'leadership' | 'technical';
  description?: string;
  nextRoles?: string;
  currentRoleDevelopment?: string;
  developmentArea?: string;
  developmentType?: 'training' | 'experience' | 'education' | 'certification' | 'mentoring';
  priority?: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  status?: 'active' | 'vacant' | 'frozen' | 'eliminated' | 'pending_approval' | 'proposed';
  statusEffectiveDate?: string;
  statusReason?: string;
  filled?: boolean;
  vacantSince?: string;
  vacancyReason?: 'new_position' | 'resignation' | 'termination' | 'promotion' | 'transfer' | 'retirement' | 'leave' | 'other';
  previousIncumbent?: string; // Ref: Employee
  recruitmentInitiated?: boolean;
  initiatedDate?: string;
  requisitionId?: string;
  expectedFillDate?: string;
  interimCoverage?: 'full' | 'partial';
  hasSuccessor?: boolean;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  readinessLevel?: 'ready_now' | 'ready_1_year' | 'ready_2_3_years' | 'developing';
  developmentNeeds?: string;
  rank?: number;
  fte?: number;
  headcountImpact?: number;
  budgeted?: boolean;
  fiscalYear?: number;
  budgetedSalary?: number;
  approvalStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  approved?: boolean;
  approvalDate?: string;
  comments?: string;
  effectiveDate?: string;
  expirationDate?: string;
  establishedDate?: string;
  postable?: boolean;
  postingTitle?: string;
  postingTitleAr?: string;
  postingSummary?: string;
  postingSummaryAr?: string;
  postingDescription?: string;
  sellingPoints?: string;
  applicationProcess?: 'online' | 'email' | 'in_person' | 'agency';
  channel?: 'company_website' | 'job_board' | 'linkedin' | 'social_media' | 'university' | 'agency' | 'employee_referral' | 'internal_only';
  channelName?: string;
  postedDate?: string;
  expiryDate?: string;
  viewsCount?: number;
  applicationsCount?: number;
  eeoStatement?: string;
  diversityStatement?: string;
  adaCompliance?: any;
  flsaCompliant?: boolean;
  equalPayCompliant?: boolean;
  saudiLaborLawCompliance?: 'platinum' | 'high_green' | 'mid_green' | 'low_green' | 'yellow' | 'red';
  jobDescriptionCompliance?: 'annual' | 'biennial' | 'as_needed';
  notes?: any;
  internalNotes?: string;
  tags?: string;
  timeToFill?: 'faster' | 'average' | 'slower';
  positionTurnover?: any;
  marketCompetitiveness?: 'below' | 'at' | 'above';
  relatedRecords?: string[]; // Ref: OrganizationalUnit
  status?: any;
  status?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface JobPosting {
  _id: string;
  category: 'education' | 'experience' | 'certification' | 'other';
  requirement: string;
  requirementAr?: string;
  isRequired?: boolean;
  yearsRequired?: number;
  details?: string;
  detailsAr?: string;
  skillName: string;
  skillNameAr?: string;
  category?: 'technical' | 'soft' | 'language' | 'legal' | 'software' | 'other';
  proficiencyLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  isRequired?: boolean;
  yearsExperience?: number;
  weight?: number;
  language: string;
  languageAr?: string;
  readingLevel?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
  writingLevel?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
  speakingLevel?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
  isRequired?: boolean;
  currency?: string;
  minSalary: number;
  maxSalary: number;
  paymentFrequency?: 'monthly' | 'biweekly' | 'weekly' | 'annual';
  includesHousing?: boolean;
  housingAllowance?: number;
  includesTransportation?: boolean;
  transportationAllowance?: number;
  includesOtherAllowances?: boolean;
  name?: string;
  nameAr?: string;
  amount?: number;
  negotiable?: boolean;
  displaySalary?: boolean;
  stageOrder: number;
  stageName: string;
  stageNameAr?: string;
  stageType: 'screening' | 'phone_interview' | 'technical_interview' | 'hr_interview' | 'panel_interview' | 'assessment' | 'background_check' | 'reference_check' | 'offer' | 'negotiation' | 'onboarding';
  description?: string;
  descriptionAr?: string;
  duration?: number;
  isRequired?: boolean;
  userId?: string; // Ref: User
  name?: string;
  nameAr?: string;
  role?: string;
  assessmentType?: string;
  passingScore?: number;
  criterion?: string;
  criterionAr?: string;
  maxScore?: number;
  weight?: number;
  panelName?: string;
  panelNameAr?: string;
  userId?: string; // Ref: User
  name?: string;
  nameAr?: string;
  role?: string;
  department?: string;
  isLead?: boolean;
  channel: 'company_website' | 'linkedin' | 'indeed' | 'bayt' | 'glassdoor' | 'monster' | 'naukrigulf' | 'gulftalent' | 'internal' | 'referral' | 'recruitment_agency' | 'university' | 'job_fair' | 'social_media' | 'other';
  channelName?: string;
  channelNameAr?: string;
  postingUrl?: string;
  postedAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  applicationsReceived?: number;
  cost?: number;
  notes?: string;
  responsibility: string;
  responsibilityAr?: string;
  priority?: 'primary' | 'secondary' | 'occasional';
  percentageOfTime?: number;
  benefitType: 'health_insurance' | 'dental' | 'vision' | 'life_insurance' | 'annual_leave' | 'sick_leave' | 'maternity_leave' | 'paternity_leave' | 'retirement' | 'bonus' | 'stock_options' | 'training' | 'education' | 'housing' | 'transportation' | 'phone' | 'laptop' | 'gym' | 'flexible_hours' | 'remote_work' | 'annual_ticket' | 'end_of_service' | 'other';
  benefitName?: string;
  benefitNameAr?: string;
  description?: string;
  descriptionAr?: string;
  value?: string;
  assessmentType: 'technical_test' | 'aptitude_test' | 'personality_test' | 'case_study' | 'coding_challenge' | 'writing_sample' | 'presentation' | 'group_exercise' | 'simulation';
  assessmentName?: string;
  assessmentNameAr?: string;
  provider?: string;
  duration?: number;
  passingScore?: number;
  maxScore?: number;
  instructions?: string;
  instructionsAr?: string;
  isRequired?: boolean;
  weight?: number;
  stepOrder?: number;
  stepName?: string;
  stepNameAr?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  approverNameAr?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  commentsAr?: string;
  approvedAt?: string;
  jobId: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  shortDescription?: string;
  shortDescriptionAr?: string;
  departmentId?: string; // Ref: Department
  departmentName?: string;
  departmentNameAr?: string;
  positionLevel?: 'intern' | 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'vp' | 'c_level' | 'partner';
  reportsTo?: string; // Ref: User
  category?: 'legal' | 'finance' | 'hr' | 'it' | 'operations' | 'marketing' | 'sales' | 'admin' | 'executive' | 'consulting' | 'research' | 'other';
  practiceArea?: 'corporate' | 'litigation' | 'real_estate' | 'ip' | 'labor' | 'banking_finance' | 'tax' | 'criminal' | 'family' | 'immigration' | 'arbitration' | 'compliance' | 'general_practice' | 'other';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship' | 'freelance';
  contractDuration?: 'permanent' | 'fixed_term' | 'project_based';
  contractLength?: number;
  probationPeriod?: number;
  workingHours?: 'day' | 'night' | 'rotating' | 'flexible';
  workLocation?: 'onsite' | 'remote' | 'hybrid';
  nationalityRequirements?: boolean;
  educationRequirements?: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'professional';
  experienceRequirements?: number;
  name?: string;
  nameAr?: string;
  isRequired?: boolean;
  issuingBody?: string;
  legalRequirements?: boolean;
  endOfServiceBenefits?: 'standard' | 'enhanced';
  targetHireDate?: string;
  applicationDeadline?: string;
  estimatedProcessDays?: number;
  hiringManager?: string; // Ref: User
  recruiter?: string; // Ref: User
  hrContact?: string; // Ref: User
  userId?: string; // Ref: User
  name?: string;
  nameAr?: string;
  role?: string;
  agencyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  feePercentage?: number;
  feeAmount?: number;
  contractSigned?: boolean;
  visibility?: 'internal' | 'external' | 'both' | 'confidential';
  isConfidential?: boolean;
  confidentialReason?: string;
  requiresApproval?: boolean;
  approvalStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  action?: string;
  actionBy?: string; // Ref: User
  actionByName?: string;
  timestamp?: string;
  comments?: string;
  status?: 'draft' | 'pending_approval' | 'open' | 'on_hold' | 'filled' | 'cancelled' | 'closed';
  status?: string;
  changedBy?: string; // Ref: User
  changedByName?: string;
  timestamp?: string;
  reason?: string;
  publishedAt?: string;
  closedAt?: string;
  filledAt?: string;
  openings?: number;
  filled?: number;
  remaining?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  statistics?: number;
  internalNotes?: string;
  tags?: string;
  recruitmentBudget?: number;
  createdAt?: string;
  updatedAt?: string;
  createdAt?: any;
  totalJobs?: any;
  sum?: any;
  sum?: any;
  totalApplications?: any;
  totalHires?: any;
  totalOpenings?: any;
  totalFilled?: any;
  avgTimeToHire?: any;
  totalRecruitmentCost?: any;
  applicationDeadline?: any;
  text?: any;
  score?: any;
  score?: any;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  _id: string;
  accountId?: string; // Ref: Account
  debit?: number;
  credit?: number;
  description?: string;
  caseId?: string; // Ref: Case
  notes?: string;
  entryNumber: string;
  date?: string;
  description?: string;
  descriptionAr?: string;
  validate?: any;
  status?: 'draft' | 'posted' | 'void';
  entryType?: 'adjustment' | 'correction' | 'accrual' | 'reversal' | 'closing' | 'opening' | 'transfer' | 'other';
  postedAt?: string;
  postedBy?: string; // Ref: User
  type?: string;
  voidedAt?: string;
  voidedBy?: string; // Ref: User
  voidReason?: string;
  isReversal?: boolean;
  reversedEntryId?: string; // Ref: JournalEntry
  reversalEntryId?: string; // Ref: JournalEntry
  notes?: string;
  name?: string;
  url?: string;
  uploadedAt?: string;
  recurringTransactionId?: string; // Ref: RecurringTransaction
  toJSON?: any;
  toObject?: any;
  entryNumber?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface KeyboardShortcut {
  _id: string;
  key: string;
  modifiers?: 'ctrl' | 'alt' | 'shift' | 'meta'[];
  action: string;
  isEnabled?: boolean;
  isCustom?: boolean;
  userId?: string; // Ref: User
  shortcuts?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface KycVerification {
  _id: string;
  userId: string; // Ref: User
  verificationId: string;
  verificationType: 'identity' | 'business' | 'document' | 'address';
  documentType: 'national_id' | 'iqama' | 'passport' | 'commercial_registration' | 'power_of_attorney' | 'address_proof' | 'selfie';
  documentNumber?: string;
  status: 'initiated' | 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';
  verificationMethod: 'automatic' | 'manual' | 'hybrid';
  verificationSource?: 'yakeen' | 'wathq' | 'manual' | 'third_party' | 'null';
  verifiedData?: string;
  fileUrl: string;
  fileType?: string;
  uploadedAt?: string;
  performed?: boolean;
  riskScore?: number;
  status?: 'clear' | 'review' | 'flagged' | 'null';
  type: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt?: string;
  screenedAt?: string;
  review?: boolean; // Ref: User
  expiresAt?: string;
  initiatedAt: string;
  verifiedAt?: string;
  rejectedAt?: string;
  expiredAt?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  geoLocation?: string;
  apiResponse?: boolean;
  from: string;
  to: string;
  changedAt?: string;
  changedBy?: string; // Ref: User
  reason?: string;
  compliance?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LdapConfig {
  _id: string;
  name?: string;
  type?: string;
  bindDn?: string;
  bindPassword?: string;
  bindPassword_encrypted?: any;
  baseDn: string;
  userFilter?: string;
  groupFilter?: string;
  attributeMapping?: string;
  groupMapping?: Record<string, any>;
  defaultRole?: 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'partner';
  useSsl?: boolean;
  useStarttls?: boolean;
  type?: boolean;
  tlsCaCert?: string;
  isEnabled?: boolean;
  autoProvisionUsers?: boolean;
  updateUserAttributes?: boolean;
  allowLocalFallback?: boolean;
  syncIntervalHours?: number;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'partial' | 'null';
  lastSyncError?: string;
  lastSyncStats?: number;
  lastConnectionTest?: string; // Ref: User
  timeout?: number;
  searchScope?: 'base' | 'one' | 'sub';
  pageSize?: number;
  changedAt?: string;
  changedBy?: string; // Ref: User
  action?: 'created' | 'updated' | 'enabled' | 'disabled' | 'tested';
  changes?: Record<string, any>;
  notes?: string;
  details?: any;
  tlsOptions?: any;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  details?: any;
  responseTime?: string;
  tlsOptions?: any;
  lastSyncAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  _id: string;
  type?: 'website' | 'referral' | 'social_media' | 'advertising' | 'cold_call' | 'walk_in' | 'event' | 'other';
  referralId?: string; // Ref: Referral
  referralName?: string;
  campaign?: string;
  medium?: string;
  notes?: string;
  practiceArea?: string;
  caseType?: 'civil' | 'criminal' | 'family' | 'commercial' | 'labor' | 'real_estate' | 'administrative' | 'execution' | 'other';
  caseDescription?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  estimatedValue?: number;
  opposingParty?: string;
  courtName?: string;
  courtDeadline?: string;
  statuteOfLimitations?: string;
  currentStatus?: string;
  desiredOutcome?: string;
  deadline?: string;
  hasDocuments?: boolean;
  conflictCheckCompleted?: boolean;
  conflictCheckResult?: 'clear' | 'potential_conflict' | 'conflict';
  conflictCheckNotes?: string;
  intakeFormId?: string; // Ref: IntakeForm
  intakeCompletedAt?: string;
  budget?: 'unknown' | 'low' | 'medium' | 'high' | 'premium';
  budgetAmount?: number;
  budgetNotes?: string;
  authority?: 'unknown' | 'decision_maker' | 'influencer' | 'researcher';
  authorityNotes?: string;
  need?: 'unknown' | 'urgent' | 'planning' | 'exploring';
  needDescription?: string;
  timeline?: 'unknown' | 'immediate' | 'this_month' | 'this_quarter' | 'this_year' | 'no_timeline';
  timelineNotes?: string;
  scoreBreakdown?: number;
  score?: number;
  notes?: string;
  qualifiedAt?: string;
  qualifiedBy?: string; // Ref: User
  leadId?: string;
  type?: 'individual' | 'company';
  salutation?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Prof' | 'Eng' | 'Sheikh' | 'Prince' | 'Princess';
  firstName?: string;
  lastName?: string;
  displayName?: string;
  preferredName?: string;
  companyName?: string;
  companyNameAr?: string;
  companyType?: 'sme' | 'enterprise' | 'government' | 'startup' | 'ngo' | 'law_firm' | 'other';
  contactPerson?: string;
  jobTitle?: string;
  department?: string;
  industry?: string;
  industryCode?: string;
  numberOfEmployees?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  employeeCount?: number;
  annualRevenue?: number;
  companyLinkedinUrl?: string;
  email?: string;
  alternateEmail?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  preferredContactMethod?: 'phone' | 'email' | 'whatsapp' | 'in_person' | 'sms';
  bestTimeToCall?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  address?: string;
  nationalId?: string;
  commercialRegistration?: string;
  companyIntelligence?: string[];
  businessIntelligence?: 'aaa' | 'aa' | 'a' | 'bbb' | 'bb' | 'b' | 'c' | 'unknown';
  recurring?: number;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  salutationAr?: string;
  identityType?: string;
  iqamaNumber?: string;
  gccId?: string;
  gccCountry?: string;
  borderNumber?: string;
  visitorId?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  identityIssueDate?: string;
  identityExpiryDate?: string;
  dateOfBirth?: string;
  dateOfBirthHijri?: string;
  placeOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  nationalityCode?: string;
  crNumber?: string;
  unifiedNumber?: string;
  vatNumber?: string;
  legalForm?: string;
  legalFormAr?: string;
  capital?: number;
  capitalCurrency?: string;
  crExpiryDate?: string;
  authorizedPerson?: string;
  authorizedPersonAr?: string;
  authorizedPersonIdentityType?: string;
  authorizedPersonIdentityNumber?: string;
  preferredLanguage?: 'ar' | 'en';
  doNotContact?: boolean;
  doNotEmail?: boolean;
  doNotCall?: boolean;
  doNotSMS?: boolean;
  riskLevel?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  conflictCheckStatus?: string;
  conflictNotes?: string;
  conflictCheckDate?: string;
  isVerified?: boolean;
  verificationSource?: string;
  verifiedAt?: string;
  organizationId?: string; // Ref: Organization
  contactId?: string; // Ref: Contact
  status?: 'new' | '// جديد
            contacted' | '// تم التواصل
            qualified' | '// مؤهل
            proposal' | '// عرض السعر
            negotiation' | '// التفاوض
            won' | '// فاز
            lost' | '// خسر
            dormant        // خامل';
  pipelineId?: string; // Ref: Pipeline
  pipelineStageId?: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  lostReason?: 'price' | 'competitor' | 'no_response' | 'not_qualified' | 'timing' | 'other';
  lostReasonId?: string; // Ref: LostReason
  lostReasonDetails?: string;
  lostDate?: string;
  lostToCompetitor?: string;
  lostNotes?: string;
  lostAtStage?: string;
  stageChangedAt?: string;
  dateOpened?: string;
  dateLastStageUpdate?: string;
  stage?: string;
  date?: string;
  changedBy?: string; // Ref: User
  notes?: string;
  conversion?: boolean; // Ref: Client
  forecastCategory?: 'pipeline' | 'best_case' | 'commit' | 'closed_won' | 'omitted';
  forecastCategoryAuto?: boolean;
  forecastOverrideReason?: string;
  forecastOverrideBy?: string; // Ref: User
  forecastOverrideAt?: string;
  utm?: string;
  leadMagnet?: string;
  landingPageUrl?: string;
  marketingScore?: number;
  engagementScore?: number;
  lastMarketingTouch?: string;
  campaignId?: string; // Ref: Campaign
  respondedAt?: string;
  response?: string;
  status?: 'not_checked' | 'pending' | 'clear' | 'potential' | 'confirmed' | 'waived';
  checkedBy?: string; // Ref: User
  checkedDate?: string;
  notes?: string;
  waiverRequested?: boolean;
  waiverRequestedBy?: string; // Ref: User
  waiverRequestedAt?: string;
  waiverApproved?: boolean;
  waiverApprovedBy?: string; // Ref: User
  waiverApprovedAt?: string;
  waiverNotes?: string;
  entityType?: 'client' | 'lead' | 'case' | 'contact';
  entityId?: string;
  entityName?: string;
  matchType?: 'nationalId' | 'crNumber' | 'phone' | 'email' | 'companyName' | 'name';
  severity?: 'block' | 'warn' | 'info';
  estimatedValue?: number;
  weightedRevenue?: number;
  recurringRevenue?: 'monthly' | 'quarterly' | 'yearly';
  currency?: string;
  proposedFeeType?: 'hourly' | 'fixed' | 'contingency' | 'retainer' | 'hybrid';
  proposedAmount?: number;
  assignedTo?: string; // Ref: User
  backupAssignee?: string; // Ref: User
  type?: string;
  assignedTeam?: string;
  campaignId?: string; // Ref: Campaign
  territoryId?: string; // Ref: Territory
  territory?: string;
  region?: string;
  salesTeamId?: string; // Ref: SalesTeam
  escalationPath?: string;
  contactId?: string; // Ref: Contact
  role?: 'champion' | 'decision_maker' | 'influencer' | 'user' | 'blocker' | 'economic_buyer' | 'technical_buyer' | 'coach';
  influence?: number;
  sentiment?: 'strongly_positive' | 'positive' | 'neutral' | 'negative' | 'strongly_negative' | 'unknown';
  engagementScore?: number;
  lastEngagement?: string;
  notes?: string;
  addedAt?: string;
  addedBy?: string; // Ref: User
  score?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  lastCalculatedAt?: string;
  factors?: any;
  priority?: 'high' | 'medium' | 'low';
  message?: string;
  isStuck?: boolean;
  stuckSince?: string;
  lastContactedAt?: string;
  lastActivityAt?: string;
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  activityCount?: number;
  callCount?: number;
  emailCount?: number;
  meetingCount?: number;
  metrics?: number;
  convertedToClient?: boolean;
  clientId?: string; // Ref: Client
  convertedAt?: string;
  convertedBy?: string; // Ref: User
  caseId?: string; // Ref: Case
  leadScore?: number;
  status?: 'none' | 'identified' | 'evaluating' | 'head_to_head' | 'won' | 'lost_to_competitor';
  name?: string;
  strengths?: string;
  weaknesses?: string;
  priceComparison?: 'lower' | 'similar' | 'higher' | 'unknown';
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  type?: string[];
  competitorNotes?: string;
  ourAdvantages?: string;
  theirAdvantages?: string;
  competitiveAdvantage?: string;
  winStrategy?: string;
  proposal?: 'not_sent' | 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised'; // Ref: Quote
  followUp?: 'phone' | 'email' | 'whatsapp' | 'meeting' | 'sms' | 'other'; // Ref: User
  lost?: 'price' | 'competitor' | 'no_response' | 'not_qualified' | 'timing' | 'no_budget' | 'went_cold' | 'duplicate' | 'other'; // Ref: LostReason
  type?: string[];
  type?: string;
  practiceArea?: string;
  notes?: string;
  internalNotes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isVIP?: boolean;
  customFields?: string;
  integration?: 'synced' | 'pending' | 'failed' | 'never'[];
  dataQuality?: boolean;
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  budget?: any;
  authority?: any;
  need?: any;
  timeline?: any;
  firstName?: any;
  lastName?: any;
  companyName?: any;
  email?: any;
  phone?: any;
  leadId?: any;
  group?: any;
  status?: any;
  nextFollowUpDate?: any;
  lastContactedAt?: any;
  lastContactedAt?: any;
  assignments?: any;
  set?: any;
  company?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScore {
  _id: string;
  leadId: string; // Ref: Lead
  totalScore?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  category?: 'hot' | 'warm' | 'cool' | 'cold';
  conversionProbability?: number;
  confidenceLevel?: 'low' | 'medium' | 'high';
  predictedCloseDate?: string;
  predictedValue?: number;
  score?: number;
  caseType?: number;
  caseValue?: number;
  location?: number;
  industry?: number;
  companySize?: number;
  score?: number;
  budget?: number;
  authority?: number;
  need?: number;
  timeline?: number;
  score?: number;
  emailEngagement?: number;
  responseTime?: any;
  meetingAttendance?: number;
  documentViews?: number;
  websiteVisits?: number;
  phoneCallDuration?: number;
  formSubmissions?: number;
  interactionFrequency?: number;
  score?: number;
  recency?: any;
  frequency?: number;
  depth?: number;
  weights?: number;
  decay?: number;
  score?: number;
  grade?: string;
  category?: string;
  conversionProbability?: number;
  breakdown?: any;
  calculatedAt?: string;
  reason?: 'scheduled' | 'activity' | 'manual' | 'decay' | 'initial';
  triggeredBy?: string;
  notes?: string;
  insights?: any;
  enabled?: boolean;
  probability?: number;
  calibrated?: boolean;
  modelVersion?: string;
  method?: 'batch' | 'realtime';
  confidence?: number;
  lastScoredAt?: string;
  shap?: Record<string, any>[];
  salesExplanation?: 'immediate' | 'soon' | 'scheduled' | 'nurture';
  salesPriority?: 'P1_HOT' | 'P2_WARM' | 'P3_COOL' | 'P4_NURTURE'; // Ref: User
  features?: any;
  conversion?: boolean;
  calculation?: number;
  match?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  totalScore?: any;
  breakdown?: any;
  match?: any;
  totalScored?: any;
  avgProbability?: any;
  avgConfidence?: any;
  converted?: any;
  count?: any;
  avgProbability?: any;
  converted?: any;
  avgValue?: any;
  sort?: any;
  count?: any;
  converted?: any;
  avgPredicted?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScoringConfig {
  _id: string;
  weights?: number;
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  F?: number;
  type?: string;
  score?: number;
  priority?: number;
  min?: number;
  max?: number;
  score?: number;
  location?: string;
  score?: number;
  name?: string;
  score?: number;
  size?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
  score?: number;
  budget?: number;
  authority?: number;
  need?: number;
  timeline?: number;
  emailOpen?: number;
  emailClick?: number;
  emailReply?: number;
  meetingScheduled?: number;
  meetingAttended?: number;
  meetingNoShow?: number;
  documentView?: number;
  documentDownload?: number;
  phoneCall?: number;
  formSubmission?: number;
  websiteVisit?: number;
  responseWithin24h?: number;
  responseWithin1h?: number;
  recency?: number;
  frequency?: number;
  depth?: number;
  decay?: 'daily' | 'weekly';
  calculationSchedule?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  enabled?: boolean;
  minimumDataPoints?: number;
  weights?: number;
  threshold?: number;
  direction?: 'above' | 'below';
  type?: string[];
  message?: string;
  gradeChanges?: boolean;
  isActive?: boolean;
  version?: string;
  lastModifiedBy?: string; // Ref: User
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSource {
  _id: string;
  name: string;
  nameAr: string;
  slug?: string;
  description?: string;
  utmSource?: string;
  utmMedium?: string;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveAllocation {
  _id: string;
  allocationId?: string;
  employeeId?: string; // Ref: Employee
  leaveTypeId?: string; // Ref: LeaveType
  leavePeriodId?: string; // Ref: LeavePeriod
  leavePolicyId?: string; // Ref: LeavePolicy
  newLeavesAllocated: number;
  carryForwardedLeaves?: number;
  compensatoryLeaves?: number;
  totalLeavesAllocated?: number;
  leavesUsed?: number;
  leavesEncashed?: number;
  leavesExpired?: number;
  leavesBalance?: number;
  leavesPending?: number;
  tier1?: number;
  tier2?: number;
  tier3?: number;
  totalMaxDays?: number;
  totalUsedDays?: number;
  totalRemainingDays?: number;
  hajjLeaveTracking?: boolean; // Ref: User
  fromDate: string;
  toDate: string;
  status?: 'draft' | 'submitted' | 'approved' | 'cancelled';
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  notes?: string;
  allocationReason?: string;
  date?: string;
  type?: 'add' | 'deduct' | 'carry_forward' | 'encash' | 'expire';
  days?: number;
  reason?: string;
  adjustedBy?: string; // Ref: User
  inc?: any;
  tier1?: any;
  tier2?: any;
  tier3?: any;
  payCalculation?: any;
  tier1?: any;
  tier2?: any;
  tier3?: any;
  fromDate?: any;
  toDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  _id: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  employeeNumber?: string;
  year?: number;
  yearOfService?: number;
  annualLeave?: number;
  sickLeave?: number;
  hajjLeave?: number;
  marriageLeave?: number;
  birthLeave?: number;
  deathLeave?: number;
  maternityLeave?: number;
  paternityLeave?: number;
  examLeave?: number;
  unpaidLeave?: number;
  totalStats?: number;
  lastUpdated?: string;
  lastUpdatedBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  annualLeave?: any;
  hajjLeave?: any;
  maternityLeave?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveEncashment {
  _id: string;
  encashmentId?: string;
  employeeId?: string; // Ref: Employee
  leaveTypeId?: string; // Ref: LeaveType
  leavePeriodId?: string; // Ref: LeavePeriod
  leaveAllocationId?: string; // Ref: LeaveAllocation
  encashmentType: 'termination' | 'voluntary' | 'annual' | 'carry_forward_excess';
  leavesAvailable: number;
  leavesEncashed: number;
  leavesAfterEncashment?: number;
  dailyWage: number;
  encashmentRate?: number;
  encashmentAmount: number;
  name?: string;
  amount?: number;
  reason?: string;
  totalDeductions?: number;
  netAmount: number;
  currency?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  encashmentDate: string;
  paymentDate?: string;
  level?: number;
  approver?: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  date?: string;
  currentApprovalLevel?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  payrollRunId?: string; // Ref: PayrollRun
  payrollProcessed?: boolean;
  payrollProcessedAt?: string;
  reason?: string;
  notes?: string;
  hrComments?: string;
  inc?: any;
  elemMatch?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePeriod {
  _id: string;
  periodId?: string;
  name?: string;
  nameAr?: string;
  startDate?: string;
  endDate?: string;
  allowCarryForward?: boolean;
  carryForwardExpiryDate?: string;
  maxCarryForwardDays?: number;
  carryForwardExpiryMonths?: number;
  isActive?: boolean;
  isCurrent?: boolean;
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string; // Ref: User
  inc?: any;
  set?: any;
  startDate?: any;
  endDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePolicy {
  _id: string;
  leaveTypeId?: string; // Ref: LeaveType
  leaveTypeName?: string;
  leaveTypeNameAr?: string;
  annualAllocation: number;
  allowCarryForward?: boolean;
  maxCarryForwardDays?: number;
  allowEncashment?: boolean;
  maxEncashableDays?: number;
  encashmentPercentage?: number;
  isEarnedLeave?: boolean;
  earnedLeaveFrequency?: 'monthly' | 'quarterly' | 'yearly';
  earnedLeavePerPeriod?: number;
  applyProrata?: boolean;
  prorataBasedOn?: 'joining_date' | 'confirmation_date' | 'fiscal_year_start';
  policyId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  applicableFor?: 'all' | 'department' | 'designation' | 'grade' | 'employee_type';
  applicableValue?: string;
  applicableValues?: string;
  saudiLaborLawCompliant?: boolean;
  tenureBasedAllocation?: boolean;
  minYears?: number;
  maxYears?: number;
  additionalDays?: number;
  leaveTypeId?: string;
  probationRestriction?: boolean;
  type?: string;
  isActive?: boolean;
  isDefault?: boolean;
  inc?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  _id: string;
  annual?: any;
  sick?: any;
  hajj?: any;
  marriage?: any;
  birth?: any;
  death?: any;
  eid?: any;
  maternity?: any;
  paternity?: any;
  exam?: any;
  unpaid?: any;
  required?: boolean;
  provided?: boolean;
  certificateUrl?: string;
  issuingDoctor?: string;
  doctorLicenseNumber?: string;
  issuingClinic?: string;
  clinicLicenseNumber?: string;
  issueDate?: string;
  certificateNumber?: string;
  diagnosis?: string;
  diagnosisCode?: string;
  recommendedRestPeriod?: number;
  restrictions?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  taskId?: string;
  taskName?: string;
  taskDescription?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  handedOver?: boolean;
  handoverDate?: string;
  instructions?: string;
  required?: boolean;
  delegateTo?: string; // Ref: Employee
  handoverCompleted?: boolean;
  handoverCompletionDate?: string;
  handoverApprovedByManager?: boolean;
  stepNumber?: number;
  stepName?: string;
  stepNameAr?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  comments?: string;
  notificationSent?: boolean;
  notificationDate?: string;
  remindersSent?: number;
  autoApproved?: boolean;
  autoApprovalReason?: string;
  required?: boolean;
  currentStep?: number;
  totalSteps?: number;
  finalStatus?: 'pending' | 'approved' | 'rejected';
  escalated?: boolean;
  escalationDate?: string;
  escalatedTo?: string; // Ref: User
  documentType?: 'medical_certificate' | 'marriage_certificate' | 'birth_certificate' | 'death_certificate' | 'hajj_permit' | 'exam_proof' | 'handover_document' | 'approval_letter' | 'extension_request' | 'medical_clearance' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  required?: boolean;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  expiryDate?: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  workingDays?: number;
  halfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  returnDate?: string;
  leaveCategory?: 'paid' | 'unpaid' | 'partial_pay';
  payPercentage?: number;
  isEmergency?: boolean;
  emergencyReason?: string;
  emergencyVerified?: boolean;
  legalEntitlement?: any;
  contactDuringLeave?: boolean;
  annualLeave?: any;
  sickLeave?: 'full_pay' | 'partial_pay' | 'unpaid';
  hajjLeave?: any;
  maternityLeave?: any;
  marriageLeave?: any;
  deathLeave?: 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'other';
  examLeave?: any;
  reason?: string;
  reasonCategory?: 'personal' | 'family' | 'health' | 'education' | 'other';
  detailedReason?: string;
  impactOnBenefits?: boolean;
  balanceBefore?: any;
  deducted?: any;
  balanceAfter?: any;
  affectsPayroll?: boolean;
  paidDays?: number;
  paidAmount?: number;
  payPercentage?: number;
  unpaidDays?: number;
  deductionAmount?: number;
  processedInPayrollRun?: string; // Ref: PayrollRun
  processedDate?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  returned?: boolean;
  returnConfirmedBy?: string; // Ref: User
  returnConfirmationDate?: string;
  lateReturn?: boolean;
  lateDays?: number;
  lateReason?: string;
  extensionRequested?: boolean;
  extensionDays?: number;
  extensionReason?: string;
  extensionApproved?: boolean;
  extensionApprovedBy?: string; // Ref: User
  medicalClearanceRequired?: boolean;
  medicalClearanceProvided?: boolean;
  clearanceDate?: string;
  hasConflicts?: boolean;
  conflictType?: string;
  conflictDetails?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  conflictingLeaveId?: string; // Ref: LeaveRequest
  conflictingEmployee?: string;
  teamImpact?: any;
  blackoutPeriod?: any;
  cancelled?: boolean;
  cancellationDate?: string;
  cancelledBy?: string; // Ref: User
  cancellationReason?: string;
  balanceRestored?: boolean;
  restoredAmount?: number;
  employeeNotes?: string;
  managerNotes?: string;
  hrNotes?: string;
  internalNotes?: string;
  employeeYTDStats?: any;
  requestId?: string;
  requestNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  department?: string;
  jobTitle?: string;
  leaveType?: 'annual' | 'sick' | 'hajj' | 'marriage' | 'birth' | 'death' | 'eid' | 'maternity' | 'paternity' | 'exam' | 'unpaid';
  leaveTypeName?: string;
  leaveTypeNameAr?: string;
  reason?: string;
  reasonAr?: string;
  status?: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  requestedOn?: string;
  submittedOn?: string;
  approvedBy?: string; // Ref: User
  approverName?: string;
  approvedOn?: string;
  approvalComments?: string;
  rejectedBy?: string; // Ref: User
  rejectorName?: string;
  rejectedOn?: string;
  rejectionReason?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  lastModifiedBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  createdAt?: any;
  totalRequests?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalDays?: any;
  match?: any;
  group?: any;
  status?: any;
  employeeId?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  _id: string;
  code: string;
  leaveTypeNumber?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  laborLawArticle?: string;
  laborLawArticleAr?: string;
  maxDays?: number;
  minDays?: number;
  isPaid?: boolean;
  payPercentage?: number;
  requiresApproval?: boolean;
  requiresDocument?: boolean;
  documentType?: 'medical_certificate' | 'marriage_certificate' | 'death_certificate' | 'birth_certificate' | 'travel_document' | 'other' | 'null';
  isAccrued?: boolean;
  accrualRate?: number;
  allowCarryForward?: boolean;
  maxCarryForwardDays?: number;
  allowEncashment?: boolean;
  maxEncashableDays?: number;
  applicableGender?: 'all' | 'male' | 'female';
  type?: string;
  minServiceDays?: number;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  isSystemDefault?: boolean;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LegalContract {
  _id: string;
  contractNumber?: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  contractType: '// Commercial contracts
            sale' | 'purchase' | 'lease' | 'rental' | 'service' | 'employment' | 'partnership' | 'joint_venture' | 'agency' | 'franchise' | 'distribution' | 'construction' | 'maintenance' | 'supply' | 'consulting' | 'license' | '// Legal documents
            power_of_attorney' | 'settlement' | 'release' | 'non_disclosure' | 'non_compete' | 'guarantee' | 'mortgage' | 'pledge' | '// Personal status
            marriage_contract' | 'divorce_agreement' | 'custody_agreement' | 'alimony_agreement' | 'inheritance_distribution' | 'waqf_deed' | 'will' | '// Other
            memorandum_of_understanding' | 'letter_of_intent' | 'other';
  contractTypeAr?: string;
  role?: 'party_one' | 'party_two' | 'first_party' | 'second_party' | 'seller' | 'buyer' | 'lessor' | 'lessee' | 'employer' | 'employee' | 'principal' | 'agent' | 'guarantor' | 'beneficiary' | 'witness';
  roleAr?: string;
  partyType?: 'individual' | 'company' | 'government';
  fullNameArabic?: string;
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  familyName?: string;
  fullNameEnglish?: string;
  nationality?: string;
  nationalId?: string;
  identityType?: 'national_id' | 'iqama' | 'visitor_id' | 'gcc_id' | 'passport';
  idExpiryDate?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  profession?: string;
  companyName?: string;
  companyNameEnglish?: string;
  crNumber?: string;
  unifiedNumber?: string;
  crExpiryDate?: string;
  capital?: number;
  mainActivity?: string;
  authorizedRep?: any;
  phone?: string;
  email?: string;
  nationalAddress?: string;
  signatureStatus?: 'pending' | 'signed' | 'declined' | 'not_required';
  signedDate?: string;
  signatureMethod?: 'physical' | 'electronic' | 'nafath' | 'absher';
  signatureReference?: string;
  draftDate?: string;
  executionDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  executionDateHijri?: string;
  effectiveDateHijri?: string;
  expiryDateHijri?: string;
  value?: number;
  unit?: 'days' | 'weeks' | 'months' | 'years';
  autoRenew?: boolean;
  renewalTerms?: string;
  noticePeriod?: 'days' | 'weeks' | 'months';
  totalValue?: number;
  currency?: string;
  description?: string;
  amount?: number;
  dueDate?: string;
  paid?: boolean;
  paidDate?: string;
  paymentReference?: string;
  advancePayment?: number;
  retentionAmount?: number;
  penaltyClause?: boolean;
  vatIncluded?: boolean;
  vatAmount?: number;
  preamble?: string;
  preambleAr?: string;
  recitals?: string;
  recitalsAr?: string;
  clauseNumber?: string;
  titleAr?: string;
  titleEn?: string;
  textAr?: string;
  textEn?: string;
  isEdited?: boolean;
  editedBy?: string; // Ref: User
  editedAt?: string;
  scheduleNumber?: string;
  title?: string;
  content?: string;
  attachmentUrl?: string;
  signatures?: any;
  templateId?: string; // Ref: ContractTemplate
  isTemplate?: boolean;
  templateName?: string;
  language?: 'ar' | 'en' | 'bilingual';
  textDirection?: 'rtl' | 'ltr';
  isNotarized?: boolean;
  notarizationType?: 'notary_public' | 'court' | 'embassy' | 'virtual_notary';
  notaryNumber?: string;
  notarizationNumber?: string;
  notarizationDate?: string;
  notarizationDateHijri?: string;
  notaryCity?: string;
  notaryBranch?: string;
  electronicDeedNumber?: string;
  verificationCode?: string;
  qrCode?: string;
  marriageRegistration?: any;
  realEstateTransfer?: any;
  poaDetails?: 'general' | 'specific' | 'litigation';
  lastSyncedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'error' | 'not_applicable';
  isEnforceable?: boolean;
  enforcementRequest?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  breachDetails?: 'non_payment' | 'non_performance' | 'delay' | 'quality' | 'other';
  method?: 'litigation' | 'arbitration' | 'mediation' | 'reconciliation';
  governingLaw?: string;
  jurisdiction?: string;
  court?: string;
  arbitration?: '1' | '3';
  mediation?: boolean;
  activeDispute?: boolean; // Ref: Case
  status?: 'draft' | 'under_review' | 'pending_approval' | 'approved' | 'pending_signature' | 'partially_signed' | 'fully_signed' | 'active' | 'expired' | 'terminated' | 'suspended' | 'in_dispute' | 'in_enforcement' | 'completed' | 'archived';
  status?: string;
  date?: string;
  changedBy?: string; // Ref: User
  reason?: string;
  notes?: string;
  currentStep?: string;
  name?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignee?: string; // Ref: User
  dueDate?: string;
  completedDate?: string;
  completedBy?: string; // Ref: User
  userId?: string; // Ref: User
  status?: 'pending' | 'approved' | 'rejected';
  date?: string;
  comments?: string;
  linkedRecords?: string[]; // Ref: Case
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
  fileType?: string;
  fileSize?: number;
  category?: 'contract_draft' | 'signed_copy' | 'amendment' | 'schedule' | 'supporting_document' | 'id_copy' | 'cr_copy' | 'poa_copy' | 'other';
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  description?: string;
  amendmentNumber?: string;
  date?: string;
  description?: string;
  clauseNumber?: string;
  originalText?: string;
  amendedText?: string;
  effectiveDate?: string;
  signedByAll?: boolean;
  documentUrl?: string;
  type?: 'expiry' | 'renewal' | 'payment' | 'milestone' | 'custom';
  date?: string;
  daysBefore?: number;
  message?: string;
  type?: string[];
  sent?: boolean;
  sentAt?: string;
  text?: string;
  createdAt?: string;
  internalNotes?: string;
  type?: string[];
  version?: number;
  version?: number;
  changedBy?: string; // Ref: User
  changedAt?: string;
  changeNote?: string;
  type?: string[];
  expiryDate?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocument {
  _id: string;
  title: string;
  summary: string;
  content?: string;
  category: 'labor' | 'commercial' | 'family' | 'criminal' | 'real-estate' | 'corporate' | 'immigration' | 'tax' | 'intellectual-property' | 'general';
  type: 'law' | 'regulation' | 'case' | 'template' | 'guide' | 'article';
  keywords?: string[];
  fileUrl?: string;
  author?: string;
  publicationDate?: string;
  views?: number;
  downloads?: number;
  accessLevel?: 'public' | 'lawyers-only' | 'admin-only';
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleWorkflow {
  _id: string;
  name: string;
  templateId?: string; // Ref: DocumentTemplate
  requiresSignature?: boolean;
  type: 'email' | 'notification' | 'webhook' | 'create_task' | 'assign_user' | 'update_field';
  isActive?: boolean;
  name: string;
  description?: string;
  assigneeType: 'owner' | 'role' | 'specific' | 'auto';
  assigneeId?: string; // Ref: User
  assigneeRole?: string;
  dueOffset?: number;
  required?: boolean;
  type?: string;
  order?: number;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  name: string;
  order: number;
  autoAdvance?: boolean;
  description?: string;
  durationDays?: number;
  event: 'workflow_started' | 'workflow_completed' | 'stage_started' | 'stage_completed' | 'task_assigned' | 'task_completed' | 'task_overdue' | 'workflow_stalled';
  type?: string;
  type?: string[];
  recipientRoles?: string;
  template?: string;
  type?: string;
  isActive?: boolean;
  name: string;
  entityType: 'employee' | 'customer' | 'deal' | 'client';
  lifecycleType: 'onboarding' | 'active' | 'offboarding' | 'lifecycle_event';
  description?: string;
  isActive?: boolean;
  lastModifiedBy?: string; // Ref: User
  stage: number;
  stageName?: string;
  activatedAt?: string;
  completedAt?: string;
  duration?: number;
  completedBy?: string; // Ref: User
  taskRef: string;
  taskName?: string;
  stageOrder?: number;
  completedAt?: string;
  completedBy: string; // Ref: User
  notes?: string;
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
  uploadedAt?: string;
  workflowId: string; // Ref: LifecycleWorkflow
  entityType: 'employee' | 'customer' | 'deal' | 'client';
  entityId: string;
  entityName?: string;
  currentStage?: number;
  startedAt?: string;
  completedAt?: string;
  status?: 'in_progress' | 'completed' | 'cancelled';
  progress?: number;
  cancelledAt?: string;
  cancelledBy?: string; // Ref: User
  cancellationReason?: string;
  notes?: string;
  lastModifiedBy?: string; // Ref: User
  totalInstances?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  avgCompletionRate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LockDate {
  _id: string;
  lock_type: 'all' | 'sale' | 'purchase' | 'bank' | 'expense' | 'journal';
  lock_date: string;
  locked_by?: string; // Ref: User
  locked_at?: string;
  reason?: string;
  period_name: string;
  start_date: string;
  end_date: string;
  locked_at: string;
  locked_by: string; // Ref: User
  reopened_at?: string;
  reopened_by?: string; // Ref: User
  reopen_reason?: string;
  fiscalLockDate?: string;
  taxLockDate?: string;
  purchaseLockDate?: string;
  saleLockDate?: string;
  hardLockDate?: string;
  fiscalYearEnd?: number;
  created_by?: string; // Ref: User
  updated_by?: string; // Ref: User
  isLocked?: boolean;
  lockDate?: string;
  lockType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginHistory {
  _id: string;
  userId: string; // Ref: User
  ip: string;
  location?: string;
  device?: string;
  timestamp: string;
  isAnomalous?: boolean;
  anomalyDetails?: string[];
  loginStatus: 'success' | 'failed' | 'blocked' | 'mfa_required' | 'verification_required';
  isVPN?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  requiresVerification?: boolean;
  verificationMethod?: 'none' | 'email' | 'mfa' | 'sms';
  verified?: boolean;
  verifiedAt?: string;
  securityIncidentId?: string; // Ref: SecurityIncident
  group?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LoginSession {
  _id: string;
  userId: string; // Ref: User
  email: string;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  passwordVerifiedAt: string;
  passwordBreached?: boolean;
  breachCount?: number;
  status?: 'pending' | 'verified' | 'expired' | 'invalidated';
  expiresAt: string;
  otpSentAt?: string;
  verifiedAt?: string;
  verificationIp?: string;
  ts?: string;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  status?: any;
  createdAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LostReason {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  category?: string;
  type?: string;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  usageCount?: number;
  inc?: any;
  totalUsage?: any;
  reasons?: any;
  sortArray?: any;
  sort?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Macro {
  _id: string;
  name: string;
  defaultValue?: string;
  description?: string;
  required?: boolean;
  type?: string;
  body: string;
  bodyType?: 'text' | 'html';
  type: 'set_status' | '// Change status (e.g.' | 'case' | 'ticket)
            set_priority' | '// Change priority level
            assign_to' | '// Assign to user/team
            add_tag' | '// Add tags
            remove_tag' | '// Remove tags
            set_field' | '// Set custom field value
            apply_sla' | '// Apply SLA policy
            send_notification' | '// Send notification
            close                 // Close/resolve item';
  value: any;
  field?: string;
  condition?: any;
  order?: number;
  name?: string;
  category?: string;
  description?: string;
  scope?: 'personal' | 'team' | 'global';
  ownerId?: string; // Ref: User
  teamId?: string; // Ref: OrganizationalUnit
  usageCount?: number;
  lastUsedAt?: string;
  type?: string;
  type?: string;
  isActive?: boolean;
  isFavorite?: boolean;
  teamId?: any;
  usageCount?: any;
  lastUsedAt?: any;
  teamId?: any;
  suggestFor?: any;
  teamId?: any;
  category?: any;
  createdAt: string;
  updatedAt: string;
}

export interface MagicLink {
  _id: string;
  token: string;
  email: string;
  userId?: string; // Ref: User
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  purpose: 'login' | 'register' | 'verify_email';
  metadata?: string;
  expiresAt?: any;
  expiresAt?: any;
  usedAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSchedule {
  _id: string;
  scheduleId?: string;
  assetId: string; // Ref: Asset
  assetName?: string;
  maintenanceType: 'preventive' | 'corrective' | 'calibration';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignTo?: string; // Ref: User
  assignToName?: string;
  maintenanceStatus?: 'planned' | 'overdue' | 'completed' | 'cancelled';
  description?: string;
  certificateRequired?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt?: any;
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  nextMaintenanceDate?: any;
  maintenanceStatus?: any;
  nextMaintenanceDate?: any;
  maintenanceStatus?: any;
  count?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceWindow {
  _id: string;
  title: string;
  description?: string;
  type?: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notifySubscribers?: boolean;
  scheduled?: boolean;
  starting?: boolean;
  completed?: boolean;
  scheduledStart?: any;
  scheduledStart?: any;
  scheduledEnd?: any;
  scheduledStart?: any;
  scheduledEnd?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturingSettings {
  _id: string;
  defaultWarehouse?: string; // Ref: Warehouse
  workInProgressWarehouse?: string; // Ref: Warehouse
  autoCreateJobCards?: boolean;
  backflushRawMaterials?: boolean;
  capacityPlanningEnabled?: boolean;
  allowOverProduction?: boolean;
  overProductionPercentage?: number;
  allowWorkOrderWithoutBOM?: boolean;
  materialConsumptionMethod?: 'manual' | 'backflush' | 'real_time';
  allowMaterialTransferBeforeStart?: boolean;
  updateItemCostAfterProduction?: boolean;
  valuationMethod?: 'FIFO' | 'LIFO' | 'moving_average' | 'standard_cost';
  enableQualityInspection?: boolean;
  defaultQualityTemplate?: string; // Ref: QualityTemplate
  defaultManufacturingLeadTime?: number;
  schedulingMethod?: 'forward' | 'backward' | 'manual';
  notifyOnOverdue?: boolean;
  notifyOnMaterialShortage?: boolean;
  notifyOnProductionComplete?: boolean;
  customSettings?: any;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface MatchingPattern {
  _id: string;
  amountRange?: number;
  type?: 'credit' | 'debit';
  type?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  vendorPattern?: string;
  clientPattern?: string;
  referencePattern?: string;
  reason?: string;
  date?: string;
  patternKey: string;
  type: 'Invoice' | 'Expense' | 'Payment' | 'Bill' | 'BankTransfer' | 'JournalEntry';
  patternType?: 'vendor_amount' | '// Same vendor' | 'similar amount
            description' | '// Description pattern matching
            reference' | '// Reference format pattern
            recurring' | '// Recurring transaction
            client_payment' | '// Client payment pattern
            vendor_payment' | '// Vendor payment pattern
            salary' | '// Salary/payroll pattern
            subscription' | '// Subscription/SaaS payment
            utility' | '// Utility bill pattern
            tax' | '// Tax payment pattern
            other';
  features?: any;
  exampleTransactionId?: string; // Ref: BankTransaction
  exampleRecordId?: string;
  type?: string;
  confirmations?: number;
  rejections?: number;
  totalUses?: number;
  successRate?: number;
  rejectionReasons?: any[];
  lastUsedAt?: string;
  firstSeenAt?: string;
  strength?: number;
  isActive?: boolean;
  deactivatedAt?: string;
  deactivationReason?: string;
  strength?: any;
  match?: any;
  totalPatterns?: any;
  activePatterns?: any;
  totalConfirmations?: any;
  totalRejections?: any;
  avgSuccessRate?: any;
  avgStrength?: any;
  group?: any;
  group?: any;
  match?: any;
  sort?: any;
  project?: any;
  inc?: any;
  set?: any;
  setOnInsert?: any;
  inc?: any;
  set?: any;
  rejectionReasons?: any;
  lastUsedAt?: any;
  strength?: any;
  confirmations?: any;
  patternKey?: any;
  patternKey?: any;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialRequest {
  _id: string;
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName: string;
  qty: number;
  uom?: string;
  warehouse?: string;
  requiredDate?: string;
  orderedQty?: number;
  receivedQty?: number;
  materialRequestId?: string;
  mrNumber?: string;
  requestType: 'purchase' | 'transfer' | 'material_issue' | 'manufacture';
  purpose?: string;
  transactionDate?: string;
  requiredDate?: string;
  totalQty?: number;
  status?: 'draft' | 'submitted' | 'ordered' | 'transferred' | 'issued' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  remarks?: string;
  company?: string;
  requestedBy?: string; // Ref: User
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface MatterBudget {
  _id: string;
  name: string;
  description?: string;
  estimatedHours?: number;
  actualHours?: number;
  estimatedAmount?: number;
  actualAmount?: number;
  assignedTo?: string; // Ref: User
  status?: 'pending' | 'in_progress' | 'completed';
  name: string;
  description?: string;
  budgetAmount: number;
  usedAmount?: number;
  remainingAmount?: number;
  percentUsed?: number;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'active' | 'completed';
  name: string;
  code?: string;
  budgetAmount: number;
  usedAmount?: number;
  remainingAmount?: number;
  percentUsed?: number;
  name?: string;
  budgetAmount?: number;
  usedAmount?: number;
  level: 'info' | 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  triggeredAt?: string;
  acknowledged?: boolean;
  acknowledgedBy?: string; // Ref: User
  acknowledgedAt?: string;
  matterId: string; // Ref: Case
  matterNumber: string;
  clientId: string; // Ref: Client
  clientName: string;
  name: string;
  description?: string;
  type: 'fixed' | 'time_based' | 'phased' | 'contingency' | 'hybrid';
  currency?: string;
  totalBudget: number;
  usedAmount?: number;
  remainingAmount?: number;
  percentUsed?: number;
  status?: 'draft' | 'approved' | 'active' | 'over_budget' | 'completed' | 'cancelled';
  alertThresholds?: number;
  startDate: string;
  endDate?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  notes?: string;
  attachments?: string;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationID: string;
  userID: string; // Ref: User
  description?: string;
  filename?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
  url?: string;
  type?: 'image' | 'document' | 'video' | 'other';
  userId?: string; // Ref: User
  readAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MigrationLog {
  _id: string;
  name: string;
  version: string;
  status: 'applied' | 'failed' | 'reverted' | 'pending';
  appliedAt?: string;
  revertedAt?: string;
  duration?: number;
  error?: string;
  checksum: string;
  appliedBy?: string;
  revertedBy?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string; // Ref: User
  type: 'order' | '// طلب جديد
            proposal' | '// عرض محاماة
            proposal_accepted' | '// قبول عرض
            task' | '// تذكير مهمة
            task_assigned' | '// تم تعيين مهمة
            message' | '// رسالة جديدة
            chatter' | '// رسالة في نظام المحادثات
            hearing' | '// جلسة قادمة
            hearing_reminder' | '// تذكير بجلسة
            deadline' | '// موعد نهائي
            case' | '// تحديث قضية
            case_update' | '// تحديث القضية
            event' | '// حدث قادم
            review' | '// تقييم جديد
            payment' | '// دفعة مالية
            invoice' | '// فاتورة
            invoice_approval_required' | '// موافقة على فاتورة مطلوبة
            invoice_approved' | '// تمت الموافقة على الفاتورة
            invoice_rejected' | '// تم رفض الفاتورة
            time_entry_submitted' | '// تقديم إدخال وقت
            time_entry_approved' | '// تمت الموافقة على إدخال الوقت
            time_entry_rejected' | '// تم رفض إدخال الوقت
            expense_submitted' | '// تقديم مصروف
            expense_approved' | '// تمت الموافقة على المصروف
            expense_rejected' | '// تم رفض المصروف
            recurring_invoice' | '// فاتورة متكررة
            credit_note' | '// إشعار دائن
            debit_note' | '// إشعار مدين
            system' | '// إشعار نظام
            reminder' | '// تذكير عام
            alert              // تنبيه';
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  entityType?: 'invoice' | 'payment' | 'case' | 'task' | 'time_entry' | 'expense' | 'client' | 'document' | 'event' | 'order' | 'proposal';
  entityId?: string;
  link?: string;
  read?: boolean;
  readAt?: string;
  data?: any;
  icon?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  type?: string;
  emailSentAt?: string;
  smsSentAt?: string;
  pushSentAt?: string;
  expiresAt?: string;
  actionRequired?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  set?: any;
  createdAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  _id: string;
  email?: 'instant' | 'daily' | 'weekly' | 'none';
  push?: boolean;
  sms?: boolean;
  inApp?: boolean;
  whatsapp?: boolean;
  enabled?: boolean;
  start?: string;
  end?: string;
  timezone?: string;
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  inApp?: boolean;
  whatsapp?: boolean;
  userId: string; // Ref: User
  email?: any;
  push?: any;
  sms?: any;
  inApp?: any;
  whatsapp?: any;
  invoices?: any;
  payments?: any;
  cases?: any;
  tasks?: any;
  clients?: any;
  approvals?: any;
  reminders?: any;
  mentions?: any;
  system?: any;
  billing?: any;
  security?: any;
  updates?: any;
  quietHours?: any;
  urgentOverride?: boolean;
  digestTime?: string;
  language?: 'en' | 'ar' | 'both';
  type?: string;
  categories?: any;
  quietHours?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  _id: string;
  type: string;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
  userId: string; // Ref: User
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  emailAddress?: string;
  emailDigest?: 'immediate' | 'daily' | 'weekly' | 'none';
  emailDigestTime?: string;
  phoneNumber?: string;
  smsUrgentOnly?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  type?: string;
  type?: string;
  preferredLanguage?: 'en' | 'ar' | 'both';
  soundEnabled?: boolean;
  soundName?: string;
  badgeEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Offboarding {
  _id: string;
  itemId?: string;
  itemType?: 'id_badge' | 'laptop' | 'mobile' | 'tablet' | 'keys' | 'access_card' | 'vehicle' | 'parking_card' | 'uniform' | 'equipment' | 'documents' | 'credit_card' | 'other';
  itemDescription?: string;
  itemDescriptionAr?: string;
  serialNumber?: string;
  assetId?: string;
  condition?: 'good' | 'fair' | 'damaged' | 'lost';
  returned?: boolean;
  returnedDate?: string;
  returnedTo?: string;
  damageNotes?: string;
  damageCharge?: number;
  notReturnedReason?: string;
  replacementCost?: number;
  taskId?: string;
  task?: string;
  taskName?: string;
  taskNameAr?: string;
  completed?: boolean;
  completedDate?: string;
  completedBy?: string; // Ref: User
  notes?: string;
  outstandingAmount?: number;
  required?: boolean;
  cleared?: boolean;
  clearedBy?: string; // Ref: User
  clearanceDate?: string;
  notes?: string;
  eventId?: string;
  eventType?: 'resignation_submitted' | 'termination_issued' | 'notice_started' | 'exit_interview' | 'last_working_day' | 'clearance_started' | 'clearance_completed' | 'settlement_calculated' | 'settlement_approved' | 'settlement_paid' | 'documents_issued' | 'offboarding_completed' | 'status_changed' | 'section_cleared';
  eventDate?: string;
  description?: string;
  descriptionAr?: string;
  performedBy?: string; // Ref: User
  status?: 'scheduled' | 'completed' | 'pending' | 'overdue';
  notes?: string;
  loanId?: string;
  loanType?: string;
  originalAmount?: number;
  remainingBalance?: number;
  deductFromSettlement?: boolean;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  approved?: boolean;
  approvalDate?: string;
  comments?: string;
  offboardingId?: string;
  offboardingNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  location?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'temporary';
  contractType?: 'indefinite' | 'fixed_term';
  hireDate?: string;
  managerId?: string; // Ref: User
  managerName?: string;
  exitType?: 'resignation' | 'termination' | 'contract_end' | 'retirement' | 'death' | 'mutual_agreement' | 'medical' | 'other';
  exitCategory?: 'voluntary' | 'involuntary';
  initiatedBy?: 'employee' | 'employer' | 'mutual';
  dates?: string;
  noticePeriod?: number;
  serviceDuration?: number;
  status?: 'initiated' | 'in_progress' | 'clearance_pending' | 'completed' | 'cancelled';
  resignationDate?: string;
  resignationLetter?: boolean;
  resignationReason?: string;
  resignationReasonCategory?: 'better_opportunity' | 'relocation' | 'personal' | 'compensation' | 'career_growth' | 'work_environment' | 'health' | 'family' | 'retirement' | 'other';
  detailedReason?: string;
  withdrawalRequested?: boolean;
  withdrawalDate?: string;
  withdrawalApproved?: boolean;
  terminationDate?: string;
  terminationType?: 'with_cause' | 'without_cause';
  terminationReason?: string;
  terminationReasonCategory?: 'performance' | 'misconduct' | 'violation' | 'redundancy' | 'restructuring' | 'business_closure' | 'project_completion' | 'other';
  detailedReason?: string;
  saudiLaborLawArticle?: string;
  article80Violation?: 'fraud' | 'assault' | 'disobedience' | 'absence' | 'breach_of_trust' | 'intoxication' | 'gross_negligence' | 'other';
  notice?: boolean;
  terminationLetter?: boolean;
  contractEnd?: any;
  retirement?: 'voluntary' | 'mandatory' | 'early' | 'medical';
  death?: any;
  mutualAgreement?: any;
  required?: boolean;
  scheduled?: boolean;
  scheduledDate?: string;
  conducted?: boolean;
  conductedDate?: string;
  interviewedBy?: string; // Ref: User
  interviewerRole?: string;
  interviewMethod?: 'in_person' | 'video' | 'phone' | 'online_form';
  primaryReason?: string;
  primaryReasonCategory?: 'compensation' | 'career_growth' | 'management' | 'work_environment' | 'work_life_balance' | 'relocation' | 'personal' | 'health' | 'better_opportunity' | 'other';
  detailedReason?: string;
  ratings?: number;
  whatYouLikedMost?: string;
  whatCouldBeImproved?: string;
  managerRelationship?: number;
  teamDynamics?: string;
  companyPolicies?: any;
  trainingAndDevelopment?: any;
  compensationAndBenefits?: any;
  workload?: any;
  suggestions?: string;
  wouldRecommendCompany?: boolean;
  wouldConsiderReturning?: boolean;
  additionalComments?: string;
  interviewerNotes?: string;
  keyInsights?: string;
  action?: string;
  category?: 'retention' | 'improvement' | 'policy' | 'training' | 'management';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
  interviewDocument?: string;
  completed?: boolean;
  completionDate?: string;
  required?: boolean;
  allItemsReturned?: boolean;
  required?: boolean;
  dataBackup?: boolean;
  filesTransferred?: boolean;
  emailDeactivationDate?: string;
  cleared?: boolean;
  clearedBy?: string; // Ref: User
  clearanceDate?: string;
  financeClearance?: boolean; // Ref: User
  hrClearance?: boolean; // Ref: User
  departmentClearance?: boolean; // Ref: User
  managerClearance?: boolean; // Ref: User
  allClearancesObtained?: boolean;
  finalClearanceDate?: string;
  clearanceCertificate?: boolean;
  required?: boolean;
  created?: boolean;
  createdDate?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  role?: string;
  responsibility?: string;
  priority?: 'high' | 'medium' | 'low';
  handedOver?: boolean;
  handoverDate?: string;
  handoverDocument?: string;
  taskId?: string;
  taskName?: string;
  taskDescription?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'ongoing' | 'completed' | 'on_hold';
  handedOverTo?: string;
  handoverDate?: string;
  instructions?: string;
  documents?: string;
  allTasksHandedOver?: boolean;
  projectsHandover?: boolean[];
  clientId?: string;
  clientName?: string;
  matterType?: string;
  matterStatus?: string;
  upcomingDeadlines?: string;
  courtDates?: string;
  handedOverTo?: string;
  handoverDate?: string;
  clientNotified?: boolean;
  clientNotificationDate?: string;
  handoverNotes?: string;
  documents?: string;
  allMattersHandedOver?: boolean;
  handoverComplete?: boolean;
  handoverCompletionDate?: string;
  managerApproved?: boolean;
  managerApprovalDate?: string;
  managerComments?: string;
  calculated?: boolean;
  calculationDate?: string;
  calculatedBy?: string; // Ref: User
  calculationBase?: any;
  outstandingSalary?: boolean;
  unusedAnnualLeave?: boolean;
  applicable?: boolean;
  years1to5?: number;
  yearsOver5?: number;
  totalEOSB?: number;
  resignationAdjustment?: any;
  finalEOSB?: number;
  calculationFormula?: string;
  unpaidOvertime?: boolean;
  unpaidBonuses?: boolean;
  otherAllowances?: boolean[];
  totalEarnings?: number;
  outstandingLoans?: boolean;
  outstandingAdvances?: boolean;
  noticeShortfall?: boolean;
  unreturnedProperty?: boolean[];
  damages?: boolean;
  otherDeductions?: boolean[];
  totalDeductions?: number;
  netSettlement?: number;
  payment?: 'bank_transfer' | 'check' | 'cash';
  settlementLetter?: boolean;
  finalApproved?: boolean;
  finalApprovalDate?: string;
  approvedBy?: string; // Ref: User
  required?: boolean;
  requested?: boolean;
  requestDate?: string;
  prepared?: boolean;
  preparedDate?: string;
  preparedBy?: string; // Ref: User
  certificateContent?: boolean;
  issued?: boolean;
  issueDate?: string;
  certificateNumber?: string;
  arabicVersion?: boolean;
  englishVersion?: boolean;
  officialStamp?: boolean;
  authorizedSignature?: boolean;
  delivered?: boolean;
  deliveryDate?: string;
  deliveryMethod?: 'hand' | 'email' | 'mail' | 'courier';
  referenceLetter?: boolean; // Ref: User
  salaryCertificate?: boolean;
  noc?: boolean; // Ref: User
  gosiClearance?: boolean;
  documentType?: string;
  documentName?: string;
  requested?: boolean;
  prepared?: boolean;
  documentUrl?: string;
  issued?: boolean;
  issueDate?: string;
  rehireEligibility?: 'eligible' | 'not_eligible' | 'conditional' | 'blacklisted'; // Ref: User
  notes?: any;
  exitInterviewCompleted?: boolean;
  clearanceCompleted?: boolean;
  knowledgeTransferCompleted?: boolean;
  finalSettlementCompleted?: boolean;
  documentsIssued?: boolean;
  allTasksCompleted?: boolean;
  offboardingCompleted?: boolean;
  completionDate?: string;
  finalApproval?: boolean; // Ref: User
  caseClosed?: boolean;
  closedDate?: string;
  closedBy?: string; // Ref: User
  relatedRecords?: any;
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  calculation?: any;
  group?: any;
  thisMonth?: any;
  status?: any;
  createdAt?: any;
  updatedAt?: any;
  thisMonth?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Okr {
  _id: string;
  keyResultId: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  metricType?: 'percentage' | '// 0-100%
            number' | '// Numeric target
            currency' | '// Money value
            boolean' | '// Yes/No completion
            milestone      // Milestone-based';
  targetValue: number;
  currentValue?: number;
  startValue?: number;
  unit?: string;
  score?: number;
  scoreGrade?: 'red' | 'yellow' | 'green';
  progress?: number;
  status?: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled';
  confidence?: number;
  date?: string;
  confidence?: number;
  notes?: string;
  weight?: number;
  ownerId?: string; // Ref: Employee
  ownerName?: string;
  ownerNameAr?: string;
  date?: string;
  previousValue?: number;
  newValue?: number;
  previousScore?: number;
  newScore?: number;
  note?: string;
  milestoneId?: string;
  title?: string;
  titleAr?: string;
  dueDate?: string;
  completed?: boolean;
  completedAt?: string;
  weight?: number;
  dueDate?: string;
  completedDate?: string;
  cfrId?: string;
  type: 'conversation' | 'feedback' | 'recognition';
  conversationDetails?: any;
  feedbackDetails?: 'positive' | 'constructive' | 'developmental' | 'recognition';
  recognitionDetails?: 'kudos' | 'achievement' | 'milestone' | 'values' | 'teamwork' | 'innovation' | 'customer_focus'[]; // Ref: User
  fromUser: string; // Ref: User
  fromUserName?: string;
  toUser?: string; // Ref: User
  toUserName?: string;
  date?: string;
  visibility?: 'private' | 'team' | 'department' | 'company';
  okrId?: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  level: 'company' | 'department' | 'team' | 'individual';
  period: 'annual' | 'semi_annual' | 'quarterly' | 'monthly' | 'custom';
  periodYear: number;
  periodQuarter?: number;
  startDate: string;
  endDate: string;
  parentOkrId?: string; // Ref: OKR
  type?: string;
  ownerId?: string; // Ref: Employee
  ownerName?: string;
  ownerNameAr?: string;
  ownerType?: 'individual' | 'team' | 'department' | 'company';
  teamId?: string; // Ref: Team
  departmentId?: string; // Ref: Department
  okrType?: 'committed' | '// Must achieve 100% - tied to business commitments
            aspirational' | '// Stretch goals - 70% achievement is success
            learning       // Experimental - process of learning matters';
  targetScore?: number;
  status?: 'draft' | 'active' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled' | 'deferred';
  overallProgress?: number;
  overallScore?: number;
  scoreGrade?: 'red' | 'yellow' | 'green';
  scoreLabel?: string;
  scoreLabelAr?: string;
  avgConfidence?: number;
  checkInId?: string;
  weekNumber?: number;
  weekStartDate?: string;
  date?: string;
  overallProgress?: number;
  overallScore?: number;
  status?: string;
  confidence?: number;
  progress?: any;
  plans?: any;
  summary?: string;
  summaryAr?: string;
  blocker?: string;
  blockerAr?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  needsEscalation?: boolean;
  risksIdentified?: string;
  keyResultId?: string;
  previousValue?: number;
  newValue?: number;
  previousScore?: number;
  newScore?: number;
  confidence?: number;
  note?: string;
  teamMood?: 'very_positive' | 'positive' | 'neutral' | 'concerned' | 'struggling';
  moodNote?: string;
  createdByName?: string;
  cfrStats?: number;
  date?: string;
  score?: number;
  grade?: string;
  weekNumber?: number;
  confidence?: number;
  finalGrade?: 'red' | 'yellow' | 'green'; // Ref: User
  visibility?: 'public' | 'department' | 'team' | 'private';
  tags?: string;
  category?: 'growth' | 'efficiency' | 'quality' | 'innovation' | 'customer' | 'people' | 'financial' | 'operational' | 'strategic' | 'learning';
  categoryLabel?: string;
  categoryLabelAr?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  okrId?: string; // Ref: OKR
  okrTitle?: string;
  dependencyType?: 'blocks' | 'blocked_by' | 'related';
  notes?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  role?: 'owner' | 'contributor' | 'supporter' | 'informed';
  addedAt?: string;
  assessmentId?: string;
  employeeId: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  employeeNumber?: string;
  periodYear: number;
  periodType?: 'annual' | 'semi_annual' | 'quarterly';
  periodQuarter?: number;
  performanceRating: '1' | '2' | '3';
  performanceLabel?: 'low' | 'moderate' | 'high';
  performanceNotes?: string;
  performanceNotesAr?: string;
  potentialRating: '1' | '2' | '3';
  potentialLabel?: 'low' | 'moderate' | 'high';
  potentialNotes?: string;
  potentialNotesAr?: string;
  boxPosition?: number;
  boxLabel?: 'bad_hire' | '// Box 1: Low Performance' | 'Low Potential
            grinder' | '// Box 2: Low Performance' | 'Moderate Potential
            dilemma' | '// Box 3: Low Performance' | 'High Potential
            up_or_out' | '// Box 4: Moderate Performance' | 'Low Potential
            core_player' | '// Box 5: Moderate Performance' | 'Moderate Potential
            high_potential' | '// Box 6: Moderate Performance' | 'High Potential
            solid_performer' | '// Box 7: High Performance' | 'Low Potential
            high_performer' | '// Box 8: High Performance' | 'Moderate Potential
            star                // Box 9: High Performance' | 'High Potential';
  boxLabelAr?: string;
  action?: string;
  actionAr?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  performanceReviewId?: string; // Ref: PerformanceReview
  recentOkrScore?: number;
  skillAssessmentScore?: number;
  isSuccessionCandidate?: boolean;
  targetRoles?: string;
  readinessLevel?: 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'ready_3_plus_years';
  flightRisk?: 'low' | 'medium' | 'high';
  retentionPriority?: 'critical' | 'high' | 'medium' | 'low';
  assessedBy?: string; // Ref: User
  assessedDate?: string;
  calibrated?: boolean;
  calibratedBy?: string; // Ref: User
  calibratedDate?: string;
  calibrationNotes?: string;
  inc?: any;
  inc?: any;
  status?: any;
  match?: any;
  count?: any;
  employees?: any;
  sort?: any;
  1?: any;
  2?: any;
  3?: any;
  4?: any;
  5?: any;
  6?: any;
  7?: any;
  8?: any;
  9?: any;
  match?: any;
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  successionCandidates?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  createdAt: string;
  updatedAt: string;
}

export interface OmnichannelConversation {
  _id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  contentType?: 'text' | 'html' | 'attachment';
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  sentBy?: string; // Ref: User
  metadata?: any;
  contactId: string; // Ref: Contact
  channel: 'email' | 'whatsapp' | 'sms' | 'live_chat' | 'instagram' | 'facebook' | 'twitter';
  channelIdentifier?: string;
  status: 'open' | 'snoozed' | 'closed';
  assignedTo?: string; // Ref: User
  team?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  slaInstanceId?: string;
  type?: string;
  customFields?: any;
  lastMessageAt?: string;
  firstResponseAt?: string;
  snoozeUntil?: string;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Onboarding {
  _id: string;
  documentType?: 'national_id' | 'passport' | 'iqama' | 'degree' | 'certificate' | 'bar_admission' | 'medical_certificate' | 'vaccine_certificate' | 'bank_letter' | 'photo' | 'other';
  documentName?: string;
  documentNameAr?: string;
  required?: boolean;
  submitted?: boolean;
  submittedDate?: string;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  verificationDate?: string;
  fileUrl?: string;
  expiryDate?: string;
  notes?: string;
  taskId?: string;
  taskName?: string;
  taskNameAr?: string;
  category?: 'documents' | 'it' | 'workspace' | 'communication' | 'other';
  responsible?: string;
  responsibleRole?: string;
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedDate?: string;
  completedBy?: string; // Ref: User
  notes?: string;
  equipmentType?: 'laptop' | 'desktop' | 'monitor' | 'keyboard' | 'mouse' | 'phone' | 'headset' | 'other';
  equipmentId?: string;
  serialNumber?: string;
  provided?: boolean;
  providedDate?: string;
  acknowledged?: boolean;
  systemName?: string;
  accessGranted?: boolean;
  firstLogin?: boolean;
  firstLoginDate?: string;
  trainingRequired?: boolean;
  trainingCompleted?: boolean;
  topic?: string;
  topicAr?: string;
  covered?: boolean;
  policyName?: string;
  policyNameAr?: string;
  category?: 'hr' | 'it' | 'security' | 'safety' | 'ethics' | 'legal' | 'other';
  reviewed?: boolean;
  reviewedDate?: string;
  acknowledged?: boolean;
  acknowledgedDate?: string;
  policyUrl?: string;
  testRequired?: boolean;
  testPassed?: boolean;
  testScore?: number;
  sessionId?: string;
  systemName?: string;
  moduleName?: string;
  moduleNameAr?: string;
  category?: 'mandatory' | 'role_specific' | 'compliance' | 'technical' | 'soft_skills';
  trainingType?: 'classroom' | 'online' | 'shadowing' | 'hands_on' | 'reading' | 'group' | 'individual' | 'self_paced';
  trainer?: string;
  scheduledDate?: string;
  duration?: number;
  conducted?: boolean;
  completedDate?: string;
  materials?: string;
  handsOnPractice?: boolean;
  testRequired?: boolean;
  testCompleted?: boolean;
  testScore?: number;
  proficiencyLevel?: 'beginner' | 'basic' | 'competent' | 'intermediate' | 'advanced';
  goalId?: string;
  goalName?: string;
  goalType?: '30_day' | '60_day' | '90_day' | 'probation';
  targetMetric?: string;
  targetValue?: number;
  dueDate?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  taskId?: string;
  taskName?: string;
  taskNameAr?: string;
  description?: string;
  responsible?: 'hr' | 'it' | 'manager' | 'employee' | 'facilities' | 'finance' | 'other';
  responsiblePerson?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'not_applicable';
  completedDate?: string;
  completedBy?: string; // Ref: User
  verificationRequired?: boolean;
  verified?: boolean;
  verifiedBy?: string; // Ref: User
  blockedReason?: string;
  attachments?: string;
  notes?: string;
  categoryId?: string;
  categoryName?: string;
  categoryNameAr?: string;
  completionPercentage?: number;
  reviewId?: string;
  reviewType?: '30_day' | '60_day' | '90_day' | 'final' | 'ad_hoc';
  reviewDay?: number;
  scheduledDate?: string;
  conducted?: boolean;
  conductedDate?: string;
  conductedBy?: string; // Ref: User
  performanceAssessment?: number;
  competency?: string;
  rating?: number;
  comments?: string;
  goalName?: string;
  achievementPercentage?: number;
  onTrack?: boolean;
  strengths?: string;
  areasForImprovement?: string;
  managerComments?: string;
  employeeComments?: string;
  recommendation?: 'on_track' | 'needs_improvement' | 'at_risk' | 'recommend_confirmation' | 'recommend_termination';
  recommendationReason?: string;
  action?: string;
  owner?: string;
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  nextReviewDate?: string;
  reviewDocument?: string;
  employeeAcknowledged?: boolean;
  acknowledgedDate?: string;
  sessionDate?: string;
  sessionType?: 'first_day' | 'first_week' | 'first_month' | '30_day' | '60_day' | '90_day';
  overallSatisfaction?: number;
  experienceRatings?: number;
  positiveAspects?: string;
  challenges?: string;
  suggestions?: string;
  questionsOrConcerns?: string;
  wouldRecommend?: boolean;
  documentType?: 'contract' | 'handbook_acknowledgment' | 'policy_acknowledgment' | 'training_certificate' | 'equipment_acknowledgment' | 'id_badge' | 'probation_review' | 'confirmation_letter' | 'other';
  documentName?: string;
  documentNameAr?: string;
  required?: boolean;
  fileUrl?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  signed?: boolean;
  signedDate?: string;
  signature?: string;
  expiryDate?: string;
  onboardingId?: string;
  onboardingNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  department?: string;
  location?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'temporary';
  contractType?: 'indefinite' | 'fixed_term';
  hireDate?: string;
  managerId?: string; // Ref: User
  managerName?: string;
  managerEmail?: string;
  isTransfer?: boolean;
  isPromotion?: boolean;
  previousDepartment?: string;
  previousRole?: string;
  startDate?: string;
  completionTargetDate?: string;
  probation?: 'active' | 'passed' | 'failed';
  completion?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  sent?: boolean;
  sentDate?: string;
  welcomeEmail?: boolean;
  welcomeKit?: boolean;
  companyHandbook?: 'pdf' | 'physical' | 'portal';
  documentsCollection?: boolean;
  contractSigning?: 'indefinite' | 'fixed_term';
  itAccountSetup?: boolean;
  workstationPrep?: boolean;
  preboardingComplete?: boolean;
  preboardingCompletionDate?: string;
  date?: string;
  arrival?: string; // Ref: User
  idBadge?: boolean;
  workstation?: boolean;
  email?: boolean;
  vpn?: boolean;
  allSystemsAccessed?: boolean;
  orientation?: boolean; // Ref: User
  teamIntroduction?: boolean;
  welcomeLunch?: boolean;
  scheduled?: boolean;
  scheduledTime?: string;
  conducted?: boolean;
  conductedBy?: string; // Ref: User
  topic?: 'policies' | 'benefits' | 'payroll' | 'leave' | 'performance' | 'code_of_conduct' | 'labor_law' | 'other';
  covered?: boolean;
  questionsAnswered?: string;
  completed?: boolean;
  taskId?: string;
  taskName?: string;
  taskNameAr?: string;
  category?: 'arrival' | 'setup' | 'meetings' | 'training' | 'other';
  dueTime?: string;
  completed?: boolean;
  completedTime?: string;
  notes?: string;
  firstDayFeedback?: boolean;
  firstDayComplete?: boolean;
  weekNumber?: number;
  weekStartDate?: string;
  weekEndDate?: string;
  policiesReview?: boolean;
  required?: boolean;
  scheduled?: boolean;
  scheduledDate?: string;
  conducted?: boolean;
  conductedBy?: string; // Ref: User
  topic?: string;
  article?: string;
  covered?: boolean;
  keyTopics?: boolean;
  materialProvided?: string;
  testRequired?: boolean;
  testCompleted?: boolean;
  testScore?: number;
  passingScore?: number;
  certificateIssued?: boolean;
  completed?: boolean;
  completedDate?: string;
  safetyTraining?: boolean[]; // Ref: User
  systemsTraining?: boolean;
  roleClarification?: boolean;
  goalsSetting?: boolean;
  buddyAssignment?: 'peer_buddy' | 'mentor' | 'coach'[]; // Ref: Employee
  taskId?: string;
  taskName?: string;
  taskNameAr?: string;
  category?: 'training' | 'setup' | 'meetings' | 'learning' | 'other';
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  completedDate?: string;
  notes?: string;
  scheduled?: boolean;
  scheduledDate?: string;
  conducted?: boolean;
  conductedDate?: string;
  conductedBy?: string; // Ref: User
  employeeFeedback?: number;
  managerNotes?: string;
  action?: string;
  owner?: string;
  dueDate?: string;
  firstWeekComplete?: boolean;
  firstWeekCompletionDate?: string;
  monthStartDate?: string;
  monthEndDate?: string;
  weekNumber?: number;
  checkInDate?: string;
  conducted?: boolean;
  conductedBy?: string; // Ref: User
  topic?: string;
  discussed?: boolean;
  employeeFeedback?: number;
  managerFeedback?: any;
  action?: string;
  owner?: string;
  dueDate?: string;
  completed?: boolean;
  notes?: string;
  roleSpecificTraining?: boolean;
  scheduled?: boolean;
  scheduledDate?: string;
  conducted?: boolean;
  conductedDate?: string;
  feedbackAreas?: any;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  area?: string;
  action?: string;
  timeline?: string;
  employeeComments?: string;
  feedbackDocument?: string;
  firstMonthComplete?: boolean;
  firstMonthCompletionDate?: string;
  probationInfo?: 'active' | 'passed' | 'failed';
  milestoneId?: string;
  milestoneType?: '30_day' | '60_day' | '90_day' | 'final';
  milestoneDay?: number;
  milestoneDate?: string;
  reviewRequired?: boolean;
  objective?: string;
  achieved?: boolean;
  notes?: string;
  completed?: boolean;
  completedDate?: string;
  scheduled?: boolean;
  scheduledDate?: string;
  conducted?: boolean;
  conductedDate?: string;
  reviewerId?: string; // Ref: User
  reviewerName?: string;
  reviewerRole?: string;
  recommendation?: 'confirm' | 'terminate';
  comments?: string;
  finalAssessment?: number;
  keyAchievements?: string;
  challengesOvercome?: string;
  developmentAreas?: string;
  decision?: 'confirm' | 'terminate';
  decisionReason?: string;
  confirmation?: any;
  termination?: boolean;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  approved?: boolean;
  approvalDate?: string;
  employeeAcknowledged?: boolean;
  acknowledgedDate?: string;
  employeeComments?: string;
  hrProcessed?: boolean;
  processedDate?: string;
  processedBy?: string; // Ref: User
  onboardingChecklist?: number;
  requiredTrainings?: number;
  completedTrainings?: number;
  trainingId?: string;
  trainingName?: string;
  category?: 'mandatory' | 'role_specific' | 'compliance' | 'technical' | 'soft_skills';
  required?: boolean;
  completed?: boolean;
  completionDate?: string;
  certificateIssued?: boolean;
  certificateUrl?: string;
  expiryDate?: string;
  allMandatoryCompleted?: boolean;
  employeeFeedback?: any;
  allTasksCompleted?: boolean;
  completionDate?: string;
  probationStatus?: 'ongoing' | 'passed' | 'failed';
  onboardingSuccessful?: boolean;
  finalReview?: boolean; // Ref: User
  confirmationLetter?: boolean;
  onboardingClosed?: boolean;
  closedDate?: string;
  closedBy?: string; // Ref: User
  notes?: any;
  metrics?: 'low' | 'medium' | 'high';
  relatedRecords?: string; // Ref: Applicant
  lastModifiedBy?: string; // Ref: User
  createdAt?: any;
  group?: any;
  thisMonth?: any;
  status?: any;
  completionTargetDate?: any;
  createdAt?: any;
  updatedAt?: any;
  thisMonth?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  gigID?: string; // Ref: Gig
  jobId?: string; // Ref: Job
  image?: string;
  title: string;
  price: number;
  sellerID: string; // Ref: User
  buyerID: string; // Ref: User
  isCompleted?: boolean;
  payment_intent: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  terms?: string;
  acceptedAt?: string;
  completedAt?: string;
  conversationID?: string; // Ref: Conversation
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  _id: string;
  contactId?: string; // Ref: Contact
  role?: string;
  isPrimary?: boolean;
  legalName?: string;
  legalNameAr?: string;
  tradeName?: string;
  tradeNameAr?: string;
  name?: string;
  nameAr?: string;
  type?: 'llc' | 'joint_stock' | 'partnership' | 'sole_proprietorship' | 'branch' | 'government' | 'nonprofit' | 'professional' | 'holding' | 'company' | 'court' | 'law_firm' | 'other';
  status?: 'active' | 'inactive' | 'suspended' | 'dissolved' | 'pending' | 'archived';
  industry?: string;
  subIndustry?: string;
  size?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | 'null';
  employeeCount?: number;
  commercialRegistration?: string;
  crIssueDate?: string;
  crExpiryDate?: string;
  crIssuingCity?: string;
  vatNumber?: string;
  unifiedNumber?: string;
  municipalLicense?: string;
  chamberMembership?: string;
  registrationNumber?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  address?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  nationalAddress?: string;
  poBox?: string;
  parentCompany?: string;
  parentOrganizationId?: string; // Ref: Organization
  type?: string;
  type?: string;
  hierarchyLevel?: 'parent' | 'subsidiary' | 'standalone';
  foundedDate?: string;
  dunsNumber?: string;
  naicsCode?: string;
  sicCode?: string;
  stockSymbol?: string;
  capital?: number;
  annualRevenue?: number;
  creditLimit?: number;
  paymentTerms?: number;
  bankName?: string;
  iban?: string;
  accountHolderName?: string;
  swiftCode?: string;
  billingType?: 'hourly' | 'fixed' | 'contingency' | 'retainer' | 'null';
  preferredPaymentMethod?: 'bank_transfer' | 'check' | 'cash' | 'credit_card' | 'null';
  billingCycle?: 'monthly' | 'quarterly' | 'upon_completion' | 'null';
  billingEmail?: string;
  billingContact?: string; // Ref: Contact
  conflictCheckStatus?: 'not_checked' | 'clear' | 'potential_conflict' | 'confirmed_conflict';
  conflictNotes?: string;
  conflictCheckDate?: string;
  conflictCheckedBy?: string; // Ref: User
  type?: string;
  type?: string;
  notes?: string;
  description?: string;
  type?: string;
  type?: string;
  type?: string;
  businessIntelligence?: 'aaa' | 'aa' | 'a' | 'bbb' | 'bb' | 'b' | 'c' | 'unknown';
  dateOpened?: string;
  dateLastStageUpdate?: string;
  stage?: string;
  date?: string;
  changedBy?: string; // Ref: User
  notes?: string;
  sla?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'enterprise' | 'custom';
  campaignId?: string; // Ref: Campaign
  marketingScore?: number;
  engagementScore?: number;
  lastMarketingTouch?: string;
  leadSource?: string;
  integration?: 'synced' | 'pending' | 'failed' | 'never'[];
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  accountManagerId?: string; // Ref: User
  customFields?: string;
  followUp?: 'phone' | 'email' | 'whatsapp' | 'meeting' | 'sms' | 'other'; // Ref: User
  status?: any;
  legalName?: any;
  legalNameAr?: any;
  tradeName?: any;
  tradeNameAr?: any;
  name?: any;
  nameAr?: any;
  email?: any;
  commercialRegistration?: any;
  vatNumber?: any;
  legalName?: any;
  legalNameAr?: any;
  tradeName?: any;
  tradeNameAr?: any;
  name?: any;
  nameAr?: any;
  email?: any;
  commercialRegistration?: any;
  vatNumber?: any;
  legalName?: any;
  legalNameAr?: any;
  tradeName?: any;
  email?: any;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationTemplate {
  _id: string;
  name: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant';
  permissions?: 'none' | 'view' | 'edit' | 'full';
  isDefault?: boolean;
  description?: string;
  descriptionAr?: string;
  maxConcurrentSessions?: number;
  sessionTimeout?: number;
  mfaRequired?: boolean;
  ipRestrictionEnabled?: boolean;
  defaultRateLimits?: number;
  passwordPolicy?: number;
  timezone?: string;
  language?: 'ar' | 'en';
  dateFormat?: string;
  fiscalYearStart?: number;
  defaultCasePrefix?: string;
  defaultClientPrefix?: string;
  numberingFormat?: 'sequential' | 'yearly';
  defaultCurrency?: string;
  defaultPaymentTerms?: number;
  invoicePrefix?: string;
  dataRetentionDays?: number;
  autoDeleteOldData?: boolean;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  isDefault?: boolean;
  isActive?: boolean;
  isGlobal?: boolean;
  validate?: any;
  settings?: any;
  features?: boolean;
  subscriptionDefaults?: 'free' | 'starter' | 'professional' | 'enterprise';
  metadata?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
  usageCount?: number;
  lastUsedAt?: string;
  version?: number;
  parentTemplateId?: string; // Ref: OrganizationTemplate
  partialFilterExpression?: any;
  set?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationalUnit {
  _id: string;
  positionId?: string;
  positionTitle?: string;
  positionTitleAr?: string;
  positionType?: 'manager' | 'director' | 'head' | 'supervisor' | 'lead' | 'coordinator' | 'acting';
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  isPrimary?: boolean;
  startDate?: string;
  endDate?: string;
  actingFor?: string;
  reportingTo?: string;
  kpiId?: string;
  kpiName?: string;
  kpiNameAr?: string;
  category?: 'financial' | 'customer' | 'process' | 'people' | 'growth';
  measurementUnit?: string;
  targetValue?: number;
  actualValue?: number;
  achievementRate?: number;
  period?: 'monthly' | 'quarterly' | 'yearly';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  trend?: 'improving' | 'stable' | 'declining';
  status?: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  owner?: string;
  lastUpdated?: string;
  positionId?: string;
  positionCode?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  jobLevel?: string;
  filled?: boolean;
  incumbentId?: string; // Ref: Employee
  incumbentName?: string;
  reportsToPositionId?: string;
  fte?: number;
  essential?: boolean;
  budgetedSalary?: number;
  actualSalary?: number;
  auditDate?: string;
  auditType?: 'internal' | 'external' | 'regulatory' | 'financial' | 'operational';
  auditor?: string;
  scope?: string;
  findingType?: 'major' | 'minor' | 'observation';
  description?: string;
  correctionRequired?: boolean;
  corrected?: boolean;
  correctionDate?: string;
  overallRating?: string;
  reportUrl?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  riskId?: string;
  riskDescription?: string;
  riskCategory?: 'operational' | 'financial' | 'strategic' | 'compliance' | 'reputational' | 'safety' | 'cybersecurity';
  likelihood?: 'low' | 'medium' | 'high';
  impact?: 'low' | 'medium' | 'high';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategies?: string;
  riskOwner?: string;
  lastReviewed?: string;
  restructureId?: string;
  restructureDate?: string;
  restructureType?: 'merger' | 'split' | 'reorganization' | 'downsizing' | 'expansion' | 'relocation' | 'process_change';
  description?: string;
  reason?: string;
  impactedEmployees?: number;
  headcountChange?: number;
  budgetImpact?: number;
  approvedBy?: string;
  implementationDate?: string;
  completionDate?: string;
  successful?: boolean;
  lessonsLearned?: string;
  communicationId?: string;
  communicationType?: 'announcement' | 'policy_update' | 'restructure_notice' | 'performance_update' | 'newsletter' | 'meeting_minutes';
  date?: string;
  subject?: string;
  communicatedBy?: string;
  audience?: 'all_employees' | 'management' | 'specific_roles' | 'external';
  messageUrl?: string;
  readReceipts?: number;
  documentType?: 'org_chart' | 'charter' | 'policy' | 'procedure' | 'budget' | 'strategic_plan' | 'business_plan' | 'performance_report' | 'audit_report' | 'license' | 'registration' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  version?: string;
  effectiveDate?: string;
  expiryDate?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  confidential?: boolean;
  accessLevel?: 'public' | 'internal' | 'management' | 'restricted';
  unitId?: string;
  unitCode?: string;
  unitType?: 'company' | 'legal_entity' | 'division' | 'business_unit' | 'department' | 'subdepartment' | 'team' | 'section' | 'branch' | 'office' | 'subsidiary' | 'region' | 'project_team' | 'committee' | 'other';
  unitTypeAr?: string;
  unitCategory?: 'operational' | 'support' | 'administrative' | 'strategic' | 'project_based' | 'temporary' | 'permanent';
  unitName?: string;
  unitNameAr?: string;
  officialName?: string;
  officialNameAr?: string;
  shortName?: string;
  abbreviation?: string;
  description?: string;
  descriptionAr?: string;
  mission?: string;
  missionAr?: string;
  vision?: string;
  visionAr?: string;
  objectives?: string;
  objectivesAr?: string;
  functions?: string;
  legalEntity?: 'limited_liability' | 'joint_stock' | 'partnership' | 'sole_proprietorship' | 'branch' | 'holding_company' | 'subsidiary';
  parentUnitId?: string; // Ref: OrganizationalUnit
  parentUnitCode?: string;
  parentUnitName?: string;
  parentUnitNameAr?: string;
  topLevelParentId?: string; // Ref: OrganizationalUnit
  topLevelParentName?: string;
  level?: number;
  path?: string;
  hierarchyPath?: string;
  hasChildren?: boolean;
  childUnitsCount?: number;
  directReportingUnit?: string; // Ref: OrganizationalUnit
  functionalReportingUnit?: string; // Ref: OrganizationalUnit
  unitId?: string; // Ref: OrganizationalUnit
  unitName?: string;
  relationshipType?: string;
  chartPosition?: any;
  managerId?: string; // Ref: Employee
  managerName?: string;
  managerNameAr?: string;
  headOfUnit?: 'direct' | 'functional' | 'dotted_line'; // Ref: Employee
  deputyHead?: string; // Ref: Employee
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  jobTitle?: string;
  role?: 'head' | 'deputy' | 'manager' | 'supervisor' | 'lead' | 'member';
  responsibilityArea?: string;
  votingMember?: boolean;
  hasPlan?: boolean;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  readinessLevel?: 'ready_now' | 'ready_1_year' | 'ready_2_3_years' | 'developing';
  developmentNeeds?: string;
  rank?: number;
  lastReviewDate?: string;
  nextReviewDate?: string;
  approvedHeadcount?: number;
  currentHeadcount?: number;
  vacancies?: number;
  vacancyRate?: number;
  fullTimeEmployees?: number;
  partTimeEmployees?: number;
  contractors?: number;
  temporaryWorkers?: number;
  interns?: number;
  consultants?: number;
  saudiCount?: number;
  nonSaudiCount?: number;
  saudizationRate?: number;
  maleCount?: number;
  femaleCount?: number;
  genderRatio?: number;
  byLevel?: number;
  approvedBy?: string;
  approvalDate?: string;
  fiscalYear?: string;
  turnover?: number[];
  positions?: number;
  headcountPlan?: 'draft' | 'submitted' | 'approved' | 'rejected';
  hasBudget?: boolean;
  fiscalYear?: string;
  annualBudget?: number;
  currentYearBudget?: number;
  budgetUtilization?: number;
  salaryBudget?: number;
  operationalBudget?: number;
  capitalBudget?: number;
  trainingBudget?: number;
  spentToDate?: number;
  remainingBudget?: number;
  currency?: string;
  budgetApprovalDate?: string;
  budgetApprovedBy?: string;
  forecastedSpend?: number;
  varianceExplanation?: string;
  revenue?: any;
  budgetHolder?: string; // Ref: Employee
  costCenter?: 'revenue_generating' | 'cost_center' | 'profit_center' | 'investment_center' | 'shared_services' | 'support';
  glAllocation?: any;
  primaryFunctionAr?: string;
  functionCategory?: 'revenue_generating' | 'cost_center' | 'support' | 'overhead' | 'profit_center' | 'investment_center';
  responsibility?: string;
  responsibilityAr?: string;
  priority?: 'primary' | 'secondary' | 'tertiary';
  description?: string;
  activity?: string;
  activityAr?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  service?: string;
  serviceAr?: string;
  providedTo?: 'internal' | 'external' | 'both';
  clients?: string;
  approvalAuthority?: 'unlimited' | 'high' | 'medium' | 'low' | 'none';
  authorityType?: string;
  delegatedTo?: string;
  effectiveDate?: string;
  expiryDate?: string;
  limitations?: string;
  locationType?: 'headquarters' | 'branch' | 'office' | 'plant' | 'warehouse' | 'retail' | 'remote' | 'virtual';
  locationName?: string;
  locationNameAr?: string;
  address?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  officeHours?: any;
  locationId?: string;
  locationName?: string;
  locationType?: string;
  city?: string;
  country?: string;
  headcount?: number;
  primary?: boolean;
  officeSpace?: any;
  equipmentType?: string;
  quantity?: number;
  accessibility?: boolean;
  remoteWork?: 'fully_remote' | 'hybrid' | 'on_site_only' | 'flexible';
  workingHours?: boolean[];
  slaName?: string;
  serviceProvided?: string;
  client?: string;
  responseTime?: string;
  resolutionTime?: string;
  availabilityTarget?: string;
  currentPerformance?: any;
  processName?: string;
  processNameAr?: string;
  processOwner?: string;
  documentedProcess?: boolean;
  processDocumentUrl?: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  certifications?: string;
  businessContinuity?: 'essential' | 'important' | 'standard' | 'low';
  systemName?: string;
  systemType?: 'erp' | 'crm' | 'hrms' | 'finance' | 'operations' | 'communication' | 'collaboration' | 'specialized';
  vendor?: string;
  userLicenses?: number;
  systemOwner?: string;
  criticalSystem?: boolean;
  itInfrastructure?: boolean;
  digitalTransformation?: 'low' | 'medium' | 'high' | 'fully_digital';
  laborLawCompliant?: boolean;
  saudizationCompliant?: boolean;
  healthSafetyCompliant?: boolean;
  lastAuditDate?: string;
  nextAuditDate?: string;
  auditFindings?: string;
  complianceScore?: number;
  certifications?: string;
  regulatoryRequirements?: string;
  nitaqatCompliant?: boolean;
  gosiRegistered?: boolean;
  laborOfficeRegistered?: boolean;
  chamberOfCommerceRegistered?: boolean;
  moiPermits?: boolean;
  governanceModel?: 'hierarchical' | 'matrix' | 'flat' | 'network';
  decisionMakingProcess?: string;
  level?: number;
  role?: string;
  approvalLimit?: number;
  committeeName?: string;
  committeeType?: string;
  purpose?: string;
  meetingFrequency?: string;
  chairperson?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  role?: 'chair' | 'member' | 'secretary';
  policyName?: string;
  policyNameAr?: string;
  policyType?: 'hr' | 'finance' | 'operations' | 'it' | 'safety' | 'compliance' | 'ethics';
  policyReference?: string;
  policyUrl?: string;
  mandatoryCompliance?: boolean;
  lastReviewDate?: string;
  nextReviewDate?: string;
  regulation?: string;
  regulatoryBody?: string;
  requiresReporting?: boolean;
  reportingFrequency?: string;
  lastAudit?: string;
  nextAudit?: string;
  compliant?: boolean;
  complianceOfficer?: string;
  riskManagement?: any;
  overallPerformance?: 'exceeds' | 'meets' | 'below' | 'unsatisfactory';
  benchmarking?: any;
  employeeSatisfaction?: boolean;
  changeId?: string;
  changeName?: string;
  changeType?: string;
  startDate?: string;
  expectedEndDate?: string;
  changeLeader?: string;
  status?: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;
  impactLevel?: 'low' | 'medium' | 'high';
  stakeholders?: string;
  communicationPlan?: boolean;
  resistanceLevel?: 'low' | 'medium' | 'high';
  relatedUnitId?: string; // Ref: OrganizationalUnit
  relatedUnitName?: string;
  relationshipType?: 'parent' | 'child' | 'sibling' | 'partner' | 'customer' | 'supplier';
  relationshipDescription?: string;
  interactionFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'as_needed';
  slaInPlace?: boolean;
  entityName?: string;
  entityType?: 'vendor' | 'client' | 'partner' | 'regulatory_body' | 'professional_association' | 'competitor' | 'other';
  relationshipDescription?: string;
  keyContactPerson?: string;
  contractInPlace?: boolean;
  contractExpiry?: string;
  dependsOnUnit?: string;
  dependencyType?: 'critical' | 'important' | 'moderate' | 'low';
  dependencyDescription?: string;
  slaInPlace?: boolean;
  backupPlan?: string;
  trainingName?: string;
  trainingNameAr?: string;
  trainingType?: 'mandatory' | 'recommended' | 'optional';
  applicableToRoles?: string;
  frequency?: 'one_time' | 'annual' | 'biennial' | 'as_needed';
  provider?: string;
  completionRate?: number;
  nextScheduledDate?: string;
  initiativeName?: string;
  initiativeType?: 'technical_skills' | 'leadership' | 'soft_skills' | 'certification' | 'degree_program';
  targetAudience?: string;
  budget?: number;
  participantsEnrolled?: number;
  completionRate?: number;
  roi?: string;
  trainingBudget?: any;
  status?: 'active' | 'inactive' | 'planned' | 'suspended' | 'dissolved' | 'merged' | 'restructuring';
  statusEffectiveDate?: string;
  establishedDate?: string;
  effectiveDate?: string;
  endDate?: string;
  endReason?: 'merger' | 'dissolution' | 'reorganization' | 'closure';
  successorUnitId?: string; // Ref: OrganizationalUnit
  successorUnitName?: string;
  changeType?: 'name_change' | 'structure_change' | 'relocation' | 'merger' | 'split' | 'dissolution';
  plannedEffectiveDate?: string;
  description?: string;
  approvalStatus?: 'proposed' | 'approved' | 'rejected';
  notes?: any;
  internalNotes?: string;
  headcountGrowth?: 'growing' | 'stable' | 'shrinking';
  efficiency?: any;
  vsCompanyAverage?: 'lower' | 'average' | 'higher';
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PageActivity {
  _id: string;
  pageId: string; // Ref: CaseNotionPage
  userId: string; // Ref: User
  userName?: string;
  action: string;
  blockId?: string; // Ref: CaseNotionBlock
  createdAt: string;
  updatedAt: string;
}

export interface PageHistory {
  _id: string;
  pageId: string; // Ref: CaseNotionPage
  userId: string; // Ref: User
  actionType: 'create_element' | 'delete_element' | 'update_element' | 'move_element' | 'resize_element' | 'rotate_element' | 'style_element' | 'create_connection' | 'delete_connection' | 'update_connection' | 'batch_update' | 'group' | 'ungroup';
  type?: string;
  type?: string;
  previousState: any;
  newState: any;
  timestamp?: string;
  isUndone?: boolean;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageTemplate {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category: string;
  icon?: 'emoji' | 'file' | 'external';
  isGlobal?: boolean;
  isActive?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordHistory {
  _id: string;
  userId: string; // Ref: User
  passwordHash: string;
  createdAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  paymentNumber: string;
  paymentType?: string;
  paymentDate: string;
  referenceNumber?: string;
  status?: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  amountInBaseCurrency?: number;
  customerId?: string; // Ref: Client
  clientId?: string; // Ref: Client
  vendorId?: string; // Ref: Vendor
  paymentMethod: string;
  bankAccountId?: string; // Ref: Account
  checkDetails?: string;
  checkNumber?: string;
  checkDate?: string;
  bankName?: string;
  cardDetails?: string;
  gatewayProvider?: 'stripe' | 'paypal' | 'hyperpay' | 'moyasar' | 'tap' | 'other';
  transactionId?: string;
  idempotencyKey?: string;
  invoiceId?: string; // Ref: Invoice
  amount?: number;
  appliedAt?: string;
  invoiceId?: string; // Ref: Invoice
  amount?: number;
  allocatedAt?: string;
  invoiceId?: string; // Ref: Invoice
  caseId?: string; // Ref: Case
  totalApplied?: number;
  unappliedAmount?: number;
  fees?: 'office' | 'client';
  netAmount?: number;
  overpaymentAction?: 'credit' | 'refund' | 'hold';
  underpaymentAction?: 'write_off' | 'leave_open' | 'credit';
  writeOffReason?: string;
  creditNoteId?: string; // Ref: CreditNote
  isRefund?: boolean;
  refundDetails?: 'original' | 'cash' | 'bank_transfer'; // Ref: Payment
  originalPaymentId?: string; // Ref: Payment
  refundReason?: string;
  refundDate?: string;
  reconciliation?: boolean; // Ref: User
  departmentId?: string; // Ref: Department
  locationId?: string; // Ref: Location
  receivedBy?: string; // Ref: User
  customerNotes?: string;
  internalNotes?: string;
  memo?: string;
  notes?: string;
  filename?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
  receiptUrl?: string;
  receiptSent?: boolean;
  receiptSentAt?: string;
  receiptSentTo?: string;
  emailTemplate?: string;
  failureReason?: string;
  failureDate?: string;
  retryCount?: number;
  receivableAccountId?: string; // Ref: Account
  glEntryId?: string; // Ref: GeneralLedger
  processedBy?: string; // Ref: User
  totalPayments?: any;
  totalAmount?: any;
  totalApplied?: any;
  totalUnapplied?: any;
  totalFees?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  group?: any;
  sort?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  _id: string;
  type: 'card' | 'bank_account' | 'wallet';
  card?: any;
  bankAccount?: any;
  billingAddress?: any;
  isDefault?: boolean;
  stripePaymentMethodId?: string;
  status?: 'active' | 'expired' | 'failed';
  addedBy?: string; // Ref: User
  set?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  _id: string;
  receiptNumber: string;
  paymentId: string; // Ref: Payment
  invoiceId?: string; // Ref: Invoice
  clientId: string; // Ref: Client
  caseId?: string; // Ref: Case
  amount: number;
  currency?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'check' | 'online' | 'mobile_payment' | 'other';
  paymentDate: string;
  receivedFrom: string;
  receivedFromAr?: string;
  description?: string;
  descriptionAr?: string;
  bankAccount?: string;
  bankName?: string;
  referenceNumber?: string;
  checkNumber?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  emailSentAt?: string;
  emailSentTo?: string;
  status?: 'active' | 'void';
  voidedAt?: string;
  voidedBy?: string; // Ref: User
  voidReason?: string;
  notes?: string;
  internalNotes?: string;
  generatedBy: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  receiptNumber?: any;
  totalReceipts?: any;
  totalAmount?: any;
  byPaymentMethod?: any;
  byPaymentMethod?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTerms {
  _id: string;
  days: number;
  discountPercentage: number;
  percentage: number;
  daysAfterInvoice: number;
  name: string;
  nameAr?: string;
  code?: string;
  description?: string;
  descriptionAr?: string;
  termType: 'due_on_receipt' | '// Due immediately
            net_days' | '// Due in X days
            end_of_month' | '// Due at end of month
            custom_date' | '// Due on specific day of month
            installments      // Split payment';
  netDays?: number;
  endOfMonth?: number;
  customDate?: number;
  validate?: any;
  lateFee?: 'percentage' | 'fixed';
  displayText?: string;
  displayTextAr?: string;
  invoiceFooterText?: string;
  invoiceFooterTextAr?: string;
  isActive?: boolean;
  isDefault?: boolean;
  isSystem?: boolean;
  usageCount?: number;
  lastUsedAt?: string;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  _id: string;
  payoutNumber: string;
  payoutType?: string;
  status?: string;
  grossAmount: number;
  platformCommission?: number;
  commissionRate?: number;
  netAmount: number;
  currency?: string;
  stripeConnectAccountId?: string;
  stripePayoutId?: string;
  stripeTransferId?: string;
  stripeBalanceTransactionId?: string;
  requestedAt?: string;
  processedAt?: string;
  paidAt?: string;
  expectedArrivalDate?: string;
  type?: string;
  type?: string;
  type?: string;
  periodStart?: string;
  periodEnd?: string;
  failureReason?: string;
  failureCode?: string;
  failureDate?: string;
  retryCount?: number;
  lastRetryAt?: string;
  cancelledAt?: string;
  cancelledBy?: string; // Ref: User
  cancellationReason?: string;
  description?: string;
  internalNotes?: string;
  metadata?: any;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  totalPayouts?: any;
  totalGrossAmount?: any;
  totalCommission?: any;
  totalNetAmount?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  _id: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  exclusionReason?: string;
  excludedBy?: string; // Ref: User
  excludedOn?: string;
  basicSalary?: number;
  allowances?: number;
  overtime?: number;
  bonus?: number;
  commission?: number;
  otherEarnings?: number;
  grossPay?: number;
  gosi?: number;
  loans?: number;
  advances?: number;
  absences?: number;
  lateDeductions?: number;
  violations?: number;
  otherDeductions?: number;
  totalDeductions?: number;
  errorCode?: string;
  errorMessage?: string;
  errorField?: string;
  warningCode?: string;
  warningMessage?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  department?: string;
  location?: string;
  jobTitle?: string;
  slipId?: string; // Ref: SalarySlip
  slipNumber?: string;
  netPay?: number;
  status?: 'pending' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'failed' | 'on_hold';
  isNewJoiner?: boolean;
  joiningDate?: string;
  isSeparation?: boolean;
  separationDate?: string;
  isProrated?: boolean;
  proratedDays?: number;
  proratedFactor?: number;
  onProbation?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
  onHold?: boolean;
  onHoldReason?: string;
  onHoldBy?: string; // Ref: User
  onHoldDate?: string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check';
  bankName?: string;
  iban?: string;
  paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed';
  paymentReference?: string;
  paidOn?: string;
  failureReason?: string;
  wpsIncluded?: boolean;
  wpsStatus?: 'pending' | 'submitted' | 'accepted' | 'rejected';
  wpsRejectionReason?: string;
  calculatedOn?: string;
  calculationDuration?: number;
  approvedBy?: string; // Ref: User
  approvedOn?: string;
  departmentId?: string;
  departmentName?: string;
  employeeCount?: number;
  totalBasicSalary?: number;
  totalAllowances?: number;
  totalGrossPay?: number;
  totalDeductions?: number;
  totalNetPay?: number;
  averageSalary?: number;
  averageNetPay?: number;
  percentOfTotalPayroll?: number;
  stepNumber?: number;
  stepName?: string;
  stepNameAr?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  comments?: string;
  notificationSent?: boolean;
  notificationDate?: string;
  remindersSent?: number;
  lastReminderDate?: string;
  errorId?: string;
  errorCode?: string;
  errorType?: 'critical' | 'error' | 'warning' | 'info';
  errorMessage?: string;
  errorMessageAr?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  field?: string;
  suggestion?: string;
  resolution?: string;
  resolved?: boolean;
  resolvedDate?: string;
  resolvedBy?: string; // Ref: User
  logId?: string;
  timestamp?: string;
  action?: string;
  actionType?: 'creation' | 'calculation' | 'validation' | 'approval' | 'payment' | 'notification' | 'error' | 'other';
  performedBy?: string; // Ref: User
  performedByName?: string;
  details?: string;
  status?: 'success' | 'failure' | 'warning' | 'info';
  errorMessage?: string;
  duration?: number;
  affectedEmployees?: number;
  affectedAmount?: number;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  nationalId?: string;
  rejectionReason?: string;
  rejectionCode?: string;
  resolved?: boolean;
  resolutionDate?: string;
  resolutionNotes?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  amount?: number;
  iban?: string;
  failureReason?: string;
  failureCode?: string;
  retried?: boolean;
  retryCount?: number;
  lastRetryDate?: string;
  resolved?: boolean;
  resolutionMethod?: string;
  runId?: string;
  runNumber?: string;
  runName?: string;
  runNameAr?: string;
  payPeriod?: 'hijri' | 'gregorian';
  employees?: number;
  financialSummary?: number;
  status?: 'draft' | 'calculating' | 'calculated' | 'approved' | 'processing_payment' | 'paid' | 'cancelled';
  configuration?: 'hijri' | 'gregorian'[];
  totalBasicSalary?: number;
  allowancesBreakdown?: number;
  variablePayBreakdown?: number;
  adjustments?: number;
  grossPay?: number;
  totalEmployeeGOSI?: number;
  totalEmployerGOSI?: number;
  totalGOSI?: number;
  gosiBreakdown?: number;
  totalStatutory?: number;
  loans?: number;
  advances?: number;
  attendance?: number;
  violations?: number;
  other?: number;
  totalDeductions?: number;
  netPay?: number;
  costToCompany?: number;
  breakdowns?: any;
  required?: boolean;
  sifFile?: boolean; // Ref: User
  submission?: 'mol_portal' | 'bank_portal' | 'api'; // Ref: User
  molDetails?: any;
  bankTransfer?: number; // Ref: User
  cash?: number; // Ref: User
  check?: number; // Ref: User
  paymentStatus?: 'not_started' | 'processing' | 'completed' | 'partially_completed';
  paidEmployees?: number;
  pendingPayments?: number;
  failedPayments?: number;
  totalPaid?: number;
  totalPending?: number;
  totalFailed?: number;
  paymentCompletionPercentage?: number;
  approvalWorkflow?: 'pending' | 'approved' | 'rejected'; // Ref: User
  validation?: boolean; // Ref: User
  previousRunId?: string; // Ref: PayrollRun
  previousRunName?: string;
  previousRunDate?: string;
  employeeCountChange?: number;
  employeeCountChangePercentage?: number;
  newEmployees?: number;
  separatedEmployees?: number;
  grossPayChange?: number;
  grossPayChangePercentage?: number;
  netPayChange?: number;
  netPayChangePercentage?: number;
  deductionsChange?: number;
  deductionsChangePercentage?: number;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  changeType?: string;
  changeAmount?: number;
  changePercentage?: number;
  reason?: string;
  previousAmount?: number;
  currentAmount?: number;
  internalNotes?: string;
  approverNotes?: string;
  employeeMessage?: string;
  employeeMessageAr?: string;
  noticeType?: 'deduction' | 'bonus' | 'policy_change' | 'holiday' | 'other';
  noticeText?: string;
  noticeTextAr?: string;
  statistics?: any;
  lastModifiedBy?: string; // Ref: User
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PdfmeTemplate {
  _id: string;
  name: string;
  type: 'text' | 'image' | 'table' | 'multiVariableText' | 'line' | 'rectangle' | 'ellipse' | 'svg' | 'qrcode' | 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'upce' | 'itf14' | 'nw7' | 'japanpost' | 'gs1datamatrix' | 'pdf417' | 'barcode';
  position: number;
  width: number;
  height: number;
  fontSize?: number;
  fontName?: string;
  fontColor?: string;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  characterSpacing?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  barcodeFormat?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  tableStyles?: any;
  rotate?: number;
  readOnly?: boolean;
  defaultValue?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: 'invoice' | 'contract' | 'receipt' | 'report' | 'statement' | 'letter' | 'certificate' | 'custom';
  type?: 'standard' | 'detailed' | 'summary' | 'minimal' | 'custom';
  isDefault?: boolean;
  isActive?: boolean;
  isSystem?: boolean;
  basePdf?: string;
  pageSize?: number;
  pageOrientation?: 'portrait' | 'landscape';
  name: string;
  data?: string;
  fallback?: boolean;
  subset?: boolean;
  defaultFont?: string;
  styling?: string;
  language?: 'en' | 'ar' | 'both';
  isRTL?: boolean;
  sampleInputs?: any;
  version?: number;
  thumbnail?: string;
  usageCount?: number;
  lastUsedAt?: string;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PeerReview {
  _id: string;
  fromLawyer: string; // Ref: User
  toLawyer: string; // Ref: User
  competence: number;
  integrity: number;
  communication: number;
  ethics: number;
  comment?: string;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceReview {
  _id: string;
  periodType?: 'annual' | 'mid_year' | 'quarterly' | 'probation' | 'project' | 'ad_hoc';
  periodName?: string;
  periodNameAr?: string;
  startDate?: string;
  endDate?: string;
  reviewDueDate?: string;
  selfAssessmentDueDate?: string;
  required?: boolean;
  submitted?: boolean;
  submittedOn?: string;
  dueDate?: string;
  selfRating?: number;
  selfRatingScale?: '1-5' | '1-100';
  accomplishments?: string;
  accomplishmentsAr?: string;
  achievement?: string;
  achievementAr?: string;
  impact?: string;
  date?: string;
  challenges?: string;
  challengesAr?: string;
  strengths?: string;
  strengthsAr?: string;
  developmentNeeds?: string;
  developmentNeedsAr?: string;
  careerAspirations?: string;
  careerAspirationsAr?: string;
  trainingType?: string;
  reason?: string;
  priority?: 'low' | 'medium' | 'high';
  additionalComments?: string;
  additionalCommentsAr?: string;
  competencyId?: string;
  competencyName?: string;
  competencyNameAr?: string;
  competencyCategory?: 'core' | 'leadership' | 'technical' | 'behavioral' | 'functional' | 'legal' | 'client_service';
  competencyDescription?: string;
  competencyDescriptionAr?: string;
  ratingScale?: '1-5' | '1-100';
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  ratingLabel?: string;
  ratingLabelAr?: string;
  behavior?: string;
  frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
  managerComments?: string;
  managerCommentsAr?: string;
  selfComments?: string;
  developmentNotes?: string;
  weight?: number;
  weightedScore?: number;
  examples?: string;
  goalId?: string;
  goalName?: string;
  goalNameAr?: string;
  goalType?: 'individual' | 'team' | 'company' | 'project' | 'developmental';
  goalCategory?: 'financial' | 'operational' | 'client' | 'learning' | 'quality';
  goalDescription?: string;
  goalDescriptionAr?: string;
  targetMetric?: string;
  targetValue?: number;
  targetUnit?: string;
  actualValue?: number;
  achievementPercentage?: number;
  ratingScale?: '1-5' | '1-100';
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'not_achieved';
  startDate?: string;
  targetDate?: string;
  completionDate?: string;
  employeeComments?: string;
  managerComments?: string;
  challenges?: string;
  supportNeeded?: string;
  evidenceProvided?: boolean;
  evidenceUrls?: string;
  weight?: number;
  weightedScore?: number;
  kpiId?: string;
  kpiName?: string;
  kpiNameAr?: string;
  kpiCategory?: 'financial' | 'operational' | 'customer' | 'quality' | 'efficiency';
  metric?: string;
  unit?: string;
  target?: number;
  threshold?: number;
  stretch?: number;
  actual?: number;
  achievementPercentage?: number;
  performanceLevel?: 'below_threshold' | 'meets_threshold' | 'meets_target' | 'exceeds_target' | 'stretch';
  score?: number;
  weight?: number;
  weightedScore?: number;
  trend?: 'improving' | 'stable' | 'declining';
  previousPeriodValue?: number;
  rating?: number;
  comments?: string;
  caseMetrics?: number[];
  clientMetrics?: number;
  billingMetrics?: number[];
  legalWorkQuality?: number;
  businessDevelopment?: number;
  knowledgeContribution?: number;
  overallAttorneyScore?: number;
  strengthId?: string;
  strengthArea?: string;
  strengthAreaAr?: string;
  category?: 'technical' | 'behavioral' | 'leadership' | 'communication' | 'other';
  description?: string;
  descriptionAr?: string;
  example?: string;
  date?: string;
  impact?: string;
  leverageOpportunities?: string;
  improvementId?: string;
  improvementArea?: string;
  improvementAreaAr?: string;
  category?: 'technical' | 'behavioral' | 'leadership' | 'communication' | 'other';
  currentLevel?: string;
  desiredLevel?: string;
  description?: string;
  descriptionAr?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  impact?: string;
  example?: string;
  date?: string;
  action?: string;
  timeline?: string;
  resources?: string;
  itemId?: string;
  objectiveName?: string;
  objectiveNameAr?: string;
  category?: 'skill_development' | 'knowledge_acquisition' | 'behavior_change' | 'career_progression' | 'certification';
  description?: string;
  descriptionAr?: string;
  priority?: 'low' | 'medium' | 'high';
  startDate?: string;
  targetDate?: string;
  actionId?: string;
  actionType?: 'training' | 'mentoring' | 'coaching' | 'stretch_assignment' | 'job_rotation' | 'self_study' | 'certification' | 'conference';
  actionDescription?: string;
  trainingName?: string;
  trainingProvider?: string;
  trainingDuration?: number;
  trainingCost?: number;
  mentor?: string;
  mentorRole?: string;
  assignmentDetails?: string;
  timeline?: string;
  resources?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  completionDate?: string;
  outcome?: string;
  effectiveness?: number;
  metric?: string;
  target?: string;
  measurementMethod?: string;
  progress?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  lastReviewDate?: string;
  nextReviewDate?: string;
  required?: boolean;
  trainingRecommendations?: string;
  mentorAssigned?: string; // Ref: Employee
  careerPath?: any;
  careerAspirations?: any;
  successionPlanning?: 'ready_now' | 'ready_1year' | 'ready_2years' | 'future_potential';
  providerId?: string; // Ref: Employee
  providerName?: string;
  providerNameAr?: string;
  providerRole?: string;
  relationship?: 'peer' | 'direct_report' | 'cross_functional' | 'client' | 'subordinate';
  requestedAt?: string;
  completedAt?: string;
  status?: 'pending' | 'completed' | 'declined';
  anonymous?: boolean;
  providerId?: string; // Ref: Employee
  competencyId?: string;
  competency?: string;
  rating?: number;
  comments?: string;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  specificFeedback?: string;
  submittedAt?: string;
  anonymous?: boolean;
  enabled?: boolean;
  competencyId?: string;
  avgRating?: number;
  responseCount?: number;
  summary?: 'positive' | 'mixed' | 'negative';
  aggregated360Scores?: any;
  completedAt?: string;
  overallComments?: string;
  overallCommentsAr?: string;
  achievement?: string;
  achievementAr?: string;
  impact?: string;
  date?: string;
  performanceHighlights?: string;
  performanceHighlightsAr?: string;
  areasExceeded?: string;
  areasMet?: string;
  areasBelow?: string;
  improvementProgress?: string;
  behavioralObservations?: string;
  workQualityAssessment?: string;
  collaborationAssessment?: string;
  initiativeAssessment?: string;
  adaptabilityAssessment?: string;
  leadershipAssessment?: string;
  technicalSkillsAssessment?: string;
  communicationAssessment?: string;
  attendanceAssessment?: string;
  professionalismAssessment?: string;
  overallRating?: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  ratingJustification?: string;
  potentialAssessment?: 'high_potential' | 'promotable' | 'valued_contributor' | 'development_needed';
  performanceRecommendation?: 'exceeds' | 'meets' | 'needs_improvement' | 'unsatisfactory';
  promotionRecommended?: boolean;
  promotionTimeline?: string;
  promotionToRole?: string;
  promotionReadiness?: string;
  promotionJustification?: string;
  salaryIncreaseRecommended?: boolean;
  salaryIncreasePercentage?: number;
  salaryIncreaseAmount?: number;
  salaryIncreaseJustification?: string;
  salaryIncreaseEffectiveDate?: string;
  bonusRecommended?: boolean;
  bonusAmount?: number;
  bonusPercentage?: number;
  bonusJustification?: string;
  recommendation?: string;
  priority?: 'low' | 'medium' | 'high';
  timeline?: string;
  roleChangeRecommended?: boolean;
  suggestedRole?: string;
  roleChangeReason?: string;
  probationRecommendation?: 'confirm' | 'extend' | 'terminate';
  pipRequired?: boolean;
  pipReason?: string;
  pipDuration?: number;
  pipObjectives?: string;
  responseProvided?: boolean;
  responseDate?: string;
  agreesWithReview?: boolean;
  agreement?: 'agree' | 'partially_agree' | 'disagree';
  employeeComments?: string;
  employeeCommentsAr?: string;
  disagreementAreas?: string;
  disagreementExplanation?: string;
  additionalAchievements?: string;
  supportRequested?: string;
  careerGoalsAlignment?: string;
  acknowledged?: boolean;
  acknowledgedDate?: string;
  signature?: string;
  disputed?: boolean;
  disputeDate?: string;
  disputeReason?: string;
  disputeDetails?: string;
  area?: string;
  currentRating?: number;
  disputedRating?: number;
  justification?: string;
  evidence?: string;
  disputeStatus?: 'submitted' | 'under_review' | 'resolved' | 'escalated';
  reviewedBy?: string; // Ref: User
  reviewDate?: string;
  resolution?: string;
  resolutionDate?: string;
  finalDecision?: 'original_upheld' | 'rating_adjusted' | 'review_redone';
  adjustedRating?: number;
  adjustmentReason?: string;
  stepNumber?: number;
  stepName?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'sent_back' | 'skipped';
  actionDate?: string;
  comments?: string;
  field?: string;
  requestedChange?: string;
  calibrated?: boolean;
  calibrationDate?: string;
  calibrationSessionId?: string; // Ref: CalibrationSession
  calibrationSession?: string;
  calibrationParticipants?: string;
  preCalibrationRating?: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  postCalibrationRating?: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  calibratedBy?: string; // Ref: User
  ratingAdjusted?: boolean;
  adjustmentReason?: string;
  comparativeRanking?: number;
  distributionBucket?: string;
  distributionCheck?: any;
  calibrationNotes?: string;
  isProbationReview?: boolean;
  probationDay?: number;
  probationEndDate?: string;
  recommendation?: 'confirm' | 'extend' | 'terminate' | 'pending';
  extensionDays?: number;
  extensionReason?: string;
  terminationReason?: string;
  documentType?: 'review_form' | 'self_assessment' | 'pip_document' | 'development_plan' | 'evidence' | 'supporting_document' | 'other';
  documentName?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  reviewId?: string;
  reviewNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  employeeNameAr?: string;
  employeeNumber?: string;
  department?: string;
  departmentAr?: string;
  departmentId?: string; // Ref: Department
  position?: string;
  positionAr?: string;
  reviewerId?: string; // Ref: Employee
  reviewerName?: string;
  reviewerNameAr?: string;
  reviewerTitle?: string;
  managerId?: string; // Ref: Employee
  managerName?: string;
  managerNameAr?: string;
  reviewType?: 'annual' | 'mid_year' | 'quarterly' | 'monthly' | 'probation' | 'project_completion' | '360_degree' | 'peer_review' | 'ad_hoc';
  reviewCycle?: string;
  reviewLanguage?: 'arabic' | 'english' | 'both';
  projectReview?: boolean; // Ref: Project
  templateId?: string; // Ref: ReviewTemplate
  status?: 'draft' | 'self_assessment' | 'self_assessment_pending' | 'manager_review' | 'manager_review_pending' | 'calibration' | 'completed' | 'acknowledged' | 'disputed';
  statusAr?: string;
  dueDate?: string;
  completedOn?: string;
  acknowledgedOn?: string;
  competencyFramework?: string;
  isAttorney?: boolean;
  overallRating?: number;
  overallScore?: number;
  ratingScale?: '1-5' | '1-100';
  finalRating?: 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory';
  finalRatingAr?: string;
  ratingLabel?: string;
  ratingLabelAr?: string;
  scores?: any;
  currentApprovalStep?: number;
  finalApprovalStatus?: 'pending' | 'approved' | 'rejected';
  finalApprover?: string; // Ref: User
  finalApprovalDate?: string;
  nextReviewDate?: string;
  nextReviewType?: string;
  meetingPurpose?: string;
  scheduledDate?: string;
  completedDate?: string;
  outcome?: string;
  actionId?: string;
  action?: string;
  owner?: string;
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completionDate?: string;
  goalName?: string;
  targetMetric?: string;
  targetValue?: number;
  dueDate?: string;
  analytics?: 'above' | 'at' | 'below';
  notes?: any;
  relatedRecords?: string[]; // Ref: PerformanceReview
  lastModifiedBy?: string; // Ref: User
  lastModifiedAt?: string;
  deletedBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  createdAt?: any;
  status?: any;
  finalRating?: any;
  group?: any;
  status?: any;
  dueDate?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  _id: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex' | 'exists';
  valueType?: 'static' | 'context' | 'subject' | 'resource';
  policyId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  policyType?: 'p' | 'g' | 'g2' | 'g3';
  subject?: 'user' | 'role' | 'group' | 'any';
  resource: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'assign' | 'manage' | '*';
  effect?: 'allow' | 'deny';
  priority?: number;
  timeConstraints?: number[];
  isActive?: boolean;
  isSystem?: boolean;
  decisionStrategy?: 'unanimous' | '// All policies must allow
            affirmative' | '// At least one policy must allow (default)
            consensus       // Majority must allow';
  denyOverride?: boolean;
  role: string;
  inheritsFrom?: string;
  level?: number;
  resourceType: string;
  resourceId?: string;
  role: string;
  subject?: 'user' | 'role';
  name: string;
  displayName?: string;
  displayNameAr?: string;
  name: string;
  directlyRelated?: string;
  computedUserset?: string;
  defaultEffect?: 'allow' | 'deny';
  auditSettings?: boolean;
  cacheSettings?: boolean;
  version?: number;
  lastModifiedBy?: string; // Ref: User
  subject?: any;
  resource?: any;
  subject?: any;
  resource?: any;
  subject?: any;
  resource?: any;
  subject?: any;
  resource?: any;
  subject?: any;
  resource?: any;
  subject?: any;
  resource?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PhoneOtp {
  _id: string;
  phone: string;
  otpHash: string;
  purpose: 'registration' | 'login' | 'verify_phone' | 'password_reset' | 'transaction';
  expiresAt: string;
  verified?: boolean;
  attempts?: number;
  ipAddress?: string;
  userAgent?: string;
  requestCount?: number;
  lastRequestAt?: string;
  ipAddress?: string;
  attemptedAt?: string;
  set?: any;
  expiresAt?: any;
  createdAt?: any;
  match?: any;
  unwind?: any;
  match?: any;
  match?: any;
  unwind?: any;
  match?: any;
  expiresAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  _id: string;
  stageId?: string;
  name: string;
  nameAr?: string;
  color?: string;
  order: number;
  probability?: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
  trigger?: 'enter' | 'exit' | 'time_in_stage';
  action?: 'send_email' | 'create_task' | 'notify_user' | 'update_field';
  delayHours?: number;
  field?: string;
  label?: string;
  labelAr?: string;
  type?: 'checkbox' | 'document' | 'approval' | 'field_filled';
  required?: boolean;
  avgDaysInStage?: number;
  maxDaysWarning?: number;
  pipelineId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  color?: string;
  type?: 'lead' | 'case' | 'deal' | 'custom';
  category?: 'general' | 'civil' | 'criminal' | 'family' | 'commercial' | 'labor' | 'real_estate' | 'administrative' | 'other';
  settings?: boolean;
  stats?: number;
  isDefault?: boolean;
  isActive?: boolean;
  isArchived?: boolean;
  lastModifiedBy?: string; // Ref: User
  match?: any;
  totalLeads?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalValue?: any;
  sum?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Playbook {
  _id: string;
  order: number;
  title: string;
  description?: string;
  actionType: 'manual' | 'automated' | 'notification' | 'escalation';
  action?: any;
  requiredRole?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'null';
  timeout?: number;
  onSuccess?: number;
  onFailure?: boolean;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  name: string;
  description?: string;
  category: 'infrastructure' | 'security' | 'performance' | 'data' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  validate?: any;
  type?: string;
  isActive?: boolean;
  version?: number;
  group?: any;
  group?: any;
  match?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Plugin {
  _id: string;
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  category?: 'integration' | 'automation' | 'reporting' | 'ui' | 'workflow' | 'utility';
  entryPoint: string;
  permissions?: string[];
  default?: any;
  apiKey: any;
  webhookUrl?: any;
  event: string;
  handler: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: string;
  auth?: boolean;
  permissions?: string[];
  isSystem?: boolean;
  isActive?: boolean;
  dependencies?: string[];
  icon?: string;
  screenshots?: string[];
  documentation?: string;
  supportUrl?: string;
  repositoryUrl?: string;
  installCount?: number;
  rating?: number;
  ratingCount?: number;
  text?: any;
  score?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PluginInstallation {
  _id: string;
  pluginId: string; // Ref: Plugin
  isEnabled?: boolean;
  settings?: any;
  installedAt: string;
  installedBy: string; // Ref: User
  lastUpdatedAt?: string;
  lastUpdatedBy?: string; // Ref: User
  installedVersion?: string;
  currentVersion?: string;
  lastError?: string;
  errorCount?: number;
  statistics?: string;
  permissionsOverride?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyDecision {
  _id: string;
  decisionId: string;
  subject?: string; // Ref: User
  resource: string;
  action: string;
  context?: string;
  decision: 'allow' | 'deny' | 'not_applicable';
  policyId?: string;
  policyName?: string;
  effect?: 'allow' | 'deny';
  matched?: boolean;
  priority?: number;
  field?: string;
  operator?: string;
  result?: boolean;
  namespace?: string;
  object?: string;
  relation?: string;
  subject?: string;
  found?: boolean;
  path?: string;
  decisionStrategy?: 'unanimous' | 'affirmative' | 'consensus';
  metrics?: any;
  error?: boolean;
  tags?: string;
  configVersion?: number;
  match?: any;
  total?: any;
  allowed?: any;
  denied?: any;
  errors?: any;
  avgEvaluationTimeMs?: any;
  cacheHits?: any;
  total?: any;
  allowed?: any;
  denied?: any;
  sort?: any;
  total?: any;
  allowed?: any;
  denied?: any;
  sort?: any;
  match?: any;
  group?: any;
  sort?: any;
  date?: any;
  hour?: any;
  total?: any;
  denied?: any;
  sort?: any;
  period?: any;
  createdAt?: any;
  period?: any;
  summary?: any;
  createdAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyViolation {
  _id: string;
  sentTo: string; // Ref: User
  sentAt: string;
  notificationType: 'email' | 'sms' | 'in_app' | 'slack' | 'webhook';
  status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  subject?: string;
  message?: string;
  errorMessage?: string;
  metadata?: any;
  entityType: string;
  entityId: string;
  policyId: string; // Ref: ExpensePolicy
  violationType: string;
  severity: string;
  details?: string;
  status: string;
  assignedTo?: string; // Ref: User
  overrideBy?: string; // Ref: User
  overrideReason?: string;
  overrideApprovedBy?: string; // Ref: User
  overriddenAt?: string;
  resolvedAt?: string;
  resolvedBy?: string; // Ref: User
  resolutionNotes?: string;
  escalatedTo?: string; // Ref: User
  escalatedAt?: string;
  escalationReason?: string;
  escalationLevel?: number;
  acknowledgedBy?: string; // Ref: User
  acknowledgedAt?: string;
  acknowledgementNotes?: string;
  totalViolations?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  count?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  project?: any;
  sort?: any;
  count?: any;
  sum?: any;
  project?: any;
  sort?: any;
  status?: any;
  status?: any;
  resolvedAt?: any;
  project?: any;
  group?: any;
  status?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PreparedReport {
  _id: string;
  reportType: '// Financial Reports
            trial_balance' | 'balance_sheet' | 'profit_loss' | 'cash_flow' | 'general_ledger' | 'aging_receivables' | 'aging_payables' | '// Billing Reports
            revenue_by_client' | 'revenue_by_lawyer' | 'revenue_by_practice_area' | 'unbilled_time' | 'wip_analysis' | 'collection_report' | 'realization_report' | '// HR Reports
            payroll_summary' | 'employee_costs' | 'leave_balance' | 'attendance_summary' | '// Custom Reports
            custom';
  name: string;
  nameAr?: string;
  parameters?: any;
  parameterHash: string;
  data: any;
  summary?: any;
  status?: 'generating' | 'ready' | 'failed' | 'expired';
  error?: any;
  generationStartedAt?: string;
  generationCompletedAt?: string;
  generationDurationMs?: number;
  expiresAt: string;
  ttlMinutes?: number;
  autoRefresh?: boolean;
  version?: number;
  dataSizeBytes?: number;
  accessCount?: number;
  lastAccessedAt?: string;
  refreshedBy?: string; // Ref: User
  expiresAt?: any;
  data?: any;
  status?: any;
  expiresAt?: any;
  generationStartedAt?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  sort?: any;
  summary?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PriceLevel {
  _id: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  pricingType: 'percentage' | 'fixed_markup' | 'fixed_discount' | 'custom_rates';
  percentageAdjustment?: number;
  fixedAdjustment?: number;
  serviceType?: 'consultation' | 'court_appearance' | 'document_preparation' | 'contract_review' | 'research' | 'negotiation' | 'mediation' | 'arbitration' | 'litigation' | 'corporate' | 'real_estate' | 'family_law' | 'criminal' | 'immigration' | 'labor_law' | 'intellectual_property' | 'tax' | 'other';
  hourlyRate?: number;
  flatFee?: number;
  minimumFee?: number;
  priority?: number;
  minimumRevenue?: number;
  minimumCases?: number;
  effectiveDate?: string;
  expiryDate?: string;
  isActive?: boolean;
  isDefault?: boolean;
  incomeAccountId?: string; // Ref: Account
  match?: any;
  group?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PriceList {
  _id: string;
  priceListId?: string;
  name?: string;
  nameAr?: string;
  currency?: string;
  isBuying?: boolean;
  isSelling?: boolean;
  enabled?: boolean;
  priceNotUOMDependent?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRule {
  _id: string;
  field: 'quantity' | 'amount' | 'customer' | 'customer_group' | 'territory' | 'campaign' | 'source_channel' | 'payment_terms' | 'date' | 'day_of_week' | 'time_of_day' | 'warehouse' | 'sales_person' | 'order_type';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'between' | 'in' | 'not_in' | 'contains' | 'starts_with';
  value: any;
  value2?: any;
  minValue: number;
  maxValue?: number;
  discountType?: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue: number;
  label?: string;
  labelAr?: string;
  productId?: string; // Ref: Product
  productCode?: string;
  productName?: string;
  discountType?: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue: number;
  categoryId?: string; // Ref: ProductCategory
  categoryCode?: string;
  categoryName?: string;
  discountType?: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue: number;
  usedAt?: string;
  orderId?: string; // Ref: SalesOrder
  orderNumber?: string;
  customerId?: string; // Ref: Client
  customerName?: string;
  discountApplied?: number;
  orderAmount?: number;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  ruleType: 'discount' | '// Standard discount
            price_override' | '// Fixed price override
            markup' | '// Markup/surcharge
            promotional' | '// Time-limited promotion
            tiered' | '// Quantity/Amount tiers
            buy_x_get_y' | '// Buy X Get Y free/discount
            bundle' | '// Bundle pricing
            loyalty' | '// Loyalty program discount
            first_order' | '// First order discount
            referral           // Referral discount';
  isActive?: boolean;
  priority?: number;
  applyOn?: 'all_items' | '// All products
            item_code' | '// Specific products
            item_group' | '// Product categories
            brand' | '// Product brands
            price_list' | '// Specific price lists
            transaction         // Entire order';
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  matchAllConditions?: boolean;
  discountType?: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  minMarginPercent?: number;
  protectMargin?: boolean;
  tierBasis?: 'quantity' | 'amount';
  tierApplication?: 'all_units' | 'marginal';
  buyXGetY?: 'free' | 'discount_percent' | 'discount_amount' | 'fixed_price'[]; // Ref: Product
  bundlePrice?: number;
  bundleDiscount?: number;
  productId?: string; // Ref: Product
  productCode?: string;
  quantity?: number;
  minBundleQuantity?: number;
  requiresPromoCode?: boolean;
  promoCode?: string;
  promoCodeCaseSensitive?: boolean;
  validFrom?: string;
  validTo?: string;
  type?: number;
  validTimeStart?: string;
  validTimeEnd?: string;
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string;
  type?: string[];
  type?: string[];
  newCustomerOnly?: boolean;
  newCustomerDays?: number;
  usageLimit?: number;
  usageCount?: number;
  usageLimitPerCustomer?: number;
  usageLimitPerOrder?: number;
  budgetLimit?: number;
  budgetUsed?: number;
  canStackWithOtherRules?: boolean;
  stackingGroup?: string;
  isExclusive?: boolean;
  type?: string[];
  maxRecentUsageRecords?: number;
  displayMessage?: string;
  displayMessageAr?: string;
  internalNotes?: string;
  toJSON?: any;
  toObject?: any;
  validFrom?: any;
  validTo?: any;
  rule?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  productId?: string;
  name: string;
  nameAr?: string;
  code?: string;
  description?: string;
  descriptionAr?: string;
  type: 'service' | 'product' | 'subscription' | 'retainer' | 'hourly';
  category?: string;
  practiceArea?: string;
  pricing: 'fixed' | 'per_hour' | 'per_day' | 'per_month' | 'per_year' | 'custom';
  recurring?: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'null';
  hourly?: number;
  unit?: 'hour' | 'day' | 'session' | 'case' | 'month' | 'year' | 'unit' | 'other';
  isActive?: boolean;
  isTaxable?: boolean;
  stats?: number;
  type?: string;
  type?: string;
  inventory?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'not_applicable';
  costing?: number;
  type?: string;
  type?: string;
  type?: string;
  isBundle?: boolean;
  productId?: string; // Ref: Product
  quantity?: number;
  discount?: number;
  digital?: boolean;
  level?: 'discount' | 'standard' | 'premium' | 'vip';
  price?: number;
  discountPercent?: number;
  vendor?: string; // Ref: Vendor
  integration?: 'synced' | 'pending' | 'failed' | 'never';
  customFields?: string;
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  toJSON?: any;
  text?: any;
  score?: any;
  score?: any;
  group?: any;
  group?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  _id: string;
  jobId: string; // Ref: Job
  coverLetter: string;
  proposedAmount: number;
  deliveryTime: number;
  name?: string;
  url?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoice {
  _id: string;
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName: string;
  qty: number;
  uom?: string;
  rate: number;
  amount?: number;
  taxRate?: number;
  taxAmount?: number;
  netAmount?: number;
  purchaseInvoiceId?: string;
  invoiceNumber?: string;
  supplierInvoiceNo?: string;
  supplierId: string; // Ref: Supplier
  supplierName?: string;
  purchaseOrderId?: string; // Ref: PurchaseOrder
  purchaseReceiptId?: string; // Ref: PurchaseReceipt
  postingDate?: string;
  dueDate?: string;
  totalQty?: number;
  totalAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
  isPaid?: boolean;
  amountPaid?: number;
  outstandingAmount?: number;
  status?: 'draft' | 'submitted' | 'paid' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  remarks?: string;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  _id: string;
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
  amount?: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  netAmount?: number;
  receivedQty?: number;
  billedQty?: number;
  warehouse?: string;
  requiredDate?: string;
  purchaseOrderId?: string;
  poNumber?: string;
  supplierId: string; // Ref: Supplier
  supplierName?: string;
  orderDate?: string;
  requiredDate?: string;
  expectedDeliveryDate?: string;
  totalQty?: number;
  totalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
  taxTemplateId?: string; // Ref: TaxTemplate
  currency?: string;
  exchangeRate?: number;
  status?: 'draft' | 'submitted' | 'approved' | 'received' | 'billed' | 'cancelled' | 'closed';
  docStatus?: '0' | '1' | '2';
  percentReceived?: number;
  percentBilled?: number;
  paymentTerms?: string;
  termsAndConditions?: string;
  materialRequestId?: string; // Ref: MaterialRequest
  rfqId?: string; // Ref: RFQ
  quotationId?: string; // Ref: SupplierQuotation
  remarks?: string;
  company?: string;
  group?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseReceipt {
  _id: string;
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName: string;
  qty: number;
  uom?: string;
  rate: number;
  amount?: number;
  warehouse?: string;
  batchNo?: string;
  serialNo?: string;
  acceptedQty?: number;
  rejectedQty?: number;
  rejectionReason?: string;
  purchaseReceiptId?: string;
  receiptNumber?: string;
  supplierId: string; // Ref: Supplier
  supplierName?: string;
  purchaseOrderId?: string; // Ref: PurchaseOrder
  postingDate?: string;
  type?: string;
  totalQty?: number;
  totalAmount?: number;
  status?: 'draft' | 'submitted' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualityAction {
  _id: string;
  actionId?: string;
  actionType: 'corrective' | 'preventive';
  inspectionId?: string; // Ref: QualityInspection
  itemId?: string; // Ref: Item
  problem: string;
  rootCause?: string;
  action: string;
  responsiblePerson: string; // Ref: User
  responsibleName?: string;
  targetDate: string;
  completionDate?: string;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  verification?: string;
  verifiedBy?: string; // Ref: User
  verifiedDate?: string;
  remarks?: string;
  toJSON?: any;
  toObject?: any;
  totalActions?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  status?: any;
  targetDate?: any;
  status?: any;
  targetDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface QualityInspection {
  _id: string;
  parameterName: string;
  parameterNameAr?: string;
  specification?: string;
  acceptanceCriteria?: string;
  minValue?: number;
  maxValue?: number;
  status: 'accepted' | 'rejected';
  remarks?: string;
  inspectionId?: string;
  inspectionNumber?: string;
  referenceType: 'purchase_receipt' | 'delivery_note' | 'stock_entry' | 'production';
  referenceId: string;
  referenceModel?: 'PurchaseReceipt' | 'DeliveryNote' | 'StockEntry' | 'Production';
  referenceNumber?: string;
  itemId: string; // Ref: Item
  itemCode?: string;
  itemName?: string;
  batchNo?: string;
  inspectionType: 'incoming' | 'outgoing' | 'in_process';
  sampleSize: number;
  inspectedBy: string; // Ref: User
  inspectedByName?: string;
  inspectionDate: string;
  templateId?: string; // Ref: QualityTemplate
  templateName?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'partially_accepted';
  acceptedQty?: number;
  rejectedQty?: number;
  remarks?: string;
  toJSON?: any;
  toObject?: any;
  totalInspections?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalAcceptedQty?: any;
  totalRejectedQty?: any;
  createdAt: string;
  updatedAt: string;
}

export interface QualityParameter {
  _id: string;
  parameterId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  parameterType: 'numeric' | 'text' | 'boolean';
  minValue?: number;
  maxValue?: number;
  uom?: string;
  isActive?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface QualitySettings {
  _id: string;
  autoInspectionOnReceipt?: boolean;
  defaultTemplateId?: string; // Ref: QualityTemplate
  failedInspectionAction?: 'reject' | 'hold' | 'notify';
  enableBatchTracking?: boolean;
  inspectionThresholds?: number;
  notifications?: boolean[]; // Ref: User
  qualityScoring?: boolean;
  documentation?: boolean;
  integration?: boolean;
  lastUpdatedBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface QualityTemplate {
  _id: string;
  parameterName: string;
  parameterNameAr?: string;
  specification?: string;
  acceptanceCriteria?: string;
  minValue?: number;
  maxValue?: number;
  formula?: string;
  mandatory?: boolean;
  templateId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  itemId?: string; // Ref: Item
  itemGroup?: string;
  isActive?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id: string;
  userId: string; // Ref: User
  title: string;
  description: string;
  category?: 'labor' | 'commercial' | 'family' | 'criminal' | 'real-estate' | 'corporate' | 'immigration' | 'tax' | 'intellectual-property' | 'other';
  tags?: string[];
  views?: number;
  type?: string;
  status?: 'open' | 'answered' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  _id: string;
  itemId?: string;
  productId?: string; // Ref: Product
  description: string;
  descriptionAr?: string;
  quantity: number;
  unit?: 'hour' | 'day' | 'session' | 'case' | 'month' | 'year' | 'unit' | 'other';
  unitPrice: number;
  discount?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  total?: number;
  sortOrder?: number;
  isOptional?: boolean;
  notes?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  type?: 'immediate' | 'net_15' | 'net_30' | 'net_60' | 'custom';
  customDays?: number;
  depositRequired?: boolean;
  depositPercent?: number;
  depositAmount?: number;
  notes?: string;
  signedBy?: string; // Ref: User
  signedByName?: string;
  signedByEmail?: string;
  signedAt?: string;
  signature?: string;
  ipAddress?: string;
  viewedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  subtotal?: number;
  discountTotal?: number;
  taxableAmount?: number;
  taxTotal?: number;
  grandTotal?: number;
  quoteId?: string;
  leadId?: string; // Ref: Lead
  clientId?: string; // Ref: Client
  contactId?: string; // Ref: Contact
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised';
  quoteDate?: string;
  validUntil?: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  currency?: string;
  termsAndConditions?: string;
  termsAndConditionsAr?: string;
  signatures?: any;
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  internalNotes?: string;
  clientNotes?: string;
  lostReasonId?: string; // Ref: LostReason
  lostNotes?: string;
  assignedTo?: string; // Ref: User
  revisionNumber?: number;
  previousVersionId?: string; // Ref: Quote
  type?: string;
  pipelineStage?: 'qualification' | 'needs_analysis' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability?: number;
  expectedCloseDate?: string;
  dateOpened?: string;
  dateLastStageUpdate?: string;
  stage?: string;
  date?: string;
  changedBy?: string; // Ref: User
  notes?: string;
  competitorName?: string;
  competitorQuoteAmount?: number;
  competitorStrengths?: string;
  competitorWeaknesses?: string;
  isPrimaryCompetitor?: boolean;
  approval?: 'not_required' | 'pending' | 'approved' | 'rejected'; // Ref: User
  financials?: 'low' | 'medium' | 'high' | 'premium';
  campaignId?: string; // Ref: Campaign
  leadSource?: string;
  conversion?: boolean; // Ref: Order
  integration?: 'synced' | 'pending' | 'failed' | 'never'[];
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  customFields?: string;
  followUp?: 'phone' | 'email' | 'whatsapp' | 'meeting' | 'sms' | 'other'; // Ref: User
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RateCard {
  _id: string;
  rateId: string; // Ref: BillingRate
  customAmount?: number;
  customCurrency?: string;
  notes?: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  entityType: 'client' | 'case' | 'contract';
  entityId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
  effectiveFrom?: any;
  effectiveTo?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RateGroup {
  _id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  color: string;
  isDefault?: boolean;
  isActive?: boolean;
  discount?: number;
  type?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReauthChallenge {
  _id: string;
  userId: string; // Ref: User
  otpHash: string;
  method: 'email' | 'sms' | 'totp';
  purpose: 'password_change' | 'mfa_enable' | 'mfa_disable' | 'account_deletion' | 'payment_method' | 'security_settings' | 'sensitive_operation';
  expiresAt: string;
  verified?: boolean;
  attempts?: number;
  ipAddress?: string;
  userAgent?: string;
  ipAddress?: string;
  attemptedAt?: string;
  deliveryStatus?: 'pending' | 'sent' | 'failed';
  deliveryError?: string;
  set?: any;
  expiresAt?: any;
  createdAt?: any;
  expiresAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringInvoice {
  _id: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  accountId?: string; // Ref: Account
  name: string;
  nameAr?: string;
  clientId: string; // Ref: Client
  caseId?: string; // Ref: Case
  retainerId?: string; // Ref: Retainer
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannually' | 'annually';
  dayOfMonth?: number;
  dayOfWeek?: number;
  type?: number[];
  startDate: string;
  endDate?: string;
  nextGenerationDate: string;
  lastGeneratedDate?: string;
  timesGenerated?: number;
  maxGenerations?: number;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  pausedAt?: string;
  pausedBy?: string; // Ref: User
  pauseReason?: string;
  validate?: any;
  subtotal: number;
  discountTotal?: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  currency?: string;
  paymentTermsDays?: number;
  paymentTermsTemplate?: string; // Ref: PaymentTerms
  invoicePrefix?: string;
  templateId?: string; // Ref: InvoiceTemplate
  autoSend?: boolean;
  autoSendDays?: number;
  type?: string[];
  type?: string[];
  emailSubject?: string;
  emailSubjectAr?: string;
  emailBody?: string;
  emailBodyAr?: string;
  autoApprove?: boolean;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  invoiceId?: string; // Ref: Invoice
  invoiceNumber?: string;
  generatedAt?: string;
  amount?: number;
  action?: string;
  performedBy?: string; // Ref: User
  performedAt?: string;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  nextGenerationDate?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransaction {
  _id: string;
  templateId?: string;
  name: string;
  nameAr?: string;
  transactionType: 'invoice' | 'bill' | 'expense' | 'journal_entry';
  frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  maxOccurrences?: number;
  occurrencesCreated?: number;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  clientId?: string; // Ref: User
  caseId?: string; // Ref: Case
  vendorId?: string; // Ref: Vendor
  description: string;
  descriptionAr?: string;
  quantity?: number;
  unitPrice: number;
  expenseAccountId?: string; // Ref: Account
  incomeAccountId?: string; // Ref: Account
  caseId?: string; // Ref: Case
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  paymentTerms?: number;
  notes?: string;
  internalNotes?: string;
  autoSend?: boolean;
  autoApprove?: boolean;
  notifyDaysBefore?: number;
  notifyOnCreation?: boolean;
  transactionId?: string;
  transactionModel?: 'Invoice' | 'Bill' | 'Expense' | 'JournalEntry';
  transactionNumber?: string;
  generatedDate?: string;
  amount?: number;
  status?: string;
  lastGeneratedDate?: string;
  lastError?: any;
  nextDueDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  _id: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  method?: 'cash' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  notes?: string;
  recordedBy?: string; // Ref: User
  referralId?: string;
  referrerType?: 'individual' | 'organization' | 'employee' | 'client';
  referrerName?: string;
  referrerContactId?: string; // Ref: Contact
  referrerOrganizationId?: string; // Ref: Organization
  referrerEmail?: string;
  referrerPhone?: string;
  referredLeadId?: string; // Ref: Lead
  referredClientId?: string; // Ref: Client
  referredName?: string;
  referredEmail?: string;
  referredPhone?: string;
  referralDate?: string;
  source?: string;
  type?: 'client' | '// عميل حالي
            lawyer' | '// محامي
            law_firm' | '// مكتب محاماة
            contact' | '// جهة اتصال
            employee' | '// موظف
            partner' | '// شريك
            organization' | '// منظمة
            individual' | '// فرد
            other';
  sourceType?: 'Client' | 'Contact' | 'Organization' | 'User' | 'External';
  sourceId?: string;
  externalSource?: any;
  name?: string;
  nameAr?: string;
  description?: string;
  practiceArea?: string;
  caseType?: string;
  estimatedValue?: number;
  status?: 'pending' | '// معلق
            contacted' | '// تم التواصل
            qualified' | '// مؤهل
            converted' | '// تم التحويل
            rejected' | '// مرفوض
            expired' | '// منتهي الصلاحية
            active' | '// نشط (legacy)
            inactive' | '// غير نشط (legacy)
            archived      // مؤرشف (legacy)';
  totalReferrals?: number;
  successfulReferrals?: number;
  pendingReferrals?: number;
  hasFeeAgreement?: boolean;
  feeType?: 'percentage' | 'fixed' | 'tiered' | 'none';
  feePercentage?: number;
  feeFixedAmount?: number;
  feeCurrency?: string;
  minValue?: number;
  maxValue?: number;
  percentage?: number;
  fixedAmount?: number;
  feeNotes?: string;
  totalFeesOwed?: number;
  totalFeesPaid?: number;
  commissionStatus?: 'pending' | 'approved' | 'paid' | 'void';
  commissionAmount?: number;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  hasAgreement?: boolean;
  agreementDate?: string;
  agreementExpiryDate?: string;
  agreementDocument?: string;
  bankName?: string;
  iban?: string;
  accountHolderName?: string;
  assignedTo?: string; // Ref: User
  followUpDate?: string;
  leadId?: string; // Ref: Lead
  referredAt?: string;
  status?: 'pending' | 'converted' | 'lost';
  convertedAt?: string;
  caseValue?: number;
  feeAmount?: number;
  feePaid?: boolean;
  clientId?: string; // Ref: Client
  leadId?: string; // Ref: Lead
  referredAt?: string;
  totalCaseValue?: number;
  totalFeesDue?: number;
  totalFeesPaid?: number;
  lastReferralDate?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
  type?: string[];
  rating?: number;
  priority?: 'low' | 'normal' | 'high' | 'vip';
  lastModifiedBy?: string; // Ref: User
  campaignId?: string; // Ref: Campaign
  marketingScore?: number;
  utm?: string;
  program?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip'; // Ref: ReferralProgram
  integration?: 'synced' | 'pending' | 'failed' | 'never';
  territoryId?: string; // Ref: Territory
  salesTeamId?: string; // Ref: SalesTeam
  customFields?: string;
  followUp?: 'phone' | 'email' | 'whatsapp' | 'meeting' | 'sms' | 'other'; // Ref: User
  createdAt?: any;
  name?: any;
  nameAr?: any;
  totalReferrals?: any;
  totalReferrers?: any;
  sum?: any;
  totalReferrals?: any;
  successfulReferrals?: any;
  totalFeesOwed?: any;
  totalFeesPaid?: any;
  match?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshToken {
  _id: string;
  token: string;
  userId: string; // Ref: User
  expiresAt: string;
  isRevoked?: boolean;
  revokedAt?: string;
  revokedReason?: 'logout' | '// User logged out
            refresh' | '// Token rotated on refresh
            security' | '// Security concern (password change' | 'etc.)
            reuse_detected' | '// Token reuse attack detected
            expired' | '// Token expired
            revoke_all' | '// All tokens revoked
            admin' | '// Admin revoked
            null';
  deviceInfo?: any;
  rotatedFrom?: string; // Ref: RefreshToken
  family: string;
  lastUsedAt?: string;
  rememberMe?: boolean;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  set?: any;
  set?: any;
  set?: any;
  expiresAt?: any;
  set?: any;
  expiresAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  _id: string;
  refundNumber: string;
  refundDate?: string;
  status?: string;
  refundType?: string;
  paymentId: string; // Ref: Payment
  originalAmount: number;
  currency?: string;
  requestedAmount: number;
  approvedAmount?: number;
  processedAmount?: number;
  refundMethod?: string;
  reason: string;
  reasonDetails?: string;
  policyApplied?: string;
  serviceTracking: string; // Ref: Case
  customerId: string; // Ref: Client
  requiresApproval?: boolean;
  approverId?: string; // Ref: User
  action?: 'approved' | 'rejected' | 'requested_changes';
  amount?: number;
  notes?: string;
  date?: string;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  processingDetails?: 'stripe' | 'paypal' | 'hyperpay' | 'moyasar' | 'tap' | 'bank' | 'cash' | 'other'; // Ref: User
  failureDetails?: number;
  glEntryId?: string; // Ref: GeneralLedger
  creditNoteId?: string; // Ref: CreditNote
  internalNotes?: string;
  customerNotes?: string;
  filename?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
  requestedBy: string; // Ref: User
  totalRefunds?: any;
  totalRequested?: any;
  totalApproved?: any;
  totalProcessed?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  group?: any;
  sort?: any;
  set?: any;
  push?: any;
  set?: any;
  push?: any;
  set?: any;
  status?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RelationTuple {
  _id: string;
  namespace: string;
  object: string;
  relation: string;
  subjectNamespace?: string;
  subjectObject: string;
  subjectRelation?: string;
  expiresAt?: string;
  partialFilterExpression?: any;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  metadata?: any;
  filter?: any;
  update?: any;
  match?: any;
  group?: any;
  relations?: any;
  total?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  _id: string;
  beforeMinutes: number;
  type?: string[];
  sent?: boolean;
  sentAt?: string;
  enabled?: boolean;
  escalateAfterMinutes?: number;
  escalateTo?: string; // Ref: User
  escalated?: boolean;
  escalatedAt?: string;
  reminderId?: string;
  title?: string;
  description?: string;
  userId?: string; // Ref: User
  reminderDateTime?: string;
  reminderDate?: string;
  reminderTime?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'task_due' | 'hearing' | 'deadline' | 'meeting' | 'payment' | 'contract_renewal' | 'statute_limitation' | 'follow_up' | 'general' | '// Legacy types
            task';
  status?: 'pending' | 'snoozed' | 'completed' | 'dismissed' | 'delegated';
  snooze?: number;
  notification?: 'push' | 'email' | 'sms' | 'whatsapp' | 'in_app'[];
  acknowledgedAt?: string;
  acknowledgedBy?: string; // Ref: User
  acknowledgmentAction?: 'completed' | 'dismissed' | 'snoozed' | 'delegated';
  delegatedTo?: string; // Ref: User
  delegatedAt?: string;
  delegationNote?: string;
  relatedCase?: string; // Ref: Case
  relatedTask?: string; // Ref: Task
  relatedEvent?: string; // Ref: Event
  relatedInvoice?: string; // Ref: Invoice
  clientId?: string; // Ref: User
  recurring?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'[]; // Ref: Reminder
  enabled?: boolean;
  type?: 'arrive' | 'leave' | 'nearby';
  location?: string; // Ref: UserLocation
  radius?: number;
  triggered?: boolean;
  triggeredAt?: string;
  lastCheckedAt?: string;
  repeatTrigger?: boolean;
  cooldownMinutes?: number;
  completedAt?: string;
  completedBy?: string; // Ref: User
  completionNote?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string; // Ref: User
  sortOrder?: number;
  calendarSync?: 'synced' | 'pending' | 'failed' | 'not_synced';
  notes?: string;
  type?: string[];
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  uploadedAt?: string;
  notificationSent?: boolean;
  notificationSentAt?: string;
  Query?: any;
  Query?: any;
  Query?: any;
  Query?: any;
  createdAt?: any;
  status?: any;
  reminderDateTime?: any;
  reminderDateTime?: any;
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  reminderDateTime?: any;
  status?: any;
  reminderDateTime?: any;
  status?: any;
  reminderDateTime?: any;
  byStatus?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  _id: string;
  reportName?: string;
  reportType?: 'revenue' | 'aging' | 'realization' | 'collections' | 'productivity' | 'profitability' | 'time_utilization' | 'tax' | 'custom';
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  isScheduled?: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastRun?: string;
  nextRun?: string;
  outputFormat?: 'pdf' | 'excel' | 'csv';
  outputUrl?: string;
  emailRecipients?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDefinition {
  _id: string;
  targetModel: string;
  sourceField: string;
  targetField: string;
  type: 'inner' | 'left' | 'right';
  model: string;
  alias?: string;
  joins?: any[];
  field: string;
  label?: string;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
  format?: any;
  field: string;
  operator: string;
  value?: any;
  userInput?: boolean;
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  enabled?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  format?: 'pdf' | 'excel' | 'csv';
  name: string;
  description?: string;
  type: 'table' | 'chart' | 'pivot' | 'funnel' | 'cohort' | 'dashboard';
  dataSources?: any[];
  columns?: any[];
  filters?: any[];
  groupBy?: string[];
  visualization?: any;
  schedule?: any;
  isPublic?: boolean;
  scope: 'personal' | 'team' | 'global';
  ownerId: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface Retainer {
  _id: string;
  retainerNumber: string;
  retainerLiabilityAccountId?: string; // Ref: Account
  bankAccountId?: string; // Ref: Account
  type?: string;
  clientId: string; // Ref: User
  caseId?: string; // Ref: Case
  retainerType: 'advance' | 'evergreen' | 'flat_fee' | 'security';
  initialAmount: number;
  currentBalance: number;
  minimumBalance?: number;
  startDate: string;
  endDate?: string;
  autoReplenish?: boolean;
  replenishThreshold?: number;
  replenishAmount?: number;
  status?: 'active' | 'depleted' | 'refunded' | 'expired';
  date?: string;
  amount: number;
  invoiceId?: string; // Ref: Invoice
  description?: string;
  date?: string;
  amount: number;
  paymentId?: string; // Ref: Payment
  lowBalanceAlertSent?: boolean;
  lowBalanceAlertDate?: string;
  agreementUrl?: string;
  agreementSignedDate?: string;
  notes?: string;
  termsAndConditions?: string;
  meta?: any;
  meta?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionBonus {
  _id: string;
  milestoneNumber?: number;
  vestingDate?: string;
  vestingPercentage?: number;
  vestingAmount?: number;
  status?: 'pending' | 'vested' | 'forfeited';
  vestedAt?: string;
  notes?: string;
  bonusId?: string;
  employeeId?: string; // Ref: Employee
  bonusName: string;
  bonusType: 'tenure_based' | 'milestone_based' | 'project_completion' | 'critical_role' | 'counter_offer';
  totalAmount: number;
  currency?: string;
  paymentMode?: 'lump_sum' | 'installments' | 'vesting';
  vestingPeriodMonths?: number;
  totalVested?: number;
  totalPaid?: number;
  totalForfeited?: number;
  agreementDate: string;
  startDate: string;
  endDate: string;
  retentionConditions?: number;
  hasClawback?: boolean;
  clawbackPercentage?: number;
  clawbackPeriodMonths?: number;
  clawbackConditions?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'forfeited' | 'cancelled';
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  forfeitedBy?: string; // Ref: User
  forfeitedAt?: string;
  forfeitureReason?: string;
  reason?: string;
  notes?: string;
  hrComments?: string;
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  inc?: any;
  elemMatch?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnOrder {
  _id: string;
  lineId?: string;
  lineNumber: number;
  originalLineItemId?: string;
  salesOrderId?: string; // Ref: SalesOrder
  salesOrderNumber?: string;
  invoiceId?: string; // Ref: Invoice
  invoiceNumber?: string;
  deliveryNoteId?: string; // Ref: DeliveryNote
  deliveryNoteNumber?: string;
  productId?: string; // Ref: Product
  productCode?: string;
  productName: string;
  productNameAr?: string;
  description?: string;
  orderedQuantity?: number;
  deliveredQuantity?: number;
  returnQuantity: number;
  receivedQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  restockingFeePercent?: number;
  restockingFeeAmount?: number;
  refundAmount?: number;
  reason: 'defective' | 'damaged_in_transit' | 'wrong_item' | 'wrong_quantity' | 'not_as_described' | 'quality_issue' | 'changed_mind' | 'duplicate_order' | 'late_delivery' | 'no_longer_needed' | 'warranty_claim' | 'other';
  reasonDetail?: string;
  reasonDetailAr?: string;
  type?: string[];
  type?: string[];
  inspectionStatus?: 'pending' | 'in_progress' | 'completed' | 'not_required';
  inspectionResult?: 'acceptable' | 'acceptable_with_damage' | 'damaged_by_customer' | 'missing_parts' | 'used' | 'different_item' | 'counterfeit' | 'rejected';
  inspectionNotes?: string;
  type?: string[];
  inspectedBy?: string; // Ref: User
  inspectedAt?: string;
  resolution?: 'refund' | 'replacement' | 'credit_note' | 'repair' | 'exchange' | 'reject' | 'pending';
  resolutionNotes?: string;
  disposition?: 'return_to_stock' | 'return_to_vendor' | 'scrap' | 'refurbish' | 'donate' | 'pending';
  dispositionWarehouseId?: string; // Ref: Warehouse
  dispositionNotes?: string;
  status?: 'pending' | 'received' | 'inspected' | 'processed' | 'rejected' | 'cancelled';
  method: 'customer_ship' | 'company_pickup' | 'drop_off' | 'no_return_required';
  customerTrackingNumber?: string;
  customerCarrier?: string;
  customerShippingCost?: number;
  shippingCostPaidBy?: 'customer' | 'company';
  shippingLabelUrl?: string;
  shippingLabelGeneratedAt?: string;
  pickupAddress?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupScheduledDate?: string;
  pickupScheduledTimeSlot?: string;
  pickupCompletedDate?: string;
  pickupDriverId?: string; // Ref: User
  pickupDriverName?: string;
  pickupNotes?: string;
  dropOffLocationId?: string; // Ref: Warehouse
  dropOffLocationName?: string;
  dropOffAddress?: string;
  level: number;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comments?: string;
  action: string;
  timestamp?: string;
  performedBy?: string; // Ref: User
  performedByName?: string;
  details?: string;
  oldStatus?: string;
  newStatus?: string;
  returnNumber: string;
  returnDate: string;
  sourceType: 'sales_order' | 'invoice' | 'delivery_note';
  sourceId: string;
  sourceNumber?: string;
  sourceDate?: string;
  salesOrderId?: string; // Ref: SalesOrder
  salesOrderNumber?: string;
  invoiceId?: string; // Ref: Invoice
  invoiceNumber?: string;
  deliveryNoteId?: string; // Ref: DeliveryNote
  deliveryNoteNumber?: string;
  customerId: string; // Ref: Client
  customerName?: string;
  customerNameAr?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'awaiting_return' | 'received' | 'inspecting' | 'inspected' | 'processing' | 'processed' | 'completed' | 'cancelled';
  primaryReason: 'defective' | 'damaged_in_transit' | 'wrong_item' | 'not_as_described' | 'quality_issue' | 'changed_mind' | 'duplicate_order' | 'late_delivery' | 'warranty_claim' | 'other';
  reasonDetail?: string;
  reasonDetailAr?: string;
  type?: string[];
  requestedResolution: 'refund' | 'replacement' | 'credit_note' | 'repair' | 'exchange';
  actualResolution?: 'refund' | 'replacement' | 'credit_note' | 'repair' | 'exchange' | 'partial_refund' | 'rejected' | 'pending';
  resolutionNotes?: string;
  originalAmount?: number;
  returnAmount?: number;
  currency?: string;
  applyRestockingFee?: boolean;
  restockingFeePercent?: number;
  restockingFeeAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  refundAmount?: number;
  shippingRefund?: number;
  totalRefundAmount?: number;
  receivingWarehouseId?: string; // Ref: Warehouse
  receivingWarehouseName?: string;
  receivedDate?: string;
  receivedBy?: string; // Ref: User
  receivedByName?: string;
  receivingNotes?: string;
  type?: string[];
  packageCondition?: 'good' | 'damaged' | 'opened' | 'missing_items';
  requiresInspection?: boolean;
  inspectionDate?: string;
  inspectionCompletedDate?: string;
  overallInspectionResult?: 'passed' | 'passed_with_issues' | 'failed' | 'pending';
  inspectionSummary?: string;
  requiresApproval?: boolean;
  approvalThreshold?: number;
  currentApprovalLevel?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  creditNoteId?: string; // Ref: CreditNote
  creditNoteNumber?: string;
  replacementOrderId?: string; // Ref: SalesOrder
  replacementOrderNumber?: string;
  refundPaymentId?: string; // Ref: Payment
  refundPaymentReference?: string;
  refundDate?: string;
  refundMethod?: 'original_method' | 'bank_transfer' | 'cash' | 'credit_note' | 'store_credit';
  requestedDate?: string;
  submittedDate?: string;
  expiryDate?: string;
  processedDate?: string;
  completedDate?: string;
  isWarrantyClaim?: boolean;
  warrantyId?: string; // Ref: Warranty
  warrantyExpiryDate?: string;
  warrantyClaimNumber?: string;
  customerNotes?: string;
  internalNotes?: string;
  cancellationReason?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  pdfUrl?: string;
  rmaLabelUrl?: string;
  customFields?: Record<string, any>;
  type?: string[];
  toJSON?: any;
  toObject?: any;
  pagination?: any;
  totalReturns?: any;
  totalRefundAmount?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  byReason?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  gigID: string; // Ref: Gig
  userID: string; // Ref: User
  star: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTemplate {
  _id: string;
  competencyId: string;
  name: string;
  nameAr?: string;
  category: 'core' | 'leadership' | 'technical' | 'legal' | 'client_service' | 'behavioral' | 'functional';
  descriptionAr?: string;
  level?: number;
  description?: string;
  descriptionAr?: string;
  indicator?: string;
  indicatorAr?: string;
  weight?: number;
  isRequired?: boolean;
  applicableRoles?: string;
  applicableLevels?: string;
  goalId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  goalType?: 'individual' | 'team' | 'company' | 'project' | 'developmental';
  weight?: number;
  isRequired?: boolean;
  kpiId?: string;
  name: string;
  nameAr?: string;
  category?: 'financial' | 'operational' | 'customer' | 'quality' | 'efficiency';
  metric?: string;
  unit?: string;
  defaultTarget?: number;
  weight?: number;
  isRequired?: boolean;
  applicableRoles?: string;
  templateId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  reviewType: 'annual' | 'mid_year' | 'quarterly' | 'probation' | 'project' | 'ad_hoc';
  version?: number;
  isLatestVersion?: boolean;
  includeGoals?: boolean;
  minGoals?: number;
  maxGoals?: number;
  includeKPIs?: boolean;
  include360Feedback?: boolean;
  min360Providers?: number;
  includeSelfAssessment?: boolean;
  selfAssessmentRequired?: boolean;
  includeAttorneyMetrics?: boolean;
  includeDevelopmentPlan?: boolean;
  ratingScale?: '1-5' | '1-100';
  value?: number;
  label?: string;
  labelAr?: string;
  description?: string;
  competencyWeight?: number;
  goalsWeight?: number;
  kpiWeight?: number;
  stepNumber?: number;
  role?: string;
  isRequired?: boolean;
  requireCalibration?: boolean;
  instructions?: string;
  instructionsAr?: string;
  managerInstructions?: string;
  managerInstructionsAr?: string;
  employeeInstructions?: string;
  employeeInstructionsAr?: string;
  type?: string[];
  applicableRoles?: string;
  applicableLevels?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevokedToken {
  _id: string;
  tokenHash: string;
  tokenFamily?: string;
  userId: string; // Ref: User
  userEmail: string;
  reason: 'logout' | '// Normal user logout (single device)
        logout_all' | '// User logged out from all devices
        password_change' | '// Password was changed
        security_incident' | '// Security breach detected
        admin_revoke' | '// Admin manually revoked
        account_suspended' | '// Account was suspended
        account_deleted' | '// Account was deleted
        token_expired' | '// Token expired (manual revocation)
        session_timeout' | '// Session timeout
        role_change' | '// User role changed
        permissions_change   // User permissions changed';
  revokedBy?: string; // Ref: User
  revokedAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  metadata?: any;
  notes?: string;
  metadata?: any;
  expiresAt?: any;
  group?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Rfq {
  _id: string;
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName: string;
  qty: number;
  uom?: string;
  requiredDate?: string;
  supplierId: string; // Ref: Supplier
  supplierName?: string;
  email?: string;
  sendEmail?: boolean;
  quotationId?: string; // Ref: SupplierQuotation
  rfqId?: string;
  rfqNumber?: string;
  transactionDate?: string;
  validTill?: string;
  messageForSupplier?: string;
  status?: 'draft' | 'submitted' | 'quoted' | 'ordered' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  materialRequestId?: string; // Ref: MaterialRequest
  company?: string;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Routing {
  _id: string;
  sequence: number;
  operation: string;
  operationAr?: string;
  workstation?: string; // Ref: Workstation
  timeInMins?: number;
  operatingCost?: number;
  description?: string;
  routingId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  isActive?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryComponent {
  _id: string;
  componentId?: string;
  name?: string;
  nameAr?: string;
  code?: string;
  description?: string;
  componentType: 'earning' | 'deduction';
  category: '// Earnings
      basic_salary' | 'housing_allowance' | 'transportation_allowance' | 'mobile_allowance' | 'meal_allowance' | 'bonus' | 'commission' | 'overtime' | 'incentive' | 'leave_encashment' | 'gratuity' | 'other_earning' | '// Deductions
      gosi_employee' | 'gosi_employer' | 'loan' | 'advance' | 'absence' | 'late_penalty' | 'insurance' | 'other_deduction';
  calculationType?: 'fixed' | 'percentage' | 'formula';
  amount?: number;
  percentage?: number;
  percentageOf?: 'basic' | 'gross' | 'net' | 'custom';
  formula?: string;
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  isGOSIApplicable?: boolean;
  gosiRate?: number;
  isTaxable?: boolean;
  taxRate?: number;
  isStatutory?: boolean;
  isMandatory?: boolean;
  isRecurring?: boolean;
  applyToAllEmployees?: boolean;
  type?: string;
  type?: string;
  type?: string;
  minServiceMonths?: number;
  maxServiceMonths?: number;
  enableProration?: boolean;
  prorationBasis?: 'calendar_days' | 'working_days' | 'hours';
  roundingType?: 'none' | 'round' | 'ceil' | 'floor';
  roundingPrecision?: number;
  showInPayslip?: boolean;
  payslipCategory?: 'earnings' | 'allowances' | 'deductions' | 'statutory' | 'reimbursements';
  sortOrder?: number;
  isActive?: boolean;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalarySlip {
  _id: string;
  name: string;
  nameAr?: string;
  amount: number;
  hours?: number;
  rate?: number;
  amount?: number;
  month: number;
  year: number;
  calendarType?: 'hijri' | 'gregorian';
  periodStart?: string;
  periodEnd?: string;
  paymentDate?: string;
  workingDays?: number;
  daysWorked?: number;
  basicSalary: number;
  totalAllowances?: number;
  bonus?: number;
  commission?: number;
  arrears?: number;
  totalEarnings?: number;
  gosi?: number;
  gosiEmployer?: number;
  loans?: number;
  advances?: number;
  absences?: number;
  lateDeductions?: number;
  violations?: number;
  otherDeductions?: number;
  totalDeductions?: number;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check';
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  checkNumber?: string;
  checkDate?: string;
  status?: 'draft' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled';
  paidOn?: string;
  paidBy?: string; // Ref: User
  transactionReference?: string;
  failureReason?: string;
  required?: boolean;
  submitted?: boolean;
  submissionDate?: string;
  wpsReferenceNumber?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  slipId?: string;
  slipNumber?: string;
  employeeId: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  jobTitle?: string;
  department?: string;
  netPay?: number;
  netPayInWords?: string;
  netPayInWordsAr?: string;
  generatedOn?: string;
  generatedBy?: string; // Ref: User
  approvedBy?: string; // Ref: User
  approvedOn?: string;
  notes?: string;
  glEntryId?: string; // Ref: GeneralLedger
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalGrossPay?: any;
  totalDeductions?: any;
  totalNetPay?: any;
  totalGosi?: any;
  totalGosiEmployer?: any;
  group?: any;
  project?: any;
  payPeriod?: any;
  earnings?: any;
  deductions?: any;
  payment?: any;
  wps: any;
  meta?: any;
  meta?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalesForecast {
  _id: string;
  forecastId?: string;
  name: string;
  nameAr?: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  fiscalYear?: number;
  fiscalQuarter?: number;
  scopeType?: string;
  salesTeamId?: string; // Ref: SalesTeam
  territoryId?: string; // Ref: Territory
  userId?: string; // Ref: User
  quota?: number;
  currency?: string;
  pipeline?: number;
  bestCase?: number;
  commit?: number;
  closedWon?: number;
  forecastTotal?: number;
  weightedForecast?: number;
  quotaAttainment?: number;
  gap?: number;
  type?: string;
  amount?: number;
  reason?: string;
  adjustedBy?: string; // Ref: User
  adjustedAt?: string;
  status?: string;
  submittedAt?: string;
  submittedBy?: string; // Ref: User
  approvedAt?: string;
  approvedBy?: string; // Ref: User
  lastCalculatedAt?: string;
  notes?: string;
  periodStart?: any;
  periodStart?: any;
  periodEnd?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrder {
  _id: string;
  addressLine1?: string;
  addressLine1Ar?: string;
  addressLine2?: string;
  addressLine2Ar?: string;
  city?: string;
  cityAr?: string;
  state?: string;
  stateAr?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  buildingNumber?: string;
  additionalNumber?: string;
  unitNumber?: string;
  district?: string;
  districtAr?: string;
  latitude?: number;
  longitude?: number;
  lineId?: string;
  lineNumber: number;
  productId?: string; // Ref: Product
  productCode?: string;
  productName: string;
  productNameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemType?: 'product' | 'service' | 'consumable' | 'bundle' | 'subscription';
  quantity: number;
  unit?: string;
  uomConversionFactor?: number;
  quantityDelivered?: number;
  quantityInvoiced?: number;
  quantityReturned?: number;
  quantityReserved?: number;
  quantityBackordered?: number;
  listPrice?: number;
  unitPrice: number;
  priceListId?: string; // Ref: PriceList
  pricingRuleId?: string; // Ref: PricingRule
  discountPercent?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  taxTemplateId?: string; // Ref: TaxTemplate
  taxRate?: number;
  taxAmount?: number;
  taxIncluded?: boolean;
  subtotal?: number;
  total?: number;
  costPrice?: number;
  marginAmount?: number;
  marginPercent?: number;
  warehouseId?: string; // Ref: Warehouse
  warehouseName?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  isDropShip?: boolean;
  supplierId?: string; // Ref: Supplier
  supplierOrderId?: string; // Ref: PurchaseOrder
  serialNumbers?: string;
  batchNumber?: string;
  expiryDate?: string;
  productId?: string; // Ref: Product
  productName?: string;
  quantity?: number;
  notes?: string;
  internalNotes?: string;
  taxName: string;
  taxNameAr?: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  taxAccountId?: string; // Ref: Account
  taxType?: 'vat' | 'sales_tax' | 'service_tax' | 'excise' | 'customs' | 'other';
  level: number;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comments?: string;
  threshold?: number;
  salesPersonId: string; // Ref: SalesPerson
  salesPersonName?: string;
  role?: 'primary' | 'support' | 'manager' | 'partner';
  contributionPercent: number;
  contributionAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  action: string;
  timestamp?: string;
  performedBy?: string; // Ref: User
  performedByName?: string;
  field?: string;
  details?: string;
  ipAddress?: string;
  orderNumber: string;
  orderDate: string;
  sourceType?: 'manual' | 'quote' | 'opportunity' | 'ecommerce' | 'api' | 'recurring';
  quoteId?: string; // Ref: Quote
  quoteNumber?: string;
  opportunityId?: string; // Ref: Lead
  customerId: string; // Ref: Client
  customerName?: string;
  customerNameAr?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerVatNumber?: string;
  customerPoNumber?: string;
  customerReference?: string;
  billingAddressId?: string;
  shippingAddressId?: string;
  sameAsBilling?: boolean;
  contactPersonId?: string; // Ref: Contact
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'confirmed' | 'in_progress' | 'on_hold' | 'partially_shipped' | 'shipped' | 'partially_invoiced' | 'invoiced' | 'completed' | 'cancelled' | 'closed';
  deliveryStatus?: 'not_started' | 'partially_delivered' | 'fully_delivered' | 'not_applicable';
  billingStatus?: 'not_billed' | 'partially_billed' | 'fully_billed';
  paymentStatus?: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid';
  priceListId?: string; // Ref: PriceList
  priceListName?: string;
  currency?: string;
  exchangeRate?: number;
  additionalDiscountType?: 'percentage' | 'amount';
  additionalDiscountValue?: number;
  additionalDiscountAmount?: number;
  discountReason?: string;
  couponCode?: string;
  ruleId?: string; // Ref: PricingRule
  ruleName?: string;
  discountAmount?: number;
  itemsSubtotal?: number;
  itemsDiscountTotal?: number;
  subtotal?: number;
  taxableAmount?: number;
  totalTaxAmount?: number;
  taxRate?: number;
  shippingCost?: number;
  handlingCost?: number;
  insuranceCost?: number;
  otherCharges?: number;
  otherChargesDescription?: string;
  roundingAdjustment?: number;
  grandTotal: number;
  totalCost?: number;
  totalMargin?: number;
  marginPercent?: number;
  paymentTermsId?: string; // Ref: PaymentTerms
  paymentTerms?: string;
  paymentTermsDays?: number;
  paymentDueDate?: string;
  downPaymentRequired?: boolean;
  downPaymentType?: 'percentage' | 'fixed_amount';
  downPaymentPercent?: number;
  downPaymentAmount?: number;
  downPaymentPaid?: number;
  downPaymentInvoiceId?: string; // Ref: Invoice
  downPaymentPaidDate?: string;
  totalPaid?: number;
  balanceDue?: number;
  type?: string;
  shippingPolicy?: 'deliver_all_at_once' | 'deliver_as_available' | 'deliver_by_date';
  expectedDeliveryDate?: string;
  commitmentDate?: string;
  actualDeliveryDate?: string;
  deliveryMethod?: string;
  shippingCarrier?: string;
  shippingCarrierId?: string; // Ref: ShippingCarrier
  shippingService?: string;
  incoterms?: 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP' | 'FAS' | 'FOB' | 'CFR' | 'CIF';
  warehouseId?: string; // Ref: Warehouse
  warehouseName?: string;
  deliveryProgress?: number;
  invoicingProgress?: number;
  salesPersonId?: string; // Ref: SalesPerson
  salesPersonName?: string;
  salesTeamId?: string; // Ref: SalesTeam
  salesTeamName?: string;
  territoryId?: string; // Ref: Territory
  territoryName?: string;
  commissionPlanId?: string; // Ref: CommissionPlan
  commissionAmount?: number;
  commissionStatus?: 'not_calculated' | 'calculated' | 'approved' | 'paid';
  campaignId?: string; // Ref: Campaign
  campaignName?: string;
  sourceChannel?: 'direct' | 'referral' | 'website' | 'social' | 'email' | 'phone' | 'partner' | 'other';
  referralId?: string; // Ref: Referral
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  requiresApproval?: boolean;
  approvalWorkflowId?: string; // Ref: ApprovalWorkflow
  currentApprovalLevel?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  termsAndConditionsAr?: string;
  specialInstructions?: string;
  holdReason?: string;
  holdUntil?: string;
  heldBy?: string; // Ref: User
  heldAt?: string;
  cancellationReason?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  revisionNumber?: number;
  previousVersionId?: string; // Ref: SalesOrder
  amendedFrom?: string; // Ref: SalesOrder
  isAmended?: boolean;
  printCount?: number;
  lastPrintedAt?: string;
  lastPrintedBy?: string; // Ref: User
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  letterHeadId?: string; // Ref: LetterHead
  templateId?: string; // Ref: DocumentTemplate
  confirmedAt?: string;
  confirmedBy?: string; // Ref: User
  submittedAt?: string;
  submittedBy?: string; // Ref: User
  completedAt?: string;
  closedAt?: string;
  closedBy?: string; // Ref: User
  customFields?: Record<string, any>;
  type?: string[];
  toJSON?: any;
  toObject?: any;
  pagination?: any;
  totalOrders?: any;
  totalValue?: any;
  avgOrderValue?: any;
  totalPaid?: any;
  totalOutstanding?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalesPerson {
  _id: string;
  year: number;
  quarter?: number;
  month?: number;
  targetAmount?: number;
  achievedAmount?: number;
  targetLeads?: number;
  achievedLeads?: number;
  targetCases?: number;
  achievedCases?: number;
  name: string;
  nameAr: string;
  parentSalesPersonId?: string; // Ref: SalesPerson
  isGroup?: boolean;
  level?: number;
  path?: string;
  employeeId?: string; // Ref: Employee
  userId?: string; // Ref: User
  commissionRate?: number;
  type?: string;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesQuota {
  _id: string;
  userId?: string; // Ref: User
  teamId?: string; // Ref: SalesTeam
  isCompanyWide?: boolean;
  name: string;
  nameAr?: string;
  description?: string;
  period: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  target: number;
  achieved?: number;
  currency?: 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'KWD' | 'BHD' | 'OMR' | 'QAR';
  newBusiness?: number;
  renewal?: number;
  upsell?: number;
  crossSell?: number;
  dealsTarget?: number;
  dealsAchieved?: number;
  calls?: number;
  meetings?: number;
  emails?: number;
  proposals?: number;
  leadsGenerated?: number;
  leadsQualified?: number;
  proposalsSent?: number;
  date?: string;
  previousTarget?: number;
  newTarget?: number;
  reason?: string;
  adjustedBy?: string; // Ref: User
  status?: 'draft' | 'active' | 'completed' | 'cancelled' | 'exceeded';
  lastUpdatedAt?: string;
  achievedAt?: string;
  exceededAt?: string;
  dealId?: string; // Ref: Lead
  value?: number;
  dealType?: 'newBusiness' | 'renewal' | 'upsell' | 'crossSell';
  closedAt?: string;
  notes?: string;
  toJSON?: any;
  toObject?: any;
  startDate?: any;
  endDate?: any;
  status?: any;
  status?: any;
  startDate?: any;
  endDate?: any;
  sort?: any;
  lookup?: any;
  unwind?: any;
  project?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalesSettings {
  _id: string;
  numberPrefix?: string;
  numberSuffix?: string;
  numberSequence?: number;
  numberPadding?: number;
  includeYearInNumber?: boolean;
  resetSequenceYearly?: boolean;
  defaultValidityDays?: number;
  reminderBeforeExpiryDays?: number;
  autoExpireQuotes?: boolean;
  requireApprovalAbove?: number;
  threshold?: number;
  approverRole?: 'manager' | 'director' | 'vp_sales' | 'cfo' | 'custom';
  customApprover?: string; // Ref: User
  maxDiscountPercentWithoutApproval?: number;
  allowNegotiatedPricing?: boolean;
  defaultTermsAndConditions?: string;
  defaultPaymentTerms?: string;
  defaultNotes?: string;
  defaultTemplateId?: string; // Ref: DocumentTemplate
  showProductImages?: boolean;
  showProductDescriptions?: boolean;
  showTaxBreakdown?: boolean;
  showDiscountColumn?: boolean;
  numberPrefix?: string;
  numberSuffix?: string;
  numberSequence?: number;
  numberPadding?: number;
  includeYearInNumber?: boolean;
  resetSequenceYearly?: boolean;
  requireDownPayment?: boolean;
  defaultDownPaymentPercentage?: number;
  allowPartialDelivery?: boolean;
  allowPartialInvoicing?: boolean;
  allowBackorders?: boolean;
  autoConfirmPaidOrders?: boolean;
  requireCustomerAcceptance?: boolean;
  sendConfirmationEmail?: boolean;
  requireApprovalAbove?: number;
  threshold?: number;
  approverRole?: string;
  customApprover?: string; // Ref: User
  defaultWarehouseId?: string; // Ref: Warehouse
  defaultShippingMethod?: string;
  defaultDeliveryLeadDays?: number;
  defaultTermsAndConditions?: string;
  defaultIncoterms?: 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'null';
  allowCancellationBeforeDelivery?: boolean;
  cancellationPenaltyPercentage?: number;
  lockAfterConfirmation?: boolean;
  allowedModificationsAfterConfirmation?: string[];
  pricing?: 'none' | 'round_up' | 'round_down' | 'round_nearest' | 'round_to_05' | 'round_to_10'; // Ref: PriceList
  tax?: 'line_by_line' | 'order_total'; // Ref: Tax
  delivery?: 'standard' | 'express' | 'same_day' | 'pickup' | 'scheduled'[]; // Ref: Carrier
  returns?: 'refund' | 'replacement' | 'credit_note' | 'repair'[];
  commission?: 'revenue' | 'profit' | 'margin' | 'collected'; // Ref: CommissionPlan
  notifications?: boolean;
  documents?: 'A4' | 'Letter' | 'Legal'; // Ref: DocumentTemplate
  accountingIntegration?: 'quickbooks' | 'xero' | 'sage' | 'zoho' | 'custom' | 'null';
  inventoryIntegration?: boolean;
  enabled?: boolean;
  carrierId?: string; // Ref: Carrier
  carrierName?: string;
  apiKey?: string;
  accountNumber?: string;
  isDefault?: boolean;
  paymentIntegration?: boolean[];
  ecommerceIntegration?: boolean;
  autoConvertAcceptedQuotes?: boolean;
  orderWorkflowSteps?: string[];
  skipApprovalForSmallOrders?: boolean;
  smallOrderThreshold?: number;
  autoConfirmPaidOrders?: boolean;
  autoCompleteDeliveredOrders?: boolean;
  autoCloseAfterDays?: number;
  enableEscalation?: boolean;
  condition?: string;
  escalateAfterHours?: number;
  escalateTo?: string; // Ref: User
  notificationTemplate?: string;
  regional?: '12h' | '24h';
  enableCaching?: boolean;
  cacheTTL?: number;
  enableAuditLog?: boolean;
  auditRetentionDays?: number;
  enablePublicAPI?: boolean;
  apiRateLimit?: number;
  enableDataExport?: boolean;
  exportFormats?: string[];
  entity?: 'quote' | 'order' | 'delivery' | 'return';
  fieldName?: string;
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
  label?: string;
  options?: string;
  required?: boolean;
  showInList?: boolean;
  showInPDF?: boolean;
  lastReviewedAt?: string;
  lastReviewedBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalesSetup {
  _id: string;
  name: string;
  nameAr?: string;
  color?: string;
  probability?: number;
  rottenDays?: number;
  order?: number;
  isWon?: boolean;
  isLost?: boolean;
  minAmount: number;
  maxAmount?: number;
  rate: number;
  flatBonus?: number;
  companySalesInfo?: string;
  quotationSettings?: string;
  orderSettings?: string;
  pricingSettings?: 'none' | 'round_up' | 'round_down' | 'round_nearest'; // Ref: PriceList
  taxSettings?: 'line_by_line' | 'order_total';
  commissionSettings?: 'revenue' | 'profit' | 'margin' | 'collected';
  defaultPipelineId?: string; // Ref: Pipeline
  stages?: any[];
  rottenDays?: number;
  autoCalculateProbability?: boolean;
  requireLostReason?: boolean;
  teamSettings?: 'monthly' | 'quarterly' | 'yearly'; // Ref: SalesTeam
  notificationSettings?: boolean;
  currentStep?: number;
  type?: number[];
  setupCompleted?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface SalesStage {
  _id: string;
  name: string;
  nameAr: string;
  order: number;
  defaultProbability?: number;
  type: 'open' | 'won' | 'lost';
  color?: string;
  requiresConflictCheck?: boolean;
  requiresQualification?: boolean;
  autoCreateQuote?: boolean;
  enabled?: boolean;
  order?: any;
  filter?: any;
  update?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTeam {
  _id: string;
  userId: string; // Ref: User
  role: 'leader' | 'member' | 'support';
  joinedAt?: string;
  isActive?: boolean;
  leads?: number;
  opportunities?: number;
  revenue?: number;
  wonDeals?: number;
  useLeads?: boolean;
  useOpportunities?: boolean;
  autoAssignmentEnabled?: boolean;
  assignmentMethod?: 'round_robin' | 'load_balanced' | 'manual';
  maxLeadsPerMember?: number;
  assignmentPeriodDays?: number;
  totalLeads?: number;
  activeOpportunities?: number;
  opportunityAmount?: number;
  overdueCount?: number;
  wonThisMonth?: number;
  lostThisMonth?: number;
  conversionRate?: number;
  lastUpdated?: string;
  teamId: string;
  name: string;
  nameAr?: string;
  description?: string;
  color?: string;
  icon?: string;
  leaderId: string; // Ref: User
  defaultPipelineId?: string; // Ref: Pipeline
  type?: string;
  type?: string;
  emailAlias?: string;
  monthly?: any;
  quarterly?: any;
  settings?: any;
  stats?: any;
  isActive?: boolean;
  isDefault?: boolean;
  name?: any;
  nameAr?: any;
  teamId?: any;
  assignedTo?: any;
  assignedTo?: any;
  status?: any;
  match?: any;
  group?: any;
  assignedTo?: any;
  closedDate?: any;
  assignedTo?: any;
  closedDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Sandbox {
  _id: string;
  userId: string; // Ref: User
  status?: 'creating' | 'active' | 'expired' | 'deleted';
  templateId?: 'empty' | 'basic_law_firm' | 'corporate_legal' | 'solo_practitioner' | 'full_demo';
  expiresAt: string;
  lastAccessedAt?: string;
  expirationWarningsSent?: string[];
  isDemo?: boolean;
  features?: string[];
  restrictions?: number;
  dataProfile?: 'empty' | 'sample_data' | 'full_demo';
  stats?: number;
  notes?: string;
  deleteReason?: string;
  status?: any;
  expiresAt?: any;
  expiresAt?: any;
  expirationWarningsSent?: any;
  group?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SavedFilter {
  _id: string;
  name: string;
  userId: string; // Ref: User
  entityType: 'invoices' | 'clients' | 'cases' | 'leads' | 'tasks' | 'events' | 'reminders' | '// Added - Gold Standard: support saved views for reminders
            expenses' | 'payments' | 'documents' | 'contacts' | 'deals' | 'projects' | 'time_entries';
  filters?: any;
  sort?: any;
  columns?: string[];
  isDefault?: boolean;
  isShared?: boolean;
  type?: string;
  usageCount?: number;
  lastUsedAt?: string;
  usageCount?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReport {
  _id: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  filters?: any;
  columns?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  format?: 'table' | 'chart' | 'summary' | 'detailed';
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'donut';
  name: string;
  nameAr?: string;
  description?: string;
  type: 'revenue' | 'cases' | 'clients' | 'staff' | 'time-tracking' | 'billing' | 'collections' | 'custom';
  isScheduled?: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
  scheduleTime?: string;
  scheduleDayOfWeek?: number;
  scheduleDayOfMonth?: number;
  recipients?: string;
  lastRun?: string;
  lastRunResult?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Score {
  _id: string;
  clientRating?: number;
  peerRating?: number;
  winRate?: number;
  experience?: number;
  responseRate?: number;
  engagement?: number;
  overallScore?: number;
  badge?: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  lastUpdated?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityIncident {
  _id: string;
  type: 'brute_force' | '// Multiple failed login attempts
      account_takeover' | '// Suspicious account access pattern
      suspicious_login' | '// Login from unusual location/device
      permission_escalation' | '// Unauthorized privilege change attempt
      data_exfiltration' | '// Bulk data export or suspicious data access
      unauthorized_access' | '// Access to resources without permission
      multiple_sessions' | '// Multiple concurrent sessions from different locations
      password_change' | '// Suspicious password change
      mfa_bypass' | '// MFA bypass attempt
      session_hijacking' | '// Session token manipulation detected
      api_abuse' | '// Unusual API usage patterns
      rate_limit_exceeded' | '// Rate limiting threshold exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  userId?: string; // Ref: User
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
  coordinates?: number;
  device?: string;
  details: any;
  description?: string;
  riskScore?: number;
  entityType?: string;
  entityId?: string;
  detectionMethod?: 'automatic' | 'manual' | 'third_party';
  detectedAt: string;
  detectedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string; // Ref: User
  resolution?: string;
  action: string;
  performedBy?: string; // Ref: User
  performedAt?: string;
  notes?: string;
  email?: boolean[];
  webhook?: boolean[];
  websocket?: boolean;
  sms?: boolean;
  type?: string[];
  note?: string;
  addedBy?: string; // Ref: User
  addedAt?: string;
  requiresAttention?: boolean;
  acknowledged?: boolean;
  acknowledgedBy?: string; // Ref: User
  acknowledgedAt?: string;
  partialFilterExpression?: any;
  group?: any;
  sort?: any;
  group?: any;
  sort?: any;
  group?: any;
  match?: any;
  sort?: any;
  project?: any;
  match?: any;
  project?: any;
  group?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SerialNumber {
  _id: string;
  serialNumberId?: string;
  serialNo?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  warehouseId?: string; // Ref: Warehouse
  status?: 'available' | 'delivered' | 'reserved' | 'maintenance' | 'scrapped';
  purchaseDate?: string;
  warrantyExpiry?: string;
  assetId?: string; // Ref: Asset
  customerId?: string; // Ref: Client
  salesOrderId?: string; // Ref: SalesOrder
  deliveryDate?: string;
  toJSON?: any;
  toObject?: any;
  warrantyExpiry?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  _id: string;
  userId: string; // Ref: User
  tokenHash: string;
  deviceInfo: string;
  location: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isActive?: boolean;
  terminatedAt?: string;
  terminatedReason?: 'logout' | '// User logged out
            expired' | '// Session expired naturally
            user_terminated' | '// User manually ended session
            admin_terminated' | '// Admin terminated session
            limit_exceeded' | '// Session limit exceeded' | 'oldest terminated
            security' | '// Security concern (password change' | 'suspicious activity)
            forced' | '// System forced termination
            null';
  terminatedBy?: string; // Ref: User
  rememberMe?: boolean;
  isNewDevice?: boolean;
  notificationSent?: boolean;
  isSuspicious?: boolean;
  suspiciousReasons?: 'ip_mismatch' | 'user_agent_mismatch' | 'impossible_travel' | 'location_change' | 'multiple_locations' | 'abnormal_activity_pattern' | 'null'[];
  suspiciousDetectedAt?: string;
  metadata?: any;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  set?: any;
  set?: any;
  set?: any;
  expiresAt?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SetupSection {
  _id: string;
  sectionId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  orderIndex: number;
  isRequired?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SetupTask {
  _id: string;
  taskId: string;
  sectionId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  orderIndex: number;
  isRequired?: boolean;
  checkEndpoint?: string;
  actionUrl?: string;
  estimatedMinutes?: number;
  isActive?: boolean;
  dependencies?: string[];
  validationRules?: string[];
  taskId?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignment {
  _id: string;
  assignmentId?: string;
  employeeId?: string; // Ref: Employee
  shiftTypeId?: string; // Ref: ShiftType
  startDate?: string;
  endDate?: string;
  assignmentType?: 'permanent' | 'temporary' | 'rotational' | 'substitute';
  status?: 'active' | 'inactive' | 'completed' | 'cancelled';
  isRotational?: boolean;
  shiftTypeId?: string; // Ref: ShiftType
  type?: string;
  weekNumber?: number;
  rotationFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  date?: string;
  shiftTypeId?: string; // Ref: ShiftType
  reason?: string;
  substituteFor?: string; // Ref: Employee
  substituteReason?: string;
  priority?: number;
  notes?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  cancelReason?: string;
  inc?: any;
  startDate?: any;
  endDate?: any;
  endDate?: any;
  startDate?: any;
  endDate?: any;
  startDate?: any;
  endDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftType {
  _id: string;
  shiftTypeId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  type?: string;
  validate?: any;
  type?: string;
  validate?: any;
  workingHours?: number;
  enableAutoAttendance?: boolean;
  processAttendanceAfter?: number;
  determineCheckInAndCheckOutFromBiometric?: boolean;
  beginCheckInBeforeShiftStart?: number;
  allowCheckOutAfterShiftEnd?: number;
  lateEntryGracePeriod?: number;
  earlyExitGracePeriod?: number;
  workingHoursThresholdForHalfDay?: number;
  workingHoursThresholdForAbsent?: number;
  breakDuration?: number;
  breakType?: 'paid' | 'unpaid';
  breakStartTime?: string;
  breakEndTime?: string;
  allowOvertime?: boolean;
  maxOvertimeHours?: number;
  overtimeMultiplier?: number;
  weekendOvertimeMultiplier?: number;
  holidayOvertimeMultiplier?: number;
  isRamadanShift?: boolean;
  type?: string;
  validate?: any;
  type?: string;
  validate?: any;
  ramadanWorkingHours?: number;
  type?: string;
  isNightShift?: boolean;
  nightShiftAllowance?: number;
  isFlexibleShift?: boolean;
  coreHoursStart?: string;
  coreHoursEnd?: string;
  minHoursRequired?: number;
  color?: string;
  isActive?: boolean;
  isDefault?: boolean;
  inc?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  _id: string;
  typeId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  parentTypeId?: string; // Ref: SkillType
  classification?: 'technical' | '// Hard skills - programming' | 'systems' | 'etc.
            functional' | '// Job-specific skills
            behavioral' | '// Soft skills - communication' | 'teamwork
            leadership' | '// Management and leadership skills
            industry' | '// Industry-specific knowledge
            certification' | '// Certifiable skills
            language' | '// Language proficiency
            tool' | '// Software/tool proficiency
            regulatory           // Compliance and regulatory skills';
  icon?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  skillId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  skillTypeId?: string; // Ref: SkillType
  category: 'technical' | 'legal' | 'language' | 'software' | 'management' | 'communication' | 'analytical' | 'interpersonal' | 'industry_specific' | 'certification' | 'other';
  subcategory?: string;
  useSfiaLevels?: boolean;
  level: number;
  code?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  autonomy?: string;
  complexity?: string;
  businessSkills?: string;
  influence?: string;
  targetProficiency?: number;
  type?: string;
  type?: string;
  skillId?: string; // Ref: Skill
  relationship?: 'prerequisite' | 'complementary' | 'advanced' | 'alternative';
  isVerifiable?: boolean;
  verificationMethod?: 'certification' | 'test' | 'assessment' | 'portfolio' | 'reference' | 'none';
  certificationInfo?: boolean;
  type?: 'course' | 'book' | 'video' | 'article' | 'practice' | 'mentorship';
  title?: string;
  titleAr?: string;
  provider?: string;
  url?: string;
  duration?: string;
  cost?: number;
  forLevel?: number;
  type?: string;
  roleId?: string; // Ref: JobRole
  roleName?: string;
  requiredLevel?: number;
  framework?: string;
  standardCode?: string;
  standardName?: string;
  stats?: number;
  isActive?: boolean;
  isCoreSkill?: boolean;
  competencyId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  type: 'core' | '// Required for all employees
            leadership' | '// Required for managers/leaders
            functional' | '// Job-specific competencies
            behavioral' | '// Soft skills/behaviors
            strategic       // Strategic/executive competencies';
  cluster?: 'communication' | 'collaboration' | 'problem_solving' | 'decision_making' | 'innovation' | 'customer_focus' | 'results_orientation' | 'leadership' | 'people_development' | 'strategic_thinking' | 'change_management' | 'integrity' | 'adaptability' | 'accountability';
  clusterAr?: string;
  level: number;
  levelName?: string;
  levelNameAr?: string;
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string[];
  type?: string;
  importance?: 'critical' | 'important' | 'nice_to_have';
  weight?: number;
  activity?: string;
  activityAr?: string;
  type?: 'training' | 'coaching' | 'reading' | 'experience' | 'project' | 'mentorship';
  forLevel?: number;
  estimatedDuration?: string;
  isActive?: boolean;
  isMandatory?: boolean;
  assessmentId?: string;
  employeeId: string; // Ref: Employee
  assessmentPeriod: string;
  assessmentType: 'annual' | 'quarterly' | 'probation' | 'promotion' | 'project_end' | 'skill_gap' | '360_review' | 'certification_prep';
  skillId: string; // Ref: Skill
  skillName?: string;
  skillNameAr?: string;
  category?: string;
  selfRating?: number;
  managerRating?: number; // Ref: User
  level?: number;
  levelProgress?: number;
  notes?: string;
  ratedBy?: string; // Ref: User
  relationship?: 'peer' | 'direct_report' | 'cross_functional' | 'external';
  finalRating?: 'weighted_average' | 'manager_final' | 'consensus'; // Ref: User
  previousRating?: number;
  targetRating?: number;
  gap?: number;
  trend?: 'improving' | 'stable' | 'declining';
  type?: 'project' | 'certification' | 'feedback' | 'observation' | 'achievement';
  description?: string;
  date?: string;
  verifiedBy?: string; // Ref: User
  competencyId: string; // Ref: Competency
  competencyName?: string;
  competencyNameAr?: string;
  type?: string;
  selfRating?: number;
  managerRating?: number; // Ref: User
  level?: number;
  notes?: string;
  ratedBy?: string; // Ref: User
  relationship?: string;
  ratedAt?: string;
  finalRating?: number;
  behavior?: string;
  situation?: string;
  action?: string;
  result?: string;
  observedBy?: string; // Ref: User
  observedAt?: string;
  overallSummary?: number[];
  goal?: string;
  goalAr?: string;
  skillId?: string; // Ref: Skill
  targetLevel?: number;
  dueDate?: string;
  type?: string[];
  goal?: string;
  goalAr?: string;
  targetDate?: string;
  trainingId?: string; // Ref: TrainingProgram
  trainingName?: string;
  priority?: 'high' | 'medium' | 'low';
  mentorAssigned?: string; // Ref: Employee
  status?: 'draft' | 'self_assessment' | 'manager_review' | 'peer_review' | 'calibration' | 'completed' | 'acknowledged';
  workflow?: string; // Ref: User
  inc?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  match?: any;
  skills?: any;
  count?: any;
  sort?: any;
  name?: any;
  nameAr?: any;
  description?: any;
  tags?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Sla {
  _id: string;
  target: number;
  warning: number;
  breach: number;
  day: number;
  startTime: string;
  endTime: string;
  name: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  metrics?: any;
  enabled?: boolean;
  schedule?: any[];
  timezone?: string;
  holidays?: string[];
  pauseConditions?: string[];
  appliesTo?: string[];
  toJSON?: any;
  toObject?: any;
  targetTime?: string;
  actualTime?: string;
  status?: 'pending' | 'achieved' | 'warning' | 'breached';
  ticketId: string; // Ref: Case
  slaId: string; // Ref: SLA
  startedAt: string;
  pausedAt?: string;
  totalPausedTime?: number;
  metrics?: any;
  breachNotificationsSent?: string[];
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SlackIntegration {
  _id: string;
  userId: string; // Ref: User
  teamId: string;
  teamName: string;
  accessToken: string;
  botUserId?: string;
  botAccessToken?: string;
  scope?: string;
  webhookUrl?: string;
  webhookChannel?: string;
  webhookChannelId?: string;
  channelId?: string;
  channelName?: string;
  enabled?: boolean;
  notifications?: boolean;
  defaultChannelId?: string;
  defaultChannelName?: string;
  mentionOnUrgent?: boolean;
  useThreads?: boolean;
  isActive?: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  lastError?: any;
  stats?: number;
  disconnectedAt?: string;
  disconnectedBy?: string; // Ref: User
  disconnectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Slo {
  _id: string;
  name: string;
  description?: string;
  category: 'availability' | 'latency' | 'error_rate' | 'throughput' | 'custom';
  target: number;
  threshold: number;
  timeWindow: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  isActive?: boolean;
  alertSettings?: 'email' | 'sms' | 'webhook' | 'slack'[]; // Ref: User
  metadata?: any;
  lastAlertSent?: string;
  lastMeasurement?: 'met' | 'warning' | 'breached';
  errorBudget?: any;
  threshold?: any;
  alertSettings?: any;
  threshold?: any;
  alertSettings?: any;
  threshold?: any;
  alertSettings?: any;
  threshold?: any;
  alertSettings?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SloMeasurement {
  _id: string;
  sloId: string; // Ref: SLO
  timestamp: string;
  value: number;
  status: 'met' | 'warning' | 'breached';
  windowStart: string;
  windowEnd: string;
  sampleCount?: number;
  metadata?: any;
  avgValue?: any;
  minValue?: any;
  maxValue?: any;
  totalMeasurements?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  totalSamples?: any;
  year?: any;
  month?: any;
  day?: any;
  hour?: any;
  year?: any;
  month?: any;
  day?: any;
  year?: any;
  week?: any;
  year?: any;
  month?: any;
  year?: any;
  month?: any;
  day?: any;
  avgValue?: any;
  minValue?: any;
  maxValue?: any;
  measurements?: any;
  sum?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SmtpConfig {
  _id: string;
  host: string;
  port?: number;
  username?: string;
  passwordEncrypted?: string;
  encryption?: 'none' | 'ssl' | 'tls';
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  maxEmailsPerHour?: number;
  isVerified?: boolean;
  verifiedAt?: string;
  lastTestedAt?: string;
  lastTestResult?: string;
  isEnabled?: boolean;
  tls?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SsoProvider {
  _id: string;
  name: string;
  providerType: 'google' | 'microsoft' | 'okta' | 'auth0' | 'custom';
  clientId: string;
  clientSecret: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  scopes?: string[];
  attributeMapping?: string;
  autoCreateUsers?: boolean;
  allowedDomains?: string[];
  defaultRole?: 'lawyer' | 'paralegal' | 'secretary' | 'accountant';
  priority?: number;
  autoRedirect?: boolean;
  domainVerified?: boolean;
  verificationToken?: string;
  verificationMethod?: 'dns' | 'email' | 'manual' | 'null';
  verifiedAt?: string;
  verifiedBy?: string; // Ref: User
  isEnabled?: boolean;
  lastTestedAt?: string;
  lastTestedBy?: string; // Ref: User
  google?: any;
  microsoft?: any;
  okta?: any;
  auth0?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SsoUserLink {
  _id: string;
  userId: string; // Ref: User
  providerId: string; // Ref: SsoProvider
  providerType: 'google' | 'microsoft' | 'okta' | 'auth0' | 'custom';
  externalId: string;
  externalEmail: string;
  externalUsername?: string;
  externalProfile?: any;
  isProvisioned?: boolean;
  provisionedAt?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  lastLoginAt?: string;
  loginCount?: number;
  lastLoginIp?: string;
  lastLoginUserAgent?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  tokenScopes?: string[];
  metadata?: Record<string, any>;
  linkedBy?: string; // Ref: User
  linkedAt?: string;
  deactivatedAt?: string;
  deactivatedBy?: string; // Ref: User
  deactivationReason?: string;
  set?: any;
  set?: any;
  lastLoginAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  _id: string;
  jurisdiction?: string;
  barNumber?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  admissionDate?: string;
  expiryDate?: string;
  isGoodStanding?: boolean;
  name?: string;
  isPrimary?: boolean;
  yearsExperience?: number;
  degree?: string;
  institution?: string;
  field?: string;
  year?: number;
  name?: string;
  issuingBody?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  language?: string;
  proficiency?: 'native' | 'fluent' | 'professional' | 'conversational' | 'basic';
  name: 'cases' | 'clients' | 'finance' | 'hr' | 'reports' | 'documents' | 'tasks' | 'settings' | 'team';
  access?: 'none' | 'view' | 'edit' | 'full';
  requiresApproval?: boolean;
  userId?: string; // Ref: User
  staffId?: string;
  salutation?: 'mr' | 'mrs' | 'ms' | 'dr' | 'eng' | 'prof' | 'sheikh' | 'his_excellency' | 'null';
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  avatar?: string;
  email: string;
  workEmail?: string;
  phone?: string;
  mobilePhone?: string;
  officePhone?: string;
  extension?: string;
  role: '// Enterprise roles (Salesforce/SAP style)
            owner' | 'admin' | 'partner' | 'senior_lawyer' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'intern' | '// Legacy roles for backwards compatibility
            senior_associate' | 'associate' | 'junior_associate' | 'legal_secretary' | 'of_counsel' | 'receptionist' | 'it' | 'marketing' | 'hr' | 'other';
  status?: 'active' | 'inactive' | 'pending_approval' | 'suspended' | 'departed' | 'on_leave' | 'terminated' | 'probation';
  employmentType?: 'full_time' | 'part_time' | 'contractor' | 'consultant' | 'null';
  permissions?: string[];
  invitedBy?: string; // Ref: User
  invitedAt?: string;
  invitationStatus?: 'pending' | 'accepted' | 'expired' | 'revoked' | 'null';
  invitationToken?: string;
  invitationExpiresAt?: string;
  acceptedAt?: string;
  departedAt?: string;
  departureReason?: 'resignation' | 'termination' | 'retirement' | 'transfer' | 'null';
  departureNotes?: string;
  exitInterviewCompleted?: boolean;
  departureProcessedBy?: string; // Ref: User
  specialization?: string;
  barNumber?: string;
  barAdmissionDate?: string;
  lastActiveAt?: string;
  department?: string;
  reportsTo?: string; // Ref: Staff
  officeLocation?: string;
  hireDate?: string;
  startDate?: string;
  terminationDate?: string;
  hourlyRate?: number;
  standardRate?: number;
  discountedRate?: number;
  premiumRate?: number;
  costRate?: number;
  billableHoursTarget?: number;
  revenueTarget?: number;
  utilizationTarget?: number;
  canBillTime?: boolean;
  canApproveTime?: boolean;
  canViewRates?: boolean;
  canEditRates?: boolean;
  bio?: string;
  bioAr?: string;
  notes?: string;
  type?: string;
  createdAt?: any;
  firstName?: any;
  lastName?: any;
  email?: any;
  match?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  sort?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface StaffingPlan {
  _id: string;
  designation: string; // Ref: Designation
  currentCount?: number;
  plannedCount: number;
  vacancies?: number;
  filledCount?: number;
  salaryBudget?: number;
  avgSalary?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  hiringTimeline?: 'immediate' | 'q1' | 'q2' | 'q3' | 'q4' | 'next_year';
  notes?: string;
  planId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  fiscalYear: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual';
  startDate: string;
  endDate: string;
  department: string; // Ref: Department
  branch?: string; // Ref: Branch
  totalCurrentHeadcount?: number;
  totalPlannedHeadcount?: number;
  totalVacancies?: number;
  totalFilled?: number;
  totalSalaryBudget?: number;
  approvedBudget?: number;
  utilizedBudget?: number;
  currency?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  completionPercentage?: number;
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  justification?: string;
  assumptions?: string;
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  inc?: any;
  status?: any;
  status?: any;
  status?: any;
  group?: any;
  group?: any;
  sort?: any;
  match?: any;
  group?: any;
  lookup?: any;
  project?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Statement {
  _id: string;
  itemType: 'invoice' | 'payment' | 'expense' | 'time_entry' | 'adjustment' | 'credit';
  referenceId?: string;
  referenceModel?: 'Invoice' | 'Payment' | 'Expense' | 'TimeEntry';
  referenceNumber?: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  statementNumber: string;
  clientId: string; // Ref: User
  caseId?: string; // Ref: Case
  periodStart: string;
  periodEnd: string;
  period?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  summary?: number;
  type?: string;
  type?: string;
  type?: string;
  type?: string;
  pdfUrl?: string;
  status?: 'draft' | 'generated' | 'sent' | 'archived';
  notes?: string;
  generatedAt?: string;
  generatedBy?: string; // Ref: User
  periodStart?: any;
  createdAt: string;
  updatedAt: string;
}

export interface StatusSubscriber {
  _id: string;
  email: string;
  phone?: string;
  type?: string;
  type?: string;
  isVerified?: boolean;
  verificationToken?: string;
  verifiedAt?: string;
  isActive?: boolean;
  unsubscribedAt?: string;
  unsubscribeToken?: string;
  preferences?: boolean;
  subscriptionSource?: 'status_page' | 'api' | 'manual' | 'import';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  _id: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  qty: number;
  uom: string;
  conversionFactor?: number;
  stockQty: number;
  rate?: number;
  amount?: number;
  sourceWarehouse?: string; // Ref: Warehouse
  targetWarehouse?: string; // Ref: Warehouse
  batchNo?: string;
  serialNo?: string;
  expiryDate?: string;
  stockEntryId?: string;
  entryType: 'receipt' | 'issue' | 'transfer' | 'manufacture' | 'repack' | 'material_consumption';
  postingDate?: string;
  postingTime?: string;
  fromWarehouse?: string; // Ref: Warehouse
  toWarehouse?: string; // Ref: Warehouse
  totalQty?: number;
  totalAmount?: number;
  referenceType?: string;
  referenceId?: string;
  purchaseOrderId?: string; // Ref: PurchaseOrder
  salesOrderId?: string; // Ref: SalesOrder
  status?: 'draft' | 'submitted' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  remarks?: string;
  company?: string;
  submittedBy?: string; // Ref: User
  submittedAt?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  toJSON?: any;
  toObject?: any;
  postingDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface StockLedger {
  _id: string;
  stockLedgerId?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  warehouseId: string; // Ref: Warehouse
  warehouseName?: string;
  postingDate: string;
  postingTime?: string;
  voucherType: string;
  voucherId: string;
  voucherNo?: string;
  actualQty: number;
  qtyAfterTransaction?: number;
  incomingRate?: number;
  outgoingRate?: number;
  valuationRate?: number;
  stockValue?: number;
  stockValueDifference?: number;
  batchNo?: string;
  serialNo?: string;
  company?: string;
  toJSON?: any;
  toObject?: any;
  sort?: any;
  group?: any;
  replaceRoot?: any;
  totalQty?: any;
  totalValue?: any;
  warehouses?: any;
  createdAt: string;
  updatedAt: string;
}

export interface StockReconciliation {
  _id: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  warehouseId: string; // Ref: Warehouse
  currentQty?: number;
  qty: number;
  quantityDifference?: number;
  currentValuationRate?: number;
  valuationRate?: number;
  currentAmount?: number;
  amount?: number;
  amountDifference?: number;
  reconciliationId?: string;
  postingDate?: string;
  postingTime?: string;
  status?: 'draft' | 'submitted' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  remarks?: string;
  company?: string;
  submittedBy?: string; // Ref: User
  submittedAt?: string;
  cancelledBy?: string; // Ref: User
  cancelledAt?: string;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractingOrder {
  _id: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
  amount?: number;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  requiredQty: number;
  transferredQty?: number;
  consumedQty?: number;
  returnedQty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
  sourceWarehouse?: string; // Ref: Warehouse
  batchNo?: string;
  serialNo?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  qty: number;
  receivedQty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
  targetWarehouse?: string; // Ref: Warehouse
  batchNo?: string;
  serialNo?: string;
  subcontractingOrderId?: string;
  orderNumber: string;
  supplierId: string; // Ref: Supplier
  supplierName: string;
  orderDate: string;
  requiredDate?: string;
  supplierWarehouse?: string; // Ref: Warehouse
  rawMaterialWarehouse?: string; // Ref: Warehouse
  finishedGoodsWarehouse?: string; // Ref: Warehouse
  totalServiceCost?: number;
  totalRawMaterialCost?: number;
  grandTotal?: number;
  currency?: string;
  status?: 'draft' | 'submitted' | 'partially_received' | 'completed' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  percentReceived?: number;
  purchaseOrderId?: string; // Ref: PurchaseOrder
  remarks?: string;
  company?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractingReceipt {
  _id: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  qty: number;
  uom?: string;
  rate?: number;
  amount?: number;
  warehouse?: string; // Ref: Warehouse
  batchNo?: string;
  serialNo?: string;
  acceptedQty?: number;
  rejectedQty?: number;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  qty: number;
  uom?: string;
  warehouse?: string; // Ref: Warehouse
  batchNo?: string;
  serialNo?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  qty: number;
  uom?: string;
  batchNo?: string;
  serialNo?: string;
  receiptId?: string;
  receiptNumber?: string;
  subcontractingOrderId: string; // Ref: SubcontractingOrder
  orderNumber: string;
  supplierId: string; // Ref: Supplier
  supplierName: string;
  postingDate: string;
  type?: string;
  totalAmount?: number;
  status?: 'draft' | 'submitted' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  remarks?: string;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractingSettings {
  _id: string;
  defaultSupplierWarehouse?: string; // Ref: Warehouse
  defaultRawMaterialWarehouse?: string; // Ref: Warehouse
  defaultFinishedGoodsWarehouse?: string; // Ref: Warehouse
  autoCreateReceipt?: boolean;
  trackReturnedMaterials?: boolean;
  requireQualityInspection?: boolean;
  lastUpdatedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  _id: string;
  planId: 'free' | 'starter' | 'professional' | 'enterprise';
  status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused' | 'incomplete';
  billingCycle?: 'monthly' | 'yearly';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  cancellationReason?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage?: number;
  partialFilterExpression?: any;
  plan?: any;
  currentPeriod?: any;
  usage?: any;
  status?: any;
  trialEnd?: any;
  currentPeriodEnd?: any;
  trialEnd?: any;
  currentPeriodEnd?: any;
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  project?: any;
  count?: any;
  sum?: any;
  sum?: any;
  project?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  _id: string;
  planId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  name?: string;
  nameAr?: string;
  included?: boolean;
  limits?: number;
  featureFlags?: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripeProductId?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  trialDays?: number;
  fromPlan?: any;
  toPlan?: any;
  pricing?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessionPlan {
  _id: string;
  factor?: 'revenue_impact' | 'operational_impact' | 'client_impact' | 'regulatory_impact' | 'strategic_importance' | 'unique_expertise' | 'hard_to_replace' | 'succession_gap';
  rating?: number;
  weight?: number;
  justification?: string;
  area?: 'revenue' | 'operations' | 'clients' | 'team_morale' | 'strategy' | 'compliance' | 'reputation' | 'innovation';
  impactDescription?: string;
  severity?: 'high' | 'medium' | 'low';
  quantifiableImpact?: any;
  factor?: 'incumbent_retirement' | 'incumbent_health' | 'flight_risk' | 'no_successors' | 'long_time_to_fill' | 'competitive_market' | 'unique_skills' | 'institutional_knowledge';
  riskRating?: 'high' | 'medium' | 'low';
  mitigation?: string;
  factor?: 'technical_skills' | 'leadership_skills' | 'experience' | 'competencies' | 'cultural_fit' | 'performance_history' | 'potential';
  currentLevel?: 'below' | 'meets' | 'exceeds';
  targetLevel?: 'below' | 'meets' | 'exceeds';
  gap?: 'large' | 'moderate' | 'small' | 'none';
  rating?: number;
  comments?: string;
  gapType?: 'education' | 'experience' | 'skill' | 'competency' | 'certification';
  gapDescription?: string;
  severity?: 'critical' | 'important' | 'minor';
  bridgeable?: boolean;
  timeToClose?: number;
  developmentPlan?: string;
  objectiveId?: string;
  objective?: string;
  objectiveAr?: string;
  objectiveType?: 'skill_development' | 'experience_gain' | 'knowledge_acquisition' | 'competency_building' | 'exposure' | 'certification';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  targetDate?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  completionPercentage?: number;
  owner?: string;
  activityId?: string;
  activityType?: 'training' | 'mentoring' | 'coaching' | 'job_rotation' | 'stretch_assignment' | 'acting_role' | 'shadowing' | 'special_project' | 'education' | 'certification';
  activityDescription?: string;
  skillsTargeted?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  cost?: number;
  effectiveness?: 'high' | 'medium' | 'low';
  assignmentName?: string;
  assignmentType?: 'project_lead' | 'task_force' | 'committee' | 'cross_functional' | 'new_initiative';
  endDate?: string;
  skillsDeveloped?: string;
  outcome?: string;
  successLevel?: 'exceeded' | 'met' | 'below';
  successorId?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  currentJobTitle?: string;
  currentDepartment?: string;
  currentJobLevel?: string;
  targetJobLevel?: string;
  levelGap?: number;
  readinessAssessment?: 'ready_now' | 'ready_1_year' | 'ready_2_3_years' | 'ready_4_5_years' | 'long_term' | 'not_ready';
  successorRanking?: 'primary' | 'backup' | 'emergency' | 'long_term';
  overallMatch?: number;
  educationMatch?: 'exceeds' | 'meets' | 'gaps';
  experienceMatch?: 'exceeds' | 'meets' | 'gaps';
  skillsMatch?: 'exceeds' | 'meets' | 'gaps';
  competenciesMatch?: 'exceeds' | 'meets' | 'gaps';
  strengthArea?: string;
  strengthDescription?: string;
  advantage?: 'significant' | 'moderate' | 'slight';
  currentPerformance?: boolean[];
  potential?: 'high' | 'medium' | 'low';
  trackRecord?: boolean;
  developmentPlan?: boolean;
  hasMentor?: boolean;
  mentorId?: string; // Ref: Employee
  mentorName?: string;
  mentoringStartDate?: string;
  mentoringFrequency?: string;
  mentoringFocus?: string;
  hasCoach?: boolean;
  coachType?: 'internal' | 'external';
  coachName?: string;
  coachingFocus?: string;
  sponsorship?: boolean; // Ref: Employee
  experienceBuilding?: any;
  indicator?: string;
  evidence?: string;
  concern?: string;
  severity?: 'high' | 'medium' | 'low';
  mitigation?: string;
  redFlag?: string;
  blocking?: boolean;
  resolution?: string;
  geographicMobility?: boolean;
  willingToRelocate?: boolean;
  relocateLocations?: string;
  relocationRestrictions?: string;
  availability?: boolean;
  travelWillingness?: boolean;
  travelLimitations?: string;
  interestCommitment?: 'high' | 'medium' | 'low' | 'unknown';
  riskFactors?: 'high' | 'medium' | 'low'[];
  assessmentNotes?: 'high' | 'medium' | 'low';
  knowledgeArea?: string;
  criticalityLevel?: 'critical' | 'important' | 'nice_to_have';
  currentDocumentation?: 'complete' | 'partial' | 'minimal' | 'none';
  documentationGap?: 'high' | 'medium' | 'low' | 'none';
  transferMethod?: 'documentation' | 'mentoring' | 'shadowing' | 'training' | 'job_rotation' | 'multiple';
  transferTimeline?: number;
  transferStatus?: 'not_started' | 'in_progress' | 'completed';
  transferProgress?: number;
  scenarioType?: 'sudden_departure' | 'illness' | 'death' | 'termination' | 'other';
  scenarioDescription?: string;
  likelihood?: 'high' | 'medium' | 'low';
  impact?: 'severe' | 'significant' | 'moderate' | 'minimal';
  emergencySuccessor?: 'acting' | 'interim' | 'permanent'; // Ref: Employee
  action?: string;
  actionType?: 'immediate' | 'short_term' | 'medium_term';
  responsible?: string;
  timeline?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  communicationPlan?: any;
  actionId?: string;
  actionType?: 'development' | 'recruitment' | 'retention' | 'knowledge_transfer' | 'documentation' | 'assessment' | 'communication' | 'policy_change';
  actionDescription?: string;
  actionDescriptionAr?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  responsible?: string;
  responsibleRole?: string;
  targetDate?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  completionDate?: string;
  progress?: number;
  budget?: number;
  dependencies?: string;
  risks?: string;
  outcomes?: string;
  reviewId?: string;
  reviewDate?: string;
  reviewType?: 'quarterly' | 'semi_annual' | 'annual' | 'ad_hoc' | 'talent_review';
  reviewedBy?: string; // Ref: User
  reviewerName?: string;
  reviewerTitle?: string;
  reviewFindings?: string;
  changesRecommended?: boolean;
  recommendedChanges?: string;
  actionItems?: string;
  nextReviewDate?: string;
  reviewDocument?: string;
  documentType?: 'succession_plan' | 'readiness_assessment' | 'development_plan' | 'knowledge_transfer_plan' | 'emergency_plan' | 'talent_review' | 'approval_document' | 'org_chart' | 'competency_matrix' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  version?: string;
  effectiveDate?: string;
  expiryDate?: string;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  confidential?: boolean;
  accessLevel?: 'restricted' | 'management' | 'hr' | 'public';
  communicationId?: string;
  communicationType?: 'email' | 'meeting' | 'presentation' | 'memo' | 'portal_update';
  date?: string;
  purpose?: 'plan_announcement' | 'successor_notification' | 'development_plan' | 'progress_update' | 'transition_announcement' | 'stakeholder_update';
  audience?: 'incumbent' | 'successors' | 'management' | 'board' | 'hr' | 'department' | 'all';
  confidential?: boolean;
  communicatedBy?: string;
  subject?: string;
  message?: string;
  attachments?: string;
  responseRequired?: boolean;
  successionPlanId?: string;
  planNumber?: string;
  planName?: string;
  planNameAr?: string;
  planType?: 'position_specific' | 'department_wide' | 'enterprise_wide' | 'leadership_pipeline' | 'critical_roles' | 'emergency';
  planScope?: 'single_position' | 'multiple_positions' | 'job_family' | 'organizational_unit' | 'entire_organization';
  planningHorizon?: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  planningPeriod?: any;
  planOwner?: string; // Ref: Employee
  planPurpose?: string;
  planPurposeAr?: string;
  businessJustification?: string;
  reviewFrequency?: 'quarterly' | 'semi_annual' | 'annual' | 'biennial' | 'as_needed';
  lastReviewDate?: string;
  nextReviewDate?: string;
  reviewedBy?: string;
  positionId?: string; // Ref: JobPosition
  positionNumber?: string;
  positionTitle?: string;
  positionTitleAr?: string;
  jobLevel?: string;
  jobGrade?: string;
  departmentId?: string; // Ref: OrganizationalUnit
  departmentName?: string;
  divisionId?: string; // Ref: OrganizationalUnit
  divisionName?: string;
  businessUnit?: string;
  location?: string;
  positionType?: 'executive' | 'senior_management' | 'management' | 'professional' | 'technical' | 'specialized';
  reportsTo?: string; // Ref: JobPosition
  directReports?: number;
  indirectReports?: number;
  criticalityAssessment?: 'critical' | 'important' | 'standard' | 'low';
  impactOfVacancy?: 'severe' | 'significant' | 'moderate' | 'minimal';
  riskLevel?: 'high' | 'medium' | 'low';
  estimatedTimeToReplace?: 'historical_data' | 'market_analysis' | 'expert_estimate';
  costOfVacancy?: any;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  currentJobTitle?: string;
  dateInPosition?: string;
  tenureInPosition?: number;
  dateInOrganization?: string;
  totalTenure?: number;
  dateOfBirth?: string;
  currentAge?: number;
  retirementEligibility?: 'high' | 'medium' | 'low';
  currentPerformance?: 'improving' | 'stable' | 'declining';
  potentialRating?: 'high' | 'medium' | 'low';
  promotable?: boolean;
  promotabilityTimeline?: string;
  nineBoxPosition?: 'high' | 'medium' | 'low';
  flightRisk?: 'high' | 'medium' | 'low';
  factor?: 'compensation' | 'career_growth' | 'engagement' | 'market_demand' | 'personal_circumstances' | 'offers_received';
  riskLevel?: 'high' | 'medium' | 'low';
  strategy?: string;
  strategyType?: 'compensation' | 'recognition' | 'development' | 'special_project' | 'promotion' | 'flexibility';
  implemented?: boolean;
  implementationDate?: string;
  effectiveness?: 'high' | 'medium' | 'low';
  retentionPlan?: boolean;
  expertiseArea?: string;
  criticalityLevel?: 'critical' | 'important' | 'nice_to_have';
  replaceability?: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
  documentationLevel?: 'well_documented' | 'partially_documented' | 'poorly_documented' | 'not_documented';
  institutionalKnowledge?: 'easy' | 'moderate' | 'difficult';
  relationships?: 'easy' | 'moderate' | 'difficult';
  successionDiscussed?: boolean;
  discussionDate?: string;
  willingToMentor?: boolean;
  employeeName?: string;
  employeeId?: string; // Ref: Employee
  recommendation?: string;
  knowledgeTransferPlan?: boolean;
  transitionTimeline?: boolean;
  successorsCount?: number;
  readyNowCount?: number;
  overallBenchStrength?: 'strong' | 'adequate' | 'weak' | 'none';
  benchStrengthRating?: number;
  readinessDistribution?: number;
  highQuality?: number;
  mediumQuality?: number;
  developingQuality?: number;
  averageReadinessScore?: number;
  diversityOfSuccessors?: boolean;
  hasGaps?: boolean;
  gapType?: 'no_successors' | 'no_ready_successors' | 'quality_gap' | 'diversity_gap' | 'experience_gap' | 'skill_gap';
  gapDescription?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  mitigation?: string;
  targetDate?: string;
  criticalGaps?: number;
  benchStrengthVsTarget?: boolean;
  employeeId?: string; // Ref: Employee
  employeeName?: string;
  currentRole?: string;
  poolCategory?: 'high_potential' | 'key_talent' | 'subject_matter_expert' | 'emerging_leader' | 'technical_expert';
  readinessForTargetRole?: string;
  developmentStage?: 'early' | 'mid' | 'advanced';
  addedToPoolDate?: string;
  poolStatus?: 'active' | 'graduated' | 'exited';
  poolManagement?: 'healthy' | 'adequate' | 'at_risk';
  knowledgeTransferRequired?: boolean;
  planExists?: boolean;
  planStartDate?: string;
  targetCompletionDate?: string;
  activityType?: 'documentation' | 'meeting' | 'training_session' | 'shadowing' | 'handover' | 'review';
  activityDescription?: string;
  knowledgeArea?: string;
  scheduledDate?: string;
  duration?: number;
  participants?: string;
  completed?: boolean;
  completionDate?: string;
  effectiveness?: 'high' | 'medium' | 'low';
  overallProgress?: number;
  onSchedule?: boolean;
  risk?: string;
  mitigation?: string;
  documentsRequired?: number;
  documentsCompleted?: number;
  documentType?: 'process' | 'procedure' | 'contact_list' | 'system_guide' | 'decision_matrix' | 'best_practices' | 'other';
  documentName?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'reviewed';
  completionDate?: string;
  documentUrl?: string;
  quality?: 'excellent' | 'good' | 'adequate' | 'poor';
  documentationComplete?: boolean;
  relationshipType?: 'client' | 'vendor' | 'partner' | 'regulator' | 'internal_stakeholder' | 'team_member';
  contactName?: string;
  organization?: string;
  relationshipImportance?: 'critical' | 'important' | 'moderate';
  transferMethod?: 'introduction_meeting' | 'joint_calls' | 'handoff_memo' | 'gradual_transition';
  transferred?: boolean;
  transferDate?: string;
  transitionQuality?: 'smooth' | 'adequate' | 'difficult';
  totalRelationships?: number;
  transferredRelationships?: number;
  transferProgress?: number;
  emergencyPlanExists?: boolean;
  emergencyReadiness?: 'high' | 'medium' | 'low';
  isLawFirmPosition?: boolean;
  partnerTier?: 'equity_partner' | 'non_equity_partner' | 'senior_associate' | 'counsel';
  partnerTrack?: boolean;
  trackTimeline?: number;
  criterion?: 'origination' | 'billable_hours' | 'realization_rate' | 'client_development' | 'practice_area_expertise' | 'leadership';
  requirement?: string;
  currentStatus?: 'meets' | 'approaching' | 'needs_development';
  partnerVote?: boolean;
  hasBook?: boolean;
  totalBookValue?: number;
  clientCount?: number;
  originationCredits?: number;
  transitionRequired?: boolean;
  clientName?: string;
  annualBillings?: number;
  relationshipLength?: number;
  relationshipStrength?: 'strong' | 'moderate' | 'weak';
  transitionPlan?: 'introduction' | 'co_counsel' | 'gradual_handoff' | 'immediate';
  transitionStatus?: 'not_started' | 'in_progress' | 'completed';
  clientRetentionRisk?: 'high' | 'medium' | 'low';
  estimatedClientRetention?: number;
  originationTransfer?: 'immediate' | 'gradual' | 'shared_credit' | 'retain_credit';
  practiceArea?: string;
  criticalToFirm?: boolean;
  totalAttorneys?: number;
  seniorAttorneys?: number;
  attorneyName?: string;
  yearsInPracticeArea?: number;
  expertiseLevel?: 'developing' | 'competent' | 'expert';
  readinessForLeadership?: string;
  adequateCoverage?: boolean;
  knowledgePreservation?: boolean;
  marketPosition?: 'leading' | 'strong' | 'developing';
  isRainmaker?: boolean;
  annualOriginationTarget?: number;
  actualOrigination?: number;
  networkStrength?: 'exceptional' | 'strong' | 'moderate' | 'limited';
  attorneyName?: string;
  currentOriginationPerformance?: number;
  networkBuilding?: 'strong' | 'developing' | 'needs_work';
  industryReputation?: 'established' | 'building' | 'early';
  mentoringProvided?: boolean;
  transitionStrategy?: string;
  firmSupportRequired?: string;
  role?: 'managing_partner' | 'practice_group_leader' | 'office_managing_partner' | 'department_head' | 'committee_chair';
  roleDescription?: string;
  termLength?: number;
  termExpiry?: string;
  electionProcess?: string;
  candidateName?: string;
  qualifications?: string;
  firmSupport?: 'strong' | 'moderate' | 'limited';
  overallStrategy?: string;
  strategicPriorities?: string;
  totalActions?: number;
  completedActions?: number;
  planProgress?: number;
  onTrack?: boolean;
  blocker?: string;
  impact?: 'high' | 'medium' | 'low';
  resolution?: string;
  nextMilestone?: any;
  coverageMetrics?: boolean;
  readyNowPercentage?: number;
  averageReadinessTime?: number;
  readinessGap?: number;
  readinessImprovement?: 'improving' | 'stable' | 'declining';
  qualityMetrics?: any;
  developmentMetrics?: any;
  riskMetrics?: any;
  effectivenessMetrics?: any;
  lastReviewDate?: string;
  nextReviewDate?: string;
  approvalLevel?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  approverTitle?: string;
  approvalRequired?: boolean;
  approved?: boolean;
  approvalDate?: string;
  conditions?: string;
  comments?: string;
  finalApproval?: boolean;
  finalApprovalDate?: string;
  finalApprovedBy?: string;
  planStatus?: 'draft' | 'under_review' | 'approved' | 'active' | 'archived' | 'expired';
  statusDate?: string;
  notes?: any;
  internalNotes?: string;
  relatedRecords?: string[]; // Ref: JobPosition
  planStatus?: any;
  planStatus?: any;
  planStatus?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  _id: string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  supplierId?: string;
  name: string;
  nameAr?: string;
  supplierType?: 'company' | 'individual';
  supplierGroup?: string;
  taxId?: string;
  crNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  bankName?: string;
  bankAccountNo?: string;
  iban?: string;
  paymentTerms?: string;
  currency?: string;
  defaultPriceList?: string;
  status?: 'active' | 'inactive' | 'blocked';
  disabled?: boolean;
  type?: string;
  notes?: string;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierGroup {
  _id: string;
  name: string;
  nameAr?: string;
  parentGroup?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuotation {
  _id: string;
  itemId?: string; // Ref: Item
  itemCode?: string;
  itemName?: string;
  qty: number;
  rate: number;
  amount?: number;
  leadTimeDays?: number;
  quotationId?: string;
  rfqId: string; // Ref: RFQ
  supplierId: string; // Ref: Supplier
  supplierName?: string;
  quotationDate?: string;
  validTill?: string;
  totalAmount?: number;
  status?: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'expired';
  status?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SupportSLA {
  _id: string;
  start: string;
  end: string;
  timezone?: string;
  slaId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  supportType?: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  workingHours?: any;
  type?: number;
  validate?: any;
  type?: string;
  warningThreshold?: number;
  isDefault?: boolean;
  status: 'active' | 'inactive';
  applicableTicketTypes?: string[];
  applicableChannels?: string[];
  escalationEnabled?: boolean;
  level: number;
  percentageOfTarget: number;
  type?: string;
  notifyRoles?: string[];
  toJSON?: any;
  toObject?: any;
  partialFilterExpression?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SupportSettings {
  _id: string;
  name: string;
  priority?: number;
  enabled?: boolean;
  conditions?: string[];
  assignmentType?: 'round_robin' | 'load_balanced' | 'specific_agent' | 'skill_based' | 'random';
  type?: string;
  assignToRoles?: string[];
  enabled?: boolean;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  notifyOnNew?: boolean;
  notifyOnAssigned?: boolean;
  notifyOnReply?: boolean;
  notifyOnResolved?: boolean;
  notifyOnClosed?: boolean;
  notifyOnSLABreach?: boolean;
  customerEmailTemplate?: string;
  agentEmailTemplate?: string;
  start?: string;
  end?: string;
  timezone?: string;
  enabled?: boolean;
  allowTicketCreation?: boolean;
  allowAttachments?: boolean;
  maxAttachmentSize?: number;
  allowedFileTypes?: string[];
  requireAuthentication?: boolean;
  showKnowledgeBase?: boolean;
  showFAQ?: boolean;
  autoCloseResolved?: boolean;
  autoResponseEnabled?: boolean;
  autoResponseMessage?: string;
  satisfactionSurvey?: boolean;
  aiAssistant?: boolean;
  defaultSlaId?: string; // Ref: SupportSLA
  autoAssignTickets?: boolean;
  autoAssignmentRules?: any[];
  defaultAssignee?: string; // Ref: User
  ticketPrefixFormat?: string;
  ticketNumberingStartFrom?: number;
  emailNotifications?: any;
  workingHours?: any;
  type?: number;
  validate?: any;
  holidays?: string[];
  customerPortal?: any;
  automation?: any;
  defaultPriority?: 'low' | 'medium' | 'high' | 'urgent';
  priorityEscalation?: boolean;
  enabledTicketTypes?: string[];
  defaultTags?: string[];
  requiredFields?: string[];
  integrations?: boolean;
  branding?: string;
  allowDuplicateTickets?: boolean;
  duplicateDetectionEnabled?: boolean;
  mergeTicketsEnabled?: boolean;
  internalNotesEnabled?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  _id: string;
  questionId: string;
  questionText: string;
  questionTextAr?: string;
  questionType: 'rating' | '// 1-5 or 1-10 scale
            nps' | '// Net Promoter Score (0-10)
            multiple_choice' | '// Single select
            checkbox' | '// Multi select
            text' | '// Free text
            yes_no' | '// Yes/No
            scale' | '// Custom scale (e.g.' | 'strongly agree to strongly disagree)
            ranking' | '// Rank items
            matrix' | '// Matrix/grid questions
            date              // Date picker';
  category?: 'engagement' | 'satisfaction' | 'culture' | 'leadership' | 'growth' | 'compensation' | 'work_life_balance' | 'communication' | 'teamwork' | 'recognition' | 'diversity' | 'safety' | 'onboarding' | 'exit' | 'custom';
  value: string;
  label: string;
  labelAr?: string;
  weight?: number;
  scaleConfig?: number;
  required?: boolean;
  enabled?: boolean;
  showIf?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  helpText?: string;
  helpTextAr?: string;
  order?: number;
  templateId?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  surveyType: 'engagement' | '// Annual/semi-annual engagement
            pulse' | '// Quick pulse checks
            onboarding' | '// New hire surveys
            exit' | '// Exit interviews
            360_feedback' | '// 360 degree feedback
            satisfaction' | '// General satisfaction
            culture' | '// Culture assessment
            custom           // Custom surveys';
  sectionId?: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  questionIds?: string;
  order?: number;
  enabled?: boolean;
  maxScore?: number;
  benchmarks?: number;
  settings?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  surveyId?: string;
  templateId?: string; // Ref: SurveyTemplate
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  surveyType: 'engagement' | 'pulse' | 'onboarding' | 'exit' | '360_feedback' | 'satisfaction' | 'culture' | 'custom';
  sectionId?: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  questionIds?: string;
  order?: number;
  status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'closed' | 'archived';
  startDate?: string;
  endDate?: string;
  reminderFrequency?: 'none' | 'daily' | 'every_2_days' | 'weekly';
  lastReminderSent?: string;
  targetAudience?: 'all' | 'department' | 'role' | 'custom'[]; // Ref: Department
  settings?: boolean;
  scoring?: boolean;
  statistics?: number;
  npsAnalytics?: 'improving' | 'stable' | 'declining' | 'new';
  enpsAnalytics?: number;
  overallSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  sentimentScore?: number;
  totalTextResponses?: number;
  analyzedResponses?: number;
  positiveCount?: number;
  neutralCount?: number;
  negativeCount?: number;
  theme?: string;
  themeAr?: string;
  count?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sampleQuotes?: string;
  word?: string[];
  count?: number;
  word?: string[];
  count?: number;
  word?: string[];
  weight?: number;
  category?: 'engagement' | 'satisfaction' | 'culture' | 'leadership' | 'growth' | 'compensation' | 'work_life_balance' | 'communication' | 'teamwork' | 'recognition' | 'diversity' | 'safety' | 'onboarding' | 'exit' | 'custom';
  categoryLabel?: string;
  categoryLabelAr?: string;
  totalQuestions?: number;
  respondedQuestions?: number;
  avgScore?: number;
  medianScore?: number;
  minScore?: number;
  maxScore?: number;
  stdDeviation?: number;
  favorabilityRate?: number;
  benchmarkDiff?: number;
  previousScore?: number;
  trend?: 'up' | 'same' | 'down';
  demographicAnalysis?: any;
  benchmarks?: any;
  period?: string;
  surveyId?: string;
  avgScore?: number;
  npsScore?: number;
  responseRate?: number;
  category?: string;
  score?: number;
  actionId?: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
  assignedTo?: string; // Ref: User
  assignedToName?: string;
  dueDate?: string;
  completedDate?: string;
  relatedQuestionIds?: string;
  notes?: string;
  impact?: 'high' | 'medium' | 'low';
  effort?: 'high' | 'medium' | 'low';
  createdAt?: string;
  responseId?: string;
  surveyId: string; // Ref: Survey
  respondentId?: string; // Ref: Employee
  isAnonymous?: boolean;
  respondentMetadata?: any;
  questionId: string;
  questionType?: string;
  textResponse?: string;
  selectedOptions?: string;
  rating?: number;
  ranking?: string;
  rowId?: string;
  columnId?: string;
  skipped?: boolean;
  answeredAt?: string;
  status?: 'in_progress' | 'completed' | 'abandoned';
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
  timeSpentSeconds?: number;
  totalScore?: number;
  scorePercentage?: number;
  category?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  sentimentAnalysis?: 'positive' | 'neutral' | 'negative';
  inc?: any;
  inc?: any;
  inc?: any;
  surveyId: string; // Ref: Survey
  employeeId: string; // Ref: Employee
  email?: string;
  employeeName?: string;
  department?: string;
  departmentId?: string;
  status?: 'pending' | 'sent' | 'opened' | 'started' | 'completed' | 'expired' | 'opted_out';
  invitedAt?: string;
  sentAt?: string;
  openedAt?: string;
  startedAt?: string;
  completedAt?: string;
  remindersSent?: number;
  lastReminderAt?: string;
  nextReminderAt?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  responseId?: string; // Ref: SurveyResponse
  optedOutAt?: string;
  optOutReason?: string;
  startDate?: any;
  endDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SyncedBlock {
  _id: string;
  originalBlockId: string; // Ref: CaseNotionBlock
  originalPageId: string; // Ref: CaseNotionPage
  pageId?: string; // Ref: CaseNotionPage
  blockId?: string; // Ref: CaseNotionBlock
  properties?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SystemComponent {
  _id: string;
  name: string;
  description?: string;
  category: 'core' | 'api' | 'integration' | 'database' | 'storage' | 'third_party';
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  isPublic?: boolean;
  healthCheckUrl?: string;
  lastCheckedAt?: string;
  responseTime?: number;
  uptimePercent?: number;
  order?: number;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
  color?: string;
  type?: string;
  usageCount?: number;
  isActive?: boolean;
  inc?: any;
  inc?: any;
  usageCount?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  completed?: boolean;
  completedAt?: string;
  autoReset?: boolean;
  order?: number;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  userId?: string; // Ref: User
  notes?: string;
  isBillable?: boolean;
  title: string;
  text?: string;
  completed?: boolean;
  completedAt?: string;
  type?: 'due_date' | 'start_date' | 'custom';
  beforeMinutes: number;
  sent?: boolean;
  sentAt?: string;
  userId: string; // Ref: User
  content: string;
  type?: string[];
  createdAt?: string;
  updatedAt?: string;
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string; // Ref: User
  uploadedAt?: string;
  storageType?: 'local' | 's3';
  isEditable?: boolean;
  documentContent?: string;
  contentFormat?: 'html' | 'tiptap-json' | 'markdown';
  lastEditedBy?: string; // Ref: User
  lastEditedAt?: string;
  isVoiceMemo?: boolean;
  duration?: number;
  transcription?: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed' | 'reopened' | 'commented' | 'attachment_added' | 'attachment_removed' | 'subtask_added' | 'subtask_completed' | 'subtask_uncompleted' | 'subtask_deleted' | 'dependency_added' | 'dependency_removed' | 'created_from_template' | 'archived' | 'unarchived' | 'cloned' | 'reordered' | 'rescheduled' | 'timer_paused' | 'timer_resumed' | 'time_reset';
  userId?: string; // Ref: User
  userName?: string;
  details?: string;
  timestamp?: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  type: 'create_task' | 'update_field' | 'send_notification' | 'assign_user';
  taskTemplate?: string; // Ref: User
  field?: string;
  notificationType?: string;
  type?: string[];
  name: string;
  trigger: 'status_change' | 'completion' | 'due_date_passed';
  isActive?: boolean;
  taskId: string; // Ref: Task
  type?: 'blocks' | 'blocked_by' | 'related';
  title?: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';
  priority?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  label?: 'bug' | 'feature' | 'documentation' | 'enhancement' | 'question' | 'legal' | 'administrative' | 'urgent';
  type?: string[];
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  assignedTo?: string; // Ref: User
  caseId?: string; // Ref: Case
  clientId?: string; // Ref: User
  linkedEventId?: string; // Ref: Event
  parentTaskId?: string; // Ref: Task
  timeTracking?: number;
  recurring?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'[]; // Ref: User
  points?: number;
  progress?: number;
  manualProgress?: boolean;
  completedAt?: string;
  completedBy?: string; // Ref: User
  notes?: string;
  isTemplate?: boolean;
  templateId?: string; // Ref: Task
  isPublic?: boolean;
  templateName?: string;
  type?: string[];
  type?: string[];
  outcome?: 'successful' | 'unsuccessful' | 'appealed' | 'settled' | 'dismissed' | 'null';
  outcomeNotes?: string;
  outcomeDate?: string;
  budget?: number;
  taskType?: 'general' | 'court_hearing' | 'document_review' | 'client_meeting' | 'filing_deadline' | 'appeal_deadline' | 'discovery' | 'deposition' | 'mediation' | 'settlement' | 'research' | 'drafting' | 'other';
  cycleId?: string; // Ref: Cycle
  rolledOverFrom?: string; // Ref: Cycle
  rolloverCount?: number;
  lifecycleInstanceId?: string; // Ref: LifecycleInstance
  lifecycleTaskRef?: string;
  createdByAutomation?: boolean;
  automationId?: string; // Ref: Automation
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string; // Ref: User
  sortOrder?: number;
  location?: string; // Ref: UserLocation
  locationTrigger?: 'arrive' | 'leave' | 'nearby';
  calendarSync?: 'synced' | 'pending' | 'failed' | 'not_synced';
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  status?: any;
  dueDate?: any;
  status?: any;
  dueDate?: any;
  completedAt?: any;
  byStatus?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDocumentVersion {
  _id: string;
  taskId: string; // Ref: Task
  documentId: string;
  version: number;
  title: string;
  documentContent?: string;
  documentJson?: any;
  contentFormat?: 'html' | 'tiptap-json' | 'markdown';
  fileSize?: number;
  editedBy: string; // Ref: User
  changeNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamActivityLog {
  _id: string;
  field: string;
  oldValue?: any;
  newValue?: any;
  userId: string; // Ref: User
  userEmail?: string;
  userName?: string;
  targetType: 'case' | 'client' | 'invoice' | 'document' | 'task' | 'staff' | 'setting' | 'payment' | 'expense' | 'report';
  targetId?: string;
  targetName?: string;
  action: '// CRUD operations
            create' | 'read' | 'update' | 'delete' | '// Team management
            invite' | 'accept_invite' | 'revoke_invite' | 'resend_invite' | 'suspend' | 'activate' | 'depart' | 'reinstate' | '// Permission changes
            update_permissions' | 'update_role' | '// Approval workflow
            approve' | 'reject' | 'request_approval' | '// Authentication
            login' | 'logout' | 'password_reset' | '// Data operations
            export' | 'share' | 'import';
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'null';
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectionReason?: string;
  status?: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  timestamp: string;
  pagination?: any;
  timestamp?: any;
  group?: any;
  sort?: any;
  group?: any;
  sort?: any;
  lookup?: any;
  project?: any;
  count?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramIntegration {
  _id: string;
  chatId: string;
  chatType?: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  addedAt?: string;
  isActive?: boolean;
  caseCreated?: boolean;
  caseUpdated?: boolean;
  caseStatusChanged?: boolean;
  caseAssigned?: boolean;
  caseHearing?: boolean;
  caseDeadline?: boolean;
  invoiceCreated?: boolean;
  invoicePaid?: boolean;
  invoiceOverdue?: boolean;
  invoicePartiallyPaid?: boolean;
  taskCreated?: boolean;
  taskAssigned?: boolean;
  taskDue?: boolean;
  taskCompleted?: boolean;
  taskOverdue?: boolean;
  paymentReceived?: boolean;
  paymentFailed?: boolean;
  clientCreated?: boolean;
  clientMessageReceived?: boolean;
  leadCreated?: boolean;
  leadConverted?: boolean;
  leadStatusChanged?: boolean;
  documentUploaded?: boolean;
  documentShared?: boolean;
  systemAlerts?: boolean;
  dailySummary?: boolean;
  weeklySummary?: boolean;
  botToken: string;
  botUsername?: string;
  botName?: string;
  botId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookSetAt?: string;
  defaultChatId?: string;
  notificationSettings?: any;
  businessHoursOnly?: boolean;
  startHour?: number;
  endHour?: number;
  timezone?: string;
  type?: number;
  validate?: any;
  enabledCommands?: boolean;
  isActive?: boolean;
  connectedAt?: string;
  disconnectedAt?: string;
  lastMessageSentAt?: string;
  lastMessageReceivedAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  stats?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemporaryIPAllowance {
  _id: string;
  ipAddress: string;
  description?: string;
  expiresAt: string;
  durationHours: '24' | '168' | '720';
  isActive?: boolean;
  revokedAt?: string;
  revokedBy?: string; // Ref: User
  revocationReason?: string;
  lastUsedAt?: string;
  usageCount?: number;
  expiresAt?: any;
  expiresAt?: any;
  expiresAt?: any;
  set?: any;
  expiresAt?: any;
  expiresAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Territory {
  _id: string;
  year: number;
  quarter?: number;
  month?: number;
  annualRevenue?: number;
  quarterlyRevenue?: number;
  monthlyLeads?: number;
  achievedRevenue?: number;
  achievedLeads?: number;
  totalClients?: number;
  totalLeads?: number;
  totalRevenue?: number;
  pipelineValue?: number;
  lastUpdated?: string;
  territoryId?: string;
  name: string;
  nameAr?: string;
  code?: string;
  parentTerritoryId?: string; // Ref: Territory
  level?: number;
  path?: string;
  isGroup?: boolean;
  type?: 'country' | 'region' | 'city' | 'district' | 'custom';
  saudiRegion?: 'riyadh' | '// الرياض
            makkah' | '// مكة المكرمة
            madinah' | '// المدينة المنورة
            eastern' | '// الشرقية
            asir' | '// عسير
            tabuk' | '// تبوك
            hail' | '// حائل
            northern_borders' | '// الحدود الشمالية
            jazan' | '// جازان
            najran' | '// نجران
            bahah' | '// الباحة
            jawf' | '// الجوف
            qassim            // القصيم';
  type?: string;
  type?: string;
  type?: string;
  managerId?: string; // Ref: User
  salesTeamId?: string; // Ref: SalesTeam
  type?: string;
  stats?: any;
  isActive?: boolean;
  addToSet?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadMessage {
  _id: string;
  field: string;
  field_desc: string;
  field_type: 'char' | 'integer' | 'float' | 'datetime' | 'boolean' | 'monetary' | 'selection' | 'many2one';
  old_value_char?: string;
  new_value_char?: string;
  old_value_integer?: number;
  new_value_integer?: number;
  old_value_float?: number;
  new_value_float?: number;
  old_value_datetime?: string;
  new_value_datetime?: string;
  old_value_monetary?: number;
  new_value_monetary?: number;
  currency_id?: string;
  res_model: string;
  res_id: string;
  parent_id?: string; // Ref: ThreadMessage
  message_type?: 'comment' | 'notification' | 'email' | 'activity_done' | 'stage_change' | 'auto_log' | 'note' | 'activity' | 'tracking';
  subtype?: string;
  subject?: string;
  body?: string;
  author_id: string; // Ref: User
  type?: string;
  type?: string;
  is_internal?: boolean;
  type?: string;
  email_from?: string;
  email_cc?: string;
  reply_to?: string;
  toJSON?: any;
  toObject?: any;
  populate?: any;
  pagination?: any;
  addToSet?: any;
  pull?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ThreeWayReconciliation {
  _id: string;
  clientId?: string;
  clientName?: string;
  ledgerBalance?: number;
  bookBalance?: number;
  difference?: number;
  accountId: string; // Ref: TrustAccount
  reconciliationDate: string;
  bankBalance: number;
  bookBalance: number;
  clientLedgerBalance: number;
  isBalanced: boolean;
  discrepancies?: any;
  status: 'balanced' | 'unbalanced' | 'exception';
  verifiedBy?: string; // Ref: User
  verifiedAt?: string;
  notes?: string;
  discrepancies?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  _id: string;
  communicationId: string;
  sender?: string; // Ref: User
  senderName: string;
  senderType: 'customer' | 'agent' | 'system';
  content: string;
  contentType?: 'text' | 'html';
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  sentVia?: 'email' | 'portal' | 'phone' | 'chat' | 'whatsapp';
  isInternal?: boolean;
  timestamp: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  uploadedBy?: string; // Ref: User
  ticketId: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: 'open' | 'replied' | 'resolved' | 'closed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  ticketType: 'question' | 'problem' | 'feature_request' | 'incident' | 'service_request';
  raisedBy: string; // Ref: User
  raisedByName: string;
  raisedByEmail: string;
  assignedTo?: string; // Ref: User
  assignedToName?: string;
  assignedAt?: string;
  clientId?: string; // Ref: Client
  clientName?: string;
  slaId?: string; // Ref: SLA
  slaStatus?: 'within_sla' | 'warning' | 'breached';
  firstResponseTime?: string;
  firstResponseDue?: string;
  resolutionTime?: string;
  resolutionDue?: string;
  communications?: any[];
  attachments?: any[];
  tags?: string[];
  customFields?: Record<string, any>;
  resolvedAt?: string;
  resolvedBy?: string; // Ref: User
  resolutionNotes?: string;
  closedAt?: string;
  closedBy?: string; // Ref: User
  rating?: number;
  feedback?: string;
  feedbackDate?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  status?: any;
  firstResponseDue?: any;
  resolutionDue?: any;
  group?: any;
  group?: any;
  group?: any;
  group?: any;
  match?: any;
  project?: any;
  group?: any;
  match?: any;
  project?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCommunication {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  communicationId: string;
  ticketId: string; // Ref: Ticket
  ticketNumber?: number;
  sender?: string; // Ref: User
  senderName: string;
  senderEmail?: string;
  senderType: 'customer' | 'agent' | 'system';
  content: string;
  contentType?: 'text' | 'html';
  subject?: string;
  attachments?: any[];
  sentVia?: 'email' | 'portal' | 'phone' | 'chat' | 'whatsapp' | 'api';
  isInternal?: boolean;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  isRead?: boolean;
  readAt?: string;
  readBy?: string; // Ref: User
  emailMetadata?: string;
  inReplyTo?: string; // Ref: TicketCommunication
  isFirstResponse?: boolean;
  timestamp: string;
  sentAt?: string;
  isAutomated?: boolean;
  automationSource?: string;
  aiGenerated?: boolean;
  aiMetadata?: string;
  sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  toJSON?: any;
  toObject?: any;
  senderType?: any;
  sender?: any;
  group?: any;
  group?: any;
  group?: any;
  match?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  _id: string;
  entryId?: string;
  description?: string;
  assigneeId?: string; // Ref: User
  userId?: string; // Ref: User
  clientId?: string; // Ref: Client
  caseId?: string; // Ref: Case
  date?: string;
  type?: string;
  validate?: any;
  type?: string;
  validate?: any;
  breakMinutes?: number;
  duration?: number;
  hours?: number;
  type?: string;
  validate?: any;
  timeType?: string;
  taskType?: 'consultation' | 'research' | 'document_review' | 'document_drafting' | 'court_appearance' | 'meeting' | 'phone_call' | 'email_correspondence' | 'negotiation' | 'contract_review' | 'filing' | 'travel' | 'administrative' | 'other';
  hourlyRate?: number;
  totalAmount?: number;
  isBillable?: boolean;
  isBilled?: boolean;
  billStatus?: string;
  invoiceId?: string; // Ref: Invoice
  invoicedAt?: string;
  writeOff?: boolean;
  type?: string;
  validate?: any;
  writeOffBy?: string; // Ref: User
  writeOffAt?: string;
  writeDown?: boolean;
  type?: number;
  validate?: any;
  type?: string;
  validate?: any;
  writeDownBy?: string; // Ref: User
  writeDownAt?: string;
  finalAmount?: number;
  departmentId?: string; // Ref: Department
  locationId?: string; // Ref: Location
  practiceArea?: string;
  phase?: string;
  taskId?: string; // Ref: Task
  wasTimerBased?: boolean;
  timerStartedAt?: string;
  timerPausedDuration?: number;
  status?: string;
  submittedAt?: string;
  submittedBy?: string; // Ref: User
  assignedManager?: string; // Ref: User
  approvedBy?: string; // Ref: User
  approvedAt?: string;
  rejectedBy?: string; // Ref: User
  rejectedAt?: string;
  rejectionReason?: string;
  changesRequestedBy?: string; // Ref: User
  changesRequestedAt?: string;
  changesRequestedReason?: string;
  field?: string;
  note?: string;
  lockedAt?: string;
  lockedBy?: string; // Ref: User
  lockReason?: string;
  notes?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  action?: 'created' | 'updated' | 'approved' | 'rejected' | 'billed' | 'written_off' | 'written_down' | 'unbilled';
  performedBy?: string; // Ref: User
  timestamp?: string;
  editedBy?: string; // Ref: User
  editedAt?: string;
  totalDuration?: any;
  sum?: any;
  totalAmount?: any;
  entryCount?: any;
  byTimeType?: any;
  group?: any;
  lookup?: any;
  unwind?: any;
  project?: any;
  sort?: any;
  set?: any;
  history?: any;
  billStatus?: any;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  details?: any;
  set?: any;
  history?: any;
  set?: any;
  history?: any;
  date?: any;
  status?: any;
  lockedAt?: any;
  set?: any;
  history?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  _id: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  filename?: string;
  description?: string;
  uploadedAt?: string;
  userId: string; // Ref: User
  tenantId?: string;
  tradeId?: string;
  symbol: string;
  symbolName?: string;
  assetType: string;
  direction: string;
  status: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  entryCommission?: number;
  entryFees?: number;
  slippage?: number;
  exitDate?: string;
  exitPrice?: number;
  exitCommission?: number;
  exitFees?: number;
  grossPnl?: number;
  netPnl?: number;
  pnlPercent?: number;
  rMultiple?: number;
  holdingPeriod?: number;
  holdingDays?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskAmount?: number;
  riskPercent?: number;
  positionValue?: number;
  riskRewardRatio?: number;
  trailingStopEnabled?: boolean;
  trailingStopDistance?: number;
  trailingStopActivation?: number;
  scaledIn?: boolean;
  scaledOut?: boolean;
  averageEntryPrice?: number;
  setup?: string;
  timeframe?: string;
  strategy?: string;
  marketCondition?: string;
  marketSession?: string;
  type?: string;
  entryReason?: string;
  exitReason?: string;
  type?: string;
  newsEvent?: string;
  emotionEntry?: string;
  emotionDuring?: string;
  emotionExit?: string;
  confidenceLevel?: number;
  executionQuality?: number;
  followedPlan?: boolean;
  preTradeNotes?: string;
  duringTradeNotes?: string;
  postTradeNotes?: string;
  lessonsLearned?: string;
  type?: string;
  type?: string;
  type?: string;
  type?: string;
  category?: string;
  entryScreenshot?: string;
  exitScreenshot?: string;
  brokerId?: string; // Ref: Broker
  brokerName?: string;
  accountId?: string; // Ref: TradingAccount
  accountName?: string;
  accountCurrency?: string;
  type?: string;
  parentTradeId?: string; // Ref: Trade
  createdAt: string;
  updatedAt: string;
}

export interface TradeStats {
  _id: string;
  trades?: number;
  netPnl?: number;
  winRate?: number;
  userId: string; // Ref: User
  accountId?: string; // Ref: TradingAccount
  periodType: string;
  periodStart: string;
  periodEnd: string;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  breakEvenTrades?: number;
  openTrades?: number;
  grossProfit?: number;
  grossLoss?: number;
  netPnl?: number;
  totalCommissions?: number;
  totalFees?: number;
  winRate?: number;
  lossRate?: number;
  profitFactor?: number;
  averageWin?: number;
  averageLoss?: number;
  averageRMultiple?: number;
  expectancy?: number;
  largestWin?: number;
  largestLoss?: number;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  currentStreak?: number;
  maxDrawdown?: number;
  maxDrawdownPercent?: number;
  averageHoldingTime?: number;
  shortestTrade?: number;
  longestTrade?: number;
  byAssetType?: Record<string, any>;
  bySetup?: Record<string, any>;
  byDayOfWeek?: Record<string, any>;
  byHour?: Record<string, any>;
  byDirection?: Record<string, any>;
  calculatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradingAccount {
  _id: string;
  userId: string; // Ref: User
  tradingAccountId?: string;
  name: string;
  accountNumber?: string;
  brokerId: string; // Ref: Broker
  type: string;
  currency?: string;
  initialBalance: number;
  currentBalance?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  maxDailyLoss?: number;
  maxDailyLossPercent?: number;
  maxPositionSize?: number;
  maxOpenTrades?: number;
  defaultRiskPercent?: number;
  todayPnl?: number;
  todayLossUsed?: number;
  todayTradesCount?: number;
  lastTradingDay?: string;
  status?: string;
  isDemo?: boolean;
  isDefault?: boolean;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Training {
  _id: string;
  approvalThresholds?: any;
  attendanceRequirements?: any;
  assessmentRequirements?: any;
  cleRequirements?: any;
  stepNumber?: number;
  stepName?: string;
  stepNameAr?: string;
  approverRole?: string;
  approverId?: string; // Ref: User
  approverName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'conditional' | 'skipped';
  actionDate?: string;
  decision?: 'approve' | 'reject' | 'approve_with_conditions' | 'defer';
  comments?: string;
  budgetApproval?: any;
  notificationSent?: boolean;
  sessionNumber?: number;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  topic?: string;
  topicAr?: string;
  mandatory?: boolean;
  attended?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  attendanceMethod?: 'physical_signin' | 'biometric' | 'virtual_checkin' | 'ip_verification' | 'manual';
  late?: boolean;
  lateMinutes?: number;
  earlyExit?: boolean;
  earlyExitMinutes?: number;
  excused?: boolean;
  excuseReason?: string;
  notes?: string;
  assessmentId?: string;
  assessmentType?: 'pre_assessment' | 'quiz' | 'mid_term' | 'final_exam' | 'project' | 'presentation' | 'practical' | 'post_assessment';
  assessmentTitle?: string;
  assessmentDate?: string;
  attemptNumber?: number;
  maxAttempts?: number;
  score?: number;
  maxScore?: number;
  percentageScore?: number;
  passingScore?: number;
  passed?: boolean;
  grade?: string;
  timeAllowed?: number;
  timeSpent?: number;
  feedback?: string;
  areasOfStrength?: string;
  areasForImprovement?: string;
  retakeRequired?: boolean;
  retakeDate?: string;
  resultUrl?: string;
  certificateUrl?: string;
  documentType?: 'registration_form' | 'confirmation_email' | 'invitation' | 'pre_work' | 'training_materials' | 'slides' | 'handouts' | 'certificate' | 'transcript' | 'evaluation_form' | 'attendance_sheet' | 'exam_results' | 'invoice' | 'receipt' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedOn?: string;
  uploadedBy?: string; // Ref: User
  accessLevel?: 'employee' | 'manager' | 'hr' | 'trainer' | 'all';
  downloadable?: boolean;
  downloaded?: boolean;
  downloadDate?: string;
  downloadCount?: number;
  expiryDate?: string;
  communicationId?: string;
  communicationType?: 'email' | 'sms' | 'calendar_invite' | 'reminder' | 'notification';
  date?: string;
  purpose?: 'registration_confirmation' | 'pre_work_reminder' | 'session_reminder' | 'attendance_confirmation' | 'completion_notification' | 'certificate_delivery' | 'evaluation_request' | 'follow_up' | 'other';
  recipient?: string;
  subject?: string;
  message?: string;
  attachments?: string;
  sent?: boolean;
  sentDate?: string;
  delivered?: boolean;
  deliveryDate?: string;
  opened?: boolean;
  openDate?: string;
  responded?: boolean;
  responseDate?: string;
  paymentDate?: string;
  amount?: number;
  paymentMethod?: 'bank_transfer' | 'credit_card' | 'check' | 'invoice';
  paymentReference?: string;
  paidBy?: 'company' | 'employee';
  receiptUrl?: string;
  costType?: 'materials' | 'exam_fee' | 'certification_fee' | 'membership' | 'travel' | 'accommodation' | 'meals' | 'equipment' | 'software' | 'other';
  description?: string;
  amount?: number;
  billable?: boolean;
  actionId?: string;
  actionType?: 'apply_learning' | 'share_knowledge' | 'mentor_others' | 'project' | 'certification_exam' | 'advanced_training';
  description?: string;
  dueDate?: string;
  owner?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completionDate?: string;
  outcome?: string;
  trainingId?: string;
  trainingNumber?: string;
  employeeId?: string; // Ref: Employee
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  jobTitle?: string;
  trainingTitle?: string;
  trainingTitleAr?: string;
  trainingDescription?: string;
  trainingDescriptionAr?: string;
  trainingType?: 'internal' | 'external' | 'online' | 'certification' | 'conference' | 'workshop' | 'mentoring' | 'on_the_job';
  trainingCategory?: 'technical' | 'soft_skills' | 'leadership' | 'management' | 'compliance' | 'safety' | 'product_knowledge' | 'systems' | 'legal_professional' | 'business_development' | 'language' | 'other';
  deliveryMethod?: 'classroom' | 'virtual_live' | 'self_paced_online' | 'blended' | 'on_the_job' | 'simulation' | 'workshop' | 'seminar';
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  objective?: string;
  objectiveAr?: string;
  outcome?: string;
  outcomeAr?: string;
  bloomsTaxonomyLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  requestDate?: string;
  requestedBy?: 'employee' | 'manager' | 'hr' | 'learning_admin';
  businessJustification?: string;
  businessJustificationAr?: string;
  requestStatus?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
  justificationDetails?: boolean;
  startDate?: string;
  endDate?: string;
  duration?: number;
  locationType?: 'on_site' | 'off_site' | 'virtual' | 'hybrid';
  venue?: any;
  virtualDetails?: 'zoom' | 'teams' | 'webex' | 'google_meet' | 'other';
  travelRequired?: boolean;
  travelDetails?: boolean;
  technicalRequirements?: boolean;
  provider?: 'internal' | 'external' | 'online_platform' | 'university' | 'professional_association' | 'consultant'; // Ref: Employee
  cleDetails?: 'legal_ethics' | 'substantive_law' | 'professional_skills' | 'practice_management' | 'technology' | 'general';
  status?: 'requested' | 'approved' | 'rejected' | 'enrolled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  required?: boolean;
  currentStep?: number;
  totalSteps?: number;
  finalStatus?: 'pending' | 'approved' | 'rejected' | 'conditional';
  finalApprover?: string;
  finalApprovalDate?: string;
  rejectionReason?: string;
  condition?: string;
  met?: boolean;
  metDate?: string;
  evidence?: string;
  enrolled?: boolean;
  enrollmentDate?: string;
  enrollmentBy?: string;
  enrollmentMethod?: 'manual' | 'self_service' | 'bulk' | 'automatic';
  registrationNumber?: string;
  registrationRequired?: boolean;
  registered?: boolean;
  registrationDate?: string;
  confirmationReceived?: boolean;
  confirmationNumber?: string;
  confirmationEmail?: string;
  seatReserved?: boolean;
  reservationDate?: string;
  seatNumber?: string;
  waitlisted?: boolean;
  waitlistPosition?: number;
  preWorkRequired?: boolean;
  assignmentName?: string;
  dueDate?: string;
  completed?: boolean;
  completionDate?: string;
  submissionUrl?: string;
  preWorkCompleted?: boolean;
  accessCredentials?: boolean;
  attendanceSummary?: number;
  originalSession?: number;
  makeUpDate?: string;
  completed?: boolean;
  approved?: boolean;
  approvedBy?: string;
  totalModules?: number;
  completedModules?: number;
  moduleNumber?: number;
  moduleTitle?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  startDate?: string;
  completionDate?: string;
  duration?: number;
  timeSpent?: number;
  score?: number;
  passed?: boolean;
  progressPercentage?: number;
  lastAccessDate?: string;
  totalTimeSpent?: number;
  videosWatched?: number;
  documentsRead?: number;
  quizzesTaken?: number;
  forumPosts?: number;
  milestoneId?: string;
  milestoneName?: string;
  targetDate?: string;
  achieved?: boolean;
  achievementDate?: string;
  criteria?: string;
  completed?: boolean;
  completionDate?: string;
  completionCriteria?: boolean;
  finalResults?: boolean;
  issued?: boolean;
  issueDate?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  certificateType?: 'completion' | 'achievement' | 'professional' | 'accredited';
  validFrom?: string;
  validUntil?: string;
  renewalRequired?: boolean;
  renewalDueDate?: string;
  cleCredits?: number;
  cpdPoints?: number;
  verificationUrl?: string;
  delivered?: boolean;
  deliveryDate?: string;
  deliveryMethod?: 'email' | 'mail' | 'download' | 'hand_delivery';
  badge?: any;
  transcript?: boolean;
  evaluationCompleted?: boolean;
  evaluationDate?: string;
  ratings?: number;
  openEndedFeedback?: any;
  assessed?: boolean;
  assessmentDate?: string;
  knowledgeGain?: any;
  skill?: string;
  demonstrated?: boolean;
  proficiencyLevel?: 'beginner' | 'competent' | 'proficient' | 'expert';
  objective?: string;
  met?: boolean;
  evidenceOfLearning?: string;
  assessed?: boolean;
  assessmentDate?: string;
  targetedBehavior?: string;
  observed?: boolean;
  frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
  observedBy?: string;
  observationDate?: string;
  examples?: string;
  skillsApplication?: any;
  managerAssessment?: any;
  assessed?: boolean;
  assessmentDate?: string;
  businessImpact?: any;
  roi?: any;
  baseFee?: number;
  currency?: string;
  discount?: 'early_bird' | 'group' | 'corporate' | 'promotional';
  netTrainingFee?: number;
  totalAdditionalCosts?: number;
  totalCost?: number;
  costAllocation?: number;
  budgetTracking?: boolean;
  payment?: 'pending' | 'partial' | 'paid' | 'refunded';
  reimbursement?: boolean;
  isMandatory?: boolean;
  mandatoryReason?: 'regulatory' | 'legal' | 'safety' | 'company_policy' | 'role_requirement' | 'license_renewal';
  complianceDeadline?: string;
  gracePeriod?: number;
  overdue?: boolean;
  daysOverdue?: number;
  consequencesOfNonCompliance?: string;
  regulatoryBody?: boolean;
  renewalRequired?: boolean;
  renewalFrequency?: 'annual' | 'biennial' | 'triennial';
  nextRenewalDate?: string;
  renewalReminder?: boolean;
  knowledgeSharing?: 'presentation' | 'workshop' | 'lunch_and_learn' | 'documentation' | 'mentoring' | 'other';
  created?: boolean;
  createdDate?: string;
  action?: string;
  targetDate?: string;
  resources?: string;
  support?: string;
  completed?: boolean;
  completionDate?: string;
  impact?: string;
  reviewDate?: string;
  reviewedBy?: string;
  allCompleted?: boolean;
  required?: boolean;
  menteeId?: string; // Ref: Employee
  menteeName?: string;
  mentoringStartDate?: string;
  sessions?: number;
  ongoing?: boolean;
  notes?: any;
  requestToApprovalTime?: number;
  approvalToEnrollmentTime?: number;
  enrollmentToStartTime?: number;
  totalLeadTime?: number;
  attendanceRate?: number;
  participationLevel?: 'low' | 'medium' | 'high';
  preTestScore?: number;
  postTestScore?: number;
  scoreImprovement?: number;
  passRate?: boolean;
  satisfactionScore?: number;
  estimatedROI?: number;
  actualROI?: number;
  vsCompanyAverage?: 'above' | 'at' | 'below';
  relatedRecords?: string[]; // Ref: PerformanceReview
  createdOn?: string;
  lastModifiedOn?: string;
  lastModifiedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  userId: string; // Ref: User
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  reference?: string;
  relatedInvoice?: string; // Ref: Invoice
  relatedExpense?: string; // Ref: Expense
  relatedCase?: string; // Ref: Case
  status?: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  balance?: number;
  match?: any;
  sum?: any;
  sum?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TrelloIntegration {
  _id: string;
  userId: string; // Ref: User
  trelloMemberId: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  accessToken: string;
  tokenSecret: string;
  boardId: string;
  name: string;
  shortUrl?: string;
  url?: string;
  closed?: boolean;
  synced?: boolean;
  syncDirection?: 'to_trello' | 'from_trello' | 'bidirectional' | 'null';
  lastSyncAt?: string;
  listId: string;
  name: string;
  closed?: boolean;
  pos?: number;
  enabled?: boolean;
  syncInterval?: 'manual' | 'hourly' | 'daily' | 'realtime';
  notifications?: boolean;
  defaultBoardId?: string;
  defaultBoardName?: string;
  defaultListId?: string;
  defaultListName?: string;
  taskId: string;
  taskType: 'case' | 'task';
  cardId: string;
  boardId: string;
  listId: string;
  lastSyncAt?: string;
  syncDirection?: 'to_trello' | 'from_trello' | 'bidirectional';
  autoSync?: boolean;
  createdAt?: string;
  webhookId: string;
  boardId: string;
  callbackUrl: string;
  active?: boolean;
  createdAt?: string;
  isActive?: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  lastError?: any;
  stats?: number;
  disconnectedAt?: string;
  disconnectedBy?: string; // Ref: User
  disconnectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrustAccount {
  _id: string;
  accountNumber: string;
  accountName: string;
  type: 'iolta' | 'client_trust' | 'escrow' | 'retainer';
  bankName: string;
  bankAccountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  currency?: string;
  balance?: number;
  availableBalance?: number;
  pendingBalance?: number;
  status?: 'active' | 'inactive' | 'closed';
  interestBearing?: boolean;
  interestRate?: number;
  lastReconciled?: string;
  reconciledBalance?: number;
  notes?: string;
  inc?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TrustReconciliation {
  _id: string;
  description?: string;
  amount?: number;
  type?: 'bank_adjustment' | 'book_adjustment';
  reference?: string;
  accountId: string; // Ref: TrustAccount
  reconciliationDate: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  bankStatementBalance: number;
  clearedDeposits?: number;
  clearedWithdrawals?: number;
  outstandingDeposits?: number;
  outstandingWithdrawals?: number;
  difference?: number;
  status?: 'in_progress' | 'completed' | 'exception';
  reconciledBy?: string; // Ref: User
  reconciledAt?: string;
  notes?: string;
  attachments?: string;
  transactionDate?: any;
  transactionDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TrustTransaction {
  _id: string;
  accountId: string; // Ref: TrustAccount
  clientId: string; // Ref: Client
  caseId?: string; // Ref: Case
  transactionNumber?: string;
  transactionDate: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'fee_disbursement' | 'expense_disbursement' | 'interest_credit' | 'adjustment';
  amount: number;
  runningBalance: number;
  reference: string;
  description: string;
  payee?: string;
  payor?: string;
  checkNumber?: string;
  status?: 'pending' | 'cleared' | 'reconciled' | 'void';
  clearedDate?: string;
  reconciledDate?: string;
  relatedInvoiceId?: string; // Ref: Invoice
  relatedExpenseId?: string; // Ref: Expense
  notes?: string;
  attachments?: string;
  inc?: any;
  availableBalance?: any;
  inc?: any;
  inc?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UiAccessConfig {
  _id: string;
  itemId: string;
  name: string;
  nameAr?: string;
  icon?: string;
  path?: string;
  parentId?: string;
  order?: number;
  namespace?: string;
  roleVisibility?: Record<string, any>;
  defaultVisible?: boolean;
  isSystem?: boolean;
  badgeNamespace?: string;
  itemId: string;
  name: string;
  nameAr?: string;
  icon?: string;
  path?: string;
  namespace?: string;
  roleVisibility?: Record<string, any>;
  defaultVisible?: boolean;
  order?: number;
  pageId: string;
  name: string;
  nameAr?: string;
  routePattern: string;
  namespace?: string;
  requiredAction?: 'view' | 'create' | 'edit' | 'delete' | 'manage' | '*';
  roleAccess?: Record<string, any>;
  defaultAccess?: boolean;
  isSystem?: boolean;
  lockScreen?: boolean;
  userId: string; // Ref: User
  showSidebarItems?: string;
  hideSidebarItems?: string;
  grantPageAccess?: string;
  denyPageAccess?: string;
  reason?: string;
  expiresAt?: string;
  useLockScreen?: boolean;
  defaultLockMessage?: string;
  redirectPath?: string;
  showDisabledItems?: boolean;
  logAccessDenials?: boolean;
  version?: number;
  lastModifiedBy?: string; // Ref: User
  settings?: any;
  sidebar?: any;
  pages?: any;
  roles?: any;
  roles?: any;
  lockScreen?: any;
  lockScreen?: any;
  lockScreen?: any;
  lockScreen?: any;
  lockScreen?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Uom {
  _id: string;
  name?: string;
  nameAr?: string;
  mustBeWholeNumber?: boolean;
  enabled?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  courtId: string;
  courtName: string;
  caseCount?: string;
  username?: string;
  email?: string;
  password?: string;
  isAnonymous?: boolean;
  lastActivityAt?: string;
  convertedFromAnonymousId?: string; // Ref: User
  convertedAt?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  passwordResetRequestedAt?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  phone?: string;
  description?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string;
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isSeller?: boolean;
  role?: 'client' | 'lawyer' | 'admin';
  lawyerMode?: 'marketplace' | 'dashboard' | 'null';
  isSoloLawyer?: boolean;
  lawyerWorkMode?: 'solo' | 'firm_owner' | 'firm_member' | 'null';
  firmRole?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'departed' | 'null';
  firmStatus?: 'active' | 'departed' | 'suspended' | 'pending' | 'null';
  departedAt?: string;
  dataAnonymized?: boolean;
  anonymizedAt?: string;
  lawyerProfile?: 'consultation' | 'litigation' | 'both' | 'null'; // Ref: Firm
  endpoint?: string;
  keys?: string;
  channels?: boolean;
  types?: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  code: string;
  used: boolean;
  usedAt?: string;
  mfaVerifiedAt?: string;
  isSSOUser?: boolean;
  ssoProvider?: 'azure' | 'okta' | 'google' | 'custom' | 'null';
  ssoExternalId?: string;
  createdViaSSO?: boolean;
  lastSSOLogin?: string;
  lastLogin?: string;
  stripeConnectAccountId?: string;
  stripePayoutEnabled?: boolean;
  stripeOnboardingComplete?: boolean;
  stripeOnboardingCompletedAt?: string;
  stripeAccountStatus?: 'active' | 'pending' | 'restricted' | 'disabled' | 'null';
  platformCommissionRate?: number;
  passwordChangedAt?: string;
  passwordExpiresAt?: string;
  passwordBreached?: boolean;
  passwordBreachedAt?: string;
  passwordBreachCount?: number;
  mustChangePassword?: boolean;
  mustChangePasswordSetAt?: string;
  mustChangePasswordSetBy?: string; // Ref: User
  hash: string;
  changedAt: string;
  passwordExpiryWarningsSent?: boolean;
  kycStatus?: 'pending' | 'verified' | 'rejected' | 'expired' | 'null';
  kycVerifiedAt?: string;
  kycExpiresAt?: string;
  type: 'national_id' | 'iqama' | 'passport' | 'commercial_registration' | 'power_of_attorney' | 'address_proof' | 'selfie';
  documentId?: string;
  documentNumber?: string;
  fileUrl?: string;
  verifiedAt?: string;
  expiresAt?: string;
  verificationSource?: 'yakeen' | 'wathq' | 'manual' | 'null';
  status?: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  uploadedAt?: string;
  kycRejectionReason?: string;
  kycVerifiedIdentity?: string;
  kycVerifiedBusiness?: string;
  amlRiskScore?: number;
  lastScreenedAt?: string;
  status?: 'clear' | 'review' | 'flagged' | 'null';
  type: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt?: string;
  kycInitiatedAt?: string;
  kycReviewedBy?: string; // Ref: User
  kycReviewedAt?: string;
  kycReviewNotes?: string;
  connected?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastSyncedAt?: string;
  lastRefreshedAt?: string;
  syncSettings?: 'manual' | 'hourly' | 'daily';
  customClaims?: any;
  customClaimsUpdatedAt?: string;
  customClaimsUpdatedBy?: string; // Ref: User
  createdAt: string;
  updatedAt: string;
}

export interface UserActivity {
  _id: string;
  query: string;
  timestamp: string;
  resultCount?: number;
  entityType: 'case' | 'client' | 'lead' | 'invoice' | 'task' | 'contact' | 'document' | 'appointment' | 'event';
  entityId: string;
  entityName: string;
  timestamp: string;
  command: string;
  timestamp: string;
  name: string;
  query: any;
  entityType?: 'case' | 'client' | 'lead' | 'invoice' | 'task' | 'contact' | 'document' | 'appointment' | 'event' | 'null';
  createdAt: string;
  userId: string; // Ref: User
  validate?: any;
  validate?: any;
  validate?: any;
  savedSearches?: any[];
  shortcuts?: any;
  commandPaletteSettings?: any;
  shortcuts?: any;
  preferences?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserCompanyAccess {
  _id: string;
  userId: string; // Ref: User
  role?: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
  type?: string;
  canAccessChildren?: boolean;
  canAccessParent?: boolean;
  isDefault?: boolean;
  status?: 'active' | 'inactive' | 'pending' | 'revoked';
  grantedBy?: string; // Ref: User
  grantedAt?: string;
  expiresAt?: string;
  notes?: string;
  expiresAt?: any;
  expiresAt?: any;
  set?: any;
  set?: any;
  set?: any;
  set?: any;
  expiresAt?: any;
  set?: any;
  set?: any;
  expiresAt?: any;
  set?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserLocation {
  _id: string;
  userId: string; // Ref: User
  name: string;
  nameAr?: string;
  type: 'home' | 'office' | 'court' | 'client' | 'custom';
  address?: string;
  addressAr?: string;
  coordinates: number;
  location: 'Point';
  radius?: number;
  isDefault?: boolean;
  lastVisited?: string;
  visitCount?: number;
  metadata?: any;
  isActive?: boolean;
  set?: any;
  geoNear?: any;
  sort?: any;
  project?: any;
  visitCount?: any;
  match?: any;
  locations?: any;
  count?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserSetupProgress {
  _id: string;
  userId: string; // Ref: User
  taskId: string;
  isCompleted?: boolean;
  completedAt?: string;
  skipped?: boolean;
  skippedAt?: string;
  skippedReason?: string;
  attemptCount?: number;
  lastAttemptedAt?: string;
  timeSpentSeconds?: number;
  taskId?: any;
  taskId?: any;
  overall?: any;
  required?: any;
  taskId?: any;
  taskId?: any;
  set?: any;
  inc?: any;
  setOnInsert?: any;
  set?: any;
  setOnInsert?: any;
  set?: any;
  inc?: any;
  set?: any;
  setOnInsert?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  _id: string;
  date: string;
  type: 'scheduled' | 'repair' | 'accident' | 'inspection' | 'tire_change' | 'oil_change' | 'other';
  description?: string;
  vendor?: string;
  cost?: number;
  odometer?: number;
  nextServiceDue?: string;
  nextServiceOdometer?: number;
  name?: string;
  url?: string;
  vehicleId?: string;
  vehicleType: 'sedan' | 'suv' | 'truck' | 'van' | 'motorcycle' | 'bus' | 'other';
  make?: string;
  model?: string;
  year: number;
  color?: string;
  vin?: string;
  plateNumber?: string;
  plateType?: 'private' | 'commercial' | 'diplomatic' | 'temporary' | 'other';
  registrationNumber?: string;
  registrationExpiry?: string;
  ownershipType?: 'owned' | 'leased' | 'rented';
  purchaseDate?: string;
  purchasePrice?: number;
  leaseDetails?: any;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceType?: 'comprehensive' | 'third_party' | 'basic';
  insuranceStartDate?: string;
  insuranceExpiry?: string;
  insurancePremium?: number;
  engineNumber?: string;
  fuelType?: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg';
  engineCapacity?: number;
  seatingCapacity?: number;
  loadCapacity?: number;
  currentOdometer?: number;
  status?: 'available' | 'assigned' | 'in_maintenance' | 'out_of_service' | 'sold';
  assignedTo?: string; // Ref: Employee
  assignmentDate?: string;
  assignmentType?: 'permanent' | 'temporary' | 'pool';
  assignmentEndDate?: string;
  employee?: string; // Ref: Employee
  startDate?: string;
  endDate?: string;
  reason?: string;
  assignedBy?: string; // Ref: User
  hasGPS?: boolean;
  gpsDeviceId?: string;
  lastKnownLocation?: any;
  lastServiceDate?: string;
  lastServiceOdometer?: number;
  nextServiceDue?: string;
  nextServiceOdometer?: number;
  fuelCardNumber?: string;
  averageFuelConsumption?: number;
  totalFuelCost?: number;
  name?: string;
  type?: 'registration' | 'insurance' | 'inspection' | 'other';
  url?: string;
  expiryDate?: string;
  uploadedAt?: string;
  totalMaintenanceCost?: number;
  yearlyBudget?: number;
  department?: string; // Ref: Department
  branch?: string; // Ref: Branch
  notes?: string;
  inc?: any;
  status?: any;
  registrationExpiry?: any;
  status?: any;
  insuranceExpiry?: any;
  status?: any;
  nextServiceDue?: any;
  nextServiceOdometer?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  _id: string;
  vendorId?: string;
  name: string;
  nameAr?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIban?: string;
  currency?: string;
  paymentTerms?: number;
  defaultCategory?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
  defaultExpenseAccountId?: string; // Ref: Account
  payableAccountId?: string; // Ref: Account
  creditLimit?: number;
  openingBalance?: number;
  openingBalanceDate?: string;
  match?: any;
  group?: any;
  match?: any;
  sum?: any;
  sum?: any;
  createdAt: string;
  updatedAt: string;
}

export interface View {
  _id: string;
  field: string;
  label: string;
  labelAr?: string;
  visible?: boolean;
  width?: number;
  order: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'badge' | 'avatar' | 'link' | 'custom';
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'between' | 'not_between' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty' | 'is_null' | 'is_not_null' | 'before' | 'after' | 'on_or_before' | 'on_or_after' | 'today' | 'yesterday' | 'tomorrow' | 'this_week' | 'last_week' | 'next_week' | 'this_month' | 'last_month' | 'next_month' | 'this_year' | 'last_year' | 'next_year';
  isUserInput?: boolean;
  field: string;
  direction?: 'asc' | 'desc';
  order?: number;
  field: string;
  collapsed?: boolean;
  order?: number;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'none';
  columnField: string;
  field?: string;
  label?: string;
  visible?: boolean;
  order?: number;
  swimlaneField?: string;
  colorField?: string;
  sortBy?: 'manual' | 'created_date' | 'due_date' | 'priority' | 'alphabetical';
  collapsedColumns?: string;
  cardSize?: 'compact' | 'normal' | 'detailed';
  startDateField: string;
  endDateField?: string;
  titleField: string;
  colorField?: string;
  defaultView?: 'day' | 'week' | 'month' | 'agenda' | 'year';
  firstDayOfWeek?: number;
  timeFormat?: '12h' | '24h';
  showWeekends?: boolean;
  slotDuration?: number;
  startField: string;
  endField: string;
  groupByField?: string;
  milestoneField?: string;
  colorField?: string;
  defaultZoom?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  showToday?: boolean;
  allowOverlap?: boolean;
  startField: string;
  endField: string;
  dependencyField?: string;
  progressField?: string;
  criticalPathEnabled?: boolean;
  baselineEnabled?: boolean;
  showMilestones?: boolean;
  autoScheduling?: boolean;
  imageField: string;
  titleField: string;
  subtitleField?: string;
  cardSize?: 'small' | 'medium' | 'large';
  columns?: number;
  showOverlay?: boolean;
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'polar' | 'bubble';
  xAxis?: 'category' | 'time' | 'linear' | 'logarithmic';
  yAxis?: 'linear' | 'logarithmic';
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  groupBy?: string;
  colorScheme?: string;
  stacked?: boolean;
  showLegend?: boolean;
  showDataLabels?: boolean;
  locationField: string;
  titleField: string;
  markerColorField?: string;
  defaultCenter?: number;
  defaultZoom?: number;
  clusterMarkers?: boolean;
  showHeatmap?: boolean;
  assigneeField: string;
  capacityField?: string;
  effortField?: string;
  timeUnit?: 'hours' | 'days' | 'points';
  showOverallocated?: boolean;
  showCapacityLine?: boolean;
  field?: string;
  label?: string;
  order?: number;
  field?: string;
  label?: string;
  order?: number;
  field?: string;
  label?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  showSubtotals?: boolean;
  showGrandTotals?: boolean;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  entityType: 'deal' | 'contact' | 'task' | 'project' | 'case' | 'lead' | 'invoice' | 'expense' | 'time_entry' | 'document';
  type: 'list' | 'kanban' | 'calendar' | 'timeline' | 'gantt' | 'gallery' | 'chart' | 'map' | 'workload' | 'pivot';
  scope: 'personal' | 'team' | 'global';
  ownerId: string; // Ref: User
  teamId?: string; // Ref: Team
  userId?: string; // Ref: User
  permission?: 'view' | 'edit';
  icon?: string;
  color?: string;
  isDefault?: boolean;
  isLocked?: boolean;
  isFavorite?: boolean;
  defaultPageSize?: number;
  maxRecords?: number;
  usageStats?: number; // Ref: User
  lastModifiedBy?: string; // Ref: User
  isArchived?: boolean;
  teamId?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Walkthrough {
  _id: string;
  order: number;
  title: string;
  titleAr?: string;
  content: string;
  contentAr?: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'highlight' | 'click' | 'input' | 'wait';
  actionData?: any;
  videoUrl?: string;
  imageUrl?: string;
  skippable?: boolean;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category: 'onboarding' | 'feature' | 'workflow' | 'tips';
  targetAudience?: 'all' | 'admin' | 'lawyer' | 'accountant' | 'new_user';
  triggerConditions?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant'[];
  isActive?: boolean;
  priority?: number;
  version?: number;
  stats?: number;
  userId: string; // Ref: User
  walkthroughId: string; // Ref: Walkthrough
  status?: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  currentStep?: number;
  type?: number;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  timeSpent?: number;
  metadata?: any;
  timeSpent?: any;
  status?: any;
  updatedAt?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  _id: string;
  warehouseId?: string;
  name?: string;
  nameAr?: string;
  warehouseType?: 'warehouse' | 'store' | 'transit' | 'virtual';
  parentWarehouse?: string; // Ref: Warehouse
  isGroup?: boolean;
  company?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  disabled?: boolean;
  accountId?: string; // Ref: Account
  toJSON?: any;
  toObject?: any;
  actualQty?: any;
  match?: any;
  group?: any;
  actualQty?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WebauthnCredential {
  _id: string;
  credentialId: string;
  credentialPublicKey: string;
  counter: number;
  deviceType: 'platform' | 'cross-platform';
  transports?: 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'[];
  userId: string; // Ref: User
  name: string;
  lastUsedAt?: string;
  aaguid?: string;
  userVerified?: boolean;
  backedUp?: boolean;
  isRevoked?: boolean;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  _id: string;
  maxAttempts?: number;
  retryIntervals?: number[];
  exponentialBackoff?: boolean;
  type?: string;
  name?: string;
  description?: string;
  type: string;
  type?: string;
  validate?: any;
  secret: string;
  isActive?: boolean;
  headers?: Record<string, any>;
  payloadQuery?: string;
  useJWS?: boolean;
  retryPolicy?: any;
  timeout?: number;
  expectedResponseSchema?: any;
  fallback?: 'default_value' | 'error' | 'skip';
  circuitBreaker?: boolean;
  lastTriggered?: string;
  lastStatus?: 'success' | 'failed' | 'pending' | 'null';
  lastError?: string;
  statistics?: number;
  filters?: string[]; // Ref: Client
  rateLimit?: boolean;
  metadata?: Record<string, any>;
  disabledAt?: string;
  disabledReason?: string;
  disabledBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  match?: any;
  totalWebhooks?: any;
  activeWebhooks?: any;
  inactiveWebhooks?: any;
  totalDeliveries?: any;
  successfulDeliveries?: any;
  failedDeliveries?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  _id: string;
  status?: number;
  statusText?: string;
  body?: string;
  headers?: Record<string, any>;
  attemptNumber: number;
  timestamp?: string;
  status: string;
  httpStatus?: number;
  duration?: number;
  error?: string;
  errorDetails?: string;
  webhookId: string; // Ref: Webhook
  event: string;
  payload: any;
  payloadSize?: number;
  entityType?: 'client' | 'case' | 'invoice' | 'payment' | 'lead' | 'null';
  entityId?: string;
  url: string;
  method?: string;
  headers?: Record<string, any>;
  status?: string;
  currentAttempt?: number;
  maxAttempts?: number;
  nextRetry?: string;
  lastAttemptAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  errorDetails?: any;
  metadata?: Record<string, any>;
  signature?: string;
  tags?: string;
  pagination?: any;
  nextRetry?: any;
  currentAttempt?: any;
  totalDeliveries?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  averageDuration?: any;
  totalAttempts?: any;
  match?: any;
  count?: any;
  sum?: any;
  sum?: any;
  avgDuration?: any;
  sort?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappBroadcast {
  _id: string;
  broadcastId?: string;
  name?: string;
  description?: string;
  type?: 'template' | 'text' | 'media' | 'location';
  status?: 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled' | 'failed';
  templateId?: string; // Ref: WhatsAppTemplate
  templateName?: string;
  language?: string;
  position?: number;
  type?: 'static' | 'dynamic';
  value?: string;
  fieldName?: string;
  textContent?: boolean;
  mediaContent?: 'image' | 'video' | 'document' | 'audio';
  locationContent?: any;
  audienceType?: 'all_leads' | 'all_clients' | 'segment' | 'custom' | 'tags' | 'csv_import';
  segmentId?: string; // Ref: EmailSegment
  type?: string[];
  tagLogic?: 'AND' | 'OR';
  phoneNumber?: string;
  name?: string;
  leadId?: string; // Ref: Lead
  clientId?: string; // Ref: Client
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
  messageId?: string; // Ref: WhatsAppMessage
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  type?: string[];
  type?: string[];
  type?: string[];
  scheduledAt?: string;
  timezone?: string;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  cancelledAt?: string;
  sendingOptions?: number;
  stats?: number;
  deliveryRate?: number;
  readRate?: number;
  failureRate?: number;
  cost?: number;
  type?: string[];
  notes?: string;
  provider?: 'meta' | 'msg91' | 'twilio';
  cancelledBy?: string; // Ref: User
  createdAt?: any;
  scheduledAt?: any;
  group?: any;
  phone?: any;
  whatsapp?: any;
  customData?: any;
  phone?: any;
  whatsapp?: any;
  customData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappConversation {
  _id: string;
  conversationId?: string;
  leadId?: string; // Ref: Lead
  clientId?: string; // Ref: Client
  contactId?: string; // Ref: Contact
  caseId?: string; // Ref: Case
  phoneNumber?: string;
  contactName?: string;
  contactType?: 'lead' | 'client' | 'contact' | 'unknown';
  status?: 'active' | 'closed' | 'pending' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  messageCount?: number;
  unreadCount?: number;
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessageDirection?: 'inbound' | 'outbound';
  firstMessageAt?: string;
  window?: boolean;
  assignedTo?: string; // Ref: User
  assignedAt?: string;
  assignedBy?: string; // Ref: User
  department?: string;
  type?: string;
  type?: string[];
  subject?: string;
  notes?: string;
  type?: string;
  metrics?: number;
  automation?: boolean;
  provider?: 'meta' | 'msg91' | 'twilio';
  providerConversationId?: string;
  closedAt?: string;
  closedBy?: string; // Ref: User
  closeReason?: 'resolved' | 'converted_to_client' | 'not_interested' | 'no_response' | 'spam' | 'duplicate' | 'other';
  closeNotes?: string;
  satisfaction?: number;
  createdAt?: any;
  status?: any;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappMessage {
  _id: string;
  conversationId?: string; // Ref: WhatsAppConversation
  messageId?: string;
  direction?: 'inbound' | 'outbound';
  type?: 'text' | 'template' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'sticker' | 'interactive' | '// Buttons' | 'lists
            reaction' | 'unknown';
  text?: string;
  templateName?: string;
  templateId?: string;
  templateLanguage?: string;
  templateVariables?: string;
  mediaUrl?: string;
  mediaId?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  thumbnailUrl?: string;
  location?: any;
  contact?: string[];
  type?: 'button' | 'list';
  header?: string;
  body?: string;
  footer?: string;
  id?: string;
  title?: string;
  title?: string;
  id?: string;
  title?: string;
  description?: string;
  reaction?: any;
  senderPhone?: string;
  recipientPhone?: string;
  sentBy?: string; // Ref: User
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
  status?: string;
  timestamp?: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  replyTo?: string; // Ref: WhatsAppMessage
  isForwarded?: boolean;
  forwardedFrom?: string;
  provider?: 'meta' | 'msg91' | 'twilio';
  providerMessageId?: string;
  providerTimestamp?: string;
  timestamp?: string;
  outsideWindow?: boolean;
  isAutoReply?: boolean;
  isBotMessage?: boolean;
  campaignId?: string; // Ref: Campaign
  type?: string[];
  notes?: string;
  tracking?: boolean;
  deletedBy?: string; // Ref: User
  count?: any;
  sum?: any;
  sum?: any;
  group?: any;
  sort?: any;
  group?: any;
  match?: any;
  group?: any;
  text?: any;
  score?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappTemplate {
  _id: string;
  name?: string;
  templateId?: string;
  namespace?: string;
  language?: 'ar' | 'en' | 'ar_SA' | 'en_US';
  category?: 'marketing' | '// Promotional messages
            utility' | '// Transactional/utility messages (appointments' | 'updates)
            authentication  // OTP and verification';
  header?: 'none' | 'text' | 'image' | 'video' | 'document';
  text?: string;
  position?: number;
  name?: string;
  example?: string;
  description?: string;
  footer?: string;
  type?: 'quick_reply' | 'url' | 'phone';
  text?: string;
  url?: string;
  urlType?: 'static' | 'dynamic';
  phoneNumber?: string;
  index?: number;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  usage?: number;
  useCase?: 'appointment_reminder' | 'appointment_confirmation' | 'document_ready' | 'payment_reminder' | 'case_update' | 'welcome_message' | 'follow_up' | 'consultation_request' | 'meeting_invitation' | 'general_notification' | 'other';
  type?: string[];
  isActive?: boolean;
  isPredefined?: boolean;
  provider?: 'meta' | 'msg91' | 'twilio';
  lastModifiedBy?: string; // Ref: User
  notes?: string;
  group?: any;
  match?: any;
  group?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrder {
  _id: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  requiredQty: number;
  transferredQty?: number;
  consumedQty?: number;
  uom?: string;
  sourceWarehouse?: string; // Ref: Warehouse
  rate?: number;
  amount?: number;
  operation: string;
  workstation?: string; // Ref: Workstation
  plannedTime?: number;
  actualTime?: number;
  status?: 'pending' | 'in_progress' | 'completed';
  completedQty?: number;
  sequence?: number;
  workOrderId?: string;
  workOrderNumber?: string;
  itemId: string; // Ref: Item
  itemCode: string;
  itemName: string;
  bomId: string; // Ref: BOM
  bomNumber?: string;
  qty: number;
  producedQty?: number;
  uom?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  targetWarehouse: string; // Ref: Warehouse
  workInProgressWarehouse?: string; // Ref: Warehouse
  sourceWarehouse?: string; // Ref: Warehouse
  status?: 'draft' | 'submitted' | 'not_started' | 'in_progress' | 'completed' | 'stopped' | 'cancelled';
  docStatus?: '0' | '1' | '2';
  salesOrderId?: string; // Ref: Order
  materialRequestId?: string; // Ref: MaterialRequest
  remarks?: string;
  company?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  plannedEndDate?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  _id: string;
  stepOrder: number;
  stepName?: string;
  stepType?: 'task' | 'approval' | 'notification' | 'delay' | 'condition' | 'action' | 'form';
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'timeout';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: any;
  retryCount?: number;
  assignedTo?: string; // Ref: User
  completedBy?: string; // Ref: User
  notes?: string;
  templateId: string; // Ref: WorkflowTemplate
  name: string;
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep?: number;
  currentStepName?: string;
  variables?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  cancelledAt?: string;
  duration?: number;
  progress?: number;
  entityType?: 'case' | 'client' | 'invoice' | 'task' | 'lead' | 'deal' | 'employee' | 'custom';
  entityId?: string;
  entityName?: string;
  triggeredBy?: 'manual' | 'event' | 'schedule' | 'condition' | 'api';
  lastError?: any;
  cancellationReason?: string;
  failureReason?: string;
  startedBy: string; // Ref: User
  completedBy?: string; // Ref: User
  cancelledBy?: string; // Ref: User
  pausedBy?: string; // Ref: User
  tags?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  parentInstanceId?: string; // Ref: WorkflowInstance
  type?: string;
  toJSON?: any;
  toObject?: any;
  status?: any;
  match?: any;
  total?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  sum?: any;
  avgDuration?: any;
  avgProgress?: any;
  inc?: any;
  set?: any;
  inc?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  _id: string;
  order: number;
  name: string;
  nameAr?: string;
  description?: string;
  type: 'task' | 'approval' | 'notification' | 'delay' | 'condition' | 'action' | 'form';
  assigneeType?: 'owner' | 'role' | 'specific' | 'round_robin' | 'auto';
  assigneeId?: string; // Ref: User
  assigneeRole?: string;
  taskPriority?: 'low' | 'medium' | 'high' | 'critical';
  dueInDays?: number;
  dueInHours?: number;
  approverType?: 'owner' | 'manager' | 'role' | 'specific' | 'sequential' | 'parallel';
  approverId?: string; // Ref: User
  approverRole?: string;
  approvalRequired?: boolean;
  userId?: string; // Ref: User
  order?: number;
  notificationType?: 'email' | 'in_app' | 'sms' | 'webhook';
  type?: string;
  type?: string;
  recipientRole?: string;
  subject?: string;
  messageTemplate?: string;
  delayDuration?: number;
  delayUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  field?: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  logicGate?: 'AND' | 'OR';
  actionType?: 'update_field' | 'create_record' | 'send_webhook' | 'run_script' | 'send_email' | 'create_document';
  name?: string;
  label?: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'file';
  required?: boolean;
  options?: string;
  requiresCompletion?: boolean;
  canSkip?: boolean;
  autoComplete?: boolean;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  onComplete?: any;
  estimatedDuration?: number;
  tags?: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  description?: string;
  required?: boolean;
  validation?: any;
  name: string;
  nameAr?: string;
  description?: string;
  category: 'legal' | 'finance' | 'hr' | 'client_onboarding' | 'case_management' | 'custom';
  triggerType: 'manual' | 'event' | 'schedule' | 'condition';
  triggerConfig?: 'create' | 'update' | 'delete' | 'status_change' | 'field_change' | 'custom'[];
  permissions?: 'all' | 'owner' | 'admin' | 'manager' | 'lawyer' | 'accountant' | 'hr' | 'custom'[]; // Ref: User
  isActive?: boolean;
  isSystem?: boolean;
  version?: number;
  tags?: string;
  icon?: string;
  color?: string;
  stats?: number;
  lastModifiedBy?: string; // Ref: User
  toJSON?: any;
  toObject?: any;
  valid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workstation {
  _id: string;
  hourRate?: number;
  electricityCost?: number;
  consumableCost?: number;
  rentCost?: number;
  start?: string;
  end?: string;
  workstationId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  productionCapacity?: number;
  workstationType?: 'manual' | 'semi_automatic' | 'automatic' | 'assembly' | 'quality_control' | 'packaging';
  holidayList?: string; // Ref: HolidayList
  location?: string;
  isActive?: boolean;
  toJSON?: any;
  toObject?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ZoomIntegration {
  _id: string;
  userId: string; // Ref: User
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  tokenExpiresAt: string;
  scopes?: string[];
  zoomUserId: string;
  email: string;
  accountId?: string;
  isActive?: boolean;
  connectedAt?: string;
  disconnectedAt?: string;
  disconnectedBy?: string; // Ref: User
  disconnectReason?: string;
  meetingSettings?: 'none' | 'local' | 'cloud';
  webhook?: 'active' | 'inactive' | 'error';
  stats?: number;
  lastSyncedAt?: string;
  lastSyncError?: string;
  tokenExpiresAt?: any;
  total?: any;
  active?: any;
  totalMeetingsCreated?: any;
  totalMeetingsHosted?: any;
  totalParticipants?: any;
  totalMinutes?: any;
  createdAt: string;
  updatedAt: string;
}