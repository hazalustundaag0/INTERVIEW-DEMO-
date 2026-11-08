#!/usr/bin/env node
// verify-platform.mjs — 81 altyapısının gerçek backend'e karşı duman testi (tarayıcısız).
// Önkoşul: API (127.0.0.1:8090, CORS_ALLOWED_ORIGINS=http://localhost:3000, EMAIL_SENDER=log, APP_ENV=local)
// ve dev sunucusu (localhost:3000) çalışıyor; seed-demo.mjs çalıştırılmış.
// Gerekli env: DEMO_GURU_PASSWORD. Opsiyonel: DEMO_GURU_EMAIL, BACKEND_DIR.
// api-client.js, sayfa bağlamı (location, sessionStorage) taklit edilerek vm içinde çalıştırılır;
// her istek tarayıcı gibi Origin: http://localhost:3000 başlığıyla gider ve CORS yanıtı denetlenir.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || path.join(FRONTEND, '..', 'backend'));
const ORIGIN = 'http://localhost:3000';
const API_ROOT = 'http://127.0.0.1:8090';
const GURU_EMAIL = process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || '';

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log('  ✓ ' + name); }
  else { failed += 1; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}

// ─── 1. Dev sunucusu ─────────────────────────────────────────────────────────
async function devServer() {
  console.log('Dev sunucusu (localhost:3000)');
  const get = (p, method = 'GET') => fetch('http://127.0.0.1:3000' + p, { method, redirect: 'manual' });
  let r = await get('/');
  check('/ → /demo/index.html', r.status === 302 && r.headers.get('location') === '/demo/index.html');
  r = await get('/verify-email?utm=1');
  check('/verify-email → davet.html?mode=verify (sorgu korunur)', r.status === 302 && r.headers.get('location') === '/demo/davet.html?utm=1&mode=verify', r.headers.get('location'));
  r = await get('/set-password');
  check('/set-password → davet.html?mode=invite', r.headers.get('location') === '/demo/davet.html?mode=invite');
  r = await get('/reset-password');
  check('/reset-password → davet.html?mode=reset', r.headers.get('location') === '/demo/davet.html?mode=reset');
  r = await get('/demo/index.html');
  check('HTML MIME', r.status === 200 && r.headers.get('content-type') === 'text/html; charset=utf-8');
  r = await get('/demo/api-client.js');
  check('JS MIME', r.headers.get('content-type') === 'text/javascript; charset=utf-8');
  r = await get('/theme.css');
  check('CSS MIME (../theme.css kökten)', r.headers.get('content-type') === 'text/css; charset=utf-8');
  for (const p of ['/demo/..%2f..%2fbackend%2f.env', '/..%5c..%5cbackend%5c.env', '/.git/config', '/demo/%2e%2e/%2e%2e/backend/.env']) {
    r = await get(p);
    check('path traversal / gizli dosya engellendi: ' + p, r.status === 404, String(r.status));
  }
  for (const p of ['/scripts/verify-83.mjs', '/scripts/dev-server.mjs', '/tests/e2e/package.json', '/README.md', '/.gitignore', '/%73cripts/seed-demo.mjs']) {
    r = await get(p);
    check('izin listesi dışı → 404 (QA-019): ' + p, r.status === 404, String(r.status));
  }
  r = await get('/demo/index.html', 'POST');
  check('POST → 405', r.status === 405);
}

// ─── 2. CORS ────────────────────────────────────────────────────────────────
async function cors() {
  console.log('CORS (API)');
  const pre = origin => fetch(API_ROOT + '/api/v1/candidate/enrollments', {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,idempotency-key,content-type' }
  });
  let r = await pre(ORIGIN);
  check('preflight localhost:3000 → 204 + ACAO', r.status === 204 && r.headers.get('access-control-allow-origin') === ORIGIN);
  check('Allow-Headers: Authorization, Idempotency-Key', /Authorization/.test(r.headers.get('access-control-allow-headers') || '') && /Idempotency-Key/.test(r.headers.get('access-control-allow-headers') || ''));
  r = await pre('http://127.0.0.1:3000');
  const body = await r.json().catch(() => ({}));
  check('preflight 127.0.0.1:3000 → 403 cors_origin_denied', r.status === 403 && body.code === 'cors_origin_denied');
  r = await fetch(API_ROOT + '/api/v1/public/services', { headers: { Origin: ORIGIN } });
  check('GET /public/services ACAO + Expose-Headers', r.status === 200 && r.headers.get('access-control-allow-origin') === ORIGIN && /Retry-After/.test(r.headers.get('access-control-expose-headers') || ''));
}

