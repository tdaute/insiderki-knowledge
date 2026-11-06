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

const RATIO = { '16:9': 'r169', '3:2': 'r32', '4:3': 'r43', '1:1': 'r11', '3:4': 'r34' };

function ph(m, cls = '') {
  if (!m) return '';
  return `<div class="ph ${cls}" data-slot="${esc(m.slot)}" data-label="${esc(m.label)}" data-kind="${esc(m.kind || 'image')}"><div class="ph-in">${icon(m.kind === 'video' ? 'video' : 'image')}<span>${esc(m.label)}</span></div></div>`;
}

// Bewegtes Bild: Abdeckungen in Bildpixeln liegen ueber dem Bild und geben Nachrichten nacheinander frei.
// media.anim: { src, w, h, msgs: [{ kind, shell, avatar, bg, dots, inner, lines, color, ms, wait }], wave }
function anim(m, cls) {
  const a = m.anim;
  const pc = (v, g) => +(v / g * 100).toFixed(3);
  const clip = (p) => `clip-path:polygon(${p.map(([x, y]) => `${pc(x, a.w)}% ${pc(y, a.h)}%`).join(',')})`;
  const box = ([x, y, w, h]) => `left:${pc(x, a.w)}%;top:${pc(y, a.h)}%;width:${pc(w, a.w)}%;height:${pc(h, a.h)}%`;
  const wipe = (p, color, ms, down) => {
    const k = p.map((q) => q[down ? 1 : 0]);
    const g = down ? a.h : a.w;
    return `<div class="ax-l" data-ms="${ms}" data-a="${pc(Math.min(...k), g)}" data-b="${pc(Math.max(...k), g)}" style="${clip(p)};background:${esc(color)}${down ? ';--dir:to bottom' : ''}"></div>`;
  };
  const msgs = (a.msgs || []).map((n) => {
    const bg = esc(n.bg || a.bg);
    const parts = [];
    // Der Text liegt unter der Blasen-Abdeckung: Erst wenn sie weg ist, laeuft er frei
    (n.lines || []).forEach((l) => parts.push(wipe(l.poly, n.color, l.ms, false)));
    if (n.inner) parts.push(wipe(n.inner, n.color, n.ms || 1200, true));
    if (n.avatar) parts.push(`<div class="ax-c av" style="${clip(n.avatar)};background:${bg}"></div>`);
    parts.push(`<div class="ax-c" style="${clip(n.shell)};background:${bg}"></div>`);
    if (n.dots) parts.push(`<div class="ax-d" style="${box(n.dots.box)};background:${esc(n.dots.bg)};color:${esc(n.dots.fg)}${n.dots.line ? `;box-shadow:inset 0 0 0 1px ${esc(n.dots.line)}` : ''}"><i></i><i></i><i></i></div>`);
    return `<div class="ax-m"${n.wait ? ` data-wait="${n.wait}"` : ''}>${parts.join('')}</div>`;
  }).join('');
  let wave = '';
  if (a.wave) {
    const w = a.wave;
    // Feste Folge statt Zufall: Jeder Bau ergibt dieselbe Tonspur
    const bars = Array.from({ length: w.n }, (_, i) => {
      const x = i / (w.n - 1);
      const huelle = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11 + 1)) * (1 - 0.55 * Math.abs(x - 0.5) * 2);
      return `<i style="--h:${(huelle * 100).toFixed(0)}%;--t:${(420 + (i * 137) % 480)}ms;--v:-${(i * 97) % 700}ms"></i>`;
    }).join('');
    wave = `<div class="ax-w" style="${box(w.rect)};background:${esc(w.bg)};color:${esc(w.color)}"><div>${bars}</div></div>`;
  }
  // Gesichtserkennung: Das Bild liegt abgedunkelt unter einem Raster. Ein Suchrahmen faengt Ziel fuer Ziel ein,
  // dabei werden die Ausschnitte (reveal) scharf, danach die Felder aus after, zuletzt das ganze Bild.
  // scan: { color, targets: [{ box, color, reveal: [[x, y, w, h]] }], after: [[x, y, w, h]] }
  let scan = '';
  if (a.scan) {
    const sc = a.scan;
    const r = ([x, y, w, h]) => `<i class="ax-r" style="clip-path:inset(${pc(y, a.h)}% ${pc(a.w - x - w, a.w)}% ${pc(a.h - y - h, a.h)}% ${pc(x, a.w)}%)"></i>`;
    const ziele = (sc.targets || []).map((t) => `<div class="ax-z" data-box="${[pc(t.box[0], a.w), pc(t.box[1], a.h), pc(t.box[2], a.w), pc(t.box[3], a.h)].join(',')}" data-c="${esc(t.color || sc.color)}">${(t.reveal || [t.box]).map(r).join('')}</div>`).join('');
    scan = `<div class="ax-v"></div>${ziele}<div class="ax-a">${(sc.after || []).map(r).join('')}</div><div class="ax-sl"></div><div class="ax-k"></div>`;
  }
  const re = (a.msgs || []).length > 1 || a.scan ? `<button class="ax-re" aria-label="Noch einmal abspielen">${icon('refresh-cw')}</button>` : '';
  const ax = `<div class="ax${a.scan ? ' scan' : ''} ${cls}" data-src="${esc(a.src)}" style="--ar:${(a.w / a.h).toFixed(4)}${a.scan ? `;--scan:${esc(a.scan.color)}` : ''}">${ph(m)}${msgs}${wave}${scan}${re}</div>`;
  // Passt das Bild nicht zum Format der Reihe, steht es ganz im Rahmen
  return m.fit && RATIO[m.ratio] ? `<div class="ax-fr ${RATIO[m.ratio]}">${ax}</div>` : ax;
}

