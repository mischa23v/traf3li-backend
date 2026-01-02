#!/usr/bin/env node
/**
 * Verify Task API Contract
 *
 * Run: node scripts/verify-task-contract.js
 *
 * Compares the current ALLOWED_FIELDS and validation constants
 * against the expected contract to ensure refactoring didn't break anything.
 */

const fs = require('fs');
const path = require('path');

// Read the controller file
const controllerPath = path.join(__dirname, '../src/controllers/task.controller.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Expected values from contract
const EXPECTED = {
    VALID_PRIORITIES: ['low', 'medium', 'high', 'urgent'],
    VALID_STATUSES: ['todo', 'pending', 'in_progress', 'done', 'canceled'],
    ALLOWED_FIELDS: {
        CREATE: [
            'title', 'description', 'priority', 'status', 'label', 'tags',
            'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
            'parentTaskId', 'subtasks', 'checklists', 'timeTracking', 'recurring',
            'reminders', 'notes', 'points'
        ],
        UPDATE: [
            'title', 'description', 'status', 'priority', 'label', 'tags',
            'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
            'subtasks', 'checklists', 'timeTracking', 'recurring', 'reminders',
            'notes', 'points', 'progress'
        ],
        COMPLETE: ['completionNote'],
        SUBTASK: ['title', 'autoReset'],
        SUBTASK_UPDATE: ['title', 'completed'],
        TIMER_START: ['notes'],
        TIMER_STOP: ['notes', 'isBillable'],
        MANUAL_TIME: ['minutes', 'notes', 'date', 'isBillable'],
        COMMENT_CREATE: ['content', 'text', 'mentions'],
        COMMENT_UPDATE: ['content', 'text'],
        BULK_UPDATE: ['taskIds', 'updates'],
        BULK_DELETE: ['taskIds'],
        BULK_UPDATE_FIELDS: ['status', 'priority', 'assignedTo', 'dueDate', 'label', 'tags'],
        TEMPLATE_CREATE: [
            'title', 'templateName', 'description', 'priority', 'label', 'tags',
            'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
        ],
        TEMPLATE_UPDATE: [
            'title', 'templateName', 'description', 'priority', 'label', 'tags',
            'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
        ],
        TEMPLATE_CREATE_TASK: ['title', 'dueDate', 'dueTime', 'assignedTo', 'caseId', 'clientId', 'notes'],
        SAVE_AS_TEMPLATE: ['templateName', 'isPublic'],
        DEPENDENCY: ['dependsOn', 'type'],
        STATUS_UPDATE: ['status'],
        PROGRESS: ['progress', 'autoCalculate']
    }
};

console.log('🔍 Verifying Task API Contract...\n');

let passed = 0;
let failed = 0;

// Check VALID_PRIORITIES
const prioritiesMatch = controllerContent.includes("const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']");
if (prioritiesMatch) {
    console.log('✅ VALID_PRIORITIES matches contract');
    passed++;
} else {
    console.log('❌ VALID_PRIORITIES does NOT match contract');
    failed++;
}

// Check VALID_STATUSES
const statusesMatch = controllerContent.includes("const VALID_STATUSES = ['todo', 'pending', 'in_progress', 'done', 'canceled']");
if (statusesMatch) {
    console.log('✅ VALID_STATUSES matches contract');
    passed++;
} else {
    console.log('❌ VALID_STATUSES does NOT match contract');
    failed++;
}

// Check each ALLOWED_FIELDS key exists
console.log('\n📋 Checking ALLOWED_FIELDS keys...');
for (const key of Object.keys(EXPECTED.ALLOWED_FIELDS)) {
    const regex = new RegExp(`${key}:\\s*\\[`);
    if (regex.test(controllerContent)) {
        console.log(`  ✅ ALLOWED_FIELDS.${key} exists`);
        passed++;
    } else {
        console.log(`  ❌ ALLOWED_FIELDS.${key} MISSING`);
        failed++;
    }
}

// Check no inline allowedFields arrays remain
console.log('\n🔎 Checking for inline arrays (should be 0)...');
const inlineArrays = (controllerContent.match(/const allowedFields = \[/g) || []).length;
if (inlineArrays === 0) {
    console.log('  ✅ No inline allowedFields arrays found');
    passed++;
} else {
    console.log(`  ❌ Found ${inlineArrays} inline allowedFields arrays`);
    failed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 All contract checks passed!');
    process.exit(0);
} else {
    console.log('⚠️  Some checks failed. Review the contract.');
    process.exit(1);
}
