(function () {
  'use strict';

  // Vul hier de echte betaallink in (bijv. een Tikkie- of bunq-link).
  var BETAAL_URL = 'https://betaalverzoek.rabobank.nl/betaalverzoek/?id=S0JUZfhqTZWBTbw87NHKEw';
  var FEEST = new Date('2026-11-21T19:30:00+01:00').getTime();
  var COLORS = ['#8E1A1C', '#C9A46A', '#D9772B', '#B8321E', '#E8C9A0', '#6E1E2A'];

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v) { return Math.min(1, Math.max(0, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Betaalknop ---------- */
  if (BETAAL_URL) {
    var pay = $('payBtn');
    pay.href = BETAAL_URL;
    pay.target = '_blank';
    pay.rel = 'noopener';
  }

  /* ---------- Intro: poort, foto, feest ---------- */
  var intro = $('intro'), stage = $('stage'), photo = $('photo'), img = $('photoImg');
  var head = $('head'), gate = $('gate'), pL = $('pillarL'), pR = $('pillarR');
  var wL = $('wingL'), wR = $('wingR'), glitter = $('glitter'), party = $('party');
  var welcome = $('welcome'), hint = $('hint'), stageConfetti = $('stageConfetti');
  var fit = $('photoFit'), wallL = $('wallL'), wallR = $('wallR');
  var desktopMq = window.matchMedia ? window.matchMedia('(min-width: 900px)') : null;
  function isDesktop() { return !!(desktopMq && desktopMq.matches); }

  // gouden glinsters
  (function () {
    var gc = ['#C9A46A', '#E8C9A0', '#8E1A1C', '#FFF4DC', '#D9772B'];
    var html = '';
    for (var i = 0; i < 22; i++) {
      var s = 10 + Math.round(Math.random() * 14);
      html += '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" style="left:' + (18 + Math.random() * 64).toFixed(1) +
        '%;top:' + (44 + Math.random() * 48).toFixed(1) + '%;animation-delay:' + (Math.random() * 1.6).toFixed(2) + 's">' +
        '<path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="' + gc[i % gc.length] + '"/></svg>';
    }
    glitter.innerHTML = html;
  })();

  function confetti(container, count) {
    if (reduceMotion) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var round = i % 4 === 0;
      var el = document.createElement('span');
      var w = round ? 8 : 5 + Math.round(Math.random() * 5);
      el.style.left = (Math.random() * 100).toFixed(1) + '%';
      el.style.width = w + 'px';
      el.style.height = (round ? 8 : 10 + Math.round(Math.random() * 9)) + 'px';
      el.style.borderRadius = round ? '999px' : '2px';
      el.style.background = COLORS[i % COLORS.length];
      el.style.setProperty('--delay', (Math.random() * 1.2).toFixed(2) + 's');
      el.style.setProperty('--dur', (2.6 + Math.random() * 1.4).toFixed(2) + 's');
      frag.appendChild(el);
    }
    container.appendChild(frag);
    setTimeout(function () { container.innerHTML = ''; }, 5200);
  }

  var celebrated = false, ticking = false, lastP = -1;

  function render(p) {
    var H = stage.clientHeight, W = stage.clientWidth, pw = W * 0.113;
    var g = ease(clamp(p / 0.35));
    var r = ease(clamp((p - 0.25) / 0.35));
    var z = ease(clamp((p - 0.55) / 0.45));

    var push;
    if (isDesktop()) {
      // Desktop: de foto past eerst precies in de poortopening en groeit dan naar het hele scherm.
      var oL = pL.offsetLeft + pL.offsetWidth, oR = pR.offsetLeft, oT = wL.offsetTop - 4;
      var oW = oR - oL, oH = H - oT;
      var s0 = Math.max(oW / W, oH / H);
      var s = s0 + (1 - s0) * r;
      var tx = (oL + (oW - W * s0) / 2) * (1 - r), ty = (oT + oH - H * s0) * (1 - r);
      photo.style.clipPath = 'inset(' + (oT * (1 - r)).toFixed(1) + 'px ' + ((W - oR) * (1 - r)).toFixed(1) + 'px 0px ' + (oL * (1 - r)).toFixed(1) + 'px)';
      fit.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
      img.style.transform = 'scale(' + (1 + 0.75 * z).toFixed(3) + ')';
      push = W * 0.22 * r;
    } else {
      var top = (0.42 * H - 4) * (1 - r), side = pw * (1 - r);
      photo.style.clipPath = 'inset(' + top.toFixed(1) + 'px ' + side.toFixed(1) + 'px 0px ' + side.toFixed(1) + 'px)';
      fit.style.transform = '';
      var k = 0.72 + 0.28 * r + 0.85 * z;
      img.style.transform = 'translateY(' + (0.094 * H * (1 - r)).toFixed(1) + 'px) scale(' + k.toFixed(3) + ')';
      push = 70 * r;
    }
    photo.style.webkitClipPath = photo.style.clipPath;

    head.style.opacity = (1 - clamp(r * 1.8)).toFixed(3);
    head.style.transform = 'translateY(' + (-60 * r).toFixed(1) + 'px)';
    wL.style.transform = 'rotateY(' + (-g * 100).toFixed(1) + 'deg)';
    wR.style.transform = 'rotateY(' + (g * 100).toFixed(1) + 'deg)';
    pL.style.transform = 'translateX(' + (-push).toFixed(1) + 'px)';
    pR.style.transform = 'translateX(' + push.toFixed(1) + 'px)';
    wallL.style.transform = 'translateX(' + (-push).toFixed(1) + 'px)';
    wallR.style.transform = 'translateX(' + push.toFixed(1) + 'px)';
    gate.style.opacity = (1 - clamp((p - 0.3) / 0.25)).toFixed(3);

    glitter.classList.toggle('on', g > 0.05 && p < 0.7);
    party.classList.toggle('on', p > 0.8);
    welcome.classList.toggle('on', p > 0.8);
    welcome.style.opacity = clamp((p - 0.8) / 0.16).toFixed(3);
    hint.classList.toggle('off', p > 0.04);
    stage.classList.toggle('idle', p < 0.01);

    if (p >= 0.85 && !celebrated) { celebrated = true; confetti(stageConfetti, 70); }
    if (p < 0.5 && celebrated) { celebrated = false; }
  }

  function progress() {
    var total = intro.offsetHeight - stage.offsetHeight;
    if (total <= 0) return 0;
    return clamp(-intro.getBoundingClientRect().top / total);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var p = progress();
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;
      render(p);
    });
  }

  // Altijd beginnen bij de gesloten poort: de browser mag de oude scrollpositie
  // niet terugzetten (Safari en Chrome doen dat bij opnieuw openen of herladen).
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function toTop() {
    if (location.hash || window.scrollY === 0) return;
    var el = document.documentElement, prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto'; // direct naar boven, niet zichtbaar terugscrollen
    window.scrollTo(0, 0);
    el.style.scrollBehavior = prev;
  }
  toTop();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { lastP = -1; onScroll(); });
  window.addEventListener('load', function () { toTop(); lastP = -1; onScroll(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { toTop(); lastP = -1; onScroll(); } });
  render(progress());

  $('openGate').addEventListener('click', function () {
    var y = window.scrollY + intro.getBoundingClientRect().top + intro.offsetHeight - stage.offsetHeight;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Bezoek registreren (eén keer per browsersessie) ---------- */
  try {
    if (!sessionStorage.getItem('jm_seen')) {
      sessionStorage.setItem('jm_seen', '1');
      fetch('/api/seen', { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(function () {});
    }
  } catch (e) {
    fetch('/api/seen', { method: 'POST', credentials: 'same-origin' }).catch(function () {});
  }

  /* ---------- Persoonlijke begroeting ---------- */
  fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.naam) return;
    var duo = !!j.naam2;
    var namen = duo ? j.naam + ' en ' + j.naam2 : j.naam;
    $('greeting').textContent = 'Lieve ' + namen + ',';
    $('welkomTekst').textContent = duo
      ? 'Ontzettend leuk dat jullie erbij zijn om samen met ons onze 40e en 50e verjaardag te vieren! We kijken er enorm naar uit om er met familie en vrienden een bijzondere en feestelijke avond van te maken.'
      : 'Ontzettend leuk dat je erbij bent om samen met ons onze 40e en 50e verjaardag te vieren! We kijken er enorm naar uit om er met familie en vrienden een bijzondere en feestelijke avond van te maken.';
    var n = $('gb-naam');
    if (n && !n.value) n.value = namen;
  }).catch(function () {});

  /* ---------- Aftellen ---------- */
  var cd = { d: $('cdD'), h: $('cdH'), m: $('cdM'), s: $('cdS') };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = Math.max(0, FEEST - Date.now());
    cd.d.textContent = Math.floor(diff / 86400000);
    cd.h.textContent = pad(Math.floor(diff / 3600000) % 24);
    cd.m.textContent = pad(Math.floor(diff / 60000) % 60);
    cd.s.textContent = pad(Math.floor(diff / 1000) % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Bericht ---------- */
  var form = $('msgForm'), fotoInput = $('gb-foto'), fotoLabel = $('fotoLabel'), preview = $('fotoPreview');
  var errorEl = $('formError'), sendBtn = $('sendBtn'), thanks = $('thanks');
  var fotoData = null;

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }

  // Verklein de foto in de browser, zodat ook grote telefoonfoto's snel verstuurd worden.
  function resize(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var max = 1600, w = im.naturalWidth, h = im.naturalHeight;
        var s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('foto')); };
      im.src = url;
    });
  }

  fotoInput.addEventListener('change', function () {
    var f = fotoInput.files && fotoInput.files[0];
    fotoData = null; preview.hidden = true; showError('');
    if (!f) { fotoLabel.textContent = 'Kies een foto'; return; }
    fotoLabel.textContent = 'Foto verwerken...';
    resize(f).then(function (data) {
      fotoData = data;
      fotoLabel.textContent = f.name;
      preview.src = data; preview.hidden = false;
    }).catch(function () {
      fotoLabel.textContent = 'Kies een foto';
      fotoInput.value = '';
      showError('Deze foto kunnen we helaas niet lezen. Probeer een andere foto.');
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showError('');
    var naam = form.naam.value.trim(), bericht = form.bericht.value.trim();
    if (!naam || !bericht) { showError('Vul je naam en een berichtje in.'); return; }
    sendBtn.disabled = true;
    sendBtn.textContent = 'Versturen...';
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naam: naam, bericht: bericht, foto: fotoData, website: form.website.value })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Er ging iets mis.');
      });
    }).then(function () {
      var keepName = form.naam.value;
      form.reset(); form.naam.value = keepName; fotoData = null; preview.hidden = true; fotoLabel.textContent = 'Kies een foto';
      form.hidden = true; thanks.hidden = false;
      confetti($('confettiLayer'), 60);
    }).catch(function (err) {
      showError(err.message === 'Failed to fetch' ? 'Geen verbinding. Probeer het zo nog eens.' : err.message);
    }).then(function () {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Verstuur naar Joyce & Marco';
    });
  });

  $('againBtn').addEventListener('click', function () {
    thanks.hidden = true; form.hidden = false; form.naam.focus();
  });
})();
