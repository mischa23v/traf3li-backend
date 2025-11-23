#!/bin/bash

# CORS Testing Script for Traf3li Backend
# Usage: ./test-cors.sh <your-backend-url>

BACKEND_URL="${1:-https://traf3li-backend.onrender.com}"
FRONTEND_URL="https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app"

echo "🧪 Testing CORS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: CORS Preflight (OPTIONS)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: CORS Preflight (OPTIONS Request)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PREFLIGHT=$(curl -s -I \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS \
    "$BACKEND_URL/api/auth/me")

# Check for CORS headers (case-insensitive for HTTP/2)
if echo "$PREFLIGHT" | grep -qi "access-control-allow-origin"; then
    ALLOW_ORIGIN=$(echo "$PREFLIGHT" | grep -i "access-control-allow-origin" | cut -d' ' -f2- | tr -d '\r')
    echo -e "${GREEN}✅ Access-Control-Allow-Origin: $ALLOW_ORIGIN${NC}"
else
    echo -e "${RED}❌ Missing: Access-Control-Allow-Origin${NC}"
fi

if echo "$PREFLIGHT" | grep -qi "access-control-allow-credentials"; then
    ALLOW_CREDS=$(echo "$PREFLIGHT" | grep -i "access-control-allow-credentials" | cut -d' ' -f2- | tr -d '\r')
    echo -e "${GREEN}✅ Access-Control-Allow-Credentials: $ALLOW_CREDS${NC}"
else
    echo -e "${RED}❌ Missing: Access-Control-Allow-Credentials${NC}"
fi

if echo "$PREFLIGHT" | grep -qi "access-control-allow-methods"; then
    ALLOW_METHODS=$(echo "$PREFLIGHT" | grep -i "access-control-allow-methods" | cut -d' ' -f2- | tr -d '\r')
    echo -e "${GREEN}✅ Access-Control-Allow-Methods: $ALLOW_METHODS${NC}"
else
    echo -e "${RED}❌ Missing: Access-Control-Allow-Methods${NC}"
fi
echo ""

# Test 3: Actual GET Request with CORS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: GET Request with Origin Header"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GET_RESPONSE=$(curl -s -I \
    -H "Origin: $FRONTEND_URL" \
    -H "Content-Type: application/json" \
    "$BACKEND_URL/health")

if echo "$GET_RESPONSE" | grep -qi "access-control-allow-origin"; then
    GET_ORIGIN=$(echo "$GET_RESPONSE" | grep -i "access-control-allow-origin" | cut -d' ' -f2- | tr -d '\r')
    echo -e "${GREEN}✅ CORS headers present on GET request${NC}"
    echo -e "${GREEN}   Origin: $GET_ORIGIN${NC}"
else
    echo -e "${RED}❌ CORS headers missing on GET request${NC}"
fi
echo ""

# Test 4: Public API Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Public API Endpoint (Questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

QUESTIONS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/questions")
QUESTIONS_CODE=$(echo "$QUESTIONS_RESPONSE" | tail -n 1)

if [ "$QUESTIONS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Public API accessible (HTTP $QUESTIONS_CODE)${NC}"
else
    echo -e "${RED}❌ Public API failed (HTTP $QUESTIONS_CODE)${NC}"
    echo "Response: $(echo "$QUESTIONS_RESPONSE" | head -n -1)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TESTS_PASSED=0
TESTS_TOTAL=4

[ "$HTTP_CODE" = "200" ] && TESTS_PASSED=$((TESTS_PASSED + 1))
echo "$PREFLIGHT" | grep -q "Access-Control-Allow-Origin" && TESTS_PASSED=$((TESTS_PASSED + 1))
echo "$GET_RESPONSE" | grep -q "Access-Control-Allow-Origin" && TESTS_PASSED=$((TESTS_PASSED + 1))
[ "$QUESTIONS_CODE" = "200" ] && TESTS_PASSED=$((TESTS_PASSED + 1))

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}✅ All tests passed! ($TESTS_PASSED/$TESTS_TOTAL)${NC}"
    echo ""
    echo "Your backend is configured correctly and ready to use! 🎉"
else
    echo -e "${YELLOW}⚠️  Some tests failed ($TESTS_PASSED/$TESTS_TOTAL passed)${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Make sure backend is deployed with latest changes"
    echo "2. Check Render logs for errors"
    echo "3. Verify environment variables are set"
    echo "4. Ensure MongoDB is accessible"
fi
echo ""

# Additional Info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Update frontend API URL to: $BACKEND_URL/api"
echo "2. Test login from your Vercel app"
echo "3. Check browser console for CORS errors"
echo "4. Monitor Render logs for any issues"
echo ""
echo "📚 Documentation:"
echo "   - RENDER_DEPLOYMENT_GUIDE.md"
echo "   - CORS_CONFIGURATION_GUIDE.md"
echo ""
