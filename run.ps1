# run.ps1 - Launcher Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       GRAND HORIZON HOTEL MANAGEMENT SYSTEM LAUNCHER" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Seeding Database
Write-Host "[1/2] Seeding MySQL Database 'hotel_management'..." -ForegroundColor Yellow
$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$setupSql = Join-Path $PSScriptRoot "setup.sql"

if (Test-Path $setupSql) {
    Get-Content $setupSql | & $mysqlBin -u root -pKBvp9035?
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✔ Database seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Database seeding failed. Check if MySQL is running and password is correct." -ForegroundColor Red
        Exit
    }
} else {
    Write-Host "❌ Could not find setup.sql script!" -ForegroundColor Red
    Exit
}

# 2. Starting Server
Write-Host "[2/2] Launching Web Server..." -ForegroundColor Yellow
$nodeBin = "C:\Users\Admin\AppData\Local\ms-playwright-go\1.57.0\node.exe"
$serverJs = Join-Path $PSScriptRoot "server.js"

if (Test-Path $nodeBin) {
    Write-Host "✔ Server started at http://localhost:3000" -ForegroundColor Green
    Write-Host "Press Ctrl+C in this console to stop the server." -ForegroundColor Gray
    & $nodeBin $serverJs
} else {
    Write-Host "❌ Playwright Node.js binary was not found at $nodeBin!" -ForegroundColor Red
    Exit
}
