/**
 * Location-Based Reminders Service - Usage Examples
 *
 * This file demonstrates how to use the Location-Based Reminders service
 * in various scenarios common to law firm operations.
 */

const locationRemindersService = require('./locationReminders.service');

// Example user and firm IDs (replace with actual IDs in production)
const EXAMPLE_USER_ID = '507f1f77bcf86cd799439011';
const EXAMPLE_FIRM_ID = '507f1f77bcf86cd799439012';

/**
 * Example 1: Court Hearing Reminder
 * Remind lawyer to check in when arriving at courthouse
 */
async function example1_CourtHearingReminder() {
  console.log('\n=== Example 1: Court Hearing Reminder ===');

  try {
    const result = await locationRemindersService.createLocationReminder(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      {
        title: 'Smith v. Jones Hearing',
        description: 'Family court hearing - Room 205. Check in at registry.',
        priority: 'high',
        type: 'hearing',
        relatedCase: '507f1f77bcf86cd799439013',
        tags: ['court', 'family-law']
      },
      {
        type: 'arrive',
        location: {
          name: 'Riyadh Family Court',
          address: 'King Fahd Road, Al Olaya District, Riyadh',
          latitude: 24.7136,
          longitude: 46.6753
        },
        radius: 150, // 150 meters
        repeatTrigger: false
      }
    );

    console.log('Reminder created:', result.data.reminderId);
    console.log('Trigger type:', result.data.locationTrigger.type);
    console.log('Location:', result.data.locationTrigger.location.name);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 2: Client Meeting Follow-up
 * Remind to send meeting summary when leaving client office
 */
async function example2_ClientMeetingFollowup() {
  console.log('\n=== Example 2: Client Meeting Follow-up ===');

  try {
    const result = await locationRemindersService.createLocationReminder(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      {
        title: 'Send meeting summary to Acme Corp',
        description: 'Email meeting notes and next steps within 24 hours',
        priority: 'medium',
        type: 'follow_up',
        clientId: '507f1f77bcf86cd799439014',
        tags: ['client-meeting', 'follow-up']
      },
      {
        type: 'leave',
        location: {
          name: 'Acme Corp Headquarters',
          address: 'Tower 3, King Abdullah Financial District, Riyadh',
          latitude: 24.7695,
          longitude: 46.6389
        },
        radius: 100,
        repeatTrigger: true, // Allow multiple triggers
        cooldownMinutes: 180 // Don't re-trigger for 3 hours
      }
    );

    console.log('Reminder created:', result.data.reminderId);
    console.log('Will trigger when leaving location');
    console.log('Repeat enabled with 180 min cooldown');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 3: Save Frequently Used Locations
 * Save common locations for reuse in reminders
 */
async function example3_SaveFrequentLocations() {
  console.log('\n=== Example 3: Save Frequent Locations ===');

  try {
    // Save main office
    const office = await locationRemindersService.saveUserLocation(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      {
        name: 'Law Firm Main Office',
        address: 'Tower 5, Business District, Riyadh',
        lat: 24.7136,
        lng: 46.6753,
        type: 'office',
        radius: 100,
        isDefault: true
      }
    );
    console.log('Saved office location:', office.data.name);

    // Save courthouse
    const courthouse = await locationRemindersService.saveUserLocation(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      {
        name: 'Riyadh General Court',
        address: 'Justice District, Riyadh',
        lat: 24.7200,
        lng: 46.6800,
        type: 'court',
        radius: 150
      }
    );
    console.log('Saved court location:', courthouse.data.name);

    // Get all saved locations
    const locations = await locationRemindersService.getUserLocations(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID
    );
    console.log(`Total saved locations: ${locations.data.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 4: Check User Location
 * Check current location against pending reminders
 */
async function example4_CheckUserLocation() {
  console.log('\n=== Example 4: Check User Location ===');

  try {
    // Simulate user's current location (near courthouse)
    const currentLocation = {
      latitude: 24.7140,  // Close to courthouse
      longitude: 46.6750,
      accuracy: 15 // Good GPS accuracy
    };

    const result = await locationRemindersService.checkLocationTriggers(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      currentLocation
    );

    console.log(`Checked ${result.data.total} location reminders`);
    console.log(`Triggered ${result.data.triggered} reminders`);

    if (result.data.triggered > 0) {
      console.log('\nTriggered Reminders:');
      result.data.reminders.forEach((reminder, index) => {
        console.log(`${index + 1}. ${reminder.title}`);
        console.log(`   Location: ${reminder.locationName}`);
        console.log(`   Distance: ${reminder.distance}m`);
        console.log(`   Type: ${reminder.triggerType}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 5: Get Nearby Reminders
 * Find all reminders within a certain radius
 */
async function example5_GetNearbyReminders() {
  console.log('\n=== Example 5: Get Nearby Reminders ===');

  try {
    const searchLocation = {
      latitude: 24.7136,
      longitude: 46.6753
    };

    const result = await locationRemindersService.getNearbyReminders(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      searchLocation,
      1000 // Search within 1km radius
    );

    console.log(`Found ${result.data.count} reminders within 1km`);

    if (result.data.count > 0) {
      console.log('\nNearby Reminders:');
      result.data.reminders.forEach((item, index) => {
        console.log(`${index + 1}. ${item.reminder.title}`);
        console.log(`   Distance: ${item.distance}m`);
        console.log(`   Within trigger radius: ${item.isWithinTriggerRadius}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 6: Document Pickup Reminder
 * Remind to pick up signed documents at notary office
 */
async function example6_DocumentPickupReminder() {
  console.log('\n=== Example 6: Document Pickup Reminder ===');

  try {
    // First, save the notary office location
    const notaryLocation = await locationRemindersService.saveUserLocation(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      {
        name: 'Al-Riyadh Notary Office',
        address: 'King Abdul Aziz Street, Riyadh',
        lat: 24.6877,
        lng: 46.7219,
        type: 'custom',
        radius: 100
      }
    );

    // Create reminder using saved location
    const result = await locationRemindersService.createLocationReminder(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID,
      {
        title: 'Pick up notarized contracts',
        description: 'Collect signed contracts for Project Phoenix',
        priority: 'high',
        type: 'task_due',
        tags: ['documents', 'contracts']
      },
      {
        type: 'arrive',
        location: {
          name: notaryLocation.data.name,
          latitude: notaryLocation.data.coordinates.latitude,
          longitude: notaryLocation.data.coordinates.longitude,
          savedLocationId: notaryLocation.data._id
        },
        radius: 100
      }
    );

    console.log('Reminder created:', result.data.reminderId);
    console.log('Linked to saved location:', notaryLocation.data.name);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 7: Get Summary Statistics
 * View statistics about location-based reminders
 */
async function example7_GetSummaryStats() {
  console.log('\n=== Example 7: Summary Statistics ===');

  try {
    const summary = await locationRemindersService.getLocationRemindersSummary(
      EXAMPLE_USER_ID,
      EXAMPLE_FIRM_ID
    );

    console.log('Location Reminders Summary:');
    console.log(`Total location reminders: ${summary.data.totalLocationReminders}`);
    console.log(`Total saved locations: ${summary.data.totalSavedLocations}`);
    console.log('\nBy Trigger Type:');
    console.log(`Arrive: ${summary.data.types.arrive.total} (${summary.data.types.arrive.pending} pending)`);
    console.log(`Leave: ${summary.data.types.leave.total} (${summary.data.types.leave.pending} pending)`);
    console.log(`Nearby: ${summary.data.types.nearby.total} (${summary.data.types.nearby.pending} pending)`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 8: Calculate Distance Between Points
 * Utility function to calculate distances
 */
async function example8_CalculateDistance() {
  console.log('\n=== Example 8: Calculate Distance ===');

  try {
    // Distance from main office to courthouse
    const distance = locationRemindersService.calculateDistance(
      24.7136, 46.6753,  // Main office
      24.7200, 46.6800   // Courthouse
    );

    console.log('Distance from Main Office to Courthouse:');
    console.log(`${Math.round(distance)} meters`);
    console.log(`${(distance / 1000).toFixed(2)} kilometers`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 9: Batch Check Multiple Users
 * Background job to check locations for multiple users
 */
async function example9_BatchCheckUsers() {
  console.log('\n=== Example 9: Batch Check Users ===');

  try {
    const userLocationPairs = [
      {
        userId: '507f1f77bcf86cd799439011',
        firmId: '507f1f77bcf86cd799439012',
        location: { latitude: 24.7140, longitude: 46.6750, accuracy: 20 }
      },
      {
        userId: '507f1f77bcf86cd799439015',
        firmId: '507f1f77bcf86cd799439012',
        location: { latitude: 24.7695, longitude: 46.6389, accuracy: 15 }
      }
    ];

    const result = await locationRemindersService.batchCheckLocationTriggers(
      userLocationPairs
    );

    console.log(`Processed ${result.data.total} users`);
    console.log(`Successful: ${result.data.successful}`);
    console.log(`Failed: ${result.data.failed}`);

    // Show results per user
    result.data.results.forEach((userResult, index) => {
      if (userResult.success) {
        console.log(`User ${index + 1}: ${userResult.data.triggered} reminders triggered`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Example 10: Reset Triggered Reminder
 * Reset a reminder for testing or re-triggering
 */
async function example10_ResetTrigger() {
  console.log('\n=== Example 10: Reset Triggered Reminder ===');

  try {
    const reminderId = '507f1f77bcf86cd799439020';

    const result = await locationRemindersService.resetLocationTrigger(
      EXAMPLE_USER_ID,
      reminderId
    );

    console.log('Reminder reset successfully');
    console.log('Reminder ID:', result.data.reminderId);
    console.log('Triggered:', result.data.locationTrigger.triggered);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Main execution
async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Location-Based Reminders Service - Usage Examples');
  console.log('='.repeat(60));

  try {
    await example1_CourtHearingReminder();
    await example2_ClientMeetingFollowup();
    await example3_SaveFrequentLocations();
    await example4_CheckUserLocation();
    await example5_GetNearbyReminders();
    await example6_DocumentPickupReminder();
    await example7_GetSummaryStats();
    await example8_CalculateDistance();
    await example9_BatchCheckUsers();
    await example10_ResetTrigger();

    console.log('\n=== All Examples Completed ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export examples for individual use
module.exports = {
  example1_CourtHearingReminder,
  example2_ClientMeetingFollowup,
  example3_SaveFrequentLocations,
  example4_CheckUserLocation,
  example5_GetNearbyReminders,
  example6_DocumentPickupReminder,
  example7_GetSummaryStats,
  example8_CalculateDistance,
  example9_BatchCheckUsers,
  example10_ResetTrigger,
  runAllExamples
};

// Run all examples if executed directly
if (require.main === module) {
  runAllExamples();
}
