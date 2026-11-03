import { Readable } from 'node:stream';
import { requireAdmin } from '../_lib/auth.js';
import { readJson, getStream, ID_RE } from '../_lib/store.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const id = String(req.query.id || '');
  if (!ID_RE.test(id)) return res.status(400).end();
  try {
    const msg = await readJson(`messages/${id}.json`);
    if (!msg || !msg.foto) return res.status(404).end();
    const r = await getStream(msg.foto);
    if (!r) return res.status(404).end();
    res.setHeader('Content-Type', r.blob.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    Readable.fromWeb(r.stream).pipe(res);
  } catch (err) {
    console.error('Foto laden mislukt', err);
    res.status(500).end();
  }
}
