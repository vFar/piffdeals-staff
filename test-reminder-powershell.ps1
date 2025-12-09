# PowerShell script to test reminder email function
# Run this script to trigger reminder emails

Write-Host "Testing Reminder Email Function..." -ForegroundColor Cyan
Write-Host ""

# Set up headers
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"
    "Content-Type" = "application/json"
}

# Test Mode (checks 1-5 days ago - more flexible for testing)
Write-Host "Running in TEST MODE (checks invoices 1-5 days ago)..." -ForegroundColor Yellow
$testUrl = "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true"

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method POST -Headers $headers
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "Response:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 10
    
    if ($result.reminders_sent -gt 0) {
        Write-Host ""
        Write-Host "✅ SUCCESS! $($result.reminders_sent) reminder email(s) sent!" -ForegroundColor Green
        Write-Host "Check your inbox for the reminder email." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️ No reminders sent. Check the message above for details." -ForegroundColor Yellow
        Write-Host "Make sure your invoice has:" -ForegroundColor Yellow
        Write-Host "  - issue_date = 1-5 days ago" -ForegroundColor Yellow
        Write-Host "  - sent_at IS NOT NULL (customer was notified)" -ForegroundColor Yellow
        Write-Host "  - status = 'sent' or 'pending'" -ForegroundColor Yellow
        Write-Host "  - last_reminder_email_sent IS NULL" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "To test PRODUCTION MODE (checks 3+ days ago), uncomment the code below:" -ForegroundColor Cyan
Write-Host ""

# Production Mode (checks 3+ days ago)
# Uncomment to test:
# Write-Host "Running in PRODUCTION MODE (checks invoices 3+ days ago)..." -ForegroundColor Yellow
# $prodUrl = "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder"
# $response = Invoke-WebRequest -Uri $prodUrl -Method POST -Headers $headers
# $result = $response.Content | ConvertFrom-Json
# $result | ConvertTo-Json -Depth 10
