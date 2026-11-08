// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 7b: B uploads an external story (UI). Guru: guru-hikaye for A (consent) and B (no consent, K45),
// note write + share, assignment create. Candidate A: sees note, submits assignment. Guru: marks reviewed.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, sleep, lsKeys, ssKeys, guruCreds, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';

const XSS = '<img src=x onerror="window.__xss=1">';
const A = readState('cand-A.json');
const B = readState('cand-B.json');
const links = readState('guru-links.json');
const tA = await token('candA', A.email, A.password, 'candidate');
const tB = await token('candB', B.email, B.password, 'candidate');
const tG = await token('guru', guruCreds().email, guruCreds().password, 'guru');
const browser = await launch();

// --- B: external story upload
{
  const ctx = await newContext(browser, { label: 'ext-B' }); await inject(ctx, 'candidate', tB);
  const p = await ctx.newPage();
  await p.goto(BASE + '/demo/hikaye-yukle.html', { waitUntil: 'networkidle' }); await sleep(800);
  await p.fill('textarea', 'Bora olarak sahada yeni bayi ağı kurdum. ' + XSS + ' Bu süreçte iletişimi güçlendirdim ve ekibimle hedefimize ulaştık.');
  await sleep(300);
  check('B hikaye-yukle: kelime sayısı görünür', /kelime/i.test(await p.innerText('main')));
  await shot(p, '72-hikaye-yukle-B');
  await p.click('[data-action="story-external-upload"]');
  await p.waitForURL(/ciktilar/, { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  check('B hazır hikâye yükle → ciktilar', /ciktilar/.test(p.url()), p.url());
  await shot(p, '73-ciktilar-yuklenen-B');
  await ctx.close();
}

// --- Guru
const g = await newContext(browser, { label: 'guru-story' }); await inject(g, 'guru', tG);
const gp = await g.newPage();
const storyCalls = [];
gp.on('request', r => { const u = r.url(); if (/\/guru\/stories\/[0-9a-f-]{36}(\/raw)?(\?|$)/.test(u)) storyCalls.push(u.split('/api/v1')[1]); });
for (const who of ['B', 'A']) {
  const u = new URL(links[who]);
  const q = u.search;
  await gp.goto(BASE + '/demo/guru-hikaye.html' + q, { waitUntil: 'networkidle' }); await sleep(1500);
  await shot(gp, `74-guru-hikaye-${who}`);
  const body = await gp.innerText('main');
  if (who === 'B') {
    check('K45 rızasız B: "Aday hikâyesini seninle paylaşmadı" kutusu', /paylaşmadı/i.test(body), body.replace(/\s+/g, ' ').slice(0, 200));
    check('K45 rızasız B: hikâye/cevap metni yok', !/bayi ağı/.test(body));
    const sid = u.searchParams.get('story');
    check('K45 rızasız B: /guru/stories/{id} isteği yok', !storyCalls.some(c => c.includes(sid)), storyCalls.join(','));
  } else {
    check('K45 rızalı A: "adayın izniyle görüyorsun" + hikâye metni', /izniyle/i.test(body) && /müşteri şikâyetlerini/.test(body), body.replace(/\s+/g, ' ').slice(0, 200));
    check('rızalı A: guru ekranında "Hikâyeyi onayla"/editör yok', !/Hikâyeyi onayla/.test(body));
    check('rızalı A guru-hikaye: XSS tetiklenmedi (aday cevap metni)', (await gp.evaluate(() => window.__xss)) === 0);
    check('rızalı A guru-hikaye: XSS yükü düz metin', body.includes('<img src=x'), '');
  }
}
// notes for A
const qA = new URL(links.A).search;
await gp.goto(BASE + '/demo/guru-notlar.html' + qA, { waitUntil: 'networkidle' }); await sleep(1200);
await gp.locator('main textarea').first().fill('İlk seans notu: hedefin net. ' + XSS);
const share = gp.locator('main button', { hasText: /Paylaş|paylaş/ }).first();
await share.click(); await sleep(500);
await shot(gp, '75-guru-not-onay');
await gp.click('[data-action="note-dialog-confirm"]').catch(() => {}); await sleep(1500);
const nb = await gp.innerText('main');
check('guru notlar: paylaş → "Adayla paylaşıldı"', /Adayla paylaşıldı/.test(nb), nb.replace(/\s+/g, ' ').slice(0, 200));
await shot(gp, '76-guru-notlar-A');
// assignment for A
await gp.goto(BASE + '/demo/guru-odevler.html' + qA, { waitUntil: 'networkidle' }); await sleep(1200);
await shot(gp, '77-guru-odevler-bos-A');
const titleInput = gp.locator('main input[placeholder$="başlığı"]').first();
await titleInput.fill('Üç başarı örneği ' + XSS);
const details = gp.locator('main textarea').first();
if (await details.count()) await details.fill('Her biri için sonucu yaz.');
await gp.locator('button', { hasText: 'Adaya Gönder' }).first().click(); await sleep(1800);
const ob = await gp.innerText('main');
check('guru ödev → listede "Bekliyor"', /Bekliyor/.test(ob), ob.replace(/\s+/g, ' ').slice(0, 200));
await shot(gp, '78-guru-odevler-A');
check('guru akışı: XSS tetiklenmedi', (await gp.evaluate(() => window.__xss)) === 0);
check('guru akışı: localStorage boş', (await lsKeys(gp)).length === 0, (await lsKeys(gp)).join(','));

// --- Candidate A sees note, submits assignment
const a = await newContext(browser, { label: 'cand-A-notes' }); await inject(a, 'candidate', tA);
const ap = await a.newPage();
await ap.goto(BASE + '/demo/seans-notlari.html', { waitUntil: 'networkidle' }); await sleep(1200);
const sn = await ap.innerText('main');
check('aday A seans-notlari: guru notu görünür (düz metin)', /hedefin net/.test(sn) && sn.includes('<img src=x'), sn.replace(/\s+/g, ' ').slice(0, 160));
await shot(ap, '79-seans-notlari-A');
await ap.goto(BASE + '/demo/odevler.html', { waitUntil: 'networkidle' }); await sleep(1200);
await shot(ap, '81-odevler-A');
const odb = await ap.innerText('main');
check('aday A ödevler: guru ödevi listede', /Üç başarı örneği/.test(odb), odb.replace(/\s+/g, ' ').slice(0, 200));
const teslim = ap.locator('a, button', { hasText: /Teslim et|Teslim/ }).first();
if (await teslim.count()) {
  await teslim.click(); await sleep(1500);
  // Teslim ekranı "Dosya yükle" sekmesiyle açılır → metin için "Metin yaz" sekmesine geç.
  const textTab = ap.getByRole('tab', { name: /Metin yaz/ });
  if (await textTab.count()) { await textTab.click(); await sleep(300); }
  const mt = ap.locator('#answer-text, main textarea').first();
  if (await mt.count()) {
    await mt.fill('Teslim metni: üç örnek ekte.');
    await ap.click('[data-action="assignment-submit"]').catch(() => {});
    await sleep(2000);
  }
  await shot(ap, '82-odev-teslim-A');
}
check('aday A ödev teslimi → "Teslim edildi"', /Teslim edildi|teslim=1|gönderildi/i.test((await ap.innerText('main')) + ap.url()), ap.url());
check('aday A: XSS tetiklenmedi', (await ap.evaluate(() => window.__xss)) === 0);
await browser.close();
save('s7b.json');
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed, ls: issues.localStorage }, null, 1));
