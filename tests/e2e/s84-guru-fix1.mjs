// Stage 84 (84 Guru Panel, düzeltme turu 1): QA-011 (guru çıkışı, 81'in [data-logout]'u), QA-013 (390 px
// guru ilk ekranı), QA-014 (guru-musaitlik-ekle ikon fontu), QA-015 (rezerve saat ön kontrolü).
// 1440×900 + 390×844; ekran görüntüleri output/shots/84f1-*. Env: DEMO_GURU_PASSWORD.
// Giriş sayısı: önbellekte yoksa guru 1 (token önbelleği) + çıkış testi için form üzerinden 2.
import path from 'node:path';
import { launch, newContext, BASE, API, OUT, sleep, issues, guruCreds } from './lib.mjs';
import { token, inject } from './tok.mjs';
const G = guruCreds();
const t = await token('guru', G.email, G.password, 'guru');
const shotPath = name => path.join(OUT, name + '.png');
const b = await launch();
const res = [];
const ok = (name, cond, detail = '') => { res.push({ name, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? '  -- ' + detail : '')); };
const PAGES = ['guru-danisanlar.html', 'guru-musaitlik.html', 'guru-musaitlik-ekle.html', 'guru-seanslar.html', 'guru-profil.html'];
let detailUrl = null;
for (const mobile of [false, true]) {
  const c = await newContext(b, { mobile, label: mobile ? 'm' : 'd' }); await inject(c, 'guru', t); const p = await c.newPage();
  await p.goto(BASE + '/demo/guru-danisanlar.html', { waitUntil: 'networkidle' }); await sleep(500);
  detailUrl = detailUrl || await p.evaluate(() => document.querySelector('tbody a')?.getAttribute('href'));
  const pages = PAGES.concat(detailUrl ? [detailUrl, detailUrl.replace('guru-danisan-detay', 'guru-hikaye')] : []);
  for (const pg of pages) {
    await p.goto(BASE + '/demo/' + pg, { waitUntil: 'networkidle' }); await sleep(700);
    const m = await p.evaluate(() => {
      const a = document.querySelector('aside'); const r = a?.getBoundingClientRect();
      const h = document.querySelector('main h1'); const hr = h?.getBoundingClientRect();
      const icons = Array.from(document.querySelectorAll('.material-symbols-outlined')).slice(0, 6)
        .map(el => getComputedStyle(el).fontFamily);
      return { asidePos: a && getComputedStyle(a).position, asideX: r && Math.round(r.right), h1Top: hr && Math.round(hr.top), h1Left: hr && Math.round(hr.left),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, iconFont: icons[0] || null,
        fontsOk: document.fonts.check('20px "Material Symbols Outlined"') };
    });
    const name = pg.split('?')[0].replace('.html', '');
    if (mobile) {
      ok(`390 ${name}: başlık ilk ekranda (h1 top < 200)`, m.h1Top !== null && m.h1Top < 200, JSON.stringify(m));
      ok(`390 ${name}: aside çekmece (fixed, ekran dışı)`, m.asidePos === 'fixed' && m.asideX <= 0, `${m.asidePos} right=${m.asideX}`);
      ok(`390 ${name}: yatay taşma yok`, !m.overflow);
    } else {
      ok(`1440 ${name}: sidebar solda, içerik yanında`, m.h1Top !== null && m.h1Top < 200 && m.h1Left > 200, JSON.stringify(m));
    }
    if (name === 'guru-musaitlik-ekle') ok(`${mobile ? 390 : 1440} musaitlik-ekle ikon fontu yüklü (QA-014)`, m.fontsOk, m.iconFont);
    await p.screenshot({ path: shotPath(`84f1-${name}-${mobile ? 'm' : 'd'}`) });
  }
  if (mobile) {
    await p.goto(BASE + '/demo/guru-danisanlar.html', { waitUntil: 'networkidle' }); await sleep(400);
    await p.click('.panel-sidebar-toggle'); await sleep(400);
    const open = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().left));
    ok('390 menü düğmesi çekmeceyi açar', open === 0, 'left=' + open);
    await p.screenshot({ path: shotPath('84f1-guru-menu-acik-m') });
    const logout = await p.evaluate(() => Array.from(document.querySelectorAll('aside button, aside a')).some(el => /Çıkış/.test(el.textContent)));
    console.log('INFO 390 menüde "Çıkış" var mı (QA-011, 81 yardımcısına bağlı):', logout);
  }
  await c.close();
}

