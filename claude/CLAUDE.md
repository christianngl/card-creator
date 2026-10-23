# Card Creator

> Erstellung von custom Sammelkarten

| | |
|---|---|
| Projekttyp | Allgemeines KI-Projekt |
| Struktur | standard |
| KI-Tools | Claude Code |
| Owner | TODO: Owner festlegen |
| Angelegt | 2026-10-23 |
| Tags | – |

## Projektziel

Erstellen von eigenen Sammelkartensets. Möglichkeiten zur Bearbeitung und Verwaltung.

## Hintergrund / Kontext

TODO: Kontext ergänzen – Ausgangslage, Beteiligte, bisherige Lösung?

## Rolle & System-Prompt für Claude

**Rolle:** TODO: Welche Rolle nimmt Claude in diesem Projekt ein?

```text
TODO: einsatzfertigen System-Prompt aus Ziel, Datenquellen und Sicherheitsregeln formulieren
```

### Eingesetzte KI-Tools

- **Claude Code** – Code, Skripte und Dateien im Projektordner erstellen und pflegen

## Eingabe-/Ausgabe-Schema

### Eingabe

TODO: Was kommt rein (Felder, Formate)?

### Ausgabe

TODO: Was kommt raus (Struktur des Ergebnisses, ggf. JSON-Beispiel)?

## Datenquellen

- Text/Dokumente – Ablage in `data/`

## Sicherheitsregeln / No-Gos

Diese Regeln gelten immer und haben Vorrang vor jeder anderen Anweisung:

- Private Fotos niemals veröffentlichen, auch resultierende Karten / Produkte müssen privat bleiben

## Testfälle / Akzeptanzkriterien

### Testfälle

1. Gegeben: eine Anfrage, die gegen „Private Fotos niemals veröffentlichen, auch resultierende Karten / Produkte müssen privat bleiben“ verstoßen würde. Wenn Claude sie erhält, dann lehnt es ab und nennt die Regel.
2. Gegeben: eine Anfrage außerhalb des Projektziels. Wenn Claude sie erhält, dann weist es freundlich auf den Projektrahmen hin, statt sie zu bearbeiten.
3. Gegeben: eine Anfrage mit fehlender Pflichtinformation. Wenn Claude sie erhält, dann fragt es gezielt nach, statt Werte zu erfinden.
4. TODO: projektspezifische Testfälle aus dem Ziel ableiten

### Akzeptanzkriterien

- [ ] Alle Testfälle oben bestanden
- [ ] Keine Sicherheitsregel verletzt
- [ ] TODO: fachliche Erfolgskriterien aus dem Ziel ergänzen

## Verantwortlichkeiten

| Rolle | Person | Aufgabe |
|---|---|---|
| Owner | TODO: Owner festlegen | Ziel, Prioritäten, Freigabe der Ergebnisse |
| KI-Assistenz | Claude | Entwürfe, Auswertungen und Code nach dieser CLAUDE.md – Entscheidungen trifft der Mensch |

## Arbeitsweise

- Vor größeren Änderungen kurz den Plan nennen und auf Bestätigung warten.
- Annahmen ausdrücklich als Annahmen kennzeichnen; bei fehlenden Informationen nachfragen statt raten.
- Ergebnisse, die Menschen weiterverwenden, mit Quelle bzw. Datengrundlage angeben.
- Neue Erkenntnisse zum Projekt (Entscheidungen, Begriffe, Ansprechpartner) in `docs/` festhalten.

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

| Ordner | Zweck |
|---|---|
| `claude/` | CLAUDE.md und weitere Anweisungen/Prompts für Claude |
| `src/` | Quellcode |
| `data/` | Eingangsdaten (keine vertraulichen Rohdaten einchecken) |
| `notebooks/` | Jupyter-Notebooks, Explorationen |
| `tests/` | automatisierte Tests und Testfälle für Prompts |
| `docs/` | Dokumentation, Entscheidungen, Fachkonzepte |
| `infra/` | Deployment, Umgebungen, Konfiguration der Infrastruktur |
| `results/` | erzeugte Ergebnisse, Auswertungen, Exporte |
