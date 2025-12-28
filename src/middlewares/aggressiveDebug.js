/**
 * Aggressive Debug Middleware
 *
 * Provides comprehensive error logging with:
 * - Full stack traces with exact file paths and line numbers
 * - Request/response body logging
 * - Timing for all operations
 * - Error source detection
 * - Unhandled promise rejection tracking
 *
 * Enable by setting DEBUG_MODE=aggressive in your environment
 */

const path = require('path');
const fs = require('fs');

// ANSI colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
};

// Track request timing
const requestTimings = new Map();

// Track all errors for summary
const errorLog = [];
const MAX_ERROR_LOG = 100;

/**
 * Parse stack trace to get exact file locations
 */
function parseStackTrace(stack) {
    if (!stack) return [];

    const lines = stack.split('\n');
    const parsed = [];

    for (const line of lines) {
        // Match various stack trace formats
        const match = line.match(/at\s+(?:(.+?)\s+\()?((?:\/[^:]+|[A-Z]:\\[^:]+)):(\d+):(\d+)\)?/);
        if (match) {
            const [, functionName, filePath, lineNumber, columnNumber] = match;

            // Skip node_modules for cleaner output (but keep for full trace)
            const isNodeModule = filePath.includes('node_modules');

            parsed.push({
                function: functionName || '<anonymous>',
                file: filePath,
                line: parseInt(lineNumber, 10),
                column: parseInt(columnNumber, 10),
                isNodeModule,
                // Get relative path for readability
                relativePath: filePath.replace(process.cwd(), '.')
            });
        }
    }

    return parsed;
}

/**
 * Get source code context around an error line
 */
function getSourceContext(filePath, lineNumber, contextLines = 3) {
    try {
        if (!fs.existsSync(filePath)) return null;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        const startLine = Math.max(0, lineNumber - contextLines - 1);
        const endLine = Math.min(lines.length, lineNumber + contextLines);

        const context = [];
        for (let i = startLine; i < endLine; i++) {
            const isErrorLine = i === lineNumber - 1;
            context.push({
                lineNumber: i + 1,
                content: lines[i],
                isError: isErrorLine
            });
        }

        return context;
    } catch (err) {
        return null;
    }
}

/**
 * Format error for console output with colors
 */
function formatErrorForConsole(error, req) {
    const separator = '═'.repeat(80);
    const thinSeparator = '─'.repeat(80);

    const output = [];

    output.push('');
    output.push(`${colors.bgRed}${colors.white}${colors.bright} ERROR ${colors.reset} ${colors.red}${colors.bright}${error.message}${colors.reset}`);
    output.push(`${colors.cyan}${separator}${colors.reset}`);

    // Request info
    if (req) {
        output.push(`${colors.yellow}📍 REQUEST:${colors.reset}`);
        output.push(`   ${colors.bright}Method:${colors.reset} ${req.method}`);
        output.push(`   ${colors.bright}URL:${colors.reset} ${req.originalUrl}`);
        output.push(`   ${colors.bright}Request ID:${colors.reset} ${req.id || 'N/A'}`);

        if (req.userID) {
            output.push(`   ${colors.bright}User ID:${colors.reset} ${req.userID}`);
        }
        if (req.firmId) {
            output.push(`   ${colors.bright}Firm ID:${colors.reset} ${req.firmId}`);
        }

        // Request body (sanitized)
        if (req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = sanitizeBody(req.body);
            output.push(`   ${colors.bright}Body:${colors.reset} ${JSON.stringify(sanitizedBody, null, 2).split('\n').join('\n   ')}`);
        }

        // Query params
        if (req.query && Object.keys(req.query).length > 0) {
            output.push(`   ${colors.bright}Query:${colors.reset} ${JSON.stringify(req.query)}`);
        }

        output.push('');
    }

    // Error details
    output.push(`${colors.yellow}🔥 ERROR DETAILS:${colors.reset}`);
    output.push(`   ${colors.bright}Name:${colors.reset} ${error.name}`);
    output.push(`   ${colors.bright}Message:${colors.reset} ${error.message}`);
    if (error.code) {
        output.push(`   ${colors.bright}Code:${colors.reset} ${error.code}`);
    }
    if (error.status || error.statusCode) {
        output.push(`   ${colors.bright}Status:${colors.reset} ${error.status || error.statusCode}`);
    }

    // Mongoose-specific errors
    if (error.name === 'ValidationError' && error.errors) {
        output.push(`   ${colors.bright}Validation Errors:${colors.reset}`);
        for (const [field, err] of Object.entries(error.errors)) {
            output.push(`      • ${field}: ${err.message}`);
        }
    }

    // MongoDB duplicate key
    if (error.code === 11000 && error.keyValue) {
        output.push(`   ${colors.bright}Duplicate Key:${colors.reset} ${JSON.stringify(error.keyValue)}`);
    }

    output.push('');

    // Stack trace with source context
    const parsedStack = parseStackTrace(error.stack);
    if (parsedStack.length > 0) {
        output.push(`${colors.yellow}📚 STACK TRACE (with source context):${colors.reset}`);
        output.push('');

        // Show first non-node_module frame with source context
        const appFrames = parsedStack.filter(f => !f.isNodeModule);
        if (appFrames.length > 0) {
            const firstFrame = appFrames[0];
            output.push(`${colors.magenta}   ▶ ORIGIN: ${firstFrame.relativePath}:${firstFrame.line}:${firstFrame.column}${colors.reset}`);
            output.push(`     ${colors.bright}Function:${colors.reset} ${firstFrame.function}`);

            // Get source context
            const context = getSourceContext(firstFrame.file, firstFrame.line);
            if (context) {
                output.push('');
                output.push(`${colors.cyan}   ${thinSeparator}${colors.reset}`);
                for (const line of context) {
                    const prefix = line.isError ? `${colors.bgRed}${colors.white} >> ` : '    ';
                    const suffix = line.isError ? colors.reset : '';
                    output.push(`   ${prefix}${line.lineNumber.toString().padStart(4)} │ ${line.content}${suffix}`);
                }
                output.push(`${colors.cyan}   ${thinSeparator}${colors.reset}`);
                output.push('');
            }
        }

        // Full stack trace
        output.push(`${colors.yellow}   Full trace:${colors.reset}`);
        for (let i = 0; i < Math.min(parsedStack.length, 15); i++) {
            const frame = parsedStack[i];
            const color = frame.isNodeModule ? colors.white : colors.cyan;
            const marker = frame.isNodeModule ? '  ' : '→ ';
            output.push(`   ${marker}${color}${frame.relativePath}:${frame.line} (${frame.function})${colors.reset}`);
        }

        if (parsedStack.length > 15) {
            output.push(`   ... and ${parsedStack.length - 15} more frames`);
        }
    }

    output.push('');
    output.push(`${colors.cyan}${separator}${colors.reset}`);
    output.push('');

    return output.join('\n');
}

