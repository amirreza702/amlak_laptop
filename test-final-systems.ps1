# Hashti - Final Stage 6 Preflight Audit
# Run from the repository root (the folder containing docker-compose.yml):
#   powershell -ExecutionPolicy Bypass -File .\test-final-audit.ps1
# This script performs read-only checks except for a temporary frontend stop/start during production build.
# It does NOT run prisma db push/migrate, seed data, create users, or modify business records.

$ErrorActionPreference = 'Continue'
$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0

function Write-Check {
    param([string]$Name, [ValidateSet('PASS','FAIL','SKIP')][string]$Status, [string]$Detail = '')
    $color = switch ($Status) { 'PASS' { 'Green' } 'FAIL' { 'Red' } default { 'Yellow' } }
    Write-Host ("[{0}] {1}{2}" -f $Status, $Name, $(if ($Detail) { " — $Detail" } else { '' })) -ForegroundColor $color
    switch ($Status) { 'PASS' { $script:Passed++ } 'FAIL' { $script:Failed++ } 'SKIP' { $script:Skipped++ } }
}

function Invoke-CommandCheck {
    param([string]$Name, [string]$Command, [string[]]$Arguments)
    Write-Host "`n>> $Name" -ForegroundColor Cyan
    & $Command @Arguments
    $code = $LASTEXITCODE
    if ($code -eq 0) { Write-Check $Name 'PASS' } else { Write-Check $Name 'FAIL' "exit code $code" }
}

function Test-Http {
    param([string]$Name, [string]$Url, [int[]]$ExpectedStatus)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 12 -UseBasicParsing -ErrorAction Stop
        $status = [int]$response.StatusCode
        if ($ExpectedStatus -contains $status) { Write-Check $Name 'PASS' "HTTP $status" }
        else { Write-Check $Name 'FAIL' "HTTP $status; expected $($ExpectedStatus -join ', ')" }
    } catch {
        $status = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        if ($null -ne $status -and ($ExpectedStatus -contains $status)) {
            Write-Check $Name 'PASS' "HTTP $status (expected response)"
        } else {
            Write-Check $Name 'FAIL' ($_.Exception.Message)
        }
    }
}

Write-Host "==============================================" -ForegroundColor White
Write-Host " Hashti — Final Stage 6 Preflight Audit" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor White

if (-not (Test-Path '.\docker-compose.yml') -and -not (Test-Path '.\compose.yml')) {
    Write-Check 'Run from project root (compose file found)' 'FAIL' 'Open PowerShell in the folder containing docker-compose.yml.'
    exit 2
}
Write-Check 'Project root detected' 'PASS'

Write-Host "`n>> Docker Compose services" -ForegroundColor Cyan
$psOutput = & docker compose ps --format json 2>&1
$psCode = $LASTEXITCODE
if ($psCode -ne 0) {
    Write-Check 'Docker Compose status' 'FAIL' ($psOutput | Out-String).Trim()
    exit 2
}
$services = @()
try {
    foreach ($line in ($psOutput | ForEach-Object { "$_" })) {
        if (-not [string]::IsNullOrWhiteSpace($line)) { $services += ($line | ConvertFrom-Json) }
    }
} catch { $services = @() }
foreach ($serviceName in @('db','backend','frontend')) {
    $entry = $services | Where-Object { $_.Service -eq $serviceName } | Select-Object -First 1
    if ($entry -and ($entry.State -eq 'running' -or $entry.Status -match '^Up')) {
        Write-Check "Container service: $serviceName" 'PASS' $entry.Status
    } else {
        Write-Check "Container service: $serviceName" 'FAIL' 'Service is not running; start it with docker compose up -d.'
    }
}

Invoke-CommandCheck 'PostgreSQL readiness' 'docker' @('compose','exec','-T','db','pg_isready','-U','postgres','-d','amlak')
Invoke-CommandCheck 'Prisma schema validation (read-only)' 'docker' @('compose','exec','-T','backend','npx','prisma','validate')
Invoke-CommandCheck 'Backend TypeScript check' 'docker' @('compose','exec','-T','backend','npx','tsc','--noEmit')
Invoke-CommandCheck 'Frontend ESLint' 'docker' @('compose','exec','-T','frontend','npm','run','lint')

# Read-only HTTP smoke tests.
Test-Http 'Frontend home page' 'http://localhost:3000/' @(200)
Test-Http 'Frontend search page' 'http://localhost:3000/search' @(200)
Test-Http 'Anonymous session endpoint rejects unauthenticated request' 'http://localhost:4000/auth/me' @(401,403)

# Run the production build in an isolated one-off service container. Stop frontend first to avoid
# concurrent writes to the shared .next volume, then restore it if it was running beforehand.
$frontendWasRunning = $false
$runningNames = & docker compose ps --status running --services 2>$null
if ($runningNames -contains 'frontend') { $frontendWasRunning = $true }

if ($frontendWasRunning) {
    Write-Host "`n>> Temporarily stopping frontend for production build" -ForegroundColor Cyan
    & docker compose stop frontend | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Check 'Stop frontend before build' 'FAIL' "exit code $LASTEXITCODE"
        Write-Check 'Frontend production build' 'SKIP' 'Could not safely stop frontend.'
    } else {
        Write-Check 'Stop frontend before build' 'PASS'
        Write-Host "`n>> Frontend production build (one-off container)" -ForegroundColor Cyan
        & docker compose run --rm --no-deps frontend npm run build
        $buildCode = $LASTEXITCODE
        if ($buildCode -eq 0) { Write-Check 'Frontend production build/export' 'PASS' }
        else { Write-Check 'Frontend production build/export' 'FAIL' "exit code $buildCode" }
    }
    Write-Host "`n>> Restoring frontend service" -ForegroundColor Cyan
    & docker compose start frontend | Out-Host
    if ($LASTEXITCODE -eq 0) { Write-Check 'Restore frontend service' 'PASS' }
    else { Write-Check 'Restore frontend service' 'FAIL' "exit code $LASTEXITCODE; run docker compose up -d frontend manually." }
} else {
    Write-Check 'Frontend production build/export' 'SKIP' 'Frontend was not running; start the stack first so the script can safely manage the shared build volume.'
}

Write-Host "`n==============================================" -ForegroundColor White
Write-Host ("Results: {0} PASS | {1} FAIL | {2} SKIP" -f $script:Passed, $script:Failed, $script:Skipped) -ForegroundColor White
Write-Host "==============================================" -ForegroundColor White
Write-Host 'Note: This is a safe preflight audit, not a full business-flow integration suite.' -ForegroundColor Yellow
Write-Host 'It does not create/update/delete properties, users, favorites, notifications, verification records, price history, or duplicate-match fixtures.' -ForegroundColor Yellow
if ($script:Failed -gt 0) { exit 1 } else { exit 0 }
