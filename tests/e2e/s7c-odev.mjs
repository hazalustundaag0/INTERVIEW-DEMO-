// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, sleep, guruCreds, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';
const A = readState('cand-A.json'); const links = readState('guru-links.json');
const tA = await token('candA', A.email, A.password, 'candidate');
const tG = await token('guru', guruCreds().email, guruCreds().password, 'guru');
const b = await launch();
const a = await newContext(b, { label: 'odev-A' }); await inject(a, 'candidate', tA); const ap = await a.newPage();
await ap.goto(BASE + '/demo/odevler.html', { waitUntil: 'networkidle' }); await sleep(1200);
// s7b ödevi zaten teslim ettiyse (normal akış) yalnız durumu doğrula; değilse burada teslim et.
const pending = ap.getByText('Teslim Et', { exact: true });
if (await pending.count()) {
  await pending.first().click(); await sleep(1500);
  await shot(ap, '82-odev-teslim-form-A');
  const mt = ap.locator('main textarea:visible').first();
  if (!(await mt.count())) { const t = ap.getByRole('tab', { name: /Metin/ }); if (await t.count()) await t.click(); await sleep(300); }
  await ap.locator('main textarea:visible').first().fill('Teslim metni: üç örnek aşağıda.');
  await ap.click('[data-action="assignment-submit"]'); await sleep(2500);
}
await shot(ap, '83-odev-teslim-sonrasi-A');
const body = (await ap.innerText('main')) + ' ' + ap.url();
check('aday A ödev teslimi → teslim edildi', /Teslim edildi|teslim=1/i.test(body), body.replace(/\s+/g,' ').slice(0,200));
const g = await newContext(b, { label: 'odev-guru' }); await inject(g, 'guru', tG); const gp = await g.newPage();
await gp.goto(BASE + '/demo/guru-odevler.html' + new URL(links.A).search, { waitUntil: 'networkidle' }); await sleep(1500);
const gb = await gp.innerText('main');
check('guru: satır "Teslim edildi"', /Teslim edildi/.test(gb), gb.replace(/\s+/g,' ').slice(0,200));
await gp.getByText('Üç başarı örneği', { exact: false }).first().click().catch(()=>{}); await sleep(1000);
await shot(gp, '84-guru-odev-detay-A');
const rv = gp.getByRole('button', { name: /İncelendi/ });
if (await rv.count()) { await rv.first().click(); await sleep(1500); }
check('guru: "İncelendi olarak işaretle" → İncelendi', /İncelendi/.test(await gp.innerText('body')), '');
await b.close(); save('s7c.json');
console.log(JSON.stringify({ pageerror: issues.pageerror, http: issues.http, console: issues.console }));
