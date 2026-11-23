// danisman.js — Public danışman profili (/danisman?id=<guru_profiles.id>). Sahibi: 82 Aday Onboarding UI Agent.
// Veri: GET /public/gurus/{id} (Advisors.get), benzer danışmanlar GET /public/gurus (Advisors.list),
// seans bilgileri aktif hizmetten GET /public/services (fiyat kuralı, seans sayısı/süresi; K53/K54),
// aday için "kaydın var mı" GET /candidate/enrollments; guru önizlemesi (?onizleme=1) GET /guru/profile.
// K52: yalnız backend alanları (ad, unvan, uzmanlık, kıdem, kısa tanıtım, sektörler). Karşılığı olmayan
// bölümler (deneyim/eğitim listesi, sertifika, yaklaşım, SSS, yorumlar, puan, "doğrulanmış" rozeti,
// müsait saat önizlemesi — GAP-B02/B03/B19) gösterilmez.
// Kaldırılan demo davranışı: getAdvisor()/listAdvisors() sahte verisi, demoMusaitlik slotları,
// danışman başına ücret, 'selin-arslan' sahiplik kontrolü.
(function () {
  'use strict';
  const Api = window.Api;
  const main = document.getElementById('advisor-profile');
  if (!Api || !window.Advisors || !main) {
    console.error('Danışman profili başlatılamadı.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const advisorId = params.get('id');
  const flow = params.get('akis') === 'hikaye' ? 'hikaye' : null;
  const checkoutFlow = params.get('from') === 'checkout';
  const requestedService = params.get('service');
  const previewRequested = params.get('onizleme') === '1';

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function checkoutSelectionHref(advisor) {
    const selection = { serviceId: requestedService, guruId: advisor.id };
    return window.Selection ? window.Selection.href('/hizmet', selection) : '/hizmet?guru=' + encodeURIComponent(advisor.id);
  }

  function arrowLink(className, label, href) {
    const link = node('a', className, label);
    link.href = href;
    const icon = node('span', 'material-symbols-outlined', 'arrow_forward');
    icon.setAttribute('aria-hidden', 'true');
    link.appendChild(icon);
    return link;
  }

  function ctaElements(advisor, cta) {
    const items = [];
    if (cta.checkoutSelection) {
      const link = arrowLink('public-advisor-booking', 'Bu danışmanı seç', checkoutSelectionHref(advisor));
      link.setAttribute('aria-label', advisor.ad + ' danışmanını seç ve hizmet seçimine dön');
      items.push(link);
      return items;
    }
    if (cta.hidden) return items;
    if (cta.mode === 'browse') {
      const storyLink = node('a', 'public-advisor-directory-cta', cta.label);
      storyLink.href = cta.href;
      items.push(storyLink);
      return items;
    }
    if (cta.disabled) {
      const button = node('button', 'public-advisor-booking', cta.label);
      button.type = 'button';
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.title = cta.title || '';
      items.push(button);
    } else {
      items.push(arrowLink('public-advisor-booking', cta.label, cta.href));
    }
    if (cta.loginHref) {
      const login = node('a', 'public-advisor-login-link', 'Hesabın var mı? Giriş yap');
      login.href = cta.loginHref;
      items.push(login);
    }
    return items;
  }

  function renderSimilar(advisor, others) {
    const ranked = others.filter(candidate => candidate.id !== advisor.id).map((candidate, index) => ({
      advisor: candidate,
      overlap: candidate.sektorKodlari.filter(code => advisor.sektorKodlari.includes(code)).length,
      index
    })).sort((a, b) => b.overlap - a.overlap || a.index - b.index).slice(0, 3);
    if (!ranked.length) return null;
    const wrapper = node('section', 'public-advisor-similar');
    const heading = node('div', 'public-advisor-similar-heading');
    heading.append(node('h2', '', 'Benzer danışmanlar'));
    const allLink = node('a', '', 'Tüm Danışmanları Gör →');
    allLink.href = '/danismanlar' + (flow === 'hikaye' ? '?akis=hikaye' : '');
    heading.appendChild(allLink);
    const grid = node('div', 'public-advisor-similar-grid');
    ranked.forEach(entry => {
      const other = entry.advisor;
      const card = node('a', 'public-advisor-similar-card');
      const query = new URLSearchParams({ id: other.id });
      if (flow === 'hikaye') query.set('akis', 'hikaye');
      if (checkoutFlow) {
        query.set('from', 'checkout');
        if (requestedService) query.set('service', requestedService);
      }
      card.href = '/danisman?' + query.toString();
      const avatar = node('span', 'public-advisor-similar-avatar', Api.format.initials(other.ad));
      avatar.setAttribute('aria-hidden', 'true');
      avatar.dataset.avatarName = other.ad;
      if (other.avatarUrl) avatar.dataset.avatarUrl = other.avatarUrl;
      const content = node('span', 'public-advisor-similar-content');
      content.append(node('strong', '', other.ad), node('span', '', other.unvan), node('small', '', other.sektorler.slice(0, 2).join(' · ')));
      card.append(avatar, content);
      grid.appendChild(card);
    });
    wrapper.append(heading, grid);
    return wrapper;
  }

  // Profil akışı (ders platformu profil sayfası düzeni): üst kimlik şeridi + ana eylem, istatistik şeridi,
  // tanıtım kartı (meta, başlık, açılır metin, monogram karo, sektör etiketleri), hizmet kartı (seans
  // şablonları + toplam fiyat), saat seçimi bilgisi, gezinti izi ve benzer danışmanlar.
  function seniorityYears(value) {
    const match = /(\d+)/.exec(String(value || ''));
    return match ? Number(match[1]) : 0;
  }
  function priceText(service) {
    if (!service || !service.price) return '';
    return Number(service.price.amount_minor) === 0 ? 'Ücretsiz' : Api.format.money(service.price.amount_minor, service.price.currency);
  }
  function makeAvatar(advisor, className) {
    const avatar = node('div', className, Api.format.initials(advisor.ad));
    avatar.setAttribute('aria-hidden', 'true');
    // K83: fotoğraf varsa <img>, yoksa baş harfler — avatar.js çizer.
    avatar.dataset.avatarName = advisor.ad;
    if (advisor.avatarUrl) avatar.dataset.avatarUrl = advisor.avatarUrl;
    return avatar;
  }

  function render(advisor, options) {
    const o = options || {};
    document.title = advisor.ad + ' · Danışman profili';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = advisor.ad + ' · ' + advisor.unvan + ' danışman profili.';
    main.replaceChildren();
    main.classList.add('ap-page');
    const years = seniorityYears(advisor.kidem);
    const service = o.service;

    // 1) Üst kimlik şeridi
    const top = node('section', 'ap-top');
    top.setAttribute('aria-labelledby', 'ap-name');
    const topInner = node('div', 'ap-wrap ap-top-inner');
    const who = node('div', 'ap-who');
    const nameRow = node('div', 'ap-name-row');
    const h1 = node('h1', 'ap-name', advisor.ad);
    h1.id = 'ap-name';
    nameRow.append(h1);
    if (advisor.unvan) nameRow.append(node('span', 'ap-badge', advisor.unvan));
    who.append(nameRow);
    if (advisor.sektorler.length) {
      const line = node('p', 'ap-sectors');
      advisor.sektorler.forEach((sector, index) => {
        if (index) line.append(node('span', 'ap-dot', '·'));
        line.append(node('span', '', sector));
      });
      who.append(line);
    }
    if (advisor.uzmanlikAlani) {
      const focus = node('p', 'ap-focus');
      focus.append(node('span', 'ap-focus-mark', ''), document.createTextNode(advisor.uzmanlikAlani));
      who.append(focus);
    }
    const actions = node('div', 'ap-top-actions');
    if (!o.previewMode) ctaElements(advisor, o.cta).forEach(element => actions.appendChild(element));
    else actions.appendChild(node('p', 'public-advisor-advisor-note', 'Önizleme modunda randevu alınamaz.'));
    topInner.append(makeAvatar(advisor, 'ap-avatar'), who, actions);
    top.appendChild(topInner);
    main.appendChild(top);

    // 2) İstatistik şeridi
    const stats = node('section', 'ap-stats');
    stats.setAttribute('aria-label', 'Özet');
    const statsInner = node('div', 'ap-wrap ap-stats-inner');
    const stat = (value, label, icon) => {
      const item = node('div', 'ap-stat');
      const symbol = node('span', 'material-symbols-outlined ap-stat-icon', icon);
      symbol.setAttribute('aria-hidden', 'true');
      const text = node('div');
      text.append(node('strong', '', value), node('span', '', label));
      item.append(symbol, text);
      statsInner.appendChild(item);
    };
    if (years) stat(years + ' yıl', 'Deneyim', 'workspace_premium');
    else if (advisor.kidem) stat(advisor.kidem, 'Deneyim', 'workspace_premium');
    if (service) stat(service.session_count + ' seans', 'Her seans ' + service.session_duration_minutes + ' dk', 'event');
    if (advisor.sektorler.length) stat(advisor.sektorler.length + ' sektör', advisor.sektorler.slice(0, 2).join(', '), 'domain');
    if (advisor.diller && advisor.diller.length) stat(advisor.diller.join(' · '), 'Seans dili', 'translate');
    stats.appendChild(statsInner);
    main.appendChild(stats);

    const body = node('div', 'ap-wrap ap-body');
    if (o.ownerInactive) body.appendChild(node('p', 'public-advisor-owner-status', 'Bu profil şu an yayında değil. Ziyaretçiler profili göremez.'));

    // 3) Tanıtım kartı
    const intro = node('section', 'ap-panel ap-intro');
    intro.setAttribute('aria-labelledby', 'ap-intro-title');
    const introText = node('div', 'ap-intro-text');
    const meta = node('ul', 'ap-meta');
    if (advisor.kidem) meta.appendChild(node('li', '', advisor.kidem));
    if (advisor.sektorler.length) meta.appendChild(node('li', '', advisor.sektorler.join(', ') + ' sektörlerinde'));
    if (meta.childElementCount) introText.appendChild(meta);
    const headline = node('h2', 'ap-headline', [advisor.unvan, advisor.uzmanlikAlani].filter(Boolean).join(' | '));
    headline.id = 'ap-intro-title';
    introText.appendChild(headline);
    if (advisor.kisaTanitim) {
      const bio = node('p', 'ap-bio', advisor.kisaTanitim);
      bio.id = 'ap-bio';
      introText.appendChild(bio);
      const more = node('button', 'ap-more', 'Devamını oku');
      more.type = 'button';
      more.setAttribute('aria-controls', 'ap-bio');
      more.setAttribute('aria-expanded', 'false');
      more.setAttribute('data-nav-skip', '');
      more.addEventListener('click', () => {
        const open = !bio.classList.contains('is-open');
        bio.classList.toggle('is-open', open);
        more.setAttribute('aria-expanded', String(open));
        more.textContent = open ? 'Daha az göster' : 'Devamını oku';
      });
      introText.appendChild(more);
      requestAnimationFrame(() => { if (bio.scrollHeight <= bio.clientHeight + 2) more.hidden = true; });
    }
    const tile = node('div', 'ap-tile');
    tile.setAttribute('aria-hidden', 'true');
    tile.append(makeAvatar(advisor, 'ap-tile-mono'), node('span', 'ap-tile-caption', service ? 'Birebir · ' + service.session_duration_minutes + ' dk' : 'Birebir seans'));
    const introTop = node('div', 'ap-intro-top');
    introTop.append(introText, tile);
    intro.appendChild(introTop);
    const expertiseItems = String(advisor.uzmanlikAlani || '').split(/[,;]/).map(item => item.trim()).filter(Boolean);
    if (advisor.sektorler.length || expertiseItems.length) {
      const foot = node('div', 'ap-intro-foot');
      foot.append(node('span', 'ap-foot-label', 'Alanlar'));
      const chips = node('ul', 'ap-chips');
      chips.setAttribute('aria-label', 'Sektörler ve uzmanlık');
      advisor.sektorler.concat(expertiseItems).forEach(item => chips.appendChild(node('li', '', item)));
      foot.appendChild(chips);
      intro.appendChild(foot);
    }
    body.appendChild(intro);

    // 3b) Rapor V1 profil bölümleri — yalnız veri varsa görünür.
    const bio = advisor.biyografi || {};
    if (bio.tr || bio.en) {
      const about = node('section', 'ap-panel ap-about');
      about.setAttribute('aria-labelledby', 'ap-about-title');
      const head = node('div', 'ap-panel-head');
      const title = node('h2', 'ap-panel-title', 'Hakkında');
      title.id = 'ap-about-title';
      head.appendChild(title);
      const text = node('div', 'ap-about-text');
      const langs = [['tr', 'Türkçe'], ['en', 'English']].filter(([code]) => bio[code]);
      const show = code => {
        text.replaceChildren(...bio[code].split(/\n{2,}/).map(part => node('p', '', part)));
        text.lang = code;
        head.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === code)));
      };
      if (langs.length > 1) {
        const toggle = node('div', 'ap-lang-toggle');
        toggle.setAttribute('role', 'group');
        toggle.setAttribute('aria-label', 'Biyografi dili');
        langs.forEach(([code, label]) => {
          const button = node('button', '', label);
          button.type = 'button';
          button.dataset.lang = code;
          button.setAttribute('data-nav-skip', '');
          button.addEventListener('click', () => show(code));
          toggle.appendChild(button);
        });
        head.appendChild(toggle);
      }
      about.append(head, text);
      show(langs[0][0]);
      body.appendChild(about);
    }

    if ((advisor.hedefKitleler && advisor.hedefKitleler.length) || (advisor.diller && advisor.diller.length) || advisor.ulke) {
      const scope = node('section', 'ap-panel ap-scope');
      scope.setAttribute('aria-labelledby', 'ap-scope-title');
      const title = node('h2', 'ap-panel-title', 'Kimlere hizmet veriyor');
      title.id = 'ap-scope-title';
      const grid = node('dl', 'ap-scope-grid');
      const row = (label, items) => {
        if (!items || !items.length) return;
        const item = node('div', 'ap-scope-item');
        const dd = node('dd');
        items.forEach(value => dd.appendChild(node('span', 'ap-scope-chip', value)));
        item.append(node('dt', '', label), dd);
        grid.appendChild(item);
      };
      row('Hedef kitle', advisor.hedefKitleler);
      row('Hizmet', service ? [service.name] : []);
      row('Seans dili', advisor.diller);
      row('Ülke', advisor.ulke ? [advisor.ulke] : []);
      scope.append(title, grid);
      body.appendChild(scope);
    }

    if (advisor.kariyer && advisor.kariyer.length) {
      const career = node('section', 'ap-panel ap-career');
      career.setAttribute('aria-labelledby', 'ap-career-title');
      const title = node('h2', 'ap-panel-title', 'Kariyer geçmişi');
      title.id = 'ap-career-title';
      const list = node('ol', 'ap-timeline');
      advisor.kariyer.slice().sort((a, b) => (b.start || 0) - (a.start || 0)).forEach(item => {
        const li = node('li', 'ap-timeline-item');
        li.append(
          node('span', 'ap-timeline-years', (item.start || '') + ' – ' + (item.end || 'Günümüz')),
          node('strong', '', item.role || ''),
          node('span', 'ap-timeline-org', item.org || '')
        );
        list.appendChild(li);
      });
      career.append(title, list);
      body.appendChild(career);
    }

    if (advisor.belgeler && advisor.belgeler.length) {
      const docs = node('section', 'ap-panel ap-docs');
      docs.setAttribute('aria-labelledby', 'ap-docs-title');
      const head = node('div', 'ap-panel-head');
      const title = node('h2', 'ap-panel-title', 'Belgeler ve sertifikalar');
      title.id = 'ap-docs-title';
      head.append(title, node('span', 'ap-docs-note', 'Yönetici tarafından doğrulananlar'));
      const list = node('ul', 'ap-docs-list');
      advisor.belgeler.forEach(doc => {
        const li = node('li', 'ap-doc');
        const icon = node('span', 'material-symbols-outlined ap-doc-icon', 'workspace_premium');
        icon.setAttribute('aria-hidden', 'true');
        const text = node('div', 'ap-doc-text');
        text.append(node('strong', '', doc.title || ''), node('span', '', [doc.issuer, doc.year].filter(Boolean).join(' · ')));
        const badge = node('span', 'ap-doc-badge', 'Doğrulandı');
        li.append(icon, text, badge);
        list.appendChild(li);
      });
      docs.append(head, list);
      body.appendChild(docs);
    }

    // 4) Hizmet kartı
    const program = node('section', 'ap-panel ap-program');
    program.setAttribute('aria-labelledby', 'ap-program-title');
    const programTitle = node('h2', 'ap-panel-title', service ? service.name : 'Seans bilgileri');
    programTitle.id = 'ap-program-title';
    program.appendChild(programTitle);
    if (service) {
      const templates = (service.templates || []).slice().sort((a, b) => a.sequence_no - b.sequence_no);
      const list = node('div', 'ap-sessions');
      (templates.length ? templates : [{ sequence_no: 1, title: service.session_count + ' seans', purpose: service.description || '' }]).forEach(item => {
        const box = node('article', 'ap-session');
        const head = node('div', 'ap-session-head');
        head.append(node('h3', '', item.title), node('span', 'ap-session-no', String(item.sequence_no).padStart(2, '0')));
        box.append(head);
        if (item.purpose) box.append(node('p', 'ap-session-purpose', item.purpose));
        box.append(node('p', 'ap-session-meta', item.sequence_no + '. seans · ' + service.session_duration_minutes + ' dk'));
        list.appendChild(box);
      });
      program.appendChild(list);
      const total = node('div', 'ap-program-foot');
      const price = priceText(service);
      const priceBox = node('p', 'ap-price');
      if (price) priceBox.append(node('strong', '', price), node('span', '', service.session_count + ' seans · toplam'));
      else priceBox.append(node('span', '', o.serviceError ? 'Fiyat bilgisi alınamadı' : 'Fiyat bilgisi yok'));
      total.append(priceBox);
      program.appendChild(total);
    } else {
      program.appendChild(node('p', 'ap-muted', o.serviceError ? 'Fiyat bilgisi alınamadı' : 'Fiyat bilgisi yok'));
    }
    body.appendChild(program);

    // 5) Saat seçimi (müsaitlik herkese açık değil: satın alma sonrası takvimden seçilir)
    const schedule = node('section', 'ap-panel ap-schedule');
    schedule.setAttribute('aria-labelledby', 'ap-schedule-title');
    const scheduleTitle = node('h2', 'ap-panel-title', 'Seans saatleri');
    scheduleTitle.id = 'ap-schedule-title';
    const steps = node('ol', 'ap-steps');
    [
      ['Danışmanını seç', 'Bu profilden devam et, hizmetini onayla.'],
      ['Takvimden saat seç', 'Danışmanının açtığı uygun saatler İstanbul saatiyle gösterilir.'],
      ['Seansa katıl', 'Görüşme bağlantısı seanstan önce iletilir.']
    ].forEach(([title, text], index) => {
      const li = node('li', 'ap-step');
      li.append(node('span', 'ap-step-no', String(index + 1)), node('strong', '', title), node('span', '', text));
      steps.appendChild(li);
    });
    schedule.append(scheduleTitle, steps);
    if (!o.previewMode) {
      const scheduleActions = node('div', 'ap-schedule-actions');
      ctaElements(advisor, o.cta).forEach(element => scheduleActions.appendChild(element));
      if (scheduleActions.childElementCount) schedule.appendChild(scheduleActions);
    }
    body.appendChild(schedule);

    // 6) Gezinti izi
    const crumbs = node('nav', 'ap-crumbs');
    crumbs.setAttribute('aria-label', 'Konum');
    const home = node('a', '', 'Ana sayfa');
    home.href = '/';
    const list = node('a', '', 'Danışmanlar');
    list.href = '/danismanlar' + (flow === 'hikaye' ? '?akis=hikaye' : '');
    const current = node('span', '', advisor.ad);
    current.setAttribute('aria-current', 'page');
    crumbs.append(home, node('span', 'ap-crumb-sep', '/'), list, node('span', 'ap-crumb-sep', '/'), current);
    body.appendChild(crumbs);
    main.appendChild(body);

    const similar = renderSimilar(advisor, o.others || []);
    if (similar) {
      similar.classList.add('ap-wrap');
      main.appendChild(similar);
    }

    if (!o.previewMode) {
      const mobileBar = node('div', 'public-advisor-mobile-bar');
      ctaElements(advisor, o.cta).forEach(element => mobileBar.appendChild(element));
      if (mobileBar.childElementCount) document.body.appendChild(mobileBar);
    }
  }

  function renderNotFound(title, text) {
    document.title = title + ' · Interview Demo';
    const card = node('section', 'public-advisor-card public-advisor-not-found');
    card.append(node('h1', '', title), node('p', '', text));
    const all = node('a', 'public-advisor-directory-cta', 'Tüm Danışmanları Gör');
    all.href = '/danismanlar';
    card.appendChild(all);
    main.replaceChildren(card);
  }

  async function activeEnrollmentWith(guruId) {
    try {
      const result = await Api.page('/candidate/enrollments', { limit: 50, role: Api.ROLES.CANDIDATE, redirectOn401: false });
      return result.items.some(item => item.guru_id === guruId && item.status === 'active');
    } catch (error) {
      return false;
    }
  }

  async function init() {
    const headerHost = document.getElementById('site-header');
    if (checkoutFlow && headerHost) {
      headerHost.dataset.backLabel = '← Seçime dön';
      headerHost.dataset.backHref = window.Selection
        ? window.Selection.href('/hizmet', { serviceId: requestedService, guruId: advisorId })
        : '/hizmet';
    }
    const session = await (window.sessionReady || Promise.resolve(window.getSession ? window.getSession() : {}));

    // Guru önizlemesi: kendi profilini (yayında olmasa da) GET /guru/profile ile görür.
    let advisor = null;
    let previewMode = false;
    let ownerInactive = false;
    if (previewRequested && Api.hasSession(Api.ROLES.GURU)) {
      try {
        const own = await Api.get('/guru/profile', { role: Api.ROLES.GURU, redirectOn401: false });
        if (own && (!advisorId || own.id === advisorId)) {
          advisor = window.Advisors.toViewModel(own);
          // Kendi fotoğrafı (/me/avatar) Bearer ister: <img src> ile değil, blob → object URL (60, GAP-B23).
          advisor.avatarUrl = '';
          if (own.avatar_url) {
            try {
              if (typeof Api.avatarSrc === 'function') advisor.avatarUrl = await Api.avatarSrc(own.avatar_url, { role: Api.ROLES.GURU });
              else {
                const photo = await Api.request('GET', own.avatar_url, { role: Api.ROLES.GURU, responseType: 'blob', redirectOn401: false });
                advisor.avatarUrl = URL.createObjectURL(photo.blob);
              }
            } catch (error) { /* baş harfler */ }
          }
          previewMode = true;
          ownerInactive = own.is_active === false;
          const banner = node('div', 'public-advisor-preview-banner');
          banner.append(node('span', '', 'Önizleme modundasın. Ziyaretçiler profilini böyle görür.'));
          const edit = node('a', '', 'Düzenlemeye dön');
          edit.href = '/guru/profil';
          banner.appendChild(edit);
          document.body.insertBefore(banner, main);
        }
      } catch (error) {
        console.error('Guru profili önizlemesi yüklenemedi:', error && error.message);
      }
    }

    if (!advisor) {
      if (!advisorId) {
        renderNotFound('Danışman bulunamadı', 'Aradığın danışman profili bulunamadı.');
        return;
      }
      try {
        advisor = await window.Advisors.get(advisorId);
      } catch (error) {
        main.replaceChildren();
        Api.ui.showError(main, error, { fallback: 'Danışman profili yüklenemedi.' });
        return;
      }
      if (!advisor) {
        renderNotFound('Danışman bulunamadı', 'Aradığın danışman profili bulunamadı ya da şu an yayında değil.');
        return;
      }
    }

    let serviceError = null;
    const [services, others, hasActive] = await Promise.all([
      Api.get('/public/services', { auth: false }).then(data => (data && data.items) || []).catch(error => {
        serviceError = error;
        console.error('Hizmet/fiyat bilgisi yüklenemedi:', error && error.message);
        return [];
      }),
      window.Advisors.list().catch(() => []),
      session && session.role === 'danisan' ? activeEnrollmentWith(advisor.id) : Promise.resolve(false)
    ]);
    const service = services.find(item => item.id === requestedService) || services[0] || null;
    const cta = checkoutFlow
      ? { checkoutSelection: true }
      // Profilden doğrudan bu danışmanla devam edilir (listeye geri gönderilmez).
      : window.Advisors.cta(session, advisor.id, { hasActiveEnrollment: hasActive });

    render(advisor, { cta, service, serviceError, others, previewMode, ownerInactive });
  }

  init().catch(error => {
    console.error('Danışman profili yüklenemedi:', error && error.message);
    Api.ui.showError(main, 'Danışman profili yüklenemedi. Lütfen sayfayı yenile.');
  });
})();
