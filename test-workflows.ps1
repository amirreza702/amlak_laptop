# Hashti - Safe Workflow Integration Checks
# Run from the project root (folder containing docker-compose.yml):
#   powershell -ExecutionPolicy Bypass -File .\test-workflows.ps1
#
# This suite uses existing test accounts and existing property fixtures only.
# It never creates users/properties/search requests, changes prices/status, reviews verification,
# archives properties, or deletes business data. The only business write is a reversible favorite
# add/remove, and it preserves a favorite that existed before the test.
# Session creation/deletion occurs as part of normal login/logout tests.

$ErrorActionPreference = 'Continue'
$script:Passed = 0; $script:Failed = 0; $script:Skipped = 0
$BaseApi = if ($env:HASHTI_API_URL) { $env:HASHTI_API_URL.TrimEnd('/') } else { 'http://localhost:4000' }
$BaseWeb = if ($env:HASHTI_WEB_URL) { $env:HASHTI_WEB_URL.TrimEnd('/') } else { 'http://localhost:3000' }
$Password = if ($env:HASHTI_TEST_PASSWORD) { $env:HASHTI_TEST_PASSWORD } else { 'TestPass2026!' }
$PropertyId = if ($env:HASHTI_TEST_PROPERTY_ID) { $env:HASHTI_TEST_PROPERTY_ID } else { 'shahrud-003' }
$CustomerMobile = if ($env:HASHTI_TEST_CUSTOMER_MOBILE) { $env:HASHTI_TEST_CUSTOMER_MOBILE } else { '09120000991' }
$OwnerMobile = if ($env:HASHTI_TEST_OWNER_MOBILE) { $env:HASHTI_TEST_OWNER_MOBILE } else { '09120000992' }
$AgentMobile = if ($env:HASHTI_TEST_AGENT_MOBILE) { $env:HASHTI_TEST_AGENT_MOBILE } else { '09120000993' }
$HashtiMobile = if ($env:HASHTI_TEST_HASHTI_MOBILE) { $env:HASHTI_TEST_HASHTI_MOBILE } else { '09120000994' }

function Write-Check([string]$Name, [string]$Status, [string]$Detail = '') {
  $color = switch ($Status) { 'PASS' {'Green'} 'FAIL' {'Red'} default {'Yellow'} }
  Write-Host ("[{0}] {1}{2}" -f $Status, $Name, $(if ($Detail) { " — $Detail" } else { '' })) -ForegroundColor $color
  switch ($Status) { 'PASS' {$script:Passed++} 'FAIL' {$script:Failed++} default {$script:Skipped++} }
}

function Invoke-Api {
  param([string]$Name, [string]$Method, [string]$Path, $Session = $null, $Body = $null, [int[]]$Expected = @(200), [switch]$JsonBody)
  $params = @{ Uri = "$BaseApi$Path"; Method = $Method; TimeoutSec = 15; UseBasicParsing = $true; ErrorAction = 'Stop' }
  if ($Session) { $params.WebSession = $Session }
  if ($JsonBody) { $params.ContentType = 'application/json'; $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress) }
  elseif ($null -ne $Body) { $params.Body = $Body }
  try {
    $r = Invoke-WebRequest @params
    $status = [int]$r.StatusCode; $data = $null
    if ($r.Content) { try { $data = $r.Content | ConvertFrom-Json -ErrorAction Stop } catch { $data = $r.Content } }
    if ($Expected -contains $status) { Write-Check $Name 'PASS' "HTTP $status" } else { Write-Check $Name 'FAIL' "HTTP $status; expected $($Expected -join ', ')" }
    return @{ Status = $status; Data = $data; Session = $Session; Raw = $r }
  } catch {
    $status = $null
    try { if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode } } catch {}
    if ($null -ne $status -and ($Expected -contains $status)) {
      Write-Check $Name 'PASS' "HTTP $status (expected denial/error)"
      return @{ Status = $status; Data = $null; Session = $Session; Raw = $null }
    }
    Write-Check $Name 'FAIL' ($_.Exception.Message)
    return @{ Status = $status; Data = $null; Session = $Session; Raw = $null }
  }
}

function New-RoleSession([string]$Role, [string]$Mobile) {
  $ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $login = Invoke-Api "$Role login" 'POST' '/auth/login' $ws @{ mobile = $Mobile; password = $Password } @(200) -JsonBody
  if ($login.Status -ne 200) { return $null }
  return $ws
}

Write-Host '====================================================' -ForegroundColor White
Write-Host ' هشتی — تست گردش‌کارهای امن و یکپارچه' -ForegroundColor White
Write-Host "API: $BaseApi | Web: $BaseWeb | Property: $PropertyId" -ForegroundColor Gray
Write-Host '====================================================' -ForegroundColor White

if (-not (Test-Path '.\docker-compose.yml') -and -not (Test-Path '.\compose.yml')) {
  Write-Check 'Run from project root' 'FAIL' 'docker-compose.yml پیدا نشد.'
  exit 2
}

