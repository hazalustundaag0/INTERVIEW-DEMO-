// Interview Demo Etap 2 — tarayıcı (Playwright + Chromium) test altyapısı. K65: QA (70) betiklerinden
// taşındı, sahibi 81. Hesaplar ve parolalar YALNIZ ortam değişkenlerinden okunur (README).
// Çıktılar (ekran görüntüleri, sonuç JSON'ları, token önbelleği, koşu durumu) output/ altında; git'e girmez.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const API = (process.env.API_BASE_URL || 'http://127.0.0.1:8090/api/v1').replace(/\/+$/, '');
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || path.join(HERE, '..', '..', '..', 'backend'));
export const MAIL = path.join(BACKEND_DIR, 'data', 'mail');
export const OUTPUT = path.resolve(process.env.E2E_OUTPUT_DIR || path.join(HERE, 'output'));
export const OUT = path.join(OUTPUT, 'shots');
fs.mkdirSync(OUT, { recursive: true });

// Koşular arası durum dosyaları (aday hesapları, guru bağlantıları, token önbelleği) output/ altında.
export function statePath(name) {
  return path.join(OUTPUT, name);
}
export function readState(name) {
  return JSON.parse(fs.readFileSync(statePath(name), 'utf8'));
}
export function writeState(name, value) {
  fs.writeFileSync(statePath(name), JSON.stringify(value, null, 1));
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Ortam değişkeni gerekli: ${name} (bkz. tests/e2e/README.md)`);
    process.exit(2);
  }
  return value;
}

// Seed gurusu (seed-demo.mjs) — e-posta varsayılanı kurgusal seed hesabı, parola zorunlu env.
export function guruCreds() {
  return {
    email: process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test',
    password: requireEnv('DEMO_GURU_PASSWORD')
  };
}
// s2'nin oluşturduğu test adaylarının parolası (koşu başına yeni hesap; değer env'den).
export function candidatePassword() {
  return requireEnv('E2E_CANDIDATE_PASSWORD');
}
// Negatif testlerde kullanılan, hiçbir hesaba ait olmayan kasıtlı yanlış parola.
export const WRONG_PASSWORD = 'Yanlis-Parola-' + Date.now();

export const results = [];
export function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  -- ' + String(detail).slice(0, 300) : ''));
}
export const issues = { console: [], pageerror: [], http: [], failed: [], localStorage: [] };

// Beklenen 4xx/5xx yanıtlar: "METHOD path-regex status".
export const expected = [];
export function expect4xx(method, re, status) { expected.push({ method, re, status }); }

export async function launch() {
  return chromium.launch();
}

export async function newContext(browser, { mobile = false, label = 'ctx' } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' }
    : { viewport: { width: 1440, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  await ctx.addInitScript(() => {
    try {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (this === window.localStorage) {
          (window.__lsWrites = window.__lsWrites || []).push(k);
          console.warn('[QA-LS-WRITE] ' + k);
        }
        return orig.apply(this, arguments);
      };
    } catch (e) { /* yok say */ }
    window.__xss = 0;
  });
  ctx.on('page', p => attach(p, label));
  return ctx;
}

export function attach(page, label) {
  page.on('console', m => {
    const t = m.text();
    if (t.startsWith('[QA-LS-WRITE]')) { issues.localStorage.push({ label, url: page.url(), key: t.slice(14) }); return; }
    if (m.type() === 'error') issues.console.push({ label, url: page.url(), text: t.slice(0, 300) });
  });
  page.on('pageerror', e => issues.pageerror.push({ label, url: page.url(), text: String(e).slice(0, 300) }));
  page.on('requestfailed', r => {
    const f = r.failure()?.errorText || '';
    if (/ERR_ABORTED/.test(f)) return;
    issues.failed.push({ label, url: r.url(), err: f });
  });
  page.on('response', r => {
    const s = r.status();
    if (s < 400) return;
    const u = r.url();
    const m = r.request().method();
    const ok = expected.some(e => e.method === m && e.re.test(u) && e.status === s);
    issues.http.push({ label, method: m, url: u.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>'), status: s, expected: ok, page: page.url().split('/').pop() });
  });
}

export async function shot(page, name, options = {}) {
  const f = path.join(OUT, name + '.png');
  await page.screenshot({ path: f, fullPage: options.fullPage !== false });
  return f;
}

export function latestMailLink(addr, sinceMs) {
  for (let i = 0; i < 60; i++) {
    const files = fs.existsSync(MAIL) ? fs.readdirSync(MAIL).map(f => path.join(MAIL, f)).filter(f => fs.statSync(f).mtimeMs >= sinceMs)
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs) : [];
    for (const f of files) {
      const t = fs.readFileSync(f, 'utf8');
      if (t.includes('To: ' + addr)) {
        const m = /(https?:\/\/\S+#token=idv_[A-Za-z0-9_-]+)/.exec(t);
        if (m) return m[1];
      }
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  return null;
}

export async function apiLogin(email, password, clientType) {
  const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ email, password, client_type: clientType }) });
  const j = await r.json();
  if (!r.ok) throw new Error('login ' + r.status + ' ' + (j && j.code));
  return j;
}

export async function api(method, p, token, body, extra = {}) {
  const h = { Origin: BASE, ...(extra.headers || {}) };
  if (token) h.Authorization = 'Bearer ' + token;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(API + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j };
}

export async function lsKeys(page) {
  return page.evaluate(() => { const o = []; for (let i = 0; i < localStorage.length; i++) o.push(localStorage.key(i)); return o; });
}
export async function ssKeys(page) {
  return page.evaluate(() => { const o = []; for (let i = 0; i < sessionStorage.length; i++) o.push(sessionStorage.key(i)); return o; });
}

export function save(file) {
  writeState(file, { results, issues });
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${file}: ${results.length - failed} PASS / ${failed} FAIL`);
  if (failed) process.exitCode = 1;
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
