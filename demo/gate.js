// gate.js — Oturum kapısı (rol bazlı sayfa erişimi). Sahibi: 81 Frontend Platform.
// Gerçek oturum: sessionStorage'daki Bearer token (api-client.js) + GET /auth/me doğrulaması.
// Bağımlılık: config.js → api-client.js → gate.js sırası.
//
// Sözleşme (özet; ayrıntı [[81 - Frontend Platform Agent]]):
//   window.getSession()      → senkron, önbellekten: { role:'danisan'|'danisman'|null, clientType,
//                              userId, name, first_name, last_name, ad, tip, state:null }
//   window.sessionReady      → Promise<session>; korumalı sayfada /auth/me doğrulandıktan sonra çözülür
//                              (401 → api-client girişe yönlendirir ve promise çözülmez).
//   window.requireRole(role) → token yoksa girişe yönlendirir (false döner).
//   window.Session.logout({ redirectTo? }) (= window.logout) → POST /auth/logout + sessionStorage temizliği →
//                              korumalı sayfada rolün giriş sayfası, public sayfada / (QA-011)
//   [data-logout]            → bu özniteliği taşıyan her öğe tıklanınca çıkış yapar (nav.js panel kartı kullanır)
//   window.Session.get()     → getSession() · window.Session.ready → sessionReady
//   window.safeReturnPath(v) → güvenli ?return= değeri
//   'session:ready' olayı    → document üzerinde, detail = session
// Kaldırılanlar: demoOturum, setSession / requireSession / DemoSession (temizlik turu; Api.auth.login
// kullanın), ?izleyici=1, ?demo=0, DEMO_UI_VISIBLE, landing render'ı (→ landing-page.js, sahibi 82).
(function () {
  'use strict';

  if (!window.Api) {
    console.error('gate.js: api-client.js yüklenmemiş. Sayfaya config.js ve api-client.js ekleyin.');
    return;
  }
  const Api = window.Api;
  const page = Api.pageName();

  // ─── Yerel önizleme modu (YALNIZ localhost / 127.0.0.1) ─────────────────────
  // Backend çalışmadan ekranları görmek için: sayfa adresine ?onizleme=aday ya da ?onizleme=danisman.
  // Sekme boyunca hatırlanır; kapatmak için ?onizleme=kapat. Giriş kontrolü atlanır, gerçek oturum
  // açılmaz, token oluşmaz; servis yanıtları onizleme-veri.js'teki kurgusal örnek verilerden
  // gelir (yazma istekleri kaydedilmez); danışman önizlemesinde yalnız müsaitlik ekranları doludur.
  // Kaldırmak için bu bloğu, api-client.js'teki önizleme satırlarını ve onizleme-veri.js'i silmek yeterli.
  // K102 (Etap 6): YALNIZ APP_CONFIG.previewAllowed true ise (dev-server.mjs + yerel adres; config.js dondurulmuş).
  // Docker web imajında / sunucuda config.js bu değeri false sabitler: ?onizleme= ve sessionStorage etkisizdir,
  // eski preview.role silinir. window.APP_PREVIEW değiştirilemez özelliktir.
  const PREVIEW_KEY = 'preview.role';
  const PREVIEW_ALLOWED = Boolean(window.APP_CONFIG && window.APP_CONFIG.previewAllowed === true);
  let previewRole = null;
  if (!PREVIEW_ALLOWED) {
    try { window.sessionStorage.removeItem(PREVIEW_KEY); } catch (error) { /* depolama kapalı */ }
  } else {
    try {
      const wanted = new URLSearchParams(location.search).get('onizleme');
      if (wanted === 'kapat') window.sessionStorage.removeItem(PREVIEW_KEY);
      else if (wanted === 'aday' || wanted === 'danisman') window.sessionStorage.setItem(PREVIEW_KEY, wanted);
      previewRole = window.sessionStorage.getItem(PREVIEW_KEY);
      if (previewRole !== 'aday' && previewRole !== 'danisman') previewRole = null;
    } catch (error) { previewRole = null; }
  }
  Object.defineProperty(window, 'APP_PREVIEW', { value: Boolean(previewRole), writable: false, configurable: false, enumerable: true });
  // onizleme-veri.js örnek verileri (api-client.js) — yalnız önizlemede, aynı biçimde değiştirilemez (K102).
  Object.defineProperty(window, 'APP_PREVIEW_ROLE', { value: previewRole || null, writable: false, configurable: false, enumerable: true });

  // Oturum gerektirmeyen sayfalar. eposta/davet e-posta bağlantısıyla oturumsuz açılır (GAP-U03).
  const PUBLIC_PAGES = new Set(window.Routes.PUBLIC_PAGES);   // K116: routes.js tek kaynak

  // ─── Eski demo verisinin temizliği (GAP-D*, 80 envanteri) ───────────────────
  // Paylaşılan tarayıcıda eski demo verisi kişisel veri gibi görünmesin: sekme başına bir kez.
  const LEGACY_LOCAL_KEYS = [
    'demoOturum', 'demoEmail', 'demoDevam', 'demoSecim', 'demoOdemeAlindi', 'demoOdemeYontemi',
    'demoKvkkOnaylandi', 'demoProfilTamamlandi', 'demoCvOnaylandi', 'demoIlkSeansTamamlandi',
    'demoRandevu', 'demoMusaitlik', 'demoMusaitlikHafta', 'guruAvailabilitySlots', 'guruServicePrice',
    'guruProfile', 'demoSoruCevaplari', 'soruNo', 'demoHazirHikaye', 'demoHikaye', 'demoHikayeGapTypes',
    'demoGuruNotlari', 'demoOdevler', 'guruElifTasks', 'demoLinkDurumu', 'demoSeansNotu', 'demoTarih', 'demoSaat',
    // Etap 3 (GAP-Y12): yönetici paneli mock dönemi anahtarları (eski admin token'ı ve kurgusal kişi verisi).
    'demoYoneticiOturum', 'yoneticiDemoVeri',
    // Etap 4 (Ultraviolet): guru-client-card.js mock'unun seçili aday anahtarı (K79; dosya yüklenmez).
    'demoSelectedCandidate'
  ];
  try {
    if (window.sessionStorage.getItem('legacyCleanup.v1') !== 'done') {
      LEGACY_LOCAL_KEYS.forEach(key => window.localStorage.removeItem(key));
      window.sessionStorage.setItem('legacyCleanup.v1', 'done');
    }
  } catch (error) {
    // Depolama kapalıysa temizlenecek bir şey de yoktur.
  }

  // ─── Oturum modeli ─────────────────────────────────────────────────────────
  const EMPTY = Object.freeze({ role: null, clientType: null, userId: null, name: '', ad: '', first_name: '', last_name: '', tip: null, state: null });

  function toSession(clientType) {
    if (!Api.hasSession(clientType)) return null;
    const user = Api.getUser(clientType) || {};
    const name = Api.format.fullName(user);
    const legacyRole = clientType === Api.ROLES.GURU ? 'danisman' : 'danisan';
    return {
      role: legacyRole,
      clientType,
      userId: user.id || null,
      name,
      ad: name,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      avatar_url: user.avatar_url || null,   // GAP-B23: göreli API yolu; avatar.js Api.avatarSrc ile çözer
      tip: clientType === Api.ROLES.GURU ? 'guru' : 'aday',
      // Eski "new/registered" ayrımı kaldırıldı; aday ilerlemesi enrollments/story'den türetilir.
      state: null
    };
  }

  // Public sayfada (ör. landing) hangi rol oturumu gösterilir: sayfanın rolü, yoksa diğeri.
  function previewSession() {
    const clientType = Api.pageRole();
    const isGuru = clientType === Api.ROLES.GURU;
    const name = isGuru ? 'Önizleme Danışmanı' : 'Elif Demir';
    return { role: isGuru ? 'danisman' : 'danisan', clientType, userId: 'onizleme', name, ad: name,
      first_name: isGuru ? 'Önizleme' : 'Elif', last_name: isGuru ? 'Danışmanı' : 'Demir', avatar_url: null, tip: isGuru ? 'guru' : 'aday', state: null, preview: true };
  }

  function getSession() {
    if (previewRole && !Api.hasSession(Api.pageRole())) return previewSession();
    const primary = Api.pageRole();
    if (!PUBLIC_PAGES.has(page)) return toSession(primary) || Object.assign({}, EMPTY);
    const secondary = primary === Api.ROLES.GURU ? Api.ROLES.CANDIDATE : Api.ROLES.GURU;
    return toSession(primary) || toSession(secondary) || Object.assign({}, EMPTY);
  }

  function requireRole(role, targetPage) {
    const clientType = role === 'danisman' || role === 'guru' ? Api.ROLES.GURU : Api.ROLES.CANDIDATE;
    if (Api.hasSession(clientType)) return true;
    Api.redirectToLogin(clientType, Api.safeReturnPath(targetPage || '') || undefined);
    return false;
  }

  // QA-011: çıkış = POST /auth/logout (sunucuda token iptali) + sessionStorage temizliği + yönlendirme.
  // Varsayılan hedef: panel/korumalı sayfada rolün giriş sayfası, public sayfada /.
  let loggingOut = false;
  function logout(options) {
    const session = getSession();
    const role = session.clientType || Api.pageRole();
    const redirectTo = PUBLIC_PAGES.has(page) ? '/' : Api.LOGIN_PAGES[role];
    loggingOut = true;
    // Önizleme modunda gerçek oturum yok: önizlemeyi kapat ve ziyaretçi olarak devam et.
    if (previewRole) {
      try { window.sessionStorage.removeItem(PREVIEW_KEY); } catch (error) { /* depolama kapalı */ }
      // APP_PREVIEW / APP_PREVIEW_ROLE değiştirilemez (K102); sayfa değişince yeniden hesaplanır.
      location.href = (options && options.redirectTo) || redirectTo || '/';
      return Promise.resolve();
    }
    return Api.auth.logout(Object.assign({ role, redirectTo }, options));
  }

  // Bildirimsel çıkış: [data-logout] taşıyan her öğe (nav.js panel kartı, 84'ün özel düğmeleri …).
  document.addEventListener('click', event => {
    const trigger = event.target.closest && event.target.closest('[data-logout]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (loggingOut) return;
    Api.ui.setLoading(trigger, true);
    logout().catch(() => { loggingOut = false; Api.ui.setLoading(trigger, false); });
  }, true);

  window.getSession = getSession;
  window.requireRole = requireRole;
  window.safeReturnPath = Api.safeReturnPath;
  window.logout = logout;
  window.Session = Object.freeze({
    get: getSession,
    logout,
    get ready() { return window.sessionReady; }
  });

  // ─── Kapı ──────────────────────────────────────────────────────────────────
  const requiredRole = PUBLIC_PAGES.has(page) ? null : Api.pageRole();
  let resolveReady;
  window.sessionReady = new Promise(resolve => { resolveReady = resolve; });

  function announce(session) {
    resolveReady(session);
    const fire = () => document.dispatchEvent(new CustomEvent('session:ready', { detail: session }));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fire, { once: true });
    else fire();
  }

  const previewActive = Boolean(previewRole && requiredRole && !Api.hasSession(requiredRole));
  if (previewActive) {
    const showBanner = () => {
      if (document.getElementById('preview-banner')) return;
      const bar = document.createElement('div');
      bar.id = 'preview-banner';
      bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:12px;' +
        'padding:10px 16px;border-radius:999px;background:var(--color-ink,#0F0A1C);color:#fff;font:500 13px/1.3 var(--font-body,sans-serif);box-shadow:0 10px 30px rgba(15,10,28,.25)';
      bar.innerHTML = '<span>Önizleme modu · giriş yok, veriler gerçek değil</span>';
      const off = document.createElement('a');
      off.href = window.Routes.page() + '?onizleme=kapat';
      off.textContent = 'Kapat';
      off.setAttribute('data-nav-skip', '');
      off.style.cssText = 'color:#fff;text-decoration:underline;font-weight:600';
      bar.appendChild(off);
      document.body.appendChild(bar);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner, { once: true });
    else showBanner();
  }

  if (!previewActive && requiredRole && !requireRole(requiredRole === Api.ROLES.GURU ? 'danisman' : 'danisan')) {
    // Yönlendirme başladı; sayfa betikleri sessionReady'yi beklediği için çalışmaz.
    return;
  }

  // Token'ı /auth/me ile doğrula. Korumalı sayfada 401 → api-client girişe yönlendirir.
  // Public sayfada geçersiz token sessizce temizlenir.
  const verifyRole = previewActive ? null : (requiredRole || (getSession().clientType));
  if (!verifyRole) {
    announce(getSession());
  } else {
    Api.auth.me({ role: verifyRole, redirectOn401: Boolean(requiredRole) })
      .then(me => {
        const expected = verifyRole;
        if (me && me.client_type && me.client_type !== expected) {
          // Rol/istemci uyumsuzluğu: token başka bir istemciye ait.
          Api.clearSession(expected);
          if (requiredRole) { Api.redirectToLogin(expected); return; }
        }
        announce(getSession());
      })
      .catch(error => {
        if (error && error.status === 401) {
          if (!requiredRole) announce(getSession());
          return; // korumalı sayfa: yönlendirme sürüyor
        }
        // Ağ hatası vb.: önbellekteki oturumla devam edilir, sayfa kendi isteklerinde hatayı gösterir.
        console.error('Oturum doğrulanamadı:', error && error.message);
        announce(getSession());
      });
  }

  // ─── Marka bağlantıları (tüm sayfalar) ─────────────────────────────────────
  // Etap 4 (K89/H7): paylaşımlı panel menüsünün markası (#sidebar .sidebar-brand) panelin ana
  // ekranına gider (sidebar.js: /panel / /guru/danisanlar); burada /'e çevrilmez.
  function wireBrandLinks() {
    document.querySelectorAll('header a, aside a').forEach(link => {
      if (link.closest('#sidebar')) return;
      if (link.textContent.replace(/\s+/g, ' ').trim().includes('Interview Demo')) {
        link.href = '/';
        link.setAttribute('aria-label', 'Ana sayfaya dön');
        link.classList.add('site-brand-link');
      }
    });
    document.querySelectorAll('header span, aside span').forEach(brand => {
      if (brand.textContent.trim() !== 'Interview Demo' || brand.closest('a, #sidebar')) return;
      const brandLink = document.createElement('a');
      brandLink.href = '/';
      brandLink.className = brand.className + ' site-brand-link';
      brandLink.textContent = brand.textContent;
      brandLink.setAttribute('aria-label', 'Ana sayfaya dön');
      brand.replaceWith(brandLink);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireBrandLinks, { once: true });
  } else {
    wireBrandLinks();
  }
})();