# 1) Service availability and public entry points
try {
  $null = Invoke-WebRequest -Uri "$BaseWeb/" -TimeoutSec 12 -UseBasicParsing -ErrorAction Stop
  Write-Check 'Frontend home responds' 'PASS'
} catch { Write-Check 'Frontend home responds' 'FAIL' $_.Exception.Message }
$null = Invoke-Api 'Public property search' 'GET' '/properties/search' $null $null @(200)
$null = Invoke-Api 'Unauthenticated /auth/me is rejected' 'GET' '/auth/me' $null $null @(401,403)

# 2) Login all four roles and verify the session identity
$sessions = @{}
$accounts = @(
  @{ Role='CUSTOMER'; Mobile=$CustomerMobile },
  @{ Role='OWNER'; Mobile=$OwnerMobile },
  @{ Role='AGENT'; Mobile=$AgentMobile },
  @{ Role='HASHTI'; Mobile=$HashtiMobile }
)
foreach ($a in $accounts) {
  $s = New-RoleSession $a.Role $a.Mobile
  if ($null -ne $s) {
    $sessions[$a.Role] = $s
    $me = Invoke-Api "$($a.Role) session identity" 'GET' '/auth/me' $s $null @(200)
    if ($me.Status -eq 200 -and $me.Data.user.role -ne $a.Role) { Write-Check "$($a.Role) session role matches login" 'FAIL' "returned role=$($me.Data.user.role)" }
    elseif ($me.Status -eq 200) { Write-Check "$($a.Role) session role matches login" 'PASS' }
  }
}

# 3) Existing property detail and exact-coordinate visibility by role
$customer = $sessions['CUSTOMER']; $owner = $sessions['OWNER']; $agent = $sessions['AGENT']; $hashti = $sessions['HASHTI']
if ($customer) {
  $r = Invoke-Api 'CUSTOMER reads property detail' 'GET' "/properties/$PropertyId" $customer $null @(200)
  if ($r.Status -eq 200) {
    if ($r.Data.PSObject.Properties.Name -contains 'latitudeExact' -or $r.Data.PSObject.Properties.Name -contains 'longitudeExact') { Write-Check 'CUSTOMER cannot see exact coordinates' 'FAIL' 'Exact coordinate field is present.' }
    else { Write-Check 'CUSTOMER cannot see exact coordinates' 'PASS' }
  }
} else { Write-Check 'CUSTOMER property detail/coordinate privacy' 'SKIP' 'Login failed.' }
foreach ($entry in @(@{Role='OWNER';Session=$owner},@{Role='AGENT';Session=$agent},@{Role='HASHTI';Session=$hashti})) {
  if ($entry.Session) {
    $r = Invoke-Api "$($entry.Role) reads property detail" 'GET' "/properties/$PropertyId" $entry.Session $null @(200)
    if ($r.Status -eq 200) {
      if (($r.Data.PSObject.Properties.Name -contains 'latitudeExact') -and ($r.Data.PSObject.Properties.Name -contains 'longitudeExact')) { Write-Check "$($entry.Role) sees exact coordinate fields" 'PASS' }
      else { Write-Check "$($entry.Role) sees exact coordinate fields" 'FAIL' 'One or both exact coordinate fields are missing; fixture may not have coordinates.' }
    }
  } else { Write-Check "$($entry.Role) property detail" 'SKIP' 'Login failed.' }
}

# 4) Authorization denials: these requests must not mutate data
if ($customer) { $null = Invoke-Api 'CUSTOMER cannot register a property' 'POST' '/properties' $customer @{ title='must-not-be-created' } @(403) -JsonBody }
else { Write-Check 'CUSTOMER cannot register a property' 'SKIP' 'Login failed.' }
if ($customer) { $null = Invoke-Api 'CUSTOMER cannot open duplicate review workflow' 'POST' "/properties/$PropertyId/duplicate-reviews" $customer @{ candidatePropertyId='shahrud-005' } @(403) -JsonBody }
else { Write-Check 'CUSTOMER duplicate-review access denied' 'SKIP' 'Login failed.' }
if ($owner) { $null = Invoke-Api 'OWNER cannot access another user notification list' 'GET' '/notifications/user/00000000-0000-0000-0000-000000000000' $owner $null @(403) }
else { Write-Check 'OWNER cannot access another user notification list' 'SKIP' 'Login failed.' }
if ($customer) { $null = Invoke-Api 'CUSTOMER cannot access agent-only active search requests' 'GET' '/search-requests/active' $customer $null @(403) }
else { Write-Check 'CUSTOMER active-search-request access denied' 'SKIP' 'Login failed.' }
if ($owner) { $null = Invoke-Api 'OWNER cannot access agent-only active search requests' 'GET' '/search-requests/active' $owner $null @(403) }
else { Write-Check 'OWNER active-search-request access denied' 'SKIP' 'Login failed.' }

