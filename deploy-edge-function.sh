#!/bin/bash
# Bash script to deploy Supabase Edge Function
# Run this script from the project root directory

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;37m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================="
echo -e "  Supabase Edge Function Deployment"
echo -e "===========================================${NC}"
echo ""

# Check if Supabase CLI is installed
echo -e "${YELLOW}Checking Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please install Supabase CLI first:${NC}"
    echo -e "${WHITE}  npm install -g supabase${NC}"
    echo ""
    exit 1
fi

SUPABASE_VERSION=$(supabase --version)
echo -e "${GREEN}✅ Supabase CLI installed: $SUPABASE_VERSION${NC}"
echo ""

# Step 1: Login
echo -e "${YELLOW}Step 1: Login to Supabase${NC}"
echo -e "${GRAY}This will open your browser...${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

supabase login
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Login failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Logged in successfully${NC}"
echo ""

# Step 2: Link project
echo -e "${YELLOW}Step 2: Link your Supabase project${NC}"
echo -e "${GRAY}Get your project reference ID from:${NC}"
echo -e "${WHITE}  https://supabase.com/dashboard > Your Project > Settings > General${NC}"
echo ""
read -p "Enter your project reference ID (e.g., emqhyievrsyeinwrqqhw): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Project reference ID is required!${NC}"
    exit 1
fi

supabase link --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to link project!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Project linked successfully${NC}"
echo ""

# Step 3: Set service role key
echo -e "${YELLOW}Step 3: Set Service Role Key${NC}"
echo -e "${GRAY}Get your service_role key from:${NC}"
echo -e "${WHITE}  https://supabase.com/dashboard > Your Project > Settings > API${NC}"
echo -e "${WHITE}  (Copy the 'service_role' secret key)${NC}"
echo ""
echo -e "${RED}⚠️  WARNING: Keep this key secret! Never commit it to git.${NC}"
echo ""
read -sp "Enter your service_role key: " SERVICE_ROLE_KEY
echo ""

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Service role key is required!${NC}"
    exit 1
fi

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to set service role key!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Service role key set successfully${NC}"
echo ""

# Step 4: Deploy function
echo -e "${YELLOW}Step 4: Deploy create-user function${NC}"
supabase functions deploy create-user
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to deploy function!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}==========================================="
echo -e "  ✅ Edge Function Deployed Successfully!"
echo -e "===========================================${NC}"
echo ""
echo -e "${CYAN}Your function is now available at:${NC}"
echo -e "${WHITE}  https://$PROJECT_REF.supabase.co/functions/v1/create-user${NC}"
echo ""
echo -e "${GREEN}You can now create users through your application!${NC}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "${WHITE}  supabase functions logs create-user --follow${NC}"
echo ""



