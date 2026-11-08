#!/usr/bin/env node
// seed-demo.mjs — Etap 2 demo verisi (GAP-B22, K54). Sahibi: 81 Frontend Platform. İDEMPOTENT.
//
// Yaptıkları (yalnız Admin API + mevcut cmd/admin CLI; backend dosyasına dokunmaz):
//   1. Yönetici: ADMIN_EMAIL/ADMIN_PASSWORD ile client_type=admin girişi; hesap yoksa
//      `go run ./cmd/admin create-admin` (parola ADMIN_PASSWORD ortam değişkeninden, bayrakla ASLA).
//   2. Demo guru (varsayılan seed gurusu deniz.kurgu@gurus.example.test): DEMO_GURU_PASSWORD ile
//      guru girişi denenir; olmazsa POST /admin/gurus/{userID}/invitation → EMAIL_SENDER=log'un
//      yazdığı backend/data/mail/*.txt içinden davet bağlantısı → POST /auth/verify-email (parola).
//   3. Aktif hizmet(ler)e 1.500 TRY fiyat kuralı (geçerli kural zaten 150000 TRY ise atlanır).
//
// Gerekli ortam değişkenleri (parolalar komut satırı bayrağıyla verilmez, ekrana/loga yazılmaz):
//   ADMIN_PASSWORD, DEMO_GURU_PASSWORD   (her ikisi de ≥ 12 karakter, parola politikası)
// İsteğe bağlı:
//   API_BASE_URL (http://127.0.0.1:8090/api/v1) · BACKEND_DIR (../../backend) · ADMIN_EMAIL (admin@example.test)
//   DEMO_GURU_EMAIL (deniz.kurgu@gurus.example.test) · DEMO_PRICE_MINOR (150000) · DEMO_CURRENCY (TRY)
//
// Çalıştırma (PowerShell):  $env:ADMIN_PASSWORD='…'; $env:DEMO_GURU_PASSWORD='…'; node scripts/seed-demo.mjs
// Önkoşul: API çalışıyor (APP_ENV=local, EMAIL_SENDER=log) ve migration + 001_dev_gurus.sql uygulanmış.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = (process.env.API_BASE_URL || 'http://127.0.0.1:8090/api/v1').replace(/\/+$/, '');
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || path.join(HERE, '..', '..', 'backend'));
const MAIL_DIR = path.join(BACKEND_DIR, 'data', 'mail');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.test';
const GURU_EMAIL = (process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test').toLowerCase();
const PRICE_MINOR = Number(process.env.DEMO_PRICE_MINOR || 150000);
const CURRENCY = process.env.DEMO_CURRENCY || 'TRY';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || '';

function log(message) { console.log('• ' + message); }
function fail(message) { console.error('✗ ' + message); process.exit(1); }

class HttpError extends Error {
  constructor(status, problem) {
    super((problem && (problem.message || problem.code)) || 'HTTP ' + status);
    this.status = status;
    this.code = problem && problem.code;
  }
}

async function call(method, urlPath, { token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API + urlPath, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    fail(`API'ye ulaşılamadı (${API}). Backend çalışıyor mu? (${error.cause?.code || error.message})`);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}

async function login(email, password, clientType) {
  try {
    const data = await call('POST', '/auth/login', { body: { email, password, client_type: clientType } });
    return data.token;
  } catch (error) {
    if (error.status === 401 && error.code === 'invalid_credentials') return null;
    throw error;
  }
}

// backend/.env değerlerini (varsa) alt sürece aktarır; mevcut ortam değişkenleri ezilmez.
function backendEnv() {
  const env = { ...process.env };
  const file = path.join(BACKEND_DIR, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#') && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  }
  return env;
}

async function ensureAdmin() {
  let token = await login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  if (token) { log(`Yönetici girişi tamam (${ADMIN_EMAIL}).`); return token; }
  log(`Yönetici yok veya parola farklı → cmd/admin create-admin (${ADMIN_EMAIL})`);
  const result = spawnSync('go', ['run', './cmd/admin', 'create-admin', '--email', ADMIN_EMAIL, '--first-name', 'Demo', '--last-name', 'Yönetici'], {
    cwd: BACKEND_DIR, env: backendEnv(), encoding: 'utf8'
  });
  if (result.status !== 0) {
    const out = (result.stderr || result.stdout || '').trim().split('\n').pop();
    fail(`create-admin başarısız: ${out}. Hesap zaten varsa ADMIN_PASSWORD doğru mu?`);
  }
  token = await login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  if (!token) fail('Yönetici oluşturuldu ama giriş yapılamadı.');
  log('Yönetici oluşturuldu ve giriş yapıldı.');
  return token;
}

async function findGuruUser(adminToken) {
  let cursor = null;
  do {
    const q = new URLSearchParams({ role: 'guru', limit: '100' });
    if (cursor) q.set('cursor', cursor);
    const page = await call('GET', '/admin/users?' + q, { token: adminToken });
    const hit = page.items.find(u => u.email.toLowerCase() === GURU_EMAIL);
    if (hit) return hit;
    cursor = page.next_cursor;
  } while (cursor);
  return null;
}

function mailFilesSince(startMs) {
  if (!fs.existsSync(MAIL_DIR)) return [];
  return fs.readdirSync(MAIL_DIR)
    .filter(name => name.endsWith('.txt'))
    .map(name => ({ name, full: path.join(MAIL_DIR, name), mtime: fs.statSync(path.join(MAIL_DIR, name)).mtimeMs }))
    .filter(f => f.mtime >= startMs - 2000)
    .sort((a, b) => b.mtime - a.mtime);
}

async function waitForInvitationToken(startMs) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    for (const file of mailFilesSince(startMs)) {
      const content = fs.readFileSync(file.full, 'utf8');
      const to = /^To:\s*(.+)$/m.exec(content);
      if (!to || to[1].trim().toLowerCase() !== GURU_EMAIL) continue;
      const link = /(https?:\/\/\S+\/set-password)#token=(idv_[A-Za-z0-9_-]+)/.exec(content);
      if (link) return { token: link[2], file: file.name, base: link[1] };
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return null;
}

async function ensureGuru(adminToken) {
  if (await login(GURU_EMAIL, GURU_PASSWORD, 'guru')) {
    log(`Demo guru zaten etkin; giriş tamam (${GURU_EMAIL}).`);
    return;
  }
  const user = await findGuruUser(adminToken);
  if (!user) fail(`Guru kullanıcısı bulunamadı: ${GURU_EMAIL}. internal/db/seed/001_dev_gurus.sql uygulandı mı?`);
  if (user.password_set) fail(`${GURU_EMAIL} için parola zaten belirlenmiş ama DEMO_GURU_PASSWORD ile giriş olmadı. Doğru parolayı verin.`);

  const start = Date.now();
  await call('POST', `/admin/gurus/${user.id}/invitation`, { token: adminToken });
  log('Davet yeniden gönderildi (EMAIL_SENDER=log → data/mail).');
  const invitation = await waitForInvitationToken(start);
  if (!invitation) fail(`Davet e-postası ${MAIL_DIR} içinde bulunamadı. API APP_ENV=local ve EMAIL_SENDER=log ile mi çalışıyor?`);
  log(`Davet bağlantısı bulundu (${invitation.file}; ${invitation.base}#token=… — token yazdırılmaz).`);

  try {
    await call('POST', '/auth/verify-email', { body: { token: invitation.token, password: GURU_PASSWORD } });
  } catch (error) {
    if (error.code === 'weak_password') fail('DEMO_GURU_PASSWORD parola politikasına uymuyor: ' + error.message);
    throw error;
  }
  if (!(await login(GURU_EMAIL, GURU_PASSWORD, 'guru'))) fail('Parola belirlendi ama guru girişi başarısız.');
  log('Guru parolası belirlendi; client_type=guru girişi doğrulandı.');
}

function currentRule(rules, now) {
  return rules
    .filter(r => r.currency === CURRENCY && Date.parse(r.valid_from) <= now && (!r.valid_until || Date.parse(r.valid_until) > now))
    .sort((a, b) => Date.parse(b.valid_from) - Date.parse(a.valid_from))[0] || null;
}

async function ensurePrice(adminToken) {
  const services = (await call('GET', '/admin/services', { token: adminToken })).items.filter(s => s.is_active);
  if (!services.length) fail('Aktif hizmet yok.');
  for (const service of services) {
    const rules = (await call('GET', `/admin/services/${service.id}/prices`, { token: adminToken })).items;
    const current = currentRule(rules, Date.now());
    if (current && current.amount_minor === PRICE_MINOR) {
      log(`Fiyat zaten ${PRICE_MINOR / 100} ${CURRENCY}: ${service.name}`);
      continue;
    }
    await call('POST', `/admin/services/${service.id}/prices`, {
      token: adminToken,
      body: { amount_minor: PRICE_MINOR, currency: CURRENCY, note: 'Etap 2 demo fiyatı (K54, seed-demo.mjs)' }
    });
    log(`Fiyat kuralı eklendi: ${service.name} → ${PRICE_MINOR / 100} ${CURRENCY} (önceki: ${current ? current.amount_minor / 100 : 'yok'})`);
  }
}

async function main() {
  if (ADMIN_PASSWORD.length < 12) fail('ADMIN_PASSWORD ortam değişkeni gerekli (≥ 12 karakter).');
  if (GURU_PASSWORD.length < 12) fail('DEMO_GURU_PASSWORD ortam değişkeni gerekli (≥ 12 karakter).');
  log(`API: ${API} · backend: ${BACKEND_DIR}`);
  const adminToken = await ensureAdmin();
  try {
    await ensureGuru(adminToken);
    await ensurePrice(adminToken);
  } finally {
    await call('POST', '/auth/logout', { token: adminToken }).catch(() => {});
  }
  const pub = await call('GET', '/public/services');
  const price = pub.items[0]?.price;
  log(`Public hizmet fiyatı: ${price ? price.amount_minor / 100 + ' ' + price.currency : 'yok'}`);
  console.log(`✓ Demo hazır. Guru girişi: http://localhost:3000/demo/giris-danisman.html (${GURU_EMAIL})`);
}

main().catch(error => fail(`${error.message}${error.status ? ' (HTTP ' + error.status + (error.code ? ', ' + error.code : '') + ')' : ''}`));
