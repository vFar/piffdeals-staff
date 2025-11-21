# PowerShell script to deploy Supabase Edge Function
# Run this script from the project root directory

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Supabase Edge Function Deployment" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Or using Scoop:" -ForegroundColor Yellow
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor White
    exit 1
}

Write-Host "✅ Supabase CLI installed: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Login to Supabase" -ForegroundColor Yellow
Write-Host "This will open your browser..." -ForegroundColor Gray
$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    exit 0
}

supabase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Link project
Write-Host "Step 2: Link your Supabase project" -ForegroundColor Yellow
Write-Host "Get your project reference ID from:" -ForegroundColor Gray
Write-Host "  https://supabase.com/dashboard > Your Project > Settings > General" -ForegroundColor White
Write-Host ""
$projectRef = Read-Host "Enter your project reference ID (e.g., emqhyievrsyeinwrqqhw)"

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

# Step 3: Set service role key
Write-Host "Step 3: Set Service Role Key" -ForegroundColor Yellow
Write-Host "Get your service_role key from:" -ForegroundColor Gray
Write-Host "  https://supabase.com/dashboard > Your Project > Settings > API" -ForegroundColor White
Write-Host "  (Copy the 'service_role' secret key)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  WARNING: Keep this key secret! Never commit it to git." -ForegroundColor Red
Write-Host ""
$serviceRoleKey = Read-Host "Enter your service_role key" -AsSecureString
$serviceRoleKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRoleKey))

if ([string]::IsNullOrWhiteSpace($serviceRoleKeyPlain)) {
    Write-Host "❌ Service role key is required!" -ForegroundColor Red
    exit 1
}

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$serviceRoleKeyPlain"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set service role key!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Service role key set successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy function
Write-Host "Step 4: Deploy create-user function" -ForegroundColor Yellow
supabase functions deploy create-user
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy function!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  ✅ Edge Function Deployed Successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your function is now available at:" -ForegroundColor Cyan
Write-Host "  https://$projectRef.supabase.co/functions/v1/create-user" -ForegroundColor White
Write-Host ""
Write-Host "You can now create users through your application!" -ForegroundColor Green
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  supabase functions logs create-user --follow" -ForegroundColor White
Write-Host ""










