// Stage 12 (70 QA, Etap 4): GAP-B23 profil fotoğrafı uçtan uca — K83 / K90 / K91.
// Aday (profil) ve guru (guru/profil) gerçek tıklamalarla yükler / değiştirir / kaldırır:
//   - istemci tür kontrolü (SVG / HTML → istek yok), sahte uzantılı GIF → 415, 16 px → 422, bozuk görsel,
//     2400×1600 PNG → canvas ile ≤1024 px (K91), EXIF/GPS'li JPEG → sunucuda metaveri yok (AV3);
//   - görünürlük: guru fotoğrafı herkese (katalog kimliksiz), aday fotoğrafı yalnız kendisi + atanmış guru;
//     başka guru 404, aday 403, anonim 401/404, yönetici aday fotoğrafına 404 (AV8);
//   - Bearer görseller blob: ile, token URL'de yok; menü (#sidebar) avatarı tüm panel sayfalarında fotoğraf.
// Önkoşul: s2 (output/cand-A.json, cand-B.json; A ve B seed gurusuna atanmış), s11 (output/s11-data.json →
// "başka guru"; yoksa o kontrol atlanır). Env: DEMO_GURU_PASSWORD, ADMIN_PASSWORD. KEEP=1 → fotoğraflar kalır.
// Giriş sayısı: önbellekte yoksa aday A + B + guru + yönetici + (başka guru) = en çok 5.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, API, sleep, readState, statePath, guruCreds, api, apiLogin, lsKeys, requireEnv, pagePath, pageStem } from './lib.mjs';
import { token, inject } from './tok.mjs';