// ─── 3. api-client.js (sayfa bağlamında) ────────────────────────────────────
function loadClient(pageUrl) {
  const store = new Map();
  const nav = { replaced: null, assigned: null };
  const url = new URL(pageUrl);
  const location = {
    get pathname() { return url.pathname; },
    get search() { return url.search; },
    get hash() { return url.hash; },
    get href() { return url.href; },
    set href(v) { nav.assigned = v; },
    replace(v) { nav.replaced = v; }
  };
  const corsFetch = async (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    headers.set('Origin', ORIGIN); // tarayıcının ekleyeceği başlık
    const res = await fetch(input, { ...init, headers, redirect: 'manual' });
    if (res.headers.get('access-control-allow-origin') !== ORIGIN) {
      throw new TypeError('CORS: Access-Control-Allow-Origin eksik (' + res.status + ')');
    }
    return res;
  };
  const window = {
    APP_CONFIG: { apiBaseUrl: API_ROOT + '/api/v1', requestTimeoutMs: 15000 },
    sessionStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    crypto: globalThis.crypto,
    setTimeout, clearTimeout,
    dispatchEvent() {},
    events: []
  };
  const ctx = {
    window, location, history: { replaceState() {}, state: null }, fetch: corsFetch,
    Headers, FormData, Blob, URL, URLSearchParams, AbortController, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
    Intl, console, document: {}, CSS: { escape: s => s }
  };
  window.dispatchEvent = e => window.events.push(e);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(FRONTEND, 'demo', 'api-client.js'), 'utf8'), ctx, { filename: 'api-client.js' });
  return { Api: window.Api, store, nav };
}

function latestMailTokenFor(email, since) {
  const dir = path.join(BACKEND_DIR, 'data', 'mail');
  const files = fs.readdirSync(dir).map(n => path.join(dir, n)).filter(f => fs.statSync(f).mtimeMs >= since - 2000)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    if ((/^To:\s*(.+)$/m.exec(c) || [])[1]?.trim().toLowerCase() !== email.toLowerCase()) continue;
    const m = /\/verify-email#token=(idv_[A-Za-z0-9_-]+)/.exec(c);
    if (m) return m[1];
  }
  return null;
}

