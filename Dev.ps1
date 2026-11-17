param(
    [ValidateSet("db", "backend", "frontend", "test", "build", "stop-db")]
    [string]$Mode = "db"
)
$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot ".runtime"
$databasePath = Join-Path $runtimeRoot "pgdata"
$pgBin = $env:PG_BIN
if (-not $pgBin) {
    $pgInstall = Get-ChildItem -LiteralPath "$env:ProgramFiles\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d+(\.\d+)*$' } |
        Sort-Object { [version]($_.Name + '.0') } -Descending | Select-Object -First 1
    if ($pgInstall) { $pgBin = Join-Path $pgInstall.FullName "bin" }
}
function Invoke-Checked([string]$File, [string[]]$Arguments) {
    $previousPreference = $ErrorActionPreference
    try {
        # Java/npm can write diagnostics to stderr even when they succeed.
        $ErrorActionPreference = "Continue"
        & $File @Arguments
        $commandExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($commandExit -ne 0) { throw "$File failed with exit code $commandExit" }
}
function Start-DemoDatabase {
    if (-not $pgBin -or -not (Test-Path (Join-Path $pgBin "initdb.exe"))) {
        throw "Install PostgreSQL, or set PG_BIN to its bin directory."
    }
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    if (-not (Test-Path (Join-Path $databasePath "PG_VERSION"))) {
        Invoke-Checked (Join-Path $pgBin "initdb.exe") @("-D", $databasePath, "-U", "warehouse_demo", "-A", "trust", "--encoding=UTF8", "--locale=C")
    }
    & (Join-Path $pgBin "pg_ctl.exe") -D $databasePath status *> $null
    if ($LASTEXITCODE -ne 0) {
        Invoke-Checked (Join-Path $pgBin "pg_ctl.exe") @("-D", $databasePath, "-l", (Join-Path $runtimeRoot "postgres.log"), "-o", "-h 127.0.0.1 -p 55432", "start")
    }
    foreach ($databaseName in @("warehouse_center", "warehouse_center_test")) {
        $exists = & (Join-Path $pgBin "psql.exe") -h 127.0.0.1 -p 55432 -U warehouse_demo -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='$databaseName'"
        if ($LASTEXITCODE -ne 0) { throw "Cannot connect to the dedicated demo database on port 55432." }
        if ($exists -ne "1") {
            Invoke-Checked (Join-Path $pgBin "createdb.exe") @("-h", "127.0.0.1", "-p", "55432", "-U", "warehouse_demo", $databaseName)
        }
    }
    Write-Host "Demo PostgreSQL: 127.0.0.1:55432 / warehouse_center / warehouse_demo"
}
$env:DEBUG = "false"
switch ($Mode) {
    "db" { Start-DemoDatabase }
    "stop-db" { Invoke-Checked (Join-Path $pgBin "pg_ctl.exe") @("-D", $databasePath, "stop", "-m", "fast") }
    "frontend" {
        Push-Location (Join-Path $projectRoot "frontend")
        try { if (-not (Test-Path node_modules)) { Invoke-Checked "npm.cmd" @("ci") }; Invoke-Checked "npm.cmd" @("run", "dev") } finally { Pop-Location }
    }
    default {
        if ($Mode -ne "build") { Start-DemoDatabase }
        Push-Location (Join-Path $projectRoot "backend")
        try {
            if ($Mode -eq "backend") {
                $env:DB_URL = "jdbc:postgresql://127.0.0.1:55432/warehouse_center"
                $env:DB_USER = "warehouse_demo"
                $env:DB_PASSWORD = ""
                $accessFile = Join-Path $runtimeRoot "local-access.json"
                if (-not $env:APP_PASSWORD) {
                    if (-not (Test-Path $accessFile)) {
                        $randomBytes = New-Object byte[] 24
                        $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
                        try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
                        $localPassword = "WC-" + [Convert]::ToBase64String($randomBytes)
                        @{username="admin";password=$localPassword} | ConvertTo-Json | Set-Content -LiteralPath $accessFile -Encoding UTF8
                    }
                    $localAccess = Get-Content -LiteralPath $accessFile -Raw | ConvertFrom-Json
                    $env:APP_USERNAME = $localAccess.username
                    $env:APP_PASSWORD = $localAccess.password
                }
                Write-Host "Authentication enabled. Initial local administrator details: $accessFile"
                Invoke-Checked ".\mvnw.cmd" @("-B", "-ntp", "spring-boot:run")
            } elseif ($Mode -eq "test") {
                $env:TEST_DB_URL = "jdbc:postgresql://127.0.0.1:55432/warehouse_center_test"
                $env:TEST_DB_USER = "warehouse_demo"
                $env:TEST_DB_PASSWORD = ""
                Invoke-Checked ".\mvnw.cmd" @("-B", "-ntp", "test")
            } else {
                Invoke-Checked ".\mvnw.cmd" @("-B", "-ntp", "-DskipTests", "package")
                Push-Location (Join-Path $projectRoot "frontend")
                try {
                    if (-not (Test-Path node_modules)) { Invoke-Checked "npm.cmd" @("ci") }
                    Invoke-Checked "npm.cmd" @("run", "build")
                } finally { Pop-Location }
            }
        } finally { Pop-Location }
    }
}
