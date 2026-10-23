// Oberfläche der Desktop-App. Alle Daten laufen über window.cc.rufe(kanal, …) zum Hauptprozess.
const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const zustand = { info: null, nr: null, karte: null, ansichtZaehler: 0 };

async function rufe(kanal, ...args) {
  const r = await window.cc.rufe(kanal, ...args);
  if (!r.ok) throw Object.assign(new Error(r.fehler), { offene_punkte: r.offene_punkte });
  return r.wert;
}

function meldung(art, text, punkte = [], aktion = null) {
  const m = $('#meldung');
  m.hidden = false;
  m.className = art;
  m.innerHTML = esc(text) + (punkte.length ? `<ul>${punkte.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '');
  if (aktion) {
    const a = document.createElement('a');
    a.textContent = ` ${aktion.text}`;
    a.onclick = aktion.fn;
    m.append(a);
  }
}

function keineMeldung() {
  $('#meldung').hidden = true;
}

async function mitWarten(fn) {
  $('#arbeitet').hidden = false;
  try {
    return await fn();
  } finally {
    $('#arbeitet').hidden = true;
  }
}

function fehler(e) {
  meldung('fehler', e.message, e.offene_punkte || []);
}

// ---------- Ansichten ----------

function zeigeAnsicht(id) {
  for (const a of ['start', 'uebersicht', 'arbeit']) $(`#${a}`).hidden = a !== id;
  $('#setAktionen').hidden = id === 'start';
  $('#btnUebersicht').hidden = id !== 'arbeit';
}

// Lädt Vorschaubilder nacheinander (der Hauptprozess rendert sie bei Bedarf und speichert sie zwischen)
async function ladeVorschauBilder(auftraege) {
  const ansicht = zustand.ansichtZaehler = (zustand.ansichtZaehler || 0) + 1;
  for (const { ordner, nr, img } of auftraege) {
    if (ansicht !== zustand.ansichtZaehler) return;
    try {
      img.src = await rufe('vorschau:bild', ordner, nr);
      img.closest('.kachel')?.classList.add('geladen');
    } catch { /* Vorschau ist nur Beiwerk */ }
  }
}

// ---------- Format-Auswahl (neues Set, Set-Einstellungen, Karte) ----------

// Baut Auswahl + Höhe/Breite in ziel. standard: Format, das "Set-Standard" bedeutet (nur bei Karten), sonst null
function baueFormatFeld(ziel, wert, { vorschlaege, standard = null, titel = 'Format' }) {
  const istGleich = (a, b) => a && b && Number(a.breite) === Number(b.breite) && Number(a.hoehe) === Number(b.hoehe);
  let auswahl = 'eigen';
  if (!wert && standard) auswahl = 'standard';
  else {
    const i = vorschlaege.findIndex((v) => istGleich(v, wert));
    if (i >= 0) auswahl = String(i);
  }
  const anzeige = wert || standard || vorschlaege[0];
  const optionen = [
    standard ? `<option value="standard">Set-Standard (${standard.hoehe} × ${standard.breite} mm)</option>` : '',
    ...vorschlaege.map((v, i) => `<option value="${i}">${esc(v.name)} (${v.hoehe} × ${v.breite} mm)</option>`),
    '<option value="eigen">Eigenes Format …</option>',
  ].join('');
  ziel.innerHTML = `<label>${titel} (Höhe × Breite in mm)<select data-format="wahl">${optionen}</select></label>
    <label>Höhe<input type="number" data-format="hoehe" min="30" max="200" step="0.5" value="${anzeige.hoehe}"></label>
    <label>Breite<input type="number" data-format="breite" min="30" max="200" step="0.5" value="${anzeige.breite}"></label>`;
  const wahl = ziel.querySelector('[data-format="wahl"]');
  wahl.value = auswahl;
  const h = ziel.querySelector('[data-format="hoehe"]');
  const b = ziel.querySelector('[data-format="breite"]');
  const sperre = () => {
    const eigen = wahl.value === 'eigen';
    h.disabled = !eigen;
    b.disabled = !eigen;
    const f = wahl.value === 'standard' ? standard : vorschlaege[Number(wahl.value)];
    if (f) { h.value = f.hoehe; b.value = f.breite; }
  };
  wahl.addEventListener('change', sperre);
  sperre();
}

// null = Set-Standard
function leseFormatFeld(ziel) {
  const wahl = ziel.querySelector('[data-format="wahl"]');
  if (!wahl || wahl.value === 'standard') return null;
  return { hoehe: Number(ziel.querySelector('[data-format="hoehe"]').value), breite: Number(ziel.querySelector('[data-format="breite"]').value) };
}

// ---------- Start ----------

async function zeigeStart() {
  zustand.info = null;
  zeigeAnsicht('start');
  $('#setTitel').textContent = '';
  const liste = await rufe('set:liste');
  const kacheln = liste.map((s, i) => `<div class="kachel set" data-i="${i}">
      <div class="bild">${s.titelkarte ? '<img alt="">' : ''}<span class="kuerzel">${esc(s.kuerzel)}</span></div>
      <div class="text"><b>${esc(s.name)}</b><span>${esc(s.kuerzel)} · ${s.karten} ${s.karten === 1 ? 'Karte' : 'Karten'}</span></div>
      <button class="vergessen" title="Aus der Liste nehmen (Ordner bleibt erhalten)">✕</button>
    </div>`);
  $('#setGrid').innerHTML = `<div class="kachel aktion" id="kachelNeu"><span class="plus">+</span>Neues Set</div>
    <div class="kachel aktion" id="kachelOeffnen"><span class="plus">⌂</span>Set-Ordner öffnen …</div>${kacheln.join('')}`;
  $('#kachelNeu').onclick = oeffneNeuDialog;
  $('#kachelOeffnen').onclick = async () => {
    const ordner = await rufe('set:waehleOrdner', 'Set-Ordner öffnen');
    if (ordner) oeffneSet(ordner);
  };
  const auftraege = [];
  $('#setGrid').querySelectorAll('.kachel.set').forEach((k) => {
    const s = liste[k.dataset.i];
    k.onclick = () => oeffneSet(s.ordner);
    k.querySelector('.vergessen').onclick = async (e) => {
      e.stopPropagation();
      await rufe('set:vergessen', s.ordner);
      zeigeStart();
    };
    const img = k.querySelector('img');
    if (img) auftraege.push({ ordner: s.ordner, nr: s.titelkarte, img });
  });
  ladeVorschauBilder(auftraege);
}

async function oeffneNeuDialog() {
  const std = await rufe('vorlage:standard');
  zustand.neuStandard = std;
  baueFormatFeld($('#neuFormat'), std.standardFormat, { vorschlaege: std.formatVorschlaege, titel: 'Standardformat' });
  $('#dlgNeu').showModal();
}

$('#btnNeuAbbrechen').onclick = () => $('#dlgNeu').close();
$('#formNeu').onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const ordner = await rufe('set:waehleOrdner', 'Leeren Ordner für das neue Set wählen');
  if (!ordner) return;
  try {
    const angaben = Object.fromEntries(f);
    angaben.anzahl = angaben.anzahl ? Number(angaben.anzahl) : null;
    angaben.format = leseFormatFeld($('#neuFormat'));
    const info = await rufe('set:neu', ordner, angaben);
    $('#dlgNeu').close();
    e.target.reset();
    zeigeSet(info);
  } catch (err) {
    alert(`${err.message}\n${(err.offene_punkte || []).join('\n')}`);
  }
};

