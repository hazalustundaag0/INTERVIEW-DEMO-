import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inject, token } from '../tests/e2e/tok.mjs';
import { launch, BASE } from '../tests/e2e/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(HERE, '../demo/img/landing');
const email = process.env.LANDING_CANDIDATE_EMAIL;
const password = process.env.E2E_CANDIDATE_PASSWORD;

if (!email || !password) {
  throw new Error('LANDING_CANDIDATE_EMAIL ve E2E_CANDIDATE_PASSWORD ortam değişkenleri gerekli.');
}

const candidate = await token(`landing-capture:${email}`, email, password, 'candidate');
const candidateName = [candidate.user.first_name, candidate.user.last_name].filter(Boolean).join(' ').trim();
if (candidateName !== 'Elif Yılmaz') {
  throw new Error(`Beklenen aday Elif Yılmaz; oturumdaki hesap "${candidateName || 'isimsiz'}". Çekim yapılmadı.`);
}

const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  locale: 'tr-TR',
  timezoneId: 'Europe/Istanbul'
});
await inject(context, 'candidate', candidate);
const page = await context.newPage();
const errors = [];
page.on('console', message => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
page.on('requestfailed', request => errors.push(`request failed: ${request.url()}`));
page.on('response', response => {
  if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
});

await fs.mkdir(OUTPUT, { recursive: true });

async function openPage(file) {
  errors.length = 0;
  await page.goto(`${BASE}/demo/${file}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.addStyleTag({
    content: `
      html[data-demo-ui="hidden"] .demo-only,
      #demo-flow-nav,
      body > .service-selection-demo-button,
      body > .service-selection-demo-menu {
        display: none !important;
      }
    `
  });
  await page.evaluate(() => { document.documentElement.dataset.demoUi = 'hidden'; });
  await page.waitForTimeout(500);
  const content = await page.locator('main').innerText();
  if (!content.trim()) throw new Error(`${file}: ana içerik yüklenmedi.`);
}

async function currentJourney() {
  return page.evaluate(async () => {
    if (!window.Journey) throw new Error('Journey yüklenmedi.');
    const ctx = await window.Journey.load();
    return {
      enrollment: Boolean(ctx.enrollment),
      storyStatus: window.Journey.storyStatus(ctx.story),
      sessions: (ctx.sessions || []).map(({ id, sequence_no, status }) => ({ id, sequence_no, status }))
    };
  });
}

function assertNoBrowserErrors(file) {
  if (errors.length) throw new Error(`${file}: tarayıcı/yükleme hatası:\n${errors.join('\n')}`);
}

async function save(file, name, readiness) {
  await openPage(file);
  const ready = await readiness();
  assertNoBrowserErrors(file);
  if (!ready.ok) {
    console.log(`SKIP ${name}: ${ready.reason}`);
    return false;
  }
  await page.screenshot({ path: path.join(OUTPUT, name) });
  console.log(`SAVED ${name}: ${ready.state}`);
  return true;
}

try {
  const saved = [];
  saved.push(await save('danismanlar.html', '01-danismanlar.png', async () => ({
    ok: await page.locator('#advisor-grid .advisor-directory-card').count() > 0,
    reason: 'Danışman kartları yüklenmemiş.',
    state: 'Elif Yılmaz oturumu; danışman kataloğu API verisi'
  })));

  saved.push(await save('seanslar.html', '02-seans1.png', async () => {
    const journey = await currentJourney();
    const session1 = journey.sessions.find(session => session.sequence_no === 1);
    if (!session1) return { ok: false, reason: 'Seans 1 verisi bulunamadı.' };
    const tab = session1.status === 'completed' || session1.status === 'no_show' ? 'completed' : 'upcoming';
    await page.locator(`[data-session-tab="${tab}"]`).click();
    const card = page.locator('.candidate-session-card').filter({ hasText: 'Seans 1 / 2' }).first();
    const visible = await card.isVisible().catch(() => false);
    return {
      ok: visible,
      reason: `Seans 1 kartı görünür değil (durum: ${session1.status}).`,
      state: `Seans 1 status=${session1.status}`
    };
  }));

  saved.push(await save('ciktilar.html', '03-taslak.png', async () => {
    const journey = await currentJourney();
    const draftStatus = ['DRAFT_GENERATED', 'SUMMARY_READY'].includes(journey.storyStatus);
    const badge = page.locator('.story-output-missing-badge').filter({ hasText: 'Bilgi gerekli' }).first();
    const badgeVisible = await badge.isVisible().catch(() => false);
    return {
      ok: draftStatus && badgeVisible,
      reason: `Taslak + Bilgi gerekli rozeti bulunamadı (hikâye durumu: ${journey.storyStatus || 'yok'}).`,
      state: `hikâye status=${journey.storyStatus}; Bilgi gerekli rozeti görünür`
    };
  }));

  saved.push(await save('seanslar.html', '04-seans2.png', async () => {
    const journey = await currentJourney();
    const session2 = journey.sessions.find(session => session.sequence_no === 2);
    if (!session2 || session2.status !== 'scheduled') {
      return { ok: false, reason: `Planlı Seans 2 yok (durum: ${session2?.status || 'veri yok'}).` };
    }
    const card = page.locator('.candidate-session-card').filter({ hasText: 'Seans 2 / 2' }).first();
    const details = card.locator('.candidate-session-details-link');
    if (!(await details.isVisible().catch(() => false))) {
      return { ok: false, reason: 'Seans 2 görüşme bilgileri bağlantısı görünmüyor.' };
    }
    await details.click();
    const drawer = page.locator('#session-details-drawer');
    const visible = await drawer.isVisible();
    return {
      ok: visible,
      reason: 'Seans 2 ayrıntı çekmecesi açılmadı.',
      state: `Seans 2 status=${session2.status}; ayrıntı çekmecesi açık`
    };
  }));

  saved.push(await save('ciktilar.html', '05-ciktilar.png', async () => {
    const journey = await currentJourney();
    const title = await page.locator('main h1').first().innerText();
    const visible = /onaylandı/i.test(title);
    return {
      ok: journey.storyStatus === 'COMPLETED' && visible,
      reason: `Onaylanmış hikâye görünmüyor (hikâye durumu: ${journey.storyStatus || 'yok'}).`,
      state: `hikâye status=${journey.storyStatus}; başlık="${title.trim()}"`
    };
  }));

  const missing = saved.filter(value => !value).length;
  if (missing) {
    console.log(`${missing} ekran gerçek veri durumunda bulunmadığı için çekilmedi; test verisi oluşturulmadı.`);
  }
} finally {
  await browser.close();
}
