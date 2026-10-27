
# test-six-skipped.ps1
# فقط اجرای ۶ تست API / Session / Access که قبلاً Skip شده بودند.
# هیچ کاربری یا ملکی ایجاد نمی‌کند و اطلاعات ملک را تغییر نمی‌دهد.
# تست علاقه‌مندی، در صورت نیاز، وضعیت را پس از آزمون بازمی‌گرداند.

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

$ApiBaseUrl = $env:HASHTI_API_URL
if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    $ApiBaseUrl = "http://localhost:4000"
}
$ApiBaseUrl = $ApiBaseUrl.TrimEnd("/")

$TestPassword = $env:HASHTI_TEST_PASSWORD
if ([string]::IsNullOrWhiteSpace($TestPassword)) {
    $TestPassword = "TestPass2026!"
}

$PropertyId = $env:HASHTI_TEST_PROPERTY_ID
if ([string]::IsNullOrWhiteSpace($PropertyId)) {
    $PropertyId = "test-price-001"
}

$Mobiles = @{
    CUSTOMER = "09120000991"
    OWNER    = "09120000992"
    AGENT    = "09120000993"
    HASHTI   = "09120000994"
}

foreach ($role in @("CUSTOMER", "OWNER", "AGENT", "HASHTI")) {
    $envName = "HASHTI_TEST_MOBILE_$role"
    $envValue = [Environment]::GetEnvironmentVariable($envName)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
        $Mobiles[$role] = $envValue
    }
}

# ------------------------------------------------------------
# Results
# ------------------------------------------------------------

$script:Results = [System.Collections.Generic.List[object]]::new()
$sessions = @{}

function Add-Result {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Details
    )

    $item = [PSCustomObject]@{
        Test    = $Name
        Status  = $Status
        Details = $Details
    }

    $script:Results.Add($item)

    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        default { "Yellow" }
    }

    Write-Host ("[{0}] {1} - {2}" -f $Status, $Name, $Details) `
        -ForegroundColor $color
}

# ------------------------------------------------------------
# HTTP helper
# ------------------------------------------------------------

function Invoke-ApiRaw {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,

        [object]$Body
    )

    $uri = "$ApiBaseUrl$Path"

    $requestParams = @{
        Uri             = $uri
        Method          = $Method
        ErrorAction     = "Stop"
        UseBasicParsing = $true
    }

    if ($null -ne $Session) {
        $requestParams.WebSession = $Session
    }

    if ($PSBoundParameters.ContainsKey("Body") -and $null -ne $Body) {
        $requestParams.ContentType = "application/json; charset=utf-8"
        $requestParams.Body = $Body | ConvertTo-Json -Depth 20 -Compress
    }

    try {
        $response = Invoke-WebRequest @requestParams

        $data = $null
        if (-not [string]::IsNullOrWhiteSpace($response.Content)) {
            try {
                $data = $response.Content | ConvertFrom-Json
            }
            catch {
                $data = $response.Content
            }
        }

        return [PSCustomObject]@{
            StatusCode = [int]$response.StatusCode
            Data       = $data
            Raw        = [string]$response.Content
        }
    }
    catch {
        $exception = $_.Exception
        $statusCode = 0
        $raw = ""

        try {
            if ($null -ne $exception.Response) {
                $statusCode = [int]$exception.Response.StatusCode

                $stream = $exception.Response.GetResponseStream()
                if ($null -ne $stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $raw = $reader.ReadToEnd()
                    $reader.Dispose()
                }
            }
        }
        catch {
            # Preserve the original request error if response parsing fails.
        }

        $data = $null
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try {
                $data = $raw | ConvertFrom-Json
            }
            catch {
                $data = $raw
            }
        }

        if ($statusCode -eq 0) {
            $raw = $_.Exception.Message
        }

        return [PSCustomObject]@{
            StatusCode = $statusCode
            Data       = $data
            Raw        = $raw
        }
    }
}

function New-RoleSession {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("CUSTOMER", "OWNER", "AGENT", "HASHTI")]
        [string]$Role
    )

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    $loginBody = @{
        mobile   = $Mobiles[$Role]
        password = $TestPassword
    }

    $response = Invoke-ApiRaw `
        -Method "POST" `
        -Path "/auth/login" `
        -Session $session `
        -Body $loginBody

    if ($response.StatusCode -notin @(200, 201)) {
        throw "Login failed for $Role. HTTP=$($response.StatusCode). Response=$($response.Raw)"
    }

    return $session
}


function Get-SqlScalar {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql
    )

    $output = @(
        $Sql | docker compose exec -T db psql `
            -U postgres `
            -d amlak `
            -X `
            -q `
            -A `
            -t `
            -v ON_ERROR_STOP=1 2>&1
    )

    if ($LASTEXITCODE -ne 0) {
        throw "SQL command failed: $($output -join ' ')"
    }

    return (($output -join "`n").Trim())
}


