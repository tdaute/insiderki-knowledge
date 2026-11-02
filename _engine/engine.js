/* KNOWLEDGE Deck-Engine v2: Schritte, Folienwechsel, Logo-Blende, Slider, Medien. */
(function () {
  'use strict';
  var cfg = window.DECK_CONFIG || {};
  var LOGO_HALTEN = 110;   // ms, wie lange das Symbol voll steht
  var TIPPEN_MS = 28;

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var total = slides.length;
  var cur = 0, step = 0, token = 0, moving = false;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (id) { return document.getElementById(id); };
  var elLabel = $('wLabel'), elNum = $('wNum'), rail = $('rail'), fill = $('railFill'),
      knob = $('railKnob'), tip = $('railTip'), prev = $('prev'), next = $('next'),
      count = $('count'), blende = $('blende');

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var stepsOf = function (i) { return Number(slides[i].dataset.steps) || 0; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- Schritte ---------- */
  function applyStep(i, n, animate) {
    var s = slides[i];
    s.classList.toggle('instant', !animate);
    var tl = s.querySelector('.tl');
    if (tl) return applyStation(s, n);

    var items = s.querySelectorAll('[data-step]');
    var fest = !!s.querySelector('.card.hi');
    var stagger = 0;
    items.forEach(function (el) {
      var k = Number(el.dataset.step);
      var was = el.classList.contains('on');
      var show = k <= n;
      if (show && !was && animate) { el.style.setProperty('--d', (stagger++ * 60) + 'ms'); }
      if (!animate) el.style.removeProperty('--d');
      el.classList.toggle('on', show);
      /* Genau eine Karte leuchtet: die zuletzt aufgedeckte */
      el.classList.toggle('current', !fest && k === n && (el.classList.contains('card') || el.classList.contains('row')));
    });
  }

  function applyStation(s, n) {
    var st = s.querySelectorAll('.tl-st');
    var c = st.length;
    st.forEach(function (el, k) {
      el.classList.toggle('done', k < n);
      el.classList.toggle('now', k === n);
      el.classList.toggle('todo', k > n);
    });
    s.querySelectorAll('.tl-pane').forEach(function (p, k) {
      p.classList.toggle('on', k === n);
      p.classList.toggle('past', k < n);
    });
    var pr = c > 1 ? n / (c - 1) : 1;
    var f = s.querySelector('.tl-fill'); if (f) f.style.setProperty('--p', pr);
    var b = s.querySelector('.tl-bar i'); if (b) b.style.setProperty('--p', c > 1 ? (n + 1) / c : 1);
  }

  /* ---------- Anzeige ---------- */
  function chrome() {
    var left = stepsOf(cur) - step;
    elLabel.textContent = slides[cur].dataset.label || '';
    elNum.innerHTML = '<b>' + pad(cur + 1) + '</b> / ' + total;
    var pr = total > 1 ? (cur / (total - 1)) * 100 : 100;
    fill.style.width = pr + '%';
    knob.style.left = pr + '%';
    rail.setAttribute('aria-valuenow', cur + 1);
    count.textContent = left;
    count.classList.toggle('on', left > 0);
    next.classList.toggle('ready', left === 0 && cur < total - 1);
    prev.disabled = cur === 0 && step === 0;
    next.disabled = cur === total - 1 && left === 0;
    try { history.replaceState(null, '', '#' + (cur + 1) + (step ? '.' + step : '')); } catch (e) { /* file:// */ }
  }

  /* ---------- Folienwechsel ---------- */
  function swap(to, atStep) {
    slides.forEach(function (s, i) {
      s.classList.remove('active', 'leaving', 'entering', 'run');
      s.setAttribute('aria-hidden', i === to ? 'false' : 'true');
    });
    stopSlide(slides[cur]);
    cur = to; step = atStep;
    slides[to].classList.add('active');
    fit(slides[to]);
    applyStep(to, atStep, false);
    startSlide(slides[to]);
    chrome();
  }

  async function goSlide(to, atStep, opts) {
    opts = opts || {};
    to = Math.max(0, Math.min(total - 1, to));
    var mine = ++token;
    var from = cur;
    if (to === from && !opts.force) { step = atStep; applyStep(cur, step, false); chrome(); return; }

    /* Schnelles Blaettern oder Slider: ohne Blende springen */
    if (moving || opts.quick || still && opts.quick) {
      moving = false;
      blende.classList.remove('on');
      swap(to, atStep);
      return;
    }
    moving = true;
    slides[from].classList.add('leaving');
    blende.classList.add('on');
    await wait(100);
    if (mine !== token) return;
    swap(to, atStep);
    var s = slides[to];
    s.classList.add('entering');
    await wait(still ? 60 : LOGO_HALTEN);
    if (mine !== token) return;
    blende.classList.remove('on');
    void s.offsetWidth;
    s.classList.add('run');
    await wait(240);
    if (mine !== token) return;
    s.classList.remove('entering', 'run');
    moving = false;
  }

  function forward() {
    if (step < stepsOf(cur)) { step++; applyStep(cur, step, true); chrome(); return; }
    if (cur < total - 1) goSlide(cur + 1, 0);
  }
  function back() {
    if (step > 0) { step--; applyStep(cur, step, true); chrome(); return; }
    if (cur > 0) goSlide(cur - 1, stepsOf(cur - 1));
  }

  /* ---------- Beim Betreten / Verlassen einer Folie ---------- */
  function startSlide(s) {
    s.querySelectorAll('video[data-loop]').forEach(function (v) { v.play().catch(function () {}); });
    var chat = s.querySelector('[data-chat]');
    if (chat) playChat(chat);
  }
  function stopSlide(s) {
    if (!s) return;
    s.querySelectorAll('video').forEach(function (v) { v.pause(); });
    s.querySelectorAll('[data-player].playing').forEach(function (f) { f.classList.remove('playing'); var v = f.querySelector('video'); if (v) { v.controls = false; v.currentTime = 0; } });
    var chat = s.querySelector('[data-chat]');
    if (chat) chat._run = (chat._run || 0) + 1;
  }

  /* ---------- Chat-Demo ---------- */
  async function playChat(win) {
    var run = win._run = (win._run || 0) + 1;
    var bubble = win.querySelector('.bubble'), reply = win.querySelector('.reply');
    var text = bubble.dataset.type || '';
    bubble.classList.remove('on'); reply.classList.remove('on'); bubble.textContent = '';
    await wait(still ? 0 : 500);
    if (run !== win._run) return;
    bubble.classList.add('on');
    if (still) { bubble.textContent = text; }
    else {
      var car = document.createElement('span'); car.className = 'car';
      for (var i = 1; i <= text.length; i++) {
        bubble.textContent = text.slice(0, i); bubble.appendChild(car);
        await wait(TIPPEN_MS);
        if (run !== win._run) return;
      }
      car.remove();
    }
    await wait(still ? 0 : 450);
    if (run !== win._run) return;
    reply.classList.add('on');
  }

  /* ---------- Platz pruefen ----------
     Gemessen wird der tiefste Inhalt gegen die Oberkante der Fusszeile. scrollHeight reicht
     nicht: Es zaehlt das Padding mit und meldet Inhalt unter der Fusszeile nicht. */
  function ueberstand(s) {
    var inner = s.querySelector('.inner');
    var grenze = document.querySelector('.navbar').getBoundingClientRect().top - 4;
    var max = 0;
    s.classList.add('mess');
    inner.querySelectorAll('*').forEach(function (e) {
      if (e.parentElement.closest('.frame,.win,.tl-det,svg')) return;
      var r = e.getBoundingClientRect();
      if (r.height && r.bottom > max) max = r.bottom;
    });
    s.classList.remove('mess');
    return Math.round(max - grenze);
  }
  function fit(s) {
    if (window.innerWidth <= 760) return;
    s.classList.remove('dense', 'xdense');
    if (ueberstand(s) > 0) {
      s.classList.add('dense');
      if (ueberstand(s) > 0) s.classList.add('xdense');
    }
  }

  /* ---------- Bedienung ---------- */
  prev.addEventListener('click', back);
  next.addEventListener('click', forward);

  /* Vergroessern einer Karte oder Zeile fuer den Raum */
  var zoomLayer = null;
  function zoomClose() { if (zoomLayer) { zoomLayer.remove(); zoomLayer = null; } }
  function zoomOpen(el) {
    zoomLayer = document.createElement('div');
    zoomLayer.className = 'zoom-layer';
    var c = el.cloneNode(true);
    c.classList.remove('current');
    c.removeAttribute('data-zoom'); c.removeAttribute('data-step'); c.removeAttribute('data-goto');
    zoomLayer.appendChild(c);
    document.getElementById('deck').appendChild(zoomLayer);
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (zoomLayer) { if (k === 'Escape' || k === 'ArrowRight' || k === 'ArrowLeft' || k === ' ') { e.preventDefault(); zoomClose(); } return; }
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { e.preventDefault(); forward(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); back(); }
    else if (k === 'Home') { e.preventDefault(); goSlide(0, 0, { quick: true }); }
    else if (k === 'End') { e.preventDefault(); goSlide(total - 1, stepsOf(total - 1), { quick: true }); }
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    }
  });

  document.addEventListener('click', function (e) {
    if (zoomLayer) { zoomClose(); return; }
    var zo = e.target.closest('[data-zoom]');
    if (zo) { zoomOpen(zo); return; }
    var gt = e.target.closest('[data-goto]');
    if (gt) { var g = Number(gt.dataset.goto) - 1; goSlide(g, stepsOf(g)); return; }
    var to = e.target.closest('[data-to]');
    if (to) { step = Number(to.dataset.to); applyStep(cur, step, true); chrome(); return; }
    var tl = e.target.closest('[data-tl]');
    if (tl) {
      step = Math.max(0, Math.min(stepsOf(cur), step + Number(tl.dataset.tl)));
      applyStep(cur, step, true); chrome(); return;
    }
    var re = e.target.closest('.win-re');
    if (re) { playChat(re.closest('[data-chat]')); return; }
    var play = e.target.closest('.play');
    if (play) {
      var f = play.closest('[data-player]'), v = f.querySelector('video');
      if (v) { f.classList.add('playing'); v.controls = true; v.play().catch(function () {}); }
      return;
    }
    var a = e.target.closest('a[href^="#"]');
    /* Spruenge landen voll aufgebaut, sonst steht eine leere Agenda da */
    if (a) { e.preventDefault(); var n = parseInt(a.getAttribute('href').slice(1), 10) || 1; goSlide(n - 1, stepsOf(n - 1)); }
  });

  /* Slider */
  var dragging = false;
  function railIndex(ev) {
    var r = rail.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    return { i: Math.round(p * (total - 1)) };
  }
  function railPreview(i) {
    var pr = total > 1 ? (i / (total - 1)) * 100 : 100;
    fill.style.width = pr + '%'; knob.style.left = pr + '%'; tip.style.left = pr + '%';
    tip.textContent = pad(i + 1) + ' · ' + (slides[i].dataset.label || '');
  }
  rail.addEventListener('pointerdown', function (e) {
    dragging = true; rail.setPointerCapture(e.pointerId); rail.classList.add('drag');
    railPreview(railIndex(e).i);
  });
  rail.addEventListener('pointermove', function (e) { if (dragging) railPreview(railIndex(e).i); });
  rail.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    dragging = false; rail.classList.remove('drag');
    goSlide(railIndex(e).i, 0, { quick: true });
    chrome();
  });
  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp') { e.preventDefault(); goSlide(cur + 1, 0, { quick: true }); }
    if (e.key === 'ArrowDown') { e.preventDefault(); goSlide(cur - 1, 0, { quick: true }); }
  });

  /* Wischen */
  var tx = null, ty = null;
  document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) forward(); else back(); }
  }, { passive: true });

  /* URL-Hash: #7 oder #7.2 */
  function readHash() {
    var m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
    if (!m) return null;
    var i = Math.max(0, Math.min(total - 1, Number(m[1]) - 1));
    return { i: i, s: Math.min(stepsOf(i), Number(m[2] || 0)) };
  }
  window.addEventListener('hashchange', function () {
    var h = readHash();
    if (h && (h.i !== cur || h.s !== step)) goSlide(h.i, h.s, { quick: true });
  });
  window.addEventListener('resize', function () { fit(slides[cur]); });

  /* ---------- Medien aus Supabase ---------- */
  function mount(el, url) {
    var isVid = /\.(mp4|webm|mov)(\?|$)/i.test(url);
    var player = el.parentElement && el.parentElement.hasAttribute('data-player');
    var keep = ['r169', 'r43', 'r11', 'r34'].filter(function (c) { return el.classList.contains(c); }).join(' ');
    var node = document.createElement(isVid ? 'video' : 'img');
    node.className = ('media ' + keep).trim();
    node.setAttribute('data-slot', el.getAttribute('data-slot'));
    node.src = url;
    if (isVid) {
      node.playsInline = true; node.setAttribute('playsinline', ''); node.preload = 'metadata';
      if (!player) { node.muted = true; node.loop = true; node.setAttribute('data-loop', ''); }
    } else { node.alt = el.getAttribute('data-label') || ''; }
    el.replaceWith(node);
    if (isVid && !player && node.closest('.slide') === slides[cur]) node.play().catch(function () {});
  }
  async function hydrate() {
    if (!cfg.slug || !cfg.sbUrl) return;
    try {
      var r = await fetch(cfg.sbUrl + '/rest/v1/presentation_slots?select=slot_key,public_url,presentations!inner(slug)&presentations.slug=eq.' + encodeURIComponent(cfg.slug) + '&public_url=not.is.null',
        { headers: { apikey: cfg.sbKey, Authorization: 'Bearer ' + cfg.sbKey } });
      if (!r.ok) return;
      var rows = await r.json();
      rows.forEach(function (row) {
        document.querySelectorAll('.ph[data-slot="' + row.slot_key + '"]').forEach(function (el) { mount(el, row.public_url); });
      });
    } catch (e) { /* offline: Platzhalter bleiben stehen */ }
  }

  /* ---------- Start ---------- */
  rail.setAttribute('aria-valuemax', total);
  var start = readHash() || { i: 0, s: 0 };
  slides.forEach(function (s, i) { if (s.querySelector('.tl')) applyStation(s, 0); s.setAttribute('aria-hidden', 'true'); });
  cur = start.i; step = start.s;
  swap(start.i, start.s);
  hydrate();

  /* Pruefwerkzeug fuer Agent und Browser-Test */
  window.__deck = {
    total: total,
    go: function (n, s) { goSlide(n - 1, s === undefined ? stepsOf(n - 1) : s, { quick: true }); },
    state: function () { return { slide: cur + 1, step: step, steps: stepsOf(cur), label: slides[cur].dataset.label }; },
    audit: function () {
      var out = [], umbrueche = [];
      var keep = { i: cur, s: step };
      slides.forEach(function (s, i) {
        swap(i, stepsOf(i));
        var ue = ueberstand(s);
        var inner = s.querySelector('.inner');
        var breit = inner.scrollWidth - inner.clientWidth;
        if (ue > 0 || breit > 1) out.push({ folie: i + 1, ueberstand: Math.max(ue, 0), zuBreit: Math.max(breit, 0), label: s.dataset.label });
        s.querySelectorAll('.hl').forEach(function (h) {
          var soll = h.querySelectorAll('.ln').length;
          var ist = Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
          if (ist > soll) umbrueche.push({ folie: i + 1, sollZeilen: soll, istZeilen: ist });
        });
      });
      swap(keep.i, keep.s);
      return { folien: total, slots: document.querySelectorAll('[data-slot]').length, ueberlauf: out, umbrueche: umbrueche };
    },
  };
})();
