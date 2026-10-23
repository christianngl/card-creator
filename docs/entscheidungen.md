# Entscheidungen

## 2026-10-23 – Projektrahmen

- Kartenarten: Sammelkarten und Spielkarten im TCG-Stil.
- Bilder: eigene Fotos und KI-generierte Bilder.
- Ausgabe: PNG pro Karte und PDF-Druckbögen. Gedruckt wird bei einem Druckdienst.
- Desktop-App. Framework ist noch offen.
- Verwaltung: Sets, Nummerierung, Seltenheiten, Vorlagen pro Set, Versionen, Sammlungsübersicht.
- Claude entwickelt nur das Programm. Claude-Instanzen sollen die App über eine Schnittstelle bedienen können.
- Zielgruppe: Familie, Freunde, private Community. Owner: Wildhunt Community.

## 2026-10-23 – Vorlage und Format

- Kartenformat pro Set einstellbar. Standard 63 × 88 mm mit 3 mm Beschnitt wie die Bastian Edition.
- Der Rahmen der Vorlage (Layout, CSS, Typfarben, Symbole) darf ins Repo, Fotos und Kartentexte nicht.
- Die vorhandenen 90 Karten werden nicht importiert, sie dienen nur als Vorbild.
- Ein Druckauftrag beim Druckdienst gilt nicht als Veröffentlichung.

## 2026-10-23 – Technik, Schnittstelle, Speicherort

- **Framework: Electron.** Die Vorlage ist HTML/CSS. Vorschau, PNG und PDF laufen über dieselbe Chromium-Engine, deshalb entspricht der Druck genau der Vorschau. Node.js ist schon vorhanden.
  Verworfen wurden Tauri (Rust fehlt, kein eingebauter PDF-Weg), .NET/WPF (Vorlage müsste neu gebaut werden, nur Windows) und Python/Qt (Python fehlt). Nachteil von Electron: rund 150 MB Speicherplatz.
- **Schnittstelle: nur für Claude Code**, als Kommandozeile mit JSON-Ausgabe (`src/cli/index.js`). Kein Server, kein MCP. Zum Rendern startet sie Electron ohne Fenster.
- **Speicherort: pro Set ein frei gewählter lokaler Ordner** mit normalen Dateien (JSON und Bilder). Er ist im Explorer zugänglich und liegt außerhalb des Repos.
- **Vorgaben des Druckdienstes** folgen später. Bis dahin gibt es A4-Bögen (3 × 3 mit Schnittmarken) und Einzelseiten (69 × 94 mm), beide in RGB.
- Die Vorlage `tcg` unterstützt vorerst nur 63 × 88 mm. Das Format ist pro Set gespeichert, andere Formate brauchen eine eigene Vorlage.
