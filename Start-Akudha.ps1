$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$akudhaUrl = 'http://127.0.0.1:3000'
function Test-Akudha {
    try {
        $response = Invoke-WebRequest -Uri $akudhaUrl -UseBasicParsing -TimeoutSec 2
        if ($response.Content -notmatch 'Akudha') { throw 'Port 3000 is occupied by another application.' }
        return $true
    } catch [System.Net.WebException] { return $false }
}
if (-not (Test-Akudha)) {
    $akudhaNode = (Get-Command node.exe -ErrorAction Stop).Source
    $akudhaVite = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $akudhaVite)) { throw 'Install dependencies first: open this folder in a terminal and run npm ci.' }
    Start-Process -FilePath $akudhaNode -ArgumentList @('"' + $akudhaVite + '"', '--host', '127.0.0.1', '--port', '3000', '--strictPort') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'akudha-local.log') -RedirectStandardError (Join-Path $PSScriptRoot 'akudha-local-error.log')
    $akudhaReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-Akudha) { $akudhaReady = $true; break }
    }
    if (-not $akudhaReady) { throw 'Akudha did not start. Check akudha-local-error.log in this folder.' }
}
Start-Process $akudhaUrl
