// Stage 10 (81, düzeltme turu 1): panel yerleşimi + kenar kartı adı + çıkış — QA-011 / QA-012 / QA-013.
// 1440×900 ve 390×844'te aday ve guru panel sayfaları; ekran görüntüleri output/shots/10-*.
// Önkoşul: s2 (output/cand-A.json) ve seed gurusu. Env: DEMO_GURU_PASSWORD. LOGOUT=0 → çıkış testini atla.
// Giriş sayısı: önbellekte yoksa aday 1 + guru 1; çıkış testi için ek aday 1 + guru 1 (token'ı iptal ettiği için önbelleğe girmez).
import { launch, newContext, check, shot, issues, save, BASE, sleep, readState, guruCreds, apiLogin, api } from './lib.mjs';
import { token, inject } from './tok.mjs';

const A = readState('cand-A.json');
const G = guruCreds();
const tA = await token('candA', A.email, A.password, 'candidate');
const tG = await token('guru', G.email, G.password, 'guru');
const nameA = [tA.user.first_name, tA.user.last_name].join(' ');
const nameG = [tG.user.first_name, tG.user.last_name].join(' ');

const CANDIDATE_PAGES = ['ana', 'profil', 'cv', 'randevu-on', 'takvim', 'seanslar', 'odevler', 'seans-notlari', 'hikaye-giris', 'ciktilar', 'soru1'];
const GURU_PAGES = ['guru-danisanlar', 'guru-musaitlik', 'guru-seanslar', 'guru-profil'];

async function measure(p) {
  return p.evaluate(() => {
    const sidebar = document.querySelector('.panel-sidebar');
    const content = document.querySelector('.panel-main-content');
    const heading = content?.querySelector('h1, h2');
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const toggle = Array.from(document.querySelectorAll('.panel-sidebar-toggle')).filter(t => getComputedStyle(t).display !== 'none');
    const logout = document.querySelector('.panel-sidebar [data-logout]');
    return {
      panel: document.body.classList.contains('panel-dashboard'),
      sidebar: r(sidebar),
      content: r(content),
      heading: r(heading),
      name: document.querySelector('.panel-sidebar-user .truncate, .panel-sidebar-user-details .truncate')?.textContent.trim() || '',
      logout: Boolean(logout),
      toggles: toggle.length,
      overflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });
}

const browser = await launch();
for (const mobile of [false, true]) {
  const tag = mobile ? 'm' : 'd';
  for (const [role, t, pages, name] of [['candidate', tA, CANDIDATE_PAGES, nameA], ['guru', tG, GURU_PAGES, nameG]]) {
    const ctx = await newContext(browser, { mobile, label: `layout-${role}-${tag}` });
    await inject(ctx, role, t);
    const p = await ctx.newPage();
    for (const pg of pages) {
      await p.goto(`${BASE}/demo/${pg}.html`, { waitUntil: 'networkidle' }); await sleep(700);
      const landed = p.url().split('/').pop().split('?')[0];
      if (landed !== pg + '.html') { check(`${tag} ${pg}: sayfa açıldı`, true, 'yönlendirildi → ' + landed + ' (akış durumu)'); continue; }
      const m = await measure(p);
      await shot(p, `10-${pg}-${tag}`, { fullPage: false });
      check(`${tag} ${pg}: panel düzeni uygulandı`, m.panel, JSON.stringify(m));
      check(`${tag} ${pg}: yatay taşma yok`, m.overflow <= 1, m.overflow + 'px');
      if (!mobile) {
        check(`d ${pg}: kenar menüsü solda sabit sütun (QA-012)`, m.sidebar && m.sidebar.x === 0 && m.sidebar.w <= 280, JSON.stringify(m.sidebar));
        check(`d ${pg}: içerik menünün sağında, üstte başlıyor`, m.content && m.content.x >= (m.sidebar?.w || 0) && m.content.y < 120, JSON.stringify(m.content));
        check(`d ${pg}: kenar kartında ad (${name})`, m.name === name, m.name || '(boş)');
        check(`d ${pg}: kenar kartında "Çıkış yap" (QA-011)`, m.logout);
      } else {
        check(`m ${pg}: tek görünür menü düğmesi`, m.toggles === 1, 'count=' + m.toggles);
        check(`m ${pg}: menü kapalıyken ekran dışında`, m.sidebar && m.sidebar.x + m.sidebar.w <= 0, JSON.stringify(m.sidebar));
        check(`m ${pg}: içerik ilk ekranda başlıyor (QA-013)`, m.heading && m.heading.y < 400, JSON.stringify(m.heading));
        if (pg === pages[0]) {
          await p.click('.panel-sidebar-toggle'); await sleep(400);
          await shot(p, `10-${pg}-${tag}-menu`, { fullPage: false });
          const open = await measure(p);
          check(`m ${pg}: menü açılınca ad + "Çıkış yap" görünür`, open.sidebar.x === 0 && open.name === name && open.logout, JSON.stringify({ x: open.sidebar.x, name: open.name }));
        }
      }
    }
    await ctx.close();
  }
}

// QA-011: çıkış uçtan uca (ayrı token'larla; önbellekteki token'lar bozulmaz).
if (process.env.LOGOUT !== '0') {
  for (const [role, email, password, page, login] of [
    ['candidate', A.email, A.password, 'profil', 'giris.html'],
    ['guru', G.email, G.password, 'guru-danisanlar', 'giris-danisman.html']
  ]) {
    const fresh = await apiLogin(email, password, role);
    const u = fresh.user;
    const ctx = await newContext(browser, { label: 'logout-' + role });
    await inject(ctx, role, { token: fresh.token, user: { id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role, client_type: role, expires_at: fresh.expires_at } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/demo/${page}.html`, { waitUntil: 'networkidle' }); await sleep(600);
    const logoutReq = p.waitForRequest(r => r.url().endsWith('/auth/logout') && r.method() === 'POST', { timeout: 10000 }).catch(() => null);
    await p.click('.panel-sidebar [data-logout]');
    const req = await logoutReq;
    await p.waitForURL(new RegExp(login.replace('.', '\\.')), { timeout: 10000 }).catch(() => {});
    await sleep(400);
    const keys = await p.evaluate(() => Object.keys(sessionStorage));
    const me = await api('GET', '/auth/me', fresh.token);
    check(`${role} çıkış: POST /auth/logout gönderildi`, Boolean(req));
    check(`${role} çıkış: ${login} sayfasına dönüldü`, p.url().includes(login), p.url());
    check(`${role} çıkış: idToken/idUser temizlendi`, !keys.some(k => k.startsWith('idToken.') || k.startsWith('idUser.')), keys.join(','));
    check(`${role} çıkış: token sunucuda iptal (/auth/me 401)`, me.status === 401, String(me.status));
    await shot(p, `10-logout-${role}`, { fullPage: false });
    await ctx.close();
  }
}

await browser.close();
save('s10.json');
const unexpected = issues.http.filter(x => !x.expected && x.status !== 401);
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: unexpected, ls: issues.localStorage }, null, 1));
