#!/usr/bin/env node
// dom-smoke-83.mjs — 83 aday sayfalarının jsdom içinde, gerçek API'ye karşı DOM duman testi (tarayıcı yerine).
// Bağımlılık kurmaz: JSDOM_NODE_MODULES = jsdom@16 içeren bir node_modules klasörü (vars. bu makinedeki VS Code
// eklentisi). CDN (Tailwind, fontlar) yüklenmez; :scope seçicisi ve gezinme jsdom kısıtı nedeniyle yalnız testte shim'lenir.
// Önkoşul: verify-83.mjs ile aynı (API :8090, AI_PROVIDER=dev, seed). Env: DEMO_GURU_PASSWORD; adresler
// WEB_BASE_URL / API_BASE_URL / MAIL_DIR (scripts/test-env.mjs). Sayfalar diskten, config.js API_BASE_URL'e çevrilerek yüklenir.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { WEB_ORIGIN, WEB_BASE_URL, WEB_FETCH_BASE, API_FETCH_BASE, MAIL_DIR, describeTarget, rewriteConfigJs, isConfigJs } from './test-env.mjs';
const require = createRequire(import.meta.url);
const JROOT = (process.env.JSDOM_NODE_MODULES || 'C:/Users/RESUL/.vscode/extensions/bianxianyang.htmlplay-0.0.10/node_modules').replace(/[\/]?$/, '/');
// jsdom gezinme yapmaz → navigate() çağrılarını kaydet (Location-impl yüklenmeden önce, yalnız test).
const navModule = require(JROOT + 'jsdom/lib/jsdom/living/window/navigation.js');
const whatwgURL = require(JROOT + 'whatwg-url');
navModule.navigate = (window, newURL) => { (window.__navs || (window.__navs = [])).push(whatwgURL.serializeURL(newURL)); };
const { JSDOM, ResourceLoader, VirtualConsole } = require(JROOT + 'jsdom');