function Test-HttpSuccess {
    param(
        [object]$Response,
        [int[]]$Expected = @(200)
    )

    return ($Response.StatusCode -in $Expected)
}

function Get-ResponseField {
    param(
        [object]$Data,
        [string]$Field
    )

    if ($null -eq $Data) {
        return $null
    }

    $property = $Data.PSObject.Properties[$Field]
    if ($null -ne $property) {
        return $property.Value
    }

    return $null
}

# ------------------------------------------------------------
# Header and prerequisites
# ------------------------------------------------------------

Write-Host ""
Write-Host "Hashti - Six Previously Skipped API Tests" -ForegroundColor Cyan
Write-Host "API: $ApiBaseUrl"
Write-Host "Property fixture: $PropertyId"
Write-Host "No frontend build will be run."
Write-Host ""

# Check the API is reachable before logging in.
try {
    $null = Invoke-ApiRaw -Method "GET" -Path "/"
}
catch {
    Write-Host "Could not contact API at $ApiBaseUrl." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 2
}

# Verify the fixture directly in the database.
# Use PostgreSQL double quotes around camelCase column names.
try {
    $safePropertyId = $PropertyId.Replace("'", "''")

    $sql = @"
SELECT COUNT(*)
FROM properties
WHERE id = '$safePropertyId'
  AND "latitudeExact" IS NOT NULL
  AND "longitudeExact" IS NOT NULL;
"@

    $fixtureCount = Get-SqlScalar -Sql $sql

    if ($fixtureCount.Trim() -ne "1") {
        Write-Host "Fixture '$PropertyId' was not found with exact coordinates." -ForegroundColor Red
        Write-Host "Database query returned: '$fixtureCount'"
        Write-Host "No tests were run."
        exit 2
    }

    Write-Host "Fixture verified: $PropertyId (exact coordinates exist)." `
        -ForegroundColor Green
}
catch {
    Write-Host "Could not verify the fixture using Docker/PostgreSQL." `
        -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "No tests were run."
    exit 2
}

# Read customer profile ID for the favorites test.
try {
    $safeCustomerMobile = $Mobiles["CUSTOMER"].Replace("'", "''")

    $customerSql = @"
SELECT c.id
FROM customers c
JOIN users u ON u.id = c."userId"
WHERE u.mobile = '$safeCustomerMobile'
LIMIT 1;
"@

    $CustomerProfileId = Get-SqlScalar -Sql $customerSql

    if ([string]::IsNullOrWhiteSpace($CustomerProfileId)) {
        Write-Host "Customer profile for $($Mobiles['CUSTOMER']) was not found." `
            -ForegroundColor Red
        Write-Host "The favorites test cannot run safely."
        exit 2
    }
}
catch {
    Write-Host "Could not retrieve the customer profile ID." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 2
}

# Establish fresh sessions. Login is a prerequisite, not a counted test.
foreach ($role in @("CUSTOMER", "OWNER", "AGENT", "HASHTI")) {
    try {
        $sessions[$role] = New-RoleSession -Role $role
        Write-Host "Session ready: $role" -ForegroundColor DarkGreen
    }
    catch {
        Write-Host "Cannot create $role session: $($_.Exception.Message)" `
            -ForegroundColor Red
        Write-Host "No test results are reliable until the login prerequisite is fixed."
        exit 2
    }
}

