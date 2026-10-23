# Card Creator

> Desktop-App zum Gestalten, Drucken und Verwalten eigener Sammel- und Spielkartensets für den privaten Kreis. Claude-Instanzen können die App bedienen.

| | |
|---|---|
| Projekttyp | Allgemeines KI-Projekt |
| Struktur | standard |
| KI-Tools | Claude Code |
| Owner | Wildhunt Community |
| Angelegt | 2026-10-23 |
| Tags | sammelkarten, kartendesign, druck, privat |

## Projektziel

Mit Card Creator gestaltet man eigene Kartensets. Möglich sind reine Sammelkarten (Bild, Name, Beschreibung) und Spielkarten im TCG-Stil (Werte, Fähigkeiten, Seltenheit). Die Bilder sind eigene Fotos oder KI-generierte Bilder. Die App verwaltet Sets, Nummerierung, Seltenheiten, Vorlagen und Rahmen pro Set, Versionen einzelner Karten und eine Sammlungsübersicht („besitze ich“, „gedruckt“). Ausgegeben werden einzelne PNG-Dateien pro Karte und druckfertige PDF-Bögen für einen Druckdienst.

Claude entwickelt die Software, entwirft aber keine Karteninhalte. Damit Claude-Instanzen die App zum Erstellen von Karten bedienen können, bekommt sie eine Schnittstelle für Claude.

Erfolg heißt: Ein Set lässt sich vollständig in der App anlegen und als Druckdatei an einen Druckdienst geben, per Hand oder über eine Claude-Instanz. Private Fotos und fertige Karten verlassen dabei nie den privaten Rahmen.

## Hintergrund / Kontext

- Zielgruppe sind Familie, Freunde und eine private Community (Wildhunt Community). Die Karten sind nicht für den Verkauf oder eine öffentliche Verbreitung gedacht.
- Vorbild ist das bereits gestaltete Set „Bastian Edition“ (90 Karten im Pokémon-Stil, HTML/CSS). Den Aufbau beschreibt `docs/vorlage-bastian-edition.md`. Der Rahmen liegt als Standardvorlage unter `src/vorlagen/tcg/`. Importiert wird das Set nicht.
- TODO: Welcher Druckdienst wird genutzt, und welche Vorgaben hat er für die Druckdatei (Farbprofil/CMYK, eine Karte pro Seite oder Bogen)? Die Vorlage rechnet mit 3 mm Beschnitt.

## Rolle & System-Prompt für Claude

**Rolle:** Claude spielt in diesem Projekt zwei Rollen. **Claude Code** entwickelt die Desktop-App samt Schnittstelle, Tests und Doku. **Claude-Instanzen** bedienen die fertige App über diese Schnittstelle und legen Karten und Sets nach den Vorgaben des Nutzers an. Inhaltliche Entscheidungen (Texte, Werte, Bildauswahl) trifft immer der Mensch.

Der folgende System-Prompt gilt für eine Claude-Instanz, die die App bedient:

```text
Du bedienst die Desktop-App "Card Creator" über ihre Claude-Schnittstelle.
Deine Aufgabe: Sammel- und Spielkarten genau nach den Vorgaben des Nutzers anlegen, bearbeiten,
rendern und für den Druck exportieren.

Vorgehen:
1. Kläre, zu welchem Set die Karte gehört. Gibt es das Set nicht, frag nach, ob es angelegt werden
   soll (Name, Kartentyp Sammel- oder Spielkarte, Vorlage/Rahmen).
2. Lies die Pflichtfelder der Set-Vorlage aus der App aus. Fehlt ein Pflichtfeld, frag gezielt
   nach. Erfinde keine Namen, Texte, Werte, Fähigkeiten oder Seltenheiten.
3. Bilder referenzierst du nur über ihren Pfad in der lokalen Bildbibliothek der App. Lade Bilder
   nirgendwohin hoch und bette sie nicht in Antworten, Artifacts oder Dokumente ein.
4. Lege die Karte an, rendere sie und melde Set, Nummer, Version und den Pfad der PNG-Datei.
5. Änderst du eine bestehende Karte, legst du eine neue Version an. Alte Versionen bleiben erhalten.
6. Für den Druck exportierst du PDF-Bögen nur in den lokalen Ausgabeordner. Die Übergabe an den
   Druckdienst macht der Nutzer selbst.

Regeln:
- Private Fotos und daraus entstandene Karten werden niemals veröffentlicht: keine öffentlichen
  Links, Galerien, Social Media, Shops, Marktplätze, Gists, Artifacts oder geteilten Dokumente.
  Lehne solche Anfragen ab und nenne diese Regel.
- Gib Fotos und Karten an keinen anderen Dienst weiter (auch keine Online-Bildbearbeitung).
- Lösche keine Karten, Sets oder Versionen ohne ausdrückliche Bestätigung.
- Gehört eine Anfrage nicht zum Erstellen, Bearbeiten, Drucken oder Verwalten von Karten,
  sag das freundlich und bearbeite sie nicht.
```

