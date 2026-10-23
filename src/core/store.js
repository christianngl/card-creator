// Ablage eines Sets als normale Dateien in einem frei gewählten Ordner:
//   set.json           Set-Daten (Name, Kürzel, Kartentyp, Vorlage, Format, Typen, Seltenheiten …)
//   karten/007/v001.json  jede Version einer Karte als eigene Datei, die höchste ist die aktuelle
//   sammlung.json      Besitz und Druckvermerke pro Kartennummer
//   bilder/            Fotos und KI-Bilder des Sets
//   export/png/, export/druck/  erzeugte Karten und Druckbögen
const fs = require('fs');
const path = require('path');
const { vorlage } = require('../vorlagen');

const KARTENTYPEN = ['spielkarte', 'sammelkarte'];

class Fehler extends Error {
  constructor(meldung, code = 'fehler', offenePunkte = []) {
    super(meldung);
    this.code = code;
    this.offene_punkte = offenePunkte;
  }
}

const nr3 = (n) => String(n).padStart(3, '0');
const leseJson = (datei) => JSON.parse(fs.readFileSync(datei, 'utf8'));
const schreibeJson = (datei, daten) => {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, JSON.stringify(daten, null, 2) + '\n', 'utf8');
};

function setDatei(ordner) {
  return path.join(ordner, 'set.json');
}

function istSet(ordner) {
  return fs.existsSync(setDatei(ordner));
}

function pruefeFormat(v, format) {
  const ok = v.formate.some((f) => f.breite === format.breite && f.hoehe === format.hoehe && f.beschnitt === format.beschnitt);
  if (!ok) {
    const moeglich = v.formate.map((f) => `${f.breite} × ${f.hoehe} mm (+${f.beschnitt} mm Beschnitt)`).join(', ');
    throw new Error(`Die Vorlage ${v.id} unterstützt dieses Format nicht. Möglich: ${moeglich}`);
  }
}

// Legt ein neues Set in einem leeren (oder noch nicht vorhandenen) Ordner an
function erstelleSet(ordner, angaben) {
  ordner = path.resolve(ordner);
  if (fs.existsSync(ordner) && fs.readdirSync(ordner).length) {
    throw new Fehler(`Der Ordner ist nicht leer: ${ordner}. Für ein neues Set bitte einen leeren Ordner wählen.`, 'ordner_nicht_leer');
  }
  const offen = [];
  if (!angaben.name) offen.push('name');
  if (!angaben.kuerzel || !/^[A-Za-z0-9]{2,5}$/.test(angaben.kuerzel)) offen.push('kuerzel: 2–5 Buchstaben/Ziffern');
  if (!KARTENTYPEN.includes(angaben.kartentyp)) offen.push(`kartentyp: ${KARTENTYPEN.join(' oder ')}`);
  if (offen.length) throw new Fehler('Angaben für das Set fehlen.', 'pflichtfelder_fehlen', offen);

  const v = vorlage(angaben.vorlage || 'tcg');
  const format = angaben.format || v.formate[0];
  pruefeFormat(v, format);
  const set = {
    name: angaben.name,
    kuerzel: angaben.kuerzel.toUpperCase(),
    kartentyp: angaben.kartentyp,
    vorlage: v.id,
    format,
    fusszeile: angaben.fusszeile || angaben.name,
    anzahl: angaben.anzahl || null,
    rueckseite: null,
    typen: angaben.typen || v.standard.typen,
    seltenheiten: angaben.seltenheiten || v.standard.seltenheiten,
    angelegt: new Date().toISOString().slice(0, 10),
  };
  for (const unter of ['karten', 'bilder', 'export/png', 'export/druck']) fs.mkdirSync(path.join(ordner, unter), { recursive: true });
  schreibeJson(setDatei(ordner), set);
  schreibeJson(path.join(ordner, 'sammlung.json'), {});
  return { ...set, ordner };
}

function ladeSet(ordner) {
  ordner = path.resolve(ordner);
  if (!istSet(ordner)) throw new Fehler(`Kein Set gefunden (set.json fehlt): ${ordner}`, 'kein_set');
  return { ...leseJson(setDatei(ordner)), ordner };
}

