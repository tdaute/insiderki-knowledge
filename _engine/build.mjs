#!/usr/bin/env node
// Baut aus <slug>/deck.json eine einzelne <slug>/index.html.
// Aufruf:  node _engine/build.mjs <slug>
//          node _engine/build.mjs --alle
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDeck, collectSlots, normalize, esc, icon, TYPES } from './render.mjs';
import { ICONS } from './icons.mjs';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(ENGINE);
const read = (p) => fs.readFileSync(path.join(ENGINE, p), 'utf8');
const b64 = (p) => fs.readFileSync(path.join(ENGINE, p)).toString('base64');

const LIMITS = { headline: 70, lead: 260, aside: 220, row: 110, rowTitle: 60, card: 130, cardTitle: 60, station: 150, quote: 170, bullet: 120, item: 130, cell: 160, callout: 240, source: 200 };

// Welche Felder welcher Folientyp darstellt. Alles andere waere still verloren und ist ein Fehler.
const COMMON = ['type', 'label', 'id', 'glow', 'watermark', 'notes', 'source', 'steps'];
const HEAD = ['eyebrow', 'headline', 'lead', 'aside', 'badge'];
const FIELDS = {
  title: ['eyebrow', 'headline', 'lead', 'kpis', 'live', 'nametag', 'media'],
  closing: ['eyebrow', 'headline', 'lead', 'cta', 'person', 'media'],
  statement: ['eyebrow', 'headline', 'lead', 'callout'],
  section: ['chapter', 'headline', 'lead'],
  cards: [...HEAD, 'cards', 'columns', 'callout', 'scale', 'zoom'],
  rows: [...HEAD, 'rows', 'columns', 'ordinal', 'callout', 'zoom'],
  quote: ['text', 'person'],
  timeline: [...HEAD, 'stations', 'stepWord', 'callout'],
  video: ['kicker', 'title', 'media'],
  image: ['kicker', 'title', 'media', 'fit'],
  split: ['eyebrow', 'headline', 'lead', 'bullets', 'media', 'side', 'callout'],
  compare: [...HEAD, 'columns', 'callout', 'scale'],
  table: [...HEAD, 'columns', 'rows', 'callout'],
  chat: ['eyebrow', 'headline', 'lead', 'window'],
  custom: [...HEAD, 'html'],
};

// Das Logo steckt einmal im CSS, damit es im Deck nicht mehrfach Platz belegt.
function logoTokens(deck) {
  const data = (f, typ) => `url(data:image/${typ};base64,${b64(f)})`;
  const portrait = deck.slides.some((s) => s.media && s.media.asset === 'portrait')
    ? `--portrait:${data('portrait/tino-daute.jpg', 'jpeg')};--portrait-maske:${data('portrait/tino-daute-maske.png', 'png')};`
    : '';
  return `:root{--logo-voll:${data('logo/logo-voll.png', 'png')};--logo-symbol:${data('logo/logo-symbol.png', 'png')};${portrait}}`;
}

function fontFaces() {
  const face = (fam, w, file) => `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64(`fonts/${file}`)}) format("woff2")}`;
  return [
    face('Switzer', 200, 'switzer-200.woff2'),
    face('Switzer', 300, 'switzer-300.woff2'),
    face('Switzer', 400, 'switzer-400.woff2'),
    face('Switzer', 500, 'switzer-500.woff2'),
    face('Switzer', 600, 'switzer-600.woff2'),
    face('Bebas Neue', 400, 'bebas-neue-latin-400-normal.woff2'),
  ].join('\n');
}

// Platzhaltertexte der Vorlage duerfen in keinem echten Deck stehen bleiben.
const KEIN_TEXT = new Set(['type', 'id', 'slot', 'ratio', 'kind', 'icon', 'tone', 'side', 'fit', 'glow', 'label', 'name', 'sub', 'notes', 'slug']);
function texte(wert, schluessel, out = []) {
  if (KEIN_TEXT.has(schluessel)) return out;
  if (Array.isArray(wert)) wert.forEach((v) => texte(v, schluessel, out));
  else if (wert && typeof wert === 'object') Object.entries(wert).forEach(([k, v]) => texte(v, k, out));
  else if (typeof wert === 'string' && wert.length >= 12) out.push(wert);
  return out;
}
function platzhalter(deck) {
  const datei = path.join(ROOT, '_vorlage', 'deck.json');
  if (deck.istVorlage || !fs.existsSync(datei)) return [];
  const vorlage = new Set(texte(JSON.parse(fs.readFileSync(datei, 'utf8')).slides));
  const out = [];
  deck.slides.forEach((s, i) => {
    texte(s).filter((t) => vorlage.has(t)).forEach((t) => out.push(`Folie ${i + 1}: noch Platzhaltertext der Vorlage: "${t.replace(/\n/g, ' ').slice(0, 60)}"`));
  });
  return out;
}

