const express = require('express');
const multer = require('multer');
const { userMiddleware, firmFilter } = require('../middlewares');
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
    importEventsFromICS
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
app.get('/stats', userMiddleware, firmFilter, getEventStats);
app.get('/calendar', userMiddleware, firmFilter, getCalendarEvents);
app.get('/upcoming', userMiddleware, firmFilter, getUpcomingEvents);
app.get('/month/:year/:month', userMiddleware, firmFilter, getEventsByMonth);
app.get('/date/:date', userMiddleware, firmFilter, getEventsByDate);
app.post('/availability', userMiddleware, firmFilter, checkAvailability);
app.post('/import/ics', userMiddleware, firmFilter, icsUpload.single('file'), importEventsFromICS);

// Event CRUD
app.post('/', userMiddleware, firmFilter, createEvent);
app.get('/', userMiddleware, firmFilter, getEvents);
app.get('/:id', userMiddleware, firmFilter, getEvent);
app.get('/:id/export/ics', userMiddleware, firmFilter, exportEventToICS);
app.put('/:id', userMiddleware, firmFilter, updateEvent);
app.patch('/:id', userMiddleware, firmFilter, updateEvent);
app.delete('/:id', userMiddleware, firmFilter, deleteEvent);

// Event actions
app.post('/:id/complete', userMiddleware, firmFilter, completeEvent);
app.post('/:id/cancel', userMiddleware, firmFilter, cancelEvent);
app.post('/:id/postpone', userMiddleware, firmFilter, postponeEvent);

// Attendee management
app.post('/:id/attendees', userMiddleware, firmFilter, addAttendee);
app.delete('/:id/attendees/:attendeeId', userMiddleware, firmFilter, removeAttendee);
app.post('/:id/rsvp', userMiddleware, firmFilter, rsvpEvent);

// Agenda management
app.post('/:id/agenda', userMiddleware, firmFilter, addAgendaItem);
app.put('/:id/agenda/:agendaId', userMiddleware, firmFilter, updateAgendaItem);
app.delete('/:id/agenda/:agendaId', userMiddleware, firmFilter, deleteAgendaItem);

// Action items
app.post('/:id/action-items', userMiddleware, firmFilter, addActionItem);
app.put('/:id/action-items/:itemId', userMiddleware, firmFilter, updateActionItem);

module.exports = app;
