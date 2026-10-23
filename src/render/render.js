// Rendert Karten als PNG und Druckbögen als PDF. Läuft im Electron-Hauptprozess (App oder headless.js).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { BrowserWindow } = require('electron');
const store = require('../core/store');
const { karteSeite, rueckseiteSeite } = require('../core/seite');
const { vorlage } = require('../vorlagen');

const DPI = 300;
const A4 = { breite: 210, hoehe: 297 };

function tempOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'card-creator-'));
}

async function warteBisFertig(wc) {
  for (let i = 0; i < 200; i++) {
    if (await wc.executeJavaScript('window.__fertig === true')) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Die Karte wurde nicht fertig geladen (Zeitüberschreitung).');
}

// Rendert eine HTML-Seite der Größe breite x hoehe px und gibt ein NativeImage zurück
async function fotografiere(html, breite, hoehe, temp) {
  const datei = path.join(temp, `seite-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(datei, html, 'utf8');
  const win = new BrowserWindow({
    show: false,
    useContentSize: true,
    width: breite,
    height: hoehe,
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true },
  });
  try {
    win.setContentSize(breite, hoehe);
    await win.loadFile(datei);
    await warteBisFertig(win.webContents);
    await new Promise((r) => setTimeout(r, 100));
    const bild = await win.webContents.capturePage({ x: 0, y: 0, width: breite, height: hoehe });
    const groesse = bild.getSize();
    return groesse.width === breite && groesse.height === hoehe ? bild : bild.resize({ width: breite, height: hoehe, quality: 'best' });
  } finally {
    win.destroy();
    fs.rmSync(datei, { force: true });
  }
}

function masse(set) {
  const v = vorlage(set.vorlage);
  const pxProMm = DPI / 25.4;
  const zoom = pxProMm / v.raster.pxProMm;
  const f = set.format;
  return {
    zoom,
    pxProMm,
    breite: Math.round(v.raster.breite * zoom),
    hoehe: Math.round(v.raster.hoehe * zoom),
    beschnittPx: Math.round(f.beschnitt * pxProMm),
    mm: { breite: f.breite + 2 * f.beschnitt, hoehe: f.hoehe + 2 * f.beschnitt, beschnitt: f.beschnitt },
  };
}

async function rendereKarteBild(set, karte, temp) {
  const m = masse(set);
  return fotografiere(karteSeite(set, karte, { zoom: m.zoom }), m.breite, m.hoehe, temp);
}

function ohneBeschnitt(set, bild) {
  const m = masse(set);
  return bild.crop({ x: m.beschnittPx, y: m.beschnittPx, width: m.breite - 2 * m.beschnittPx, height: m.hoehe - 2 * m.beschnittPx });
}

// Rendert die gewählten Karten (Standard: alle) nach export/png/
async function rendereKarten(ordner, { nr, beschnitt = true } = {}) {
  const set = store.ladeSet(ordner);
  const temp = tempOrdner();
  const ergebnis = [];
  try {
    for (const n of store.waehleNummern(set.ordner, nr)) {
      const karte = store.ladeKarte(set.ordner, n);
      let bild = await rendereKarteBild(set, karte, temp);
      if (!beschnitt) bild = ohneBeschnitt(set, bild);
      const datei = path.join(set.ordner, 'export', 'png', `${set.kuerzel}-${store.nr3(n)}_v${karte.version}${beschnitt ? '' : '_ohne-beschnitt'}.png`);
      fs.mkdirSync(path.dirname(datei), { recursive: true });
      fs.writeFileSync(datei, bild.toPNG());
      ergebnis.push({ nummer: n, version: karte.version, name: karte.name, png: datei });
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  return ergebnis;
}

// Schnittmarken an den Endformat-Kanten, nur im Rand außerhalb des Kartenrasters
function schnittmarken(x0, y0, spalten, zeilen, k) {
  const linien = [];
  const lang = 5;
  const abstand = 1;
  const xs = [];
  const ys = [];
  for (let c = 0; c < spalten; c++) xs.push(x0 + c * k.breite + k.beschnitt, x0 + (c + 1) * k.breite - k.beschnitt);
  for (let r = 0; r < zeilen; r++) ys.push(y0 + r * k.hoehe + k.beschnitt, y0 + (r + 1) * k.hoehe - k.beschnitt);
  const x1 = x0 + spalten * k.breite;
  const y1 = y0 + zeilen * k.hoehe;
  for (const x of xs) {
    linien.push([x, Math.max(0, y0 - abstand - lang), x, y0 - abstand]);
    linien.push([x, y1 + abstand, x, Math.min(A4.hoehe, y1 + abstand + lang)]);
  }
  for (const y of ys) {
    linien.push([Math.max(0, x0 - abstand - lang), y, x0 - abstand, y]);
    linien.push([x1 + abstand, y, Math.min(A4.breite, x1 + abstand + lang), y]);
  }
  return linien
    .filter(([a, b, c, d]) => Math.abs(c - a) > 0.2 || Math.abs(d - b) > 0.2)
    .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`).join('');
}

function bogenSeiten(bilder, rueckseite, k) {
  const spalten = Math.floor(A4.breite / k.breite);
  const zeilen = Math.floor(A4.hoehe / k.hoehe);
  const proBogen = spalten * zeilen;
  const x0 = (A4.breite - spalten * k.breite) / 2;
  const y0 = (A4.hoehe - zeilen * k.hoehe) / 2;
  const marken = `<svg class="marken" viewBox="0 0 ${A4.breite} ${A4.hoehe}" stroke="#000" stroke-width="0.15">${schnittmarken(x0, y0, spalten, zeilen, k)}</svg>`;
  const seiten = [];
  for (let i = 0; i < bilder.length; i += proBogen) {
    const teil = bilder.slice(i, i + proBogen);
    const vorne = teil.map((url, j) => {
      const r = Math.floor(j / spalten);
      const c = j % spalten;
      return `<img src="${url}" style="left:${x0 + c * k.breite}mm;top:${y0 + r * k.hoehe}mm">`;
    }).join('');
    seiten.push(`<div class="seite">${vorne}${marken}</div>`);
    if (rueckseite) {
      // Rückseiten spiegelverkehrt, damit sie beim beidseitigen Druck hinter der richtigen Karte liegen
      const hinten = teil.map((_, j) => {
        const r = Math.floor(j / spalten);
        const c = spalten - 1 - (j % spalten);
        return `<img src="${rueckseite}" style="left:${x0 + c * k.breite}mm;top:${y0 + r * k.hoehe}mm">`;
      }).join('');
      seiten.push(`<div class="seite">${hinten}${marken}</div>`);
    }
  }
  return { seiten, seitenformat: `${A4.breite}mm ${A4.hoehe}mm`, seite: A4 };
}

function einzelSeiten(bilder, rueckseite, k) {
  const seiten = [];
  for (const url of bilder) {
    seiten.push(`<div class="seite"><img src="${url}" style="left:0;top:0"></div>`);
    if (rueckseite) seiten.push(`<div class="seite"><img src="${rueckseite}" style="left:0;top:0"></div>`);
  }
  return { seiten, seitenformat: `${k.breite}mm ${k.hoehe}mm`, seite: k };
}

// Erzeugt ein Druck-PDF nach export/druck/. modus "bogen" = A4 mit Schnittmarken, "einzeln" = eine Karte pro Seite
// mitEntwuerfen: auch Karten drucken, denen noch Angaben fehlen
async function druckePdf(ordner, { nr, modus = 'bogen', rueckseiten = true, auflage = 1, mitEntwuerfen = false } = {}) {
  if (!['bogen', 'einzeln'].includes(modus)) throw new store.Fehler('modus muss bogen oder einzeln sein.', 'pflichtfelder_fehlen', ['modus']);
  const set = store.ladeSet(ordner);
  const m = masse(set);
  const k = m.mm;
  const temp = tempOrdner();
  try {
    const karten = store.waehleNummern(set.ordner, nr).map((n) => store.ladeKarte(set.ordner, n));
    if (!karten.length) throw new store.Fehler('Das Set hat noch keine Karten.', 'karte_fehlt');
    const entwuerfe = karten.filter((k) => k.entwurf);
    if (entwuerfe.length && !mitEntwuerfen) {
      throw new store.Fehler('Einige Karten sind noch Entwürfe. Vervollständigen oder ausdrücklich mitdrucken.', 'entwuerfe',
        entwuerfe.map((k) => `${k.nummer} ${k.name || ''}: ${(k.offene_punkte || []).join(', ')}`));
    }
    const urls = [];
    for (const karte of karten) {
      const datei = path.join(temp, `${store.nr3(karte.nummer)}.png`);
      fs.writeFileSync(datei, (await rendereKarteBild(set, karte, temp)).toPNG());
      urls.push(require('url').pathToFileURL(datei).href);
    }
    let rueckUrl = null;
    if (rueckseiten) {
      const datei = path.join(temp, 'rueckseite.png');
      fs.writeFileSync(datei, (await fotografiere(rueckseiteSeite(set, { zoom: m.zoom }), m.breite, m.hoehe, temp)).toPNG());
      rueckUrl = require('url').pathToFileURL(datei).href;
    }
    const aufbau = modus === 'bogen' ? bogenSeiten(urls, rueckUrl, k) : einzelSeiten(urls, rueckUrl, k);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${aufbau.seitenformat};margin:0}
html,body{margin:0;padding:0}
.seite{position:relative;width:${aufbau.seite.breite}mm;height:${aufbau.seite.hoehe}mm;overflow:hidden;page-break-after:always;break-after:page}
.seite:last-child{page-break-after:auto;break-after:auto}
.seite img{position:absolute;width:${k.breite}mm;height:${k.hoehe}mm}
.marken{position:absolute;inset:0;width:100%;height:100%}
</style></head><body>${aufbau.seiten.join('')}
<script>Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))).then(() => { window.__fertig = true; });</script>
</body></html>`;
    const htmlDatei = path.join(temp, 'druck.html');
    fs.writeFileSync(htmlDatei, html, 'utf8');
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    let pdf;
    try {
      await win.loadFile(htmlDatei);
      await warteBisFertig(win.webContents);
      pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { marginType: 'none' } });
    } finally {
      win.destroy();
    }
    const datum = new Date().toISOString().slice(0, 10);
    let ziel = path.join(set.ordner, 'export', 'druck', `${set.kuerzel}_${datum}_${modus}.pdf`);
    for (let i = 2; fs.existsSync(ziel); i++) ziel = path.join(set.ordner, 'export', 'druck', `${set.kuerzel}_${datum}_${modus}_${i}.pdf`);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, pdf);
    store.vermerkeDruck(set.ordner, karten.map((x) => ({ nummer: x.nummer, version: x.version })), path.relative(set.ordner, ziel).split(path.sep).join('/'), auflage);
    return { pdf: ziel, modus, karten: karten.map((x) => x.nummer), seiten: aufbau.seiten.length, rueckseiten };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = { rendereKarten, druckePdf, DPI };
