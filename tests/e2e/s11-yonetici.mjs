// s11 — Etap 3 yönetici paneli (70 QA, Adım 4). Gerçek Chromium + gerçek API; gerçek tıklamalar.
// Kapsam: giriş/çıkış + Geri tuşu, 10 ekran (konsol hatası yok), guru ekle + davet e-postası, kullanıcı pasif/aktif
// (token iptali), profil alanı + seçenek, soru seti yeni sürüm + yayınla, istem yeni sürüm (kural seti korunur, boş
// kural setiyle yayın istemci + sunucu 422), fiyat kuralı + rozet, ödeme / YZ / denetim filtreleri, depolama,
// masaüstü + mobil yerleşim, rol ayrımı (aday/guru ↔ yönetici), XSS, ?return= açık yönlendirme, kişisel veri.
// Env: ADMIN_PASSWORD (zorunlu), ADMIN_EMAIL (vars. admin@example.test), DEMO_GURU_PASSWORD, output/cand-A.json
// (aday hesabı; yoksa aday kontrolleri atlanır değil FAIL olur), cand-B.json (token iptali testi).
// Test verisi pasif/gizli oluşturulur (qa70e3_*): etkin soru seti / istem sürümü değişmez, aday kataloğu etkilenmez.
// Giriş IP sınırı 30/15 dk: bu aşama ~5 giriş yapar.
import fs from 'node:fs';
import {
  BASE, API, launch, newContext, check, shot, save, expect4xx, issues, results, requireEnv, guruCreds,
  api, lsKeys, ssKeys, sleep, statePath, readState, WRONG_PASSWORD, MAIL, latestMailLink
} from './lib.mjs';
import { token, inject, forget } from './tok.mjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.test';
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');
const D = BASE + '/demo/';
const TS = Date.now().toString(36);
const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const PAGES = [
  ['yonetici-panel.html', 'Genel bakış'], ['yonetici-kullanicilar.html', 'Kullanıcılar'], ['yonetici-gurular.html', 'Gurular'],
  ['yonetici-profil-formu.html', 'Profil formu'], ['yonetici-soru-setleri.html', 'Soru setleri'], ['yonetici-kurallar.html', 'Kurallar ve istemler'],
  ['yonetici-hizmetler.html', 'Hizmetler ve fiyatlar'], ['yonetici-odemeler.html', 'Ödemeler'], ['yonetici-yz-kullanim.html', 'YZ kullanımı'],
  ['yonetici-denetim.html', 'Denetim kayıtları']
];
const PII_KEYS = /"(story_text|answer_text|text_answer|raw_answer|answers|experiences|education|skills|extracted_content|manual_entry|draft_text|output_text|cv_text|file_name|storage_key)"\s*:/;

// Beklenen 4xx: negatif giriş denemeleri, rol reddi, çıkış sonrası 401.
expect4xx('POST', /\/auth\/login$/, 401);
expect4xx('POST', /\/auth\/login$/, 403);
expect4xx('GET', /\/auth\/me$/, 401);
expect4xx('GET', /\/admin\//, 403);
expect4xx('GET', /\/admin\//, 401);
expect4xx('GET', /\/auth\/me$/, 403);
expect4xx('POST', /\/auth\/verify-email$/, 400); // davet: bilerek zayıf parola
for (const s of [401, 403]) { expect4xx('GET', /\/(candidate|guru|me)\//, s); expect4xx('GET', /\/(candidate|guru|me)(\/|$|\?)/, s); }

const adminResponses = [];
const run = async (name, fn) => {
  try { await fn(); } catch (e) { check(name + ' (istisna)', false, String(e && e.stack || e).slice(0, 380)); }
};
function consoleErrors(label, from = 0) { return issues.console.slice(from).filter(c => c.label === label).concat(issues.pageerror.filter(p => p.label === label)); }

async function loaded(page, timeout = 20000) {
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-icerik]');
    return c && !/Yükleniyor…/.test(c.textContent) && c.textContent.trim().length > 0;
  }, null, { timeout });
  await sleep(250);
}
async function toast(page, re, timeout = 10000) {
  const l = page.locator('.adm-toast').filter({ hasText: re }).first();
  await l.waitFor({ timeout });
  return (await l.textContent()).trim();
}
const topModal = page => page.locator('.adm-modal-backdrop').last();
async function confirmTop(page, buttonRe) {
  const m = topModal(page);
  await m.waitFor();
  const btn = m.locator('[data-kaydet]');
  if (buttonRe) check('onay düğmesi metni ' + buttonRe, buttonRe.test(await btn.textContent()), await btn.textContent());
  await btn.click();
}
async function xssCount(page) { return page.evaluate(() => window.__xss || 0); }

const browser = await launch();
const ctx = await newContext(browser, { label: 'adm-d' });
const page = await ctx.newPage();
page.on('response', async r => {
  const u = r.url();
  if (!u.startsWith(API + '/admin/') || r.request().method() !== 'GET' || r.status() !== 200) return;
  try { adminResponses.push({ url: u, body: await r.text() }); } catch { /* yok say */ }
});

let ADMIN_TOKEN = null;
let candA = null, candB = null;
try { candA = readState('cand-A.json'); } catch { /* yok */ }
try { candB = readState('cand-B.json'); } catch { /* yok */ }

// ---------------------------------------------------------------- 1. Giriş
await run('giriş', async () => {
  await page.goto(D + 'giris-yonetici.html');
  check('giriş: demo ipucu yok', !(await page.locator('#demo-ipucu').count()) && !/herhangi|Demo hesabı/i.test(await page.textContent('body')));
  await page.click('button[type=submit]');
  check('giriş: boş form → "E-posta ve parola gerekli."', /E-posta ve parola gerekli/.test(await page.textContent('#giris-hata')));

  await page.fill('#eposta', ADMIN_EMAIL); await page.fill('#sifre', WRONG_PASSWORD);
  await page.click('button[type=submit]');
  await page.locator('#giris-hata:not([hidden])').waitFor();
  const t1 = await page.textContent('#giris-hata');
  check('giriş: yanlış parola → hata mesajı, oturum yok', t1.length > 3 && !(await ssKeys(page)).includes('idToken.admin'), t1);

  if (candA) {
    await page.fill('#eposta', candA.email); await page.fill('#sifre', candA.password);
    await page.click('button[type=submit]');
    await page.waitForFunction(t => document.querySelector('#giris-hata').textContent !== t, t1, { timeout: 10000 }).catch(() => {});
    const t2 = await page.textContent('#giris-hata');
    check('giriş: aday hesabı → reddedildi (403 client_not_allowed), oturum yok', /giriş yapılamaz|yetki|izin/i.test(t2) && !(await ssKeys(page)).some(k => k.startsWith('idToken')), t2);
  } else check('giriş: aday hesabı (cand-A.json yok)', false);

  const g = guruCreds();
  await page.fill('#eposta', g.email); await page.fill('#sifre', g.password);
  const prev = await page.textContent('#giris-hata');
  const respP = page.waitForResponse(r => r.url().endsWith('/auth/login'));
  await page.click('button[type=submit]');
  const resp = await respP;
  await sleep(300);
  const t3 = await page.textContent('#giris-hata');
  check('giriş: guru hesabı → 403, oturum yok', resp.status() === 403 && !(await ssKeys(page)).some(k => k.startsWith('idToken')), resp.status() + ' ' + t3 + ' (önceki: ' + prev + ')');

  await page.fill('#eposta', ADMIN_EMAIL); await page.fill('#sifre', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/yonetici-panel\.html$/, { timeout: 15000 });
  await loaded(page);
  const ss = await ssKeys(page);
  check('giriş → yonetici-panel.html', page.url().endsWith('/demo/yonetici-panel.html'));
  check('sessionStorage yalnız idToken.admin + idUser.admin', ss.length === 2 && ss.includes('idToken.admin') && ss.includes('idUser.admin'), ss.join(','));
  const user = JSON.parse(await page.evaluate(() => sessionStorage.getItem('idUser.admin')));
  check('idUser.admin özeti: role/client_type admin, e-posta yok', user.role === 'admin' && user.client_type === 'admin' && !('email' in user) && !!user.expires_at, Object.keys(user).join(','));
  ADMIN_TOKEN = await page.evaluate(() => sessionStorage.getItem('idToken.admin'));
  const ls = await lsKeys(page);
  const lsVals = await page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join('|'));
  check('localStorage: token yok', !/idt_|Bearer/.test(lsVals) && !ls.some(k => /token|oturum|Yonetici/i.test(k)), ls.join(','));
  const sideMail = await page.locator('.adm-user [data-eposta]').textContent();
  check('yan menü e-postası /auth/me\'den', sideMail.trim() === ADMIN_EMAIL, sideMail);
  await shot(page, '11-giris-sonrasi-panel-d');
});
if (!ADMIN_TOKEN) { save('s11.json'); await browser.close(); process.exit(1); }

