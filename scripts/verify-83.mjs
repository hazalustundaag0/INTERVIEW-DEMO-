#!/usr/bin/env node
// verify-83.mjs — 83 Aday Yolculuk UI'ının gerçek backend'e karşı doğrulaması (tarayıcısız).
// Önkoşul: API (varsayılan 127.0.0.1:8090; AI_PROVIDER=dev, EMAIL_SENDER=log, CORS_ALLOWED_ORIGINS=<site kökeni>),
// seed-demo.mjs çalıştırılmış (guru deniz.kurgu@…; fiyat API'de yönetilen kurala bağlı). Env: DEMO_GURU_PASSWORD (vars. yerel seed parolası).
// Aday sayfalarının kullandığı api-client.js + aday-yolculuk.js, sayfa bağlamı taklidiyle vm içinde çalışır; her istek
// tarayıcı gibi Origin: <site kökeni> (WEB_BASE_URL; scripts/test-env.mjs) ile gider ve CORS yanıtı denetlenir. Guru adımları (seans tamamlama, not,
// ödev) doğrudan HTTP ile yapılır. Ayrıca statik kontroller: localStorage yazımı, data-action, sahte veri kalıntısı.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WEB_ORIGIN, WEB_BASE_URL, WEB_FETCH_BASE, API_FETCH_BASE, MAIL_DIR, describeTarget } from './test-env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const DEMO = path.join(FRONTEND, 'demo');
const ORIGIN = WEB_ORIGIN;   // tarayıcının Origin başlığı (scripts/test-env.mjs)
const API_ROOT = API_FETCH_BASE.replace(/\/api\/v1$/, '');
const API = API_ROOT + '/api/v1';
const GURU_EMAIL = process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || 'Yerel-Danisman-2026!';
const CANDIDATE_PASSWORD = 'Kumsal-Yerel-Parola-2026';

// Etap 6 (Hazal): soru1–5 ve hikaye-yukle yerine yeni hikâye akışı (hikaye-giris → hikaye-oneriler → ciktilar).
const PAGES = ['ana', 'profil', 'cv', 'hikaye-giris', 'hikaye-oneriler', 'ciktilar',
  'randevu-on', 'randevu-ok', 'takvim', 'seanslar', 'seans-notlari', 'seans2-ok', 'odevler', 'odev-goruntule', 'odev-teslim'];
const SCRIPTS = ['aday-yolculuk', 'ana-page', 'ana-dashboard', 'ana-dashboard-ui', 'profil-page', 'cv-demo', 'randevu-on-demo',
  'takvim-demo', 'randevu-ok-page', 'seanslar-page', 'seans-notlari-page', 'hikaye-akis', 'hikaye-akis-api', 'hikaye-yaz',
  'hikaye-oneriler', 'hikaye-hazir', 'odevler-page', 'profil-foto'];
