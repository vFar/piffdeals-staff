# ============================================
# Deploy Mozello Product Fetch Function
# ============================================
# This script deploys the fetch-mozello-products
# edge function to Supabase
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Mozello Product Fetch Function Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI installation..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor White
    exit 1
}
Write-Host "✅ Supabase CLI installed: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Step 1: Login to Supabase
Write-Host "Step 1: Login to Supabase" -ForegroundColor Yellow
Write-Host "If not logged in, a browser window will open..." -ForegroundColor Gray
supabase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to Supabase!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Link project
Write-Host "Step 2: Link Your Supabase Project" -ForegroundColor Yellow
Write-Host "Get your project reference ID from:" -ForegroundColor Gray
Write-Host "  https://supabase.com/dashboard > Your Project > Settings > General" -ForegroundColor White
Write-Host "  (Look for 'Reference ID' - example: emqhyievrsyeinwrqqhw)" -ForegroundColor White
Write-Host ""
$projectRef = Read-Host "Enter your project reference ID"

if ([string]::IsNullOrWhiteSpace($projectRef)) {
    Write-Host "❌ Project reference ID is required!" -ForegroundColor Red
    exit 1
}

supabase link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Project linked successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Set Mozello API Key
Write-Host "Step 3: Set Mozello API Key" -ForegroundColor Yellow
Write-Host "Your Mozello API Key (from mozelloService.js or Mozello dashboard):" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  WARNING: Keep this key secret! It will be stored securely in Supabase." -ForegroundColor Red
Write-Host ""
$mozelloApiKey = Read-Host "Enter your Mozello API Key (e.g., MZL-XXXXXXX-...)" -AsSecureString
$mozelloApiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($mozelloApiKey))

if ([string]::IsNullOrWhiteSpace($mozelloApiKeyPlain)) {
    Write-Host "❌ Mozello API Key is required!" -ForegroundColor Red
    exit 1
}

supabase secrets set MOZELLO_API_KEY="$mozelloApiKeyPlain"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set Mozello API key!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Mozello API Key set successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy function
Write-Host "Step 4: Deploy fetch-mozello-products function" -ForegroundColor Yellow
supabase functions deploy fetch-mozello-products
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy function!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  ✅ Edge Function Deployed Successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. The edge function is now deployed and secure" -ForegroundColor White
Write-Host "2. Your Mozello API key is safely stored in Supabase secrets" -ForegroundColor White
Write-Host "3. Test the invoice creation page to load products" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Remove the API key from mozelloService.js if you haven't already!" -ForegroundColor Yellow
Write-Host ""









