#!/bin/bash

# Security Audit Script
# This script performs comprehensive security checks on the Node.js application
# including npm audit, outdated packages check, and generates a detailed report

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output files
REPORT_DIR="security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/security-audit-${TIMESTAMP}.md"
JSON_REPORT="${REPORT_DIR}/npm-audit-${TIMESTAMP}.json"

# Create reports directory if it doesn't exist
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Security Audit - $(date)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Initialize report file
cat > "${REPORT_FILE}" << 'EOF'
# Security Audit Report

**Generated:** $(date)
**Repository:** traf3li-backend

---

EOF

# Replace $(date) with actual date
sed -i "s/\$(date)/$(date)/" "${REPORT_FILE}"

# Function to add section to report
add_section() {
    echo "" >> "${REPORT_FILE}"
    echo "$1" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
}

# 1. Run npm audit
echo -e "${YELLOW}[1/4] Running npm audit...${NC}"
add_section "## NPM Audit Results"

if npm audit --json > "${JSON_REPORT}" 2>&1; then
    echo -e "${GREEN}✓ No vulnerabilities found${NC}"
    add_section "✅ **No vulnerabilities found**"
    AUDIT_EXIT_CODE=0
else
    AUDIT_EXIT_CODE=$?
    echo -e "${RED}✗ Vulnerabilities detected${NC}"

    # Parse JSON and extract vulnerability counts
    CRITICAL=$(jq -r '.metadata.vulnerabilities.critical // 0' "${JSON_REPORT}")
    HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' "${JSON_REPORT}")
    MODERATE=$(jq -r '.metadata.vulnerabilities.moderate // 0' "${JSON_REPORT}")
    LOW=$(jq -r '.metadata.vulnerabilities.low // 0' "${JSON_REPORT}")
    TOTAL=$(jq -r '.metadata.vulnerabilities.total // 0' "${JSON_REPORT}")

    cat >> "${REPORT_FILE}" << EOF
### Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | ${CRITICAL} |
| High     | ${HIGH} |
| Moderate | ${MODERATE} |
| Low      | ${LOW} |
| **Total** | **${TOTAL}** |

### Detailed Vulnerabilities

