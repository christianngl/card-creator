// Arbeitskopien großer Fotos. Sehr große Bilder (z. B. 100 Megapixel) lädt Chromium beim Rendern nicht zuverlässig,
// das Fotofenster bleibt dann leer. Vorschau und Rendern nutzen deshalb eine verkleinerte Kopie in <set>/.vorschau/bilder/.
// Das Original in bilder/ bleibt unverändert. Läuft nur im Electron-Hauptprozess (nativeImage).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { nativeImage } = require('electron');

// Bis zu dieser Pixelzahl wird das Original genommen. 24 MP reichen auch bei 3-fachem Zoom und
// großen Formaten für 300 dpi (Fotofenster 63 × 88 mm: rund 2000 px Breite bei Zoom 3).
const MAX_PIXEL = 24e6;
// Kleinere Dateien prüfen wir gar nicht erst (spart das Dekodieren bei jedem Vorschau-Aufruf)
const MIN_BYTES = 2 * 1024 * 1024;

const gemerkt = new Map();

// EXIF-Ausrichtung (1–8) eines JPEG, 1 wenn keine angegeben ist. Handyfotos sind oft nur per EXIF gedreht.
function exifAusrichtung(puffer) {
  if (puffer.readUInt16BE(0) !== 0xffd8) return 1;
  for (let o = 2; o + 4 < puffer.length;) {
    if (puffer[o] !== 0xff) return 1;
    const marke = puffer[o + 1];
    const laenge = puffer.readUInt16BE(o + 2);
    if (marke === 0xda) return 1;
    if (marke === 0xe1 && puffer.toString('latin1', o + 4, o + 10) === 'Exif\0\0') {
      const t = o + 10;
      const le = puffer.toString('latin1', t, t + 2) === 'II';
      const u16 = (p) => (le ? puffer.readUInt16LE(p) : puffer.readUInt16BE(p));
      const u32 = (p) => (le ? puffer.readUInt32LE(p) : puffer.readUInt32BE(p));
      const ifd = t + u32(t + 4);
      for (let i = 0; i < u16(ifd); i++) {
        const e = ifd + 2 + i * 12;
        if (u16(e) === 0x0112) return u16(e + 8) || 1;
      }
      return 1;
    }
    o += 2 + laenge;
  }
  return 1;
}

// Setzt einen minimalen EXIF-Block mit der Ausrichtung hinter den Anfang eines JPEG (toJPEG schreibt kein EXIF)
function mitAusrichtung(jpeg, ausrichtung) {
  if (ausrichtung === 1) return jpeg;
  const tiff = Buffer.from([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, ausrichtung, 0, 0, 0, 0, 0, 0, 0, 0]);
  const inhalt = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const kopf = Buffer.from([0xff, 0xe1, 0, 0]);
  kopf.writeUInt16BE(inhalt.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), kopf, inhalt, jpeg.subarray(2)]);
}

// Liefert den absoluten Pfad des Bildes, das beim Rendern verwendet wird: das Original oder eine verkleinerte Kopie
function arbeitsbild(ordner, datei) {
  const abs = path.resolve(ordner, datei);
  let stat;
  try { stat = fs.statSync(abs); } catch { return abs; }
  if (stat.size < MIN_BYTES) return abs;
  const schluessel = crypto.createHash('sha1').update(`${abs}|${stat.size}|${stat.mtimeMs}`).digest('hex').slice(0, 12);
  if (gemerkt.has(schluessel)) return gemerkt.get(schluessel);

  const png = path.extname(abs).toLowerCase() === '.png';
  const basis = path.basename(abs, path.extname(abs)).replace(/[^\w.-]+/g, '_').slice(0, 40);
  const ziel = path.join(path.resolve(ordner), '.vorschau', 'bilder', `${basis}-${schluessel}${png ? '.png' : '.jpg'}`);
  let ergebnis = abs;
  if (fs.existsSync(ziel)) ergebnis = ziel;
  else {
    const bild = nativeImage.createFromPath(abs);
    // Formate, die nativeImage nicht lesen kann (z. B. WebP), bleiben wie sie sind
    if (!bild.isEmpty()) {
      const { width, height } = bild.getSize();
      if (width * height > MAX_PIXEL) {
        const faktor = Math.sqrt(MAX_PIXEL / (width * height));
        const klein = bild.resize({ width: Math.round(width * faktor), height: Math.round(height * faktor), quality: 'best' });
        fs.mkdirSync(path.dirname(ziel), { recursive: true });
        fs.writeFileSync(ziel, png ? klein.toPNG() : mitAusrichtung(klein.toJPEG(92), exifAusrichtung(fs.readFileSync(abs))));
        ergebnis = ziel;
      }
    }
  }
  gemerkt.set(schluessel, ergebnis);
  return ergebnis;
}

// Für karteSeite/rueckseiteSeite: bildPfad(datei) eines Sets
const arbeitsbilder = (ordner) => (datei) => arbeitsbild(ordner, datei);

module.exports = { arbeitsbild, arbeitsbilder, exifAusrichtung, mitAusrichtung, MAX_PIXEL };
