/*
 * Gastenlijst inlezen uit Excel (.xlsx) of CSV, volledig in de browser.
 * Geen externe bibliotheek: een .xlsx is een zip met XML-bestanden, die we
 * met DecompressionStream en DOMParser zelf uitlezen.
 */
(function () {
  'use strict';

  /* ---------- Zip ---------- */
  async function unzip(buf, wanted) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf);
    var eocd = -1;
    for (var i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Dit lijkt geen geldig Excel-bestand (.xlsx).');
    var count = dv.getUint16(eocd + 10, true), off = dv.getUint32(eocd + 16, true);
    var dec = new TextDecoder('utf-8'), out = {};
    for (var n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      var method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
      var nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      var local = dv.getUint32(off + 42, true);
      var name = dec.decode(u8.subarray(off + 46, off + 46 + nlen));
      off += 46 + nlen + elen + clen;
      if (!wanted(name)) continue;
      var start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      var data = u8.subarray(start, start + csize);
      if (method === 0) out[name] = dec.decode(data);
      else if (method === 8) {
        var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        out[name] = dec.decode(await new Response(stream).arrayBuffer());
      }
    }
    return out;
  }

  function xml(text) { return new DOMParser().parseFromString(text, 'application/xml'); }
  function textOf(el) {
    var ts = el.getElementsByTagName('t'), s = '';
    for (var i = 0; i < ts.length; i++) s += ts[i].textContent;
    return s;
  }
  function colIndex(ref) {
    var m = /^([A-Z]+)/.exec(ref || ''), n = 0;
    if (!m) return -1;
    for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64);
    return n - 1;
  }

  /* ---------- Excel ---------- */
  async function readXlsx(buf) {
    var files = await unzip(buf, function (n) {
      return n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/[^/]+\.xml$/.test(n);
    });
    // Eerste werkblad volgens de werkmap.
    var sheetPath = null;
    if (files['xl/workbook.xml'] && files['xl/_rels/workbook.xml.rels']) {
      var first = xml(files['xl/workbook.xml']).getElementsByTagName('sheet')[0];
      var rid = first && (first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
      var rels = xml(files['xl/_rels/workbook.xml.rels']).getElementsByTagName('Relationship');
      for (var i = 0; i < rels.length; i++) {
        if (rels[i].getAttribute('Id') === rid) {
          var t = rels[i].getAttribute('Target').replace(/^\/?xl\//, '').replace(/^\//, '');
          sheetPath = 'xl/' + t;
        }
      }
    }
    if (!sheetPath || !files[sheetPath]) sheetPath = Object.keys(files).filter(function (k) { return /^xl\/worksheets\//.test(k); }).sort()[0];
    if (!sheetPath) throw new Error('Er staat geen werkblad in dit bestand.');

    var shared = [];
    if (files['xl/sharedStrings.xml']) {
      var si = xml(files['xl/sharedStrings.xml']).getElementsByTagName('si');
      for (var s = 0; s < si.length; s++) shared.push(textOf(si[s]));
    }
    var rows = [], rowEls = xml(files[sheetPath]).getElementsByTagName('row');
    for (var r = 0; r < rowEls.length; r++) {
      var row = [], cells = rowEls[r].getElementsByTagName('c');
      for (var c = 0; c < cells.length; c++) {
        var cell = cells[c], type = cell.getAttribute('t'), idx = colIndex(cell.getAttribute('r'));
        if (idx < 0) idx = row.length;
        var v = cell.getElementsByTagName('v')[0], val = '';
        if (type === 's') val = v ? (shared[parseInt(v.textContent, 10)] || '') : '';
        else if (type === 'inlineStr') val = textOf(cell);
        else if (v) {
          val = v.textContent;
          // Getallen (bijv. telefoonnummers) zonder wetenschappelijke notatie.
          if ((!type || type === 'n') && /e/i.test(val) && !isNaN(Number(val))) val = Number(val).toFixed(0);
        }
        row[idx] = String(val).trim();
      }
      for (var k = 0; k < row.length; k++) if (row[k] === undefined) row[k] = '';
      rows.push(row);
    }
    return rows;
  }

  /* ---------- CSV / geplakte tekst ---------- */
  function readDelimited(text) {
    text = text.replace(/^﻿/, '');
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    return lines.map(function (line) {
      // Scheidingsteken per regel: tab (uit Excel), anders puntkomma, anders komma.
      var delim = line.indexOf('\t') > -1 ? '\t' : (line.indexOf(';') > -1 ? ';' : ',');
      var out = [], cur = '', q = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (q) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') q = false;
          else cur += ch;
        } else if (ch === '"') q = true;
        else if (ch === delim) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      out.push(cur.trim());
      return out;
    });
  }

  /* ---------- Rijen naar gasten ---------- */
  var HEAD = {
    naam: /^(naam|name|gast|gasten|naam gast|voornaam|first ?name|roepnaam)$/,
    achternaam: /^(achternaam|last ?name|surname|familienaam)$/,
    naam2: /(tweede naam|partner|naam ?2|introduc[eé]|aanhang|\+ ?1)/,
    email: /(e-?mail|mail ?adres|^mail$)/,
    telefoon: /(telefoon|^tel\.?$|mobiel|gsm|nummer|phone|whatsapp)/
  };
  var isEmail = function (s) { return /@/.test(s); };
  var isPhone = function (s) { return /^[+()\d][\d\s()+-]{7,}$/.test(s); };

  function fixPhone(s) {
    s = String(s || '').trim();
    var digits = s.replace(/\D/g, '');
    // Excel maakt van 0612345678 vaak het getal 612345678.
    if (/^6\d{8}$/.test(digits) && !/^[+0]/.test(s)) return '0' + digits;
    if (/^316\d{8}$/.test(digits) && !/^[+0]/.test(s)) return '+' + digits;
    return s;
  }
  function splitCouple(g) {
    if (!g.naam2) {
      var m = g.naam.split(/\s+(?:en|&|\+)\s+/i);
      if (m.length > 1) { g.naam = m[0]; g.naam2 = m.slice(1).join(' en '); }
    }
    return g;
  }

  function rowsToGuests(rows) {
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c || '').trim(); }); });
    if (!rows.length) return [];
    var head = rows[0].map(function (c) { return String(c || '').trim().toLowerCase(); });
    var map = {};
    head.forEach(function (h, i) {
      // Een kopcel is tekst, geen gegeven: geen mailadres en geen reeks cijfers.
      if (!h || /@/.test(h) || /\d{3,}/.test(h)) return;
      Object.keys(HEAD).forEach(function (k) { if (map[k] === undefined && HEAD[k].test(h)) map[k] = i; });
    });
    var hasHeader = map.naam !== undefined || map.email !== undefined || map.telefoon !== undefined;

    if (hasHeader) {
      return rows.slice(1).map(function (r) {
        var get = function (k) { return map[k] === undefined ? '' : String(r[map[k]] || '').trim(); };
        var naam = get('naam');
        if (get('achternaam')) naam = (naam + ' ' + get('achternaam')).trim();
        return splitCouple({ naam: naam, naam2: get('naam2'), email: get('email'), telefoon: fixPhone(get('telefoon')) });
      });
    }
    // Geen kopregel: per regel raden wat wat is.
    return rows.map(function (r) {
      var g = { naam: '', naam2: '', email: '', telefoon: '' }, rest = [];
      r.forEach(function (c) {
        c = String(c || '').trim(); if (!c) return;
        if (!g.email && isEmail(c)) g.email = c;
        else if (!g.telefoon && isPhone(fixPhone(c))) g.telefoon = fixPhone(c);
        else rest.push(c);
      });
      g.naam = rest[0] || ''; g.naam2 = rest.slice(1).join(' ');
      return splitCouple(g);
    });
  }

  async function readFile(file) {
    var name = (file.name || '').toLowerCase();
    if (/\.xls$/.test(name)) throw new Error('Oude .xls-bestanden worden niet ondersteund. Sla het bestand in Excel op als .xlsx en probeer het opnieuw.');
    if (/\.csv$|\.txt$/.test(name) || /text\//.test(file.type)) return rowsToGuests(readDelimited(await file.text()));
    if (typeof DecompressionStream === 'undefined') throw new Error('Deze browser kan Excel-bestanden niet lezen. Gebruik een recente Chrome, Safari of Edge, of sla het bestand op als CSV.');
    return rowsToGuests(await readXlsx(await file.arrayBuffer()));
  }

  window.JMImport = {
    readFile: readFile,
    parseText: function (text) { return rowsToGuests(readDelimited(text)); },
    _rowsToGuests: rowsToGuests, _readXlsx: readXlsx
  };
})();
