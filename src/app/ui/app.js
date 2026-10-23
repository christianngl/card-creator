// Oberfläche der Desktop-App. Alle Daten laufen über window.cc.rufe(kanal, …) zum Hauptprozess.
const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const zustand = { info: null, nr: null, karte: null };

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

// ---------- Start ----------

async function zeigeStart() {
  zustand.info = null;
  $('#start').hidden = false;
  $('#arbeit').hidden = true;
  $('#setAktionen').hidden = true;
  $('#setTitel').textContent = '';
  const liste = await rufe('set:zuletzt');
  $('#zuletzt').innerHTML = liste.length
    ? liste.map((s, i) => `<li data-i="${i}"><span class="name">${esc(s.name)}<span class="pfad">${esc(s.ordner)}</span></span></li>`).join('')
    : '<li class="hinweis">Noch keine Sets geöffnet.</li>';
  $('#zuletzt').querySelectorAll('li[data-i]').forEach((li) => { li.onclick = () => oeffneSet(liste[li.dataset.i].ordner); });
}

$('#formNeu').onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const ordner = await rufe('set:waehleOrdner', 'Leeren Ordner für das neue Set wählen');
  if (!ordner) return;
  try {
    const angaben = Object.fromEntries(f);
    angaben.anzahl = angaben.anzahl ? Number(angaben.anzahl) : null;
    zeigeSet(await rufe('set:neu', ordner, angaben));
    e.target.reset();
  } catch (err) {
    alert(`${err.message}\n${(err.offene_punkte || []).join('\n')}`);
  }
};

$('#btnOeffnen').onclick = async () => {
  const ordner = await rufe('set:waehleOrdner', 'Set-Ordner öffnen');
  if (ordner) oeffneSet(ordner);
};

async function oeffneSet(ordner) {
  try {
    zeigeSet(await rufe('set:oeffnen', ordner));
  } catch (e) {
    alert(e.message);
  }
}

// ---------- Set ----------

async function zeigeSet(info) {
  zustand.info = info;
  $('#start').hidden = true;
  $('#arbeit').hidden = false;
  $('#setAktionen').hidden = false;
  $('#setTitel').textContent = `${info.set.name} (${info.set.kuerzel})`;
  await ladeListe();
  const karten = await rufe('karten:liste', info.set.ordner);
  if (karten.length) await waehleKarte(karten[0].nummer);
  else neueKarte();
}

async function ladeListe() {
  const karten = await rufe('karten:liste', zustand.info.set.ordner);
  $('#karten').innerHTML = karten.map((k) => `<li data-nr="${k.nummer}" class="${k.nummer === zustand.nr ? 'aktiv' : ''}">
    <span class="nr">${String(k.nummer).padStart(3, '0')}</span><span class="name">${esc(k.name)}</span>
    <span class="info">v${k.version}${k.besitz ? ` · ${k.besitz}×` : ''}${k.gedruckt ? ' · gedruckt' : ''}</span></li>`).join('')
    || '<li class="hinweis">Noch keine Karten.</li>';
  $('#karten').querySelectorAll('li[data-nr]').forEach((li) => { li.onclick = () => waehleKarte(Number(li.dataset.nr)); });
}

$('#btnSchliessen').onclick = zeigeStart;
$('#btnOrdner').onclick = () => rufe('ordner:zeigen', zustand.info.set.ordner);
$('#btnNeueKarte').onclick = () => neueKarte();

$('#btnAlleRendern').onclick = async () => {
  try {
    const r = await mitWarten(() => rufe('export:png', zustand.info.set.ordner, {}));
    meldung('ok', `${r.length} Karten als PNG gespeichert.`, [], { text: 'Ordner zeigen', fn: () => rufe('ordner:zeigen', `${zustand.info.set.ordner}/export/png`) });
  } catch (e) { fehler(e); }
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
    }));
    meldung('ok', `PDF mit ${r.seiten} Seiten erzeugt. Die Übergabe an den Druckdienst machst du selbst.`, [], { text: 'Datei zeigen', fn: () => rufe('datei:zeigen', r.pdf) });
    await ladeListe();
  } catch (e) { fehler(e); }
};

