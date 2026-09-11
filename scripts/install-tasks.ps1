[CmdletBinding()]
param(
    [string]$DevRoot = 'C:\Claude\dev\emberline',
    [string]$AutomationRoot = 'C:\Claude\automations\gem_automata_ci'
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $AutomationRoot, 'C:\Claude\logs\gem-automata', 'C:\Claude\data\gem-automata' | Out-Null
# Install a stable runner so a developer checking out a branch cannot replace CI.
foreach ($file in @('local_ci.py','run-ci.ps1','scheduled-task-launcher.vbs','ensure-server.ps1')) {
    Copy-Item -LiteralPath (Join-Path $DevRoot "scripts\$file") -Destination (Join-Path $AutomationRoot $file) -Force
}
$shim = Join-Path $AutomationRoot 'scheduled-task-launcher.vbs'
$python = (Get-Command python.exe).Source
$ciArgs = '//B //Nologo "{0}" "{1}" "-DevRoot" "{2}" "-AutomationRoot" "{3}" "-Python" "{4}"' -f $shim, (Join-Path $AutomationRoot 'run-ci.ps1'), $DevRoot, $AutomationRoot, $python
$ciAction = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument $ciArgs -WorkingDirectory $AutomationRoot
$ciTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$ciPrincipal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$ciSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 60) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden
Register-ScheduledTask -TaskName 'ClaudeGemAutomataCI' -Action $ciAction -Trigger $ciTrigger -Principal $ciPrincipal -Settings $ciSettings -Description 'Test exact GEM Automata PR/main commits locally, publish statuses, and release tested main.' -Force | Out-Null

$node = (Get-Command node.exe).Source
$serverArgs = '//B //Nologo "{0}" "{1}" "-Node" "{2}"' -f $shim, (Join-Path $AutomationRoot 'ensure-server.ps1'), $node
$serverAction = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument $serverArgs -WorkingDirectory $AutomationRoot
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $start = New-ScheduledTaskTrigger -AtStartup
} else {
    $principal = $ciPrincipal
    $start = New-ScheduledTaskTrigger -AtLogOn -User $user
}
$triggers = @($start, (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)))
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Seconds 45) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden
Register-ScheduledTask -TaskName 'ClaudeGemAutomataServer' -Action $serverAction -Trigger $triggers -Principal $principal -Settings $settings -Description 'Keep the read-only GEM Automata release healthy on 127.0.0.1:8814.' -Force | Out-Null
Start-ScheduledTask -TaskName 'ClaudeGemAutomataServer'
Write-Output 'Installed GEM Automata CI (5 minutes) and server watchdog (1 minute).'
