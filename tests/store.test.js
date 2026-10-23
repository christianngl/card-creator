// Tests für Set-Ablage, Pflichtfelder, Versionen und Sammlung (ohne Electron)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const store = require('../src/core/store');
const { karteSeite } = require('../src/core/seite');
const { tempOrdner, platzhalterPng, spielkarte } = require('./hilfen');

function neuesSet(extra = {}) {
  const basis = tempOrdner();
  const bild = platzhalterPng(path.join(basis, 'bild.png'));
  const ordner = path.join(basis, 'set');
  store.erstelleSet(ordner, { name: 'Testset', kuerzel: 'ts1', kartentyp: 'spielkarte', ...extra });
  return { basis, ordner, bild };
}

test('Set anlegen legt Ordnerstruktur und Standardwerte der Vorlage an', () => {
  const { ordner } = neuesSet();
  const set = store.ladeSet(ordner);
  assert.equal(set.kuerzel, 'TS1');
  assert.deepEqual(set.format, { breite: 63, hoehe: 88, beschnitt: 3 });
  assert.equal(set.typen.length, 13);
  for (const d of ['karten', 'bilder', 'export/png', 'export/druck']) assert.ok(fs.existsSync(path.join(ordner, d)), d);
});

test('Set anlegen nur in leerem Ordner', () => {
  const { ordner } = neuesSet();
  assert.throws(() => store.erstelleSet(ordner, { name: 'X', kuerzel: 'XX', kartentyp: 'spielkarte' }), { code: 'ordner_nicht_leer' });
});

test('Set ohne Pflichtangaben meldet offene Punkte', () => {
  assert.throws(() => store.erstelleSet(path.join(tempOrdner(), 's'), { name: 'X' }), (e) => {
    assert.equal(e.code, 'pflichtfelder_fehlen');
    assert.ok(e.offene_punkte.some((p) => p.startsWith('kuerzel')));
    assert.ok(e.offene_punkte.some((p) => p.startsWith('kartentyp')));
    return true;
  });
});

test('Nicht unterstütztes Format wird abgelehnt', () => {
  assert.throws(() => store.erstelleSet(path.join(tempOrdner(), 's'), { name: 'X', kuerzel: 'XX', kartentyp: 'spielkarte', format: { breite: 59, hoehe: 91, beschnitt: 3 } }), /unterstützt dieses Format nicht/);
});

test('Testfall 1: Karte bekommt die nächste freie Nummer, Bild wird ins Set kopiert', () => {
  const { ordner, bild } = neuesSet();
  const k1 = store.neueKarte(ordner, spielkarte(bild));
  const k2 = store.neueKarte(ordner, spielkarte(bild, { name: 'Zweiter' }));
  assert.equal(k1.nummer, 1);
  assert.equal(k2.nummer, 2);
  assert.equal(k1.bild.datei, 'bilder/bild.png');
  assert.equal(k2.bild.datei, 'bilder/bild_2.png');
  assert.ok(fs.existsSync(path.join(ordner, 'bilder', 'bild.png')));
});

test('Testfall 2: Spielkarte ohne Pflichtwert wird nicht gespeichert', () => {
  const { ordner, bild } = neuesSet();
  const { kp, ...ohneKp } = spielkarte(bild);
  assert.throws(() => store.neueKarte(ordner, ohneKp), (e) => e.code === 'pflichtfelder_fehlen' && e.offene_punkte.includes('kp'));
  assert.deepEqual(store.nummern(ordner), []);
});

test('Unbekannter Typ und falsches Layout werden gemeldet', () => {
  const { ordner, bild } = neuesSet();
  assert.throws(() => store.neueKarte(ordner, spielkarte(bild, { typ: 'Plasma' })), (e) => e.offene_punkte.some((p) => p.startsWith('typ: unbekannt')));
  assert.throws(() => store.neueKarte(ordner, spielkarte(bild, { layout: 'sammel' })), (e) => e.offene_punkte.some((p) => p.includes('passt nicht zum Kartentyp')));
});

test('Testfall 3: Ändern legt eine neue Version an, die alte bleibt abrufbar', () => {
  const { ordner, bild } = neuesSet();
  store.neueKarte(ordner, spielkarte(bild));
  const v2 = store.aendereKarte(ordner, 1, { flavor: 'Neuer Text' });
  assert.equal(v2.version, 2);
  assert.deepEqual(store.versionen(ordner, 1), [1, 2]);
  assert.equal(store.ladeKarte(ordner, 1, 1).flavor, undefined);
  assert.equal(store.ladeKarte(ordner, 1).flavor, 'Neuer Text');
  assert.equal(store.ladeKarte(ordner, 1).bild.datei, 'bilder/bild.png');
});

test('Testfall 5: Besitz wird in der Sammlung vermerkt', () => {
  const { ordner, bild } = neuesSet();
  store.neueKarte(ordner, spielkarte(bild));
  store.setzeBesitz(ordner, 1, 2);
  assert.equal(store.listeKarten(ordner)[0].besitz, 2);
});

test('Nummernauswahl versteht Bereiche und Listen', () => {
  const { ordner, bild } = neuesSet();
  for (let i = 0; i < 5; i++) store.neueKarte(ordner, spielkarte(bild));
  assert.deepEqual(store.waehleNummern(ordner, '1-3,5'), [1, 2, 3, 5]);
  assert.deepEqual(store.waehleNummern(ordner), [1, 2, 3, 4, 5]);
  assert.throws(() => store.waehleNummern(ordner, '9'), { code: 'karte_fehlt' });
});

test('Sammelkarten-Set nutzt das Layout sammel', () => {
  const { ordner, bild } = neuesSet({ kartentyp: 'sammelkarte' });
  const k = store.neueKarte(ordner, { layout: 'sammel', name: 'Strandtag', bild: { datei: bild }, bildquelle: 'foto', seltenheit: 'selten', beschreibung: 'Sonne & Meer' });
  const html = karteSeite(store.ladeSet(ordner), k);
  assert.match(html, /class="card sammel/);
  assert.match(html, /Sonne &amp; Meer/);
  assert.match(html, /001\/001/);
});

test('Texte werden in der Kartenseite maskiert', () => {
  const { ordner, bild } = neuesSet();
  const k = store.neueKarte(ordner, spielkarte(bild, { name: '<script>x</script>' }));
  const html = karteSeite(store.ladeSet(ordner), k);
  assert.ok(!html.includes('<script>x</script>'));
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
});
