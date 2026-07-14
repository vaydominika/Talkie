param(
  [Parameter(Position = 0)]
  [ValidateSet("start", "stop", "status")]
  [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root ".local\postgresql\pgsql\bin"
$data = Join-Path $root ".local\postgres-data"
$log = Join-Path $root ".local\postgres.log"
$passwordFile = Join-Path $root ".local\postgres-password.tmp"
$port = if ($env:TALKIE_POSTGRES_PORT) { $env:TALKIE_POSTGRES_PORT } else { "5432" }
$password = "talkie_local_dev"

$initdb = Join-Path $bin "initdb.exe"
$pgCtl = Join-Path $bin "pg_ctl.exe"
$pgIsReady = Join-Path $bin "pg_isready.exe"
$psql = Join-Path $bin "psql.exe"
$createdb = Join-Path $bin "createdb.exe"

if (-not (Test-Path -LiteralPath $pgCtl)) {
  throw "Local PostgreSQL binaries are missing from .local/postgresql."
}

function Test-PostgresRunning {
  & $pgIsReady -h 127.0.0.1 -p $port -d postgres *> $null
  return $LASTEXITCODE -eq 0
}

if ($Action -eq "status") {
  if ((Test-Path -LiteralPath $data) -and (Test-PostgresRunning)) {
    Write-Output "Talkie PostgreSQL is running on localhost:$port."
    exit 0
  }
  Write-Output "Talkie PostgreSQL is stopped."
  exit 1
}

if ($Action -eq "stop") {
  if ((Test-Path -LiteralPath $data) -and (Test-PostgresRunning)) {
    & $pgCtl stop -D $data -m fast -w
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL did not stop cleanly." }
  }
  Write-Output "Talkie PostgreSQL is stopped."
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $data "PG_VERSION"))) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $data) | Out-Null
  Set-Content -LiteralPath $passwordFile -Value $password -NoNewline
  try {
    & $initdb -D $data -U postgres --pwfile=$passwordFile --auth=scram-sha-256 --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL cluster initialization failed." }
  } finally {
    Remove-Item -LiteralPath $passwordFile -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-PostgresRunning)) {
  & $pgCtl start -D $data -l $log -o "-p $port -h 127.0.0.1" -w
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL failed to start. See .local/postgres.log." }
}

$env:PGPASSWORD = $password
foreach ($database in @("talkie", "talkie_test")) {
  $databaseExists = & $psql -h 127.0.0.1 -p $port -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'"
  if ($LASTEXITCODE -ne 0) { throw "Could not connect to local PostgreSQL." }
  if (($databaseExists | Out-String).Trim() -ne "1") {
    & $createdb -h 127.0.0.1 -p $port -U postgres $database
    if ($LASTEXITCODE -ne 0) { throw "Could not create the $database database." }
  }
}

Write-Output "Talkie PostgreSQL is ready on localhost:$port (databases: talkie, talkie_test)."
