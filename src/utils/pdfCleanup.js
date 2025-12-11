/**
 * PDF Cleanup Utility
 *
 * Automatically deletes generated PDFs older than 24 hours to prevent disk space issues.
 * Provides scheduled cleanup via cron and manual cleanup for admin endpoints.
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Default configuration
const PDF_DIRECTORIES = [
    path.join(process.cwd(), 'uploads/pdfs'),
    path.join(process.cwd(), 'uploads/invoices'),
    path.join(process.cwd(), 'uploads/contracts'),
    path.join(process.cwd(), 'uploads/receipts')
];
const MAX_AGE_HOURS = 24; // Delete files older than 24 hours

/**
 * Format bytes to human readable
 * @param {number} bytes - Number of bytes
 * @returns {string} Human readable size
 */
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Delete files older than specified age in a directory
 * @param {string} directory - Directory to clean
 * @param {number} maxAgeHours - Maximum file age in hours
 * @returns {Object} - Cleanup statistics
 */
const cleanupOldFiles = (directory, maxAgeHours) => {
    const stats = {
        scanned: 0,
        deleted: 0,
        errors: 0,
        freedBytes: 0,
        directory
    };

    if (!fs.existsSync(directory)) {
        console.log(`[PDF Cleanup] Directory does not exist: ${directory}`);
        return stats;
    }

    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    try {
        const files = fs.readdirSync(directory);
        stats.scanned = files.length;

        files.forEach(file => {
            const filePath = path.join(directory, file);

            try {
                const fileStat = fs.statSync(filePath);
                const fileAge = now - fileStat.mtimeMs;

                if (fileAge > maxAgeMs && fileStat.isFile()) {
                    fs.unlinkSync(filePath);
                    stats.deleted++;
                    stats.freedBytes += fileStat.size;
                    console.log(`[PDF Cleanup] Deleted: ${file} (age: ${Math.round(fileAge / 3600000)}h)`);
                }
            } catch (fileError) {
                stats.errors++;
                console.error(`[PDF Cleanup] Error processing ${file}:`, fileError.message);
            }
        });
    } catch (dirError) {
        console.error(`[PDF Cleanup] Error reading directory ${directory}:`, dirError.message);
    }

    return stats;
};

/**
 * Run cleanup on all PDF directories
 * @param {number} maxAgeHours - Maximum file age in hours
 * @returns {Object} - Combined cleanup statistics
 */
const runCleanup = (maxAgeHours = MAX_AGE_HOURS) => {
    const combinedStats = {
        scanned: 0,
        deleted: 0,
        errors: 0,
        freedBytes: 0,
        freedBytesFormatted: '0 Bytes',
        directories: []
    };

    PDF_DIRECTORIES.forEach(directory => {
        const stats = cleanupOldFiles(directory, maxAgeHours);
        combinedStats.scanned += stats.scanned;
        combinedStats.deleted += stats.deleted;
        combinedStats.errors += stats.errors;
        combinedStats.freedBytes += stats.freedBytes;
        combinedStats.directories.push(stats);
    });

    combinedStats.freedBytesFormatted = formatBytes(combinedStats.freedBytes);
    return combinedStats;
};

/**
 * Schedule automatic cleanup
 * Runs every hour at minute 0
 */
const schedulePdfCleanup = () => {
    // Run every hour at :00
    cron.schedule('0 * * * *', () => {
        console.log(`[PDF Cleanup] Starting scheduled cleanup at ${new Date().toISOString()}`);

        const stats = runCleanup(MAX_AGE_HOURS);

        console.log(`[PDF Cleanup] Completed:`);
        console.log(`  - Scanned: ${stats.scanned} files`);
        console.log(`  - Deleted: ${stats.deleted} files`);
        console.log(`  - Freed: ${stats.freedBytesFormatted}`);
        console.log(`  - Errors: ${stats.errors}`);
    });

    console.log(`[PDF Cleanup] Scheduled: Every hour, deleting files older than ${MAX_AGE_HOURS}h`);
};

/**
 * Manual cleanup trigger (for admin endpoint)
 * @param {number} maxAgeHours - Maximum file age in hours (default: 24)
 * @returns {Object} - Cleanup statistics
 */
const runManualCleanup = (maxAgeHours = MAX_AGE_HOURS) => {
    console.log(`[PDF Cleanup] Manual cleanup triggered at ${new Date().toISOString()}`);
    return runCleanup(maxAgeHours);
};

/**
 * Get directory statistics
 * @param {string} directory - Directory to check
 * @returns {Object} - Directory statistics
 */
const getDirectoryStatsForPath = (directory) => {
    if (!fs.existsSync(directory)) {
        return {
            exists: false,
            fileCount: 0,
            totalSize: 0,
            totalSizeFormatted: '0 Bytes',
            directory
        };
    }

    let totalSize = 0;
    let fileCount = 0;
    let oldestFile = null;
    let newestFile = null;

    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const filePath = path.join(directory, file);
        try {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                fileCount++;
                totalSize += stat.size;

                if (!oldestFile || stat.mtimeMs < oldestFile.time) {
                    oldestFile = { name: file, time: stat.mtimeMs };
                }
                if (!newestFile || stat.mtimeMs > newestFile.time) {
                    newestFile = { name: file, time: stat.mtimeMs };
                }
            }
        } catch (e) {
            // Ignore errors for individual files
        }
    });

    return {
        exists: true,
        fileCount,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        directory,
        oldestFile: oldestFile ? {
            name: oldestFile.name,
            age: Math.round((Date.now() - oldestFile.time) / 3600000) + 'h'
        } : null,
        newestFile: newestFile ? {
            name: newestFile.name,
            age: Math.round((Date.now() - newestFile.time) / 3600000) + 'h'
        } : null
    };
};

/**
 * Get storage statistics for all PDF directories
 * @returns {Object} - Combined storage statistics
 */
const getDirectoryStats = () => {
    const stats = {
        totalFileCount: 0,
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        directories: []
    };

    PDF_DIRECTORIES.forEach(directory => {
        const dirStats = getDirectoryStatsForPath(directory);
        stats.totalFileCount += dirStats.fileCount;
        stats.totalSize += dirStats.totalSize;
        stats.directories.push(dirStats);
    });

    stats.totalSizeFormatted = formatBytes(stats.totalSize);
    return stats;
};

module.exports = {
    schedulePdfCleanup,
    runManualCleanup,
    getDirectoryStats,
    cleanupOldFiles,
    formatBytes,
    PDF_DIRECTORIES,
    MAX_AGE_HOURS
};
