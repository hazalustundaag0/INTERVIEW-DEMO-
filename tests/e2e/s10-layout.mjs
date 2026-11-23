// Stage 10 (81, düzeltme turu 1; Etap 4 70 QA: Ultraviolet #sidebar + K84 çekmece + K85 çıkış): panel yerleşimi + menü adı + çıkış — QA-011 / QA-012 / QA-013.
// 1440×900 ve 390×844'te aday ve guru panel sayfaları; ekran görüntüleri output/shots/10-*.
// Önkoşul: s2 (output/cand-A.json) ve seed gurusu. Env: DEMO_GURU_PASSWORD. LOGOUT=0 → çıkış testini atla.
// Giriş sayısı: önbellekte yoksa aday 1 + guru 1; çıkış testi için ek aday 1 + guru 1 (token'ı iptal ettiği için önbelleğe girmez).
import { launch, newContext, check, shot, issues, save, BASE, sleep, readState, guruCreds, apiLogin, api, pagePath, pageStem } from './lib.mjs';
import { token, inject } from './tok.mjs';

const A = readState('cand-A.json');
const G = guruCreds();
const tA = await token('candA', A.email, A.password, 'candidate');
const tG = await token('guru', G.email, G.password, 'guru');
const nameA = [tA.user.first_name, tA.user.last_name].join(' ');
const nameG = [tG.user.first_name, tG.user.last_name].join(' ');

const CANDIDATE_PAGES = ['ana', 'profil', 'cv', 'randevu-on', 'takvim', 'seanslar', 'odevler', 'seans-notlari', 'hikaye-giris', 'hikaye-oneriler', 'ciktilar'];
const GURU_PAGES = ['guru-danisanlar', 'guru-musaitlik', 'guru-seanslar', 'guru-profil'];

