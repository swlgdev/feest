import { requireAdmin, newToken, TOKEN_RE } from '../_lib/auth.js';
import { listGuests, readGuest, writeGuest, deleteGuest, readSettings, writeSettings } from '../_lib/store.js';

const clean = (v, max) => String(v || '').trim().slice(0, max);
const normEmail = (v) => clean(v, 160).toLowerCase();
const normPhone = (v) => clean(v, 40).replace(/[^\d+]/g, '');

function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}`;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const [guests, settings] = await Promise.all([listGuests(), readSettings()]);
      return res.status(200).json({ guests, settings, baseUrl: baseUrl(req) });
    }

    if (req.method === 'DELETE') {
      const token = String(req.query.token || '');
      if (!TOKEN_RE.test(token)) return res.status(400).json({ error: 'Onbekende gast' });
      await deleteGuest(token);
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).json({ error: 'Methode niet toegestaan' });
    }

    const b = req.body && typeof req.body === 'object' ? req.body : {};

    if (b.action === 'add') {
      const input = Array.isArray(b.guests) ? b.guests.slice(0, 500) : [];
      const existing = await listGuests();
      const emails = new Set(existing.map((g) => g.email).filter(Boolean));
      const phones = new Set(existing.map((g) => normPhone(g.telefoon)).filter(Boolean));
      const added = [], skipped = [];
      for (const raw of input) {
        const naam = clean(raw.naam, 80);
        const naam2 = clean(raw.naam2, 80);
        const email = normEmail(raw.email);
        const telefoon = clean(raw.telefoon, 40);
        if (!naam || (!email && !telefoon)) { skipped.push({ naam, reden: 'naam en e-mail of telefoon nodig' }); continue; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { skipped.push({ naam, reden: 'e-mailadres klopt niet' }); continue; }
        if ((email && emails.has(email)) || (telefoon && phones.has(normPhone(telefoon)))) { skipped.push({ naam, reden: 'staat al in de lijst' }); continue; }
        const guest = {
          token: newToken(), naam, naam2, email: email || '', telefoon,
          createdAt: new Date().toISOString(), sentAt: null, sentVia: null,
          openedAt: null, lastOpenedAt: null, opens: 0
        };
        await writeGuest(guest);
        if (email) emails.add(email);
        if (telefoon) phones.add(normPhone(telefoon));
        added.push(guest);
      }
      return res.status(200).json({ added, skipped });
    }

    if (b.action === 'sent' || b.action === 'update') {
      const token = String(b.token || '');
      if (!TOKEN_RE.test(token)) return res.status(400).json({ error: 'Onbekende gast' });
      const guest = await readGuest(token);
      if (!guest) return res.status(404).json({ error: 'Gast niet gevonden' });
      if (b.action === 'sent') {
        guest.sentAt = guest.sentAt || new Date().toISOString();
        guest.sentVia = Array.from(new Set([].concat(guest.sentVia || [], clean(b.via, 20)).filter(Boolean)));
      } else {
        if (b.naam !== undefined) guest.naam = clean(b.naam, 80) || guest.naam;
        if (b.naam2 !== undefined) guest.naam2 = clean(b.naam2, 80);
        if (b.email !== undefined) guest.email = normEmail(b.email);
        if (b.telefoon !== undefined) guest.telefoon = clean(b.telefoon, 40);
        if (b.resetSent) { guest.sentAt = null; guest.sentVia = null; }
      }
      await writeGuest(guest);
      return res.status(200).json({ guest });
    }

    if (b.action === 'settings') {
      const settings = {
        template: clean(b.template, 4000), subject: clean(b.subject, 200),
        templateDuo: clean(b.templateDuo, 4000), subjectDuo: clean(b.subjectDuo, 200)
      };
      if (!settings.template.includes('{link}') || (settings.templateDuo && !settings.templateDuo.includes('{link}'))) {
        return res.status(400).json({ error: 'Zet {link} in de tekst, anders krijgt de gast geen link.' });
      }
      await writeSettings(settings);
      return res.status(200).json({ settings: await readSettings() });
    }

    return res.status(400).json({ error: 'Onbekende actie' });
  } catch (err) {
    console.error('Gasten-API mislukt', err);
    return res.status(500).json({ error: 'Er ging iets mis bij het opslaan.' });
  }
}
