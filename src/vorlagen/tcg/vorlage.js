// Vorlage "tcg": Spiel- und Sammelkarten im Pokémon-Stil nach dem Vorbild der Bastian Edition.
// Gestaltet auf einem Raster von 690 x 940 px = 69 x 94 mm (63 x 88 mm + 3 mm Beschnitt), 10 px = 1 mm.
const path = require('path');
const { esc, absatz, slug } = require('../../core/text');

const STANDARD_TYPEN = [
  { name: 'Kuschel', symbol: '♥', farbe: '#e86a9a', hintergrund: ['#ffe4ee', '#fac4d8'] },
  { name: 'Stahl', symbol: '⚙', farbe: '#808ea2', hintergrund: ['#ecf0f5', '#c8d2de'] },
  { name: 'Natur', symbol: '✿', farbe: '#4ca352', hintergrund: ['#e2f4d6', '#badea6'] },
  { name: 'Reisen', symbol: '✈', farbe: '#2b8fd6', hintergrund: ['#deeefc', '#b2d4f0'] },
  { name: 'Farblos', symbol: '★', farbe: '#ece6d6', textfarbe: '#5a503c', hintergrund: ['#f5f2eb', '#dcd6c8'] },
  { name: 'Wasser', symbol: '≈', farbe: '#26b0ce', hintergrund: ['#dcf6fc', '#aadeee'] },
  { name: 'Mode', symbol: '✂', farbe: '#9654c4', hintergrund: ['#f0e4fa', '#d4beec'] },
  { name: 'Kampf', symbol: '✸', farbe: '#d25c30', hintergrund: ['#fce8da', '#ecc4aa'] },
  { name: 'Küche', symbol: '♨', farbe: '#e69824', hintergrund: ['#fff2d6', '#f2d6a0'] },
  { name: 'Kunst', symbol: '✎', farbe: '#d64058', hintergrund: ['#fce2e6', '#eebac4'] },
  { name: 'Gaming', symbol: '♞', farbe: '#4652be', hintergrund: ['#e4e8fc', '#bec6f0'] },
  { name: 'Eis', symbol: '❄', farbe: '#5ca0d6', hintergrund: ['#ecf6ff', '#c4def4'] },
  { name: 'Feuer', symbol: '✹', farbe: '#e2422a', hintergrund: ['#ffe6d6', '#f6baa0'] },
];

const STANDARD_SELTENHEITEN = [
  { name: 'häufig', symbol: '●' },
  { name: 'selten', symbol: '◆', glanz: true },
  { name: 'holo', symbol: '★', glanz: true },
];

const LAYOUTS = {
  normal: { titel: 'Normal (Fotofenster oben)', kartentyp: 'spielkarte' },
  vollbild: { titel: 'Vollbild (Foto über die ganze Karte)', kartentyp: 'spielkarte' },
  trainer: { titel: 'Trainer (Effektkarte)', kartentyp: 'spielkarte' },
  sammel: { titel: 'Sammelkarte (Bild, Name, Beschreibung)', kartentyp: 'sammelkarte' },
};

// Feldbeschreibung für "card-creator vorlage zeigen" und die Oberfläche
const FELDER = {
  alle: {
    layout: 'normal | vollbild | trainer | sammel',
    name: 'Text (Pflicht)',
    namensgroesse: 'Zahl in px, optional (sonst automatisch passend)',
    bild: '{ datei, skalierung (>= 1), x, y (Verschiebung in %) } – datei relativ zum Set-Ordner oder absoluter Pfad (wird ins Set kopiert)',
    bildquelle: 'foto | ki (Pflicht)',
    seltenheit: 'Name einer Seltenheit des Sets (Pflicht, wenn das Set Seltenheiten hat)',
    holo: 'true | false – Regenbogen-/Holo-Rahmen',
    flavor: 'Text, optional',
  },
  normal: {
    stufe: 'Text, z. B. Basis, Phase 1 (Pflicht)',
    entwickelt_aus: 'Name der Vorstufe, optional',
    kp: 'Zahl (Pflicht)',
    typ: 'Name eines Typs des Sets (Pflicht)',
    band: 'Kurzinfo im Band unter dem Foto, optional',
    attacken: '[{ kosten: [Typname, …], name, schaden, text }] – 1 bis 2 (Pflicht)',
    schwaeche: 'Text, optional',
    resistenz: 'Text, optional',
    rueckzug: 'Zahl 0–5, optional',
  },
  vollbild: 'wie normal, ohne band',
  trainer: {
    untertyp: 'Text, z. B. UNTERSTÜTZER, optional',
    effekt: 'Text (Pflicht)',
    regel: 'Text, optional',
  },
  sammel: {
    typ: 'Name eines Typs des Sets, optional (färbt die Karte)',
    beschreibung: 'Text, optional',
  },
};

