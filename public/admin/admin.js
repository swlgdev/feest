(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var data = { messages: [], state: { favs: {}, lastSeen: null } };
  var filter = 'alles', query = '';

  var HEART = '<svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.4 4c2 0 3.6 1.2 4.6 2.8C13 5.2 14.6 4 16.6 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"/></svg>';
  var TRASH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  var NOTE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E1A1C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(iso) {
    try {
      return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
    } catch (e) { return ''; }
  }
  function isNew(m) { return !data.state.lastSeen || m.createdAt > data.state.lastSeen; }
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    if (opts.body && typeof opts.body !== 'string') {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) { showLogin(); throw new Error('login'); }
        if (!r.ok) throw new Error(j.error || 'Er ging iets mis.');
        return j;
      });
    });
  }

  /* ---------- Inloggen ---------- */
  function showLogin() { $('dashView').hidden = true; $('loginView').hidden = false; $('pw').focus(); }
  function showDash() { $('loginView').hidden = true; $('dashView').hidden = false; }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('loginError'); err.hidden = true;
    $('loginBtn').disabled = true;
    api('/api/admin/login', { method: 'POST', body: { password: $('pw').value } })
      .then(function () { $('pw').value = ''; load(); })
      .catch(function (x) { if (x.message !== 'login') { err.textContent = x.message; err.hidden = false; } else { err.textContent = 'Dat wachtwoord klopt niet.'; err.hidden = false; } })
      .then(function () { $('loginBtn').disabled = false; });
  });
  $('logoutBtn').addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).catch(function () {}).then(showLogin);
  });

  /* ---------- Laden + tekenen ---------- */
  function load() {
    return Promise.all([api('/api/admin/messages'), api('/api/admin/guests')]).then(function (r) {
      data = r[0]; G = r[1]; showDash(); render(); renderGuests(); fillTemplate();
    }).catch(function (e) { if (e.message !== 'login') alert(e.message); });
  }

  /* ---------- Tabs ---------- */
  function showTab(name) {
    var g = name === 'gasten';
    $('tabGasten').hidden = !g; $('tabBerichten').hidden = g;
    $('tabBtnGasten').setAttribute('aria-selected', String(g));
    $('tabBtnBerichten').setAttribute('aria-selected', String(!g));
    $('printBtn').hidden = g;
    try { localStorage.setItem('jm_tab', name); } catch (e) {}
  }
  $('tabBtnGasten').addEventListener('click', function () { showTab('gasten'); });
  $('tabBtnBerichten').addEventListener('click', function () { showTab('berichten'); });
  try { showTab(localStorage.getItem('jm_tab') === 'berichten' ? 'berichten' : 'gasten'); } catch (e) { showTab('gasten'); }

  /* ---------- Uitnodigingen ---------- */
  var G = { guests: [], settings: { template: '', subject: '' }, baseUrl: location.origin };
  var gFilter = 'alles', gQuery = '';
  var WA_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .9c-1-.4-1.9-1.3-2.3-2.3l.9-1-1-2z"/></svg>';
  var MAIL_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  var LINK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';

  function guestLink(g) { return G.baseUrl + '/i/' + g.token; }
  function guestText(g) {
    return (G.settings.template || '').replace(/\{naam\}/g, g.naam).replace(/\{link\}/g, guestLink(g));
  }
  // 06 12345678 / +31 6... / 0031 6... -> 316...
  function waNumber(tel) {
    var t = String(tel || '').replace(/[^\d+]/g, '');
    if (t.indexOf('+') === 0) t = t.slice(1);
    else if (t.indexOf('00') === 0) t = t.slice(2);
    else if (t.indexOf('0') === 0) t = '31' + t.slice(1);
    return t.replace(/\D/g, '');
  }
  function waHref(g) { return 'https://wa.me/' + waNumber(g.telefoon) + '?text=' + encodeURIComponent(guestText(g)); }
  function mailHref(g) {
    return 'mailto:' + encodeURIComponent(g.email).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(G.settings.subject || '') + '&body=' + encodeURIComponent(guestText(g));
  }

  function visibleGuests() {
    var q = gQuery.trim().toLowerCase();
    return G.guests.filter(function (g) {
      if (gFilter === 'nietverstuurd' && g.sentAt) return false;
      if (gFilter === 'nietgeopend' && g.openedAt) return false;
      if (gFilter === 'geopend' && !g.openedAt) return false;
      if (q && (g.naam + ' ' + g.email + ' ' + g.telefoon).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderGuests() {
    var gs = G.guests;
    $('gTotal').textContent = gs.length;
    $('gSent').textContent = gs.filter(function (g) { return g.sentAt; }).length;
    $('gOpened').textContent = gs.filter(function (g) { return g.openedAt; }).length;
    $('gNotOpened').textContent = gs.filter(function (g) { return !g.openedAt; }).length;

    var list = visibleGuests();
    $('guestList').innerHTML = list.length ? list.map(function (g) {
      var chips = '';
      if (g.openedAt) chips += '<span class="chip open">Geopend ' + esc(fmt(g.openedAt)) + (g.opens > 1 ? ' · ' + g.opens + '×' : '') + '</span>';
      if (g.sentAt) chips += '<span class="chip sent">Verstuurd ' + esc(fmt(g.sentAt)) + (g.sentVia && g.sentVia.length ? ' via ' + esc(g.sentVia.join(' en ')) : '') + '</span>';
      if (!g.sentAt && !g.openedAt) chips += '<span class="chip">Nog niet verstuurd</span>';
      var contact = [g.email, g.telefoon].filter(Boolean).map(esc).join(' · ');
      return '<article class="guest">' +
        '<div class="guest-main"><h3 class="guest-name">' + esc(g.naam) + '</h3><p class="guest-contact">' + contact + '</p><div class="chips">' + chips + '</div></div>' +
        '<div class="guest-actions">' +
        (g.telefoon ? '<a class="act wa" target="_blank" rel="noopener" href="' + esc(waHref(g)) + '" data-sent="' + g.token + '" data-via="WhatsApp">' + WA_ICON + 'WhatsApp</a>' : '') +
        (g.email ? '<a class="act mail" href="' + esc(mailHref(g)) + '" data-sent="' + g.token + '" data-via="e-mail">' + MAIL_ICON + 'Mail</a>' : '') +
        '<button type="button" class="act icon" data-copy="' + g.token + '" aria-label="Kopieer link van ' + esc(g.naam) + '" title="Kopieer link">' + LINK_ICON + '</button>' +
        '<button type="button" class="act icon" data-delguest="' + g.token + '" aria-label="Verwijder ' + esc(g.naam) + '" title="Verwijder">' + TRASH + '</button>' +
        '</div></article>';
    }).join('') : '<p class="empty">' + (gs.length ? 'Geen gasten gevonden.' : 'Nog geen gasten. Voeg ze toe bij "Gast toevoegen", los of als lijst.') + '</p>';
  }

  $('guestList').addEventListener('click', function (e) {
    var sent = e.target.closest('[data-sent]');
    var copy = e.target.closest('[data-copy]');
    var del = e.target.closest('[data-delguest]');
    if (sent) {
      var tok = sent.getAttribute('data-sent'), via = sent.getAttribute('data-via');
      var g = G.guests.find(function (x) { return x.token === tok; });
      if (g && !g.sentAt) { g.sentAt = new Date().toISOString(); }
      if (g) { g.sentVia = (g.sentVia || []).concat(g.sentVia && g.sentVia.indexOf(via) > -1 ? [] : [via]); }
      setTimeout(renderGuests, 300);
      api('/api/admin/guests', { method: 'POST', body: { action: 'sent', token: tok, via: via } }).catch(function () {});
    }
    if (copy) {
      var cg = G.guests.find(function (x) { return x.token === copy.getAttribute('data-copy'); });
      navigator.clipboard.writeText(guestLink(cg)).then(function () {
        copy.title = 'Gekopieerd!'; copy.style.color = '#8E1A1C';
        setTimeout(function () { copy.title = 'Kopieer link'; copy.style.color = ''; }, 1500);
      });
    }
    if (del) {
      var dt = del.getAttribute('data-delguest');
      var dg = G.guests.find(function (x) { return x.token === dt; });
      if (!confirm((dg ? dg.naam : 'Deze gast') + ' verwijderen? De persoonlijke link werkt dan niet meer.')) return;
      api('/api/admin/guests?token=' + encodeURIComponent(dt), { method: 'DELETE' }).then(function () {
        G.guests = G.guests.filter(function (x) { return x.token !== dt; });
        renderGuests();
      }).catch(function (x) { if (x.message !== 'login') alert(x.message); });
    }
  });

  $('gq').addEventListener('input', function (e) { gQuery = e.target.value; renderGuests(); });
  Array.prototype.forEach.call(document.querySelectorAll('#guestFilters button'), function (b) {
    b.addEventListener('click', function () {
      gFilter = b.getAttribute('data-g');
      Array.prototype.forEach.call(document.querySelectorAll('#guestFilters button'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      renderGuests();
    });
  });

  function showResult(id, text, isErr) {
    var el = $(id); el.textContent = text; el.classList.toggle('err', !!isErr); el.hidden = !text;
  }
  function addGuests(list, done) {
    api('/api/admin/guests', { method: 'POST', body: { action: 'add', guests: list } }).then(function (j) {
      G.guests = G.guests.concat(j.added).sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
      renderGuests();
      var msg = j.added.length + (j.added.length === 1 ? ' gast toegevoegd.' : ' gasten toegevoegd.');
      if (j.skipped.length) msg += '\nNiet toegevoegd:\n' + j.skipped.map(function (s) { return '- ' + (s.naam || '(zonder naam)') + ': ' + s.reden; }).join('\n');
      showResult('addResult', msg, j.added.length === 0);
      if (done) done(j);
    }).catch(function (x) { if (x.message !== 'login') showResult('addResult', x.message, true); });
  }

  $('addOne').addEventListener('submit', function (e) {
    e.preventDefault();
    var naam = $('aNaam').value.trim(), email = $('aMail').value.trim(), tel = $('aTel').value.trim();
    if (!naam || (!email && !tel)) { showResult('addResult', 'Vul een naam in en een e-mailadres of telefoonnummer.', true); return; }
    addGuests([{ naam: naam, email: email, telefoon: tel }], function (j) {
      if (j.added.length) { $('aNaam').value = ''; $('aMail').value = ''; $('aTel').value = ''; $('aNaam').focus(); }
    });
  });

  // Elke regel: naam + e-mail en/of telefoon, in willekeurige volgorde.
  function parseLine(line) {
    var parts = line.split(/\t|;|,/).map(function (p) { return p.trim(); }).filter(Boolean);
    var g = { naam: '', email: '', telefoon: '' }, rest = [];
    parts.forEach(function (p) {
      if (!g.email && /@/.test(p)) g.email = p;
      else if (!g.telefoon && /^[+()\d][\d\s()+-]{7,}$/.test(p)) g.telefoon = p;
      else rest.push(p);
    });
    g.naam = rest.join(' ');
    return g;
  }
  $('bulkBtn').addEventListener('click', function () {
    var lines = $('bulkText').value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) { showResult('addResult', 'Plak eerst een lijst met gasten.', true); return; }
    addGuests(lines.map(parseLine), function (j) { if (j.added.length) $('bulkText').value = ''; });
  });

  function fillTemplate() {
    $('tplSubject').value = G.settings.subject || '';
    $('tplText').value = G.settings.template || '';
  }
  $('tplForm').addEventListener('submit', function (e) {
    e.preventDefault();
    api('/api/admin/guests', { method: 'POST', body: { action: 'settings', subject: $('tplSubject').value, template: $('tplText').value } })
      .then(function (j) { G.settings = j.settings; fillTemplate(); renderGuests(); showResult('tplResult', 'Opgeslagen.'); })
      .catch(function (x) { if (x.message !== 'login') showResult('tplResult', x.message, true); });
  });

  function visible() {
    var q = query.trim().toLowerCase();
    return data.messages.filter(function (m) {
      if (filter === 'nieuw' && !isNew(m)) return false;
      if (filter === 'favoriet' && !data.state.favs[m.id]) return false;
      if (filter === 'foto' && !m.hasFoto) return false;
      if (q && (m.naam + ' ' + m.bericht + ' ' + m.liedje).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function render() {
    var ms = data.messages;
    $('sTotal').textContent = ms.length;
    $('sNew').textContent = ms.filter(isNew).length;
    $('sFoto').textContent = ms.filter(function (m) { return m.hasFoto; }).length;
    var songs = ms.filter(function (m) { return m.liedje; });
    $('sSongs').textContent = songs.length;

    var list = visible();
    $('grid').innerHTML = list.length ? list.map(function (m) {
      var fav = !!data.state.favs[m.id];
      return '<article class="msg">' +
        '<div class="msg-head"><div class="msg-who"><div class="msg-name"><h2>' + esc(m.naam) + '</h2>' +
        (isNew(m) ? '<span class="new">Nieuw</span>' : '') + '</div><p class="date">' + esc(fmt(m.createdAt)) + '</p></div>' +
        '<button type="button" class="icon-btn" data-fav="' + m.id + '" aria-pressed="' + fav + '" aria-label="Favoriet: ' + esc(m.naam) + '" style="fill:' + (fav ? '#8E1A1C' : 'none') + '">' + HEART + '</button>' +
        '<button type="button" class="icon-btn del" data-del="' + m.id + '" aria-label="Verwijder bericht van ' + esc(m.naam) + '">' + TRASH + '</button></div>' +
        (m.hasFoto ? '<img class="msg-photo" loading="lazy" src="/api/admin/photo?id=' + m.id + '" alt="Foto van ' + esc(m.naam) + '">' : '') +
        '<p class="msg-text">' + esc(m.bericht) + '</p>' +
        (m.liedje ? '<p class="msg-song">' + NOTE + esc(m.liedje) + '</p>' : '') +
        '</article>';
    }).join('') : '<p class="empty">' + (ms.length ? 'Geen berichten gevonden.' : 'Nog geen berichten. Zodra gasten iets achterlaten, verschijnt het hier.') + '</p>';

    $('songs').innerHTML = songs.map(function (m) {
      return '<li>' + esc(m.liedje) + '<small>van ' + esc(m.naam) + '</small></li>';
    }).join('');
    $('songsEmpty').hidden = songs.length > 0;
    $('copySongs').hidden = songs.length === 0;
  }

  $('grid').addEventListener('click', function (e) {
    var favBtn = e.target.closest('[data-fav]');
    var delBtn = e.target.closest('[data-del]');
    if (favBtn) {
      var id = favBtn.getAttribute('data-fav');
      var on = !data.state.favs[id];
      if (on) data.state.favs[id] = true; else delete data.state.favs[id];
      render();
      api('/api/admin/state', { method: 'POST', body: { fav: { id: id, on: on } } }).catch(function () {});
    }
    if (delBtn) {
      var did = delBtn.getAttribute('data-del');
      if (!confirm('Dit bericht definitief verwijderen?')) return;
      api('/api/admin/messages?id=' + encodeURIComponent(did), { method: 'DELETE' }).then(function () {
        data.messages = data.messages.filter(function (m) { return m.id !== did; });
        render();
      }).catch(function (x) { if (x.message !== 'login') alert(x.message); });
    }
  });

  $('q').addEventListener('input', function (e) { query = e.target.value; render(); });
  Array.prototype.forEach.call(document.querySelectorAll('#msgFilters button'), function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      Array.prototype.forEach.call(document.querySelectorAll('#msgFilters button'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      render();
    });
  });
  $('markReadBtn').addEventListener('click', function () {
    api('/api/admin/state', { method: 'POST', body: { markRead: true } }).then(function (j) { data.state = j.state; render(); }).catch(function () {});
  });
  $('copySongs').addEventListener('click', function () {
    var txt = data.messages.filter(function (m) { return m.liedje; }).map(function (m) { return m.liedje; }).join('\n');
    navigator.clipboard.writeText(txt).then(function () {
      $('copySongs').textContent = 'Gekopieerd!';
      setTimeout(function () { $('copySongs').textContent = 'Kopieer lijst voor de DJ'; }, 1800);
    });
  });

  /* ---------- Boekje (PDF via printen) ---------- */
  $('printBtn').addEventListener('click', function () {
    var ms = data.messages.slice().reverse();
    $('book').innerHTML = '<div class="book-cover"><p style="letter-spacing:.3em;text-transform:uppercase">Birthday Party</p><h1>Joyce &amp; Marco</h1><p>21 november 2026 - Central Park Voorburg</p></div>' +
      ms.map(function (m) {
        return '<div class="book-entry"><h2>' + esc(m.naam) + '</h2><p>' + esc(m.bericht) + '</p>' +
          (m.hasFoto ? '<img src="/api/admin/photo?id=' + m.id + '" alt="">' : '') +
          (m.liedje ? '<p class="song">Verzoeknummer: ' + esc(m.liedje) + '</p>' : '') + '</div>';
      }).join('');
    var imgs = $('book').querySelectorAll('img');
    var left = imgs.length;
    if (!left) return window.print();
    Array.prototype.forEach.call(imgs, function (im) {
      var done = function () { if (--left === 0) window.print(); };
      if (im.complete) done(); else { im.onload = done; im.onerror = done; }
    });
  });

  /* ---------- Diavoorstelling ---------- */
  var slideTimer = null, slideIdx = 0, slideList = [];
  function showSlide() {
    var m = slideList[slideIdx % slideList.length];
    $('slide').innerHTML = (m.hasFoto ? '<img src="/api/admin/photo?id=' + m.id + '" alt="">' : '') +
      '<div class="slide-text"><p>' + esc(m.bericht) + '</p><h3>' + esc(m.naam) + '</h3></div>';
    // herstart animatie
    $('slide').style.animation = 'none'; void $('slide').offsetWidth; $('slide').style.animation = '';
    slideIdx++;
  }
  $('slideBtn').addEventListener('click', function () {
    var favs = data.messages.filter(function (m) { return data.state.favs[m.id]; });
    slideList = favs.length ? favs : data.messages.slice();
    if (!slideList.length) { alert('Er zijn nog geen berichten.'); return; }
    slideIdx = 0; $('slides').hidden = false; showSlide();
    slideTimer = setInterval(showSlide, 9000);
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  });
  function closeSlides() {
    clearInterval(slideTimer); $('slides').hidden = true;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }
  $('slidesClose').addEventListener('click', closeSlides);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('slides').hidden) closeSlides(); });

  load();
})();
