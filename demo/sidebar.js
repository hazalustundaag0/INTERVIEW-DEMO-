// sidebar.js — Paylaşımlı aday / danışman yan menüsü (Ultraviolet tasarımı, Hazal; Etap 4 uyarlaması 81).
//
// Kullanım (sayfa): <aside id="sidebar" data-role="aday|danisman" [data-active="<öğe-id>"]></aside>
//                   + <link rel="stylesheet" href="sidebar.css"> + <script src="sidebar.js"></script>
//   Betik çalışınca host'u <body>'nin başına taşır, data-shared="true" yazar (nav.js eski panel düzenini
//   bu yüzden atlar) ve menüyü çizer.
//
// Etap 4 kuralları:
//   - localStorage OKUNMAZ, sahte isim yok. Başlangıç durumu NÖTR: ✓ yok, "Sıradaki" yok, kilit yok.
//     Gerçek durum sayfa betiklerinden Sidebar.setState(...) ile gelir (83: aday-yolculuk.js / ana-page.js).
//   - Ad ve avatar oturumdan: getSession() (/auth/me önbelleği) + 'session:ready'. Ad yoksa boş kalır.
//   - K85: menünün en altında, menü öğesi görünümünde "Çıkış yap" ([data-logout] → gate.js → Session.logout()).
//   - K84 / QA-013: ≤768 px'te menü çekmecedir (☰ düğmesi, Esc / dışarı tıklama / bağlantı ile kapanır).
//
// Sözleşme (window.Sidebar):
//   Sidebar.setState({
//     items: {                                  // öğe kimlikleri: aday → ana, profil, cv, seanslar, hikaye, odevler
//       profil:  { done: true },                //               danışman → danisanlar, musaitlik, seanslar, profil
//       hikaye:  { locked: true, hint: 'İlk seanstan sonra açılır' },
//       odevler: { locked: false, href: '/odevler' }
//     },
//     next: 'hikaye'                            // "Sıradaki" rozeti tek öğede; null → rozet yok
//   });
//   - Birleştirerek uygular (verilmeyen öğe/alan önceki değerini korur); { items: { x: null } } öğeyi nötrler.
//   - Etkin sayfanın öğesi (aria-current) kilitlenmez ve ✓ / rozet yerine ok işareti taşır.
//   - Kilitli öğe <a aria-disabled="true"> olur, href taşımaz (gezinilemez), altında hint metni görünür.
//   Sidebar.getState() · Sidebar.reset() · Sidebar.refreshUser() · Sidebar.open() / close() / toggle()
//   Sidebar.role ('aday' | 'danisman') · Sidebar.element (host)
//   Olay: document 'sidebar:ready' (detail = Sidebar), çizim bitince bir kez.
(function () {
  'use strict';

  const host = document.getElementById('sidebar');
  if (!host) return;

  const page = window.Routes.page();
  const role = host.dataset.role === 'danisman' || (!host.dataset.role && window.Routes.area(page) === 'guru') ? 'danisman' : 'aday';
  const activeOverride = host.dataset.active;
  const DRAWER_QUERY = '(max-width: 768px)';

  const candidateItems = [
    { id: 'ana', label: 'Ana Ekran', icon: 'home', href: '/panel', pages: ['/panel'] },
    { id: 'profil', label: 'Profilim', icon: 'person', href: '/profil', pages: ['/profil'] },
    { id: 'cv', label: "CV'm", icon: 'description', href: '/cv', pages: ['/cv'] },
    { id: 'seanslar', label: 'Seanslarım', icon: 'calendar_month', href: '/seanslar', pages: ['/seanslar', '/randevu', '/randevu/tamam', '/seanslar/notlar', '/randevu/ikinci-seans', '/randevu/takvim'] },
    { id: 'hikaye', label: 'Hikâyem', icon: 'auto_stories', href: '/hikaye/yaz', pages: ['/hikaye/yaz', '/hikaye/oneriler', '/hikaye/hazir'] },
    { id: 'odevler', label: 'Ödevlerim', icon: 'assignment', href: '/odevler', pages: ['/odevler', '/odevler/goruntule', '/odevler/teslim'] }
  ];

  const advisorItems = [
    { id: 'danisanlar', label: 'Danışanlarım', icon: 'group', href: '/guru/danisanlar', pages: ['/guru/danisanlar', '/guru/danisan', '/guru/hikaye', '/guru/notlar', '/guru/odevler'] },
    { id: 'musaitlik', label: 'Müsaitlik', icon: 'event_available', href: '/guru/musaitlik', pages: ['/guru/musaitlik', '/guru/musaitlik/ekle'] },
    { id: 'seanslar', label: 'Seanslarım', icon: 'calendar_month', href: '/guru/seanslar', pages: ['/guru/seanslar'] },
    { id: 'profil', label: 'Profilim', icon: 'person', href: '/guru/profil', pages: ['/guru/profil'] }
  ];

  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
    description: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    calendar_month: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
    auto_stories: '<path d="M12 7c-2-2-5-3-9-3v15c4 0 7 1 9 3 2-2 5-3 9-3V4c-4 0-7 1-9 3z"/><path d="M12 7v15"/>',
    assignment: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 5V3h6v2M8 10h8M8 14h8M8 18h5"/>',
    group: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20"/>',
    event_available: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M15 15l2 2 4-4"/>',
    check_circle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    chevron_right: '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>'
  };

  const items = role === 'danisman' ? advisorItems : candidateItems;
  const activeItem = items.find(item => (activeOverride ? item.id === activeOverride : item.pages.includes(page))) || null;

  // Nötr başlangıç: hiçbir öğe ✓ / kilitli değil, "Sıradaki" yok.
  let state = { items: {}, next: null };

  function icon(name, extraClass) {
    return `<svg class="sidebar-svg ${extraClass || ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name] || ''}</svg>`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function safeHref(value, fallback) {
    const href = String(value || '');
    return window.Api?.safeReturnPath?.(href) || (/^[a-z0-9][a-z0-9_-]*\.html(?:[?#][^\s"'<>\\]*)?$/i.test(href) ? href : fallback);
  }

  function renderItem(item) {
    const itemState = state.items[item.id] || {};
    const active = activeItem === item;
    const locked = !active && itemState.locked === true;
    const link = el('a', 'sidebar-link' + (active ? ' is-active' : '') + (locked ? ' sidebar-locked' : ''));
    link.dataset.sidebarItem = item.id;
    // Gerçek href kullanılır; nav.js metin rotası devreye girmez.
    link.setAttribute('data-nav-skip', '');
    if (active) link.setAttribute('aria-current', 'page');
    if (locked) {
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('role', 'link');
    } else {
      link.href = safeHref(itemState.href, item.href);
    }

    const label = el('span', 'sidebar-link-label');
    label.insertAdjacentHTML('beforeend', icon(item.icon, 'sidebar-icon'));
    label.append(el('span', '', item.label));
    link.append(label);

    if (active) {
      link.insertAdjacentHTML('beforeend', `<span class="sidebar-state">${icon('chevron_right')}</span>`);
    } else if (locked) {
      link.insertAdjacentHTML('beforeend', `<span class="sidebar-state" title="Kilitli">${icon('lock')}</span>`);
    } else if (state.next === item.id) {
      link.append(el('span', 'sidebar-badge', 'Sıradaki'));
    } else if (itemState.done === true) {
      link.insertAdjacentHTML('beforeend', `<span class="sidebar-state" title="Tamamlandı">${icon('check_circle')}</span>`);
      link.dataset.sidebarDone = 'true';
    }

    const nodes = [link];
    if (locked && itemState.hint) {
      const hint = el('p', 'sidebar-locked-copy', String(itemState.hint));
      hint.id = `sidebar-hint-${item.id}`;
      link.setAttribute('aria-describedby', hint.id);
      nodes.push(hint);
    }
    return nodes;
  }

  function renderNav() {
    const nav = host.querySelector('.sidebar-nav');
    if (!nav) return;
    nav.replaceChildren(...items.flatMap(renderItem));
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  }

  function refreshUser() {
    const session = window.getSession?.() || null;
    const name = (session && (session.name || session.ad)) || '';
    const nameNode = host.querySelector('.sidebar-user-name');
    const avatar = host.querySelector('.sidebar-avatar');
    if (nameNode) nameNode.textContent = name;
    if (avatar) {
      if (window.DemoAvatar?.sync) window.DemoAvatar.sync(avatar);
      else avatar.textContent = initials(name);
    }
  }

  function normalizeItemState(value) {
    if (!value || typeof value !== 'object') return null;
    const out = {};
    if ('done' in value) out.done = value.done === true;
    if ('locked' in value) out.locked = value.locked === true;
    if ('hint' in value) out.hint = value.hint ? String(value.hint) : '';
    if ('href' in value) out.href = value.href ? String(value.href) : '';
    return out;
  }

  function setState(patch) {
    const p = patch || {};
    if (p.items && typeof p.items === 'object') {
      Object.keys(p.items).forEach(id => {
        if (!items.some(item => item.id === id)) return;
        const next = normalizeItemState(p.items[id]);
        if (next === null) delete state.items[id];
        else state.items[id] = Object.assign({}, state.items[id], next);
      });
    }
    if ('next' in p) state.next = items.some(item => item.id === p.next) ? p.next : null;
    renderNav();
    return getState();
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function reset() {
    state = { items: {}, next: null };
    renderNav();
  }

  // ─── Çizim ────────────────────────────────────────────────────────────────
  const roleLabel = role === 'danisman' ? 'Danışman' : 'Aday';
  host.className = 'shared-sidebar';
  host.dataset.shared = 'true';
  host.dataset.role = role;
  host.setAttribute('aria-label', role === 'danisman' ? 'Danışman menüsü' : 'Aday menüsü');
  host.innerHTML =
    '<div class="sidebar-panel">' +
      `<a class="sidebar-brand" href="${role === 'danisman' ? '/guru/danisanlar' : '/panel'}" data-nav-skip>Interview Demo</a>` +
      '<nav class="sidebar-nav" aria-label="Ana menü"></nav>' +
      '<div class="sidebar-footer">' +
        '<div class="sidebar-user">' +
          '<span class="sidebar-avatar" aria-hidden="true"></span>' +
          `<span class="sidebar-user-details"><span class="sidebar-user-name"></span><span class="sidebar-user-role">${roleLabel}</span></span>` +
        '</div>' +
        '<button type="button" class="sidebar-link sidebar-logout" data-logout data-nav-skip>' +
          `<span class="sidebar-link-label">${icon('logout', 'sidebar-icon')}<span>Çıkış yap</span></span>` +
        '</button>' +
      '</div>' +
    '</div>';
  renderNav();
  refreshUser();

  // Kilitli öğe gezinmez (href yok; klavye ve fare için ayrıca engellenir).
  host.addEventListener('click', event => {
    const locked = event.target.closest && event.target.closest('.sidebar-link[aria-disabled="true"]');
    if (locked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const main = document.querySelector('main');
  if (main) {
    const layout = host.parentElement;
    if (layout && layout !== document.body && layout !== main) {
      layout.classList.add('sidebar-content-grid');
    } else if (layout === main) {
      main.classList.add('sidebar-content-grid');
    }
  }
  document.body.classList.add('shared-sidebar-page', 'sidebar-role-' + role);
  document.body.insertBefore(host, document.body.firstChild);

  // ─── Mobil çekmece (K84, QA-013) ────────────────────────────────────────────
  if (!host.id) host.id = 'sidebar';
  const toggle = el('button', 'sidebar-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', host.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Menüyü aç');
  toggle.setAttribute('data-nav-skip', '');
  toggle.innerHTML = icon('menu');
  host.insertAdjacentElement('afterend', toggle);

  const drawerMedia = window.matchMedia ? window.matchMedia(DRAWER_QUERY) : null;
  const isDrawer = () => !!(drawerMedia && drawerMedia.matches);

  function setOpen(open, options) {
    const value = !!open && isDrawer();
    document.body.classList.toggle('sidebar-open', value);
    toggle.setAttribute('aria-expanded', String(value));
    toggle.setAttribute('aria-label', value ? 'Menüyü kapat' : 'Menüyü aç');
    toggle.innerHTML = icon(value ? 'close' : 'menu');
    if (options && options.focus === false) return;
    if (value) host.querySelector('a[href], button')?.focus();
    else if (open === false && document.activeElement && host.contains(document.activeElement)) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', event => {
    if (!document.body.classList.contains('sidebar-open')) return;
    // composedPath: ☰ simgesi tıklamada yeniden çizildiği için hedef düğümden kopmuş olabilir.
    const path = event.composedPath ? event.composedPath() : [event.target];
    if (path.includes(toggle)) return;
    if (path.includes(host) && !path.some(node => node instanceof Element && node.matches('a[href]'))) return;
    setOpen(false, { focus: false });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  const onMediaChange = () => { if (!isDrawer()) setOpen(false, { focus: false }); };
  if (drawerMedia?.addEventListener) drawerMedia.addEventListener('change', onMediaChange);
  else if (drawerMedia?.addListener) drawerMedia.addListener(onMediaChange);

  document.addEventListener('session:ready', refreshUser);

  const api = {
    role,
    element: host,
    setState,
    getState,
    reset,
    refreshUser,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(toggle.getAttribute('aria-expanded') !== 'true')
  };
  window.Sidebar = Object.freeze(api);
  document.dispatchEvent(new CustomEvent('sidebar:ready', { detail: window.Sidebar }));
})();
