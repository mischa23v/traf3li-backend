#!/usr/bin/env node
/**
 * Script to fix controller isolation issues
 *
 * This replaces patterns like:
 *   firmId ? { firmId } : { userId }
 * With:
 *   req.firmQuery
 */

const fs = require('fs');
const path = require('path');

const CONTROLLERS_DIR = path.join(__dirname, '../src/controllers');

// Patterns to fix and their replacements
const patterns = [
    // Pattern 1: const filters = firmId ? { firmId } : { userId }
    {
        pattern: /const\s+(filters|query|baseQuery|matchQuery)\s*=\s*firmId\s*\?\s*\{\s*firmId\s*\}\s*:\s*\{\s*userId\s*\}/g,
        replacement: 'const $1 = { ...req.firmQuery }'
    },
    // Pattern 2: firmId ? { _id: id, firmId } : { _id: id, userId }
    {
        pattern: /firmId\s*\?\s*\{\s*_id:\s*(\w+),\s*firmId\s*\}\s*:\s*\{\s*_id:\s*\1,\s*userId\s*\}/g,
        replacement: '{ _id: $1, ...req.firmQuery }'
    },
    // Pattern 3: firmId ? { firmId, ... } : { userId, ... } with status
    {
        pattern: /firmId\s*\?\s*\{\s*firmId,\s*status:\s*'(\w+)'\s*\}\s*:\s*\{\s*userId,\s*status:\s*'\1'\s*\}/g,
        replacement: "{ ...req.firmQuery, status: '$1' }"
    },
    // Pattern 4: ...(firmId ? { firmId } : { userId })
    {
        pattern: /\.\.\.\(firmId\s*\?\s*\{\s*firmId\s*\}\s*:\s*\{\s*userId\s*\}\)/g,
        replacement: '...req.firmQuery'
    },
    // Pattern 5: firmId ? { investmentId, firmId } : { investmentId, userId }
    {
        pattern: /firmId\s*\?\s*\{\s*investmentId:\s*(\w+),\s*firmId\s*\}\s*:\s*\{\s*investmentId:\s*\1,\s*userId\s*\}/g,
        replacement: '{ investmentId: $1, ...req.firmQuery }'
    },
];

let totalFixed = 0;

const files = fs.readdirSync(CONTROLLERS_DIR).filter(f => f.endsWith('.controller.js'));

for (const file of files) {
    const filePath = path.join(CONTROLLERS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixedInFile = 0;

    for (const { pattern, replacement } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
            fixedInFile += matches.length;
            content = content.replace(pattern, replacement);
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed ${fixedInFile} patterns in ${file}`);
        totalFixed += fixedInFile;
    }
}

console.log(`\nTotal patterns fixed: ${totalFixed}`);
