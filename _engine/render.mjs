// Macht aus einer deck.json statisches Folien-HTML. Laeuft nur beim Bauen (Node).
import { ICONS } from './icons.mjs';

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// *rot*, **fett**, Zeilenumbruch
export const inl = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/\{(ok|warn|no):([^}]+)\}/g, '<span class="c-$1">$2</span>')
  .replace(/\n/g, '<br>');

export const pad = (n) => String(n).padStart(2, '0');
export const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;

const RATIO = { '16:9': 'r169', '4:3': 'r43', '1:1': 'r11', '3:4': 'r34' };

function ph(m, cls = '') {
  if (!m) return '';
  return `<div class="ph ${cls}" data-slot="${esc(m.slot)}" data-label="${esc(m.label)}" data-kind="${esc(m.kind || 'image')}"><div class="ph-in">${icon(m.kind === 'video' ? 'video' : 'image')}<span>${esc(m.label)}</span></div></div>`;
}

// Grosses Bild auf Titel und Abschluss: das feste Porträt oder ein Medien-Slot
const visual = (m) => (m && m.asset === 'portrait'
  ? `<div class="portrait" role="img" aria-label="${esc(m.label || 'Porträt')}"></div>`
  : ph(m));

const headline = (s, cls = 'hl') => `<h1 class="${cls}">${String(s).split('\n').map((l) => `<span class="ln">${inl(l)}</span>`).join('')}</h1>`;
const eyebrow = (s) => (s ? `<div class="eb"><i></i><span>${esc(s)}</span></div>` : '');

function head(s) {
  const right = s.badge
    ? `<div class="badge"><b>${esc(s.badge.value)}</b><span>${esc(s.badge.label)}</span></div>`
    : typeof s.aside === 'string' ? `<p class="aside">${inl(s.aside)}</p>` : '';
  return `<div class="head"><div>${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}</div>${right}</div>`;
}

// Schritte werden der Reihe nach vergeben; steps:false zeigt alles sofort.
function stepper(s) {
  let n = 0;
  return {
    next: () => (s.steps === false ? '' : ` data-step="${++n}"`),
    get count() { return n; },
  };
}

function callout(s, st) {
  if (!s.callout) return '';
  const c = typeof s.callout === 'string' ? { text: s.callout } : s.callout;
  const tone = c.tone ? ` tone-${c.tone}` : '';
  const ic = c.tone === 'ok' ? 'circle-check' : c.tone === 'warn' ? 'triangle-alert' : 'info';
  return `<aside class="callout${tone}"${st.next()}>${icon(ic)}<div>${inl(c.text)}</div></aside>`;
}

function scale(s, st) {
  if (!s.scale) return '';
  return `<div class="scale"${st.next()}><span>${inl(s.scale.from)}</span><i></i><span>${inl(s.scale.to)}</span></div>`;
}

