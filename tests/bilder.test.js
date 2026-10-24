// Arbeitskopien großer Fotos: Die EXIF-Ausrichtung muss beim Verkleinern erhalten bleiben (verkleinert wird nur in Electron)
const test = require('node:test');
const assert = require('node:assert');
const { exifAusrichtung, mitAusrichtung } = require('../src/render/bilder');

// Kleinstes JPEG-Gerüst: Anfang, ein Kommentar-Block, Bilddaten-Beginn, Ende
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xfe, 0, 4, 0x61, 0x62, 0xff, 0xda, 0, 2, 0xff, 0xd9]);

test('JPEG ohne EXIF hat Ausrichtung 1 und bleibt unverändert', () => {
  assert.equal(exifAusrichtung(jpeg), 1);
  assert.equal(mitAusrichtung(jpeg, 1), jpeg);
});

test('Ausrichtung wird geschrieben und wieder gelesen', () => {
  for (const a of [3, 6, 8]) {
    const mit = mitAusrichtung(jpeg, a);
    assert.equal(mit.readUInt16BE(0), 0xffd8);
    assert.equal(exifAusrichtung(mit), a);
  }
});

test('PNG und andere Dateien gelten als nicht gedreht', () => {
  assert.equal(exifAusrichtung(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), 1);
});
