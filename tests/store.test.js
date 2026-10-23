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

test('Formate: Skat geht, zu breite Formate werden abgelehnt', () => {
  const set = store.erstelleSet(path.join(tempOrdner(), 's'), { name: 'X', kuerzel: 'XX', kartentyp: 'spielkarte', format: { breite: 59, hoehe: 91 } });
  assert.deepEqual(set.format, { breite: 59, hoehe: 91, beschnitt: 3 });
  assert.throws(() => store.erstelleSet(path.join(tempOrdner(), 's'), { name: 'X', kuerzel: 'XX', kartentyp: 'spielkarte', format: { breite: 88, hoehe: 63 } }), (e) => e.offene_punkte[0].includes('zu breit'));
});

test('Karte mit eigenem Format: Höhe des Rasters wächst mit', () => {
  const { ordner, bild } = neuesSet();
  const k = store.neueKarte(ordner, spielkarte(bild, { format: { breite: 59, hoehe: 91 } }));
  const html = karteSeite(store.ladeSet(ordner), k);
  assert.match(html, /--dh:90px/);
  assert.match(html, /height:1030px/);
  assert.throws(() => store.neueKarte(ordner, spielkarte(bild, { format: { breite: 100, hoehe: 60 } })), (e) => e.offene_punkte.some((x) => x.includes('zu breit')));
});

test('Typen pro Set bearbeiten, Warnung bei verwendeten Typen', () => {
  const { ordner, bild } = neuesSet();
  store.neueKarte(ordner, spielkarte(bild));
  const typen = [{ name: 'Blitz', symbol: 'ϟ', farbe: '#e6c619', hintergrund: ['#fff9d6', '#f2e49a'] }];
  const set = store.aendereSet(ordner, { typen });
  assert.equal(set.typen.length, 1);
  assert.ok(set.warnungen[0].includes('Feuer'));
  assert.throws(() => store.aendereSet(ordner, { typen: [{ name: 'Blitz', symbol: '', farbe: 'gelb' }] }), (e) => e.offene_punkte.includes('typen[0].symbol') && e.offene_punkte.some((x) => x.startsWith('typen[0].farbe')));
  assert.throws(() => store.aendereSet(ordner, { typen: [typen[0], typen[0]] }), (e) => e.offene_punkte.some((x) => x.includes('doppelt')));
});

test('Titelkarte muss es im Set geben', () => {
  const { ordner, bild } = neuesSet();
  store.neueKarte(ordner, spielkarte(bild));
  assert.equal(store.aendereSet(ordner, { titelkarte: 1 }).titelkarte, 1);
  assert.equal(store.aendereSet(ordner, { titelkarte: null }).titelkarte, null);
  assert.throws(() => store.aendereSet(ordner, { titelkarte: 5 }), { code: 'karte_fehlt' });
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

test('Entwurf: fehlende Angaben werden gespeichert und als offen markiert', () => {
  const { ordner } = neuesSet();
  const k = store.neueKarte(ordner, { name: 'Halbfertig' }, { entwurf: true });
  assert.equal(k.entwurf, true);
  assert.equal(k.layout, 'normal');
  assert.ok(k.offene_punkte.includes('kp'));
  assert.equal(store.listeKarten(ordner)[0].entwurf, true);
});

test('Entwurf wird vollständig, sobald alle Angaben da sind', () => {
  const { ordner, bild } = neuesSet();
  store.neueKarte(ordner, { name: 'Halbfertig' }, { entwurf: true });
  const k = store.aendereKarte(ordner, 1, spielkarte(bild), { entwurf: true });
  assert.equal(k.entwurf, undefined);
  assert.equal(k.offene_punkte, undefined);
});

test('Ersetzen übernimmt geleerte Felder (Formular der App)', () => {
  const { ordner, bild } = neuesSet();
  store.neueKarte(ordner, spielkarte(bild, { flavor: 'Alt' }));
  const { flavor, ...ohneFlavor } = store.ladeKarte(ordner, 1);
  const k = store.aendereKarte(ordner, 1, ohneFlavor, { ersetzen: true });
  assert.equal(k.flavor, undefined);
});

test('Goldkarte und Folien-Effekte erscheinen im Markup', () => {
  const { ordner, bild } = neuesSet();
  const gold = store.neueKarte(ordner, spielkarte(bild, { layout: 'gold', folie: { art: 'sterne', bereich: 'karte', staerke: 0.5 } }));
  const html = karteSeite(store.ladeSet(ordner), gold);
  assert.match(html, /class="card full goldkarte/);
  assert.match(html, /photo goldton/);
  assert.match(html, /class="fx fx-sterne" style="opacity:0.5"/);
  // gleicher Effekt bei jedem Rendern
  assert.equal(html, karteSeite(store.ladeSet(ordner), gold));
  assert.throws(() => store.neueKarte(ordner, spielkarte(bild, { folie: { art: 'feuerwerk' } })), (e) => e.offene_punkte.some((p) => p.startsWith('folie.art')));
});

test('Kommentar wird gespeichert, erscheint aber nicht auf der Karte', () => {
  const { ordner, bild } = neuesSet();
  const k = store.neueKarte(ordner, spielkarte(bild, { kommentar: 'Später Foto vom Sommer nehmen' }));
  assert.equal(store.ladeKarte(ordner, 1).kommentar, 'Später Foto vom Sommer nehmen');
  assert.equal(store.listeKarten(ordner)[0].kommentar, 'Später Foto vom Sommer nehmen');
  assert.ok(!karteSeite(store.ladeSet(ordner), k).includes('Später Foto'));
});
