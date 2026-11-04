import { next } from '@vercel/functions';

// Schermt de feestpagina af: alleen gasten die via hun persoonlijke link
// (/i/<token>) binnenkwamen, of Joyce & Marco (ingelogd op /admin), mogen erin.
export const config = {
  matcher: [
    '/((?!api/|i/|admin|geen-toegang|favicon\\.svg|robots\\.txt|assets/leaf_corner\\.png|assets/og\\.jpg).*)'
  ]
};

const enc = new TextEncoder();
let keyPromise = null;

function getKey(secret) {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  }
  return keyPromise;
}

function b64url(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(secret, value) {
  const key = await getKey(secret);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

function cookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const part = raw.split(/;\s*/).find((c) => c.startsWith(name + '='));
  return part ? part.slice(name.length + 1) : null;
}

export async function hasAccess(request, secret) {
  if (!secret) return false;

  const g = cookie(request, 'jm_gast');
  if (g) {
    const [token, sig] = g.split('.');
    if (/^[A-Za-z0-9_-]{16}$/.test(token || '') && sig && sig === (await sign(secret, 'g:' + token))) return true;
  }

  const a = cookie(request, 'jm_admin');
  if (a) {
    const [exp, sig] = a.split('.');
    if (exp && sig && Number(exp) > Date.now() && sig === (await sign(secret, exp))) return true;
  }
  return false;
}

export default async function middleware(request) {
  if (await hasAccess(request, process.env.SESSION_SECRET || '')) return next();
  return new Response(null, {
    status: 307,
    headers: { Location: new URL('/geen-toegang', request.url).toString(), 'Cache-Control': 'no-store' }
  });
}
