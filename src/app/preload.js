// Brücke zwischen Oberfläche und Hauptprozess: nur diese Aufrufe stehen der Oberfläche zur Verfügung
const { contextBridge, ipcRenderer } = require('electron');

const KANAELE = [
  'set:zuletzt', 'set:waehleOrdner', 'set:neu', 'set:oeffnen', 'set:aendern',
  'karten:liste', 'karte:laden', 'karte:neu', 'karte:aendern',
  'bild:waehlen', 'vorschau', 'vorschau:rueckseite', 'sammlung:besitz',
  'export:png', 'export:druck', 'ordner:zeigen', 'datei:zeigen',
];

contextBridge.exposeInMainWorld('cc', {
  rufe: (kanal, ...args) => {
    if (!KANAELE.includes(kanal)) throw new Error(`Unbekannter Kanal: ${kanal}`);
    return ipcRenderer.invoke(kanal, ...args);
  },
});
