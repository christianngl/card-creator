// Versionsvergleich und Dateiauswahl der Update-Suche (ohne Netz)
const test = require('node:test');
const assert = require('node:assert');
const { vergleiche, waehleDatei, dateiVersion } = require('../src/app/update');

test('Versionen werden stellenweise verglichen', () => {
  assert.ok(vergleiche('0.3.0', '0.2.0') > 0);
  assert.ok(vergleiche('v0.2.10', '0.2.9') > 0);
  assert.ok(vergleiche('0.2.0', '0.10.0') < 0);
  assert.strictEqual(vergleiche('v0.2.0', '0.2.0'), 0);
  assert.strictEqual(vergleiche('1.0', '1.0.0'), 0);
  assert.ok(vergleiche('1.0.0-beta', '0.9.9') > 0);
});

test('Installer bzw. portable EXE wird aus dem Release gewählt', () => {
  const assets = [
    { name: 'cTCG-Creator-0.3.0-portable.exe' },
    { name: 'cTCG-Creator-Setup-0.3.0.exe' },
    { name: 'latest.yml' },
  ];
  assert.strictEqual(waehleDatei(assets, false, '0.3.0').name, 'cTCG-Creator-Setup-0.3.0.exe');
  assert.strictEqual(waehleDatei(assets, true, '0.3.0').name, 'cTCG-Creator-0.3.0-portable.exe');
  assert.strictEqual(waehleDatei([{ name: 'notizen.txt' }], false, '0.3.0'), null);
  assert.strictEqual(waehleDatei(undefined, true, '0.3.0'), null);
});

test('Dateien einer anderen Version als das Release werden nicht gewählt', () => {
  // So sah Release v0.2.1 aus: Tag 0.2.1, angehängt waren noch die Dateien von 0.2.0
  const assets = [{ name: 'cTCG-Creator-0.2.0-portable.exe' }, { name: 'cTCG-Creator-Setup-0.2.0.exe' }];
  assert.strictEqual(waehleDatei(assets, false, '0.2.1'), null);
  assert.strictEqual(waehleDatei(assets, true, '0.2.1'), null);
  assert.strictEqual(waehleDatei([{ name: 'cTCG-Creator-Setup.exe' }], false, '0.2.1'), null);
  assert.strictEqual(dateiVersion('cTCG-Creator-Setup-0.2.10.exe'), '0.2.10');
});
