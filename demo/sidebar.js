(function () {
  'use strict';

  const host = document.getElementById('sidebar');
  if (!host) return;

  const page = location.pathname.split('/').pop() || 'ana.html';
  const role = host.dataset.role || (page.startsWith('guru-') ? 'danisman' : 'aday');
  const activeOverride = host.dataset.active;

  const candidateItems = [
    { id: 'ana', label: 'Ana Ekran', icon: 'home', href: 'ana.html', pages: ['ana.html', 'ciktilar.html'] },
    { id: 'profil', label: 'Profilim', icon: 'person', href: 'profil.html', pages: ['profil.html'] },
    { id: 'cv', label: "CV'm", icon: 'description', href: 'cv.html', pages: ['cv.html'] },
    { id: 'seanslar', label: 'Seanslarım', icon: 'calendar_month', href: 'seanslar.html', pages: ['seanslar.html', 'randevu-on.html', 'randevu-ok.html', 'seans-notlari.html', 'seans2-ok.html', 'takvim.html'] },
    { id: 'hikaye', label: 'Hikâyem', icon: 'auto_stories', href: 'hikaye-giris.html', pages: ['hikaye-giris.html', 'hikaye-yukle.html', 'soru1.html', 'soru2.html', 'soru3.html', 'soru4.html', 'soru5.html'] },
    { id: 'odevler', label: 'Ödevlerim', icon: 'assignment', href: 'odevler.html', pages: ['odevler.html', 'odev-goruntule.html', 'odev-teslim.html'], locked: true }
  ];

  const advisorItems = [
    { id: 'danisanlar', label: 'Danışanlarım', icon: 'group', href: 'guru-danisanlar.html', pages: ['guru-danisanlar.html', 'guru-danisan-detay.html', 'guru-hikaye.html', 'guru-notlar.html', 'guru-odevler.html'] },
    { id: 'musaitlik', label: 'Müsaitlik', icon: 'event_available', href: 'guru-musaitlik.html', pages: ['guru-musaitlik.html', 'guru-musaitlik-ekle.html'] },
    { id: 'seanslar', label: 'Seanslarım', icon: 'calendar_month', href: 'guru-seanslar.html', pages: ['guru-seanslar.html'] },
    { id: 'profil', label: 'Profilim', icon: 'person', href: 'guru-profil.html', pages: ['guru-profil.html'] }
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
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>'
  };

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Yan menü durumu okunamadı (${key}).`, error);
      return null;
    }
  }

  function hasAssignedHomework() {
    for (const key of ['guruElifTasks', 'demoOdevler']) {
      const value = readStorage(key);
      if (!value) continue;
      try {
        const tasks = JSON.parse(value);
        if (Array.isArray(tasks) && tasks.length > 0) return true;
      } catch (error) {
        console.error(`Yan menü ödev durumu çözümlenemedi (${key}).`, error);
      }
    }
    return false;
  }

  function getDisplayName() {
    const sessionName = window.getSession?.()?.name;
    if (typeof sessionName === 'string' && sessionName.trim()) return sessionName.trim();
    if (role === 'danisman') {
      const profile = readStorage('guruProfile');
      if (profile) {
        try {
          const parsed = JSON.parse(profile);
          if (typeof parsed.name === 'string' && parsed.name.trim()) return parsed.name.trim();
        } catch (error) {
          console.error('Danışman adı yan menüde gösterilemedi.', error);
        }
      }
      return 'Selin Arslan';
    }
    return 'Elif Yılmaz';
  }

  function icon(name, extraClass) {
    return `<svg class="sidebar-svg ${extraClass || ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
  }

  function getStatuses() {
    const profile = readStorage('demoProfilTamamlandi');
    const cv = readStorage('demoCvOnaylandi');
    const firstSession = readStorage('demoIlkSeansTamamlandi');
    return {
      profileComplete: profile === null || profile === 'true',
      cvComplete: cv === null || cv === 'true',
      storyNext: firstSession === null || firstSession === 'true',
      homeworkAssigned: hasAssignedHomework()
    };
  }

  const status = getStatuses();
  const items = role === 'danisman' ? advisorItems : candidateItems;
  const activeItem = items.find(item =>
    activeOverride ? item.id === activeOverride : item.pages.includes(page)
  );
  const currentUser = getDisplayName();
  const initials = currentUser.split(/\s+/).slice(0, 2)
    .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');

  const menu = items.map(item => {
    const active = activeItem === item;
    const locked = role === 'aday' && item.id === 'odevler' &&
      !status.homeworkAssigned && !active;
    let state = '';

    if (active) {
      state = `<span class="sidebar-state">${icon('chevron_right')}</span>`;
    } else if (role === 'aday' && item.id === 'profil' && status.profileComplete) {
      state = `<span class="sidebar-state">${icon('check_circle')}</span>`;
    } else if (role === 'aday' && item.id === 'cv' && status.cvComplete) {
      state = `<span class="sidebar-state">${icon('check_circle')}</span>`;
    } else if (role === 'aday' && item.id === 'hikaye' && status.storyNext) {
      state = '<span class="sidebar-badge">Sıradaki</span>';
    } else if (locked) {
      state = `<span class="sidebar-state">${icon('lock')}</span>`;
    }

    const link = `<a class="sidebar-link${active ? ' is-active' : ''}${locked ? ' sidebar-locked' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''}${locked ? ' aria-disabled="true"' : ''} data-sidebar-item="${item.id}"><span class="sidebar-link-label">${icon(item.icon, 'sidebar-icon')}<span>${item.label}</span></span>${state}</a>`;
    const help = locked ? '<p class="sidebar-locked-copy">Danışmanın ödev verince açılır</p>' : '';
    return link + help;
  }).join('');

  host.className = 'shared-sidebar';
  host.dataset.shared = 'true';
  host.setAttribute('aria-label', role === 'danisman' ? 'Danışman menüsü' : 'Aday menüsü');
  host.innerHTML = `<div class="sidebar-panel"><a class="sidebar-brand" href="${role === 'danisman' ? 'guru-danisanlar.html' : 'ana.html'}">Interview Demo</a><nav class="sidebar-nav" aria-label="Ana menü">${menu}</nav><div class="sidebar-user"><span class="sidebar-avatar" aria-hidden="true"></span><span class="sidebar-user-details"><span class="sidebar-user-name"></span><span class="sidebar-user-role">${role === 'danisman' ? 'Danışman' : 'Aday'}</span></span></div></div>`;
  host.querySelector('.sidebar-avatar').textContent = initials;
  host.querySelector('.sidebar-user-name').textContent = currentUser;

  const main = document.querySelector('main');
  if (main) {
    const layout = host.parentElement;
    if (layout && layout !== document.body && layout !== main) {
      layout.classList.add('sidebar-content-grid');
    } else if (layout === main) {
      main.classList.add('sidebar-content-grid');
    }
    document.body.classList.add('shared-sidebar-page');
    document.body.insertBefore(host, document.body.firstChild);
  }
})();
