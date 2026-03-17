#!/usr/bin/env bash
# Test Sales Point API endpoints with curl.
# Prereqs: backend running at http://localhost:8080, jq (optional, for parsing token).
# Usage: ./scripts/test-salespoint-api.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:8080/api}"
EMAIL="${SALES_POINT_EMAIL:-warehouse1@test.com}"
PASSWORD="${SALES_POINT_PASSWORD:-Test123!}"

echo "=== Sales Point API tests (base: $BASE_URL) ==="

# 1. Register (ignore failure if already registered)
echo ""
echo "1. Register Sales Point user ($EMAIL)..."
REGISTER_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Sales Point One\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"SALES_POINT\",\"companyName\":\"Central Warehouse\",\"companyCode\":\"CW01\"}")
REGISTER_HTTP=$(echo "$REGISTER_RESULT" | tail -n1)
if [ "$REGISTER_HTTP" = "200" ] || [ "$REGISTER_HTTP" = "201" ]; then
  echo "   Registered (HTTP $REGISTER_HTTP)"
else
  echo "   (HTTP $REGISTER_HTTP - may already exist)"
fi

# 2. Login and get token
echo ""
echo "2. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if command -v jq &>/dev/null; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
else
  TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "   FAIL: No accessToken in response. Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "   Token obtained (length ${#TOKEN})"

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 3. GET Catalog
echo ""
echo "3. GET /catalog/offerings"
curl -s -X GET "$BASE_URL/catalog/offerings" -H "$AUTH_HEADER" -H "Content-Type: application/json" | head -c 500
echo ""
echo "   (first 500 chars above)"

# 4. GET Bulk orders (my orders)
echo ""
echo "4. GET /bulk-orders"
curl -s -X GET "$BASE_URL/bulk-orders" -H "$AUTH_HEADER" -H "Content-Type: application/json" | head -c 500
echo ""
echo "   (first 500 chars above)"

# 5. GET Suppliers
echo ""
echo "5. GET /bulk-orders/suppliers"
SUPPLIERS_RESPONSE=$(curl -s -X GET "$BASE_URL/bulk-orders/suppliers" -H "$AUTH_HEADER" -H "Content-Type: application/json")
echo "$SUPPLIERS_RESPONSE"
SUPPLIER_ID=""
if command -v jq &>/dev/null && [ "$(echo "$SUPPLIERS_RESPONSE" | jq 'type')" = "array" ]; then
  SUPPLIER_ID=$(echo "$SUPPLIERS_RESPONSE" | jq -r '.[0].id // empty')
fi

# 6. POST Bulk order (need supplier + fertilizer id from catalog or fertilizers list)
echo ""
echo "6. POST /bulk-orders (create order)"
CATALOG_RESPONSE=$(curl -s -X GET "$BASE_URL/catalog/offerings" -H "$AUTH_HEADER")
FERTILIZER_ID=""
if command -v jq &>/dev/null; then
  FERTILIZER_ID=$(echo "$CATALOG_RESPONSE" | jq -r '.[0].fertilizerId // empty')
  [ -z "$SUPPLIER_ID" ] && SUPPLIER_ID=$(echo "$SUPPLIERS_RESPONSE" | jq -r '.[0].id // empty')
  if [ -z "$FERTILIZER_ID" ] || [ "$FERTILIZER_ID" = "null" ]; then
    FERTILIZERS_RESPONSE=$(curl -s -X GET "$BASE_URL/fertilizers" -H "$AUTH_HEADER")
    FERTILIZER_ID=$(echo "$FERTILIZERS_RESPONSE" | jq -r '.[0].id // empty')
  fi
fi

if [ -n "$SUPPLIER_ID" ] && [ -n "$FERTILIZER_ID" ] && [ "$SUPPLIER_ID" != "null" ] && [ "$FERTILIZER_ID" != "null" ]; then
  CREATE_ORDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bulk-orders" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d "{\"supplierUserId\":$SUPPLIER_ID,\"lines\":[{\"fertilizerId\":$FERTILIZER_ID,\"quantity\":10,\"unitPrice\":50000}]}")
  CREATE_HTTP=$(echo "$CREATE_ORDER_RESPONSE" | tail -n1)
  CREATE_BODY=$(echo "$CREATE_ORDER_RESPONSE" | sed '$d')
  echo "   HTTP $CREATE_HTTP"
  echo "$CREATE_BODY" | head -c 400
  echo ""
  if [ "$CREATE_HTTP" = "201" ] || [ "$CREATE_HTTP" = "200" ]; then
    if command -v jq &>/dev/null; then
      ORDER_ID=$(echo "$CREATE_BODY" | jq -r '.id // empty')
      echo "   Created order id: $ORDER_ID"
    fi
  fi
else
  echo "   Skipped (no supplier or fertilizer id). Register a SUPPLIER and add offerings first."
fi

# 7. GET Payments (my)
echo ""
echo "7. GET /payments/my"
curl -s -X GET "$BASE_URL/payments/my" -H "$AUTH_HEADER" -H "Content-Type: application/json" | head -c 400
echo ""

# 8. POST Payment
echo ""
echo "8. POST /payments (create payment)"
PAYMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/payments" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"reference":"CURL-TEST-'$(date +%s)'","amount":100000}')
PAY_HTTP=$(echo "$PAYMENT_RESPONSE" | tail -n1)
echo "   HTTP $PAY_HTTP"
echo "$PAYMENT_RESPONSE" | sed '$d'

# 9. GET Deliveries
echo ""
echo "9. GET /logistics/deliveries"
curl -s -X GET "$BASE_URL/logistics/deliveries" -H "$AUTH_HEADER" -H "Content-Type: application/json" | head -c 400
echo ""

echo ""
echo "=== Sales Point API tests done ==="
