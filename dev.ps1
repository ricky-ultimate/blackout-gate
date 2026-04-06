$ErrorActionPreference = "Stop"

foreach ($var in @("DATABASE_URL", "ADMIN_SECRET")) {
    if (-not (Test-Path "env:$var")) {
        Write-Error "$var is not set"
        exit 1
    }
}

docker compose up postgres -d

Set-Location api

if (-not $env:API_URL) {
    $env:API_URL = "http://localhost:3000"
}

npx tsx src/db/migrate.ts

$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:DATABASE_URL = $using:env:DATABASE_URL
    $env:ADMIN_SECRET = $using:env:ADMIN_SECRET
    npm run dev
}

Write-Host "Waiting for API server..."
do {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction SilentlyContinue
    } catch {
        $res = $null
    }
} while ($res -eq $null -or $res.StatusCode -ne 200)

Write-Host "API server ready."
Write-Host "Run 'npm run seed' from the api directory to bootstrap your org."
Write-Host "Run 'npm run dev' from the dashboard directory to start the dashboard on port 3001."

Wait-Job $apiJob
Receive-Job $apiJob