// ---------------------------------------------------------------- 2. 10 ekran (masaüstü)
await run('10 ekran', async () => {
  for (const [file, h1] of PAGES) {
    const from = issues.console.length;
    const pe = issues.pageerror.length;
    await page.goto(D + file);
    await loaded(page);
    const title = (await page.textContent('h1[data-baslik]')).trim();
    const body = await page.textContent('[data-icerik]');
    const errs = issues.console.slice(from).filter(c => c.label === 'adm-d').length + issues.pageerror.slice(pe).filter(c => c.label === 'adm-d').length;
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const cur = await page.locator('.adm-nav-link[aria-current="page"]').getAttribute('href');
    check(`ekran ${file}: yüklendi, başlık "${h1}", konsol/JS hatası 0, taşma 0, menüde aktif`,
      title === h1 && !/Veriler yüklenemedi/.test(body) && errs === 0 && ov <= 1 && cur === file, `${title} · err=${errs} · ov=${ov} · cur=${cur}`);
    await shot(page, '11-' + file.replace('.html', '') + '-d', { fullPage: false });
  }
});

// ---------------------------------------------------------------- 3. Gurular: ekle + davet + düzenle (XSS unvan)
const guruEmail = `qa70e3.${TS}@gurus.example.test`;
let guruUserId = null, guruProfileId = null;
await run('gurular', async () => {
  await page.goto(D + 'yonetici-gurular.html'); await loaded(page);
  const since = Date.now() - 1000;
  await page.click('[data-yeni]');
  const m = topModal(page);
  await m.locator('#g-ad').fill('QA70'); await m.locator('#g-soyad').fill('E3 ' + TS);
  await m.locator('#g-eposta').fill(guruEmail);
  await m.locator('#g-title').fill('Unvan ' + XSS); await m.locator('#g-exp').fill('Uzmanlık ' + XSS);
  await m.locator('#g-bio').fill('Bio ' + XSS);
  const sektorSay = await m.locator('input[name=sector_ids]').count();
  if (sektorSay) await m.locator('label.adm-check').first().click();
  await m.locator('label.adm-switch:has(input[name=is_active])').click(); // gizli: aday kataloğuna çıkmasın
  check('yeni guru modalı: sektör seçenekleri', sektorSay > 0, sektorSay);
  await m.locator('[data-kaydet]').click();
  const tm = await toast(page, /Guru oluşturuldu/);
  check('guru ekle → bildirim "davet e-postası gönderildi"', /davet e-postası gönderildi/.test(tm), tm);
  await loaded(page);
  const row = page.locator('tr', { hasText: guruEmail });
  await row.waitFor();
  const rt = await row.textContent();
  check('liste: yeni guru "Davet bekliyor" + "Daveti yeniden gönder" + "Gizli"', /Davet bekliyor/.test(rt) && /Daveti yeniden gönder/.test(rt) && /Gizli/.test(rt), rt.slice(0, 200));
  check('XSS: guru unvanı/uzmanlık düz metin (onerror çalışmadı, <img> yok)', (await xssCount(page)) === 0 && (await row.locator('img').count()) === 0 && rt.includes('<img src=x'), rt.slice(0, 160));
  guruUserId = await row.locator('[data-davet]').getAttribute('data-davet');
  guruProfileId = await row.locator('[data-duzenle]').getAttribute('data-duzenle');
  // Davet e-postası backend/data/mail/
  let mail = null;
  for (let i = 0; i < 40 && !mail; i++) {
    const files = fs.existsSync(MAIL) ? fs.readdirSync(MAIL).map(f => MAIL + '/' + f).filter(f => fs.statSync(f).mtimeMs >= since) : [];
    mail = files.find(f => fs.readFileSync(f, 'utf8').includes('To: ' + guruEmail)) || null;
    if (!mail) await sleep(250);
  }
  const mt = mail ? fs.readFileSync(mail, 'utf8') : '';
  check('davet e-postası data/mail\'e düştü (alıcı + #token bağlantısı)', !!mail && /#token=/.test(mt), mail ? mail.split(/[\\/]/).pop() : 'yok');
  check('davet e-postası: bağlantı localhost:3000 (ADMIN/GURU_PANEL_URL), XSS ham HTML yok', /http:\/\/localhost:3000\//.test(mt) && !/<img src=x/.test(mt), (mt.match(/https?:\/\/\S+/) || [''])[0].replace(/#token=.*/, '#token=…'));
  // Daveti yeniden gönder
  const since2 = Date.now() - 500;
  await row.locator('[data-davet]').click();
  await page.locator('.adm-toast').evaluateAll(ts => ts.forEach(t => t.remove()));
  const t2 = await toast(page, /davet|gönderil/i);
  let mail2 = null;
  for (let i = 0; i < 40 && !mail2; i++) {
    const files = fs.readdirSync(MAIL).map(f => MAIL + '/' + f).filter(f => fs.statSync(f).mtimeMs >= since2 && f !== mail);
    mail2 = files.find(f => fs.readFileSync(f, 'utf8').includes('To: ' + guruEmail)) || null;
    if (!mail2) await sleep(250);
  }
  check('daveti yeniden gönder → bildirim + ikinci e-posta', !!mail2, t2);
  // Düzenleme modalı: değerler ham metin, sektörler işaretli
  await row.locator('[data-duzenle]').click();
  const em = topModal(page);
  await em.waitFor();
  const tv = await em.locator('#g-title').inputValue();
  const checked = await em.locator('input[name=sector_ids]:checked').count();
  check('düzenleme modalı: unvan ham metin değer, seçili sektör korunuyor, XSS 0', tv === 'Unvan ' + XSS && checked >= 1 && (await xssCount(page)) === 0, `checked=${checked}`);
  await em.locator('#g-sen').fill('5 yıl');
  await em.locator('[data-kaydet]').click();
  await toast(page, /Guru profili güncellendi/);
  await loaded(page);
  check('guru profili kaydedildi (kıdem listede)', /5 yıl/.test(await page.locator('tr', { hasText: guruEmail }).textContent()));
  await shot(page, '11-gurular-yeni-d');
  // API: account.password_set=false, kişisel içerik yok
  const r = await api('GET', '/admin/gurus?q=' + encodeURIComponent(guruEmail), ADMIN_TOKEN);
  const it = r.body && r.body.items && r.body.items[0];
  check('API /admin/gurus?q: account.password_set=false, is_active=false', it && it.account && it.account.password_set === false && it.is_active === false, JSON.stringify(it && it.account));
});

// Aday kataloğunda XSS (yönetici girdisi → public sayfa): kısa süreli yayına al, kontrol et, geri gizle.
await run('public katalog XSS', async () => {
  if (!guruProfileId) return check('public katalog XSS (guru yok)', false);
  const cur = (await api('GET', '/admin/gurus?q=' + encodeURIComponent(guruEmail), ADMIN_TOKEN)).body.items[0];
  const body = { title: cur.title, expertise_area: cur.expertise_area, seniority: cur.seniority, short_bio: cur.short_bio, is_active: true, sector_ids: cur.sectors.map(s => s.id) };
  const up = await api('PUT', '/admin/gurus/' + guruProfileId, ADMIN_TOKEN, body);
  const pctx = await newContext(browser, { label: 'pub' });
  const pp = await pctx.newPage();
  await pp.goto(D + 'danismanlar.html');
  await pp.waitForLoadState('networkidle');
  await sleep(800);
    const shown = (await pp.textContent('body')).includes('Unvan <img');
  const imgX = await pp.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.getAttribute('src') === 'x').length);
  check('aday kataloğu (danismanlar.html): yönetici girdisi unvan düz metin, onerror 0, <img src=x> öğesi yok', up.status === 200 && (await xssCount(pp)) === 0 && imgX === 0 && shown, `put=${up.status} görünür=${shown} img=${imgX}`);
  const detUrl = D + 'danisman.html?id=' + guruProfileId;
  await pp.goto(detUrl).catch(() => {});
  await pp.waitForLoadState('networkidle').catch(() => {});
  await sleep(500);
  const imgX2 = await pp.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.getAttribute('src') === 'x').length);
  check('danışman detayı: unvan/biyografi düz metin, onerror 0', (await xssCount(pp)) === 0 && imgX2 === 0 && (await pp.textContent('body')).includes('Unvan <img'), pp.url().split('/').pop());
  await pctx.close();
  body.is_active = false;
  const down = await api('PUT', '/admin/gurus/' + guruProfileId, ADMIN_TOKEN, body);
  check('test gurusu yeniden gizlendi', down.status === 200 && down.body.is_active === false);
});