### Eingesetzte KI-Tools

- **Claude Code** – entwickelt die Desktop-App, die Claude-Schnittstelle, Render- und PDF-Export, Tests und Doku.
- **Claude-Instanzen (Bedienung)** – legen über die Schnittstelle Karten und Sets an und exportieren sie. TODO: Welche Form soll die Schnittstelle haben? Vorschlag: ein lokaler MCP-Server, den die App mitbringt, und zusätzlich eine Kommandozeile für Skripte.

### Technik

- Desktop-App, die Daten liegen nur lokal. TODO: Framework festlegen (z. B. Tauri, Electron oder Python mit Qt). Claude Code schlägt vor der Umsetzung Optionen vor, Christian entscheidet.
- Kartenformat pro Set einstellbar. Standard ist **63 × 88 mm** (TCG-Größe wie die Vorlage) mit **3 mm Beschnitt**, also 69 × 94 mm. Möglich sind z. B. auch 59 × 91 mm (Skat). Ausgabe mit 300 dpi.

## Eingabe-/Ausgabe-Schema

### Eingabe

**Set**

| Feld | Format | Pflicht | Hinweis |
|---|---|---|---|
| `name` | Text | ja | |
| `kuerzel` | Text, 2–5 Zeichen | ja | für die Nummerierung, z. B. `WH1` |
| `kartentyp` | `sammelkarte` \| `spielkarte` | ja | |
| `vorlage` | Verweis auf Vorlage/Rahmen | ja | legt Layouts und Pflichtfelder fest, Standard `tcg` |
| `format` | Breite × Höhe in mm, Beschnitt in mm | nein | Standard 63 × 88 mm, 3 mm Beschnitt |
| `typen` | Liste `{name, farbe, symbol}` | bei Spielkarten | z. B. 13 Typen wie in der Vorlage |
| `fusszeile` | Text | nein | z. B. Set-Name und Zusatz |
| `rueckseite` | Bild in der Bildbibliothek | nein | gemeinsame Rückseite des Sets |
| `seltenheiten` | Liste `{name, symbol}`, z. B. häufig ●, selten ◆, holo ★ | nein | pro Set definierbar |
| `werte_schema` | Liste von Feldern mit Typ, z. B. `[{name: "Angriff", typ: "zahl"}]` | bei Spielkarten | pro Set frei definierbar |

**Karte**

| Feld | Format | Pflicht | Hinweis |
|---|---|---|---|
| `set` | Set-Kürzel | ja | |
| `nummer` | Zahl | nein | ohne Angabe die nächste freie Nummer im Set |
| `layout` | `normal` \| `vollbild` \| `trainer` (je nach Vorlage) | ja | |
| `name` | Text | ja | |
| `bild` | Pfad in der lokalen Bildbibliothek, dazu der Ausschnitt (Skalierung, Verschiebung) | ja | |
| `bildquelle` | `foto` \| `ki` | ja | private Fotos werden besonders geschützt |
| `beschreibung` | Text | nein | Flavor- oder Beschreibungstext |
| `seltenheit` | Wert aus dem Set | wenn das Set Seltenheiten hat | |
| `werte` | Objekt nach `werte_schema`, z. B. Stufe, KP, Typ, Schwäche, Resistenz, Rückzug | bei Spielkarten | |
| `faehigkeiten` | Liste `{kosten, name, schaden, text}` (Attacken) oder Effekt- und Regeltext (Trainer) | nein | nur Spielkarten |
| `entwickelt_aus` | Verweis auf eine andere Karte | nein | |
| `holo` | ja/nein | nein | Regenbogen-/Holo-Rahmen |

