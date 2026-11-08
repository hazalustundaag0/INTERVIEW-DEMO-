#!/usr/bin/env node
// verify-83.mjs — 83 Aday Yolculuk UI'ının gerçek backend'e karşı doğrulaması (tarayıcısız).
// Önkoşul: API 127.0.0.1:8090 (AI_PROVIDER=dev, EMAIL_SENDER=log, CORS_ALLOWED_ORIGINS=http://localhost:3000),
// seed-demo.mjs çalıştırılmış (guru deniz.kurgu@…, 1.500 TRY). Env: DEMO_GURU_PASSWORD (vars. yerel seed parolası).
// Aday sayfalarının kullandığı api-client.js + aday-yolculuk.js, sayfa bağlamı taklidiyle vm içinde çalışır; her istek
// tarayıcı gibi Origin: http://localhost:3000 ile gider ve CORS yanıtı denetlenir. Guru adımları (seans tamamlama, not,
// ödev) doğrudan HTTP ile yapılır. Ayrıca statik kontroller: localStorage yazımı, data-action, sahte veri kalıntısı.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const DEMO = path.join(FRONTEND, 'demo');
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || path.join(FRONTEND, '..', 'backend'));
const ORIGIN = 'http://localhost:3000';
const API_ROOT = 'http://127.0.0.1:8090';
const API = API_ROOT + '/api/v1';
const GURU_EMAIL = process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || 'Yerel-Danisman-2026!';
const CANDIDATE_PASSWORD = 'Kumsal-Yerel-Parola-2026';

const PAGES = ['ana', 'profil', 'cv', 'soru1', 'soru2', 'soru3', 'soru4', 'soru5', 'hikaye-giris', 'hikaye-yukle', 'ciktilar',
  'randevu-on', 'randevu-ok', 'takvim', 'seanslar', 'seans-notlari', 'seans2-ok', 'odevler', 'odev-goruntule', 'odev-teslim'];
