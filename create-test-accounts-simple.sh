#!/bin/bash

# ============================================
# CREATE 3 SIMPLE TEST ACCOUNTS
# ============================================
# Quick script to create one account for each role
# All accounts use password: test1234
# ============================================

# CONFIGURATION - These are already set from your project
PROJECT_REF="emqhyievrsyeinwrqqhw"
SUPABASE_URL="https://$PROJECT_REF.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"

# Edge Function URL
EDGE_FUNCTION_URL="$SUPABASE_URL/functions/v1/create-user"

# Password for all accounts
GLOBAL_PASSWORD="test1234"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================
# 3 TEST ACCOUNTS - One for each role
# ============================================
declare -a accounts=(
    "employee@test.com|Test Employee|employee|active"
    "admin@test.com|Test Admin|admin|active"
    "superadmin@test.com|Test SuperAdmin|super_admin|active"
)

# ============================================
# CREATE ACCOUNTS
# ============================================
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Creating 3 test accounts (one per role)...${NC}"
echo -e "${CYAN}Password for all: $GLOBAL_PASSWORD${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

success_count=0
fail_count=0

for account in "${accounts[@]}"; do
    IFS='|' read -r email username role status <<< "$account"
    
    echo -n "Creating: $email [$role]... "
    
    # Create JSON payload
    json_payload=$(cat <<EOF
{
  "email": "$email",
  "password": "$GLOBAL_PASSWORD",
  "username": "$username",
  "role": "$role",
  "status": "$status"
}
EOF
)
    
    # Make API call
    response=$(curl -s -X POST "$EDGE_FUNCTION_URL" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$json_payload")
    
    # Check if successful
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ SUCCESS${NC}"
        ((success_count++))
    else
        error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo -e "${RED}✗ FAILED: $error_msg${NC}"
        ((fail_count++))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
done

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}SUMMARY${NC}"
echo -e "${CYAN}============================================${NC}"

if [ $success_count -eq 3 ]; then
    echo -e "${GREEN}Successful: $success_count / 3${NC}"
else
    echo -e "${YELLOW}Successful: $success_count / 3${NC}"
fi

if [ $fail_count -gt 0 ]; then
    echo -e "${RED}Failed: $fail_count${NC}"
else
    echo -e "Failed: $fail_count"
fi

echo ""
echo -e "${YELLOW}Test Accounts Created:${NC}"
echo "  • employee@test.com      (password: test1234) - Employee role"
echo "  • admin@test.com         (password: test1234) - Admin role"
echo "  • superadmin@test.com    (password: test1234) - Super Admin role"
echo -e "${CYAN}============================================${NC}"






