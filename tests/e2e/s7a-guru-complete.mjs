// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 7a: guru opens A and B from Danışanlarım, checks K45 brief, completes the 1st session (click + confirm).
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, sleep, guruCreds, readState, writeState } from './lib.mjs';
import { token, inject } from './tok.mjs';

const t = await token('guru', guruCreds().email, guruCreds().password, 'guru');
const browser = await launch();
const ctx = await newContext(browser, { label: 'guru-complete' });
await inject(ctx, 'guru', t);
const p = await ctx.newPage();
const storyReqs = [];
// K45: hikâye/ham veri uçları (/guru/stories/{id}, /raw). Gurunun kendi notları (/notes) izinlidir.
p.on('request', r => { if (/\/guru\/stories\/[0-9a-f-]{36}(\/raw)?(\?|$)/.test(r.url())) storyReqs.push(r.url()); });
const links = {};
for (const who of ['A', 'B']) {
  const C = readState(`cand-${who}.json`);
  await p.goto(BASE + '/demo/guru-danisanlar.html', { waitUntil: 'networkidle' }); await sleep(800);
  const name = who === 'A' ? 'Ayşe Nur Kurgu' : 'Bora Kurgu';
  // Önceki koşulardan aynı adlı test adayları listede kalır → satırı bu koşunun enrollment UUID'siyle seç (s2 kaydeder).
  const own = p.locator(`a[href*="enrollment=${C.enrollment}"]`).filter({ hasText: 'Aç' });
  const row = p.locator('tr, [role="row"], .client-row, li, div').filter({ hasText: name }).filter({ has: p.locator('a:has-text("Aç")') }).last();
  const href = await ((C.enrollment && await own.count()) ? own.first() : row.locator('a:has-text("Aç")').first()).getAttribute('href');
  check(`guru danışanlar ${who}: "Aç" ?enrollment=&story= UUID`, /enrollment=[0-9a-f-]{36}/.test(href) && /story=[0-9a-f-]{36}/.test(href), href);
  links[who] = new URL(href, p.url()).href;
  await p.goto(links[who], { waitUntil: 'networkidle' }); await sleep(1000);
  await shot(p, `70-guru-detay-${who}`);
  const body = await p.innerText('main');
  check(`guru detay ${who}: gerçek ad + profil ön bilgisi`, body.includes(name) && /Satış Uzmanı/.test(body), body.replace(/\s+/g, ' ').slice(0, 200));
  check(`guru detay ${who}: XSS tetiklenmedi (profil serbest metni)`, (await p.evaluate(() => window.__xss)) === 0);
  check(`guru detay ${who}: serbest metin düz metin olarak görünür`, body.includes('<img src=x') || !/Serbest metin/.test(body), (body.match(/Serbest metin.{0,60}/) || ['(yok)'])[0]);
  const btn = p.locator('button', { hasText: /Tamamlandı işaretle/ }).first();
  if (await btn.count()) {
    await btn.click(); await sleep(400);
    await shot(p, `71-guru-tamamla-onay-${who}`);
    await p.click('[data-action="complete-session-confirm"]'); await sleep(1500);
    const after = await p.innerText('main');
    check(`guru detay ${who}: seans tamamlandı rozeti`, /Tamamlandı/.test(after), '');
  } else check(`guru detay ${who}: "Tamamlandı işaretle" düğmesi`, false, 'yok');
}
writeState('guru-links.json', (links));
check('guru: Danışanlar/detay sırasında /guru/stories isteği yok (rızasız B dahil)', storyReqs.length === 0 || storyReqs.every(u => !u.includes(new URL(links.B).searchParams.get('story'))), storyReqs.join(','));
await browser.close();
save('s7a.json');
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed, ls: issues.localStorage }, null, 1));
