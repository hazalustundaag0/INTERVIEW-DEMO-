#!/usr/bin/env node
// verify-82.mjs — 82 Aday Onboarding & Satın Alma akışının gerçek backend'e karşı uçtan uca doğrulaması.
// Önkoşul: API (varsayılan 127.0.0.1:8090; EMAIL_SENDER=log, PAYMENT_PROVIDER=devpay), site (varsayılan localhost:3000),
// seed-demo.mjs çalıştırılmış (demo guru; fiyat API'de yönetilen kurala bağlı).
// Opsiyonel env: DEMO_GURU_EMAIL, DEMO_GURU_PASSWORD (yanlış rol kontrolü için), WEB_BASE_URL, API_BASE_URL, MAIL_DIR,
// BACKEND_DIR (scripts/test-env.mjs).
// api-client.js sayfa bağlamı taklit edilerek vm içinde çalışır; istekler Origin: <site kökeni> ile gider.
// Sayfa betiklerinin yaptığı çağrılar aynı sırayla ve aynı gövdelerle yapılır; K50 ad bölme fonksiyonu
// doğrudan kayit-demo.js kaynağından alınır. Statik kontroller: localStorage, stitch kalıntısı, data-action.
// Login sayısı: 4 (IP limiti 30/15 dk).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { WEB_ORIGIN, WEB_BASE_URL, WEB_FETCH_BASE, API_FETCH_BASE, MAIL_DIR, describeTarget } from './test-env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const DEMO = path.join(FRONTEND, 'demo');
const ORIGIN = WEB_ORIGIN;   // tarayıcının Origin başlığı (scripts/test-env.mjs)
const API_ROOT = API_FETCH_BASE.replace(/\/api\/v1$/, '');
const GURU_EMAIL = process.env.DEMO_GURU_EMAIL || 'deniz.kurgu@gurus.example.test';
const GURU_PASSWORD = process.env.DEMO_GURU_PASSWORD || '';

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log('  ✓ ' + name); }
  else { failed += 1; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadClient(pageUrl, sharedStore) {
  const store = sharedStore || new Map();
  const url = new URL(pageUrl);
  const location = {
    get pathname() { return url.pathname; }, get search() { return url.search; },
    get hash() { return url.hash; }, get href() { return url.href; },
    set href(v) { /* yönlendirme yok */ }, replace() {}
  };
  const corsFetch = async (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    headers.set('Origin', ORIGIN);
    const res = await fetch(input, { ...init, headers, redirect: 'manual' });
    if (res.headers.get('access-control-allow-origin') !== ORIGIN) throw new TypeError('CORS: ACAO eksik (' + res.status + ')');
    return res;
  };
  const window = {
    APP_CONFIG: { apiBaseUrl: API_ROOT + '/api/v1', requestTimeoutMs: 15000 },
    sessionStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    crypto: globalThis.crypto, setTimeout, clearTimeout, dispatchEvent() {}
  };
  const ctx = {
    window, location, history: { replaceState() {}, state: null }, fetch: corsFetch,
    Headers, FormData, Blob, URL, URLSearchParams, AbortController,
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
    Intl, console, document: {}, CSS: { escape: s => s }
  };
  vm.createContext(ctx);
  // K112 (Etap 8): api-client.js rota tablosunu (window.Routes) kullanır.
  vm.runInContext(fs.readFileSync(path.join(DEMO, 'routes.js'), 'utf8'), ctx, { filename: 'routes.js' });
  vm.runInContext(fs.readFileSync(path.join(DEMO, 'api-client.js'), 'utf8'), ctx, { filename: 'api-client.js' });
  return { Api: window.Api, store };
}

function mailToken(email, since, linkPath) {
  const dir = MAIL_DIR;
  const files = fs.readdirSync(dir).map(n => path.join(dir, n))
    .filter(f => fs.statSync(f).mtimeMs >= since - 2000)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    if ((/^To:\s*(.+)$/m.exec(c) || [])[1]?.trim().toLowerCase() !== email.toLowerCase()) continue;
    const m = new RegExp(linkPath.replace('/', '\\/') + '#token=([A-Za-z0-9_-]+)').exec(c);
    if (m) return m[1];
  }
  return null;
}
async function waitToken(email, since, linkPath) {
  for (let i = 0; i < 25; i += 1) {
    const t = mailToken(email, since, linkPath);
    if (t) return t;
    await sleep(300);
  }
  return null;
}