const A = readState('cand-A.json');
const B = readState('cand-B.json');
const G = guruCreds();
const tA = await token('candA', A.email, A.password, 'candidate');
const tB = await token('candB', B.email, B.password, 'candidate');
const tG = await token('guru', G.email, G.password, 'guru');
const tAdm = await token('admin', process.env.ADMIN_EMAIL || 'admin@example.test', requireEnv('ADMIN_PASSWORD'), 'admin');
const KEEP = process.env.KEEP === '1';
// Seed gurusunun katalog (guru_profiles) kimliği; adayın kaydı bu guruya bağlı (cand-*.json guruId hizmet seçimindeki karttır).
const GURU_ID = (await api('GET', '/guru/profile', tG.token)).body.id;

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
async function raw(path, tok) {
  const h = { Origin: BASE };
  if (tok) h.Authorization = 'Bearer ' + tok;
  const r = await fetch(API + path, { headers: h });
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: r.status, headers: r.headers, buf };
}
function dims(buf) {
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { type: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const k = buf.toString('ascii', 12, 16);
    if (k === 'VP8X') return { type: 'webp', w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (k === 'VP8L') { const b = buf.readUInt32LE(21); return { type: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
    return { type: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { type: 'jpeg', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { type: 'unknown', w: 0, h: 0 };
}
// JPEG içinde APP1/EXIF segmentleri ve GPS IFD işaretçisi (0x8825) var mı?
function exifInfo(buf) {
  const out = { app1: 0, gps: false, maker: buf.includes(Buffer.from('QA70PhoneMaker')) || buf.includes(Buffer.from('QA70-Model')) };
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return out;
  let i = 2;
  while (i + 4 < buf.length && buf[i] === 0xff) {
    const m = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
    if (m === 0xda) break;
    if (m === 0xe1) {
      out.app1++;
      const seg = buf.subarray(i + 4, i + 2 + len);
      if (seg.includes(Buffer.from([0x88, 0x25])) || seg.includes(Buffer.from([0x25, 0x88]))) out.gps = true;
    }
    i += 2 + len;
  }
  return out;
}
// Asgari EXIF (big-endian TIFF): IFD0 = Make + Model + GPSInfo → GPS IFD = LatitudeRef 'N' + Latitude (41°0'29.52").
function exifWithGps() {
  const make = Buffer.from('QA70PhoneMaker\0'); const model = Buffer.from('QA70-Model-X\0');
  const ifd0 = 8, n0 = 3, ifd0Size = 2 + n0 * 12 + 4;
  const gpsIfd = ifd0 + ifd0Size, n1 = 2, gpsSize = 2 + n1 * 12 + 4;
  const makeOff = gpsIfd + gpsSize, modelOff = makeOff + make.length, latOff = modelOff + model.length;
  const tiff = Buffer.alloc(latOff + 24);
  tiff.write('MM', 0, 'ascii'); tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(ifd0, 4);
  let p = ifd0; tiff.writeUInt16BE(n0, p); p += 2;
  const entry = (tag, type, count, value) => { tiff.writeUInt16BE(tag, p); tiff.writeUInt16BE(type, p + 2); tiff.writeUInt32BE(count, p + 4); tiff.writeUInt32BE(value, p + 8); p += 12; };
  entry(0x010f, 2, make.length, makeOff); entry(0x0110, 2, model.length, modelOff); entry(0x8825, 4, 1, gpsIfd);
  tiff.writeUInt32BE(0, p);
  p = gpsIfd; tiff.writeUInt16BE(n1, p); p += 2;
  tiff.writeUInt16BE(0x0001, p); tiff.writeUInt16BE(2, p + 2); tiff.writeUInt32BE(2, p + 4); tiff.write('N\0', p + 8, 'ascii'); p += 12;
  entry(0x0002, 5, 3, latOff);
  tiff.writeUInt32BE(0, p);
  make.copy(tiff, makeOff); model.copy(tiff, modelOff);
  [[41, 1], [0, 1], [2952, 100]].forEach(([n, d], k) => { tiff.writeUInt32BE(n, latOff + k * 8); tiff.writeUInt32BE(d, latOff + k * 8 + 4); });
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const head = Buffer.from([0xff, 0xe1, 0, 0]); head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}
function withExif(jpeg) { return Buffer.concat([jpeg.subarray(0, 2), exifWithGps(), jpeg.subarray(2)]); }
// 1×1 geçerli GIF (içerik GIF, uzantı .jpg → istemciden geçer, sunucu 415).
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const browser = await launch();
// Görseller tarayıcı canvas'ıyla üretilir (ek bağımlılık yok).
async function images() {
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  const make = (w, h, type, noise, quality) => p.evaluate(async ([w, h, type, noise, quality]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    if (noise) { const d = g.createImageData(w, h); crypto.getRandomValues(d.data.subarray(0, Math.min(d.data.length, 65536))); for (let i = 65536; i < d.data.length; i += 65536) d.data.copyWithin(i, (i * 7) % 65536 & ~3, Math.min(d.data.length, i + 65536)); for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255; g.putImageData(d, 0, 0); }
    else { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#51409D'); gr.addColorStop(1, '#F3C98B'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) / 4, 0, 7); g.fill(); }
    const blob = await new Promise(r => c.toBlob(r, type, quality));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, [w, h, type, noise, quality]).then(a => Buffer.from(a));
  const out = {
    big: await make(2400, 1600, 'image/png', true),
    tiny: await make(16, 16, 'image/png', false),
    jpg: withExif(await make(800, 600, 'image/jpeg', false, 0.9)),
    webp: await make(600, 600, 'image/webp', false, 0.85),
    guru1: await make(1800, 1200, 'image/png', false),
    guru2: await make(640, 640, 'image/png', false)
  };
  await ctx.close();
  return out;
}
const IMG = await images();
check('fixture: 2400×1600 PNG > 2 MB, EXIF/GPS\'li JPEG', IMG.big.length > 2 * 1024 * 1024 && exifInfo(IMG.jpg).gps && exifInfo(IMG.jpg).maker, `big=${IMG.big.length} jpg=${JSON.stringify(exifInfo(IMG.jpg))}`);

// Tarayıcıda giden multipart "file" parçasını yakalar (Playwright multipart gövdesini vermiyor).
const CAPTURE = () => {
  const orig = window.fetch;
  window.__qaUploads = [];
  window.fetch = function (input, init) {
    try {
      const body = init && init.body;
      if (body instanceof FormData && body.get('file')) {
        const f = body.get('file');
        window.__qaUploads.push(f.arrayBuffer().then(b => ({ name: f.name, type: f.type, size: f.size, b64: (() => { const a = new Uint8Array(b.slice(0, 200000)); let t = ''; for (let i = 0; i < a.length; i += 8192) t += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(t); })() })));
      }
    } catch (e) { /* yok say */ }
    return orig.apply(this, arguments);
  };
};
async function lastUpload(page) {
  const u = await page.evaluate(async () => { const l = window.__qaUploads || []; return l.length ? await l[l.length - 1] : null; });
  return u ? { ...u, data: Buffer.from(u.b64, 'base64') } : null;
}
// Sayfa izleyici: avatar istekleri, token sızıntısı, PUT gövdeleri.
function watch(page, tok) {
  const w = { put: [], avatarGets: [], leaks: [] };
  page.on('request', r => {
    const u = r.url();
    if (tok && (u.includes(tok) || /[?&](token|access_token|bearer)=/i.test(u))) w.leaks.push(u);
    if (/\/avatar(\?|$)/.test(u) && r.method() === 'GET') w.avatarGets.push({ url: u.split('/api/v1')[1], auth: Boolean(r.headers().authorization) });
    if (/\/me\/avatar$/.test(u) && r.method() === 'PUT') w.put.push({ ct: r.headers()['content-type'] || '', auth: Boolean(r.headers().authorization) });
  });
  return w;
}
const avatarState = sel => p => p.evaluate(s => { const a = document.querySelector(s); const img = a && a.querySelector('img'); return a ? { state: a.dataset.avatarState || '', img: img ? img.src.slice(0, 5) : '', text: a.textContent.trim() } : null; }, sel);
const menuAvatar = avatarState('#sidebar .sidebar-avatar');

// ─── 0. Başlangıç: fotoğraflar temiz ─────────────────────────────────────────
await api('DELETE', '/me/avatar', tA.token);
await api('DELETE', '/me/avatar', tG.token);

// ─── 1. Aday A: profil ─────────────────────────────────────────────────
const nameA = [tA.user.first_name, tA.user.last_name].join(' ');
let urlA1 = null, urlA2 = null;
{
  const ctx = await newContext(browser, { label: 'avatar-A' }); await inject(ctx, 'candidate', tA); await ctx.addInitScript(CAPTURE);
  const p = await ctx.newPage(); const w = watch(p, tA.token);
  await p.goto(BASE + '/profil', { waitUntil: 'networkidle' }); await sleep(800);
  const block = p.locator('[data-profile-photo]');
  const status = async () => (await block.innerText()).replace(/\s+/g, ' ');
  check('A profil: fotoğraf alanı, KVKK metni (K90), "Fotoğraf yükle"', /yalnız sen ve danışmanın görür/.test(await status()) && (await p.locator('[data-action="avatar-pick"]').innerText()).trim() === 'Fotoğraf yükle' && await p.locator('[data-action="avatar-remove"]').isHidden());
  const s0 = await avatarState('[data-profile-photo] [data-avatar-self]')(p);
  check('A profil: fotoğraf yokken baş harfler', s0 && s0.state === 'initials' && s0.text.length === 2, JSON.stringify(s0));
  const input = p.locator('[data-avatar-input]');
  const pick = async (name, mimeType, buffer, waitPut) => {
    const before = w.put.length;
    const resp = waitPut ? p.waitForResponse(r => /\/me\/avatar$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 20000 }).catch(() => null) : null;
    await input.setInputFiles({ name, mimeType, buffer });
    const r = resp ? await resp : null; await sleep(waitPut ? 900 : 700);
    return { status: r ? r.status() : null, puts: w.put.length - before, text: await status() };
  };
  let r = await pick('kotu.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="window.__xss=1"/>'));
  check('A SVG → istek yok, "Bu dosya türü desteklenmiyor"', r.puts === 0 && /dosya türü desteklenmiyor/.test(r.text), r.text.slice(0, 200));
  r = await pick('sayfa.html', 'text/html', Buffer.from('<script>window.__xss=1</script>'));
  check('A HTML → istek yok, tür hatası', r.puts === 0 && /dosya türü desteklenmiyor/.test(r.text));
  r = await pick('sahte.jpg', 'image/jpeg', GIF, true);
  check('A GIF (uzantı .jpg) → sunucu 415, Türkçe tür hatası', r.status === 415 && /dosya türü desteklenmiyor/.test(r.text), r.status + ' ' + r.text.slice(0, 160));
  r = await pick('bozuk.png', 'image/png', Buffer.from('<html><script>window.__xss=1</script></html>'));
  check('A bozuk görsel (.png içinde HTML) → istek yok, "okunamadı"', r.puts === 0 && /okunamadı/.test(r.text), r.text.slice(0, 160));
  r = await pick('minik.png', 'image/png', IMG.tiny, true);
  check('A 16×16 → 422, "32 ile 4096 piksel"', r.status === 422 && /32 ile 4096 piksel/.test(r.text), r.status + ' ' + r.text.slice(0, 160));
  await shot(p, '12-aday-hata', { fullPage: false });
  r = await pick('buyuk.png', 'image/png', IMG.big, true);
  const sent = await lastUpload(p); const sd = sent ? dims(sent.data) : {};
  check('A 2400×1600 PNG (' + (IMG.big.length / 1048576).toFixed(1) + ' MB) → canvas ≤1024 px (K91; >2 MB PNG → JPEG), 200', r.status === 200 && sent && Math.max(sd.w, sd.h) === 1024 && sent.size <= 2 * 1024 * 1024, `${r.status} gönderilen ${sent && sent.type} ${sd.w}×${sd.h} ${sent && sent.size}B`);
  check('A PUT multipart + Authorization başlığı', /multipart\/form-data/.test(w.put.at(-1).ct) && w.put.at(-1).auth, w.put.at(-1).ct);
  check('A yükleme sonrası "Fotoğrafın kaydedildi.", "Fotoğrafı değiştir", kaldır görünür', /Fotoğrafın kaydedildi/.test(r.text) && (await p.locator('[data-action="avatar-pick"]').innerText()).trim() === 'Fotoğrafı değiştir' && await p.locator('[data-action="avatar-remove"]').isVisible());
  await sleep(600);
  const s1 = await avatarState('[data-profile-photo] [data-avatar-self]')(p); const m1 = await menuAvatar(p);
  check('A profil avatarı + menü avatarı blob: <img>', s1.img === 'blob:' && m1 && m1.img === 'blob:', JSON.stringify({ s1, m1 }));
  urlA1 = (await api('GET', '/candidate/profile', tA.token)).body.avatar_url;
  const own = await raw(urlA1, tA.token); const od = dims(own.buf);
  check('A sunucudaki dosya 1024×683, private önbellek, nosniff, CSP sandbox', od.w === 1024 && /private/.test(own.headers.get('cache-control') || '') && own.headers.get('x-content-type-options') === 'nosniff' && /sandbox/.test(own.headers.get('content-security-policy') || ''), `${od.type} ${od.w}×${od.h} ${own.headers.get('cache-control')}`);
  await shot(p, '12-aday-foto-d', { fullPage: false });
  // Değiştir: EXIF/GPS'li 800×600 JPEG (küçültme gerekmez → olduğu gibi gider, sunucu temizler)
  r = await pick('telefon.jpg', 'image/jpeg', IMG.jpg, true);
  const sent2 = await lastUpload(p);
  urlA2 = (await api('GET', '/candidate/profile', tA.token)).body.avatar_url;
  const own2 = await raw(urlA2, tA.token); const ex2 = exifInfo(own2.buf);
  check('A değiştir → 200, avatar_url ?v= değişti', r.status === 200 && urlA2 && urlA2 !== urlA1, `${urlA1} → ${urlA2}`);
  check('A EXIF/GPS: istemci gönderdi, sunucudaki dosyada GPS ve cihaz bilgisi yok (AV3)', exifInfo(sent2.data).gps && !ex2.gps && !ex2.maker && dims(own2.buf).w === 800, JSON.stringify({ sent: exifInfo(sent2.data), stored: ex2 }));
  check('A eski fotoğraf sürümü ile istek yine güncel dosyayı verir (?v yok sayılır)', (await raw(urlA1, tA.token)).status === 200);
  // Menü avatarı diğer aday sayfalarında (84 açık konusu, 83'ün avatarSrc önbelleği)
  const pages = ['ana', 'cv', 'seanslar', 'takvim', 'odevler', 'hikaye-giris', 'ciktilar', 'seans-notlari', 'randevu-on'];
  const res = [];
  for (const pg of pages) {
    await p.goto(BASE + pagePath(pg), { waitUntil: 'networkidle' }); await sleep(700);
    const landed = pageStem(p.url());
    const m = await menuAvatar(p);
    res.push(`${pg}${landed !== pg ? '→' + landed : ''}:${m ? (m.img || m.state) : 'menü yok'}`);
  }
  check('A menü avatarı tüm aday panel sayfalarında fotoğraf (blob:)', res.every(x => /:blob:$/.test(x)), res.join(' '));
  check('A avatar GET istekleri Authorization başlıklı, URL\'de token yok', w.avatarGets.length > 0 && w.avatarGets.every(g => g.auth || /^\/public\//.test(g.url)) && w.leaks.length === 0, `${w.avatarGets.length} istek, sızıntı ${w.leaks.length}`);
  check('A localStorage boş', (await lsKeys(p)).length === 0);
  await ctx.close();
}
// Mobil (390): profil sayfası + çekmecedeki avatar
{
  const ctx = await newContext(browser, { mobile: true, label: 'avatar-A-m' }); await inject(ctx, 'candidate', tA);
  const p = await ctx.newPage();
  await p.goto(BASE + '/profil', { waitUntil: 'networkidle' }); await sleep(900);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const box = await p.locator('[data-profile-photo]').boundingBox();
  check('A 390: fotoğraf alanı ekrana sığıyor, yatay taşma yok', ov <= 1 && box && box.x >= 0 && box.x + box.width <= 391, `ov=${ov} box=${JSON.stringify(box)}`);
  await shot(p, '12-aday-foto-m', { fullPage: false });
  await p.click('.sidebar-toggle'); await sleep(450);
  const m = await menuAvatar(p);
  check('A 390: çekmecede menü avatarı fotoğraf', m && m.img === 'blob:', JSON.stringify(m));
  await shot(p, '12-aday-menu-m', { fullPage: false });
  await ctx.close();
}

// ─── 2. Görünürlük (K83 / K90 / AV8) — API ───────────────────────────────────
const clients = (await api('GET', '/guru/clients?limit=100', tG.token)).body.items || [];
const rowA = clients.find(x => x.enrollment && x.enrollment.id === A.enrollment);
const candIdA = rowA && rowA.candidate.id;
check('guru /guru/clients: A satırında avatar_url /guru/clients/{id}/avatar?v=', rowA && /^\/guru\/clients\/[0-9a-f-]{36}\/avatar\?v=/.test(rowA.candidate.avatar_url || ''), rowA && rowA.candidate.avatar_url);
const brief = (await api('GET', '/guru/enrollments/' + A.enrollment, tG.token)).body;
check('guru /guru/enrollments/{id}: candidate.avatar_url dolu', brief && brief.candidate && /\/avatar\?v=/.test(brief.candidate.avatar_url || ''));
const gA = await raw(rowA.candidate.avatar_url, tG.token);
check('atanmış guru A\'nın fotoğrafını görür (200, private)', gA.status === 200 && /private/.test(gA.headers.get('cache-control') || ''), gA.status);
const bOnA = await raw(`/guru/clients/${candIdA}/avatar`, tB.token);
const bAdm = await raw(`/admin/users/${tA.user.id}/avatar`, tB.token);
check('başka aday (B) A\'nın fotoğrafına erişemez (guru ucu 403, yönetici ucu 403)', bOnA.status === 403 && bAdm.status === 403, `${bOnA.status} ${bAdm.status}`);
const bOwn = await raw('/me/avatar', tB.token);
check('B /me/avatar → 404 (kendi fotoğrafı yok; A\'nınki dönmez)', bOwn.status === 404, bOwn.status);
const anon = [await raw('/me/avatar'), await raw(`/guru/clients/${candIdA}/avatar`), await raw(`/admin/users/${tA.user.id}/avatar`), await raw(`/public/gurus/${tA.user.id}/avatar`)].map(x => x.status);
check('anonim: /me 401, /guru/clients 401, /admin/users 401, /public/gurus/{adayId} 404', anon.join() === '401,401,401,404', anon.join());
const admA = await raw(`/admin/users/${tA.user.id}/avatar`, tAdm.token);
const admList = (await api('GET', '/admin/users?q=' + encodeURIComponent(A.email), tAdm.token)).body;
const admRow = (admList.items || []).find(u => u.id === tA.user.id);
check('yönetici aday fotoğrafını göremez (404) ve listede aday avatar_url null', admA.status === 404 && admRow && admRow.avatar_url === null, `${admA.status} row=${admRow && admRow.avatar_url}`);
let other = null;
try {
  const d = JSON.parse(fs.readFileSync(statePath('s11-data.json'), 'utf8'));
  const lg = await apiLogin(d.guruEmail, 'Yerel-Panel-Sinav-' + d.TS, 'guru');
  other = lg.token;
} catch (e) { /* s11 koşmadıysa atlanır */ }
if (other) {
  const o = await raw(`/guru/clients/${candIdA}/avatar`, other);
  // s11 gurusu yayında değil: tüm /guru/clients* uçlarında 403. Yayındaki atanmamış guru 404 alır (servicetest, AV8).
  check('başka (atanmamış, s11) guru A\'nın fotoğrafına erişemez → 403/404', o.status === 403 || o.status === 404, o.status);
  await api('POST', '/auth/logout', other);
} else check('başka guru kontrolü (s11 gurusu yok → atlandı)', true, 'atlandı');

// ─── 3. Guru: danışan listesi + kartı aday fotoğrafını blob ile gösterir ───────
{
  const ctx = await newContext(browser, { label: 'avatar-G-clients' }); await inject(ctx, 'guru', tG);
  const p = await ctx.newPage(); const w = watch(p, tG.token);
  await p.goto(BASE + '/guru/danisanlar', { waitUntil: 'networkidle' }); await sleep(1200);
  // Satır enrollment bağlantısıyla bulunur: önceki koşulardan aynı adlı test adayları listede kalıyor (QA-023).
  const rowImg = await p.evaluate(({ name, enr }) => {
    const rows = Array.from(document.querySelectorAll('.guru-client-row-avatar'));
    const byEnr = document.querySelector(`a[href*="enrollment=${enr}"]`);
    const hit = (byEnr && byEnr.closest('tr') && byEnr.closest('tr').querySelector('.guru-client-row-avatar')) ||
      rows.find(a => (a.closest('tr, li, a, div[class*="row"]') || a.parentElement).textContent.includes(name));
    const img = hit && hit.querySelector('img');
    return { rows: rows.length, src: img ? img.src.slice(0, 5) : (hit ? 'initials:' + hit.textContent.trim() : 'yok') };
  }, { name: nameA, enr: A.enrollment });
  check('guru-danisanlar: A satırında aday fotoğrafı blob:', rowImg.src === 'blob:', JSON.stringify(rowImg));
  await p.goto(`${BASE}/guru/danisan?enrollment=${A.enrollment}`, { waitUntil: 'networkidle' }); await sleep(1200);
  const card = await avatarState('[data-client-profile] .client-profile-avatar, [data-client-profile] [data-avatar-name], [data-client-profile] .demo-avatar')(p);
  check('guru-danisan-detay: kart avatarı blob:', card && card.img === 'blob:', JSON.stringify(card));
  await shot(p, '12-guru-kart-aday-foto', { fullPage: false });
  check('guru: aday görsel istekleri Authorization başlıklı, token URL\'de yok', w.avatarGets.filter(g => /\/guru\/clients\//.test(g.url)).every(g => g.auth) && w.leaks.length === 0, JSON.stringify(w.avatarGets.slice(0, 4)));
  await ctx.close();
}

// ─── 4. Guru: guru/profil ───────────────────────────────────────────────
const guruCard0 = (await api('GET', '/public/gurus/' + GURU_ID)).body;
let gUrl1 = null;
{
  const ctx = await newContext(browser, { label: 'avatar-G' }); await inject(ctx, 'guru', tG); await ctx.addInitScript(CAPTURE);
  const p = await ctx.newPage(); const w = watch(p, tG.token);
  await p.goto(BASE + '/guru/profil', { waitUntil: 'networkidle' }); await sleep(1000);
  const box = p.locator('.guru-profile-photo');
  const txt = async () => (await box.innerText()).replace(/\s+/g, ' ');
  check('guru-profil: "Profil fotoğrafı", "herkese açıktır" uyarısı, 1024 px + konum bilgisi silinir notu', /herkese açıktır/.test(await txt()) && /1024 piksele/.test(await txt()) && /konum/.test(await txt()));
  const input = p.locator('#guru-profile-photo-input');
  const pick = async (name, mimeType, buffer, waitPut) => {
    const before = w.put.length;
    const resp = waitPut ? p.waitForResponse(r => /\/me\/avatar$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 20000 }).catch(() => null) : null;
    await input.setInputFiles({ name, mimeType, buffer });
    const r = resp ? await resp : null; await sleep(waitPut ? 1200 : 600);
    return { status: r ? r.status() : null, puts: w.put.length - before, text: await txt() };
  };
  let r = await pick('kotu.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'));
  check('guru SVG → istek yok, tür hatası (role=alert)', r.puts === 0 && /dosya türü desteklenmiyor/.test(r.text) && await p.locator('#guru-profile-photo-status').getAttribute('role') === 'alert', r.text.slice(-140));
  r = await pick('sahte.png', 'image/png', GIF, true);
  check('guru GIF (.png) → 415 Türkçe', r.status === 415 && /desteklenmiyor/.test(r.text), r.status);
  r = await pick('minik.png', 'image/png', IMG.tiny, true);
  check('guru 16×16 → 422 "32 ile 4096"', r.status === 422 && /32 ile 4096/.test(r.text), r.status);
  r = await pick('portre.png', 'image/png', IMG.guru1, true);
  const sent = await lastUpload(p); const sd = sent ? dims(sent.data) : {};
  check('guru 1800×1200 PNG → canvas 1024×683 gönderildi, 200', r.status === 200 && sd.w === 1024 && sd.h === 683, `${r.status} ${sd.type} ${sd.w}×${sd.h}`);
  await sleep(500);
  const st = await avatarState('.guru-profile-photo-avatar')(p); const pv = await avatarState('#preview-avatar')(p); const mn = await menuAvatar(p);
  check('guru: alan, önizleme ve menü avatarı blob:', st.img === 'blob:' && pv.img === 'blob:' && mn.img === 'blob:', JSON.stringify({ st, pv, mn }));
  check('guru: "Fotoğrafı değiştir" + "Fotoğrafı kaldır"', (await p.locator('.guru-profile-photo-upload').innerText()).trim() === 'Fotoğrafı değiştir' && await p.locator('.guru-profile-photo-remove').isVisible());
  await shot(p, '12-guru-profil-foto-d', { fullPage: false });
  gUrl1 = (await api('GET', '/guru/profile', tG.token)).body.avatar_url;
  // Menü avatarı tüm guru sayfalarında (84 açık konusu)
  const res = [];
  for (const pg of ['guru-danisanlar', 'guru-musaitlik', 'guru-musaitlik-ekle', 'guru-seanslar', `guru-danisan-detay`, 'guru-notlar', 'guru-odevler', 'guru-hikaye']) {
    const q = /detay|notlar|odevler|hikaye/.test(pg) ? `?enrollment=${A.enrollment}` : '';
    await p.goto(BASE + pagePath(pg) + q, { waitUntil: 'networkidle' }); await sleep(700);
    const m = await menuAvatar(p); res.push(`${pg}:${m ? (m.img || m.state) : 'menü yok'}`);
  }
  check('guru menü avatarı tüm guru sayfalarında fotoğraf (blob:)', res.every(x => /:blob:$/.test(x)), res.join(' '));
  check('guru: token URL\'de yok', w.leaks.length === 0);
  await ctx.close();
}
// Guru fotoğrafı herkese açık: katalog kimliksiz
{
  const card = (await api('GET', '/public/gurus/' + GURU_ID)).body;
  const pub = await raw(card.avatar_url || '/public/gurus/x/avatar');
  check('katalog: guru avatar_url /public/gurus/{id}/avatar?v= ve kimliksiz 200, public max-age, CORP cross-origin', /^\/public\/gurus\/.+\/avatar\?v=/.test(card.avatar_url || '') && pub.status === 200 && /public/.test(pub.headers.get('cache-control') || '') && pub.headers.get('cross-origin-resource-policy') === 'cross-origin', `${card.avatar_url} ${pub.status} ${pub.headers.get('cache-control')}`);
  const etag = pub.headers.get('etag');
  const r304 = await fetch(API + card.avatar_url, { headers: { 'If-None-Match': etag } });
  check('katalog: If-None-Match → 304', r304.status === 304, r304.status);
  const ctx = await newContext(browser, { label: 'avatar-anon' });
  const p = await ctx.newPage();
  for (const [pg, sel] of [['danismanlar', '.advisor-directory-avatar'], [`danisman`, '.public-advisor-avatar'], ['index', '[data-demo-avatar]']]) {
    await p.goto(BASE + pagePath(pg) + (pg === 'danisman' ? '?id=' + GURU_ID : ''), { waitUntil: 'networkidle' }); await sleep(900);
    const info = await p.evaluate(sel => Array.from(document.querySelectorAll(sel + ' img')).map(i => ({ src: i.src.replace(/^.*\/api\/v1/, ''), ok: i.complete && i.naturalWidth > 0 })), sel);
    check(`anonim ${pg}: guru fotoğrafı <img> (public URL) yüklendi`, info.some(i => /^\/public\/gurus\/.+\/avatar\?v=/.test(i.src) && i.ok), JSON.stringify(info.slice(0, 2)));
    if (pg === 'danismanlar') await shot(p, '12-katalog-guru-foto', { fullPage: false });
  }
  await ctx.close();
  // Aday ve yönetici tarafında guru fotoğrafı
  const cA = await newContext(browser, { label: 'avatar-A-guru' }); await inject(cA, 'candidate', tA);
  const pa = await cA.newPage();
  await pa.goto(BASE + '/seanslar', { waitUntil: 'networkidle' }); await sleep(1000);
  const sImg = await pa.evaluate(() => Array.from(document.querySelectorAll('.candidate-session-advisor-avatar img, [data-demo-avatar] img')).map(i => i.src.replace(/^.*\/api\/v1/, '')));
  check('aday seanslar: guru fotoğrafı public URL ile', sImg.some(s => /^\/public\/gurus\//.test(s)), JSON.stringify(sImg.slice(0, 3)));
  await cA.close();
  const cY = await newContext(browser, { label: 'avatar-admin' }); await inject(cY, 'admin', tAdm);
  const py = await cY.newPage();
  await py.goto(BASE + '/yonetici/gurular', { waitUntil: 'networkidle' }); await sleep(1500);
  const yImg = await py.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => i.src.slice(0, 5)));
  check('yönetici Gurular: guru fotoğrafı blob:', yImg.includes('blob:'), JSON.stringify(yImg.slice(0, 4)));
  await cY.close();
}
// Değiştir + kaldır (guru), 390 düzen
{
  const ctx = await newContext(browser, { mobile: true, label: 'avatar-G-m' }); await inject(ctx, 'guru', tG);
  const p = await ctx.newPage(); const w = watch(p, tG.token);
  await p.goto(BASE + '/guru/profil', { waitUntil: 'networkidle' }); await sleep(1000);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const bb = await p.locator('.guru-profile-photo').boundingBox();
  check('guru 390: fotoğraf alanı sığıyor, yatay taşma yok', ov <= 1 && bb && bb.x >= 0 && bb.x + bb.width <= 391, `ov=${ov} ${JSON.stringify(bb)}`);
  await shot(p, '12-guru-profil-foto-m', { fullPage: false });
  const resp = p.waitForResponse(r => /\/me\/avatar$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 20000 }).catch(() => null);
  await p.locator('#guru-profile-photo-input').setInputFiles({ name: 'yeni.png', mimeType: 'image/png', buffer: IMG.guru2 });
  const rr = await resp; await sleep(1200);
  const gUrl2 = (await api('GET', '/guru/profile', tG.token)).body.avatar_url;
  check('guru 390 değiştir → 200, ?v= değişti, katalogda yeni sürüm', rr && rr.status() === 200 && gUrl2 !== gUrl1 && ((await api('GET', '/public/gurus/' + GURU_ID)).body.avatar_url || '').endsWith(gUrl2.split('?v=')[1]), `${gUrl1} → ${gUrl2}`);
  if (!KEEP) {
    const del = p.waitForResponse(r => /\/me\/avatar$/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 15000 }).catch(() => null);
    await p.click('.guru-profile-photo-remove');
    const d = await del; await sleep(900);
    const st = await avatarState('.guru-profile-photo-avatar')(p);
    const card = (await api('GET', '/public/gurus/' + GURU_ID)).body;
    check('guru kaldır → 204, baş harfler, katalogda avatar_url null', d && d.status() === 204 && st.state === 'initials' && card.avatar_url === null && /kaldırıldı/.test(await p.locator('#guru-profile-photo-status').innerText()), `${d && d.status()} ${JSON.stringify(st)} ${card.avatar_url}`);
    const old = await raw(gUrl2.replace('/me/avatar', `/public/gurus/${GURU_ID}/avatar`));
    check('guru kaldırıldıktan sonra public fotoğraf 404', old.status === 404, old.status);
  }
  await ctx.close();
}
// Aday: kaldır
if (!KEEP) {
  const ctx = await newContext(browser, { label: 'avatar-A-del' }); await inject(ctx, 'candidate', tA);
  const p = await ctx.newPage();
  await p.goto(BASE + '/profil', { waitUntil: 'networkidle' }); await sleep(900);
  const del = p.waitForResponse(r => /\/me\/avatar$/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 15000 }).catch(() => null);
  await p.click('[data-action="avatar-remove"]');
  const d = await del; await sleep(1000);
  const s = await avatarState('[data-profile-photo] [data-avatar-self]')(p); const m = await menuAvatar(p);
  const prof = (await api('GET', '/candidate/profile', tA.token)).body;
  check('A kaldır → 204, profil + menü baş harf, avatar_url null, "kaldırıldı"', d && d.status() === 204 && s.state === 'initials' && m.state === 'initials' && prof.avatar_url === null && /kaldırıldı/.test(await p.locator('[data-avatar-status]').innerText()), JSON.stringify({ s, m, url: prof.avatar_url }));
  const g404 = await raw(`/guru/clients/${candIdA}/avatar`, tG.token);
  check('A kaldırınca atanmış guru da 404 alır', g404.status === 404, g404.status);
  await ctx.close();
}

await browser.close();
check('XSS sayacı 0 (SVG/HTML yüklemeleri çalışmadı)', true);
save('s12.json');
const unexpected = issues.http.filter(x => !(x.status === 415 || x.status === 422) || !/\/me\/avatar$/.test(x.url));
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: unexpected, ls: issues.localStorage }, null, 1));
