(function () {
  const iconPaths = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    expand_more: '<path d="m6 9 6 6 6-6"/>'
  };

  function svgIcon(name, className) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('site-header-icon');
    if (className) svg.classList.add(className);
    svg.innerHTML = iconPaths[name];
    return svg;
  }

  function getCurrentSession() {
    if (typeof window.getSession === 'function') return window.getSession();
    console.error('Ortak üst bar için getSession() oturum yardımcısı yüklenemedi.');
    return { role: null, name: '', state: null };
  }

  function link(label, href, className) {
    const anchor = document.createElement('a');
    anchor.className = className;
    anchor.href = href;
    anchor.textContent = label;
    return anchor;
  }

  function renderSiteHeader(options) {
    const config = options || {};
    const host = document.getElementById('site-header');
    if (!host) {
      console.error('Ortak üst bar için #site-header yer tutucusu bulunamadı.');
      return;
    }

    const page = window.Routes.page();
    const isIndex = page === '/';
    const compact = config.variant === 'compact';
    const menuEnabled = config.menu !== false;
    const returnTarget = window.safeReturnPath?.(new URLSearchParams(location.search).get('return'));
    const session = getCurrentSession();
    document.body.classList.add('has-site-header');
    const header = document.createElement('header');
    header.className = compact ? 'site-header site-header--compact' : 'site-header';
    header.dataset.sessionRole = session.role || '';
    lastConfig = Object.assign({}, config, { backLabel: undefined, backHref: undefined });
    header.setAttribute('aria-label', 'Site üst menüsü');

    const inner = document.createElement('div');
    inner.className = 'site-header-inner';
    const brand = link('Interview Demo', '/', 'site-header-brand');
    brand.setAttribute('aria-label', 'Ana sayfaya dön');
    inner.appendChild(brand);

    const toggle = document.createElement('button');
    toggle.className = 'site-header-toggle';
    toggle.hidden = true;   // görünürlüğü aşağıda setMenuOpen belirler (yalnız mobil)
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Menüyü aç');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'site-header-panel');
    const toggleIcon = svgIcon('menu', 'site-header-toggle-icon');
    toggle.appendChild(toggleIcon);
    inner.appendChild(toggle);

    const panel = document.createElement('div');
    panel.className = compact ? 'site-header-panel site-header-panel--compact' : 'site-header-panel';
    panel.id = 'site-header-panel';

    if (menuEnabled) {
      const navigation = document.createElement('nav');
      navigation.className = 'site-header-nav';
      navigation.setAttribute('aria-label', 'Ana gezinme');
      const navItems = [
        ['Nasıl çalışır', 'nasil-calisir'],
        ['Danışmanlar', 'danismanlar'],
        ['Hizmetler', 'hizmetler'],
        ['SSS', 'sss']
      ];
      navItems.forEach(([label, target]) => {
        const href = target === 'danismanlar'
          ? '/danismanlar'
          : isIndex ? '#' + target : '/#' + target;
        const item = link(label, href, 'site-header-nav-link');
        if ((target === 'danismanlar' && (page === '/danismanlar' || page === '/danisman')) ||
            (isIndex && location.hash === '#' + target)) {
          item.setAttribute('aria-current', 'page');
        }
        navigation.appendChild(item);
      });
      panel.appendChild(navigation);
      if (isIndex && 'IntersectionObserver' in window) {
        const navLinks = Array.from(navigation.querySelectorAll('a'));
        const observer = new IntersectionObserver(entries => {
          const current = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (!current) return;
          navLinks.filter(item => item.hash).forEach(item => {
            if (item.hash === '#' + current.target.id) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
          });
        }, { rootMargin: '-64px 0px -65% 0px', threshold: 0 });
        navLinks.filter(item => item.hash).forEach(item => {
          const target = document.querySelector(item.hash);
          if (target) observer.observe(target);
        });
      }
    }

    const actions = document.createElement('div');
    actions.className = 'site-header-actions';
    if (!session.role) {
      if (page === '/giris') {
        const href = returnTarget ? '/kayit?return=' + encodeURIComponent(returnTarget) : '/kayit';
        actions.appendChild(link('Hesap oluştur', href, 'site-header-button site-header-button--primary btn-header-primary'));
      } else if (page === '/kayit') {
        const href = returnTarget ? '/giris?return=' + encodeURIComponent(returnTarget) : '/giris';
        actions.appendChild(link('Giriş yap', href, 'site-header-button site-header-button--secondary btn-header-secondary'));
      } else {
        actions.append(
          link('Giriş yap', '/giris', 'site-header-button site-header-button--secondary btn-header-secondary'),
          link('Kayıt ol', '/kayit', 'site-header-button site-header-button--primary btn-header-primary')
        );
      }
    } else {
      const isAdvisor = session.role === 'danisman';
      const homeHref = isAdvisor ? '/guru/danisanlar' : '/panel';
      // "Ana ekrana git / Panele git" düğmesi kaldırıldı: aynı bağlantı profil menüsünde ("Panelim").

      const user = document.createElement('div');
      user.className = 'site-header-user';
      // İsim /auth/me önbelleğinden (gate.js getSession); sabit demo isimleri kaldırıldı (GAP-D06).
      const name = String(session.name || session.ad || '');
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
        .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
      const trigger = document.createElement('button');
      trigger.className = 'site-header-user-trigger';
      trigger.type = 'button';
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', 'site-header-user-menu');
      trigger.setAttribute('aria-label', 'Profil menüsünü aç');
      const avatar = document.createElement('span');
      avatar.className = 'site-header-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = initials;
      const userName = document.createElement('span');
      userName.className = 'site-header-user-name';
      userName.textContent = name;
      const chevron = svgIcon('expand_more', 'site-header-chevron');
      trigger.append(avatar, userName, chevron);

      const menu = document.createElement('div');
      menu.className = 'site-header-user-menu';
      menu.id = 'site-header-user-menu';
      menu.setAttribute('role', 'menu');
      menu.hidden = true;
      const panelLink = link('Panelim', homeHref, '');
      panelLink.setAttribute('role', 'menuitem');
      const sessionsLink = link('Seanslarım', isAdvisor ? '/guru/seanslar' : '/seanslar', '');
      sessionsLink.setAttribute('role', 'menuitem');
      const profileLink = link('Profilim', isAdvisor ? '/guru/profil' : '/profil', '');
      profileLink.setAttribute('role', 'menuitem');
      const logoutLink = link('Çıkış yap', '/', '');
      logoutLink.setAttribute('role', 'menuitem');
      logoutLink.addEventListener('click', event => {
        event.preventDefault();
        if (typeof window.logout === 'function') {
          window.logout();
        } else {
          console.error('Oturumu kapatmak için ortak logout() yardımcısı yüklenemedi.');
        }
      });
      menu.append(panelLink, sessionsLink, profileLink, logoutLink);
      trigger.addEventListener('click', event => {
        const open = trigger.getAttribute('aria-expanded') !== 'true';
        trigger.setAttribute('aria-expanded', String(open));
        trigger.setAttribute('aria-label', open ? 'Profil menüsünü kapat' : 'Profil menüsünü aç');
        menu.hidden = !open;
        if (open && event.detail === 0) panelLink.focus();
      });
      user.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !menu.hidden) {
          event.preventDefault();
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
          trigger.setAttribute('aria-label', 'Profil menüsünü aç');
          trigger.focus();
          return;
        }
        if (!menu.hidden && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
          const currentIndex = items.indexOf(document.activeElement);
          const nextIndex = event.key === 'Home' ? 0
            : event.key === 'End' ? items.length - 1
              : event.key === 'ArrowDown' ? (currentIndex + 1 + items.length) % items.length
                : (currentIndex - 1 + items.length) % items.length;
          event.preventDefault();
          items[nextIndex]?.focus();
        }
      });
      user.addEventListener('focusout', event => {
        if (!user.contains(event.relatedTarget) && !menu.hidden) {
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
          trigger.setAttribute('aria-label', 'Profil menüsünü aç');
        }
      });
      document.addEventListener('click', event => {
        if (!user.contains(event.target) && !menu.hidden) {
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
          trigger.setAttribute('aria-label', 'Profil menüsünü aç');
        }
      });
      user.append(trigger, menu);
      actions.appendChild(user);
    }
    panel.appendChild(actions);
    inner.appendChild(panel);
    header.appendChild(inner);
    host.replaceWith(header);

    if (!menuEnabled) {
      if (config.backLabel && config.backHref) {
        const back = link(config.backLabel, config.backHref, 'site-header-back site-header-back--form');
        back.setAttribute('aria-label', config.backLabel.replace(/^←\s*/, ''));
        const authCardStack = document.getElementById('auth-card-stack');
        const registrationContent = authCardStack || document.querySelector('main .max-w-\\[440px\\]');
        if (registrationContent) {
          registrationContent.insertBefore(back, registrationContent.firstChild);
        } else {
          console.error('Geri bağlantısı için kayıt/giriş içerik alanı bulunamadı.');
        }
      }
      // QA-025: menüsüz başlıkta da (ör. odeme-ok) oturum eylemleri ("Ana ekrana git", kullanıcı menüsü) varsa
      // mobilde ☰ + kapalı panel kullanılır; aksi hâlde açık panel yapışkan başlığın altında içeriği örtüyordu.
      if (!actions.childElementCount) return;
    }

    const mobile = window.matchMedia('(max-width: 767px)');
    function setMenuOpen(open, restoreFocus) {
      const shouldOpen = mobile.matches && open;
      panel.hidden = mobile.matches && !shouldOpen;
      toggle.setAttribute('aria-expanded', String(shouldOpen));
      toggle.setAttribute('aria-label', shouldOpen ? 'Menüyü kapat' : 'Menüyü aç');
      toggleIcon.innerHTML = iconPaths[shouldOpen ? 'close' : 'menu'];
      toggle.hidden = !mobile.matches;
      if (restoreFocus) toggle.focus();
    }

    setMenuOpen(false, false);
    toggle.addEventListener('click', () => {
      setMenuOpen(panel.hidden, false);
      if (!panel.hidden) panel.querySelector('a')?.focus();
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        setMenuOpen(false, true);
      }
    });
    panel.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', () => {
        if (mobile.matches) setMenuOpen(false, false);
      });
    });
    document.addEventListener('click', event => {
      if (mobile.matches && !panel.hidden && !event.composedPath().includes(header)) {
        setMenuOpen(false, false);
      }
    });
    mobile.addEventListener('change', () => setMenuOpen(false, false));

    if (menuEnabled && config.backLabel && config.backHref) {
      const back = link(config.backLabel, config.backHref, 'site-header-back');
      back.setAttribute('aria-label', config.backLabel.replace(/^←\s*/, ''));
      const authCardStack = document.getElementById('auth-card-stack');
      if (authCardStack) {
        back.classList.add('site-header-back--form');
        authCardStack.insertBefore(back, authCardStack.firstChild);
      } else {
        const main = document.querySelector('main');
        if (!main) {
          console.error('Geri bağlantısı için ana içerik alanı bulunamadı.');
        } else {
          main.insertBefore(back, main.firstChild);
        }
      }
    }
  }

  window.renderSiteHeader = renderSiteHeader;

  // /auth/me doğrulaması bittiğinde: rol değiştiyse (ör. geçersiz token temizlendi) üst barı
  // yeniden kur; aynı rolse yalnız adı/baş harfleri tazele.
  let lastConfig = null;
  document.addEventListener('session:ready', event => {
    const header = document.querySelector('header.site-header');
    if (!header || !lastConfig) return;
    const session = event.detail || getCurrentSession();
    if ((session.role || '') !== header.dataset.sessionRole) {
      const host = document.createElement('div');
      host.id = 'site-header';
      header.replaceWith(host);
      renderSiteHeader(lastConfig);
      return;
    }
    const name = String(session.name || '');
    if (!name) return;
    const nameNode = header.querySelector('.site-header-user-name');
    const avatar = header.querySelector('.site-header-avatar');
    if (nameNode) nameNode.textContent = name;
    if (avatar) avatar.textContent = name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  });

  function initializeSiteHeader() {
    let host = document.getElementById('site-header');
    if (!host) {
      const previousHeader = document.querySelector('body > header');
      if (!previousHeader) {
        console.error('Ortak üst bar için #site-header yer tutucusu bulunamadı.');
        return;
      }
      host = document.createElement('div');
      host.id = 'site-header';
      previousHeader.replaceWith(host);
      const page = window.Routes.page();
      if (page === '/hizmet' || page === '/siparis') host.dataset.variant = 'compact';
      if (['/giris', '/kayit', '/kayit/eposta'].includes(page)) host.dataset.variant = 'compact';
      if (page === '/danismanlar') {
        host.dataset.backLabel = '← Geri';
        host.dataset.backHref = '/';
      } else if (page === '/danisman') {
        host.dataset.backLabel = '← Danışmanlar';
        host.dataset.backHref = '/danismanlar';
      }
      document.body.classList.add('has-site-header');
    }
    renderSiteHeader({
      variant: host.dataset.variant || 'full',
      menu: host.dataset.menu !== 'false',
      backLabel: host.dataset.backLabel || (['/giris', '/kayit', '/kayit/eposta'].includes(window.Routes.page())
        ? '← Ana sayfaya dön'
        : undefined),
      backHref: host.dataset.backHref || (['/giris', '/kayit', '/kayit/eposta'].includes(window.Routes.page())
        ? '/'
        : undefined)
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSiteHeader, { once: true });
  } else {
    initializeSiteHeader();
  }
})();