const FRONTEND = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const API = API_FETCH_BASE;
const ORIGIN = WEB_ORIGIN;   // tarayıcının Origin başlığı (scripts/test-env.mjs)
const sleep = ms => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const check = (n, ok, d) => { if (ok) { passed++; console.log('  ✓ ' + n); } else { failed++; console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };

async function raw(method, p, { token, body, headers = {} } = {}) {
  const h = { Origin: ORIGIN, ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(API + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  return { status: r.status, data: t ? JSON.parse(t) : null };
}
async function mailToken(email, since) {
  const dir = MAIL_DIR;
  for (let i = 0; i < 60; i++) {
    for (const f of fs.readdirSync(dir).map(n => path.join(dir, n)).filter(f => fs.statSync(f).mtimeMs >= since - 2000)) {
      const c = fs.readFileSync(f, 'utf8');
      if (!c.toLowerCase().includes(email.toLowerCase())) continue;
      const m = /verify-email#token=(idv_[A-Za-z0-9_-]+)/.exec(c);
      if (m) return m[1];
    }
    await sleep(250);
  }
  throw new Error('mail yok');
}

class Loader extends ResourceLoader {
  fetch(url) {
    if (url.startsWith(ORIGIN + '/')) {
      // Etap 4: stil dosyaları yüklenmez. jsdom 16'nın nwsapi'si Hazal'ın theme.css seçicilerinde
      // getComputedStyle sırasında "RangeError: Invalid string length" atıyor (tarayıcıda yok); jsdom
      // düzen/stil hesaplamadığı için bu testte CSS'e ihtiyaç yok. Ürün CSS'i değişmez (yalnız test).
      if (/\.css(?:[?#]|$)/i.test(url)) return Promise.resolve(Buffer.from(''));
      const p = path.join(FRONTEND, decodeURIComponent(new URL(url).pathname));
      // Etap 5: config.js diskten okunur; API tabanı API_BASE_URL'e çevrilir (Docker web imajının açılışta
      // yaptığı yeniden yazımın test eşdeğeri). Varsayılanda değer aynıdır.
      if (isConfigJs(url)) return Promise.resolve(Buffer.from(rewriteConfigJs(fs.readFileSync(p, 'utf8'))));
      return Promise.resolve(fs.readFileSync(p));
    }
    return Promise.resolve(Buffer.from('')); // CDN (tailwind, fontlar) yüklenmez
  }
}

async function open(page, auth, { wait = 3500, until } = {}) {
  const html = fs.readFileSync(path.join(FRONTEND, 'demo', page.split('?')[0]), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.message || e); if (!/tailwind|Could not parse CSS/.test(m)) errors.push(m.slice(0, 300) + (e.detail ? ' :: ' + String(e.detail.stack || e.detail).slice(0, 400) : '')); });
  vc.on('error', e => errors.push(String(e).slice(0, 200)));
  const nav = [];
  const dom = new JSDOM(html, {
    url: ORIGIN + '/demo/' + page, runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        headers.set('Origin', ORIGIN);
        return fetch(input, { ...init, headers });
      };
      Object.assign(w, { AbortController, Headers, FormData, Blob, File, Request, Response });
      w.CSS = { escape: s => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c) };
      // jsdom 16 / nwsapi ':scope' desteklemez → geçici öznitelikle eşdeğer seçici (yalnız test ortamı).
      let scopeSeq = 0;
      for (const proto of [w.Element.prototype]) {
        for (const name of ['querySelector', 'querySelectorAll', 'matches', 'closest']) {
          const orig = proto[name];
          proto[name] = function (sel) {
            if (typeof sel !== 'string' || !sel.includes(':scope')) return orig.call(this, sel);
            const id = 's' + (++scopeSeq);
            this.setAttribute('data-scope-tmp', id);
            try { return orig.call(this, sel.replace(/:scope/g, '[data-scope-tmp="' + id + '"]')); }
            finally { this.removeAttribute('data-scope-tmp'); }
          };
        }
      }
      // jsdom gezinme yapmaz → hedefleri kaydet (yalnız test).
      w.print = () => {}; w.confirm = () => { throw new Error('window.confirm kullanılmamalı (QA-018)'); }; w.alert = () => {}; w.scrollTo = () => {};
      if (w.HTMLDialogElement) {
        // jsdom 16'da <dialog> davranışı yok → open özniteliği + close olayı (yalnız test).
        const D = w.HTMLDialogElement.prototype;
        D.showModal = function () { this.setAttribute('open', ''); };
        Object.defineProperty(D, 'open', { configurable: true, get() { return this.hasAttribute('open'); } });
        D.close = function () { if (!this.hasAttribute('open')) return; this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
      }
      w.sessionStorage.setItem('legacyCleanup.v1', '1');
      w.sessionStorage.setItem('idToken.candidate', auth.token);
      w.sessionStorage.setItem('idUser.candidate', JSON.stringify(auth.user));
    }
  });
  const w = dom.window;
  // Gezinme denemelerini yakala (jsdom navigasyon yapmaz).
  const start = Date.now();
  while (Date.now() - start < wait) {
    await sleep(200);
    if (until && until(w.document)) break;
  }
  await sleep(300);
  return { w, d: w.document, errors, close: () => w.close() };
}

const text = (d, sel) => (d.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
const navTo = p => { const list = (p.w.__navs || []); return list.length ? list[list.length - 1] : p.w.document.URL; };
const visible = el => el && !el.hidden && !el.closest('[hidden]');

async function main() {
  const stamp = Date.now();
  const email = `aday83+dom${stamp}@example.test`;
  const pw = 'Kumsal-Yerel-Parola-2026';
  const since = Date.now();
  await raw('POST', '/auth/register', { body: { first_name: 'Ayla', last_name: 'Kaya', email } });
  await raw('POST', '/auth/verify-email', { body: { token: await mailToken(email, since), password: pw } });
  const login = await raw('POST', '/auth/login', { body: { email, password: pw, client_type: 'candidate' } });
  const T = login.data.token;
  const u = login.data.user;
  const auth = { token: T, user: { id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role, client_type: 'candidate', expires_at: login.data.expires_at } };
  const texts = (await raw('GET', '/public/consent-texts')).data.items;
  await raw('POST', '/me/consents', { token: T, body: { consent_text_id: texts.find(t => t.kind === 'kvkk_disclosure').id } });
  const svc = (await raw('GET', '/public/services')).data.items[0];
  const guru = (await raw('GET', '/public/gurus')).data.items.find(g => g.first_name === 'Deniz');
  const pur = await raw('POST', '/candidate/checkout/purchase', { token: T, body: { service_id: svc.id, guru_id: guru.id, confirm: true }, headers: { 'Idempotency-Key': crypto.randomUUID() } });
  const enrollmentId = pur.data.enrollment.id;
  console.log('aday:', email);

  console.log('\n■ ana.html (PURCHASED)');
  let p = await open('ana.html', auth, { until: d => d.querySelector('.next-step-card') && !d.querySelector('.next-step-card').hidden });
  check('selamlama oturumdan', text(p.d, 'main h1') === 'Merhaba Ayla', text(p.d, 'main h1'));
  check('sıradaki adım: Profilini tamamla', text(p.d, '.next-step-title') === 'Profilini tamamla', text(p.d, '.next-step-title'));
  check('ilerleme: 1. adım current', p.d.querySelectorAll('.candidate-progress-step')[0]?.dataset.stepState === 'current');
  check('seans satırları API\'den (Seans 1 · Kariyer…)', text(p.d, '.candidate-session-title').startsWith('Seans 1 · Kariyer Hedefi'), text(p.d, '.candidate-session-title'));
  const advisorAvatar = Array.from(p.d.querySelectorAll('main h3')).find(h => h.textContent.trim() === 'Danışmanın').parentElement.querySelector('.rounded-full');
  check('QA-017/K83: danışman avatarı gerçek addan (DK ya da public fotoğraf), ad metin sütununda', text(p.d, '.candidate-advisor-link') &&
    advisorAvatar.dataset.avatarName === 'Deniz Kurgu' && (advisorAvatar.textContent.trim() === 'DK' || /\/public\/gurus\/[^/]+\/avatar/.test(advisorAvatar.querySelector('img')?.getAttribute('src') || '')),
    advisorAvatar.outerHTML.slice(0, 200));
  check('danışman kartı: Deniz Kurgu + danisman.html?id=uuid', p.d.body.textContent.includes('Deniz Kurgu') && p.d.querySelector('.candidate-advisor-link')?.getAttribute('href') === '/danisman?id=' + guru.id);
  const sideItem = id => p.d.querySelector('#sidebar [data-sidebar-item="' + id + '"]');
  check('menü (Sidebar.setState): Hikâyem kilitli (href yok + ipucu), Ödevlerim kilitli',
    sideItem('hikaye')?.getAttribute('aria-disabled') === 'true' && !sideItem('hikaye')?.hasAttribute('href') &&
    text(p.d, '#sidebar-hint-hikaye') === 'İlk seanstan sonra açılır' && text(p.d, '#sidebar-hint-odevler') === 'Danışmanın ödev verince açılır');
  check('menü: Profilim ✓ yok, tek "Sıradaki" rozeti Profilim’de', !sideItem('profil')?.dataset.sidebarDone &&
    p.d.querySelectorAll('#sidebar .sidebar-badge').length === 1 && sideItem('profil')?.querySelector('.sidebar-badge')?.textContent === 'Sıradaki',
    Array.from(p.d.querySelectorAll('#sidebar .sidebar-badge')).map(b => b.parentElement.dataset.sidebarItem).join(','));
  check('menü: eski stil öğe eklenmedi (Material ikon / kilit kutusu yok)', !p.d.querySelector('#sidebar .material-symbols-outlined, #sidebar .candidate-locked-nav-item, #sidebar .candidate-next-badge') &&
    p.d.querySelectorAll('#sidebar [data-sidebar-item]').length === 6);
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ profil.html');
  p = await open('profil.html', auth, { until: d => d.querySelector('#pf-target_position') });
  const fields = Array.from(p.d.querySelectorAll('main form [data-field]')).map(n => n.dataset.field);
  check('dinamik alanlar (form sırası)', fields.join(',') === 'target_position,sector,seniority,participation_reason,free_text', fields.join(','));
  check('hedef pozisyon: arama girişi + datalist', p.d.querySelector('#pf-target_position')?.getAttribute('list') === 'pf-target_position-list' && p.d.querySelectorAll('#pf-target_position-list option').length >= 8);
  check('katılım nedeni: çipler', p.d.querySelectorAll('#pf-participation_reason .theme-choice-chip').length === 6);
  {
    const photo = p.d.querySelector('[data-profile-photo]');
    for (let i = 0; i < 20 && photo?.querySelector('[data-action="avatar-pick"]')?.disabled; i++) await sleep(150);
    check('profil fotoğrafı (K83): "Fotoğraf yükle" etkin, "Kaldır" gizli, isteğe bağlı + KVKK metni (K90)',
      photo && !photo.querySelector('[data-action="avatar-pick"]').disabled && photo.querySelector('[data-action="avatar-pick"]').textContent.trim() === 'Fotoğraf yükle' &&
      photo.querySelector('[data-action="avatar-remove"]').hidden && /yalnız sen ve danışmanın görür/.test(photo.textContent) && /İsteğe bağlı/.test(photo.textContent) &&
      photo.querySelector('[data-avatar-input]')?.getAttribute('accept') === 'image/jpeg,image/png,image/webp');
    check('profil fotoğrafı yokken kendi avatarında baş harfler (AK)', photo?.querySelector('[data-avatar-self]')?.textContent.trim() === 'AK', photo?.querySelector('[data-avatar-self]')?.outerHTML.slice(0, 160));
  }
  const save = Array.from(p.d.querySelectorAll('button')).find(b => b.dataset.action === 'profile-save');
  save.click();
  await sleep(500);
  check('boş gönderim: yerel zorunlu alan hataları', p.d.querySelectorAll('[aria-invalid="true"]').length >= 3 && visible(p.d.querySelector('.api-alert')));
  p.d.querySelector('#pf-target_position').value = 'Kıdemli Satış Yöneticisi';
  p.d.querySelector('#pf-sector').value = 'Teknoloji / Yazılım';
  p.d.querySelector('#pf-participation_reason [data-value="career_change"]').click();
  p.d.querySelector('#pf-free_text').value = 'SaaS satışına geçmek istiyorum';
  save.click();
  for (let i = 0; i < 30 && !navTo(p).includes('/cv'); i++) await sleep(200);
  check('kaydet → cv.html yönlendirmesi (başarıdan sonra)', navTo(p).includes('/cv'), navTo(p));
  p.close();
  const prof = (await raw('GET', '/candidate/profile', { token: T })).data;
  check('API: profil tamam, serbest metin + seçenek', prof.is_profile_completed && prof.answers.target_position.text === 'Kıdemli Satış Yöneticisi' && prof.answers.sector.options[0] === 'technology', JSON.stringify(prof.answers));
  p = await open('profil.html', auth, { until: d => d.querySelector('#pf-target_position')?.value });
  check('geri doldurma (G2): pozisyon metni, sektör etiketi, çip seçili', p.d.querySelector('#pf-target_position').value === 'Kıdemli Satış Yöneticisi' && p.d.querySelector('#pf-sector').value === 'Teknoloji / Yazılım' &&
    p.d.querySelector('#pf-participation_reason [data-value="career_change"]').getAttribute('aria-pressed') === 'true' && p.d.querySelector('#pf-free_text').value.includes('SaaS'));
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ cv.html');
  p = await open('cv.html', auth, { wait: 2500 });
  check('örnek kayıtlar yok, onay kapalı', !p.d.querySelector('[data-cv-record]') && p.d.querySelector('[data-cv-confirm]').disabled);
  check('durum metni: Önce CV yükle…', text(p.d, '[data-review-status]').startsWith('Önce CV'), text(p.d, '[data-review-status]'));
  const manual = Array.from(p.d.querySelectorAll('#view-manual > .border')).filter(b => b.querySelector('input'));
  const ins = manual[0].querySelectorAll('input');
  ins[0].value = 'Örnek A.Ş.'; ins[1].value = 'Satış Uzmanı'; ins[2].value = '2019';
  manual[0].querySelector('button').click();
  for (let i = 0; i < 25 && !p.d.querySelector('[data-cv-record]'); i++) await sleep(200);
  check('elle giriş "Kayıt ekle" → POST manual → kayıt listede', text(p.d, '.cv-section[data-section="experience"] [data-cv-record]').includes('Satış Uzmanı'), text(p.d, '.cv-section[data-section="experience"]').slice(0, 120));
  manual[2].querySelector('input').value = 'B2B Satış, CRM';
  manual[2].querySelector('button').click();
  for (let i = 0; i < 25 && p.d.querySelectorAll('#skills-list > span').length < 2; i++) await sleep(200);
  check('yetkinlikler (virgülle) eklendi', p.d.querySelectorAll('#skills-list > span').length === 2);
  p.d.querySelectorAll('[data-review-check]').forEach(c => { c.checked = true; c.dispatchEvent(new p.w.Event('change')); });
  check('tüm bölümler kontrol edildi → onay açık', !p.d.querySelector('[data-cv-confirm]').disabled);
  p.d.querySelector('[data-cv-confirm]').click();
  for (let i = 0; i < 30; i++) { await sleep(200); if ((await raw('GET', '/candidate/cv', { token: T })).data.approved_at) break; }
  check('onay (confirm:true) → API approved_at', Boolean((await raw('GET', '/candidate/cv', { token: T })).data.approved_at));
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ randevu-on.html (explicit_consent eksik)');
  p = await open('randevu-on.html', auth, { until: d => d.querySelector('[data-action="consent-grant"]') });
  const rows = Array.from(p.d.querySelectorAll('main .mt-8.flex.flex-col > div'));
  check('profil ve CV satırları Tamamlandı', rows[0].textContent.includes('Tamamlandı') && rows[2].textContent.includes('Tamamlandı'));
  check('KVKK satırı eksik + "Okudum, onaylıyorum" + metin', !rows[1].textContent.includes('Tamamlandı') && Boolean(p.d.querySelector('[data-action="consent-grant"]')) && Boolean(rows[1].querySelector('details')));
  check('"Randevu Al" kapalı, "Her şey hazır" gizli', p.d.querySelector('[data-action="booking-continue"]').disabled);
  p.d.querySelector('[data-action="consent-grant"]').click();
  for (let i = 0; i < 30 && p.d.querySelector('[data-action="booking-continue"]').disabled; i++) await sleep(200);
  check('onay sonrası ready → "Randevu Al" açık', !p.d.querySelector('[data-action="booking-continue"]').disabled);
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ takvim.html');
  p = await open('takvim.html', auth, { until: d => d.querySelector('.calendar-date--available') && d.querySelector('.appointment-slot') });
  if (p.errors.length) console.log('    takvim hataları:', p.errors.join(' | '));
  check('ay başlığı gerçek ay', /^(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık) 20\d\d$/.test(text(p.d, '.appointment-calendar h2')), text(p.d, '.appointment-calendar h2'));
  check('seans çipi: Seans 1 / 2 · Kariyer…', text(p.d, 'main .mb-6 span').startsWith('Seans 1 / 2 · Kariyer'), text(p.d, 'main .mb-6 span'));
  check('danışman: Deniz Kurgu', text(p.d, '.appointment-advisor-profile').includes('Deniz Kurgu'));
  p.d.querySelector('.appointment-slot').click();
  await sleep(200);
  check('slot seçimi → özet + onay açık', text(p.d, '.appointment-summary-text').includes('Deniz Kurgu') && !p.d.querySelector('[data-action="booking-confirm"]').disabled, text(p.d, '.appointment-summary-text'));
  p.d.querySelector('[data-action="booking-confirm"]').click();
  let det;
  for (let i = 0; i < 30; i++) { await sleep(200); det = (await raw('GET', '/candidate/enrollments/' + enrollmentId, { token: T })).data; if (det.sessions.find(s => s.sequence_no === 1).status === 'scheduled') break; }
  const s1 = det.sessions.find(s => s.sequence_no === 1);
  check('rezervasyon API\'de (1. seans scheduled)', s1.status === 'scheduled');
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ randevu-ok.html / seanslar.html');
  p = await open('randevu-ok.html?session=' + s1.id, auth, { until: d => !d.body.textContent.includes('…') });
  check('onay ekranı: seans, danışman, tarih, saat', p.d.body.textContent.includes('1 / 2 · Kariyer') && p.d.body.textContent.includes('Deniz Kurgu') && /\d{2}:\d{2} - \d{2}:\d{2} \(İstanbul\)/.test(p.d.body.textContent));
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();
  p = await open('seanslar.html', auth, { until: d => d.querySelector('.candidate-session-list [data-session-key]') });
  const cards = Array.from(p.d.querySelectorAll('[data-session-key]'));
  check('1 yaklaşan seans kartı + "Seans 2 henüz planlanmadı"', cards.length === 1 && cards[0].dataset.sessionKey === 'upcoming' && visible(p.d.querySelector('[data-session2-unplanned]')) && text(p.d, '[data-session2-unplanned] h2') === 'Seans 2 henüz planlanmadı');
  check('Meet bağlantısı yok, dürüst yer tutucu', !p.d.body.innerHTML.includes('meet.google') && p.d.body.textContent.includes('Görüşme bağlantısı seanstan önce iletilecek'));
  check('sekme sayaçları', text(p.d, '#candidate-tab-upcoming') === 'Yaklaşan (1)');
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ guru seansı tamamlar → hikâye akışı (yaz → öneriler → hazır)');
  const gl = await raw('POST', '/auth/login', { body: { email: 'deniz.kurgu@gurus.example.test', password: process.env.DEMO_GURU_PASSWORD || 'Yerel-Danisman-2026!', client_type: 'guru' } });
  const G = gl.data.token;
  await raw('POST', '/guru/enrollment-sessions/' + s1.id + '/complete', { token: G });
  const storyId = det.story_session.id;
  await raw('POST', '/guru/stories/' + storyId + '/notes', { token: G, body: { note_kind: 'first_session_note', note_text: 'Geçiş nedenini somut bir örnekle anlat.', is_visible_to_candidate: true } });
  await raw('POST', '/guru/enrollments/' + enrollmentId + '/assignments', { token: G, body: { kind: 'homework', title: 'Zorluk dönemini yaz', description: 'Sonucu bir sayıyla destekle.' } });
  // Etap 6+ (K103): soru-cevap akışı (soru1–5) kaldırıldı; yeni hikâye akışı /hikaye/yaz → /hikaye/oneriler → /hikaye/hazir.
  p = await open('hikaye-giris.html', auth, { until: d => d.querySelector('#story-text') && d.querySelector('[data-action="read"]') });
  {
    const story = p.d.querySelector('#sidebar [data-sidebar-item="hikaye"]');
    const tasks = p.d.querySelector('#sidebar [data-sidebar-item="odevler"]');
    check('menü: Hikâyem ve Ödevlerim açıldı (href, kilit yok)', story?.getAttribute('href') === '/hikaye/yaz' && !story.hasAttribute('aria-disabled') &&
      tasks?.getAttribute('href') === '/odevler' && !tasks.hasAttribute('aria-disabled') && !p.d.querySelector('#sidebar .sidebar-locked-copy'),
      (story?.outerHTML || '').slice(0, 160));
  }
  const storyText = 'Bankacılıktan teknoloji satışına geçtim. Geçen yıl kurumsal müşteri portföyünü yüzde yirmi büyüttüm ve üç yeni anlaşma kapattım. ' +
    'Ürün bilgisi eksikliğimi altı haftalık eğitimle kapattım. Şimdi kurumsal SaaS satışında kıdemli bir rol hedefliyorum.';
  const ta = p.d.querySelector('#story-text');
  ta.value = storyText; ta.dispatchEvent(new p.w.Event('input'));
  p.d.querySelector('[data-action="read"]').click();
  for (let i = 0; i < 60 && !navTo(p).includes('/hikaye/oneriler'); i++) await sleep(200);
  check('"Okumaya ver" → POST …/external → /hikaye/oneriler', navTo(p).includes('/hikaye/oneriler'), navTo(p));
  const drafts = (await raw('GET', '/candidate/stories/' + storyId + '/drafts', { token: T })).data;
  check('taslak oluştu (sürüm 1)', ((drafts && drafts.items) || []).length >= 1);
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ /hikaye/hazir (ciktilar.html)');
  p = await open('ciktilar.html', auth, { wait: 6000, until: d => d.querySelector('[data-ready]') && !d.querySelector('[data-ready]').hidden && d.querySelector('[data-final-story] p') });
  check('3. adım: hikâye metni API taslağından', text(p.d, '[data-final-story]').includes('kurumsal müşteri portföyünü'), text(p.d, '[data-final-story]').slice(0, 120));
  check('"Danışmanıma gönder" kutusu + onay kutusu', Boolean(p.d.querySelector('[data-action="send"]')) && Boolean(p.d.querySelector('[data-consent]')));
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  console.log('\n■ ödevler');
  p = await open('odevler.html', auth, { until: d => !d.querySelector('main .divide-y').hidden });
  check('ödev listesi (guru ödevi, Bekliyor + Teslim Et)', text(p.d, 'main .divide-y').includes('Zorluk dönemini yaz') && text(p.d, 'main .divide-y').includes('Bekliyor'));
  const taskId = new URL(p.d.querySelector('main .divide-y a').href).searchParams.get('id');
  p.close();
  p = await open('odev-teslim.html?id=' + taskId, auth, { until: d => !d.querySelector('[data-action="assignment-submit"]').disabled });
  check('teslim ekranı: başlık + guru açıklaması', text(p.d, '#task-title') === 'Zorluk dönemini yaz' && text(p.d, 'p.italic').includes('Sonucu bir sayıyla') && text(p.d, '#task-description').startsWith('Deniz Kurgu senden bu ödevi istedi'), text(p.d, '#task-description'));
  p.d.getElementById('text-tab').click();
  p.d.getElementById('answer-text').value = 'Satışlar düştü; yeni süreçle %20 toparladım.';
  p.d.getElementById('submission-form').dispatchEvent(new p.w.Event('submit', { cancelable: true }));
  for (let i = 0; i < 30 && !navTo(p).includes('teslim=1'); i++) await sleep(200);
  check('metin teslimi → odevler.html?teslim=1', navTo(p).includes('/odevler?teslim=1'), navTo(p));
  p.close();
  p = await open('odev-goruntule.html?id=' + taskId, auth, { until: d => text(d, '#task-status').length > 0 });
  check('görüntüle: teslim metni', text(p.d, '#task-content').includes('%20 toparladım') && text(p.d, '#task-status').startsWith('Teslim edildi'));
  check('JS hatası yok', !p.errors.length, p.errors.join(' | '));
  p.close();

  p = await open('seans-notlari.html', auth, { until: d => !d.querySelector('main h2')?.parentElement.hidden });
  check('seans-notlari: gerçek not, "Sonraki adımlar" gizli', p.d.body.textContent.includes('Geçiş nedenini somut') && p.d.querySelector('main h2 + ul')?.parentElement.hidden !== false);
  p.close();

  await raw('POST', '/auth/logout', { token: G });
  console.log('\nSonuç: ' + passed + ' geçti / ' + failed + ' kaldı');
}

main().catch(e => { console.error(e); process.exitCode = 1; });