async function measure(p) {
  return p.evaluate(() => {
    // Etap 4 (K84/K85): paylaşımlı Ultraviolet menüsü #sidebar[data-shared] (sidebar.js), ☰ .sidebar-toggle.
    const sidebar = document.querySelector('#sidebar[data-shared="true"]');
    const main = document.querySelector('main');
    const visible = el => { if (!el) return false; const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
    const heading = main ? Array.from(main.querySelectorAll('h1, h2')).find(visible) : null;
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const toggle = Array.from(document.querySelectorAll('.sidebar-toggle')).filter(visible);
    const logout = document.querySelector('#sidebar [data-logout]');
    const avatar = document.querySelector('#sidebar .sidebar-avatar');
    const img = avatar?.querySelector('img');
    return {
      panel: Boolean(sidebar) && document.body.classList.contains('shared-sidebar-page'),
      legacy: document.querySelectorAll('.panel-sidebar, .panel-sidebar-toggle').length,
      sidebars: document.querySelectorAll('#sidebar, aside.panel-sidebar').length,
      sidebar: r(sidebar),
      sidebarVisibility: sidebar ? getComputedStyle(sidebar).visibility : '',
      heading: r(heading),
      name: document.querySelector('#sidebar .sidebar-user-name')?.textContent.trim() || '',
      logout: Boolean(logout),
      logoutVisible: visible(logout),
      logoutLast: Boolean(logout && logout.parentElement && logout.parentElement.lastElementChild === logout),
      toggles: toggle.length,
      expanded: toggle[0]?.getAttribute('aria-expanded') || '',
      avatar: img ? (img.src.startsWith('blob:') ? 'blob' : img.src.slice(0, 40)) : (avatar?.textContent.trim() || ''),
      overflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });
}

const browser = await launch();
const avatars = [];
for (const mobile of [false, true]) {
  const tag = mobile ? 'm' : 'd';
  for (const [role, t, pages, name] of [['candidate', tA, CANDIDATE_PAGES, nameA], ['guru', tG, GURU_PAGES, nameG]]) {
    const ctx = await newContext(browser, { mobile, label: `layout-${role}-${tag}` });
    await inject(ctx, role, t);
    const p = await ctx.newPage();
    for (const pg of pages) {
      await p.goto(BASE + pagePath(pg), { waitUntil: 'networkidle' }); await sleep(700);
      const landed = pageStem(p.url());
      if (landed !== pg) { check(`${tag} ${pg}: sayfa açıldı`, true, 'yönlendirildi → ' + landed + ' (akış durumu)'); continue; }
      const m = await measure(p);
      await shot(p, `10-${pg}-${tag}`, { fullPage: false });
      check(`${tag} ${pg}: paylaşımlı menü (#sidebar[data-shared]) tek, eski panel yok`, m.panel && m.sidebars === 1 && m.legacy === 0, JSON.stringify({ panel: m.panel, sidebars: m.sidebars, legacy: m.legacy }));
      check(`${tag} ${pg}: yatay taşma yok`, m.overflow <= 1, m.overflow + 'px');
      if (!mobile) {
        check(`d ${pg}: kenar menüsü solda sabit sütun (QA-012)`, m.sidebar && m.sidebar.x === 0 && m.sidebar.w <= 300 && m.sidebarVisibility === 'visible', JSON.stringify(m.sidebar));
        check(`d ${pg}: başlık menünün sağında, ilk ekranda`, m.heading && m.heading.x >= (m.sidebar?.w || 0) && m.heading.y < 400, JSON.stringify(m.heading));
        check(`d ${pg}: menüde ad (${name})`, m.name === name, m.name || '(boş)');
        check(`d ${pg}: "Çıkış yap" menünün en altında, görünür (K85/QA-011)`, m.logout && m.logoutVisible && m.logoutLast, JSON.stringify({ l: m.logout, v: m.logoutVisible, last: m.logoutLast }));
        check(`d ${pg}: ☰ masaüstünde gizli`, m.toggles === 0, 'count=' + m.toggles);
        avatars.push(`${role}:${pg}:${m.avatar}`);
      } else {
        check(`m ${pg}: tek görünür menü düğmesi (.sidebar-toggle)`, m.toggles === 1 && m.expanded === 'false', 'count=' + m.toggles + ' exp=' + m.expanded);
        check(`m ${pg}: menü kapalıyken ekran dışında ve gizli (K84)`, m.sidebar && m.sidebar.x + m.sidebar.w <= 0 && m.sidebarVisibility === 'hidden', JSON.stringify(m.sidebar) + ' ' + m.sidebarVisibility);
        check(`m ${pg}: içerik ilk ekranda başlıyor (QA-013)`, m.heading && m.heading.y < 400 && m.heading.y >= 40, JSON.stringify(m.heading));
        if (pg === pages[0]) {
          await p.click('.sidebar-toggle'); await sleep(450);
          await shot(p, `10-${pg}-${tag}-menu`, { fullPage: false });
          const open = await measure(p);
          check(`m ${pg}: menü açılınca ad + "Çıkış yap" görünür`, open.sidebar.x === 0 && open.sidebarVisibility === 'visible' && open.name === name && open.logoutVisible && open.expanded === 'true', JSON.stringify({ x: open.sidebar.x, vis: open.sidebarVisibility, name: open.name, exp: open.expanded }));
          await p.keyboard.press('Escape'); await sleep(450);
          const closed = await measure(p);
          check(`m ${pg}: Esc çekmeceyi kapatır`, closed.sidebarVisibility === 'hidden' && closed.expanded === 'false', closed.sidebarVisibility + ' ' + closed.expanded);
        }
      }
    }
    await ctx.close();
  }
}

// QA-011: çıkış uçtan uca (ayrı token'larla; önbellekteki token'lar bozulmaz).
if (process.env.LOGOUT !== '0') {
  for (const [role, email, password, page, login] of [
    ['candidate', A.email, A.password, 'profil', 'giris'],
    ['guru', G.email, G.password, 'guru-danisanlar', 'guru/giris']
  ]) {
    const fresh = await apiLogin(email, password, role);
    const u = fresh.user;
    const ctx = await newContext(browser, { label: 'logout-' + role });
    await inject(ctx, role, { token: fresh.token, user: { id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role, client_type: role, expires_at: fresh.expires_at } });
    const p = await ctx.newPage();
    await p.goto(BASE + pagePath(page), { waitUntil: 'networkidle' }); await sleep(600);
    const logoutReq = p.waitForRequest(r => r.url().endsWith('/auth/logout') && r.method() === 'POST', { timeout: 10000 }).catch(() => null);
    await p.click('#sidebar [data-logout]');
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
console.log('Menü avatarları (masaüstü): ' + avatars.join(' | '));
save('s10.json');
const unexpected = issues.http.filter(x => !x.expected && x.status !== 401);
console.log(JSON.stringify({ console: issues.console, pageerror: issues.pageerror, http: unexpected, ls: issues.localStorage }, null, 1));
