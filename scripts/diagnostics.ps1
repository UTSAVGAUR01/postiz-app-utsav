$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force "test-reports" | Out-Null
$report = "test-reports/diagnostics-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

"Postiz diagnostics: $(Get-Date -Format o)`n" | Set-Content $report
"COMPOSE STATUS" | Add-Content $report
docker compose ps 2>&1 | Out-String | Add-Content $report
"`nRESOURCE USAGE" | Add-Content $report
$containerIds = docker compose ps -q
if ($containerIds) { docker stats --no-stream $containerIds 2>&1 | Out-String | Add-Content $report }

foreach ($service in @("postgres", "redis", "temporal", "temporal-ui", "postiz")) {
    "`nLOGS: $service" | Add-Content $report
    docker compose logs --no-color --tail=200 $service 2>&1 | Out-String | Add-Content $report
}
Write-Host "Diagnostic report: $report"
