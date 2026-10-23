# Vorlage „Bastian Edition“ (Analyse)

Bestehendes Set, außerhalb des Repos gestaltet (lokaler Ordner `Bastian_Sammelkarten` auf Christians Desktop-PC). Hier steht nur der **Aufbau**. Fotos, Kartentexte und Namen bleiben privat und kommen nicht ins Repo.

## Herkunft und Technik

- Export aus einem HTML-Design-Werkzeug: pro Karte eine `K###.dc.html`, dazu `Rueckseite.dc.html`, gemeinsames `card.css`, die Laufzeitskripte `support.js` und `image-slot.js` sowie `canvas.json` (Anordnung der Karten).
- Karten sind HTML/CSS mit Platzhaltern (`{{cls}}`, `{{glyph}}`, `{{sym}}`), die ein kleines Skript aus den Props `typ`, `seltenheit` und `rainbow` füllt.
- Bildausschnitt pro Foto in `.image-slots.state.json`: Skalierung `s` und Verschiebung `x`/`y`.
- Schrift: Inter (Google Fonts). Symbole über Systemschriften (Segoe UI Symbol …).

## Maße

- Arbeitsfläche 690 × 940 px, 10 px = 1 mm, also **69 × 94 mm einschließlich 3 mm Beschnitt**. Das ergibt ein Endformat von **63 × 88 mm**, die übliche TCG-Größe.
- Für den Druck mit 300 dpi entspricht das 815 × 1110 px einschließlich Beschnitt.
- Fotos: meist 1275 × 1700 px oder größer, einige nur 720 × 1280 px oder 480 × 640 px. Diese wenigen liegen auf der Vollbildkarte unter 300 dpi.

## Set

- 90 Karten plus eine gemeinsame Rückseite (Vollbild).
- Fußzeile: Set-Name und Zusatz („… · LEVEL 18“), Nummer `###/090` und Seltenheitssymbol.

## Layouts

| Layout | Klasse | Foto | Inhalt |
|---|---|---|---|
| Normal | `card normal` | Fenster oben (526 × 328 px) | Stufe, Name, KP, Typ-Symbol, Band mit Kurzinfo, Attacken, Werte, Flavor, Fußzeile |
| Vollbild (Full Art) | `card full` | ganze Karte, Text mit Verlauf darüber | wie Normal, ohne Band |
| Trainer | `card trainer` | Fenster oben | Kennung „TRAINER“, Untertyp (z. B. „UNTERSTÜTZER“), Name, Effekttext, Regeltext, Flavor, Fußzeile |

## Felder (Pokémon-ähnliche Karten)

| Feld | Werte / Format |
|---|---|
| Stufe | Text, z. B. `Basis`, `Phase 1`, `Phase 2` (frei wählbar) |
| Entwicklung | optional „entwickelt sich aus …“ (Verweis auf eine andere Karte) |
| Name | Text, Schriftgröße bei Bedarf pro Karte verkleinert |
| KP | Zahl |
| Typ | eine von 13: Kuschel, Stahl, Natur, Reisen, Farblos, Wasser, Mode, Kampf, Küche, Kunst, Gaming, Eis, Feuer. Jeder Typ hat Farbe und Symbol. |
| Band | Kurzinfo, nur im Layout Normal |
| Attacken | 1–2, je Energiekosten (Liste von Typen), Name, Schaden (optional), Text |
| Schwäche, Resistenz | Text |
| Rückzug | Anzahl Energien |
| Flavor | Text |
| Seltenheit | `häufig` ● · `selten` ◆ · `holo` ★ |
| Rainbow | Ja/Nein, Regenbogen-/Holo-Rahmen |
| Foto | Bild mit Ausschnitt (Skalierung, Verschiebung) |

## Folgen für das Datenmodell

- Pro Set einstellbar: Typen (Name, Farbe, Symbol), Seltenheiten (Name, Symbol), Layouts, Fußzeilentext, Rückseite.
- Pro Karte: Layout, Bildausschnitt, Entwicklungsverweis, optionale Schriftgrößenanpassung.
- Kein Import: Die Bastian Edition dient nur als Vorbild. Der Rahmen liegt als Standardvorlage unter `src/vorlagen/tcg/card.css`.