// Davet bağlantısı uçtan uca: guru parolasını belirler → panelde "Davet bekliyor" kalkar (giriş yapılmaz).
await run('davet kabul', async () => {
  const link = latestMailLink(guruEmail, Date.now() - 10 * 60e3);
  if (!link) return check('davet bağlantısı bulunamadı', false);
  const ictx = await newContext(browser, { label: 'davet' });
  const ip = await ictx.newPage();
  await ip.goto(link);
  await ip.waitForURL(/davet\.html\?mode=invite/, { timeout: 8000 });
  const pw = ip.locator('#davet-form input[type=password]');
  const n = await pw.count();
  // Önce politika ihlali: parola guru adını ("QA70") içeriyor → 400 weak_password, mesaj formda görünmeli.
  for (let i = 0; i < n; i++) await pw.nth(i).fill('Qa70-Parola-Deneme-' + TS);
  const wr = ip.waitForResponse(r => r.url().endsWith('/auth/verify-email'));
  await ip.locator('#davet-form button[type=submit]').click();
  const wres = await wr;
  await sleep(400);
  const formText = await ip.textContent('#davet-form');
  check('davet: adı içeren parola → 400 weak_password, formda "adını veya e-posta adresini içeremez" mesajı', wres.status() === 400 && /adını(zı)? veya e-posta/.test(formText), wres.status() + ' form: ' + formText.replace(/\s+/g, ' ').slice(0, 300));
  for (let i = 0; i < n; i++) await pw.nth(i).fill('Yerel-Panel-Sinav-' + TS);
  await ip.locator('#davet-form button[type=submit]').click();
  await ip.waitForURL(/giris-danisman\.html/, { timeout: 10000 }).catch(() => {});
  check('davet bağlantısı → davet.html?mode=invite → parola → giris-danisman.html, #token adres çubuğunda yok', /giris-danisman\.html/.test(ip.url()) && !/token=/.test(ip.url()), ip.url().split('/').pop());
  await ictx.close();
  await page.goto(D + 'yonetici-gurular.html'); await loaded(page);
  const rt = await page.locator('tr', { hasText: guruEmail }).textContent();
  check('panel: parola belirlenince "Davet bekliyor" ve yeniden gönder düğmesi kalktı, hesap Aktif', !/Davet bekliyor|Daveti yeniden gönder/.test(rt) && /Aktif/.test(rt), rt.slice(-60));
  const inv = await api('POST', '/admin/gurus/' + guruUserId + '/invitation', ADMIN_TOKEN);
  check('parolası belirlenmiş guruya davet → 409 password_already_set', inv.status === 409 && inv.body.code === 'password_already_set', inv.status + ' ' + (inv.body && inv.body.code));
});

