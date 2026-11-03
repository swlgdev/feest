import { requireAdmin } from '../_lib/auth.js';
import { readState, writeState, ID_RE } from '../_lib/store.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    const state = await readState();
    if (b.fav && ID_RE.test(String(b.fav.id))) {
      if (b.fav.on) state.favs[b.fav.id] = true;
      else delete state.favs[b.fav.id];
    }
    if (b.markRead) state.lastSeen = new Date().toISOString();
    await writeState(state);
    return res.status(200).json({ ok: true, state });
  } catch (err) {
    console.error('Status opslaan mislukt', err);
    return res.status(500).json({ error: 'Opslaan is niet gelukt.' });
  }
}
