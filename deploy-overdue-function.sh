#!/bin/bash
# Deploy Mark Overdue Invoices Edge Function
# This function marks invoices as overdue when due_date has passed

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;37m'
NC='\033[0m'

echo -e "${CYAN}==========================================="
echo -e "  Deploy Mark Overdue Invoices Function"
echo -e "===========================================${NC}"
echo ""

# Check if Supabase CLI is installed
echo -e "${YELLOW}Checking Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please install Supabase CLI first:${NC}"
    echo -e "${GRAY}  npm install -g supabase${NC}"
    echo ""
    exit 1
fi

SUPABASE_VERSION=$(supabase --version)
echo -e "${GREEN}✅ Supabase CLI installed: $SUPABASE_VERSION${NC}"
echo ""

# Deploy function
echo -e "${YELLOW}Deploying mark-overdue-invoices function...${NC}"
supabase functions deploy mark-overdue-invoices
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to deploy function!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}==========================================="
echo -e "  ✅ Function Deployed Successfully!"
echo -e "===========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${GRAY}1. Set up cron job in Supabase SQL Editor"
echo -e "2. Test the function: supabase functions invoke mark-overdue-invoices${NC}"
echo ""




