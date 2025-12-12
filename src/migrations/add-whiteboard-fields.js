/**
 * Migration: Add Whiteboard/Brainstorm Fields to CaseNotion Models
 *
 * This migration:
 * 1. Adds default canvas position values to existing CaseNotionBlock records
 * 2. Adds default visual styling values to existing CaseNotionBlock records
 * 3. Adds default viewMode to existing CaseNotionPage records
 * 4. Adds default whiteboardConfig to existing CaseNotionPage records
 *
 * Run with: node src/migrations/add-whiteboard-fields.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const migrateWhiteboardFields = async () => {
    console.log('Starting Whiteboard/Brainstorm fields migration...\n');

    const CaseNotionBlock = require('../models/caseNotionBlock.model');
    const CaseNotionPage = require('../models/caseNotionPage.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Add default canvas position values to blocks (spread them out)
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Adding default canvas position values to blocks...');

    // Get all blocks without canvas position, grouped by page
    const blocksWithoutPosition = await CaseNotionBlock.find({
        canvasX: { $exists: false }
    }).sort({ pageId: 1, order: 1 });

    console.log(`   Found ${blocksWithoutPosition.length} blocks without canvas position`);

    // Group by pageId and assign spread-out positions
    const blocksByPage = {};
    blocksWithoutPosition.forEach(block => {
        const pageId = block.pageId.toString();
        if (!blocksByPage[pageId]) blocksByPage[pageId] = [];
        blocksByPage[pageId].push(block);
    });

    let blockPositionUpdates = 0;
    const GRID_COLS = 4;  // 4 blocks per row
    const BLOCK_WIDTH = 250;
    const BLOCK_HEIGHT = 200;
    const GAP_X = 50;
    const GAP_Y = 50;
    const START_X = 100;
    const START_Y = 100;

    for (const pageId of Object.keys(blocksByPage)) {
        const pageBlocks = blocksByPage[pageId];
        for (let i = 0; i < pageBlocks.length; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const canvasX = START_X + col * (BLOCK_WIDTH + GAP_X);
            const canvasY = START_Y + row * (BLOCK_HEIGHT + GAP_Y);

            await CaseNotionBlock.updateOne(
                { _id: pageBlocks[i]._id },
                {
                    $set: {
                        canvasX,
                        canvasY,
                        canvasWidth: 200,
                        canvasHeight: 150
                    }
                }
            );
            blockPositionUpdates++;
        }
    }
    console.log(`   Updated ${blockPositionUpdates} blocks with spread-out canvas positions`);
    totalUpdated += blockPositionUpdates;

    // ═══════════════════════════════════════════════════════════════
    // 2. Add default visual styling values to blocks
    // ═══════════════════════════════════════════════════════════════
    console.log('2. Adding default visual styling values to blocks...');
    const blockStylingResult = await CaseNotionBlock.updateMany(
        { blockColor: { $exists: false } },
        {
            $set: {
                blockColor: 'default',
                priority: null
            }
        }
    );
    console.log(`   Updated ${blockStylingResult.modifiedCount} blocks with visual styling values`);
    totalUpdated += blockStylingResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 3. Add default entity linking values to blocks
    // ═══════════════════════════════════════════════════════════════
    console.log('3. Adding default entity linking values to blocks...');
    const blockLinkingResult = await CaseNotionBlock.updateMany(
        { linkedEventId: { $exists: false } },
        {
            $set: {
                linkedEventId: null,
                linkedTaskId: null,
                linkedHearingId: null,
                linkedDocumentId: null
            }
        }
    );
    console.log(`   Updated ${blockLinkingResult.modifiedCount} blocks with entity linking values`);
    totalUpdated += blockLinkingResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 4. Add default grouping values to blocks
    // ═══════════════════════════════════════════════════════════════
    console.log('4. Adding default grouping values to blocks...');
    const blockGroupingResult = await CaseNotionBlock.updateMany(
        { groupId: { $exists: false } },
        {
            $set: {
                groupId: null,
                groupName: null
            }
        }
    );
    console.log(`   Updated ${blockGroupingResult.modifiedCount} blocks with grouping values`);
    totalUpdated += blockGroupingResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 5. Add default viewMode to pages
    // ═══════════════════════════════════════════════════════════════
    console.log('5. Adding default viewMode to pages...');
    const pageViewModeResult = await CaseNotionPage.updateMany(
        { viewMode: { $exists: false } },
        { $set: { viewMode: 'document' } }
    );
    console.log(`   Updated ${pageViewModeResult.modifiedCount} pages with viewMode`);
    totalUpdated += pageViewModeResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 6. Add default whiteboardConfig to pages
    // ═══════════════════════════════════════════════════════════════
    console.log('6. Adding default whiteboardConfig to pages...');
    const pageWhiteboardConfigResult = await CaseNotionPage.updateMany(
        { whiteboardConfig: { $exists: false } },
        {
            $set: {
                whiteboardConfig: {
                    canvasWidth: 5000,
                    canvasHeight: 5000,
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                    gridEnabled: true,
                    snapToGrid: true,
                    gridSize: 20
                }
            }
        }
    );
    console.log(`   Updated ${pageWhiteboardConfigResult.modifiedCount} pages with whiteboardConfig`);
    totalUpdated += pageWhiteboardConfigResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Migration completed successfully!`);
    console.log(`Total documents updated: ${totalUpdated}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
};

// Run migration
const run = async () => {
    try {
        await connectDB();
        await migrateWhiteboardFields();
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
