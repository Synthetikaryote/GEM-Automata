[CmdletBinding()]
param(
    [string]$RuntimeRoot = 'C:\Claude\runtime\gem-automata',
    [string]$AutomationRoot = 'C:\Claude\automations\gem_automata_ci',
    [string]$LogDir = 'C:\Claude\logs\gem-automata',
    [string]$Node = 'C:\Program Files\nodejs\node.exe',
    [int]$Port = 8814,
    [switch]$StopOnly,
    [switch]$Deployment
)
$ErrorActionPreference = 'Stop'
$RuntimeRoot = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd('\')
if ((Split-Path -Leaf $RuntimeRoot) -ne 'gem-automata') { throw 'Invalid GEM Automata runtime path' }
$mutex = New-Object Threading.Mutex($false, 'Global\GemAutomata.Server')
$acquired = $false
try {
    try { $acquired = $mutex.WaitOne(5000) } catch [Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { return }
    $marker = Join-Path $AutomationRoot 'deploying.json'
    if (-not $Deployment -and (Test-Path -LiteralPath $marker)) {
        $deploymentState = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
        if (Get-Process -Id $deploymentState.pid -ErrorAction SilentlyContinue) { return }
    }
    $script = Join-Path $RuntimeRoot 'server.mjs'
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        $process = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $listener.OwningProcess)
        if ($process.Name -ne 'node.exe' -or $process.CommandLine.IndexOf($script, [StringComparison]::OrdinalIgnoreCase) -lt 0 -or
            $process.CommandLine -notmatch ("--port\s+{0}(?:\s|$)" -f $Port)) {
            throw "Port $Port is owned by another service; refusing to stop it"
        }
        if (-not $StopOnly) {
            $release = Get-Content -LiteralPath (Join-Path $RuntimeRoot '.release.json') -Raw | ConvertFrom-Json
            try {
                $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/healthz" -TimeoutSec 3
                if ($health.app -eq 'gem-automata' -and $health.commit -eq $release.commit) { return }
            } catch {}
        }
        Stop-Process -Id $listener.OwningProcess -Force
        foreach ($attempt in 1..30) {
            if (-not (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) { break }
            Start-Sleep -Milliseconds 100
        }
    }
    if ($StopOnly) { return }
    if (-not (Test-Path -LiteralPath $script)) { throw 'GEM Automata release is missing' }
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    $logToken = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    Start-Process -FilePath $Node -ArgumentList @(('"' + $script + '"'), '--root', ('"' + $RuntimeRoot + '"'), '--port', "$Port") `
        -WorkingDirectory $RuntimeRoot -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $LogDir "$logToken.out.log") -RedirectStandardError (Join-Path $LogDir "$logToken.err.log") | Out-Null
    $release = Get-Content -LiteralPath (Join-Path $RuntimeRoot '.release.json') -Raw | ConvertFrom-Json
    foreach ($attempt in 1..20) {
        Start-Sleep -Milliseconds 500
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/healthz" -TimeoutSec 2
            if ($health.app -eq 'gem-automata' -and $health.commit -eq $release.commit) { Write-Output 'GEM Automata release is healthy'; return }
        } catch {}
    }
    throw 'GEM Automata server failed to start; inspect its logs'
} finally {
    if ($acquired) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
