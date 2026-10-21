param(
  [ValidateSet("Start", "Stop", "Status")]
  [string]$Action = "Start"
)

$ErrorActionPreference = "Stop"
$appRepository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$appDirectory = Join-Path $appRepository "packages\execution-dashboard"
$appEntry = Join-Path $appDirectory "src\server.ts"
$appData = Join-Path $appDirectory ".data"
$appProcessFile = Join-Path $appData "local-app.json"
$appUrl = "http://127.0.0.1:4178"

function Get-AppResponse {
  try {
    $appResponse = Invoke-RestMethod "$appUrl/api/session" -TimeoutSec 2
    return $appResponse.identityMode -eq "local" -and $appResponse.minimumPasswordLength -eq 4
  } catch { return $false }
}

function Get-OwnedAppProcess {
  if (-not (Test-Path -LiteralPath $appProcessFile)) { return $null }
  $appRecorded = Get-Content -LiteralPath $appProcessFile -Raw | ConvertFrom-Json
  $appRunning = Get-Process -Id $appRecorded.id -ErrorAction SilentlyContinue
  if (-not $appRunning) { return $null }
  $appRecordedTime = [DateTime]$appRecorded.startedAt
  if ($appRunning.ProcessName -ne "node" -or $appRunning.StartTime.ToUniversalTime().Ticks -ne $appRecordedTime.ToUniversalTime().Ticks) {
    throw "The saved process no longer matches Permio. No process was stopped."
  }
  $appCommand = (Get-CimInstance Win32_Process -Filter "ProcessId = $($appRunning.Id)").CommandLine
  if (-not $appCommand -or -not $appCommand.Contains($appEntry)) {
    throw "Cannot verify the Permio process. No process was stopped."
  }
  return $appRunning
}

if ($Action -eq "Status") {
  if (Get-AppResponse) { Write-Output "Permio is running at $appUrl" }
  else { Write-Output "Permio is not responding at $appUrl"; exit 1 }
  exit
}

if ($Action -eq "Stop") {
  $appOwned = Get-OwnedAppProcess
  if ($appOwned) {
    Stop-Process -Id $appOwned.Id
    Write-Output "Stopped the Permio application. Accounts and workflows are preserved."
  } else { Write-Output "No running Permio process owned by this launcher was found." }
  exit
}

if (Get-AppResponse) {
  Write-Output "Permio is already running at $appUrl"
  exit
}
$appOwned = Get-OwnedAppProcess
if ($appOwned) { throw "The existing Permio process is not responding. Stop it with this script before restarting." }
if (Get-NetTCPConnection -LocalPort 4178 -State Listen -ErrorAction SilentlyContinue) {
  throw "Port 4178 is already in use. No existing process was stopped."
}
$appNode = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $appData -Force | Out-Null
$appSavedHost = $env:PERMIO_DASHBOARD_HOST
$appSavedPort = $env:PERMIO_DASHBOARD_PORT
$appSavedDemo = $env:PERMIO_APP_LOCAL_DEMO
try {
  $env:PERMIO_DASHBOARD_HOST = "127.0.0.1"
  $env:PERMIO_DASHBOARD_PORT = "4178"
  $env:PERMIO_APP_LOCAL_DEMO = "true"
  $appStarted = Start-Process -FilePath $appNode -ArgumentList ('"' + $appEntry + '"') -WorkingDirectory $appRepository -WindowStyle Hidden -RedirectStandardOutput (Join-Path $appData "local-app.stdout.log") -RedirectStandardError (Join-Path $appData "local-app.stderr.log") -PassThru
  @{ id = $appStarted.Id; startedAt = $appStarted.StartTime.ToUniversalTime().ToString("o") } | ConvertTo-Json | Set-Content -LiteralPath $appProcessFile
} finally {
  $env:PERMIO_DASHBOARD_HOST = $appSavedHost
  $env:PERMIO_DASHBOARD_PORT = $appSavedPort
  $env:PERMIO_APP_LOCAL_DEMO = $appSavedDemo
}
for ($appAttempt = 0; $appAttempt -lt 20; $appAttempt++) {
  if (Get-AppResponse) { Write-Output "Permio is running at $appUrl"; exit }
  if ($appStarted.HasExited) { throw "Permio stopped during startup. See packages/execution-dashboard/.data/local-app.stderr.log." }
  Start-Sleep -Milliseconds 250
}
throw "Permio did not become ready. Check its local logs; no other process was stopped."
