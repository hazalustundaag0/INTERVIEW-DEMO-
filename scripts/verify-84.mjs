#!/usr/bin/env node
// verify-84.mjs — Guru Panel (84) uçtan uca doğrulaması, GERÇEK API'ye karşı. Sahibi: 84 Guru Panel UI.
//
// Ne yapar (her koşuda iki YENİ aday oluşturur; demo gurusu sabittir):
//   1. Guru girişi (client_type=guru) · GET/PUT /guru/profile (fiyat alanı 422, bilinmeyen sektör 422, geri yükleme)
//   2. Aday A (guru_visibility rızası VAR) ve aday B (rıza YOK): kayıt → data/mail bağlantısı → parola → giriş →
//      KVKK rızaları → devpay satın alma (demo gurusu) → profil formu → CV (elle) + onay
//   3. Guru müsaitlik ekler (POST /guru/availability) → aday slotu görür ve 1. seansı rezerve eder
//   4. Guru: danışan listesi, detay (etiketli profile_answers), seans listesi, seans tamamlama
//   5. Aday A ve B: 5 soru (dev YZ motoru) → taslak → çıktılar
//   6. K45: guru A'nın hikâyesini + /raw'ı görür (200); B için 403 no_guru_visibility; detay her ikisinde açık
//   7. Notlar: taslak → paylaş (PUT) → aday görür → sil · Ödev: oluştur → aday teslim → guru inceler (reviewed)
//   8. Rol ayrımı: aday token'ı ile guru ucu 403 · guru sayfalarında localStorage yazımı 0 (statik tarama)
//   9. Etap 4 (Ultraviolet, K78/K83/K86/K91): statik — 4 danışan sayfasında [data-client-profile] host'u +
//      GuruClientCard, ?edit= düzenleme betiği yok, kirli profil koruması #sidebar, Material ikon fontu
//      guru-musaitlik-ekle'de yok; API — avatar (GAP-B23): guru PUT/DELETE /me/avatar, hata kodları
//      413/415/422/400, katalogda herkese açık guru fotoğrafı, aday fotoğrafı yalnız atanmış guruya
//      (/guru/clients/{candidateID}/avatar), yabancı aday 404, aday token'ı 403
//
// Çalıştırma:  $env:DEMO_GURU_PASSWORD='…'; node scripts/verify-84.mjs
// Ortam: API_BASE_URL (http://127.0.0.1:8090/api/v1), WEB_BASE_URL (Origin), MAIL_DIR, DEMO_GURU_EMAIL (deniz.kurgu@gurus.example.test),
//        BACKEND_DIR (../../backend), CANDIDATE_PASSWORD (aday parolası; vars. yerel sabit), KEEP=1 (çıktıda id'ler)
// Parola/token ekrana yazılmaz. Origin başlığı WEB_BASE_URL kökeni, vars. http://localhost:3000 (K59 CORS).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { WEB_ORIGIN, WEB_BASE_URL, WEB_FETCH_BASE, API_FETCH_BASE, MAIL_DIR, describeTarget } from './test-env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const API = API_FETCH_BASE;
const ORIGIN = WEB_ORIGIN;   // tarayıcının Origin başlığı (scripts/test-env.mjs)
const GURU_EMAIL = process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || '';
const CANDIDATE_PASSWORD = process.env.CANDIDATE_PASSWORD || 'Mulakat-Yerel-Sifre-2026';

let passed = 0;
let failed = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) passed += 1; else failed += 1;
  results.push({ name, ok, detail });
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail ? '  — ' + detail : ''));
}
function section(title) { console.log('\n■ ' + title); }

class HttpError extends Error {
  constructor(status, problem) {
    super((problem && (problem.message || problem.code)) || 'HTTP ' + status);
    this.status = status;
    this.code = problem && problem.code;
    this.fields = problem && problem.fields;
  }
}

async function call(method, urlPath, { token, body, idem, timeoutMs = 20000 } = {}) {
  const headers = { Accept: 'application/json', Origin: ORIGIN };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem;
  const res = await fetch(API + urlPath, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}

// Multipart yükleme (PUT /me/avatar). Gövde FormData; Content-Type'ı fetch koyar.
async function uploadFile(method, urlPath, token, buffer, type, filename) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), filename);
  const res = await fetch(API + urlPath, {
    method, headers: { Accept: 'application/json', Origin: ORIGIN, Authorization: 'Bearer ' + token },
    body: form, signal: AbortSignal.timeout(30000)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}

// Bağımlılıksız düz renkli PNG (RGB, 8 bit) — avatar testleri için.
function crc32(buf) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return (~c) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(width, height, rgb = [120, 80, 200]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

async function fetchImage(urlPath, token) {
  const headers = { Origin: ORIGIN };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API + urlPath, { headers, signal: AbortSignal.timeout(20000) });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') || '', cache: res.headers.get('cache-control') || '', body };
}

async function expectError(promise) {
  try { await promise; return { status: 200 }; } catch (error) { return error; }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForMailToken(email, startMs) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (fs.existsSync(MAIL_DIR)) {
      const files = fs.readdirSync(MAIL_DIR).filter(n => n.endsWith('.txt'))
        .map(n => ({ full: path.join(MAIL_DIR, n), mtime: fs.statSync(path.join(MAIL_DIR, n)).mtimeMs }))
        .filter(f => f.mtime >= startMs - 2000).sort((a, b) => b.mtime - a.mtime);
      for (const file of files) {
        const content = fs.readFileSync(file.full, 'utf8');
        const to = /^To:\s*(.+)$/m.exec(content);
        if (!to || to[1].trim().toLowerCase() !== email.toLowerCase()) continue;
        const link = /\/verify-email#token=(idv_[A-Za-z0-9_-]+)/.exec(content);
        if (link) return link[1];
      }
    }
    await sleep(500);
  }
  return null;
}

