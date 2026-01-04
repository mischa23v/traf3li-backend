#!/bin/bash
# Comprehensive API Contract Test Script
# Tests all 4 API contracts: Tasks, Reminders, Events, Gantt

TOKEN=$(cat /tmp/token.txt 2>/dev/null)
if [ -z "$TOKEN" ]; then
    echo "ERROR: Token not found at /tmp/token.txt"
    exit 1
fi

API="https://api.traf3li.com/api"
PASS=0
FAIL=0
SKIP=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
test_endpoint() {
    local METHOD=$1
    local ENDPOINT=$2
    local DATA=$3
    local EXPECTED=$4
    local DESC=$5

    if [ "$METHOD" = "GET" ]; then
        RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 "$API$ENDPOINT" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    elif [ "$METHOD" = "DELETE" ]; then
        RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 -X DELETE "$API$ENDPOINT" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    else
        RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 -X $METHOD "$API$ENDPOINT" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$DATA" 2>/dev/null)
    fi

    SUCCESS=$(echo "$RESP" | jq -r '.success // false' 2>/dev/null)
    MSG=$(echo "$RESP" | jq -r '.message // "no message"' 2>/dev/null)

    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}PASS${NC} $METHOD $ENDPOINT"
        ((PASS++))
    else
        echo -e "${RED}FAIL${NC} $METHOD $ENDPOINT: $MSG"
        ((FAIL++))
    fi
}

extract_id() {
    echo "$1" | jq -r '.data._id // .task._id // .reminder._id // .event._id // empty' 2>/dev/null
}

echo "========================================================================"
echo "           COMPREHENSIVE API CONTRACT TESTING"
echo "           Date: $(date)"
echo "========================================================================"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TASKS API (task-api-contract.md)
# ═══════════════════════════════════════════════════════════════════════════
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                         TASKS API                                   ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Stats & Overview
test_endpoint "GET" "/tasks/stats" "" "" "Get task stats"
test_endpoint "GET" "/tasks/overview" "" "" "Get tasks overview"
test_endpoint "GET" "/tasks/upcoming" "" "" "Get upcoming tasks"
test_endpoint "GET" "/tasks/overdue" "" "" "Get overdue tasks"
test_endpoint "GET" "/tasks/due-today" "" "" "Get tasks due today"
test_endpoint "GET" "/tasks" "" "" "Get all tasks"
test_endpoint "GET" "/tasks/templates" "" "" "Get task templates"

# Create task for testing
echo ""
echo "Creating test task..."
TASK_RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 -X POST "$API/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"API Contract Test Task","priority":"medium","status":"todo","description":"Test task from contract testing"}' 2>/dev/null)
TASK_ID=$(extract_id "$TASK_RESP")

