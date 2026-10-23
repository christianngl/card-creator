# Card Creator

Desktop-App zum Gestalten, Drucken und Verwalten eigener Sammel- und Spielkartensets für Familie, Freunde und die private Community.

## Ziel

Eigene Kartensets erstellen, bearbeiten und verwalten:

- Sammelkarten (Bild, Name, Beschreibung) und Spielkarten im TCG-Stil (Werte, Fähigkeiten, Seltenheit)
- Bilder aus eigenen Fotos oder KI-generiert
- Sets mit Nummerierung, Seltenheiten, Vorlagen/Rahmen pro Set, Versionen einzelner Karten und einer Sammlungsübersicht
- Ausgabe als PNG pro Karte und als druckfertige PDF-Bögen für einen Druckdienst, Format pro Set einstellbar (Standard 63 × 88 mm mit 3 mm Beschnitt)
- Schnittstelle, über die Claude-Instanzen die App zur Kartenerstellung bedienen können

## Privatsphäre

Private Fotos und die daraus entstandenen Karten werden nie veröffentlicht. Sie gehen nur an den privaten Kreis und als Druckauftrag an den Druckdienst. Fotos, Karten und Druckdateien liegen in `data/` und `results/` und werden nicht eingecheckt.

## Starten

- Windows: `start.ps1` (oder die Desktop-Verknüpfung von pinx). Beim ersten Start werden die Abhängigkeiten installiert, dafür braucht es Node.js.
- Andere Systeme: `npm install`, dann `npm start`.
- Tests: `npm test`

## Wo die Daten liegen

Jedes Set liegt in einem eigenen Ordner, den du beim Anlegen auswählst. Darin stehen normale Dateien, die du im Explorer siehst und sichern kannst: `set.json`, `karten/` (jede Version einer Karte), `bilder/`, `sammlung.json` sowie `export/png/` und `export/druck/`. Set-Ordner liegen außerhalb dieses Repos.

Die Vorlagen (nur Rahmen und Layout, ohne Fotos und Texte) liegen unter `src/vorlagen/`.

## Kommandozeile für Claude Code

`node src/cli/index.js hilfe` zeigt alle Befehle. Die Ausgabe ist immer JSON. Details stehen in [`claude/CLAUDE.md`](claude/CLAUDE.md).

## Arbeiten mit Claude

Die Anweisungen für Claude stehen in [`claude/CLAUDE.md`](claude/CLAUDE.md): Rolle, System-Prompt, Ein-/Ausgabe-Schema, Sicherheitsregeln und Testfälle. Bevor du am Projekt arbeitest, dort die Sicherheitsregeln lesen.

Eingesetzte Tools: Claude Code (Entwicklung), Claude-Instanzen (Bedienung der App)

## Projektstruktur

```text
card-creator/
├─ CLAUDE.md
├─ README.md
├─ .gitignore
├─ project.config.yaml
├─ projekt.ini
├─ claude/
│  └─ CLAUDE.md
├─ src/
├─ data/
├─ notebooks/
├─ tests/
├─ docs/
├─ infra/
└─ results/
```

## Kontakt

Owner: Wildhunt Community

---
Tags: sammelkarten, kartendesign, druck, privat · angelegt am 2026-10-23