$('#btnSetEinstellungen').onclick = () => {
  const s = zustand.info.set;
  const f = $('#dlgSet form');
  f.name.value = s.name;
  f.fusszeile.value = s.fusszeile || '';
  f.anzahl.value = s.anzahl || '';
  zustand.rueckseite = s.rueckseite;
  $('#rueckseiteName').textContent = s.rueckseite || 'keine';
  $('#dlgSet').showModal();
};
$('#btnRueckseite').onclick = async () => {
  const datei = await rufe('bild:waehlen', zustand.info.set.ordner);
  if (datei) { zustand.rueckseite = datei; $('#rueckseiteName').textContent = datei; }
};
$('#dlgSet').onclose = async () => {
  if ($('#dlgSet').returnValue !== 'ok') return;
  const f = $('#dlgSet form');
  try {
    const info = await rufe('set:aendern', zustand.info.set.ordner, {
      name: f.name.value,
      fusszeile: f.fusszeile.value,
      anzahl: f.anzahl.value ? Number(f.anzahl.value) : null,
      rueckseite: zustand.rueckseite || null,
    });
    zustand.info = info;
    $('#setTitel').textContent = `${info.set.name} (${info.set.kuerzel})`;
    aktualisiereVorschau();
  } catch (e) { fehler(e); }
};

// ---------- Karte ----------

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
  $('#besitzFeld').hidden = true;
  keineMeldung();
  baueFormular();
  ladeListe();
}

