$ErrorActionPreference = "Stop"

$BaseApi = "http://localhost:4000"
$CustomerMobile = "09120000991"
$CustomerPassword = "TestPass2026!"

Write-Host "`n=== Duplicate Review: CUSTOMER authorization test ===" -ForegroundColor Cyan
Write-Host "API: $BaseApi"

# 1. Read a property ID from PostgreSQL.
# SQL is piped through stdin to preserve PostgreSQL quoted identifiers.
$sql = 'SELECT id FROM properties WHERE "latitudeExact" IS NOT NULL AND "longitudeExact" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 1;'

$propertyOutput = $sql | docker compose exec -T db psql -U postgres -d amlak -t -A

if ($LASTEXITCODE -ne 0) {
    throw "Could not read a property ID from PostgreSQL."
}

$PropertyId = ($propertyOutput | Out-String).Trim()

if ([string]::IsNullOrWhiteSpace($PropertyId)) {
    throw "No property with exact coordinates was found. Test stopped."
}

Write-Host "Property ID: $PropertyId"

# 2. Create a temporary cookie container for the session.
$cookieJar = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 3. Log in as CUSTOMER.
$loginBody = @{
    mobile   = $CustomerMobile
    password = $CustomerPassword
} | ConvertTo-Json -Compress

try {
    $loginResponse = Invoke-WebRequest `
        -Uri "$BaseApi/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -WebSession $cookieJar `
        -UseBasicParsing

    Write-Host "Login HTTP status: $([int]$loginResponse.StatusCode)"
}
catch {
    $status = $null
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
    }

    Write-Host "Login failed. HTTP status: $status" -ForegroundColor Red
    Write-Host $_.Exception.Message
    throw "Test stopped because CUSTOMER login did not succeed."
}

# 4. Attempt to create a duplicate review as CUSTOMER.
$reviewBody = @{
    candidatePropertyId = "shahrud-005"
} | ConvertTo-Json -Compress

$reviewUrl = "$BaseApi/properties/$PropertyId/duplicate-reviews"

try {
    $response = Invoke-WebRequest `
        -Uri $reviewUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $reviewBody `
        -WebSession $cookieJar `
        -UseBasicParsing

    $statusCode = [int]$response.StatusCode
    $responseBody = $response.Content
}
catch {
    $statusCode = $null
    $responseBody = ""

    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode

        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                $reader.Dispose()
            }
        }
        catch {
            $responseBody = $_.Exception.Message
        }
    }
    else {
        $responseBody = $_.Exception.Message
    }
}

Write-Host "`n=== Result ===" -ForegroundColor Cyan
Write-Host "Request: POST $reviewUrl"
Write-Host "HTTP status: $statusCode"
Write-Host "Response body:"
Write-Host $responseBody

if ($statusCode -eq 403) {
    Write-Host "`nPASS: CUSTOMER was forbidden from creating a duplicate review." -ForegroundColor Green
    exit 0
}

if ($statusCode -eq 404) {
    Write-Host "`nFAIL: Received 404 instead of the expected 403." -ForegroundColor Red
    Write-Host "The route may not be matched, or middleware/controller may return 404."
    exit 1
}

if ($statusCode -eq 401) {
    Write-Host "`nFAIL: Request was unauthenticated (401)." -ForegroundColor Red
    Write-Host "Check session cookie handling and login response."
    exit 1
}

Write-Host "`nFAIL: Expected HTTP 403, but received $statusCode." -ForegroundColor Red
exit 1
