/**
 * Integration Modules Extended TypeScript Type Definitions
 *
 * This file contains comprehensive type definitions for:
 * - Event Management (51 endpoints)
 * - Appointment Scheduling (28 endpoints)
 * - WhatsApp Integration (24 endpoints)
 * - Gmail Integration (18 endpoints)
 * - DocuSign Integration (17 endpoints)
 * - Zoom Integration (14 endpoints)
 * - Slack Integration (12 endpoints)
 * - Discord Integration (11 endpoints)
 * - Telegram Integration (11 endpoints)
 * - GitHub Integration (12 endpoints)
 * - Trello Integration (16 endpoints)
 * - OAuth/SSO Integration (15 endpoints)
 * - Third-Party Integrations (45 endpoints - QuickBooks, Xero)
 *
 * Generated from route and controller analysis
 * Total Endpoints: 264+
 * Gold Standard: Enterprise-grade integration patterns from AWS, Google, Microsoft
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════

export type ObjectId = string;
export type ISODateString = string;
export type EmailString = string;
export type URLString = string;
export type ColorHexString = string;
export type PhoneNumber = string;
export type Base64String = string;
export type HMACSignature = string;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string | boolean;
  data?: T;
  cached?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  perPage?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pages?: number;
  hasMore: boolean;
  count?: number;
}

export interface DateRangeParams {
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface UserBasicInfo {
  _id: ObjectId;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  image?: string;
  email?: EmailString;
  avatar?: string;
}

// ═══════════════════════════════════════════════════════════════
// EVENT MANAGEMENT MODULE
// Routes: /api/events
// Total Endpoints: 51
// Features: CRUD, Calendar sync, Attendees, Agenda, Action items, Location triggers
// ═══════════════════════════════════════════════════════════════

export namespace EventManagement {
  // Enums
  export enum EventStatus {
    Scheduled = 'scheduled',
    InProgress = 'in_progress',
    Completed = 'completed',
    Cancelled = 'cancelled',
    Postponed = 'postponed',
    Archived = 'archived'
  }

  export enum EventType {
    Meeting = 'meeting',
    Hearing = 'hearing',
    Consultation = 'consultation',
    Conference = 'conference',
    Appointment = 'appointment',
    CourtDate = 'court_date',
    Deadline = 'deadline',
    Other = 'other'
  }

  export enum EventPriority {
    Low = 'low',
    Medium = 'medium',
    High = 'high',
    Critical = 'critical',
    Urgent = 'urgent'
  }

  export enum AttendeeStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Declined = 'declined',
    Tentative = 'tentative',
    NeedsAction = 'needs_action'
  }

  export enum RecurrenceFrequency {
    Daily = 'daily',
    Weekly = 'weekly',
    Monthly = 'monthly',
    Yearly = 'yearly'
  }

  export enum ReminderType {
    Email = 'email',
    Notification = 'notification',
    SMS = 'sms',
    Push = 'push'
  }

  // Core Interfaces
  export interface Event {
    _id: ObjectId;
    title: string;
    description?: string;
    type: EventType;
    status: EventStatus;
    priority: EventPriority;
    startDate: ISODateString;
    endDate: ISODateString;
    startTime?: string;
    endTime?: string;
    duration?: number; // minutes
    allDay: boolean;
    location?: EventLocation;
    organizer: ObjectId | UserBasicInfo;
    attendees: EventAttendee[];
    caseId?: ObjectId;
    clientId?: ObjectId;
    color?: ColorHexString;
    isRecurring?: boolean;
    recurrence?: RecurrenceRule;
    reminders?: EventReminder[];
    agenda?: AgendaItem[];
    actionItems?: ActionItem[];
    notes?: string;
    attachments?: string[];
    calendarEventId?: string; // Google/Microsoft Calendar Event ID
    syncedToCalendar?: boolean;
    visibility?: 'public' | 'private' | 'confidential';
    showAsBusy?: boolean;
    createdBy: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    isArchived?: boolean;
    archivedAt?: ISODateString;
    order?: number;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface EventLocation {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    meetingUrl?: URLString; // Zoom, Teams, etc.
    conferenceRoom?: string;
    notes?: string;
    // Location trigger (Gold Standard - matches Reminders/Tasks)
    trigger?: {
      enabled: boolean;
      radius?: number; // meters
      action?: 'notify' | 'check_in' | 'start_timer';
      triggeredAt?: ISODateString;
      triggerCount?: number;
    };
  }

  export interface EventAttendee {
    _id?: ObjectId;
    userId?: ObjectId;
    email: EmailString;
    name: string;
    role?: 'required' | 'optional' | 'organizer';
    status: AttendeeStatus;
    responseDate?: ISODateString;
    notes?: string;
    isExternal?: boolean;
  }

  export interface RecurrenceRule {
    frequency: RecurrenceFrequency;
    interval?: number; // e.g., every 2 weeks
    count?: number; // number of occurrences
    until?: ISODateString; // end date
    byDay?: string[]; // ['MO', 'WE', 'FR']
    byMonthDay?: number[]; // [1, 15]
    byMonth?: number[]; // [1, 6, 12]
    exceptions?: ISODateString[]; // skip these dates
  }

  export interface EventReminder {
    _id?: ObjectId;
    type: ReminderType;
    minutesBefore: number;
    sent?: boolean;
    sentAt?: ISODateString;
    recipients?: EmailString[];
  }

  export interface AgendaItem {
    _id?: ObjectId;
    title: string;
    description?: string;
    duration?: number; // minutes
    presenter?: string;
    order: number;
    completed?: boolean;
    notes?: string;
    createdAt?: ISODateString;
  }

  export interface ActionItem {
    _id?: ObjectId;
    title: string;
    description?: string;
    assignedTo?: ObjectId;
    dueDate?: ISODateString;
    priority?: EventPriority;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    completedAt?: ISODateString;
    completedBy?: ObjectId;
    notes?: string;
    createdAt?: ISODateString;
    updatedAt?: ISODateString;
  }

  export interface EventActivity {
    _id: ObjectId;
    eventId: ObjectId;
    action: 'created' | 'updated' | 'cancelled' | 'completed' | 'postponed' | 'rsvp' | 'attendee_added' | 'attendee_removed';
    performedBy: ObjectId | UserBasicInfo;
    changes?: any;
    timestamp: ISODateString;
    ipAddress?: string;
    userAgent?: string;
  }

  export interface EventConflict {
    eventId: ObjectId;
    conflictingEventId: ObjectId;
    event: Event;
    conflictingEvent: Event;
    overlapStart: ISODateString;
    overlapEnd: ISODateString;
    overlapMinutes: number;
  }

  // Request/Response Interfaces

  // POST /api/events - Create Event
  export interface CreateEventRequest {
    title: string;
    description?: string;
    type: EventType;
    priority?: EventPriority;
    startDate: ISODateString;
    endDate: ISODateString;
    startTime?: string;
    endTime?: string;
    duration?: number;
    allDay?: boolean;
    location?: Partial<EventLocation>;
    attendees?: Array<{
      email: EmailString;
      name: string;
      role?: 'required' | 'optional';
    }>;
    caseId?: ObjectId;
    clientId?: ObjectId;
    color?: ColorHexString;
    isRecurring?: boolean;
    recurrence?: RecurrenceRule;
    reminders?: Array<{
      type: ReminderType;
      minutesBefore: number;
    }>;
    notes?: string;
    visibility?: 'public' | 'private' | 'confidential';
    showAsBusy?: boolean;
  }

  export interface CreateEventResponse extends ApiResponse<Event> {}

  // GET /api/events - Get All Events
  export interface GetEventsParams extends PaginationParams, DateRangeParams {
    status?: EventStatus | EventStatus[];
    type?: EventType | EventType[];
    priority?: EventPriority | EventPriority[];
    caseId?: ObjectId;
    clientId?: ObjectId;
    attendeeId?: ObjectId;
    search?: string;
    isRecurring?: boolean;
    isArchived?: boolean;
    sortBy?: 'startDate' | 'createdAt' | 'priority' | 'title';
    sortOrder?: 'asc' | 'desc';
  }

  export interface GetEventsResponse extends ApiResponse {
    data: {
      events: Event[];
      pagination: PaginationResponse;
    };
  }

  // GET /api/events/:id - Get Single Event
  export interface GetEventResponse extends ApiResponse<Event> {}

  // PUT /api/events/:id - Update Event
  export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

  export interface UpdateEventResponse extends ApiResponse<Event> {}

  // DELETE /api/events/:id - Delete Event
  export interface DeleteEventResponse extends ApiResponse {
    message: string;
  }

  // POST /api/events/:id/complete - Complete Event
  export interface CompleteEventRequest {
    notes?: string;
    actionItems?: Array<{
      title: string;
      assignedTo?: ObjectId;
      dueDate?: ISODateString;
    }>;
  }

  export interface CompleteEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/cancel - Cancel Event
  export interface CancelEventRequest {
    reason?: string;
    notifyAttendees?: boolean;
  }

  export interface CancelEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/postpone - Postpone Event
  export interface PostponeEventRequest {
    newStartDate: ISODateString;
    newEndDate: ISODateString;
    reason?: string;
    notifyAttendees?: boolean;
  }

  export interface PostponeEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/reschedule - Reschedule Event
  export interface RescheduleEventRequest {
    startDate: ISODateString;
    endDate: ISODateString;
    startTime?: string;
    endTime?: string;
    notifyAttendees?: boolean;
  }

  export interface RescheduleEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/clone - Clone Event
  export interface CloneEventRequest {
    startDate?: ISODateString;
    title?: string;
  }

  export interface CloneEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/attendees - Add Attendee
  export interface AddAttendeeRequest {
    email: EmailString;
    name: string;
    role?: 'required' | 'optional';
    sendInvitation?: boolean;
  }

  export interface AddAttendeeResponse extends ApiResponse<Event> {}

  // DELETE /api/events/:id/attendees/:attendeeId - Remove Attendee
  export interface RemoveAttendeeResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/rsvp - RSVP to Event
  export interface RSVPEventRequest {
    status: AttendeeStatus;
    notes?: string;
  }

  export interface RSVPEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/agenda - Add Agenda Item
  export interface AddAgendaItemRequest {
    title: string;
    description?: string;
    duration?: number;
    presenter?: string;
    order?: number;
  }

  export interface AddAgendaItemResponse extends ApiResponse<Event> {}

  // PUT /api/events/:id/agenda/:agendaId - Update Agenda Item
  export interface UpdateAgendaItemRequest extends Partial<AddAgendaItemRequest> {
    completed?: boolean;
    notes?: string;
  }

  export interface UpdateAgendaItemResponse extends ApiResponse<Event> {}

  // DELETE /api/events/:id/agenda/:agendaId - Delete Agenda Item
  export interface DeleteAgendaItemResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/action-items - Add Action Item
  export interface AddActionItemRequest {
    title: string;
    description?: string;
    assignedTo?: ObjectId;
    dueDate?: ISODateString;
    priority?: EventPriority;
  }

  export interface AddActionItemResponse extends ApiResponse<Event> {}

  // PUT /api/events/:id/action-items/:itemId - Update Action Item
  export interface UpdateActionItemRequest extends Partial<AddActionItemRequest> {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
  }

  export interface UpdateActionItemResponse extends ApiResponse<Event> {}

  // DELETE /api/events/:id/action-items/:itemId - Delete Action Item
  export interface DeleteActionItemResponse extends ApiResponse<Event> {}

  // GET /api/events/calendar - Get Calendar Events
  export interface GetCalendarEventsParams extends DateRangeParams {
    view?: 'month' | 'week' | 'day' | 'agenda';
    timezone?: string;
  }

  export interface GetCalendarEventsResponse extends ApiResponse {
    data: {
      events: Event[];
      dateRange: {
        start: ISODateString;
        end: ISODateString;
      };
    };
  }

  // GET /api/events/upcoming - Get Upcoming Events
  export interface GetUpcomingEventsParams {
    limit?: number;
    days?: number; // next N days
  }

  export interface GetUpcomingEventsResponse extends ApiResponse {
    data: {
      events: Event[];
      count: number;
    };
  }

  // GET /api/events/date/:date - Get Events by Date
  export interface GetEventsByDateResponse extends ApiResponse {
    data: {
      events: Event[];
      date: string;
    };
  }

  // GET /api/events/month/:year/:month - Get Events by Month
  export interface GetEventsByMonthResponse extends ApiResponse {
    data: {
      events: Event[];
      year: number;
      month: number;
    };
  }

  // GET /api/events/stats - Get Event Statistics
  export interface GetEventStatsResponse extends ApiResponse {
    data: {
      total: number;
      byStatus: Record<EventStatus, number>;
      byType: Record<EventType, number>;
      byPriority: Record<EventPriority, number>;
      upcoming: number;
      overdue: number;
      completedThisMonth: number;
      completedThisWeek: number;
    };
  }

  // POST /api/events/availability - Check Availability
  export interface CheckAvailabilityRequest {
    startDate: ISODateString;
    endDate: ISODateString;
    attendees?: ObjectId[];
    excludeEventId?: ObjectId;
  }

  export interface CheckAvailabilityResponse extends ApiResponse {
    data: {
      available: boolean;
      conflicts: EventConflict[];
      suggestions?: Array<{
        start: ISODateString;
        end: ISODateString;
      }>;
    };
  }

  // GET /api/events/:id/export/ics - Export Event to ICS
  export interface ExportEventToICSResponse {
    // Returns ICS file download
    contentType: 'text/calendar';
    filename: string;
    content: string; // ICS format
  }

  // POST /api/events/import/ics - Import Events from ICS
  export interface ImportEventsFromICSRequest {
    file: File; // ICS file
  }

  export interface ImportEventsFromICSResponse extends ApiResponse {
    data: {
      imported: number;
      skipped: number;
      errors: Array<{
        line: number;
        error: string;
      }>;
      events: Event[];
    };
  }

  // POST /api/events/parse - Create Event from Natural Language
  export interface CreateEventFromNLPRequest {
    text: string; // "Meeting with client tomorrow at 2pm for 1 hour"
    timezone?: string;
  }

  export interface CreateEventFromNLPResponse extends ApiResponse {
    data: {
      event: Event;
      confidence: number;
      parsedFields: {
        title?: string;
        date?: string;
        time?: string;
        duration?: number;
        location?: string;
      };
    };
  }

  // POST /api/events/voice - Create Event from Voice
  export interface CreateEventFromVoiceRequest {
    audio: Base64String | File;
    format?: 'wav' | 'mp3' | 'ogg';
    language?: string;
  }

  export interface CreateEventFromVoiceResponse extends CreateEventFromNLPResponse {}

  // GET /api/events/conflicts - Get Event Conflicts
  export interface GetConflictsParams extends DateRangeParams {
    attendeeId?: ObjectId;
  }

  export interface GetConflictsResponse extends ApiResponse {
    data: {
      conflicts: EventConflict[];
      count: number;
    };
  }

  // POST /api/events/bulk - Bulk Create Events
  export interface BulkCreateEventsRequest {
    events: CreateEventRequest[];
  }

  export interface BulkCreateEventsResponse extends ApiResponse {
    data: {
      created: Event[];
      failed: Array<{
        event: CreateEventRequest;
        error: string;
      }>;
      count: number;
    };
  }

  // PUT /api/events/bulk - Bulk Update Events
  export interface BulkUpdateEventsRequest {
    eventIds: ObjectId[];
    updates: Partial<UpdateEventRequest>;
  }

  export interface BulkUpdateEventsResponse extends ApiResponse {
    data: {
      updated: number;
      failed: number;
      events: Event[];
    };
  }

  // DELETE /api/events/bulk - Bulk Delete Events
  export interface BulkDeleteEventsRequest {
    eventIds: ObjectId[];
  }

  export interface BulkDeleteEventsResponse extends ApiResponse {
    data: {
      deleted: number;
      failed: number;
    };
  }

  // POST /api/events/bulk/complete - Bulk Complete Events
  export interface BulkCompleteEventsRequest {
    eventIds: ObjectId[];
    notes?: string;
  }

  export interface BulkCompleteEventsResponse extends BulkUpdateEventsResponse {}

  // POST /api/events/bulk/archive - Bulk Archive Events
  export interface BulkArchiveEventsRequest {
    eventIds: ObjectId[];
  }

  export interface BulkArchiveEventsResponse extends BulkUpdateEventsResponse {}

  // POST /api/events/bulk/unarchive - Bulk Unarchive Events
  export interface BulkUnarchiveEventsRequest {
    eventIds: ObjectId[];
  }

  export interface BulkUnarchiveEventsResponse extends BulkUpdateEventsResponse {}

  // POST /api/events/:id/archive - Archive Event
  export interface ArchiveEventResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/unarchive - Unarchive Event
  export interface UnarchiveEventResponse extends ApiResponse<Event> {}

  // GET /api/events/ids - Get All Event IDs
  export interface GetAllEventIdsParams {
    status?: EventStatus;
    isArchived?: boolean;
  }

  export interface GetAllEventIdsResponse extends ApiResponse {
    data: {
      ids: ObjectId[];
      count: number;
    };
  }

  // GET /api/events/archived - Get Archived Events
  export interface GetArchivedEventsParams extends PaginationParams {
    sortBy?: 'archivedAt' | 'title';
  }

  export interface GetArchivedEventsResponse extends ApiResponse {
    data: {
      events: Event[];
      pagination: PaginationResponse;
    };
  }

  // GET /api/events/case/:caseId - Get Events by Case
  export interface GetEventsByCaseResponse extends ApiResponse {
    data: {
      events: Event[];
      count: number;
    };
  }

  // GET /api/events/client/:clientId - Get Events by Client
  export interface GetEventsByClientResponse extends ApiResponse {
    data: {
      events: Event[];
      count: number;
    };
  }

  // GET /api/events/search - Search Events
  export interface SearchEventsParams extends PaginationParams {
    q: string;
    fields?: ('title' | 'description' | 'location' | 'notes')[];
    status?: EventStatus[];
    type?: EventType[];
  }

  export interface SearchEventsResponse extends ApiResponse {
    data: {
      events: Event[];
      pagination: PaginationResponse;
      query: string;
    };
  }

  // GET /api/events/:id/activity - Get Event Activity Log
  export interface GetEventActivityResponse extends ApiResponse {
    data: {
      activities: EventActivity[];
      count: number;
    };
  }

  // PUT /api/events/:id/location-trigger - Update Location Trigger
  export interface UpdateLocationTriggerRequest {
    enabled: boolean;
    radius?: number;
    action?: 'notify' | 'check_in' | 'start_timer';
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }

  export interface UpdateLocationTriggerResponse extends ApiResponse<Event> {}

  // POST /api/events/:id/location/check - Check Location Trigger
  export interface CheckLocationTriggerRequest {
    currentLocation: {
      latitude: number;
      longitude: number;
    };
  }

  export interface CheckLocationTriggerResponse extends ApiResponse {
    data: {
      triggered: boolean;
      distance?: number; // meters
      action?: string;
      message?: string;
    };
  }

  // GET /api/events/location-triggers - Get Events with Location Triggers
  export interface GetEventsWithLocationTriggersResponse extends ApiResponse {
    data: {
      events: Event[];
      count: number;
    };
  }

  // POST /api/events/location/check - Bulk Check Location Triggers
  export interface BulkCheckLocationTriggersRequest {
    currentLocation: {
      latitude: number;
      longitude: number;
    };
  }

  export interface BulkCheckLocationTriggersResponse extends ApiResponse {
    data: {
      triggered: Event[];
      count: number;
    };
  }

  // GET /api/events/export - Export Events
  export interface ExportEventsParams {
    format: 'csv' | 'xlsx' | 'pdf' | 'json';
    status?: EventStatus[];
    startDate?: ISODateString;
    endDate?: ISODateString;
  }

  export interface ExportEventsResponse {
    // Returns file download
    contentType: string;
    filename: string;
    content: string | Buffer;
  }

  // PATCH /api/events/reorder - Reorder Events
  export interface ReorderEventsRequest {
    eventIds: ObjectId[]; // Ordered array
  }

  export interface ReorderEventsResponse extends ApiResponse {
    data: {
      updated: number;
      events: Event[];
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// APPOINTMENT SCHEDULING MODULE
// Routes: /api/appointments
// Total Endpoints: 28
// Features: Booking, Availability, Blocked times, Settings, ICS export
// Gold Standard: Calendly/Cal.com pattern
// ═══════════════════════════════════════════════════════════════

export namespace AppointmentScheduling {
  // Enums
  export enum AppointmentStatus {
    Scheduled = 'scheduled',
    Confirmed = 'confirmed',
    Completed = 'completed',
    NoShow = 'no_show',
    Cancelled = 'cancelled',
    Rescheduled = 'rescheduled'
  }

  export enum AppointmentType {
    Consultation = 'consultation',
    FollowUp = 'follow_up',
    Meeting = 'meeting',
    PhoneCall = 'phone_call',
    VideoCall = 'video_call',
    InPerson = 'in_person'
  }

  export enum DayOfWeek {
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6
  }

  // Core Interfaces
  export interface Appointment {
    _id: ObjectId;
    title: string;
    description?: string;
    type: AppointmentType;
    status: AppointmentStatus;
    startTime: ISODateString;
    endTime: ISODateString;
    duration: number; // minutes
    assignedTo: ObjectId | UserBasicInfo; // Lawyer
    client?: {
      _id?: ObjectId;
      name: string;
      email: EmailString;
      phone?: PhoneNumber;
    };
    location?: string;
    meetingUrl?: URLString;
    notes?: string;
    confirmationSent?: boolean;
    reminderSent?: boolean;
    calendarEventId?: string; // Google/Microsoft Calendar Event ID
    syncedToCalendar?: boolean;
    caseId?: ObjectId;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    createdBy?: ObjectId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface AvailabilitySlot {
    _id?: ObjectId;
    lawyerId: ObjectId;
    dayOfWeek: DayOfWeek;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    isActive: boolean;
    firmId?: ObjectId;
  }

  export interface BlockedTime {
    _id?: ObjectId;
    lawyerId: ObjectId;
    startTime: ISODateString;
    endTime: ISODateString;
    reason?: string;
    isRecurring?: boolean;
    firmId?: ObjectId;
  }

  export interface AppointmentSettings {
    _id?: ObjectId;
    lawyerId: ObjectId;
    defaultDuration: number; // minutes
    bufferTime: number; // minutes between appointments
    advanceBookingDays: number; // how many days in advance can book
    minimumNoticeHours: number; // minimum hours before appointment
    allowCancellation: boolean;
    cancellationHours: number; // minimum hours before can cancel
    requireConfirmation: boolean;
    sendReminders: boolean;
    reminderHoursBefore: number;
    allowRescheduling: boolean;
    maxAppointmentsPerDay?: number;
    workingHours?: {
      start: string;
      end: string;
    };
    timezone: string;
    firmId?: ObjectId;
  }

  export interface TimeSlot {
    start: ISODateString;
    end: ISODateString;
    available: boolean;
    reason?: string; // if not available
  }

  export interface CalendarIntegrationStatus {
    google?: {
      connected: boolean;
      email?: EmailString;
      lastSync?: ISODateString;
    };
    microsoft?: {
      connected: boolean;
      email?: EmailString;
      lastSync?: ISODateString;
    };
  }

  // Request/Response Interfaces

  // POST /api/appointments - Create Appointment
  export interface CreateAppointmentRequest {
    title: string;
    description?: string;
    type: AppointmentType;
    startTime: ISODateString;
    duration?: number;
    assignedTo: ObjectId;
    client?: {
      name: string;
      email: EmailString;
      phone?: PhoneNumber;
    };
    clientId?: ObjectId;
    location?: string;
    meetingUrl?: URLString;
    notes?: string;
    caseId?: ObjectId;
  }

  export interface CreateAppointmentResponse extends ApiResponse<Appointment> {}

  // POST /api/appointments/book/:firmId - Public Booking
  export interface PublicBookAppointmentRequest {
    lawyerId: ObjectId;
    startTime: ISODateString;
    duration?: number;
    client: {
      name: string;
      email: EmailString;
      phone?: PhoneNumber;
    };
    notes?: string;
  }

  export interface PublicBookAppointmentResponse extends ApiResponse<Appointment> {}

  // GET /api/appointments - Get All Appointments
  export interface GetAppointmentsParams extends PaginationParams, DateRangeParams {
    status?: AppointmentStatus | AppointmentStatus[];
    type?: AppointmentType;
    assignedTo?: ObjectId;
    clientId?: ObjectId;
    caseId?: ObjectId;
    sortBy?: 'startTime' | 'createdAt' | 'status';
    sortOrder?: 'asc' | 'desc';
  }

  export interface GetAppointmentsResponse extends ApiResponse {
    data: {
      appointments: Appointment[];
      pagination: PaginationResponse;
    };
  }

  // GET /api/appointments/:id - Get Appointment by ID
  export interface GetAppointmentResponse extends ApiResponse<Appointment> {}

  // PUT /api/appointments/:id - Update Appointment
  export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {}

  export interface UpdateAppointmentResponse extends ApiResponse<Appointment> {}

  // PUT /api/appointments/:id/confirm - Confirm Appointment
  export interface ConfirmAppointmentResponse extends ApiResponse<Appointment> {}

  // PUT /api/appointments/:id/complete - Complete Appointment
  export interface CompleteAppointmentRequest {
    notes?: string;
  }

  export interface CompleteAppointmentResponse extends ApiResponse<Appointment> {}

  // PUT /api/appointments/:id/no-show - Mark as No-Show
  export interface MarkNoShowResponse extends ApiResponse<Appointment> {}

  // POST /api/appointments/:id/reschedule - Reschedule Appointment
  export interface RescheduleAppointmentRequest {
    startTime: ISODateString;
    duration?: number;
    reason?: string;
  }

  export interface RescheduleAppointmentResponse extends ApiResponse<Appointment> {}

  // DELETE /api/appointments/:id - Cancel Appointment
  export interface CancelAppointmentRequest {
    reason?: string;
  }

  export interface CancelAppointmentResponse extends ApiResponse {
    message: string;
  }

  // GET /api/appointments/available-slots - Get Available Slots (Enhanced)
  export interface GetAvailableSlotsRequest {
    lawyerId: ObjectId;
    date?: string; // YYYY-MM-DD
    startDate?: ISODateString;
    endDate?: ISODateString;
    duration?: number;
    timezone?: string;
  }

  export interface GetAvailableSlotsResponse extends ApiResponse {
    data: {
      slots: TimeSlot[];
      date?: string;
      dateRange?: {
        start: ISODateString;
        end: ISODateString;
      };
    };
  }

  // GET /api/appointments/slots - Get Available Slots (Legacy)
  export interface GetAvailableSlotsLegacyResponse extends GetAvailableSlotsResponse {}

  // GET /api/appointments/availability - Get Availability Schedule
  export interface GetAvailabilityResponse extends ApiResponse {
    data: {
      slots: AvailabilitySlot[];
      settings: AppointmentSettings;
    };
  }

  // POST /api/appointments/availability - Create Availability Slot
  export interface CreateAvailabilityRequest {
    dayOfWeek: DayOfWeek;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  }

  export interface CreateAvailabilityResponse extends ApiResponse<AvailabilitySlot> {}

  // POST /api/appointments/availability/bulk - Bulk Update Availability
  export interface BulkUpdateAvailabilityRequest {
    slots: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      isActive?: boolean;
    }>;
  }

  export interface BulkUpdateAvailabilityResponse extends ApiResponse {
    data: {
      created: number;
      updated: number;
      deleted: number;
      slots: AvailabilitySlot[];
    };
  }

  // PUT /api/appointments/availability/:id - Update Availability Slot
  export interface UpdateAvailabilityRequest {
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  }

  export interface UpdateAvailabilityResponse extends ApiResponse<AvailabilitySlot> {}

  // DELETE /api/appointments/availability/:id - Delete Availability Slot
  export interface DeleteAvailabilityResponse extends ApiResponse {
    message: string;
  }

  // GET /api/appointments/blocked-times - Get Blocked Times
  export interface GetBlockedTimesResponse extends ApiResponse {
    data: {
      blockedTimes: BlockedTime[];
    };
  }

  // POST /api/appointments/blocked-times - Create Blocked Time
  export interface CreateBlockedTimeRequest {
    startTime: ISODateString;
    endTime: ISODateString;
    reason?: string;
    isRecurring?: boolean;
  }

  export interface CreateBlockedTimeResponse extends ApiResponse<BlockedTime> {}

  // DELETE /api/appointments/blocked-times/:id - Delete Blocked Time
  export interface DeleteBlockedTimeResponse extends ApiResponse {
    message: string;
  }

  // GET /api/appointments/settings - Get Settings
  export interface GetSettingsResponse extends ApiResponse<AppointmentSettings> {}

  // PUT /api/appointments/settings - Update Settings
  export interface UpdateSettingsRequest extends Partial<AppointmentSettings> {}

  export interface UpdateSettingsResponse extends ApiResponse<AppointmentSettings> {}

  // GET /api/appointments/stats - Get Statistics
  export interface GetAppointmentStatsResponse extends ApiResponse {
    data: {
      total: number;
      byStatus: Record<AppointmentStatus, number>;
      byType: Record<AppointmentType, number>;
      upcoming: number;
      completedThisMonth: number;
      noShowRate: number;
      cancellationRate: number;
    };
  }

  // GET /api/appointments/debug - Debug Tenant Context
  export interface DebugAppointmentResponse extends ApiResponse {
    data: {
      userID: ObjectId;
      firmId?: ObjectId;
      firmQuery: any;
      sampleQuery: any;
      appointmentCount: number;
    };
  }

  // GET /api/appointments/calendar-status - Get Calendar Connection Status
  export interface GetCalendarStatusResponse extends ApiResponse<CalendarIntegrationStatus> {}

  // GET /api/appointments/:id/calendar-links - Get "Add to Calendar" Links
  export interface GetCalendarLinksResponse extends ApiResponse {
    data: {
      google: URLString;
      outlook: URLString;
      yahoo: URLString;
      apple: URLString; // ICS download link
    };
  }

  // POST /api/appointments/:id/sync-calendar - Manually Sync to Calendar
  export interface SyncToCalendarResponse extends ApiResponse {
    data: {
      synced: boolean;
      provider: 'google' | 'microsoft' | 'both';
      eventId?: string;
      errors?: string[];
    };
  }

  // GET /api/appointments/:id/calendar.ics - Download ICS File
  export interface DownloadICSResponse {
    // Returns ICS file download
    contentType: 'text/calendar';
    filename: string;
    content: string; // ICS format
  }
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP INTEGRATION MODULE
// Routes: /api/whatsapp
// Total Endpoints: 24+
// Features: Messages, Templates, Conversations, Broadcasts, Webhooks
// Gold Standard: WhatsApp Business API patterns
// ═══════════════════════════════════════════════════════════════

export namespace WhatsAppIntegration {
  // Enums
  export enum MessageType {
    Text = 'text',
    Template = 'template',
    Media = 'media',
    Location = 'location',
    Interactive = 'interactive',
    Contacts = 'contacts'
  }

  export enum MessageStatus {
    Sent = 'sent',
    Delivered = 'delivered',
    Read = 'read',
    Failed = 'failed',
    Pending = 'pending'
  }

  export enum MediaType {
    Image = 'image',
    Video = 'video',
    Audio = 'audio',
    Document = 'document',
    Sticker = 'sticker'
  }

  export enum TemplateStatus {
    Approved = 'approved',
    Pending = 'pending',
    Rejected = 'rejected',
    Disabled = 'disabled'
  }

  export enum BroadcastStatus {
    Draft = 'draft',
    Scheduled = 'scheduled',
    Sending = 'sending',
    Sent = 'sent',
    Paused = 'paused',
    Cancelled = 'cancelled',
    Completed = 'completed'
  }

  // Core Interfaces
  export interface WhatsAppMessage {
    _id: ObjectId;
    conversationId: ObjectId;
    type: MessageType;
    direction: 'inbound' | 'outbound';
    from: PhoneNumber;
    to: PhoneNumber;
    text?: string;
    mediaUrl?: URLString;
    mediaType?: MediaType;
    templateName?: string;
    status: MessageStatus;
    timestamp: ISODateString;
    deliveredAt?: ISODateString;
    readAt?: ISODateString;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    createdAt: ISODateString;
  }

  export interface WhatsAppConversation {
    _id: ObjectId;
    phoneNumber: PhoneNumber;
    contactName?: string;
    lastMessage?: string;
    lastMessageAt?: ISODateString;
    unreadCount: number;
    assignedTo?: ObjectId;
    linkedLeadId?: ObjectId;
    linkedClientId?: ObjectId;
    tags?: string[];
    isArchived: boolean;
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface WhatsAppTemplate {
    _id: ObjectId;
    name: string;
    language: string;
    category: 'marketing' | 'utility' | 'authentication';
    status: TemplateStatus;
    components: TemplateComponent[];
    externalId?: string; // WhatsApp template ID
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface TemplateComponent {
    type: 'header' | 'body' | 'footer' | 'buttons';
    format?: 'text' | 'image' | 'video' | 'document';
    text?: string;
    parameters?: TemplateParameter[];
    buttons?: TemplateButton[];
  }

  export interface TemplateParameter {
    type: 'text' | 'currency' | 'date_time';
    text?: string;
  }

  export interface TemplateButton {
    type: 'quick_reply' | 'url' | 'phone_number';
    text: string;
    url?: string;
    phoneNumber?: string;
  }

  export interface WhatsAppBroadcast {
    _id: ObjectId;
    name: string;
    templateId?: ObjectId;
    message?: string;
    recipients: BroadcastRecipient[];
    status: BroadcastStatus;
    scheduledAt?: ISODateString;
    sentAt?: ISODateString;
    completedAt?: ISODateString;
    stats: {
      total: number;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
    firmId?: ObjectId;
    lawyerId?: ObjectId;
    createdBy: ObjectId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface BroadcastRecipient {
    phoneNumber: PhoneNumber;
    name?: string;
    status: MessageStatus;
    messageId?: ObjectId;
    sentAt?: ISODateString;
    error?: string;
  }

  // Request/Response Interfaces

  // POST /api/whatsapp/send/template - Send Template Message
  export interface SendTemplateRequest {
    to: PhoneNumber;
    templateName: string;
    language?: string;
    parameters?: Record<string, string>;
  }

  export interface SendTemplateResponse extends ApiResponse {
    data: {
      messageId: ObjectId;
      status: MessageStatus;
    };
  }

  // POST /api/whatsapp/send/text - Send Text Message
  export interface SendTextRequest {
    to: PhoneNumber;
    text: string;
  }

  export interface SendTextResponse extends ApiResponse {
    data: {
      messageId: ObjectId;
      status: MessageStatus;
    };
  }

  // POST /api/whatsapp/send/media - Send Media Message
  export interface SendMediaRequest {
    to: PhoneNumber;
    mediaType: MediaType;
    mediaUrl: URLString;
    caption?: string;
  }

  export interface SendMediaResponse extends SendTextResponse {}

  // POST /api/whatsapp/send/location - Send Location Message
  export interface SendLocationRequest {
    to: PhoneNumber;
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }

  export interface SendLocationResponse extends SendTextResponse {}

  // POST /api/whatsapp/messages/send - Unified Send Message
  export interface SendMessageRequest {
    to: PhoneNumber;
    type: MessageType;
    text?: string;
    templateName?: string;
    parameters?: Record<string, string>;
    mediaUrl?: URLString;
    mediaType?: MediaType;
    caption?: string;
    latitude?: number;
    longitude?: number;
  }

  export interface SendMessageResponse extends SendTextResponse {}

  // GET /api/whatsapp/conversations - Get Conversations
  export interface GetConversationsParams extends PaginationParams {
    assignedTo?: ObjectId;
    hasUnread?: boolean;
    search?: string;
  }

  export interface GetConversationsResponse extends ApiResponse {
    data: {
      conversations: WhatsAppConversation[];
      pagination: PaginationResponse;
    };
  }

  // GET /api/whatsapp/conversations/:id - Get Conversation
  export interface GetConversationResponse extends ApiResponse<WhatsAppConversation> {}

  // GET /api/whatsapp/conversations/:id/messages - Get Messages
  export interface GetMessagesParams extends PaginationParams {
    before?: ISODateString;
    after?: ISODateString;
  }

  export interface GetMessagesResponse extends ApiResponse {
    data: {
      messages: WhatsAppMessage[];
      pagination: PaginationResponse;
    };
  }

  // POST /api/whatsapp/conversations/:id/read - Mark as Read
  export interface MarkAsReadResponse extends ApiResponse<WhatsAppConversation> {}

  // PUT /api/whatsapp/conversations/:id/assign - Assign Conversation
  export interface AssignConversationRequest {
    assignedTo: ObjectId;
  }

  export interface AssignConversationResponse extends ApiResponse<WhatsAppConversation> {}

  // POST /api/whatsapp/conversations/:id/link-lead - Link to Lead
  export interface LinkToLeadRequest {
    leadId: ObjectId;
  }

  export interface LinkToLeadResponse extends ApiResponse<WhatsAppConversation> {}

  // POST /api/whatsapp/conversations/:id/create-lead - Create Lead from Conversation
  export interface CreateLeadFromConversationRequest {
    leadData?: {
      firstName?: string;
      lastName?: string;
      email?: EmailString;
      source?: string;
    };
  }

  export interface CreateLeadFromConversationResponse extends ApiResponse {
    data: {
      conversation: WhatsAppConversation;
      lead: any; // Lead object
    };
  }

  // GET /api/whatsapp/templates - Get Templates
  export interface GetTemplatesResponse extends ApiResponse {
    data: {
      templates: WhatsAppTemplate[];
    };
  }

  // POST /api/whatsapp/templates - Create Template
  export interface CreateTemplateRequest {
    name: string;
    language: string;
    category: 'marketing' | 'utility' | 'authentication';
    components: TemplateComponent[];
  }

  export interface CreateTemplateResponse extends ApiResponse<WhatsAppTemplate> {}

  // POST /api/whatsapp/templates/:id/submit - Submit Template for Approval
  export interface SubmitTemplateResponse extends ApiResponse<WhatsAppTemplate> {}

  // GET /api/whatsapp/analytics - Get Analytics
  export interface GetWhatsAppAnalyticsParams extends DateRangeParams {}

  export interface GetWhatsAppAnalyticsResponse extends ApiResponse {
    data: {
      totalMessages: number;
      inbound: number;
      outbound: number;
      delivered: number;
      read: number;
      failed: number;
      averageResponseTime: number; // minutes
      conversationsStarted: number;
      activeConversations: number;
    };
  }

  // GET /api/whatsapp/stats - Get Statistics
  export interface GetWhatsAppStatsResponse extends GetWhatsAppAnalyticsResponse {}

  // GET /api/whatsapp/broadcasts - Get Broadcasts
  export interface GetBroadcastsParams extends PaginationParams {
    status?: BroadcastStatus;
  }

  export interface GetBroadcastsResponse extends ApiResponse {
    data: {
      broadcasts: WhatsAppBroadcast[];
      pagination: PaginationResponse;
    };
  }

  // POST /api/whatsapp/broadcasts - Create Broadcast
  export interface CreateBroadcastRequest {
    name: string;
    templateId?: ObjectId;
    message?: string;
    recipients: Array<{
      phoneNumber: PhoneNumber;
      name?: string;
    }>;
    scheduledAt?: ISODateString;
  }

  export interface CreateBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // GET /api/whatsapp/broadcasts/:id - Get Broadcast
  export interface GetBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // PUT /api/whatsapp/broadcasts/:id - Update Broadcast
  export interface UpdateBroadcastRequest extends Partial<CreateBroadcastRequest> {}

  export interface UpdateBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // DELETE /api/whatsapp/broadcasts/:id - Delete Broadcast
  export interface DeleteBroadcastResponse extends ApiResponse {
    message: string;
  }

  // POST /api/whatsapp/broadcasts/:id/duplicate - Duplicate Broadcast
  export interface DuplicateBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // POST /api/whatsapp/broadcasts/:id/recipients - Add Recipients
  export interface AddRecipientsRequest {
    recipients: Array<{
      phoneNumber: PhoneNumber;
      name?: string;
    }>;
  }

  export interface AddRecipientsResponse extends ApiResponse<WhatsAppBroadcast> {}

  // DELETE /api/whatsapp/broadcasts/:id/recipients - Remove Recipients
  export interface RemoveRecipientsRequest {
    phoneNumbers: PhoneNumber[];
  }

  export interface RemoveRecipientsResponse extends ApiResponse<WhatsAppBroadcast> {}

  // POST /api/whatsapp/broadcasts/:id/schedule - Schedule Broadcast
  export interface ScheduleBroadcastRequest {
    scheduledAt: ISODateString;
  }

  export interface ScheduleBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // POST /api/whatsapp/broadcasts/:id/send - Send Broadcast
  export interface SendBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // POST /api/whatsapp/broadcasts/:id/pause - Pause Broadcast
  export interface PauseBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // POST /api/whatsapp/broadcasts/:id/resume - Resume Broadcast
  export interface ResumeBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // POST /api/whatsapp/broadcasts/:id/cancel - Cancel Broadcast
  export interface CancelBroadcastResponse extends ApiResponse<WhatsAppBroadcast> {}

  // GET /api/whatsapp/broadcasts/:id/analytics - Get Broadcast Analytics
  export interface GetBroadcastAnalyticsResponse extends ApiResponse {
    data: {
      stats: WhatsAppBroadcast['stats'];
      timeline: Array<{
        timestamp: ISODateString;
        sent: number;
        delivered: number;
        read: number;
        failed: number;
      }>;
    };
  }

  // POST /api/whatsapp/broadcasts/:id/test - Test Broadcast
  export interface TestBroadcastRequest {
    phoneNumber: PhoneNumber;
  }

  export interface TestBroadcastResponse extends ApiResponse {
    data: {
      sent: boolean;
      messageId?: ObjectId;
    };
  }

  // GET /api/whatsapp/broadcasts/stats - Get Broadcast Statistics
  export interface GetBroadcastStatsResponse extends ApiResponse {
    data: {
      total: number;
      byStatus: Record<BroadcastStatus, number>;
      totalRecipients: number;
      totalSent: number;
      averageDeliveryRate: number;
      averageReadRate: number;
    };
  }

  // GET /api/whatsapp/webhooks/whatsapp - Webhook Verification
  export interface WebhookVerificationParams {
    'hub.mode': 'subscribe';
    'hub.challenge': string;
    'hub.verify_token': string;
  }

  export interface WebhookVerificationResponse {
    challenge: string;
  }

  // POST /api/whatsapp/webhooks/whatsapp - Receive Webhook
  export interface WebhookEvent {
    object: 'whatsapp_business_account';
    entry: Array<{
      id: string;
      changes: Array<{
        value: {
          messaging_product: 'whatsapp';
          metadata: {
            display_phone_number: string;
            phone_number_id: string;
          };
          contacts?: Array<{
            profile: {
              name: string;
            };
            wa_id: string;
          }>;
          messages?: Array<{
            from: string;
            id: string;
            timestamp: string;
            type: MessageType;
            text?: {
              body: string;
            };
            image?: {
              id: string;
              mime_type: string;
            };
          }>;
          statuses?: Array<{
            id: string;
            status: MessageStatus;
            timestamp: string;
            recipient_id: string;
          }>;
        };
        field: string;
      }>;
    }>;
  }
}

// ═══════════════════════════════════════════════════════════════
// GMAIL INTEGRATION MODULE
// Routes: /api/gmail
// Total Endpoints: 18
// Features: OAuth, Messages, Drafts, Labels, Watch notifications
// Gold Standard: Google Workspace API patterns
// ═══════════════════════════════════════════════════════════════

export namespace GmailIntegration {
  // Enums
  export enum MessageFormat {
    Full = 'full',
    Metadata = 'metadata',
    Minimal = 'minimal',
    Raw = 'raw'
  }

  export enum LabelType {
    System = 'system',
    User = 'user'
  }

  // Core Interfaces
  export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    historyId: string;
    internalDate: string;
    payload: MessagePayload;
    sizeEstimate: number;
    raw?: string;
  }

  export interface MessagePayload {
    partId: string;
    mimeType: string;
    filename: string;
    headers: MessageHeader[];
    body: MessageBody;
    parts?: MessagePayload[];
  }

  export interface MessageHeader {
    name: string;
    value: string;
  }

  export interface MessageBody {
    attachmentId?: string;
    size: number;
    data?: string; // Base64 encoded
  }

  export interface GmailThread {
    id: string;
    snippet: string;
    historyId: string;
    messages: GmailMessage[];
  }

  export interface GmailDraft {
    id: string;
    message: GmailMessage;
  }

  export interface GmailLabel {
    id: string;
    name: string;
    messageListVisibility?: 'show' | 'hide';
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    type: LabelType;
    messagesTotal?: number;
    messagesUnread?: number;
    threadsTotal?: number;
    threadsUnread?: number;
    color?: {
      textColor: string;
      backgroundColor: string;
    };
  }

  export interface GmailSettings {
    emailAddress: string;
    displayName: string;
    signature?: string;
    autoReply?: {
      enabled: boolean;
      subject: string;
      message: string;
      startTime?: ISODateString;
      endTime?: ISODateString;
    };
    filters?: GmailFilter[];
  }

  export interface GmailFilter {
    id: string;
    criteria: {
      from?: string;
      to?: string;
      subject?: string;
      query?: string;
      hasAttachment?: boolean;
    };
    action: {
      addLabelIds?: string[];
      removeLabelIds?: string[];
      forward?: string;
    };
  }

  export interface WatchRequest {
    topicName: string;
    labelIds?: string[];
    labelFilterAction?: 'include' | 'exclude';
  }

  export interface WatchResponse {
    historyId: string;
    expiration: string; // Unix timestamp in milliseconds
  }

  // Request/Response Interfaces

  // GET /api/gmail/auth - Get Auth URL
  export interface GetGmailAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/gmail/callback - OAuth Callback
  export interface GmailCallbackParams {
    code: string;
    state: string;
    scope?: string;
  }

  export interface GmailCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      email: EmailString;
    };
  }

  // POST /api/gmail/disconnect - Disconnect Gmail
  export interface DisconnectGmailResponse extends ApiResponse {
    message: string;
  }

  // GET /api/gmail/status - Get Connection Status
  export interface GetGmailStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      email?: EmailString;
      scopes?: string[];
      connectedAt?: ISODateString;
      lastSync?: ISODateString;
    };
  }

  // GET /api/gmail/messages - List Messages
  export interface ListMessagesParams extends PaginationParams {
    q?: string; // Gmail search query
    labelIds?: string[];
    includeSpamTrash?: boolean;
    maxResults?: number;
    pageToken?: string;
  }

  export interface ListMessagesResponse extends ApiResponse {
    data: {
      messages: Array<{
        id: string;
        threadId: string;
      }>;
      nextPageToken?: string;
      resultSizeEstimate: number;
    };
  }

  // GET /api/gmail/messages/:messageId - Get Message
  export interface GetMessageParams {
    format?: MessageFormat;
  }

  export interface GetMessageResponse extends ApiResponse<GmailMessage> {}

  // POST /api/gmail/messages/send - Send Email
  export interface SendEmailRequest {
    to: EmailString | EmailString[];
    cc?: EmailString | EmailString[];
    bcc?: EmailString | EmailString[];
    subject: string;
    body: string;
    isHtml?: boolean;
    attachments?: Array<{
      filename: string;
      content: Base64String;
      mimeType: string;
    }>;
    threadId?: string; // for replies
    inReplyTo?: string;
    references?: string;
  }

  export interface SendEmailResponse extends ApiResponse<GmailMessage> {}

  // POST /api/gmail/messages/:messageId/reply - Reply to Email
  export interface ReplyToEmailRequest {
    body: string;
    isHtml?: boolean;
    replyAll?: boolean;
    attachments?: Array<{
      filename: string;
      content: Base64String;
      mimeType: string;
    }>;
  }

  export interface ReplyToEmailResponse extends SendEmailResponse {}

  // GET /api/gmail/messages/search - Search Messages
  export interface SearchMessagesParams extends ListMessagesParams {
    from?: string;
    to?: string;
    subject?: string;
    after?: string; // YYYY/MM/DD
    before?: string; // YYYY/MM/DD
    hasAttachment?: boolean;
    isUnread?: boolean;
  }

  export interface SearchMessagesResponse extends ListMessagesResponse {}

  // GET /api/gmail/threads/:threadId - Get Thread
  export interface GetThreadParams {
    format?: MessageFormat;
  }

  export interface GetThreadResponse extends ApiResponse<GmailThread> {}

  // GET /api/gmail/drafts - List Drafts
  export interface ListDraftsParams extends PaginationParams {
    maxResults?: number;
    pageToken?: string;
  }

  export interface ListDraftsResponse extends ApiResponse {
    data: {
      drafts: GmailDraft[];
      nextPageToken?: string;
      resultSizeEstimate: number;
    };
  }

  // POST /api/gmail/drafts - Create Draft
  export interface CreateDraftRequest {
    to?: EmailString | EmailString[];
    cc?: EmailString | EmailString[];
    bcc?: EmailString | EmailString[];
    subject?: string;
    body?: string;
    isHtml?: boolean;
    threadId?: string;
  }

  export interface CreateDraftResponse extends ApiResponse<GmailDraft> {}

  // GET /api/gmail/labels - List Labels
  export interface ListLabelsResponse extends ApiResponse {
    data: {
      labels: GmailLabel[];
    };
  }

  // POST /api/gmail/labels - Create Label
  export interface CreateLabelRequest {
    name: string;
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    messageListVisibility?: 'show' | 'hide';
    color?: {
      textColor: string;
      backgroundColor: string;
    };
  }

  export interface CreateLabelResponse extends ApiResponse<GmailLabel> {}

  // PUT /api/gmail/settings - Update Settings
  export interface UpdateGmailSettingsRequest {
    signature?: string;
    autoReply?: {
      enabled: boolean;
      subject?: string;
      message?: string;
      startTime?: ISODateString;
      endTime?: ISODateString;
    };
  }

  export interface UpdateGmailSettingsResponse extends ApiResponse<GmailSettings> {}

  // POST /api/gmail/watch - Setup Watch
  export interface SetupWatchRequest extends WatchRequest {}

  export interface SetupWatchResponse extends ApiResponse<WatchResponse> {}

  // DELETE /api/gmail/watch - Stop Watch
  export interface StopWatchResponse extends ApiResponse {
    message: string;
  }

  // POST /api/gmail/webhook - Handle Webhook
  export interface GmailWebhookEvent {
    message: {
      data: Base64String; // Contains historyId and emailAddress
      messageId: string;
      publishTime: string;
    };
    subscription: string;
  }
}

// ═══════════════════════════════════════════════════════════════
// DOCUSIGN INTEGRATION MODULE
// Routes: /api/docusign
// Total Endpoints: 17
// Features: E-signatures, Envelopes, Templates, Webhooks
// Gold Standard: DocuSign eSignature API patterns
// ═══════════════════════════════════════════════════════════════

export namespace DocuSignIntegration {
  // Enums
  export enum EnvelopeStatus {
    Created = 'created',
    Sent = 'sent',
    Delivered = 'delivered',
    Signed = 'signed',
    Completed = 'completed',
    Declined = 'declined',
    Voided = 'voided'
  }

  export enum RecipientType {
    Signer = 'signer',
    CarbonCopy = 'carbonCopy',
    CertifiedDelivery = 'certifiedDelivery',
    InPersonSigner = 'inPersonSigner'
  }

  export enum RecipientStatus {
    Created = 'created',
    Sent = 'sent',
    Delivered = 'delivered',
    Signed = 'signed',
    Declined = 'declined',
    Completed = 'completed',
    AuthenticationFailed = 'authenticationFailed'
  }

  // Core Interfaces
  export interface DocuSignEnvelope {
    envelopeId: string;
    status: EnvelopeStatus;
    emailSubject: string;
    emailBlurb?: string;
    recipients: EnvelopeRecipients;
    documents: EnvelopeDocument[];
    createdDateTime: ISODateString;
    sentDateTime?: ISODateString;
    deliveredDateTime?: ISODateString;
    signedDateTime?: ISODateString;
    completedDateTime?: ISODateString;
    voidedDateTime?: ISODateString;
    voidedReason?: string;
    certificateUri?: string;
  }

  export interface EnvelopeRecipients {
    signers?: Signer[];
    carbonCopies?: CarbonCopy[];
    certifiedDeliveries?: CertifiedDelivery[];
  }

  export interface Signer {
    recipientId: string;
    recipientIdGuid?: string;
    name: string;
    email: EmailString;
    roleName?: string;
    routingOrder: number;
    status: RecipientStatus;
    signedDateTime?: ISODateString;
    deliveredDateTime?: ISODateString;
    tabs?: RecipientTabs;
    clientUserId?: string; // for embedded signing
  }

  export interface CarbonCopy {
    recipientId: string;
    name: string;
    email: EmailString;
    routingOrder: number;
    status: RecipientStatus;
  }

  export interface CertifiedDelivery {
    recipientId: string;
    name: string;
    email: EmailString;
    routingOrder: number;
    status: RecipientStatus;
  }

  export interface RecipientTabs {
    signHereTabs?: SignHereTab[];
    dateSignedTabs?: DateSignedTab[];
    textTabs?: TextTab[];
    checkboxTabs?: CheckboxTab[];
    initialHereTabs?: InitialHereTab[];
  }

  export interface SignHereTab {
    tabLabel?: string;
    documentId: string;
    pageNumber: number;
    xPosition: number;
    yPosition: number;
    required?: boolean;
  }

  export interface DateSignedTab extends SignHereTab {}
  export interface InitialHereTab extends SignHereTab {}

  export interface TextTab extends SignHereTab {
    value?: string;
    width?: number;
    height?: number;
  }

  export interface CheckboxTab extends SignHereTab {
    selected?: boolean;
  }

  export interface EnvelopeDocument {
    documentId: string;
    name: string;
    fileExtension: string;
    order: number;
    pages?: number;
    uri?: string;
  }

  export interface DocuSignTemplate {
    templateId: string;
    name: string;
    description?: string;
    shared: boolean;
    created: ISODateString;
    lastModified: ISODateString;
    owner: {
      userName: string;
      email: EmailString;
    };
  }

  // Request/Response Interfaces

  // GET /api/docusign/auth-url - Get Auth URL
  export interface GetDocuSignAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/docusign/callback - OAuth Callback
  export interface DocuSignCallbackParams {
    code: string;
    state: string;
  }

  export interface DocuSignCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      accountId: string;
      accountName: string;
      baseUrl: string;
    };
  }

  // POST /api/docusign/disconnect - Disconnect DocuSign
  export interface DisconnectDocuSignResponse extends ApiResponse {
    message: string;
  }

  // GET /api/docusign/status - Get Connection Status
  export interface GetDocuSignStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      accountId?: string;
      accountName?: string;
      userName?: string;
      email?: EmailString;
      connectedAt?: ISODateString;
    };
  }

  // POST /api/docusign/envelopes - Send for Signature
  export interface SendForSignatureRequest {
    emailSubject: string;
    emailBlurb?: string;
    documents: Array<{
      documentBase64: Base64String;
      name: string;
      fileExtension: 'pdf' | 'doc' | 'docx';
      documentId: string;
    }>;
    recipients: {
      signers: Array<{
        email: EmailString;
        name: string;
        recipientId: string;
        routingOrder: number;
        clientUserId?: string;
        tabs?: RecipientTabs;
      }>;
      carbonCopies?: Array<{
        email: EmailString;
        name: string;
        recipientId: string;
        routingOrder: number;
      }>;
    };
    status?: 'sent' | 'created'; // created = draft
  }

  export interface SendForSignatureResponse extends ApiResponse {
    data: {
      envelopeId: string;
      status: EnvelopeStatus;
      statusDateTime: ISODateString;
      uri: string;
    };
  }

  // POST /api/docusign/envelopes/from-template - Use Template
  export interface UseTemplateRequest {
    templateId: string;
    emailSubject: string;
    emailBlurb?: string;
    templateRoles: Array<{
      email: EmailString;
      name: string;
      roleName: string;
      clientUserId?: string;
    }>;
    status?: 'sent' | 'created';
  }

  export interface UseTemplateResponse extends SendForSignatureResponse {}

  // GET /api/docusign/envelopes - List Envelopes
  export interface ListEnvelopesParams {
    from_date?: ISODateString;
    to_date?: ISODateString;
    status?: EnvelopeStatus | EnvelopeStatus[];
    folder_types?: string;
    count?: number;
    start_position?: number;
  }

  export interface ListEnvelopesResponse extends ApiResponse {
    data: {
      envelopes: DocuSignEnvelope[];
      resultSetSize: number;
      totalSetSize: number;
      startPosition: number;
      endPosition: number;
      nextUri?: string;
      previousUri?: string;
    };
  }

  // GET /api/docusign/envelopes/:envelopeId - Get Envelope
  export interface GetEnvelopeResponse extends ApiResponse<DocuSignEnvelope> {}

  // GET /api/docusign/envelopes/:envelopeId/documents - Download Documents
  export interface DownloadDocumentParams {
    documentId?: string; // specific document, or 'combined' for all, or 'certificate'
  }

  export interface DownloadDocumentResponse {
    // Returns PDF file download
    contentType: 'application/pdf';
    filename: string;
    content: Buffer;
  }

  // POST /api/docusign/envelopes/:envelopeId/void - Void Envelope
  export interface VoidEnvelopeRequest {
    voidedReason: string;
  }

  export interface VoidEnvelopeResponse extends ApiResponse {
    data: {
      envelopeId: string;
      status: EnvelopeStatus;
    };
  }

  // POST /api/docusign/envelopes/:envelopeId/resend - Resend Envelope
  export interface ResendEnvelopeResponse extends ApiResponse {
    message: string;
  }

  // POST /api/docusign/envelopes/:envelopeId/signing-url - Get Signing URL
  export interface GetSigningUrlRequest {
    recipientEmail: EmailString;
    returnUrl: URLString;
    clientUserId?: string;
  }

  export interface GetSigningUrlResponse extends ApiResponse {
    data: {
      url: URLString;
      recipientId: string;
    };
  }

  // GET /api/docusign/templates - List Templates
  export interface ListTemplatesResponse extends ApiResponse {
    data: {
      templates: DocuSignTemplate[];
      resultSetSize: number;
      totalSetSize: number;
    };
  }

  // POST /api/docusign/templates/defaults - Add Default Template
  export interface AddDefaultTemplateRequest {
    templateId: string;
    name: string;
    category?: string;
  }

  export interface AddDefaultTemplateResponse extends ApiResponse {
    message: string;
  }

  // DELETE /api/docusign/templates/defaults/:templateId - Remove Default Template
  export interface RemoveDefaultTemplateResponse extends ApiResponse {
    message: string;
  }

  // PUT /api/docusign/settings - Update Settings
  export interface UpdateDocuSignSettingsRequest {
    webhookUrl?: URLString;
    enableNotifications?: boolean;
    notificationEvents?: string[];
  }

  export interface UpdateDocuSignSettingsResponse extends ApiResponse {
    message: string;
  }

  // POST /api/docusign/webhook - Handle Webhook
  export interface DocuSignWebhookEvent {
    event: string;
    apiVersion: string;
    uri: string;
    retryCount: number;
    configurationId: string;
    generatedDateTime: ISODateString;
    data: {
      accountId: string;
      userId: string;
      envelopeId: string;
      envelopeSummary: DocuSignEnvelope;
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ZOOM INTEGRATION MODULE
// Routes: /api/zoom
// Total Endpoints: 14
// Features: Video meetings, Recordings, Webhooks
// Gold Standard: Zoom API patterns
// ═══════════════════════════════════════════════════════════════

export namespace ZoomIntegration {
  // Enums
  export enum MeetingType {
    Instant = 1,
    Scheduled = 2,
    RecurringNoFixedTime = 3,
    RecurringFixedTime = 8
  }

  export enum MeetingStatus {
    Waiting = 'waiting',
    Started = 'started',
    Finished = 'finished'
  }

  export enum RecordingStatus {
    Processing = 'processing',
    Completed = 'completed',
    Failed = 'failed'
  }

  export enum RecordingType {
    SharedScreenWithSpeakerView = 'shared_screen_with_speaker_view',
    SharedScreenWithGalleryView = 'shared_screen_with_gallery_view',
    SpeakerView = 'speaker_view',
    GalleryView = 'gallery_view',
    SharedScreen = 'shared_screen',
    AudioOnly = 'audio_only',
    AudioTranscript = 'audio_transcript',
    ChatFile = 'chat_file'
  }

  // Core Interfaces
  export interface ZoomMeeting {
    id: string | number;
    uuid: string;
    host_id: string;
    host_email: EmailString;
    topic: string;
    type: MeetingType;
    status: MeetingStatus;
    start_time: ISODateString;
    duration: number; // minutes
    timezone: string;
    agenda?: string;
    created_at: ISODateString;
    start_url: URLString;
    join_url: URLString;
    password?: string;
    h323_password?: string;
    pstn_password?: string;
    encrypted_password?: string;
    settings: MeetingSettings;
    recurrence?: RecurrenceSettings;
  }

  export interface MeetingSettings {
    host_video: boolean;
    participant_video: boolean;
    cn_meeting: boolean;
    in_meeting: boolean;
    join_before_host: boolean;
    mute_upon_entry: boolean;
    watermark: boolean;
    use_pmi: boolean;
    approval_type: number;
    audio: 'both' | 'telephony' | 'voip';
    auto_recording: 'none' | 'local' | 'cloud';
    alternative_hosts?: string;
    close_registration: boolean;
    waiting_room: boolean;
    registrants_email_notification: boolean;
    meeting_authentication: boolean;
  }

  export interface RecurrenceSettings {
    type: 1 | 2 | 3; // 1=Daily, 2=Weekly, 3=Monthly
    repeat_interval: number;
    weekly_days?: string; // "1,2,3" (1=Sunday)
    monthly_day?: number;
    monthly_week?: number;
    monthly_week_day?: number;
    end_times?: number;
    end_date_time?: ISODateString;
  }

  export interface ZoomRecording {
    uuid: string;
    id: number;
    account_id: string;
    host_id: string;
    host_email: EmailString;
    topic: string;
    start_time: ISODateString;
    duration: number;
    total_size: number;
    recording_count: number;
    share_url?: URLString;
    recording_files: RecordingFile[];
  }

  export interface RecordingFile {
    id: string;
    meeting_id: string;
    recording_start: ISODateString;
    recording_end: ISODateString;
    file_type: RecordingType;
    file_size: number;
    play_url: URLString;
    download_url: URLString;
    status: RecordingStatus;
    recording_type: string;
  }

  // Request/Response Interfaces

  // GET /api/zoom/auth-url - Get Auth URL
  export interface GetZoomAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/zoom/callback - OAuth Callback
  export interface ZoomCallbackParams {
    code: string;
    state: string;
  }

  export interface ZoomCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      email: EmailString;
      accountId: string;
    };
  }

  // POST /api/zoom/disconnect - Disconnect Zoom
  export interface DisconnectZoomResponse extends ApiResponse {
    message: string;
  }

  // GET /api/zoom/status - Get Connection Status
  export interface GetZoomStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      email?: EmailString;
      accountId?: string;
      connectedAt?: ISODateString;
    };
  }

  // POST /api/zoom/meetings - Create Meeting
  export interface CreateMeetingRequest {
    topic: string;
    type: MeetingType;
    start_time?: ISODateString;
    duration?: number; // minutes
    timezone?: string;
    agenda?: string;
    password?: string;
    settings?: Partial<MeetingSettings>;
    recurrence?: RecurrenceSettings;
  }

  export interface CreateMeetingResponse extends ApiResponse<ZoomMeeting> {}

  // GET /api/zoom/meetings - List Meetings
  export interface ListMeetingsParams {
    type?: 'scheduled' | 'live' | 'upcoming';
    page_size?: number;
    next_page_token?: string;
  }

  export interface ListMeetingsResponse extends ApiResponse {
    data: {
      meetings: ZoomMeeting[];
      page_count: number;
      page_number: number;
      page_size: number;
      total_records: number;
      next_page_token?: string;
    };
  }

  // GET /api/zoom/meetings/:meetingId - Get Meeting
  export interface GetMeetingResponse extends ApiResponse<ZoomMeeting> {}

  // PUT /api/zoom/meetings/:meetingId - Update Meeting
  export interface UpdateMeetingRequest extends Partial<CreateMeetingRequest> {}

  export interface UpdateMeetingResponse extends ApiResponse {
    message: string;
  }

  // DELETE /api/zoom/meetings/:meetingId - Delete Meeting
  export interface DeleteMeetingResponse extends ApiResponse {
    message: string;
  }

  // GET /api/zoom/recordings - Get Recordings
  export interface GetRecordingsParams {
    from?: ISODateString;
    to?: ISODateString;
    page_size?: number;
    next_page_token?: string;
  }

  export interface GetRecordingsResponse extends ApiResponse {
    data: {
      recordings: ZoomRecording[];
      page_count: number;
      page_size: number;
      total_records: number;
      next_page_token?: string;
    };
  }

  // GET /api/zoom/recordings/:meetingId - Get Meeting Recordings
  export interface GetMeetingRecordingsResponse extends ApiResponse<ZoomRecording> {}

  // PUT /api/zoom/settings - Update Settings
  export interface UpdateZoomSettingsRequest {
    defaultSettings?: Partial<MeetingSettings>;
    autoCreateMeetings?: boolean;
    syncToCalendar?: boolean;
  }

  export interface UpdateZoomSettingsResponse extends ApiResponse {
    message: string;
  }

  // POST /api/zoom/test - Test Connection
  export interface TestConnectionResponse extends ApiResponse {
    data: {
      connected: boolean;
      userInfo?: {
        id: string;
        email: EmailString;
        first_name: string;
        last_name: string;
        type: number;
      };
    };
  }

  // POST /api/zoom/webhook - Handle Webhook
  export interface ZoomWebhookEvent {
    event: string;
    event_ts: number;
    payload: {
      account_id: string;
      object: {
        uuid: string;
        id: string;
        host_id: string;
        topic: string;
        type: number;
        start_time: ISODateString;
        duration: number;
        timezone: string;
      };
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SLACK INTEGRATION MODULE
// Routes: /api/slack
// Total Endpoints: 12
// Features: Messaging, Channels, Webhooks
// Gold Standard: Slack API patterns
// ═══════════════════════════════════════════════════════════════

export namespace SlackIntegration {
  // Core Interfaces
  export interface SlackChannel {
    id: string;
    name: string;
    is_channel: boolean;
    is_group: boolean;
    is_im: boolean;
    is_mpim: boolean;
    is_private: boolean;
    created: number;
    is_archived: boolean;
    is_general: boolean;
    unlinked: number;
    name_normalized: string;
    is_shared: boolean;
    is_org_shared: boolean;
    is_member: boolean;
    is_pending_ext_shared: boolean;
    pending_shared: any[];
    context_team_id: string;
    updated: number;
    parent_conversation: any;
    creator: string;
    is_ext_shared: boolean;
    shared_team_ids: string[];
    pending_connected_team_ids: any[];
    topic: {
      value: string;
      creator: string;
      last_set: number;
    };
    purpose: {
      value: string;
      creator: string;
      last_set: number;
    };
    num_members?: number;
  }

  export interface SlackMessage {
    type: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    attachments?: SlackAttachment[];
    blocks?: SlackBlock[];
    thread_ts?: string;
  }

  export interface SlackAttachment {
    fallback: string;
    color?: string;
    pretext?: string;
    author_name?: string;
    author_link?: URLString;
    author_icon?: URLString;
    title?: string;
    title_link?: URLString;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
    image_url?: URLString;
    thumb_url?: URLString;
    footer?: string;
    footer_icon?: URLString;
    ts?: number;
  }

  export interface SlackBlock {
    type: string;
    block_id?: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
    accessory?: any;
    elements?: any[];
  }

  export interface SlackSettings {
    notifications: {
      caseUpdates: boolean;
      invoiceReminders: boolean;
      taskAssignments: boolean;
      hearingReminders: boolean;
      paymentReceived: boolean;
      documentUploaded: boolean;
      clientMessages: boolean;
    };
    defaultChannelId?: string;
    defaultChannelName?: string;
    mentionOnUrgent: boolean;
    useThreads: boolean;
  }

  // Request/Response Interfaces

  // GET /api/slack/auth-url - Get Auth URL
  export interface GetSlackAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/slack/callback - OAuth Callback
  export interface SlackCallbackParams {
    code: string;
    state: string;
  }

  export interface SlackCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      team: {
        id: string;
        name: string;
      };
      channel?: {
        id: string;
        name: string;
      };
    };
  }

  // GET /api/slack/status - Get Connection Status
  export interface GetSlackStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      team?: {
        id: string;
        name: string;
      };
      channel?: {
        id: string;
        name: string;
      };
      connectedAt?: ISODateString;
      stats?: {
        messagesSent: number;
        lastMessageAt?: ISODateString;
      };
      settings?: SlackSettings;
    };
  }

  // POST /api/slack/disconnect - Disconnect Slack
  export interface DisconnectSlackResponse extends ApiResponse {
    message: string;
  }

  // POST /api/slack/test - Test Connection
  export interface TestSlackConnectionResponse extends ApiResponse {
    data: {
      sent: boolean;
      channel: string;
      ts: string;
    };
  }

  // POST /api/slack/message - Send Message
  export interface SendSlackMessageRequest {
    channelId: string;
    text: string;
    blocks?: SlackBlock[];
    attachments?: SlackAttachment[];
    threadTs?: string;
  }

  export interface SendSlackMessageResponse extends ApiResponse {
    data: {
      ok: boolean;
      channel: string;
      ts: string;
      message: SlackMessage;
    };
  }

  // GET /api/slack/channels - List Channels
  export interface ListSlackChannelsResponse extends ApiResponse {
    data: {
      channels: SlackChannel[];
    };
  }

  // POST /api/slack/channels - Create Channel
  export interface CreateSlackChannelRequest {
    name: string;
    isPrivate?: boolean;
  }

  export interface CreateSlackChannelResponse extends ApiResponse<SlackChannel> {}

  // GET /api/slack/settings - Get Settings
  export interface GetSlackSettingsResponse extends ApiResponse<SlackSettings> {}

  // PUT /api/slack/settings - Update Settings
  export interface UpdateSlackSettingsRequest extends Partial<SlackSettings> {}

  export interface UpdateSlackSettingsResponse extends ApiResponse<SlackSettings> {}

  // POST /api/slack/webhook - Handle Webhook
  export interface SlackWebhookEvent {
    token: string;
    team_id: string;
    api_app_id: string;
    event: {
      type: string;
      channel: string;
      user: string;
      text: string;
      ts: string;
      event_ts: string;
    };
    type: string;
    event_id: string;
    event_time: number;
  }

  // GET /api/slack/users/:slackUserId - Get User Info
  export interface GetSlackUserInfoResponse extends ApiResponse {
    data: {
      id: string;
      team_id: string;
      name: string;
      real_name: string;
      profile: {
        email?: EmailString;
        image_24?: URLString;
        image_32?: URLString;
        image_48?: URLString;
        image_72?: URLString;
      };
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// DISCORD INTEGRATION MODULE
// Routes: /api/integrations/discord
// Total Endpoints: 11
// Features: Guild management, Channels, Messages, Webhooks
// Gold Standard: Discord API patterns
// ═══════════════════════════════════════════════════════════════

export namespace DiscordIntegration {
  // Core Interfaces
  export interface DiscordGuild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
  }

  export interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    position: number;
    parent_id?: string;
    topic?: string;
  }

  export interface DiscordWebhook {
    id: string;
    type: number;
    guild_id?: string;
    channel_id: string;
    name: string;
    avatar?: string;
    token: string;
    url: URLString;
  }

  export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: URLString;
    timestamp?: ISODateString;
    color?: number;
    footer?: {
      text: string;
      icon_url?: URLString;
    };
    image?: {
      url: URLString;
    };
    thumbnail?: {
      url: URLString;
    };
    author?: {
      name: string;
      url?: URLString;
      icon_url?: URLString;
    };
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }

  export interface DiscordSettings {
    events: {
      caseCreated: boolean;
      caseUpdated: boolean;
      caseStatusChanged: boolean;
      caseAssigned: boolean;
      deadlineApproaching: boolean;
      taskCreated: boolean;
      taskCompleted: boolean;
      documentUploaded: boolean;
      paymentReceived: boolean;
      appointmentScheduled: boolean;
    };
    mentionRole?: string;
    embedColor?: string;
    includeDetails: boolean;
    maxNotificationsPerHour: number;
    digestMode?: {
      enabled: boolean;
      interval: number; // minutes
    };
  }

  // Request/Response Interfaces

  // GET /api/integrations/discord/auth-url - Get Auth URL
  export interface GetDiscordAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/integrations/discord/callback - OAuth Callback
  export interface DiscordCallbackParams {
    code: string;
    state: string;
    guild_id?: string;
  }

  export interface DiscordCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      requiresSetup: boolean;
      guilds?: DiscordGuild[];
    };
  }

  // POST /api/integrations/discord/complete-setup - Complete Setup
  export interface CompleteDiscordSetupRequest {
    guildId: string;
    channelId: string;
    webhookName?: string;
  }

  export interface CompleteDiscordSetupResponse extends ApiResponse {
    data: {
      webhook: DiscordWebhook;
      guild: DiscordGuild;
      channel: DiscordChannel;
    };
  }

  // GET /api/integrations/discord/status - Get Status
  export interface GetDiscordStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      integration?: {
        guildName: string;
        guildId: string;
        webhookChannelName: string;
        webhookChannelId: string;
        isActive: boolean;
        connectedAt: ISODateString;
        stats: {
          messagesSent: number;
          lastMessageAt?: ISODateString;
        };
      };
    };
  }

  // POST /api/integrations/discord/disconnect - Disconnect
  export interface DisconnectDiscordResponse extends ApiResponse {
    message: string;
  }

  // POST /api/integrations/discord/test - Test Connection
  export interface TestDiscordConnectionResponse extends ApiResponse {
    data: {
      sent: boolean;
      messageId?: string;
    };
  }

  // GET /api/integrations/discord/guilds - List Guilds
  export interface ListDiscordGuildsResponse extends ApiResponse {
    data: {
      guilds: DiscordGuild[];
    };
  }

  // GET /api/integrations/discord/guilds/:guildId/channels - List Channels
  export interface ListDiscordChannelsResponse extends ApiResponse {
    data: {
      channels: DiscordChannel[];
    };
  }

  // PUT /api/integrations/discord/settings - Update Settings
  export interface UpdateDiscordSettingsRequest extends Partial<DiscordSettings> {}

  export interface UpdateDiscordSettingsResponse extends ApiResponse<DiscordSettings> {}

  // POST /api/integrations/discord/message - Send Message
  export interface SendDiscordMessageRequest {
    content?: string;
    embed?: DiscordEmbed;
    username?: string;
    avatarUrl?: URLString;
  }

  export interface SendDiscordMessageResponse extends ApiResponse {
    data: {
      sent: boolean;
      messageId?: string;
    };
  }

  // POST /api/integrations/discord/webhook - Handle Webhook
  export interface DiscordWebhookEvent {
    type: number;
    id: string;
    guild_id?: string;
    channel_id?: string;
    data?: any;
  }
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM INTEGRATION MODULE
// Routes: /api/telegram
// Total Endpoints: 11
// Features: Bot management, Messages, Chats, Webhooks
// Gold Standard: Telegram Bot API patterns
// ═══════════════════════════════════════════════════════════════

export namespace TelegramIntegration {
  // Core Interfaces
  export interface TelegramBot {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    supports_inline_queries: boolean;
  }

  export interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  }

  export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    photo?: TelegramPhotoSize[];
    document?: TelegramDocument;
  }

  export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }

  export interface TelegramPhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }

  export interface TelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  }

  export interface TelegramSettings {
    notifications: {
      caseUpdates: boolean;
      taskReminders: boolean;
      paymentAlerts: boolean;
      hearingReminders: boolean;
      documentUploaded: boolean;
    };
    defaultChatId?: number;
    messageFormat: 'plain' | 'markdown' | 'html';
    includeButtons: boolean;
  }

  // Request/Response Interfaces

  // POST /api/telegram/connect - Connect Bot
  export interface ConnectTelegramRequest {
    botToken: string;
  }

  export interface ConnectTelegramResponse extends ApiResponse {
    data: {
      connected: boolean;
      bot: TelegramBot;
      webhookUrl: URLString;
    };
  }

  // POST /api/telegram/disconnect - Disconnect Bot
  export interface DisconnectTelegramResponse extends ApiResponse {
    message: string;
  }

  // GET /api/telegram/status - Get Status
  export interface GetTelegramStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      bot?: TelegramBot;
      webhookSet?: boolean;
      defaultChatId?: number;
      stats?: {
        messagesSent: number;
        messagesReceived: number;
        lastMessageAt?: ISODateString;
      };
    };
  }

  // POST /api/telegram/test - Test Connection
  export interface TestTelegramConnectionRequest {
    chatId: number;
  }

  export interface TestTelegramConnectionResponse extends ApiResponse {
    data: {
      sent: boolean;
      messageId?: number;
    };
  }

  // PUT /api/telegram/settings - Update Settings
  export interface UpdateTelegramSettingsRequest extends Partial<TelegramSettings> {}

  export interface UpdateTelegramSettingsResponse extends ApiResponse<TelegramSettings> {}

  // PATCH /api/telegram/settings - Update Settings (Partial)
  export interface PatchTelegramSettingsRequest extends Partial<TelegramSettings> {}

  export interface PatchTelegramSettingsResponse extends UpdateTelegramSettingsResponse {}

  // GET /api/telegram/chats - List Chats
  export interface ListTelegramChatsResponse extends ApiResponse {
    data: {
      chats: Array<{
        chatId: number;
        chatType: string;
        title?: string;
        username?: string;
        firstMessageAt: ISODateString;
        lastMessageAt: ISODateString;
        messageCount: number;
      }>;
    };
  }

  // POST /api/telegram/message - Send Message
  export interface SendTelegramMessageRequest {
    chatId: number;
    text: string;
    parseMode?: 'Markdown' | 'HTML';
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
  }

  export interface SendTelegramMessageResponse extends ApiResponse {
    data: {
      sent: boolean;
      message: TelegramMessage;
    };
  }

  // POST /api/telegram/photo - Send Photo
  export interface SendTelegramPhotoRequest {
    chatId: number;
    photo: string | Buffer; // file_id or URL or Buffer
    caption?: string;
    parseMode?: 'Markdown' | 'HTML';
  }

  export interface SendTelegramPhotoResponse extends ApiResponse {
    data: {
      sent: boolean;
      message: TelegramMessage;
    };
  }

  // POST /api/telegram/document - Send Document
  export interface SendTelegramDocumentRequest {
    chatId: number;
    document: string | Buffer; // file_id or URL or Buffer
    caption?: string;
    parseMode?: 'Markdown' | 'HTML';
  }

  export interface SendTelegramDocumentResponse extends ApiResponse {
    data: {
      sent: boolean;
      message: TelegramMessage;
    };
  }

  // POST /api/telegram/webhook/:firmId - Handle Webhook
  export interface TelegramWebhookUpdate {
    update_id: number;
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
    channel_post?: TelegramMessage;
    edited_channel_post?: TelegramMessage;
    callback_query?: any;
  }
}

// ═══════════════════════════════════════════════════════════════
// GITHUB INTEGRATION MODULE
// Routes: /api/github
// Total Endpoints: 12
// Features: Repositories, Issues, Pull Requests, Webhooks
// Gold Standard: GitHub API patterns
// ═══════════════════════════════════════════════════════════════

export namespace GitHubIntegration {
  // Core Interfaces
  export interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    html_url: URLString;
    clone_url: URLString;
    ssh_url: string;
    default_branch: string;
    language?: string;
    created_at: ISODateString;
    updated_at: ISODateString;
    pushed_at: ISODateString;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    forks_count: number;
    open_issues_count: number;
    owner: GitHubUser;
  }

  export interface GitHubUser {
    login: string;
    id: number;
    avatar_url: URLString;
    html_url: URLString;
    type: string;
  }

  export interface GitHubIssue {
    id: number;
    node_id: string;
    number: number;
    title: string;
    body?: string;
    state: 'open' | 'closed';
    created_at: ISODateString;
    updated_at: ISODateString;
    closed_at?: ISODateString;
    user: GitHubUser;
    labels: GitHubLabel[];
    assignees: GitHubUser[];
    html_url: URLString;
    comments: number;
  }

  export interface GitHubLabel {
    id: number;
    name: string;
    color: string;
    description?: string;
  }

  export interface GitHubPullRequest {
    id: number;
    number: number;
    title: string;
    body?: string;
    state: 'open' | 'closed';
    created_at: ISODateString;
    updated_at: ISODateString;
    closed_at?: ISODateString;
    merged_at?: ISODateString;
    user: GitHubUser;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    html_url: URLString;
    draft: boolean;
    merged: boolean;
  }

  export interface GitHubSettings {
    autoSync: boolean;
    syncInterval: 'manual' | 'hourly' | 'daily';
    notifications: {
      pushEvents: boolean;
      issueEvents: boolean;
      prEvents: boolean;
    };
    caseTracking: {
      enabled: boolean;
      tagPattern: string;
      autoLinkCommits: boolean;
    };
  }

  // Request/Response Interfaces

  // GET /api/github/auth - Get Auth URL
  export interface GetGitHubAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/github/callback - OAuth Callback
  export interface GitHubCallbackParams {
    code: string;
    state: string;
  }

  export interface GitHubCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      githubUserId: number;
      githubUsername: string;
      avatarUrl: URLString;
    };
  }

  // POST /api/github/disconnect - Disconnect GitHub
  export interface DisconnectGitHubResponse extends ApiResponse {
    message: string;
  }

  // GET /api/github/status - Get Status
  export interface GetGitHubStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      githubUsername?: string;
      avatarUrl?: URLString;
      connectedAt?: ISODateString;
      repositoryCount?: number;
    };
  }

  // GET /api/github/repositories - List Repositories
  export interface ListRepositoriesParams {
    visibility?: 'all' | 'public' | 'private';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }

  export interface ListRepositoriesResponse extends ApiResponse {
    data: GitHubRepository[];
    count: number;
  }

  // GET /api/github/repositories/:owner/:repo - Get Repository
  export interface GetRepositoryResponse extends ApiResponse<GitHubRepository> {}

  // GET /api/github/repositories/:owner/:repo/issues - List Issues
  export interface ListIssuesParams {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }

  export interface ListIssuesResponse extends ApiResponse {
    data: GitHubIssue[];
    count: number;
  }

  // POST /api/github/repositories/:owner/:repo/issues - Create Issue
  export interface CreateIssueRequest {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
    milestone?: number;
  }

  export interface CreateIssueResponse extends ApiResponse<GitHubIssue> {}

  // GET /api/github/repositories/:owner/:repo/pulls - List Pull Requests
  export interface ListPullRequestsParams {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }

  export interface ListPullRequestsResponse extends ApiResponse {
    data: GitHubPullRequest[];
    count: number;
  }

  // POST /api/github/repositories/:owner/:repo/pulls/:prNumber/comments - Create PR Comment
  export interface CreatePullRequestCommentRequest {
    body: string;
  }

  export interface CreatePullRequestCommentResponse extends ApiResponse {
    data: {
      id: number;
      body: string;
      created_at: ISODateString;
      html_url: URLString;
    };
  }

  // PUT /api/github/settings - Update Settings
  export interface UpdateGitHubSettingsRequest extends Partial<GitHubSettings> {}

  export interface UpdateGitHubSettingsResponse extends ApiResponse<GitHubSettings> {}

  // POST /api/github/webhook - Handle Webhook
  export interface GitHubWebhookEvent {
    action?: string;
    repository?: GitHubRepository;
    sender: GitHubUser;
    issue?: GitHubIssue;
    pull_request?: GitHubPullRequest;
    // ... many other event types
  }
}

// ═══════════════════════════════════════════════════════════════
// TRELLO INTEGRATION MODULE
// Routes: /api/trello
// Total Endpoints: 16
// Features: Boards, Lists, Cards, Sync with Tasks/Cases
// Gold Standard: Trello API patterns
// ═══════════════════════════════════════════════════════════════

export namespace TrelloIntegration {
  // Core Interfaces
  export interface TrelloBoard {
    id: string;
    name: string;
    desc: string;
    descData?: any;
    closed: boolean;
    idOrganization?: string;
    pinned: boolean;
    url: URLString;
    shortUrl: URLString;
    prefs: {
      permissionLevel: string;
      voting: string;
      comments: string;
      invitations: string;
      selfJoin: boolean;
      cardCovers: boolean;
      background: string;
      backgroundColor: string;
    };
    labelNames: Record<string, string>;
  }

  export interface TrelloList {
    id: string;
    name: string;
    closed: boolean;
    idBoard: string;
    pos: number;
    subscribed: boolean;
  }

  export interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    closed: boolean;
    idBoard: string;
    idList: string;
    idShort: number;
    idMembers: string[];
    idLabels: string[];
    url: URLString;
    shortUrl: URLString;
    pos: number;
    due?: ISODateString;
    dueComplete: boolean;
    dateLastActivity: ISODateString;
    labels: TrelloLabel[];
    badges: {
      votes: number;
      attachments: number;
      comments: number;
      checkItems: number;
      checkItemsChecked: number;
    };
  }

  export interface TrelloLabel {
    id: string;
    idBoard: string;
    name: string;
    color: string;
  }

  export interface TrelloSettings {
    notifications: {
      cardCreated: boolean;
      cardUpdated: boolean;
      cardMoved: boolean;
      cardCompleted: boolean;
      cardArchived: boolean;
      commentAdded: boolean;
      dueDateReminder: boolean;
    };
    defaultBoardId?: string;
    defaultBoardName?: string;
    defaultListId?: string;
    defaultListName?: string;
    enabled: boolean;
    syncInterval: 'manual' | 'hourly' | 'daily' | 'realtime';
  }

  // Request/Response Interfaces

  // GET /api/trello/auth-url - Get Auth URL
  export interface GetTrelloAuthUrlResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/trello/callback - OAuth Callback
  export interface TrelloCallbackParams {
    token: string;
    state: string;
  }

  export interface TrelloCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      userName: string;
      userId: string;
    };
  }

  // GET /api/trello/status - Get Status
  export interface GetTrelloStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      user?: {
        id: string;
        userName: string;
        fullName: string;
        avatarUrl?: URLString;
      };
      connectedAt?: ISODateString;
      stats?: {
        boardsAccess: number;
        cardsCreated: number;
        lastSyncAt?: ISODateString;
      };
      settings?: TrelloSettings;
      boards?: TrelloBoard[];
    };
  }

  // POST /api/trello/disconnect - Disconnect Trello
  export interface DisconnectTrelloResponse extends ApiResponse {
    message: string;
  }

  // GET /api/trello/boards - List Boards
  export interface ListTrelloBoardsResponse extends ApiResponse {
    data: {
      boards: TrelloBoard[];
    };
  }

  // GET /api/trello/boards/:boardId - Get Board
  export interface GetTrelloBoardResponse extends ApiResponse<TrelloBoard> {}

  // GET /api/trello/boards/:boardId/lists - List Lists
  export interface ListTrelloListsResponse extends ApiResponse {
    data: {
      lists: TrelloList[];
    };
  }

  // GET /api/trello/lists/:listId/cards - List Cards
  export interface ListTrelloCardsResponse extends ApiResponse {
    data: {
      cards: TrelloCard[];
    };
  }

  // POST /api/trello/cards - Create Card
  export interface CreateTrelloCardRequest {
    listId: string;
    name: string;
    desc?: string;
    due?: ISODateString;
    pos?: 'top' | 'bottom' | number;
    idMembers?: string[];
    idLabels?: string[];
  }

  export interface CreateTrelloCardResponse extends ApiResponse<TrelloCard> {}

  // PUT /api/trello/cards/:cardId - Update Card
  export interface UpdateTrelloCardRequest {
    name?: string;
    desc?: string;
    due?: ISODateString;
    closed?: boolean;
    idList?: string;
    pos?: number;
    dueComplete?: boolean;
  }

  export interface UpdateTrelloCardResponse extends ApiResponse<TrelloCard> {}

  // POST /api/trello/cards/:cardId/move - Move Card
  export interface MoveTrelloCardRequest {
    listId: string;
    pos?: 'top' | 'bottom' | number;
  }

  export interface MoveTrelloCardResponse extends ApiResponse<TrelloCard> {}

  // POST /api/trello/cards/:cardId/comments - Add Comment
  export interface AddTrelloCommentRequest {
    text: string;
  }

  export interface AddTrelloCommentResponse extends ApiResponse {
    data: {
      id: string;
      idMemberCreator: string;
      data: {
        text: string;
        card: {
          id: string;
          name: string;
        };
      };
      date: ISODateString;
    };
  }

  // GET /api/trello/settings - Get Settings
  export interface GetTrelloSettingsResponse extends ApiResponse<TrelloSettings> {}

  // PUT /api/trello/settings - Update Settings
  export interface UpdateTrelloSettingsRequest extends Partial<TrelloSettings> {}

  export interface UpdateTrelloSettingsResponse extends ApiResponse<TrelloSettings> {}

  // POST /api/trello/sync - Sync with Tasks/Cases
  export interface SyncWithTasksRequest {
    taskId: ObjectId;
    taskType: 'task' | 'case';
  }

  export interface SyncWithTasksResponse extends ApiResponse {
    data: {
      card: TrelloCard;
      task: any;
      synced: boolean;
    };
  }

  // POST /api/trello/webhook - Handle Webhook
  // HEAD /api/trello/webhook - Webhook Verification
  export interface TrelloWebhookEvent {
    action: {
      type: string;
      date: ISODateString;
      idMemberCreator: string;
      data: any;
    };
    model: {
      id: string;
      name?: string;
      desc?: string;
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// OAUTH & SSO INTEGRATION MODULE
// Routes: /api/auth/sso
// Total Endpoints: 15
// Features: Multi-provider OAuth, SSO routing, Domain verification
// Gold Standard: Enterprise SSO patterns (Okta, Auth0, Azure AD)
// ═══════════════════════════════════════════════════════════════

export namespace OAuthSSO {
  // Enums
  export enum ProviderType {
    Google = 'google',
    Microsoft = 'microsoft',
    Facebook = 'facebook',
    Apple = 'apple',
    GitHub = 'github',
    LinkedIn = 'linkedin',
    Twitter = 'twitter',
    Okta = 'okta',
    Auth0 = 'auth0',
    Custom = 'custom'
  }

  export enum VerificationMethod {
    DNS = 'dns',
    Email = 'email',
    Manual = 'manual'
  }

  // Core Interfaces
  export interface OAuthProvider {
    id: ObjectId;
    name: string;
    providerType: ProviderType;
    isEnabled: boolean;
    clientId?: string;
    clientSecret?: string; // Encrypted
    scopes?: string[];
    authUrl?: URLString;
    tokenUrl?: URLString;
    userInfoUrl?: URLString;
    firmId?: ObjectId;
    domains?: string[];
    domainVerified?: boolean;
    verificationMethod?: VerificationMethod;
    verifiedAt?: ISODateString;
    priority?: number;
    autoRedirect?: boolean;
    metadata?: Record<string, any>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface SSOLink {
    _id: ObjectId;
    userId: ObjectId;
    providerType: ProviderType;
    providerId: string;
    externalId: string;
    externalEmail: EmailString;
    accessToken?: string; // Encrypted
    refreshToken?: string; // Encrypted
    expiresAt?: ISODateString;
    scope?: string;
    lastLoginAt?: ISODateString;
    isActive: boolean;
    metadata?: Record<string, any>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface DomainConfig {
    domain: string;
    providers: OAuthProvider[];
    primaryProvider?: OAuthProvider;
    verificationToken?: string;
    verifiedAt?: ISODateString;
  }

  // Request/Response Interfaces

  // GET /api/auth/sso/providers - Get Enabled Providers
  export interface GetEnabledProvidersParams {
    firmId?: ObjectId;
  }

  export interface GetEnabledProvidersResponse extends ApiResponse {
    data: {
      providers: OAuthProvider[];
    };
  }

  // POST /api/auth/sso/initiate - Initiate SSO (Frontend-friendly)
  export interface InitiateSSORequest {
    provider: ProviderType;
    returnUrl?: string;
    firmId?: ObjectId;
    use_pkce?: boolean;
  }

  export interface InitiateSSOResponse extends ApiResponse {
    data: {
      authorizationUrl: URLString;
      pkceEnabled?: boolean;
    };
  }

  // POST /api/auth/sso/callback - Handle Callback (Frontend-friendly)
  export interface SSOCallbackRequest {
    provider: ProviderType;
    code: string;
    state: string;
  }

  export interface SSOCallbackResponse extends ApiResponse {
    data: {
      user?: any;
      isNewUser: boolean;
      token?: string; // JWT if existing user
    };
  }

  // GET /api/auth/sso/:providerType/authorize - Start OAuth Flow
  export interface AuthorizeParams {
    returnUrl?: string;
    firmId?: ObjectId;
  }

  export interface AuthorizeResponse extends ApiResponse {
    data: {
      authUrl: URLString;
    };
  }

  // GET /api/auth/sso/:providerType/callback - OAuth Callback
  export interface CallbackParams {
    code: string;
    state: string;
    error?: string;
    error_description?: string;
  }

  export interface CallbackResponse {
    // Redirects to frontend with query params
  }

  // POST /api/auth/sso/link - Link Account
  export interface LinkAccountRequest {
    providerType: ProviderType;
    code: string;
    redirectUri: URLString;
  }

  export interface LinkAccountResponse extends ApiResponse {
    data: {
      linked: boolean;
      provider: ProviderType;
    };
  }

  // DELETE /api/auth/sso/unlink/:providerType - Unlink Account
  export interface UnlinkAccountResponse extends ApiResponse {
    message: string;
  }

  // GET /api/auth/sso/linked - Get Linked Accounts
  export interface GetLinkedAccountsResponse extends ApiResponse {
    data: {
      links: Array<{
        providerType: ProviderType;
        externalEmail: EmailString;
        lastLoginAt?: ISODateString;
        isActive: boolean;
      }>;
    };
  }

  // POST /api/auth/sso/detect - Detect Provider from Email
  export interface DetectProviderRequest {
    email: EmailString;
    firmId?: ObjectId;
    returnUrl?: string;
  }

  export interface DetectProviderResponse extends ApiResponse {
    data: {
      detected: boolean;
      provider?: {
        id: ObjectId;
        name: string;
        type: 'saml' | 'oidc';
        providerType: ProviderType;
        autoRedirect: boolean;
        domainVerified: boolean;
        priority: number;
      };
      authUrl?: URLString;
      domain: string;
    };
  }

  // GET /api/auth/sso/domain/:domain - Get Domain Config
  export interface GetDomainConfigParams {
    firmId?: ObjectId;
  }

  export interface GetDomainConfigResponse extends ApiResponse {
    data: DomainConfig;
  }

  // POST /api/auth/sso/domain/:domain/verify/generate - Generate Verification Token
  export interface GenerateVerificationTokenRequest {
    providerId: ObjectId;
  }

  export interface GenerateVerificationTokenResponse extends ApiResponse {
    data: {
      domain: string;
      verificationMethod: VerificationMethod;
      txtRecord: {
        host: string;
        type: 'TXT';
        value: string;
        ttl: number;
      };
      instructions: string[];
      token: string;
    };
  }

  // POST /api/auth/sso/domain/:domain/verify - Verify Domain
  export interface VerifyDomainRequest {
    providerId: ObjectId;
  }

  export interface VerifyDomainResponse extends ApiResponse {
    data: {
      verified: boolean;
      verifiedAt?: ISODateString;
    };
  }

  // POST /api/auth/sso/domain/:domain/verify/manual - Manual Verification
  export interface ManualVerifyDomainRequest {
    providerId: ObjectId;
  }

  export interface ManualVerifyDomainResponse extends ApiResponse {
    data: {
      verified: boolean;
      verificationMethod: VerificationMethod;
    };
  }

  // POST /api/auth/sso/domain/:domain/cache/invalidate - Invalidate Cache
  export interface InvalidateDomainCacheRequest {
    firmId?: ObjectId;
  }

  export interface InvalidateDomainCacheResponse extends ApiResponse {
    message: string;
  }
}

// ═══════════════════════════════════════════════════════════════
// THIRD-PARTY INTEGRATIONS MODULE (QuickBooks, Xero)
// Routes: /api/integrations
// Total Endpoints: 45
// Features: Accounting software sync, Conflict resolution, Field mapping
// Gold Standard: Enterprise integration patterns
// ═══════════════════════════════════════════════════════════════

export namespace ThirdPartyIntegrations {
  // Enums
  export enum IntegrationType {
    QuickBooks = 'quickbooks',
    Xero = 'xero'
  }

  export enum SyncStatus {
    Pending = 'pending',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed',
    PartialSuccess = 'partial_success'
  }

  export enum ConflictResolution {
    UseLocal = 'use_local',
    UseRemote = 'use_remote',
    Merge = 'merge',
    Skip = 'skip'
  }

  export enum DataType {
    Invoices = 'invoices',
    Customers = 'customers',
    Vendors = 'vendors',
    Accounts = 'accounts',
    Payments = 'payments',
    Expenses = 'expenses',
    Contacts = 'contacts'
  }

  // Core Interfaces
  export interface IntegrationConnection {
    _id: ObjectId;
    type: IntegrationType;
    firmId: ObjectId;
    isActive: boolean;
    credentials: {
      realmId?: string; // QuickBooks
      tenantId?: string; // Xero
      accessToken: string; // Encrypted
      refreshToken: string; // Encrypted
      expiresAt: ISODateString;
    };
    settings: IntegrationSettings;
    lastSync?: ISODateString;
    syncFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly';
    createdAt: ISODateString;
    updatedAt: ISODateString;
  }

  export interface IntegrationSettings {
    autoSync: boolean;
    syncDirection: 'bidirectional' | 'to_local' | 'to_remote';
    fieldMappings: FieldMapping[];
    accountMappings: AccountMapping[];
    conflictResolution: ConflictResolution;
  }

  export interface FieldMapping {
    localField: string;
    remoteField: string;
    dataType: DataType;
    transform?: string; // Function name for custom transformations
  }

  export interface AccountMapping {
    localAccountId: ObjectId;
    remoteAccountId: string;
    accountType: string;
    accountName: string;
  }

  export interface SyncHistory {
    _id: ObjectId;
    integrationId: ObjectId;
    type: IntegrationType;
    dataType: DataType;
    status: SyncStatus;
    startedAt: ISODateString;
    completedAt?: ISODateString;
    itemsProcessed: number;
    itemsSucceeded: number;
    itemsFailed: number;
    errors?: SyncError[];
    firmId: ObjectId;
  }

  export interface SyncError {
    itemId?: string;
    itemType: DataType;
    error: string;
    details?: any;
  }

  export interface DataConflict {
    _id: ObjectId;
    integrationId: ObjectId;
    dataType: DataType;
    localId: ObjectId;
    remoteId: string;
    localData: any;
    remoteData: any;
    conflictFields: string[];
    resolution?: ConflictResolution;
    resolvedAt?: ISODateString;
    resolvedBy?: ObjectId;
    firmId: ObjectId;
    createdAt: ISODateString;
  }

  // QuickBooks Interfaces
  export interface QuickBooksInvoice {
    Id: string;
    DocNumber: string;
    TxnDate: string;
    DueDate: string;
    TotalAmt: number;
    Balance: number;
    CustomerRef: {
      value: string;
      name: string;
    };
    Line: QuickBooksLineItem[];
  }

  export interface QuickBooksLineItem {
    Id: string;
    LineNum: number;
    Description: string;
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
      ItemRef: {
        value: string;
        name: string;
      };
      UnitPrice: number;
      Qty: number;
    };
  }

  export interface QuickBooksCustomer {
    Id: string;
    DisplayName: string;
    GivenName?: string;
    FamilyName?: string;
    CompanyName?: string;
    PrimaryEmailAddr?: {
      Address: EmailString;
    };
    PrimaryPhone?: {
      FreeFormNumber: PhoneNumber;
    };
  }

  // Xero Interfaces
  export interface XeroInvoice {
    InvoiceID: string;
    InvoiceNumber: string;
    Type: 'ACCPAY' | 'ACCREC';
    Contact: XeroContact;
    DateString: string;
    DueDateString: string;
    Status: string;
    LineItems: XeroLineItem[];
    SubTotal: number;
    TotalTax: number;
    Total: number;
    AmountDue: number;
  }

  export interface XeroLineItem {
    LineItemID: string;
    Description: string;
    Quantity: number;
    UnitAmount: number;
    TaxAmount: number;
    LineAmount: number;
    AccountCode: string;
  }

  export interface XeroContact {
    ContactID: string;
    Name: string;
    FirstName?: string;
    LastName?: string;
    EmailAddress?: EmailString;
    Phones?: Array<{
      PhoneType: string;
      PhoneNumber: PhoneNumber;
    }>;
  }

  // Request/Response Interfaces

  // QuickBooks Routes

  // GET /api/integrations/quickbooks/auth - Initiate Auth
  export interface InitiateQuickBooksAuthResponse extends ApiResponse {
    data: {
      authUrl: URLString;
      state: string;
    };
  }

  // GET /api/integrations/quickbooks/callback - OAuth Callback
  export interface QuickBooksCallbackParams {
    code: string;
    state: string;
    realmId: string;
  }

  export interface QuickBooksCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      realmId: string;
      companyName?: string;
    };
  }

  // POST /api/integrations/quickbooks/disconnect - Disconnect
  export interface DisconnectQuickBooksResponse extends ApiResponse {
    message: string;
  }

  // GET /api/integrations/quickbooks/status - Get Status
  export interface GetQuickBooksStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      realmId?: string;
      companyName?: string;
      lastSync?: ISODateString;
      settings?: IntegrationSettings;
    };
  }

  // POST /api/integrations/quickbooks/refresh-token - Refresh Token
  export interface RefreshQuickBooksTokenResponse extends ApiResponse {
    data: {
      refreshed: boolean;
      expiresAt: ISODateString;
    };
  }

  // POST /api/integrations/quickbooks/sync/all - Sync All Data
  export interface SyncAllQuickBooksDataRequest {
    force?: boolean;
  }

  export interface SyncAllQuickBooksDataResponse extends ApiResponse {
    data: {
      syncHistory: SyncHistory[];
      totalProcessed: number;
      totalSucceeded: number;
      totalFailed: number;
    };
  }

  // POST /api/integrations/quickbooks/sync/invoices - Sync Invoices
  export interface SyncQuickBooksInvoicesRequest {
    startDate?: ISODateString;
    endDate?: ISODateString;
    force?: boolean;
  }

  export interface SyncQuickBooksInvoicesResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/quickbooks/sync/customers - Sync Customers
  export interface SyncQuickBooksCustomersResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/quickbooks/sync/vendors - Sync Vendors
  export interface SyncQuickBooksVendorsResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/quickbooks/sync/accounts - Sync Accounts
  export interface SyncQuickBooksAccountsResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/quickbooks/sync/payments - Sync Payments
  export interface SyncQuickBooksPaymentsResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/quickbooks/sync/expenses - Sync Expenses
  export interface SyncQuickBooksExpensesResponse extends ApiResponse<SyncHistory> {}

  // GET /api/integrations/quickbooks/sync/history - Get Sync History
  export interface GetQuickBooksSyncHistoryParams extends PaginationParams {
    dataType?: DataType;
    status?: SyncStatus;
    startDate?: ISODateString;
    endDate?: ISODateString;
  }

  export interface GetQuickBooksSyncHistoryResponse extends ApiResponse {
    data: {
      history: SyncHistory[];
      pagination: PaginationResponse;
    };
  }

  // GET /api/integrations/quickbooks/mappings/fields - Get Field Mappings
  export interface GetQuickBooksFieldMappingsResponse extends ApiResponse {
    data: {
      mappings: FieldMapping[];
    };
  }

  // PUT /api/integrations/quickbooks/mappings/fields - Update Field Mappings
  export interface UpdateQuickBooksFieldMappingsRequest {
    mappings: FieldMapping[];
  }

  export interface UpdateQuickBooksFieldMappingsResponse extends ApiResponse {
    data: {
      updated: number;
      mappings: FieldMapping[];
    };
  }

  // GET /api/integrations/quickbooks/mappings/accounts - Get Account Mappings
  export interface GetQuickBooksAccountMappingsResponse extends ApiResponse {
    data: {
      mappings: AccountMapping[];
    };
  }

  // PUT /api/integrations/quickbooks/mappings/accounts - Update Account Mappings
  export interface UpdateQuickBooksAccountMappingsRequest {
    mappings: AccountMapping[];
  }

  export interface UpdateQuickBooksAccountMappingsResponse extends ApiResponse {
    data: {
      updated: number;
      mappings: AccountMapping[];
    };
  }

  // GET /api/integrations/quickbooks/conflicts - Get Conflicts
  export interface GetQuickBooksConflictsParams extends PaginationParams {
    dataType?: DataType;
    resolved?: boolean;
  }

  export interface GetQuickBooksConflictsResponse extends ApiResponse {
    data: {
      conflicts: DataConflict[];
      pagination: PaginationResponse;
    };
  }

  // POST /api/integrations/quickbooks/conflicts/:conflictId/resolve - Resolve Conflict
  export interface ResolveQuickBooksConflictRequest {
    resolution: ConflictResolution;
    mergedData?: any;
  }

  export interface ResolveQuickBooksConflictResponse extends ApiResponse<DataConflict> {}

  // POST /api/integrations/quickbooks/conflicts/bulk-resolve - Bulk Resolve
  export interface BulkResolveQuickBooksConflictsRequest {
    conflictIds: ObjectId[];
    resolution: ConflictResolution;
  }

  export interface BulkResolveQuickBooksConflictsResponse extends ApiResponse {
    data: {
      resolved: number;
      failed: number;
      conflicts: DataConflict[];
    };
  }

  // Xero Routes (Similar structure to QuickBooks)

  // GET /api/integrations/xero/auth
  export interface InitiateXeroAuthResponse extends InitiateQuickBooksAuthResponse {}

  // GET /api/integrations/xero/callback
  export interface XeroCallbackParams {
    code: string;
    state: string;
  }

  export interface XeroCallbackResponse extends ApiResponse {
    data: {
      connected: boolean;
      tenantId: string;
      tenantName?: string;
    };
  }

  // POST /api/integrations/xero/disconnect
  export interface DisconnectXeroResponse extends DisconnectQuickBooksResponse {}

  // GET /api/integrations/xero/status
  export interface GetXeroStatusResponse extends ApiResponse {
    data: {
      connected: boolean;
      tenantId?: string;
      tenantName?: string;
      lastSync?: ISODateString;
      settings?: IntegrationSettings;
    };
  }

  // POST /api/integrations/xero/refresh-token
  export interface RefreshXeroTokenResponse extends RefreshQuickBooksTokenResponse {}

  // POST /api/integrations/xero/sync/all
  export interface SyncAllXeroDataRequest extends SyncAllQuickBooksDataRequest {}
  export interface SyncAllXeroDataResponse extends SyncAllQuickBooksDataResponse {}

  // POST /api/integrations/xero/sync/invoices
  export interface SyncXeroInvoicesRequest extends SyncQuickBooksInvoicesRequest {}
  export interface SyncXeroInvoicesResponse extends SyncQuickBooksInvoicesResponse {}

  // POST /api/integrations/xero/sync/contacts
  export interface SyncXeroContactsResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/xero/sync/accounts
  export interface SyncXeroAccountsResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/xero/sync/payments
  export interface SyncXeroPaymentsResponse extends ApiResponse<SyncHistory> {}

  // POST /api/integrations/xero/sync/expenses
  export interface SyncXeroExpensesResponse extends ApiResponse<SyncHistory> {}

  // GET /api/integrations/xero/sync/history
  export interface GetXeroSyncHistoryParams extends GetQuickBooksSyncHistoryParams {}
  export interface GetXeroSyncHistoryResponse extends GetQuickBooksSyncHistoryResponse {}

  // POST /api/integrations/xero/webhook - Xero Webhook
  export interface XeroWebhookEvent {
    events: Array<{
      resourceUrl: URLString;
      resourceId: string;
      eventDateUtc: ISODateString;
      eventType: string;
      eventCategory: string;
      tenantId: string;
      tenantType: string;
    }>;
    firstEventSequence: number;
    lastEventSequence: number;
    entropy: string;
  }

  // GET /api/integrations/xero/webhook/status
  export interface GetXeroWebhookStatusResponse extends ApiResponse {
    data: {
      configured: boolean;
      webhookUrl?: URLString;
      lastEvent?: ISODateString;
      eventCount?: number;
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL NAMESPACES
// ═══════════════════════════════════════════════════════════════

export default {
  EventManagement,
  AppointmentScheduling,
  WhatsAppIntegration,
  GmailIntegration,
  DocuSignIntegration,
  ZoomIntegration,
  SlackIntegration,
  DiscordIntegration,
  TelegramIntegration,
  GitHubIntegration,
  TrelloIntegration,
  OAuthSSO,
  ThirdPartyIntegrations
};
