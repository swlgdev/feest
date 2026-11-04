import { guestToken, isAdmin } from './_lib/auth.js';
import { readGuest, writeGuest } from './_lib/store.js';

// Wordt door de feestpagina aangeroepen zodra die echt in een browser geladen is.
// Zo telt "geopend" alleen echte bezoeken, geen link-voorbeelden.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const token = guestToken(req);
  // Marco die als beheerder test, telt niet mee.
  if (!token || isAdmin(req)) return res.status(204).end();
  try {
    const guest = await readGuest(token);
    if (!guest) return res.status(204).end();
    const now = new Date().toISOString();
    guest.openedAt = guest.openedAt || now;
    guest.lastOpenedAt = now;
    guest.opens = (guest.opens || 0) + 1;
    await writeGuest(guest);
    return res.status(204).end();
  } catch (err) {
    console.error('Geopend registreren mislukt', err);
    return res.status(204).end();
  }
}
