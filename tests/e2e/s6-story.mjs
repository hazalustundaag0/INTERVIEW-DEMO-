// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 6 (Etap 6+ yeni hikâye akışı, K103 — eski soru1–5 akışı kaldırıldı):
//   /hikaye/yaz (yaz + otomatik kayıt) → "Okumaya ver" → /hikaye/oneriler (YZ okuması, bir öneri kararı) → "Hikâyem hazır"
//   → /hikaye/hazir ("Danışmanıma gönder" = submissions, QA-018 <dialog>; çıktılar TR + kaynaklar; PDF; prova metni).
import { launch, newContext, check, shot, issues, save, BASE, sleep, readState } from './lib.mjs';
import { token, inject } from './tok.mjs';

const who = process.argv[2] || 'A';
const C = readState(`cand-${who}.json`);
const t = await token('cand' + who, C.email, C.password, 'candidate');
const XSS = '<img src=x onerror="window.__xss=1">';
const browser = await launch();
const ctx = await newContext(browser, { label: 'story-' + who });
await inject(ctx, 'candidate', t);
const p = await ctx.newPage();
const dialogs = []; p.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message()); d.accept(); });
const reqs = [];
p.on('request', r => { if (r.url().includes('/api/v1/')) reqs.push(r.method() + ' ' + r.url().split('/api/v1')[1].split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')); });

await p.goto(BASE + '/panel', { waitUntil: 'networkidle' }); await sleep(900);
await shot(p, `63-ana-seans-sonrasi-${who}`);
await p.goto(BASE + '/hikaye/yaz', { waitUntil: 'networkidle' }); await sleep(900);
await shot(p, `64-hikaye-yaz-${who}`);
const story = 'Kariyerime 2020 yılında satış uzmanı olarak başladım. ' + XSS + ' İlk yılımda küçük işletmelere yazılım çözümleri anlattım. ' +
  'En büyük müşterimiz sözleşmeyi yenilemek istemedi. Müşterinin ihtiyaçlarını yeniden analiz ettim ve özel bir eğitim planı hazırladım. ' +
  'Bu çalışma sayesinde müşteri sözleşmesini iki yıl uzattı. Şimdi hedefim kurumsal satışta kıdemli bir rol.';
await p.fill('#story-text', story);
await sleep(2200);
check(`${who} 1. adım: çalışma metni otomatik kaydedildi (PUT …/working-text)`, reqs.some(r => /^PUT .*\/working-text$/.test(r)), reqs.filter(r => /working-text/.test(r)).join(','));
await Promise.all([p.waitForURL(/\/hikaye\/oneriler/, { timeout: 30000 }), p.click('[data-action="read"]')]);
await p.waitForFunction(() => document.querySelectorAll('.sf-sugg').length > 0, null, { timeout: 90000 }).catch(() => {});
await sleep(800);
await shot(p, `65-hikaye-oneriler-${who}`);
check(`${who} 2. adım: YZ okuması (POST …/review) ve öneri kartı`, reqs.some(r => /^POST .*\/review$/.test(r)) && (await p.locator('.sf-sugg').count()) > 0);
const take = p.locator('.sf-sugg button', { hasText: 'Bu metni hikâyeme al' }).first();
if (await take.count()) await take.click(); else await p.locator('.sf-sugg button', { hasText: /^Geç$/ }).first().click();
await sleep(1200);
check(`${who} 2. adım: öneri kararı (POST …/decision)`, reqs.some(r => /^POST .*\/decision$/.test(r)));
check(`${who} XSS tetiklenmedi`, (await p.evaluate(() => window.__xss)) === undefined);
await p.click('[data-action="ready"]'); await sleep(400);
await Promise.all([p.waitForURL(/\/hikaye\/hazir/, { timeout: 30000 }), p.locator('button', { hasText: 'Evet, hazır' }).click()]);
await sleep(1500);
await shot(p, `66-hikaye-hazir-${who}`);
await p.check('[data-consent]');
await p.click('[data-action="send"]'); await sleep(400);
const dlg = p.locator('dialog[open]');
check(`${who} gönder: onay <dialog> (QA-018, native confirm yok)`, (await dlg.count()) > 0 && !dialogs.some(d => d.startsWith('confirm')), dialogs.join(' | '));
await p.click('[data-action="story-finalize-confirm"]'); await sleep(1800);
check(`${who} gönderildi (POST …/submissions), finalize çağrılmadı`, reqs.some(r => /^POST .*\/submissions$/.test(r)) && !reqs.some(r => /finalize/.test(r)) &&
  /danışmanına gönderildi/.test(await p.innerText('[data-sent-box]')));
await p.click('[role="tab"][data-tab="ciktilar"]'); await sleep(300);
await p.click('[data-action="make-outputs"]');
await p.waitForFunction(() => document.querySelectorAll('.sf-output').length > 0, null, { timeout: 90000 }).catch(() => {});
await p.click('[data-action="toggle-sources"]').catch(() => {}); await sleep(300);
check(`${who} çıktılar (TR) + cümle kaynakları`, (await p.locator('.sf-output').count()) >= 3 && (await p.locator('.sf-source:not([hidden])').count()) > 0);
await shot(p, `67-ciktilar-${who}`);
check(`${who} "PDF indir" düğmesi`, (await p.locator('[data-action="download-pdf"]').count()) === 1);
await p.click('[role="tab"][data-tab="prova"]'); await sleep(300);
await p.click('[data-action="make-prova"]'); await sleep(2500);
check(`${who} prova metni (GET …/rehearsal-script)`, reqs.some(r => /rehearsal-script$/.test(r)) && /\|\|/.test(await p.locator('[data-prova-text]').innerText()));
await shot(p, `68-prova-${who}`);
check(`${who} story: localStorage yazımı 0`, issues.localStorage.length === 0, JSON.stringify(issues.localStorage));
await browser.close();
save(`s6-${who}.json`);
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed }, null, 1));
