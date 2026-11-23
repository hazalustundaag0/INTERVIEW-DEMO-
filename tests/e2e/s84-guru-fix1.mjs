// Stage 84 (84 Guru Panel): düzeltme turu 1 (QA-011, QA-013, QA-015) + Etap 4 (Ultraviolet, K78/K83/K84/K85/K91).
// 1440×900 + 390×844; ekran görüntüleri output/shots/84f1-* ve 84u-*. Env: DEMO_GURU_PASSWORD.
// Giriş sayısı: önbellekte yoksa guru 1 (token önbelleği) + aday 1 (fotoğraf testi, cand-A.json varsa) + çıkış testi 2.
//
// Etap 4 seçicileri: paylaşımlı menü #sidebar (sidebar.js; data-shared), ☰ .sidebar-toggle, ad .sidebar-user-name,
// çıkış #sidebar [data-logout]. 390 px'te menü çekmecedir: position fixed + visibility hidden + translateX(-100%).
//
// QA-014 (Etap 2: guru-musaitlik-ekle'de Material Symbols fontu yoktu, menü ikonları metin görünüyordu) kontrolü
// değişti: Etap 4'te menü ikonları SVG (sidebar.js) ve sayfada Material ikonu kalmadı; font hiç istenmediği için
// document.fonts.check() anlamsız. Yerine "ligatür metni görünmez" kontrolü: sayfada .material-symbols-outlined öğesi yok,
// menüde SVG ikon var.
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'node:fs';
import { launch, newContext, waitForDom, BASE, API, OUT, sleep, issues, guruCreds, statePath, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';
const G = guruCreds();
const t = await token('guru', G.email, G.password, 'guru');
const shotPath = name => path.join(OUT, name + '.png');
const b = await launch();
const res = [];
const ok = (name, cond, detail = '') => { res.push({ name, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? '  -- ' + detail : '')); };

// Bağımlılıksız düz renkli PNG (fotoğraf yükleme testi).
function crc32(buf) { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return (~c) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(w, h, rgb) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x += 1) row.set(rgb, 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
async function apiCall(method, p, tok, body) {
  const headers = { Origin: BASE, Authorization: 'Bearer ' + tok };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(API + p, { method, headers, body: payload });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
}

const PAGES = ['guru/danisanlar', 'guru/musaitlik', 'guru/musaitlik/ekle', 'guru/seanslar', 'guru/profil'];
let detailUrl = null;
for (const mobile of [false, true]) {
  const c = await newContext(b, { mobile, label: mobile ? 'm' : 'd' }); await inject(c, 'guru', t); const p = await c.newPage();
  await p.goto(BASE + '/guru/danisanlar', { waitUntil: 'networkidle' }); await sleep(500);
  detailUrl = detailUrl || await p.evaluate(() => document.querySelector('tbody a[href*="enrollment="]')?.getAttribute('href'));
  const pages = PAGES.concat(detailUrl ? ['guru/hikaye', 'guru/notlar', 'guru/odevler'].map(n => detailUrl.replace('guru/danisan', n)).concat([detailUrl]) : []);
  for (const pg of pages) {
    await p.goto(BASE + '/' + pg, { waitUntil: 'networkidle' }); await sleep(700);
    const m = await p.evaluate(() => {
      const a = document.querySelector('#sidebar'); const r = a?.getBoundingClientRect();
      const h = document.querySelector('main h1'); const hr = h?.getBoundingClientRect();
      const cs = a && getComputedStyle(a);
      return { shared: a?.dataset.shared === 'true', asidePos: cs && cs.position, asideVis: cs && cs.visibility, asideX: r && Math.round(r.right),
        h1Top: hr && Math.round(hr.top), h1Left: hr && Math.round(hr.left),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        materialIcons: document.querySelectorAll('.material-symbols-outlined').length,
        sidebarSvg: document.querySelectorAll('#sidebar svg').length,
        userName: document.querySelector('.sidebar-user-name')?.textContent.trim() || '' };
    });
    const name = pg.split('?')[0].replace('.html', '');
    ok(`${mobile ? 390 : 1440} ${name}: paylaşımlı menü (#sidebar[data-shared]) + oturum adı`, m.shared && m.userName.length > 0, m.userName);
    if (mobile) {
      ok(`390 ${name}: başlık ilk ekranda (h1 top < 200)`, m.h1Top !== null && m.h1Top < 200, JSON.stringify(m));
      ok(`390 ${name}: #sidebar çekmece (fixed, gizli, ekran dışı)`, m.asidePos === 'fixed' && m.asideVis === 'hidden' && m.asideX <= 0, `${m.asidePos} ${m.asideVis} right=${m.asideX}`);
      ok(`390 ${name}: yatay taşma yok`, !m.overflow);
    } else {
      ok(`1440 ${name}: sidebar solda, içerik yanında`, m.h1Top !== null && m.h1Top < 260 && m.h1Left > 200, JSON.stringify(m));
    }
    if (name === 'guru-musaitlik-ekle') ok(`${mobile ? 390 : 1440} musaitlik-ekle ikon ligatür metni yok (QA-014 → Etap 4: SVG menü, Material ikonu yok)`, m.materialIcons === 0 && m.sidebarSvg > 0, `material=${m.materialIcons} svg=${m.sidebarSvg}`);
    if (['guru-danisan-detay', 'guru-hikaye', 'guru-notlar', 'guru-odevler'].includes(name)) {
      await waitForDom(p, () => { const h = document.querySelector('[data-client-profile]'); return h && !h.hasAttribute('aria-busy'); }, null, { timeout: 8000 }).catch(() => {});
      const card = await p.evaluate(() => {
        const host = document.querySelector('[data-client-profile]');
        const links = Array.from(host?.querySelectorAll('.client-profile-action') || []).map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
        const av = host?.querySelector('.client-profile-avatar');
        return { busy: host?.hasAttribute('aria-busy'), name: host?.querySelector('h1')?.textContent.trim(), sub: host?.querySelector('p')?.textContent.trim() || '',
          links, avatarState: av?.dataset.avatarState, avatarText: av?.textContent.trim(), summary: document.querySelector('.client-session-overview')?.textContent.trim() || '',
          staticH1: document.querySelectorAll('main h1').length };
      });
      ok(`${mobile ? 390 : 1440} ${name}: danışan kartı [data-client-profile] gerçek veriyle (ad, hedef rol · sektör)`, !card.busy && card.name && card.name !== 'Danışan' && card.staticH1 === 1, `${card.name} · ${card.sub}`);
      ok(`${mobile ? 390 : 1440} ${name}: "Not Yaz"/"Ödev Ver" ?enrollment=&story=`, card.links.length === 2 && card.links.every(l => /enrollment=[0-9a-f-]{36}/.test(l.href) && /story=[0-9a-f-]{36}/.test(l.href)), JSON.stringify(card.links.map(l => l.text)));
      ok(`${mobile ? 390 : 1440} ${name}: kart avatarı fotoğraf ya da baş harf (sahte portre yok)`, ['photo', 'initials'].includes(card.avatarState), `${card.avatarState} ${card.avatarText}`);
      if (name === 'guru-danisan-detay') ok(`${mobile ? 390 : 1440} detay özeti "N / M seans tamamlandı · Kayıt tarihi …"`, /^\d+ \/ \d+ seans tamamlandı · Kayıt tarihi /.test(card.summary), card.summary);
    }
    await p.screenshot({ path: shotPath(`84u-${name}-${mobile ? 'm' : 'd'}`), fullPage: !mobile });
  }
  if (mobile) {
    await p.goto(BASE + '/guru/danisanlar', { waitUntil: 'networkidle' }); await sleep(400);
    ok('390 tek menü düğmesi (.sidebar-toggle)', (await p.locator('.sidebar-toggle:visible').count()) === 1);
    await p.click('.sidebar-toggle'); await sleep(450);
    const open = await p.evaluate(() => { const s = document.querySelector('#sidebar'); return { left: Math.round(s.getBoundingClientRect().left), vis: getComputedStyle(s).visibility }; });
    ok('390 menü düğmesi çekmeceyi açar', open.left === 0 && open.vis === 'visible', JSON.stringify(open));
    await p.screenshot({ path: shotPath('84u-guru-menu-acik-m') });
    const logout = await p.locator('#sidebar [data-logout]').isVisible();
    ok('390 açık menüde "Çıkış yap" görünür (K85)', logout);
    await p.keyboard.press('Escape'); await sleep(300);
    ok('390 Esc çekmeceyi kapatır', await p.evaluate(() => !document.body.classList.contains('sidebar-open')));
  }
  await c.close();
}

// Etap 4 — guru-profil: kaydedilmemiş değişiklik uyarısı yeni menüde (H4) + profil fotoğrafı (K83/K91).
{
  const c = await newContext(b, { label: 'profil' }); await inject(c, 'guru', t); const p = await c.newPage();
  await p.goto(BASE + '/guru/profil', { waitUntil: 'networkidle' }); await sleep(900);
  const title = p.locator('#guru-field-title');
  const orig = await title.inputValue();
  await title.fill(orig + ' x');
  await p.locator('#sidebar nav a[href]').first().click(); await sleep(300);
  ok('guru-profil: kaydedilmemiş değişiklikle menü bağlantısı → uyarı (#sidebar nav)', await p.locator('#guru-profile-dialog').isVisible(), p.url());
  await p.click('#guru-profile-stay'); await sleep(200);
  ok('guru-profil: "Vazgeç" → sayfada kalınır', /\/guru\/profil(?![a-z0-9/-])/.test(p.url()) && !(await p.locator('#guru-profile-dialog').isVisible()));
  await title.fill(orig); await sleep(200);

  const notice = await p.locator('#guru-profile-photo-notice').innerText();
  ok('fotoğraf alanı: "herkese açıktır" bilgisi görünür', /herkese açıktır/.test(notice), notice.slice(0, 80));
  const before = await apiCall('GET', '/guru/profile', t.token);
  const hadPhoto = Boolean(before.data && before.data.avatar_url);
  const dir = path.join(OUT, '..'); const big = path.join(dir, 'avatar-84-buyuk.png'); const svg = path.join(dir, 'avatar-84.svg');
  fs.writeFileSync(big, makePng(2000, 1500, [110, 70, 190]));
  fs.writeFileSync(svg, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>');
  // Tür ön kontrolü (415 karşılığı, istek atılmadan).
  await p.setInputFiles('#guru-profile-photo-input', svg); await sleep(400);
  const typeErr = await p.locator('#guru-profile-photo-status').innerText();
  ok('fotoğraf: SVG → "Bu dosya türü desteklenmiyor" (Türkçe, ikon + metin)', /desteklenmiyor/.test(typeErr), typeErr);
  // 2000×1500 → canvas ≤1024 px → PUT /me/avatar.
  const putReq = p.waitForRequest(r => r.url().endsWith('/me/avatar') && r.method() === 'PUT', { timeout: 15000 });
  await p.setInputFiles('#guru-profile-photo-input', big);
  const req = await putReq;
  ok('fotoğraf: PUT /me/avatar multipart, token URL\'de değil', /multipart\/form-data/.test(req.headers()['content-type'] || '') && !/token=/.test(req.url()), req.url());
  await waitForDom(p, () => document.querySelector('.guru-profile-photo')?.dataset.photoState === 'photo', null, { timeout: 15000 }).catch(() => {});
  await sleep(600);
  const st = await p.evaluate(async ([api, tok]) => {
    const r = await fetch(api + '/me/avatar', { headers: { Authorization: 'Bearer ' + tok } });
    const bmp = r.ok ? await createImageBitmap(await r.blob()) : null;
    const img = s => document.querySelector(s + ' img.avatar-photo')?.getAttribute('src') || '';
    return { status: r.status, w: bmp && bmp.width, h: bmp && bmp.height, photoImg: img('.guru-profile-photo-avatar'), previewImg: img('#preview-avatar'),
      sidebarImg: img('#sidebar .sidebar-avatar'), upload: document.querySelector('.guru-profile-photo-upload')?.textContent.trim(),
      removeVisible: !document.querySelector('.guru-profile-photo-remove')?.hidden };
  }, [API, t.token]);
  ok('fotoğraf: sunucudaki görsel ≤1024 px (canvas küçültme, K91)', st.status === 200 && Math.max(st.w, st.h) <= 1024 && st.w === 1024, `${st.status} ${st.w}×${st.h}`);
  ok('fotoğraf: alan, önizleme ve menü avatarı blob: <img>', [st.photoImg, st.previewImg, st.sidebarImg].every(s => s.startsWith('blob:')), JSON.stringify([st.photoImg.slice(0, 12), st.previewImg.slice(0, 12), st.sidebarImg.slice(0, 12)]));
  ok('fotoğraf: düğmeler "Fotoğrafı değiştir" + "Fotoğrafı kaldır"', st.upload === 'Fotoğrafı değiştir' && st.removeVisible, st.upload);
  await p.locator('.guru-profile-photo').screenshot({ path: shotPath('84u-profil-foto-var-d') });
  await p.screenshot({ path: shotPath('84u-guru-profil-foto-d'), fullPage: true });
  const delReq = p.waitForRequest(r => r.url().endsWith('/me/avatar') && r.method() === 'DELETE', { timeout: 15000 });
  await p.click('.guru-profile-photo-remove'); await delReq; await sleep(800);
  const after = await p.evaluate(() => ({ state: document.querySelector('.guru-profile-photo')?.dataset.photoState,
    preview: document.querySelector('#preview-avatar')?.textContent.trim(), img: !!document.querySelector('#preview-avatar img'),
    upload: document.querySelector('.guru-profile-photo-upload')?.textContent.trim() }));
  ok('fotoğraf kaldırıldı → baş harfler, "Fotoğraf yükle"', after.state === 'initials' && !after.img && after.preview.length >= 1 && after.upload === 'Fotoğraf yükle', JSON.stringify(after));
  if (hadPhoto) console.log('INFO demo gurusunun önceki fotoğrafı test sırasında kaldırıldı.');
  await c.close();
}

// Etap 4 — aday fotoğrafı danışan listesinde ve kartta (Bearer → blob:, yoksa baş harf). cand-A.json bu guruya
// atanmış bir aday ise koşar (s2'nin son koşusu); değilse atlanır.
{
  let cand = null;
  try { cand = fs.existsSync(statePath('cand-A.json')) ? readState('cand-A.json') : null; } catch { cand = null; }
  const clients = await apiCall('GET', '/guru/clients?limit=100', t.token);
  const row = cand && clients.data && clients.data.items.find(x => x.enrollment.id === cand.enrollment);
  if (!row) {
    console.log('INFO aday fotoğrafı testi atlandı: cand-A.json bu guruya atanmış değil (önce s2 koşun).');
  } else {
    const login = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ email: cand.email, password: cand.password, client_type: 'candidate' }) }).then(r => r.json());
    const form = new FormData(); form.append('file', new Blob([makePng(200, 200, [210, 160, 70])], { type: 'image/png' }), 'aday.png');
    const up = await apiCall('PUT', '/me/avatar', login.token, form);
    ok('aday A fotoğraf yükler (API)', up.status === 200, String(up.status));
    for (const mobile of [false, true]) {
      const c = await newContext(b, { mobile, label: 'aday-foto' }); await inject(c, 'guru', t); const p = await c.newPage();
      const leaks = [];
      p.on('request', r => { if (/avatar/.test(r.url()) && /token=|Bearer/.test(r.url())) leaks.push(r.url()); });
      await p.goto(BASE + '/guru/danisanlar', { waitUntil: 'networkidle' }); await sleep(900);
      const listImg = await p.evaluate(id => document.querySelector(`a[href*="${id}"]`)?.closest('tr')?.querySelector('.guru-client-row-avatar img.avatar-photo')?.getAttribute('src') || '', cand.enrollment);
      ok(`${mobile ? 390 : 1440} danışan listesi: aday fotoğrafı blob: <img>`, listImg.startsWith('blob:'), listImg.slice(0, 20));
      const initialsRows = await p.evaluate(() => Array.from(document.querySelectorAll('.guru-client-row-avatar')).filter(a => a.dataset.avatarState === 'initials').length);
      console.log('INFO fotoğrafsız satırlar baş harfli:', initialsRows);
      await p.screenshot({ path: shotPath(`84u-danisanlar-foto-${mobile ? 'm' : 'd'}`), fullPage: !mobile });
      await p.goto(BASE + '/guru/danisan?enrollment=' + cand.enrollment, { waitUntil: 'networkidle' }); await sleep(900);
      const cardImg = await p.evaluate(() => document.querySelector('[data-client-profile] .client-profile-avatar img.avatar-photo')?.getAttribute('src') || '');
      ok(`${mobile ? 390 : 1440} danışan kartı: aday fotoğrafı blob: <img>`, cardImg.startsWith('blob:'), cardImg.slice(0, 20));
      ok(`${mobile ? 390 : 1440} fotoğraf isteklerinde token URL'de yok`, leaks.length === 0, leaks.join(' '));
      await p.screenshot({ path: shotPath(`84u-detay-foto-${mobile ? 'm' : 'd'}`), fullPage: !mobile });
      await c.close();
    }
    await apiCall('DELETE', '/me/avatar', login.token);
    await apiCall('POST', '/auth/logout', login.token);
  }
}