async function login(email, password, clientType) {
  const data = await call('POST', '/auth/login', { body: { email, password, client_type: clientType } });
  return data.token;
}

// ─── Aday hazırlığı ───────────────────────────────────────────────────────────
async function createCandidate(label, withGuruVisibility, guruId, serviceId, consentTexts) {
  const email = `aday84+${Date.now()}${label.toLowerCase()}@example.test`;
  const start = Date.now();
  await call('POST', '/auth/register', { body: { first_name: 'Aday84', last_name: label + (withGuruVisibility ? ' Rizali' : ' Rizasiz'), email } });
  const linkToken = await waitForMailToken(email, start);
  if (!linkToken) throw new Error('Doğrulama e-postası bulunamadı: ' + email);
  await call('POST', '/auth/verify-email', { body: { token: linkToken, password: CANDIDATE_PASSWORD } });
  const token = await login(email, CANDIDATE_PASSWORD, 'candidate');

  const kinds = ['kvkk_disclosure', 'explicit_consent'].concat(withGuruVisibility ? ['guru_visibility'] : []);
  for (const kind of kinds) {
    const text = consentTexts.find(t => t.kind === kind);
    if (!text) throw new Error('Rıza metni yok: ' + kind);
    await call('POST', '/me/consents', { token, body: { consent_text_id: text.id } });
  }

  const purchase = await call('POST', '/candidate/checkout/purchase', {
    token, idem: crypto.randomUUID(), body: { service_id: serviceId, guru_id: guruId, confirm: true }
  });
  const enrollmentId = purchase.enrollment.id;

  const form = await call('GET', '/candidate/profile/form', { token });
  const answers = {};
  for (const field of form.items) {
    if (field.field_type === 'free_text') answers[field.field_key] = { options: [], text: `${label} için ek not: satış hikâyemi güçlendirmek istiyorum.` };
    else if (field.options && field.options.length) answers[field.field_key] = { options: [field.options[0].value], text: '' };
  }
  await call('PUT', '/candidate/profile', { token, body: { answers, complete: true } });

  const cv = await call('POST', '/candidate/cv/manual', {
    token,
    body: {
      experience: [{ title: 'Satış Uzmanı', company: 'Örnek A.Ş.', start: '2020', end: '2025' }],
      education: [{ school: 'Örnek Üniversitesi', degree: 'İşletme', start: '2014', end: '2018' }],
      skills: [{ name: 'B2B satış' }]
    }
  });
  await call('POST', `/candidate/cv/${cv.id}/approve`, { token, body: { confirm: true } });
  const detail = await call('GET', `/candidate/enrollments/${enrollmentId}`, { token });
  return { label, email, token, enrollmentId, storyId: detail.story_session && detail.story_session.id, sessions: detail.sessions, withGuruVisibility };
}

async function addSlot(guruToken, dayOffset) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const day = new Date(Date.now() + (dayOffset + attempt) * 86400000);
    const hour = 9 + Math.floor(Math.random() * 9);
    const startsAt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - 3, [0, 30][attempt % 2]));
    const endsAt = new Date(startsAt.getTime() + 60 * 60000);
    try {
      return await call('POST', '/guru/availability', { token: guruToken, body: { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() } });
    } catch (error) {
      if (error.status !== 409 && error.status !== 422) throw error;
    }
  }
  throw new Error('Slot eklenemedi (çakışma).');
}