async function client() {
  console.log('api-client.js — aday');
  const email = `aday.${Date.now()}@example.test`;
  const password = 'Aday-Yerel-Parola-2026';
  // Kayıt sayfası bağlamı
  let { Api } = loadClient('http://localhost:3000/demo/kayit.html');
  check('pageRole(kayit) = candidate', Api.pageRole() === 'candidate');
  try {
    await Api.post('/auth/register', { first_name: 'Ada' }, { auth: false });
    check('422 problem+json', false, 'hata bekleniyordu');
  } catch (e) {
    check('422 → ApiError(validation_failed, fields)', e instanceof Api.ApiError && e.status === 422 && e.code === 'validation_failed' && Object.keys(e.fields).length > 0, JSON.stringify(e.fields));
    check('ApiError.message Türkçe + requestId', typeof e.message === 'string' && e.message.length > 0 && Boolean(e.requestId));
  }
  const since = Date.now();
  await Api.auth.register({ firstName: 'Ada', lastName: 'Deneme', email });
  check('register → 202', true);
  let token = null;
  for (let i = 0; i < 20 && !token; i += 1) { token = latestMailTokenFor(email, since); if (!token) await new Promise(r => setTimeout(r, 300)); }
  check('doğrulama bağlantısı data/mail\'de (APP_PUBLIC_URL/verify-email#token=)', Boolean(token));
  try { await Api.auth.verifyEmail(token, 'kisa'); } catch (e) {
    check('weak_password → fields.password', e.code === 'weak_password' && e.fields.password === 'too_short', JSON.stringify(e.fields));
  }
  await Api.auth.verifyEmail(token, password);
  check('verify-email + parola belirleme', true);

  ({ Api } = loadClient('http://localhost:3000/demo/giris.html'));
  const ctx = loadClient('http://localhost:3000/demo/giris.html');
  Api = ctx.Api;
  try { await Api.auth.login({ email, password: 'Yanlis-Parola-12345' }); } catch (e) {
    check('yanlış parola → 401 invalid_credentials (yönlendirme yok)', e.status === 401 && e.code === 'invalid_credentials' && !ctx.nav.replaced, e.code);
  }
  const login = await Api.auth.login({ email, password });
  check('aday login (client_type=candidate)', login.token_type === 'Bearer' && login.user.role === 'candidate');
  check('token yalnız sessionStorage idToken.candidate', ctx.store.get('idToken.candidate') === login.token && !ctx.store.has('idToken.guru'));
  check('kullanıcı önbelleğinde e-posta/token yok', !String(ctx.store.get('idUser.candidate')).includes('@') && !String(ctx.store.get('idUser.candidate')).includes('idt_'));
  const me = await Api.auth.me();
  check('/auth/me → client_type candidate', me.client_type === 'candidate' && me.user.email === email);
  const enr = await Api.page('/candidate/enrollments', { limit: 5 });
  check('cursor sayfalama yardımcısı ({items,nextCursor})', Array.isArray(enr.items) && 'nextCursor' in enr);
  const all = await Api.listAll('/public/gurus', { auth: false, limit: 2 });
  check('listAll çok sayfa (limit=2 → tüm gurular)', all.length >= 3, String(all.length));

  // Guru sayfasında aday token'ı yok; aday hesabıyla guru girişi → client_not_allowed
  const guruCtx = loadClient('http://localhost:3000/demo/giris-danisman.html');
  check('pageRole(giris-danisman) = guru', guruCtx.Api.pageRole() === 'guru');
  try { await guruCtx.Api.auth.login({ email, password }); } catch (e) {
    check('aday hesabıyla guru girişi → 403 client_not_allowed', e.status === 403 && e.code === 'client_not_allowed', e.code);
  }

  // Çıkış → token iptal; aynı token ile istek 401 → temizle + girişe ?return=
  const savedToken = ctx.store.get('idToken.candidate');
  await Api.auth.logout({ redirectTo: false });
  check('logout → sessionStorage temizlendi', !ctx.store.has('idToken.candidate') && !ctx.store.has('idUser.candidate'));
  const pageCtx = loadClient('http://localhost:3000/demo/seanslar.html?tab=1');
  pageCtx.store.set('idToken.candidate', savedToken);
  try { await pageCtx.Api.get('/candidate/enrollments'); check('401 bekleniyordu', false); } catch (e) {
    check('iptal edilmiş token → 401 unauthenticated', e.status === 401 && e.code === 'unauthenticated', e.code);
    check('401 → token temizlendi', !pageCtx.store.has('idToken.candidate'));
    check('401 → giris.html?return=seanslar.html%3Ftab%3D1', pageCtx.nav.replaced === 'giris.html?return=seanslar.html%3Ftab%3D1', pageCtx.nav.replaced);
  }
  const guruPage = loadClient('http://localhost:3000/demo/guru-danisanlar.html');
  try { await guruPage.Api.get('/guru/clients'); } catch (e) {
    check('guru sayfasında token yok → giris-danisman.html?return=', e.status === 401 && guruPage.nav.replaced === 'giris-danisman.html?return=guru-danisanlar.html', guruPage.nav.replaced);
  }

  console.log('api-client.js — guru');
  if (!GURU_PASSWORD) { check('DEMO_GURU_PASSWORD verilmedi; guru testi atlandı', false); return; }
  const g = loadClient('http://localhost:3000/demo/giris-danisman.html');
  const gl = await g.Api.auth.login({ email: GURU_EMAIL, password: GURU_PASSWORD });
  check('guru login (client_type=guru)', gl.user.role === 'guru' && g.store.has('idToken.guru') && !g.store.has('idToken.candidate'));
  const gm = await g.Api.auth.me();
  check('guru /auth/me', gm.client_type === 'guru');
  const clients = await g.Api.page('/guru/clients', { limit: 10 });
  check('GET /guru/clients (Bearer guru)', Array.isArray(clients.items));
  try { await g.Api.get('/candidate/enrollments'); } catch (e) {
    check('guru token ile aday ucu → 403 forbidden (401 değil, yönlendirme yok)', e.status === 403 && !g.nav.replaced, e.code + ' ' + g.nav.replaced);
  }
  try { await g.Api.confirm('POST', '/guru/enrollment-sessions/00000000-0000-0000-0000-000000000000/complete'); } catch (e) {
    check('confirm() + bozuk/yabancı UUID → 404 not_found', e.status === 404 && e.code === 'not_found', e.code);
  }
  await g.Api.auth.logout({ redirectTo: false });
  check('guru logout', !g.store.has('idToken.guru'));
  try {
    const fmt = g.Api.format.money(150000, 'TRY');
    check('format.money(150000,TRY) = ' + fmt, /1\.500/.test(fmt) && fmt.includes('₺'));
  } catch (e) { check('format.money', false, e.message); }
}

try {
  await devServer();
  await cors();
  await client();
} catch (error) {
  failed += 1;
  console.error('Beklenmeyen hata:', error);
}
console.log(`\nSonuç: ${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
