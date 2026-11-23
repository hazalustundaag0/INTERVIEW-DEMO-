// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 1: public pages (landing, catalog, advisor detail) desktop + mobile.
import { launch, newContext, check, shot, issues, save, BASE, lsKeys, sleep } from './lib.mjs';

const browser = await launch();
for (const mobile of [false, true]) {
  const tag = mobile ? 'm' : 'd';
  const ctx = await newContext(browser, { mobile, label: 'public-' + tag });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await sleep(500);
  await shot(p, `01-index-${tag}`);
  const body = await p.textContent('body');
  if (!mobile) {
    check('index: gerçek danışman isimleri', /Deniz Kurgu/.test(body) && /Mert Demo/.test(body), '');
    check('index: puan/★ yok', !/★|\b4[.,]\d\s*\(|puan/i.test(body), (body.match(/.{30}(★|puan).{30}/i) || [''])[0]);
    check('index: 2 seans · 60 dk', /2 seans/.test(body) && /60 d/.test(body), '');
    check('index: 2027 kalıntısı yok', !/2027/.test(body), (body.match(/.{40}2027.{20}/) || [''])[0]);
    check('index: "Tanıtım videosu yakında"', /Tanıtım videosu yakında/i.test(body));
  }
  await p.goto(BASE + '/danismanlar', { waitUntil: 'networkidle' });
  await sleep(400);
  await shot(p, `02-danismanlar-${tag}`);
  const cards = await p.locator('a[href*="danisman?id="]').count();
  if (!mobile) check('danismanlar: danışman kartları API\'den', cards >= 3, cards + ' bağlantı');
  const href = await p.locator('a[href*="danisman?id="]').first().getAttribute('href');
  await p.goto(new URL(href, p.url()).href, { waitUntil: 'networkidle' });
  await sleep(400);
  await shot(p, `03-danisman-${tag}`);
  const db = await p.textContent('body');
  if (!mobile) {
    const service = await p.evaluate(async () => {
      const result = await window.Api.get('/public/services', { auth: false });
      const item = result.items?.[0];
      if (!item) return null;
      const price = item.price
        ? Number(item.price.amount_minor) === 0
          ? 'Ücretsiz'
          : window.Api.format.money(item.price.amount_minor, item.price.currency)
        : 'Fiyat bilgisi yok';
      return { price, duration: item.session_duration_minutes, sessions: item.session_count };
    });
    check('danisman: hizmet süresi ve seans sayısı API’den', Boolean(service) &&
      /60 dakika|60 dk/.test(db) && /2 seans/i.test(db), JSON.stringify(service));
    check('danisman: fiyat API’den veya açık boş durumdan', Boolean(service) && db.includes(service.price), service?.price || 'API hizmeti yok');
    await p.route('**/api/v1/public/services', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          id: '00000000-0000-4000-8000-000000000001',
          code: 'sales_story',
          name: 'Satış hikâyesi oluşturma',
          session_count: 2,
          session_duration_minutes: 60,
          price: null
        }],
        next_cursor: null
      })
    }));
    await p.goto(new URL(href, p.url()).href, { waitUntil: 'networkidle' });
    await sleep(300);
    const emptyPriceBody = await p.textContent('.public-advisor-booking-card');
    check('danisman: API fiyatı null → açık boş durum, rakam uydurulmaz',
      /Fiyat bilgisi yok/.test(emptyPriceBody) && !/\d[\d.,]*\s*(?:₺|TRY)/i.test(emptyPriceBody),
      emptyPriceBody);
    await p.unroute('**/api/v1/public/services');
    await p.goto(BASE + '/danisman?id=00000000-0000-0000-0000-000000000000', { waitUntil: 'networkidle' });
    await sleep(300);
    check('danisman: bozuk id → "Danışman bulunamadı"', /bulunamad/i.test(await p.textContent('body')));
    await p.goto(BASE + '/danismanlar?sektor=technology', { waitUntil: 'networkidle' });
    await sleep(300);
    check('danismanlar ?sektor=technology filtreler', (await p.locator('a[href*="danisman?id="]').count()) >= 1);
  }
  check(`public-${tag}: localStorage boş`, (await lsKeys(p)).length === 0, (await lsKeys(p)).join(','));
  // horizontal overflow on mobile
  if (mobile) {
    for (const pg of ['', 'danismanlar', 'kayit', 'giris', 'guru/giris']) {
      await p.goto(BASE + '/' + pg, { waitUntil: 'networkidle' });
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
