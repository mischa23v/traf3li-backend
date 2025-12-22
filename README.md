# Traf3li Backend

Backend API server for the Traf3li application - A comprehensive business management platform.

## Table of Contents

- [Features](#features)
- [Security](#security)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Scanning](#security-scanning)
- [Contributing](#contributing)

## Features

- RESTful API with Express.js
- MongoDB database with Mongoose ODM
- JWT-based authentication
- Real-time updates with Socket.io
- File upload and storage with AWS S3
- PDF generation for invoices and reports
- Background job processing with Bull
- Rate limiting and security headers
- Comprehensive logging with Winston
- API documentation with Swagger

## Security

This project implements multiple layers of security controls:

### Automated Security Scanning

1. **CI/CD Security Checks**: All commits to main branch trigger automated security scans
2. **Pull Request Scanning**: PRs are automatically scanned for vulnerabilities
3. **Weekly Scans**: Scheduled security audits run every Monday
4. **Pre-commit Hooks**: Local checks prevent committing secrets and vulnerable code

### Security Features

- **npm audit**: Automated vulnerability scanning for dependencies
- **Helmet**: Security headers for Express.js
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Joi schemas for request validation
- **Secrets Detection**: Pre-commit hooks to prevent hardcoded secrets
- **CORS**: Configurable cross-origin resource sharing
- **Authentication**: JWT-based with refresh tokens
- **2FA Support**: Time-based one-time passwords (TOTP)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- MongoDB 5.0 or higher
- Redis 6.x or higher (for queue management)
- npm 9.x or higher

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd traf3li-backend
```

2. Install dependencies:
```bash
npm ci
```

3. Set up environment variables:
```bash
npm run setup:env
npm run setup:secrets
```

4. Configure your `.env` file with appropriate values

5. Install Git hooks:
```bash
npm run prepare
```

6. Start the development server:
```bash
npm run dev
```

## Development

### Available Scripts

```bash
# Development
npm run dev                    # Start development server with nodemon
npm start                      # Start production server
npm run start:optimized        # Start with memory optimization
npm run start:high-memory      # Start with increased memory limit

# Testing
npm test                       # Run tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage report
npm run test:ci               # Run tests in CI mode

# Database
npm run db:indexes            # Create database indexes
npm run seed:accounts         # Seed chart of accounts

# Migrations
npm run migrate:all           # Run all migrations
npm run migrate:invoices      # Migrate invoices to general ledger
npm run migrate:bills         # Migrate bills to general ledger
npm run migrate:expenses      # Migrate expenses to general ledger

# Backups
npm run backup:db             # Create database backup
npm run backup:db:weekly      # Weekly backup
npm run backup:db:monthly     # Monthly backup
npm run backup:redis          # Backup Redis data
npm run backup:restore        # Restore from backup
npm run backup:list           # List available backups

# Code Quality
npm run lint                  # Run ESLint
npm run lint:fix              # Fix ESLint issues

# Security
npm run security:audit        # Run security audit (high/critical only)
npm run security:audit:fix    # Automatically fix vulnerabilities
npm run security:audit:report # Generate JSON audit report
npm run security:check        # Run security check
npm run security:scan         # Comprehensive security scan

# Docker
npm run docker:build          # Build Docker image
npm run docker:run            # Run Docker container
```

## Testing

Run the test suite:

```bash
npm test
```

Generate coverage report:

```bash
npm run test:coverage
```

The project uses Jest for testing with Supertest for API endpoint testing.

## Deployment

### Automated Deployment

Pushing to the `main` branch triggers an automated deployment to AWS EC2:

1. Security scan runs first
2. If security checks pass, code is deployed to EC2
3. Dependencies are installed with `npm ci`
4. Application is restarted with PM2

### Manual Deployment

```bash
# On the server
cd ~/traf3li-backend
git pull origin main
npm ci --production
pm2 restart traf3li-backend
```

## Security Scanning

### Running Security Scans Locally

1. **Quick audit** (check for high/critical vulnerabilities):
```bash
npm run security:audit
```

2. **Comprehensive scan** (includes outdated packages):
```bash
npm run security:scan
```

This generates a detailed markdown report in `security-reports/` directory.

3. **View audit in JSON format**:
```bash
npm run security:audit:report
```

### Handling Vulnerabilities

When vulnerabilities are detected:

1. **Review the vulnerability details**:
```bash
npm audit
```

2. **Attempt automatic fixes**:
```bash
npm run security:audit:fix
```

This runs `npm audit fix` which automatically updates vulnerable packages to safe versions where possible.

3. **For vulnerabilities requiring manual intervention**:
   - Review breaking changes in package changelogs
   - Test the application thoroughly after updates
   - Consider using `npm audit fix --force` for major version updates (use with caution)

4. **Update specific packages**:
```bash
npm update <package-name>
```

5. **For packages without fixes**:
   - Check if alternative packages exist
   - Consider forking and patching the package
   - Implement workarounds in your code
   - Monitor the package repository for updates

### Vulnerability Severity Levels

| Severity | Action Required | Timeline |
|----------|----------------|----------|
| **Critical** | Immediate fix required | Within 24 hours |
| **High** | Fix required | Within 1 week |
| **Moderate** | Review and plan fix | Within 1 month |
| **Low** | Monitor and fix when convenient | Next release cycle |

### Pre-commit Security Checks

The pre-commit hook automatically checks for:

- Hardcoded passwords
- API keys and tokens
- AWS credentials
- Private keys
- Database connection strings with credentials
- Bearer tokens
- Stripe API keys

If secrets are detected, the commit will be blocked. To proceed:

1. **Move secrets to `.env` file**
2. **Use environment variables**
3. **Ensure `.env` is in `.gitignore`**

To bypass (use with extreme caution):
```bash
git commit --no-verify
```

### CI/CD Security Workflow

The security scanning workflow (`.github/workflows/security-scan.yml`) runs:

- **On every push** to main/develop branches
- **On every pull request** to main/develop
- **Weekly** (Mondays at 9:00 AM UTC)
- **Manually** via GitHub Actions

### Viewing Security Reports

Security scan artifacts are available in GitHub Actions:

1. Go to the "Actions" tab in GitHub
2. Select the "Security Scan" workflow
3. Click on a workflow run
4. Download artifacts under "Artifacts" section

Reports are retained for 90 days.

## Upgrade Procedures

### Upgrading Dependencies

1. **Check for outdated packages**:
```bash
npm outdated
```

2. **Review changelogs** for breaking changes

3. **Update package.json** with new versions

4. **Install and test**:
```bash
npm ci
npm test
npm run dev
# Perform manual testing
```

5. **Commit the changes**:
```bash
git add package.json package-lock.json
git commit -m "chore: upgrade dependencies"
```

### Major Version Upgrades

For major version upgrades (e.g., multer 1.x to 2.x):

1. **Read the migration guide** in the package documentation
2. **Create a feature branch**:
```bash
git checkout -b upgrade/multer-v2
```

3. **Update the package**:
```bash
npm install multer@^2.0.0
```

4. **Update code** to handle breaking changes

5. **Run comprehensive tests**:
```bash
npm run test:coverage
npm run lint
```

6. **Create a pull request** for review

### Security-Critical Updates

When a security vulnerability is found:

1. **Assess the impact** on your application
2. **Check if you're using the vulnerable code path**
3. **Update immediately** if critical:
```bash
npm update <package-name>
# Or for major versions
npm install <package-name>@latest
```

4. **Deploy to production** after testing:
```bash
git add package.json package-lock.json
git commit -m "security: update <package-name> to fix CVE-XXXX-XXXXX"
git push origin main
```

## Configuration Files

### `.npmrc`

NPM configuration with security settings:
- Automatic security audits during install
- Fail on moderate or higher vulnerabilities
- Save exact versions for deterministic builds
- Disable funding messages

### `.lintstagedrc.json`

Lint-staged configuration for pre-commit hooks:
- Runs ESLint on staged JavaScript files
- Formats JSON and Markdown files with Prettier

### Environment Variables

Required environment variables (see `.env.example`):

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb://localhost:27017/traf3li
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
# ... and more
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Message Convention

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `security:` - Security updates

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team

## License

ISC

---

**Last Updated:** 2025-12-22

**Security Status:**
- ✅ Automated scanning enabled
- ✅ Pre-commit hooks configured
- ✅ Weekly security audits scheduled
- ✅ Vulnerability blocking on PRs
