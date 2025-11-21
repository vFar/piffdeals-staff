#!/bin/bash

# Bash script to deploy Stripe-related Edge Functions to Supabase
# Run this in terminal: ./deploy-stripe-functions.sh

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Deploying Stripe Edge Functions${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
echo -e "${YELLOW}Checking for Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}ERROR: Supabase CLI is not installed!${NC}"
    echo -e "${RED}Please install it from: https://supabase.com/docs/guides/cli${NC}"
    echo -e "${YELLOW}Or run: npm install -g supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Check if user is logged in
echo -e "${YELLOW}Checking Supabase login status...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}You need to login to Supabase first${NC}"
    echo -e "${CYAN}Running: supabase login${NC}"
    supabase login
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to login to Supabase${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Logged in to Supabase${NC}"
echo ""

# Deploy create-stripe-payment-link function
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Deploying: create-stripe-payment-link${NC}"
echo -e "${CYAN}========================================${NC}"
supabase functions deploy create-stripe-payment-link --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ create-stripe-payment-link deployed successfully!${NC}"
else
    echo -e "${RED}✗ Failed to deploy create-stripe-payment-link${NC}"
    exit 1
fi

echo ""

# Deploy stripe-webhook function
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Deploying: stripe-webhook${NC}"
echo -e "${CYAN}========================================${NC}"
supabase functions deploy stripe-webhook --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ stripe-webhook deployed successfully!${NC}"
else
    echo -e "${RED}✗ Failed to deploy stripe-webhook${NC}"
    exit 1
fi

echo ""

# Deploy update-mozello-stock function
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Deploying: update-mozello-stock${NC}"
echo -e "${CYAN}========================================${NC}"
supabase functions deploy update-mozello-stock --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ update-mozello-stock deployed successfully!${NC}"
else
    echo -e "${RED}✗ Failed to deploy update-mozello-stock${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All Edge Functions deployed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${WHITE}1. Set up environment variables in Supabase Dashboard${NC}"
echo -e "${WHITE}   - STRIPE_SECRET_KEY${NC}"
echo -e "${WHITE}   - STRIPE_WEBHOOK_SECRET${NC}"
echo -e "${WHITE}   - MOZELLO_API_URL${NC}"
echo -e "${WHITE}   - MOZELLO_API_KEY${NC}"
echo ""
echo -e "${WHITE}2. Configure Stripe webhook in Stripe Dashboard${NC}"
echo -e "${WHITE}   URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook${NC}"
echo ""
echo -e "${WHITE}3. Run the database migrations (see STRIPE_PAYMENT_SETUP.md)${NC}"
echo ""
echo -e "${CYAN}See STRIPE_PAYMENT_SETUP.md for complete setup instructions${NC}"