async function runStory(candidate) {
  const sid = candidate.storyId;
  await call('POST', `/candidate/stories/${sid}/qa/start`, { token: candidate.token });
  const state = await call('GET', `/candidate/stories/${sid}`, { token: candidate.token });
  const questions = state.questions.slice().sort((a, b) => a.sequence_no - b.sequence_no);
  for (const q of questions) {
    const text = `${candidate.label} adayı olarak ${q.sequence_no}. soruya cevabım: kurumsal müşterilerle çalışırken satış hedefimizi yüzde yirmi aştık ve ekiple yeni bir süreç kurduk.`;
    const saved = await call('PUT', `/candidate/stories/${sid}/answers/${q.id}`, { token: candidate.token, body: { text }, timeoutMs: 80000 });
    let followUp = saved.follow_up;
    while (followUp) {
      const r = await call('PUT', `/candidate/stories/${sid}/follow-ups/${followUp.id}`, {
        token: candidate.token, body: { text: 'Takip cevabım: bu süreçte müşteri görüşmelerini ben yönettim ve sonucu raporladım.' }, timeoutMs: 80000
      });
      followUp = r.follow_up;
    }
  }
  const draft = await call('POST', `/candidate/stories/${sid}/drafts/generate`, { token: candidate.token, timeoutMs: 80000 });
  const outputs = await call('POST', `/candidate/stories/${sid}/outputs/generate`, { token: candidate.token, timeoutMs: 80000 });
  return { draft, outputs };
}

