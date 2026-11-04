// hizmet-demo.js: hizmet ve danışman seçimi (demo) — v2 fiyat danışmana göre
(function () {
  var SERVICES = [
    { name: 'Satış hikâyesi oluşturma', desc: 'Mülakatta fark yaratan, deneyimlerini yapılandıran hikâye çalışması.', sessions: 2, minutes: 50, output: 'Hikâye metni, 3 mülakat cevabı, CV özeti', icon: 'story', available: true },
    { name: 'CV / ön yazı oluşturma', desc: 'Mülakat öncesi güçlü ve ikna edici başvuru dokümanları.', sessions: 1, minutes: 50, output: 'CV ve ön yazı taslağı', icon: 'document' },
    { name: 'Demo iş görüşmesi', desc: 'Canlı mülakat simülasyonu ve detaylı performans analizi.', sessions: 1, minutes: 50, output: 'Görüşme kaydı ve gelişim notları', icon: 'microphone' },
    { name: 'Networking', desc: 'Sektör içi profesyonel temas ve bağlantı geliştirme adımları.', sessions: 1, minutes: 50, output: 'İletişim planı ve bağlantı mesajları', icon: 'network' },
    { name: 'Koçluk', desc: 'Kariyer hedefleri ve geçiş süreçleri için bire bir rehberlik.', sessions: 3, minutes: 50, output: 'Kariyer hedefleri ve eylem planı', icon: 'compass' },
    { name: 'Test geri bildirimi', desc: 'Vaka ve teknik değerlendirme testleri analizi.', sessions: 1, minutes: 50, output: 'Test değerlendirmesi ve aksiyon listesi', icon: 'checklist' }
  ];
  var SERVICE_ICONS = {
    story: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 10.5c6-2 12-1.2 17 2.5v26c-5-3.7-11-4.5-17-2.5zM41 10.5c-6-2-12-1.2-17 2.5v26c5-3.7 11-4.5 17-2.5z"/><path d="m31 8 7-3 3 7-7 3zM31 8l3 7"/></svg>',
    document: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l8 8v30H12z"/><path d="M29 5v9h8M18 22h13M18 28h13M18 34h9"/></svg>',
    microphone: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="18" y="5" width="12" height="24" rx="6"/><path d="M11 22v2a13 13 0 0 0 26 0v-2M24 37v6m-8 0h16"/></svg>',
    network: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="6"/><circle cx="9" cy="11" r="4"/><circle cx="39" cy="11" r="4"/><circle cx="9" cy="37" r="4"/><circle cx="39" cy="37" r="4"/><path d="m20 20-8-7m16 7 8-7m-16 15-8 7m16-7 8 7"/></svg>',
    compass: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19"/><path d="m31 17-4 10-10 4 4-10zM24 5v4m0 30v4m19-19h-4M9 24H5"/></svg>',
    checklist: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 8h24v35H9V8h6"/><path d="M17 7h8v6h-8zM15 23l3 3 6-7m-9 16 3 3 6-7m5-7h5m-5 10h5"/></svg>'
  };

  var ADVISORS = window.listAdvisors
    ? window.listAdvisors({ yayindaOlanlar: true })
    : Array.isArray(window.DEMO_ADVISORS) ? window.DEMO_ADVISORS : [];
  var GURUS = ADVISORS.map(function (advisor) { return advisor.ad; });
  var SECTOR_FILTERS = {
    teknoloji: ['Teknoloji', 'SaaS'],
    finans: ['Finans', 'Bankacılık', 'Yatırım'],
    perakende: ['Perakende', 'Tüketici', 'Pazarlama'],
    saglik: ['Sağlık', 'Ar-Ge', 'Biyoteknoloji'],
    uretim: ['Üretim', 'Sanayi', 'Operasyon']
  };
  function advisorByName(name) {
    return ADVISORS.find(function (advisor) { return advisor.ad === name; });
  }
  function priceOf(svc, guru) {
    var advisor = advisorByName(guru);
    return svc && svc.name === SERVICES[0].name && advisor && Number.isFinite(advisor.ucret)
      ? advisor.ucret
      : null;
  }
  function startingPrice() {
    var prices = ADVISORS.map(function (advisor) { return Number(advisor.ucret); })
      .filter(function (price) { return Number.isFinite(price) && price > 0; });
    return prices.length ? Math.min.apply(Math, prices) : null;
  }

  function init() {
    document.querySelectorAll('.service-selection-page .material-symbols-outlined').forEach(function (icon) {
      icon.setAttribute('aria-hidden', 'true');
    });
    function own(el) { var s = ''; for (var i = 0; i < el.childNodes.length; i++) { if (el.childNodes[i].nodeType === 3) s += el.childNodes[i].nodeValue; } return s.replace(/\s+/g, ' ').trim(); }
    function byOwn(test) { return Array.prototype.filter.call(document.body.querySelectorAll('*'), function (el) { var t = own(el); return t && (typeof test === 'string' ? t === test : test.test(t)); }); }
    function setOwn(el, txt) { if (!el) return; for (var i = 0; i < el.childNodes.length; i++) { var n = el.childNodes[i]; if (n.nodeType === 3 && n.nodeValue.trim()) { n.nodeValue = txt; return; } } el.insertBefore(document.createTextNode(txt), el.firstChild); }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    function toast(m) { var t = document.createElement('div'); t.textContent = m; t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#51409D;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:99999'; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4000); }

    // Alt çubuktaki öğeleri, DOM değişmeden ÖNCE yakala
    var svcMatches = byOwn('Satış hikâyesi oluşturma');
    var cardTitle = svcMatches[0];
    var barName = document.querySelector('.service-summary-service');
    var barSessions = document.querySelector('.service-summary-sessions');
    var barPrice = document.querySelector('.service-summary-price');
    var barTax = document.querySelector('.service-summary-tax');
    var barGuruLabel = document.querySelector('.service-summary-advisor-name');
    var barAvatar = document.querySelector('.service-summary-avatar');
    var barHint = document.querySelector('.service-summary-hint');
    var yak = byOwn(/^Yakında:?$/)[0];
    if (!cardTitle) { toast('Hizmet kartı bulunamadı: hizmet.html dosyasını bana gönder'); return; }

    // Stil
    var state = { svc: null, guru: null };
    var guruGrid = document.getElementById('gurus-group');
    var guruCount = document.querySelector('#guru-title')?.parentElement.querySelector('span');
    var summaryBar = document.querySelector('body.service-selection-page > div.fixed.bottom-0');
    var summaryInfo = summaryBar?.querySelector('.service-summary-main');
    var summaryDivider = summaryInfo?.querySelector('.w-px');
    var continueButton = summaryBar?.querySelector('button');
    summaryBar?.classList.add('service-selection-summary');
    summaryInfo?.setAttribute('aria-live', 'polite');
    summaryInfo?.setAttribute('aria-atomic', 'true');
    summaryDivider?.classList.add('service-selection-divider');
    if (continueButton) {
      continueButton.disabled = true;
      continueButton.setAttribute('aria-disabled', 'true');
      continueButton.title = 'Önce bir danışman seç';
    }
    if (!ADVISORS.length) console.error('Danışman listesi yüklenemedi.');

    document.querySelector('body.service-selection-page > button.demo-only')?.classList.add('service-selection-demo-button');
    document.querySelector('body.service-selection-page > div.demo-only:not(#demo-flow-nav)')?.classList.add('service-selection-demo-menu');

    // Alt çubuğu güncelle ve seçimi kaydet
    function refreshBar() {
      var s = state.svc === null ? null : SERVICES[state.svc];
      var price = priceOf(s, state.guru);
      var minimumPrice = s && s.available && !state.guru ? startingPrice() : null;
      setOwn(barName, s ? s.name : 'Hizmet seçilmedi');
      setOwn(barSessions, s ? s.sessions + ' seans · ' + s.minutes + ' dk' : 'Seans ve süre seçilmedi');
      if (barPrice) {
        setOwn(barPrice, price ? fmt(price) + ' ₺' : minimumPrice ? fmt(minimumPrice) + ' ₺\'den başlayan' : s ? 'Fiyat danışmana göre' : 'Fiyat danışmana göre');
        barPrice.classList.toggle('is-total', Boolean(price));
        if (barTax) barTax.hidden = !price;
      }
      if (barGuruLabel) {
        barGuruLabel.textContent = state.guru || '';
        barGuruLabel.hidden = !state.guru;
      }
      if (barAvatar) {
        barAvatar.textContent = state.guru ? state.guru.split(/\s+/).slice(0, 2).map(function (part) {
          return part.charAt(0).toLocaleUpperCase('tr-TR');
        }).join('') : '';
        barAvatar.hidden = !state.guru;
      }
      if (continueButton) {
        var canContinue = Boolean(s && state.guru);
        var wasReady = summaryBar.classList.contains('is-ready');
        continueButton.disabled = !canContinue;
        continueButton.setAttribute('aria-disabled', String(!canContinue));
        continueButton.title = canContinue ? '' : state.guru ? 'Önce bir hizmet seç' : 'Önce bir danışman seç';
        summaryBar.classList.toggle('is-ready', canContinue);
        if (barHint) {
          barHint.textContent = state.svc === null ? 'Önce bir hizmet seç' : !state.guru ? 'Önce bir danışman seç' : '';
          barHint.hidden = state.svc !== null && Boolean(state.guru);
        }
        if (canContinue && !wasReady) {
          continueButton.classList.remove('is-just-enabled');
          void continueButton.offsetWidth;
          continueButton.classList.add('is-just-enabled');
          window.setTimeout(function () { continueButton.classList.remove('is-just-enabled'); }, 700);
        }
      }
      Array.prototype.forEach.call(grid.children, function (serviceCard, i) {
        var servicePrice = priceOf(SERVICES[i], state.guru);
        var priceLabel = serviceCard.querySelector('.demo-svc-price');
        var serviceMinimum = SERVICES[i].available && !state.guru ? startingPrice() : null;
        priceLabel.textContent = servicePrice ? fmt(servicePrice) + ' ₺' : serviceMinimum ? fmt(serviceMinimum) + ' ₺\'den başlayan' : 'Fiyat danışmana göre';
        priceLabel.classList.toggle('is-price', Boolean(servicePrice || serviceMinimum));
      });
      updateRecommendations();
      try {
        localStorage.setItem('demoSecim', JSON.stringify({
          service: s?.name || null,
          sessions: s?.sessions || null,
          minutes: s?.minutes || null,
          price: price,
          guru: state.guru
        }));
      } catch (error) {
        console.error('Hizmet ve danışman seçimi kaydedilemedi.', error);
      }
    }

    // Hizmet kartları: eski kartı ve "Yakında" satırını gizle, 6 kartlık ızgara koy
    var card = cardTitle;
    while (card.parentElement && yak && !card.parentElement.contains(yak)) card = card.parentElement;
    if (yak) { var row = yak; while (row.parentElement && row.parentElement !== card.parentElement) row = row.parentElement; if (row !== card) row.style.display = 'none'; }
    var grid = document.createElement('div');
    grid.className = 'demo-service-grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Hizmet seç');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px';
    SERVICES.forEach(function (s, i) {
      var c = document.createElement('div');
      c.className = 'demo-svc';
      c.innerHTML = '<div class="demo-svc-heading"><span class="demo-svc-icon demo-svc-icon--' + s.icon + '">' + SERVICE_ICONS[s.icon] + '</span><div class="demo-svc-title-wrap"><div class="demo-svc-badges"></div><div class="demo-svc-top"><b>' + s.name + '</b><span class="demo-svc-check" aria-hidden="true">✓</span></div></div></div><p>' + s.desc + '</p><div class="demo-svc-output"><b>Çıktı</b><span>' + s.output + '</span></div><div class="demo-svc-foot"><span>' + s.sessions + ' seans · ' + s.minutes + ' dk</span><span class="demo-svc-price">Fiyat danışmana göre</span></div>';
      if (s.available) {
        c.classList.add('demo-svc--featured');
        var popular = document.createElement('span');
        popular.className = 'service-badge service-badge--popular';
        popular.textContent = 'En çok tercih edilen';
        c.querySelector('.demo-svc-badges').appendChild(popular);
      } else {
        var soon = document.createElement('span');
        soon.className = 'service-badge service-badge--soon';
        soon.textContent = 'Yakında';
        c.querySelector('.demo-svc-badges').appendChild(soon);
        c.classList.add('demo-svc--soon');
        c.setAttribute('aria-disabled', 'true');
        c.setAttribute('aria-label', s.name + ', yakında');
      }
      c.setAttribute('role', 'radio');
      c.setAttribute('aria-checked', 'false');
      c.tabIndex = s.available ? 0 : -1;
      c.addEventListener('click', function () { if (s.available) selectService(i); });
      c.addEventListener('keydown', function (event) {
        if (!s.available) return;
        var delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 :
          event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (delta) {
          event.preventDefault();
          var available = SERVICES.map(function (service, index) { return service.available ? index : -1; })
            .filter(function (index) { return index >= 0; });
          var nextIndex = available[(available.indexOf(i) + delta + available.length) % available.length];
          grid.children[nextIndex].focus();
          selectService(nextIndex);
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          var availableIndices = SERVICES.map(function (service, index) { return service.available ? index : -1; })
            .filter(function (index) { return index >= 0; });
          var edgeIndex = event.key === 'Home' ? availableIndices[0] : availableIndices[availableIndices.length - 1];
          grid.children[edgeIndex].focus();
          selectService(edgeIndex);
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          selectService(i);
        }
      });
      grid.appendChild(c);
    });
    card.parentElement.insertBefore(grid, card);
    card.style.display = 'none';
    function selectService(i) {
      if (!SERVICES[i]?.available) return;
      state.svc = i;
      Array.prototype.forEach.call(grid.children, function (c, k) {
        c.classList.toggle('on', k === i);
        c.setAttribute('aria-checked', String(k === i));
        c.tabIndex = SERVICES[k].available && k === i ? 0 : -1;
      });
      guruGrid?.setAttribute('data-selected-service', SERVICES[i].name);
      Object.keys(cards).forEach(function (name) { cards[name].dataset.selectedService = SERVICES[i].name; });
      refreshBar();
    }

    // Danışman kartları
    var cards = {};
    if (guruGrid) {
      Array.prototype.forEach.call(guruGrid.querySelectorAll('.guru-card'), function (card) {
        var storedName = card.dataset.guruName || card.querySelector('h3')?.textContent.trim();
        var isKnownAdvisor = ADVISORS.some(function (advisor) {
          return advisor.ad === storedName || (advisor.id === 'selin-arslan' && storedName === 'Selin Arslan');
        });
        if (!isKnownAdvisor) card.style.display = 'none';
      });
    }
    ADVISORS.forEach(function (advisor) {
      var name = advisor.ad;
      var sourceName = advisor.id === 'selin-arslan' ? 'Selin Arslan' : name;
      var hit = byOwn(sourceName)[0];
      if (!hit) return;
      var el = hit.closest('.guru-card') || hit;
      el.classList.add('demo-guru');
      el.dataset.guruId = advisor.id;
      el.dataset.guruName = name;
      el.dataset.sector = advisor.sektorler[0] === 'Teknoloji' ? 'teknoloji' :
        advisor.sektorler[0] === 'Finans' ? 'finans' :
          advisor.sektorler[0] === 'Perakende' ? 'perakende' :
            advisor.sektorler[0] === 'Sağlık' ? 'saglik' :
              advisor.sektorler[0] === 'Üretim' ? 'uretim' : '';
      el.dataset.sectors = advisor.sektorler.join('|');
      var heading = el.querySelector('h3');
      if (heading) heading.textContent = name;
      var advisorHeading = heading?.parentElement;
      advisorHeading?.classList.add('demo-guru-header');
      var avatar = el.querySelector('.rounded-full');
      if (avatar) avatar.textContent = name.split(/\s+/).slice(0, 2).map(function (part) {
        return part.charAt(0).toLocaleUpperCase('tr-TR');
      }).join('');
      var paragraphs = el.querySelectorAll('p');
      if (paragraphs[0]) paragraphs[0].textContent = advisor.unvan;
      if (paragraphs[1]) paragraphs[1].textContent = advisor.kisaTanitim;
      var expertiseRow = el.lastElementChild;
      if (expertiseRow) {
        expertiseRow.classList.add('demo-advisor-expertise');
        expertiseRow.replaceChildren();
        advisor.sektorler.forEach(function (sector) {
          var tag = document.createElement('span');
          tag.className = 'px-2 py-0.5 rounded bg-page-bg border border-card-border text-muted-text text-[11px]';
          tag.textContent = sector;
          expertiseRow.appendChild(tag);
        });
      }
      var indicator = el.querySelector('.radio-indicator');
      if (indicator) indicator.remove();
      var radio = document.createElement('span');
      radio.className = 'demo-radio';
      radio.setAttribute('aria-hidden', 'true');
      var rating = document.createElement('div');
      rating.className = 'demo-advisor-rating';
      rating.innerHTML = '<span class="demo-advisor-rating-value">★ ' + Number(advisor.puan).toFixed(1) + '</span><span>' + advisor.seansSayisi + ' seans</span>';
      var details = document.createElement('div');
      details.className = 'demo-advisor-details';
      var availability = document.createElement('span');
      availability.className = 'demo-advisor-availability';
      availability.textContent = advisor.musait || 'Yakında müsait';
      var rate = document.createElement('span');
      rate.className = 'demo-advisor-rate';
      rate.textContent = fmt(advisor.ucret) + ' ₺ · ' + advisor.sure + ' dk';
      var experience = document.createElement('span');
      experience.className = 'demo-advisor-experience';
      experience.textContent = advisor.deneyimYili + ' yıl deneyim';
      details.append(availability, rate, experience);
      var selectedBadge = document.createElement('span');
      selectedBadge.className = 'demo-advisor-selected';
      selectedBadge.textContent = 'Seçildi';
      el.appendChild(selectedBadge);
      el.insertBefore(rating, expertiseRow);
      el.insertBefore(details, expertiseRow);
      el.appendChild(radio);
      el.dataset.sectorTone = el.dataset.sector;
      el.dataset.recommended = 'false';
      el.setAttribute('role', 'radio');
      el.setAttribute('aria-checked', 'false');
      el.setAttribute('aria-label', name);
      el.tabIndex = -1;
      el.addEventListener('click', function (event) {
        if (!event.target.closest('.demo-advisor-profile-link')) selectGuru(name);
      });
      el.addEventListener('keydown', function (event) {
        var visibleNames = Object.keys(cards).filter(function (guruName) {
          return cards[guruName].style.display !== 'none';
        });
        var currentIndex = visibleNames.indexOf(name);
        var delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 :
          event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (delta && visibleNames.length) {
          event.preventDefault();
          var nextIndex = (currentIndex + delta + visibleNames.length) % visibleNames.length;
          var nextName = visibleNames[nextIndex];
          cards[nextName].focus();
          selectGuru(nextName);
        } else if ((event.key === 'Home' || event.key === 'End') && visibleNames.length) {
          event.preventDefault();
          var edgeName = visibleNames[event.key === 'Home' ? 0 : visibleNames.length - 1];
          cards[edgeName].focus();
          selectGuru(edgeName);
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          selectGuru(name);
        }
      });
      cards[name] = el;
      var profileLink = document.createElement('a');
      profileLink.className = 'demo-advisor-profile-link';
      profileLink.textContent = 'Profili gör →';
      profileLink.href = 'danisman.html?id=' + encodeURIComponent(advisor.id) + '&from=checkout';
      profileLink.addEventListener('click', function (event) { event.stopPropagation(); });
      el.appendChild(profileLink);
    });
    if (guruGrid) {
      guruGrid.setAttribute('role', 'radiogroup');
      guruGrid.setAttribute('aria-labelledby', 'guru-title');
    }

    var searchInput = document.getElementById('guru-search');
    var sectorChips = document.getElementById('sector-chips');
    var activeSector = 'all';
    var emptyState = document.createElement('p');
    emptyState.className = 'guru-empty-state';
    emptyState.setAttribute('role', 'status');
    emptyState.setAttribute('aria-live', 'polite');
    emptyState.textContent = 'Filtreye uygun danışman bulunamadı.';
    emptyState.hidden = true;
    guruGrid?.insertAdjacentElement('afterend', emptyState);

    function normalizeSearch(value) {
      return value.trim().toLocaleLowerCase('tr-TR');
    }

    function filterGurus() {
      var query = normalizeSearch(searchInput?.value || '');
      var selectedSectors = SECTOR_FILTERS[activeSector] || [];
      sectorChips?.querySelectorAll('[data-sector-filter]').forEach(function (chip) {
        var sectorValues = SECTOR_FILTERS[chip.dataset.sectorFilter] || [];
        var supported = chip.dataset.sectorFilter === 'all' || Object.keys(cards).some(function (name) {
          return sectorValues.some(function (sector) { return cards[name].dataset.sectors.split('|').includes(sector); });
        });
        chip.hidden = !supported;
      });
      var visibleCount = 0;
      Object.keys(cards).forEach(function (name) {
        var guruCard = cards[name];
        var matchesQuery = normalizeSearch(guruCard.textContent).includes(query);
        var matchesSector = activeSector === 'all' ||
          selectedSectors.some(function (sector) { return guruCard.dataset.sectors.split('|').includes(sector); });
        var visible = matchesQuery && matchesSector;
        guruCard.style.display = visible ? '' : 'none';
        if (visible) visibleCount += 1;
      });
      emptyState.hidden = visibleCount > 0;
      if (guruCount) guruCount.textContent = visibleCount + ' danışman';
      var selectedVisible = cards[state.guru]?.style.display !== 'none';
      Object.keys(cards).forEach(function (name) {
        cards[name].tabIndex = cards[name].getAttribute('aria-checked') === 'true' && selectedVisible
          ? 0
          : -1;
      });
      if (visibleCount && !selectedVisible) {
        var firstVisible = Object.keys(cards).find(function (name) {
          return cards[name].style.display !== 'none';
        });
        if (firstVisible) cards[firstVisible].tabIndex = 0;
      }
    }

    searchInput?.addEventListener('input', filterGurus);
    sectorChips?.querySelectorAll('[data-sector-filter]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeSector = chip.dataset.sectorFilter || 'all';
        sectorChips.querySelectorAll('[data-sector-filter]').forEach(function (filterChip) {
          filterChip.setAttribute('aria-pressed', String(filterChip === chip));
        });
        filterGurus();
      });
    });

    function selectGuru(name) {
      state.guru = name;
      Object.keys(cards).forEach(function (n) {
        var selected = Boolean(name) && n === name;
        cards[n].classList.toggle('demo-sel', selected);
        cards[n].classList.toggle('demo-unsel', !selected);
        cards[n].classList.toggle('active', selected);
        cards[n].setAttribute('aria-checked', String(selected));
        cards[n].tabIndex = selected && cards[n].style.display !== 'none' ? 0 : -1;
        var radio = cards[n].querySelector('.demo-radio');
        if (radio) radio.textContent = selected ? '✓' : '';
      });
      var currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has('danisman') || currentUrl.searchParams.get('from') === 'checkout') {
        var selectedAdvisor = advisorByName(name);
        if (selectedAdvisor) currentUrl.searchParams.set('danisman', selectedAdvisor.id);
        else currentUrl.searchParams.delete('danisman');
        if (currentUrl.searchParams.has('danisman')) currentUrl.searchParams.set('from', 'checkout');
        try {
          window.history.replaceState(window.history.state, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
        } catch (error) {
          console.error('Danışman seçimi adres çubuğunda güncellenemedi.', error);
        }
      }
      refreshBar();
    }

    function updateRecommendations() {
      var recommendedNames = state.svc === 0 ? ['Selin Arslan', 'Emre Kaya'] : [];
      Object.keys(cards).forEach(function (name) {
        var advisorCard = cards[name];
        var recommended = recommendedNames.includes(name);
        advisorCard.dataset.recommended = String(recommended);
        var badge = advisorCard.querySelector('.demo-advisor-recommended');
        if (recommended && !badge) {
          badge = document.createElement('span');
          badge.className = 'demo-advisor-recommended';
          badge.textContent = 'Önerilen';
          advisorCard.querySelector('.demo-guru-header')?.appendChild(badge);
        } else if (!recommended) {
          badge?.remove();
        }
      });
    }

    // Daha önce seçim yapıldıysa geri yükle
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem('demoSecim'));
    } catch (error) {
      console.error('Önceki hizmet ve danışman seçimi okunamadı.', error);
    }
    var i0 = null, g0 = null;
    var serviceParams = new URLSearchParams(window.location.search);
    var requestedAdvisorId = serviceParams.get('danisman') || serviceParams.get('advisor');
    var requestedAdvisor = ADVISORS.find(function (advisor) { return advisor.id === requestedAdvisorId; });
    if (saved) {
      SERVICES.forEach(function (s, i) { if (s.name === saved.service) i0 = i; });
      if (saved.guru && cards[saved.guru]) g0 = saved.guru;
    }
    if (requestedAdvisor && cards[requestedAdvisor.ad]) {
      g0 = requestedAdvisor.ad;
      if (serviceParams.get('from') !== 'checkout') i0 = null;
      var serviceHeading = document.querySelector('.service-selection-section[aria-labelledby="hizmet-title"] .service-section-heading');
      if (serviceHeading) {
        var banner = document.createElement('p');
        banner.className = 'service-requested-advisor-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        var message = document.createElement('span');
        message.textContent = 'Danışmanın: ' + requestedAdvisor.ad + '. Şimdi hizmeti seç.';
        var changeLink = document.createElement('a');
        changeLink.href = 'danismanlar.html';
        changeLink.textContent = 'Danışmanı değiştir';
        banner.append(message, changeLink);
        serviceHeading.insertAdjacentElement('afterend', banner);
      }
    }
    if (i0 !== null) selectService(i0);
    selectGuru(g0);
    filterGurus();
    if (!Object.keys(cards).length) toast('Danışman kartları bulunamadı: hizmet.html dosyasını bana gönder');

  }

  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