function typVon(set, name) {
  return (set.typen || []).find((t) => t.name === name);
}

// Prüft eine Karte gegen die Pflichtfelder und gibt die offenen Punkte zurück (leer = vollständig)
function pruefe(set, karte) {
  const offen = [];
  const leer = (v) => v === undefined || v === null || String(v).trim() === '';
  if (!LAYOUTS[karte.layout]) offen.push(`layout: eines von ${Object.keys(LAYOUTS).join(', ')}`);
  else if (LAYOUTS[karte.layout].kartentyp !== set.kartentyp) {
    const passend = Object.keys(LAYOUTS).filter((l) => LAYOUTS[l].kartentyp === set.kartentyp);
    offen.push(`layout: ${karte.layout} passt nicht zum Kartentyp ${set.kartentyp} des Sets (möglich: ${passend.join(', ')})`);
  }
  if (leer(karte.name)) offen.push('name');
  if (!karte.bild || leer(karte.bild.datei)) offen.push('bild.datei');
  if (!['foto', 'ki'].includes(karte.bildquelle)) offen.push('bildquelle: foto oder ki');
  if ((set.seltenheiten || []).length) {
    if (leer(karte.seltenheit)) offen.push('seltenheit');
    else if (!set.seltenheiten.some((s) => s.name === karte.seltenheit)) offen.push(`seltenheit: unbekannt (${karte.seltenheit})`);
  }
  if (karte.typ && !typVon(set, karte.typ)) offen.push(`typ: unbekannt (${karte.typ})`);

  if (karte.layout === 'normal' || karte.layout === 'vollbild') {
    if (leer(karte.stufe)) offen.push('stufe');
    if (leer(karte.kp)) offen.push('kp');
    if (leer(karte.typ)) offen.push('typ');
    const atk = karte.attacken || [];
    if (atk.length < 1 || atk.length > 2) offen.push('attacken: 1 bis 2');
    atk.forEach((a, i) => {
      if (leer(a.name)) offen.push(`attacken[${i}].name`);
      (a.kosten || []).forEach((k) => { if (!typVon(set, k)) offen.push(`attacken[${i}].kosten: unbekannter Typ (${k})`); });
    });
  }
  if (karte.layout === 'trainer' && leer(karte.effekt)) offen.push('effekt');
  return offen;
}

function typCss(set) {
  return (set.typen || []).map((t) => {
    const s = slug(t.name);
    const [h1, h2] = t.hintergrund || ['#f5f2eb', '#dcd6c8'];
    const text = t.textfarbe ? `;color:${t.textfarbe}` : '';
    return `.ty-${s} .panel{background:linear-gradient(${h1},${h2})}.ty-${s} .energy,.e.${s}{background:${t.farbe}${text}}`;
  }).join('\n');
}

function energie(set, name) {
  const t = typVon(set, name);
  return t ? `<span class="e ${slug(t.name)}">${esc(t.symbol)}</span>` : '';
}

function foto(karte, bildUrl) {
  const b = karte.bild || {};
  const url = b.datei ? bildUrl(b.datei) : null;
  if (!url) return '<div class="photo fehlt">Bild fehlt</div>';
  const s = Number(b.skalierung) || 1;
  const x = Number(b.x) || 0;
  const y = Number(b.y) || 0;
  return `<img class="photo" src="${esc(url)}" style="transform:translate(${x}%,${y}%) scale(${s})" alt="">`;
}

function fusszeile(set, karte, gesamt) {
  const breite = Math.max(3, String(gesamt || 0).length);
  const nr = String(karte.nummer || 0).padStart(breite, '0');
  const ges = String(gesamt || 0).padStart(breite, '0');
  const sel = (set.seltenheiten || []).find((s) => s.name === karte.seltenheit);
  const sym = sel ? `<span class="sym${sel.glanz ? ' glanz' : ''}">${esc(sel.symbol)}</span>` : '';
  return `<div class="foot"><span>${esc(set.fusszeile || set.name || '')}</span><span>${nr}/${ges}${sym}</span></div>`;
}

