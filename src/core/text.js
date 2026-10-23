// Kleine Text-Helfer für die Vorlagen
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Text mit Zeilenumbrüchen
function absatz(v) {
  return esc(v).replace(/\r?\n/g, '<br>');
}

// "Küche" -> "kueche"
function slug(v) {
  return String(v ?? '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = { esc, absatz, slug };
