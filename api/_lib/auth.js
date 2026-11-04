import crypto from 'node:crypto';

const COOKIE = 'jm_admin';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dagen

function secret() {
  return process.env.SESSION_SECRET || '';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || !secret()) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function isAdmin(req) {
  if (!secret()) return false;
  const raw = req.headers.cookie || '';
  const part = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!part) return false;
  const [exp, sig] = part.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

/* ---------- Gasten (persoonlijke uitnodigingslink) ---------- */

const GUEST_COOKIE = 'jm_gast';
const GUEST_MAX_AGE = 60 * 60 * 24 * 365;
export const TOKEN_RE = /^[A-Za-z0-9_-]{16}$/;

export function newToken() {
  return crypto.randomBytes(12).toString('base64url');
}

export function guestCookie(token) {
  return `${GUEST_COOKIE}=${token}.${sign('g:' + token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${GUEST_MAX_AGE}`;
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const part = raw.split(/;\s*/).find((c) => c.startsWith(name + '='));
  return part ? part.slice(name.length + 1) : null;
}

// Geeft het token van de gast terug als de cookie geldig is, anders null.
export function guestToken(req) {
  if (!secret()) return null;
  const v = readCookie(req, GUEST_COOKIE);
  if (!v) return null;
  const [token, sig] = v.split('.');
  if (!TOKEN_RE.test(token || '') || !sig) return null;
  return safeEqual(sig, sign('g:' + token)) ? token : null;
}

export function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.status(401).json({ error: 'Niet ingelogd' });
  return false;
}