// ---------------------------------------------------------------- 4. Kullanıcılar: pasif / aktif + token iptali
await run('kullanıcılar', async () => {
  await page.goto(D + 'yonetici-kullanicilar.html'); await loaded(page);
  await page.fill('#k-ara', guruEmail);
  await sleep(200);
  check('arama: 1 kullanıcı', /^1 kullanıcı/.test((await page.textContent('[data-sayi]')).trim()), await page.textContent('[data-sayi]'));
  const sw = page.locator(`label.adm-switch:has(input[data-durum="${guruUserId}"])`);
  await sw.click();
  const m = topModal(page);
  await m.waitFor();
  const msg = await m.locator('[data-onay-mesaj]').textContent();
  check('pasife al → onay penceresi (ad kalın, metin)', /hesabı pasife alınacak/.test(msg) && (await m.locator('[data-onay-mesaj] b').count()) === 1, msg);
  await confirmTop(page, /Pasife al/);
  await toast(page, /pasife alındı/);
  await page.waitForFunction(id => { const i = document.querySelector(`input[data-durum="${id}"]`); return i && !i.checked; }, guruUserId);
  check('kullanıcı Pasif', /Pasif/.test(await page.locator('tr', { hasText: guruEmail }).textContent()));
  await page.selectOption('#k-durum', 'passive');
  await sleep(150);
  check('durum filtresi "Pasif" → test gurusu listede', (await page.locator('tr', { hasText: guruEmail }).count()) === 1);
  await page.goto(D + 'yonetici-gurular.html'); await loaded(page);
  check('Gurular: hesap rozeti "Pasif"', /Pasif/.test(await page.locator('tr', { hasText: guruEmail }).locator('td').nth(4).textContent()));
  await page.goto(D + 'yonetici-kullanicilar.html'); await loaded(page);
  await page.fill('#k-ara', guruEmail); await sleep(150);
  await page.locator(`label.adm-switch:has(input[data-durum="${guruUserId}"])`).click();
  await toast(page, /aktif edildi/);
  check('aktif et → onaysız, Aktif', (await page.locator('.adm-modal-backdrop').count()) === 0 && /Aktif/.test(await page.locator('tr', { hasText: guruEmail }).textContent()));
  // Kendi hesabı kilitli
  await page.fill('#k-ara', ADMIN_EMAIL); await sleep(150);
  const own = page.locator('tr', { hasText: ADMIN_EMAIL });
  check('kendi hesabı: durum anahtarı ve oturum kapatma pasif', (await own.locator('input[data-durum]').isDisabled()) && (await own.locator('[data-oturum]').isDisabled()));
  // Detay modalı: kişisel içerik yok notu
  await page.fill('#k-ara', guruEmail); await sleep(150);
  await page.locator('tr', { hasText: guruEmail }).locator('[data-detay]').click();
  const dm = topModal(page);
  await dm.waitFor();
  const dt = await dm.textContent();
  check('kullanıcı detayı: CV/cevap/hikâye gösterilmez notu, parola "Evet" (davet kabul edildi)', /CV, cevap ve hikâye içerikleri kişisel veri olduğundan yönetici panelinde gösterilmez/.test(dt) && /Parola belirlendiEvet/.test(dt));
  await dm.locator('[data-kapat]').last().click();

  // FR-90: pasife alma → aday token'ı anında iptal (cand-B)
  if (candB) {
    const tB = await token('candB', candB.email, candB.password, 'candidate');
    const me1 = await api('GET', '/auth/me', tB.token);
    await page.fill('#k-ara', candB.email); await sleep(200);
    const idB = await page.locator('tr', { hasText: candB.email }).locator('input[data-durum]').getAttribute('data-durum');
    await page.locator(`label.adm-switch:has(input[data-durum="${idB}"])`).click();
    await confirmTop(page, /Pasife al/);
    await toast(page, /pasife alındı/);
    const me2 = await api('GET', '/auth/me', tB.token);
    const lg = await api('POST', '/auth/login', null, { email: candB.email, password: candB.password, client_type: 'candidate' });
    await page.locator(`label.adm-switch:has(input[data-durum="${idB}"])`).click();
    await toast(page, /aktif edildi/);
    forget('candB');
    check('FR-90: aday pasife alınınca token anında 401, giriş 403 account_disabled; aktif edilince hesap açık', me1.status === 200 && me2.status === 401 && lg.status === 403 && lg.body.code === 'account_disabled', `me1=${me1.status} me2=${me2.status} login=${lg.status} ${lg.body && lg.body.code}`);
  } else check('FR-90 token iptali (cand-B.json yok)', false);
  await shot(page, '11-kullanicilar-d');
});

// ---------------------------------------------------------------- 5. Profil formu: alan + seçenek (pasif)
await run('profil formu', async () => {
  await page.goto(D + 'yonetici-profil-formu.html'); await loaded(page);
  const label = `QA70 alan ${TS} ${XSS}`;
  await page.click('[data-yeni]');
  const m = topModal(page);
  await m.locator('#pf-label').fill(label);
  const key = await m.locator('#pf-key').inputValue();
  check('profil alanı: anahtar etiketten üretildi', /^qa70_alan_/.test(key), key);
  await m.locator('#pf-key').fill('qa70e3_' + TS);
  await m.locator('label.adm-switch:has(input[name=is_active])').click(); // pasif: aday formu değişmesin
  await m.locator('[data-kaydet]').click();
  await toast(page, /Alan eklendi/);
  await loaded(page);
  const item = page.locator('.adm-list > li', { hasText: 'qa70e3_' + TS });
  await item.waitFor();
  const it = await item.textContent();
  check('alan listede: Pasif rozeti, etiket düz metin, XSS 0', /Pasif/.test(it) && it.includes('<img src=x') && (await xssCount(page)) === 0);
  const opt = page.locator(`form[data-secenek-ekle] input[name=label]`).first();
  await opt.waitFor({ timeout: 5000 });
  await opt.fill('QA seçenek ' + XSS);
  await page.locator('form[data-secenek-ekle] button[type=submit]').first().click();
  await toast(page, /Seçenek eklendi/);
  await loaded(page);
  const it2 = await page.locator('.adm-list > li', { hasText: 'qa70e3_' + TS }).textContent();
  check('seçenek eklendi (1 / 1 seçenek), XSS 0', /1 \/ 1 seçenek/.test(it2) && it2.includes('QA seçenek <img') && (await xssCount(page)) === 0, it2.slice(0, 160));
  const onz = await page.textContent('[data-onizleme]');
  check('önizleme: pasif alan aday formunda yok', !onz.includes('QA70 alan ' + TS));
  await shot(page, '11-profil-formu-d');
});

// ---------------------------------------------------------------- 6. Soru setleri: yeni sürüm + yayınla
await run('soru setleri', async () => {
  const before = (await api('GET', '/admin/question-sets', ADMIN_TOKEN)).body.items;
  const activeBefore = before.find(s => s.is_active);
  await page.goto(D + 'yonetici-soru-setleri.html'); await loaded(page);
  const head = await page.textContent('[data-detay] .adm-card-head');
  const srcCount = Number((head.match(/(\d+) soru/) || [])[1]);
  check('soru seti: etkin sürüm seçili', /Etkin/.test(head) && srcCount > 0, head.slice(0, 120));
  await page.click('[data-eylem="yeni-surum"]');
  await confirmTop(page, /Taslak oluştur/);
  const t = await toast(page, /taslağı oluşturuldu/);
  await page.waitForFunction(() => /Taslak/.test(document.querySelector('[data-detay] .adm-card-head')?.textContent || ''));
  const h2 = await page.textContent('[data-detay] .adm-card-head');
  const newCount = Number((h2.match(/(\d+) soru/) || [])[1]);
  check('yeni sürüm taslağı: soru sayısı ve açıklama kaynakla aynı, dil korunuyor', newCount === srcCount && (activeBefore.description ? h2.includes(activeBefore.description) : true) && /Dil: Türkçe/.test(h2), `${t} · ${srcCount}→${newCount}`);
  await page.click('[data-eylem="yayinla"]');
  const om = await topModal(page).locator('[data-onay-mesaj]').textContent();
  check('yayınla onayı: "bir daha değiştirilemez" + "etkin olmaz"', /değiştirilemez/.test(om) && /etkin olmaz/.test(om), om);
  await confirmTop(page, /^Yayınla$/);
  await toast(page, /yayınlandı/);
  await page.waitForFunction(() => /Yayında/.test(document.querySelector('[data-detay] .adm-card-head')?.textContent || ''));
  const after = (await api('GET', '/admin/question-sets', ADMIN_TOKEN)).body.items;
  check('etkin soru seti sürümü değişmedi', after.find(s => s.is_active).id === activeBefore.id);
  check('yayındaki sürümde düzenleme düğmeleri yok', (await page.locator('[data-soru-duzenle],[data-eylem="soru-ekle"]').count()) === 0);
  await shot(page, '11-soru-setleri-d');
});

