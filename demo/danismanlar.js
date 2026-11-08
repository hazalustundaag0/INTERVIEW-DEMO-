// danismanlar.js — Danışman kataloğu (danismanlar.html). Sahibi: 82 Aday Onboarding UI Agent.
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

  function makeAdvisorCard(advisor, index) {
    const card = make('article', 'advisor-directory-card');
    const identity = make('div', 'advisor-directory-identity');
    const avatar = make('span', 'advisor-directory-avatar', Api.format.initials(advisor.ad));
    avatar.setAttribute('aria-hidden', 'true');
    const nameAndTitle = make('div', 'advisor-directory-name');
    nameAndTitle.append(make('h2', '', advisor.ad), make('p', '', advisor.unvan));
    identity.append(avatar, nameAndTitle);
    card.appendChild(identity);

    if (advisor.kisaTanitim) card.appendChild(make('p', 'advisor-directory-intro', advisor.kisaTanitim));

    const facts = make('dl', 'advisor-directory-facts');
    if (advisor.uzmanlikAlani) {
      const expertise = make('div');
      expertise.append(make('dt', '', 'Uzmanlık'), make('dd', '', advisor.uzmanlikAlani));
      facts.appendChild(expertise);
    }
    if (advisor.kidem) {
      const experience = make('div');
      experience.append(make('dt', '', 'Deneyim'), make('dd', '', advisor.kidem));
      facts.appendChild(experience);
    }
    if (facts.childElementCount) card.appendChild(facts);

    const tags = make('ul', 'advisor-directory-tags');
    tags.setAttribute('aria-label', 'Sektörler');
    advisor.sektorler.forEach(sector => tags.appendChild(make('li', '', sector)));
    card.appendChild(tags);

    const actions = make('div', 'advisor-directory-actions');
    const profileLink = make('a', 'advisor-directory-profile-link', 'Profili gör');
    profileLink.href = 'danisman.html?id=' + encodeURIComponent(advisor.id) + (storyFlow ? '&akis=hikaye' : '');
    actions.appendChild(profileLink);
    card.appendChild(actions);

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
      [advisors, sectors] = await Promise.all([
        window.Advisors.list(),
        window.Advisors.sectors().catch(() => [])
      ]);
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
