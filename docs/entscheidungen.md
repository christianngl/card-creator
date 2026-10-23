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

## 2026-10-23 – Anpassungen nach dem ersten Test

- **Speichern ist immer möglich.** Fehlen Angaben, wird die Karte als Entwurf gespeichert (`entwurf`, `offene_punkte`). Gedruckt werden Entwürfe nur auf ausdrücklichen Wunsch. Die Kommandozeile bleibt streng und speichert Entwürfe nur mit `--entwurf`, damit Claude Code nachfragt statt zu raten.
- **Folien-Effekte** (`folie`): Glitzer, Sterne, Strahlen, Kosmos, Regenbogen, Glanz, über das Bild oder die ganze Karte, mit einstellbarer Stärke. Sie werden statisch gezeichnet und mit einem festen Zufallswert pro Karte erzeugt, damit Vorschau und Druck übereinstimmen. Den bewegten Glanz echter Holo-Karten kann ein Druck nicht zeigen.
- **Goldkarte** als eigenes Layout `gold`: Vollbild-Aufbau, Karte in Gold mit feiner Gravur, Foto standardmäßig goldgetönt (`goldton: false` schaltet das ab).
- **Fotoausschnitt** lässt sich direkt in der Vorschau mit der Maus verschieben und mit dem Mausrad zoomen, ohne die Vorschau neu zu laden. Bilder lassen sich per Drag & Drop auf die Karte ziehen.

## 2026-10-23 – Übersichten, Typen, Formate

- **Kartenformat pro Karte** (Höhe × Breite), das Set hat nur noch ein Standardformat. Die Vorlage skaliert die Breite und gibt zusätzliche Höhe dem Fotofenster. So passt ein Layout für TCG, Skat, Tarot und kleine Formate. Sehr breite Formate lehnt die Vorlage ab. Druckbögen trennen Karten nach Format, Einzelseiten haben die Größe der jeweiligen Karte.
- **Typen pro Set** sind in der App bearbeitbar (Name, Symbol, Farbe, Hintergrundverlauf). Entfernte Typen, die Karten noch nutzen, meldet die App als Warnung, statt die Karten zu ändern.
- **Startseite und Kartenübersicht als Grid** mit Vorschaubildern. Die Bilder werden im Hintergrund gerendert und pro Set in `.vorschau/` zwischengespeichert. Die Liste der Sets enthält alle bekannten Sets. „✕“ nimmt ein Set nur aus der Liste, der Ordner bleibt.
- **Titelkarte** pro Set für die Startseite, ohne Auswahl zeigt die Kachel das Kürzel.

## 2026-10-23 – Bildausschnitt ohne Ränder, Kartengrid im Editor

- Der Bildausschnitt verschiebt nicht mehr das Bildelement, sondern wählt per `object-position` den sichtbaren Teil des vollen Fotos. Gezoomt wird um diesen Punkt. Dadurch entstehen beim Verschieben keine leeren Ränder mehr. In der Vorschau folgt das Foto der Maus 1:1 und stoppt am Fotorand.
- Die Seitenleiste im Editor zeigt die Karten als Grid mit Vorschaubildern.