// ---------------------------------------------------------------- 7. Kurallar: takip kuralı (XSS) + istem yeni sürüm
await run('takip kuralı', async () => {
  await page.goto(D + 'yonetici-kurallar.html'); await loaded(page);
  await page.click('[data-yeni-kural]');
  const m = topModal(page);
  const name = 'QA70 kural ' + XSS;
  await m.locator('#r-name').fill(name); await m.locator('#r-key').fill('qa70e3_' + TS);
  await m.locator('#r-trg').fill('QA test tetikleyici (pasif)'); await m.locator('#r-tpl').fill('QA takip sorusu?');
  await m.locator('label.adm-switch:has(input[name=is_active])').click(); // pasif oluştur
  await m.locator('[data-kaydet]').click();
  await toast(page, /Kural eklendi/);
  await loaded(page);
  const row = page.locator('tr', { hasText: 'qa70e3_' + TS });
  check('kural listede pasif, ad düz metin, XSS 0', (await row.count()) === 1 && /Pasif/.test(await row.textContent()) && (await row.textContent()).includes('<img src=x') && (await xssCount(page)) === 0);
  const id = await row.locator('input[data-kural-aktif]').getAttribute('data-kural-aktif');
  await row.locator('label.adm-switch').click();
  await toast(page, /aktif\./);
  await page.locator(`label.adm-switch:has(input[data-kural-aktif="${id}"])`).click();
  const om = topModal(page);
  await om.waitFor();
  const b = await om.locator('[data-onay-mesaj] b').textContent();
  check('pasife alma onayı: kural adı <b> içinde düz metin (HTML yorumlanmadı)', b === name && (await om.locator('img').count()) === 0 && (await xssCount(page)) === 0, b);
  await confirmTop(page, /Pasife al/);
  await toast(page, /pasife alındı/);
  const r = (await api('GET', '/admin/follow-up-rules', ADMIN_TOKEN)).body.items.find(x => x.id === id);
  check('kural sonunda pasif (API)', r && r.is_active === false);
});

const IH = '#kural-panel [data-izgara] > .adm-card:nth-child(2) > .adm-card-head';
await run('istem zinciri', async () => {
  const listBefore = (await api('GET', '/admin/prompt-configs', ADMIN_TOKEN)).body.items;
  const active = listBefore.find(c => c.is_active);
  const src = (await api('GET', '/admin/prompt-configs/' + active.id, ADMIN_TOKEN)).body;
  await page.goto(D + 'yonetici-kurallar.html?sekme=istem'); await loaded(page);
  const head = await page.textContent(IH);
  check('istem: etkin sürüm, adım sayısı detaydan (GAP-Y02)', /Etkin/.test(head) && head.includes(src.steps.length + ' adım') && src.steps.length > 0, head.slice(0, 140));
  check('istem: adım listesi görünür', (await page.locator('#kural-panel .adm-list > li').count()) === src.steps.length);
  await page.click('[data-istem="yeni-surum"]');
  await confirmTop(page, /Taslak oluştur/);
  const t = await toast(page, /taslağı oluşturuldu/);
  check('yeni sürüm bildirimi: kurallar, parametreler ve adımlar kopyalandı', /kurallar, parametreler ve adımlar kopyalandı/.test(t), t);
  await page.waitForFunction(sel => /Taslak/.test(document.querySelector(sel)?.textContent || ''), IH);
  const list = (await api('GET', '/admin/prompt-configs', ADMIN_TOKEN)).body.items;
  const draft = list.filter(c => c.name === active.name && !c.published_at).sort((a, b) => b.version - a.version)[0];
  const d = (await api('GET', '/admin/prompt-configs/' + draft.id, ADMIN_TOKEN)).body;
  const ruleShown = await page.locator('#kural-panel .adm-list-text').first().textContent();
  check('GAP-Y03: taslak rule_set kaynakla aynı (API + ekranda)', d.rule_set === src.rule_set && d.rule_set.length > 0 && ruleShown.trim() === src.rule_set.trim(), `${src.rule_set.length}/${d.rule_set.length}`);
  check('GAP-Y03: parametreler, açıklama ve adım sayısı aynı', JSON.stringify(Object.entries(d.parameters).sort()) === JSON.stringify(Object.entries(src.parameters).sort()) && d.description === src.description && d.steps.length === src.steps.length);
  await shot(page, '11-istem-taslak-d');
  // Kural setini harfsiz yap → istemci engeli
  await page.click('[data-istem="duzenle"]');
  const m = topModal(page);
  await m.locator('#c-rules').fill('1. 2. 3. ---');
  await m.locator('[data-kaydet]').click();
  await toast(page, /Yapılandırma kaydedildi/);
  await loaded(page);
  await page.click('[data-istem="yayinla"]');
  const w = await toast(page, /Uydurmayı önleme kuralları boş/);
  check('boş kural setiyle "Yayınla" istemcide engellendi (onay açılmadı)', (await page.locator('.adm-modal-backdrop').count()) === 0, w);
  await page.click('[data-istem="etkinlestir"]');
  await toast(page, /Uydurmayı önleme kuralları boş/);
  check('boş kural setiyle "Yayınla ve etkinleştir" de engellendi', (await page.locator('.adm-modal-backdrop').count()) === 0);
  // Sunucu katmanı (K74)
  const p1 = await api('POST', '/admin/prompt-configs/' + draft.id + '/publish', ADMIN_TOKEN, { activate: false });
  const p2 = await api('POST', '/admin/prompt-configs/' + draft.id + '/publish', ADMIN_TOKEN, { activate: true });
  check('sunucu: harfsiz rule_set ile publish → 422 fields.rule_set (activate false/true)', p1.status === 422 && p2.status === 422 && p1.body.fields && p1.body.fields.rule_set, `${p1.status}/${p2.status} ${p1.body && p1.body.message}`);
  const after = (await api('GET', '/admin/prompt-configs', ADMIN_TOKEN)).body.items;
  check('etkin istem sürümü değişmedi, taslak yayında değil', after.find(c => c.is_active).id === active.id && !after.find(c => c.id === draft.id).published_at);
  // Taslağı kuralla doldur → yayınla (etkinleştirmeden)
  await page.click('[data-istem="duzenle"]');
  await topModal(page).locator('#c-rules').fill(src.rule_set);
  await topModal(page).locator('[data-kaydet]').click();
  await toast(page, /Yapılandırma kaydedildi/);
  await loaded(page);
  await page.click('[data-istem="yayinla"]');
  await confirmTop(page, /^Yayınla$/);
  await toast(page, /yayınlandı/);
  const fin = (await api('GET', '/admin/prompt-configs/' + draft.id, ADMIN_TOKEN)).body;
  check('kural seti geri yazılınca yayın başarılı, etkin değil', !!fin.published_at && !fin.is_active && fin.rule_set === src.rule_set);
  await shot(page, '11-istem-yayinda-d');
});

