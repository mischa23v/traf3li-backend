#!/usr/bin/env node
/**
 * Comprehensive Security Vulnerability Scanner
 * Scans for IDOR, auth bypass, response leakage, and other security issues
 */

const fs = require('fs');
const path = require('path');

const CONTROLLERS_DIR = path.join(__dirname, '../src/controllers');
const SERVICES_DIR = path.join(__dirname, '../src/services');
const ROUTES_DIR = path.join(__dirname, '../src/routes');
const MODELS_DIR = path.join(__dirname, '../src/models');

const vulnerabilities = {
  critical: [],
  high: [],
  medium: [],
  low: []
};

let counters = {
  filesScanned: 0,
  idorVulnerabilities: 0,
  authBypass: 0,
  responseLeakage: 0,
  redos: 0,
  other: 0
};

// Patterns that indicate IDOR vulnerabilities
const IDOR_PATTERNS = [
  // findById without firmId check
  { regex: /\.findById\s*\(\s*[\w.]+\s*\)(?!\s*\.\s*(?:select|populate|lean|exec).*firmId)/g, name: 'findById without firmId' },
  { regex: /\.findByIdAndUpdate\s*\(\s*[\w.]+\s*,/g, name: 'findByIdAndUpdate without firmId' },
  { regex: /\.findByIdAndDelete\s*\(\s*[\w.]+\s*\)/g, name: 'findByIdAndDelete without firmId' },
  { regex: /\.findByIdAndRemove\s*\(\s*[\w.]+\s*\)/g, name: 'findByIdAndRemove without firmId' },
];

// Patterns for routes without auth
const AUTH_BYPASS_PATTERNS = [
  { regex: /app\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"]+['"`]\s*,\s*(?!.*(?:userMiddleware|authenticate|firmAdminOnly|adminAuth))/g, name: 'Route without auth middleware' },
  { regex: /router\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"]+['"`]\s*,\s*(?!.*(?:userMiddleware|authenticate|firmAdminOnly|adminAuth))[\w]+\s*\)/g, name: 'Router without auth' },
];

// Patterns for ReDoS
const REDOS_PATTERNS = [
  { regex: /new\s+RegExp\s*\(\s*(?!.*escapeRegex)/g, name: 'Unsanitized RegExp constructor' },
  { regex: /\$regex\s*:\s*(?:req\.(?:query|body|params)|search|term|keyword)/g, name: 'User input in $regex' },
];

// Patterns for response leakage
const RESPONSE_LEAKAGE_PATTERNS = [
  { regex: /res(?:ponse)?\.(?:json|send)\s*\(\s*\{[^}]*(?:password|mfaSecret|apiKey|accessToken|refreshToken|secretKey)/g, name: 'Sensitive field in response' },
  { regex: /\.toObject\s*\(\s*\)(?!.*(?:delete|remove|filter))/g, name: 'toObject without field filtering' },
];

function scanFile(filePath, patterns, category) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      // Find line number
      let lineNum = 1;
      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        pos += lines[i].length + 1;
        if (pos > match.index) {
          lineNum = i + 1;
          break;
        }
      }

      // Get the line content for context
      const lineContent = lines[lineNum - 1]?.trim().substring(0, 100) || '';

      issues.push({
        file: filePath.replace(/.*traf3li-backend\//, ''),
        line: lineNum,
        pattern: pattern.name,
        code: lineContent,
        category
      });
    }
  });

  return issues;
}