// Prueft eine deck.json. Fehler stoppen den Bau, Hinweise nicht.
export function check(deck) {
  const err = [], warn = [];
  const len = (txt, max, wo) => {
    const t = String(txt || '').replace(/\*/g, '');
    if (t.length > max) warn.push(`${wo}: ${t.length} Zeichen (Richtwert ${max})`);
  };
  ['slug', 'title', 'slides'].forEach((k) => { if (!deck[k]) err.push(`Feld fehlt: ${k}`); });
  if (!Array.isArray(deck.slides) || !deck.slides.length) { err.push('Keine Folien'); return { err, warn }; }

  const need = {
    title: ['headline'], closing: ['headline'], statement: ['headline'], section: ['headline', 'chapter'],
    cards: ['headline', 'cards'], rows: ['headline', 'rows'], quote: ['text'], timeline: ['headline', 'stations'],
    video: ['title', 'media'], image: ['title', 'media'], split: ['headline', 'media'], compare: ['headline', 'columns'],
    table: ['headline', 'columns', 'rows'], chat: ['headline', 'window'], custom: ['html'],
  };
  const useIcon = (name, wo) => { if (name && !ICONS[name]) err.push(`${wo}: unbekanntes Icon "${name}"`); };

  deck.slides.forEach((s, i) => {
    const wo = `Folie ${i + 1} (${s.type})`;
    if (!TYPES.includes(s.type)) { err.push(`${wo}: unbekannter Folientyp`); return; }
    (need[s.type] || []).forEach((k) => { if (s[k] === undefined) err.push(`${wo}: Feld fehlt: ${k}`); });
    Object.keys(s).forEach((k) => { if (!COMMON.includes(k) && !FIELDS[s.type].includes(k)) err.push(`${wo}: Feld "${k}" wird bei diesem Folientyp nicht dargestellt`); });
    if (s.media && s.media.asset && s.media.asset !== 'portrait') err.push(`${wo}: unbekanntes asset "${s.media.asset}"`);
    if (s.media && s.media.asset && !['title', 'closing'].includes(s.type)) err.push(`${wo}: das Porträt gibt es nur auf title und closing`);
    if (s.type === 'timeline' && typeof s.aside === 'string') err.push(`${wo}: aside muss bei der Zeitleiste { title, items } sein`);
    if (s.type !== 'timeline' && s.aside && typeof s.aside !== 'string') err.push(`${wo}: aside muss Text sein`);
    const toIds = [s.cta && s.cta.to, ...(s.type === 'rows' ? (s.rows || []).map((r) => r.to) : [])].filter(Boolean);
    toIds.forEach((id) => { if (!deck.slides.some((x) => x.id === id)) err.push(`${wo}: Sprungziel "${id}" gibt es nicht`); });
    len(s.source, LIMITS.source, `${wo} Quelle`);
    len(typeof s.callout === 'string' ? s.callout : s.callout && s.callout.text, LIMITS.callout, `${wo} Hinweiskasten`);
    if (!s.label && !s.eyebrow && !s.kicker) warn.push(`${wo}: kein Sektionslabel fuer die Kopfzeile`);
    if (s.headline) {
      len(s.headline, LIMITS.headline, `${wo} Headline`);
      const reds = (String(s.headline).match(/\*[^*]+\*/g) || []).length;
      if (reds > 1) warn.push(`${wo}: mehr als ein roter Abschnitt in der Headline`);
    }
    len(s.lead, LIMITS.lead, `${wo} Lead`);
    if (typeof s.aside === 'string') len(s.aside, LIMITS.aside, `${wo} Randtext`);
    len(s.text, LIMITS.quote, `${wo} Zitat`);
    (s.cards || []).forEach((c, k) => {
      len(c.text, LIMITS.card, `${wo} Karte ${k + 1}`); len(c.title, LIMITS.cardTitle, `${wo} Kartentitel ${k + 1}`); useIcon(c.icon, wo);
      if (c.media && ['1:1', '3:4'].includes(c.media.ratio) && s.cards.length > 2) warn.push(`${wo}: Hochformat-Bilder passen nur auf bis zu zwei Karten`);
    });
    if (s.type === 'rows') (s.rows || []).forEach((r, k) => { len(r.text, LIMITS.row, `${wo} Zeile ${k + 1}`); len(r.title, LIMITS.rowTitle, `${wo} Zeilentitel ${k + 1}`); useIcon(r.icon, wo); });
    (s.stations || []).forEach((t, k) => { len(t.text, LIMITS.station, `${wo} Station ${k + 1}`); useIcon(t.icon, wo); });
    (s.bullets || []).forEach((b, k) => len(b, LIMITS.bullet, `${wo} Punkt ${k + 1}`));
    if (s.type === 'compare') (s.columns || []).forEach((c, k) => { (c.items || []).forEach((x, j) => len(x, LIMITS.item, `${wo} Spalte ${k + 1}, Punkt ${j + 1}`)); useIcon(c.icon, wo); });
    if (s.type === 'table') (s.rows || []).forEach((r, k) => r.forEach((c, j) => len(c, LIMITS.cell, `${wo} Zeile ${k + 1}, Spalte ${j + 1}`)));
    if (s.type === 'table' && s.rows) s.rows.forEach((r, k) => { if (r.length !== s.columns.length) err.push(`${wo}: Zeile ${k + 1} hat ${r.length} statt ${s.columns.length} Zellen`); });
    if (s.type === 'cards' && s.cards && s.cards.length > 6) err.push(`${wo}: mehr als 6 Karten`);
    if (s.type === 'rows' && s.rows && s.rows.length > 6) err.push(`${wo}: mehr als 6 Zeilen`);
    if (s.stations && s.stations.length > 7) err.push(`${wo}: mehr als 7 Stationen`);
    if (s.type === 'cards' && s.cards && s.cards.filter((c) => c.highlight).length > 1) warn.push(`${wo}: mehr als eine hervorgehobene Karte`);
    if (s.type !== 'custom' && JSON.stringify(s).includes('{{') && !deck.istVorlage) warn.push(`${wo}: offener Platzhalter`);
  });

  err.push(...platzhalter(deck));

  const slots = collectSlots(deck).map((x) => x.slot_key);
  const dupes = slots.filter((k, i) => slots.indexOf(k) !== i);
  if (dupes.length) err.push(`Slot doppelt: ${[...new Set(dupes)].join(', ')}`);
  return { err, warn };
}