// ---------------------------------------------------------------- 8. Hizmetler: hizmet + iki fiyat + rozet (XSS ad)
await run('hizmetler', async () => {
  await page.goto(D + 'yonetici-hizmetler.html'); await loaded(page);
  await page.click('[data-yeni]');
  const m = topModal(page);
  await m.locator('#h-name').fill('QA70 hizmet ' + XSS); await m.locator('#h-code').fill('qa70e3_' + TS);
  await m.locator('#h-desc').fill('QA test hizmeti (kapalı)');
  await m.locator('#h-cnt').fill('2');
  await m.locator('[data-kaydet]').click();
  await toast(page, /Hizmet oluşturuldu/);
  await page.waitForFunction(c => document.querySelector('[data-detay]')?.textContent.includes(c), 'qa70e3_' + TS);
  const det = await page.textContent('[data-detay]');
  check('hizmet oluşturuldu: Kapalı, fiyat tanımsız, ad düz metin, XSS 0', /Kapalı/.test(det) && /Tanımsız/.test(det) && det.includes('<img src=x') && (await xssCount(page)) === 0);
  for (const [amt, from, note] of [['1000', '2026-01-05T09:00', 'eski'], ['1250', null, 'yeni']]) {
    await page.click('[data-fiyat-ekle]');
    const f = topModal(page);
    const title = await f.locator('h2').textContent();
    if (amt === '1000') check('fiyat modalı başlığı: hizmet adı düz metin', title.includes('<img src=x') && (await f.locator('h2 img').count()) === 0);
    await f.locator('#p-amt').fill(amt);
    if (from) await f.locator('#p-from').fill(from);
    await f.locator('#p-note').fill('QA ' + note);
    await f.locator('[data-kaydet]').click();
    const om = await topModal(page).locator('[data-onay-mesaj]').textContent();
    check(`fiyat ${amt}: kayıt onayı "düzenlenemez"`, /düzenlenemez/.test(om), om);
    await confirmTop(page, /Kaydet/);
    await toast(page, /Fiyat kuralı eklendi/);
    await sleep(300);
  }
  const rows = page.locator('[data-detay] table tbody tr');
  const txt = await rows.allTextContents();
  const gec = txt.filter(t => /Geçerli/.test(t)), yer = txt.filter(t => /Yerini aldı/.test(t));
  check('GAP-Y04: tek "Geçerli" (en yeni) + "Yerini aldı"', gec.length === 1 && /1\.250/.test(gec[0]) && yer.length === 1 && /1\.000/.test(yer[0]), txt.join(' | '));
  check('güncel fiyat 1.250 ₺', /Güncel fiyat\s*₺?1\.250|1\.250,?0?0?\s*₺/.test(await page.textContent('[data-detay] .adm-dl')), (await page.textContent('[data-detay] .adm-dl')).slice(0, 200));
  await shot(page, '11-hizmetler-fiyat-d');
});

// ---------------------------------------------------------------- 9. Kayıtlar: ödeme / YZ / denetim filtreleri
await run('kayıt filtreleri', async () => {
  await page.goto(D + 'yonetici-odemeler.html'); await loaded(page);
  const reqP = page.waitForRequest(r => /\/admin\/payments\?.*status=PAID/.test(r.url()));
  await page.selectOption('#o-durum', 'PAID');
  await reqP; await sleep(400);
  const paid = await page.locator('[data-tablo] tbody tr').count();
  const allPaid = (await page.locator('[data-tablo] tbody tr').allTextContents()).every(t => /Ödendi/.test(t));
  check('ödemeler: PAID filtresi sunucuya gidiyor, satırlar "Ödendi"', paid > 0 && allPaid, paid);
  const reqF = page.waitForRequest(r => /\/admin\/payments\?.*status=FAILED/.test(r.url()));
  await page.selectOption('#o-durum', 'FAILED');
  await reqF; await sleep(400);
  check('ödemeler: FAILED filtresi → boş durum (seed\'de yok, GAP-B12)', (await page.locator('[data-tablo] tbody tr').count()) === 0 || /yok/i.test(await page.textContent('[data-tablo]')));
  await page.selectOption('#o-durum', 'PAID'); await sleep(600);
  await page.locator('[data-detay]').first().click();
  const dm = topModal(page); await dm.waitFor();
  await sleep(300);
  const dt = await dm.textContent();
  check('ödeme detayı: sağlayıcı referansı + işlem geçmişi, kart/ham yanıt yok', /devpay/.test(dt) && /İşlem geçmişi/.test(dt) && !/response_payload|card_number|cvv|pan\b/i.test(dt));
  await dm.locator('[data-kapat]').last().click();

  await page.goto(D + 'yonetici-yz-kullanim.html'); await loaded(page);
  const r1 = page.waitForRequest(r => /\/admin\/ai-costs\?/.test(r.url()));
  await page.selectOption('#yz-gun', 'tum');
  await r1; await sleep(500);
  const tur = await page.locator('#yz-tur option').nth(1).getAttribute('value');
  const r2 = page.waitForRequest(r => new RegExp('/admin/ai-requests\\?.*request_type=' + tur).test(r.url()));
  await page.selectOption('#yz-tur', tur);
  await r2; await sleep(500);
  const yzBody = await page.textContent('[data-icerik]');
  check('YZ kullanımı: aralık + tür filtreleri sunucuya gidiyor, sayfa hatasız', !/yüklenemedi/i.test(yzBody) && issues.pageerror.filter(p => p.label === 'adm-d').length === 0, tur);

  await page.goto(D + 'yonetici-denetim.html'); await loaded(page);
  const r3 = page.waitForRequest(r => /\/admin\/audit-logs\?.*action=user\.guru_created/.test(r.url()));
  await page.selectOption('#d-eylem', 'user.guru_created');
  await r3; await sleep(500);
  const rows = await page.locator('[data-tablo] tbody tr').allTextContents();
  check('denetim: işlem filtresi → "Guru oluşturuldu" satırları (yeni guru dahil)', rows.length > 0 && rows.every(t => /Guru oluşturuldu/.test(t)), rows.length);
  const r4 = page.waitForRequest(r => /\/admin\/audit-logs\?.*entity_type=pricing_rules/.test(r.url()));
  await page.selectOption('#d-eylem', '');
  await page.selectOption('#d-varlik', 'pricing_rules');
  await r4; await sleep(500);
  const prow = await page.locator('[data-tablo] tbody tr').allTextContents();
  check('denetim: varlık filtresi fiyat kuralı → bugünkü 2 fiyat kaydı dahil', prow.length >= 2 && prow.every(t => /Fiyat kuralı/.test(t)), prow.length);
  await page.locator('[data-tablo] [data-detay]').first().click();
  const am = topModal(page); await am.waitFor();
  const at = await am.textContent();
  check('denetim detayı: eski/yeni değer JSON düz metin', /Yeni değer/.test(at) && /amount_minor/.test(at));
  await am.locator('[data-kapat]').last().click();
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const r5 = page.waitForRequest(r => /\/admin\/audit-logs\?.*from=/.test(r.url()));
  await page.fill('#d-bas', today); await page.locator('#d-bas').dispatchEvent('change');
  await r5; await sleep(400);
  check('denetim: tarih filtresi (from) sunucuya gidiyor', (await page.locator('[data-tablo] tbody tr').count()) >= 2);
  await shot(page, '11-denetim-filtre-d');
});

// ---------------------------------------------------------------- 10. Kişisel veri + depolama
await run('kişisel veri', async () => {
  const pii = adminResponses.filter(r => PII_KEYS.test(r.body));
  check(`kişisel veri: ${adminResponses.length} admin GET yanıtında CV/cevap/hikâye alanı yok`, adminResponses.length > 20 && pii.length === 0, pii.map(p => p.url.replace(API, '') + ' ' + (p.body.match(PII_KEYS) || [])[1]).join(' ; '));
  const lsw = issues.localStorage.filter(x => x.label === 'adm-d');
  check('localStorage.setItem: yönetici akışında 0', lsw.length === 0, lsw.map(x => x.key).join(','));
});

