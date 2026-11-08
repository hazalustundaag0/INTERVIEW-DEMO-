// hizmet-demo.js — Hizmet ve danışman seçimi (hizmet.html). Sahibi: 82 Aday Onboarding UI Agent.
// Veri: GET /public/services (aktif hizmet + seans şablonları + fiyat kuralı, K53/K54),
//       GET /public/gurus (js/advisors.js → Advisors.list), GET /public/sectors (Advisors.sectors).
// "Ödemeye geç" (data-action="checkout-preview") → GET /candidate/checkout/preview?service_id&guru_id;
// yalnız başarılı yanıttan sonra siparis.html?service=<uuid>&guru=<uuid> (Selection, URL'de UUID).
// Kaldırılan demo davranışı: 6 sabit hizmet (seans/dk/çıktı koda gömülü, GAP-U10), danışman başına fiyat
// (GAP-U07), sahte puan / seans sayısı / "bu hafta müsait" / deneyim yılı (GAP-D07), "Önerilen" rozetleri,
// demoSecim localStorage yazımı/okuması, ada göre danışman eşlemesi (GAP-U14).
// "Yakında" hizmet kartları statik pazarlama içeriğidir ve seçilemez (K57).
(function () {
  'use strict';
  const Api = window.Api;
  if (!Api || !window.Advisors) {
    console.error('hizmet-demo.js: api-client.js / js/advisors.js yüklenmemiş.');
    return;
  }

  // K57: pasif hizmetler API'de dönmez; seçilemeyen "Yakında" kartları statik kalır.
  const SOON_SERVICES = [
    { name: 'CV / ön yazı oluşturma', desc: 'Mülakat öncesi güçlü ve ikna edici başvuru dokümanları.', output: 'CV ve ön yazı taslağı', icon: 'document' },
    { name: 'Demo iş görüşmesi', desc: 'Canlı mülakat simülasyonu ve detaylı performans analizi.', output: 'Görüşme kaydı ve gelişim notları', icon: 'microphone' },
    { name: 'Networking', desc: 'Sektör içi profesyonel temas ve bağlantı geliştirme adımları.', output: 'İletişim planı ve bağlantı mesajları', icon: 'network' },
    { name: 'Koçluk', desc: 'Kariyer hedefleri ve geçiş süreçleri için bire bir rehberlik.', output: 'Kariyer hedefleri ve eylem planı', icon: 'compass' },
    { name: 'Test geri bildirimi', desc: 'Vaka ve teknik değerlendirme testleri analizi.', output: 'Test değerlendirmesi ve aksiyon listesi', icon: 'checklist' }
  ];
  const SERVICE_ICONS = {
    story: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 10.5c6-2 12-1.2 17 2.5v26c-5-3.7-11-4.5-17-2.5zM41 10.5c-6-2-12-1.2-17 2.5v26c5-3.7 11-4.5 17-2.5z"/><path d="m31 8 7-3 3 7-7 3zM31 8l3 7"/></svg>',
    document: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l8 8v30H12z"/><path d="M29 5v9h8M18 22h13M18 28h13M18 34h9"/></svg>',
    microphone: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="18" y="5" width="12" height="24" rx="6"/><path d="M11 22v2a13 13 0 0 0 26 0v-2M24 37v6m-8 0h16"/></svg>',
    network: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="6"/><circle cx="9" cy="11" r="4"/><circle cx="39" cy="11" r="4"/><circle cx="9" cy="37" r="4"/><circle cx="39" cy="37" r="4"/><path d="m20 20-8-7m16 7 8-7m-16 15-8 7m16-7 8 7"/></svg>',
    compass: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19"/><path d="m31 17-4 10-10 4 4-10zM24 5v4m0 30v4m19-19h-4M9 24H5"/></svg>',
    checklist: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 8h24v35H9V8h6"/><path d="M17 7h8v6h-8zM15 23l3 3 6-7m-9 16 3 3 6-7m5-7h5m-5 10h5"/></svg>'
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function normalize(value) {
    return String(value || '').toLocaleLowerCase('tr-TR');
  }
  function priceText(service) {
    if (!service || !service.price) return 'Fiyat bilgisi yok';
    if (Number(service.price.amount_minor) === 0) return 'Ücretsiz';
    return Api.format.money(service.price.amount_minor, service.price.currency);
  }
  function sessionText(service) {
    return service.session_count + ' seans · ' + service.session_duration_minutes + ' dk';
  }
  function outputText(service) {
    const templates = Array.isArray(service.templates) ? service.templates.slice() : [];
    templates.sort((a, b) => a.sequence_no - b.sequence_no);
    const last = templates[templates.length - 1];
    return (last && last.output_definition) || '';
  }

  // Statik (sahte) danışman kartları ilk boyamadan önce kaldırılır; ilk kart şablon olarak saklanır.
  const guruGrid = document.getElementById('gurus-group');
  const guruTemplate = guruGrid && guruGrid.querySelector('.guru-card') ? guruGrid.querySelector('.guru-card').cloneNode(true) : null;
  if (guruGrid) guruGrid.replaceChildren();
  const sectorChips = document.getElementById('sector-chips');
  const chipTemplate = sectorChips && sectorChips.querySelector('[data-sector-filter]:not([data-sector-filter="all"])')
    ? sectorChips.querySelector('[data-sector-filter]:not([data-sector-filter="all"])').cloneNode(true) : null;
  sectorChips?.querySelectorAll('[data-sector-filter]:not([data-sector-filter="all"])').forEach(chip => chip.remove());

  async function init() {
    document.querySelectorAll('.service-selection-page .material-symbols-outlined').forEach(icon => icon.setAttribute('aria-hidden', 'true'));

    const legacyServiceCard = document.querySelector('#services-group .service-card');
    const servicesGroup = document.getElementById('services-group');
    const comingSoonRow = servicesGroup && Array.from(servicesGroup.children).find(child => /^Yakında:?/.test(child.textContent.trim()));
    const guruCount = document.querySelector('#guru-title')?.parentElement.querySelector('span');
    const summaryBar = document.querySelector('body.service-selection-page > div.fixed.bottom-0');
    const summaryInfo = summaryBar?.querySelector('.service-summary-main');
    const continueButton = summaryBar?.querySelector('button');
    const continueWrap = summaryBar?.querySelector('.service-summary-continue');
    const barName = document.querySelector('.service-summary-service');
    const barSessions = document.querySelector('.service-summary-sessions');
    const barPrice = document.querySelector('.service-summary-price');
    const barTax = document.querySelector('.service-summary-tax');
    const barGuruLabel = document.querySelector('.service-summary-advisor-name');
    const barAvatar = document.querySelector('.service-summary-avatar');
    const barHint = document.querySelector('.service-summary-hint');
    const searchInput = document.getElementById('guru-search');
    const serviceSection = document.querySelector('.service-selection-section[aria-labelledby="hizmet-title"]');
    const guruSection = document.querySelector('.service-selection-advisors');
    if (!servicesGroup || !guruGrid || !summaryBar || !continueButton) {
      console.error('Hizmet seçimi ekranı başlatılamadı.');
      return;
    }

    summaryInfo?.setAttribute('aria-live', 'polite');
    summaryInfo?.setAttribute('aria-atomic', 'true');
    continueButton.setAttribute('data-action', 'checkout-preview');
    continueButton.disabled = true;
    continueButton.setAttribute('aria-disabled', 'true');
    if (guruCount) guruCount.textContent = '';

    const state = { service: null, guruId: null };
    const initial = window.Selection ? window.Selection.current() : { serviceId: null, guruId: null };

    // ── Veri ────────────────────────────────────────────────────────────────
    await window.sessionReady;
    let services = [];
    let advisors = [];
    let sectors = [];
    const results = await Promise.allSettled([
      Api.get('/public/services', { auth: false }),
      window.Advisors.list(),
      window.Advisors.sectors()
    ]);
    if (results[0].status === 'fulfilled') services = (results[0].value && results[0].value.items) || [];
    else Api.ui.showError(serviceSection || servicesGroup, results[0].reason, { position: 'append' });
    if (results[1].status === 'fulfilled') advisors = results[1].value || [];
    else Api.ui.showError(guruSection || guruGrid, results[1].reason, { position: 'append' });
    if (results[2].status === 'fulfilled') sectors = results[2].value || [];

    // ── Hizmet kartları (aktif hizmetler API'den + statik "Yakında") ───────────
    const grid = el('div', 'demo-service-grid');
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Hizmet seç');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px';
    const serviceCards = [];

    function buildServiceCard(model, available, index) {
      const card = el('div', 'demo-svc');
      const heading = el('div', 'demo-svc-heading');
      const icon = el('span', 'demo-svc-icon demo-svc-icon--' + model.icon);
      icon.innerHTML = SERVICE_ICONS[model.icon];
      const titleWrap = el('div', 'demo-svc-title-wrap');
      const badges = el('div', 'demo-svc-badges');
      const top = el('div', 'demo-svc-top');
      const check = el('span', 'demo-svc-check', '✓');
      check.setAttribute('aria-hidden', 'true');
      top.append(el('b', '', model.name), check);
      titleWrap.append(badges, top);
      heading.append(icon, titleWrap);
      const output = el('div', 'demo-svc-output');
      output.append(el('b', '', 'Çıktı'), el('span', '', model.output));
      const foot = el('div', 'demo-svc-foot');
      if (model.sessions) foot.appendChild(el('span', '', model.sessions));
      const price = el('span', 'demo-svc-price', model.price || '');
      if (!available) price.hidden = true;
      else price.classList.add('is-price');
      foot.appendChild(price);
      card.append(heading, el('p', '', model.desc));
      if (model.output) card.appendChild(output);
      card.appendChild(foot);
      if (available) {
        card.classList.add('demo-svc--featured');
        if (index === 0) badges.appendChild(el('span', 'service-badge service-badge--popular', 'En çok tercih edilen'));
        card.tabIndex = -1;
      } else {
        badges.appendChild(el('span', 'service-badge service-badge--soon', 'Yakında'));
        card.classList.add('demo-svc--soon');
        card.setAttribute('aria-disabled', 'true');
        card.setAttribute('aria-label', model.name + ', yakında');
        card.tabIndex = -1;
      }
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      return card;
    }

    services.forEach((service, index) => {
      const card = buildServiceCard({
        name: service.name,
        desc: service.description || '',
        output: outputText(service),
        sessions: sessionText(service),
        price: priceText(service),
        icon: service.code === 'sales_story' || index === 0 ? 'story' : 'document'
      }, true, index);
      card.dataset.serviceId = service.id;
      card.addEventListener('click', () => selectService(service.id));
      card.addEventListener('keydown', event => {
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (delta && services.length > 1) {
          event.preventDefault();
          const next = services[(index + delta + services.length) % services.length];
          selectService(next.id);
          serviceCards.find(item => item.dataset.serviceId === next.id)?.focus();
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          selectService(service.id);
        }
      });
      serviceCards.push(card);
      grid.appendChild(card);
    });
    if (serviceCards[0]) serviceCards[0].tabIndex = 0;
    SOON_SERVICES.forEach(model => grid.appendChild(buildServiceCard(model, false)));
    if (legacyServiceCard) {
      legacyServiceCard.parentElement.insertBefore(grid, legacyServiceCard);
      legacyServiceCard.remove();
    } else {
      servicesGroup.prepend(grid);
    }
    if (comingSoonRow) comingSoonRow.style.display = 'none';
    if (!services.length && results[0].status === 'fulfilled') {
      Api.ui.showError(serviceSection || servicesGroup, 'Şu anda satın alınabilir bir hizmet yok.', { tone: 'info', position: 'append' });
    }

    function selectService(id) {
      const service = services.find(item => item.id === id);
      if (!service) return;
      state.service = service;
      serviceCards.forEach(card => {
        const on = card.dataset.serviceId === id;
        card.classList.toggle('on', on);
        card.setAttribute('aria-checked', String(on));
        card.tabIndex = on ? 0 : -1;
      });
      guruGrid.setAttribute('data-selected-service', service.name);
      refresh();
    }

    // ── Danışman kartları (mevcut kart şablonundan) ───────────────────────────
    const cards = new Map();
    function buildGuruCard(advisor) {
      const card = guruTemplate ? guruTemplate.cloneNode(true) : el('div', 'guru-card');
      card.hidden = false;
      card.style.removeProperty('display');
      card.removeAttribute('data-guru-template');
      card.classList.remove('active', 'bg-[#51409D]', 'border-2', 'border-primary-petrol');
      card.classList.add('bg-white', 'border', 'border-[#7564C7]', 'demo-guru');
      card.dataset.guruId = advisor.id;
      card.dataset.guruName = advisor.ad;
      card.dataset.sectors = advisor.sektorKodlari.join('|');
      card.dataset.sector = advisor.sektorKodlari[0] || '';
      card.dataset.sectorTone = card.dataset.sector;
      card.dataset.recommended = 'false';
      const heading = card.querySelector('h3');
      if (heading) {
        heading.textContent = advisor.ad;
        heading.parentElement?.classList.add('demo-guru-header');
      }
      const avatar = card.querySelector('.rounded-full');
      if (avatar) avatar.textContent = Api.format.initials(advisor.ad);
      const paragraphs = card.querySelectorAll('p');
      if (paragraphs[0]) paragraphs[0].textContent = advisor.unvan;
      if (paragraphs[1]) {
        paragraphs[1].textContent = advisor.kisaTanitim || advisor.uzmanlikAlani;
      }
      const tagsRow = card.lastElementChild;
      if (tagsRow) {
        tagsRow.classList.add('demo-advisor-expertise');
        tagsRow.replaceChildren(...advisor.sektorler.map(name =>
          el('span', 'px-2 py-0.5 rounded bg-page-bg border border-card-border text-muted-text text-[11px]', name)));
        if (advisor.kidem) {
          const details = el('div', 'demo-advisor-details');
          details.appendChild(el('span', 'demo-advisor-experience', advisor.kidem + ' deneyim'));
          card.insertBefore(details, tagsRow);
        }
      }
      card.querySelector('.radio-indicator')?.remove();
      const radio = el('span', 'demo-radio');
      radio.setAttribute('aria-hidden', 'true');
      card.append(el('span', 'demo-advisor-selected', 'Seçildi'), radio);
      const profileLink = el('a', 'demo-advisor-profile-link', 'Profili gör →');
      const profileQuery = new URLSearchParams({ id: advisor.id, from: 'checkout' });
      if (state.service) profileQuery.set('service', state.service.id);
      profileLink.href = 'danisman.html?' + profileQuery.toString();
      profileLink.setAttribute('data-nav-skip', '');
      profileLink.addEventListener('click', event => {
        event.stopPropagation();
        if (state.service) {
          const query = new URLSearchParams({ id: advisor.id, from: 'checkout', service: state.service.id });
          profileLink.href = 'danisman.html?' + query.toString();
        }
      });
      card.appendChild(profileLink);
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('aria-label', advisor.ad);
      card.tabIndex = -1;
      card.addEventListener('click', event => {
        if (!event.target.closest('.demo-advisor-profile-link')) selectGuru(advisor.id);
      });
      card.addEventListener('keydown', event => {
        const visible = Array.from(cards.values()).filter(item => item.style.display !== 'none');
        const current = visible.indexOf(card);
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (delta && visible.length) {
          event.preventDefault();
          const next = visible[(current + delta + visible.length) % visible.length];
          next.focus();
          selectGuru(next.dataset.guruId);
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          selectGuru(advisor.id);
        }
      });
      return card;
    }
    advisors.forEach(advisor => {
      const card = buildGuruCard(advisor);
      cards.set(advisor.id, card);
      guruGrid.appendChild(card);
    });
    guruGrid.setAttribute('role', 'radiogroup');
    guruGrid.setAttribute('aria-labelledby', 'guru-title');

    // Sektör çipleri: yalnız danışmanı olan backend sektörleri (kod ile filtre).
    const usedCodes = new Set(advisors.flatMap(advisor => advisor.sektorKodlari));
    const sectorByCode = new Map();
    advisors.forEach(advisor => (advisor.card.sectors || []).forEach(sector => sectorByCode.set(sector.code, sector)));
    const sectorList = (sectors.length ? sectors : Array.from(sectorByCode.values()))
      .filter(sector => usedCodes.has(sector.code))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    let activeSector = 'all';
    if (sectorChips && chipTemplate) {
      sectorList.forEach(sector => {
        const chip = chipTemplate.cloneNode(true);
        chip.dataset.sectorFilter = sector.code;
        chip.textContent = sector.name;
        chip.setAttribute('aria-pressed', 'false');
        sectorChips.appendChild(chip);
      });
    }
    const allChip = sectorChips?.querySelector('[data-sector-filter="all"]');
    const activeChipClass = allChip ? allChip.className : '';
    const idleChipClass = chipTemplate ? chipTemplate.className : '';
    sectorChips?.querySelectorAll('[data-sector-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeSector = chip.dataset.sectorFilter || 'all';
        sectorChips.querySelectorAll('[data-sector-filter]').forEach(item => {
          const pressed = item === chip;
          item.setAttribute('aria-pressed', String(pressed));
          if (activeChipClass && idleChipClass) item.className = pressed ? activeChipClass : idleChipClass;
        });
        filterGurus();
      });
    });

    const emptyState = el('p', 'guru-empty-state', advisors.length ? 'Filtreye uygun danışman bulunamadı.' : 'Şu anda listelenen danışman yok.');
    emptyState.setAttribute('role', 'status');
    emptyState.setAttribute('aria-live', 'polite');
    emptyState.hidden = true;
    guruGrid.insertAdjacentElement('afterend', emptyState);

    function filterGurus() {
      const query = normalize(searchInput?.value.trim());
      let visibleCount = 0;
      cards.forEach(card => {
        const matchesQuery = !query || normalize(card.textContent).includes(query);
        const matchesSector = activeSector === 'all' || card.dataset.sectors.split('|').includes(activeSector);
        const visible = matchesQuery && matchesSector;
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount += 1;
      });
      emptyState.hidden = visibleCount > 0;
      if (guruCount) guruCount.textContent = visibleCount + ' danışman';
      const selected = state.guruId && cards.get(state.guruId);
      const selectedVisible = selected && selected.style.display !== 'none';
      cards.forEach(card => { card.tabIndex = -1; });
      if (selectedVisible) selected.tabIndex = 0;
      else {
        const first = Array.from(cards.values()).find(card => card.style.display !== 'none');
        if (first) first.tabIndex = 0;
      }
    }
    searchInput?.addEventListener('input', filterGurus);

    function selectGuru(id) {
      state.guruId = cards.has(id) ? id : null;
      cards.forEach((card, cardId) => {
        const selected = cardId === state.guruId;
        card.classList.toggle('demo-sel', selected);
        card.classList.toggle('demo-unsel', !selected);
        card.classList.toggle('active', selected);
        card.setAttribute('aria-checked', String(selected));
        const radio = card.querySelector('.demo-radio');
        if (radio) radio.textContent = selected ? '✓' : '';
      });
      refresh();
      filterGurus();
    }

    // ── Alt özet çubuğu + URL ────────────────────────────────────────────────
    function refresh() {
      const service = state.service;
      const advisor = state.guruId ? advisors.find(item => item.id === state.guruId) : null;
      if (barName) barName.textContent = service ? service.name : 'Hizmet seçilmedi';
      if (barSessions) barSessions.textContent = service ? sessionText(service) : 'Seans ve süre seçilmedi';
      if (barPrice) {
        barPrice.textContent = service ? priceText(service) : 'Fiyat hizmete göre';
        barPrice.classList.toggle('is-total', Boolean(service && service.price));
      }
      if (barTax) barTax.hidden = !(service && service.price && Number(service.price.amount_minor) > 0);
      if (barGuruLabel) {
        barGuruLabel.textContent = advisor ? advisor.ad : '';
        barGuruLabel.hidden = !advisor;
      }
      if (barAvatar) {
        barAvatar.textContent = advisor ? Api.format.initials(advisor.ad) : '';
        barAvatar.hidden = !advisor;
      }
      const canContinue = Boolean(service && advisor);
      const wasReady = summaryBar.classList.contains('is-ready');
      continueButton.disabled = !canContinue;
      continueButton.setAttribute('aria-disabled', String(!canContinue));
      continueButton.title = canContinue ? '' : !service ? 'Önce bir hizmet seç' : 'Önce bir danışman seç';
      summaryBar.classList.toggle('is-ready', canContinue);
      if (barHint) {
        barHint.textContent = !service ? 'Önce bir hizmet seç' : !advisor ? 'Önce bir danışman seç' : '';
        barHint.hidden = canContinue;
      }
      if (canContinue && !wasReady) {
        continueButton.classList.remove('is-just-enabled');
        void continueButton.offsetWidth;
        continueButton.classList.add('is-just-enabled');
        window.setTimeout(() => continueButton.classList.remove('is-just-enabled'), 700);
      }
      if (continueWrap) Api.ui.clearError(continueWrap.querySelector(':scope > .api-alert') || continueWrap);
      if (window.Selection) {
        const query = window.Selection.toQuery({ serviceId: service && service.id, guruId: advisor && advisor.id });
        try {
          history.replaceState(history.state, '', location.pathname + (query ? '?' + query : ''));
        } catch (error) { /* yok say */ }
      }
    }

    continueButton.addEventListener('click', async event => {
      event.preventDefault();
      if (continueButton.disabled || !state.service || !state.guruId) return;
      const selection = { serviceId: state.service.id, guruId: state.guruId };
      try {
        await Api.ui.withLoading(continueButton, () => window.Selection.preview(selection), { text: 'Kontrol ediliyor...' });
        location.href = window.Selection.href('siparis.html', selection);
      } catch (error) {
        Api.ui.showError(continueWrap || summaryBar, error, { position: 'append', fallback: 'Sipariş özeti hazırlanamadı. Lütfen tekrar dene.' });
      }
    });

    // ── Başlangıç seçimi (URL: ?service=&guru=) ─────────────────────────────────
    const requestedAdvisor = initial.guruId ? advisors.find(item => item.id === initial.guruId) : null;
    if (requestedAdvisor && serviceSection) {
      const headingBlock = serviceSection.querySelector('.service-section-heading');
      const banner = el('p', 'service-requested-advisor-banner');
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      const change = el('a', '', 'Danışmanı değiştir');
      change.href = 'danismanlar.html';
      banner.append(el('span', '', 'Danışmanın: ' + requestedAdvisor.ad + '. Şimdi hizmeti seç.'), change);
      headingBlock?.insertAdjacentElement('afterend', banner);
    }
    if (initial.serviceId && services.some(item => item.id === initial.serviceId)) selectService(initial.serviceId);
    selectGuru(requestedAdvisor ? requestedAdvisor.id : null);
    refresh();
  }

  function start() {
    init().catch(error => {
      console.error('Hizmet seçimi yüklenemedi:', error && error.message);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
