import { TOKEN_RE, guestCookie } from './_lib/auth.js';
import { readGuest } from './_lib/store.js';

// /i/<token>  (via rewrite in vercel.json)
// Controleert de persoonlijke link, zet de toegangscookie en stuurt door naar de feestpagina.
// Het "geopend" tellen gebeurt pas als de pagina echt in een browser laadt (api/seen.js),
// zodat link-voorbeelden van WhatsApp of mailprogramma's niet meetellen.

// Alleen bekende link-voorbeeld-bots; in-app browsers van echte gasten moeten gewoon door.
const BOT_RE = /whatsapp|facebookexternalhit|facebot|telegrambot|slackbot|twitterbot|linkedinbot|discordbot|skypeuripreview|googlebot|bingbot|bingpreview|microsoft office existence/i;

export default async function handler(req, res) {
  const token = String(req.query.t || '');
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN_RE.test(token)) return redirect(res, '/geen-toegang');

  // Link-voorbeeld (WhatsApp, iMessage, Outlook...): toon een nette kaart, zonder toegang te geven.
  if (BOT_RE.test(String(req.headers['user-agent'] || ''))) return preview(req, res);

  try {
    const guest = await readGuest(token);
    if (!guest) return redirect(res, '/geen-toegang');
  } catch (err) {
    console.error('Uitnodiging controleren mislukt', err);
    // Bij een storing de gast niet buitensluiten; de cookie is ondertekend en dus veilig.
  }
  res.setHeader('Set-Cookie', guestCookie(token));
  return redirect(res, '/');
}

function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader('Location', to);
  res.end();
}

function preview(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const img = `https://${host}/assets/og.jpg`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="nl"><head><meta charset="utf-8">
<title>Je bent uitgenodigd - feest Joyce &amp; Marco</title>
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="Je bent uitgenodigd!">
<meta property="og:description" content="Feest Joyce &amp; Marco - zaterdag 21 november, Central Park Voorburg">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
</head><body><p>Je bent uitgenodigd voor het feest van Joyce &amp; Marco.</p></body></html>`);
}
