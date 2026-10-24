// Läuft vor "npm run dist" (predist).
// 1. Bricht ab, wenn es zur Version aus package.json schon einen Tag gibt: Dann wurde vergessen, die Version
//    zu erhöhen, und das neue Release bekäme Dateien mit der alten Versionsnummer (so geschehen bei v0.2.1).
// 2. Leert dist/, damit dort nur die Dateien der aktuellen Version liegen und pinx beim Release keine alten anbietet.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const wurzel = path.join(__dirname, '..');
const { version } = require(path.join(wurzel, 'package.json'));
const tag = `v${version}`;

let tags = [];
try {
  execFileSync('git', ['fetch', '--tags', '--quiet'], { cwd: wurzel, stdio: 'ignore', timeout: 30000 });
} catch {
  // ohne Internet gelten die lokalen Tags
}
try {
  tags = execFileSync('git', ['tag', '--list'], { cwd: wurzel, encoding: 'utf8' }).split(/\r?\n/).map((t) => t.trim());
} catch {
  // kein Git: nur aufräumen
}
if (tags.includes(tag)) {
  console.error(`Den Tag ${tag} gibt es schon. Vor dem Bauen die Version in package.json erhöhen (npm version patch --no-git-tag-version).`);
  process.exit(1);
}

const dist = path.join(wurzel, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
console.log(`Baue Version ${version}, dist/ geleert.`);
