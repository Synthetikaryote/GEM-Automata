param(
    [string]$DevRoot = 'C:\Claude\dev\emberline',
    [string]$AutomationRoot = 'C:\Claude\automations\gem_automata_ci',
    [string]$Python = 'C:\Program Files\Python312\python.exe'
)
$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force -Path $AutomationRoot | Out-Null
& $Python -u (Join-Path $PSScriptRoot 'local_ci.py') --scheduled --dev $DevRoot --automation $AutomationRoot 2>&1 |
    Tee-Object -FilePath (Join-Path $AutomationRoot 'gem-ci.log') -Append
exit $LASTEXITCODE