function buildHtml(deck) {
  const config = JSON.parse(read('config.json'));
  const slidesHtml = renderDeck(deck);
  const runtime = { slug: deck.istVorlage ? '' : deck.slug, sbUrl: config.sbUrl, sbKey: config.sbKey };

  return `<!doctype html>
<html lang="${esc(deck.lang || 'de')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(deck.title)} | KNOWLEDGE</title>
${deck.description ? `<meta name="description" content="${esc(deck.description)}">` : ''}
<meta name="generator" content="KNOWLEDGE Deck-Engine v2">
<style>
${fontFaces()}
${logoTokens(deck)}
${read('engine.css')}
</style>
</head>
<body>
<div id="deck">
  <div class="raster"></div>
  <header class="topbar">
    <div class="brand logo-voll" role="img" aria-label="KNOWLEDGE"></div>
    <div class="where"><span class="lbl" id="wLabel"></span><span class="num" id="wNum"></span></div>
  </header>
  <main>
${slidesHtml}
  </main>
  <div class="footfade"></div>
  <div class="blende" id="blende" aria-hidden="true"><div class="blende-in"><span class="sym"></span></div></div>
  <div class="wisch" id="wisch" aria-hidden="true"></div>
  <nav class="navbar" aria-label="Navigation">
    <button class="nbtn" id="prev" aria-label="Zurueck">${icon('chevron-left')}</button>
    <div class="rail" id="rail" role="slider" tabindex="0" aria-label="Folie waehlen" aria-valuemin="1"><div class="rail-fill" id="railFill"></div><div class="rail-knob" id="railKnob"></div><div class="rail-tip" id="railTip"></div></div>
    <button class="nbtn" id="next" aria-label="Weiter">${icon('chevron-right')}<span class="count" id="count"></span></button>
    <div class="hint"><kbd>←</kbd><kbd>→</kbd><span>navigieren</span></div>
  </nav>
</div>
<script>window.DECK_CONFIG=${JSON.stringify(runtime)};</script>
<script>
${read('engine.js')}
</script>
</body>
</html>
`;
}

