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
    return api('/api/admin/messages').then(function (j) {
      data = j; showDash(); render();
    }).catch(function (e) { if (e.message !== 'login') alert(e.message); });
  }

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
  Array.prototype.forEach.call(document.querySelectorAll('.filters button'), function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      Array.prototype.forEach.call(document.querySelectorAll('.filters button'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
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
