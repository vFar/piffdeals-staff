# ============================================
# CREATE 3 SIMPLE TEST ACCOUNTS
# ============================================
# Quick script to create one account for each role
# All accounts use password: test1234
# ============================================

# CONFIGURATION - These are already set from your project
$PROJECT_REF = "emqhyievrsyeinwrqqhw"
$SUPABASE_URL = "https://$PROJECT_REF.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"

# Edge Function URL
$EDGE_FUNCTION_URL = "$SUPABASE_URL/functions/v1/create-user"

# Password for all accounts
$GLOBAL_PASSWORD = "test1234"

# ============================================
# 3 TEST ACCOUNTS - One for each role
# ============================================
$testAccounts = @(
    @{ email = "employee@test.com"; username = "Test Employee"; role = "employee"; status = "active" },
    @{ email = "admin@test.com"; username = "Test Admin"; role = "admin"; status = "active" },
    @{ email = "superadmin@test.com"; username = "Test SuperAdmin"; role = "super_admin"; status = "active" }
)

# ============================================
# CREATE ACCOUNTS
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Creating 3 test accounts (one per role)..." -ForegroundColor Cyan
Write-Host "Password for all: $GLOBAL_PASSWORD" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($account in $testAccounts) {
    Write-Host "Creating: $($account.email) [$($account.role)]..." -NoNewline
    
    $body = @{
        email = $account.email
        password = $GLOBAL_PASSWORD
        username = $account.username
        role = $account.role
        status = $account.status
    } | ConvertTo-Json
    
    try {
        $headers = @{
            "Authorization" = "Bearer $ANON_KEY"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri $EDGE_FUNCTION_URL -Method Post -Body $body -Headers $headers -ErrorAction Stop
        
        if ($response.success) {
            Write-Host " ✓ SUCCESS" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ✗ FAILED: $($response.error)" -ForegroundColor Red
            $failCount++
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails | ConvertFrom-Json
            $errorMessage = $errorDetails.error
        }
        Write-Host " ✗ FAILED: $errorMessage" -ForegroundColor Red
        $failCount++
    }
    
    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Successful: $successCount / 3" -ForegroundColor $(if ($successCount -eq 3) { "Green" } else { "Yellow" })
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host ""
Write-Host "Test Accounts Created:" -ForegroundColor Yellow
Write-Host "  • employee@test.com      (password: test1234) - Employee role"
Write-Host "  • admin@test.com         (password: test1234) - Admin role"
Write-Host "  • superadmin@test.com    (password: test1234) - Super Admin role"
Write-Host "============================================" -ForegroundColor Cyan






