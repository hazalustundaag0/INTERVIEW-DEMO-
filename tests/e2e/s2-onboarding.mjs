// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 2: candidate onboarding by real clicks: register → mail link → password → auto login → hizmet → siparis → devpay → odeme-ok.
import fs from 'node:fs';
import { forget } from './tok.mjs';
import { launch, newContext, check, shot, issues, save, BASE, latestMailLink, lsKeys, ssKeys, sleep, expect4xx, candidatePassword, writeState } from './lib.mjs';

const PW = candidatePassword();
const run = Date.now().toString(36);
const who = process.argv[2] || 'A'; // A: gives guru_visibility at checkout; B: only service consent
const withConsent = who === 'A';
const email = `qa70.${who.toLowerCase()}.${run}@example.test`;
const xss = '<img src=x onerror="window.__xss=1;document.title=\'XSS\'">';

const browser = await launch();
const ctx = await newContext(browser, { label: 'cand-' + who });
const p = await ctx.newPage();

// Advisor detail → CTA → register with return
await p.goto(BASE + '/demo/danismanlar.html', { waitUntil: 'networkidle' });
const advisorHref = await p.locator('a[href*="danisman.html?id="]', { hasText: /Deniz Kurgu/ }).first().getAttribute('href')
  .catch(async () => p.locator('a[href*="danisman.html?id="]').first().getAttribute('href'));
const guruId = new URL(advisorHref, p.url()).searchParams.get('id');
await p.goto(BASE + '/demo/kayit.html?return=' + encodeURIComponent('hizmet.html?guru=' + guruId), { waitUntil: 'networkidle' });
check(`${who} kayit: şifre alanı yok`, (await p.locator('input[type=password]').count()) === 0);
await p.fill('#fullName', 'Tek');
await p.fill('#email', 'gecersiz');
await p.click('[data-action="register"]');
await sleep(400);
const errs = await p.locator('[aria-invalid="true"]').count();
check(`${who} kayit: tek kelime ad + geçersiz e-posta → alan hataları`, errs >= 1, 'aria-invalid=' + errs);
await shot(p, `10-kayit-hata-${who}`);
await p.fill('#fullName', withConsent ? 'Ayşe Nur Kurgu' : 'Bora Kurgu');
await p.fill('#email', email);
const t0 = Date.now() - 2000;
await Promise.all([p.waitForURL(/eposta\.html/, { timeout: 20000 }), p.click('[data-action="register"]')]);
await sleep(300);
check(`${who} kayit → eposta.html adresi gösterir`, (await p.textContent('body')).includes(email), p.url());
await shot(p, `11-eposta-${who}`);

// mail link
const link = latestMailLink(email, t0);
check(`${who} doğrulama e-postası bulundu`, !!link, link ? link.replace(/token=.*/, 'token=…') : 'yok');
await p.goto(link, { waitUntil: 'networkidle' });
await sleep(400);
check(`${who} davet: adres çubuğunda #token kalmadı`, !/token=/.test(p.url()), p.url());
await shot(p, `12-davet-${who}`);
await p.fill('#password', 'kisa');
await p.fill('#confirm-password', 'kisa');
await p.click('#davet-form button[type=submit]');
await sleep(500);
check(`${who} davet: kısa parola → hata`, /12|karakter|kısa/i.test(await p.textContent('#davet-form')));
await p.fill('#password', PW);
await p.fill('#confirm-password', PW + 'x');
await p.click('#davet-form button[type=submit]');
await sleep(400);
check(`${who} davet: eşleşmeyen tekrar → hata`, /eşleş/i.test(await p.textContent('#davet-form')));
await p.fill('#password', PW);
await p.fill('#confirm-password', PW);
await Promise.all([p.waitForURL(/hizmet\.html|danismanlar\.html/, { timeout: 25000 }), p.click('#davet-form button[type=submit]')]);
check(`${who} davet → otomatik giriş → hizmet.html?guru=`, /hizmet\.html\?guru=/.test(p.url()), p.url());
const ss = await ssKeys(p);
check(`${who} token yalnız sessionStorage idToken.candidate`, ss.includes('idToken.candidate') && (await lsKeys(p)).length === 0, 'ss=' + ss.join(','));
await sleep(800);
await shot(p, `13-hizmet-${who}`);
const hbody = await p.textContent('body');
check(`${who} hizmet: 1.500 ₺ ve "Yakında" kartları`, /1\.500/.test(hbody) && /Yakında/.test(hbody));
// re-open same link → locked
const p2 = await ctx.newPage();
await p2.goto(link, { waitUntil: 'networkidle' });
await sleep(800);
await p2.fill('#password', PW); await p2.fill('#confirm-password', PW);
await p2.click('#davet-form button[type=submit]');
await sleep(1500);
const locked = await p2.locator('#password').isDisabled().catch(() => false);
const p2txt = (await p2.innerText('main').catch(() => '')).replace(/\s+/g, ' ');
await shot(p2, `12b-davet-tekrar-${who}`);
check(`${who} aynı bağlantı tekrar + gönder → buton kilitli + mesaj`, (await p2.locator("#davet-form button[type=submit]").isDisabled()) && /geçersiz|kullanılmış|süresi|artık/i.test(p2txt), 'disabled=' + locked + ' | ' + p2txt.slice(0, 220));
await p2.close();

