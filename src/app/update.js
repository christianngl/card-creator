// Sucht auf GitHub nach einem neueren Release und spielt es auf Wunsch ein.
// Übertragen wird nichts außer der Anfrage nach dem neuesten Release, Karten und Fotos bleiben lokal.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REPO = 'christianngl/ctcg-creator';
const RELEASES = `https://github.com/${REPO}/releases`;
const ALTE_EXE = '--alte-exe=';

// "v0.2.10" → [0, 2, 10]; Zusätze wie "-beta" werden ignoriert
function zerlege(version) {
  return String(version).replace(/^v/i, '').split(/[-+]/)[0].split('.').map((t) => parseInt(t, 10) || 0);
}

// > 0, wenn a neuer ist als b
function vergleiche(a, b) {
  const x = zerlege(a);
  const y = zerlege(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}

// "cTCG-Creator-Setup-0.2.1.exe" → "0.2.1", null ohne Versionsnummer
function dateiVersion(name) {
  const m = /(\d+\.\d+\.\d+)/.exec(name);
  return m ? m[1] : null;
}

// Passende Datei des Releases: Installer für die installierte App, portable EXE für die portable.
// Die Versionsnummer im Dateinamen muss zur Version des Releases passen, sonst spielte ein Release
// mit Dateien einer älteren Version immer wieder dieselbe alte Version ein.
function waehleDatei(assets, portabel, version) {
  const muster = portabel ? /portable\.exe$/i : /setup.*\.exe$/i;
  return (assets || []).find((a) => muster.test(a.name) && dateiVersion(a.name) && vergleiche(dateiVersion(a.name), version) === 0) || null;
}

async function neuestesRelease() {
  const antwort = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ctcg-creator' },
    signal: AbortSignal.timeout(10000),
  });
  if (!antwort.ok) throw new Error(`GitHub antwortet mit ${antwort.status}.`);
  const r = await antwort.json();
  return { version: r.tag_name.replace(/^v/i, ''), notizen: r.body || '', seite: r.html_url, assets: r.assets || [] };
}

async function lade(url, ziel, fortschritt) {
  const antwort = await fetch(url, { headers: { 'User-Agent': 'ctcg-creator' } });
  if (!antwort.ok) throw new Error(`Download fehlgeschlagen (${antwort.status}).`);
  const gesamt = Number(antwort.headers.get('content-length')) || 0;
  const teil = `${ziel}.part`;
  const datei = fs.createWriteStream(teil);
  let geladen = 0;
  try {
    for await (const stueck of antwort.body) {
      geladen += stueck.length;
      if (!datei.write(stueck)) await new Promise((ok) => datei.once('drain', ok));
      if (gesamt) fortschritt(geladen / gesamt);
    }
    await new Promise((ok, fehler) => datei.end((e) => (e ? fehler(e) : ok())));
  } catch (e) {
    datei.destroy();
    fs.rmSync(teil, { force: true });
    throw e;
  }
  fs.renameSync(teil, ziel);
}

// Startet die neue Version und beendet diese. Installer: still, mit Neustart der App.
// Portable: neue EXE neben die alte legen und starten. Die alte löscht die neue selbst (entferneAlteExe),
// ohne verstecktes PowerShell-Skript, das Virenscanner als verdächtig melden.
function spieleEin(app, datei, portabel) {
  if (portabel) {
    const alt = process.env.PORTABLE_EXECUTABLE_FILE;
    const args = alt && path.resolve(alt) !== path.resolve(datei) ? [ALTE_EXE + alt] : [];
    spawn(datei, args, { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn(datei, ['/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
  }
  app.quit();
}

// still = true beim Start: ohne Internet oder ohne neue Version kommt keine Meldung
async function suche({ app, dialog, shell, fenster, still = false }) {
  const portabel = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
  let release;
  try {
    release = await neuestesRelease();
  } catch (e) {
    if (!still) dialog.showMessageBox(fenster, { type: 'warning', title: 'Nach Updates suchen', message: 'Die Suche nach Updates hat nicht geklappt.', detail: `${e.message}\nBesteht eine Internetverbindung?` });
    return;
  }
  const aktuell = app.getVersion();
  if (vergleiche(release.version, aktuell) <= 0) {
    if (!still) dialog.showMessageBox(fenster, { type: 'info', title: 'Nach Updates suchen', message: `cTCG Creator ${aktuell} ist aktuell.` });
    return;
  }

  const datei = app.isPackaged ? waehleDatei(release.assets, portabel, release.version) : null;
  const knoepfe = datei ? ['Jetzt aktualisieren', 'Release-Seite öffnen', 'Später'] : ['Release-Seite öffnen', 'Später'];
  const hinweis = app.isPackaged
    ? (datei ? '\n\nDie App wird dafür beendet. Ungespeicherte Änderungen vorher speichern.' :`\n\nIm Release fehlt die passende Datei für Version ${release.version}.`)
    : '\n\nDiese Ausgabe läuft aus dem Projektordner. Aktualisieren mit „git pull“.';
  const { response } = await dialog.showMessageBox(fenster, {
    type: 'info',
    title: 'Update verfügbar',
    message: `cTCG Creator ${release.version} ist verfügbar (installiert: ${aktuell}).`,
    detail: (release.notizen.trim() || 'Keine Änderungsliste.') + hinweis,
    buttons: knoepfe,
    defaultId: 0,
    cancelId: knoepfe.length - 1,
  });
  const wahl = knoepfe[response];
  if (wahl === 'Release-Seite öffnen') shell.openExternal(release.seite || RELEASES);
  if (wahl !== 'Jetzt aktualisieren') return;

  // Die portable EXE landet neben der alten, der Installer im Temp-Ordner
  const ordner = portabel ? path.dirname(process.env.PORTABLE_EXECUTABLE_FILE) : fs.mkdtempSync(path.join(os.tmpdir(), 'ctcg-creator-update-'));
  const ziel = path.join(ordner, datei.name);
  try {
    await lade(datei.browser_download_url, ziel, (anteil) => fenster.setProgressBar(anteil));
  } catch (e) {
    fenster.setProgressBar(-1);
    dialog.showMessageBox(fenster, { type: 'error', title: 'Update', message: 'Das Update ließ sich nicht herunterladen.', detail: e.message });
    return;
  }
  fenster.setProgressBar(-1);
  spieleEin(app, ziel, portabel);
}

// Nach dem Update der portablen EXE: die alte Datei löschen, sobald sie nicht mehr läuft.
// Gelöscht wird nur eine portable EXE im selben Ordner wie die neue.
function entferneAlteExe(argv) {
  const neu = process.env.PORTABLE_EXECUTABLE_FILE;
  const arg = argv.find((a) => a.startsWith(ALTE_EXE));
  if (!neu || !arg) return;
  const alt = path.resolve(arg.slice(ALTE_EXE.length));
  if (alt === path.resolve(neu) || path.dirname(alt) !== path.dirname(path.resolve(neu)) || !/portable\.exe$/i.test(alt)) return;
  let versuche = 0;
  const timer = setInterval(() => {
    versuche += 1;
    try {
      fs.rmSync(alt, { force: true });
      clearInterval(timer);
    } catch {
      if (versuche >= 60) clearInterval(timer);
    }
  }, 1000);
  timer.unref();
}

module.exports = { suche, vergleiche, waehleDatei, dateiVersion, entferneAlteExe, lade };