function scanControllers() {
  console.log('\n🔍 Scanning Controllers for IDOR vulnerabilities...');

  if (!fs.existsSync(CONTROLLERS_DIR)) return;

  const files = fs.readdirSync(CONTROLLERS_DIR).filter(f => f.endsWith('.js'));

  files.forEach(file => {
    const filePath = path.join(CONTROLLERS_DIR, file);
    counters.filesScanned++;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check for findById patterns without firmId in same function
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // findById without firmId check nearby
      if (line.includes('.findById(') && !line.includes('firmId') && !line.includes('bypassFirmFilter')) {
        // Check if firmId is checked within 15 lines before or after
        const contextStart = Math.max(0, idx - 15);
        const contextEnd = Math.min(lines.length, idx + 15);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        if (!context.includes('firmId') && !context.includes('firmQuery') && !context.includes('buildSecure')) {
          vulnerabilities.critical.push({
            file: `src/controllers/${file}`,
            line: lineNum,
            pattern: 'findById without firmId check',
            code: line.trim().substring(0, 100),
            category: 'IDOR'
          });
          counters.idorVulnerabilities++;
        }
      }

      // findByIdAndUpdate without firmId
      if (line.includes('.findByIdAndUpdate(') && !line.includes('firmId')) {
        const contextStart = Math.max(0, idx - 10);
        const contextEnd = Math.min(lines.length, idx + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        if (!context.includes('firmId') && !context.includes('firmQuery')) {
          vulnerabilities.critical.push({
            file: `src/controllers/${file}`,
            line: lineNum,
            pattern: 'findByIdAndUpdate without firmId',
            code: line.trim().substring(0, 100),
            category: 'IDOR'
          });
          counters.idorVulnerabilities++;
        }
      }

      // findByIdAndDelete without firmId
      if (line.includes('.findByIdAndDelete(') && !line.includes('firmId')) {
        vulnerabilities.critical.push({
          file: `src/controllers/${file}`,
          line: lineNum,
          pattern: 'findByIdAndDelete without firmId',
          code: line.trim().substring(0, 100),
          category: 'IDOR'
        });
        counters.idorVulnerabilities++;
      }

      // Unsanitized RegExp (ReDoS)
      if (line.includes('new RegExp(') && !line.includes('escapeRegex')) {
        if (line.includes('search') || line.includes('query') || line.includes('term') || line.includes('keyword')) {
          vulnerabilities.high.push({
            file: `src/controllers/${file}`,
            line: lineNum,
            pattern: 'ReDoS - Unsanitized user input in RegExp',
            code: line.trim().substring(0, 100),
            category: 'ReDoS'
          });
          counters.redos++;
        }
      }

      // $regex with user input
      if (line.includes('$regex') && (line.includes('search') || line.includes('req.query') || line.includes('req.body'))) {
        if (!line.includes('escapeRegex')) {
          vulnerabilities.high.push({
            file: `src/controllers/${file}`,
            line: lineNum,
            pattern: 'ReDoS - User input in $regex',
            code: line.trim().substring(0, 100),
            category: 'ReDoS'
          });
          counters.redos++;
        }
      }
    });
  });
}

function scanServices() {
  console.log('🔍 Scanning Services for IDOR vulnerabilities...');

  if (!fs.existsSync(SERVICES_DIR)) return;

  const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));

  files.forEach(file => {
    const filePath = path.join(SERVICES_DIR, file);
    counters.filesScanned++;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // findById without firmId
      if (line.includes('.findById(') && !line.includes('firmId') && !line.includes('bypassFirmFilter')) {
        const contextStart = Math.max(0, idx - 15);
        const contextEnd = Math.min(lines.length, idx + 15);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        // Skip if it's a model that doesn't need firmId (User, Firm, etc)
        const skipModels = ['User.findById', 'Firm.findById', 'Session.findById', 'RefreshToken.findById',
                          'Counter.findById', 'MigrationLog.findById', 'SubscriptionPlan.findById'];
        const isSkipModel = skipModels.some(m => line.includes(m));

        if (!context.includes('firmId') && !context.includes('firmQuery') && !isSkipModel) {
          vulnerabilities.critical.push({
            file: `src/services/${file}`,
            line: lineNum,
            pattern: 'findById without firmId check',
            code: line.trim().substring(0, 100),
            category: 'IDOR'
          });
          counters.idorVulnerabilities++;
        }
      }

      // findByIdAndUpdate without firmId
      if (line.includes('.findByIdAndUpdate(') && !line.includes('firmId')) {
        vulnerabilities.critical.push({
          file: `src/services/${file}`,
          line: lineNum,
          pattern: 'findByIdAndUpdate without firmId',
          code: line.trim().substring(0, 100),
          category: 'IDOR'
        });
        counters.idorVulnerabilities++;
      }
    });
  });
}

