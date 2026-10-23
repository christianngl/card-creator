# Card Creator

Desktop-App zum Gestalten, Drucken und Verwalten eigener Sammel- und Spielkartensets für Familie, Freunde und die private Community.

## Ziel

Eigene Kartensets erstellen, bearbeiten und verwalten:

- Sammelkarten (Bild, Name, Beschreibung) und Spielkarten im TCG-Stil (Werte, Fähigkeiten, Seltenheit)
- Bilder aus eigenen Fotos oder KI-generiert
- Sets mit Nummerierung, Seltenheiten, Vorlagen/Rahmen pro Set, Versionen einzelner Karten und einer Sammlungsübersicht
- Ausgabe als PNG pro Karte und als druckfertige PDF-Bögen für einen Druckdienst, im Skat-Format 59 × 91 mm
- Schnittstelle, über die Claude-Instanzen die App zur Kartenerstellung bedienen können

## Privatsphäre

Private Fotos und die daraus entstandenen Karten werden nie veröffentlicht. Sie gehen nur an den privaten Kreis und als Druckauftrag an den Druckdienst. Fotos, Karten und Druckdateien liegen in `data/` und `results/` und werden nicht eingecheckt.

## Datenquellen

- Fotos und KI-Bilder – lokale Bildbibliothek, `data/bilder/`
- Vorlagen/Rahmen – `data/vorlagen/`
- Set-, Karten- und Sammlungsdaten – lokal in der App

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
