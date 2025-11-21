# PowerShell script to deploy send-invoice-email Edge Function to Supabase
# This function sends invoice links to customers via email

Write-Host "Deploying send-invoice-email Edge Function..." -ForegroundColor Cyan

# Deploy the function
supabase functions deploy send-invoice-email --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Edge Function Deployed Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Set the following environment variables in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  -> Project Settings > Edge Functions > Environment Variables" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Required Variables:" -ForegroundColor Cyan
    Write-Host "  1. RESEND_API_KEY     = Your Resend API key (starts with re_)" -ForegroundColor White
    Write-Host "  2. FROM_EMAIL         = info@piffdeals.lv (recommended)" -ForegroundColor White
    Write-Host "  3. COMPANY_NAME       = Piffdeals" -ForegroundColor White
    Write-Host "  4. PUBLIC_SITE_URL    = https://staff.piffdeals.lv" -ForegroundColor White
    Write-Host ""
    Write-Host "Setup Steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://resend.com" -ForegroundColor Gray
    Write-Host "  2. Sign up (free tier: 3,000 emails/month)" -ForegroundColor Gray
    Write-Host "  3. Add domain 'piffdeals.lv' and verify DNS records" -ForegroundColor Gray
    Write-Host "  4. Get API Key from Dashboard" -ForegroundColor Gray
    Write-Host "  5. Set secrets in Supabase Dashboard" -ForegroundColor Gray
    Write-Host ""
    Write-Host "See RESEND_EMAIL_SETUP.md for detailed instructions!" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Deployment failed. Please check the error message above." -ForegroundColor Red
    Write-Host ""
}




