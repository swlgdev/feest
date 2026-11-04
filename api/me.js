import { guestToken } from './_lib/auth.js';
import { readGuest } from './_lib/store.js';

// Naam van de gast voor de persoonlijke begroeting en het berichtformulier.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const token = guestToken(req);
  if (!token) return res.status(200).json({ naam: null, naam2: null });
  try {
    const guest = await readGuest(token);
    return res.status(200).json({ naam: guest ? guest.naam : null, naam2: (guest && guest.naam2) || null });
  } catch (err) {
    return res.status(200).json({ naam: null, naam2: null });
  }
}