# 5) Customer favorites workflow: restore prior state exactly
if ($customer) {
  # Find profile ID via read-only SQL; never infer profile id from user id.
  $sql = "SELECT c.id FROM customers c JOIN users u ON u.id=c.`"userId`" WHERE u.mobile='$CustomerMobile' LIMIT 1;"
  $customerProfileId = (& docker compose exec -T db psql -U postgres -d amlak -At -c $sql 2>$null | Select-Object -First 1).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($customerProfileId)) {
    Write-Check 'Customer favorites reversible workflow' 'SKIP' 'Customer profile ID could not be read from PostgreSQL.'
  } else {
    $before = Invoke-Api 'Read favorite state before test' 'GET' "/customers/$customerProfileId/favorites/$PropertyId" $customer $null @(200)
    if ($before.Status -eq 200 -and $null -ne $before.Data.isFavorite) {
      $wasFavorite = [bool]$before.Data.isFavorite
      if (-not $wasFavorite) {
        $add = Invoke-Api 'Add test property to favorites' 'POST' "/customers/$customerProfileId/favorites/$PropertyId" $customer $null @(200,201) 
        if ($add.Status -in @(200,201)) {
          $check = Invoke-Api 'Verify favorite was added' 'GET' "/customers/$customerProfileId/favorites/$PropertyId" $customer $null @(200)
          if ($check.Status -eq 200 -and $check.Data.isFavorite -eq $true) { Write-Check 'Favorite state persisted' 'PASS' } elseif ($check.Status -eq 200) { Write-Check 'Favorite state persisted' 'FAIL' 'isFavorite was not true after add.' }
          $remove = Invoke-Api 'Restore favorite state (remove test favorite)' 'DELETE' "/customers/$customerProfileId/favorites/$PropertyId" $customer $null @(200)
          $after = Invoke-Api 'Verify favorite state restored' 'GET' "/customers/$customerProfileId/favorites/$PropertyId" $customer $null @(200)
          if ($after.Status -eq 200 -and $after.Data.isFavorite -eq $false) { Write-Check 'Favorite cleanup verified' 'PASS' } elseif ($after.Status -eq 200) { Write-Check 'Favorite cleanup verified' 'FAIL' 'Favorite still exists after cleanup.' }
        }
      } else {
        $list = Invoke-Api 'Read customer favorites list' 'GET' "/customers/$customerProfileId/favorites" $customer $null @(200)
        Write-Check 'Existing favorite preserved without mutation' 'PASS'
      }
    }
  }
} else { Write-Check 'Customer favorites reversible workflow' 'SKIP' 'Login failed.' }

# 6) Notifications are scoped to the signed-in user (read-only)
foreach ($entry in @(@{Role='CUSTOMER';Mobile=$CustomerMobile;Session=$customer},@{Role='OWNER';Mobile=$OwnerMobile;Session=$owner},@{Role='AGENT';Mobile=$AgentMobile;Session=$agent},@{Role='HASHTI';Mobile=$HashtiMobile;Session=$hashti})) {
  if ($entry.Session) {
    $uidSql = "SELECT id FROM users WHERE mobile='$($entry.Mobile)' LIMIT 1;"
    $uid = (& docker compose exec -T db psql -U postgres -d amlak -At -c $uidSql 2>$null | Select-Object -First 1).Trim()
    if ($uid) { $null = Invoke-Api "$($entry.Role) reads own notifications" 'GET' "/notifications/user/$uid" $entry.Session $null @(200) }
    else { Write-Check "$($entry.Role) own notifications" 'SKIP' 'Could not resolve test user ID.' }
  }
}

# 7) Duplicate-match candidate endpoint is read-only; access may depend on property ownership/assignment.
if ($hashti) { $null = Invoke-Api 'HASHTI can query duplicate candidates' 'GET' "/properties/$PropertyId/duplicate-matches" $hashti $null @(200) }
else { Write-Check 'HASHTI duplicate candidate query' 'SKIP' 'Login failed.' }

# 8) Logout invalidates session
if ($customer) {
  $null = Invoke-Api 'CUSTOMER logout' 'POST' '/auth/logout' $customer $null @(200)
  $null = Invoke-Api 'Logged-out session cannot access /auth/me' 'GET' '/auth/me' $customer $null @(401,403)
} else { Write-Check 'Logout invalidates session' 'SKIP' 'Customer login failed.' }

Write-Host "`n====================================================" -ForegroundColor White
Write-Host ("نتیجه: {0} PASS | {1} FAIL | {2} SKIP" -f $script:Passed,$script:Failed,$script:Skipped) -ForegroundColor White
Write-Host 'این مجموعه تست یکپارچه امن است، اما سناریوهای نوشتنی قیمت/وضعیت، تأیید مدارک، آرشیو و ایجاد درخواست را عمداً اجرا نمی‌کند.' -ForegroundColor Yellow
Write-Host 'برای تست کامل موفقیت‌آمیز آن سناریوها باید دیتابیس تست جدا و fixture قابل پاکسازی داشته باشیم؛ روی دیتابیس فعلی اجرا نشوند.' -ForegroundColor Yellow
if ($script:Failed -gt 0) { exit 1 } else { exit 0 }
