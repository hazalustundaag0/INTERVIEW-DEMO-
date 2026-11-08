// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, sleep, api, guruCreds, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';
const B = readState('cand-B.json');
const tB = await token('candB', B.email, B.password, 'candidate');
const tA = readState('tokens.json')['candA'];
const b = await launch();
// guru account on candidate login → giris-hata-rol
{ const c = await newContext(b, { label: 'rolhata' }); const p = await c.newPage();
  await p.goto(BASE + '/demo/giris.html', { waitUntil: 'networkidle' });
  await p.fill('#email', guruCreds().email); await p.fill('#password', guruCreds().password);
  await p.click('form button[type=submit]'); await p.waitForURL(/giris-hata-rol/, { timeout: 15000 }).catch(()=>{}); await sleep(800);
  check('guru hesabıyla aday girişi → giris-hata-rol.html', /giris-hata-rol/.test(p.url()), p.url());
  await shot(p, '92-giris-hata-rol'); await c.close(); }
// IDOR via UI: B opens A's assignment / enrollment / story ids
{ const r = await api('GET', '/candidate/enrollments?limit=5', tA.token); const enrA = r.body.items[0].id;
  const asg = await api('GET', `/candidate/enrollments/${enrA}/assignments`, tA.token); const asgA = asg.body.items[0]?.id;
  const c = await newContext(b, { label: 'idor-ui' }); await inject(c, 'candidate', tB); const p = await c.newPage();
  for (const u of [`odev-goruntule.html?id=${asgA}`, `odev-teslim.html?id=${asgA}`, `odeme-ok.html?enrollment=${enrA}`, `randevu-ok.html?session=00000000-0000-0000-0000-000000000000`]) {
    await p.goto(BASE + '/demo/' + u, { waitUntil: 'networkidle' }); await sleep(1000);
    const body = await p.innerText('body');
    check('IDOR UI: B, A\'nın kaynağını göremez → ' + u.split('?')[0], !/Üç başarı örneği|Ayşe Nur/.test(body), p.url() + ' | ' + body.replace(/\s+/g,' ').slice(0,120));
  }
  await shot(p, '93-idor-ui'); await c.close(); }
await b.close(); save('s9.json');
console.log(JSON.stringify({ pageerror: issues.pageerror, http: issues.http }));
