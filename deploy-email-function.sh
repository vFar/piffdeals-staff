#!/bin/bash
# Bash script to deploy send-invoice-email Edge Function to Supabase
# This function sends invoice links to customers via email

echo -e "\033[0;36mDeploying send-invoice-email Edge Function...\033[0m"

# Deploy the function
supabase functions deploy send-invoice-email --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "\033[0;32m========================================\033[0m"
    echo -e "\033[0;32mEdge Function Deployed Successfully!\033[0m"
    echo -e "\033[0;32m========================================\033[0m"
    echo ""
    echo -e "\033[0;33mIMPORTANT: Set the following environment variables in Supabase Dashboard:\033[0m"
    echo -e "\033[0;37m  -> Project Settings > Edge Functions > Environment Variables\033[0m"
    echo ""
    echo -e "\033[0;36mRequired Variables:\033[0m"
    echo -e "\033[1;37m  1. RESEND_API_KEY     = Your Resend API key (starts with re_)\033[0m"
    echo -e "\033[1;37m  2. FROM_EMAIL         = info@piffdeals.lv (recommended)\033[0m"
    echo -e "\033[1;37m  3. COMPANY_NAME       = Piffdeals\033[0m"
    echo -e "\033[1;37m  4. PUBLIC_SITE_URL    = https://staff.piffdeals.lv\033[0m"
    echo ""
    echo -e "\033[0;33mSetup Steps:\033[0m"
    echo -e "\033[0;37m  1. Go to: https://resend.com\033[0m"
    echo -e "\033[0;37m  2. Sign up (free tier: 3,000 emails/month)\033[0m"
    echo -e "\033[0;37m  3. Add domain 'piffdeals.lv' and verify DNS records\033[0m"
    echo -e "\033[0;37m  4. Get API Key from Dashboard\033[0m"
    echo -e "\033[0;37m  5. Set secrets in Supabase Dashboard\033[0m"
    echo ""
    echo -e "\033[0;36m📧 See RESEND_EMAIL_SETUP.md for detailed instructions!\033[0m"
    echo ""
else
    echo ""
    echo -e "\033[0;31mDeployment failed. Please check the error message above.\033[0m"
    echo ""
fi




