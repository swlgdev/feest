import { checkPassword, sessionCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  }
  const password = req.body && req.body.password;
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800));
    return res.status(401).json({ error: 'Dat wachtwoord klopt niet.' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  return res.status(200).json({ ok: true });
}
