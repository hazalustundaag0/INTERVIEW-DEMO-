#!/usr/bin/env node
// verify-85.mjs — Yönetici paneli (85) uçtan uca doğrulaması, GERÇEK API'ye karşı. Sahibi: 85 Yönetici Panel UI.
//
// Ne yapar (her koşu kendi qa85_* test verisini oluşturur; mevcut etkin sürümleri DEĞİŞTİRMEZ):
//   1. Statik: mock dosyaları silinmiş (yonetici-veri.js, yonetici-ayar.js), MOD/YoneticiVeri kalıntısı yok,
//      11 sayfa config.js'i yonetici-api.js'ten önce yüklüyor, localStorage yazımı yok, gate/api-client yüklenmiyor.
//   2. Rol: tokensız 401 · admin hesabı client_type=candidate 403 · guru token'ı ile admin ucu 403 · admin girişi.
//   3. Her ekranın okuma uçları (48 uçluk tablodaki tüm GET'ler) + GET /admin/gurus sayfalama/filtreleri.
//   4. Yazma turu: guru ekle + davet + profil · hesap pasif/aktif + logout-all · profil alanı + seçenek ·
//      soru seti yeni sürüm (copy_from) + soru CRUD + yayınla (activate=false) · takip kuralı ·
//      istem yeni sürüm (kural seti/parametre korunuyor mu, GAP-Y03) + adım CRUD + boş kural seti → 422 + yayınla ·
//      hizmet + seans şablonu + iki fiyat kuralı (GAP-Y04 geçerli fiyat) · ödeme/YZ/denetim listeleri · çıkış.
//   5. DOM duman testi (jsdom varsa): giriş formu → sessionStorage idToken.admin/idUser.admin, eski localStorage
//      anahtarları silinir; 10 sayfa hatasız çizilir; XSS metni düz metin; Y.onay HTML yorumlamaz; rol reddi,
//      süresi dolmuş oturum, 401 ve çıkış giriş sayfasına döner.
//
// Çalıştırma (PowerShell):  $env:ADMIN_PASSWORD='…'; node scripts/verify-85.mjs
// Ortam: API_BASE_URL (http://127.0.0.1:8090/api/v1), ADMIN_EMAIL (admin@example.test), ADMIN_PASSWORD (zorunlu),
//        DEMO_GURU_EMAIL / DEMO_GURU_PASSWORD (rol reddi için; vars. verify-83 ile aynı yerel seed parolası),
//        JSDOM_NODE_MODULES (jsdom@16 içeren node_modules; yoksa DOM adımı atlanır, SKIP=0 olmaz → uyarı).
// Parola/token ekrana yazılmaz. Her istek Origin: http://localhost:3000 ile gider ve CORS yanıtı denetlenir (K59).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const DEMO = path.join(FRONTEND, 'demo');
const API = (process.env.API_BASE_URL || 'http://127.0.0.1:8090/api/v1').replace(/\/+$/, '');
const ORIGIN = 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GURU_EMAIL = process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || 'Yerel-Danisman-2026!';
const JROOT = (process.env.JSDOM_NODE_MODULES || 'C:/Users/RESUL/.vscode/extensions/bianxianyang.htmlplay-0.0.10/node_modules').replace(/[\/]?$/, '/');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let passed = 0, failed = 0, skipped = 0;
function check(name, ok, detail) {
  if (ok) passed += 1; else failed += 1;
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail !== undefined && detail !== '' ? '  — ' + detail : ''));
  return ok;
}
function skip(name, why) { skipped += 1; console.log('  - ' + name + '  (atlandı: ' + why + ')'); }
function section(t) { console.log('\n■ ' + t); }

