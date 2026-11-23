// nav.js — Ortak gezinme motoru + panel düzeni. Sahibi: 81 Frontend Platform.
// Sözleşme: [[81 - Frontend Platform Agent#nav.js sözleşmesi]].
//
// 1) Metin tabanlı yönlendirme YALNIZ saf gezinme içindir (menü, sekme, "Geri", "Ana Ekran" …).
//    API aksiyonu olan butonlar (kaydet, onayla, öde, rezervasyon, cevap kaydet …) bu haritadan
//    ÇIKARILDI; yönlendirmeyi sayfa betiği, API yanıtı başarılı olduktan SONRA yapar.
// 2) nav.js şu öğeleri ASLA yakalamaz (kendisi veya bir atası eşleşirse):
//      [data-action]  [data-api-action]  [data-nav-skip]  .site-header
//    API aksiyonu olan her butona sayfa betiği data-action="<ad>" koymalıdır.
// 3) Sayfa betikleri haritayı değiştirebilir:
//      Nav.registerRoutes('/profil', { 'Etiket': 'hedef.html', 'Kaldırılacak': null })
//      Nav.go('hedef.html')               → guru danışan sekmelerinde ?enrollment=&story= taşınır
//      Nav.skip(element)                  → öğeyi data-nav-skip ile işaretler
// 4) Disabled / aria-disabled öğeler yönlendirilmez.
// Kaldırılanlar: ☰ Demo menüsü (GAP-D01), ?izleyici / ?demo=0 / DEMO_UI_VISIBLE (D02/D03),
// demo-flow-nav / Stitch alt gezinme çubuğu gizleyicisi (D04; artık hiçbir sayfada yok), addAvailabilityEditor (D15),
// randevu ön koşulu bayrakları (U01/U02), sabit isimler (D06).
// Sayfa sahiplerine taşındı: wireClientAdvisorProfile → 83 (ana-dashboard), addGuruProfileActions → 84
// (guru-ortak.js GuruPanel.addProfileActions). Geçiş dönemi atlama listesi (LEGACY_SKIP_SELECTOR) temizlik
// turunda silindi: tüm API butonları artık data-action / data-nav-skip taşır.
// Kimlik bağlantıları (giriş ↔ kayıt) metin haritasında değil, öğenin kendi href'iyle gider; böylece
// ?return= korunur (82 bulgusu).

const PAGE = window.Routes.page();
const GURU_NAV_ITEMS = [
  { label: 'Danışanlarım', icon: 'group', href: '/guru/danisanlar', pages: ['/guru/danisanlar', '/guru/danisan', '/guru/hikaye', '/guru/notlar', '/guru/odevler'] },
  { label: 'Müsaitlik', icon: 'event_available', href: '/guru/musaitlik', pages: ['/guru/musaitlik', '/guru/musaitlik/ekle'] },
  { label: 'Seanslarım', icon: 'calendar_month', href: '/guru/seanslar', pages: ['/guru/seanslar'] },
  { label: 'Profilim', icon: 'person', href: '/guru/profil', pages: ['/guru/profil'] }
];
// Guru danışan sekmeleri arasında taşınan kimlik parametreleri (UUID, GAP-U14).
const CLIENT_TAB_PAGES = ['/guru/danisan', '/guru/hikaye', '/guru/notlar', '/guru/odevler'];
const CARRY_PARAMS = ['enrollment', 'story'];

// ─── ROTA HARİTASI (yalnız saf gezinme) ───────────────────────────────────────
// Format: "buton/link metni (veya içerdiği kısım)" → "hedef dosya". Önce tam, sonra "içerir" eşleşmesi.
const CANDIDATE_MENU = {
  "Ana Ekran":  "/panel",
  "Profilim":   "/profil",
  "CV'm":       "/cv",
  "Seanslarım": "/seanslar",
  "Hikâyem":    "/hikaye/yaz",
  "Ödevlerim":  "/odevler",
};
const GURU_MENU = {
  "Danışanlarım": "/guru/danisanlar",
  "Müsaitlik":    "/guru/musaitlik",
  "Seanslarım":   "/guru/seanslar",
};
const GURU_CLIENT_TABS = {
  "Genel":   "/guru/danisan",
  "Detay":   "/guru/danisan",
  "Notlar":  "/guru/notlar",
  "Hikâye":  "/guru/hikaye",
  "Ödevler": "/guru/odevler",
};

