#!/usr/bin/env node
/**
 * Migration: Fix Solo Lawyer Tasks Missing lawyerId
 *
 * This script fixes tasks that were created by solo lawyers with firmId: null
 * but missing the lawyerId field. These tasks are invisible to their creators
 * because queries use lawyerId for solo lawyers.
 *
 * Usage:
 *   node src/scripts/fixSoloLawyerTasks.js
 *   node src/scripts/fixSoloLawyerTasks.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');

const isDryRun = process.argv.includes('--dry-run');

async function fixSoloLawyerTasks() {
    console.log('='.repeat(60));
    console.log('Fix Solo Lawyer Tasks - Missing lawyerId');
    console.log('='.repeat(60));
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
    console.log('');

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Find all solo lawyers (users without firmId)
        const soloLawyers = await User.find({
            $or: [
                { firmId: null },
                { firmId: { $exists: false } }
            ],
            isSoloLawyer: true
        }).select('_id firstName lastName email');

        console.log(`\nFound ${soloLawyers.length} solo lawyers:`);
        soloLawyers.forEach(u => {
            console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u._id}`);
        });

        let totalFixed = 0;
        let totalAlreadyFixed = 0;

        for (const lawyer of soloLawyers) {
            // Find tasks created by this solo lawyer that are missing lawyerId
            const brokenTasks = await Task.find({
                createdBy: lawyer._id,
                firmId: null,
                $or: [
                    { lawyerId: null },
                    { lawyerId: { $exists: false } }
                ]
            }).select('_id title status createdAt');

            if (brokenTasks.length > 0) {
                console.log(`\n${lawyer.firstName} ${lawyer.lastName}: ${brokenTasks.length} tasks need fixing`);

                brokenTasks.forEach(t => {
                    console.log(`    - [${t.status}] "${t.title}" (${t._id})`);
                });

                if (!isDryRun) {
                    const result = await Task.updateMany(
                        {
                            createdBy: lawyer._id,
                            firmId: null,
                            $or: [
                                { lawyerId: null },
                                { lawyerId: { $exists: false } }
                            ]
                        },
                        {
                            $set: { lawyerId: lawyer._id }
                        }
                    );
                    console.log(`    ✓ Fixed ${result.modifiedCount} tasks`);
                    totalFixed += result.modifiedCount;
                } else {
                    console.log(`    [DRY RUN] Would fix ${brokenTasks.length} tasks`);
                    totalFixed += brokenTasks.length;
                }
            } else {
                // Check if tasks already have lawyerId
                const goodTasks = await Task.countDocuments({
                    createdBy: lawyer._id,
                    lawyerId: lawyer._id
                });

                if (goodTasks > 0) {
                    console.log(`\n${lawyer.firstName} ${lawyer.lastName}: ${goodTasks} tasks already have correct lawyerId ✓`);
                    totalAlreadyFixed += goodTasks;
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Summary:');
        console.log(`  - Tasks ${isDryRun ? 'would be' : ''} fixed: ${totalFixed}`);
        console.log(`  - Tasks already correct: ${totalAlreadyFixed}`);
        console.log('='.repeat(60));

        if (isDryRun && totalFixed > 0) {
            console.log('\nTo apply these changes, run without --dry-run:');
            console.log('  node src/scripts/fixSoloLawyerTasks.js');
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

fixSoloLawyerTasks();
