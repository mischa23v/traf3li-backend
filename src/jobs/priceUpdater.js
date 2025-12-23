/**
 * Price Updater Job
 *
 * Schedules automatic price updates for investments based on market hours:
 * - Tadawul: Sun-Thu 10:00-15:00 (Asia/Riyadh)
 * - US Markets: Mon-Fri 16:30-23:00 (Saudi time)
 * - Crypto & Forex: 24/7
 * - Commodities: Market hours
 *
 * Note: This uses a simple setInterval approach. For production,
 * consider using node-cron or a proper job scheduler.
 */

const { Investment } = require('../models');
const { priceService } = require('../services/priceService');
const { findSymbol } = require('../data/symbols');
const logger = require('../utils/logger');

// Update interval in milliseconds (15 minutes)
const UPDATE_INTERVAL = 15 * 60 * 1000;

// Track if jobs are running
let isRunning = false;
let updateIntervalId = null;

/**
 * Check if Tadawul market is open
 * Sun-Thu 10:00-15:00 Asia/Riyadh
 */
function isTadawulOpen() {
    const now = new Date();
    // Convert to Riyadh time (UTC+3)
    const riyadhOffset = 3 * 60;
    const localOffset = now.getTimezoneOffset();
    const riyadhTime = new Date(now.getTime() + (localOffset + riyadhOffset) * 60000);

    const day = riyadhTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = riyadhTime.getHours();

    // Tadawul is open Sun-Thu (0-4), 10:00-15:00
    if (day >= 0 && day <= 4) {
        if (hour >= 10 && hour < 15) {
            return true;
        }
    }
    return false;
}

/**
 * Check if US market is open
 * Mon-Fri 9:30-16:00 EST = 16:30-23:00 Riyadh
 */
function isUSMarketOpen() {
    const now = new Date();
    const riyadhOffset = 3 * 60;
    const localOffset = now.getTimezoneOffset();
    const riyadhTime = new Date(now.getTime() + (localOffset + riyadhOffset) * 60000);

    const day = riyadhTime.getDay();
    const hour = riyadhTime.getHours();
    const minute = riyadhTime.getMinutes();

    // US market is open Mon-Fri (1-5), 16:30-23:00 Riyadh time
    if (day >= 1 && day <= 5) {
        if ((hour === 16 && minute >= 30) || (hour > 16 && hour < 23)) {
            return true;
        }
    }
    return false;
}

/**
 * Update prices for investments in a specific market
 */
async function updateMarketPrices(market) {
    try {
        const investments = await Investment.find({
            status: 'active',
            market: market
        });

        if (investments.length === 0) {
            logger.info(`[Price Update] No active investments in ${market}`);
            return { updated: 0, failed: 0 };
        }

        logger.info(`[Price Update] Updating ${investments.length} ${market} investments`);

        let updated = 0;
        let failed = 0;

        for (const investment of investments) {
            try {
                const symbolInfo = findSymbol(investment.symbol);
                const yahooSymbol = investment.yahooSymbol || symbolInfo?.yahoo;

                if (!yahooSymbol) {
                    logger.warn(`[Price Update] No Yahoo symbol for ${investment.symbol}`);
                    failed++;
                    continue;
                }

                const quote = await priceService.getPriceFromYahoo(yahooSymbol);
                const priceInHalalas = Math.round(quote.price * 100);

                investment.updatePrice({
                    price: priceInHalalas,
                    previousClose: Math.round(quote.previousClose * 100),
                    change: Math.round(quote.change * 100),
                    changePercent: quote.changePercent,
                    high: Math.round(quote.high * 100),
                    low: Math.round(quote.low * 100),
                    volume: quote.volume,
                    source: 'yahoo'
                });

                await investment.save();
                updated++;
                logger.info(`[Price Update] ${investment.symbol}: ${quote.price}`);

                // Rate limiting between requests
                await new Promise(r => setTimeout(r, 300));
            } catch (error) {
                logger.error(`[Price Update] Failed ${investment.symbol}:`, error.message);
                failed++;
            }
        }

        logger.info(`[Price Update] ${market} complete: ${updated} updated, ${failed} failed`);
        return { updated, failed };
    } catch (error) {
        logger.error(`[Price Update] ${market} job failed:`, error);
        return { updated: 0, failed: 0, error: error.message };
    }
}

/**
 * Run price update cycle
 */
async function runUpdateCycle() {
    if (isRunning) {
        logger.info('[Price Update] Previous cycle still running, skipping...');
        return;
    }

    isRunning = true;
    logger.info('[Price Update] Starting update cycle...');

    try {
        // Update Tadawul if market is open
        if (isTadawulOpen()) {
            await updateMarketPrices('tadawul');
        } else {
            logger.info('[Price Update] Tadawul market is closed');
        }

        // Update US markets if open
        if (isUSMarketOpen()) {
            await updateMarketPrices('us');
        } else {
            logger.info('[Price Update] US market is closed');
        }

        // Crypto and Forex are 24/7
        await updateMarketPrices('crypto');
        await updateMarketPrices('forex');

        // Commodities follow different hours, update during weekdays
        const now = new Date();
        if (now.getDay() >= 1 && now.getDay() <= 5) {
            await updateMarketPrices('commodities');
        }

        logger.info('[Price Update] Update cycle complete');
    } catch (error) {
        logger.error('[Price Update] Update cycle error:', error);
    } finally {
        isRunning = false;
    }
}

/**
 * Start the price updater
 */
function startPriceUpdater() {
    if (updateIntervalId) {
        logger.info('[Price Update] Already running');
        return;
    }

    logger.info('[Price Update] Starting price updater...');
    logger.info(`[Price Update] Update interval: ${UPDATE_INTERVAL / 60000} minutes`);

    // Run initial update after 30 seconds
    setTimeout(() => {
        runUpdateCycle();
    }, 30000);

    // Schedule regular updates
    updateIntervalId = setInterval(() => {
        runUpdateCycle();
    }, UPDATE_INTERVAL);

    logger.info('[Price Update] Price updater started');
}

/**
 * Stop the price updater
 */
function stopPriceUpdater() {
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
        logger.info('[Price Update] Price updater stopped');
    }
}

/**
 * Manually trigger a price update for all markets
 */
async function triggerManualUpdate() {
    logger.info('[Price Update] Manual update triggered');
    await runUpdateCycle();
}

module.exports = {
    startPriceUpdater,
    stopPriceUpdater,
    triggerManualUpdate,
    updateMarketPrices,
    isTadawulOpen,
    isUSMarketOpen
};
