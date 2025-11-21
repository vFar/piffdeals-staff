# Deploy Mark Overdue Invoices Edge Function
# This function marks invoices as overdue when due_date has passed

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Deploy Mark Overdue Invoices Function" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow

# Check multiple possible locations
$supabasePaths = @(
    "supabase",
    "$env:LOCALAPPDATA\supabase\supabase.exe",
    "$env:ProgramFiles\Supabase\supabase.exe"
)

$supabaseFound = $false
$supabaseCmd = $null

foreach ($path in $supabasePaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $SUPABASE_VERSION = & $path --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Supabase CLI found: $SUPABASE_VERSION" -ForegroundColor Green
            $supabaseFound = $true
            $supabaseCmd = $path
            break
        }
    }
}

if (-not $supabaseFound) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI using one of these methods:" -ForegroundColor Yellow
    Write-Host "1. Scoop: scoop install supabase" -ForegroundColor White
    Write-Host "2. Chocolatey: choco install supabase" -ForegroundColor White
    Write-Host "3. Download from: https://github.com/supabase/cli/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use npx to run without installation:" -ForegroundColor Yellow
    Write-Host "  npx supabase functions deploy mark-overdue-invoices" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Deploy function
Write-Host "Deploying mark-overdue-invoices function..." -ForegroundColor Yellow
& $supabaseCmd functions deploy mark-overdue-invoices
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy function!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  ✅ Function Deployed Successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set up cron job in Supabase SQL Editor:" -ForegroundColor White
Write-Host ""
Write-Host "-- Enable pg_cron extension (if not already enabled)" -ForegroundColor Gray
Write-Host "CREATE EXTENSION IF NOT EXISTS pg_cron;" -ForegroundColor Gray
Write-Host "CREATE EXTENSION IF NOT EXISTS pg_net;" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Get your project reference ID from Supabase Dashboard" -ForegroundColor Gray
Write-Host "-- Get your service role key from Settings > API" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Schedule daily check at 2 AM UTC" -ForegroundColor Gray
Write-Host "SELECT cron.schedule(" -ForegroundColor Gray
Write-Host "  'mark-overdue-invoices'," -ForegroundColor Gray
Write-Host "  '0 2 * * *', -- Daily at 2 AM UTC" -ForegroundColor Gray
Write-Host "  \$\$" -ForegroundColor Gray
Write-Host "  SELECT" -ForegroundColor Gray
Write-Host "    net.http_post(" -ForegroundColor Gray
Write-Host "      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mark-overdue-invoices'," -ForegroundColor Gray
Write-Host "      headers := jsonb_build_object(" -ForegroundColor Gray
Write-Host "        'Content-Type', 'application/json'," -ForegroundColor Gray
Write-Host "        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')" -ForegroundColor Gray
Write-Host "      )," -ForegroundColor Gray
Write-Host "      body := '{}'::jsonb" -ForegroundColor Gray
Write-Host "    ) AS request_id;" -ForegroundColor Gray
Write-Host "  \$\$" -ForegroundColor Gray
Write-Host ");" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test the function manually:" -ForegroundColor White
Write-Host "   supabase functions invoke mark-overdue-invoices" -ForegroundColor Gray
Write-Host ""


