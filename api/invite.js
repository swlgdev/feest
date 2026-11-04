import { TOKEN_RE, guestCookie, isAdmin } from './_lib/auth.js';
import { readGuest, writeGuest } from './_lib/store.js';

// /i/<token>  (via rewrite in vercel.json)
// Controleert de persoonlijke link, telt het openen en zet de toegangscookie.
export default async function handler(req, res) {
  const token = String(req.query.t || '');
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN_RE.test(token)) return redirect(res, '/geen-toegang');

  try {
    const guest = await readGuest(token);
    if (!guest) return redirect(res, '/geen-toegang');

    // Als Marco zelf (ingelogd als beheerder) een link test, telt dat niet als "geopend".
    if (!isAdmin(req)) {
      const now = new Date().toISOString();
      guest.openedAt = guest.openedAt || now;
      guest.lastOpenedAt = now;
      guest.opens = (guest.opens || 0) + 1;
      await writeGuest(guest);
    }

    res.setHeader('Set-Cookie', guestCookie(token));
    return redirect(res, '/');
  } catch (err) {
    console.error('Uitnodiging openen mislukt', err);
    // Bij een storing de gast niet buitensluiten als de link er goed uitziet.
    res.setHeader('Set-Cookie', guestCookie(token));
    return redirect(res, '/');
  }
}

function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader('Location', to);
  res.end();
}
