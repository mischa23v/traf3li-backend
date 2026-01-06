/**
 * Integration Modules TypeScript Type Definitions
 *
 * This file contains comprehensive type definitions for:
 * - Calendar (Unified calendar view)
 * - Google Calendar Integration
 * - Microsoft Calendar Integration
 * - Appointment Scheduling
 * - Event Management
 *
 * Generated from route and controller analysis
 * Total Endpoints: 93
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════

export type ObjectId = string;
export type ISODateString = string;
export type EmailString = string;
export type URLString = string;
export type ColorHexString = string;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  cached?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pages?: number;
  hasMore: boolean;
}

export interface DateRangeParams {
  startDate?: ISODateString;
  endDate?: ISODateString;
}

// ═══════════════════════════════════════════════════════════════
// CALENDAR MODULE (Unified Calendar View)
// Routes: /api/calendar
// Total Endpoints: 10
// ═══════════════════════════════════════════════════════════════

export enum CalendarItemType {
  Event = 'event',
  Task = 'task',
  Reminder = 'reminder',
  CaseDocument = 'case-document',
  Appointment = 'appointment',
  GoogleCalendar = 'google-calendar'
}

export enum CalendarStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Done = 'done',
  Cancelled = 'cancelled',
  Completed = 'completed',
  Scheduled = 'scheduled',
  Confirmed = 'confirmed'
}

export enum CalendarPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
  Urgent = 'urgent'
}

export interface CalendarItem {
  id: ObjectId;
  type: CalendarItemType;
  title: string;
  description?: string;
  startDate: ISODateString;
  endDate: ISODateString;
  allDay: boolean;
  status: CalendarStatus;
  priority?: CalendarPriority;
  color: ColorHexString;
  caseId?: ObjectId;
  caseName?: string;
  caseNumber?: string;
  createdBy?: UserBasicInfo;
  attendees?: UserBasicInfo[];
  isOverdue?: boolean;
  isExternal?: boolean;
}

export interface UserBasicInfo {
  _id: ObjectId;
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  email?: EmailString;
}

// GET /api/calendar
export interface GetCalendarViewParams extends DateRangeParams {
  type?: CalendarItemType;
  caseId?: ObjectId;
}

export interface CalendarViewSummary {
  totalItems: number;
  eventCount: number;
  taskCount: number;
  reminderCount: number;
  caseDocumentCount: number;
}

export interface GetCalendarViewResponse {
  success: boolean;
  data: {
    events: CalendarItem[];
    tasks: CalendarItem[];
    reminders: CalendarItem[];
    caseDocuments: CalendarItem[];
    combined: CalendarItem[];
    summary: CalendarViewSummary;
  };
  dateRange: {
    start: ISODateString;
    end: ISODateString;
  };
}

// GET /api/calendar/date/:date
export interface GetCalendarByDateParams {
  date: string; // YYYY-MM-DD
}

export interface GetCalendarByDateResponse {
  success: boolean;
  data: {
    date: ISODateString;
    events: CalendarItem[];
    tasks: CalendarItem[];
    reminders: CalendarItem[];
    caseDocuments: CalendarItem[];
    summary: {
      total: number;
      eventCount: number;
      taskCount: number;
      reminderCount: number;
      caseDocumentCount: number;
    };
  };
}

// GET /api/calendar/month/:year/:month
export interface GetCalendarByMonthParams {
  year: string;
  month: string; // 1-12
}

export interface DayGroup {
  date: string;
  events: CalendarItem[];
  tasks: CalendarItem[];
  reminders: CalendarItem[];
  caseDocuments: CalendarItem[];
  count: number;
}

export interface GetCalendarByMonthResponse {
  success: boolean;
  data: {
    month: { year: number; month: number };
    groupedByDate: Record<string, DayGroup>;
    summary: {
      totalDays: number;
      totalItems: number;
      eventCount: number;
      taskCount: number;
      reminderCount: number;
      caseDocumentCount: number;
    };
  };
}

// GET /api/calendar/upcoming
export interface GetUpcomingItemsParams {
  days?: number; // default 7
}

export interface GetUpcomingItemsResponse {
  success: boolean;
  data: {
    upcoming: CalendarItem[];
    summary: {
      total: number;
      eventCount: number;
      taskCount: number;
      reminderCount: number;
      caseDocumentCount: number;
    };
    dateRange: {
      start: ISODateString;
      end: ISODateString;
    };
  };
}

// GET /api/calendar/overdue
export interface GetOverdueItemsResponse {
  success: boolean;
  data: {
    tasks: CalendarItem[];
    reminders: CalendarItem[];
    pastEvents: CalendarItem[];
    summary: {
      overdueTaskCount: number;
      overdueReminderCount: number;
      pastEventCount: number;
      total: number;
    };
  };
}

// GET /api/calendar/stats
export interface GetCalendarStatsParams extends DateRangeParams {}

export interface CalendarStats {
  totalEvents: number;
  totalTasks: number;
  totalReminders: number;
  upcomingHearings: number;
  overdueItems: number;
  completedThisMonth: number;
  byType: Record<string, number>;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface GetCalendarStatsResponse {
  success: boolean;
  data: CalendarStats;
}

// GET /api/calendar/grid-summary (Optimized)
export interface GetCalendarGridSummaryParams extends DateRangeParams {
  types?: string; // comma-separated
}

export interface DaySummary {
  date: string;
  total: number;
  events: number;
  tasks: number;
  reminders: number;
  caseDocuments: number;
  hasHighPriority: boolean;
  hasOverdue: boolean;
}

export interface GetCalendarGridSummaryResponse {
  success: boolean;
  data: {
    days: DaySummary[];
    totalDays: number;
    dateRange: { start: ISODateString; end: ISODateString };
  };
  cached?: boolean;
}

// GET /api/calendar/grid-items (Optimized)
export interface GetCalendarGridItemsParams extends DateRangeParams {
  types?: string; // comma-separated
  caseId?: ObjectId;
}

export interface GetCalendarGridItemsResponse {
  success: boolean;
  data: CalendarItem[];
  count: number;
  dateRange: { start: ISODateString; end: ISODateString };
  cached?: boolean;
}

// GET /api/calendar/item/:type/:id (Lazy-load)
export interface GetCalendarItemDetailsParams {
  type: CalendarItemType;
  id: ObjectId;
}

export interface GetCalendarItemDetailsResponse {
  success: boolean;
  data: CalendarItem;
  type: CalendarItemType;
  cached?: boolean;
}

// GET /api/calendar/list (Virtualized)
export interface GetCalendarListViewParams extends DateRangeParams {
  cursor?: string;
  limit?: number;
  types?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  priority?: CalendarPriority;
  status?: CalendarStatus;
  caseId?: ObjectId;
}

export interface GetCalendarListViewResponse {
  success: boolean;
  data: CalendarItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
    count: number;
  };
  filters: {
    types: CalendarItemType[];
    priority: CalendarPriority | null;
    status: CalendarStatus | null;
    dateRange: { start: ISODateString; end: ISODateString };
  };
}

// GET /api/calendar/sidebar-data (Aggregated)
export interface GetSidebarDataParams extends DateRangeParams {
  reminderDays?: number; // default 7
}

export interface GetSidebarDataResponse {
  success: boolean;
  calendarEvents: Array<{
    _id: ObjectId;
    title: string;
    startDate: ISODateString;
    endDate: ISODateString;
    allDay: boolean;
    type: string;
    status: string;
    priority: string;
    color: ColorHexString;
    location?: string;
  }>;
  upcomingReminders: Array<{
    _id: ObjectId;
    title: string;
    dueDate: ISODateString;
    priority: string;
    type: string;
    status: string;
    relatedCase?: any;
    relatedTask?: any;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE CALENDAR INTEGRATION MODULE
// Routes: /api/google-calendar
// Total Endpoints: 18
// ═══════════════════════════════════════════════════════════════

export interface GoogleCalendarIntegration {
  isConnected: boolean;
  email: EmailString | null;
  displayName: string | null;
  expiresAt: ISODateString;
  scopes: string[];
  calendars: GoogleCalendar[];
  selectedCalendars: SelectedCalendar[];
  primaryCalendarId: string;
  showExternalEvents: boolean;
  autoSync: AutoSyncSettings;
  syncStats: SyncStats;
  connectedAt: ISODateString;
  lastSyncedAt: ISODateString;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: ColorHexString;
  foregroundColor: ColorHexString;
  primary?: boolean;
  accessRole: string;
  timeZone?: string;
}

export interface SelectedCalendar {
  calendarId: string;
  name: string;
  backgroundColor: ColorHexString;
  isPrimary: boolean;
  syncEnabled: boolean;
}

export interface AutoSyncSettings {
  direction?: 'to_google' | 'from_google' | 'bidirectional';
  syncInterval?: 'manual' | 'hourly' | 'daily';
  conflictResolution?: 'google_wins' | 'traf3li_wins' | 'manual';
  syncPastEvents?: boolean;
  syncDaysBack?: number;
  syncDaysForward?: number;
}

export interface SyncStats {
  lastSync?: ISODateString;
  imported?: number;
  exported?: number;
  failed?: number;
}

// GET /api/google-calendar/auth
export interface GetGoogleAuthUrlResponse {
  success: boolean;
  authUrl: URLString;
}

// GET /api/google-calendar/callback
export interface GoogleCalendarCallbackParams {
  code: string;
  state: string;
  error?: string;
}

// POST /api/google-calendar/disconnect
export interface DisconnectGoogleCalendarResponse {
  success: boolean;
  message: string;
}

// GET /api/google-calendar/status
export interface GetGoogleCalendarStatusResponse {
  success: boolean;
  connected: boolean;
  data: GoogleCalendarIntegration | null;
}

// GET /api/google-calendar/calendars
export interface GetGoogleCalendarsResponse {
  success: boolean;
  data: GoogleCalendar[];
}

// GET /api/google-calendar/calendars/:calendarId/events
export interface GetGoogleEventsParams extends DateRangeParams {
  calendarId: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  status: string;
  organizer?: { email: string; displayName?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  hangoutLink?: string;
  conferenceData?: any;
  htmlLink?: string;
}

export interface GetGoogleEventsResponse {
  success: boolean;
  data: GoogleEvent[];
  count: number;
}

// POST /api/google-calendar/calendars/:calendarId/events
export interface CreateGoogleEventBody {
  title: string;
  description?: string;
  startDateTime: ISODateString;
  endDateTime: ISODateString;
  allDay?: boolean;
  timezone?: string;
  location?: string;
  attendees?: Array<{ email: EmailString; displayName?: string }>;
  reminders?: Array<{ type: string; minutes: number }>;
}

export interface CreateGoogleEventResponse {
  success: boolean;
  message: string;
  data: GoogleEvent;
}

// PUT /api/google-calendar/calendars/:calendarId/events/:eventId
export interface UpdateGoogleEventBody {
  title?: string;
  description?: string;
  startDateTime?: ISODateString;
  endDateTime?: ISODateString;
  allDay?: boolean;
  timezone?: string;
  location?: string;
  attendees?: Array<{ email: EmailString; displayName?: string }>;
  reminders?: Array<{ type: string; minutes: number }>;
}

export interface UpdateGoogleEventResponse {
  success: boolean;
  message: string;
  data: GoogleEvent;
}

// DELETE /api/google-calendar/calendars/:calendarId/events/:eventId
export interface DeleteGoogleEventResponse {
  success: boolean;
  message: string;
}

// PUT /api/google-calendar/settings/calendars
export interface UpdateSelectedCalendarsBody {
  calendars: SelectedCalendar[];
  primaryCalendarId?: string;
}

export interface UpdateSelectedCalendarsResponse {
  success: boolean;
  message: string;
  data: {
    selectedCalendars: SelectedCalendar[];
    primaryCalendarId: string;
  };
}

// PUT /api/google-calendar/settings/show-external-events
export interface ToggleShowExternalEventsBody {
  showExternalEvents: boolean;
}

export interface ToggleShowExternalEventsResponse {
  success: boolean;
  message: string;
  data: {
    showExternalEvents: boolean;
  };
}

// POST /api/google-calendar/watch/:calendarId
export interface WatchCalendarResponse {
  success: boolean;
  message: string;
  data: {
    channelId: string;
    resourceId: string;
    expiration: number;
  };
}

// DELETE /api/google-calendar/watch/:channelId
export interface StopWatchResponse {
  success: boolean;
  message: string;
}

// POST /api/google-calendar/sync/import (alias: /import)
export interface SyncFromGoogleResponse {
  success: boolean;
  message: string;
  data: {
    imported: number;
    skipped?: number;
    failed?: number;
  };
}

// POST /api/google-calendar/sync/export/:eventId (alias: /export)
export interface SyncToGoogleBody {
  eventId?: ObjectId; // For /export route
}

export interface SyncToGoogleResponse {
  success: boolean;
  message: string;
  data: {
    action: 'created' | 'updated';
    googleEventId: string;
    eventId: ObjectId;
  };
}

// POST /api/google-calendar/sync/auto/enable
export interface EnableAutoSyncBody {
  direction?: 'to_google' | 'from_google' | 'bidirectional';
  syncInterval?: 'manual' | 'hourly' | 'daily';
  conflictResolution?: 'google_wins' | 'traf3li_wins' | 'manual';
  syncPastEvents?: boolean;
  syncDaysBack?: number;
  syncDaysForward?: number;
}

export interface EnableAutoSyncResponse {
  success: boolean;
  message: string;
  data: AutoSyncSettings;
}

// POST /api/google-calendar/sync/auto/disable
export interface DisableAutoSyncResponse {
  success: boolean;
  message: string;
}

// GET /api/google-calendar/sync/settings
export interface GetGoogleSyncSettingsResponse {
  success: boolean;
  data: {
    autoSync: AutoSyncSettings;
    syncStats: SyncStats;
    lastSyncedAt: ISODateString;
    lastSyncError?: string;
  };
}

// POST /api/google-calendar/webhook
export interface GoogleCalendarWebhookHeaders {
  'x-goog-resource-state': string;
  'x-goog-resource-id'?: string;
  'x-goog-resource-uri'?: string;
  'x-goog-channel-id'?: string;
  'x-goog-channel-expiration'?: string;
}

// ═══════════════════════════════════════════════════════════════
// MICROSOFT CALENDAR INTEGRATION MODULE
// Routes: /api/microsoft-calendar
// Total Endpoints: 15
// ═══════════════════════════════════════════════════════════════

export interface MicrosoftCalendarIntegration {
  connected: boolean;
  email?: EmailString;
  displayName?: string;
  expiresAt?: ISODateString;
  calendars?: MicrosoftCalendar[];
  syncSettings?: MicrosoftSyncSettings;
  lastSyncedAt?: ISODateString;
}

export interface MicrosoftCalendar {
  id: string;
  name: string;
  color: ColorHexString;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  owner?: { name: string; address: string };
}

export interface MicrosoftSyncSettings {
  enabled: boolean;
  syncDirection: 'to_microsoft' | 'from_microsoft' | 'bidirectional';
  syncInterval: 'manual' | 'hourly' | 'daily';
  defaultCalendarId?: string;
  syncPastDays: number;
  syncFutureDays: number;
  lastSync?: ISODateString;
}

// GET /api/microsoft-calendar/auth
export interface GetMicrosoftAuthUrlResponse {
  success: boolean;
  data: {
    authUrl: URLString;
    state: string;
  };
}

// GET /api/microsoft-calendar/callback
export interface MicrosoftCalendarCallbackParams {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

// POST /api/microsoft-calendar/refresh-token
export interface RefreshMicrosoftTokenResponse {
  success: boolean;
  data: {
    expiresAt: ISODateString;
  };
}

// POST /api/microsoft-calendar/disconnect
export interface DisconnectMicrosoftCalendarResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: any;
}

// GET /api/microsoft-calendar/status
export interface GetMicrosoftCalendarStatusResponse {
  success: boolean;
  data: MicrosoftCalendarIntegration;
}

// GET /api/microsoft-calendar/calendars
export interface GetMicrosoftCalendarsResponse {
  success: boolean;
  data: MicrosoftCalendar[];
}

// GET /api/microsoft-calendar/events
export interface GetMicrosoftEventsParams {
  calendarId?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface MicrosoftEvent {
  id: string;
  subject: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    emailAddress: { name: string; address: string };
    status: { response: string };
  }>;
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  organizer?: { emailAddress: { name: string; address: string } };
  webLink?: string;
}

export interface GetMicrosoftEventsResponse {
  success: boolean;
  data: MicrosoftEvent[];
}

// POST /api/microsoft-calendar/events
export interface CreateMicrosoftEventBody {
  calendarId?: string;
  subject: string;
  body?: string;
  startDateTime: ISODateString;
  endDateTime: ISODateString;
  isAllDay?: boolean;
  location?: string;
  attendees?: Array<{ email: EmailString; name?: string }>;
  reminders?: Array<{ minutesBeforeStart: number }>;
}

export interface CreateMicrosoftEventResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: MicrosoftEvent;
}

// PUT /api/microsoft-calendar/events/:eventId
export interface UpdateMicrosoftEventBody {
  calendarId: string;
  subject?: string;
  body?: string;
  startDateTime?: ISODateString;
  endDateTime?: ISODateString;
  isAllDay?: boolean;
  location?: string;
  attendees?: Array<{ email: EmailString; name?: string }>;
}

export interface UpdateMicrosoftEventResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: MicrosoftEvent;
}

// DELETE /api/microsoft-calendar/events/:eventId
export interface DeleteMicrosoftEventParams {
  eventId: string;
  calendarId: string;
}

export interface DeleteMicrosoftEventResponse {
  success: boolean;
  message: string;
  message_en: string;
}

// POST /api/microsoft-calendar/sync/from-microsoft (alias: /import)
export interface SyncFromMicrosoftBody {
  calendarId?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface SyncFromMicrosoftResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: {
    imported: number;
    skipped?: number;
    failed?: number;
  };
}

// POST /api/microsoft-calendar/sync/to-microsoft/:eventId (alias: /export)
export interface SyncToMicrosoftBody {
  eventId?: ObjectId; // For /export route
}

export interface SyncToMicrosoftResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: {
    action: 'created' | 'updated';
    microsoftEventId: string;
    eventId: ObjectId;
  };
}

// POST /api/microsoft-calendar/sync/enable-auto-sync
export interface EnableMicrosoftAutoSyncBody {
  syncInterval: 'manual' | 'hourly' | 'daily';
  syncDirection: 'to_microsoft' | 'from_microsoft' | 'bidirectional';
  defaultCalendarId?: string;
  syncPastDays?: number; // default 30
  syncFutureDays?: number; // default 90
}

export interface EnableMicrosoftAutoSyncResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: MicrosoftSyncSettings;
}

// POST /api/microsoft-calendar/sync/disable-auto-sync
export interface DisableMicrosoftAutoSyncResponse {
  success: boolean;
  message: string;
  message_en: string;
  data: any;
}

// GET /api/microsoft-calendar/sync/settings
export interface GetMicrosoftSyncSettingsResponse {
  success: boolean;
  data: {
    autoSyncEnabled: boolean;
    syncDirection: string;
    syncInterval: string;
    selectedCalendars: string[];
    syncPastDays: number;
    syncFutureDays: number;
    lastSyncAt?: ISODateString;
  };
}

// ═══════════════════════════════════════════════════════════════
// APPOINTMENT MODULE
// Routes: /api/v1/appointments
// Total Endpoints: 26
// ═══════════════════════════════════════════════════════════════

export enum AppointmentStatus {
  Scheduled = 'scheduled',
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled',
  NoShow = 'no_show'
}

export enum AppointmentType {
  Consultation = 'consultation',
  FollowUp = 'follow_up',
  CaseReview = 'case_review',
  InitialMeeting = 'initial_meeting',
  CourtPreparation = 'court_preparation',
  DocumentReview = 'document_review'
}

export enum AppointmentLocationType {
  Office = 'office',
  Virtual = 'virtual',
  Phone = 'phone',
  Client = 'client'
}

export enum AppointmentSource {
  Manual = 'manual',
  Public = 'public',
  Import = 'import',
  API = 'api'
}

export interface Appointment {
  _id: ObjectId;
  appointmentNumber: string;
  customerName: string;
  customerEmail?: EmailString;
  customerPhone?: string;
  customerNotes?: string;
  subject?: string;
  scheduledTime: ISODateString;
  endTime: ISODateString;
  duration: number; // minutes
  assignedTo: ObjectId | UserBasicInfo;
  partyId?: ObjectId;
  caseId?: ObjectId;
  appointmentWith?: 'lawyer' | 'staff';
  locationType: AppointmentLocationType;
  location?: string;
  meetingLink?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  source: AppointmentSource;
  price?: number;
  currency?: string;
  isPaid?: boolean;
  paymentId?: string;
  paymentMethod?: string;
  sendReminder?: boolean;
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: ISODateString;
  calendarEventId?: string;
  cancelledBy?: ObjectId;
  cancelledAt?: ISODateString;
  cancellationReason?: string;
  createdBy: ObjectId;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// POST /api/v1/appointments/book/:firmId (Public)
export interface PublicBookAppointmentBody {
  clientName: string;
  clientEmail: EmailString;
  clientPhone?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  duration?: number;
  lawyerId: ObjectId;
  type?: AppointmentType;
  locationType?: AppointmentLocationType;
}

export interface PublicBookAppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// GET /api/v1/appointments/available-slots (Public/Private)
export interface GetAvailableSlotsParams {
  lawyerId?: ObjectId;
  date: string; // YYYY-MM-DD
  duration?: number;
  firmId?: ObjectId; // For public booking
}

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
  reason?: string;
}

export interface GetAvailableSlotsResponse {
  success: boolean;
  data: {
    date: string;
    dayOfWeek: string;
    working: boolean;
    workingHours?: { start: string; end: string };
    slots: TimeSlot[];
  };
}

// GET /api/v1/appointments/:id/calendar.ics
export interface DownloadICSParams {
  id: ObjectId;
}

// Returns ICS file (Content-Type: text/calendar)

// GET /api/v1/appointments/availability
export interface GetAvailabilityResponse {
  success: boolean;
  data: {
    lawyerId: ObjectId;
    schedule: WeeklySchedule;
  };
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  slots: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  _id?: ObjectId;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration?: number;
}

// POST /api/v1/appointments/availability
export interface CreateAvailabilityBody {
  dayOfWeek: keyof WeeklySchedule;
  startTime: string;
  endTime: string;
  duration?: number;
}

export interface CreateAvailabilityResponse {
  success: boolean;
  message: string;
  data: AvailabilitySlot;
}

// POST /api/v1/appointments/availability/bulk
export interface BulkUpdateAvailabilityBody {
  schedule: WeeklySchedule;
}

export interface BulkUpdateAvailabilityResponse {
  success: boolean;
  message: string;
  data: WeeklySchedule;
}

// PUT /api/v1/appointments/availability/:id
export interface UpdateAvailabilityBody {
  startTime?: string;
  endTime?: string;
  duration?: number;
  enabled?: boolean;
}

export interface UpdateAvailabilityResponse {
  success: boolean;
  message: string;
  data: AvailabilitySlot;
}

// DELETE /api/v1/appointments/availability/:id
export interface DeleteAvailabilityResponse {
  success: boolean;
  message: string;
}

// GET /api/v1/appointments/blocked-times
export interface BlockedTime {
  _id: ObjectId;
  lawyerId: ObjectId;
  startDateTime: ISODateString;
  endDateTime: ISODateString;
  reason?: string;
  isRecurring?: boolean;
  recurrencePattern?: any;
}

export interface GetBlockedTimesResponse {
  success: boolean;
  data: BlockedTime[];
}

// POST /api/v1/appointments/blocked-times
export interface CreateBlockedTimeBody {
  startDateTime: ISODateString;
  endDateTime: ISODateString;
  reason?: string;
  isRecurring?: boolean;
  recurrencePattern?: any;
}

export interface CreateBlockedTimeResponse {
  success: boolean;
  message: string;
  data: BlockedTime;
}

// DELETE /api/v1/appointments/blocked-times/:id
export interface DeleteBlockedTimeResponse {
  success: boolean;
  message: string;
}

// GET /api/v1/appointments/settings
export interface AppointmentSettings {
  enabled: boolean;
  defaultDuration: number;
  bufferBetweenAppointments: number;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  allowPublicBooking: boolean;
  requireApproval: boolean;
  workingHours: WeeklySchedule;
  emailNotifications: {
    sendConfirmation: boolean;
    sendReminder: boolean;
    reminderHoursBefore: number;
  };
}

export interface GetAppointmentSettingsResponse {
  success: boolean;
  data: AppointmentSettings;
}

// PUT /api/v1/appointments/settings
export interface UpdateAppointmentSettingsBody {
  enabled?: boolean;
  defaultDuration?: number;
  bufferBetweenAppointments?: number;
  maxAdvanceBookingDays?: number;
  minAdvanceBookingHours?: number;
  allowPublicBooking?: boolean;
  requireApproval?: boolean;
  workingHours?: Partial<WeeklySchedule>;
  emailNotifications?: Partial<AppointmentSettings['emailNotifications']>;
}

export interface UpdateAppointmentSettingsResponse {
  success: boolean;
  message: string;
  data: AppointmentSettings;
}

// GET /api/v1/appointments/stats
export interface AppointmentStats {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  today: number;
  byType: Record<AppointmentType, number>;
  byLocation: Record<AppointmentLocationType, number>;
  revenue: {
    total: number;
    paid: number;
    pending: number;
  };
}

export interface GetAppointmentStatsResponse {
  success: boolean;
  data: AppointmentStats;
}

// GET /api/v1/appointments/debug
export interface DebugAppointmentResponse {
  success: boolean;
  data: {
    userId: ObjectId;
    firmId?: ObjectId;
    isSoloLawyer: boolean;
    isDeparted: boolean;
    firmQuery: any;
    hasPermission: any;
  };
}

// GET /api/v1/appointments/calendar-status
export interface CalendarConnectionStatus {
  google: {
    connected: boolean;
    email?: EmailString;
    expiresAt?: ISODateString;
  };
  microsoft: {
    connected: boolean;
    email?: EmailString;
    expiresAt?: ISODateString;
  };
}

export interface GetCalendarStatusResponse {
  success: boolean;
  data: CalendarConnectionStatus;
}

// GET /api/v1/appointments/:id/calendar-links
export interface CalendarLink {
  type: 'google' | 'outlook' | 'yahoo' | 'apple' | 'ics';
  label: string;
  url: URLString;
}

export interface GetCalendarLinksResponse {
  success: boolean;
  data: CalendarLink[];
}

// POST /api/v1/appointments/:id/sync-calendar
export interface SyncAppointmentToCalendarResponse {
  success: boolean;
  message: string;
  data: {
    google?: { success: boolean; eventId?: string; error?: string };
    microsoft?: { success: boolean; eventId?: string; error?: string };
  };
}

// GET /api/v1/appointments
export interface GetAppointmentsParams extends PaginationParams {
  startDate?: ISODateString;
  endDate?: ISODateString;
  assignedTo?: ObjectId;
  status?: AppointmentStatus;
  partyId?: ObjectId;
  caseId?: ObjectId;
}

export interface GetAppointmentsResponse {
  success: boolean;
  data: {
    appointments: Appointment[];
    total: number;
    page: number;
    limit: number;
  };
}

// GET /api/v1/appointments/slots (Legacy)
export interface GetAppointmentSlotsParams {
  date: string;
  assignedTo?: ObjectId;
  duration?: number;
}

export interface GetAppointmentSlotsResponse {
  success: boolean;
  data: {
    date: string;
    dayOfWeek: string;
    working: boolean;
    workingHours?: { start: string; end: string };
    slots: TimeSlot[];
  };
}

// GET /api/v1/appointments/:id
export interface GetAppointmentByIdResponse {
  success: boolean;
  data: Appointment;
}

// POST /api/v1/appointments
export interface CreateAppointmentBody {
  customerName?: string;
  customerEmail?: EmailString;
  customerPhone?: string;
  customerNotes?: string;
  clientName?: string; // Alias for customerName
  clientEmail?: EmailString; // Alias for customerEmail
  clientPhone?: string; // Alias for customerPhone
  notes?: string; // Alias for customerNotes
  subject?: string;
  scheduledTime?: ISODateString;
  date?: string; // Alternative: YYYY-MM-DD (will be combined with startTime)
  startTime?: string; // Alternative: HH:MM (will be combined with date)
  duration?: number;
  assignedTo?: ObjectId;
  lawyerId?: ObjectId; // Alias for assignedTo
  partyId?: ObjectId;
  caseId?: ObjectId;
  appointmentWith?: 'lawyer' | 'staff';
  locationType?: AppointmentLocationType;
  location?: string;
  meetingLink?: string;
  type?: AppointmentType;
  source?: AppointmentSource;
  price?: number;
  currency?: string;
  sendReminder?: boolean;
}

export interface CreateAppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// PUT /api/v1/appointments/:id
export interface UpdateAppointmentBody {
  customerName?: string;
  customerEmail?: EmailString;
  customerPhone?: string;
  customerNotes?: string;
  clientName?: string;
  clientEmail?: EmailString;
  clientPhone?: string;
  notes?: string;
  subject?: string;
  scheduledTime?: ISODateString;
  date?: string;
  startTime?: string;
  duration?: number;
  assignedTo?: ObjectId;
  lawyerId?: ObjectId;
  partyId?: ObjectId;
  caseId?: ObjectId;
  locationType?: AppointmentLocationType;
  location?: string;
  meetingLink?: string;
  type?: AppointmentType;
  source?: AppointmentSource;
  price?: number;
  currency?: string;
  isPaid?: boolean;
  paymentId?: string;
  paymentMethod?: string;
  sendReminder?: boolean;
}

export interface UpdateAppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// PUT /api/v1/appointments/:id/confirm
export interface ConfirmAppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// PUT /api/v1/appointments/:id/complete
export interface CompleteAppointmentBody {
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: ISODateString;
}

export interface CompleteAppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// PUT /api/v1/appointments/:id/no-show
export interface MarkNoShowResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// POST /api/v1/appointments/:id/reschedule
export interface RescheduleAppointmentBody {
  scheduledTime?: ISODateString;
  date?: string;
  startTime?: string;
  duration?: number;
  reason?: string;
}

export interface RescheduleAppointmentResponse {
  success: boolean;
  message: string;
  data: Appointment;
}

// DELETE /api/v1/appointments/:id (Cancel)
export interface CancelAppointmentBody {
  reason?: string;
}

export interface CancelAppointmentResponse {
  success: boolean;
  message: string;
  data: {
    appointmentId: ObjectId;
    status: AppointmentStatus;
  };
}

// ═══════════════════════════════════════════════════════════════
// EVENT MODULE
// Routes: /api/events
// Total Endpoints: 24 (+ many more bulk and utility endpoints)
// ═══════════════════════════════════════════════════════════════

export enum EventType {
  Meeting = 'meeting',
  Session = 'session',
  Hearing = 'hearing',
  Deadline = 'deadline',
  Task = 'task',
  Other = 'other'
}

export enum EventStatus {
  Scheduled = 'scheduled',
  Confirmed = 'confirmed',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Postponed = 'postponed'
}

export enum EventPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
  Urgent = 'urgent'
}

export enum EventVisibility {
  Public = 'public',
  Private = 'private',
  Confidential = 'confidential'
}

export enum AttendeeStatus {
  Invited = 'invited',
  Confirmed = 'confirmed',
  Declined = 'declined',
  Tentative = 'tentative',
  Attended = 'attended'
}

export interface Event {
  _id: ObjectId;
  eventId: string;
  title: string;
  type: EventType;
  description?: string;
  startDateTime: ISODateString;
  endDateTime?: ISODateString;
  allDay: boolean;
  timezone: string;
  location?: string;
  caseId?: ObjectId;
  clientId?: ObjectId;
  organizer: ObjectId | UserBasicInfo;
  attendees: EventAttendee[];
  agenda: AgendaItem[];
  actionItems: ActionItem[];
  reminders: EventReminder[];
  recurrence: RecurrencePattern;
  priority: EventPriority;
  visibility: EventVisibility;
  status: EventStatus;
  color: ColorHexString;
  tags: string[];
  notes?: string;
  minutesNotes?: string;
  minutesRecordedBy?: ObjectId;
  minutesRecordedAt?: ISODateString;
  taskId?: ObjectId;
  isArchived?: boolean;
  completedAt?: ISODateString;
  completedBy?: ObjectId;
  cancelledAt?: ISODateString;
  cancelledBy?: ObjectId;
  cancellationReason?: string;
  postponedTo?: ISODateString;
  postponementReason?: string;
  createdBy: ObjectId;
  lastModifiedBy?: ObjectId;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EventAttendee {
  _id?: ObjectId;
  userId?: ObjectId;
  email?: EmailString;
  name?: string;
  role?: 'required' | 'optional' | 'organizer';
  isRequired: boolean;
  status: AttendeeStatus;
  responseNote?: string;
  respondedAt?: ISODateString;
}

export interface AgendaItem {
  _id?: ObjectId;
  title: string;
  description?: string;
  duration?: number; // minutes
  presenter?: ObjectId;
  notes?: string;
  order: number;
  completed: boolean;
  completedAt?: ISODateString;
}

export interface ActionItem {
  _id?: ObjectId;
  title: string;
  description?: string;
  assignedTo?: ObjectId;
  dueDate?: ISODateString;
  priority?: EventPriority;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: ISODateString;
  completedBy?: ObjectId;
}

export interface EventReminder {
  _id?: ObjectId;
  type: 'notification' | 'email' | 'sms';
  beforeMinutes: number;
  sent: boolean;
  sentAt?: ISODateString;
}

export interface RecurrencePattern {
  enabled: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: string[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: ISODateString;
  occurrences?: number;
}

// POST /api/events
export interface CreateEventBody {
  title?: string;
  type?: EventType;
  description?: string;
  startDateTime?: ISODateString;
  endDateTime?: ISODateString;
  allDay?: boolean;
  timezone?: string;
  location?: string;
  caseId?: ObjectId;
  clientId?: ObjectId;
  attendees?: EventAttendee[];
  agenda?: Omit<AgendaItem, '_id'>[];
  reminders?: Omit<EventReminder, '_id'>[];
  recurrence?: RecurrencePattern;
  priority?: EventPriority;
  visibility?: EventVisibility;
  color?: ColorHexString;
  tags?: string[];
  notes?: string;
}

export interface CreateEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// GET /api/events
export interface GetEventsParams extends PaginationParams {
  startDate?: ISODateString;
  endDate?: ISODateString;
  type?: EventType | EventType[];
  caseId?: ObjectId;
  clientId?: ObjectId;
  status?: EventStatus | EventStatus[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: 'true' | 'false';
  isArchived?: 'true' | 'false' | 'only';
}

export interface GetEventsResponse {
  success: boolean;
  events: Event[];
  tasks: any[]; // Tasks in date range
  data: { events: Event[]; tasks: any[] };
  total: number;
  pagination: PaginationResponse;
  stats?: {
    total: number;
    upcoming: number;
    past: number;
    today: number;
    byType: Record<EventType, number>;
  };
}

// GET /api/events/:id
export interface GetEventResponse {
  success: boolean;
  data: Event;
}

// PUT /api/events/:id
// PATCH /api/events/:id
export interface UpdateEventBody {
  title?: string;
  type?: EventType;
  description?: string;
  startDateTime?: ISODateString;
  endDateTime?: ISODateString;
  allDay?: boolean;
  timezone?: string;
  location?: string;
  caseId?: ObjectId;
  clientId?: ObjectId;
  attendees?: EventAttendee[];
  agenda?: AgendaItem[];
  actionItems?: ActionItem[];
  reminders?: EventReminder[];
  recurrence?: RecurrencePattern;
  priority?: EventPriority;
  visibility?: EventVisibility;
  color?: ColorHexString;
  tags?: string[];
  notes?: string;
  minutesNotes?: string;
}

export interface UpdateEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// DELETE /api/events/:id
export interface DeleteEventResponse {
  success: boolean;
  message: string;
}

// POST /api/events/:id/complete
export interface CompleteEventBody {
  minutesNotes?: string;
}

export interface CompleteEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/cancel
export interface CancelEventBody {
  reason?: string;
}

export interface CancelEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/postpone
export interface PostponeEventBody {
  newDateTime: ISODateString;
  reason?: string;
}

export interface PostponeEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/clone
export interface CloneEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/reschedule
export interface RescheduleEventBody {
  startDateTime: ISODateString;
  endDateTime?: ISODateString;
}

export interface RescheduleEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// GET /api/events/:id/activity
export interface EventActivity {
  _id: ObjectId;
  eventId: ObjectId;
  action: string;
  performedBy: ObjectId | UserBasicInfo;
  changes?: any;
  timestamp: ISODateString;
}

export interface GetEventActivityResponse {
  success: boolean;
  data: EventActivity[];
}

// POST /api/events/:id/archive
export interface ArchiveEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/unarchive
export interface UnarchiveEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// PUT /api/events/:id/location-trigger
export interface UpdateLocationTriggerBody {
  enabled: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // meters
  action?: 'notify' | 'check_in';
}

export interface UpdateLocationTriggerResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/location/check
export interface CheckLocationTriggerBody {
  latitude: number;
  longitude: number;
}

export interface CheckLocationTriggerResponse {
  success: boolean;
  data: {
    triggered: boolean;
    distance?: number;
    action?: string;
  };
}

// POST /api/events/:id/attendees
export interface AddAttendeeBody {
  userId?: ObjectId;
  email?: EmailString;
  name?: string;
  role?: 'required' | 'optional';
  isRequired?: boolean;
}

export interface AddAttendeeResponse {
  success: boolean;
  message: string;
  data: EventAttendee[];
}

// DELETE /api/events/:id/attendees/:attendeeId
export interface RemoveAttendeeResponse {
  success: boolean;
  message: string;
}

// POST /api/events/:id/rsvp
export interface RSVPEventBody {
  status: 'confirmed' | 'declined' | 'tentative';
  responseNote?: string;
}

export interface RSVPEventResponse {
  success: boolean;
  message: string;
  data: Event;
}

// POST /api/events/:id/agenda
export interface AddAgendaItemBody {
  title: string;
  description?: string;
  duration?: number;
  presenter?: ObjectId;
  notes?: string;
}

export interface AddAgendaItemResponse {
  success: boolean;
  message: string;
  data: AgendaItem[];
}

// PUT /api/events/:id/agenda/:agendaId
export interface UpdateAgendaItemBody {
  title?: string;
  description?: string;
  duration?: number;
  presenter?: ObjectId;
  notes?: string;
  order?: number;
  completed?: boolean;
}

export interface UpdateAgendaItemResponse {
  success: boolean;
  message: string;
  data: AgendaItem[];
}

// DELETE /api/events/:id/agenda/:agendaId
export interface DeleteAgendaItemResponse {
  success: boolean;
  message: string;
}

// POST /api/events/:id/action-items
export interface AddActionItemBody {
  title: string;
  description?: string;
  assignedTo?: ObjectId;
  dueDate?: ISODateString;
  priority?: EventPriority;
}

export interface AddActionItemResponse {
  success: boolean;
  message: string;
  data: ActionItem[];
}

// PUT /api/events/:id/action-items/:itemId
export interface UpdateActionItemBody {
  title?: string;
  description?: string;
  assignedTo?: ObjectId;
  dueDate?: ISODateString;
  priority?: EventPriority;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface UpdateActionItemResponse {
  success: boolean;
  message: string;
  data: ActionItem[];
}

// DELETE /api/events/:id/action-items/:itemId
export interface DeleteActionItemResponse {
  success: boolean;
  message: string;
}

// GET /api/events/stats
export interface GetEventStatsResponse {
  success: boolean;
  data: {
    total: number;
    upcoming: number;
    past: number;
    today: number;
    byType: Record<EventType, number>;
    byStatus: Record<EventStatus, number>;
    byPriority: Record<EventPriority, number>;
  };
}

// GET /api/events/calendar
export interface GetCalendarEventsParams extends DateRangeParams {
  type?: EventType | EventType[];
  status?: EventStatus | EventStatus[];
}

export interface GetCalendarEventsResponse {
  success: boolean;
  data: Event[];
}

// GET /api/events/upcoming
export interface GetUpcomingEventsParams {
  days?: number; // default 7
  limit?: number;
}

export interface GetUpcomingEventsResponse {
  success: boolean;
  data: Event[];
}

// GET /api/events/month/:year/:month
export interface GetEventsByMonthParams {
  year: string;
  month: string;
}

export interface GetEventsByMonthResponse {
  success: boolean;
  data: {
    month: { year: number; month: number };
    events: Event[];
    groupedByDate: Record<string, Event[]>;
  };
}

// GET /api/events/date/:date
export interface GetEventsByDateParams {
  date: string; // YYYY-MM-DD
}

export interface GetEventsByDateResponse {
  success: boolean;
  data: Event[];
}

// POST /api/events/availability
export interface CheckAvailabilityBody {
  userId: ObjectId;
  startDateTime: ISODateString;
  endDateTime: ISODateString;
}

export interface CheckAvailabilityResponse {
  success: boolean;
  data: {
    available: boolean;
    conflicts?: Event[];
  };
}

// POST /api/events/import/ics
export interface ImportEventsFromICSResponse {
  success: boolean;
  message: string;
  data: {
    imported: number;
    skipped: number;
    failed: number;
    events: Event[];
  };
}

// GET /api/events/conflicts
export interface GetConflictsParams extends DateRangeParams {
  userId?: ObjectId;
}

export interface GetConflictsResponse {
  success: boolean;
  data: Array<{
    event1: Event;
    event2: Event;
    overlapMinutes: number;
  }>;
}

// GET /api/events/search
export interface SearchEventsParams {
  q: string;
  type?: EventType | EventType[];
  status?: EventStatus | EventStatus[];
  startDate?: ISODateString;
  endDate?: ISODateString;
  limit?: number;
}

export interface SearchEventsResponse {
  success: boolean;
  data: Event[];
  count: number;
}

// GET /api/events/client/:clientId
export interface GetEventsByClientParams {
  clientId: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface GetEventsByClientResponse {
  success: boolean;
  data: Event[];
}

// POST /api/events/bulk
export interface BulkCreateEventsBody {
  events: CreateEventBody[];
}

export interface BulkCreateEventsResponse {
  success: boolean;
  message: string;
  data: {
    created: Event[];
    failed: Array<{ index: number; error: string }>;
  };
}

// PUT /api/events/bulk
export interface BulkUpdateEventsBody {
  eventIds: ObjectId[];
  updates: Partial<UpdateEventBody>;
}

export interface BulkUpdateEventsResponse {
  success: boolean;
  message: string;
  data: {
    updated: number;
    failed: number;
  };
}

// DELETE /api/events/bulk
export interface BulkDeleteEventsBody {
  eventIds: ObjectId[];
}

export interface BulkDeleteEventsResponse {
  success: boolean;
  message: string;
  data: {
    deleted: number;
    failed: number;
  };
}

// POST /api/events/bulk/complete
export interface BulkCompleteEventsBody {
  eventIds: ObjectId[];
  minutesNotes?: string;
}

export interface BulkCompleteEventsResponse {
  success: boolean;
  message: string;
  data: {
    completed: number;
    failed: number;
  };
}

// POST /api/events/bulk/archive
export interface BulkArchiveEventsBody {
  eventIds: ObjectId[];
}

export interface BulkArchiveEventsResponse {
  success: boolean;
  message: string;
  data: {
    archived: number;
    failed: number;
  };
}

// POST /api/events/bulk/unarchive
export interface BulkUnarchiveEventsBody {
  eventIds: ObjectId[];
}

export interface BulkUnarchiveEventsResponse {
  success: boolean;
  message: string;
  data: {
    unarchived: number;
    failed: number;
  };
}

// GET /api/events/ids
export interface GetAllEventIdsParams {
  status?: EventStatus | EventStatus[];
  isArchived?: boolean;
}

export interface GetAllEventIdsResponse {
  success: boolean;
  data: ObjectId[];
  count: number;
}

// GET /api/events/archived
export interface GetArchivedEventsParams extends PaginationParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetArchivedEventsResponse {
  success: boolean;
  data: Event[];
  total: number;
  pagination: PaginationResponse;
}

// GET /api/events/export
export interface ExportEventsParams {
  format?: 'json' | 'csv' | 'ics';
  startDate?: ISODateString;
  endDate?: ISODateString;
  type?: EventType | EventType[];
  status?: EventStatus | EventStatus[];
}

export interface ExportEventsResponse {
  success: boolean;
  data: any; // Format depends on 'format' param
  format: string;
}

// PATCH /api/events/reorder
export interface ReorderEventsBody {
  eventIds: ObjectId[]; // Order of IDs determines new order
}

export interface ReorderEventsResponse {
  success: boolean;
  message: string;
  data: {
    reordered: number;
  };
}

// GET /api/events/case/:caseId
export interface GetEventsByCaseParams {
  caseId: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface GetEventsByCaseResponse {
  success: boolean;
  data: Event[];
}

// GET /api/events/location-triggers
export interface GetEventsWithLocationTriggersResponse {
  success: boolean;
  data: Event[];
}

// POST /api/events/location/check
export interface BulkCheckLocationTriggersBody {
  latitude: number;
  longitude: number;
  eventIds?: ObjectId[]; // If not provided, checks all nearby events
}

export interface BulkCheckLocationTriggersResponse {
  success: boolean;
  data: Array<{
    eventId: ObjectId;
    triggered: boolean;
    distance: number;
    action: string;
  }>;
}

// POST /api/events/parse (NLP)
export interface CreateEventFromNaturalLanguageBody {
  text: string;
  timezone?: string;
}

export interface CreateEventFromNaturalLanguageResponse {
  success: boolean;
  message: string;
  data: {
    parsed: {
      title?: string;
      startDateTime?: ISODateString;
      endDateTime?: ISODateString;
      location?: string;
      description?: string;
    };
    event: Event;
  };
}

// POST /api/events/voice (Voice to Event)
export interface CreateEventFromVoiceBody {
  audioData: string; // Base64 encoded audio
  language?: string; // default 'ar' or 'en'
  timezone?: string;
}

export interface CreateEventFromVoiceResponse {
  success: boolean;
  message: string;
  data: {
    transcription: string;
    parsed: any;
    event: Event;
  };
}

// GET /api/events/:id/export/ics
export interface ExportEventToICSParams {
  id: ObjectId;
}

// Returns ICS file (Content-Type: text/calendar)

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * ENDPOINT COUNT SUMMARY
 *
 * Calendar Module: 10 endpoints
 * Google Calendar Integration: 18 endpoints
 * Microsoft Calendar Integration: 15 endpoints
 * Appointment Module: 26 endpoints
 * Event Module: 24 main endpoints + ~20 additional utility/bulk endpoints
 *
 * TOTAL: 93+ documented endpoints
 */
