#!/bin/bash

# Bash script to deploy delete-old-drafts Edge Function
# This function automatically deletes draft invoices older than 3 days

echo "========================================"
echo "Deploying delete-old-drafts Edge Function"
echo "========================================"
echo ""

# Deploy the function
echo "Deploying function..."
supabase functions deploy delete-old-drafts --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Function deployed successfully!"
    echo ""
    echo "========================================"
    echo "Setup Cron Job (Manual Step Required)"
    echo "========================================"
    echo ""
    echo "To schedule this function to run automatically:"
    echo ""
    echo "1. Go to Supabase Dashboard: https://app.supabase.com"
    echo "2. Select your project"
    echo "3. Go to Database > Extensions"
    echo "4. Enable 'pg_cron' extension if not already enabled"
    echo "5. Go to SQL Editor and run:"
    echo ""
    echo "   SELECT cron.schedule("
    echo "     'delete-old-draft-invoices',"
    echo "     '0 2 * * *',"
    echo "     \$\$"
    echo "     SELECT net.http_post("
    echo "       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-old-drafts',"
    echo "       headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')"
    echo "     );"
    echo "     \$\$"
    echo "   );"
    echo ""
    echo "   Note: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY"
    echo "   Schedule: '0 2 * * *' means daily at 2:00 AM UTC"
    echo ""
    echo "========================================"
    echo "Test the Function"
    echo "========================================"
    echo ""
    echo "You can manually test the function by running:"
    echo ""
    echo "  supabase functions invoke delete-old-drafts"
    echo ""
    echo "Or via HTTP:"
    echo ""
    echo "  curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-old-drafts' \\"
    echo "    -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'"
    echo ""
else
    echo ""
    echo "✗ Deployment failed!"
    echo "Please check the error messages above."
    echo ""
fi