async function expectError(fn, predicate) {
  try { await fn(); return { ok: false, detail: 'hata bekleniyordu' }; }
  catch (e) { return { ok: predicate(e), detail: `${e.status} ${e.code} ${JSON.stringify(e.fields || {})}`, error: e }; }
}

// ─── 1. Statik kontroller (sahiplik dosyaları) ───────────────────────────────
function staticChecks() {
  console.log('Statik kontroller (82 sayfaları)');
  const pages = ['index.html', 'danismanlar.html', 'danisman.html', 'danisman-profil.html', 'kayit.html', 'eposta.html', 'giris.html',
    'giris-hata-rol.html', 'davet.html', 'hizmet.html', 'siparis.html', 'odeme-bekle.html', 'odeme-ok.html', 'odeme-hata.html'];
  const scripts = ['landing-page.js', 'danismanlar.js', 'danisman.js', 'kayit-demo.js', 'eposta-demo.js', 'giris-page.js', 'davet-page.js',
    'hizmet-demo.js', 'siparis-page.js', 'odeme-ok-demo.js', 'odeme-durum.js'];
  const read = f => fs.readFileSync(path.join(DEMO, f), 'utf8');
  // Yorumlar hariç kaynak (açıklama yorumları kaldırılan demo davranışlarını adıyla anar).
  const code = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/<!--[\s\S]*?-->/g, '');
  const lsWrites = [...pages, ...scripts].filter(f => /localStorage\s*\.\s*(setItem|getItem|removeItem)/.test(code(f)));
  check('localStorage okuma/yazma = 0', lsWrites.length === 0, lsWrites.join(', '));
  const stitch = pages.filter(f => /pageNames = \{"\/stitch_|demo-flow-nav/.test(read(f)));
  check('stitch demo-flow-nav betiği yok', stitch.length === 0, stitch.join(', '));
  const shims = scripts.filter(f => /\b(listAdvisors|getAdvisor|getAdvisorCta|setSession|DemoAvailability)\s*\(/.test(code(f)));
  check('listAdvisors/getAdvisor/setSession/DemoAvailability çağrısı yok', shims.length === 0, shims.join(', '));
  check('fetch( doğrudan kullanılmıyor (yalnız window.Api)', scripts.every(f => !/\bfetch\(/.test(read(f))));
  const fake = [...pages, ...scripts].filter(f => /Selin Arslan|Elif Yılmaz|IY-48213907|#IV-2027|selin\.arslan@|ayse\.yilmaz@/.test(code(f)));
  check('sabit sahte isim/referans yok', fake.length === 0, fake.join(', '));
  const kayit = read('kayit.html');
  check('kayit: şifre alanı yok (K50)', !/type="password"/.test(kayit) && /id="fullName"/.test(kayit));
  check('kayit: data-action="register"', /data-action="register"/.test(kayit));
  check('eposta: OTP gizli + resend data-action', /data-otp-legacy/.test(read('eposta.html')) && /data-action="resend-verification"/.test(read('eposta.html')));
  check('davet: data-action="set-password" + davet-page.js', /data-action="set-password"/.test(read('davet.html')) && /davet-page\.js/.test(read('davet.html')));
  const siparis = read('siparis.html');
  const gv = /<input[^>]*id="guru-visibility-check"[^>]*>/.exec(siparis);
  check('siparis: ayrı guru_visibility kutusu, önceden işaretsiz (K51)', gv && !/checked/.test(gv[0]));
  const kvkk = /<input[^>]*id="consent-check"[^>]*>/.exec(siparis);
  check('siparis: KVKK kutusu önceden işaretsiz', kvkk && !/checked/.test(kvkk[0]));
  check('siparis: data-action="checkout-purchase"', /data-action="checkout-purchase"/.test(siparis));
  check('siparis-page: Havale/EFT yok (K55)', !/havale/i.test(read('siparis-page.js').replace(/\/\/.*$/gm, '')));
  check('odeme-hata: data-action="payment-retry"', /data-action="payment-retry"/.test(read('odeme-hata.html')));
  check('hizmet: Ödemeye geç data-action (betikte)', /data-action', 'checkout-preview'/.test(read('hizmet-demo.js')));
  check('landing: sahte istatistik şeridi yok (GAP-D07)', !/landing-proof-strip|250\+|Ortalama puan/.test(code('landing-page.js')));
  check('danisman-profil.js silindi', !fs.existsSync(path.join(DEMO, 'danisman-profil.js')));

  // Etap 4 (Ultraviolet, K78): Hazal'ın görsel değişiklikleri uygulandı, davranış bizim.
  const authPages = ['giris.html', 'giris-hata-rol.html', 'davet.html'];
  check('UV: giriş/davet başlığı login-heading-row gap-0, mor vurgu çizgisi ve h1 rengi yok',
    authPages.every(f => /login-heading-row flex items-center gap-0/.test(read(f)) && !/login-heading-accent|w-\[3px\] h-6|text-\[#51409D\] tracking-tight/.test(read(f))),
    authPages.filter(f => !/login-heading-row flex items-center gap-0/.test(read(f))).join(', '));
  const purpleBg = ['giris.html', 'giris-hata-rol.html', 'davet.html', 'eposta.html', 'kayit.html'].filter(f => /<(body|main)[^>]*background-color: rgb\(117, 100, 199\)/.test(read(f)));
  check('UV: body/main satır içi mor zemin yok', purpleBg.length === 0, purpleBg.join(', '));
  check('UV: kayit registration-form/-field/-input, satır içi odak betiği yok',
    /registration-form/.test(kayit) && (kayit.match(/registration-input/g) || []).length === 2 && !/onfocus=|onmouseover=/.test(kayit));
  check('UV: hizmet token sınıfları (bg-[#51409D]/border-[#7564C7] yok)',
    !/bg-\[#51409D\]|border-\[#7564C7\]/.test(read('hizmet.html')) && !/bg-\[#51409D\]|border-\[#7564C7\]/.test(code('hizmet-demo.js')));
  check('UV: siparis "1. Seans" + "KVKK aydınlatma metni"', /1\. Seans</.test(siparis) && /data-policy-title>KVKK aydınlatma metni</.test(siparis));
  check('UV: odeme-ok konfeti yok (HTML + JS)', !/confetti/i.test(read('odeme-ok.html')) && !/confetti/i.test(code('odeme-ok-demo.js')));
  check('UV: landing kart sınıfları var(--color-*), avatar data-demo-avatar',
    /var\(--color-paper-2\)/.test(code('landing-page.js')) && /dataset\.demoAvatar/.test(code('landing-page.js')) && !/#51409D|#EEECFF/.test(code('landing-page.js')));
  // K82: aday hedefi tek yardımcıdan.
  const k82 = ['kayit-demo.js', 'davet-page.js', 'giris-page.js'].filter(f => !/Api\.candidateLandingPage\(/.test(code(f)) || /'\/danismanlar(?![a-z0-9/-])'/.test(code(f)));
  check('K82: kayit/davet/giris-page → Api.candidateLandingPage (danismanlar.html hedefi yok)', k82.length === 0, k82.join(', '));
  // K83: guru fotoğrafı avatar_url (public) → <img>, yoksa baş harf.
  const k83 = ['landing-page.js', 'danismanlar.js', 'danisman.js', 'hizmet-demo.js', 'odeme-ok-demo.js', 'siparis-page.js']
    .filter(f => !/avatarUrl|avatar_url/.test(code(f)));
  check('K83: guru avatarı avatar_url ile (6 betik)', k83.length === 0, k83.join(', '));
  check('K83: Advisors VM avatarUrl = apiBaseUrl + avatar_url', /avatarUrl: avatarUrl\(card\.avatar_url\)/.test(read('js/advisors.js')));
}

// K50: kayit-demo.js'teki splitFullName gerçek kaynaktan alınır.
function nameSplitChecks() {
  console.log('K50 ad soyad bölme (kayit-demo.js kaynağı)');
  const src = fs.readFileSync(path.join(DEMO, 'kayit-demo.js'), 'utf8');
  const m = /function splitFullName\(value\) \{[\s\S]*?\n  \}/.exec(src);
  check('splitFullName bulundu', Boolean(m));
  if (!m) return null;
  const split = vm.runInNewContext('(' + m[0] + ')');
  const a = split('  Ayşe   Nur Yılmaz ');
  check('"Ayşe Nur Yılmaz" → Ayşe Nur / Yılmaz', a.firstName === 'Ayşe Nur' && a.lastName === 'Yılmaz', JSON.stringify(a));
  const b = split('Cher');
  check('tek kelime → soyad boş (form hata verir)', b.firstName === 'Cher' && b.lastName === '');
  return split;
}

async function devServer() {
  console.log('Dev sunucusu (yeni/değişen dosyalar)');
  for (const f of ['davet-page.js', 'giris-page.js', 'odeme-durum.js', 'hizmet-demo.js', 'siparis-page.js']) {
    const r = await fetch(WEB_FETCH_BASE + '/demo/' + f);
    check('/demo/' + f + ' 200', r.status === 200);
  }
  const r = await fetch(WEB_FETCH_BASE + '/reset-password', { redirect: 'manual' });
  // dev-server.mjs ve Docker web (nginx) göreli Location döner; parametre sırası farklı olabilir.
  const loc = new URL(r.headers.get('location') || '', 'http://x');
  check('/reset-password → davet.html?mode=reset', loc.pathname === '/parola' && loc.searchParams.get('mode') === 'reset', r.headers.get('location'));
}

// ─── 2. Uçtan uca akış ──────────────────────────────────────────────────────
async function flow(split) {
  console.log('Public katalog (index / danismanlar / danisman / hizmet)');
  const pub = loadClient(WEB_BASE_URL + '/').Api;
  const services = (await pub.get('/public/services', { auth: false })).items;
  const service = services[0];
  check('aktif hizmet var', Boolean(service), JSON.stringify(services.map(s => s.code)));
  const servicePrice = service?.price;
  const validPrice = Boolean(servicePrice && Number.isSafeInteger(servicePrice.amount_minor) &&
    servicePrice.amount_minor >= 0 && /^[A-Z]{3}$/.test(servicePrice.currency));
  check('fiyat API kuralından geliyor', validPrice, JSON.stringify(servicePrice));
  if (!validPrice) throw new Error('Aktif hizmet için API fiyat kuralı yok; sipariş akışı başlatılmadı.');
  check('fiyat biçimi API tutarı/para birimine bağlı', pub.format.money(servicePrice.amount_minor, servicePrice.currency) !== '', JSON.stringify(servicePrice));
  const gurus = await pub.listAll('/public/gurus', { auth: false });
  check('GET /public/gurus (listAll) ≥1', gurus.length >= 1, String(gurus.length));
  const guru = gurus.find(g => g.first_name === 'Deniz') || gurus[0];
  const sectorCode = guru.sectors[0]?.code;
  const filtered = await pub.listAll('/public/gurus', { auth: false, query: { sector: sectorCode } });
  check(`sektör filtresi ?sector=${sectorCode}`, filtered.length >= 1 && filtered.every(g => g.sectors.some(s => s.code === sectorCode)));
  const one = await pub.get('/public/gurus/' + guru.id, { auth: false });
  check('GET /public/gurus/{id} (danisman.html)', one.id === guru.id);
  const missing = await expectError(() => pub.get('/public/gurus/00000000-0000-7000-8000-000000000000', { auth: false }), e => e.status === 404);
  check('bilinmeyen danışman → 404 ("bulunamadı" kartı)', missing.ok, missing.detail);
  check('K83: katalog kartında avatar_url alanı var (null = baş harf)', gurus.every(g => 'avatar_url' in g), JSON.stringify(gurus.map(g => g.avatar_url)));
  const withPhoto = gurus.find(g => g.avatar_url);
  if (withPhoto) {
    const photoUrl = API_ROOT + '/api/v1' + withPhoto.avatar_url;
    const res = await fetch(photoUrl, { headers: { Origin: ORIGIN } });
    check('K83: public guru fotoğrafı kimliksiz <img> ile alınabilir (apiBaseUrl + avatar_url)',
      res.ok && /^image\//.test(res.headers.get('content-type') || ''), res.status + ' ' + res.headers.get('content-type'));
  } else {
    console.log('  – katalogda fotoğraflı danışman yok: fotoğraf indirme kontrolü atlandı');
  }
  const texts = (await pub.get('/public/consent-texts', { auth: false })).items;
  const byKind = Object.fromEntries(texts.map(t => [t.kind, t]));
  check('rıza metinleri: kvkk_disclosure, explicit_consent, guru_visibility', Boolean(byKind.kvkk_disclosure && byKind.explicit_consent && byKind.guru_visibility));

  console.log('Kayıt → e-posta → davet (parola) → giriş');
  const email = `aday82+${Date.now()}@example.test`;
  const password = 'Aday82-Yerel-Parola-2026';
  const parts = split ? split('Aday Seksen İki') : { firstName: 'Aday Seksen', lastName: 'İki' };
  const kayit = loadClient(WEB_BASE_URL + '/kayit').Api;
  const v422 = await expectError(() => kayit.auth.register({ firstName: 'Aday', lastName: '', email }), e => e.status === 422 && 'last_name' in e.fields);
  check('register boş soyad → 422 fields.last_name', v422.ok, v422.detail);
  const since = Date.now();
  const reg = await kayit.auth.register({ firstName: parts.firstName, lastName: parts.lastName, email, language: 'tr' });
  check('POST /auth/register → 202', reg !== undefined);
  const token = await waitToken(email, since, '/verify-email');
  check('doğrulama bağlantısı data/mail\'de', Boolean(token));
  const resent = await kayit.auth.resendVerification(email).then(() => true, e => e);
  check('eposta: resend-verification → 202', resent === true, resent && resent.code);

  const davetUrl = WEB_BASE_URL + '/parola?mode=verify';
  const davetStore = new Map();
  const davet = loadClient(davetUrl, davetStore).Api;
  check('davet?mode=verify pageRole = candidate', davet.pageRole() === 'candidate');
  const weak = await expectError(() => davet.auth.verifyEmail(token, 'kisa-parola'), e => e.isValidation && e.fields.password);
  check('kısa parola → weak_password fields.password', weak.ok, weak.detail);
  const latestToken = mailToken(email, since, '/verify-email') || token;
  const verified = await davet.auth.verifyEmail(latestToken, password);
  check('verify-email → user.role candidate, ad/soyad bölünmüş', verified.user.role === 'candidate' &&
    verified.user.first_name === 'Aday Seksen' && verified.user.last_name === 'İki', JSON.stringify(verified.user));
  const again = await expectError(() => davet.auth.verifyEmail(latestToken, password), e => e.status === 400 || e.status === 409);
  check('aynı bağlantı tekrar → invalid_link / password_already_set', again.ok, again.detail);
  await davet.auth.login({ email: verified.user.email, password, clientType: 'candidate' });
  check('davet-page otomatik giriş → idToken.candidate (sessionStorage)', davetStore.has('idToken.candidate') && !davetStore.has('idToken.guru'));
  const enr0 = await davet.page('/candidate/enrollments', { limit: 1 });
  check('yeni aday: kayıt yok', enr0.items.length === 0);
  check('K82: yeni aday → Api.candidateLandingPage() = index.html', (await davet.candidateLandingPage()) === '/');
  check('K82: güvenli ?return= önceliklidir', (await davet.candidateLandingPage({ returnTarget: 'hizmet.html?service=x' })) === '/hizmet?service=x');

  console.log('Şifremi unuttum → sıfırlama → giriş');
  const giris = loadClient(WEB_BASE_URL + '/giris').Api;
  const bad = await expectError(() => giris.auth.login({ email, password: 'Yanlis-Parola-12345' }), e => e.status === 401 && e.code === 'invalid_credentials');
  check('yanlış parola → 401 invalid_credentials', bad.ok, bad.detail);
  const since2 = Date.now();
  await giris.auth.requestPasswordReset(email);
  const resetToken = await waitToken(email, since2, '/reset-password');
  check('reset bağlantısı data/mail\'de (/reset-password#token=)', Boolean(resetToken));
  const newPassword = password + '-Yeni';
  const reset = loadClient(WEB_BASE_URL + '/parola?mode=reset').Api;
  const resetRes = await reset.auth.confirmPasswordReset(resetToken, newPassword);
  check('password-reset/confirm → user', resetRes.user.email === email);
  const store = new Map();
  const cand = loadClient(WEB_BASE_URL + '/giris', store).Api;
  await cand.auth.login({ email, password: newPassword, clientType: 'candidate' });
  const cached = JSON.parse(store.get('idUser.candidate') || '{}');
  check('yeni parolayla giriş; önbellekte e-posta yok', store.has('idToken.candidate') && !('email' in cached));

  if (GURU_PASSWORD) {
    const wrong = await expectError(() => giris.auth.login({ email: GURU_EMAIL, password: GURU_PASSWORD, clientType: 'candidate' }), e => e.code === 'client_not_allowed');
    check('guru hesabıyla aday girişi → client_not_allowed (giris-hata-rol)', wrong.ok, wrong.detail);
  } else {
    console.log('  – DEMO_GURU_PASSWORD yok: yanlış rol kontrolü atlandı');
  }

  console.log('Hizmet → sipariş (KVKK + guru_visibility) → devpay ödeme');
  const page = url => loadClient(url, store).Api;
  const hizmet = page(`${WEB_BASE_URL}/hizmet?service=${service.id}&guru=${guru.id}`);
  const preview = await hizmet.get('/candidate/checkout/preview', { query: { service_id: service.id, guru_id: guru.id } });
  check('preview: API fiyatı ve guru', preview.session_count === 2 && preview.session_duration_minutes > 0 &&
    preview.amount_minor === servicePrice.amount_minor && preview.currency === servicePrice.currency && preview.guru.id === guru.id, JSON.stringify({ c: preview.session_count, a: preview.amount_minor }));
  const badPrev = await expectError(() => hizmet.get('/candidate/checkout/preview', { query: { service_id: service.id } }), e => e.status === 422);
  check('preview eksik guru_id → 422', badPrev.ok, badPrev.detail);

  const siparis = page(`${WEB_BASE_URL}/siparis?service=${service.id}&guru=${guru.id}`);
  let status = Object.fromEntries((await siparis.get('/me/consents')).items.map(i => [i.kind, i]));
  check('başlangıçta KVKK/guru_visibility rızası yok', !status.kvkk_disclosure?.up_to_date && !status.guru_visibility?.active);
  for (const kind of ['kvkk_disclosure', 'explicit_consent', 'guru_visibility']) {
    const rec = await siparis.post('/me/consents', { consent_text_id: byKind[kind].id });
    check(`POST /me/consents ${kind} (güncel sürüm v${byKind[kind].version})`, rec.kind === kind && rec.consent_text_id === byKind[kind].id);
  }
  status = Object.fromEntries((await siparis.get('/me/consents')).items.map(i => [i.kind, i]));
  check('rıza durumu up_to_date (kvkk + explicit + guru_visibility)', status.kvkk_disclosure.up_to_date && status.explicit_consent.up_to_date && status.guru_visibility.up_to_date);

  const noConfirm = await expectError(() => siparis.post('/candidate/checkout/purchase', { service_id: service.id, guru_id: guru.id }, { idempotencyKey: siparis.newIdempotencyKey() }),
    e => e.status === 400 || e.status === 422);
  check('confirm olmadan satın alma reddedilir', noConfirm.ok, noConfirm.detail);
  const key = siparis.newIdempotencyKey();
  const purchase = await siparis.confirm('POST', '/candidate/checkout/purchase', { service_id: service.id, guru_id: guru.id }, { idempotencyKey: key });
  check('purchase → payment PAID (devpay), replayed=false', purchase.payment.status === 'PAID' && purchase.replayed === false, purchase.payment.status);
  check('provider_reference devpay_…', /^devpay_/.test(purchase.payment.provider_reference || ''), purchase.payment.provider_reference);
  check('enrollment tutarı API fiyatıyla aynı', purchase.enrollment.status === 'active' &&
    purchase.enrollment.amount_minor === servicePrice.amount_minor && purchase.enrollment.currency === servicePrice.currency, purchase.enrollment.status);
  check('redirect_url yok → odeme-ok.html?enrollment=', !purchase.redirect_url);
  const replay = await siparis.confirm('POST', '/candidate/checkout/purchase', { service_id: service.id, guru_id: guru.id }, { idempotencyKey: key });
  check('aynı Idempotency-Key → replayed=true, aynı enrollment (çift tahsilat yok)', replay.replayed === true && replay.enrollment.id === purchase.enrollment.id);

  console.log('Ödeme sonucu ekranları');
  const eid = purchase.enrollment.id;
  const ok = page(`${WEB_BASE_URL}/odeme/basarili?enrollment=${eid}`);
  const detail = await ok.get('/candidate/enrollments/' + eid);
  check('odeme-ok: enrollment detayında PAID ödeme + paid_at', detail.payments.some(p => p.status === 'PAID' && p.paid_at));
  const svc = await ok.get('/public/services/' + detail.enrollment.service_id, { auth: false });
  check('odeme-ok: hizmet adı', svc.name === service.name);
  const pays = await page(`${WEB_BASE_URL}/odeme/bekleniyor?enrollment=${eid}`).get(`/candidate/enrollments/${eid}/payments`);
  check('odeme-bekle yoklaması: GET …/payments → PAID', pays.items[0]?.status === 'PAID');
  const hata = page(`${WEB_BASE_URL}/odeme/hata?enrollment=${eid}`);
  const retry = await expectError(() => hata.confirm('POST', `/candidate/enrollments/${eid}/payments/retry`, undefined, { idempotencyKey: hata.newIdempotencyKey() }),
    e => e.status === 409 && e.code === 'enrollment_not_payable');
  check('odeme-hata: ödenmiş kayıtta retry → 409 enrollment_not_payable (→ odeme-ok)', retry.ok, retry.detail);
  const foreign = await expectError(() => ok.get('/candidate/enrollments/00000000-0000-7000-8000-000000000000'), e => e.status === 404);
  check('yabancı enrollment UUID → 404', foreign.ok, foreign.detail);
  const enr = await ok.page('/candidate/enrollments', { limit: 1 });
  check('girişte kayıt var', enr.items[0]?.id === eid);
  check('K82: aktif kaydı olan aday → Api.candidateLandingPage() = ana.html', (await ok.candidateLandingPage()) === '/panel');
  console.log('  (aday: ' + email + ')');
}

(async () => {
  try {
    staticChecks();
    const split = nameSplitChecks();
    await devServer();
    await flow(split);
  } catch (error) {
    failed += 1;
    console.log('  ✗ beklenmeyen hata: ' + (error && (error.stack || error.message)));
  }
  console.log(`\nSonuç: ${passed} geçti / ${failed} kaldı`);
  process.exit(failed ? 1 : 0);
})();