// ---------------------------------------------------------------- 11. Açık yönlendirme (?return=)
await run('?return=', async () => {
  const bad = ['https://evil.example/x', '//evil.example', 'javascript:alert(1)', '/\\evil.example', 'yonetici-panel.html/../../evil', '%2F%2Fevil.example', 'yonetici-x.html?x=//evil', '../index.html'];
  const outs = [];
  for (const b of bad) {
    await page.goto(D + 'giris-yonetici.html?return=' + encodeURIComponent(b));
    await page.waitForURL(u => !/giris-yonetici/.test(u.toString()), { timeout: 8000 }).catch(() => {});
    await loaded(page).catch(() => {});
    outs.push(page.url());
  }
  check('?return= açık yönlendirme: 8 kötü değerin hepsi → localhost yonetici-panel.html', outs.every(u => u === D + 'yonetici-panel.html'), outs.filter(u => u !== D + 'yonetici-panel.html').join(' , '));
  await page.goto(D + 'giris-yonetici.html?return=yonetici-denetim.html');
  await page.waitForURL(/yonetici-denetim\.html/, { timeout: 8000 });
  check('?return=yonetici-denetim.html (beyaz liste) → oraya', page.url() === D + 'yonetici-denetim.html');
});

// ---------------------------------------------------------------- 12. Mobil yerleşim (390×844)
await run('mobil', async () => {
  const mctx = await newContext(browser, { mobile: true, label: 'adm-m' });
  const user = JSON.parse(await page.evaluate(() => sessionStorage.getItem('idUser.admin')));
  await inject(mctx, 'admin', { token: ADMIN_TOKEN, user });
  const mp = await mctx.newPage();
  for (const [file, h1] of PAGES) {
    const c0 = issues.console.filter(c => c.label === 'adm-m').length + issues.pageerror.filter(c => c.label === 'adm-m').length;
    await mp.goto(D + file);
    await loaded(mp);
    const st = await mp.evaluate(() => {
      const sb = document.querySelector('.adm-sidebar').getBoundingClientRect();
      const h = document.querySelector('h1[data-baslik]').getBoundingClientRect();
      const btn = document.querySelector('[data-menu-ac]');
      return { ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, sbRight: sb.right, h1Top: h.top, btn: !!btn && btn.getBoundingClientRect().width > 0 };
    });
    await mp.click('[data-menu-ac]');
    await sleep(400);
    const open = await mp.evaluate(() => { const r = document.querySelector('.adm-sidebar').getBoundingClientRect(); return { left: r.left, w: r.width, exp: document.querySelector('[data-menu-ac]').getAttribute('aria-expanded') }; });
    if (file === 'yonetici-panel.html') await shot(mp, '11-panel-m-menu', { fullPage: false });
    const logoutVis = await mp.locator('.adm-sidebar [data-cikis]').isVisible();
    await mp.keyboard.press('Escape');
    await sleep(350);
    const closed = await mp.evaluate(() => document.querySelector('.adm-sidebar').getBoundingClientRect().right <= 1);
    const c1 = issues.console.filter(c => c.label === 'adm-m').length + issues.pageerror.filter(c => c.label === 'adm-m').length;
    check(`mobil ${file}: taşma 0, menü kapalı başlar, ☰ açar (çıkış görünür) / Esc kapatır, başlık ilk ekranda, hata 0`,
      st.ov <= 1 && st.sbRight <= 1 && st.btn && open.left >= -1 && open.w > 200 && open.exp === 'true' && logoutVis && closed && st.h1Top < 300 && c1 === c0,
      JSON.stringify({ ...st, open, closed, err: c1 - c0 }));
    await shot(mp, '11-' + file.replace('.html', '') + '-m', { fullPage: false });
  }
  // Bilgi (bulgu değil, ölçüm): mobilde ana-detay sayfalarında seçimden sonra detay kartının konumu.
  for (const [file, sel, det] of [['yonetici-hizmetler.html', '[data-liste] [data-hizmet]', '[data-detay]'], ['yonetici-soru-setleri.html', '[data-setler] [data-set]', '[data-detay]'], ['yonetici-kurallar.html?sekme=istem', '[data-config]', '#kural-panel [data-izgara] > .adm-card:nth-child(2)']]) {
    await mp.goto(D + file); await loaded(mp);
    await mp.locator(sel).first().click();
    await sleep(900);
    const pos = await mp.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(r.top), vh: innerHeight, scrollY: Math.round(scrollY) }; }, det);
    console.log(`INFO mobil ana-detay ${file}: ilk öğe seçildi → detay kartı top=${pos.top}px (görünür alan ${pos.vh}px, scrollY=${pos.scrollY})`);
  }
  // Mobil modal: yeni guru formu ekrana sığıyor
  await mp.goto(D + 'yonetici-gurular.html'); await loaded(mp);
  await mp.click('[data-yeni]');
  const mb = await mp.evaluate(() => { const r = document.querySelector('.adm-modal').getBoundingClientRect(); return { l: r.left, r: r.right, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  check('mobil: modal ekran genişliğinde, taşma 0', mb.l >= 0 && mb.r <= 391 && mb.ov <= 1, JSON.stringify(mb));
  await shot(mp, '11-gurular-modal-m', { fullPage: false });
  await mctx.close();
});

// ---------------------------------------------------------------- 13. Rol ayrımı (tarayıcı + API)
await run('rol ayrımı', async () => {
  const g = guruCreds();
  const tG = await token('guru', g.email, g.password, 'guru');
  const tA = candA ? await token('candA', candA.email, candA.password, 'candidate') : null;
  const endpoints = ['/admin/users', '/admin/gurus', '/admin/payments', '/admin/ai-costs', '/admin/ai-requests', '/admin/audit-logs', '/admin/question-sets', '/admin/prompt-configs', '/admin/services', '/admin/profile-fields', '/admin/follow-up-rules'];
  for (const [lbl, t] of [['aday', tA], ['guru', tG]]) {
    if (!t) { check(`API ${lbl} token (yok)`, false); continue; }
    const st = [];
    for (const ep of endpoints) st.push((await api('GET', ep, t.token)).status);
    const w = await api('POST', '/admin/gurus', t.token, { first_name: 'x', last_name: 'y', email: 'x@example.test', language: 'tr', title: 't', expertise_area: 'e', is_active: false, sector_ids: [] });
    const pw = await api('PATCH', '/admin/users/' + (tG.user.id) + '/status', t.token, { status: 'passive' });
    check(`API: ${lbl} token'ıyla ${endpoints.length} admin GET + 2 yazma → 403`, st.every(s => s === 403) && w.status === 403 && pw.status === 403, st.join(',') + ` w=${w.status} p=${pw.status}`);
  }
  const noTok = await api('GET', '/admin/users', null);
  check('API: tokensız /admin/users → 401', noTok.status === 401);
  for (const ep of ['/candidate/profile', '/candidate/enrollments', '/guru/clients', '/guru/profile']) {
    const r = await api('GET', ep, ADMIN_TOKEN);
    check(`API: yönetici token'ıyla ${ep} → 401/403`, r.status === 403 || r.status === 401, r.status + ' ' + (r.body && r.body.code));
  }

  // Tarayıcı: aday / guru oturumuyla yönetici sayfaları
  for (const [lbl, role, t] of [['aday', 'candidate', tA], ['guru', 'guru', tG]]) {
    if (!t) continue;
    const c = await newContext(browser, { label: 'sec-' + lbl });
    await inject(c, role, t);
    const p = await c.newPage();
    const admCalls = [];
    p.on('request', r => { if (r.url().includes('/admin/')) admCalls.push(r.url()); });
    await p.goto(D + 'yonetici-kullanicilar.html');
    await p.waitForURL(/giris-yonetici\.html/, { timeout: 8000 }).catch(() => {});
    check(`tarayıcı: ${lbl} oturumuyla yonetici-kullanicilar → giriş sayfası (?return=), admin isteği yok`, /giris-yonetici\.html\?return=yonetici-kullanicilar\.html$/.test(p.url()) && admCalls.length === 0, p.url().split('/').pop());
    // Sahte admin özeti + aday/guru token'ı
    await p.evaluate(([tok]) => {
      sessionStorage.setItem('idToken.admin', tok);
      sessionStorage.setItem('idUser.admin', JSON.stringify({ id: 'x', first_name: 'Sahte', last_name: 'Admin', role: 'admin', client_type: 'admin', expires_at: new Date(Date.now() + 3600e3).toISOString() }));
    }, [t.token]);
    const dataResp = [];
    p.on('response', r => { if (r.url().includes('/admin/')) dataResp.push(r.status()); });
    await p.goto(D + 'yonetici-kullanicilar.html');
    await p.waitForURL(/giris-yonetici\.html/, { timeout: 10000 }).catch(() => {});
    await sleep(500);
    const emails = await p.evaluate(() => (document.body.textContent.match(/@[a-z.]*example\.test/g) || []).length);
    const ss = await ssKeys(p);
    check(`tarayıcı: ${lbl} token'ı + sahte idUser.admin → admin uçları 403, oturum silindi, giriş sayfası, veri yok`,
      /giris-yonetici\.html/.test(p.url()) && dataResp.every(s => s === 403 || s === 401) && !ss.includes('idToken.admin') && emails === 0, `${p.url().split('/').pop()} resp=${dataResp.join(',')} ss=${ss.join(',')}`);
    await c.close();
  }
  // Tarayıcı: yönetici oturumuyla aday / guru sayfaları
  const user = JSON.parse(await page.evaluate(() => sessionStorage.getItem('idUser.admin')));
  for (const [lbl, file, login, role] of [['aday', 'ana.html', /giris\.html/, 'candidate'], ['guru', 'guru-danisanlar.html', /giris-danisman\.html/, 'guru']]) {
    const c = await newContext(browser, { label: 'sec-adm-' + lbl });
    await inject(c, 'admin', { token: ADMIN_TOKEN, user });
    const p = await c.newPage();
    await p.goto(D + file);
    await p.waitForURL(login, { timeout: 8000 }).catch(() => {});
    check(`tarayıcı: yalnız yönetici oturumuyla ${file} → ${lbl} giriş sayfası`, login.test(p.url()), p.url().split('/').pop());
    // Yönetici token'ı aday/guru anahtarına sahte konunca
    await p.evaluate(([role, tok]) => {
      sessionStorage.setItem('idToken.' + role, tok);
      sessionStorage.setItem('idUser.' + role, JSON.stringify({ id: 'x', first_name: 'Sahte', last_name: 'Rol', role, client_type: role, expires_at: new Date(Date.now() + 3600e3).toISOString() }));
    }, [role, ADMIN_TOKEN]);
    const st = [];
    p.on('response', r => { const u = r.url(); if (u.startsWith(API) && !/\/(public|auth)\//.test(u)) st.push(u.replace(API, '').split('?')[0] + '=' + r.status()); });
    await p.goto(D + file);
    await p.waitForURL(login, { timeout: 10000 }).catch(() => {});
    await sleep(800);
    const ss = await ssKeys(p);
    check(`tarayıcı: yönetici token'ı idToken.${role} olarak → API 401/403, sahte oturum silindi, ${lbl} giriş sayfası`,
      login.test(p.url()) && st.every(s => /=40[13]$/.test(s)) && !ss.includes('idToken.' + role), `${p.url().split('/').pop()} st=${st.join(',')} ss=${ss.join(',')}`);
    await c.close();
  }
});

// ---------------------------------------------------------------- 14. Çıkış + Geri tuşu
await run('çıkış', async () => {
  await page.goto(D + 'yonetici-gurular.html'); await loaded(page);
  await page.goto(D + 'yonetici-denetim.html'); await loaded(page);
  const logoutP = page.waitForResponse(r => r.url().endsWith('/auth/logout'));
  await page.click('[data-cikis]');
  const lr = await logoutP;
  await page.waitForURL(/giris-yonetici\.html$/, { timeout: 8000 });
  const ss = await ssKeys(page);
  const me = await api('GET', '/auth/me', ADMIN_TOKEN);
  check('çıkış: POST /auth/logout 204, sessionStorage temiz, giriş sayfası, eski token 401', lr.status() === 204 && !ss.some(k => k.includes('admin')) && me.status === 401, `${lr.status()} ss=${ss.join(',')} me=${me.status}`);
  const calls = [];
  page.on('request', r => { if (r.url().startsWith(API) && r.headers().authorization) calls.push(r.url()); });
  await page.goBack();
  await page.waitForURL(/giris-yonetici\.html/, { timeout: 8000 }).catch(() => {});
  await sleep(500);
  const body = await page.textContent('body');
  check('Geri tuşu: yonetici-denetim → giriş sayfasına yönleniyor, Bearer\'lı istek yok, içerik yok', /giris-yonetici\.html\?return=yonetici-denetim\.html/.test(page.url()) && calls.length === 0 && !/Denetim kayıtları/.test(body), page.url().split('/').pop());
  await page.goBack().catch(() => {});
  await page.waitForURL(/giris-yonetici\.html/, { timeout: 8000 }).catch(() => {});
  check('Geri tuşu ×2: yonetici-gurular → giriş sayfası', /giris-yonetici\.html/.test(page.url()) && calls.length === 0, page.url().split('/').pop());
  await shot(page, '11-cikis-geri-d');
});

// ---------------------------------------------------------------- Özet
const unexpected = issues.http.filter(h => !h.expected);
check('beklenmeyen 4xx/5xx yok', unexpected.length === 0, unexpected.map(h => `${h.method} ${h.url.replace(API, '')} ${h.status} (${h.label})`).slice(0, 8).join(' ; '));
// Negatif giriş denemelerinin (401/403) tarayıcı ağ günlüğü beklenen; yalnız diğer konsol hataları sayılır.
const ce = issues.console.filter(c => (c.label === 'adm-d' || c.label === 'adm-m') && !(/giris-yonetici\.html/.test(c.url) && /Failed to load resource: .* (401|403)/.test(c.text)));
check('konsol hatası (yönetici bağlamları) 0', ce.length === 0, ce.map(c => c.url.split('/').pop() + ': ' + c.text).slice(0, 5).join(' ; '));
check('pageerror (tüm bağlamlar) 0', issues.pageerror.length === 0, issues.pageerror.map(c => c.text).slice(0, 3).join(' ; '));
check('XSS sayacı (yönetici bağlamı) 0', (await page.evaluate(() => window.__xss || 0)) === 0);
fs.writeFileSync(statePath('s11-data.json'), JSON.stringify({ TS, guruEmail, guruUserId, guruProfileId }, null, 1));
save('s11.json');
await browser.close();
