// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 4: guru adds availability via UI (3 slots at +3 days and +4 days), checks musaitlik week view.
import fs from 'node:fs';
import { token, inject } from './tok.mjs';
import { launch, newContext, check, shot, issues, save, BASE, sleep, guruCreds } from './lib.mjs';

const GURU = guruCreds();
const browser = await launch();
const ctx = await newContext(browser, { label: 'guru-avail' });
const gt = await token('guru', GURU.email, GURU.password, 'guru');
await inject(ctx, 'guru', gt);
const p = await ctx.newPage();


for (const [days, times] of []) {
  await p.goto(BASE + '/demo/guru-musaitlik-ekle.html', { waitUntil: 'networkidle' }); await sleep(600);
  const iso = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  await p.fill('#availability-date', iso);
  await p.dispatchEvent('#availability-date', 'change');
  await sleep(300);
  for (let i = 0; i < times.length; i++) {
    if (i > 0) { await p.click('#add-time'); await sleep(150); }
    await p.locator('#time-rows select').nth(i).selectOption(times[i]);
  }
  await sleep(300);
  await shot(p, `34-musaitlik-ekle-dolu-${days}`);
  const prev = await p.innerText('#preview-list').catch(() => '');
  check(`müsaitlik ekle +${days}g: önizleme ${times.length} saat`, (prev.match(/\d\d:\d\d/g) || []).length >= times.length, prev.replace(/\s+/g, ' ').slice(0, 160));
  const disabled = await p.locator('#save-availability').isDisabled();
  check(`müsaitlik ekle +${days}g: kaydet etkin`, !disabled);
  await p.click('#save-availability');
  try { await p.waitForURL(/guru-musaitlik\.html/, { timeout: 15000 }); } catch (e) {
    await sleep(1500);
    await shot(p, `34x-save-fail-${days}`);
    console.log('SAVE FAIL', await p.innerText('#form-error').catch(()=>''), p.url(), (await p.innerText('main')).replace(/\s+/g, ' ').slice(0, 600), JSON.stringify(issues.http));
    process.exit(1);
  }
  await sleep(800);
  const body = await p.innerText('body');
  check(`müsaitlik ekle +${days}g → "${times.length} saat eklendi" bildirimi`, new RegExp(times.length + ' saat eklendi').test(body), (body.match(/.{0,30}eklendi.{0,30}/) || [''])[0]);
}
await p.goto(BASE + '/demo/guru-musaitlik.html', { waitUntil: 'networkidle' }); await sleep(900); await shot(p, '35-guru-musaitlik-d');
const mb = await p.innerText('main');
check('müsaitlik: fiyat kartı yok', !/₺|Fiyat/i.test(mb));
// past time warning
await p.goto(BASE + '/demo/guru-musaitlik-ekle.html', { waitUntil: 'networkidle' }); await sleep(500);
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
await p.fill('#availability-date', yesterday); await p.dispatchEvent('#availability-date', 'change'); await sleep(300);
check('müsaitlik ekle: geçmiş gün → kaydet pasif/uyarı', (await p.locator('#save-availability').isDisabled()) || /geçmiş/i.test(await p.innerText('main')));
// mobile view of panel
const m = await newContext(browser, { mobile: true, label: 'guru-m' });
const mp = await m.newPage();
const tok = await p.evaluate(() => ({ t: sessionStorage.getItem('idToken.guru'), u: sessionStorage.getItem('idUser.guru') }));
await m.addInitScript(o => { sessionStorage.setItem('idToken.guru', o.t); sessionStorage.setItem('idUser.guru', o.u); }, tok);
for (const pg of ['guru-danisanlar', 'guru-musaitlik', 'guru-seanslar', 'guru-profil']) {
  await mp.goto(BASE + '/demo/' + pg + '.html', { waitUntil: 'networkidle' }); await sleep(700);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`mobil 390px ${pg}: yatay taşma yok`, ov <= 1, ov + 'px');
  const toggles = await mp.locator('.panel-sidebar-toggle:visible').count(); // yalnız görünür panel düğmesi
  check(`mobil ${pg}: tek menü düğmesi`, toggles === 1, 'count=' + toggles);
  await shot(mp, `36-${pg}-m`);
}
await browser.close();
save('s4.json');
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed, ls: issues.localStorage }, null, 1));
