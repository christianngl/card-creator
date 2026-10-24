// Versionsvergleich und Dateiauswahl der Update-Suche (ohne Netz)
const test = require('node:test');
const assert = require('node:assert');
const { vergleiche, waehleDatei } = require('../src/app/update');

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
    { name: 'CardCreator-0.3.0-portable.exe' },
    { name: 'CardCreator-Setup-0.3.0.exe' },
    { name: 'latest.yml' },
  ];
  assert.strictEqual(waehleDatei(assets, false).name, 'CardCreator-Setup-0.3.0.exe');
  assert.strictEqual(waehleDatei(assets, true).name, 'CardCreator-0.3.0-portable.exe');
  assert.strictEqual(waehleDatei([{ name: 'notizen.txt' }], false), null);
  assert.strictEqual(waehleDatei(undefined, true), null);
});