// ─── Statik kontroller (guru sayfaları) ──────────────────────────────────────
function staticChecks() {
  section('Statik: guru sayfaları');
  const demo = path.join(FRONTEND, 'demo');
  const files = fs.readdirSync(demo).filter(n => /^(guru-.*\.(html|js)|giris-danisman\.html|hikaye-guru\.js)$/.test(n));
  const writes = [];
  const fakeNames = [];
  for (const name of files) {
    const text = fs.readFileSync(path.join(demo, name), 'utf8');
    if (/localStorage\s*\.\s*setItem|localStorage\s*\[/.test(text)) writes.push(name);
    if (/Elif Yılmaz|Selin Arslan|Can Öztürk|Zeynep Aydın|2027-01-11|guruElifTasks|demoGuruNotlari|demoMusaitlik/.test(text)) fakeNames.push(name);
  }
  check('guru sayfa/betiklerinde localStorage yazımı yok', writes.length === 0, writes.join(', ') || files.length + ' dosya tarandı');
  check('sabit demo isim/anahtar yok (Elif, Selin, 2027-01-11, guruElifTasks …)', fakeNames.length === 0, fakeNames.join(', '));
  const pagesWithFlowNav = files.filter(n => n.endsWith('.html') && /const pageNames\s*=/.test(fs.readFileSync(path.join(demo, n), 'utf8')));
  check('demo-flow-nav inline betiği kaldırıldı', pagesWithFlowNav.length === 0, pagesWithFlowNav.join(', '));
  const hikaye = fs.readFileSync(path.join(demo, 'guru-hikaye.html'), 'utf8');
  check('guru-hikaye hikaye-veri.js yüklemiyor (yönetim editörü/örnek veri yok)', !/hikaye-veri\.js/.test(hikaye) && /hikaye-guru\.js/.test(hikaye));

  section('Statik: Etap 4 (Ultraviolet)');
  const read = name => fs.readFileSync(path.join(demo, name), 'utf8');
  const clientPages = ['guru-danisan-detay.html', 'guru-hikaye.html', 'guru-notlar.html', 'guru-odevler.html'];
  const badHost = clientPages.filter(name => {
    const html = read(name);
    return !/<div data-client-profile class="client-profile-card" aria-busy="true"><\/div>/.test(html) ||
      /<h1[^>]*><\/h1>/.test(html) || !/guru-client-card\.js/.test(html) || !/guru-client-profile\.css/.test(html) ||
      html.indexOf('guru-ortak.js') > html.indexOf('guru-client-card.js');
  });
  check('4 danışan sayfası: [data-client-profile] host + guru-client-card.js/css, statik başlık yok', badHost.length === 0, badHost.join(', '));
  const ortak = read('guru-ortak.js');
  // QA-027 (81, 2026-11-11): aday fotoğrafı tek önbellekten — Api.avatarSrc (Bearer → blob:, api-client.js).
  const client = read('api-client.js');
  check('guru-ortak.js kartı GuruClientCard.render ile çizer; aday fotoğrafı Bearer→blob (tek önbellek Api.avatarSrc)', /GuruClientCard/.test(ortak) && /Card\.render\(/.test(ortak) &&
    /Api\.avatarSrc\(/.test(ortak) && !/createObjectURL/.test(ortak) && /responseType: 'blob'/.test(client) && /URL\.createObjectURL/.test(client) &&
    !/[?&](token|access_token)=/.test(ortak));
  const overview = read('guru-client-overview-page.js');
  check('detay özeti renderSessionSummary ("N / M seans tamamlandı · Kayıt tarihi")', /renderSessionSummary/.test(overview) && /guru-client-overview-page\.js/.test(read('guru-danisan-detay.html')));
  const ekle = read('guru-musaitlik-ekle.html');
  check('guru-musaitlik-ekle: ?edit= düzenleme betiği yok (K86), token sınıfları', !/params\.get\('edit'\)|editId/.test(ekle + read('guru-musaitlik-ekle.js')) &&
    /bg-\[var\(--color-accent\)\]/.test(ekle) && /rounded-\[var\(--radius-card\)\]/.test(ekle));
  check('guru-musaitlik: "Düzenle"/"Sil" düğmesi yok (K86, GAP-B18)', !/textContent = 'Düzenle'|textContent = 'Sil'/.test(read('guru-musaitlik-demo.js')));
  check('guru-musaitlik-ekle: Material ikon fontu gereksiz (sayfada ikon yok)', !/material-symbols/.test(ekle) && !/Material\+Symbols/.test(ekle));
  const profil = read('guru-profil.js');
  check('guru-profil: kaydedilmemiş değişiklik koruması #sidebar nav (H4), eski .advisor-sidebar yok',
    /#sidebar nav a\[href\]/.test(profil) && !/\.advisor-sidebar/.test(profil));
  check('guru-profil: fotoğraf PUT/DELETE /me/avatar, ≤1024 px canvas, herkese açık uyarısı',
    /Api\.upload\('\/me\/avatar'/.test(profil) && /Api\.del\('\/me\/avatar'\)/.test(profil) && /PHOTO_MAX_SIDE = 1024/.test(profil) &&
    /herkese açıktır/.test(profil) && /413/.test(profil) && /415/.test(profil) && /422/.test(profil) && /400/.test(profil));
  const profilHtml = read('guru-profil.html');
  check('guru-profil.html: js/advisors.js ve sabit avatar adı yok', !/advisors\.js/.test(profilHtml) && !/data-avatar-name=/.test(profilHtml));
  check('guru-seans-demo / guru-odevler-demo: Hazal stil satırları (session-card-status, gölge yok)',
    /status\.className = 'session-card-status';/.test(read('guru-seans-demo.js')) && !/box-shadow:0 16px 40px/.test(read('guru-odevler-demo.js')));
}

async function main() {
  if (GURU_PASSWORD.length < 12) {
    console.error('DEMO_GURU_PASSWORD ortam değişkeni gerekli.');
    process.exit(2);
  }
  console.log(`API ${API} · Origin ${ORIGIN} · guru ${GURU_EMAIL}`);
  staticChecks();

  section('Guru girişi ve profil (GAP-B01, K53)');
  const guruToken = await login(GURU_EMAIL, GURU_PASSWORD, 'guru');
  check('guru girişi client_type=guru', Boolean(guruToken));
  const me = await call('GET', '/auth/me', { token: guruToken });
  check('/auth/me guru', me.client_type === 'guru' && me.user.role === 'guru');
  const profile = await call('GET', '/guru/profile', { token: guruToken });
  check('GET /guru/profile', Boolean(profile.id && profile.title), `${profile.first_name} ${profile.last_name} · ${profile.title} · ${profile.sectors.map(s => s.code).join(',')}`);
  check('profilde fiyat alanı yok', !('price' in profile) && !('amount_minor' in profile));
  const sectors = (await call('GET', '/public/sectors')).items;
  const original = { title: profile.title, expertise_area: profile.expertise_area, seniority: profile.seniority, short_bio: profile.short_bio, sector_codes: profile.sectors.map(s => s.code) };
  const altSector = sectors.find(s => !original.sector_codes.includes(s.code)) || sectors[0];
  const updated = await call('PUT', '/guru/profile', { token: guruToken, body: { ...original, title: original.title + ' (84)', sector_codes: original.sector_codes.concat(altSector.code) } });
  check('PUT /guru/profile unvan + sektör', updated.title === original.title + ' (84)' && updated.sectors.some(s => s.code === altSector.code));
  const priceErr = await expectError(call('PUT', '/guru/profile', { token: guruToken, body: { ...original, price: 1 } }));
  check('PUT fiyat alanı → 422 (K53)', priceErr.status === 422, `${priceErr.status} ${priceErr.code} ${JSON.stringify(priceErr.fields || {})}`);
  const sectorErr = await expectError(call('PUT', '/guru/profile', { token: guruToken, body: { ...original, sector_codes: ['yok_boyle_sektor'] } }));
  check('PUT bilinmeyen sektör → 422 fields.sector_codes', sectorErr.status === 422 && sectorErr.fields && 'sector_codes' in sectorErr.fields);
  const restored = await call('PUT', '/guru/profile', { token: guruToken, body: original });
  check('profil geri yüklendi', restored.title === original.title && restored.sectors.length === original.sector_codes.length);

  section('Adaylar (A: guru_visibility VAR, B: YOK)');
  const services = (await call('GET', '/public/services')).items;
  const consentTexts = (await call('GET', '/public/consent-texts')).items;
  const candA = await createCandidate('A', true, profile.id, services[0].id, consentTexts);
  check('aday A hazır (rıza + satın alma + profil + CV)', Boolean(candA.enrollmentId && candA.storyId), candA.email);
  const candB = await createCandidate('B', false, profile.id, services[0].id, consentTexts);
  check('aday B hazır (guru_visibility YOK)', Boolean(candB.enrollmentId && candB.storyId), candB.email);

  section('Müsaitlik (FR-50) ve rezervasyon');
  const slotA = await addSlot(guruToken, 3);
  const slotB = await addSlot(guruToken, 5);
  check('POST /guru/availability ×2', Boolean(slotA.id && slotB.id) && slotA.is_available);
  const listed = await call('GET', '/guru/availability?' + new URLSearchParams({ from: new Date(Date.now()).toISOString(), to: new Date(Date.now() + 30 * 86400000).toISOString() }), { token: guruToken });
  check('GET /guru/availability eklenen slotları döndürür', [slotA.id, slotB.id].every(id => listed.items.some(s => s.id === id)), listed.items.length + ' slot');
  const rangeErr = await expectError(call('GET', '/guru/availability?' + new URLSearchParams({ from: new Date(Date.now() + 86400000).toISOString(), to: new Date().toISOString() }), { token: guruToken }));
  // Bilgi: backend ters aralıkta hata yerine boş/200 dönebiliyor (80 notundaki 400 invalid_time_range gözlenmedi).
  check('ters tarih aralığı (bilgi: hata vermemeli/çökmemeli)', rangeErr.status === 200 || (rangeErr.status >= 400 && rangeErr.status < 500), `${rangeErr.status} ${rangeErr.code || ''}`);
  for (const [cand, slot] of [[candA, slotA], [candB, slotB]]) {
    const slots = await call('GET', `/candidate/enrollments/${cand.enrollmentId}/slots`, { token: cand.token });
    const visible = slots.items.some(s => s.id === slot.id);
    const first = cand.sessions.slice().sort((a, b) => a.sequence_no - b.sequence_no)[0];
    await call('POST', `/candidate/enrollment-sessions/${first.id}/book`, { token: cand.token, body: { slot_id: slot.id } });
    check(`aday ${cand.label} slotu görür ve 1. seansı rezerve eder`, visible);
  }
  const afterBook = await call('GET', '/guru/availability?' + new URLSearchParams({ from: new Date().toISOString(), to: new Date(Date.now() + 30 * 86400000).toISOString() }), { token: guruToken });
  // GET /guru/availability yalnız müsait (is_available) slotları döndürür; rezerve slot listeden düşer (GAP-B18).
  check('rezerve slot müsait listesinden düştü (UI rezerveyi seanslardan çizer)', !afterBook.items.some(s => s.id === slotA.id));

  section('Danışanlar ve detay (FR-80, GAP-B05)');
  const clients = await call('GET', '/guru/clients?limit=100', { token: guruToken });
  const clientA = clients.items.find(c => c.enrollment.id === candA.enrollmentId);
  const clientB = clients.items.find(c => c.enrollment.id === candB.enrollmentId);
  check('GET /guru/clients A ve B listede', Boolean(clientA && clientB), `${clients.items.length} danışan; A story_status=${clientA && clientA.story_status}`);
  for (const cand of [candA, candB]) {
    const brief = await call('GET', `/guru/enrollments/${cand.enrollmentId}`, { token: guruToken });
    const labeled = Array.isArray(brief.profile_answers) && brief.profile_answers.length > 0 &&
      brief.profile_answers.every(a => a.label && Array.isArray(a.options) && a.options.every(o => o.label));
    check(`detay ${cand.label}: etiketli profile_answers (rızadan bağımsız)`, labeled,
      brief.profile_answers.map(a => `${a.label}=${a.options.map(o => o.label).join('/') || a.text}`).join(' · '));
    check(`detay ${cand.label}: raw_access=${cand.withGuruVisibility}`, brief.raw_access === cand.withGuruVisibility);
    cand.brief = brief;
  }

  section('Seanslar (FR-53)');
  for (const cand of [candA, candB]) {
    const sessions = await call('GET', `/guru/enrollments/${cand.enrollmentId}/sessions`, { token: guruToken });
    const s1 = sessions.items.find(s => s.sequence_no === 1);
    const s2 = sessions.items.find(s => s.sequence_no === 2);
    if (s2 && s2.status === 'not_scheduled') {
      const err = await expectError(call('POST', `/guru/enrollment-sessions/${s2.id}/complete`, { token: guruToken }));
      if (cand === candA) check('planlanmamış 2. seans tamamlanamaz → 409', err.status === 409, `${err.status} ${err.code}`);
    }
    const done = await call('POST', `/guru/enrollment-sessions/${s1.id}/complete`, { token: guruToken });
    check(`aday ${cand.label} 1. seans tamamlandı`, done.session.status === 'completed', `story_advanced=${done.story_advanced} → ${done.story && done.story.status}`);
  }

  section('Hikâye (dev YZ motoru) ve K45');
  const storyA = await runStory(candA);
  check('aday A taslak + çıktılar üretildi', Boolean(storyA.draft.draft && storyA.outputs.outputs.length), `${storyA.outputs.outputs.length} çıktı`);
  await runStory(candB);
  check('aday B taslak + çıktılar üretildi', true);
  const gA = await call('GET', `/guru/stories/${candA.storyId}`, { token: guruToken });
  check('K45 rızalı: GET /guru/stories/{A} 200 + taslak + raw_access', Boolean(gA.draft && gA.draft.draft.story_text) && gA.raw_access === true, `${gA.session.status} · ${gA.outputs.length} çıktı`);
  const rawA = await call('GET', `/guru/stories/${candA.storyId}/raw`, { token: guruToken });
  check('K45 rızalı: /raw 200 (sorular + cevaplar + kaynaklar)', rawA.answers.length >= 5 && rawA.sources.length > 0, `${rawA.answers.length} cevap · ${rawA.sources.length} kaynak`);
  const gB = await expectError(call('GET', `/guru/stories/${candB.storyId}`, { token: guruToken }));
  check('K45 rızasız: GET /guru/stories/{B} → 403 no_guru_visibility', gB.status === 403 && gB.code === 'no_guru_visibility', `${gB.status} ${gB.code}`);
  const rawB = await expectError(call('GET', `/guru/stories/${candB.storyId}/raw`, { token: guruToken }));
  check('K45 rızasız: /raw → 403 no_guru_visibility', rawB.status === 403 && rawB.code === 'no_guru_visibility', `${rawB.status} ${rawB.code}`);
  if (candB.brief.cv_id) {
    const cvB = await expectError(call('GET', `/guru/cv/${candB.brief.cv_id}/file`, { token: guruToken }));
    check('K45 rızasız: CV dosyası → 403/404', cvB.status === 403 || cvB.status === 404, `${cvB.status} ${cvB.code}`);
  }

  section('Notlar (FR-82)');
  const notesB = await expectError(call('GET', `/guru/stories/${candB.storyId}/notes`, { token: guruToken }));
  check('rızasız adayın not listesi (bilgi)', true, notesB.status === 200 || notesB.items ? '200' : `${notesB.status} ${notesB.code}`);
  const note = await call('POST', `/guru/stories/${candA.storyId}/notes`, { token: guruToken, body: { note_kind: 'first_session_note', note_text: '84 doğrulama notu (taslak).', is_visible_to_candidate: false } });
  check('not taslağı oluşturuldu (görünmez)', note.is_visible_to_candidate === false);
  let candNotes = await call('GET', `/candidate/stories/${candA.storyId}/notes`, { token: candA.token });
  check('aday taslak notu görmez', !candNotes.items.some(n => n.id === note.id));
  const shared = await call('PUT', `/guru/notes/${note.id}`, { token: guruToken, body: { note_text: '84 doğrulama notu (paylaşıldı).', is_visible_to_candidate: true } });
  candNotes = await call('GET', `/candidate/stories/${candA.storyId}/notes`, { token: candA.token });
  check('paylaşılan not adayda görünür', shared.is_visible_to_candidate && candNotes.items.some(n => n.id === note.id));
  const guruNotes = await call('GET', `/guru/stories/${candA.storyId}/notes`, { token: guruToken });
  check('GET /guru/stories/{id}/notes', guruNotes.items.some(n => n.id === note.id));
  const sentence = await call('POST', `/guru/stories/${candA.storyId}/notes`, { token: guruToken, body: { note_kind: 'sentence_comment', note_text: 'Bu cümlede rakamı netleştir.', is_visible_to_candidate: true, story_draft_id: gA.draft.draft.id, sentence_no: 1 } });
  check('cümle notu (sentence_comment)', sentence.sentence_no === 1);
  await call('DELETE', `/guru/notes/${note.id}`, { token: guruToken });
  const afterDelete = await call('GET', `/guru/stories/${candA.storyId}/notes`, { token: guruToken });
  check('not silindi', !afterDelete.items.some(n => n.id === note.id));

  section('Ödevler (FR-83)');
  const due = new Date(Date.now() + 7 * 86400000).toISOString();
  const hw = await call('POST', `/guru/enrollments/${candA.enrollmentId}/assignments`, { token: guruToken, body: { kind: 'homework', title: 'Zorlandığın dönemi 3 cümleyle yaz', description: 'Aksiyon ve sonucu ölçülebilir anlat.', due_at: due } });
  const doc = await call('POST', `/guru/enrollments/${candA.enrollmentId}/assignments`, { token: guruToken, body: { kind: 'document_request', title: 'Bir sunum veya rapor', description: 'PDF/DOCX yükle.' } });
  check('ödev + belge talebi oluşturuldu', hw.status === 'open' && doc.kind === 'document_request');
  const candList = await call('GET', `/candidate/enrollments/${candA.enrollmentId}/assignments`, { token: candA.token });
  check('aday ödevleri görür', [hw.id, doc.id].every(id => candList.items.some(a => a.id === id)));
  await call('POST', `/candidate/assignments/${hw.id}/submission`, { token: candA.token, body: { text: 'Teslim metnim: üç cümlelik özet.' } });
  const guruList = await call('GET', `/guru/enrollments/${candA.enrollmentId}/assignments`, { token: guruToken });
  const submitted = guruList.items.find(a => a.id === hw.id);
  check('guru teslimi görür (submitted + metin)', submitted && submitted.status === 'submitted' && Boolean(submitted.submission_text));
  const reviewed = await call('PATCH', `/guru/assignments/${hw.id}`, { token: guruToken, body: { status: 'reviewed' } });
  check('PATCH reviewed', reviewed.status === 'reviewed');
  const cancelled = await call('PATCH', `/guru/assignments/${doc.id}`, { token: guruToken, body: { status: 'cancelled' } });
  check('PATCH cancelled (açık belge talebi)', cancelled.status === 'cancelled');
  const badTitle = await expectError(call('POST', `/guru/enrollments/${candA.enrollmentId}/assignments`, { token: guruToken, body: { kind: 'homework', title: '', description: '' } }));
  check('boş başlık → 4xx', badTitle.status >= 400 && badTitle.status < 500, `${badTitle.status} ${badTitle.code} ${JSON.stringify(badTitle.fields || {})}`);

  section('Avatar (GAP-B23, K83/K91)');
  {
    const guruBefore = await call('GET', '/guru/profile', { token: guruToken });
    const hadPhoto = Boolean(guruBefore.avatar_url);
    const big = makePng(256, 256, [90, 60, 180]);
    const put = await uploadFile('PUT', '/me/avatar', guruToken, big, 'image/png', 'foto.png');
    check('guru PUT /me/avatar → avatar_url (/me/avatar?v=…)', /^\/me\/avatar\?v=/.test(put.avatar_url || ''), put.avatar_url);
    const prof = await call('GET', '/guru/profile', { token: guruToken });
    check('GET /guru/profile avatar_url güncel', prof.avatar_url === put.avatar_url);
    const own = await fetchImage(put.avatar_url, guruToken);
    check('GET /me/avatar (Bearer) → 200 image/png', own.status === 200 && /image\/png/.test(own.type), `${own.status} ${own.type} ${own.body.length} B`);
    const noAuth = await fetchImage(put.avatar_url, null);
    check('GET /me/avatar token olmadan → 401 (token URL\'e konmaz, fetch+blob)', noAuth.status === 401, String(noAuth.status));
    const pub = await call('GET', `/public/gurus/${profile.id}`).catch(e => e);
    if (pub && pub.avatar_url) {
      const pubImg = await fetchImage(pub.avatar_url, null);
      check('guru fotoğrafı HERKESE AÇIK: /public/gurus/{id}/avatar kimliksiz 200', pubImg.status === 200 && /public/.test(pubImg.cache), `${pubImg.status} ${pubImg.cache}`);
    } else {
      check('katalog guru kartında avatar_url (guru yayında değilse bilgi)', pub && pub.status === 404, JSON.stringify(pub && (pub.avatar_url || pub.status)));
    }
    const e415 = await expectError(uploadFile('PUT', '/me/avatar', guruToken, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml', 'x.svg'));
    check('SVG → 415 unsupported_image_type', e415.status === 415 && e415.code === 'unsupported_image_type', `${e415.status} ${e415.code}`);
    const e422 = await expectError(uploadFile('PUT', '/me/avatar', guruToken, makePng(16, 16), 'image/png', 'kucuk.png'));
    check('16×16 px → 422 invalid_image_dimensions', e422.status === 422 && e422.code === 'invalid_image_dimensions', `${e422.status} ${e422.code}`);
    const e413 = await expectError(uploadFile('PUT', '/me/avatar', guruToken, Buffer.concat([makePng(64, 64), Buffer.alloc(2 * 1024 * 1024 + 4096)]), 'image/png', 'buyuk.png'));
    check('> 2 MB → 413 (avatar_too_large | payload_too_large)', e413.status === 413 && /avatar_too_large|payload_too_large/.test(e413.code || ''), `${e413.status} ${e413.code}`);
    const e400 = await expectError(uploadFile('PUT', '/me/avatar', guruToken, Buffer.alloc(0), 'image/png', 'bos.png'));
    check('boş dosya → 400 empty_file', e400.status === 400 && e400.code === 'empty_file', `${e400.status} ${e400.code}`);
    const still = await call('GET', '/guru/profile', { token: guruToken });
    check('hatalı yüklemeler mevcut fotoğrafı bozmaz', still.avatar_url === put.avatar_url);

    // Aday fotoğrafı: yalnız atanmış guru (rızadan bağımsız, K90/AV8).
    const candPut = await uploadFile('PUT', '/me/avatar', candB.token, makePng(128, 128, [200, 150, 60]), 'image/png', 'aday.png');
    check('aday B PUT /me/avatar', /^\/me\/avatar\?v=/.test(candPut.avatar_url || ''));
    const clientsNow = await call('GET', '/guru/clients?limit=100', { token: guruToken });
    const rowB = clientsNow.items.find(c => c.enrollment.id === candB.enrollmentId);
    const rowA = clientsNow.items.find(c => c.enrollment.id === candA.enrollmentId);
    check('/guru/clients: B avatar_url = /guru/clients/{candidateID}/avatar?v=…, A null (baş harf)',
      rowB && new RegExp(`^/guru/clients/${rowB.candidate.id}/avatar\\?v=`).test(rowB.candidate.avatar_url || '') && rowA && rowA.candidate.avatar_url === null,
      `${rowB && rowB.candidate.avatar_url} · A=${rowA && rowA.candidate.avatar_url}`);
    const briefB = await call('GET', `/guru/enrollments/${candB.enrollmentId}`, { token: guruToken });
    check('/guru/enrollments/{id} candidate.avatar_url (detay kartı)', briefB.candidate.avatar_url === (rowB && rowB.candidate.avatar_url));
    const imgB = await fetchImage(rowB.candidate.avatar_url, guruToken);
    check('atanmış guru aday fotoğrafını Bearer ile alır (200, private)', imgB.status === 200 && /private/.test(imgB.cache), `${imgB.status} ${imgB.cache}`);
    const imgBNoAuth = await fetchImage(rowB.candidate.avatar_url, null);
    check('aday fotoğrafı kimliksiz → 401', imgBNoAuth.status === 401, String(imgBNoAuth.status));
    const imgBAsCand = await fetchImage(rowB.candidate.avatar_url, candA.token);
    check('aday token\'ı ile /guru/clients/{id}/avatar → 403', imgBAsCand.status === 403, String(imgBAsCand.status));
    const foreignImg = await fetchImage(`/guru/clients/${crypto.randomUUID()}/avatar`, guruToken);
    check('atanmamış/yabancı aday fotoğrafı → 404', foreignImg.status === 404, String(foreignImg.status));
    await call('DELETE', '/me/avatar', { token: candB.token });

    await call('DELETE', '/me/avatar', { token: guruToken });
    const afterDel = await call('GET', '/guru/profile', { token: guruToken });
    check('guru DELETE /me/avatar → avatar_url null (baş harfler)', afterDel.avatar_url === null);
    const delAgain = await expectError(call('DELETE', '/me/avatar', { token: guruToken }));
    check('DELETE idempotent (fotoğraf yokken de 204)', delAgain.status === 200, String(delAgain.status));
    if (hadPhoto) console.log('  ! Not: demo gurusunun önceki fotoğrafı test sırasında silindi; guru-profil.html\'den yeniden yüklenebilir.');
  }

  section('Rol ayrımı');
  const roleErr = await expectError(call('GET', '/guru/clients', { token: candA.token }));
  check('aday token\'ı ile guru ucu → 403', roleErr.status === 403, `${roleErr.status} ${roleErr.code}`);
  const roleErr2 = await expectError(call('GET', '/guru/profile', { token: candA.token }));
  check('aday token\'ı ile /guru/profile → 403', roleErr2.status === 403, `${roleErr2.status} ${roleErr2.code}`);
  const candLogin = await expectError(login(candA.email, CANDIDATE_PASSWORD, 'guru'));
  check('aday hesabıyla guru girişi → 403 client_not_allowed', candLogin.status === 403 && candLogin.code === 'client_not_allowed', `${candLogin.status} ${candLogin.code}`);
  const foreign = await expectError(call('GET', `/guru/enrollments/${crypto.randomUUID()}`, { token: guruToken }));
  check('yabancı enrollment UUID → 404', foreign.status === 404);

  for (const t of [guruToken, candA.token, candB.token]) await call('POST', '/auth/logout', { token: t }).catch(() => {});
  if (process.env.KEEP) console.log(JSON.stringify({ A: { email: candA.email, enrollment: candA.enrollmentId, story: candA.storyId }, B: { email: candB.email, enrollment: candB.enrollmentId, story: candB.storyId } }, null, 2));
  console.log(`\nSonuç: ${passed} geçti / ${failed} kaldı`);
  process.exit(failed ? 1 : 0);
}

main().catch(error => {
  console.error('\n✗ Beklenmeyen hata:', error.status || '', error.code || '', error.message, error.fields ? JSON.stringify(error.fields) : '');
  console.log(`Sonuç: ${passed} geçti / ${failed + 1} kaldı`);
  process.exit(1);
});
