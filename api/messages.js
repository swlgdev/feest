import crypto from 'node:crypto';
import { writeJson, putPhoto } from './_lib/store.js';

const MAX_PHOTO = 3.5 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  }

  const b = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot tegen spam-bots: stil "gelukt" teruggeven.
  if (b.website) return res.status(200).json({ ok: true });

  const naam = String(b.naam || '').trim().slice(0, 80);
  const bericht = String(b.bericht || '').trim().slice(0, 3000);
  const liedje = String(b.liedje || '').trim().slice(0, 150);
  if (!naam || !bericht) {
    return res.status(400).json({ error: 'Vul je naam en een berichtje in.' });
  }

  const id = Date.now().toString(36) + '-' + crypto.randomBytes(5).toString('hex');

  try {
    let foto = null;
    if (typeof b.foto === 'string' && b.foto) {
      const m = b.foto.match(/^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return res.status(400).json({ error: 'Deze foto kunnen we niet opslaan.' });
      const buf = Buffer.from(m[3], 'base64');
      if (buf.length > MAX_PHOTO) return res.status(413).json({ error: 'De foto is te groot.' });
      foto = `photos/${id}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`;
      await putPhoto(foto, buf, m[1]);
    }

    await writeJson(`messages/${id}.json`, {
      id, naam, bericht, liedje, foto, createdAt: new Date().toISOString()
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Bericht opslaan mislukt', err);
    return res.status(500).json({ error: 'Opslaan is niet gelukt. Probeer het zo nog eens.' });
  }
}
