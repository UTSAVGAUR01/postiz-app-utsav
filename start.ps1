$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    $postgresSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    (Get-Content ".env") `
        -replace "change_this_postgres_password", $postgresSecret `
        -replace "change_this_to_a_long_random_secret_at_least_32_characters", $jwtSecret |
        Set-Content ".env"
}

docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps

& ".\scripts\smoke-test.ps1"

Write-Host "Postiz:     http://localhost:4007"
Write-Host "Temporal UI: http://localhost:8082"