function scanRoutes() {
  console.log('🔍 Scanning Routes for auth bypass...');

  if (!fs.existsSync(ROUTES_DIR)) return;

  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  // Known public routes that don't need auth
  const publicRoutes = [
    '/health', '/auth/login', '/auth/register', '/auth/forgot-password',
    '/auth/reset-password', '/auth/verify', '/webhooks', '/public'
  ];

  files.forEach(file => {
    const filePath = path.join(ROUTES_DIR, file);
    counters.filesScanned++;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Check for route definitions
      const routeMatch = line.match(/(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"]+)['"`]/);

      if (routeMatch) {
        const method = routeMatch[1];
        const route = routeMatch[2];

        // Skip public routes
        const isPublic = publicRoutes.some(pr => route.includes(pr));

        // Check if auth middleware is present
        const hasAuth = line.includes('userMiddleware') ||
                       line.includes('authenticate') ||
                       line.includes('firmAdminOnly') ||
                       line.includes('adminAuth') ||
                       line.includes('apiKeyAuth');

        if (!isPublic && !hasAuth && method !== 'options') {
          vulnerabilities.high.push({
            file: `src/routes/${file}`,
            line: lineNum,
            pattern: 'Route without authentication middleware',
            code: line.trim().substring(0, 100),
            category: 'AUTH_BYPASS'
          });
          counters.authBypass++;
        }
      }
    });
  });
}

function scanForResponseLeakage() {
  console.log('🔍 Scanning for response data leakage...');

  const dirs = [CONTROLLERS_DIR, SERVICES_DIR];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const lineNum = idx + 1;

        // Check for sensitive fields in responses
        const sensitiveFields = ['password', 'mfaSecret', 'mfaBackupCodes', 'apiKey',
                                'secretKey', 'accessToken', 'refreshToken', 'passwordResetToken'];

        if (line.includes('res.json') || line.includes('response.json') || line.includes('res.send')) {
          sensitiveFields.forEach(field => {
            if (line.includes(field) && !line.includes('delete') && !line.includes('undefined')) {
              vulnerabilities.high.push({
                file: filePath.replace(/.*traf3li-backend\//, ''),
                line: lineNum,
                pattern: `Potential ${field} leakage in response`,
                code: line.trim().substring(0, 100),
                category: 'RESPONSE_LEAKAGE'
              });
              counters.responseLeakage++;
            }
          });
        }

        // toObject without filtering
        if (line.includes('.toObject()') && line.includes('res')) {
          vulnerabilities.medium.push({
            file: filePath.replace(/.*traf3li-backend\//, ''),
            line: lineNum,
            pattern: 'toObject() without field filtering',
            code: line.trim().substring(0, 100),
            category: 'RESPONSE_LEAKAGE'
          });
          counters.responseLeakage++;
        }
      });
    });
  });
}

function printReport() {
  console.log('\n' + '='.repeat(80));
  console.log('                    SECURITY VULNERABILITY SCAN REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 SCAN STATISTICS:');
  console.log(`   Files Scanned: ${counters.filesScanned}`);
  console.log(`   IDOR Vulnerabilities: ${counters.idorVulnerabilities}`);
  console.log(`   Auth Bypass Issues: ${counters.authBypass}`);
  console.log(`   Response Leakage: ${counters.responseLeakage}`);
  console.log(`   ReDoS Vulnerabilities: ${counters.redos}`);

  const total = counters.idorVulnerabilities + counters.authBypass +
                counters.responseLeakage + counters.redos + counters.other;
  console.log(`   TOTAL ISSUES: ${total}`);

  if (vulnerabilities.critical.length > 0) {
    console.log('\n🔴 CRITICAL VULNERABILITIES:');
    vulnerabilities.critical.forEach((v, i) => {
      console.log(`   ${i + 1}. [${v.category}] ${v.file}:${v.line}`);
      console.log(`      Pattern: ${v.pattern}`);
      console.log(`      Code: ${v.code.substring(0, 80)}...`);
    });
  }

  if (vulnerabilities.high.length > 0) {
    console.log('\n🟠 HIGH SEVERITY:');
    vulnerabilities.high.forEach((v, i) => {
      console.log(`   ${i + 1}. [${v.category}] ${v.file}:${v.line}`);
      console.log(`      Pattern: ${v.pattern}`);
    });
  }

  if (vulnerabilities.medium.length > 0) {
    console.log('\n🟡 MEDIUM SEVERITY:');
    vulnerabilities.medium.slice(0, 20).forEach((v, i) => {
      console.log(`   ${i + 1}. [${v.category}] ${v.file}:${v.line} - ${v.pattern}`);
    });
    if (vulnerabilities.medium.length > 20) {
      console.log(`   ... and ${vulnerabilities.medium.length - 20} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL VULNERABILITIES: ${total}`);
  console.log('='.repeat(80));

  // Write JSON report for automation
  const report = {
    timestamp: new Date().toISOString(),
    counters,
    total,
    vulnerabilities
  };

  fs.writeFileSync(
    path.join(__dirname, 'security-scan-results.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Detailed report saved to: scripts/security-scan-results.json');

  return total;
}

// Run the scan
console.log('🚀 Starting Comprehensive Security Scan...');
console.log('   Timestamp:', new Date().toISOString());

scanControllers();
scanServices();
scanRoutes();
scanForResponseLeakage();

const totalIssues = printReport();

process.exit(totalIssues > 0 ? 1 : 0);