// SQL fuer Supabase. Fuellt keine Medien aus und ueberschreibt keine vorhandenen.
function buildSql(deck) {
  const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
  const slots = collectSlots(deck);
  const rows = slots.map((s, i) => `  (${q(s.slot_key)}, ${s.slide_number}, ${q(s.slide_title)}, ${q(s.label)}, ${q(s.media_kind)}, ${i})`).join(',\n');
  return `-- Deck ${deck.slug}. Neu angelegte Decks starten als Entwurf.
insert into public.presentations (slug, title, description, client, status, html_path, slide_count, event_date)
values (${q(deck.slug)}, ${q(deck.title)}, ${q(deck.description)}, ${q(deck.client)}, 'draft', ${q(`${deck.slug}/index.html`)}, ${deck.slides.length}, ${q(deck.event_date)})
on conflict (slug) do update set
  title = excluded.title, description = coalesce(excluded.description, presentations.description),
  client = coalesce(excluded.client, presentations.client),
  html_path = excluded.html_path, slide_count = excluded.slide_count,
  event_date = coalesce(excluded.event_date, presentations.event_date), updated_at = now();
${slots.length ? `
insert into public.presentation_slots (presentation_id, slot_key, slide_number, slide_title, label, media_kind, sort_order)
select p.id, v.slot_key, v.slide_number, v.slide_title, v.label, v.media_kind, v.sort_order
from public.presentations p
cross join (values
${rows}
) as v(slot_key, slide_number, slide_title, label, media_kind, sort_order)
where p.slug = ${q(deck.slug)}
on conflict (presentation_id, slot_key) do update set
  slide_number = excluded.slide_number, slide_title = excluded.slide_title,
  label = excluded.label, media_kind = excluded.media_kind, sort_order = excluded.sort_order, updated_at = now();
` : ''}
-- Kontrolle: Slots in der Datenbank, die das Deck nicht mehr nutzt. Nicht automatisch loeschen.
select s.slot_key, s.public_url from public.presentation_slots s
join public.presentations p on p.id = s.presentation_id
where p.slug = ${q(deck.slug)}${slots.length ? ` and s.slot_key not in (${slots.map((s) => q(s.slot_key)).join(', ')})` : ''};
`;
}

// Handout: handout.md im Deck-Ordner wird in die Editorial-Vorlage eingesetzt.
function buildHandout(dir, deck) {
  const md = path.join(dir, 'handout.md');
  if (!fs.existsSync(md)) return false;
  let tpl = read('handout-vorlage.html');
  const text = fs.readFileSync(md, 'utf8').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const start = tpl.indexOf('const MARKDOWN = `');
  const end = tpl.indexOf('`;', start + 18);
  if (start < 0 || end < 0) throw new Error('Handout-Vorlage: MARKDOWN-Block nicht gefunden');
  tpl = `${tpl.slice(0, start)}const MARKDOWN = \`${text}${tpl.slice(end)}`;
  const marked = read('vendor/marked.min.js').replace(/<\/script/g, '<\\/script');
  tpl = tpl.replace(/<script[^>]*marked[^>]*><\/script>/, () => `<script>${marked}</script>`);
  tpl = tpl.replace(/<title>[^<]*<\/title>/, () => `<title>Handout: ${esc(deck.title)} | KNOWLEDGE</title>`);
  tpl = tpl.replace('</head>', () => '<style>.editor-bar{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.pdf-btn{position:fixed;top:20px;right:20px;z-index:9;padding:10px 18px;border:0;border-radius:4px;background:#C21D1A;color:#fff;font:500 13px Montserrat,sans-serif;cursor:pointer}@media print{.pdf-btn{display:none}}</style></head>');
  tpl = tpl.replace('<div class="sheet"', () => '<button class="pdf-btn" onclick="window.print()">Als PDF speichern</button><div class="sheet"');
  fs.writeFileSync(path.join(dir, 'handout.html'), tpl);
  return true;
}

function build(slug) {
  const dir = path.join(ROOT, slug);
  const file = path.join(dir, 'deck.json');
  if (!fs.existsSync(file)) throw new Error(`Nicht gefunden: ${slug}/deck.json`);
  const deck = normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
  const { err, warn } = check(deck);
  warn.forEach((w) => console.log(`  Hinweis  ${w}`));
  if (err.length) {
    err.forEach((e) => console.error(`  FEHLER   ${e}`));
    throw new Error(`${slug}: ${err.length} Fehler, nichts gebaut`);
  }
  const html = buildHtml(deck);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  const arbeit = path.join(ROOT, '_arbeit', slug);
  fs.mkdirSync(arbeit, { recursive: true });
  fs.writeFileSync(path.join(arbeit, 'supabase.sql'), buildSql(deck));
  const handout = buildHandout(dir, deck);
  console.log(`${slug}: ${deck.slides.length} Folien, ${collectSlots(deck).length} Slots, ${Math.round(html.length / 1024)} KB${handout ? ', Handout' : ''}${warn.length ? `, ${warn.length} Hinweise` : ''}`);
}

const arg = process.argv[2];
if (!arg) { console.error('Aufruf: node _engine/build.mjs <slug> | --alle'); process.exit(2); }
try {
  if (arg === '--alle') {
    fs.readdirSync(ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'deck.json')))
      .forEach((d) => build(d.name));
  } else {
    build(arg);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
