// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 8: frontend security in a real browser: role separation, open redirect, token leakage, logout, 401 handling.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, sleep, api, ssKeys, lsKeys, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';

const A = readState('cand-A.json');
const tA = await token('candA', A.email, A.password, 'candidate');
const browser = await launch();
const leaks = [];

// 1) candidate token on guru pages (normal key → no guru session; forged into guru key)
{
  const ctx = await newContext(browser, { label: 'sec-role' }); await inject(ctx, 'candidate', tA);
  const p = await ctx.newPage();
  await p.goto(BASE + '/demo/guru-danisanlar.html', { waitUntil: 'networkidle' }); await sleep(800);
  check('rol: aday oturumuyla guru sayfası → giris-danisman?return=', /giris-danisman\.html\?return=guru-danisanlar/.test(p.url()), p.url());
  await ctx.close();
  const ctx2 = await newContext(browser, { label: 'sec-role-forged' });
  await ctx2.addInitScript(([t, u]) => { if (!sessionStorage.getItem('forged')) { sessionStorage.setItem('forged', '1'); sessionStorage.setItem('idToken.guru', t); sessionStorage.setItem('idUser.guru', JSON.stringify(Object.assign({}, u, { role: 'guru', client_type: 'guru' }))); } }, [tA.token, tA.user]);
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/demo/guru-danisanlar.html', { waitUntil: 'networkidle' }); await sleep(1500);
  const body = await p2.innerText('body');
  check('rol: aday token\'ı guru anahtarına sahte konduğunda guru verisi görünmez', !/Ayşe Nur Kurgu|Bora Kurgu/.test(body), p2.url() + ' | ' + body.replace(/\s+/g, ' ').slice(0, 160));
  check('rol: sahte guru oturumu temizlenir / girişe yönlenir', /giris-danisman/.test(p2.url()) || !(await ssKeys(p2)).includes('idToken.guru'), p2.url() + ' ss=' + (await ssKeys(p2)).join(','));
  await shot(p2, '85-sahte-guru-oturumu');
  await ctx2.close();
}

// 2) open redirect via ?return= (login once; then test target sanitisation without logging in again via logged-in session redirect)
{
  const ctx = await newContext(browser, { label: 'sec-redirect' });
  const p = await ctx.newPage();
  p.on('request', r => { if (/idt_|idv_/.test(r.url())) leaks.push('URL ' + r.url()); });
  p.on('console', m => { if (/idt_|idv_/.test(m.text())) leaks.push('console ' + m.text().slice(0, 80)); });
  const evil = ['https://evil.example/', '//evil.example/x', 'javascript:alert(1)', '/\\evil.example', 'ana.html/../../evil', '%2F%2Fevil.example'];
  await p.goto(BASE + '/demo/giris.html?return=' + encodeURIComponent(evil[0]), { waitUntil: 'networkidle' });
  await p.fill('#email', A.email); await p.fill('#password', A.password);
  await Promise.all([p.waitForURL(u => !/giris\.html/.test(u.href), { timeout: 20000 }).catch(() => {}), p.click('form button[type=submit]')]);
  await sleep(1000);
  check('açık yönlendirme: giris ?return=https://evil → site içinde kalır', new URL(p.url()).host === 'localhost:3000', p.url());
  // other vectors via the safeReturnPath implementation in the page (same code path as login)
  const res = await p.evaluate(list => list.map(v => [v, window.Api.safeReturnPath(decodeURIComponent(v))]), evil);
  check('açık yönlendirme: safeReturnPath tüm dış/javascript hedeflerini reddeder', res.every(([, r]) => r === null || /^[a-z0-9_-]+\.html/i.test(r) && !/evil/.test(r)), JSON.stringify(res));
  // kayit / davet return
  await p.goto(BASE + '/demo/kayit.html?return=' + encodeURIComponent('//evil.example'), { waitUntil: 'networkidle' });
  const links = await p.$$eval('a', as => as.map(a => a.href).filter(h => /evil/.test(h)));
  check('açık yönlendirme: kayit sayfasında dış return bağlantıya taşınmaz', links.length === 0, links.join(','));
  // token storage
  check('token: localStorage boş, token yalnız sessionStorage', (await lsKeys(p)).length === 0 && (await ssKeys(p)).includes('idToken.candidate'), (await ssKeys(p)).join(','));
  const tokVal = await p.evaluate(() => sessionStorage.getItem('idToken.candidate'));
  // 401 handling: revoke via API logout of this token then navigate
  const r = await api('POST', '/auth/logout', tokVal);
  await p.goto(BASE + '/demo/seanslar.html?tab=1', { waitUntil: 'networkidle' }); await sleep(1200);
  check('401: iptal edilmiş token → giris.html?return=seanslar.html?tab=1 ve token silinir', /giris\.html\?return=seanslar\.html%3Ftab%3D1/.test(p.url()) && !(await ssKeys(p)).includes('idToken.candidate'), r.status + ' ' + p.url());
  await shot(p, '86-401-yonlendirme');
  check('token sızıntısı: URL/console\'da idt_/idv_ yok', leaks.length === 0, leaks.join(' | '));
  await ctx.close();
}

// 3) logout via UI (header menu) with a fresh session
{
  const ctx = await newContext(browser, { label: 'sec-logout' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/demo/giris.html', { waitUntil: 'networkidle' });
  await p.fill('#email', A.email); await p.fill('#password', A.password);
  await Promise.all([p.waitForURL(u => !/giris\.html/.test(u.href), { timeout: 20000 }).catch(() => {}), p.click('form button[type=submit]')]);
  await sleep(800);
  const tok = await p.evaluate(() => sessionStorage.getItem('idToken.candidate'));
  await p.goto(BASE + '/demo/ana.html', { waitUntil: 'networkidle' }); await sleep(800);
  // try header / sidebar logout controls
  const opener = p.locator('#site-header button, header button, [aria-haspopup]').first();
  if (await opener.count()) { await opener.click().catch(() => {}); await sleep(300); }
  const out = p.getByText(/Çıkış yap|Çıkış/).first();
  let clicked = false;
  if (await out.count() && await out.isVisible()) { await out.click(); clicked = true; await sleep(1500); }
  else { await p.evaluate(() => window.logout && window.logout()); await sleep(1500); }
  const me = await api('GET', '/auth/me', tok);
  check('çıkış: sunucuda token iptal (GET /auth/me 401) ve sessionStorage temiz', me.status === 401 && !(await ssKeys(p)).includes('idToken.candidate'), 'uiClick=' + clicked + ' me=' + me.status + ' url=' + p.url());
  await ctx.close();
}
await browser.close();
save('s8.json');
console.log(JSON.stringify({ pageerror: issues.pageerror, http: issues.http.filter(h => h.status >= 500), console: issues.console.filter(c => !/Failed to load resource/.test(c.text)) }, null, 1));
