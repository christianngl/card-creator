// Baut eine vollständige HTML-Seite für eine Karte (Vorschau in der App und Rendern).
const path = require('path');
const { pathToFileURL } = require('url');
const { vorlage } = require('../vorlagen');
const { nummern } = require('./store');

const SCHRIFT = {
  normal: pathToFileURL(require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).href,
  kursiv: pathToFileURL(require.resolve('@fontsource-variable/inter/files/inter-latin-wght-italic.woff2')).href,
};

// Verkleinert Texte mit data-anpassen, bis sie in ihre Box passen, und meldet danach window.__fertig
const ANPASSEN = `
<script>
(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
  // Große Fotos dekodiert Chromium erst beim Zeichnen; ohne decode() wäre das Fotofenster beim Rendern noch leer
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  for (const el of document.querySelectorAll('[data-anpassen]')) {
    let groesse = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && groesse > 12) el.style.fontSize = (groesse -= 1) + 'px';
  }
  window.__fertig = true;
})();
</script>`;

// bildPfad(datei) kann das Bild durch eine Arbeitskopie ersetzen (src/render/bilder.js, nur in Electron)
function bildUrlFuer(ordner, bildPfad) {
  return (datei) => pathToFileURL(bildPfad ? bildPfad(datei) : path.resolve(ordner, datei)).href;
}

// zoom: Faktor gegenüber dem Vorlagenraster (690 px Kartenbreite samt Beschnitt), format: Kartenformat für die Höhe
function seite(set, inhalt, { zoom = 1, format } = {}) {
  const v = vorlage(set.vorlage);
  const m = v.masse(format || v.formatVon(set));
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<style>
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;src:url('${SCHRIFT.normal}') format('woff2')}
@font-face{font-family:'Inter';font-style:italic;font-weight:100 900;src:url('${SCHRIFT.kursiv}') format('woff2')}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
.zoom{zoom:${zoom};width:${m.breite}px;height:${m.hoehe}px}
</style>
<link rel="stylesheet" href="${pathToFileURL(v.css).href}">
<style>${v.typCss(set)}</style>
</head><body><div class="zoom">${inhalt}</div>${ANPASSEN}</body></html>`;
}

function gesamtzahl(set) {
  return set.anzahl || nummern(set.ordner).length;
}

function karteSeite(set, karte, optionen) {
  const v = vorlage(set.vorlage);
  return seite(set, v.karteHtml(set, karte, { bildUrl: bildUrlFuer(set.ordner, optionen && optionen.bildPfad), gesamt: gesamtzahl(set) }), { ...optionen, format: v.formatVon(set, karte) });
}

// optionen.format: Format der Karten, zu denen die Rückseite gehört (Standard: Format des Sets)
function rueckseiteSeite(set, optionen = {}) {
  const v = vorlage(set.vorlage);
  const format = optionen.format || v.formatVon(set);
  return seite(set, v.rueckseiteHtml(set, { bildUrl: bildUrlFuer(set.ordner, optionen.bildPfad), format }), { ...optionen, format });
}

// Maße einer Karte im Vorlagenraster, z. B. für die Vorschau in der App
function kartenMasse(set, karte) {
  const v = vorlage(set.vorlage);
  return v.masse(v.formatVon(set, karte));
}

module.exports = { karteSeite, rueckseiteSeite, gesamtzahl, kartenMasse };
