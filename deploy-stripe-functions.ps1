# PowerShell script to deploy Stripe-related Edge Functions to Supabase
# Run this in PowerShell: .\deploy-stripe-functions.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Stripe Edge Functions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking for Supabase CLI..." -ForegroundColor Yellow
$supabaseCLI = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCLI) {
    Write-Host "ERROR: Supabase CLI is not installed!" -ForegroundColor Red
    Write-Host "Please install it from: https://supabase.com/docs/guides/cli" -ForegroundColor Red
    Write-Host "Or run: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if user is logged in
Write-Host "Checking Supabase login status..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1

if ($loginCheck -like "*not logged in*" -or $loginCheck -like "*error*") {
    Write-Host "You need to login to Supabase first" -ForegroundColor Yellow
    Write-Host "Running: supabase login" -ForegroundColor Cyan
    supabase login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to login to Supabase" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Deploy create-stripe-payment-link function
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying: create-stripe-payment-link" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
supabase functions deploy create-stripe-payment-link --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ create-stripe-payment-link deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to deploy create-stripe-payment-link" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy stripe-webhook function
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying: stripe-webhook" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
supabase functions deploy stripe-webhook --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ stripe-webhook deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to deploy stripe-webhook" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy update-mozello-stock function
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying: update-mozello-stock" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
supabase functions deploy update-mozello-stock --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ update-mozello-stock deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to deploy update-mozello-stock" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ All Edge Functions deployed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Set up environment variables in Supabase Dashboard" -ForegroundColor White
Write-Host "   - STRIPE_SECRET_KEY" -ForegroundColor White
Write-Host "   - STRIPE_WEBHOOK_SECRET" -ForegroundColor White
Write-Host "   - MOZELLO_API_URL" -ForegroundColor White
Write-Host "   - MOZELLO_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "2. Configure Stripe webhook in Stripe Dashboard" -ForegroundColor White
Write-Host "   URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook" -ForegroundColor White
Write-Host ""
Write-Host "3. Run the database migrations (see STRIPE_PAYMENT_SETUP.md)" -ForegroundColor White
Write-Host ""
Write-Host "See STRIPE_PAYMENT_SETUP.md for complete setup instructions" -ForegroundColor Cyan


