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
    getEventsByClient
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

// NEW: Conflicts and client filter (must be before parameterized routes)
app.get('/conflicts', userMiddleware, getConflicts);
app.get('/client/:clientId', userMiddleware, getEventsByClient);

// NEW: Bulk operations
app.post('/bulk', userMiddleware, bulkCreateEvents);
app.put('/bulk', userMiddleware, bulkUpdateEvents);
app.delete('/bulk', userMiddleware, bulkDeleteEvents);

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
