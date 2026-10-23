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
  for (const el of document.querySelectorAll('[data-anpassen]')) {
    let groesse = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && groesse > 12) el.style.fontSize = (groesse -= 1) + 'px';
  }
  window.__fertig = true;
})();
</script>`;

function bildUrlFuer(ordner) {
  return (datei) => pathToFileURL(path.resolve(ordner, datei)).href;
}

// zoom: Faktor gegenüber dem Vorlagenraster (1 = 10 px pro mm)
function seite(set, inhalt, { zoom = 1 } = {}) {
  const v = vorlage(set.vorlage);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<style>
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;src:url('${SCHRIFT.normal}') format('woff2')}
@font-face{font-family:'Inter';font-style:italic;font-weight:100 900;src:url('${SCHRIFT.kursiv}') format('woff2')}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
.zoom{zoom:${zoom};width:${v.raster.breite}px;height:${v.raster.hoehe}px}
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
  return seite(set, v.karteHtml(set, karte, { bildUrl: bildUrlFuer(set.ordner), gesamt: gesamtzahl(set) }), optionen);
}

function rueckseiteSeite(set, optionen) {
  const v = vorlage(set.vorlage);
  return seite(set, v.rueckseiteHtml(set, { bildUrl: bildUrlFuer(set.ordner) }), optionen);
}

module.exports = { karteSeite, rueckseiteSeite, gesamtzahl };
