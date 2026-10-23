// Verzeichnis der Kartenvorlagen. Neue Vorlage: Ordner src/vorlagen/<id>/ mit vorlage.js und hier eintragen.
const VORLAGEN = {
  tcg: require('./tcg/vorlage'),
};

function vorlage(id) {
  const v = VORLAGEN[id];
  if (!v) throw new Error(`Unbekannte Vorlage: ${id} (vorhanden: ${Object.keys(VORLAGEN).join(', ')})`);
  return v;
}

module.exports = { VORLAGEN, vorlage };