const ROUTES = {
  "/giris": {
    "Danışman girişi": "/guru/giris",
    // "Hesap oluştur" / "Kayıt ol" → bağlantının kendi href'i (/kayit?return=…; auth-demo.js)
    // "Şifremi unuttum" → 82 (POST /auth/password-reset/request)
  },
  "/guru/giris": {
    "Danışan girişi": "/giris",
    // "Giriş yap" → auth-demo.js (POST /auth/login)
  },
  // /parola: "Hesabı Etkinleştir" → 82 (POST /auth/verify-email)
  "/kayit": {
    // "Giriş yap" → bağlantının kendi href'i (/giris?return=…; kayit-demo.js / site-header.js)
    "Danışman girişi": "/guru/giris",
  },
  "/kayit/eposta": {
    "Önceki adıma dön": "/kayit",
    // "Kodu tekrar gönder" → 82 (POST /auth/resend-verification); OTP/"Doğrula" kaldırılır (GAP-U03)
  },
  // /hizmet: "Ödemeye geç" → 82 (preview sonrası /siparis?service=&guru=)
  "/siparis": {
    "Danışman seçimine geri dön": "/hizmet",
    // "Ödemeyi tamamla" → 82 (POST /candidate/checkout/purchase confirm:true + Idempotency-Key)
  },
  "/odeme/basarili": {
    "Profilimi doldur": "/profil",
    "Daha sonra":       "/panel",
    "Ana Ekrana Dön":   "/panel",
  },
  "/odeme/hata": {
    "Siparişe geri dön": "/siparis",
    // "Tekrar dene" → 82 (POST …/payments/retry confirm:true)
  },
  "/odeme/bekleniyor": {
    "Ana ekrana git": "/panel",
  },
  "/profil": Object.assign({}, CANDIDATE_MENU, {
    // "Kaydet ve Devam Et" / "Daha sonra tamamla" → 83 (PUT /candidate/profile)
  }),
  "/cv": Object.assign({}, CANDIDATE_MENU, {
    "Geri": "/profil",
    // "Onayla ve Randevuya Geç" → 83 (POST /candidate/cv/{id}/approve confirm:true)
  }),
  "/randevu": Object.assign({}, CANDIDATE_MENU, {
    "Geri":  "/cv",
    "←Geri": "/cv",
    // "Tamamla" / "Randevu Al" → 83 (booking-prerequisites + /me/consents) — GAP-U01
  }),
  "/randevu/takvim": Object.assign({}, CANDIDATE_MENU, {
    "Daha sonra planla": "/panel",
    // "Seans Zamanını Onayla" → 83 (POST /candidate/enrollment-sessions/{id}/book)
  }),
  "/randevu/tamam": Object.assign({}, CANDIDATE_MENU, {
    "Ana Ekrana Dön":  "/panel",
    "Seanslarıma Git": "/seanslar",
  }),
  "/seanslar": Object.assign({}, CANDIDATE_MENU, {
    "Notları oku": "/seanslar/notlar",
  }),
  "/seanslar/notlar": Object.assign({}, CANDIDATE_MENU, {
    "← Seanslarım":       "/seanslar",
    "Hikâyeni Oluştur →": "/hikaye/yaz",
  }),
  "/randevu/ikinci-seans": Object.assign({}, CANDIDATE_MENU, {
    "Ana Ekrana Dön":  "/panel",
    "Seanslarıma Git": "/seanslar",
  }),
  "/panel": Object.assign({}, CANDIDATE_MENU, {
    "Hikâyeni Oluştur":       "/hikaye/yaz",
    "Hikâyeni Oluştur →":     "/hikaye/yaz",
    "Randevu al":             "/randevu/takvim",
    "Danışman notlarını oku": "/hikaye/yaz",
    // "Danışmanı gör" → 83 (/danisman?id=<enrollment.guru_id>)
  }),
  "/danisman": {
    "Danışmanlar": "/danismanlar",
  },
  "/hikaye/yaz": Object.assign({}, CANDIDATE_MENU),
  // /hikaye/oneriler (2. adım): öneri düğmeleri sayfa betiğinde (data-nav-skip); burada yalnız menü.
  "/hikaye/oneriler": Object.assign({}, CANDIDATE_MENU),
  "/hikaye/hazir": Object.assign({}, CANDIDATE_MENU, {
    "Ana Ekrana Dön": "/panel",
    "Hikâyem":        "/hikaye/hazir",
  }),
  "/odevler": Object.assign({}, CANDIDATE_MENU),
  "/odevler/teslim": Object.assign({}, CANDIDATE_MENU, {
    "Geri": "/odevler",
    // "Teslim et" → 83 (POST /candidate/assignments/{id}/submission)
  }),
  "/odevler/goruntule": Object.assign({}, CANDIDATE_MENU, {
    "← Ödevlerim":     "/odevler",
    "Ödevlerim'e dön": "/odevler",
  }),

  // ── GURU (84). Danışana gidiş ("Aç →", aday adı) ?enrollment=<uuid> ile sayfa betiğinde yapılır.
  "/guru/danisanlar": Object.assign({}, GURU_MENU),
  "/guru/danisan": Object.assign({}, GURU_MENU, GURU_CLIENT_TABS),
  "/guru/notlar": Object.assign({}, GURU_MENU, GURU_CLIENT_TABS),
  "/guru/hikaye": Object.assign({}, GURU_MENU, GURU_CLIENT_TABS, {
    "Not Yaz":  "/guru/notlar",
    "Ödev Ver": "/guru/odevler",
  }),
  "/guru/odevler": Object.assign({}, GURU_MENU, GURU_CLIENT_TABS),
  "/guru/musaitlik": Object.assign({}, GURU_MENU, {
    "Müsaitlik Ekle": "/guru/musaitlik/ekle",
  }),
  "/guru/musaitlik/ekle": Object.assign({}, GURU_MENU, {
    "← Vazgeç": "/guru/musaitlik",
    "Vazgeç":   "/guru/musaitlik",
  }),
  "/guru/seanslar": Object.assign({}, GURU_MENU, {
    "Profilim": "/guru/profil",
  }),
  "/guru/profil": Object.assign({}, GURU_MENU, {
    "Profilim": "/guru/profil",
  }),
};