/**
 * Sanitize request body to hide sensitive fields
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
        'password', 'token', 'secret', 'apiKey', 'api_key',
        'accessToken', 'refreshToken', 'authorization', 'creditCard',
        'cardNumber', 'cvv', 'ssn', 'socialSecurity'
    ];

    const sanitized = {};
    for (const [key, value] of Object.entries(body)) {
        if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeBody(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Log error to tracking array
 */
function trackError(error, req) {
    const entry = {
        timestamp: new Date().toISOString(),
        error: {
            name: error.name,
            message: error.message,
            code: error.code,
            status: error.status || error.statusCode || 500
        },
        request: req ? {
            method: req.method,
            url: req.originalUrl,
            userId: req.userID,
            firmId: req.firmId
        } : null,
        stackFrames: parseStackTrace(error.stack).slice(0, 5)
    };

    errorLog.unshift(entry);
    if (errorLog.length > MAX_ERROR_LOG) {
        errorLog.pop();
    }
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
    const startTime = process.hrtime.bigint();
    const requestId = req.id || `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store timing
    requestTimings.set(requestId, {
        startTime,
        method: req.method,
        url: req.originalUrl
    });

    // Log incoming request
    console.log(`${colors.green}→ ${req.method} ${req.originalUrl}${colors.reset} ${colors.white}[${requestId}]${colors.reset}`);

    // Capture original json method to log response
    const originalJson = res.json.bind(res);
    res.json = function(body) {
        const timing = requestTimings.get(requestId);
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - timing.startTime) / 1_000_000;

        requestTimings.delete(requestId);

        // Log response
        const statusColor = res.statusCode >= 500 ? colors.red
            : res.statusCode >= 400 ? colors.yellow
            : colors.green;

        console.log(`${statusColor}← ${res.statusCode} ${req.method} ${req.originalUrl}${colors.reset} ${colors.white}(${durationMs.toFixed(2)}ms)${colors.reset}`);

        // Log error responses with more detail
        if (res.statusCode >= 400 && body?.error) {
            console.log(`  ${colors.yellow}↳ Error: ${JSON.stringify(body.error?.message || body.message || 'Unknown')}${colors.reset}`);
        }

        return originalJson(body);
    };

    next();
}

/**
 * Aggressive error handler middleware
 */
function aggressiveErrorHandler(err, req, res, next) {
    // Track the error
    trackError(err, req);

    // Print detailed error info
    console.error(formatErrorForConsole(err, req));

    // Log to error file in production
    if (process.env.NODE_ENV === 'production') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                name: err.name,
                message: err.message,
                code: err.code,
                stack: err.stack
            },
            request: {
                method: req.method,
                url: req.originalUrl,
                body: sanitizeBody(req.body),
                query: req.query,
                userId: req.userID,
                firmId: req.firmId
            }
        };

        console.error('[DEBUG_JSON]', JSON.stringify(logEntry));
    }

    // Pass to next error handler
    next(err);
}

/**
 * Setup global error handlers for uncaught errors
 */
function setupGlobalErrorHandlers() {
    // Enhanced unhandled rejection
    process.on('unhandledRejection', (reason, promise) => {
        console.error(`\n${colors.bgRed}${colors.white}${colors.bright} UNHANDLED PROMISE REJECTION ${colors.reset}`);
        console.error(`${colors.red}Reason:${colors.reset}`, reason);

        if (reason instanceof Error) {
            const parsed = parseStackTrace(reason.stack);
            if (parsed.length > 0) {
                console.error(`${colors.yellow}Origin:${colors.reset} ${parsed[0].relativePath}:${parsed[0].line}`);
            }
            console.error(`${colors.yellow}Stack:${colors.reset}`);
            console.error(reason.stack);
        }

        console.error('');
    });

    // Enhanced uncaught exception
    process.on('uncaughtException', (error) => {
        console.error(`\n${colors.bgRed}${colors.white}${colors.bright} UNCAUGHT EXCEPTION ${colors.reset}`);
        console.error(`${colors.red}Error:${colors.reset}`, error.message);

        const parsed = parseStackTrace(error.stack);
        if (parsed.length > 0) {
            console.error(`${colors.yellow}Origin:${colors.reset} ${parsed[0].relativePath}:${parsed[0].line}`);

            const context = getSourceContext(parsed[0].file, parsed[0].line);
            if (context) {
                console.error(`${colors.cyan}Source context:${colors.reset}`);
                for (const line of context) {
                    const prefix = line.isError ? `${colors.bgRed}>> ` : '   ';
                    const suffix = line.isError ? colors.reset : '';
                    console.error(`${prefix}${line.lineNumber}: ${line.content}${suffix}`);
                }
            }
        }

        console.error(`${colors.yellow}Full stack:${colors.reset}`);
        console.error(error.stack);
        console.error('');

        // In development, exit after uncaught exception
        if (process.env.NODE_ENV === 'development') {
            process.exit(1);
        }
    });

    console.log(`${colors.green}✓ Aggressive debug mode: Global error handlers installed${colors.reset}`);
}

/**
 * Print error summary
 */
function printErrorSummary() {
    console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.yellow}${colors.bright} ERROR SUMMARY (last ${errorLog.length} errors) ${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);

    if (errorLog.length === 0) {
        console.log(`${colors.green}No errors recorded${colors.reset}\n`);
        return;
    }

    // Group by endpoint
    const grouped = {};
    for (const entry of errorLog) {
        const key = `${entry.request?.method || 'N/A'} ${entry.request?.url || 'Unknown'}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(entry);
    }

    for (const [endpoint, errors] of Object.entries(grouped)) {
        console.log(`${colors.bright}${endpoint}${colors.reset} (${errors.length} errors)`);
        for (const err of errors.slice(0, 3)) {
            console.log(`  ${colors.red}• ${err.error.name}: ${err.error.message}${colors.reset}`);
            if (err.stackFrames[0]) {
                console.log(`    ${colors.white}at ${err.stackFrames[0].relativePath}:${err.stackFrames[0].line}${colors.reset}`);
            }
        }
        if (errors.length > 3) {
            console.log(`  ... and ${errors.length - 3} more`);
        }
        console.log('');
    }
}

