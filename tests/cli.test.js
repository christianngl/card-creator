// Ende-zu-Ende-Tests der Kommandozeile, inklusive Rendern über Electron
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tempOrdner, platzhalterPng, pngGroesse, spielkarte } = require('./hilfen');

const CLI = path.join(__dirname, '..', 'src', 'cli', 'index.js');

function cli(...args) {
  try {
    return { ...JSON.parse(execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' })), exit: 0 };
  } catch (e) {
    if (!e.stdout) throw e;
    return { ...JSON.parse(e.stdout), exit: e.status };
  }
}

const basis = tempOrdner();
const ordner = path.join(basis, 'set');
const bild = platzhalterPng(path.join(basis, 'bild.png'));

test('Set und Karten über die Kommandozeile anlegen', () => {
  assert.equal(cli('set', 'neu', '--ordner', ordner, '--name', 'CLI-Set', '--kuerzel', 'CL1', '--kartentyp', 'spielkarte').ok, true);
  const r = cli('karte', 'neu', '--set', ordner, '--json', JSON.stringify(spielkarte(bild)));
  assert.equal(r.ok, true);
  assert.equal(r.nummer, 1);
  const json = path.join(basis, 'trainer.json');
  fs.writeFileSync(json, JSON.stringify({ layout: 'trainer', name: 'Rat', bild: { datei: bild }, bildquelle: 'foto', seltenheit: 'selten', effekt: 'Ziehe 2 Karten.' }));
  assert.equal(cli('karte', 'neu', '--set', ordner, '--json', json).nummer, 2);
});

test('Fehlende Angaben: Exit-Code 2 und offene Punkte', () => {
  const r = cli('karte', 'neu', '--set', ordner, '--json', '{"layout":"normal","name":"Halb"}');
  assert.equal(r.exit, 2);
  assert.equal(r.ok, false);
  assert.ok(r.offene_punkte.includes('kp'));
});

test('Testfall 4: Rendern ergibt 300 dpi mit Beschnitt (69 x 94 mm)', () => {
  const r = cli('rendern', '--set', ordner, '--nr', '1');
  assert.equal(r.ok, true);
  assert.deepEqual(pngGroesse(r.karten[0].png), { breite: 815, hoehe: 1110 });
  const ohne = cli('rendern', '--set', ordner, '--nr', '1', '--ohne-beschnitt');
  assert.deepEqual(pngGroesse(ohne.karten[0].png), { breite: 745, hoehe: 1040 });
});

test('Testfall 4: Druck-PDF wird erzeugt und in der Sammlung vermerkt', () => {
  const r = cli('druck', '--set', ordner);
  assert.equal(r.ok, true);
  assert.equal(r.seiten, 2);
  assert.ok(fs.readFileSync(r.pdf).subarray(0, 5).toString() === '%PDF-');
  const s = cli('sammlung', '--set', ordner);
  assert.equal(s.gedruckt, 2);
});

test('Unbekannter Befehl liefert einen Fehler', () => {
  const r = cli('veroeffentlichen', '--set', ordner);
  assert.equal(r.ok, false);
  assert.equal(r.exit, 1);
});
