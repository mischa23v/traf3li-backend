/**
 * Unified Timeline Service - Usage Examples
 *
 * This file demonstrates how to use the UnifiedTimelineService
 * to retrieve a 360° customer timeline.
 */

const unifiedTimelineService = require('./unifiedTimeline.service');

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Get complete timeline for a client
// ═══════════════════════════════════════════════════════════════
async function getClientTimeline(clientId, firmId) {
  try {
    const timeline = await unifiedTimelineService.getTimeline('client', clientId, {
      limit: 50,
      firmId: firmId
    });

    console.log('Timeline Items:', timeline.items.length);
    console.log('Has More:', timeline.hasMore);
    console.log('Next Cursor:', timeline.nextCursor);

    // Process timeline items
    timeline.items.forEach(item => {
      console.log(`[${item.timestamp}] ${item.type}: ${item.title}`);
    });

    return timeline;
  } catch (error) {
    console.error('Error fetching timeline:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Get timeline with pagination
// ═══════════════════════════════════════════════════════════════
async function getTimelineWithPagination(clientId, firmId) {
  let allItems = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const result = await unifiedTimelineService.getTimeline('client', clientId, {
      limit: 20,
      cursor: cursor,
      firmId: firmId
    });

    allItems = allItems.concat(result.items);
    cursor = result.nextCursor;
    hasMore = result.hasMore;

    console.log(`Fetched ${result.items.length} items, total: ${allItems.length}`);
  }

  return allItems;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: Get timeline with date filters
// ═══════════════════════════════════════════════════════════════
async function getTimelineForDateRange(clientId, firmId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const timeline = await unifiedTimelineService.getTimeline('client', clientId, {
    dateFrom: thirtyDaysAgo,
    dateTo: new Date(),
    firmId: firmId,
    limit: 100
  });

  console.log(`Activities in last 30 days: ${timeline.items.length}`);
  return timeline;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: Get timeline filtered by activity types
// ═══════════════════════════════════════════════════════════════
async function getCommunicationTimeline(clientId, firmId) {
  const timeline = await unifiedTimelineService.getTimeline('client', clientId, {
    types: ['call', 'email', 'meeting', 'whatsapp'],
    firmId: firmId,
    limit: 50
  });

  console.log(`Communication activities: ${timeline.items.length}`);

  // Group by type
  const byType = timeline.items.reduce((acc, item) => {
    acc[item.subtype] = (acc[item.subtype] || 0) + 1;
    return acc;
  }, {});

  console.log('By type:', byType);
  return timeline;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: Get timeline summary/statistics
// ═══════════════════════════════════════════════════════════════
async function getClientTimelineSummary(clientId, firmId) {
  const summary = await unifiedTimelineService.getTimelineSummary('client', clientId, firmId);

  console.log('Timeline Summary:');
  console.log('  Total Activities:', summary.totalCount);
  console.log('  By Source:', summary.bySource);
  console.log('  By Type:', summary.byType);
  console.log('  Last Activity:', summary.lastActivityDate);
  console.log('  Activity Frequency (per day):', summary.activityFrequency);

  return summary;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 6: Get timeline for a contact (omnichannel inbox use case)
// ═══════════════════════════════════════════════════════════════
async function getContactTimeline(contactId, firmId) {
  const timeline = await unifiedTimelineService.getTimeline('contact', contactId, {
    firmId: firmId,
    limit: 100
  });

  // Filter for conversation items
  const conversations = timeline.items.filter(item => item.type === 'conversation');
  const crmActivities = timeline.items.filter(item => item.type === 'crm_activity');

  console.log(`Total: ${timeline.items.length}`);
  console.log(`Conversations: ${conversations.length}`);
  console.log(`CRM Activities: ${crmActivities.length}`);

  return timeline;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 7: Get recent activity for dashboard widget
// ═══════════════════════════════════════════════════════════════
async function getRecentActivityWidget(clientId, firmId) {
  const timeline = await unifiedTimelineService.getTimeline('client', clientId, {
    limit: 10,
    firmId: firmId
  });

  // Format for display
  const recentActivities = timeline.items.map(item => ({
    id: item.id,
    icon: item.icon,
    title: item.title,
    description: item.description,
    timestamp: item.timestamp,
    type: item.subtype
  }));

  return recentActivities;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 8: Get timeline for specific time period with summary
// ═══════════════════════════════════════════════════════════════
async function getQuarterlyActivityReport(clientId, firmId) {
  const quarterStart = new Date();
  quarterStart.setMonth(quarterStart.getMonth() - 3);

  // Get timeline
  const timeline = await unifiedTimelineService.getTimeline('client', clientId, {
    dateFrom: quarterStart,
    dateTo: new Date(),
    firmId: firmId,
    limit: 500
  });

  // Get summary
  const summary = await unifiedTimelineService.getTimelineSummary(
    'client',
    clientId,
    firmId,
    {
      dateFrom: quarterStart,
      dateTo: new Date()
    }
  );

  return {
    activities: timeline.items,
    summary: summary,
    period: {
      start: quarterStart,
      end: new Date()
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Export examples for testing
// ═══════════════════════════════════════════════════════════════
module.exports = {
  getClientTimeline,
  getTimelineWithPagination,
  getTimelineForDateRange,
  getCommunicationTimeline,
  getClientTimelineSummary,
  getContactTimeline,
  getRecentActivityWidget,
  getQuarterlyActivityReport
};
