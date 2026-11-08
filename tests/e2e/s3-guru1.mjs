// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 3: guru login (UI), profile, availability add (UI), list pages.
import fs from 'node:fs';
import { launch, newContext, check, shot, issues, save, BASE, lsKeys, ssKeys, sleep, guruCreds, WRONG_PASSWORD, readState, writeState } from './lib.mjs';

const GURU = guruCreds();
const A = readState('cand-A.json');
const browser = await launch();
const ctx = await newContext(browser, { label: 'guru' });
const p = await ctx.newPage();

await p.goto(BASE + '/demo/giris-danisman.html', { waitUntil: 'networkidle' });
await shot(p, '30-giris-danisman-d');
check('giris-danisman: demo "Önceki/Sonraki" çubuğu yok', !/Önceki|Sonraki/.test(await p.innerText('body')));
await p.fill('#email', GURU.email); await p.fill('#password', WRONG_PASSWORD);
await p.click('form button[type=submit]'); await sleep(1200);
check('giris-danisman: yanlış parola mesajı', /hatalı|yanlış|geçersiz/i.test(await p.innerText('form')), (await p.innerText('form')).slice(0, 120));
await p.fill('#email', A.email); await p.fill('#password', A.password);
await p.click('form button[type=submit]'); await sleep(1200);
check('giris-danisman: aday hesabı reddedilir', /danışman paneline giriş yapamaz/i.test(await p.innerText('body')), (await p.innerText('form')).slice(0, 160));
check('giris-danisman: aday reddinde guru token yok', !(await ssKeys(p)).includes('idToken.guru'), (await ssKeys(p)).join(','));
await p.fill('#email', GURU.email); await p.fill('#password', GURU.password);
await Promise.all([p.waitForURL(/guru-danisanlar\.html/, { timeout: 20000 }), p.click('form button[type=submit]')]);
await sleep(1000);
check('guru giriş → guru-danisanlar', true, p.url());
await shot(p, '31-guru-danisanlar-d');
const list = await p.innerText('main');
check('danışanlarım: A ve B listede', /Ayşe Nur/.test(list) && /Bora/.test(list), list.replace(/\s+/g, ' ').slice(0, 200));
const ss = await ssKeys(p);
check('guru: sessionStorage yalnız idToken.guru/idUser.guru/legacyCleanup', ss.every(k => ['idToken.guru', 'idUser.guru', 'legacyCleanup.v1'].includes(k)), ss.join(','));

// profile
await p.goto(BASE + '/demo/guru-profil.html', { waitUntil: 'networkidle' }); await sleep(800);
await shot(p, '32-guru-profil-d');
const pb = await p.innerText('main');
check('guru-profil: Fiyat sekmesi yok', !/Fiyat/i.test(pb));

// availability add
await p.goto(BASE + '/demo/guru-musaitlik-ekle.html', { waitUntil: 'networkidle' }); await sleep(800);
const d = new Date(Date.now() + 3 * 864e5);
const iso = d.toISOString().slice(0, 10);
await p.fill('#availability-date', iso);
await p.dispatchEvent('#availability-date', 'change');
await sleep(300);
await shot(p, '33-musaitlik-ekle-d');
const selects = p.locator('#time-rows select');
console.log('time selects:', await selects.count(), 'options:', await selects.first().locator('option').allInnerTexts().catch(() => []));
writeState('guru-state.json', ({ iso }));
await browser.close();
save('s3.json');
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed, ls: issues.localStorage }, null, 1));
