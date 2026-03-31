$ErrorActionPreference = "Stop"

docker compose up postgres -d

Set-Location api

$env:DATABASE_URL = "postgresql://postgres:BRNXMNXTTX@localhost:5432/blackout_gate"
$env:ADMIN_SECRET = "a39b6f72dbe439c6aa77bde8df2f8f5fc2369184245ea4098fd16c2b02ccb704"
$env:API_URL = "http://localhost:3000"

npx tsx src/db/migrate.ts

$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:DATABASE_URL = "postgresql://postgres:BRNXMNXTTX@localhost:5432/blackout_gate"
    $env:ADMIN_SECRET = "a39b6f72dbe439c6aa77bde8df2f8f5fc2369184245ea4098fd16c2b02ccb704"
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