function name(karte, extraStil = '') {
  const groesse = karte.namensgroesse ? `font-size:${Number(karte.namensgroesse)}px;` : '';
  return `<div class="name" data-anpassen style="${groesse}${extraStil}">${esc(karte.name)}</div>`;
}

// Liefert das Markup einer Karte (ein .card-Element). bildUrl wandelt einen Bildpfad des Sets in eine URL um.
function karteHtml(set, karte, { bildUrl, gesamt }) {
  const typ = typVon(set, karte.typ);
  const klassen = ['card', { normal: 'normal', vollbild: 'full', trainer: 'trainer', sammel: 'sammel' }[karte.layout] || 'normal'];
  if (typ) klassen.push(`ty-${slug(typ.name)}`);
  if (karte.holo) klassen.push('holo');
  const teile = ['<div class="gold"></div>'];

  if (karte.layout === 'vollbild') {
    teile.push(`<div class="panel">${foto(karte, bildUrl)}<div class="shade"></div></div>`);
  } else {
    teile.push('<div class="panel"></div>', `<div class="win">${foto(karte, bildUrl)}</div>`);
  }

  if (karte.layout === 'trainer') {
    teile.push('<div class="tpill">TRAINER</div>');
    if (karte.untertyp) teile.push(`<div class="tsub">${esc(karte.untertyp)}</div>`);
    teile.push(name(karte));
    teile.push(`<div class="effect">${absatz(karte.effekt)}</div>`);
    if (karte.regel) teile.push(`<div class="rule">${absatz(karte.regel)}</div>`);
  } else if (karte.layout === 'sammel') {
    teile.push(name(karte));
    if (karte.beschreibung) teile.push(`<div class="beschr">${absatz(karte.beschreibung)}</div>`);
  } else {
    const evo = karte.entwickelt_aus ? `<span class="evo">entwickelt sich aus ${esc(karte.entwickelt_aus)}</span>` : '';
    teile.push(`<div class="top"><span class="stage">${esc(karte.stufe)}</span>${evo}</div>`);
    teile.push(name(karte));
    teile.push(`<div class="hp"><small>KP</small>${esc(karte.kp)}</div>`);
    if (typ) teile.push(`<div class="energy">${esc(typ.symbol)}</div>`);
    if (karte.layout === 'normal' && karte.band) teile.push(`<div class="ribbon" data-anpassen>${esc(karte.band)}</div>`);
    const atks = (karte.attacken || []).map((a) => {
      const kosten = (a.kosten || []).map((k) => energie(set, k)).join('');
      const text = a.text ? `<p>${absatz(a.text)}</p>` : '';
      return `<div class="atk"><div class="ah">${kosten}<b>${esc(a.name)}</b><i>${esc(a.schaden ?? '')}</i></div>${text}</div>`;
    }).join('');
    teile.push(`<div class="atks">${atks}</div>`);
    const rueckzug = '<span class="e rueckzug">★</span>'.repeat(Math.max(0, Math.min(5, Number(karte.rueckzug) || 0)));
    teile.push(`<div class="stats"><div><small>Schwäche</small>${esc(karte.schwaeche || '–')}</div><div><small>Resistenz</small>${esc(karte.resistenz || '–')}</div><div><small>Rückzug</small>${rueckzug || '–'}</div></div>`);
  }

  if (karte.flavor && karte.layout !== 'sammel') teile.push(`<div class="flavor">${absatz(karte.flavor)}</div>`);
  teile.push(fusszeile(set, karte, gesamt));
  return `<div class="${klassen.join(' ')}">${teile.join('')}</div>`;
}

function rueckseiteHtml(set, { bildUrl }) {
  const url = set.rueckseite ? bildUrl(set.rueckseite) : null;
  const bild = url
    ? `<img src="${esc(url)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" alt="">`
    : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#f6dc8c;font-weight:900;font-size:56px;text-align:center">${esc(set.name)}</div>`;
  return `<div class="card" style="background:#181e3a">${bild}</div>`;
}

module.exports = {
  id: 'tcg',
  name: 'TCG (Pokémon-Stil)',
  css: path.join(__dirname, 'card.css'),
  raster: { breite: 690, hoehe: 940, pxProMm: 10 },
  formate: [{ breite: 63, hoehe: 88, beschnitt: 3 }],
  layouts: LAYOUTS,
  felder: FELDER,
  standard: { typen: STANDARD_TYPEN, seltenheiten: STANDARD_SELTENHEITEN },
  pruefe,
  typCss,
  karteHtml,
  rueckseiteHtml,
};
