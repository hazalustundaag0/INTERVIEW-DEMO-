// danismanlar.js — Danışman kataloğu (/danismanlar). Sahibi: 82 Aday Onboarding UI Agent.
// Veri: GET /public/gurus (Advisors.list, tüm sayfalar) + GET /public/sectors (Advisors.sectors).
// Sektör filtresi backend koduyla: ?sektor=<code> (ör. finance_banking); eski UI kodları
// (finance/retail/health/production) Advisors.sectorCode ile çevrilir. ?q= arama metni.
// Kaldırılan demo davranışı: listAdvisors()/DEMO_ADVISORS senkron sahte veri, sahte "seans ücreti",
// "deneyim yılı" sayısı ve "bu hafta müsait" metni (K52/K53, GAP-D07); kartta yalnız backend alanları.
(function () {
  'use strict';
  const Api = window.Api;
  const grid = document.getElementById('advisor-grid');
  const filters = document.getElementById('advisor-filters');
  const search = document.getElementById('advisor-search');
  const sort = document.getElementById('advisor-sort');
  const count = document.getElementById('advisor-count');
  const empty = document.getElementById('advisor-empty');
  const resetButton = document.getElementById('advisor-reset-filters');
  if (!Api || !window.Advisors || !grid || !filters || !search || !sort || !count || !empty || !resetButton) {
    console.error('Danışman dizini başlatılamadı.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const storyFlow = params.get('akis') === 'hikaye';

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }
  function normalize(value) {
    return String(value || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  // Kıdem serbest metindir ("12 yıl"); "Deneyim" sıralaması için baştaki sayı kullanılır.
  function seniorityYears(value) {
    const match = /(\d+)/.exec(String(value || ''));
    return match ? Number(match[1]) : 0;
  }

  let activeSector = 'all';

  // Sağ panel: seçili danışmanın tam tanıtımı ve eylemleri (masaüstünde yapışkan).
  const browse = make('div', 'advisor-browse');
  grid.parentElement.insertBefore(browse, grid);
  const detail = make('aside', 'advisor-detail');
  detail.setAttribute('aria-label', 'Danışman ayrıntısı');
  detail.setAttribute('aria-live', 'polite');
  browse.append(grid, detail);
  let detailId = null;
  let serviceNote = '';
  function showDetail(advisor) {
    if (!advisor || advisor.id === detailId) return;
    detailId = advisor.id;
    detail.replaceChildren();
    const head = make('div', 'advisor-detail-head');
    const who = make('div');
    who.append(make('p', 'advisor-detail-name', advisor.ad), make('p', 'advisor-detail-title', advisor.unvan));
    head.append(makeAvatar(advisor, 'advisor-detail-avatar'), who);
    detail.appendChild(head);
    if (advisor.kisaTanitim) detail.appendChild(make('p', 'advisor-detail-bio', advisor.kisaTanitim));
    const facts = make('dl', 'advisor-detail-facts');
    [['Uzmanlık', advisor.uzmanlikAlani], ['Sektör', advisor.sektorler.join(', ')], ['Deneyim', advisor.kidem]].forEach(([label, value]) => {
      if (!value) return;
      const row = make('div');
      row.append(make('dt', '', label), make('dd', '', value));
      facts.appendChild(row);
    });
    if (facts.childElementCount) detail.appendChild(facts);
    // Seans sayısı/süresi aktif hizmetten (GET /public/services); sabit metin yok (Etap 6, 81).
    if (serviceNote) detail.appendChild(make('p', 'advisor-detail-note', serviceNote));
    const primary = ctaLink(advisorCta(advisor), 'advisor-row-btn advisor-row-btn--primary');
    if (primary) detail.appendChild(primary);
    const profile = make('a', 'advisor-row-btn advisor-row-btn--ghost', 'Profilini gör');
    profile.href = profileHref(advisor);
    detail.appendChild(profile);
  }

  // Liste düzeni: solda portre, ortada ad/unvan/uzmanlık/sektörler/kısa tanıtım, sağda deneyim yılı ve
  // eylemler. Sağdaki yapışkan panel üzerine gelinen (ya da odaklanılan) danışmanın ayrıntısını gösterir.
  function advisorCta(advisor) {
    const session = typeof window.getSession === 'function' ? window.getSession() : {};
    return window.Advisors.cta(session, advisor.id, storyFlow ? { flow: 'hikaye' } : {});
  }
  function profileHref(advisor) {
    return '/danisman?id=' + encodeURIComponent(advisor.id) + (storyFlow ? '&akis=hikaye' : '');
  }
  function ctaLink(cta, className) {
    if (!cta || cta.hidden) return null;
    const label = cta.label.replace(/\s*→$/, '').replace(/^Bu danışmanla devam et$/, 'Seç ve devam et');
    const link = make(cta.href && !cta.disabled ? 'a' : 'span', className, label);
    if (cta.href && !cta.disabled) { link.href = cta.href; link.setAttribute('data-nav-skip', ''); }
    else { link.setAttribute('aria-disabled', 'true'); if (cta.title) link.title = cta.title; }
    return link;
  }
  function makeAvatar(advisor, className) {
    const avatar = make('span', 'advisor-directory-avatar ' + className, Api.format.initials(advisor.ad));
    avatar.setAttribute('aria-hidden', 'true');
    // K83: fotoğraf (public katalog ucu) varsa <img>, yoksa baş harfler — avatar.js çizer.
    avatar.dataset.avatarName = advisor.ad;
    if (advisor.avatarUrl) avatar.dataset.avatarUrl = advisor.avatarUrl;
    return avatar;
  }

  function makeAdvisorCard(advisor, index) {
    const card = make('article', 'advisor-directory-card advisor-row');
    card.tabIndex = -1;
    const years = seniorityYears(advisor.kidem);

    const main = make('div', 'advisor-row-main');
    const name = make('h2', 'advisor-row-name');
    const nameLink = make('a', '', advisor.ad);
    nameLink.href = profileHref(advisor);
    name.appendChild(nameLink);
    main.append(name, make('p', 'advisor-row-title', advisor.unvan));
    if (advisor.uzmanlikAlani) {
      const expertise = make('p', 'advisor-row-meta');
      expertise.append(make('span', 'advisor-row-meta-label', 'Uzmanlık'), document.createTextNode(advisor.uzmanlikAlani));
      main.appendChild(expertise);
    }
    if (advisor.sektorler.length) {
      const tags = make('ul', 'advisor-row-tags');
      tags.setAttribute('aria-label', 'Sektörler');
      advisor.sektorler.forEach(sector => tags.appendChild(make('li', '', sector)));
      main.appendChild(tags);
    }
    if (advisor.kisaTanitim) main.appendChild(make('p', 'advisor-row-bio', advisor.kisaTanitim));
    const more = make('a', 'advisor-row-more', 'Devamını oku');
    more.href = profileHref(advisor);
    more.setAttribute('aria-label', advisor.ad + ' profilinin devamını oku');
    main.appendChild(more);

    const side = make('div', 'advisor-row-side');
    const stat = make('p', 'advisor-row-stat');
    if (years) stat.append(make('strong', '', String(years)), make('span', '', 'yıl deneyim'));
    else stat.append(make('span', '', advisor.kidem || ''));
    side.appendChild(stat);
    const primary = ctaLink(advisorCta(advisor), 'advisor-row-btn advisor-row-btn--primary');
    if (primary) side.appendChild(primary);
    const profile = make('a', 'advisor-directory-profile-link advisor-row-btn advisor-row-btn--ghost', 'Profili incele');
    profile.href = profileHref(advisor);
    profile.setAttribute('aria-label', advisor.ad + ' profilini incele');
    side.appendChild(profile);

    card.append(makeAvatar(advisor, 'advisor-row-avatar'), main, side);
    card.addEventListener('mouseenter', () => showDetail(advisor));
    card.addEventListener('focusin', () => showDetail(advisor));
    card._advisor = advisor;

    card.dataset.searchText = normalize([advisor.ad, advisor.unvan, advisor.uzmanlikAlani, advisor.kisaTanitim, advisor.sektorler.join(' ')].join(' '));
    card.dataset.sectors = advisor.sektorKodlari.join('|');
    card.dataset.recommendedIndex = String(index);
    card.dataset.name = normalize(advisor.ad);
    card.dataset.experience = String(seniorityYears(advisor.kidem));
    card.dataset.advisorId = advisor.id;
    return card;
  }

  function updateResults() {
    const query = normalize(search.value.trim());
    const visibleCards = Array.from(grid.children).filter(card => {
      const matchesQuery = !query || card.dataset.searchText.includes(query);
      const matchesSector = activeSector === 'all' || card.dataset.sectors.split('|').includes(activeSector);
      card.hidden = !matchesQuery || !matchesSector;
      return !card.hidden;
    });
    if (sort.value === 'name') {
      visibleCards.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, 'tr'));
    } else if (sort.value === 'experience') {
      visibleCards.sort((a, b) => Number(b.dataset.experience) - Number(a.dataset.experience) ||
        Number(a.dataset.recommendedIndex) - Number(b.dataset.recommendedIndex));
    } else {
      visibleCards.sort((a, b) => Number(a.dataset.recommendedIndex) - Number(b.dataset.recommendedIndex));
    }
    visibleCards.forEach(card => grid.appendChild(card));
    count.textContent = visibleCards.length + ' danışman';
    empty.hidden = visibleCards.length > 0;
    detail.hidden = visibleCards.length === 0;
    if (visibleCards.length && !visibleCards.some(card => card._advisor && card._advisor.id === detailId)) {
      detailId = null;
      showDetail(visibleCards[0]._advisor);
    }
  }

  function renderFilters(sectorList) {
    filters.replaceChildren();
    [{ code: 'all', name: 'Tümü' }].concat(sectorList).forEach(sector => {
      const button = make('button', 'advisor-directory-filter', sector.name);
      button.type = 'button';
      button.dataset.sector = sector.code;
      button.setAttribute('aria-pressed', String(sector.code === activeSector));
      button.addEventListener('click', () => {
        activeSector = sector.code;
        filters.querySelectorAll('button').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
        const url = new URL(location.href);
        if (activeSector === 'all') url.searchParams.delete('sektor');
        else url.searchParams.set('sektor', activeSector);
        try { history.replaceState(history.state, '', url.pathname + url.search); } catch (error) { /* yok say */ }
        updateResults();
      });
      filters.appendChild(button);
    });
  }

  async function init() {
    count.textContent = 'Danışmanlar yükleniyor...';
    let advisors = [];
    let sectors = [];
    try {
      let services;
      [advisors, sectors, services] = await Promise.all([
        window.Advisors.list(),
        window.Advisors.sectors().catch(() => []),
        Api.get('/public/services', { auth: false }).catch(() => null)
      ]);
      const service = services && services.items && services.items[0];
      if (service) serviceNote = service.session_count + ' seans · her seans ' + service.session_duration_minutes + ' dk · arada Hikâye Aracı ile kendi çalışman';
    } catch (error) {
      count.textContent = '';
      Api.ui.showError(grid, error, { position: 'before', fallback: 'Danışmanlar yüklenemedi. Lütfen sayfayı yenile.' });
      return;
    }

    // Filtre çipleri: danışmanı olan sektörler (sort_order sırasıyla).
    const used = new Set(advisors.flatMap(advisor => advisor.sektorKodlari));
    const byCode = new Map();
    advisors.forEach(advisor => (advisor.card.sectors || []).forEach(sector => byCode.set(sector.code, sector)));
    const sectorList = (sectors.length ? sectors : Array.from(byCode.values()))
      .filter(sector => used.has(sector.code))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const requested = params.get('sektor');
    const requestedCode = requested ? window.Advisors.sectorCode(requested) : 'all';
    activeSector = requestedCode === 'all' || used.has(requestedCode) || sectors.some(sector => sector.code === requestedCode)
      ? requestedCode : 'all';
    renderFilters(sectorList.some(sector => sector.code === activeSector) || activeSector === 'all'
      ? sectorList
      : sectorList.concat(sectors.filter(sector => sector.code === activeSector)));

    grid.replaceChildren(...advisors.map((advisor, index) => makeAdvisorCard(advisor, index)));
    const queryParam = params.get('q');
    if (queryParam) search.value = queryParam;
    updateResults();
  }

  search.addEventListener('input', updateResults);
  sort.addEventListener('change', updateResults);
  resetButton.addEventListener('click', () => {
    activeSector = 'all';
    search.value = '';
    sort.value = 'recommended';
    try { history.replaceState(null, '', location.pathname + (storyFlow ? '?akis=hikaye' : '')); } catch (error) { /* yok say */ }
    filters.querySelectorAll('button').forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.sector === 'all')));
    updateResults();
  });

  init().catch(error => console.error('Danışman dizini yüklenemedi:', error && error.message));
})();
