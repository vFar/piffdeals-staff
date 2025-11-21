# PowerShell script to deploy delete-old-drafts Edge Function
# This function automatically deletes draft invoices older than 3 days

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying delete-old-drafts Edge Function" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Deploy the function
Write-Host "Deploying function..." -ForegroundColor Yellow
supabase functions deploy delete-old-drafts --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Setup Cron Job (Manual Step Required)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To schedule this function to run automatically:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to Supabase Dashboard: https://app.supabase.com" -ForegroundColor White
    Write-Host "2. Select your project" -ForegroundColor White
    Write-Host "3. Go to Database > Extensions" -ForegroundColor White
    Write-Host "4. Enable 'pg_cron' extension if not already enabled" -ForegroundColor White
    Write-Host "5. Go to SQL Editor and run:" -ForegroundColor White
    Write-Host ""
    Write-Host "   SELECT cron.schedule(" -ForegroundColor Gray
    Write-Host "     'delete-old-draft-invoices'," -ForegroundColor Gray
    Write-Host "     '0 2 * * *'," -ForegroundColor Gray
    Write-Host "     `$`$" -ForegroundColor Gray
    Write-Host "     SELECT net.http_post(" -ForegroundColor Gray
    Write-Host "       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-old-drafts'," -ForegroundColor Gray
    Write-Host "       headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')" -ForegroundColor Gray
    Write-Host "     );" -ForegroundColor Gray
    Write-Host "     `$`$" -ForegroundColor Gray
    Write-Host "   );" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Note: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    Write-Host "   Schedule: '0 2 * * *' means daily at 2:00 AM UTC" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Test the Function" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can manually test the function by running:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  supabase functions invoke delete-old-drafts" -ForegroundColor White
    Write-Host ""
    Write-Host "Or via HTTP:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-old-drafts' \" -ForegroundColor White
    Write-Host "    -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
    Write-Host ""
}






