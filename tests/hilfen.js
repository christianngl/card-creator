// Gemeinsame Helfer für die Tests: temporäre Ordner und erzeugte Platzhalterbilder (nie echte Fotos verwenden)
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

function tempOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cc-test-'));
}

// Schreibt ein PNG mit Farbverlauf
function platzhalterPng(datei, breite = 300, hoehe = 400) {
  const zeile = breite * 3 + 1;
  const roh = Buffer.alloc(zeile * hoehe);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const o = y * zeile + 1 + x * 3;
      roh[o] = 60 + Math.round((x / breite) * 150);
      roh[o + 1] = 100 + Math.round((y / hoehe) * 120);
      roh[o + 2] = 200;
    }
  }
  const chunk = (typ, daten) => {
    const laenge = Buffer.alloc(4);
    laenge.writeUInt32BE(daten.length);
    const td = Buffer.concat([Buffer.from(typ), daten]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([laenge, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  fs.writeFileSync(datei, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(roh)), chunk('IEND', Buffer.alloc(0)),
  ]));
  return datei;
}

// Breite und Höhe eines PNG aus dem IHDR-Block
function pngGroesse(datei) {
  const b = fs.readFileSync(datei);
  return { breite: b.readUInt32BE(16), hoehe: b.readUInt32BE(20) };
}

function spielkarte(bild, extra = {}) {
  return {
    layout: 'normal',
    name: 'Probe-Held',
    bild: { datei: bild },
    bildquelle: 'ki',
    seltenheit: 'häufig',
    stufe: 'Basis',
    kp: 60,
    typ: 'Feuer',
    attacken: [{ kosten: ['Feuer'], name: 'Funkenschlag', schaden: 20, text: 'Test' }],
    ...extra,
  };
}

module.exports = { tempOrdner, platzhalterPng, pngGroesse, spielkarte };