// ─── YÖNLENDİRME MOTORU ───────────────────────────────────────────────────────
(function () {
  const SKIP_SELECTOR = '[data-action], [data-api-action], [data-nav-skip], .site-header';

  function withCarriedParams(target) {
    const path = String(target).split(/[?#]/)[0];
    if (!CLIENT_TAB_PAGES.includes(PAGE) || !CLIENT_TAB_PAGES.includes(path)) return target;
    const current = new URLSearchParams(location.search);
    const url = new URL(target, location.href);
    CARRY_PARAMS.forEach(name => {
      if (current.get(name) && !url.searchParams.has(name)) url.searchParams.set(name, current.get(name));
    });
    return path + url.search + url.hash;
  }

  function go(target) {
    location.href = withCarriedParams(target);
  }

  function registerRoutes(page, map) {
    const current = ROUTES[page] || (ROUTES[page] = {});
    Object.entries(map || {}).forEach(([label, target]) => {
      if (target === null || target === undefined) delete current[label];
      else current[label] = target;
    });
  }

  function skip(element) {
    if (element) element.setAttribute('data-nav-skip', '');
  }

  function navigate(text) {
    const map = ROUTES[PAGE] || {};
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    if (!normalizedText) return false;
    const lowerText = normalizedText.toLocaleLowerCase('tr-TR');
    for (const [label, target] of Object.entries(map)) {
      if (normalizedText === label.replace(/\s+/g, ' ').trim()) {
        go(target);
        return true;
      }
    }
    // En uzun eşleşen etiket kazanır: "Müsaitlik Ekle" düğmesi menüdeki "Müsaitlik" bağlantısına gitmesin.
    const byLength = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
    for (const [label, target] of byLength) {
      if (lowerText.includes(label.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim())) {
        go(target);
        return true;
      }
    }
    return false;
  }

  window.Nav = Object.freeze({ registerRoutes, go, skip, withCarriedParams, routes: ROUTES });

  // Panel kenar çubuğundaki kullanıcı adı/baş harfleri oturumdan (GAP-D06; QA-012 regresyonu:
  // ad artık /auth/me önbelleğinden — getSession — DOMContentLoaded ve session:ready'de doldurulur).
  function updatePanelUser() {
    const name = window.getSession?.().name || '';
    if (!name) return;
    document.querySelectorAll('.panel-sidebar-user, .guru-profile-user, .advisor-sidebar .border-t').forEach(user => {
      const nameNode = user.querySelector('.truncate, .panel-sidebar-user-details > span:first-child, .panel-sidebar-user-details > div:first-child');
      const avatar = user.querySelector('.rounded-full, .panel-sidebar-avatar');
      if (nameNode) nameNode.textContent = name;
      if (avatar) {
        avatar.textContent = name.split(/\s+/).slice(0, 2).map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
      }
    });
  }

  function updateGuruSidebar() {
    // K116: yalnız guru PANEL sayfaları (giriş sayfası /guru/giris hariç; routes.js sınıfları).
    if (!window.Routes.isPanel(PAGE, 'guru')) return;
    document.body.classList.add('guru-panel-page');
    const sidebar = document.querySelector('.advisor-sidebar');
    const nav = sidebar?.querySelector('nav');
    if (!sidebar || !nav) return;

    GURU_NAV_ITEMS.forEach(item => {
      let link = Array.from(nav.querySelectorAll('a')).find(anchor => anchor.textContent.includes(item.label));
      if (!link) {
        link = document.createElement('a');
        link.className = 'flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-[#7564C7] transition-colors';
        link.innerHTML = `<div class="flex items-center gap-space-sm"><span class="material-symbols-outlined text-[20px] text-outline">${item.icon}</span><span class="font-headline-sm text-body-md text-[#1E1E1C]"></span></div>`;
        nav.appendChild(link);
      }

      link.href = item.href;
      const label = link.querySelector('div > span:last-child');
      if (label) label.textContent = item.label;
      const current = item.pages.includes(PAGE);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');

      let arrow = link.querySelector(':scope > .advisor-sidebar-active-arrow');
      if (current && !arrow) {
        arrow = Array.from(link.querySelectorAll(':scope > .material-symbols-outlined'))
          .find(icon => icon.textContent.trim() === 'chevron_right');
        arrow?.classList.add('advisor-sidebar-active-arrow');
      }
      if (current && !arrow) {
        arrow = document.createElement('span');
        arrow.className = 'material-symbols-outlined text-[18px] text-on-primary advisor-sidebar-active-arrow';
        arrow.textContent = 'chevron_right';
        link.appendChild(arrow);
      } else if (!current) {
        arrow?.remove();
      }

      link.classList.remove('bg-[#51409D]', 'text-on-primary', 'font-semibold', 'shadow-xs', 'rounded-[8px]');
      link.classList.add('rounded-lg');
      link.querySelectorAll('.material-symbols-outlined').forEach(icon => {
        icon.classList.remove('text-on-primary');
        icon.classList.add('text-outline');
      });
      if (label) {
        label.classList.remove('text-on-primary');
        label.classList.add('text-[#1E1E1C]');
      }
    });

    const displayName = window.getSession?.().name || '';
    const nameNode = sidebar.querySelector('.border-t .truncate');
    const avatar = sidebar.querySelector('.border-t .rounded-full');
    if (nameNode && displayName) nameNode.textContent = displayName;
    if (avatar && displayName) {
      avatar.textContent = displayName.split(/\s+/).slice(0, 2).map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
    }
  }

  function setupPanelLayout() {
    // Etap 4 (Ultraviolet): paylaşımlı menü (sidebar.js, <aside id="sidebar" data-shared="true">)
    // kendi düzenini, çıkışını (K85) ve mobil çekmecesini (K84) kurar; eski panel düzeni atlanır.
    // Bu koruma olmazsa guru sayfalarında ikinci bir <aside> üretilir.
    if (document.getElementById('sidebar')?.dataset.shared === 'true') return;

    const main = document.querySelector('main');
    // QA-012: aday sayfalarının çoğunda <aside> .advisor-sidebar sınıfı taşımıyor (yalnız /panel taşıyor);
    // eskiden yalnız o sınıf arandığı için panel düzeni uygulanmıyor, menü içeriğin üstüne yığılıyordu.
    // Menü metni denetimi (aşağıda) yalnız gerçek panel menüsünün eşleşmesini garanti eder.
    let sidebar = main?.querySelector('.advisor-sidebar') ||
      Array.from(main?.querySelectorAll('aside') || []).find(aside => aside.querySelector('nav'));
    if (document.body.classList.contains('guru-panel-page') && main) {
      const content = main.querySelector('.guru-profile-content') ||
        Array.from(main.querySelectorAll('section')).find(section =>
          section.classList.contains('lg:col-span-8')
        ) ||
        Array.from(main.querySelectorAll('section')).find(section => section.querySelector('h1'));
      if (content) {
        let name = sidebar?.querySelector('.guru-profile-user .truncate, .border-t .truncate')
          ?.textContent.trim();
        if (!name) {
          name = window.getSession?.().name || '';
        }
        const sharedSidebar = document.createElement('aside');
        sharedSidebar.className = 'advisor-sidebar';
        sharedSidebar.setAttribute('aria-label', 'Danışman menüsü');
        const card = document.createElement('div');
        card.className = 'guru-profile-sidebar-card';
        const menu = document.createElement('div');
        menu.className = 'guru-profile-sidebar-menu';
        const brand = document.createElement('div');
        brand.className = 'guru-profile-brand';
        brand.textContent = 'Interview Demo';
        const nav = document.createElement('nav');
        nav.className = 'guru-profile-menu';
        nav.setAttribute('aria-label', 'Ana menü');
        GURU_NAV_ITEMS.forEach(item => {
          const link = document.createElement('a');
          link.className = 'guru-profile-menu-link';
          link.href = item.href;
          if (item.pages.includes(PAGE)) link.setAttribute('aria-current', 'page');
          const labelGroup = document.createElement('div');
          labelGroup.className = 'guru-profile-menu-label-group';
          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined guru-profile-menu-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = item.icon;
          const label = document.createElement('span');
          label.className = 'guru-profile-menu-label';
          label.textContent = item.label;
          labelGroup.append(icon, label);
          link.appendChild(labelGroup);
          if (item.pages.includes(PAGE)) {
            const arrow = document.createElement('span');
            arrow.className = 'material-symbols-outlined guru-profile-menu-current';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = 'chevron_right';
            link.appendChild(arrow);
          }
          nav.appendChild(link);
        });
        menu.append(brand, nav);
        const user = document.createElement('div');
        user.className = 'guru-profile-user panel-sidebar-user border-t';
        const avatar = document.createElement('div');
        avatar.className = 'rounded-full panel-sidebar-avatar guru-profile-avatar';
        avatar.textContent = name.split(/\s+/).slice(0, 2)
          .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
        const details = document.createElement('div');
        details.className = 'panel-sidebar-user-details';
        const userName = document.createElement('span');
        userName.className = 'truncate';
        userName.textContent = name;
        const role = document.createElement('small');
        role.textContent = 'Danışman';
        details.append(userName, role);
        user.append(avatar, details);
        card.append(menu, user);
        sharedSidebar.appendChild(card);
        main.replaceChildren(sharedSidebar, content);
        main.classList.remove('guru-profile-layout');
        sidebar = sharedSidebar;
      }
    }
    const nav = sidebar?.querySelector('nav');
    const grid = sidebar?.parentElement;
    const content = grid && Array.from(grid.children).find(element =>
      element !== sidebar && /^(SECTION|DIV)$/.test(element.tagName)
    );
    if (!main || !sidebar || !nav || !content) return;

    const menuItems = Array.from(nav.children);
    const menuText = menuItems.map(item => item.textContent.replace(/\s+/g, ' ').trim())
      .join(' ').toLocaleLowerCase('tr-TR');
    if (!/ana ekran|profilim|cv'm|seanslarım|danışanlarım|müsaitlik/.test(menuText)) return;

    document.body.classList.add('panel-dashboard');
    main.classList.add('panel-dashboard-main');
    grid.classList.add('panel-dashboard-grid');
    sidebar.classList.add('panel-sidebar');
    sidebar.firstElementChild?.classList.add('panel-sidebar-card');
    content.classList.add('panel-main-content');

    if (grid !== main) {
      let shell = grid;
      while (shell.parentElement && shell.parentElement !== main) shell = shell.parentElement;
      if (shell.parentElement === main) shell.classList.add('panel-page-shell');
    }

    const shortLabels = [
      [/ana ekran/i, 'Ana'],
      [/profilim/i, 'Profil'],
      [/cv/i, 'CV'],
      [/seanslarım/i, 'Seans'],
      [/hikâyem|hikayem/i, 'Hikâye'],
      [/danışanlarım/i, 'Danışan'],
      [/müsaitlik/i, 'Saat'],
      [/notlarım|notlar/i, 'Notlar'],
      [/ödevlerim|ödevler/i, 'Ödev']
    ];
    menuItems.forEach(item => {
      if (!item.querySelector('span:not(.material-symbols-outlined)')) {
        const textNodes = Array.from(item.childNodes).filter(node =>
          node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        if (textNodes.length) {
          const label = document.createElement('span');
          label.textContent = textNodes.map(node => node.textContent.trim()).join(' ');
          textNodes[0].replaceWith(label);
          textNodes.slice(1).forEach(node => node.remove());
        }
      }
      const label = Array.from(item.querySelectorAll('span'))
        .filter(span => !span.classList.contains('material-symbols-outlined'))
        .map(span => span.textContent.trim())
        .join(' ').trim();
      const shortLabel = shortLabels.find(([pattern]) => pattern.test(label))?.[1];
      if (shortLabel) item.dataset.panelShort = shortLabel;
      item.querySelectorAll('span').forEach(span => {
        if (span.classList.contains('material-symbols-outlined')) {
          span.classList.add('panel-nav-icon');
        } else {
          span.classList.add('panel-nav-label');
        }
      });
    });

    const brand = sidebar.querySelector('.guru-profile-brand') ||
      sidebar.querySelector('.panel-sidebar-card > div:first-child > div:first-child');
    if (brand) {
      brand.classList.add('panel-sidebar-brand');
      brand.dataset.panelShort = 'ID';
    }
    const user = sidebar.querySelector('.guru-profile-user') ||
      sidebar.querySelector('.panel-sidebar-card > div:last-child');
    if (user) {
      user.classList.add('panel-sidebar-user');
      const avatar = user.querySelector('.rounded-full');
      avatar?.classList.add('panel-sidebar-avatar');
      const details = avatar?.nextElementSibling;
      details?.classList.add('panel-sidebar-user-details');
    }

    // QA-011: panel kenar kartında çıkış (aday + guru). Tıklamayı gate.js [data-logout] yakalar:
    // POST /auth/logout + sessionStorage temizliği + rolün giriş sayfası.
    if (!sidebar.querySelector('[data-logout]')) {
      const logoutButton = document.createElement('button');
      logoutButton.type = 'button';
      logoutButton.className = 'panel-sidebar-logout';
      logoutButton.setAttribute('data-logout', '');
      logoutButton.setAttribute('aria-label', 'Çıkış yap');
      logoutButton.dataset.panelShort = 'Çıkış';
      logoutButton.innerHTML = '<span class="material-symbols-outlined panel-nav-icon" aria-hidden="true">logout</span>' +
        '<span class="panel-nav-label">Çıkış yap</span>';
      if (user) user.insertAdjacentElement('afterend', logoutButton);
      else sidebar.querySelector('.panel-sidebar-card')?.appendChild(logoutButton);
    }

    if (!sidebar.id) sidebar.id = 'panel-sidebar';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'panel-sidebar-toggle';
    toggle.setAttribute('aria-controls', sidebar.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menüyü aç');
    toggle.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">menu</span>';
    document.body.appendChild(toggle);

    function setMenuOpen(open) {
      document.body.classList.toggle('panel-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      const icon = toggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = open ? 'close' : 'menu';
      if (open) sidebar.querySelector('a')?.focus();
      else toggle.focus();
    }

    toggle.addEventListener('click', () => {
      setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', event => {
      if (document.body.classList.contains('panel-menu-open') &&
          !sidebar.contains(event.target) && !toggle.contains(event.target)) {
        setMenuOpen(false);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('panel-menu-open')) {
        setMenuOpen(false);
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && document.body.classList.contains('panel-menu-open')) {
        setMenuOpen(false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateGuruSidebar();
    setupPanelLayout();
    updatePanelUser();
  });
  document.addEventListener('session:ready', updatePanelUser);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, [role="button"]');
    if (!el) return;
    if (el.closest(SKIP_SELECTOR)) return;
    if (document.body.classList.contains('guru-profile-editor') &&
        el.closest('#sidebar nav, .advisor-sidebar nav') &&
        document.body.dataset.profileDirty === 'true') return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const text = (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
    if (navigate(text)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // capture: Stitch handler'larından önce
})();