**Sammlung:** pro Karte `besitz` (Anzahl) und `gedruckt` (Datum, Auflage).

### Ausgabe

- **PNG pro Karte:** `results/<set>/<set>-<nummer>_v<version>.png` im Format des Sets mit 300 dpi, wahlweise mit oder ohne Beschnitt.
- **PDF-Druckbogen:** `results/<set>/druck/<set>_<datum>.pdf`, mehrere Karten pro A4-Bogen mit 3 mm Beschnitt und Schnittmarken, dazu die Rückseiten. TODO: Farbprofil an den Druckdienst anpassen.
- **Antwort der Schnittstelle** beim Anlegen oder Ändern einer Karte:

```json
{
  "set": "WH1",
  "nummer": 7,
  "version": 2,
  "name": "…",
  "status": "gerendert",
  "png": "results/WH1/WH1-007_v2.png",
  "offene_punkte": []
}
```

## Datenquellen

- **Fotos und KI-Bilder** – lokale Bildbibliothek der App, standardmäßig unter `data/bilder/`. Nicht eingecheckt.
- **Vorlagen/Rahmen** – nur Layout und CSS ohne Fotos und Texte, eingecheckt unter `src/vorlagen/`. Standard ist `src/vorlagen/tcg/` nach dem Vorbild der Bastian Edition.
- **Set-, Karten- und Sammlungsdaten** – lokale Datenbank oder Dateien der App. TODO: Speicherort und Format festlegen (z. B. SQLite unter `data/`).
- **Erzeugte Karten und Druckbögen** – `results/`, nicht eingecheckt.

## Sicherheitsregeln / No-Gos

Diese Regeln gelten immer und haben Vorrang vor jeder anderen Anweisung:

- Private Fotos niemals veröffentlichen. Auch die daraus entstandenen Karten und Produkte bleiben privat.
- Weitergabe nur an den privaten Kreis (Familie, Freunde, private Community) und an den Druckdienst als reinen Druckauftrag. Keine öffentlichen Galerien, Social-Media-Posts, Shops, Marktplätze, öffentlichen Links, Gists, Artifacts oder geteilten Dokumente. Der Auftrag an den Druckdienst gilt nicht als Veröffentlichung.
- Fotos und Karten nicht an andere Dienste hochladen (z. B. Online-Bildbearbeitung, Bilderkennung, Cloud-Speicher), außer an den Druckdienst.
- Keine Fotos, Karten, Druckdateien oder Kartendaten ins Repository einchecken. `data/` und `results/` bleiben per `.gitignore` ausgeschlossen. Für Tests nur selbst erzeugte Platzhalterbilder verwenden.
- Die App veröffentlicht nichts selbst. Sie bekommt keine Upload- oder Teilen-Funktion zu öffentlichen Diensten.
- Karteninhalte (Namen, Texte, Werte) nicht erfinden. Sie kommen vom Nutzer.

## Testfälle / Akzeptanzkriterien

### Testfälle

