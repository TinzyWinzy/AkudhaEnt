$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$envFile = Join-Path $projectRoot '.env.backup'
if (-not (Test-Path -LiteralPath $envFile)) { throw "Missing $envFile" }
foreach ($line in Get-Content -LiteralPath $envFile) {
    $line = $line.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $name, $value = $line -split '=', 2
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
    }
}

$outputDir = $env:BACKUP_OUTPUT_DIR
$remoteDir = Join-Path $env:USERPROFILE 'OneDrive\Documents\Akudha-Backups'
New-Item -ItemType Directory -Force -Path $remoteDir | Out-Null

$tsx = Join-Path $projectRoot 'node_modules\.bin\tsx.cmd'
& $tsx (Join-Path $projectRoot 'scripts\backup-mongodb.ts')

$latest = Get-ChildItem -LiteralPath $outputDir -Filter '*.akudha-backup' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latest) { throw 'No backup file produced.' }
Copy-Item -LiteralPath $latest.FullName -Destination (Join-Path $remoteDir $latest.Name) -Force

foreach ($dir in @($outputDir, $remoteDir)) {
    Get-ChildItem -LiteralPath $dir -Filter '*.akudha-backup' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item -Force
}

Write-Output "Backup OK: $($latest.Name)"
