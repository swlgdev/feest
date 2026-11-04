import { put, list, get, del } from '@vercel/blob';

// Alle berichten en foto's staan in een PRIVÉ Vercel Blob store.
// Alleen deze serverfuncties kunnen ze lezen (met BLOB_READ_WRITE_TOKEN).
const ACCESS = 'private';
export const ID_RE = /^[a-z0-9]{6,14}-[a-f0-9]{10}$/;
const STATE_PATH = 'meta/state.json';

export async function readJson(pathname) {
  try {
    const r = await get(pathname, { access: ACCESS, useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (err) {
    if (err && /not.?found/i.test(String(err.message || err.name))) return null;
    throw err;
  }
}

export async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: ACCESS,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });
}

export async function putPhoto(pathname, buffer, contentType) {
  await put(pathname, buffer, { access: ACCESS, contentType, addRandomSuffix: false });
}

export async function getStream(pathname) {
  const r = await get(pathname, { access: ACCESS });
  if (!r || r.statusCode !== 200) return null;
  return r;
}

export async function listMessages() {
  const paths = [];
  let cursor;
  do {
    const page = await list({ prefix: 'messages/', limit: 1000, cursor });
    for (const b of page.blobs) paths.push(b.pathname);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const out = [];
  const batch = 12;
  for (let i = 0; i < paths.length; i += batch) {
    const chunk = await Promise.all(paths.slice(i, i + batch).map((p) => readJson(p)));
    for (const m of chunk) if (m) out.push(m);
  }
  out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return out;
}

export async function readState() {
  const s = (await readJson(STATE_PATH)) || {};
  return { favs: s.favs || {}, lastSeen: s.lastSeen || null };
}

export async function writeState(state) {
  await writeJson(STATE_PATH, state);
}

/* ---------- Gasten / uitnodigingen ---------- */

const SETTINGS_PATH = 'meta/settings.json';

export const DEFAULT_TEMPLATE =
  'Lieve {naam},\n\n' +
  'Wat ontzettend leuk dat je erbij bent op ons feest! Via jouw persoonlijke link vind je alles over de avond: ' +
  'de tijden, de route, waar je kunt parkeren en een plekje om ons een berichtje te sturen.\n\n' +
  '{link}\n\n' +
  'Deze link is speciaal voor jou, deel hem dus liever niet.\n\n' +
  'Liefs,\nJoyce & Marco';
export const DEFAULT_TEMPLATE_DUO =
  'Lieve {naam},\n\n' +
  'Wat ontzettend leuk dat jullie erbij zijn op ons feest! Via jullie persoonlijke link vinden jullie alles over de avond: ' +
  'de tijden, de route, waar je kunt parkeren en een plekje om ons een berichtje te sturen.\n\n' +
  '{link}\n\n' +
  'Deze link is speciaal voor jullie, deel hem dus liever niet.\n\n' +
  'Liefs,\nJoyce & Marco';
export const DEFAULT_SUBJECT = 'Jouw persoonlijke uitnodiging voor het feest van Joyce & Marco';
export const DEFAULT_SUBJECT_DUO = 'Jullie persoonlijke uitnodiging voor het feest van Joyce & Marco';

export async function readGuest(token) {
  return readJson(`guests/${token}.json`);
}

export async function writeGuest(guest) {
  await writeJson(`guests/${guest.token}.json`, guest);
}

export async function deleteGuest(token) {
  await del([`guests/${token}.json`]);
}

export async function listGuests() {
  const paths = [];
  let cursor;
  do {
    const page = await list({ prefix: 'guests/', limit: 1000, cursor });
    for (const b of page.blobs) paths.push(b.pathname);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const out = [];
  for (let i = 0; i < paths.length; i += 16) {
    const chunk = await Promise.all(paths.slice(i, i + 16).map((p) => readJson(p)));
    for (const g of chunk) if (g) out.push(g);
  }
  out.sort((a, b) => String(a.naam).localeCompare(String(b.naam), 'nl'));
  return out;
}

export async function readSettings() {
  const s = (await readJson(SETTINGS_PATH)) || {};
  return {
    template: s.template || DEFAULT_TEMPLATE,
    subject: s.subject || DEFAULT_SUBJECT,
    templateDuo: s.templateDuo || DEFAULT_TEMPLATE_DUO,
    subjectDuo: s.subjectDuo || DEFAULT_SUBJECT_DUO
  };
}

export async function writeSettings(settings) {
  await writeJson(SETTINGS_PATH, settings);
}

export async function deleteMessage(id) {
  const msg = await readJson(`messages/${id}.json`);
  const targets = [`messages/${id}.json`];
  if (msg && msg.foto) targets.push(msg.foto);
  await del(targets);
}