await p.locator('[data-service-id]').filter({ hasText: 'Satış Hikâyesi' }).first().click();
await p.locator('[data-guru-name="Deniz Kurgu"]').first().click();
await sleep(500);
await Promise.all([p.waitForURL(/siparis\.html/, { timeout: 20000 }), p.click('[data-action="checkout-preview"]')]);
await sleep(800);
await shot(p, `14-siparis-${who}`);
const svcBox = p.locator('main input[type=checkbox]').first();
check(`${who} siparis: üç onay kutusu da işaretsiz`, !(await svcBox.isChecked()) && !(await p.isChecked('#consent-check')) && !(await p.isChecked('#guru-visibility-check')));
check(`${who} siparis: hizmet onayı yokken buton pasif`, await p.locator('#submit-order-btn').isDisabled() || (await p.getAttribute('#submit-order-btn', 'aria-disabled')) === 'true');
const sbody = await p.textContent('body');
check(`${who} siparis: Havale/EFT yok, 1.500 ₺, 2 seans`, !/Havale|EFT/i.test(sbody) && /1\.500/.test(sbody) && /2/.test(sbody));
await p.click('#open-policy-drawer');
await sleep(500);
const policy = await p.textContent('[data-policy-body]').catch(() => '');
check(`${who} siparis: aydınlatma metni backend'den`, /HUKUK|KVKK|metin/i.test(policy || ''), (policy || '').slice(0, 80));
await shot(p, `15-siparis-kvkk-cekmece-${who}`);
await p.click('#close-policy-drawer').catch(() => p.keyboard.press('Escape'));
await sleep(300);
await svcBox.check();
if (withConsent) { await p.check('#consent-check'); await p.check('#guru-visibility-check'); }
const reqs = [];
p.on('request', r => { if (r.url().includes('/api/v1/')) reqs.push(r.method() + ' ' + r.url().split('/api/v1')[1] + (r.headers()['idempotency-key'] ? ' [IK]' : '')); });
await Promise.all([p.waitForURL(/odeme-ok\.html/, { timeout: 30000 }), p.click('#submit-order-btn')]);
await sleep(1000);
const consents = reqs.filter(r => r.startsWith('POST /me/consents')).length;
check(`${who} satın alma: ${withConsent ? 'POST /me/consents ×3' : 'rıza isteği yok'} + purchase [Idempotency-Key]`,
  (withConsent ? consents === 3 : consents === 0) && reqs.some(r => r.startsWith('POST /candidate/checkout/purchase') && r.endsWith('[IK]')), reqs.join(' | '));
await shot(p, `16-odeme-ok-${who}`);
const ob = await p.textContent('body');
check(`${who} odeme-ok: devpay referansı + 1.500 ₺ + 2 seans`, /devpay_/.test(ob) && /1\.500/.test(ob) && /2 seans/i.test(ob));
const enrollment = new URL(p.url()).searchParams.get('enrollment');
check(`${who} onboarding boyunca localStorage yazımı 0`, issues.localStorage.length === 0 && (await lsKeys(p)).length === 0, JSON.stringify(issues.localStorage));
writeState(`cand-${who}.json`, ({ email, password: PW, guruId, enrollment }));
forget('cand' + who); // yeni aday hesabı: önbellekteki eski aday token'ı geçersiz
await browser.close();
save(`s2-${who}.json`);
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed }, null, 1));
