/**
 * NLP Service Usage Examples
 *
 * These examples demonstrate how to use the NLP service for parsing
 * natural language into structured task/event data.
 *
 * IMPORTANT: Before running, install chrono-node:
 * npm install chrono-node
 */

const nlpService = require('./src/services/nlp.service');

// ============================================================================
// Example 1: Simple Task Parsing
// ============================================================================
async function example1_simpleTask() {
  console.log('\n=== Example 1: Simple Task ===');

  const result = await nlpService.parseNaturalLanguage("Call John tomorrow at 3pm");

  console.log('Input:', "Call John tomorrow at 3pm");
  console.log('Output:', JSON.stringify(result, null, 2));
}

// ============================================================================
// Example 2: High Priority Review
// ============================================================================
async function example2_highPriority() {
  console.log('\n=== Example 2: High Priority Review ===');

  const result = await nlpService.parseNaturalLanguage(
    "Review contract next Monday high priority"
  );

  console.log('Input:', "Review contract next Monday high priority");
  console.log('Title:', result.title);
  console.log('Type:', result.type);
  console.log('Priority:', result.priority);
  console.log('Date/Time:', result.dateTime);
}

// ============================================================================
// Example 3: Recurring Meeting
// ============================================================================
async function example3_recurringMeeting() {
  console.log('\n=== Example 3: Recurring Meeting ===');

  const result = await nlpService.parseNaturalLanguage(
    "Meeting with client every Tuesday at 2pm for 3 months"
  );

  console.log('Input:', "Meeting with client every Tuesday at 2pm for 3 months");
  console.log('Title:', result.title);
  console.log('Recurrence:', result.recurrence);
  console.log('Participants:', result.participants);
}

// ============================================================================
// Example 4: Legal Case Deadline
// ============================================================================
async function example4_legalDeadline() {
  console.log('\n=== Example 4: Legal Case Deadline ===');

  const result = await nlpService.parseNaturalLanguage(
    "Remind me to file motion in case #2024/123 in 2 weeks"
  );

  console.log('Input:', "Remind me to file motion in case #2024/123 in 2 weeks");
  console.log('Title:', result.title);
  console.log('Type:', result.type);
  console.log('Entities:', result.entities);

  // Also extract case-specific info
  const caseInfo = nlpService.extractCaseInfo(
    "File motion in case #2024/123 at General Court"
  );
  console.log('Case Info:', caseInfo);
}

// ============================================================================
// Example 5: Arabic Text
// ============================================================================
async function example5_arabicText() {
  console.log('\n=== Example 5: Arabic Text ===');

  const result = await nlpService.parseNaturalLanguage(
    "اجتماع عاجل مع العميل غداً الساعة 10 صباحاً"
  );

  console.log('Input:', "اجتماع عاجل مع العميل غداً الساعة 10 صباحاً");
  console.log('Language:', result.language);
  console.log('Title:', result.title);
  console.log('Priority:', result.priority, '(from عاجل)');
  console.log('Participants:', result.participants);
}

// ============================================================================
// Example 6: Using Individual Functions
// ============================================================================
function example6_individualFunctions() {
  console.log('\n=== Example 6: Individual Functions ===');

  // Test parseDateTime
  console.log('\n--- Date/Time Parsing ---');
  const dateResult = nlpService.parseDateTime("tomorrow at 3pm");
  console.log('parseDateTime("tomorrow at 3pm"):', dateResult);

  // Test extractPriority
  console.log('\n--- Priority Extraction ---');
  console.log('extractPriority("URGENT task"):', nlpService.extractPriority("URGENT task"));
  console.log('extractPriority("low priority"):', nlpService.extractPriority("low priority"));
  console.log('extractPriority("عاجل"):', nlpService.extractPriority("عاجل"));

  // Test parseRecurrence
  console.log('\n--- Recurrence Parsing ---');
  const recurrence1 = nlpService.parseRecurrence("every Tuesday at 2pm");
  console.log('parseRecurrence("every Tuesday at 2pm"):', recurrence1);

  const recurrence2 = nlpService.parseRecurrence("daily for 30 days");
  console.log('parseRecurrence("daily for 30 days"):', recurrence2);
}