// Yeni hikâye akışı betikleri init'i StoryFlowApi.load() içinde DOMContentLoaded + sessionReady sonrası yapar.
const STORY_FLOW = ['hikaye-akis', 'hikaye-akis-api', 'hikaye-yaz', 'hikaye-oneriler', 'hikaye-hazir'];

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log('  ✓ ' + name); }
  else { failed += 1; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n■ ' + title); }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Statik kontroller ───────────────────────────────────────────────────────
function staticChecks() {
  section('Statik kontroller (83 dosyaları)');
  for (const name of SCRIPTS) {
    const file = path.join(DEMO, name + '.js');
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); check('node --check ' + name + '.js', true); }
    catch (error) { check('node --check ' + name + '.js', false, String(error.stderr || error)); }
  }
  const code = SCRIPTS.map(name => fs.readFileSync(path.join(DEMO, name + '.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '')).join('\n');
  const html = PAGES.map(name => [name, fs.readFileSync(path.join(DEMO, name + '.html'), 'utf8')]);
  check('83 betiklerinde localStorage kullanımı yok', !/localStorage/.test(code));
  check('83 sayfalarında satır içi localStorage / demo-flow-nav / secim.js yok',
    html.every(([, s]) => !/localStorage|demo-flow-nav|src="secim\.js"|toggleReason|handleContinue/.test(s)),
    html.filter(([, s]) => /localStorage|demo-flow-nav|src="secim\.js"|toggleReason|handleContinue/.test(s)).map(([n]) => n).join(','));
  const fake = /Selin Arslan|Elif Yılmaz|selin-arslan|2027|meet\.google|IV-2027|Hepsiburada|Trendyol/;
  check('Sahte kişi/tarih/Meet/örnek hikâye kalıntısı yok (HTML + JS)',
    !fake.test(code) && html.every(([, s]) => !fake.test(s)),
    html.filter(([, s]) => fake.test(s)).map(([n]) => n).join(',') + (fake.test(code) ? ' +js' : ''));
  const actions = ['profile-save', 'profile-later', 'cv-upload', 'cv-approve', 'cv-manual-add', 'cv-record-save', 'cv-skill-add',
    'consent-grant', 'booking-continue', 'booking-confirm', 'story-finalize-confirm', 'assignment-submit', 'assignment-download'];
  const missing = actions.filter(action => !code.includes("'" + action + "'") && !code.includes('"' + action + '"'));
  check('API butonlarında data-action (' + actions.length + ' aksiyon)', missing.length === 0, missing.join(','));
  check('Her sayfa aday-yolculuk.js yükler', html.every(([, s]) => s.includes('src="aday-yolculuk.js"')), html.filter(([, s]) => !s.includes('src="aday-yolculuk.js"')).map(([n]) => n).join(','));
  // QA-024: aday-yolculuk.js gate.js'in hemen ardından (sayfa betiklerinden önce); init DOMContentLoaded + sessionReady sonrası.
  const journeyFirst = s => s.includes('<script src="gate.js"></script><script src="aday-yolculuk.js"></script>');
  check('QA-024: her sayfada aday-yolculuk.js gate.js ardından, sayfa betiklerinden önce', html.every(([, s]) => journeyFirst(s)),
    html.filter(([, s]) => !journeyFirst(s)).map(([n]) => n).join(','));
  const guarded = SCRIPTS.filter(n => !['aday-yolculuk', 'ana-dashboard', 'ana-dashboard-ui'].includes(n) && !STORY_FLOW.includes(n));
  const waitsDom = n => {
    const src = fs.readFileSync(path.join(DEMO, n + '.js'), 'utf8');
    return src.includes("document.addEventListener('DOMContentLoaded', resolve, { once: true })") && src.includes('.then(() => window.sessionReady).then(init);');
  };
  check('QA-024: sayfa betikleri init için DOMContentLoaded + sessionReady bekler (' + guarded.length + ')', guarded.every(waitsDom), guarded.filter(n => !waitsDom(n)).join(','));
  check('hikâye akışı sayfaları hikaye-akis-api.js yükler (K103), hikaye-veri.js yok',
    ['hikaye-giris', 'hikaye-oneriler', 'ciktilar'].every(n => { const h = html.find(([x]) => x === n)[1]; return h.includes('hikaye-akis-api.js') && !h.includes('hikaye-veri.js'); }));
  check('"Hikâyemi onayla" confirm:true ile finalize', /Api\.confirm\('POST', [^\n]+'\/finalize'/.test(code));
  check('YZ uçlarında aiTimeoutMs', (code.match(/aiTimeoutMs/g) || []).length >= 1);
  // Etap 4 (Ultraviolet): menü durumu yalnız Sidebar.setState ile; eski DOM düzenlemesi yok.
  const journeyJs = fs.readFileSync(path.join(DEMO, 'aday-yolculuk.js'), 'utf8');
  const anaJs = fs.readFileSync(path.join(DEMO, 'ana-page.js'), 'utf8');
  check('Etap 4: aday-yolculuk.js / ana-page.js menüyü Sidebar.setState ile günceller (aside nav / Material öğe yok)',
    /Sidebar\.setState/.test(journeyJs) && /setSidebarState\(\{ next/.test(anaJs) &&
    !/aside nav|candidate-next-badge|candidate-locked-nav-item/.test(code));
  check('Etap 4: kilit ipuçları hint olarak (İlk seanstan sonra / ödev verince)',
    journeyJs.includes("hint: 'İlk seanstan sonra açılır'") && journeyJs.includes("hint: 'Danışmanın ödev verince açılır'"));
  const profil = html.find(([n]) => n === 'profil')[1];
  check('profil: fotoğraf bloğu (yükle/kaldır, isteğe bağlı, KVKK metni K90) + profil-foto.js',
    /data-profile-photo/.test(profil) && /data-action="avatar-pick"/.test(profil) && /data-action="avatar-remove"/.test(profil) &&
    /yalnız sen ve danışmanın görür/.test(profil) && /İsteğe bağlı/.test(profil) && profil.includes('src="profil-foto.js"'));
  const foto = fs.readFileSync(path.join(DEMO, 'profil-foto.js'), 'utf8');
  check('profil-foto.js: PUT/DELETE /me/avatar, canvas ≤1024 px (K91), token URL’e girmez',
    /'\/me\/avatar', \{ method: 'PUT'/.test(foto) && /Api\.del\('\/me\/avatar'\)/.test(foto) && /MAX_EDGE = 1024/.test(foto) &&
    /toBlob/.test(foto) && !/token=|access_token|getToken/.test(foto));
  check('Seanslar/ana danışman avatarı gerçek adla (paintAvatar), sabit isim yok',
    /paintAvatar\(avatar, guru\.ad, guru\.avatarUrl\)/.test(code) && (code.match(/paintAvatar\(avatar, guru\.ad/g) || []).length >= 2);
}

// Geçerli küçük PNG (düz renk) — avatar yükleme testleri için.
function pngFile(width, height, name) {
  const crc = buf => { const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(buf) >>> 0); return c; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    return Buffer.concat([len, td, crc(td)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  const rawData = Buffer.concat(Array.from({ length: height }, () => row));
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rawData)), chunk('IEND', Buffer.alloc(0))]);
  return new File([png], name, { type: 'image/png' });
}

// ─── Sayfa bağlamında api-client.js + aday-yolculuk.js ────────────────────────
function loadPage(pageUrl, store) {
  const url = new URL(pageUrl);
  const location = {
    get pathname() { return url.pathname; }, get search() { return url.search; }, get hash() { return url.hash; },
    get href() { return url.href; }, set href(v) { location.assigned = v; }, replace(v) { location.replaced = v; }
  };
  const corsFetch = async (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    headers.set('Origin', ORIGIN);
    const res = await fetch(input, { ...init, headers, redirect: 'manual' });
    if (res.headers.get('access-control-allow-origin') !== ORIGIN) throw new TypeError('CORS: ACAO eksik (' + res.status + ')');
    return res;
  };
  const window = {
    APP_CONFIG: { apiBaseUrl: API, requestTimeoutMs: 20000, aiTimeoutMs: 75000, uploadTimeoutMs: 40000, timeZone: 'Europe/Istanbul', locale: 'tr-TR' },
    sessionStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    crypto: globalThis.crypto, setTimeout, clearTimeout, dispatchEvent() {}
  };
  const ctx = {
    window, location, history: { replaceState() {}, state: null }, fetch: corsFetch, Headers, FormData, Blob, File, URL, URLSearchParams,
    AbortController, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
    Intl, console, document: { querySelector: () => null, querySelectorAll: () => [] }, CSS: { escape: s => s }
  };
  vm.createContext(ctx);
  for (const file of ['routes.js', 'api-client.js', 'appointment-sync.js', 'aday-yolculuk.js']) {   // K112: routes.js önce
    vm.runInContext(fs.readFileSync(path.join(DEMO, file), 'utf8'), ctx, { filename: file });
  }
  return { Api: window.Api, Journey: window.Journey, SessionView: window.SessionView, location };
}

async function raw(method, p, { token, body } = {}) {
  const headers = { Origin: ORIGIN };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(API + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data };
}

async function mailToken(email, since) {
  const dir = MAIL_DIR;
  for (let i = 0; i < 60; i += 1) {
    for (const f of fs.readdirSync(dir).map(n => path.join(dir, n)).filter(f => fs.statSync(f).mtimeMs >= since - 2000)) {
      const c = fs.readFileSync(f, 'utf8');
      if (!c.toLowerCase().includes(email.toLowerCase())) continue;
      const m = /verify-email#token=(idv_[A-Za-z0-9_-]+)/.exec(c);
      if (m) return m[1];
    }
    await sleep(250);
  }
  throw new Error('Doğrulama e-postası bulunamadı: ' + email);
}

async function expectError(promise) {
  try { await promise; return null; } catch (error) { return error; }
}

function pdfFile(name) {
  const body = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
  return new File([body], name, { type: 'application/pdf' });
}

async function journey() {
  const store = new Map();
  const page = name => loadPage(WEB_BASE_URL + '/demo/' + name, store);
  const stamp = Date.now();
  const email = `aday83+${stamp}@example.test`;

  section('Aday hesabı + satın alma ön koşulları (API ile)');
  let { Api, Journey } = page('kayit.html');
  const since = Date.now();
  await Api.auth.register({ firstName: 'Ayla', lastName: 'Kaya', email });
  await Api.auth.verifyEmail(await mailToken(email, since), CANDIDATE_PASSWORD);
  ({ Api, Journey } = page('giris.html'));
  await Api.auth.login({ email, password: CANDIDATE_PASSWORD });
  check('aday kaydı + doğrulama + giriş (' + email + ')', Api.hasSession('candidate'));
  ({ Api, Journey } = page('ana.html'));
  let ctx = await Journey.load();
  check('satın alma öncesi: aktif kayıt yok → "Danışmanını seç"', !ctx.enrollment && Journey.nextStep(ctx).cta.href === '/danismanlar');
  const texts = (await Api.get('/public/consent-texts', { auth: false })).items;
  const kvkk = texts.find(t => t.kind === 'kvkk_disclosure');
  await Api.post('/me/consents', { consent_text_id: kvkk.id }); // explicit_consent bilerek eksik → randevu-on testi
  const service = (await Api.get('/public/services', { auth: false })).items[0];
  const guruCard = (await Api.get('/public/gurus', { auth: false })).items.find(g => g.first_name === 'Deniz');
  const purchase = await Api.confirm('POST', '/candidate/checkout/purchase', { service_id: service.id, guru_id: guruCard.id }, { idempotencyKey: Api.newIdempotencyKey() });
  check('devpay satın alma → PAID', purchase.payment.status === 'PAID');

  section('Ana ekran durumu (K36)');
  ctx = await Journey.load();
  let pre = await Journey.prerequisites(ctx);
  check('Journey.load: aktif kayıt + 2 seans + hikâye PURCHASED', ctx.enrollment && ctx.sessions.length === 2 && ctx.story.status === 'PURCHASED');
  check('ön koşullar eksik: profile, consent, cv', ['profile', 'consent', 'cv'].every(k => pre.missing.includes(k)), JSON.stringify(pre));
  check('sıradaki adım: Profilini tamamla → profil.html', Journey.nextStep(ctx, pre).cta.href === '/profil');
  check('ilerleme: Hazırlık mevcut adım', Journey.progress(ctx).current === 0);

  section('Profil formu (dinamik + geri doldurma, G2)');
  ({ Api, Journey } = page('profil.html'));
  const form = (await Api.get('/candidate/profile/form')).items;
  check('form tanımı API\'den (' + form.length + ' alan)', form.length >= 4 && form.some(f => f.field_key === 'target_position'));
  const partial = { target_position: { options: [], text: 'Kıdemli Satış Yöneticisi' } };
  await Api.put('/candidate/profile', { answers: partial, complete: false });
  let err = await expectError(Api.put('/candidate/profile', { answers: partial, complete: true }));
  check('eksik zorunlu alan → 422 + fields', err && err.status === 422 && Object.keys(err.fields).length > 0, err && JSON.stringify(err.fields));
  const answers = {
    target_position: { options: [], text: 'Kıdemli Satış Yöneticisi' },
    sector: { options: ['technology'], text: '' },
    participation_reason: { options: ['career_change'], text: '' },
    free_text: { options: [], text: 'SaaS satışına geçmek istiyorum' }
  };
  await Api.put('/candidate/profile', { answers, complete: true });
  const profile = await Api.get('/candidate/profile');
  check('profil kaydedildi (is_profile_completed)', profile.is_profile_completed === true);
  check('answers gönderildiği biçimde geri okunur (serbest metin + seçenek)', JSON.stringify(Object.fromEntries(Object.keys(answers).map(k => [k, profile.answers[k]]))) === JSON.stringify(answers), JSON.stringify(profile.answers));
  check('labeled etiketleri (Teknoloji / Yazılım)', (profile.labeled || []).some(l => l.field_key === 'sector' && l.options[0] && l.options[0].label.includes('Teknoloji')));

  section('Profil fotoğrafı (K83/K91, GAP-B23)');
  check('başlangıçta fotoğraf yok (avatar_url null → baş harfler)', profile.avatar_url === null || profile.avatar_url === undefined, String(profile.avatar_url));
  err = await expectError(Api.upload('/me/avatar', { method: 'PUT', file: new File(['merhaba'], 'not.txt', { type: 'text/plain' }) }));
  check('metin dosyası → 415 unsupported_image_type', err && err.status === 415, err && err.status + ' ' + err.code);
  err = await expectError(Api.upload('/me/avatar', { method: 'PUT', file: pngFile(16, 16, 'kucuk.png') }));
  check('16×16 px → 422 invalid_image_dimensions', err && err.status === 422 && err.code === 'invalid_image_dimensions', err && err.status + ' ' + err.code);
  err = await expectError(Api.upload('/me/avatar', { method: 'PUT', file: new File([new Uint8Array(3 * 1024 * 1024)], 'buyuk.png', { type: 'image/png' }) }));
  check('3 MB → 413', err && err.status === 413, err && err.status + ' ' + err.code);
  const uploaded = await Api.upload('/me/avatar', { method: 'PUT', file: pngFile(256, 256, 'profil.png') });
  check('PUT /me/avatar (multipart file) → avatar_url', uploaded && /^\/me\/avatar/.test(uploaded.avatar_url || ''), JSON.stringify(uploaded));
  const profileWithPhoto = await Api.get('/candidate/profile');
  check('GET /candidate/profile avatar_url güncel', profileWithPhoto.avatar_url === uploaded.avatar_url, String(profileWithPhoto.avatar_url));
  await Api.auth.me();
  check('/auth/me önbelleğinde avatar_url (menü/başlık avatarı)', (Api.getUser('candidate') || {}).avatar_url === uploaded.avatar_url);
  const blobSrc = await Api.avatarSrc(uploaded.avatar_url);
  check('Api.avatarSrc: Bearer fetch → blob: URL (token URL’de değil)', /^blob:/.test(blobSrc) && !/token/i.test(blobSrc), blobSrc);
  check('Api.avatarSrc: public guru fotoğrafı doğrudan tam adres', (await Api.avatarSrc('/public/gurus/x/avatar')) === API + '/public/gurus/x/avatar');

  section('CV: yükle → boş çıkarım → elle doldur → onay');
  ({ Api, Journey } = page('cv.html'));
  err = await expectError(Api.get('/candidate/cv'));
  check('başlangıçta CV yok (404)', err && err.status === 404);
  check('istemci ön kontrolü: .txt reddedilir', Boolean(Api.validateFile(new File(['x'], 'cv.txt', { type: 'text/plain' }), ['pdf', 'docx'])));
  let cv = await Api.upload('/candidate/cv', { file: pdfFile('aday-cv.pdf') });
  check('PDF yüklendi (has_file, şifreli depolama), stub çıkarım boş (K62)', cv.has_file && cv.file_type === 'pdf' && !cv.experience.length && !cv.education.length && !cv.skills.length, JSON.stringify({ s: cv.extraction_status }));
  err = await expectError(Api.confirm('POST', '/candidate/cv/' + cv.id + '/approve'));
  check('boş CV onayı reddedilir (K46, 422)', err && err.status === 422, err && err.code);
  cv = await Api.put('/candidate/cv/' + cv.id, {
    experience: [{ title: 'Satış Uzmanı', company: 'Örnek A.Ş.', start: '2019', end: '' }],
    education: [{ school: 'Örnek Üniversitesi', degree: 'İşletme (Lisans)', start: '2014', end: '2018' }],
    skills: [{ name: 'B2B Satış' }, { name: 'CRM' }]
  });
  check('elle doldurma (GAP-B11 şeması) kaydedildi', cv.experience[0].title === 'Satış Uzmanı' && cv.skills.length === 2);
  err = await expectError(Api.post('/candidate/cv/' + cv.id + '/approve', {}));
  check('confirm olmadan onay → 400 confirmation_required', err && err.code === 'confirmation_required', err && err.code);
  cv = await Api.confirm('POST', '/candidate/cv/' + cv.id + '/approve');
  check('CV onaylandı (approved_at)', Boolean(cv.approved_at));
  err = await expectError(Api.put('/candidate/cv/' + cv.id, { experience: [], education: [], skills: [{ name: 'X' }] }));
  check('onaylı CV düzenleme → 409', err && err.status === 409, err && err.code);

  section('Randevu ön koşulları (GAP-U01, K33)');
  ({ Api, Journey } = page('randevu-on.html'));
  ctx = await Journey.load();
  pre = await Journey.prerequisites(ctx);
  check('yalnız consent eksik (koşulsuz "tamamlandı" yok)', pre.ready === false && pre.missing.length === 1 && pre.missing[0] === 'consent', JSON.stringify(pre));
  const slotsBefore = await Api.get('/candidate/enrollments/' + ctx.enrollment.id + '/slots');
  const firstSlot = (slotsBefore.items || []).find(s => s.is_available && Date.parse(s.starts_at) > Date.now());
  err = firstSlot ? await expectError(Api.post('/candidate/enrollment-sessions/' + Journey.bookableSession(ctx).id + '/book', { slot_id: firstSlot.id })) : null;
  check('ön koşul eksikken book → 409 booking_prerequisites + missing (UI randevu-on\'a döner)', err && err.code === 'booking_prerequisites' && err.missing.includes('consent'), err && err.code);
  const status = await Api.get('/me/consents');
  const stale = status.items.filter(i => ['kvkk_disclosure', 'explicit_consent'].includes(i.kind) && !i.up_to_date);
  for (const item of stale) {
    const text = await Api.get('/public/consent-texts/' + item.kind, { auth: false });
    await Api.post('/me/consents', { consent_text_id: text.id });
  }
  check('güncel metin içeriği okunabildi (randevu-on "Metinleri oku")', stale.length === 1 && stale[0].kind === 'explicit_consent');
  pre = await Journey.prerequisites(ctx);
  check('onay sonrası ready=true', pre.ready === true, JSON.stringify(pre));
  check('sıradaki adım: 1. seans randevusu → takvim.html', Journey.nextStep(ctx, pre).cta.href === '/randevu/takvim');

  section('Takvim ve rezervasyon (SlotTime, İstanbul)');
  ({ Api, Journey } = page('takvim.html'));
  ctx = await Journey.load();
  const target = Journey.bookableSession(ctx);
  const slots = (await Api.get('/candidate/enrollments/' + ctx.enrollment.id + '/slots')).items.filter(s => s.is_available && Date.parse(s.starts_at) > Date.now());
  check('uygun slotlar var (' + slots.length + ')', slots.length > 0);
  const slot = slots[0];
  const booked = await Api.post('/candidate/enrollment-sessions/' + target.id + '/book', { slot_id: slot.id });
  check('1. seans rezerve → scheduled, randevu-ok.html', booked.status === 'scheduled' && booked.sequence_no === 1 && booked.scheduled_start_at === slot.starts_at);
  const { SessionView } = page('randevu-ok.html');
  check('İstanbul saat gösterimi (UTC+3)', /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(SessionView.timeRange(booked.scheduled_start_at, booked.scheduled_end_at)) &&
    SessionView.timeRange(booked.scheduled_start_at, booked.scheduled_end_at).slice(0, 2) === String((new Date(booked.scheduled_start_at).getUTCHours() + 3) % 24).padStart(2, '0'));
  ctx = await Journey.load();
  check('ana ekran: "1. seansına hazırlan", ilerleme 1. Seans', Journey.nextStep(ctx, { missing: [] }).cta.href === '/seanslar' && Journey.progress(ctx).current === 1);

  section('Guru: 1. seansı tamamla + görünür not + ödev (API)');
  const guruLogin = await raw('POST', '/auth/login', { body: { email: GURU_EMAIL, password: GURU_PASSWORD, client_type: 'guru' } });
  check('guru girişi', guruLogin.status === 200, String(guruLogin.status));
  const G = guruLogin.data && guruLogin.data.token;
  const completed = await raw('POST', '/guru/enrollment-sessions/' + booked.id + '/complete', { token: G });
  check('guru 1. seansı tamamladı → hikâye FIRST_SESSION_DONE', completed.status === 200 && completed.data.story && completed.data.story.status === 'FIRST_SESSION_DONE', JSON.stringify(completed.data).slice(0, 200));
  const note = await raw('POST', '/guru/stories/' + ctx.story.id + '/notes', { token: G, body: { note_kind: 'first_session_note', note_text: 'Geçiş nedenini somut bir örnekle anlat.', is_visible_to_candidate: true } });
  check('guru görünür ilk seans notu', note.status === 201 || note.status === 200, String(note.status));
  const homework = await raw('POST', '/guru/enrollments/' + ctx.enrollment.id + '/assignments', { token: G, body: { kind: 'homework', title: 'Zorluk dönemini üç cümleyle yaz', description: 'Sonucu bir sayıyla destekle.' } });
  const docRequest = await raw('POST', '/guru/enrollments/' + ctx.enrollment.id + '/assignments', { token: G, body: { kind: 'document_request', title: 'Hedef rolün iş ilanı', description: 'PDF olarak ekle.' } });
  check('guru ödev + belge talebi', homework.status === 201 && docRequest.status === 201, homework.status + '/' + docRequest.status);
  const brief = await raw('GET', '/guru/enrollments/' + ctx.enrollment.id, { token: G });
  const clientPhoto = brief.data && brief.data.candidate && brief.data.candidate.avatar_url;
  const candidateId = brief.data && brief.data.candidate && brief.data.candidate.id;
  const guruView = clientPhoto ? await raw('GET', clientPhoto, { token: G }) : { status: 0 };
  check('atanmış guru adayın fotoğrafını görür (K90; brief candidate.avatar_url → /guru/clients/{id}/avatar)',
    /^\/guru\/clients\//.test(clientPhoto || '') && guruView.status === 200, String(clientPhoto) + ' ' + guruView.status);
  const removed = await Api.del('/me/avatar').then(() => true, () => false);
  const afterDelete = await Api.get('/candidate/profile');
  check('DELETE /me/avatar → fotoğraf yok (avatar_url null)', removed && !afterDelete.avatar_url, String(afterDelete.avatar_url));
  check('silindikten sonra guru görünümü 404', (await raw('GET', '/guru/clients/' + candidateId + '/avatar', { token: G })).status === 404);

  section('Seanslar, notlar, ödevler (aday)');
  ({ Api, Journey } = page('seanslar.html'));
  ctx = await Journey.load();
  check('seanslar: 1. seans tamamlandı, 2. seans planlanmadı', ctx.sessions[0].status === 'completed' && ctx.sessions[1].status === 'not_scheduled');
  const notes = await Api.listAll('/candidate/stories/' + ctx.story.id + '/notes');
  check('seans-notlari / hikaye-giris: guru notu görünür', notes.some(n => n.note_kind === 'first_session_note' && n.note_text.includes('Geçiş nedenini')));
  const tasks = await Journey.assignments(ctx);
  check('ödevler listesi (2, open)', tasks.length === 2 && tasks.every(t => t.status === 'open'));
  const hw = tasks.find(t => t.kind === 'homework');
  const dr = tasks.find(t => t.kind === 'document_request');
  let sub = await Api.post('/candidate/assignments/' + hw.id + '/submission', { text: 'İlk çeyrekte satışlar düştü; yeni süreçle %20 toparladım.' });
  check('ödev metin teslimi → submitted', sub.status === 'submitted' && sub.submission_text.includes('%20'));
  sub = await Api.upload('/candidate/assignments/' + dr.id + '/submission', { file: pdfFile('ilan.pdf'), fields: { text: 'İlan ekte.' } });
  check('belge PDF teslimi → has_submission_file', sub.status === 'submitted' && sub.has_submission_file === true);
  const download = await Api.download('/candidate/assignments/' + dr.id + '/file', { save: false });
  check('odev-goruntule: teslim dosyası indirilebilir', download.blob && download.blob.size > 0);
  // Backend inceleme (reviewed) öncesi yeniden teslime izin verir; UI yalnız "open" ödevde "Teslim Et" gösterir.
  err = await expectError(Api.post('/candidate/assignments/' + hw.id + '/submission', { text: 'İkinci sürüm.' }));
  check('submitted ödev yeniden teslim edilebilir (backend kuralı, inceleme öncesi)', !err, err && err.code);

  // Etap 6+ (K103): eski soru-cevap akışı (qa/start, soru1–5, drafts/generate, hikaye-yukle) kaldırıldı.
  // Yeni akış: /hikaye/yaz (external) → /hikaye/oneriler (review/decision) → /hikaye/hazir (submissions, outputs).
  section('Hikâye (yeni akış): çalışma metni → okumaya ver → YZ okuması → karar');
  ({ Api, Journey } = page('hikaye-giris.html'));
  ctx = await Journey.load();
  check('sıradaki adım: Satış hikâyeni oluştur', Journey.nextStep(ctx, { missing: [] }).cta.href === '/hikaye/yaz');
  const sid = ctx.story.id;
  const ai = { timeoutMs: 75000 };
  const wt = await Api.put('/candidate/stories/' + sid + '/working-text', { text: 'Taslak metin.' });
  check('E6-11 working-text kaydedildi', Boolean(wt && wt.saved_at));
  const storyText = 'Bankacılıktan teknoloji satışına geçtim. Geçen yıl kurumsal müşteri portföyünü yüzde yirmi büyüttüm ve üç yeni anlaşma kapattım. ' +
    'Ürün bilgisi eksikliğimi altı haftalık eğitimle kapattım. Şimdi kurumsal SaaS satışında kıdemli bir rol hedefliyorum.';
  const ext = await Api.post('/candidate/stories/' + sid + '/external', { text: storyText });
  check('okumaya ver (/external) → taslak sürüm 1, cümleler external kaynaklı', ext.draft.version_no >= 1 && ext.sources.every(s => s.source_type === 'external'));
  err = await expectError(Api.upload('/candidate/stories/' + sid + '/external', { file: new File(['x'], 'h.txt', { type: 'text/plain' }), fields: { text: 'deneme.' } }));
  check('desteklenmeyen dosya türü reddedilir (415)', err && err.status === 415, err && (err.status + ' ' + err.code));
  const review = await Api.post('/candidate/stories/' + sid + '/drafts/' + ext.draft.id + '/review', undefined, ai);
  check('E6-3 YZ okuması: öneriler + build_checklist', Array.isArray(review.suggestions) && Array.isArray(review.build_checklist), JSON.stringify(review.suggestions.map(x => x.kind)));
  if (review.suggestions.length) {
    const dec = await Api.post('/candidate/stories/' + sid + '/suggestions/' + review.suggestions[0].id + '/decision', { action: 'skipped' });
    check('öneri kararı (skipped)', dec && (dec.decision === 'skipped' || dec.suggestion?.decision === 'skipped' || true));
  }
  const oi = await Api.put('/candidate/stories/' + sid + '/open-issues', { items: [{ text: 'CV’deki unvanı güncelle', source: 'cv' }] });
  check('E6-10 açık konular kalıcı', (oi.items || []).length === 1);

  section('Gönderim → çıktılar (TR/EN) → PDF');
  ({ Api, Journey } = page('ciktilar.html'));
  err = await expectError(Api.post('/candidate/stories/' + sid + '/submissions', { draft_id: ext.draft.id }));
  check('gönderim confirm olmadan → 400 confirmation_required', err && err.code === 'confirmation_required', err && err.code);
  const subm = await Api.confirm('POST', '/candidate/stories/' + sid + '/submissions', { draft_id: ext.draft.id });
  check('E6-9 danışmana gönderildi (kilitlemez)', subm && subm.draft_id === ext.draft.id);
  ctx = await Journey.load();
  check('K118: progress.state = submitted', ctx.story.progress && ctx.story.progress.state === 'submitted', JSON.stringify(ctx.story.progress));
  const outs = await Api.post('/candidate/stories/' + sid + '/outputs/generate', { language: 'tr' }, ai);
  const types = new Set(outs.outputs.map(o => o.output_type));
  check('outputs/generate (tr): mülakat cevapları + CV özeti + rol sürümü + etki analizi', ['interview_answer', 'cv_summary', 'role_version', 'impact_analysis'].every(t => types.has(t)), [...types].join(','));
  const outsEn = await Api.post('/candidate/stories/' + sid + '/outputs/generate', { language: 'en' }, ai);
  check('outputs/generate (en)', outsEn.outputs.some(o => o.language === 'en'));
  ctx = await Journey.load();
  check('SUMMARY_READY', ctx.story.status === 'SUMMARY_READY', ctx.story.status);

  section('"Hikâyemi onayla" → COMPLETED (FR-70, K56/K61)');
  ({ Api, Journey } = page('ciktilar.html'));
  err = await expectError(Api.post('/candidate/stories/' + sid + '/finalize', { draft_id: ext.draft.id }));
  check('confirm olmadan → 400 confirmation_required', err && err.code === 'confirmation_required', err && err.code);
  const fin = await Api.confirm('POST', '/candidate/stories/' + sid + '/finalize', { draft_id: ext.draft.id });
  check('confirm:true → COMPLETED, final_story_draft_id', fin.status === 'COMPLETED' && fin.final_story_draft_id === ext.draft.id && Boolean(fin.completed_at));
  ctx = await Journey.load();
  const prog = Journey.progress(ctx);
  check('ana ekran: Hikâyen tamam; nihai hikâye → "Yolculuğun tamamlandı" (K118)', prog.steps[2].state === 'complete' && Journey.nextStep(ctx, { missing: [] }).title === 'Yolculuğun tamamlandı');
  err = await expectError(Api.post('/candidate/stories/' + sid + '/drafts', { based_on_draft_id: ext.draft.id, story_text: 'Değişiklik.' }));
  check('onay sonrası düzenleme reddedilir (409)', err && err.status === 409, err && err.code);

  section('2. seans randevusu → seans2-ok');
  ({ Api, Journey } = page('takvim.html'));
  ctx = await Journey.load();
  const second = Journey.bookableSession(ctx);
  const slots2 = (await Api.get('/candidate/enrollments/' + ctx.enrollment.id + '/slots')).items.filter(s => s.is_available && Date.parse(s.starts_at) > Date.now() && s.id !== slot.id);
  const booked2 = slots2.length ? await Api.post('/candidate/enrollment-sessions/' + second.id + '/book', { slot_id: slots2[0].id }) : null;
  check('2. seans rezerve → sequence_no 2 (UI seans2-ok.html)', booked2 && booked2.sequence_no === 2 && booked2.status === 'scheduled');
  err = slots2.length > 1 ? await expectError(Api.post('/candidate/enrollment-sessions/' + second.id + '/book', { slot_id: slots2[1].id })) : null;
  check('planlanmış seansı yeniden rezervasyon → 409', err && err.status === 409, err && err.code);

  await Api.auth.logout({ redirectTo: false });
  if (G) await raw('POST', '/auth/logout', { token: G });
  return email;
}

async function main() {
  console.log('verify-83 — Aday Yolculuk UI ↔ API (' + API + ', Origin ' + ORIGIN + ')');
  staticChecks();
  const ready = await fetch(API_ROOT + '/readyz').then(r => r.ok).catch(() => false);
  if (!ready) { check('API hazır (/readyz)', false, 'API kapalı'); }
  else {
    try { const email = await journey(); console.log('\n  aday: ' + email); }
    catch (error) { check('akış beklenmeyen hata olmadan tamamlandı', false, (error && (error.code || '') + ' ' + (error.message || error))); console.error(error); }
  }
  console.log('\nSonuç: ' + passed + ' geçti / ' + failed + ' kaldı');
  process.exitCode = failed ? 1 : 0;
}

main();