const T = {
  title(s) {
    const kpis = (s.kpis || []).map((k) => `<div><b>${esc(k.value)}</b><small>${esc(k.label)}</small></div>`).join('');
    const tag = s.nametag ? `<div class="nametag"><i></i><div><b>${esc(s.nametag.name)}</b>${s.nametag.sub ? `<small>${esc(s.nametag.sub)}</small>` : ''}</div></div>` : '';
    return {
      steps: 0,
      outer: `<div class="visual">${visual(s.media)}</div>${s.live ? '<div class="live">LIVE</div>' : ''}${tag}`,
      html: `<div>${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}${kpis ? `<div class="kpis">${kpis}</div>` : ''}</div>`,
    };
  },

  closing(s, ctx) {
    const cta = s.cta ? `<a class="cta" href="#${ctx.target(s.cta.to) || s.cta.slide || 1}">${esc(s.cta.label)} ${icon('arrow-right')}</a>` : '';
    const p = s.person ? `<div class="person"><span class="sym"></span><div><b>${esc(s.person.name)}</b><small>${esc(s.person.sub)}</small></div></div>` : '';
    return {
      steps: 0,
      outer: `<div class="visual">${visual(s.media)}</div>`,
      html: `<div>${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}${cta}${p}</div>`,
    };
  },

  statement(s) {
    const st = stepper(s);
    const co = callout(s, st);
    return { steps: st.count, html: `<div>${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}</div>${co}` };
  },

  section(s) {
    return { steps: 0, html: `<div class="chap">Kapitel ${esc(s.chapter)}</div>${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}` };
  },

  cards(s) {
    const st = stepper(s);
    const n = s.cards.length;
    const cols = s.columns || (n <= 4 ? n : 3);
    const html = s.cards.map((c) => {
      const cls = [c.highlight ? 'hi' : '', c.tone ? `tone-${c.tone}` : ''].filter(Boolean).join(' ');
      return `<article class="card ${cls}"${s.zoom ? ' data-zoom' : ''}${st.next()}>${c.icon ? `<div class="tile">${icon(c.icon)}</div>` : ''}${c.media ? ph(c.media, RATIO[c.media.ratio] || 'r169') : ''}${c.label ? `<div class="card-lbl">${esc(c.label)}</div>` : ''}${c.value ? `<div class="kpi">${inl(c.value)}</div>` : ''}${c.sub ? `<div class="card-sub">${inl(c.sub)}</div>` : ''}${c.title ? `<div class="card-t">${inl(c.title)}</div>` : ''}${c.text ? `<p class="card-x">${inl(c.text)}</p>` : ''}</article>`;
    }).join('');
    const co = callout(s, st);
    const sc = scale(s, st);
    return { steps: st.count, html: `${head(s)}<div class="cards c${cols}">${html}</div>${sc}${co}` };
  },

  rows(s, ctx) {
    const st = stepper(s);
    const n = s.rows.length;
    const two = s.columns === 2 || (s.columns !== 1 && n >= 4);
    const perCol = Math.ceil(n / 2);
    const html = s.rows.map((r, i) => {
      // ordinal: false am Deck nimmt die Spalte weg, an der Zeile bleibt sie leer und die Zeilen stehen buendig
      const ord = s.ordinal === false ? '' : `<div class="ord">${r.ordinal === false ? '' : esc(r.ordinal || pad(i + 1))}</div>`;
      const to = r.to ? ` data-goto="${ctx.target(r.to)}"` : '';
      return `<div class="row${ord ? '' : ' no-ord'}${r.highlight ? ' hi' : ''}${r.to ? ' link' : ''}"${to}${s.zoom ? ' data-zoom' : ''}${st.next()}>${ord}<div><div class="row-t">${inl(r.title)}</div>${r.text ? `<div class="row-x">${inl(r.text)}</div>` : ''}</div>${r.icon ? `<div class="row-ic">${icon(r.icon)}</div>` : ''}</div>`;
    }).join('');
    const style = two ? ` style="grid-template-rows:repeat(${perCol},auto)"` : '';
    const co = callout(s, st);
    return { steps: st.count, html: `${head(s)}<div class="rows${two ? ' two' : ''}${n <= 3 ? ' few' : ''}"${style}>${html}</div>${co}` };
  },

  quote(s) {
    const p = s.person;
    const pill = p ? `<div class="pill${p.media ? '' : ' bare'}">${p.media ? `<div class="ava">${ph(p.media)}</div>` : ''}<div><b>${esc(p.name)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</div></div>` : '';
    return { steps: 0, html: `<div class="qmark" aria-hidden="true">&ldquo;</div><blockquote class="qtext">${inl(s.text)}</blockquote>${pill}` };
  },

  timeline(s) {
    const n = s.stations.length;
    const track = s.stations.map((t, i) => `<button class="tl-st" data-to="${i}" aria-label="${esc(t.label)}"><span class="tl-no">${pad(i + 1)}</span><span class="dot">${icon(t.icon || 'flag')}</span><span class="tl-lbl">${esc(t.label)}</span></button>`).join('');
    const panes = s.stations.map((t, i) => `<div class="tl-pane" data-pane="${i}"><div class="tl-tile">${icon(t.icon || 'flag')}</div><div>${s.stepWord === '' ? '' : `<div class="tl-kick">${esc(s.stepWord || 'Schritt')} ${i + 1} von ${n}</div>`}<div class="tl-t">${inl(t.title || t.label)}</div>${t.text ? `<p class="tl-x">${inl(t.text)}</p>` : ''}</div><div class="tl-num" aria-hidden="true">${pad(i + 1)}</div></div>`).join('');
    const merk = s.aside
      ? `<div class="merk">${s.aside.title ? `<h4>${esc(s.aside.title)}</h4>` : ''}<ul class="checks">${s.aside.items.map((x) => `<li><span class="tick">${icon('check')}</span><span>${inl(x)}</span></li>`).join('')}</ul></div>`
      : '';
    return {
      steps: n - 1,
      html: `${head(s)}<div class="tl" style="--n:${n}"><div class="tl-line"><div class="tl-fill"></div></div>${track}</div><div class="tl-body"${merk ? '' : ' style="grid-template-columns:minmax(0,1fr)"'}><div class="tl-det">${panes}<div class="tl-foot"><div class="tl-bar"><i></i></div><div class="tl-arrows"><button data-tl="-1" aria-label="Vorherige Station">${icon('chevron-left')}</button><button data-tl="1" aria-label="Naechste Station">${icon('chevron-right')}</button></div></div></div>${merk}</div>${s.callout ? callout({ ...s, steps: false }, stepper({ steps: false })) : ''}`,
    };
  },

  video(s) {
    const m = { ...s.media, kind: s.media?.kind || 'video' };
    return {
      steps: 0,
      html: `<div class="kicker">${s.kicker ? `<small>${esc(s.kicker)}</small>` : ''}<span>${esc(s.title)}</span></div><div class="frame" data-player>${ph(m)}<button class="play" aria-label="Video abspielen">${icon('play')}</button></div>`,
    };
  },

  image(s) {
    return {
      steps: 0,
      html: `<div class="kicker">${s.kicker ? `<small>${esc(s.kicker)}</small>` : ''}<span>${esc(s.title)}</span></div><div class="frame${s.fit === 'cover' ? '' : ' contain'}">${ph(s.media)}</div>`,
    };
  },

  split(s) {
    const st = stepper(s);
    const bullets = (s.bullets || []).map((b) => `<li${st.next()}><span class="tick">${icon('check')}</span><span>${inl(b)}</span></li>`).join('');
    const co = callout(s, st);
    return {
      steps: st.count,
      html: `<div class="split${s.side === 'left' ? ' flip' : ''}"><div class="split-t">${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}${bullets ? `<ul class="checks bullets">${bullets}</ul>` : ''}${co ? `<div style="margin-top:1.25rem">${co}</div>` : ''}</div><div class="split-m">${ph(s.media, RATIO[s.media?.ratio] || 'r169')}</div></div>`,
    };
  },

  compare(s) {
    const st = stepper(s);
    const cols = s.columns.map((c) => `<div class="col${c.tone ? ` tone-${c.tone}` : ''}"${st.next()}><h3>${c.icon ? icon(c.icon) : ''}<span>${inl(c.title)}</span></h3><ul>${(c.items || []).map((x) => `<li>${inl(x)}</li>`).join('')}</ul></div>`).join('');
    const sc = scale(s, st);
    const co = callout(s, st);
    return { steps: st.count, html: `${head(s)}<div class="cmp" style="--n:${s.columns.length}">${cols}</div>${sc}${co}` };
  },

  table(s) {
    const st = stepper({ ...s, steps: s.steps === true ? undefined : false });
    const th = s.columns.map((c) => `<th>${esc(c)}</th>`).join('');
    const rows = s.rows.map((r) => `<tr${st.next()}>${r.map((c) => `<td>${inl(c)}</td>`).join('')}</tr>`).join('');
    const co = callout({ ...s, steps: s.steps === true ? undefined : false }, st);
    return { steps: st.count, html: `${head(s)}<table class="tbl"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>${co}` };
  },

  chat(s) {
    const w = s.window;
    const r = w.reply || {};
    return {
      steps: 0,
      html: `<div class="chatwrap"><div>${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}</div><div class="win" data-chat><div class="win-top"><i></i><i></i><i></i><span class="win-name">${esc(w.title)}</span><button class="win-re" aria-label="Noch einmal abspielen">${icon('refresh-cw')}</button></div><div class="win-body"><div class="bubble" data-type="${esc(w.user)}"></div><div class="reply"><div class="reply-ava"><span class="sym"></span></div><div>${r.title ? `<h4>${inl(r.title)}</h4>` : ''}${r.items ? `<ul>${r.items.map((x) => `<li>${inl(x)}</li>`).join('')}</ul>` : ''}${r.outro ? `<p>${inl(r.outro)}</p>` : ''}</div></div></div><div class="win-in"><span>${esc(w.placeholder || 'Nachricht schreiben …')}</span><b>${icon('arrow-right')}</b></div></div></div>`,
    };
  },

  // Sonderfall fuer alles, was kein Baustein abdeckt. Schritte per data-step im HTML.
  custom(s) {
    const found = [...String(s.html).matchAll(/data-step="(\d+)"/g)].map((m) => Number(m[1]));
    return { steps: found.length ? Math.max(...found) : 0, html: `${s.headline ? head(s) : ''}${s.html}` };
  },
};