// ============================================================================
// Example 7: Batch Processing
// ============================================================================
async function example7_batchProcessing() {
  console.log('\n=== Example 7: Batch Processing ===');

  const tasks = [
    "Call John tomorrow at 3pm",
    "Review contract next Monday",
    "Meeting with client every Tuesday",
    "File motion in 2 weeks"
  ];

  const results = await nlpService.batchParse(tasks);

  console.log('\nBatch Results:');
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`\n${index + 1}. "${tasks[index]}"`);
      console.log('   Title:', result.data.title);
      console.log('   Type:', result.data.type);
      console.log('   Priority:', result.data.priority);
    } else {
      console.log(`\n${index + 1}. ERROR:`, result.error);
    }
  });
}

// ============================================================================
// Example 8: Complex Legal Scenario
// ============================================================================
async function example8_complexLegalScenario() {
  console.log('\n=== Example 8: Complex Legal Scenario ===');

  const complexInput = `
    URGENT: Court hearing for case #2024/789 at Commercial Court
    next Wednesday at 10am. Review evidence with Ahmad before hearing.
  `;

  const result = await nlpService.parseNaturalLanguage(complexInput.trim());

  console.log('Input:', complexInput.trim());
  console.log('\nParsed Result:');
  console.log('Title:', result.title);
  console.log('Type:', result.type);
  console.log('Priority:', result.priority);
  console.log('Date/Time:', result.dateTime);
  console.log('Participants:', result.participants);
  console.log('Entities:', result.entities);

  // Extract case info
  const caseInfo = nlpService.extractCaseInfo(complexInput);
  console.log('\nCase Info:');
  console.log('Case Number:', caseInfo.caseNumber);
  console.log('Court:', caseInfo.courtName);
}

// ============================================================================
// Example 9: Error Handling
// ============================================================================
async function example9_errorHandling() {
  console.log('\n=== Example 9: Error Handling ===');

  try {
    // This should work fine
    const result = await nlpService.parseNaturalLanguage("Call John tomorrow");
    console.log('Success:', result.title);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // The service has fallback mechanisms, so it's very resilient
  // Even if Claude AI fails, rule-based classification will work
}

// ============================================================================
// Example 10: Auto-Completions
// ============================================================================
async function example10_autoCompletions() {
  console.log('\n=== Example 10: Auto-Completions ===');

  const partial = "Review con";
  const suggestions = await nlpService.suggestCompletions(partial);

  console.log(`Suggestions for "${partial}":`);
  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.text}`);
  });
}

// ============================================================================
// Run All Examples
// ============================================================================
async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          NLP Service Usage Examples                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await example1_simpleTask();
    await example2_highPriority();
    await example3_recurringMeeting();
    await example4_legalDeadline();
    await example5_arabicText();
    example6_individualFunctions();
    await example7_batchProcessing();
    await example8_complexLegalScenario();
    await example9_errorHandling();
    await example10_autoCompletions();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          All Examples Completed Successfully!              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    console.error('\nMake sure to:');
    console.error('1. Install chrono-node: npm install chrono-node');
    console.error('2. Set ANTHROPIC_API_KEY in your .env file');
    console.error('3. Run from the project root directory\n');
  }
}

// ============================================================================
// Run the examples
// ============================================================================
if (require.main === module) {
  runAllExamples();
}

// Export for use in other files
module.exports = {
  example1_simpleTask,
  example2_highPriority,
  example3_recurringMeeting,
  example4_legalDeadline,
  example5_arabicText,
  example6_individualFunctions,
  example7_batchProcessing,
  example8_complexLegalScenario,
  example9_errorHandling,
  example10_autoCompletions
};
