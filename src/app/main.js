// Electron-Hauptprozess der Desktop-App
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const store = require('../core/store');
const { karteSeite, rueckseiteSeite } = require('../core/seite');
const { vorlage } = require('../vorlagen');
const { rendereKarten, druckePdf } = require('../render/render');

const ZULETZT = () => path.join(app.getPath('userData'), 'zuletzt.json');

function zuletzt() {
  try {
    return JSON.parse(fs.readFileSync(ZULETZT(), 'utf8')).filter((o) => store.istSet(o));
  } catch {
    return [];
  }
}

function merke(ordner) {
  const liste = [path.resolve(ordner), ...zuletzt().filter((o) => o !== path.resolve(ordner))].slice(0, 10);
  fs.mkdirSync(path.dirname(ZULETZT()), { recursive: true });
  fs.writeFileSync(ZULETZT(), JSON.stringify(liste, null, 2));
}

function setInfo(ordner) {
  const set = store.ladeSet(ordner);
  const v = vorlage(set.vorlage);
  return { set, vorlage: { id: v.id, name: v.name, layouts: v.layouts, felder: v.felder, folien: v.folien || {} } };
}

let fenster;

// Jede Anfrage liefert { ok, wert } oder { ok: false, fehler, offene_punkte }
function bediene(kanal, fn) {
  ipcMain.handle(kanal, async (_e, ...args) => {
    try {
      return { ok: true, wert: await fn(...args) };
    } catch (e) {
      return { ok: false, fehler: e.message, code: e.code || 'fehler', offene_punkte: e.offene_punkte || [] };
    }
  });
}

bediene('set:zuletzt', () => zuletzt().map((o) => ({ ordner: o, name: store.ladeSet(o).name })));
bediene('set:waehleOrdner', async (titel) => {
  const r = await dialog.showOpenDialog(fenster, { title: titel, properties: ['openDirectory', 'createDirectory', 'promptToCreate'] });
  return r.canceled ? null : r.filePaths[0];
});
bediene('set:neu', (ordner, angaben) => {
  store.erstelleSet(ordner, angaben);
  merke(ordner);
  return setInfo(ordner);
});
bediene('set:oeffnen', (ordner) => {
  const info = setInfo(ordner);
  merke(ordner);
  return info;
});
bediene('set:aendern', (ordner, aenderungen) => {
  store.aendereSet(ordner, aenderungen);
  return setInfo(ordner);
});
bediene('karten:liste', (ordner) => store.listeKarten(ordner));
bediene('karte:laden', (ordner, nr, version) => ({ karte: store.ladeKarte(ordner, nr, version), versionen: store.versionen(ordner, nr), sammlung: store.ladeSammlung(ordner)[nr] || {} }));
// Die App speichert immer, notfalls als Entwurf. Das Formular liefert die ganze Karte, daher "ersetzen".
bediene('karte:neu', (ordner, daten) => store.neueKarte(ordner, daten, { entwurf: true }));
bediene('karte:aendern', (ordner, nr, daten) => store.aendereKarte(ordner, nr, daten, { entwurf: true, ersetzen: true }));
bediene('bild:importieren', (ordner, pfad) => store.importiereBild(ordner, pfad));
bediene('bild:waehlen', async (ordner) => {
  const r = await dialog.showOpenDialog(fenster, { title: 'Bild wählen', properties: ['openFile'], filters: [{ name: 'Bilder', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }] });
  return r.canceled ? null : store.importiereBild(ordner, r.filePaths[0]);
});
bediene('vorschau', (ordner, karte) => {
  const set = store.ladeSet(ordner);
  const nummer = karte.nummer || (store.nummern(ordner).slice(-1)[0] || 0) + 1;
  return karteSeite(set, { ...karte, nummer });
});
bediene('vorschau:rueckseite', (ordner) => rueckseiteSeite(store.ladeSet(ordner)));
bediene('sammlung:besitz', (ordner, nr, anzahl) => store.setzeBesitz(ordner, nr, anzahl));
bediene('export:png', (ordner, optionen) => rendereKarten(ordner, optionen));
bediene('export:druck', (ordner, optionen) => druckePdf(ordner, optionen));
bediene('ordner:zeigen', (pfad) => shell.openPath(pfad));
bediene('datei:zeigen', (pfad) => shell.showItemInFolder(pfad));

function oeffneFenster() {
  fenster = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'Card Creator',
    icon: path.join(__dirname, '..', '..', 'assets', 'app.ico'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false },
  });
  // Links öffnen nie ein neues Fenster oder den Browser
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
  fenster.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

app.whenReady().then(oeffneFenster);
app.on('window-all-closed', () => app.quit());
