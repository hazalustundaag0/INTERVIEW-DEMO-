(function () {
  var advisors = window.listAdvisors ? window.listAdvisors({ yayindaOlanlar: true }) : window.DEMO_ADVISORS;
  var grid = document.getElementById('advisor-grid');
  var filters = document.getElementById('advisor-filters');
  var search = document.getElementById('advisor-search');
  var sort = document.getElementById('advisor-sort');
  var count = document.getElementById('advisor-count');
  var empty = document.getElementById('advisor-empty');
  var resetButton = document.getElementById('advisor-reset-filters');
  if (!Array.isArray(advisors) || !grid || !filters || !search || !sort || !count || !empty || !resetButton) {
    console.error('Danışman dizini başlatılamadı.');
    return;
  }

  function make(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function normalize(value) {
    return String(value)
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  var filtersBySector = {
    all: [],
    technology: ['teknoloji', 'saas', 'liderlik'],
    finance: ['finans', 'bankacilik', 'yatirim'],
    retail: ['perakende', 'tuketici', 'pazarlama'],
    health: ['saglik', 'ar-ge', 'biyoteknoloji'],
    production: ['uretim', 'sanayi', 'operasyon']
  };
  var filterLabels = [
    ['all', 'Tümü'],
    ['technology', 'Teknoloji & SaaS'],
    ['finance', 'Finans'],
    ['retail', 'Perakende'],
    ['health', 'Sağlık'],
    ['production', 'Üretim']
  ];
  var activeSector = 'all';

  function makeAdvisorCard(advisor, recommendedIndex) {
    var card = make('article', 'advisor-directory-card');
    var identity = make('div', 'advisor-directory-identity');
    var initials = advisor.ad.split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toLocaleUpperCase('tr-TR');
    }).join('');
    var avatar = make('span', 'advisor-directory-avatar', initials);
    avatar.setAttribute('aria-hidden', 'true');
    var nameAndTitle = make('div', 'advisor-directory-name');
    nameAndTitle.append(make('h2', '', advisor.ad), make('p', '', advisor.unvan));
    identity.append(avatar, nameAndTitle);

    var introduction = make('p', 'advisor-directory-intro', advisor.kisaTanitim);
    var facts = make('dl', 'advisor-directory-facts');
    var experience = make('div');
    experience.append(make('dt', '', 'Deneyim'), make('dd', '', advisor.deneyimYili + '+ yıl'));
    var rate = make('div', 'advisor-directory-rate');
    rate.append(make('dt', '', 'Seans ücreti'), make('dd', '', new Intl.NumberFormat('tr-TR').format(advisor.ucret) + ' ₺ · ' + advisor.sure + ' dk'));
    facts.append(experience, rate);

    var availability = make('span', 'advisor-directory-availability', advisor.musait);
    var tags = make('ul', 'advisor-directory-tags');
    tags.setAttribute('aria-label', 'Uzmanlık alanları');
    advisor.sektorler.forEach(function (sector) { tags.appendChild(make('li', '', sector)); });

    var actions = make('div', 'advisor-directory-actions');
    var profileLink = make('a', 'advisor-directory-profile-link', 'Profili gör');
    profileLink.href = 'danisman.html?id=' + encodeURIComponent(advisor.id);
    if (new URLSearchParams(location.search).get('akis') === 'hikaye') {
      profileLink.href += '&akis=hikaye';
    }
    actions.appendChild(profileLink);

    card.append(identity, introduction, facts, availability, tags, actions);
    card.dataset.searchText = normalize([
      advisor.ad,
      advisor.unvan,
      advisor.kisaTanitim,
      advisor.sektorler.join(' ')
    ].join(' '));
    card.dataset.sectors = advisor.sektorler.map(normalize).join('|');
    card.dataset.recommendedIndex = String(recommendedIndex);
    card.dataset.name = normalize(advisor.ad);
    card.dataset.experience = String(advisor.deneyimYili);
    card.dataset.advisorId = advisor.id;
    return card;
  }

  function requestedSector() {
    var value = new URLSearchParams(location.search).get('sektor');
    if (!value) return 'all';
    var normalized = normalize(value).replace(/\s*&\s*/g, ' ').trim();
    var aliases = {
      tumu: 'all',
      technology: 'technology',
      teknoloji: 'technology',
      'teknoloji saas': 'technology',
      'technology saas': 'technology',
      finance: 'finance',
      finans: 'finance',
      retail: 'retail',
      perakende: 'retail',
      health: 'health',
      saglik: 'health',
      production: 'production',
      uretim: 'production'
    };
    return aliases[normalized] || 'all';
  }

  function updateResults() {
    var query = normalize(search.value.trim());
    var visibleCards = Array.from(grid.children).filter(function (card) {
      var matchesQuery = card.dataset.searchText.includes(query);
      var allowedSectors = filtersBySector[activeSector] || [];
      var matchesSector = activeSector === 'all' || allowedSectors.some(function (sector) {
        return card.dataset.sectors.split('|').includes(normalize(sector));
      });
      card.hidden = !matchesQuery || !matchesSector;
      return !card.hidden;
    });

    if (sort.value === 'name') {
      visibleCards.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name, 'tr'); });
    } else if (sort.value === 'experience') {
      visibleCards.sort(function (a, b) {
        return Number(b.dataset.experience) - Number(a.dataset.experience) ||
          Number(a.dataset.recommendedIndex) - Number(b.dataset.recommendedIndex);
      });
    } else {
      visibleCards.sort(function (a, b) {
        return Number(a.dataset.recommendedIndex) - Number(b.dataset.recommendedIndex);
      });
    }
    visibleCards.forEach(function (card) { grid.appendChild(card); });
    count.textContent = visibleCards.length + ' danışman';
    empty.hidden = visibleCards.length > 0;
  }

  filterLabels.forEach(function (item) {
    var button = make('button', 'advisor-directory-filter', item[1]);
    button.type = 'button';
    button.dataset.sector = item[0];
    button.setAttribute('aria-pressed', String(item[0] === activeSector));
    button.addEventListener('click', function () {
      activeSector = item[0];
      filters.querySelectorAll('button').forEach(function (filter) {
        filter.setAttribute('aria-pressed', String(filter === button));
      });
      updateResults();
    });
    filters.appendChild(button);
  });

  advisors.forEach(function (advisor, index) {
    grid.appendChild(makeAdvisorCard(advisor, index));
  });
  search.addEventListener('input', updateResults);
  sort.addEventListener('change', updateResults);
  resetButton.addEventListener('click', function () {
    activeSector = 'all';
    search.value = '';
    sort.value = 'recommended';
    history.replaceState(null, '', location.pathname);
    filters.querySelectorAll('button').forEach(function (filter) {
      filter.setAttribute('aria-pressed', String(filter.dataset.sector === 'all'));
    });
    updateResults();
  });

  activeSector = requestedSector();
  var queryParam = new URLSearchParams(location.search).get('q');
  if (queryParam) search.value = queryParam;
  filters.querySelectorAll('button').forEach(function (button) {
    button.setAttribute('aria-pressed', String(button.dataset.sector === activeSector));
  });
  updateResults();
})();
