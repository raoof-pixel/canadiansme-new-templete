/*
 * CanadianSME article tools + site accessibility panel
 * ----------------------------------------------------
 * 1. Listen   – reads the whole article aloud (browser speech, no cost),
 *               highlights the paragraph being read, speed control.
 * 2. Quick Read – collapsible AI summary box above the article body.
 *               Summaries come from window.CSME_QUICK_READS (quick-reads.js).
 *               In production these come from the CMS field `quickRead`
 *               (generated at publish time, approved by an editor).
 * 3. Accessibility – floating panel on every page: text size, contrast,
 *               readable font, line spacing, link highlighting, reading
 *               guide, pause animations. Choices are remembered per browser.
 *
 * Article templates mark the mount point with <div data-csme-tools="post|a1">.
 * Elements that must not be read aloud carry data-csme-noread.
 */
(function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────────
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var ICON = {
    spark: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M10 2l1.9 5.1L17 9l-5.1 1.9L10 16l-1.9-5.1L3 9l5.1-1.9zM18 13l.9 2.6 2.6.9-2.6.9L18 20l-.9-2.6-2.6-.9 2.6-.9zM18 2l.6 1.4 1.4.6-1.4.6L18 6l-.6-1.4L16 4l1.4-.6z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>',
    head: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5" fill="currentColor"/><rect x="17" y="14" width="4" height="6" rx="1.5" fill="currentColor"/></svg>',
    a11y: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="12" cy="4.5" r="2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5L8.5 21M12 14.5l3.5 6.5"/></svg>'
  };

  // ── styles ───────────────────────────────────────────────────────
  var CSS = [
    // Quick Read
    '.csme-qr{position:relative;border-radius:12px;padding:1.5px;background:linear-gradient(120deg,#002364,#004FB8 45%,#D71920);margin:0 0 18px}',
    '.csme-qr-in{background:#fff;border-radius:10.5px;overflow:hidden}',
    '.csme-qr-btn{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:14px 18px;cursor:pointer}',
    '.csme-qr-btn:focus-visible{outline:3px solid #004FB8;outline-offset:-3px;border-radius:10px}',
    '.csme-qr-ic{color:#D71920;display:flex;flex-shrink:0}',
    '.csme-qr-t{display:block;font-family:Sora,"Helvetica Neue",Arial,sans-serif;font-weight:700;font-size:16px;line-height:1.3;color:#002364}',
    '.csme-qr-s{display:block;font-size:12.5px;line-height:1.4;color:#5A6470;margin-top:2px}',
    '.csme-qr-chev{margin-left:auto;color:#5A6470;display:flex;transition:transform .2s}',
    '.csme-qr[data-open="true"] .csme-qr-chev{transform:rotate(180deg)}',
    '.csme-qr-body{padding:0 18px 16px 52px}',
    '.csme-qr-body ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}',
    '.csme-qr-body li{position:relative;padding-left:16px;font-size:16px;line-height:1.55;color:#14181D}',
    '.csme-qr-body li:before{content:"";position:absolute;left:0;top:.62em;width:7px;height:7px;border-radius:50%;background:#D71920}',
    '.csme-qr-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid #E4E7EC;font-size:12.5px;color:#5A6470}',
    '.csme-qr-foot button{all:unset;cursor:pointer;color:#004FB8;font-weight:600}',
    '.csme-qr-foot button:focus-visible{outline:2px solid #004FB8;outline-offset:2px}',
    // Listen bar
    '.csme-ls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;border:1px solid #E4E7EC;border-radius:12px;background:#F4F6F8;margin:0 0 18px}',
    '.csme-ls-play{all:unset;box-sizing:border-box;width:42px;height:42px;border-radius:50%;background:#101828;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}',
    '.csme-ls-play:hover{background:#000}',
    '.csme-ls-play:focus-visible,.csme-ls-stop:focus-visible,.csme-ls select:focus-visible{outline:3px solid #004FB8;outline-offset:2px}',
    '.csme-ls-meta{flex:1;min-width:160px}',
    '.csme-ls-t{display:flex;align-items:center;gap:6px;font-family:Sora,"Helvetica Neue",Arial,sans-serif;font-weight:700;font-size:14.5px;color:#14181D}',
    '.csme-ls-s{display:block;font-size:12.5px;color:#5A6470;margin-top:2px}',
    '.csme-ls-bar{height:4px;border-radius:2px;background:#E4E7EC;margin-top:8px;overflow:hidden}',
    '.csme-ls-bar i{display:block;height:100%;width:0;background:#D71920;transition:width .3s}',
    '.csme-ls-stop{all:unset;box-sizing:border-box;width:34px;height:34px;border-radius:8px;border:1.5px solid #D0D5DD;background:#fff;color:#14181D;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.csme-ls-stop[hidden]{display:none}',
    '.csme-ls select{font:600 13px Sora,"Helvetica Neue",Arial,sans-serif;padding:7px 8px;border:1.5px solid #D0D5DD;border-radius:8px;background:#fff;color:#14181D;cursor:pointer}',
    '.csme-reading{background:#FFF4CC!important;box-shadow:0 0 0 6px #FFF4CC;border-radius:4px;transition:background .2s}',
    // imported article bodies: images keep their real shape and never overflow
    '[data-csme-body] img{max-width:100%!important;height:auto!important;border-radius:8px}',
    '[data-csme-body] figure{margin:0 0 24px;max-width:100%}',
    '[data-csme-body] ul,[data-csme-body] ol{padding-left:1.3em;margin:0 0 24px}',
    '[data-csme-body] li{margin-bottom:8px}',
    '.csme-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
    // Accessibility button + panel
    '.csme-a11y-fab{all:unset;box-sizing:border-box;position:fixed;left:20px;bottom:24px;z-index:70;width:52px;height:52px;border-radius:50%;background:#004FB8;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(16,24,40,.25)}',
    '.csme-a11y-fab:hover{background:#002364}',
    '.csme-a11y-fab:focus-visible{outline:3px solid #FFB800;outline-offset:3px}',
    '.csme-a11y-panel{position:fixed;left:20px;bottom:88px;z-index:71;width:min(340px,calc(100vw - 40px));max-height:calc(100vh - 120px);overflow:auto;background:#fff;color:#14181D;border:1px solid #E4E7EC;border-radius:14px;box-shadow:0 18px 48px rgba(16,24,40,.28);font-family:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif}',
    '.csme-a11y-panel[hidden]{display:none}',
    '.csme-a11y-h{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #E4E7EC;position:sticky;top:0;background:#fff}',
    '.csme-a11y-h h2{margin:0;font:700 16px Sora,"Helvetica Neue",Arial,sans-serif}',
    '.csme-a11y-x{all:unset;cursor:pointer;font-size:22px;line-height:1;padding:4px 8px;border-radius:6px}',
    '.csme-a11y-b{padding:14px 18px 18px;display:flex;flex-direction:column;gap:14px}',
    '.csme-a11y-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14.5px}',
    '.csme-a11y-seg{display:flex;border:1.5px solid #D0D5DD;border-radius:8px;overflow:hidden}',
    '.csme-a11y-seg button{all:unset;cursor:pointer;padding:6px 11px;font:600 13px Sora,"Helvetica Neue",Arial,sans-serif;color:#14181D}',
    '.csme-a11y-seg button+button{border-left:1.5px solid #D0D5DD}',
    '.csme-a11y-seg button[aria-pressed="true"]{background:#002364;color:#fff}',
    '.csme-a11y-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.csme-a11y-tg{all:unset;box-sizing:border-box;cursor:pointer;padding:12px 10px;border:1.5px solid #D0D5DD;border-radius:10px;font:600 13px Sora,"Helvetica Neue",Arial,sans-serif;text-align:center;line-height:1.3}',
    '.csme-a11y-tg[aria-pressed="true"]{border-color:#002364;background:#EAF0FB;color:#002364;box-shadow:inset 0 0 0 1px #002364}',
    '.csme-a11y-panel button:focus-visible{outline:3px solid #004FB8;outline-offset:2px}',
    '.csme-a11y-reset{all:unset;cursor:pointer;text-align:center;padding:10px;border-radius:8px;background:#F4F6F8;font:600 13px Sora,"Helvetica Neue",Arial,sans-serif}',
    '.csme-a11y-note{font-size:12px;color:#5A6470;line-height:1.5}',
    '.csme-guide{position:fixed;left:0;right:0;height:44px;pointer-events:none;z-index:69;background:rgba(255,229,120,.28);border-top:2px solid #D71920;border-bottom:2px solid #D71920;display:none}',
    'html.a11y-guide .csme-guide{display:block}',
    // Accessibility modes (override inline styles, so !important)
    'html.a11y-size-1 body{zoom:1.12}html.a11y-size-2 body{zoom:1.25}html.a11y-size-3 body{zoom:1.4}',
    'html.a11y-font body, html.a11y-font body *:not(svg):not(path){font-family:Verdana,"Atkinson Hyperlegible",Tahoma,sans-serif!important;letter-spacing:.02em!important;word-spacing:.08em!important}',
    'html.a11y-space body p, html.a11y-space body li, html.a11y-space body blockquote{line-height:2!important}html.a11y-space body p{margin-bottom:1.1em!important}',
    'html.a11y-links body a{text-decoration:underline!important;text-underline-offset:3px!important;text-decoration-thickness:2px!important}html.a11y-links body a:not(.csme-a11y-fab){outline:2px dashed #D71920;outline-offset:2px}',
    'html.a11y-contrast body, html.a11y-contrast body *:not(img):not(video):not(svg):not(path):not(circle):not(rect){background-color:#000!important;color:#fff!important;border-color:#fff!important;box-shadow:none!important;text-shadow:none!important}',
    'html.a11y-contrast body a, html.a11y-contrast body a *{color:#FFE14D!important}',
    'html.a11y-contrast body button, html.a11y-contrast body input, html.a11y-contrast body select{border:1.5px solid #fff!important}',
    'html.a11y-contrast .csme-reading{background:#3B2F00!important;box-shadow:0 0 0 6px #3B2F00}',
    'html.a11y-contrast .csme-a11y-panel [aria-pressed="true"]{background-color:#FFE14D!important;color:#000!important}',
    'html.a11y-motion *, html.a11y-motion *:before, html.a11y-motion *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}',
    'html.a11y-cursor, html.a11y-cursor *{cursor:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'><path d=\'M4 2l26 14-11 3-5 11z\' fill=\'black\' stroke=\'white\' stroke-width=\'2\'/></svg>") 4 2, auto!important}',
    '*:focus-visible{outline:3px solid #004FB8;outline-offset:2px}',
    '@media print{.csme-a11y-fab,.csme-a11y-panel,.csme-ls,.csme-guide{display:none!important}}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('csme-tools-css')) return;
    document.head.appendChild(el('style', { id: 'csme-tools-css', text: CSS }));
  }

  // ════════════════════════════════════════════════════════════════
  // 1. LISTEN (text-to-speech)
  // ════════════════════════════════════════════════════════════════
  var TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var speech = { queue: [], i: 0, playing: false, paused: false, rate: store.get('csme-tts-rate', 1), ui: null, hi: null };

  function pickVoice() {
    if (!TTS) return null;
    var vs = speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    if (!vs.length) return null;
    var score = function (v) {
      var s = 0;
      if (/en[-_]CA/i.test(v.lang)) s += 6;
      if (/natural|neural|online|google|premium|enhanced/i.test(v.name)) s += 5;
      if (/en[-_](US|GB)/i.test(v.lang)) s += 2;
      if (v.localService === false) s += 1;
      return s;
    };
    return vs.sort(function (a, b) { return score(b) - score(a); })[0];
  }

  // Split long paragraphs into sentence-sized chunks (Chrome cuts off
  // utterances longer than ~15s, and this keeps highlighting accurate).
  function chunks(text) {
    var parts = text.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) || [text];
    var out = [], cur = '';
    parts.forEach(function (p) {
      if ((cur + p).length > 220 && cur) { out.push(cur.trim()); cur = ''; }
      cur += p;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function buildQueue(article, column) {
    var q = [];
    var h1 = article.querySelector('h1');
    if (h1) q.push({ node: h1, text: h1.textContent.trim() });
    var lead = h1 && h1.nextElementSibling && h1.nextElementSibling.tagName === 'P' ? h1.nextElementSibling : null;
    if (lead) q.push({ node: lead, text: lead.textContent.trim() });
    var nodes = column.querySelectorAll('h2,h3,h4,p,li,blockquote');
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.closest('[data-csme-tools],[data-csme-noread]')) return;
      if (n.tagName === 'P' && n.closest('blockquote,li')) return;
      var t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t.length < 2) return;
      chunks(t).forEach(function (c) { q.push({ node: n, text: c }); });
    });
    return q;
  }

  function highlight(node) {
    if (speech.hi === node) return;
    if (speech.hi) speech.hi.classList.remove('csme-reading');
    speech.hi = node || null;
    if (node) {
      node.classList.add('csme-reading');
      var r = node.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight - 40) window.scrollTo({ top: window.scrollY + r.top - 140, behavior: 'smooth' });
    }
  }

  function updateUi() {
    var ui = speech.ui; if (!ui) return;
    var total = speech.queue.length || 1;
    var pct = speech.playing || speech.paused ? Math.round((speech.i / total) * 100) : 0;
    ui.bar.style.width = pct + '%';
    ui.play.innerHTML = speech.playing && !speech.paused ? ICON.pause : ICON.play;
    ui.play.setAttribute('aria-label', speech.playing && !speech.paused ? 'Pause reading' : (speech.paused ? 'Resume reading' : 'Listen to this article'));
    ui.stop.hidden = !(speech.playing || speech.paused);
    ui.status.textContent = speech.paused ? 'Paused · ' + pct + '% read' : speech.playing ? 'Reading aloud · ' + pct + '%' : ui.idleText;
  }

  function speakNext() {
    if (!speech.playing || speech.paused) return;
    if (speech.i >= speech.queue.length) { stopSpeech(); return; }
    var item = speech.queue[speech.i];
    highlight(item.node);
    var u = new SpeechSynthesisUtterance(item.text);
    var v = speech.noVoice ? null : pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-CA';
    u.rate = speech.rate;
    u.onend = function () { if (!speech.playing || speech.paused) return; speech.fails = 0; speech.i++; updateUi(); speakNext(); };
    u.onerror = function (e) {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      // A network voice can fail before it has loaded: retry this chunk with
      // the system default voice, and give up only after repeated failures.
      speech.fails = (speech.fails || 0) + 1;
      if (speech.fails === 1 && !speech.noVoice) { speech.noVoice = true; setTimeout(speakNext, 80); return; }
      if (speech.fails > 3) { stopSpeech(); speech.ui && (speech.ui.status.textContent = 'Audio is not available in this browser'); return; }
      speech.i++; setTimeout(speakNext, 80);
    };
    speechSynthesis.speak(u);
    updateUi();
  }

  function playPause(article, column) {
    if (speech.playing && !speech.paused) {          // pause
      speech.paused = true; speechSynthesis.cancel(); updateUi(); return;
    }
    if (speech.paused) {                              // resume from current chunk
      speech.paused = false; speakNext(); return;
    }
    speechSynthesis.cancel();                         // start
    speech.queue = buildQueue(article, column);
    speech.i = 0; speech.fails = 0; speech.playing = true; speech.paused = false;
    setTimeout(speakNext, 80);
  }

  function stopSpeech() {
    if (TTS) speechSynthesis.cancel();
    speech.playing = false; speech.paused = false; speech.i = 0;
    highlight(null); updateUi();
  }

  function listenBar(article, column, readTime) {
    var bar = el('i');
    var play = el('button', { type: 'button', class: 'csme-ls-play', 'aria-label': 'Listen to this article', html: ICON.play });
    var stop = el('button', { type: 'button', class: 'csme-ls-stop', 'aria-label': 'Stop reading', html: ICON.stop });
    stop.hidden = true;
    var speed = el('select', { 'aria-label': 'Reading speed' });
    [0.75, 1, 1.25, 1.5, 2].forEach(function (r) {
      var o = el('option', { value: String(r), text: r + '×' }); if (r === speech.rate) o.selected = true; speed.appendChild(o);
    });
    var idle = 'Hear the full article read aloud' + (readTime ? ' · about ' + readTime : '');
    var status = el('span', { class: 'csme-ls-s', 'aria-live': 'polite', text: idle });
    var wrap = el('div', { class: 'csme-ls', role: 'region', 'aria-label': 'Listen to this article' }, [
      play,
      el('div', { class: 'csme-ls-meta' }, [
        el('span', { class: 'csme-ls-t', html: ICON.head + ' Listen to this article' }),
        status,
        el('div', { class: 'csme-ls-bar', 'aria-hidden': 'true' }, [bar])
      ]),
      stop, speed
    ]);
    speech.ui = { play: play, stop: stop, bar: bar, status: status, idleText: idle };
    play.addEventListener('click', function () { playPause(article, column); });
    stop.addEventListener('click', stopSpeech);
    speed.addEventListener('change', function () {
      speech.rate = parseFloat(speed.value); store.set('csme-tts-rate', speech.rate);
      if (speech.playing && !speech.paused) { speechSynthesis.cancel(); setTimeout(speakNext, 60); }
    });
    return wrap;
  }

  // ════════════════════════════════════════════════════════════════
  // 2. QUICK READ (AI summary)
  // ════════════════════════════════════════════════════════════════
  function quickRead(key) {
    var data = (window.CSME_QUICK_READS || {})[key];
    if (!data) return null;
    var points = Array.isArray(data) ? data : data.points;
    var reviewed = !Array.isArray(data) && data.reviewed;
    if (!points || !points.length) return null;
    var id = 'csme-qr-' + Math.random().toString(36).slice(2, 8);
    var open = store.get('csme-qr-open', false);
    var title = el('span', { class: 'csme-qr-t', text: open ? 'Quick Read' : 'Show Quick Read' });
    var btn = el('button', { type: 'button', class: 'csme-qr-btn', 'aria-expanded': String(open), 'aria-controls': id }, [
      el('span', { class: 'csme-qr-ic', html: ICON.spark }),
      el('span', null, [title, el('span', { class: 'csme-qr-s', text: reviewed ? 'Summary is AI-generated, newsroom-reviewed' : 'Summary is AI-generated · check the full article for details' })]),
      el('span', { class: 'csme-qr-chev', html: ICON.chev })
    ]);
    var list = el('ul');
    points.forEach(function (p) { list.appendChild(el('li', { text: p })); });
    var body = el('div', { class: 'csme-qr-body', id: id }, [
      list,
      el('div', { class: 'csme-qr-foot' }, [
        el('span', { text: 'Key points only. The full article has the details.' }),
        el('button', { type: 'button', text: 'Read summary aloud', onclick: function () {
          if (!TTS) return; stopSpeech();
          var u = new SpeechSynthesisUtterance('Quick read. ' + points.join('. ') + '.');
          var v = pickVoice(); if (v) u.voice = v; u.rate = speech.rate; speechSynthesis.speak(u);
        } })
      ])
    ]);
    body.hidden = !open;
    var box = el('section', { class: 'csme-qr', 'data-open': String(open), 'aria-label': 'Quick Read summary' }, [el('div', { class: 'csme-qr-in' }, [btn, body])]);
    btn.addEventListener('click', function () {
      var now = body.hidden; body.hidden = !now;
      btn.setAttribute('aria-expanded', String(now)); box.setAttribute('data-open', String(now));
      title.textContent = now ? 'Quick Read' : 'Show Quick Read';
      store.set('csme-qr-open', now);
    });
    return box;
  }

  // ── mount into whichever article template is visible ─────────────
  function articleKey(host) {
    if (host.getAttribute('data-csme-tools') === 'post') {
      var h = location.hash.replace(/^#/, '');
      return h.indexOf('post-') === 0 ? decodeURIComponent(h.slice(5)) : '';
    }
    return host.getAttribute('data-csme-tools');
  }

  function mount() {
    var hosts = document.querySelectorAll('[data-csme-tools]');
    Array.prototype.forEach.call(hosts, function (host) {
      var article = host.closest('article');
      var visible = article && article.offsetParent !== null && getComputedStyle(article).display !== 'none';
      var key = visible ? articleKey(host) : '';
      if ((host.getAttribute('data-mounted') || '') === key) return;
      host.setAttribute('data-mounted', key);
      while (host.firstChild) host.removeChild(host.firstChild);
      if (!key) return;
      var column = host.parentElement;
      var head = article.querySelector('h1');
      var rt = head && (head.parentElement.textContent.match(/(\d+)\s*min read/) || [])[1];
      var qr = quickRead(key);
      if (qr) host.appendChild(qr);
      if (TTS) host.appendChild(listenBar(article, column, rt ? rt + ' min' : ''));
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 3. ACCESSIBILITY PANEL (site-wide)
  // ════════════════════════════════════════════════════════════════
  var A11Y_DEFAULT = { size: 0, contrast: false, font: false, space: false, links: false, guide: false, motion: false, cursor: false };
  var a11y = Object.assign({}, A11Y_DEFAULT, store.get('csme-a11y', {}));
  var TOGGLES = [
    ['contrast', 'High contrast'], ['font', 'Readable font'], ['space', 'Line spacing'], ['links', 'Highlight links'],
    ['guide', 'Reading guide'], ['motion', 'Pause animations'], ['cursor', 'Large cursor']
  ];

  function applyA11y() {
    var c = document.documentElement.classList;
    [1, 2, 3].forEach(function (n) { c.toggle('a11y-size-' + n, a11y.size === n); });
    TOGGLES.forEach(function (t) { c.toggle('a11y-' + t[0], !!a11y[t[0]]); });
    store.set('csme-a11y', a11y);
  }

  function buildA11y() {
    if (document.querySelector('.csme-a11y-fab')) return;
    var fab = el('button', { type: 'button', class: 'csme-a11y-fab', 'aria-label': 'Accessibility options', 'aria-expanded': 'false', 'aria-controls': 'csme-a11y-panel', html: ICON.a11y });
    var panel = el('div', { class: 'csme-a11y-panel', id: 'csme-a11y-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'csme-a11y-title' });
    panel.hidden = true;
    var close = el('button', { type: 'button', class: 'csme-a11y-x', 'aria-label': 'Close accessibility options', text: '×' });
    var seg = el('div', { class: 'csme-a11y-seg', role: 'group', 'aria-label': 'Text size' });
    ['A', 'A+', 'A++', 'A+++'].forEach(function (lbl, n) {
      var b = el('button', { type: 'button', text: lbl, 'aria-pressed': String(a11y.size === n), 'aria-label': ['Default text size', 'Larger text', 'Extra large text', 'Largest text'][n] });
      b.addEventListener('click', function () {
        a11y.size = n; applyA11y();
        Array.prototype.forEach.call(seg.children, function (x, k) { x.setAttribute('aria-pressed', String(k === n)); });
      });
      seg.appendChild(b);
    });
    var grid = el('div', { class: 'csme-a11y-grid' });
    TOGGLES.forEach(function (t) {
      var b = el('button', { type: 'button', class: 'csme-a11y-tg', text: t[1], 'aria-pressed': String(!!a11y[t[0]]) });
      b.addEventListener('click', function () { a11y[t[0]] = !a11y[t[0]]; b.setAttribute('aria-pressed', String(a11y[t[0]])); applyA11y(); });
      grid.appendChild(b);
    });
    var reset = el('button', { type: 'button', class: 'csme-a11y-reset', text: 'Reset all settings' });
    reset.addEventListener('click', function () {
      a11y = Object.assign({}, A11Y_DEFAULT); applyA11y();
      Array.prototype.forEach.call(seg.children, function (x, k) { x.setAttribute('aria-pressed', String(k === 0)); });
      Array.prototype.forEach.call(grid.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
    });
    panel.appendChild(el('div', { class: 'csme-a11y-h' }, [el('h2', { id: 'csme-a11y-title', text: 'Accessibility' }), close]));
    panel.appendChild(el('div', { class: 'csme-a11y-b' }, [
      el('div', { class: 'csme-a11y-row' }, [el('span', { text: 'Text size' }), seg]),
      grid,
      reset,
      el('p', { class: 'csme-a11y-note', text: 'Your choices are saved on this device. Articles also have a Listen button that reads the full story aloud.' })
    ]));
    function toggle(open) {
      panel.hidden = !open; fab.setAttribute('aria-expanded', String(open));
      if (open) (seg.querySelector('[aria-pressed="true"]') || close).focus(); else fab.focus();
    }
    fab.addEventListener('click', function () { toggle(panel.hidden); });
    close.addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); } });
    var guide = el('div', { class: 'csme-guide', 'aria-hidden': 'true' });
    document.addEventListener('mousemove', function (e) { if (a11y.guide) guide.style.top = (e.clientY - 22) + 'px'; }, { passive: true });
    document.body.appendChild(guide);
    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }

  // ── boot ─────────────────────────────────────────────────────────
  function boot() {
    if (!document.documentElement.lang) document.documentElement.lang = 'en-CA';
    injectCss();
    applyA11y();
    buildA11y();
    mount();
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(mount, 120); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    window.addEventListener('hashchange', function () { stopSpeech(); setTimeout(mount, 150); });
    window.addEventListener('pagehide', stopSpeech);
    if (TTS && speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = function () { /* voices loaded */ };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
