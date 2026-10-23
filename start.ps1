# Startet die Desktop-App. Beim ersten Start (oder nach einem Pull mit neuen Abhängigkeiten) werden sie installiert.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path 'node_modules\electron\dist') -or ((Get-Item 'package.json').LastWriteTime -gt (Get-Item 'node_modules').LastWriteTime)) {
    npm install --no-audit --no-fund | Out-Null
}
Start-Process -FilePath 'node_modules\electron\dist\electron.exe' -ArgumentList '.' -WorkingDirectory $PSScriptRoot
