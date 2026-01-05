const express = require('express');
const multer = require('multer');
const { userMiddleware } = require('../middlewares');
const {
    createEvent,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    postponeEvent,
    completeEvent,
    addAttendee,
    removeAttendee,
    rsvpEvent,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    addActionItem,
    updateActionItem,
    getCalendarEvents,
    getUpcomingEvents,
    getEventsByDate,
    getEventsByMonth,
    getEventStats,
    checkAvailability,
    exportEventToICS,
    importEventsFromICS,
    createEventFromNaturalLanguage,
    createEventFromVoice,
    // NEW: Missing endpoints
    deleteActionItem,
    cloneEvent,
    rescheduleEvent,
    getConflicts,
    bulkCreateEvents,
    bulkUpdateEvents,
    bulkDeleteEvents,
    getEventsByClient,
    searchEvents,
    getEventActivity,
    // NEW: Bulk operations (Gold Standard)
    bulkCompleteEvents,
    bulkArchiveEvents,
    bulkUnarchiveEvents,
    // NEW: Single archive operations
    archiveEvent,
    unarchiveEvent,
    // NEW: Utility endpoints
    getAllEventIds,
    getArchivedEvents,
    getEventsByCase,
    // NEW: Location trigger endpoints (Gold Standard - matches Reminders/Tasks)
    updateLocationTrigger,
    checkLocationTrigger,
    getEventsWithLocationTriggers,
    bulkCheckLocationTriggers,
    // NEW: Export & Reorder (Gold Standard - matches Tasks/Reminders)
    exportEvents,
    reorderEvents
} = require('../controllers/event.controller');

const app = express.Router();

// Multer config for ICS file uploads (memory storage)
const icsUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/calendar' ||
            file.originalname.toLowerCase().endsWith('.ics')) {
            cb(null, true);
        } else {
            cb(new Error('Only ICS files are allowed'), false);
        }
    }
});

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getEventStats);
app.get('/calendar', userMiddleware, getCalendarEvents);
app.get('/upcoming', userMiddleware, getUpcomingEvents);
app.get('/month/:year/:month', userMiddleware, getEventsByMonth);
app.get('/date/:date', userMiddleware, getEventsByDate);
app.post('/availability', userMiddleware, checkAvailability);
app.post('/import/ics', userMiddleware, icsUpload.single('file'), importEventsFromICS);

// NEW: Conflicts, search, and client filter (must be before parameterized routes)
app.get('/conflicts', userMiddleware, getConflicts);
app.get('/search', userMiddleware, searchEvents);
app.get('/client/:clientId', userMiddleware, getEventsByClient);

// NEW: Bulk operations
app.post('/bulk', userMiddleware, bulkCreateEvents);
app.put('/bulk', userMiddleware, bulkUpdateEvents);
app.delete('/bulk', userMiddleware, bulkDeleteEvents);
// NEW: Bulk complete, archive, unarchive (Gold Standard - matches Tasks API)
app.post('/bulk/complete', userMiddleware, bulkCompleteEvents);
app.post('/bulk/archive', userMiddleware, bulkArchiveEvents);
app.post('/bulk/unarchive', userMiddleware, bulkUnarchiveEvents);

// NEW: Export and Select All
app.get('/ids', userMiddleware, getAllEventIds);
app.get('/archived', userMiddleware, getArchivedEvents);
// NEW: Export & Reorder (Gold Standard - matches Tasks/Reminders)
app.get('/export', userMiddleware, exportEvents);
app.patch('/reorder', userMiddleware, reorderEvents);

// NEW: Filter by case (must be before parameterized routes)
app.get('/case/:caseId', userMiddleware, getEventsByCase);

// NEW: Location trigger routes (Gold Standard - matches Reminders/Tasks)
app.get('/location-triggers', userMiddleware, getEventsWithLocationTriggers);
app.post('/location/check', userMiddleware, bulkCheckLocationTriggers);

// NLP & Voice endpoints
app.post('/parse', userMiddleware, createEventFromNaturalLanguage);
app.post('/voice', userMiddleware, createEventFromVoice);

// Event CRUD
app.post('/', userMiddleware, createEvent);
app.get('/', userMiddleware, getEvents);
app.get('/:id', userMiddleware, getEvent);
app.get('/:id/export/ics', userMiddleware, exportEventToICS);
app.put('/:id', userMiddleware, updateEvent);
app.patch('/:id', userMiddleware, updateEvent);
app.delete('/:id', userMiddleware, deleteEvent);

// Event actions
app.post('/:id/complete', userMiddleware, completeEvent);
app.post('/:id/cancel', userMiddleware, cancelEvent);
app.post('/:id/postpone', userMiddleware, postponeEvent);
app.post('/:id/clone', userMiddleware, cloneEvent);
app.post('/:id/reschedule', userMiddleware, rescheduleEvent);
app.get('/:id/activity', userMiddleware, getEventActivity);
// NEW: Archive/Unarchive single event
app.post('/:id/archive', userMiddleware, archiveEvent);
app.post('/:id/unarchive', userMiddleware, unarchiveEvent);
// NEW: Location trigger for single event
app.put('/:id/location-trigger', userMiddleware, updateLocationTrigger);
app.post('/:id/location/check', userMiddleware, checkLocationTrigger);

// Attendee management
app.post('/:id/attendees', userMiddleware, addAttendee);
app.delete('/:id/attendees/:attendeeId', userMiddleware, removeAttendee);
app.post('/:id/rsvp', userMiddleware, rsvpEvent);

// Agenda management
app.post('/:id/agenda', userMiddleware, addAgendaItem);
app.put('/:id/agenda/:agendaId', userMiddleware, updateAgendaItem);
app.delete('/:id/agenda/:agendaId', userMiddleware, deleteAgendaItem);

// Action items
app.post('/:id/action-items', userMiddleware, addActionItem);
app.put('/:id/action-items/:itemId', userMiddleware, updateActionItem);
app.delete('/:id/action-items/:itemId', userMiddleware, deleteActionItem);

module.exports = app;
