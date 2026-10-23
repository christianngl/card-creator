// Electron-Einstieg ohne Fenster für die Kommandozeile: führt einen Render-Auftrag aus und gibt das Ergebnis als JSON aus.
// Aufruf (durch src/cli/index.js): electron src/render/headless.js <auftrag als base64-JSON>
const { app } = require('electron');
const { rendereKarten, druckePdf } = require('./render');

const MARKE = '@@ERGEBNIS@@';
const auftrag = JSON.parse(Buffer.from(process.argv[process.argv.length - 1], 'base64').toString('utf8'));

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  let antwort;
  try {
    const ergebnis = auftrag.art === 'druck'
      ? await druckePdf(auftrag.set, auftrag.optionen)
      : await rendereKarten(auftrag.set, auftrag.optionen);
    antwort = { ok: true, ergebnis };
  } catch (e) {
    antwort = { ok: false, fehler: e.message, code: e.code || 'fehler', offene_punkte: e.offene_punkte || [] };
  }
  process.stdout.write(`\n${MARKE}${JSON.stringify(antwort)}\n`, () => app.exit(antwort.ok ? 0 : 1));
});