// QA-015: rezerve bir seans saatine müsaitlik eklemeyi dene → ön kontrol mesajı.
{
  const c = await newContext(b, { label: 'qa015' }); await inject(c, 'guru', t); const p = await c.newPage();
  await p.goto(BASE + "/demo/guru-musaitlik.html", { waitUntil: "networkidle" });
  const booked = await p.evaluate(async ([base, tok]) => {
    const h = { Authorization: 'Bearer ' + tok, Accept: 'application/json' };
    const clients = await (await fetch(base + '/guru/clients?limit=100&status=active', { headers: h })).json();
    for (const cl of clients.items) {
      const s = await (await fetch(base + '/guru/enrollments/' + cl.enrollment.id + '/sessions', { headers: h })).json();
      const hit = s.items.find(x => x.status === 'scheduled' && Date.parse(x.scheduled_start_at) > Date.now());
      if (hit) return hit.scheduled_start_at;
    }
    return null;
  }, [API, t.token]);
  if (!booked) {
    console.log('INFO QA-015: gelecekte planlı seans yok, atlandı');
  } else {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(booked)).reduce((a, x) => (a[x.type] = x.value, a), {});
    const date = `${parts.year}-${parts.month}-${parts.day}`; const time = `${parts.hour}:${parts.minute}`;
    await p.goto(`${BASE}/demo/guru-musaitlik-ekle.html?date=${date}&start=${time}`, { waitUntil: 'networkidle' }); await sleep(1500);
    const st = await p.evaluate(() => ({ err: document.getElementById('form-error').textContent, disabled: document.getElementById('save-availability').disabled }));
    ok('QA-015 rezerve saat ön kontrolde yakalanır (kaydet kapalı + neden)', st.disabled && /planlı bir seansla çakışıyor/.test(st.err), JSON.stringify(st));
    await p.screenshot({ path: shotPath('84f1-musaitlik-ekle-rezerve-d'), fullPage: true });
  }
  await c.close();
}
// QA-011: gerçek giriş formu → guru paneli → "Çıkış yap" (81'in [data-logout] yardımcısı) — 1440 ve 390.
for (const mobile of [false, true]) {
  const c = await newContext(b, { mobile, label: 'logout' }); const p = await c.newPage();
  await p.goto(BASE + '/demo/giris-danisman.html', { waitUntil: 'networkidle' });
  await p.fill('#email', G.email);
  await p.fill('#password', G.password);
  await Promise.all([p.waitForURL(/guru-danisanlar\.html/, { timeout: 15000 }), p.click('button[type="submit"]')]);
  await p.waitForLoadState('networkidle'); await sleep(500);
  if (mobile) { await p.click('.panel-sidebar-toggle'); await sleep(400); }
  const btn = p.locator('aside [data-logout]');
  const visible = await btn.isVisible();
  await p.screenshot({ path: shotPath(`84f1-cikis-oncesi-${mobile ? 'm' : 'd'}`) });
  await Promise.all([p.waitForURL(/giris-danisman\.html/, { timeout: 15000 }), btn.click()]);
  const tokenLeft = await p.evaluate(() => sessionStorage.getItem('idToken.guru'));
  ok(`${mobile ? 390 : 1440} QA-011 guru "Çıkış yap" görünür → giris-danisman, token silindi`, visible && !tokenLeft, p.url());
  await p.goto(BASE + '/demo/guru-danisanlar.html', { waitUntil: 'networkidle' });
  ok(`${mobile ? 390 : 1440} QA-011 çıkış sonrası panel → girişe yönlenir`, /giris-danisman\.html\?return=/.test(p.url()), p.url());
  await c.close();
}
await b.close();
const failed = res.filter(r => !r.ok).length;
console.log(`\n84 düzeltme turu 1: ${res.length - failed} geçti / ${failed} kaldı · konsol hatası ${issues.console.length} · JS istisnası ${issues.pageerror.length} · localStorage yazımı ${issues.localStorage.length}`);
if (issues.pageerror.length) console.log(JSON.stringify(issues.pageerror.slice(0, 5)));
if (issues.console.length) console.log(JSON.stringify(issues.console.slice(0, 5)));
