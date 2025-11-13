# ============================================
# CREATE DUMMY ACCOUNTS FOR PIFFDEALS STAFF
# ============================================
# This PowerShell script creates dummy test accounts
# by calling your Supabase Edge Function
# 
# All accounts use password: test1234
# ============================================

# CONFIGURATION - Update these values!
$PROJECT_REF = "emqhyievrsyeinwrqqhw"  # Your Supabase project reference
$SUPABASE_URL = "https://$PROJECT_REF.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"  # Supabase anon key

# Edge Function URL
$EDGE_FUNCTION_URL = "$SUPABASE_URL/functions/v1/create-user"

# Password for all accounts
$GLOBAL_PASSWORD = "test1234"

# ============================================
# DUMMY ACCOUNT DEFINITIONS
# ============================================
$dummyAccounts = @(
    @{ email = "john.employee1@piffdeals.com"; username = "John Smith"; role = "employee"; status = "active" },
    @{ email = "jane.employee2@piffdeals.com"; username = "Jane Johnson"; role = "employee"; status = "active" },
    @{ email = "bob.employee3@piffdeals.com"; username = "Bob Williams"; role = "employee"; status = "active" },
    @{ email = "alice.employee4@piffdeals.com"; username = "Alice Brown"; role = "employee"; status = "active" },
    @{ email = "charlie.employee5@piffdeals.com"; username = "Charlie Jones"; role = "employee"; status = "active" },
    @{ email = "emma.employee6@piffdeals.com"; username = "Emma Garcia"; role = "employee"; status = "active" },
    @{ email = "david.employee7@piffdeals.com"; username = "David Miller"; role = "employee"; status = "active" },
    @{ email = "sarah.employee8@piffdeals.com"; username = "Sarah Davis"; role = "employee"; status = "inactive" },
    @{ email = "mike.employee9@piffdeals.com"; username = "Mike Rodriguez"; role = "employee"; status = "active" },
    @{ email = "lisa.employee10@piffdeals.com"; username = "Lisa Martinez"; role = "employee"; status = "active" },
    
    @{ email = "tom.admin1@piffdeals.com"; username = "Tom Wilson"; role = "admin"; status = "active" },
    @{ email = "amy.admin2@piffdeals.com"; username = "Amy Anderson"; role = "admin"; status = "active" },
    @{ email = "chris.admin3@piffdeals.com"; username = "Chris Taylor"; role = "admin"; status = "inactive" },
    
    @{ email = "rachel.superadmin1@piffdeals.com"; username = "Rachel Thomas"; role = "super_admin"; status = "active" },
    @{ email = "steve.superadmin2@piffdeals.com"; username = "Steve Moore"; role = "super_admin"; status = "suspended" }
)

# ============================================
# VALIDATION
# ============================================
if ($PROJECT_REF -eq "YOUR_PROJECT_REF" -or $ANON_KEY -eq "YOUR_ANON_KEY") {
    Write-Host "ERROR: Please update PROJECT_REF and ANON_KEY in this script first!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Get these values from: Supabase Dashboard > Settings > API" -ForegroundColor Yellow
    exit 1
}

# ============================================
# CREATE ACCOUNTS
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Creating $($dummyAccounts.Count) dummy accounts..." -ForegroundColor Cyan
Write-Host "Password for all: $GLOBAL_PASSWORD" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0
$results = @()

foreach ($account in $dummyAccounts) {
    Write-Host "Creating: $($account.email) ($($account.role))..." -NoNewline
    
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
            Write-Host " SUCCESS" -ForegroundColor Green
            $successCount++
            $results += [PSCustomObject]@{
                Email = $account.email
                Username = $account.username
                Role = $account.role
                Status = $account.status
                Result = "[OK] Created"
            }
        } else {
            Write-Host " FAILED: $($response.error)" -ForegroundColor Red
            $failCount++
            $results += [PSCustomObject]@{
                Email = $account.email
                Username = $account.username
                Role = $account.role
                Status = $account.status
                Result = "[FAIL] $($response.error)"
            }
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        if ($_.ErrorDetails) {
            $errorDetails = $_.ErrorDetails | ConvertFrom-Json
            $errorMessage = $errorDetails.error
        }
        Write-Host " FAILED: $errorMessage" -ForegroundColor Red
        $failCount++
        $results += [PSCustomObject]@{
            Email = $account.email
            Username = $account.username
            Role = $account.role
            Status = $account.status
            Result = "[FAIL] $errorMessage"
        }
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
Write-Host "Total accounts: $($dummyAccounts.Count)"
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host ""

# Display results table
$results | Format-Table -AutoSize

Write-Host ""
Write-Host "All accounts use password: $GLOBAL_PASSWORD" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan

