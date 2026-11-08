// danisman.js — Public danışman profili (danisman.html?id=<guru_profiles.id>). Sahibi: 82 Aday Onboarding UI Agent.
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

  function section(title, icon) {
    const article = node('section', 'public-advisor-card');
    const heading = node('div', 'public-advisor-section-heading');
    const symbol = node('span', 'material-symbols-outlined', icon);
    const titleId = 'public-advisor-heading-' + title.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    article.setAttribute('aria-labelledby', titleId);
    symbol.setAttribute('aria-hidden', 'true');
    const headingText = node('h2', '', title);
    headingText.id = titleId;
    heading.append(symbol, headingText);
    article.appendChild(heading);
    return article;
  }

  function checkoutSelectionHref(advisor) {
    const selection = { serviceId: requestedService, guruId: advisor.id };
    return window.Selection ? window.Selection.href('hizmet.html', selection) : 'hizmet.html?guru=' + encodeURIComponent(advisor.id);
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

  function renderBooking(advisor, cta, service, previewMode) {
    const card = node('aside', 'public-advisor-card public-advisor-booking-card');
    card.setAttribute('aria-labelledby', 'public-advisor-booking-title');
    const title = node('h2', '', 'Seans bilgileri');
    title.id = 'public-advisor-booking-title';
    card.appendChild(title);
    if (service) {
      const details = node('dl', 'public-advisor-session-details');
      const price = !service.price ? null
        : Number(service.price.amount_minor) === 0 ? 'Ücretsiz'
          : Api.format.money(service.price.amount_minor, service.price.currency);
      [
        price ? ['Ücret', price] : null,
        ['Seans süresi', service.session_duration_minutes + ' dakika'],
        ['Seans sayısı', service.session_count + ' seans']
      ].filter(Boolean).forEach(item => {
        const row = node('div');
        row.append(node('dt', '', item[0]), node('dd', '', item[1]));
        details.appendChild(row);
      });
      card.appendChild(details);
    }
    if (previewMode) {
      card.appendChild(node('p', 'public-advisor-advisor-note', 'Önizleme modunda randevu alınamaz.'));
      return card;
    }
    ctaElements(advisor, cta).forEach(element => card.appendChild(element));
    return card;
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
    const allLink = node('a', '', 'Tüm danışmanları gör →');
    allLink.href = 'danismanlar.html' + (flow === 'hikaye' ? '?akis=hikaye' : '');
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
      card.href = 'danisman.html?' + query.toString();
      const avatar = node('span', 'public-advisor-similar-avatar', Api.format.initials(other.ad));
      avatar.setAttribute('aria-hidden', 'true');
      const content = node('span', 'public-advisor-similar-content');
      content.append(node('strong', '', other.ad), node('span', '', other.unvan), node('small', '', other.sektorler.slice(0, 2).join(' · ')));
      card.append(avatar, content);
      grid.appendChild(card);
    });
    wrapper.append(heading, grid);
    return wrapper;
  }

  function render(advisor, options) {
    const o = options || {};
    document.title = advisor.ad + ' · Danışman profili';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = advisor.ad + ' · ' + advisor.unvan + ' danışman profili.';
    main.replaceChildren();
    const layout = node('div', 'public-advisor-layout');
    const content = node('div', 'public-advisor-content');

    const hero = node('article', 'public-advisor-card public-advisor-hero');
    const avatar = node('div', 'public-advisor-avatar', Api.format.initials(advisor.ad));
    avatar.setAttribute('aria-hidden', 'true');
    const identity = node('div', 'public-advisor-identity');
    identity.append(node('span', 'public-advisor-eyebrow', 'Danışman profili'), node('h1', '', advisor.ad), node('p', '', advisor.unvan));
    const sectors = node('ul', 'public-advisor-chips');
    sectors.setAttribute('aria-label', 'Sektörler');
    advisor.sektorler.forEach(sector => sectors.appendChild(node('li', '', sector)));
    identity.appendChild(sectors);
    const credentials = node('div', 'public-advisor-credentials');
    if (advisor.kidem) credentials.appendChild(node('span', 'public-advisor-experience', advisor.kidem + ' deneyim'));
    hero.append(avatar, identity, credentials);
    content.appendChild(hero);

    if (o.ownerInactive) {
      content.appendChild(node('p', 'public-advisor-owner-status', 'Bu profil şu an yayında değil. Ziyaretçiler profili göremez.'));
    }
    if (advisor.kisaTanitim) {
      const about = section('Hakkında', 'person_book');
      about.appendChild(node('p', 'public-advisor-copy', advisor.kisaTanitim));
      content.appendChild(about);
    }
    const expertiseItems = String(advisor.uzmanlikAlani || '').split(/[,;]/).map(item => item.trim()).filter(Boolean);
    if (expertiseItems.length) {
      const expertise = section('Uzmanlık alanları', 'stars');
      const list = node('ul', 'public-advisor-chips');
      expertiseItems.forEach(item => list.appendChild(node('li', '', item)));
      expertise.appendChild(list);
      content.appendChild(expertise);
    }

    layout.append(content, renderBooking(advisor, o.cta, o.service, o.previewMode));
    main.appendChild(layout);
    const similar = renderSimilar(advisor, o.others || []);
    if (similar) main.appendChild(similar);

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
    const all = node('a', 'public-advisor-directory-cta', 'Tüm danışmanları gör');
    all.href = 'danismanlar.html';
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
        ? window.Selection.href('hizmet.html', { serviceId: requestedService, guruId: advisorId })
        : 'hizmet.html';
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
          previewMode = true;
          ownerInactive = own.is_active === false;
          const banner = node('div', 'public-advisor-preview-banner');
          banner.append(node('span', '', 'Önizleme modundasın. Ziyaretçiler profilini böyle görür.'));
          const edit = node('a', '', 'Düzenlemeye dön');
          edit.href = 'guru-profil.html';
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

    const [services, others, hasActive] = await Promise.all([
      Api.get('/public/services', { auth: false }).then(data => (data && data.items) || []).catch(() => []),
      window.Advisors.list().catch(() => []),
      session && session.role === 'danisan' ? activeEnrollmentWith(advisor.id) : Promise.resolve(false)
    ]);
    const service = services.find(item => item.id === requestedService) || services[0] || null;
    const cta = checkoutFlow
      ? { checkoutSelection: true }
      : window.Advisors.cta(session, advisor.id, { flow, hasActiveEnrollment: hasActive });

    render(advisor, { cta, service, others, previewMode, ownerInactive });
  }

  init().catch(error => {
    console.error('Danışman profili yüklenemedi:', error && error.message);
    Api.ui.showError(main, 'Danışman profili yüklenemedi. Lütfen sayfayı yenile.');
  });
})();
