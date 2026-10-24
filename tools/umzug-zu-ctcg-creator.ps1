# Einmal pro Gerät: Projektordner ~/dev/card-creator in ~/dev/ctcg-creator umbenennen und origin auf das umbenannte Repo stellen.
# Vorher pinx, die App und alle Claude-Sessions im Ordner schließen (Windows sperrt sonst den Ordner).
# Aufruf:  powershell -ExecutionPolicy Bypass -File ~/dev/card-creator/tools/umzug-zu-ctcg-creator.ps1
$ErrorActionPreference = 'Stop'
$dev = Join-Path $HOME 'dev'
$alt = Join-Path $dev 'card-creator'
$neu = Join-Path $dev 'ctcg-creator'

if (-not (Test-Path $alt)) { Write-Host "Kein Ordner $alt, nichts zu tun."; exit 0 }
if (Test-Path $neu) { Write-Host "$neu gibt es schon. Bitte von Hand prüfen, welcher Ordner bleiben soll."; exit 1 }

git -C $alt remote set-url origin https://github.com/christianngl/ctcg-creator.git
git -C $alt pull --rebase --autostash
Rename-Item -LiteralPath $alt -NewName 'ctcg-creator'
Write-Host "Fertig: $neu (origin = christianngl/ctcg-creator). pinx legt die Desktop-Verknüpfung beim nächsten Abgleich neu an."