\`\`\`
$(npm audit 2>&1 || true)
\`\`\`

EOF

    echo -e "${RED}  Critical: ${CRITICAL}${NC}"
    echo -e "${RED}  High: ${HIGH}${NC}"
    echo -e "${YELLOW}  Moderate: ${MODERATE}${NC}"
    echo -e "${YELLOW}  Low: ${LOW}${NC}"
fi

echo ""

# 2. Check for outdated packages
echo -e "${YELLOW}[2/4] Checking for outdated packages...${NC}"
add_section "## Outdated Packages"

OUTDATED_OUTPUT=$(npm outdated --long 2>&1 || true)

if [ -z "$OUTDATED_OUTPUT" ] || echo "$OUTDATED_OUTPUT" | grep -q "MISSING"; then
    echo -e "${GREEN}✓ All packages are up to date${NC}"
    add_section "✅ All packages are up to date"
else
    echo -e "${YELLOW}! Some packages can be updated${NC}"
    cat >> "${REPORT_FILE}" << EOF
\`\`\`
${OUTDATED_OUTPUT}
\`\`\`

### Update Recommendations

Run the following commands to update packages:
- \`npm update\` - Update to wanted versions (respects semver)
- \`npm outdated\` - Check which packages can be updated
- Review breaking changes before updating to latest versions

EOF
fi

echo ""

# 3. Check package-lock.json integrity
echo -e "${YELLOW}[3/4] Checking package-lock.json integrity...${NC}"
add_section "## Package Lock Integrity"

if [ -f "package-lock.json" ]; then
    if npm ls >/dev/null 2>&1; then
        echo -e "${GREEN}✓ package-lock.json is valid${NC}"
        add_section "✅ package-lock.json is valid and consistent"
    else
        echo -e "${RED}✗ Issues found in dependency tree${NC}"
        add_section "❌ **Issues found in dependency tree**"
        add_section "\`\`\`\n$(npm ls 2>&1 || true)\n\`\`\`"
    fi
else
    echo -e "${RED}✗ package-lock.json not found${NC}"
    add_section "❌ **package-lock.json not found** - Run \`npm install\` to generate it"
fi

echo ""

# 4. Generate summary and recommendations
echo -e "${YELLOW}[4/4] Generating summary and recommendations...${NC}"
add_section "## Summary and Recommendations"

SUMMARY=""
EXIT_CODE=0

if [ $AUDIT_EXIT_CODE -ne 0 ]; then
    if [ "${CRITICAL:-0}" -gt 0 ]; then
        SUMMARY="${SUMMARY}\n- ❌ **CRITICAL**: ${CRITICAL} critical vulnerabilities found - **IMMEDIATE ACTION REQUIRED**"
        EXIT_CODE=2
    fi
    if [ "${HIGH:-0}" -gt 0 ]; then
        SUMMARY="${SUMMARY}\n- ⚠️  **HIGH**: ${HIGH} high severity vulnerabilities found - **ACTION REQUIRED**"
        [ $EXIT_CODE -lt 1 ] && EXIT_CODE=1
    fi
    if [ "${MODERATE:-0}" -gt 0 ]; then
        SUMMARY="${SUMMARY}\n- ⚠️  **MODERATE**: ${MODERATE} moderate vulnerabilities found - Review and plan fixes"
    fi
    if [ "${LOW:-0}" -gt 0 ]; then
        SUMMARY="${SUMMARY}\n- ℹ️  **LOW**: ${LOW} low severity vulnerabilities found - Monitor and fix when convenient"
    fi
else
    SUMMARY="${SUMMARY}\n- ✅ No vulnerabilities detected in dependencies"
fi

# Add recommendations
cat >> "${REPORT_FILE}" << 'EOF'

### Action Items

1. **Fix vulnerabilities**: Run `npm audit fix` to automatically fix compatible issues
2. **Manual review**: Check `npm audit` output for vulnerabilities requiring manual intervention
3. **Update dependencies**: Review outdated packages and update cautiously
4. **Test thoroughly**: After updates, run full test suite: `npm test`
5. **Monitor regularly**: Schedule weekly security scans

### Useful Commands

```bash
# Fix vulnerabilities automatically (compatible updates only)
npm audit fix

# Fix including breaking changes (use with caution)
npm audit fix --force

# View detailed vulnerability information
npm audit

# Update specific package
npm update <package-name>

# Check for outdated packages
npm outdated
```

---

**Report saved to:** `REPORT_FILE_PLACEHOLDER`
**JSON report:** `JSON_REPORT_PLACEHOLDER`
EOF

# Replace placeholders
sed -i "s|REPORT_FILE_PLACEHOLDER|${REPORT_FILE}|" "${REPORT_FILE}"
sed -i "s|JSON_REPORT_PLACEHOLDER|${JSON_REPORT}|" "${REPORT_FILE}"

# Add summary to report
echo -e "${SUMMARY}" >> "${REPORT_FILE}"

# Print summary to console
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${SUMMARY}"
echo ""
echo -e "${GREEN}Report generated:${NC} ${REPORT_FILE}"
echo -e "${GREEN}JSON report:${NC} ${JSON_REPORT}"
echo ""

# Display appropriate exit message
if [ $EXIT_CODE -eq 2 ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  CRITICAL VULNERABILITIES FOUND!${NC}"
    echo -e "${RED}  Please fix immediately.${NC}"
    echo -e "${RED}========================================${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  HIGH SEVERITY VULNERABILITIES FOUND${NC}"
    echo -e "${YELLOW}  Please review and fix soon.${NC}"
    echo -e "${YELLOW}========================================${NC}"
else
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Security audit completed successfully${NC}"
    echo -e "${GREEN}========================================${NC}"
fi

exit $EXIT_CODE
