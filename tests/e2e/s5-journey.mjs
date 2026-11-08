// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 5: candidate journey by clicks: ana → profil → cv → randevu-on → takvim → randevu-ok → seanslar.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, lsKeys, sleep, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';

const who = process.argv[2] || 'A';
const C = readState(`cand-${who}.json`);
const XSS = '<img src=x onerror="window.__xss=1">';
const t = await token('cand' + who, C.email, C.password, 'candidate');
const browser = await launch();
const ctx = await newContext(browser, { label: 'journey-' + who });
await inject(ctx, 'candidate', t);
const p = await ctx.newPage();
const step = async (name) => { await sleep(900); return shot(p, name); };

await p.goto(BASE + '/demo/ana.html', { waitUntil: 'networkidle' });
await step(`50-ana-${who}`);
const ab = await p.innerText('main');
check(`${who} ana: satın alma sonrası adım gösterir (profil)`, /Profil/i.test(ab), ab.replace(/\s+/g, ' ').slice(0, 160));
check(`${who} ana: sahte isim yok (Selin/Arslan/2027)`, !/Selin|Arslan|2027/.test(ab), '');

if (!process.env.SKIP) {
// profil
await p.goto(BASE + '/demo/profil.html', { waitUntil: 'networkidle' }); await sleep(800);
await p.click('[data-action="profile-save"]'); await sleep(800);
check(`${who} profil: boş gönderim → alan hataları`, (await p.locator('[aria-invalid="true"]').count()) >= 1, 'aria-invalid=' + (await p.locator('[aria-invalid="true"]').count()));
await step(`51-profil-hata-${who}`);
const pos = p.locator('input[name="target_position"]');
if (await pos.count()) await pos.fill('Satış Uzmanı');
const sector = p.locator('select[name="sector"]');
if (await sector.count()) await sector.selectOption({ index: 1 });
else await p.locator('input[name="sector"]').fill('Teknoloji / Yazılım');
// chip groups: click first chip in each
const groups = await p.locator('main form [role="radiogroup"], main form [role="group"]').count();
for (let i = 0; i < groups; i++) {
  const chip = p.locator('main form [role="radiogroup"], main form [role="group"]').nth(i).locator('button').first();
  if (await chip.count()) await chip.click();
}
const ta = p.locator('main form textarea').first();
if (await ta.count()) await ta.fill('Serbest metin ' + XSS);
await step(`52-profil-dolu-${who}`);
await p.click('[data-action="profile-save"]');
await p.waitForURL(/cv\.html/, { timeout: 20000 }).catch(() => {});
check(`${who} profil kayıt → cv.html`, /cv\.html/.test(p.url()), p.url() + ' ' + (await p.innerText('main')).replace(/\s+/g, ' ').slice(0, 200));
await p.goto(BASE + '/demo/profil.html', { waitUntil: 'networkidle' }); await sleep(900);
check(`${who} profil: dönünce değerler aynı (G2)`, (await pos.inputValue().catch(() => '')) === 'Satış Uzmanı' && (await ta.inputValue().catch(() => '')).includes('Serbest metin'), '');

// cv
await p.goto(BASE + '/demo/cv.html', { waitUntil: 'networkidle' }); await sleep(800);
await step(`53-cv-bos-${who}`);
// reject .png
const [fc1] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), p.click('[data-upload-empty]').catch(() => {})]);
if (fc1) {
  await fc1.setFiles({ name: 'resim.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]) });
  await sleep(800);
  check(`${who} cv: .png reddi`, /PDF|DOCX|desteklen/i.test(await p.innerText('main')), '');
  const [fc2] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), p.click('[data-upload-empty]').catch(() => {})]);
  if (fc2) {
    await fc2.setFiles({ name: 'kurgu-cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n') });
    await sleep(2000);
  }
}
check(`${who} cv: yükleme sonrası "otomatik ayrıştırma yok" bilgisi`, /ayrıştırma|elle/i.test(await p.innerText('main')), '');
await step(`54-cv-yuklendi-${who}`);
// approve empty → K46 message
for (const c of await p.locator('[data-review-check]').all()) await c.check().catch(() => {});
await p.click('[data-action="cv-approve"]').catch(() => {}); await sleep(1200);
check(`${who} cv: boş CV onayı mesajı (K46)`, /en az bir deneyim/i.test(await p.innerText('main')), '');
if (!(await p.innerText('main')).includes('Kurgu A.Ş.')) {
// manual tab
await p.locator('#cv-tabs [role="tab"]').nth(1).click(); await sleep(400);
const blocks = p.locator('#view-manual > .border').filter({ has: p.locator('input') });
const exp = blocks.nth(0).locator('input');
await exp.nth(0).fill('Kurgu A.Ş. ' + XSS);
await exp.nth(1).fill('Satış Uzmanı');
await exp.nth(2).fill('2020');
await exp.nth(3).fill('2024');
await blocks.nth(0).locator(':scope > button').click(); await sleep(1500);
const sk = blocks.nth(2).locator('input').first();
if (await sk.count()) { await sk.fill('müzakere, sunum'); await blocks.nth(2).locator(':scope > button').click(); await sleep(1500); }
}
await step(`55-cv-elle-${who}`);
// "Kontrol ettim" kutuları 1. sekmedeki (Yükle) özet kartında; elle girişten sonra o sekmeye dön.
// Kutular görsel olarak gizli (tasarım: etiket) → kullanıcı gibi etikete tıkla.
await p.locator('#cv-tabs [role="tab"]').nth(0).click(); await sleep(400);
for (const c of await p.locator('[data-review-check]').all()) {
  if (await c.isChecked()) continue;
  const id = await c.getAttribute('id');
  await p.locator(`label[for="${id}"]`).click(); await sleep(200);
}
await sleep(300);
await p.click('[data-action="cv-approve"]');
await p.waitForURL(/randevu-on\.html/, { timeout: 20000 }).catch(() => {});
check(`${who} cv onay → randevu-on`, /randevu-on/.test(p.url()), p.url() + ' ' + (await p.innerText('main')).replace(/\s+/g, ' ').slice(0, 200));
} else { await p.goto(BASE + '/demo/randevu-on.html', { waitUntil: 'networkidle' }); await sleep(1000); }
await step(`56-randevu-on-${who}`);
let rb = await p.innerText('main');
if (who === 'B') {
  check('B randevu-on: KVKK eksik → "Okudum, onaylıyorum" düğmesi', (await p.locator('[data-action="consent-grant"]').count()) === 1, rb.replace(/\s+/g, ' ').slice(0, 200));
  check('B randevu-on: "Randevu Al" pasif (ön koşul eksik)', await p.locator('[data-action="booking-continue"]').isDisabled().catch(() => true));
  await p.click('[data-action="consent-grant"]'); await sleep(1500);
  rb = await p.innerText('main');
  await step('57-randevu-on-onayli-B');
}
check(`${who} randevu-on: "Her şey hazır" + Randevu Al etkin`, /hazır/i.test(rb) && !(await p.locator('[data-action="booking-continue"]').isDisabled()), rb.replace(/\s+/g, ' ').slice(0, 200));
await p.click('[data-action="booking-continue"]');
await p.waitForURL(/takvim\.html/, { timeout: 15000 }).catch(() => {});
await sleep(1200);
await step(`58-takvim-${who}`);
// pick first available day (may need next month) and first slot
let day = p.locator('.calendar-date--available').first();
if (!(await day.count())) { await p.locator('button').filter({ hasText: 'chevron_right' }).first().click().catch(() => {}); await sleep(800); day = p.locator('.calendar-date--available').first(); }
await day.click(); await sleep(700);
await p.locator('[data-slot-id]').first().click(); await sleep(400);
await step(`59-takvim-secili-${who}`);
await p.click('[data-action="booking-confirm"]');
await p.waitForURL(/randevu-ok\.html/, { timeout: 20000 }).catch(() => {});
await sleep(1000);
check(`${who} takvim onay → randevu-ok`, /randevu-ok/.test(p.url()), p.url() + ' ' + (await p.innerText('main')).replace(/\s+/g, ' ').slice(0, 200));
await step(`60-randevu-ok-${who}`);
await p.goto(BASE + '/demo/seanslar.html', { waitUntil: 'networkidle' }); await sleep(900);
const sb = await p.innerText('main');
check(`${who} seanslar: Meet bağlantısı yok, planlı seans var`, !/meet\.google|Meet/i.test(sb) && /Yaklaşan/i.test(sb), sb.replace(/\s+/g, ' ').slice(0, 160));
await step(`61-seanslar-${who}`);
check(`${who} journey: localStorage yazımı 0`, issues.localStorage.length === 0 && (await lsKeys(p)).length === 0, JSON.stringify(issues.localStorage));
check(`${who} journey: XSS tetiklenmedi`, (await p.evaluate(() => window.__xss)) === 0);
// mobile screenshots of the same pages
const m = await newContext(browser, { mobile: true, label: 'journey-m-' + who });
await inject(m, 'candidate', t);
const mp = await m.newPage();
for (const pg of ['ana', 'profil', 'cv', 'randevu-on', 'seanslar']) {
  await mp.goto(BASE + '/demo/' + pg + '.html', { waitUntil: 'networkidle' }); await sleep(800);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`mobil 390px ${pg}: yatay taşma yok`, ov <= 1, ov + 'px');
  await shot(mp, `62-${pg}-m-${who}`);
}
await browser.close();
save(`s5-${who}.json`);
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed }, null, 1));
