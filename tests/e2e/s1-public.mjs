// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 1: public pages (landing, catalog, advisor detail) desktop + mobile.
import { launch, newContext, check, shot, issues, save, BASE, lsKeys, sleep } from './lib.mjs';

const browser = await launch();
for (const mobile of [false, true]) {
  const tag = mobile ? 'm' : 'd';
  const ctx = await newContext(browser, { mobile, label: 'public-' + tag });
  const p = await ctx.newPage();
  await p.goto(BASE + '/demo/index.html', { waitUntil: 'networkidle' });
  await sleep(500);
  await shot(p, `01-index-${tag}`);
  const body = await p.textContent('body');
  if (!mobile) {
    check('index: gerçek danışman isimleri', /Deniz Kurgu/.test(body) && /Mert Demo/.test(body), '');
    check('index: puan/★ yok', !/★|\b4[.,]\d\s*\(|puan/i.test(body), (body.match(/.{30}(★|puan).{30}/i) || [''])[0]);
    check('index: 2 seans · 50 dk', /2 seans/.test(body) && /50 d/.test(body), '');
    check('index: 2027 kalıntısı yok', !/2027/.test(body), (body.match(/.{40}2027.{20}/) || [''])[0]);
    check('index: "Tanıtım videosu yakında"', /Tanıtım videosu yakında/i.test(body));
  }
  await p.goto(BASE + '/demo/danismanlar.html', { waitUntil: 'networkidle' });
  await sleep(400);
  await shot(p, `02-danismanlar-${tag}`);
  const cards = await p.locator('a[href*="danisman.html?id="]').count();
  if (!mobile) check('danismanlar: danışman kartları API\'den', cards >= 3, cards + ' bağlantı');
  const href = await p.locator('a[href*="danisman.html?id="]').first().getAttribute('href');
  await p.goto(new URL(href, p.url()).href, { waitUntil: 'networkidle' });
  await sleep(400);
  await shot(p, `03-danisman-${tag}`);
  const db = await p.textContent('body');
  if (!mobile) {
    check('danisman: 1.500 ₺ / 50 dk / 2 seans', /1\.500/.test(db) && /50 dakika|50 dk/.test(db) && /2 seans/i.test(db), '');
    await p.goto(BASE + '/demo/danisman.html?id=00000000-0000-0000-0000-000000000000', { waitUntil: 'networkidle' });
    await sleep(300);
    check('danisman: bozuk id → "Danışman bulunamadı"', /bulunamad/i.test(await p.textContent('body')));
    await p.goto(BASE + '/demo/danismanlar.html?sektor=technology', { waitUntil: 'networkidle' });
    await sleep(300);
    check('danismanlar ?sektor=technology filtreler', (await p.locator('a[href*="danisman.html?id="]').count()) >= 1);
  }
  check(`public-${tag}: localStorage boş`, (await lsKeys(p)).length === 0, (await lsKeys(p)).join(','));
  // horizontal overflow on mobile
  if (mobile) {
    for (const pg of ['index.html', 'danismanlar.html', 'kayit.html', 'giris.html', 'giris-danisman.html']) {
      await p.goto(BASE + '/demo/' + pg, { waitUntil: 'networkidle' });
      await sleep(300);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`mobil 390px yatay taşma yok: ${pg}`, ov <= 1, 'taşma=' + ov + 'px');
      await shot(p, `04-${pg.replace('.html', '')}-m`);
    }
  }
  await ctx.close();
}
await browser.close();
save('s1.json');
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http.filter(x => !x.expected), failed: issues.failed, ls: issues.localStorage }, null, 1));