export const TYPES = Object.keys(T);

export function renderDeck(deck) {
  const total = deck.slides.length;
  const ctx = { target: (id) => { const k = deck.slides.findIndex((x) => x.id === id); return k < 0 ? 0 : k + 1; } };
  return deck.slides.map((s, i) => {
    const n = i + 1;
    const r = T[s.type](s, ctx);
    const noWm = s.watermark === false || ['video', 'image'].includes(s.type);
    const wm = noWm ? '' : `<div class="wm" aria-hidden="true">${pad(n)}</div>`;
    const glow = s.glow || (['video', 'image'].includes(s.type) ? 'none' : ['quote'].includes(s.type) ? 'br' : 'br');
    const label = s.label || s.eyebrow || s.kicker || '';
    const source = s.source ? `<p class="source">${inl(s.source)}</p>` : '';
    const html = r.html + source;
    return `<section class="slide t-${s.type}" id="f${n}" data-n="${n}" data-label="${esc(label)}" data-steps="${r.steps}" aria-label="Folie ${n} von ${total}"><div class="glow glow-${glow}"></div>${wm}${r.outer || ''}<div class="inner">${html}</div></section>`;
  }).join('\n');
}

// Titel und Abschluss haben immer einen Bild-Slot, auch ohne Angabe in der deck.json.
export function normalize(deck) {
  deck.slides.forEach((s) => {
    if (s.media) return;
    if (s.type === 'title') s.media = { slot: 'titelVisual', label: 'Titelbild oder Porträt, freigestellt (PNG)' };
    if (s.type === 'closing') s.media = { slot: 'abschlussVisual', label: 'Porträt, freigestellt (PNG)' };
  });
  return deck;
}

// Alle Medien-Slots eines Decks fuer Supabase
export function collectSlots(deck) {
  const out = [];
  deck.slides.forEach((s, i) => {
    const add = (m) => {
      if (!m || !m.slot) return;
      out.push({ slot_key: m.slot, slide_number: i + 1, slide_title: s.label || s.eyebrow || s.title || '', label: m.label, media_kind: m.kind || (s.type === 'video' ? 'video' : 'image') });
    };
    add(s.media);
    add(s.person && s.person.media);
    (s.cards || []).forEach((c) => add(c.media));
  });
  return out;
}