async function raw(method, p, { token, body } = {}) {
  const h = { Origin: ORIGIN, Accept: 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(API + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let data = null;
  try { data = t ? JSON.parse(t) : null; } catch { data = t; }
  return { status: r.status, data, cors: r.headers.get('access-control-allow-origin') };
}

const SAYFALAR = ['panel', 'kullanicilar', 'gurular', 'profil-formu', 'soru-setleri', 'kurallar', 'hizmetler', 'odemeler', 'yz-kullanim', 'denetim'];

// ───────────────────────────── 1. Statik ─────────────────────────────
function statik() {
  section('1. Statik kontroller (K70 mock kaldırma, K71 oturum)');
  check('yonetici-veri.js silinmiş', !fs.existsSync(path.join(DEMO, 'yonetici-veri.js')));
  check('yonetici-ayar.js silinmiş', !fs.existsSync(path.join(DEMO, 'yonetici-ayar.js')));
  const dosyalar = fs.readdirSync(DEMO).filter(f => /^(yonetici.*\.(js|html)|giris-yonetici\.html)$/.test(f));
  const hepsi = dosyalar.map(f => [f, fs.readFileSync(path.join(DEMO, f), 'utf8')]);
  const kalinti = hepsi.filter(([, s]) => /YoneticiVeri|YONETICI_API_AYAR|yonetici-veri\.js|yonetici-ayar\.js|\bMOD\b|demo-ipucu|idt_mock_/.test(s)).map(([f]) => f);
  check('MOD / YoneticiVeri / mock kalıntısı yok (grep 0)', kalinti.length === 0, kalinti.join(', '));
  const lsYaz = hepsi.filter(([, s]) => /localStorage\.setItem|localStorage\[/.test(s)).map(([f]) => f);
  check('yönetici dosyalarında localStorage yazımı yok', lsYaz.length === 0, lsYaz.join(', '));
  const html = ['giris-yonetici.html', ...SAYFALAR.map(s => `yonetici-${s}.html`)];
  const sira = html.filter(f => {
    const s = fs.readFileSync(path.join(DEMO, f), 'utf8');
    const c = s.indexOf('<script src="config.js">'), a = s.indexOf('<script src="yonetici-api.js">');
    return !(c > -1 && a > c) || /gate\.js|api-client\.js/.test(s);
  });
  check('11 HTML: config.js → yonetici-api.js sırası, gate/api-client yok', sira.length === 0, sira.join(', '));
  const api = fs.readFileSync(path.join(DEMO, 'yonetici-api.js'), 'utf8');
  check('oturum anahtarları idToken.admin / idUser.admin, sessionStorage', /'idToken\.admin'/.test(api) && /'idUser\.admin'/.test(api) && /sessionStorage/.test(api));
  check('taban adres APP_CONFIG.apiBaseUrl, 8080 yok', /APP_CONFIG/.test(api) && !/8080/.test(hepsi.map(x => x[1]).join('')));
  check('zaman aşımı (AbortController) + request_id', /AbortController/.test(api) && /request_id/.test(api));
  const gate = fs.readFileSync(path.join(DEMO, 'gate.js'), 'utf8');
  check('gate.js eski anahtar listesinde demoYoneticiOturum + yoneticiDemoVeri (GAP-Y12)', /'demoYoneticiOturum'/.test(gate) && /'yoneticiDemoVeri'/.test(gate));
  const md = fs.readFileSync(path.join(DEMO, 'YONETICI-PANELI.md'), 'utf8');
  check('YONETICI-PANELI.md güncel (:3000, mock/3002 anlatımı yok)', /localhost:3000/.test(md) && !/3002|YoneticiVeri|MOD: 'api'/.test(md));
}

// ───────────────────────────── 2–4. API ─────────────────────────────
const ctx = {};

async function rol() {
  section('2. Giriş ve rol ayrımı');
  let r = await raw('GET', '/admin/users');
  check('tokensız GET /admin/users → 401', r.status === 401, r.status);
  r = await raw('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, client_type: 'candidate' } });
  check('admin hesabı client_type=candidate → 403', r.status === 403, r.status + ' ' + (r.data && r.data.code));
  r = await raw('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: 'yanlis-parola-85-xx', client_type: 'admin' } });
  check('yanlış parola → 401 invalid_credentials', r.status === 401 && r.data.code === 'invalid_credentials', r.status + ' ' + (r.data && r.data.code));
  r = await raw('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, client_type: 'admin', device_info: 'verify-85' } });
  if (!check('admin girişi (client_type=admin) 200, rol admin, CORS', r.status === 200 && r.data.user.role === 'admin' && r.cors === ORIGIN, r.status)) throw new Error('admin girişi yok');
  ctx.T = r.data.token; ctx.login = r.data;
  r = await raw('GET', '/auth/me', { token: ctx.T });
  check('GET /auth/me → admin, client_type=admin', r.status === 200 && r.data.user.role === 'admin' && r.data.client_type === 'admin', r.status);
  r = await raw('POST', '/auth/login', { body: { email: GURU_EMAIL, password: GURU_PASSWORD, client_type: 'guru' } });
  if (r.status === 200) {
    ctx.guruToken = r.data.token; ctx.guruLogin = r.data;
    const a = await raw('GET', '/admin/users', { token: ctx.guruToken });
    check('guru token\'ı ile GET /admin/users → 403', a.status === 403, a.status);
    const b = await raw('GET', '/admin/gurus', { token: ctx.guruToken });
    check('guru token\'ı ile GET /admin/gurus → 403', b.status === 403, b.status);
    const c = await raw('POST', '/auth/login', { body: { email: GURU_EMAIL, password: GURU_PASSWORD, client_type: 'admin' } });
    check('guru hesabı client_type=admin → 403', c.status === 403, c.status + ' ' + (c.data && c.data.code));
  } else {
    skip('guru token\'ı ile admin uçları', 'DEMO_GURU_PASSWORD ile giriş ' + r.status);
  }
}

async function okumalar() {
  section('3. Ekranların okuma uçları');
  const T = ctx.T;
  const get = p => raw('GET', p, { token: T });
  const ok = async (ad, p, f) => { const r = await get(p); check(ad + ' → 200', r.status === 200 && (!f || f(r.data)), r.status); return r.data; };

  const users = await ok('Genel bakış/Kullanıcılar: GET /admin/users', '/admin/users?limit=100', d => Array.isArray(d.items));
  ctx.users = users.items;
  await ok('Ödemeler: GET /admin/users?role=candidate', '/admin/users?role=candidate&limit=5', d => d.items.every(u => u.role === 'candidate'));
  const pays = await ok('Genel bakış/Ödemeler: GET /admin/payments', '/admin/payments?limit=100', d => Array.isArray(d.items));
  await ok('Ödemeler filtresi: ?status=PAID', '/admin/payments?status=PAID&limit=5', d => d.items.every(p => p.status === 'PAID'));
  if (pays.items[0]) await ok('Ödeme detayı: GET /admin/payments/{id}', '/admin/payments/' + pays.items[0].id, d => d.payment && Array.isArray(d.attempts));
  else skip('Ödeme detayı', 'ödeme yok');
  const from = new Date(Date.now() - 30 * 864e5).toISOString(), to = new Date().toISOString();
  await ok('YZ: GET /admin/ai-costs', '/admin/ai-costs?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), d => Array.isArray(d.items));
  await ok('YZ: GET /admin/ai-requests', '/admin/ai-requests?limit=5&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), d => Array.isArray(d.items));
  await ok('YZ: GET /admin/ai-requests?request_type=story_generation', '/admin/ai-requests?limit=5&request_type=story_generation', d => Array.isArray(d.items));
  await ok('Denetim: GET /admin/audit-logs', '/admin/audit-logs?limit=6', d => Array.isArray(d.items) && 'next_cursor' in d);
  await ok('Denetim filtresi: action=auth.login', '/admin/audit-logs?limit=5&action=auth.login', d => d.items.every(a => a.action === 'auth.login'));
  await ok('Gurular: GET /public/sectors', '/public/sectors', d => d.items.length > 0);
  await ok('Profil formu: GET /admin/profile-fields', '/admin/profile-fields', d => Array.isArray(d.items));
  const qs = await ok('Soru setleri: GET /admin/question-sets', '/admin/question-sets', d => d.items.length > 0);
  ctx.qsActive = qs.items.find(s => s.is_active) || qs.items[0];
  await ok('Soru seti detayı: GET /admin/question-sets/{id}', '/admin/question-sets/' + ctx.qsActive.id, d => d.question_set && d.questions.length > 0);
  await ok('Kurallar: GET /admin/follow-up-rules', '/admin/follow-up-rules', d => Array.isArray(d.items));
  const pcs = await ok('İstem: GET /admin/prompt-configs', '/admin/prompt-configs', d => d.items.length > 0);
  ctx.pcActive = pcs.items.find(c => c.is_active) || pcs.items[0];
  check('İstem listesi steps:[] döner (GAP-Y02 gerekçesi)', pcs.items.every(c => Array.isArray(c.steps) && c.steps.length === 0));
  const det = await ok('İstem detayı: GET /admin/prompt-configs/{id} (K75)', '/admin/prompt-configs/' + ctx.pcActive.id, d => d.steps.length > 0);
  ctx.pcActiveDetail = det;
  const svcs = await ok('Hizmetler: GET /admin/services', '/admin/services', d => d.items.length > 0);
  await ok('Hizmet şablonları: GET /admin/services/{id}/templates', '/admin/services/' + svcs.items[0].id + '/templates', d => Array.isArray(d.items));
  await ok('Hizmet fiyatları: GET /admin/services/{id}/prices', '/admin/services/' + svcs.items[0].id + '/prices', d => Array.isArray(d.items));

  // GET /admin/gurus sözleşmesi
  const g = await ok('Gurular: GET /admin/gurus', '/admin/gurus', d => Array.isArray(d.items) && 'next_cursor' in d);
  const a = g.items[0] && g.items[0].account;
  check('AdminGuru.account {email,status,email_verified_at,password_set,last_login_at}', !!a && ['email', 'status', 'email_verified_at', 'password_set', 'last_login_at'].every(k => k in a));
  const yasak = JSON.stringify(g).match(/password_hash|cv_|answer|story_text|draft/i);
  check('Guru listesinde CV/cevap/hikâye/parola özeti yok', !yasak, yasak && yasak[0]);
  const p1 = await get('/admin/gurus?limit=1');
  if (p1.data.next_cursor) {
    const p2 = await get('/admin/gurus?limit=1&cursor=' + encodeURIComponent(p1.data.next_cursor));
    check('GET /admin/gurus imleçle sayfalama (panel api.hepsi)', p2.status === 200 && p2.data.items[0] && p2.data.items[0].id !== p1.data.items[0].id);
  } else skip('GET /admin/gurus imleç', 'tek guru');
  const f = await get('/admin/gurus?is_active=true&account_status=active');
  check('filtre is_active=true&account_status=active', f.status === 200 && f.data.items.every(x => x.is_active && x.account.status === 'active'));
  const bad = await get('/admin/gurus?is_active=belki');
  check('geçersiz filtre → 422 fields.is_active', bad.status === 422 && bad.data.fields && 'is_active' in bad.data.fields, bad.status);
}

async function yazmalar() {
  section('4. Yazma turu (qa85_* test verisi)');
  const T = ctx.T, S = Date.now().toString(36);
  const req = (m, p, body) => raw(m, p, { token: T, body });

  // — Gurular —
  const sectors = (await raw('GET', '/public/sectors')).data.items;
  const email = `qa85+${S}@gurus.example.test`;
  const XSS = '<img src=x onerror="window.__xss=1">Unvan';
  let r = await req('POST', '/admin/gurus', { first_name: 'Qa', last_name: 'Seksenbes', email, language: 'tr', title: XSS, expertise_area: 'qa85_' + S, seniority: '3 yıl', short_bio: null, is_active: false, sector_ids: [sectors[0].id] });
  check('Guru ekle: POST /admin/gurus → 201 + invitation_sent', r.status === 201 && r.data.guru && r.data.user && r.data.invitation_sent === true, r.status + ' ' + JSON.stringify(r.data).slice(0, 160));
  const guruId = r.data.guru && r.data.guru.id, userId = r.data.user && r.data.user.id;
  ctx.qaGuru = { guruId, userId, email, XSS };
  r = await req('POST', '/admin/gurus', { first_name: 'Qa', last_name: 'Iki', email, language: 'tr', title: 't', expertise_area: 'e', seniority: null, short_bio: null, is_active: false, sector_ids: [] });
  check('aynı e-posta → 409 email_taken', r.status === 409 && r.data.code === 'email_taken', r.status + ' ' + (r.data && r.data.code));
  r = await req('GET', '/admin/gurus?q=' + encodeURIComponent(email));
  const row = r.data.items && r.data.items.find(x => x.id === guruId);
  check('yeni guru listede (q filtresi), account.password_set=false (Davet bekliyor), user_id eşleşiyor', !!row && row.account.password_set === false && row.account.email === email && row.user_id === userId);
  r = await req('POST', '/admin/gurus/' + userId + '/invitation');
  check('Daveti yeniden gönder: POST /admin/gurus/{user_id}/invitation → 202', r.status === 202, r.status);
  r = await req('PUT', '/admin/gurus/' + guruId, { title: XSS, expertise_area: 'qa85_' + S, seniority: '4 yıl', short_bio: 'qa85 biyografi', is_active: false, sector_ids: [sectors[0].id, sectors[1] ? sectors[1].id : sectors[0].id] });
  check('Guru profili: PUT /admin/gurus/{guruID} → 200', r.status === 200 && r.data.seniority === '4 yıl', r.status);
  // — Kullanıcılar —
  r = await req('PATCH', '/admin/users/' + userId + '/status', { status: 'passive' });
  check('Hesabı pasife al: PATCH /admin/users/{id}/status → passive', r.status === 200 && r.data.status === 'passive', r.status);
  r = await req('GET', '/admin/gurus?account_status=passive&q=' + encodeURIComponent(email));
  check('/admin/gurus account_status=passive yeni guruyu içeriyor', r.status === 200 && r.data.items.some(x => x.id === guruId));
  r = await req('PATCH', '/admin/users/' + userId + '/status', { status: 'active' });
  check('Hesabı aktif yap → active', r.status === 200 && r.data.status === 'active', r.status);
  r = await req('POST', '/admin/users/' + userId + '/logout-all');
  check('Tüm oturumları kapat: POST /admin/users/{id}/logout-all', r.status === 200 && 'revoked_tokens' in r.data, r.status);
  r = await req('PATCH', '/admin/users/' + ctx.login.user.id + '/status', { status: 'passive' });
  check('kendi hesabını pasife alma → 409 cannot_deactivate_self', r.status === 409, r.status + ' ' + (r.data && r.data.code));

  // — Profil formu —
  r = await req('POST', '/admin/profile-fields', { field_key: 'qa85_' + S, label: 'QA85 alanı ' + S, help_text: null, field_type: 'single_choice', maps_to_column: null, allows_free_text: false, is_required: false, sort_order: 990, is_active: false });
  check('Profil alanı ekle: POST /admin/profile-fields → 201', r.status === 201, r.status + ' ' + JSON.stringify(r.data).slice(0, 160));
  const field = r.data;
  if (field && field.id) {
    r = await req('POST', '/admin/profile-fields/' + field.id + '/options', { value: 'qa85_a', label: 'QA A', sort_order: 10, is_active: true });
    check('Seçenek ekle: POST /admin/profile-fields/{id}/options → 201', r.status === 201, r.status);
    const opt = r.data;
    r = await req('PUT', '/admin/profile-field-options/' + opt.id, { value: opt.value, label: 'QA A2', sort_order: 10, is_active: false });
    check('Seçenek güncelle/pasife al: PUT /admin/profile-field-options/{id}', r.status === 200 && r.data.is_active === false, r.status);
    r = await req('PUT', '/admin/profile-fields/' + field.id, { field_key: field.field_key, label: field.label, help_text: 'qa', field_type: 'single_choice', maps_to_column: null, allows_free_text: false, is_required: false, sort_order: 991, is_active: false });
    check('Alan güncelle: PUT /admin/profile-fields/{id}', r.status === 200 && r.data.sort_order === 991, r.status);
    r = await req('POST', '/admin/profile-fields', { field_key: 'qa85_' + S, label: 'dup', help_text: null, field_type: 'free_text', maps_to_column: null, allows_free_text: false, is_required: false, sort_order: 992, is_active: false });
    check('yinelenen field_key → 409 already_exists', r.status === 409 && r.data.code === 'already_exists', r.status + ' ' + (r.data && r.data.code));
  }

  // — Soru setleri —
  const src = ctx.qsActive;
  r = await req('POST', '/admin/question-sets', { name: src.name, language: src.language, description: src.description || null, copy_from: src.id });
  check('Soru seti yeni sürüm: POST /admin/question-sets copy_from → 201, sorular kopyalandı', r.status === 201 && r.data.questions.length > 0 && r.data.question_set.version > src.version, r.status);
  const qsNew = r.data.question_set;
  check('yeni sürümde açıklama/dil korunuyor', qsNew && (qsNew.description || null) === (src.description || null) && qsNew.language === src.language);
  if (qsNew) {
    r = await req('PATCH', '/admin/question-sets/' + qsNew.id, { description: 'qa85 taslak ' + S });
    check('Açıklama: PATCH /admin/question-sets/{id}', r.status === 200 && r.data.description === 'qa85 taslak ' + S, r.status);
    const n = (await req('GET', '/admin/question-sets/' + qsNew.id)).data.questions.length;
    r = await req('POST', '/admin/question-sets/' + qsNew.id + '/questions', { sequence_no: n + 1, focus_key: 'qa85', focus_label: 'QA', question_text: 'QA85 geçici soru?', is_required: false });
    check('Soru ekle: POST …/questions → 201', r.status === 201, r.status + ' ' + JSON.stringify(r.data).slice(0, 120));
    const q = r.data;
    if (q && q.id) {
      r = await req('PUT', '/admin/questions/' + q.id, { sequence_no: q.sequence_no, focus_key: 'qa85', focus_label: 'QA', question_text: 'QA85 düzenlendi?', is_required: false });
      check('Soru güncelle: PUT /admin/questions/{id}', r.status === 200, r.status);
      r = await req('DELETE', '/admin/questions/' + q.id);
      check('Soru sil: DELETE /admin/questions/{id} → 204', r.status === 204, r.status);
    }
    r = await req('POST', '/admin/question-sets/' + qsNew.id + '/publish', { activate: false });
    check('Yayınla (activate=false): POST …/publish', r.status === 200 && !!r.data.published_at && r.data.is_active === false, r.status);
    r = await req('POST', '/admin/question-sets/' + qsNew.id + '/questions', { sequence_no: 99, focus_key: 'x', focus_label: 'x', question_text: 'x?', is_required: false });
    check('yayındaki sürüme soru ekleme → 409', r.status === 409, r.status + ' ' + (r.data && r.data.code));
    r = await req('POST', '/admin/question-sets/' + qsNew.id + '/deactivate');
    check('Devre dışı bırak (etkin olmayan sürüm): POST …/deactivate', r.status === 200 || r.status === 409, r.status);
  }

  // — Takip kuralı —
  r = await req('POST', '/admin/follow-up-rules', { rule_key: 'qa85_' + S, name: 'QA85 kuralı', trigger_definition: 'qa85 test tetikleyici', follow_up_template: 'QA85 takip?', priority: 990, is_active: false });
  check('Takip kuralı ekle (pasif): POST /admin/follow-up-rules → 201', r.status === 201, r.status);
  if (r.data && r.data.id) {
    const k = r.data;
    r = await req('PUT', '/admin/follow-up-rules/' + k.id, { rule_key: k.rule_key, name: 'QA85 kuralı 2', trigger_definition: k.trigger_definition, follow_up_template: k.follow_up_template, priority: 991, is_active: false });
    check('Takip kuralı güncelle: PUT /admin/follow-up-rules/{id}', r.status === 200 && r.data.priority === 991, r.status);
  }

  // — İstem zinciri (GAP-Y02/Y03, K74/K75) —
  const c = ctx.pcActiveDetail;
  const govde = { name: c.name, copy_from: c.id, description: c.description || null, rule_set: c.rule_set || '', parameters: c.parameters || {} };
  r = await req('POST', '/admin/prompt-configs', govde);
  check('İstem yeni sürüm (panel gövdesi: description+rule_set+parameters) → 201', r.status === 201, r.status);
  const pc = r.data;
  const esit = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  check('GAP-Y03: yeni taslağın rule_set kaynakla aynı', pc.rule_set === c.rule_set && pc.rule_set.length > 0, (pc.rule_set || '').length + '/' + (c.rule_set || '').length);
  check('GAP-Y03: parameters kaynakla aynı', esit(pc.parameters, c.parameters));
  check('GAP-Y03: description kaynakla aynı', (pc.description || null) === (c.description || null));
  r = await req('GET', '/admin/prompt-configs/' + pc.id);
  check('GAP-Y02: taslak detayında adımlar kopyalandı', r.status === 200 && r.data.steps.length === c.steps.length, r.data.steps.length + '/' + c.steps.length);
  // 60 sunucu güvencesi: yalnız {name, copy_from} de kuralları korumalı.
  r = await req('POST', '/admin/prompt-configs', { name: c.name, copy_from: c.id });
  const pc2 = r.data;
  check('60 güvencesi: {name, copy_from} → rule_set/parameters kaynaktan kopyalandı', r.status === 201 && pc2.rule_set === c.rule_set && esit(pc2.parameters, c.parameters), r.status);
  // Adım CRUD (taslakta)
  const maxNo = c.steps.reduce((m, s) => Math.max(m, s.step_no), 0);
  r = await req('POST', '/admin/prompt-configs/' + pc.id + '/steps', { step_no: maxNo + 1, step_key: 'qa85_' + S, title: 'QA85 adımı', prompt_text: 'QA85 istem metni' });
  check('Adım ekle: POST /admin/prompt-configs/{id}/steps → 201', r.status === 201, r.status);
  const st = r.data;
  if (st && st.id) {
    r = await req('PUT', '/admin/prompt-steps/' + st.id, { step_no: st.step_no, step_key: st.step_key, title: 'QA85 adımı 2', prompt_text: 'QA85 istem metni 2' });
    check('Adım güncelle: PUT /admin/prompt-steps/{id}', r.status === 200, r.status);
    r = await req('DELETE', '/admin/prompt-configs/' + pc.id + '/steps/' + st.id);
    check('Adım sil: DELETE /admin/prompt-configs/{cid}/steps/{sid} → 204', r.status === 204, r.status);
  }
  r = await req('PUT', '/admin/prompt-configs/' + pc.id, { name: pc.name, description: 'qa85 taslak ' + S, rule_set: pc.rule_set, parameters: pc.parameters });
  check('Kurallar ve parametreler: PUT /admin/prompt-configs/{id}', r.status === 200 && r.data.description === 'qa85 taslak ' + S, r.status);
  // Boş kural seti → publish 422 (BR-01, 60)
  if (pc2 && pc2.id) {
    r = await req('PUT', '/admin/prompt-configs/' + pc2.id, { name: pc2.name, description: pc2.description, rule_set: '', parameters: pc2.parameters });
    check('taslağın kural setini boşalt (PUT) → 200', r.status === 200 && r.data.rule_set === '', r.status);
    r = await req('POST', '/admin/prompt-configs/' + pc2.id + '/publish', { activate: false });
    check('boş rule_set ile publish → 422 validation_failed, fields.rule_set', r.status === 422 && r.data.code === 'validation_failed' && r.data.fields && 'rule_set' in r.data.fields, r.status + ' ' + JSON.stringify(r.data).slice(0, 200));
    ctx.emptyDraft = pc2.id;
  }
  r = await req('POST', '/admin/prompt-configs/' + pc.id + '/publish', { activate: false });
  check('İstem yayınla (activate=false): POST …/publish → 200', r.status === 200 && !!r.data.published_at && !r.data.is_active, r.status);
  r = await req('PUT', '/admin/prompt-configs/' + pc.id, { name: pc.name, description: 'qa85 taslak ' + S, rule_set: pc.rule_set + ' qa85 ek kural', parameters: pc.parameters });
  check('yayındaki istemin kural seti değiştirilemez → 409', r.status === 409, r.status + ' ' + (r.data && r.data.code));
  r = await req('POST', '/admin/prompt-configs/' + pc.id + '/deactivate');
  check('Devre dışı bırak (etkin olmayan sürüm): POST …/deactivate', r.status === 200 || r.status === 409, r.status);
  r = await req('GET', '/admin/prompt-configs/' + ctx.pcActive.id);
  check('etkin istem sürümü değişmedi', r.status === 200 && r.data.is_active === true);

  // — Hizmet + fiyat (GAP-Y04) —
  r = await req('POST', '/admin/services', { code: 'qa85_' + S, name: 'QA85 hizmeti ' + S, description: null, session_count: 1, session_duration_minutes: 50, is_active: false, sort_order: 990 });
  check('Hizmet ekle (kapalı): POST /admin/services → 201', r.status === 201, r.status);
  const svc = r.data;
  ctx.qaService = svc;
  if (svc && svc.id) {
    r = await req('PUT', '/admin/services/' + svc.id, { code: svc.code, name: svc.name, description: 'qa85', session_count: 1, session_duration_minutes: 45, is_active: false, sort_order: 990 });
    check('Hizmet güncelle: PUT /admin/services/{id}', r.status === 200 && r.data.session_duration_minutes === 45, r.status);
    r = await req('POST', '/admin/services/' + svc.id + '/templates', { sequence_no: 1, title: 'QA85 seansı', purpose: 'qa amaç', output_definition: 'qa çıktı' });
    check('Seans şablonu ekle: POST …/templates → 201', r.status === 201, r.status);
    if (r.data && r.data.id) {
      const t = r.data;
      r = await req('PUT', '/admin/session-templates/' + t.id, { sequence_no: 1, title: 'QA85 seansı 2', purpose: t.purpose, output_definition: t.output_definition });
      check('Seans şablonu güncelle: PUT /admin/session-templates/{id}', r.status === 200, r.status);
    }
    const eski = new Date(Date.now() - 2 * 864e5).toISOString(), yeni = new Date(Date.now() - 3600e3).toISOString();
    r = await req('POST', '/admin/services/' + svc.id + '/prices', { amount_minor: 100000, currency: 'TRY', valid_from: eski, valid_until: null, note: 'qa85 eski' });
    check('Fiyat ekle (eski): POST …/prices → 201', r.status === 201, r.status);
    r = await req('POST', '/admin/services/' + svc.id + '/prices', { amount_minor: 120000, currency: 'TRY', valid_from: yeni, valid_until: null, note: 'qa85 yeni' });
    check('Fiyat ekle (yeni): POST …/prices → 201', r.status === 201, r.status);
    r = await req('POST', '/admin/services/' + svc.id + '/prices', { amount_minor: 1, currency: 'TRY', valid_from: yeni, valid_until: null, note: 'dup' });
    check('aynı valid_from → 409 already_exists', r.status === 409, r.status + ' ' + (r.data && r.data.code));
    r = await req('GET', '/admin/services/' + svc.id + '/prices');
    const simdi = new Date().toISOString();
    const gecerli = r.data.items.filter(p => p.valid_from <= simdi && (!p.valid_until || p.valid_until > simdi)).sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
    const acik = r.data.items.filter(p => !p.valid_until).length;
    check('GAP-Y04: backend eski kuralı kapatmıyor (2 açık kural), geçerli = en yeni (1.200 TRY)', acik === 2 && gecerli && gecerli.amount_minor === 120000, 'açık=' + acik);
  }

  // — Denetim izi —
  r = await req('GET', '/admin/audit-logs?limit=50&action=prompt_config.changed');
  check('Denetim: prompt_config.changed kayıtları var', r.status === 200 && r.data.items.length > 0);
  r = await req('GET', '/admin/audit-logs?limit=5&actor_user_id=' + ctx.login.user.id + '&entity_type=users');
  check('Denetim filtresi: actor_user_id + entity_type', r.status === 200 && r.data.items.every(a => a.entity_type === 'users'), r.status);
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {});
  return v;
}

// ───────────────────────────── 5. DOM ─────────────────────────────
async function dom() {
  section('5. DOM duman testi (jsdom, gerçek API)');
  let jsdom;
  try {
    const require = createRequire(import.meta.url);
    const navModule = require(JROOT + 'jsdom/lib/jsdom/living/window/navigation.js');
    const whatwgURL = require(JROOT + 'whatwg-url');
    navModule.navigate = (window, newURL) => { (window.__navs || (window.__navs = [])).push(whatwgURL.serializeURL(newURL)); };
    jsdom = require(JROOT + 'jsdom');
  } catch (e) {
    skip('DOM duman testi', 'jsdom bulunamadı (JSDOM_NODE_MODULES)');
    return;
  }
  const { JSDOM, ResourceLoader, VirtualConsole } = jsdom;
  class Loader extends ResourceLoader {
    fetch(url) {
      if (url.startsWith(ORIGIN + '/')) return Promise.resolve(fs.readFileSync(path.join(FRONTEND, decodeURIComponent(new URL(url).pathname))));
      return Promise.resolve(Buffer.from(''));
    }
  }
  const istekler = [];
  async function open(page, { session, local, wait = 4000, until } = {}) {
    const html = fs.readFileSync(path.join(DEMO, page.split('?')[0]), 'utf8');
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { const m = String(e.message || e); if (!/Could not parse CSS/.test(m)) errors.push(m.slice(0, 300)); });
    vc.on('error', e => errors.push(String(e && e.message || e).slice(0, 200)));
    const dm = new JSDOM(html, {
      url: ORIGIN + '/demo/' + page, runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) {
        w.fetch = (input, init = {}) => {
          const headers = new Headers(init.headers || {});
          headers.set('Origin', ORIGIN);
          istekler.push((init.method || 'GET') + ' ' + String(input).replace(API, ''));
          const { signal, ...rest } = init; // jsdom AbortSignal ≠ Node AbortSignal
          return fetch(input, { ...rest, headers });
        };
        Object.assign(w, { Headers, Request, Response });
        w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
        w.confirm = () => { throw new Error('window.confirm kullanılmamalı'); };
        w.alert = () => {}; w.scrollTo = () => {};
        for (const [k, v] of Object.entries(local || {})) w.localStorage.setItem(k, v);
        for (const [k, v] of Object.entries(session || {})) w.sessionStorage.setItem(k, v);
      }
    });
    const w = dm.window;
    const start = Date.now();
    while (Date.now() - start < wait) { await sleep(150); if (until && until(w.document, w)) break; }
    await sleep(250);
    return { w, d: w.document, errors, navs: () => w.__navs || [], close: () => w.close() };
  }
  const txt = (el) => (el && el.textContent || '').replace(/\s+/g, ' ').trim();

  // Giriş sayfası
  let p = await open('giris-yonetici.html', { local: { demoYoneticiOturum: '{"token":"idt_eski"}', yoneticiDemoVeri: '{}' }, wait: 800 });
  check('giriş: eski localStorage anahtarları silindi (demoYoneticiOturum, yoneticiDemoVeri)', p.w.localStorage.getItem('demoYoneticiOturum') === null && p.w.localStorage.getItem('yoneticiDemoVeri') === null);
  check('giriş: demo ipucu yok', !p.d.getElementById('demo-ipucu'));
  const form = p.d.getElementById('giris-formu');
  // jsdom 16 form adlı erişimini (form.eposta) desteklemez; tarayıcı davranışı yalnız testte taklit edilir.
  for (const n of ['eposta', 'sifre']) Object.defineProperty(form, n, { configurable: true, get: () => form.querySelector('[name="' + n + '"]') });
  form.querySelector('#eposta').value = ADMIN_EMAIL;
  form.querySelector('#sifre').value = 'yanlis-parola-85-dom';
  form.dispatchEvent(new p.w.Event('submit', { cancelable: true }));
  for (let i = 0; i < 40 && p.d.getElementById('giris-hata').hidden; i++) await sleep(100);
  check('giriş: yanlış parolada hata metni gösterilir, oturum yok', !p.d.getElementById('giris-hata').hidden && !p.w.sessionStorage.getItem('idToken.admin'), txt(p.d.getElementById('giris-hata')) || p.errors.join(' | '));
  form.querySelector('#sifre').value = ADMIN_PASSWORD;
  form.querySelector('button[type=submit]').disabled = false;
  form.dispatchEvent(new p.w.Event('submit', { cancelable: true }));
  for (let i = 0; i < 50 && !p.navs().length; i++) await sleep(100);
  const tok = p.w.sessionStorage.getItem('idToken.admin');
  let usr = null; try { usr = JSON.parse(p.w.sessionStorage.getItem('idUser.admin')); } catch { usr = null; }
  check('giriş: sessionStorage idToken.admin + idUser.admin (role/client_type admin, expires_at, e-posta yok)', !!tok && usr && usr.role === 'admin' && usr.client_type === 'admin' && !!usr.expires_at && !('email' in usr));
  check('giriş: localStorage boş (token yazılmadı)', p.w.localStorage.length === 0, String(p.w.localStorage.length));
  check('giriş: yonetici-panel.html\'e yönlendi', /yonetici-panel\.html$/.test(p.navs().pop() || ''), (p.navs() || []).join(','));
  p.close();
  if (!tok) return;
  const session = { 'idToken.admin': tok, 'idUser.admin': JSON.stringify(usr) };

  // 10 sayfa
  for (const s of SAYFALAR) {
    const pg = s === 'kurallar' ? 'yonetici-kurallar.html?sekme=istem' : s === 'hizmetler' && ctx.qaService ? 'yonetici-hizmetler.html?hizmet=' + ctx.qaService.id : `yonetici-${s}.html`;
    p = await open(pg, { session, wait: 8000, until: d => d.querySelector('[data-icerik]') && !/Yükleniyor…/.test(txt(d.querySelector('[data-icerik]'))) && (s !== 'kurallar' || /adım/.test(txt(d.querySelector('[data-icerik]')))) });
    const icerik = txt(p.d.querySelector('[data-icerik]'));
    const ok = !!p.d.querySelector('.adm-shell') && icerik && !/Veriler yüklenemedi|Yükleniyor…/.test(icerik) && !p.navs().length && p.errors.length === 0;
    check(`sayfa ${s}: hatasız çizildi, yönlendirme yok`, ok, (p.errors[0] || p.navs()[0] || (ok ? '' : icerik.slice(0, 120))));
    const ep = txt(p.d.querySelector('.adm-user [data-eposta]'));
    if (s === 'panel') check('yan menü e-postası GET /auth/me\'den', ep === ADMIN_EMAIL, ep);
    if (s === 'gurular') {
      const tablo = p.d.querySelector('[data-tablo]');
      check('gurular: GET /admin/gurus satırları + account e-postası', /@/.test(txt(tablo)) && tablo.querySelectorAll('tbody tr').length > 0);
      check('gurular: yedek mod uyarısı ([data-uyari]) yok', !p.d.querySelector('[data-uyari]'));
      if (ctx.qaGuru) {
        check('gurular XSS: unvandaki <img onerror> düz metin (img yok, __xss yok)', !tablo.querySelector('img') && !p.w.__xss && txt(tablo).includes('<img src=x'));
        const dav = tablo.querySelector('[data-davet="' + ctx.qaGuru.userId + '"]');
        check('gurular: davet bekleyen guruda "Daveti yeniden gönder" data-davet=user_id', !!dav);
      }
    }
    if (s === 'kurallar') {
      const adim = /(\d+) adım/.exec(icerik);
      check('kurallar/istem: seçili sürüm adımları detay ucundan (GAP-Y02)', adim && Number(adim[1]) > 0 && p.d.querySelectorAll('[data-panel] .adm-list li').length === Number(adim[1]), adim && adim[0]);
      check('kurallar/istem: GET /admin/prompt-configs/{id} çağrıldı', istekler.some(x => /^GET \/admin\/prompt-configs\/[0-9a-f-]{36}$/.test(x)));
      // Boş kural setli taslağı seç → yayınla butonu istemci tarafında engellenir (sunucu 422'den önce)
      if (ctx.emptyDraft) {
        const b = p.d.querySelector('[data-config="' + ctx.emptyDraft + '"]');
        if (b) {
          b.click();
          for (let i = 0; i < 40 && !p.d.querySelector('[data-istem="yayinla"]'); i++) await sleep(100);
          const y = p.d.querySelector('[data-istem="yayinla"]');
          if (y) {
            y.click(); await sleep(200);
            const toast = txt(p.d.querySelector('.adm-toasts'));
            check('kurallar: boş kural setli taslakta yayınla → anlamlı uyarı, onay açılmaz', /kuralları boş/.test(toast) && !p.d.querySelector('.adm-modal'), toast);
          } else check('kurallar: boş taslak seçildi', false, 'yayınla butonu yok');
        } else skip('boş kural setli taslak', 'listede yok');
      }
      // Y.onay mesajı HTML olarak yorumlanmaz (GAP-Y14)
      p.w.Yonetici.onay('Deneme', '<b id="xss85">kalın</b>', 'Tamam');
      await sleep(100);
      const m = p.d.querySelector('.adm-modal [data-onay-mesaj]');
      check('Y.onay: dize mesaj düz metin (GAP-Y14)', m && !m.querySelector('#xss85') && txt(m).includes('<b id="xss85">'));
      p.d.querySelector('.adm-modal [data-kapat]').click();
      p.w.Yonetici.onay('Deneme', [p.w.Yonetici.vurgu('<i>ad</i>'), ' metin'], 'Tamam');
      await sleep(100);
      const m2 = p.d.querySelector('.adm-modal [data-onay-mesaj]');
      check('Y.onay: vurgu parçası <b> + textContent', m2 && m2.querySelector('b') && !m2.querySelector('i') && txt(m2.querySelector('b')) === '<i>ad</i>');
    }
    if (s === 'hizmetler' && ctx.qaService) {
      const rozetler = Array.from(p.d.querySelectorAll('[data-detay] .adm-badge')).map(txt);
      check('hizmetler: fiyat rozetleri Geçerli + Yerini aldı (GAP-Y04)', rozetler.filter(x => x === 'Geçerli').length === 1 && rozetler.includes('Yerini aldı'), rozetler.join(','));
    }
    p.close();
  }

  // Rol reddi: guru oturumu idToken.admin'e konsa bile
  if (ctx.guruLogin) {
    const gu = ctx.guruLogin.user;
    p = await open('yonetici-panel.html', { session: { 'idToken.admin': ctx.guruToken, 'idUser.admin': JSON.stringify({ id: gu.id, first_name: gu.first_name, last_name: gu.last_name, role: 'guru', client_type: 'guru', expires_at: ctx.guruLogin.expires_at }) }, wait: 1500, until: (d, w) => (w.__navs || []).length });
    check('rol: guru oturumu → giriş sayfası, anahtarlar silindi', /giris-yonetici\.html/.test(p.navs()[0] || '') && !p.w.sessionStorage.getItem('idToken.admin'), p.navs()[0]);
    p.close();
    p = await open('yonetici-panel.html', { session: { 'idToken.admin': ctx.guruToken, 'idUser.admin': JSON.stringify({ ...usr }) }, wait: 4000, until: (d, w) => (w.__navs || []).length });
    check('rol: sahte admin özeti + guru token → sunucu reddeder, giriş sayfası', /giris-yonetici\.html/.test(p.navs()[0] || '') && !p.w.sessionStorage.getItem('idToken.admin'), p.navs()[0]);
    p.close();
  } else skip('rol reddi (guru token)', 'guru girişi yok');
  p = await open('yonetici-gurular.html', { wait: 1000, until: (d, w) => (w.__navs || []).length });
  check('tokensız erişim → giris-yonetici.html?return=yonetici-gurular.html', /giris-yonetici\.html\?return=yonetici-gurular\.html$/.test(p.navs()[0] || ''), p.navs()[0]);
  p.close();
  p = await open('yonetici-panel.html', { session: { 'idToken.admin': tok, 'idUser.admin': JSON.stringify({ ...usr, expires_at: new Date(Date.now() - 1000).toISOString() }) }, wait: 1000, until: (d, w) => (w.__navs || []).length });
  check('süresi dolmuş oturum → giriş, anahtarlar silindi', /giris-yonetici\.html/.test(p.navs()[0] || '') && !p.w.sessionStorage.getItem('idToken.admin'));
  p.close();
  p = await open('yonetici-panel.html', { session: { 'idToken.admin': 'idt_gecersiz_85', 'idUser.admin': JSON.stringify(usr) }, wait: 4000, until: (d, w) => (w.__navs || []).length });
  check('401 (geçersiz token) → oturum silinir, giriş sayfası', /giris-yonetici\.html\?return=yonetici-panel\.html/.test(p.navs()[0] || '') && !p.w.sessionStorage.getItem('idToken.admin'), p.navs()[0]);
  p.close();

  // Çıkış
  p = await open('yonetici-panel.html', { session, wait: 6000, until: d => d.querySelector('[data-cikis]') });
  p.d.querySelector('[data-cikis]').click();
  for (let i = 0; i < 40 && !p.navs().length; i++) await sleep(100);
  check('çıkış: POST /auth/logout + anahtarlar silindi + giris-yonetici.html', istekler.includes('POST /auth/logout') && !p.w.sessionStorage.getItem('idToken.admin') && !p.w.sessionStorage.getItem('idUser.admin') && /giris-yonetici\.html$/.test(p.navs().pop() || ''));
  p.close();
  const r = await raw('GET', '/admin/users', { token: tok });
  check('çıkıştan sonra panel token\'ı → 401', r.status === 401, r.status);
}

async function cikis() {
  section('6. Çıkış (API)');
  let r = await raw('POST', '/auth/logout', { token: ctx.T });
  check('POST /auth/logout → 204', r.status === 204, r.status);
  r = await raw('GET', '/admin/users', { token: ctx.T });
  check('çıkış sonrası token → 401', r.status === 401, r.status);
  if (ctx.guruToken) await raw('POST', '/auth/logout', { token: ctx.guruToken });
}

async function main() {
  if (!ADMIN_PASSWORD) { console.error('ADMIN_PASSWORD ortam değişkeni gerekli.'); process.exit(2); }
  const h = await fetch(API.replace(/\/api\/v1$/, '') + '/healthz').catch(() => null);
  if (!h || !h.ok) { console.error('API ' + API + ' yanıt vermiyor (backend/scripts/dev.ps1 run).'); process.exit(2); }
  statik();
  await rol();
  await okumalar();
  await yazmalar();
  await dom();
  await cikis();
  console.log(`\nverify-85: ${passed} geçti / ${failed} kaldı / ${skipped} atlandı`);
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error('verify-85 hata:', e); process.exit(1); });
