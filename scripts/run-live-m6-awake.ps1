[CmdletBinding()]
param([string[]]$LiveArguments = @())

$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'This optional sleep-prevention wrapper is Windows-only. Use npm run test:live:m6 directly on other systems.'
}

Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public static class PermioM6PowerRequest {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint flags);
}
'@

# ES_CONTINUOUS | ES_SYSTEM_REQUIRED. Do not request display-on or away mode,
# change power plans, or override the user's explicit sleep/lid action.
$m6PreviousExecutionState = [PermioM6PowerRequest]::SetThreadExecutionState([uint32]2147483649)
if ($m6PreviousExecutionState -eq 0) {
    throw 'Could not establish the test-scoped M6 sleep-prevention request.'
}
$m6ExitCode = 1
try {
    Write-Output 'M6 test-scoped automatic-sleep prevention active. Keep the laptop plugged in with its lid open.'
    Push-Location (Join-Path $PSScriptRoot '..')
    try {
        & npm.cmd run test:live:m6 -- @LiveArguments
        $m6ExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} finally {
    [void][PermioM6PowerRequest]::SetThreadExecutionState($m6PreviousExecutionState)
    Write-Output 'M6 test-scoped automatic-sleep prevention released.'
}
exit $m6ExitCode