// QA-015: rezerve bir seans saatine müsaitlik eklemeyi dene → ön kontrol mesajı.
{
  const c = await newContext(b, { label: 'qa015' }); await inject(c, 'guru', t); const p = await c.newPage();
  await p.goto(BASE + "/guru/musaitlik", { waitUntil: "networkidle" });
  const booked = await p.evaluate(async ([base, tok]) => {
    const h = { Authorization: 'Bearer ' + tok, Accept: 'application/json' };
    const clients = await (await fetch(base + '/guru/clients?limit=100&status=active', { headers: h })).json();
    for (const cl of clients.items) {
      const s = await (await fetch(base + '/guru/enrollments/' + cl.enrollment.id + '/sessions', { headers: h })).json();
      // Formun sunduğu başlangıçlar 09:00–18:00 yarım saatlik (İstanbul); ızgara dışı (ör. 15:10) seans formda seçilemez.
      const onGrid = iso => { const d = new Date(Date.parse(iso) + 3 * 3600e3); const m = d.getUTCHours() * 60 + d.getUTCMinutes(); return m % 30 === 0 && m >= 540 && m <= 1080; };
      const hit = s.items.find(x => x.status === 'scheduled' && Date.parse(x.scheduled_start_at) > Date.now() && onGrid(x.scheduled_start_at));
      if (hit) return hit.scheduled_start_at;
    }
    return null;
  }, [API, t.token]);
  if (!booked) {
    console.log('INFO QA-015: gelecekte planlı seans yok, atlandı');
  } else {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(booked)).reduce((a, x) => (a[x.type] = x.value, a), {});
    const date = `${parts.year}-${parts.month}-${parts.day}`; const time = `${parts.hour}:${parts.minute}`;
    await p.goto(`${BASE}/guru/musaitlik/ekle?date=${date}&start=${time}`, { waitUntil: 'networkidle' });
    // Rezerve saatler tüm danışanların seanslarından toplanır (N+1, eşzamanlılık 4; GAP-B18) — danışan sayısıyla uzar.
    await waitForDom(p, () => /planlı bir seansla/.test(document.getElementById('form-error')?.textContent || ''), null, { timeout: 30000 }).catch(() => {});
    const st = await p.evaluate(() => ({ err: document.getElementById('form-error').textContent, disabled: document.getElementById('save-availability').disabled }));
    ok('QA-015 rezerve saat ön kontrolde yakalanır (kaydet kapalı + neden)', st.disabled && /planlı bir seansla çakışıyor/.test(st.err), JSON.stringify(st));
    await p.screenshot({ path: shotPath('84u-musaitlik-ekle-rezerve-d'), fullPage: true });
  }
  await c.close();
}
// QA-011 / K85: gerçek giriş formu → guru paneli → menünün altındaki "Çıkış yap" — 1440 ve 390.
for (const mobile of [false, true]) {
  const c = await newContext(b, { mobile, label: 'logout' }); const p = await c.newPage();
  await p.goto(BASE + '/guru/giris', { waitUntil: 'networkidle' });
  await p.fill('#email', G.email);
  await p.fill('#password', G.password);
  await Promise.all([p.waitForURL(/\/guru\/danisanlar(?![a-z0-9/-])/, { timeout: 15000 }), p.click('button[type="submit"]')]);
  await p.waitForLoadState('networkidle'); await sleep(500);
  if (mobile) { await p.click('.sidebar-toggle'); await sleep(400); }
  const btn = p.locator('#sidebar [data-logout]');
  const visible = await btn.isVisible();
  await p.screenshot({ path: shotPath(`84u-cikis-oncesi-${mobile ? 'm' : 'd'}`) });
  await Promise.all([p.waitForURL(/\/guru\/giris(?![a-z0-9/-])/, { timeout: 15000 }), btn.click()]);
  const tokenLeft = await p.evaluate(() => sessionStorage.getItem('idToken.guru'));
  ok(`${mobile ? 390 : 1440} QA-011 guru "Çıkış yap" görünür → giris-danisman, token silindi`, visible && !tokenLeft, p.url());
  await p.goto(BASE + '/guru/danisanlar', { waitUntil: 'networkidle' });
  ok(`${mobile ? 390 : 1440} QA-011 çıkış sonrası panel → girişe yönlenir`, /\/guru\/giris(?![a-z0-9/-])\?return=/.test(p.url()), p.url());
  await c.close();
}
await b.close();
const failed = res.filter(r => !r.ok).length;
const realConsole = issues.console.filter(x => !/Failed to load resource: the server responded with a status of 404/.test(x.text));
console.log(`\n84 (düzeltme turu 1 + Etap 4): ${res.length - failed} geçti / ${failed} kaldı · konsol hatası ${realConsole.length} · JS istisnası ${issues.pageerror.length} · localStorage yazımı ${issues.localStorage.length}`);
if (issues.pageerror.length) console.log(JSON.stringify(issues.pageerror.slice(0, 5)));
if (issues.console.length) console.log(JSON.stringify(issues.console.slice(0, 8)));
process.exit(failed ? 1 : 0);