// Ändert Set-Angaben. Kürzel und Vorlage bleiben fest, weil Dateinamen und Karten daran hängen.
function aendereSet(ordner, aenderungen) {
  const { ordner: _o, ...set } = ladeSet(ordner);
  const erlaubt = ['name', 'fusszeile', 'anzahl', 'rueckseite', 'typen', 'seltenheiten', 'format'];
  for (const [k, wert] of Object.entries(aenderungen)) {
    if (!erlaubt.includes(k)) throw new Fehler(`Das Feld ${k} lässt sich nicht ändern (änderbar: ${erlaubt.join(', ')}).`, 'nicht_aenderbar');
    set[k] = wert;
  }
  if (aenderungen.format) pruefeFormat(vorlage(set.vorlage), set.format);
  if (aenderungen.rueckseite) set.rueckseite = importiereBild(ordner, aenderungen.rueckseite);
  schreibeJson(setDatei(ordner), set);
  return { ...set, ordner: path.resolve(ordner) };
}

function kartenOrdner(ordner, nummer) {
  return path.join(ordner, 'karten', nr3(nummer));
}

function versionen(ordner, nummer) {
  const dir = kartenOrdner(ordner, nummer);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((f) => /^v(\d+)\.json$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

function nummern(ordner) {
  const dir = path.join(ordner, 'karten');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d+$/.test(f)).map(Number).filter((n) => versionen(ordner, n).length).sort((a, b) => a - b);
}

function ladeKarte(ordner, nummer, version) {
  const vs = versionen(ordner, nummer);
  if (!vs.length) throw new Fehler(`Karte ${nummer} gibt es im Set nicht.`, 'karte_fehlt');
  const v = version ? Number(version) : vs[vs.length - 1];
  if (!vs.includes(v)) throw new Fehler(`Karte ${nummer} hat keine Version ${v} (vorhanden: ${vs.join(', ')}).`, 'version_fehlt');
  return leseJson(path.join(kartenOrdner(ordner, nummer), `v${nr3(v)}.json`));
}

function listeKarten(ordner) {
  const sammlung = ladeSammlung(ordner);
  return nummern(ordner).map((n) => {
    const k = ladeKarte(ordner, n);
    const s = sammlung[n] || {};
    return { nummer: n, version: k.version, name: k.name, layout: k.layout, typ: k.typ || null, seltenheit: k.seltenheit || null, besitz: s.besitz || 0, gedruckt: (s.gedruckt || []).length };
  });
}

// Kopiert ein Bild von außerhalb in bilder/ und liefert den Pfad relativ zum Set. Bilder im Set bleiben, wo sie sind.
function importiereBild(ordner, datei) {
  ordner = path.resolve(ordner);
  const abs = path.resolve(ordner, datei);
  if (!fs.existsSync(abs)) throw new Fehler(`Bild nicht gefunden: ${datei}`, 'bild_fehlt', ['bild.datei']);
  const rel = path.relative(ordner, abs);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  const ext = path.extname(abs).toLowerCase();
  const basis = path.basename(abs, path.extname(abs)).replace(/[^\w.-]+/g, '_');
  let ziel = path.join(ordner, 'bilder', basis + ext);
  for (let i = 2; fs.existsSync(ziel); i++) ziel = path.join(ordner, 'bilder', `${basis}_${i}${ext}`);
  fs.copyFileSync(abs, ziel);
  return path.relative(ordner, ziel).split(path.sep).join('/');
}

function pruefeKarte(set, karte) {
  const offen = vorlage(set.vorlage).pruefe(set, karte);
  if (offen.length) throw new Fehler('Für die Karte fehlen Angaben oder sie sind ungültig.', 'pflichtfelder_fehlen', offen);
}

function bildUebernehmen(ordner, karte) {
  if (karte.bild && karte.bild.datei) karte.bild = { skalierung: 1, x: 0, y: 0, ...karte.bild, datei: importiereBild(ordner, karte.bild.datei) };
}

function speichereVersion(ordner, karte) {
  schreibeJson(path.join(kartenOrdner(ordner, karte.nummer), `v${nr3(karte.version)}.json`), karte);
}

// Legt eine Karte an. Ohne nummer bekommt sie die nächste freie Nummer.
function neueKarte(ordner, daten) {
  const set = ladeSet(ordner);
  const vorhanden = nummern(set.ordner);
  let nummer = daten.nummer ? Number(daten.nummer) : (vorhanden.length ? vorhanden[vorhanden.length - 1] + 1 : 1);
  if (!Number.isInteger(nummer) || nummer < 1) throw new Fehler('nummer muss eine positive ganze Zahl sein.', 'pflichtfelder_fehlen', ['nummer']);
  if (vorhanden.includes(nummer)) throw new Fehler(`Nummer ${nummer} ist schon vergeben. Zum Ändern "karte aendern" verwenden.`, 'nummer_vergeben');
  const karte = { ...daten, nummer, version: 1, geaendert: new Date().toISOString() };
  pruefeKarte(set, karte);
  bildUebernehmen(set.ordner, karte);
  speichereVersion(set.ordner, karte);
  return karte;
}

// Ändert eine Karte, indem eine neue Version entsteht. Alte Versionen bleiben erhalten.
function aendereKarte(ordner, nummer, aenderungen) {
  const set = ladeSet(ordner);
  const alt = ladeKarte(set.ordner, nummer);
  const { nummer: _n, version: _v, ...rest } = aenderungen;
  const karte = { ...alt, ...rest, nummer: alt.nummer, version: alt.version + 1, geaendert: new Date().toISOString() };
  if (rest.bild && alt.bild) karte.bild = { ...alt.bild, ...rest.bild };
  pruefeKarte(set, karte);
  bildUebernehmen(set.ordner, karte);
  speichereVersion(set.ordner, karte);
  return karte;
}

function ladeSammlung(ordner) {
  const datei = path.join(ordner, 'sammlung.json');
  return fs.existsSync(datei) ? leseJson(datei) : {};
}

function setzeBesitz(ordner, nummer, anzahl) {
  ladeKarte(ordner, nummer);
  if (!Number.isInteger(anzahl) || anzahl < 0) throw new Fehler('besitz muss eine ganze Zahl ab 0 sein.', 'pflichtfelder_fehlen', ['besitz']);
  const s = ladeSammlung(ordner);
  s[nummer] = { ...(s[nummer] || {}), besitz: anzahl };
  schreibeJson(path.join(ordner, 'sammlung.json'), s);
  return s[nummer];
}

function vermerkeDruck(ordner, eintraege, datei, auflage = 1) {
  const s = ladeSammlung(ordner);
  const datum = new Date().toISOString().slice(0, 10);
  for (const { nummer, version } of eintraege) {
    const e = s[nummer] || {};
    e.gedruckt = [...(e.gedruckt || []), { datum, version, auflage, datei }];
    s[nummer] = e;
  }
  schreibeJson(path.join(ordner, 'sammlung.json'), s);
}

// "7", "1-12", "1,3,5-7" -> [Nummern]; leer = alle Karten des Sets
function waehleNummern(ordner, auswahl) {
  const alle = nummern(ordner);
  if (auswahl === undefined || auswahl === null || auswahl === '' || auswahl === true) return alle;
  const gewaehlt = new Set();
  for (const teil of String(auswahl).split(',')) {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(teil);
    if (!m) throw new Fehler(`Ungültige Nummernauswahl: ${auswahl}`, 'pflichtfelder_fehlen', ['nr']);
    const von = Number(m[1]);
    const bis = m[2] ? Number(m[2]) : von;
    for (let n = von; n <= bis; n++) gewaehlt.add(n);
  }
  const fehlen = [...gewaehlt].filter((n) => !alle.includes(n));
  if (fehlen.length) throw new Fehler(`Diese Karten gibt es nicht: ${fehlen.join(', ')}`, 'karte_fehlt');
  return [...gewaehlt].sort((a, b) => a - b);
}

module.exports = {
  Fehler,
  KARTENTYPEN,
  nr3,
  istSet,
  erstelleSet,
  ladeSet,
  aendereSet,
  ladeKarte,
  listeKarten,
  versionen,
  nummern,
  neueKarte,
  aendereKarte,
  importiereBild,
  ladeSammlung,
  setzeBesitz,
  vermerkeDruck,
  waehleNummern,
};
