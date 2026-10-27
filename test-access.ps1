
# Hashti access audit - ASCII-only PowerShell script

$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:4000"
$Results = [System.Collections.Generic.List[object]]::new()
$Sessions = @{}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Session = $null,
        [object]$Body = $null
    )

    $p = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        UseBasicParsing = $true
        TimeoutSec = 20
    }

    if ($null -ne $Session) { $p.WebSession = $Session }

    if ($null -ne $Body) {
        $p.ContentType = "application/json"
        $p.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }

    try {
        $r = Invoke-WebRequest @p
        return [pscustomobject]@{
            Status = [int]$r.StatusCode
            Content = [string]$r.Content
        }
    }
    catch {
        $status = 0
        $content = $_.Exception.Message

        if ($null -ne $_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
            if ($_.ErrorDetails.Message) {
                $content = $_.ErrorDetails.Message
            }
        }

        return [pscustomobject]@{
            Status = $status
            Content = $content
        }
    }
}

function Add-Result {
    param(
        [string]$Name,
        [object]$Expected,
        [object]$Actual,
        [string]$Detail = ""
    )

    $pass = "$Expected" -eq "$Actual"

    $Results.Add([pscustomobject]@{
        Result = $(if ($pass) { "PASS" } else { "FAIL" })
        Test = $Name
        Expected = $Expected
        Actual = $Actual
        Detail = $Detail
    })

    if ($pass) {
        Write-Host "[PASS] $Name" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $Name - expected=$Expected actual=$Actual $Detail" -ForegroundColor Red
    }
}

function Add-Check {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail = ""
    )

    $actual = if ($Passed) { "YES" } else { "NO" }
    $expected = "YES"

    $Results.Add([pscustomobject]@{
        Result = $(if ($Passed) { "PASS" } else { "FAIL" })
        Test = $Name
        Expected = $expected
        Actual = $actual
        Detail = $Detail
    })

    if ($Passed) {
        Write-Host "[PASS] $Name" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $Name - $Detail" -ForegroundColor Red
    }
}

function Read-PasswordText {
    param([string]$Prompt)

    $secure = Read-Host $Prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

    try {
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Parse-Json {
    param([string]$Text)
    try { return ($Text | ConvertFrom-Json) } catch { return $null }
}

function Get-Field {
    param([object]$Object, [string]$Name)

    if ($null -eq $Object) { return $null }

    $p = $Object.PSObject.Properties |
        Where-Object { $_.Name -ieq $Name } |
        Select-Object -First 1

    if ($null -eq $p) { return $null }
    return $p.Value
}

Write-Host ""
Write-Host "=== HASHTI ACCESS AUDIT ===" -ForegroundColor Cyan

# Anonymous request
$anon = Invoke-Api -Method "GET" -Path "/auth/me"
Add-Result "Anonymous GET /auth/me" 401 $anon.Status

# Existing property ID
$propertyId = Read-Host "Enter an existing Property ID"
if ([string]::IsNullOrWhiteSpace($propertyId)) {
    Write-Host "Property ID is required." -ForegroundColor Red
    exit 1
}

$propertyId = $propertyId.Trim()

# Login to existing test accounts.
$roles = @("CUSTOMER", "OWNER", "AGENT", "HASHTI")

foreach ($role in $roles) {
    Write-Host ""
    Write-Host "Login for role: $role" -ForegroundColor Cyan

    $mobile = Read-Host "Mobile number"
    $password = Read-PasswordText "Password"

    $webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $login = Invoke-Api -Method "POST" -Path "/auth/login" `
        -Session $webSession `
        -Body @{ mobile = $mobile.Trim(); password = $password }

    $password = $null

    Add-Result "$role login" 200 $login.Status

    if ($login.Status -ne 200) { continue }

    $loginJson = Parse-Json $login.Content
    $loginUser = Get-Field $loginJson "user"
    $returnedRole = Get-Field $loginUser "role"

    Add-Check "$role login returns matching role" `
        ([string]$returnedRole -eq $role) `
        "Returned role: $returnedRole"

    $Sessions[$role] = $webSession

    $me = Invoke-Api -Method "GET" -Path "/auth/me" -Session $webSession
    Add-Result "$role GET /auth/me" 200 $me.Status
}

# Exact coordinate visibility
Write-Host ""
Write-Host "=== EXACT COORDINATE VISIBILITY ===" -ForegroundColor Cyan

foreach ($role in $roles) {
    if (-not $Sessions.ContainsKey($role)) {
        Add-Check "$role coordinate test completed" $false "Login failed; skipped"
        continue
    }

    $r = Invoke-Api -Method "GET" `
        -Path "/properties/$propertyId" `
        -Session $Sessions[$role]

    Add-Result "$role GET property detail" 200 $r.Status
    if ($r.Status -ne 200) { continue }

    $data = Parse-Json $r.Content
    if ($null -eq $data) {
        Add-Check "$role property response is valid JSON" $false "Invalid JSON response"
        continue
    }

    $names = @($data.PSObject.Properties.Name)
    $hasLat = $names -contains "latitudeExact"
    $hasLon = $names -contains "longitudeExact"

    if ($role -eq "CUSTOMER") {
        Add-Check "CUSTOMER latitudeExact is hidden" (-not $hasLat)
        Add-Check "CUSTOMER longitudeExact is hidden" (-not $hasLon)
    }
    else {
        Add-Check "$role latitudeExact is returned" ($hasLat -and $null -ne $data.latitudeExact)
        Add-Check "$role longitudeExact is returned" ($hasLon -and $null -ne $data.longitudeExact)
    }
}

# Read-only duplicate-review role tests
Write-Host ""
Write-Host "=== DUPLICATE REVIEW ACCESS ===" -ForegroundColor Cyan

$duplicatePath = "/properties/$propertyId/duplicate-reviews"

foreach ($role in @("CUSTOMER", "OWNER", "AGENT")) {
    if (-not $Sessions.ContainsKey($role)) {
        Add-Check "$role blocked from duplicate reviews" $false "Login failed; skipped"
        continue
    }

    $r = Invoke-Api -Method "GET" `
        -Path $duplicatePath `
        -Session $Sessions[$role]

    Add-Result "$role duplicate review access denied" 403 $r.Status
}

if ($Sessions.ContainsKey("HASHTI")) {
    $r = Invoke-Api -Method "GET" `
        -Path $duplicatePath `
        -Session $Sessions["HASHTI"]

    Add-Result "HASHTI duplicate review access allowed" 200 $r.Status
}
else {
    Add-Check "HASHTI duplicate review access allowed" $false "Login failed; skipped"
}

# Summary
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
$Results | Format-Table -AutoSize -Wrap

$passed = @($Results | Where-Object Result -eq "PASS").Count
$failed = @($Results | Where-Object Result -eq "FAIL").Count

Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -gt 0) { exit 1 }
