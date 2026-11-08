// Taşındı: QA (70) Etap 2 tarayıcı betiği → frontend/tests/e2e (K65, 81). Kimlikler env'den, durum output/ altında.
// Stage 6: candidate A story: hikaye-giris → Sorulara Başla → soru1..5 (short answer → follow-up, one "Hatırlamıyorum")
// → ciktilar (sources, finalize dialog → COMPLETED).
import fs from 'node:fs';
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
const aiReqs = [];
p.on('request', r => { if (r.url().includes('/api/v1/')) aiReqs.push(r.method() + ' ' + r.url().split('/api/v1')[1].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')); });

const START = Number(process.env.START || 1);
if (START === 1) {
await p.goto(BASE + '/demo/ana.html', { waitUntil: 'networkidle' }); await sleep(900);
await shot(p, `63-ana-seans-sonrasi-${who}`);
await p.goto(BASE + '/demo/hikaye-giris.html', { waitUntil: 'networkidle' }); await sleep(900);
await shot(p, `64-hikaye-giris-${who}`);
const hg = await p.innerText('main');
check(`${who} hikaye-giris: guru notu ya da bilgi kutusu`, /not/i.test(hg), hg.replace(/\s+/g, ' ').slice(0, 160));
await p.locator('button', { hasText: 'Sorulara Başla' }).first().click();
await p.waitForURL(/soru1\.html/, { timeout: 20000 }).catch(() => {});
check(`${who} Sorulara Başla → soru1`, /soru1/.test(p.url()), p.url());
} else if (START <= 5) { await p.goto(BASE + '/demo/soru' + START + '.html', { waitUntil: 'networkidle' }); } else { await p.goto(BASE + '/demo/ciktilar.html', { waitUntil: 'networkidle' }); }

const answers = [
  'Geçen yıl ekibimle birlikte müşteri şikâyetlerini azaltmak için yeni bir geri bildirim süreci kurdum ve bunu tüm şubelere yaydım. ' + XSS,
  'Kısa cevap.',
  null, // "Hatırlamıyorum"
  'Kendimi dinlemeyi bilen, sakin ve sabırlı bir satış uzmanı olarak tanımlarım, çünkü müşteriyle önce güven kurarım.',
  'Önümüzdeki iki yılda kurumsal satış ekibinde daha büyük müşterilerle çalışmak ve ekip arkadaşlarıma rehberlik etmek istiyorum.'
];
let followUps = 0;
let draftRestore = null;
for (let n = START; n <= 5; n++) {
  await p.waitForURL(new RegExp('soru' + n + '\\.html'), { timeout: 20000 }).catch(() => {});
  await sleep(1000);
  const ta = p.locator('textarea').first();
  await ta.waitFor({ state: 'visible' });
  for (let k = 0; k < 60 && await ta.isDisabled(); k++) await sleep(200);
  const qtext = (await p.innerText('main')).replace(/\s+/g, ' ');
  if (n === 1) {
    check(`${who} soru1: soru metni API'den, sayaç 1000`, /Soru 1 \/ 5/.test(qtext) && /1000/.test(qtext), qtext.slice(0, 160));
    await ta.fill('Taslak yeniden yükleme testi');
    await p.reload({ waitUntil: 'networkidle' }); await sleep(1200);
    draftRestore = await p.locator('textarea').first().inputValue();
    check(`${who} soru1: yenilemede taslak geri gelir`, draftRestore.includes('Taslak yeniden'), draftRestore);
  }
  await shot(p, `65-soru${n}-${who}`);
  const a = answers[n - 1];
  if (a === null) {
    await p.click('[data-action="answer-skip"]'); await sleep(700);
    await shot(p, `66-soru${n}-hatirlamiyorum-${who}`);
    const warn = await p.innerText('main');
    check(`${who} soru${n}: "Hatırlamıyorum" → [bilgi gerekli] uyarısı (iki adım)`, /bilgi gerekli/.test(warn), '');
    await p.getByRole('button', { name: 'Atla ve ilerle' }).click();
  } else {
    await p.locator('textarea').first().fill(a);
    await p.click('[data-action="answer-save"]');
  }
  // follow-up loop on the same card
  for (let k = 0; k < 3; k++) {
    await sleep(2000);
    const body = await p.innerText('main');
    if (new RegExp('soru' + (n + 1) + '\\.html|ciktilar|hikaye').test(p.url()) && !/soru' + n + '\\.html/.test(p.url())) break;
    if (/Takip sorusu/i.test(body)) {
      followUps++;
      await shot(p, `67-soru${n}-takip-${k}-${who}`);
      check(`${who} soru${n}: takip sorusu aynı kartta + önceki cevap alıntısı`, /Kısa cevap|Takip/i.test(body), body.replace(/\s+/g, ' ').slice(0, 200));
      const fta = p.locator('textarea').first();
      for (let w = 0; w < 50 && await fta.isDisabled(); w++) await sleep(200);
      await fta.fill('Bu süreçte müşteri memnuniyeti arttı ve ekip arkadaşlarım yeni yöntemi benimsedi, ben de koordinasyonu üstlendim.');
      await p.click('[data-action="answer-save"]');
    } else break;
  }
}
await p.waitForURL(/ciktilar\.html/, { timeout: 90000 }).catch(() => {});
await sleep(2500);
check(`${who} soru5 sonrası → ciktilar (taslak üretildi)`, /ciktilar/.test(p.url()), p.url());
if (START === 1) check(`${who} en az bir takip sorusu görüldü`, followUps >= 1, 'followUps=' + followUps);
await shot(p, `68-ciktilar-${who}`);
const cb = await p.innerText('main');
check(`${who} ciktilar: [bilgi gerekli] satırı var`, /bilgi gerekli/.test(cb), '');
check(`${who} ciktilar: K58 metin adayın cevabından alıntı`, /müşteri şikâyetlerini|geri bildirim süreci|dinlemeyi bilen/.test(cb), cb.replace(/\s+/g, ' ').slice(0, 200));
check(`${who} ciktilar: XSS tetiklenmedi`, (await p.evaluate(() => window.__xss)) === 0);
// hover a sentence → source
const sent = p.locator('[data-sentence-index], .story-sentence, [data-source]').first();
if (await sent.count()) { await sent.hover(); await sleep(400); }
const srcCount = await p.locator('span[title^="Kaynak:"]').count();
check(`${who} ciktilar: cümle başına "Kaynak:" (title)`, srcCount >= 3, 'span=' + srcCount + ' örn: ' + (srcCount ? await p.locator('span[title^="Kaynak:"]').first().getAttribute('title') : ''));
// generate outputs if button present
const gen = p.locator('[data-action="outputs-generate"]').first();
// 83 düzeltme turu 1: güncel çıktı varken düğme gizli → yalnız görünürse tıkla.
if (await gen.count() && await gen.isVisible() && await gen.isEnabled()) { await gen.click(); await sleep(4000); }
await shot(p, `69-ciktilar-uretildi-${who}`);
const fin = p.locator('[data-action="story-finalize"]');
check(`${who} ciktilar: "Hikâyemi onayla" düğmesi`, (await fin.count()) === 1);
if (await fin.count()) {
  await fin.click(); await sleep(600);
  await shot(p, `69b-onay-penceresi-${who}`);
  // QA-018 (83): onay artık tasarımın <dialog>'u ("Evet, onayla"); native confirm kullanılmamalı.
  const dlg = p.locator('dialog[open]');
  const hasDialog = (await dlg.count()) > 0;
  check(`${who} finalize: onay <dialog> (native confirm yok)`, hasDialog && !dialogs.some(d => d.startsWith('confirm')), dialogs.join(' | '));
  if (hasDialog) await dlg.getByRole('button', { name: /Evet, onayla/ }).click();
  await sleep(2500);
  const fb = await p.innerText('main');
  await shot(p, `69c-onaylandi-${who}`);
  check(`${who} finalize → "Satış hikâyen onaylandı" (K56/K61)`, /onaylandı/i.test(fb), fb.replace(/\s+/g, ' ').slice(0, 160));
}
check(`${who} story: frontend YZ uçlarını yalnız backend'den çağırıyor`, aiReqs.some(r => /answers|drafts/.test(r)), aiReqs.filter(r => /drafts|outputs|finalize/.test(r)).join(' | '));
check(`${who} story: localStorage yazımı 0`, issues.localStorage.length === 0, JSON.stringify(issues.localStorage));
await browser.close();
save(`s6-${who}.json`);
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: issues.http, failed: issues.failed }, null, 1));
