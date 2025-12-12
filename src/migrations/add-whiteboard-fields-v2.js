/**
 * Migration: Add Enhanced Whiteboard Fields v2
 *
 * This migration adds all the new whiteboard fields based on
 * Excalidraw, tldraw, and ReactFlow patterns.
 *
 * Run with: node src/migrations/add-whiteboard-fields-v2.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

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

const migrateWhiteboardFieldsV2 = async () => {
    console.log('Starting Enhanced Whiteboard Fields Migration v2...\n');

    const CaseNotionBlock = require('../models/caseNotionBlock.model');
    const CaseNotionPage = require('../models/caseNotionPage.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Add shapeType to all blocks (default to 'note' for document blocks)
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Adding shapeType field to blocks...');
    const shapeTypeResult = await CaseNotionBlock.updateMany(
        { shapeType: { $exists: false } },
        { $set: { shapeType: 'note' } }
    );
    console.log(`   Updated ${shapeTypeResult.modifiedCount} blocks with shapeType`);
    totalUpdated += shapeTypeResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Add zIndex based on order (fractional indexing)
    // ═══════════════════════════════════════════════════════════════
    console.log('2. Adding zIndex field to blocks...');
    const blocksWithoutZIndex = await CaseNotionBlock.find({
        zIndex: { $exists: false }
    }).sort({ pageId: 1, order: 1 });

    const blocksByPage = {};
    blocksWithoutZIndex.forEach(block => {
        const pageId = block.pageId.toString();
        if (!blocksByPage[pageId]) blocksByPage[pageId] = [];
        blocksByPage[pageId].push(block);
    });

    let zIndexUpdates = 0;
    for (const pageId of Object.keys(blocksByPage)) {
        const pageBlocks = blocksByPage[pageId];
        for (let i = 0; i < pageBlocks.length; i++) {
            // Generate fractional zIndex: a0, a1, a2... a9, b0, b1...
            const major = String.fromCharCode(97 + Math.floor(i / 10)); // a, b, c...
            const minor = i % 10;
            const zIndex = `${major}${minor}`;

            await CaseNotionBlock.updateOne(
                { _id: pageBlocks[i]._id },
                { $set: { zIndex } }
            );
            zIndexUpdates++;
        }
    }
    console.log(`   Updated ${zIndexUpdates} blocks with zIndex`);
    totalUpdated += zIndexUpdates;

    // ═══════════════════════════════════════════════════════════════
    // 3. Add default handles to all blocks
    // ═══════════════════════════════════════════════════════════════
    console.log('3. Adding default handles to blocks...');
    const defaultHandles = [
        { id: 'top', position: 'top', type: 'both', offsetX: 0, offsetY: 0 },
        { id: 'right', position: 'right', type: 'both', offsetX: 0, offsetY: 0 },
        { id: 'bottom', position: 'bottom', type: 'both', offsetX: 0, offsetY: 0 },
        { id: 'left', position: 'left', type: 'both', offsetX: 0, offsetY: 0 }
    ];
    const handlesResult = await CaseNotionBlock.updateMany(
        { handles: { $exists: false } },
        { $set: { handles: defaultHandles } }
    );
    console.log(`   Updated ${handlesResult.modifiedCount} blocks with handles`);
    totalUpdated += handlesResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 4. Add rotation and opacity fields
    // ═══════════════════════════════════════════════════════════════
    console.log('4. Adding angle and opacity fields...');
    const rotationResult = await CaseNotionBlock.updateMany(
        { angle: { $exists: false } },
        { $set: { angle: 0, opacity: 100 } }
    );
    console.log(`   Updated ${rotationResult.modifiedCount} blocks with angle/opacity`);
    totalUpdated += rotationResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 5. Add stroke/fill styling fields
    // ═══════════════════════════════════════════════════════════════
    console.log('5. Adding stroke/fill styling fields...');
    const stylingResult = await CaseNotionBlock.updateMany(
        { strokeColor: { $exists: false } },
        {
            $set: {
                strokeColor: '#000000',
                strokeWidth: 2,
                fillStyle: 'solid',
                roughness: 0
            }
        }
    );
    console.log(`   Updated ${stylingResult.modifiedCount} blocks with styling`);
    totalUpdated += stylingResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 6. Add version control fields
    // ═══════════════════════════════════════════════════════════════
    console.log('6. Adding version control fields...');
    const versionResult = await CaseNotionBlock.updateMany(
        { version: { $exists: false } },
        {
            $set: {
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false
            }
        }
    );
    console.log(`   Updated ${versionResult.modifiedCount} blocks with version fields`);
    totalUpdated += versionResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 7. Add boundElements array
    // ═══════════════════════════════════════════════════════════════
    console.log('7. Adding boundElements array...');
    const boundResult = await CaseNotionBlock.updateMany(
        { boundElements: { $exists: false } },
        { $set: { boundElements: [] } }
    );
    console.log(`   Updated ${boundResult.modifiedCount} blocks with boundElements`);
    totalUpdated += boundResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 8. Spread out blocks that are at origin (0,0)
    // ═══════════════════════════════════════════════════════════════
    console.log('8. Repositioning blocks at origin...');
    const blocksAtOrigin = await CaseNotionBlock.find({
        canvasX: 0,
        canvasY: 0
    }).sort({ pageId: 1, order: 1 });

    const originBlocksByPage = {};
    blocksAtOrigin.forEach(block => {
        const pageId = block.pageId.toString();
        if (!originBlocksByPage[pageId]) originBlocksByPage[pageId] = [];
        originBlocksByPage[pageId].push(block);
    });

    let repositionCount = 0;
    const GRID_COLS = 4;
    const BLOCK_WIDTH = 250;
    const BLOCK_HEIGHT = 200;
    const GAP_X = 50;
    const GAP_Y = 50;
    const START_X = 100;
    const START_Y = 100;

    for (const pageId of Object.keys(originBlocksByPage)) {
        const pageBlocks = originBlocksByPage[pageId];
        if (pageBlocks.length <= 1) continue; // Skip if only one block at origin

        for (let i = 0; i < pageBlocks.length; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);

            await CaseNotionBlock.updateOne(
                { _id: pageBlocks[i]._id },
                {
                    $set: {
                        canvasX: START_X + col * (BLOCK_WIDTH + GAP_X),
                        canvasY: START_Y + row * (BLOCK_HEIGHT + GAP_Y)
                    }
                }
            );
            repositionCount++;
        }
    }
    console.log(`   Repositioned ${repositionCount} blocks from origin`);
    totalUpdated += repositionCount;

    // ═══════════════════════════════════════════════════════════════
    // 9. Update page whiteboardConfig with enhanced defaults
    // ═══════════════════════════════════════════════════════════════
    console.log('9. Updating page whiteboardConfig...');
    const pageConfigResult = await CaseNotionPage.updateMany(
        {},
        {
            $set: {
                'whiteboardConfig.minZoom': 0.1,
                'whiteboardConfig.maxZoom': 4,
                'whiteboardConfig.snapToObjects': true,
                'whiteboardConfig.snapDistance': 5,
                'whiteboardConfig.backgroundColor': '#ffffff',
                'whiteboardConfig.backgroundPattern': 'dots',
                'whiteboardConfig.defaultStrokeColor': '#000000',
                'whiteboardConfig.defaultFillColor': '#ffffff',
                'whiteboardConfig.defaultStrokeWidth': 2
            }
        }
    );
    console.log(`   Updated ${pageConfigResult.modifiedCount} pages with enhanced config`);
    totalUpdated += pageConfigResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Migration v2 completed successfully!`);
    console.log(`Total updates: ${totalUpdated}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
};

const run = async () => {
    try {
        await connectDB();
        await migrateWhiteboardFieldsV2();
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
