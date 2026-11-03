import { requireAdmin } from '../_lib/auth.js';
import { listMessages, readState, deleteMessage, ID_RE } from '../_lib/store.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const [messages, state] = await Promise.all([listMessages(), readState()]);
      return res.status(200).json({
        messages: messages.map((m) => ({
          id: m.id, naam: m.naam, bericht: m.bericht, liedje: m.liedje || '',
          hasFoto: Boolean(m.foto), createdAt: m.createdAt
        })),
        state
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!ID_RE.test(id)) return res.status(400).json({ error: 'Onbekend bericht' });
      await deleteMessage(id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (err) {
    console.error('Admin berichten mislukt', err);
    return res.status(500).json({ error: 'Berichten laden is niet gelukt.' });
  }
}