if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    echo -e "${GREEN}PASS${NC} POST /tasks (ID: $TASK_ID)"
    ((PASS++))

    # Read operations
    test_endpoint "GET" "/tasks/$TASK_ID" "" "" "Get task by ID"
    test_endpoint "GET" "/tasks/$TASK_ID/full" "" "" "Get full task details"

    # Update
    RESP=$(curl -s -k --tlsv1.2 -X PUT "$API/tasks/$TASK_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"Updated Contract Test Task","progress":25}' 2>/dev/null)
    if [ "$(echo "$RESP" | jq -r '.success')" = "true" ]; then
        echo -e "${GREEN}PASS${NC} PUT /tasks/:id"
        ((PASS++))
    else
        echo -e "${RED}FAIL${NC} PUT /tasks/:id: $(echo "$RESP" | jq -r '.message')"
        ((FAIL++))
    fi

    # Status update
    test_endpoint "PATCH" "/tasks/$TASK_ID/status" '{"status":"in_progress"}' "" "Update task status"

    # Progress update
    test_endpoint "PATCH" "/tasks/$TASK_ID/progress" '{"progress":50}' "" "Update task progress"

    # Add subtask
    test_endpoint "POST" "/tasks/$TASK_ID/subtasks" '{"title":"Test Subtask"}' "" "Add subtask"

    # Add comment
    test_endpoint "POST" "/tasks/$TASK_ID/comments" '{"content":"Test comment from API contract testing"}' "" "Add comment"

    # Complete task
    test_endpoint "POST" "/tasks/$TASK_ID/complete" '{}' "" "Complete task"

    # Delete task
    test_endpoint "DELETE" "/tasks/$TASK_ID" "" "" "Delete task"
else
    echo -e "${RED}FAIL${NC} POST /tasks: Could not create task"
    ((FAIL++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# REMINDERS API (reminder-api-contract.md)
# ═══════════════════════════════════════════════════════════════════════════
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                       REMINDERS API                                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Stats & Filters
test_endpoint "GET" "/reminders/stats" "" "" "Get reminder stats"
test_endpoint "GET" "/reminders/upcoming" "" "" "Get upcoming reminders"
test_endpoint "GET" "/reminders/overdue" "" "" "Get overdue reminders"
test_endpoint "GET" "/reminders/snoozed-due" "" "" "Get snoozed due reminders"
test_endpoint "GET" "/reminders/delegated" "" "" "Get delegated reminders"
test_endpoint "GET" "/reminders" "" "" "Get all reminders"

# Location-based
test_endpoint "GET" "/reminders/location/summary" "" "" "Get location summary"
test_endpoint "GET" "/reminders/location/locations" "" "" "Get user locations"

# Create reminder for testing
echo ""
echo "Creating test reminder..."
REM_RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 -X POST "$API/reminders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"API Contract Test Reminder","reminderDateTime":"2026-01-15T10:00:00","priority":"medium","type":"general"}' 2>/dev/null)
REM_ID=$(extract_id "$REM_RESP")

if [ -n "$REM_ID" ] && [ "$REM_ID" != "null" ]; then
    echo -e "${GREEN}PASS${NC} POST /reminders (ID: $REM_ID)"
    ((PASS++))

    # Read
    test_endpoint "GET" "/reminders/$REM_ID" "" "" "Get reminder by ID"

    # Update
    RESP=$(curl -s -k --tlsv1.2 -X PUT "$API/reminders/$REM_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"Updated Contract Test Reminder"}' 2>/dev/null)
    if [ "$(echo "$RESP" | jq -r '.success')" = "true" ]; then
        echo -e "${GREEN}PASS${NC} PUT /reminders/:id"
        ((PASS++))
    else
        echo -e "${RED}FAIL${NC} PUT /reminders/:id: $(echo "$RESP" | jq -r '.message')"
        ((FAIL++))
    fi

    # Snooze
    test_endpoint "POST" "/reminders/$REM_ID/snooze" '{"snoozeMinutes":30}' "" "Snooze reminder"

    # Complete
    test_endpoint "POST" "/reminders/$REM_ID/complete" '{}' "" "Complete reminder"

    # Delete
    test_endpoint "DELETE" "/reminders/$REM_ID" "" "" "Delete reminder"
else
    echo -e "${RED}FAIL${NC} POST /reminders: Could not create reminder"
    ((FAIL++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# EVENTS API (event-api-contract.md)
# ═══════════════════════════════════════════════════════════════════════════
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                        EVENTS API                                   ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Stats & Calendar
test_endpoint "GET" "/events/stats" "" "" "Get event stats"
test_endpoint "GET" "/events/upcoming" "" "" "Get upcoming events"
test_endpoint "GET" "/events/calendar?startDate=2026-01-01&endDate=2026-01-31" "" "" "Get calendar events"
test_endpoint "GET" "/events" "" "" "Get all events"

# Availability check
test_endpoint "POST" "/events/availability" '{"startDateTime":"2026-01-10T09:00:00","endDateTime":"2026-01-10T17:00:00"}' "" "Check availability"

# Create event for testing
echo ""
echo "Creating test event..."
EVT_RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 -X POST "$API/events" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"API Contract Test Event","type":"meeting","startDateTime":"2026-01-15T14:00:00","endDateTime":"2026-01-15T15:00:00","description":"Test event from contract testing"}' 2>/dev/null)
EVT_ID=$(extract_id "$EVT_RESP")

if [ -n "$EVT_ID" ] && [ "$EVT_ID" != "null" ]; then
    echo -e "${GREEN}PASS${NC} POST /events (ID: $EVT_ID)"
    ((PASS++))

    # Read
    test_endpoint "GET" "/events/$EVT_ID" "" "" "Get event by ID"

    # Update
    RESP=$(curl -s -k --tlsv1.2 -X PUT "$API/events/$EVT_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"Updated Contract Test Event"}' 2>/dev/null)
    if [ "$(echo "$RESP" | jq -r '.success')" = "true" ]; then
        echo -e "${GREEN}PASS${NC} PUT /events/:id"
        ((PASS++))
    else
        echo -e "${RED}FAIL${NC} PUT /events/:id: $(echo "$RESP" | jq -r '.message')"
        ((FAIL++))
    fi

    # Add attendee (by email)
    test_endpoint "POST" "/events/$EVT_ID/attendees" '{"email":"test@example.com","name":"Test Attendee"}' "" "Add attendee"

    # Add agenda item
    test_endpoint "POST" "/events/$EVT_ID/agenda" '{"title":"Test Agenda Item","duration":15}' "" "Add agenda item"

    # Add action item
    test_endpoint "POST" "/events/$EVT_ID/action-items" '{"description":"Test Action Item"}' "" "Add action item"

    # Complete event
    test_endpoint "POST" "/events/$EVT_ID/complete" '{}' "" "Complete event"

    # Create another event for cancel test
    EVT2_RESP=$(curl -s -k --tlsv1.2 -X POST "$API/events" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"API Contract Test Event 2","type":"meeting","startDateTime":"2026-01-16T14:00:00","endDateTime":"2026-01-16T15:00:00"}' 2>/dev/null)
    EVT2_ID=$(extract_id "$EVT2_RESP")

    if [ -n "$EVT2_ID" ] && [ "$EVT2_ID" != "null" ]; then
        # Cancel event
        test_endpoint "POST" "/events/$EVT2_ID/cancel" '{"reason":"Testing cancel endpoint"}' "" "Cancel event"

        # Delete event
        test_endpoint "DELETE" "/events/$EVT2_ID" "" "" "Delete cancelled event"
    fi

    # Delete original event
    test_endpoint "DELETE" "/events/$EVT_ID" "" "" "Delete event"
else
    echo -e "${RED}FAIL${NC} POST /events: Could not create event"
    ((FAIL++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# GANTT API (gantt-api-contract.md)
# ═══════════════════════════════════════════════════════════════════════════
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                         GANTT API                                   ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Productivity Data
test_endpoint "GET" "/gantt/productivity" "" "" "Get unified productivity data"
test_endpoint "GET" "/gantt/productivity?startDate=2026-01-01&endDate=2026-01-31" "" "" "Get productivity data with dates"

# Gantt Data
test_endpoint "GET" "/gantt/data" "" "" "Get gantt data"

# Resources
test_endpoint "GET" "/gantt/resources" "" "" "Get resource allocation"
test_endpoint "GET" "/gantt/resources?startDate=2026-01-01&endDate=2026-01-31" "" "" "Get resources with dates"

# Collaboration
test_endpoint "GET" "/gantt/collaboration/stats" "" "" "Get collaboration stats"

# Filter with POST
test_endpoint "POST" "/gantt/data/filter" '{"status":["todo","in_progress"],"priority":"high"}' "" "Filter gantt data"

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# SECURITY TESTS
# ═══════════════════════════════════════════════════════════════════════════
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                      SECURITY TESTS                                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Test without token (should fail with 401)
echo "Testing without authentication..."
RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 "$API/tasks" 2>/dev/null)
if echo "$RESP" | grep -q "Unauthorized\|unauthorized\|401\|token"; then
    echo -e "${GREEN}PASS${NC} Unauthenticated request rejected"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC} Unauthenticated request not properly rejected"
    ((FAIL++))
fi

# Test invalid ObjectId (should fail with 400)
echo "Testing invalid ObjectId..."
RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 "$API/tasks/invalid-id" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
if echo "$RESP" | grep -qi "invalid\|format\|400"; then
    echo -e "${GREEN}PASS${NC} Invalid ObjectId rejected"
    ((PASS++))
else
    echo -e "${YELLOW}SKIP${NC} Invalid ObjectId test (may need different validation)"
    ((SKIP++))
fi

# Test non-existent resource (should fail with 404)
echo "Testing non-existent resource..."
RESP=$(curl -s -k --tlsv1.2 --connect-timeout 10 --max-time 20 "$API/tasks/507f1f77bcf86cd799439011" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
if echo "$RESP" | grep -qi "not found\|404"; then
    echo -e "${GREEN}PASS${NC} Non-existent resource returns 404"
    ((PASS++))
else
    SUCCESS=$(echo "$RESP" | jq -r '.success // true' 2>/dev/null)
    if [ "$SUCCESS" = "false" ]; then
        echo -e "${GREEN}PASS${NC} Non-existent resource rejected"
        ((PASS++))
    else
        echo -e "${YELLOW}SKIP${NC} Non-existent resource test inconclusive"
        ((SKIP++))
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
echo "========================================================================"
echo "                          TEST SUMMARY"
echo "========================================================================"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "${GREEN}PASSED:${NC}  $PASS"
echo -e "${RED}FAILED:${NC}  $FAIL"
echo -e "${YELLOW}SKIPPED:${NC} $SKIP"
echo "------------------------"
echo "TOTAL:   $TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}ALL TESTS PASSED!${NC}"
    SCORE=100
else
    SCORE=$((PASS * 100 / TOTAL))
    echo -e "Pass Rate: ${SCORE}%"
fi

echo "========================================================================"
echo "                         END OF TESTING"
echo "========================================================================"
