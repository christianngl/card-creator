# Changelog

Alle für Nutzer spürbaren Änderungen an cTCG Creator (früher Card Creator).

## [Unveröffentlicht]

## [0.2.2] – 2026-10-24

- Die Update-Suche funktioniert wieder: Im Release v0.2.1 lagen versehentlich noch die Dateien von 0.2.0, deshalb meldete die App immer wieder ein Update, ohne neuer zu werden. Sie nimmt jetzt nur Dateien, deren Versionsnummer zum Release passt.
- Weniger Fehlalarme von Virenscannern wie Norton: Das Update der portablen EXE kommt ohne verstecktes PowerShell-Skript aus, und Installer und App enthalten keine unnötigen Hilfsdateien mehr (elevate.exe, app-update.yml). Weil die Dateien nicht signiert sind, kann ein Virenscanner sie trotzdem noch als unbekannt melden.
- Das Projekt heißt jetzt auch auf GitHub ctcg-creator. Sets, Einstellungen und die Installation bleiben, wie sie sind.

## [0.2.1] – 2026-10-24

- Card Creator heißt jetzt cTCG Creator (Custom TCG Creator): neues Logo und App-Icon, eine Startseite mit Logo und eine dunkle Oberfläche in den Farben des Logos. Alle Funktionen, Sets und die Liste der zuletzt geöffneten Sets bleiben erhalten. Beim Update ersetzt der Installer die alten Verknüpfungen „Card Creator“ auf dem Desktop und im Startmenü durch „cTCG Creator“.
- Card Creator sucht beim Start auf GitHub nach einer neuen Version und kann sie auf Wunsch gleich herunterladen und einspielen (Installer und portable EXE). Manuell geht das über das neue Menü „Hilfe → Nach Updates suchen …“. Ohne Internet läuft die App wie gewohnt.

## [0.2.0] – 2026-10-23

- „+ Neue Karte“ bleibt in der Kartenübersicht und in der Seitenleiste des Editors beim Scrollen oben stehen.
- Zu jeder Karte lässt sich ein Kommentar für spätere Bearbeitungen und Ideen speichern. Er erscheint nicht auf der Karte, Karten mit Kommentar zeigen in der Übersicht eine Sprechblase.
- Neu: „Stil übertragen …“ überträgt Layout, Effekt, Format, Holo-Rahmen und Goldton einer Karte auf ausgewählte andere Karten (auch per Kommandozeile mit `karte stil`). Texte, Werte und Bilder bleiben, jede geänderte Karte bekommt eine neue Version.
- Neu: Karten lassen sich mit „Kopieren“ (bzw. `karte kopieren`) als neue Karte duplizieren, etwa um dieselbe Karte als normale und als Goldkarte ins Set zu nehmen.
- Regenbogen ist jetzt ein eigener Kartentyp: Layout „Regenbogenkarte“ (Spielkarten, Vollbild) bzw. „Regenbogen-Sammelkarte“, jeweils mit Regenbogenrahmen und Regenbogenglanz über dem Foto. Das Häkchen „Holo-/Regenbogen-Rahmen“ entfällt, ältere Karten mit Holo-Rahmen bleiben unverändert.
- Der Effekt „Strahlen (Sonnenstrahlen)“ wurde entfernt. Ältere Karten mit diesem Effekt werden ohne ihn gezeichnet, beim nächsten Speichern fällt er weg.