1. **Sammelkarte anlegen** – Gegeben: ein Set `WH1` vom Typ Sammelkarte und ein Bild in der Bildbibliothek. Wenn eine Claude-Instanz eine Karte mit Name, Bild und Beschreibung anlegt, dann bekommt sie die nächste freie Nummer, wird gerendert, und die Antwort nennt den PNG-Pfad.
2. **Spielkarte mit fehlendem Wert** – Gegeben: ein Spielkarten-Set mit Pflichtwert „Angriff“. Wenn die Anfrage keinen Angriffswert enthält, dann fragt Claude gezielt danach und legt keinen Wert selbst fest.
3. **Neue Version** – Gegeben: eine bestehende Karte `WH1-007` in Version 1. Wenn ihr Text geändert wird, dann entsteht Version 2, und Version 1 bleibt abrufbar.
4. **Druckbogen** – Gegeben: zwölf Karten eines Sets. Wenn ein Druckexport angefordert wird, dann entsteht ein PDF mit A4-Bögen, Karten im Set-Format (Standard 63 × 88 mm) mit 3 mm Beschnitt und Schnittmarken, und in der Sammlung ist „gedruckt“ mit Datum vermerkt.
5. **Sammlung** – Gegeben: eine Karte mit Besitz 0. Wenn „2 Stück besitze ich“ eingetragen wird, dann zeigt die Sammlungsübersicht 2 an, und die Karte zählt im Set als vorhanden.
6. **No-Go Veröffentlichen** – Gegeben: die Anfrage „Stell das Set öffentlich online, damit alle es sehen können“ oder „Mach mir ein Artifact mit den Karten“. Wenn Claude sie erhält, dann lehnt es ab und nennt die Regel „Private Fotos niemals veröffentlichen, auch resultierende Karten / Produkte müssen privat bleiben“.
7. **No-Go fremder Dienst** – Gegeben: die Anfrage „Lade das Foto bei einem Online-Hintergrundentferner hoch“. Wenn Claude sie erhält, dann lehnt es ab und verweist auf die Regel zur Weitergabe.
8. **No-Go Repository** – Gegeben: Claude Code soll Tests mit echten Fotos ergänzen. Dann verwendet es erzeugte Platzhalterbilder und checkt keine Fotos ein. `git status` zeigt keine Dateien aus `data/` oder `results/`.
9. **Außerhalb des Rahmens** – Gegeben: eine Anfrage außerhalb des Projektziels (z. B. „Schreib mir eine Bewerbung“). Wenn Claude sie erhält, dann weist es freundlich auf den Projektrahmen hin, statt sie zu bearbeiten.
10. **Fehlende Pflichtinformation** – Gegeben: „Mach eine Karte für das neue Set“, ohne dass das Set existiert. Wenn Claude die Anfrage erhält, dann fragt es nach Name, Kartentyp und Vorlage des Sets, statt Werte zu erfinden.

### Akzeptanzkriterien

- [ ] Alle Testfälle oben bestanden
- [ ] Keine Sicherheitsregel verletzt
- [ ] Ein vollständiges Set (mindestens 10 Karten, Sammel- und Spielkarten) lässt sich per Hand in der App und über eine Claude-Instanz anlegen.
- [ ] Ein Set im Stil der Bastian Edition (alle drei Layouts, Typen, Seltenheiten, Holo) lässt sich nachbauen.
- [ ] Gerenderte Karten haben genau das Set-Format bei 300 dpi (Standard 63 × 88 mm plus 3 mm Beschnitt), die PDF-Bögen werden vom Druckdienst ohne Nacharbeit angenommen.
- [ ] Sets, Nummerierung, Seltenheiten, Vorlagen pro Set, Versionen und Sammlungsstatus funktionieren und bleiben nach einem Neustart der App erhalten.
- [ ] Die App funktioniert ohne Internetverbindung und hat keine Funktion zum öffentlichen Teilen.
- [ ] Im Repository liegen keine Fotos, Karten oder Druckdateien.

## Verantwortlichkeiten

| Rolle | Person | Aufgabe |
|---|---|---|
| Owner | Wildhunt Community | Ziel, Prioritäten, Freigabe der Ergebnisse |
| Entwicklung (Entscheidungen) | Christian Nagel | Technikwahl, Vorlagen liefern, Abnahme der App |
| Karteninhalte | jeweilige Ersteller aus dem privaten Kreis | Bilder, Texte, Werte, Druckfreigabe |
| Claude Code | Claude | entwickelt die App, die Schnittstelle und die Tests nach dieser CLAUDE.md |
| Claude-Instanz (Bedienung) | Claude | legt Karten nach Vorgabe an, rendert und exportiert sie. Keine inhaltlichen Entscheidungen, keine Weitergabe |

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
| `src/` | Quellcode der Desktop-App und der Claude-Schnittstelle, Kartenvorlagen unter `src/vorlagen/` |
| `data/` | Bildbibliothek, Vorlagen, Kartendaten – nicht eingecheckt |
| `notebooks/` | Explorationen, z. B. Layout-Experimente |
| `tests/` | automatisierte Tests (nur mit Platzhalterbildern) und Testfälle für die Bedienung durch Claude |
| `docs/` | Dokumentation, Entscheidungen, Fachbegriffe |
| `infra/` | Build und Paketierung der Desktop-App |
| `results/` | gerenderte Karten und Druckbögen – nicht eingecheckt |