async function oeffneSet(ordner) {
  try {
    zeigeSet(await rufe('set:oeffnen', ordner));
  } catch (e) {
    alert(e.message);
  }
}

$('#btnStart').onclick = zeigeStart;

// ---------- Set ----------

function setzeTitel() {
  $('#setTitel').textContent = `${zustand.info.set.name} (${zustand.info.set.kuerzel})`;
}

async function zeigeSet(info) {
  zustand.info = info;
  zustand.nr = null;
  setzeTitel();
  await zeigeUebersicht();
}

// Sprechblase auf der Kachel, wenn die Karte einen Kommentar hat (Text als Tooltip)
const kommentarMarke = (k) => (k.kommentar ? `<span class="kommentar" title="${esc(k.kommentar)}">💬</span>` : '');

// Kartenübersicht als Grid mit Vorschaubildern der aktuellen Versionen
async function zeigeUebersicht() {
  zeigeAnsicht('uebersicht');
  const ordner = zustand.info.set.ordner;
  const karten = await rufe('karten:liste', ordner);
  const kacheln = karten.map((k) => `<div class="kachel karte" data-nr="${k.nummer}">
      <div class="bild"><img alt="">${kommentarMarke(k)}</div>
      <div class="text"><b>${String(k.nummer).padStart(3, '0')} ${esc(k.name || 'ohne Name')}</b>
      <span>${k.entwurf ? '<em>Entwurf</em> · ' : ''}v${k.version}${k.besitz ? ` · ${k.besitz}× im Besitz` : ''}${k.gedruckt ? ' · gedruckt' : ''}</span></div>
    </div>`);
  $('#kartenGrid').innerHTML = kacheln.join('') || '<p class="hinweis">Noch keine Karten. Mit „+ Neue Karte“ legst du die erste an.</p>';
  $('#kartenAnzahl').textContent = `${karten.length} ${karten.length === 1 ? 'Karte' : 'Karten'}`;
  const auftraege = [];
  $('#kartenGrid').querySelectorAll('.kachel[data-nr]').forEach((k) => {
    const nr = Number(k.dataset.nr);
    k.onclick = () => waehleKarte(nr);
    auftraege.push({ ordner, nr, img: k.querySelector('img') });
  });
  ladeVorschauBilder(auftraege);
}

function zeigeEditor() {
  if ($('#arbeit').hidden) zeigeAnsicht('arbeit');
}

// Kartengrid in der Seitenleiste des Editors, mit Vorschaubildern
async function ladeListe() {
  const ordner = zustand.info.set.ordner;
  const karten = await rufe('karten:liste', ordner);
  $('#karten').innerHTML = karten.map((k) => `<div class="kachel karte${k.nummer === zustand.nr ? ' aktiv' : ''}" data-nr="${k.nummer}">
      <div class="bild"><img alt="">${kommentarMarke(k)}</div>
      <div class="text"><b>${String(k.nummer).padStart(3, '0')} ${esc(k.name || 'ohne Name')}</b>
      <span>${k.entwurf ? '<em>Entwurf</em> · ' : ''}v${k.version}${k.besitz ? ` · ${k.besitz}×` : ''}</span></div>
    </div>`).join('') || '<p class="hinweis">Noch keine Karten.</p>';
  const auftraege = [];
  $('#karten').querySelectorAll('.kachel[data-nr]').forEach((k) => {
    const nr = Number(k.dataset.nr);
    k.onclick = () => waehleKarte(nr);
    auftraege.push({ ordner, nr, img: k.querySelector('img') });
  });
  // Die aktive Karte sichtbar halten
  $('#karten').querySelector('.aktiv')?.scrollIntoView({ block: 'nearest' });
  ladeVorschauBilder(auftraege);
}