/**
 * Middleware to log MongoDB queries (use with mongoose debug)
 */
function enableMongooseDebug(mongoose) {
    mongoose.set('debug', (collectionName, methodName, ...args) => {
        const query = args[0] || {};
        console.log(`${colors.magenta}[MongoDB]${colors.reset} ${collectionName}.${methodName}(${JSON.stringify(query).substring(0, 200)})`);
    });

    console.log(`${colors.green}✓ Aggressive debug mode: Mongoose query logging enabled${colors.reset}`);
}

/**
 * Initialize aggressive debug mode
 */
function initAggressiveDebug(app, mongoose = null) {
    console.log(`\n${colors.bgYellow}${colors.bright} AGGRESSIVE DEBUG MODE ENABLED ${colors.reset}\n`);
    console.log(`${colors.yellow}All errors will be logged with full stack traces and source context${colors.reset}`);
    console.log(`${colors.yellow}Every request/response will be logged with timing${colors.reset}\n`);

    // Setup global handlers
    setupGlobalErrorHandlers();

    // Add request logging (should be early in middleware chain)
    app.use(requestLogger);

    // Enable mongoose debugging if provided
    if (mongoose) {
        enableMongooseDebug(mongoose);
    }

    // Expose error summary function globally
    global.debugErrorSummary = printErrorSummary;
    global.debugErrors = () => errorLog;

    console.log(`${colors.cyan}Debug commands available:${colors.reset}`);
    console.log(`  ${colors.bright}global.debugErrorSummary()${colors.reset} - Print error summary`);
    console.log(`  ${colors.bright}global.debugErrors()${colors.reset} - Get raw error log`);
    console.log('');

    return {
        requestLogger,
        errorHandler: aggressiveErrorHandler,
        printErrorSummary
    };
}

module.exports = {
    initAggressiveDebug,
    requestLogger,
    aggressiveErrorHandler,
    setupGlobalErrorHandlers,
    printErrorSummary,
    enableMongooseDebug,
    parseStackTrace,
    getSourceContext
};