// Effekte hinter dem Karteninhalt. linie: steigende Kurve, die mit der Zahl mitlaeuft. geld: 100-Euro-Scheine flattern ein
const SCHEIN = '<svg viewBox="0 0 120 62" aria-hidden="true"><rect x=".5" y=".5" width="119" height="61" rx="4" fill="#5f9160" stroke="#a6cd9c"/><rect x="5" y="5" width="110" height="52" rx="2" fill="none" stroke="#9cc493" stroke-width=".8" opacity=".6"/><circle cx="87" cy="31" r="15" fill="#7aab74" stroke="#b5d8ab" stroke-width=".8"/><text x="87" y="37" font-size="17" text-anchor="middle" fill="#eef8ea" font-weight="600">€</text><text x="10" y="24" font-size="15" font-weight="700" fill="#eef8ea">100</text><path d="M10 34h44M10 40h34M10 46h40" stroke="#c4e2bb" stroke-width="1.2" opacity=".55"/><text x="112" y="55" font-size="7" text-anchor="end" fill="#e2f2dc">100</text></svg>';
const FX = {
  linie: '<svg class="fx-linie" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M0 54 30 44 60 42 90 47 120 40 150 31 180 33 210 34 240 25 270 19 300 22"/></svg>',
  // Feste Lagen statt Zufall: Jeder Bau ergibt dieselben Scheine
  geld: `<div class="fx-geld" aria-hidden="true">${[[50, 56, -8, 0, 1900, -40], [62, 14, 12, 260, 2100, 50], [72, 48, -16, 520, 1800, -30], [80, 10, 7, 760, 2200, 40], [56, 28, 20, 1000, 2000, -50], [76, 66, 6, 1240, 1900, 30], [66, 36, -22, 1480, 2100, -40], [82, 40, 14, 1720, 1800, 50], [59, 66, 3, 1960, 2000, -30]]
    .map(([x, y, r, d, t, sx]) => `<i style="left:${x}%;top:${y}%;--r:${r}deg;--d:${d}ms;--t:${t}ms;--sx:${sx}%">${SCHEIN}</i>`).join('')}</div>`,
};

// Bild-Slot im Seitenverhaeltnis oder, wenn es Bewegung hat, samt Abdeckungen
// fit zeigt das ganze Bild im Rahmen, wenn es nicht zum Format der Reihe passt
const medium = (m) => (m && m.anim ? anim(m, '') : ph(m, `${RATIO[m?.ratio] || 'r169'}${m?.fit ? ' fit' : ''}`));

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
    // count laesst die erste Zahl im Wert hochlaufen, fx legt Linie oder Geldscheine in die Karte
    const wert = (c) => {
      const h = inl(c.value);
      if (!c.count) return h;
      return h.replace(/\d+(?:,\d+)?/, (z) => `<span class="cnt" data-to="${z.replace(',', '.')}" data-dec="${(z.split(',')[1] || '').length}">${z}</span>`);
    };
    const n = s.cards.length;
    const cols = s.columns || (n <= 4 ? n : 3);
    const html = s.cards.map((c) => {
      const cls = [c.highlight ? 'hi' : '', c.tone ? `tone-${c.tone}` : '', c.fx ? 'fx' : ''].filter(Boolean).join(' ');
      return `<article class="card ${cls}"${s.zoom ? ' data-zoom' : ''}${st.next()}>${FX[c.fx] || ''}${c.icon ? `<div class="tile">${icon(c.icon)}</div>` : ''}${c.media ? medium(c.media) : ''}${c.label ? `<div class="card-lbl">${esc(c.label)}</div>` : ''}${c.value ? `<div class="kpi">${wert(c)}</div>` : ''}${c.sub ? `<div class="card-sub">${inl(c.sub)}</div>` : ''}${c.title ? `<div class="card-t">${inl(c.title)}</div>` : ''}${c.text ? `<p class="card-x">${inl(c.text)}</p>` : ''}</article>`;
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
      html: `<div class="split${s.side === 'left' ? ' flip' : ''}"><div class="split-t">${eyebrow(s.eyebrow)}${headline(s.headline)}${s.lead ? `<p class="lead">${inl(s.lead)}</p>` : ''}${bullets ? `<ul class="checks bullets">${bullets}</ul>` : ''}${co ? `<div style="margin-top:1.25rem">${co}</div>` : ''}</div><div class="split-m">${medium(s.media)}</div></div>`,
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
    return `<section class="slide t-${s.type}" id="f${n}" data-n="${n}" data-label="${esc(label)}" data-steps="${r.steps}"${s.enter ? ` data-enter="${esc(s.enter)}"` : ''} aria-label="Folie ${n} von ${total}"><div class="glow glow-${glow}"></div>${wm}${r.outer || ''}<div class="inner">${html}</div></section>`;
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