function meldungAktiv(art, text, punkte, aktion) {
  if (!$('#uebersicht').hidden) {
    const m = $('#meldungUebersicht');
    m.hidden = false;
    m.className = `meldung ${art}`;
    m.innerHTML = esc(text) + (punkte && punkte.length ? `<ul>${punkte.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '');
    if (aktion) {
      const a = document.createElement('a');
      a.textContent = ` ${aktion.text}`;
      a.onclick = aktion.fn;
      m.append(a);
    }
  } else meldung(art, text, punkte, aktion);
}

$('#btnSchliessen').onclick = zeigeStart;
$('#btnUebersicht').onclick = zeigeUebersicht;
$('#btnOrdner').onclick = () => rufe('ordner:zeigen', zustand.info.set.ordner);
$('#btnNeueKarte').onclick = () => neueKarte();
$('#btnNeueKarteUebersicht').onclick = () => neueKarte();

$('#btnAlleRendern').onclick = async () => {
  try {
    const r = await mitWarten(() => rufe('export:png', zustand.info.set.ordner, {}));
    meldungAktiv('ok', `${r.length} Karten als PNG gespeichert.`, [], { text: 'Ordner zeigen', fn: () => rufe('ordner:zeigen', `${zustand.info.set.ordner}/export/png`) });
  } catch (e) { meldungAktiv('fehler', e.message, e.offene_punkte); }
};

$('#btnDruck').onclick = () => $('#dlgDruck').showModal();
$('#dlgDruck').onclose = async () => {
  if ($('#dlgDruck').returnValue !== 'ok') return;
  const f = new FormData($('#dlgDruck form'));
  try {
    const r = await mitWarten(() => rufe('export:druck', zustand.info.set.ordner, {
      nr: f.get('nr') || undefined,
      modus: f.get('modus'),
      rueckseiten: f.get('rueckseiten') === 'on',
      auflage: Number(f.get('auflage')) || 1,
      mitEntwuerfen: f.get('mitEntwuerfen') === 'on',
    }));
    meldungAktiv('ok', `PDF mit ${r.seiten} Seiten erzeugt. Die Übergabe an den Druckdienst machst du selbst.`, [], { text: 'Datei zeigen', fn: () => rufe('datei:zeigen', r.pdf) });
    if (!$('#arbeit').hidden) await ladeListe();
  } catch (e) { meldungAktiv('fehler', e.message, e.offene_punkte); }
};

// ---------- Set-Einstellungen ----------

function typZeile(t = { name: '', symbol: '', farbe: '#808080', hintergrund: ['#f5f2eb', '#dcd6c8'] }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><input data-t="name" value="${esc(t.name)}" placeholder="z. B. Feuer"></td>
    <td><input data-t="symbol" value="${esc(t.symbol)}" maxlength="3" class="symbol" placeholder="✹"></td>
    <td><input type="color" data-t="farbe" value="${esc(t.farbe)}"></td>
    <td><input type="color" data-t="h1" value="${esc(t.hintergrund[0])}"><input type="color" data-t="h2" value="${esc(t.hintergrund[1])}"></td>
    <td><button type="button" class="entfernen" title="Typ entfernen">✕</button></td>`;
  if (t.textfarbe) tr.dataset.textfarbe = t.textfarbe;
  tr.querySelector('.entfernen').onclick = () => tr.remove();
  return tr;
}

async function oeffneSetEinstellungen() {
  const s = zustand.info.set;
  const f = $('#dlgSet form');
  f.name.value = s.name;
  f.fusszeile.value = s.fusszeile || '';
  f.anzahl.value = s.anzahl || '';
  const karten = await rufe('karten:liste', s.ordner);
  f.titelkarte.innerHTML = '<option value="">keine (Kürzel zeigen)</option>'
    + karten.map((k) => `<option value="${k.nummer}">${String(k.nummer).padStart(3, '0')} ${esc(k.name || '')}</option>`).join('');
  f.titelkarte.value = s.titelkarte || '';
  zustand.rueckseite = s.rueckseite;
  $('#rueckseiteName').textContent = s.rueckseite || 'keine';
  baueFormatFeld($('#setFormat'), s.format, { vorschlaege: zustand.info.vorlage.formatVorschlaege, titel: 'Standardformat für neue Karten' });
  $('#typenListe').replaceChildren(...(s.typen || []).map((t) => typZeile(t)));
  $('#dlgSet').showModal();
}

$('#btnSetEinstellungen').onclick = oeffneSetEinstellungen;
$('#btnTypNeu').onclick = () => $('#typenListe').append(typZeile());
$('#btnRueckseite').onclick = async () => {
  const datei = await rufe('bild:waehlen', zustand.info.set.ordner);
  if (datei) { zustand.rueckseite = datei; $('#rueckseiteName').textContent = datei; }
};
$('#dlgSet').onclose = async () => {
  if ($('#dlgSet').returnValue !== 'ok') return;
  const f = $('#dlgSet form');
  const typen = [...$('#typenListe').children].map((tr) => {
    const w = (k) => tr.querySelector(`[data-t="${k}"]`).value;
    const t = { name: w('name').trim(), symbol: w('symbol').trim(), farbe: w('farbe'), hintergrund: [w('h1'), w('h2')] };
    if (tr.dataset.textfarbe) t.textfarbe = tr.dataset.textfarbe;
    return t;
  });
  try {
    const info = await rufe('set:aendern', zustand.info.set.ordner, {
      name: f.name.value,
      fusszeile: f.fusszeile.value,
      anzahl: f.anzahl.value ? Number(f.anzahl.value) : null,
      rueckseite: zustand.rueckseite || null,
      titelkarte: f.titelkarte.value ? Number(f.titelkarte.value) : null,
      format: leseFormatFeld($('#setFormat')),
      typen,
    });
    zustand.info = info;
    setzeTitel();
    if (info.warnungen.length) meldungAktiv('fehler', 'Gespeichert. Diese Karten nutzen Typen, die es nicht mehr gibt:', info.warnungen);
    else meldungAktiv('ok', 'Set-Einstellungen gespeichert.');
    if (!$('#uebersicht').hidden) zeigeUebersicht();
    else { baueFormular(); }
  } catch (e) {
    meldungAktiv('fehler', e.message, e.offene_punkte);
    $('#dlgSet').showModal();
  }
};

// ---------- Karte ----------

// spiel (KP, Typ, Attacken), trainer oder sammel, siehe vorlage.js
const aufbauVon = (layout) => zustand.info.vorlage.layouts[layout]?.aufbau;

function layoutsDesSets() {
  const { layouts } = zustand.info.vorlage;
  return Object.entries(layouts).filter(([, l]) => l.kartentyp === zustand.info.set.kartentyp);
}

function neueKarte() {
  zustand.nr = null;
  const layout = layoutsDesSets()[0][0];
  zustand.karte = { layout, bildquelle: 'foto', bild: { skalierung: 1, x: 0, y: 0 }, attacken: [{}] };
  $('#editorTitel').textContent = 'Neue Karte';
  $('#version').hidden = true;
  $('#btnPng').hidden = true;
  $('#btnStil').hidden = true;
  $('#btnKopieren').hidden = true;
  $('#besitzFeld').hidden = true;
  keineMeldung();
  zeigeEditor();
  baueFormular();
  ladeListe();
}

async function waehleKarte(nr, version) {
  try {
    const r = await rufe('karte:laden', zustand.info.set.ordner, nr, version);
    zustand.nr = nr;
    zustand.karte = r.karte;
    const aktuell = r.versionen[r.versionen.length - 1];
    const kopie = r.karte.kopiert_von ? ` (Kopie von ${String(r.karte.kopiert_von.nummer).padStart(3, '0')})` : '';
    $('#editorTitel').textContent = `Karte ${String(nr).padStart(3, '0')}${kopie}`;
    $('#version').hidden = false;
    $('#version').innerHTML = r.versionen.slice().reverse().map((v) => `<option value="${v}" ${v === r.karte.version ? 'selected' : ''}>Version ${v}${v === aktuell ? ' (aktuell)' : ''}</option>`).join('');
    $('#btnPng').hidden = false;
    $('#btnStil').hidden = false;
    $('#btnKopieren').hidden = false;
    $('#besitzFeld').hidden = false;
    $('#besitz').value = r.sammlung.besitz || 0;
    keineMeldung();
    zeigeEditor();
    if (r.karte.version !== aktuell) meldung('ok', `Du siehst Version ${r.karte.version}. Speichern legt daraus eine neue Version an.`);
    else if (r.karte.entwurf) meldung('fehler', 'Entwurf – es fehlen noch Angaben:', r.karte.offene_punkte || []);
    baueFormular();
    ladeListe();
  } catch (e) { fehler(e); }
}

$('#version').onchange = () => waehleKarte(zustand.nr, Number($('#version').value));

$('#besitz').onchange = async () => {
  try {
    await rufe('sammlung:besitz', zustand.info.set.ordner, zustand.nr, Number($('#besitz').value));
    ladeListe();
  } catch (e) { fehler(e); }
};

$('#btnPng').onclick = async () => {
  try {
    const [r] = await mitWarten(() => rufe('export:png', zustand.info.set.ordner, { nr: String(zustand.nr) }));
    meldung('ok', `Gespeichert: ${r.png}`, [], { text: 'Datei zeigen', fn: () => rufe('datei:zeigen', r.png) });
  } catch (e) { fehler(e); }
};

// Kopiert die angezeigte (gespeicherte) Version als neue Karte und öffnet die Kopie
$('#btnKopieren').onclick = async () => {
  try {
    const von = zustand.nr;
    const k = await rufe('karte:kopieren', zustand.info.set.ordner, von, zustand.karte.version);
    await waehleKarte(k.nummer);
    meldung('ok', `Kopie von Karte ${String(von).padStart(3, '0')} als Karte ${String(k.nummer).padStart(3, '0')} angelegt. Ungespeicherte Änderungen im Formular wurden nicht mitkopiert.`);
  } catch (e) { fehler(e); }
};

// ---------- Stil übertragen ----------

// Kurzbeschreibung des Stils einer Karte für den Dialog
function stilText(k) {
  const v = zustand.info.vorlage;
  const teile = [v.layouts[k.layout]?.titel || k.layout];
  teile.push(k.folie?.art ? `Effekt ${v.folien[k.folie.art] || k.folie.art}` : 'kein Effekt');
  teile.push(k.format ? `Format ${k.format.hoehe} × ${k.format.breite} mm` : 'Set-Standardformat');
  if (k.holo) teile.push('Holo-Rahmen');
  if (k.layout === 'gold') teile.push(k.goldton !== false ? 'Foto in Gold' : 'Foto in Farbe');
  return teile.join(', ');
}

$('#btnStil').onclick = async () => {
  try {
    const ordner = zustand.info.set.ordner;
    const [{ karte }, karten] = await Promise.all([rufe('karte:laden', ordner, zustand.nr), rufe('karten:liste', ordner)]);
    $('#stilQuelle').textContent = `Von Karte ${String(zustand.nr).padStart(3, '0')} (gespeicherte aktuelle Version): ${stilText(karte)}. Das Layout wird nur auf Karten derselben Art übertragen (Spielkarten mit Foto, Trainer, Sammelkarten).`;
    $('#stilZiele').innerHTML = karten.filter((k) => k.nummer !== zustand.nr).map((k) => `<label class="zeile"><input type="checkbox" value="${k.nummer}"> ${String(k.nummer).padStart(3, '0')} ${esc(k.name || 'ohne Name')}</label>`).join('')
      || '<p class="hinweis">Es gibt noch keine anderen Karten.</p>';
    $('#stilAlle').checked = false;
    $('#dlgStil').showModal();
  } catch (e) { fehler(e); }
};
$('#stilAlle').onchange = () => $('#stilZiele').querySelectorAll('input').forEach((c) => { c.checked = $('#stilAlle').checked; });
$('#dlgStil').onclose = async () => {
  if ($('#dlgStil').returnValue !== 'ok') return;
  const ziele = [...$('#stilZiele').querySelectorAll('input:checked')].map((c) => Number(c.value));
  if (!ziele.length) return;
  try {
    const r = await rufe('karte:stil', zustand.info.set.ordner, zustand.nr, ziele);
    const geaendert = r.filter((x) => x.geaendert);
    meldung('ok', `Stil auf ${geaendert.length} ${geaendert.length === 1 ? 'Karte' : 'Karten'} übertragen${r.length > geaendert.length ? `, ${r.length - geaendert.length} hatten ihn schon` : ''}.`,
      geaendert.map((x) => `Karte ${String(x.nummer).padStart(3, '0')} → Version ${x.version}`));
    ladeListe();
  } catch (e) { fehler(e); }
};

$('#btnSpeichern').onclick = async () => {
  const daten = leseFormular();
  try {
    const k = zustand.nr
      ? await rufe('karte:aendern', zustand.info.set.ordner, zustand.nr, daten)
      : await rufe('karte:neu', zustand.info.set.ordner, daten);
    await waehleKarte(k.nummer);
    if (k.entwurf) meldung('fehler', `Als Entwurf gespeichert (Version ${k.version}). Es fehlen noch:`, k.offene_punkte || []);
    else meldung('ok', `Gespeichert als Version ${k.version}.`);
  } catch (e) {
    meldung('fehler', e.message, e.offene_punkte || []);
  }
};

// ---------- Formular ----------

const feld = (name, titel, { typ = 'text', ganz = false, hinweis = '' } = {}) => {
  const wert = esc(zustand.karte[name] ?? '');
  const eingabe = typ === 'textarea'
    ? `<textarea data-feld="${name}" ${hinweis ? `placeholder="${esc(hinweis)}"` : ''}>${wert}</textarea>`
    : `<input data-feld="${name}" type="${typ}" value="${wert}" ${hinweis ? `placeholder="${esc(hinweis)}"` : ''}>`;
  return `<label class="${ganz ? 'ganz' : ''}">${titel}${eingabe}</label>`;
};

const auswahl = (name, titel, optionen, { leer = false } = {}) => {
  const wert = zustand.karte[name] ?? '';
  const opts = (leer ? ['<option value="">–</option>'] : [])
    .concat(optionen.map(([v, t]) => `<option value="${esc(v)}" ${v === wert ? 'selected' : ''}>${esc(t)}</option>`));
  return `<label>${titel}<select data-feld="${name}">${opts.join('')}</select></label>`;
};

// Energiekosten: pro Typ des Sets ein Zähler (ein Typ kann mehrfach kosten), der Wert steht im versteckten Feld
function kostenAuswahl(i, kosten, typen) {
  const anzahl = (name) => kosten.filter((k) => k === name).length;
  const fremd = kosten.filter((k) => !typen.some((t) => t.name === k));
  const knoepfe = typen.map((t) => `<span class="kostentyp ${anzahl(t.name) ? 'aktiv' : ''}" data-kostentyp="${esc(t.name)}">
      <button type="button" data-kosten="-1" title="${esc(t.name)} entfernen">−</button>
      <span>${esc(t.symbol)} ${esc(t.name)} <b>${anzahl(t.name) || ''}</b></span>
      <button type="button" data-kosten="1" title="${esc(t.name)} hinzufügen">+</button>
    </span>`).join('');
  return `<div class="ganz kostenfeld">Energiekosten
    <input type="hidden" data-atk="${i}" data-teil="kosten" value="${esc(kosten.join(', '))}">
    <div class="kostentypen">${knoepfe || '<span class="hinweis">Im Set sind noch keine Typen angelegt.</span>'}</div>
    ${fremd.length ? `<span class="hinweis">Nicht im Set: ${esc(fremd.join(', '))}</span>` : ''}
  </div>`;
}

function aendereKosten(knopf) {
  const chip = knopf.closest('[data-kostentyp]');
  const name = chip.dataset.kostentyp;
  const eingabe = knopf.closest('.kostenfeld').querySelector('[data-teil="kosten"]');
  const kosten = eingabe.value.split(',').map((x) => x.trim()).filter(Boolean);
  if (Number(knopf.dataset.kosten) > 0) kosten.push(name);
  else if (kosten.includes(name)) kosten.splice(kosten.lastIndexOf(name), 1);
  // Reihenfolge wie die Typen im Set, unbekannte Typen hinten
  const reihe = (zustand.info.set.typen || []).map((t) => t.name);
  const rang = (x) => (reihe.includes(x) ? reihe.indexOf(x) : reihe.length);
  kosten.sort((x, y) => rang(x) - rang(y));
  eingabe.value = kosten.join(', ');
  const zahl = kosten.filter((x) => x === name).length;
  chip.classList.toggle('aktiv', zahl > 0);
  chip.querySelector('b').textContent = zahl || '';
  eingabe.dispatchEvent(new Event('input', { bubbles: true }));
}

function baueFormular() {
  const k = zustand.karte;
  const s = zustand.info.set;
  const typen = (s.typen || []).map((t) => [t.name, `${t.symbol} ${t.name}`]);
  const seltenheiten = (s.seltenheiten || []).map((x) => [x.name, `${x.symbol} ${x.name}`]);
  const b = k.bild || {};
  const teile = [
    auswahl('layout', 'Layout', layoutsDesSets().map(([id, l]) => [id, l.titel])),
    feld('name', 'Name'),
    '<fieldset class="formatfeld" id="karteFormat"></fieldset>',
    `<fieldset><legend>Bild</legend>
      <div class="bildzeile ganz"><span class="dateiname">${esc(b.datei || 'kein Bild – Datei auf die Karte ziehen')}</span><button type="button" id="btnBild">Bild wählen …</button></div>
      <label>Zoom <input type="range" data-bild="skalierung" min="1" max="3" step="0.01" value="${b.skalierung || 1}"></label>
      ${auswahl('bildquelle', 'Bildquelle', [['foto', 'eigenes Foto'], ['ki', 'KI-generiert']])}
      <label>Verschieben waagrecht <input type="range" data-bild="x" min="-100" max="100" step="0.5" value="${b.x || 0}"></label>
      <label>Verschieben senkrecht <input type="range" data-bild="y" min="-100" max="100" step="0.5" value="${b.y || 0}"></label>
    </fieldset>`,
  ];
  if (seltenheiten.length) teile.push(auswahl('seltenheit', 'Seltenheit', seltenheiten, { leer: true }));
  // Holo-Rahmen gibt es nur noch für ältere Karten, neu dafür das Layout Regenbogenkarte
  if (k.holo) teile.push('<label class="zeile" title="Statt des Rahmens gibt es jetzt das Layout Regenbogenkarte"><input type="checkbox" data-feld="holo" checked> Holo-Rahmen (alt)</label>');
  const folie = k.folie || {};
  const folien = Object.entries(zustand.info.vorlage.folien || {});
  teile.push(`<fieldset><legend>Effekt (Folie)</legend>
      <label>Art<select data-folie="art"><option value="">kein Effekt</option>${folien.map(([id, t]) => `<option value="${id}" ${folie.art === id ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Bereich<select data-folie="bereich"><option value="bild">nur Bild</option><option value="karte" ${folie.bereich === 'karte' ? 'selected' : ''}>ganze Karte</option></select></label>
      <label class="ganz">Stärke <input type="range" data-folie="staerke" min="0.1" max="1" step="0.05" value="${folie.staerke || 0.7}"></label>
    </fieldset>`);

  if (aufbauVon(k.layout) === 'spiel') {
    if (k.layout === 'gold') teile.push(`<label class="zeile ganz"><input type="checkbox" data-feld="goldton" ${k.goldton !== false ? 'checked' : ''}> Foto in Gold einfärben</label>`);
    teile.push(feld('stufe', 'Stufe', { hinweis: 'z. B. Basis, Phase 1' }), feld('entwickelt_aus', 'Entwickelt sich aus'),
      feld('kp', 'KP', { typ: 'number' }), auswahl('typ', 'Typ', typen, { leer: true }));
    if (k.layout === 'normal') teile.push(feld('band', 'Band unter dem Foto', { ganz: true }));
    const atk = k.attacken && k.attacken.length ? k.attacken : [{}];
    [0, 1].forEach((i) => {
      const a = atk[i] || {};
      teile.push(`<fieldset><legend>Attacke ${i + 1}${i ? ' (optional)' : ''}</legend>
        <label>Name<input data-atk="${i}" data-teil="name" value="${esc(a.name)}"></label>
        <label>Schaden<input data-atk="${i}" data-teil="schaden" value="${esc(a.schaden)}"></label>
        ${kostenAuswahl(i, a.kosten || [], s.typen || [])}
        <label class="ganz">Text<textarea data-atk="${i}" data-teil="text">${esc(a.text)}</textarea></label>
      </fieldset>`);
    });
    teile.push(feld('schwaeche', 'Schwäche'), feld('resistenz', 'Resistenz'), feld('rueckzug', 'Rückzug (0–5)', { typ: 'number' }));
  } else if (k.layout === 'trainer') {
    teile.push(feld('untertyp', 'Untertyp', { hinweis: 'z. B. UNTERSTÜTZER' }), feld('effekt', 'Effekt', { typ: 'textarea', ganz: true }),
      feld('regel', 'Regeltext', { typ: 'textarea', ganz: true }));
  } else if (aufbauVon(k.layout) === 'sammel') {
    teile.push(auswahl('typ', 'Typ (Farbe)', typen, { leer: true }), feld('beschreibung', 'Beschreibung', { typ: 'textarea', ganz: true }));
  }
  if (aufbauVon(k.layout) !== 'sammel') teile.push(feld('flavor', 'Flavor-Text', { typ: 'textarea', ganz: true }));
  teile.push(feld('namensgroesse', 'Schriftgröße Name (px, optional)', { typ: 'number', hinweis: 'automatisch' }));
  teile.push(feld('kommentar', 'Kommentar (nur für dich, erscheint nicht auf der Karte)', { typ: 'textarea', ganz: true, hinweis: 'Notizen für spätere Bearbeitungen und Ideen' }));

  const form = $('#formKarte');
  form.innerHTML = teile.join('');
  baueFormatFeld(form.querySelector('#karteFormat'), k.format, { vorschlaege: zustand.info.vorlage.formatVorschlaege, standard: s.format, titel: 'Kartenformat' });
  form.querySelector('[data-feld="layout"]').onchange = () => { zustand.karte = { ...leseFormular() }; baueFormular(); };
  $('#btnBild').onclick = async () => {
    try {
      const datei = await rufe('bild:waehlen', zustand.info.set.ordner);
      if (!datei) return;
      zustand.karte = leseFormular();
      zustand.karte.bild = { ...zustand.karte.bild, datei };
      baueFormular();
    } catch (e) { fehler(e); }
  };
  form.onclick = (e) => { const knopf = e.target.closest('[data-kosten]'); if (knopf) aendereKosten(knopf); };
  form.oninput = (e) => {
    if (e.target.dataset.bild !== undefined) return zeigeBildausschnitt();
    clearTimeout(zustand.timer);
    zustand.timer = setTimeout(aktualisiereVorschau, 150);
  };
  aktualisiereVorschau();
}

function leseFormular() {
  const form = $('#formKarte');
  const k = { layout: zustand.karte.layout, bild: { ...(zustand.karte.bild || {}) } };
  if (zustand.karte.kopiert_von) k.kopiert_von = zustand.karte.kopiert_von;
  form.querySelectorAll('[data-feld]').forEach((el) => {
    const name = el.dataset.feld;
    if (el.type === 'checkbox') k[name] = el.checked;
    else if (el.value.trim() !== '') k[name] = el.type === 'number' ? Number(el.value) : el.value;
  });
  form.querySelectorAll('[data-bild]').forEach((el) => { k.bild[el.dataset.bild] = Number(el.value); });
  const folie = {};
  form.querySelectorAll('[data-folie]').forEach((el) => { folie[el.dataset.folie] = el.dataset.folie === 'staerke' ? Number(el.value) : el.value; });
  if (folie.art) k.folie = folie;
  const format = form.querySelector('#karteFormat') && leseFormatFeld(form.querySelector('#karteFormat'));
  if (format) k.format = format;
  const atk = [];
  form.querySelectorAll('[data-atk]').forEach((el) => {
    const i = Number(el.dataset.atk);
    atk[i] = atk[i] || {};
    const v = el.value.trim();
    if (!v) return;
    if (el.dataset.teil === 'kosten') atk[i].kosten = v.split(',').map((x) => x.trim()).filter(Boolean);
    else atk[i][el.dataset.teil] = el.dataset.teil === 'schaden' && /^\d+$/.test(v) ? Number(v) : v;
  });
  const gefuellt = atk.filter((a) => a && Object.keys(a).length);
  if (aufbauVon(k.layout) === 'spiel') k.attacken = gefuellt;
  return k;
}

async function aktualisiereVorschau() {
  if (!zustand.info || !zustand.karte) return;
  try {
    const karte = { ...leseFormular(), nummer: zustand.nr || undefined };
    const r = await rufe('vorschau', zustand.info.set.ordner, karte);
    passeVorschauAn(r.masse);
    $('#vorschauFrame').srcdoc = r.html;
  } catch (e) { fehler(e); }
}

// Vorschau ohne Beschnitt: Größe und Maßstab aus den Kartenmaßen (Vorlagenraster), höchstens 560 px hoch
function passeVorschauAn(m) {
  const sichtbarB = m.breite - 2 * m.beschnittPx;
  const sichtbarH = m.hoehe - 2 * m.beschnittPx;
  const massstab = Math.min(390 / sichtbarB, 560 / sichtbarH);
  const v = $('#vorschau').style;
  v.setProperty('--s', massstab);
  v.setProperty('--b', `${m.beschnittPx}px`);
  v.setProperty('--w', `${m.breite}px`);
  v.setProperty('--h', `${m.hoehe}px`);
}

// ---------- Foto direkt in der Vorschau bewegen ----------

function bildRegler() {
  const r = {};
  $('#formKarte').querySelectorAll('[data-bild]').forEach((el) => { r[el.dataset.bild] = el; });
  return r;
}

// Überträgt die Reglerwerte sofort auf das Foto in der Vorschau
// Gleiche Rechnung wie in der Vorlage (vorlage.js, ausschnittStil): Foto füllt das Fenster, x/y wählen den Ausschnitt
const ausschnittPos = (v) => Math.max(0, Math.min(100, 50 - (Number(v) || 0) / 2));

function zeigeBildausschnitt() {
  const doc = $('#vorschauFrame').contentDocument;
  const img = doc && doc.querySelector('img.photo');
  const r = bildRegler();
  if (!img || !r.x) return;
  const px = ausschnittPos(r.x.value);
  const py = ausschnittPos(r.y.value);
  img.style.objectPosition = `${px}% ${py}%`;
  img.style.transformOrigin = `${px}% ${py}%`;
  img.style.transform = `scale(${Math.max(1, Number(r.skalierung.value))})`;
}

// Wie viele Pixel sich das Foto verschiebt, wenn der Ausschnitt von 0 % bis 100 % wandert (pro Achse)
function verschiebeweg(img, rahmen, skalierung) {
  const fw = rahmen.clientWidth;
  const fh = rahmen.clientHeight;
  const cover = Math.max(fw / (img.naturalWidth || fw), fh / (img.naturalHeight || fh));
  const s = Math.max(1, Number(skalierung));
  const ueberX = (img.naturalWidth || fw) * cover - fw;
  const ueberY = (img.naturalHeight || fh) * cover - fh;
  return { x: ueberX * s + fw * (s - 1), y: ueberY * s + fh * (s - 1) };
}

// Maus in der Vorschau: Foto ziehen zum Verschieben, Mausrad zum Zoomen
function verbindeVorschau() {
  const doc = $('#vorschauFrame').contentDocument;
  if (!doc || !doc.body) return;
  verbindeDrop(doc);
  const img = doc.querySelector('img.photo');
  if (!img) return;
  const rahmen = img.parentElement;
  const imRahmen = (e) => {
    const b = rahmen.getBoundingClientRect();
    return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
  };
  let start = null;
  doc.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !imRahmen(e)) return;
    const r = bildRegler();
    start = { x: e.clientX, y: e.clientY, bx: Number(r.x.value), by: Number(r.y.value) };
    doc.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  doc.addEventListener('mousemove', (e) => {
    if (!start) {
      doc.body.style.cursor = imRahmen(e) ? 'grab' : '';
      return;
    }
    // Das Foto folgt der Maus 1:1, soweit es über das Fenster hinausreicht
    const r = bildRegler();
    const weg = verschiebeweg(img, rahmen, r.skalierung.value);
    const begrenze = (v) => Math.max(-100, Math.min(100, v));
    if (weg.x >= 1) r.x.value = begrenze(start.bx + (2 * (e.clientX - start.x) / weg.x) * 100);
    if (weg.y >= 1) r.y.value = begrenze(start.by + (2 * (e.clientY - start.y) / weg.y) * 100);
    zeigeBildausschnitt();
  });
  const ende = () => { start = null; doc.body.style.cursor = ''; };
  doc.addEventListener('mouseup', ende);
  doc.addEventListener('mouseleave', ende);
  doc.addEventListener('wheel', (e) => {
    if (!imRahmen(e)) return;
    e.preventDefault();
    const r = bildRegler();
    r.skalierung.value = Math.min(3, Math.max(1, Number(r.skalierung.value) - e.deltaY * 0.0015));
    zeigeBildausschnitt();
  }, { passive: false });
}

$('#vorschauFrame').addEventListener('load', verbindeVorschau);

// ---------- Bild per Drag & Drop ----------

async function setzeBildAusDatei(datei) {
  if (!zustand.info || !zustand.karte || !datei) return;
  if (!/^image\//.test(datei.type)) return meldung('fehler', 'Bitte eine Bilddatei (JPG, PNG, WebP) ablegen.');
  try {
    const rel = await rufe('bild:importieren', zustand.info.set.ordner, window.cc.pfadVon(datei));
    zustand.karte = leseFormular();
    zustand.karte.bild = { datei: rel, skalierung: 1, x: 0, y: 0 };
    baueFormular();
  } catch (e) { fehler(e); }
}

function verbindeDrop(ziel) {
  const markiere = (an) => $('#vorschau').classList.toggle('ablegen', an);
  ziel.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; markiere(true); });
  ziel.addEventListener('dragleave', () => markiere(false));
  ziel.addEventListener('drop', (e) => {
    e.preventDefault();
    markiere(false);
    setzeBildAusDatei(e.dataTransfer.files[0]);
  });
}

verbindeDrop($('#vorschau'));
verbindeDrop($('#editor'));
// Dateien, die daneben fallen, sollen die App nicht verlassen
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

zeigeStart();
