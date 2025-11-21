#!/bin/bash
# ============================================
# CREATE DUMMY ACCOUNTS FOR PIFFDEALS STAFF
# ============================================
# This bash script creates dummy test accounts
# by calling your Supabase Edge Function
# 
# All accounts use password: test1234
# ============================================

# CONFIGURATION - Update these values!
PROJECT_REF="YOUR_PROJECT_REF"  # e.g., "abcdefghijklmnop"
ANON_KEY="YOUR_ANON_KEY"  # Get this from Supabase Dashboard > Settings > API

# Derived values
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/create-user"
GLOBAL_PASSWORD="test1234"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================
# VALIDATION
# ============================================
if [ "$PROJECT_REF" = "YOUR_PROJECT_REF" ] || [ "$ANON_KEY" = "YOUR_ANON_KEY" ]; then
    echo -e "${RED}ERROR: Please update PROJECT_REF and ANON_KEY in this script first!${NC}"
    echo ""
    echo -e "${YELLOW}Get these values from: Supabase Dashboard > Settings > API${NC}"
    exit 1
fi

# ============================================
# DUMMY ACCOUNT DEFINITIONS
# ============================================
declare -a accounts=(
    "john.employee1@piffdeals.com|John Smith|employee|active"
    "jane.employee2@piffdeals.com|Jane Johnson|employee|active"
    "bob.employee3@piffdeals.com|Bob Williams|employee|active"
    "alice.employee4@piffdeals.com|Alice Brown|employee|active"
    "charlie.employee5@piffdeals.com|Charlie Jones|employee|active"
    "emma.employee6@piffdeals.com|Emma Garcia|employee|active"
    "david.employee7@piffdeals.com|David Miller|employee|active"
    "sarah.employee8@piffdeals.com|Sarah Davis|employee|inactive"
    "mike.employee9@piffdeals.com|Mike Rodriguez|employee|active"
    "lisa.employee10@piffdeals.com|Lisa Martinez|employee|active"
    "tom.admin1@piffdeals.com|Tom Wilson|admin|active"
    "amy.admin2@piffdeals.com|Amy Anderson|admin|active"
    "chris.admin3@piffdeals.com|Chris Taylor|admin|inactive"
    "rachel.superadmin1@piffdeals.com|Rachel Thomas|super_admin|active"
    "steve.superadmin2@piffdeals.com|Steve Moore|super_admin|suspended"
)

# ============================================
# CREATE ACCOUNTS
# ============================================
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Creating ${#accounts[@]} dummy accounts...${NC}"
echo -e "${CYAN}Password for all: ${GLOBAL_PASSWORD}${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

success_count=0
fail_count=0

for account in "${accounts[@]}"; do
    IFS='|' read -r email username role status <<< "$account"
    
    echo -n "Creating: ${email} (${role})... "
    
    # Create JSON payload
    json_payload=$(cat <<EOF
{
    "email": "${email}",
    "password": "${GLOBAL_PASSWORD}",
    "username": "${username}",
    "role": "${role}",
    "status": "${status}"
}
EOF
    )
    
    # Make the API call
    response=$(curl -s -X POST "${EDGE_FUNCTION_URL}" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "${json_payload}")
    
    # Check if successful
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}SUCCESS${NC}"
        ((success_count++))
    else
        error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo -e "${RED}FAILED: ${error_msg}${NC}"
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
echo "Total accounts: ${#accounts[@]}"
echo -e "Successful: ${GREEN}${success_count}${NC}"
if [ $fail_count -gt 0 ]; then
    echo -e "Failed: ${RED}${fail_count}${NC}"
else
    echo "Failed: ${fail_count}"
fi
echo ""
echo -e "${YELLOW}All accounts use password: ${GLOBAL_PASSWORD}${NC}"
echo -e "${CYAN}============================================${NC}"

echo ""
echo "Account Summary:"
echo "- 10 Employees (8 active, 1 inactive)"
echo "- 3 Admins (2 active, 1 inactive)"
echo "- 2 Super Admins (1 active, 1 suspended)"