const SCRIPTS = ['aday-yolculuk', 'ana-page', 'ana-dashboard', 'ana-dashboard-ui', 'profil-page', 'cv-demo', 'randevu-on-demo',
  'takvim-demo', 'randevu-ok-page', 'seanslar-page', 'seans-notlari-page', 'hikaye-demo', 'hikaye-giris-ui', 'soru-demo',
  'hikaye-yukle-demo', 'hikaye-aday', 'odevler-page'];

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
    'consent-grant', 'booking-continue', 'booking-confirm', 'qa-start', 'answer-save', 'answer-skip', 'qa-pause',
    'story-external-upload', 'outputs-generate', 'story-fill-gap', 'story-finalize', 'assignment-submit', 'assignment-download'];
  const missing = actions.filter(action => !code.includes("'" + action + "'") && !code.includes('"' + action + '"'));
  check('API butonlarında data-action (' + actions.length + ' aksiyon)', missing.length === 0, missing.join(','));
  check('Her sayfa aday-yolculuk.js yükler', html.every(([, s]) => s.includes('src="aday-yolculuk.js"')), html.filter(([, s]) => !s.includes('src="aday-yolculuk.js"')).map(([n]) => n).join(','));
  check('ciktilar: hikaye-veri.js / örnek hikâye yüklenmez, hikaye-aday.js yüklenir',
    !html.find(([n]) => n === 'ciktilar')[1].includes('hikaye-veri.js') && html.find(([n]) => n === 'ciktilar')[1].includes('hikaye-aday.js'));
  check('"Hikâyemi onayla" confirm:true ile finalize', /Api\.confirm\('POST', '\/candidate\/stories\/' \+ [^\n]+'\/finalize'/.test(code));
  check('YZ uçlarında aiTimeoutMs', (code.match(/aiTimeoutMs/g) || []).length >= 4);
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
  for (const file of ['api-client.js', 'appointment-sync.js', 'aday-yolculuk.js']) {
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
  const dir = path.join(BACKEND_DIR, 'data', 'mail');
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
  const page = name => loadPage('http://localhost:3000/demo/' + name, store);
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
  check('satın alma öncesi: aktif kayıt yok → "Danışmanını seç"', !ctx.enrollment && Journey.nextStep(ctx).cta.href === 'danismanlar.html');
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
  check('sıradaki adım: Profilini tamamla → profil.html', Journey.nextStep(ctx, pre).cta.href === 'profil.html');
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
  check('sıradaki adım: 1. seans randevusu → takvim.html', Journey.nextStep(ctx, pre).cta.href === 'takvim.html');

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
  check('ana ekran: "1. seansına hazırlan", ilerleme 1. Seans', Journey.nextStep(ctx, { missing: [] }).cta.href === 'seanslar.html' && Journey.progress(ctx).current === 1);

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

  section('Hikâye: soru 1–5, takip sorusu, duraklat/devam');
  ({ Api, Journey } = page('hikaye-giris.html'));
  ctx = await Journey.load();
  check('sıradaki adım: Satış hikâyeni oluştur', Journey.nextStep(ctx, { missing: [] }).cta.href === 'hikaye-giris.html');
  const sid = ctx.story.id;
  let state = await Api.post('/candidate/stories/' + sid + '/qa/start');
  const questions = state.questions.slice().sort((a, b) => a.sequence_no - b.sequence_no);
  check('qa/start → soru metinleri API\'den (' + questions.length + ')', state.session.status === 'QA_IN_PROGRESS' && questions.length >= 5 && state.next.question.sequence_no === 1);
  const ai = { timeoutMs: 75000 };
  let res = await Api.put('/candidate/stories/' + sid + '/answers/' + questions[0].id, { text: 'Satışta iyiyim.' }, ai);
  check('kısa cevap → dev motor tek takip sorusu üretir', Boolean(res.follow_up && res.follow_up.question_text), JSON.stringify(res.follow_up));
  const fu = res.follow_up;
  await Api.post('/candidate/stories/' + sid + '/pause', { last_screen: 'soru1.html' });
  ({ Api, Journey } = page('hikaye-giris.html'));
  state = await Api.post('/candidate/stories/' + sid + '/resume');
  check('pause → resume: last_screen=soru1.html, bekleyen takip sorusu korunur', state.session.last_screen === 'soru1.html' && state.next.follow_up && state.next.follow_up.id === fu.id);
  res = await Api.put('/candidate/stories/' + sid + '/follow-ups/' + fu.id, { text: 'Geçen yıl kurumsal müşteri portföyünü yüzde yirmi büyüttüm ve üç yeni anlaşma kapattım.' }, ai);
  check('takip cevabı → ikinci takip yok, sıradaki soru 2', !res.follow_up && res.next.question && res.next.question.sequence_no === 2);
  res = await Api.put('/candidate/stories/' + sid + '/answers/' + questions[1].id, { dont_know: true }, ai);
  check('"Hatırlamıyorum" → is_info_needed', res.answer.is_info_needed === true);
  const long = [
    'Bankacılıktan teknoloji satışına geçerken ürün bilgisi eksikliğimi altı haftalık yoğun bir eğitimle kapattım.',
    'Kendimi müşterinin sorununu dinleyen ve çözümü sade anlatan biri olarak görüyorum.',
    'Bir sonraki adımda kurumsal SaaS satışında kıdemli rol alıp ekip hedeflerine katkı vermek istiyorum.'
  ];
  for (let i = 2; i < 5; i += 1) res = await Api.put('/candidate/stories/' + sid + '/answers/' + questions[i].id, { text: long[i - 2] }, ai);
  check('5 soru tamamlandı → next.done', res.next.done === true && !res.follow_up, JSON.stringify(res.next));

  section('Taslak → düzenleme → çıktılar → onay (K56/K58)');
  ({ Api, Journey } = page('soru5.html'));
  const draft = await Api.post('/candidate/stories/' + sid + '/drafts/generate', undefined, ai);
  const allSourced = draft.sources.every(s => s.is_unsourced ? s.sentence_text.includes('[bilgi gerekli]') : ['answer', 'follow_up'].includes(s.source_type));
  check('drafts/generate 201: her cümle kaynaklı (answer/follow_up) ya da [bilgi gerekli]', draft.sources.length > 0 && allSourced, JSON.stringify(draft.sources.map(s => s.source_type)));
  check('takip cevabı taslakta alıntılanır', draft.sources.some(s => s.source_type === 'follow_up'));
  check('"bilmiyorum" cevabı [bilgi gerekli] cümlesi', draft.info_needed.length >= 1);
  ({ Api, Journey } = page('ciktilar.html'));
  ctx = await Journey.load();
  check('ciktilar/menü: hikâye ≥ DRAFT_GENERATED', Journey.atLeast(ctx.story, 'DRAFT_GENERATED'));
  // hikaye-aday.js'in [bilgi gerekli] tamamlama akışı: cümle adayın kendi metniyle değiştirilir.
  const sentences = draft.sources.slice().sort((a, b) => a.sentence_no - b.sentence_no).map(s => s.sentence_text);
  const gapIndex = sentences.findIndex(s => s.includes('[bilgi gerekli]'));
  sentences[gapIndex] = 'Zorluk döneminde ekibin yeni müşteri kazanımını iki katına çıkardım.';
  const edited = await Api.post('/candidate/stories/' + sid + '/drafts', { based_on_draft_id: draft.draft.id, story_text: sentences.join(' '), skeleton: draft.draft.skeleton });
  check('aday düzenlemesi → yeni sürüm, değişen cümle candidate_edit kaynaklı', edited.draft.version_no === draft.draft.version_no + 1 && edited.draft.created_by === 'candidate' &&
    edited.sources.some(s => s.source_type === 'candidate_edit' && s.sentence_text.includes('iki katına')), JSON.stringify(edited.sources.map(s => s.source_type)));
  err = await expectError(Api.confirm('POST', '/candidate/stories/' + sid + '/finalize', { draft_id: edited.draft.id }));
  const afterEarly = (await Api.get('/candidate/stories/' + sid)).session;
  check('çıktılar olmadan onay COMPLETED yapmaz (UI butonu kapalı)', !err && afterEarly.status === 'CANDIDATE_EDITED', err ? err.code : afterEarly.status);
  const outs = await Api.post('/candidate/stories/' + sid + '/outputs/generate', undefined, ai);
  const types = new Set(outs.outputs.map(o => o.output_type));
  check('outputs/generate 201: mülakat cevapları + CV özeti', types.has('interview_answer') && types.has('cv_summary'), [...types].join(','));
  check('çıktılar son taslağa bağlı', outs.outputs.every(o => o.draft_id === edited.draft.id));
  ctx = await Journey.load();
  check('SUMMARY_READY; ana ekran "Hikâyeni onayla"', ctx.story.status === 'SUMMARY_READY' && Journey.nextStep(ctx, { missing: [] }).title === 'Hikâyeni onayla');

  section('Hazır hikâye yükleme yolu (/external)');
  ({ Api, Journey } = page('hikaye-yukle.html'));
  const ext = await Api.post('/candidate/stories/' + sid + '/external', { text: 'Kendi hazırladığım hikâye: bankacılıktan teknolojiye geçtim. Müşteri portföyümü büyüttüm.' });
  check('metin yükleme → external_upload taslağı, cümleler external kaynaklı', ext.draft.created_by === 'external_upload' && ext.sources.every(s => s.source_type === 'external'));
  err = await expectError(Api.upload('/candidate/stories/' + sid + '/external', { file: new File(['x'], 'h.txt', { type: 'text/plain' }), fields: { text: 'deneme.' } }));
  check('desteklenmeyen dosya türü reddedilir (415)', err && err.status === 415, err && (err.status + ' ' + err.code));
  ctx = await Journey.load();
  check('yükleme sonrası durum DRAFT_GENERATED (çıktılar güncellenmeli)', ctx.story.status === 'DRAFT_GENERATED');
  const outs2 = await Api.post('/candidate/stories/' + sid + '/outputs/generate', undefined, ai);
  // ListLatestOutputs tür+öğe başına en son sürümü döner; yeni taslak daha az öğe üretirse eski taslağın öğeleri
  // listede kalabilir → hikaye-aday.js yalnız son taslağa ait çıktıları gösterir (draft_id filtresi).
  const extOutputs = outs2.outputs.filter(o => o.draft_id === ext.draft.id);
  check('çıktılar yüklenen hikâyeden yeniden üretildi (son taslağa ait ' + extOutputs.length + ' çıktı)', extOutputs.length > 0 && extOutputs.some(o => o.output_type === 'cv_summary'),
    JSON.stringify(outs2.outputs.map(o => o.output_type + ':' + (o.draft_id === ext.draft.id ? 'yeni' : 'eski'))));
  const leftover = outs2.outputs.filter(o => o.draft_id !== ext.draft.id);
  if (leftover.length) console.log('    ℹ eski taslaktan kalan çıktı öğesi: ' + leftover.map(o => o.output_type + '#' + o.item_no).join(', ') + ' (UI filtreler)');

  section('"Hikâyemi onayla" → COMPLETED (FR-70, K56/K61)');
  ({ Api, Journey } = page('ciktilar.html'));
  err = await expectError(Api.post('/candidate/stories/' + sid + '/finalize', { draft_id: ext.draft.id }));
  check('confirm olmadan → 400 confirmation_required', err && err.code === 'confirmation_required', err && err.code);
  const fin = await Api.confirm('POST', '/candidate/stories/' + sid + '/finalize', { draft_id: ext.draft.id });
  check('confirm:true → COMPLETED, final_story_draft_id', fin.status === 'COMPLETED' && fin.final_story_draft_id === ext.draft.id && Boolean(fin.completed_at));
  ctx = await Journey.load();
  const prog = Journey.progress(ctx);
  check('ana ekran: Hikâyen tamam; sıradaki adım 2. seans randevusu (K61)', prog.steps[2].state === 'complete' && Journey.nextStep(ctx, { missing: [] }).cta.href === 'takvim.html');
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