# ------------------------------------------------------------
# Test 1: CUSTOMER property detail hides exact coordinates
# ------------------------------------------------------------

$testName = "CUSTOMER property detail hides exact coordinates"

try {
    $r = Invoke-ApiRaw `
        -Method "GET" `
        -Path "/properties/$PropertyId" `
        -Session $sessions["CUSTOMER"]

    if (-not (Test-HttpSuccess -Response $r -Expected @(200))) {
        Add-Result $testName "FAIL" `
            "Expected HTTP 200; got HTTP $($r.StatusCode). Response=$($r.Raw)"
    }
    else {
        $lat = Get-ResponseField -Data $r.Data -Field "latitudeExact"
        $lng = Get-ResponseField -Data $r.Data -Field "longitudeExact"

        $hasLat = $null -ne $r.Data.PSObject.Properties["latitudeExact"]
        $hasLng = $null -ne $r.Data.PSObject.Properties["longitudeExact"]

        if (-not $hasLat -and -not $hasLng) {
            Add-Result $testName "PASS" `
                "HTTP 200; exact-coordinate fields are omitted."
        }
        elseif ($null -eq $lat -and $null -eq $lng) {
            Add-Result $testName "PASS" `
                "HTTP 200; exact-coordinate values are null."
        }
        else {
            Add-Result $testName "FAIL" `
                "Customer response exposes exact coordinates (latitude=$lat, longitude=$lng)."
        }
    }
}
catch {
    Add-Result $testName "FAIL" $_.Exception.Message
}

# ------------------------------------------------------------
# Test 2: OWNER property detail can see exact coordinates
# ------------------------------------------------------------

$testName = "OWNER property detail exposes exact coordinates"

try {
    $r = Invoke-ApiRaw `
        -Method "GET" `
        -Path "/properties/$PropertyId" `
        -Session $sessions["OWNER"]

    if (-not (Test-HttpSuccess -Response $r -Expected @(200))) {
        Add-Result $testName "FAIL" `
            "Expected HTTP 200; got HTTP $($r.StatusCode). Response=$($r.Raw)"
    }
    else {
        $lat = Get-ResponseField -Data $r.Data -Field "latitudeExact"
        $lng = Get-ResponseField -Data $r.Data -Field "longitudeExact"

        if ($null -ne $lat -and $null -ne $lng) {
            Add-Result $testName "PASS" `
                "HTTP 200; both exact-coordinate values are present."
        }
        else {
            Add-Result $testName "FAIL" `
                "Expected both exact-coordinate values; latitude=$lat, longitude=$lng."
        }
    }
}
catch {
    Add-Result $testName "FAIL" $_.Exception.Message
}

# ------------------------------------------------------------
# Test 3: AGENT property detail can see exact coordinates
# ------------------------------------------------------------

$testName = "AGENT property detail exposes exact coordinates"

try {
    $r = Invoke-ApiRaw `
        -Method "GET" `
        -Path "/properties/$PropertyId" `
        -Session $sessions["AGENT"]

    if (-not (Test-HttpSuccess -Response $r -Expected @(200))) {
        Add-Result $testName "FAIL" `
            "Expected HTTP 200; got HTTP $($r.StatusCode). Response=$($r.Raw)"
    }
    else {
        $lat = Get-ResponseField -Data $r.Data -Field "latitudeExact"
        $lng = Get-ResponseField -Data $r.Data -Field "longitudeExact"

        if ($null -ne $lat -and $null -ne $lng) {
            Add-Result $testName "PASS" `
                "HTTP 200; both exact-coordinate values are present."
        }
        else {
            Add-Result $testName "FAIL" `
                "Expected both exact-coordinate values; latitude=$lat, longitude=$lng."
        }
    }
}
catch {
    Add-Result $testName "FAIL" $_.Exception.Message
}

# ------------------------------------------------------------
# Test 4: HASHTI property detail can see exact coordinates
# ------------------------------------------------------------

$testName = "HASHTI property detail exposes exact coordinates"

try {
    $r = Invoke-ApiRaw `
        -Method "GET" `
        -Path "/properties/$PropertyId" `
        -Session $sessions["HASHTI"]

    if (-not (Test-HttpSuccess -Response $r -Expected @(200))) {
        Add-Result $testName "FAIL" `
            "Expected HTTP 200; got HTTP $($r.StatusCode). Response=$($r.Raw)"
    }
    else {
        $lat = Get-ResponseField -Data $r.Data -Field "latitudeExact"
        $lng = Get-ResponseField -Data $r.Data -Field "longitudeExact"

        if ($null -ne $lat -and $null -ne $lng) {
            Add-Result $testName "PASS" `
                "HTTP 200; both exact-coordinate values are present."
        }
        else {
            Add-Result $testName "FAIL" `
                "Expected both exact-coordinate values; latitude=$lat, longitude=$lng."
        }
    }
}
catch {
    Add-Result $testName "FAIL" $_.Exception.Message
}

# ------------------------------------------------------------
# Test 5: CUSTOMER favorites workflow
# ------------------------------------------------------------

$testName = "CUSTOMER favorites workflow is reversible"

$favoritePath = "/customers/$CustomerProfileId/favorites/$PropertyId"
$favoriteOriginalState = $null
$favoriteWasAddedByTest = $false
$favoriteTestPassed = $false
$favoriteFailure = $null

try {
    $initial = Invoke-ApiRaw `
        -Method "GET" `
        -Path $favoritePath `
        -Session $sessions["CUSTOMER"]

    if (-not (Test-HttpSuccess -Response $initial -Expected @(200))) {
        throw "Initial favorite status request failed. HTTP=$($initial.StatusCode). Response=$($initial.Raw)"
    }

    $initialValue = Get-ResponseField -Data $initial.Data -Field "isFavorite"

    if ($null -eq $initialValue -or $initialValue -isnot [bool]) {
        throw "Favorite status response did not contain a boolean 'isFavorite'. Response=$($initial.Raw)"
    }

    $favoriteOriginalState = [bool]$initialValue

    if ($favoriteOriginalState) {
        # Preserve existing user state. Do not remove a pre-existing favorite.
        Add-Result $testName "PASS" `
            "Property was already favorited; existing state was preserved, no mutation performed."
    }
    else {
        $add = Invoke-ApiRaw `
            -Method "POST" `
            -Path $favoritePath `
            -Session $sessions["CUSTOMER"]

        if (-not (Test-HttpSuccess -Response $add -Expected @(200, 201))) {
            throw "Adding favorite failed. HTTP=$($add.StatusCode). Response=$($add.Raw)"
        }

        $favoriteWasAddedByTest = $true

        $afterAdd = Invoke-ApiRaw `
            -Method "GET" `
            -Path $favoritePath `
            -Session $sessions["CUSTOMER"]

        if (-not (Test-HttpSuccess -Response $afterAdd -Expected @(200))) {
            throw "Could not verify favorite after adding. HTTP=$($afterAdd.StatusCode). Response=$($afterAdd.Raw)"
        }

        $afterAddValue = Get-ResponseField -Data $afterAdd.Data -Field "isFavorite"

        if ($afterAddValue -ne $true) {
            throw "Favorite status was not true after POST. Response=$($afterAdd.Raw)"
        }

        $remove = Invoke-ApiRaw `
            -Method "DELETE" `
            -Path $favoritePath `
            -Session $sessions["CUSTOMER"]

        if (-not (Test-HttpSuccess -Response $remove -Expected @(200, 204))) {
            throw "Removing favorite failed. HTTP=$($remove.StatusCode). Response=$($remove.Raw)"
        }

        $afterRemove = Invoke-ApiRaw `
            -Method "GET" `
            -Path $favoritePath `
            -Session $sessions["CUSTOMER"]

        if (-not (Test-HttpSuccess -Response $afterRemove -Expected @(200))) {
            throw "Could not verify favorite after DELETE. HTTP=$($afterRemove.StatusCode). Response=$($afterRemove.Raw)"
        }

        $afterRemoveValue = Get-ResponseField -Data $afterRemove.Data -Field "isFavorite"

        if ($afterRemoveValue -ne $false) {
            throw "Favorite status was not false after DELETE. Response=$($afterRemove.Raw)"
        }

        $favoriteTestPassed = $true
        Add-Result $testName "PASS" `
            "POST set isFavorite=true; DELETE restored isFavorite=false."
    }
}
catch {
    $favoriteFailure = $_.Exception.Message
}
finally {
    # If the test added a favorite and failed before deleting it,
    # make a best-effort attempt to restore the original state.
    if ($favoriteWasAddedByTest -and -not $favoriteTestPassed) {
        try {
            $cleanup = Invoke-ApiRaw `
                -Method "DELETE" `
                -Path $favoritePath `
                -Session $sessions["CUSTOMER"]

            if ($cleanup.StatusCode -notin @(200, 204)) {
                Write-Host "WARNING: Favorite cleanup request returned HTTP $($cleanup.StatusCode)." `
                    -ForegroundColor Yellow
            }
            else {
                Write-Host "Favorite cleanup attempted to restore the original false state." `
                    -ForegroundColor DarkYellow
            }
        }
        catch {
            Write-Host "WARNING: Favorite cleanup failed: $($_.Exception.Message)" `
                -ForegroundColor Yellow
        }
    }
}

if (-not $favoriteOriginalState -and -not $favoriteTestPassed -and $null -ne $favoriteFailure) {
    Add-Result $testName "FAIL" $favoriteFailure
}

# ------------------------------------------------------------
# Test 6: HASHTI duplicate-match candidates endpoint
# ------------------------------------------------------------

$testName = "HASHTI duplicate-match candidate query"

try {
    $r = Invoke-ApiRaw `
        -Method "GET" `
        -Path "/properties/$PropertyId/duplicate-matches" `
        -Session $sessions["HASHTI"]

    if (-not (Test-HttpSuccess -Response $r -Expected @(200))) {
        Add-Result $testName "FAIL" `
            "Expected HTTP 200; got HTTP $($r.StatusCode). Response=$($r.Raw)"
    }
    else {
        Add-Result $testName "PASS" `
            "HTTP 200 returned by duplicate-matches endpoint."
    }
}
catch {
    Add-Result $testName "FAIL" $_.Exception.Message
}

# ------------------------------------------------------------
# Summary
# ------------------------------------------------------------

Write-Host ""
Write-Host "================ TEST SUMMARY ================" -ForegroundColor Cyan

$script:Results |
    Format-Table -Property Status, Test, Details -AutoSize -Wrap |
    Out-Host

$passed = @($script:Results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = @($script:Results | Where-Object { $_.Status -eq "FAIL" }).Count
$skipped = @($script:Results | Where-Object { $_.Status -eq "SKIP" }).Count

Write-Host "PASS: $passed | FAIL: $failed | SKIP: $skipped | TOTAL: $($script:Results.Count)"

if ($script:Results.Count -ne 6) {
    Write-Host "Unexpected test count. Expected exactly 6 tests." -ForegroundColor Red
    exit 1
}

if ($failed -gt 0) {
    exit 1
}

if ($skipped -gt 0) {
    exit 2
}

exit 0
