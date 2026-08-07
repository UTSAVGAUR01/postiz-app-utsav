$ErrorActionPreference = "Stop"
$maxAttempts = if ($env:SMOKE_MAX_ATTEMPTS) { [int]$env:SMOKE_MAX_ATTEMPTS } else { 36 }

Write-Host -NoNewline "Waiting for the Postiz test stack"
for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    $services = docker compose ps --format json | ConvertFrom-Json
    $notReady = @($services | Where-Object {
        $_.State -ne "running" -or ($_.Health -and $_.Health -ne "healthy")
    })
    if (@($services).Count -ge 5 -and $notReady.Count -eq 0) { break }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 5
}
Write-Host ""

if ($attempt -gt $maxAttempts) {
    docker compose ps
    throw "Services did not become healthy in time."
}

docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL check failed." }

$redisResult = docker compose exec -T redis redis-cli ping
if ($LASTEXITCODE -ne 0 -or $redisResult -notmatch "PONG") { throw "Redis check failed." }

$postizPort = if ($env:POSTIZ_PORT) { $env:POSTIZ_PORT } else { "4007" }
$response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$postizPort/auth" -TimeoutSec 15
if ($response.StatusCode -ne 200) { throw "Postiz returned HTTP $($response.StatusCode)." }

Write-Host "PASS: PostgreSQL, Redis, Temporal, Postiz, and HTTP checks succeeded." -ForegroundColor Green