async function waehleKarte(nr, version) {
  try {
    const r = await rufe('karte:laden', zustand.info.set.ordner, nr, version);
    zustand.nr = nr;
    zustand.karte = r.karte;
    const aktuell = r.versionen[r.versionen.length - 1];
    $('#editorTitel').textContent = `Karte ${String(nr).padStart(3, '0')}`;
    $('#version').hidden = false;
    $('#version').innerHTML = r.versionen.slice().reverse().map((v) => `<option value="${v}" ${v === r.karte.version ? 'selected' : ''}>Version ${v}${v === aktuell ? ' (aktuell)' : ''}</option>`).join('');
    $('#btnPng').hidden = false;
    $('#besitzFeld').hidden = false;
    $('#besitz').value = r.sammlung.besitz || 0;
    keineMeldung();
    if (r.karte.version !== aktuell) meldung('ok', `Du siehst Version ${r.karte.version}. Speichern legt daraus eine neue Version an.`);
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

$('#btnSpeichern').onclick = async () => {
  const daten = leseFormular();
  try {
    const k = zustand.nr
      ? await rufe('karte:aendern', zustand.info.set.ordner, zustand.nr, daten)
      : await rufe('karte:neu', zustand.info.set.ordner, daten);
    await waehleKarte(k.nummer);
    meldung('ok', `Gespeichert als Version ${k.version}.`);
  } catch (e) {
    meldung('fehler', e.message, e.offene_punkte || []);
  }
};

// ---------- Formular ----------

const feld = (name, titel, { typ = 'text', ganz = false, hinweis = '' } = {}) => {
  const wert = esc(zustand.karte[name] ?? '');
  const eingabe = typ === 'textarea'
    ? `<textarea data-feld="${name}">${wert}</textarea>`
    : `<input data-feld="${name}" type="${typ}" value="${wert}" ${hinweis ? `placeholder="${esc(hinweis)}"` : ''}>`;
  return `<label class="${ganz ? 'ganz' : ''}">${titel}${eingabe}</label>`;
};

const auswahl = (name, titel, optionen, { leer = false } = {}) => {
  const wert = zustand.karte[name] ?? '';
  const opts = (leer ? ['<option value="">–</option>'] : [])
    .concat(optionen.map(([v, t]) => `<option value="${esc(v)}" ${v === wert ? 'selected' : ''}>${esc(t)}</option>`));
  return `<label>${titel}<select data-feld="${name}">${opts.join('')}</select></label>`;
};

function baueFormular() {
  const k = zustand.karte;
  const s = zustand.info.set;
  const typen = (s.typen || []).map((t) => [t.name, `${t.symbol} ${t.name}`]);
  const seltenheiten = (s.seltenheiten || []).map((x) => [x.name, `${x.symbol} ${x.name}`]);
  const b = k.bild || {};
  const teile = [
    auswahl('layout', 'Layout', layoutsDesSets().map(([id, l]) => [id, l.titel])),
    feld('name', 'Name'),
    `<fieldset><legend>Bild</legend>
      <div class="bildzeile ganz"><span class="dateiname">${esc(b.datei || 'kein Bild gewählt')}</span><button type="button" id="btnBild">Bild wählen …</button></div>
      <label>Zoom <input type="range" data-bild="skalierung" min="1" max="3" step="0.01" value="${b.skalierung || 1}"></label>
      ${auswahl('bildquelle', 'Bildquelle', [['foto', 'eigenes Foto'], ['ki', 'KI-generiert']])}
      <label>Verschieben waagrecht <input type="range" data-bild="x" min="-50" max="50" step="0.5" value="${b.x || 0}"></label>
      <label>Verschieben senkrecht <input type="range" data-bild="y" min="-50" max="50" step="0.5" value="${b.y || 0}"></label>
    </fieldset>`,
  ];
  if (seltenheiten.length) teile.push(auswahl('seltenheit', 'Seltenheit', seltenheiten, { leer: true }));
  teile.push(`<label class="zeile"><input type="checkbox" data-feld="holo" ${k.holo ? 'checked' : ''}> Holo-/Regenbogen-Rahmen</label>`);

  if (k.layout === 'normal' || k.layout === 'vollbild') {
    teile.push(feld('stufe', 'Stufe', { hinweis: 'z. B. Basis, Phase 1' }), feld('entwickelt_aus', 'Entwickelt sich aus'),
      feld('kp', 'KP', { typ: 'number' }), auswahl('typ', 'Typ', typen, { leer: true }));
    if (k.layout === 'normal') teile.push(feld('band', 'Band unter dem Foto', { ganz: true }));
    const atk = k.attacken && k.attacken.length ? k.attacken : [{}];
    [0, 1].forEach((i) => {
      const a = atk[i] || {};
      teile.push(`<fieldset><legend>Attacke ${i + 1}${i ? ' (optional)' : ''}</legend>
        <label>Name<input data-atk="${i}" data-teil="name" value="${esc(a.name)}"></label>
        <label>Schaden<input data-atk="${i}" data-teil="schaden" value="${esc(a.schaden)}"></label>
        <label class="ganz">Energiekosten<input data-atk="${i}" data-teil="kosten" value="${esc((a.kosten || []).join(', '))}" placeholder="Typen mit Komma, z. B. Feuer, Farblos"></label>
        <label class="ganz">Text<textarea data-atk="${i}" data-teil="text">${esc(a.text)}</textarea></label>
      </fieldset>`);
    });
    teile.push(feld('schwaeche', 'Schwäche'), feld('resistenz', 'Resistenz'), feld('rueckzug', 'Rückzug (0–5)', { typ: 'number' }));
  } else if (k.layout === 'trainer') {
    teile.push(feld('untertyp', 'Untertyp', { hinweis: 'z. B. UNTERSTÜTZER' }), feld('effekt', 'Effekt', { typ: 'textarea', ganz: true }),
      feld('regel', 'Regeltext', { typ: 'textarea', ganz: true }));
  } else if (k.layout === 'sammel') {
    teile.push(auswahl('typ', 'Typ (Farbe)', typen, { leer: true }), feld('beschreibung', 'Beschreibung', { typ: 'textarea', ganz: true }));
  }
  if (k.layout !== 'sammel') teile.push(feld('flavor', 'Flavor-Text', { typ: 'textarea', ganz: true }));
  teile.push(feld('namensgroesse', 'Schriftgröße Name (px, optional)', { typ: 'number', hinweis: 'automatisch' }));

  const form = $('#formKarte');
  form.innerHTML = teile.join('');
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
  form.oninput = () => { clearTimeout(zustand.timer); zustand.timer = setTimeout(aktualisiereVorschau, 200); };
  aktualisiereVorschau();
}

function leseFormular() {
  const form = $('#formKarte');
  const k = { layout: zustand.karte.layout, bild: { ...(zustand.karte.bild || {}) } };
  form.querySelectorAll('[data-feld]').forEach((el) => {
    const name = el.dataset.feld;
    if (el.type === 'checkbox') k[name] = el.checked;
    else if (el.value.trim() !== '') k[name] = el.type === 'number' ? Number(el.value) : el.value;
  });
  form.querySelectorAll('[data-bild]').forEach((el) => { k.bild[el.dataset.bild] = Number(el.value); });
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
  if (k.layout === 'normal' || k.layout === 'vollbild') k.attacken = gefuellt;
  return k;
}

async function aktualisiereVorschau() {
  if (!zustand.info || !zustand.karte) return;
  try {
    const karte = { ...leseFormular(), nummer: zustand.nr || undefined };
    $('#vorschauFrame').srcdoc = await rufe('vorschau', zustand.info.set.ordner, karte);
  } catch (e) { fehler(e); }
}

zeigeStart();
