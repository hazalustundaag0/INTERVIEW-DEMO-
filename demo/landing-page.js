// landing-page.js — / (landing) düzeni ve dinamik blokları. SAHİBİ: 82 Aday Onboarding UI Agent.
// Veri: danışmanlar → window.Advisors (GET /public/gurus), hizmet kartı → GET /public/services
// (ad, açıklama, seans sayısı/süresi), oturum → window.sessionReady, "kaydın var mı" → GET /candidate/enrollments.
// Kaldırılan demo davranışı (GAP-D07/B03): sahte istatistik şeridi (250+ seans, 4,8 puan …), tanıtım
// videosu kartının yerine basılan örnek hikâye, danışman puanı ve "müsaitlik" metni. localStorage yok.
// "Sana kalan çıktılar" örnek kartları (landing-outputs.js) "Örnek" etiketli pazarlama içeriğidir (K57 gibi).
(function () {
  'use strict';
  const page = window.Routes.page();
  if (page !== '/') return;

  async function candidateHasEnrollment() {
    try {
      const result = await window.Api.page('/candidate/enrollments', { limit: 1, redirectOn401: false });
      return result.items.some(item => item.status === 'active' || item.status === 'completed' || item.status === 'pending_payment');
    } catch (error) {
      return false;
    }
  }

  // Hizmet CTA'sı: aktif kaydı olan aday randevuya, diğerleri danışman seçimine.
  function getServiceCta(session, hasEnrollment) {
    if (session && session.role === 'danisan' && hasEnrollment) {
      return { href: '/panel', loginHref: '', disabled: false, title: '' };
    }
    return {
      href: '/danismanlar',
      loginHref: !(session && session.role) ? '/giris?return=' + encodeURIComponent('/danismanlar') : '',
      disabled: false,
      title: ''
    };
  }
  window.getServiceCta = getServiceCta;

  // K102/K103 (Etap 6): sabit örnek danışman kartları YALNIZ yerel önizleme modunda (dev sunucusu + ?onizleme=).
  // Gerçek oturumda / Docker'da API yanıt vermezse liste boş kalır (sahte veri yok, K79).
  function localSeedAdvisors() {
    if (window.APP_PREVIEW !== true) return [];

    const profiles = [
      {
        id: '019a4a00-0000-7000-8000-000000000201',
        ad: 'Deniz Kurgu',
        unvan: 'Kariyer Koçu',
        sectors: [{ code: 'technology', name: 'Teknoloji / Yazılım', sort_order: 10 }, { code: 'consulting', name: 'Danışmanlık', sort_order: 70 }]
      },
      {
        id: '019a4a00-0000-7000-8000-000000000202',
        ad: 'Ece Örnek',
        unvan: 'İK Danışmanı',
        sectors: [{ code: 'finance_banking', name: 'Finans / Bankacılık', sort_order: 20 }, { code: 'retail_fmcg', name: 'Perakende / Hızlı Tüketim', sort_order: 30 }, { code: 'education', name: 'Eğitim', sort_order: 80 }]
      },
      {
        id: '019a4a00-0000-7000-8000-000000000203',
        ad: 'Mert Demo',
        unvan: 'Satış Lideri ve Mentor',
        sectors: [{ code: 'telecom', name: 'Telekomünikasyon', sort_order: 60 }, { code: 'manufacturing', name: 'Üretim / Sanayi', sort_order: 40 }, { code: 'technology', name: 'Teknoloji / Yazılım', sort_order: 10 }]
      },
      {
        id: '019a4a00-0000-7000-8000-000000000204',
        ad: 'Selin Taslak',
        unvan: 'Yetenek Danışmanı',
        sectors: [{ code: 'education', name: 'Eğitim', sort_order: 80 }, { code: 'consulting', name: 'Danışmanlık', sort_order: 70 }]
      },
      {
        id: '019a4a00-0000-7000-8000-000000000205',
        ad: 'Can Deneme',
        unvan: 'Yönetici Koçu',
        sectors: [{ code: 'finance_banking', name: 'Finans / Bankacılık', sort_order: 20 }, { code: 'technology', name: 'Teknoloji / Yazılım', sort_order: 10 }]
      }
    ];

    return profiles.map(profile => ({
      ...profile,
      sektorler: profile.sectors.map(sector => sector.name),
      avatarUrl: '',
      isSample: true,
      card: { sectors: profile.sectors }
    }));
  }

  // E6-13 (Etap 12): SSS / Kimler için / Nasıl çalışır / yol haritası GET /public/content/{key}'den.
  // API erişilemezse (ya da alan eksikse) aşağıdaki statik metinler yedek olarak kalır. Sayfa K115 gereği
  // page-pending ile gizli açıldığı için içerik gelene kadar eski metin boyanmaz (kısa zaman aşımı: 4 sn).
  const CONTENT_KEYS = ['faq', 'audiences', 'howto', 'roadmap'];
  function loadContent() {
    return Promise.all(CONTENT_KEYS.map(key => window.Api.get('/public/content/' + key, { auth: false, query: { locale: 'tr' }, timeoutMs: 4000 })
      .then(res => (res && res.content) || null).catch(() => null)))
      .then(list => Object.fromEntries(CONTENT_KEYS.map((key, i) => [key, list[i]])));
  }
  const byOrder = items => (Array.isArray(items) ? items.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : []);
  const textOk = v => typeof v === 'string' && v.trim() !== '';

  async function renderLanding() {
    if (page !== '/') return;
    const contentPromise = loadContent();
    const session = await (window.sessionReady || Promise.resolve(window.getSession ? window.getSession() : {}));
    const hasEnrollment = session && session.role === 'danisan' ? await candidateHasEnrollment() : false;
    const cms = await contentPromise;
    const lowerSections = [
      { title: 'Nasıl çalışır?', label: 'Adım Adım Süreç', id: 'nasil-calisir' },
      { title: 'Yapay zekâ senin yerine hikâye uydurmaz', label: 'Güvenilir ve Şeffaf', id: 'guvenilir-ve-seffaf' },
      { title: 'Sana kalan çıktılar', label: 'Süreç Çıktıları', id: 'sana-kalan-ciktilar' },
      { title: 'Danışmanlarınla tanış', label: 'DANIŞMANLAR', id: 'danismanlar' },
      { title: 'Hizmetler', label: 'HİZMETLER', id: 'hizmetler' }
    ];
    lowerSections.forEach(({ title, label, id }) => {
      const section = Array.from(document.querySelectorAll('main section')).find(item =>
        item.querySelector('h2')?.textContent.trim() === title
      );
      if (!section) return;

      section.classList.add('landing-lower-section');
      if (id) section.id = id;
      const container = section.firstElementChild;
      container?.classList.add('landing-section-container');

      const heading = section.querySelector('h2')?.parentElement;
      const headingTitle = heading?.querySelector('h2');
      if (!heading || !headingTitle) return;
      if (id === 'guvenilir-ve-seffaf') {
        headingTitle.textContent = 'Yapay zekâ senin yerine hikâye uydurmaz';
      }
      const sectionHeadingId = `landing-heading-${id || 'section'}`;
      headingTitle.id = sectionHeadingId;
      section.setAttribute('aria-labelledby', sectionHeadingId);

      const oldEyebrow = Array.from(heading.children).find(child =>
        child !== headingTitle && child.tagName === 'DIV'
      );
      const description = Array.from(heading.children).find(child =>
        child.tagName === 'P'
      );
      const eyebrowText = oldEyebrow?.querySelector('span')?.textContent.trim() || label;
      const eyebrow = document.createElement('div');
      eyebrow.className = 'landing-section-eyebrow';
      const rule = document.createElement('span');
      rule.className = 'landing-section-rule';
      rule.setAttribute('aria-hidden', 'true');
      const eyebrowLabel = document.createElement('span');
      eyebrowLabel.textContent = eyebrowText;
      eyebrow.append(rule, eyebrowLabel);

      heading.className = 'landing-section-heading';
      heading.replaceChildren(eyebrow, headingTitle);
      if (description) heading.appendChild(description);
    });
    const processAiTitle = Array.from(document.querySelectorAll('#nasil-calisir h3'))
      .find(item => item.textContent.trim() === 'Yapay zekâ ile hikâyeni yaz');
    if (processAiTitle) processAiTitle.textContent = 'Yapay zekâ ile hikâyeni yaz';
    const processAiDescription = Array.from(document.querySelectorAll('#nasil-calisir p'))
      .find(item => item.textContent.includes('Yapay zekâ ilk taslağı yazsın'));
    if (processAiDescription) {
      processAiDescription.textContent = processAiDescription.textContent.replace('Yapay zekâ ilk taslağı yazsın', 'yapay zekâ ilk taslağı yazsın');
    }

    const advisorsSection = document.getElementById('danismanlar');
    const advisorsContainer = advisorsSection?.querySelector('.landing-section-container');
    const advisorsHeading = advisorsContainer?.querySelector('.landing-section-heading');
    const allAdvisorsLink = advisorsContainer && Array.from(advisorsContainer.querySelectorAll('a'))
      .find(link => link.textContent.trim() === 'Tüm Danışmanları Gör →');
    if (advisorsHeading && allAdvisorsLink) {
      allAdvisorsLink.href = '/danismanlar';
      const headingLayout = document.createElement('div');
      headingLayout.className = 'landing-advisors-heading';
      advisorsHeading.replaceWith(headingLayout);
      headingLayout.append(advisorsHeading, allAdvisorsLink);
      allAdvisorsLink.classList.add('landing-advisors-all');
    }

    const advisorGrid = advisorsContainer?.querySelector('.grid');
    // Prefer public profiles; only fall back to the repository's dev seed on local hosts.
    let advisors = [];
    let advisorLoadFailed = false;
    try {
      advisors = window.Advisors ? (await window.Advisors.list({ limit: 9 })).slice(0, 9) : [];
    } catch (error) {
      advisorLoadFailed = true;
      console.error('Danışman listesi yüklenemedi:', error && error.message);
    }
    if (!advisors.length) {
      advisors = localSeedAdvisors();
      if (advisors.length) {
        console.warn('Danışman API’si yanıt vermedi; yerel geliştirme seed profilleri gösteriliyor.');
      }
    }
    if (advisorGrid && Array.isArray(advisors) && advisors.length) {
      advisorGrid.replaceChildren(...advisors.map((advisor, advisorIndex) => {
        const sectors = Array.isArray(advisor.sektorler) ? advisor.sektorler.filter(Boolean) : [];
        const el = (tag, className, text) => {
          const node = document.createElement(tag);
          if (className) node.className = className;
          if (text != null) node.textContent = text;
          return node;
        };

        // Dikey slayt kartı: tam yüzey mor geçiş, üstte serif ad + unvan, ortada avatar, altta uzmanlık + bağlantı.
        const card = el('a', 'advisor-slide advisor-slide--tone' + ((advisorIndex % 3) + 1));
        card.href = `/danisman?id=${encodeURIComponent(advisor.id)}`;
        card.dataset.advisorId = advisor.id;
        card.setAttribute('aria-label', `${advisor.ad} profilini gör`);

        const bg = el('div', 'advisor-slide-bg');
        bg.setAttribute('aria-hidden', 'true');
        const bubbleLayouts = [
          [{ top: '18%', left: '-8%', size: 7 }, { top: '58%', left: '70%', size: 9, accent: true }, { top: '84%', left: '8%', size: 5 }],
          [{ top: '12%', left: '72%', size: 6, accent: true }, { top: '44%', left: '-12%', size: 10 }, { top: '76%', left: '62%', size: 6 }],
          [{ top: '24%', left: '78%', size: 5 }, { top: '62%', left: '-10%', size: 8, accent: true }, { top: '8%', left: '6%', size: 4 }]
        ];
        bubbleLayouts[advisorIndex % bubbleLayouts.length].forEach(bubble => {
          const ghost = el('span', 'advisor-slide-bubble' + (bubble.accent ? ' advisor-slide-bubble--accent' : ''));
          ghost.style.top = bubble.top;
          ghost.style.left = bubble.left;
          ghost.style.width = ghost.style.height = bubble.size + 'rem';
          bg.appendChild(ghost);
        });

        const head = el('div', 'advisor-slide-head');
        head.append(el('h3', 'advisor-slide-name', advisor.ad), el('p', 'advisor-slide-role', advisor.unvan || 'Danışman'));

        const avatarWrap = el('div', 'advisor-slide-avatar-wrap');
        const avatar = el('div', 'advisor-slide-avatar');
        // K83: fotoğraf varsa <img> (public katalog ucu), yoksa baş harfler — avatar.js çizer.
        avatar.dataset.demoAvatar = '';
        avatar.dataset.avatarName = advisor.ad;
        if (advisor.avatarUrl) avatar.dataset.avatarUrl = advisor.avatarUrl;
        avatar.setAttribute('role', 'img');
        avatar.setAttribute('aria-label', advisor.ad);
        avatar.textContent = Api.format.initials(advisor.ad);
        avatarWrap.appendChild(avatar);

        const foot = el('div', 'advisor-slide-foot');
        if (sectors.length) {
          const chips = el('div', 'advisor-slide-chips');
          sectors.slice(0, 2).forEach(name => chips.appendChild(el('span', 'advisor-slide-chip', name)));
          if (sectors.length > 2) chips.appendChild(el('span', 'advisor-slide-chip advisor-slide-chip--more', '+' + (sectors.length - 2)));
          foot.appendChild(chips);
        }
        const cta = el('span', 'advisor-slide-cta');
        const arrow = el('span', 'advisor-slide-cta-arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        cta.append(el('span', '', 'Profili incele'), arrow);
        foot.appendChild(cta);

        card.append(bg, head, avatarWrap, foot);
        return card;
      }));
    } else if (advisorGrid) {
      // Outside local development, do not render seed profiles if the public API is unavailable.
      advisorGrid.replaceChildren();
      advisorGrid.style.display = 'none';
      const emptyState = document.createElement('p');
      emptyState.className = 'landing-advisor-empty';
      emptyState.textContent = advisorLoadFailed
        ? 'Danışman profilleri şu anda yüklenemiyor.'
        : 'Henüz görüntülenebilecek danışman profili yok.';
      (advisorsContainer?.querySelector('.landing-advisors-heading') || advisorsHeading)
        ?.insertAdjacentElement('afterend', emptyState);
    }
    if (advisorGrid) advisorGrid.classList.add('landing-advisor-grid');
    // Danışman kartları yatay kaydırıcı: ok düğmeleri, kaydırma çubuğu yerine yatay kaydırma + yapışma.
    if (advisorGrid && advisorGrid.children.length) {
      advisorGrid.classList.add('landing-advisor-slider');
      advisorGrid.setAttribute('role', 'region');
      advisorGrid.setAttribute('aria-label', 'Danışmanlar');
      advisorGrid.tabIndex = 0;
      const controls = document.createElement('div');
      controls.className = 'landing-slider-controls';
      const makeArrow = (dir, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'landing-slider-btn';
        b.setAttribute('aria-label', label);
        b.setAttribute('data-nav-skip', '');
        b.innerHTML = '<span class="landing-slider-arrow landing-slider-arrow--' + dir + '" aria-hidden="true"></span>';
        return b;
      };
      const prev = makeArrow('prev', 'Önceki danışmanlar');
      const next = makeArrow('next', 'Sonraki danışmanlar');
      controls.append(prev, next);
      const step = () => {
        const card = advisorGrid.firstElementChild;
        const gap = parseFloat(getComputedStyle(advisorGrid).columnGap || getComputedStyle(advisorGrid).gap) || 0;
        return card ? card.getBoundingClientRect().width + gap : advisorGrid.clientWidth;
      };
      const update = () => {
        const max = advisorGrid.scrollWidth - advisorGrid.clientWidth - 2;
        prev.disabled = advisorGrid.scrollLeft <= 2;
        next.disabled = advisorGrid.scrollLeft >= max;
        controls.hidden = max <= 0;
      };
      prev.addEventListener('click', () => advisorGrid.scrollBy({ left: -step(), behavior: 'smooth' }));
      next.addEventListener('click', () => advisorGrid.scrollBy({ left: step(), behavior: 'smooth' }));
      advisorGrid.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
      window.addEventListener('resize', update);
      const headingRow = advisorsContainer.querySelector('.landing-advisors-heading');
      const allLink = headingRow && headingRow.querySelector('.landing-advisors-all');
      if (allLink) {
        const actions = document.createElement('div');
        actions.className = 'landing-advisors-actions';
        allLink.replaceWith(actions);
        actions.append(allLink, controls);
      } else {
        advisorGrid.insertAdjacentElement('beforebegin', controls);
      }
      setTimeout(update, 0);
    }
    if (advisorGrid) {
      const sectorLinks = document.createElement('div');
      sectorLinks.className = 'landing-advisor-sector-links';
      const sectorLabel = document.createElement('span');
      sectorLabel.textContent = 'Sektöre göre incele';
      sectorLinks.appendChild(sectorLabel);
      const sectorMap = new Map();
      advisors.forEach(advisor => (advisor.card.sectors || []).forEach(sector => sectorMap.set(sector.code, sector)));
      Array.from(sectorMap.values())
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .slice(0, 6)
        .forEach(sector => {
          const link = document.createElement('a');
          link.href = `/danismanlar?sektor=${encodeURIComponent(sector.code)}`;
          link.textContent = sector.name;
          sectorLinks.appendChild(link);
        });
      if (sectorMap.size) advisorGrid.insertAdjacentElement('afterend', sectorLinks);
      const emptyLinkWrapper = Array.from(advisorsContainer.children).find(child =>
        child !== sectorLinks && !child.textContent.trim() && child.classList.contains('mt-8')
      );
      emptyLinkWrapper?.remove();
    }

    const servicesSection = document.getElementById('hizmetler');
    const servicesContainer = servicesSection?.querySelector('.landing-section-container');
    const serviceCard = servicesContainer && Array.from(servicesContainer.children)
      .find(child => child.querySelector('h3')?.textContent.trim() === 'Satış hikâyesi oluşturma');
    if (serviceCard) {
      serviceCard.classList.add('landing-service-card');
      serviceCard.firstElementChild?.classList.add('landing-service-copy');
      serviceCard.lastElementChild?.classList.add('landing-service-action');
      const copy = serviceCard.querySelector('.landing-service-copy');
      const packageLabel = document.createElement('span');
      packageLabel.className = 'landing-service-package-label';
      packageLabel.textContent = 'ÖNE ÇIKAN PAKET';
      const features = document.createElement('ul');
      features.className = 'landing-service-features';
      features.setAttribute('aria-label', 'Pakete dahil olanlar');
      const sessionFeature = document.createElement('li');
      sessionFeature.dataset.packageSessions = '';
      sessionFeature.hidden = true;
      const draftFeature = document.createElement('li');
      draftFeature.textContent = 'Kaynak doğrulamalı AI taslak';
      const outputsFeature = document.createElement('li');
      const outputCount = document.querySelectorAll('#sana-kalan-ciktilar .landing-output-card').length;
      if (outputCount) {
        outputsFeature.textContent = `${outputCount} formatta hazır PDF çıktı`;
      } else {
        outputsFeature.hidden = true;
      }
      features.append(sessionFeature, draftFeature, outputsFeature);
      if (copy) {
        const title = copy.querySelector('h3');
        title?.insertAdjacentElement('beforebegin', packageLabel);
        const description = copy.querySelector('h3 + p');
        description?.insertAdjacentElement('afterend', features);
        const sessionMeta = copy.querySelector('.material-symbols-outlined')?.parentElement;
        if (sessionMeta instanceof HTMLElement) sessionMeta.hidden = true;
      }
    }
    // Hizmet kartı + hero alt bilgisi: aktif hizmetin gerçek adı, açıklaması, seans sayısı/süresi (BR-05).
    try {
      const services = await window.Api.get('/public/services', { auth: false });
      const service = services && services.items && services.items[0];
      if (service) {
        const sessionLabel = `${service.session_count} seans · her seans ${service.session_duration_minutes} dk`;
        if (serviceCard) {
          const title = serviceCard.querySelector('h3');
          const description = serviceCard.querySelector('h3 + p');
          const meta = serviceCard.querySelector('.material-symbols-outlined + span');
          const packageSessions = serviceCard.querySelector('[data-package-sessions]');
          if (title) title.textContent = service.name;
          if (description && service.description) description.textContent = service.description;
          if (meta) meta.textContent = sessionLabel;
          if (packageSessions) {
            packageSessions.textContent = `${service.session_count} × ${service.session_duration_minutes} dk birebir danışman seansı`;
            packageSessions.hidden = false;
          }
        }
        const heroMeta = document.querySelector('.landing-hero-copy .material-symbols-outlined + span');
        if (heroMeta) heroMeta.textContent = sessionLabel;
      }
    } catch (error) {
      console.error('Hizmet bilgisi yüklenemedi:', error && error.message);
    }
    const comingSoon = servicesContainer && Array.from(servicesContainer.children)
      .find(child => child.textContent.trim().startsWith('Yakında:'));
    if (comingSoon) comingSoon.remove();
    // ─── "Satış hikâyeni nasıl oluşturursun?" — hikâye aracını adım adım tanıtır ──────────────
    // Solda dizüstü çerçevesinde küçük, kurgusal arayüz önizlemesi; sağda açılır adımlar.
    // İçerik: Müşteri Gereksinimleri raporu v1.4.3 + yeni hikâye akışı (yaz → öneriler → hazır).
    // ─── Hizmetler: ortalanmış, mor geçişli büyük kart (Anima örneği gibi) ─────────────────────
    const serviceHero = servicesSection && servicesSection.querySelector('.landing-service-card');
    if (serviceHero && !serviceHero.id) {
      servicesSection.classList.add('landing-services--hero');
      serviceHero.id = 'landing-service-hero';
      const primary = serviceHero.querySelector('.landing-service-action a:not(.landing-service-login)');
      if (primary) {
        primary.id = 'landing-service-cta';
        primary.textContent = 'Satış hikâyeni oluştur';
        const chev = document.createElement('span');
        chev.className = 'landing-service-chevron';
        chev.setAttribute('aria-hidden', 'true');
        primary.appendChild(chev);
      }
    }

    // ─── "Nasıl çalışır?" — organik adalar içinde illüstrasyonlar, ortada yolculuk ────────────
    // Referans: dans portfolyosundaki "ada" düzeni. Fotoğraf yerine tema renklerinde, kurgusal
    // SVG insan çizimleri kullanılır (gerçek kişi görseli yok). İçerik: rapor v1.4.3 akışı.
    const journeySection = document.getElementById('nasil-calisir');
    if (journeySection && !journeySection.querySelector('.journey-stage')) {
      // Üç büyük organik ada metni çevreler; içleri açık mordan koyu mora, laciverte ve siyaha geçer.
      const islands = [
        { cls: 'top', view: '0 0 600 200', grad: ['#ddd6fe', '#a78bfa', '#6d28d9'], angle: [0, 0, 1, 1],
          path: 'M20 92 C8 34 84 4 172 18 C262 32 304 8 384 14 C474 20 592 30 590 94 C588 152 520 128 430 140 C340 152 300 192 210 186 C120 180 32 156 20 92 Z' },
        { cls: 'left', view: '0 0 200 500', grad: ['#a78bfa', '#5b21b6', '#1e1b4b', '#0F0A1C'], angle: [0, 0, 0.3, 1],
          path: 'M60 10 C130 0 192 60 172 142 C152 222 90 242 110 322 C130 402 192 442 152 482 C112 516 30 500 15 430 C0 360 20 300 15 220 C10 140 0 26 60 10 Z' },
        { cls: 'right', view: '0 0 220 560', grad: ['#c4b5fd', '#7c3aed', '#312e81', '#0F0A1C'], angle: [0.2, 0, 0.6, 1],
          path: 'M120 10 C190 20 216 90 210 180 C205 270 170 300 186 380 C202 460 216 530 150 552 C90 572 30 530 50 460 C70 390 120 360 90 290 C60 220 10 200 20 120 C30 40 60 5 120 10 Z' }
      ];
      const steps = [
        ['Önce', 'Hizmeti ve danışmanını seç. Profilini doldurup KVKK onayını verdikten sonra ilk randevunu al.'],
        ['1. seans · 60 dk', 'Danışmanınla kariyer hedefini, geçiş noktalarını ve motivasyonlarını konuşursun. Seansın sonunda hikâye teman ve danışman notun hazır olur.'],
        ['Arada', 'Hikâyeni kendi cümlelerinle yaz ya da konuşarak anlat; yapay zekâ eksikleri öneri olarak göstersin. Hazır olduğunda danışmanına gönder.'],
        ['2. seans · 60 dk', 'Hikâyeni danışmanınla birlikte kurgular, canlı prova yapar ve geri bildirim alırsın.'],
        ['Sonra', 'Satış hikâyen, kısa özetin, mülakat cevapların ve CV özetin Türkçe ya da İngilizce PDF olarak seninle.']
      ];
      const proc = cms.howto && cms.howto.process;
      if (proc && byOrder(proc.steps).length) {
        steps.splice(0, steps.length, ...byOrder(proc.steps).filter(x => textOk(x.label) && textOk(x.text)).map(x => [x.label, x.text]));
      }

      const stage = document.createElement('div');
      stage.className = 'journey-stage';
      islands.forEach((island, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'journey-island journey-island--' + island.cls;
        wrap.setAttribute('aria-hidden', 'true');
        const stops = island.grad.map((color, k) => `<stop offset="${Math.round((k / (island.grad.length - 1)) * 100)}%" stop-color="${color}"/>`).join('');
        const [x1, y1, x2, y2] = island.angle;
        wrap.innerHTML = `<svg viewBox="${island.view}" preserveAspectRatio="none"><defs>` +
          `<linearGradient id="journey-grad-${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>` +
          `<radialGradient id="journey-glow-${i}" cx="30%" cy="25%" r="60%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".35"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>` +
          `</defs><path d="${island.path}" fill="url(#journey-grad-${i})"/><path d="${island.path}" fill="url(#journey-glow-${i})"/></svg>`;
        stage.appendChild(wrap);
      });

      const center = document.createElement('div');
      center.className = 'journey-center';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'landing-section-eyebrow journey-eyebrow';
      eyebrow.innerHTML = '<span class="landing-section-rule" aria-hidden="true"></span><span></span>';
      eyebrow.lastChild.textContent = (proc && textOk(proc.eyebrow)) ? proc.eyebrow : 'Adım Adım Süreç';
      const h2 = document.createElement('h2');
      h2.className = 'journey-title';
      h2.id = 'landing-heading-nasil-calisir';
      h2.textContent = (proc && textOk(proc.title)) ? proc.title : 'Nasıl çalışır?';
      const lead = document.createElement('p');
      lead.className = 'journey-lead';
      lead.textContent = (proc && textOk(proc.lead)) ? proc.lead : 'İki danışman seansı, arada senin çalışman.';
      const list = document.createElement('ol');
      list.className = 'journey-list';
      steps.forEach(([label, text], i) => {
        const li = document.createElement('li');
        li.className = 'journey-row' + (i === 2 ? ' journey-row--you' : '');
        const l = document.createElement('span');
        l.className = 'journey-label';
        l.textContent = label;
        const t = document.createElement('p');
        t.className = 'journey-text';
        t.textContent = text;
        if (i === 2) {
          const more = document.createElement('a');
          more.href = '#hikaye-araci';
          more.className = 'journey-more';
          more.setAttribute('data-nav-skip', '');
          more.textContent = 'Hikâye Aracı’nı incele ↓';
          t.append(' ', more);
        }
        li.append(l, t);
        list.appendChild(li);
      });
      center.append(eyebrow, h2, lead, list);
      stage.appendChild(center);

      const container = journeySection.querySelector('.landing-section-container') || journeySection.firstElementChild;
      journeySection.setAttribute('aria-labelledby', h2.id);
      journeySection.classList.add('journey-section');
      container.replaceChildren(stage);
    }

    const processSection = document.getElementById('nasil-calisir');
    if (processSection && !document.getElementById('hikaye-araci')) {
      const mk = (tag, cls, text) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
      };
      const line = width => { const l = mk('span', 'howto-line'); l.style.width = width; return l; };

      const steps = [
        {
          title: 'Hikâyeni yaz ya da konuşarak anlat',
          text: 'Sana “Kendinden bahseder misin?” diye sorulmuş gibi düşün ve nasıl anlatıyorsan öyle yaz. İstersen “Konuşarak yaz” ile anlat; söylediklerin yazıya dökülür, ses kaydı saklanmaz. Nereden başlayacağını bilmiyorsan yol gösteren sorular seni bekliyor.',
          screen() {
            const s = mk('div', 'howto-screen');
            s.append(mk('p', 'howto-screen-title', 'Hikâyeni anlat'));
            const box = mk('div', 'howto-editor');
            box.append(mk('p', 'howto-typed', 'Yaklaşık bir yıldır iş analisti stajyeri olarak çalışıyorum. Projelerde müşterilerle toplantılara katılıyor, ihtiyaçları analiz dokümanına çeviriyorum'), mk('span', 'howto-caret'));
            const meta = mk('div', 'howto-row');
            meta.append(mk('span', 'howto-muted', '184 kelime · yaklaşık 1,4 dk'));
            const mic = mk('span', 'howto-pill howto-pill--rec');
            mic.append(mk('span', 'howto-dot'), document.createTextNode('Dinliyorum…'));
            meta.append(mic);
            s.append(box, meta);
            return s;
          }
        },
        {
          title: 'CV’ni ekle (isteğe bağlı)',
          text: 'CV’ni PDF ya da Word olarak eklersen hikâyen her okumada CV’nle karşılaştırılır ve uyuşmayan yerler gösterilir. CV’ndeki rakam, proje ve sertifikalar sana listelenir; hangisinin hikâyene gireceğine sen karar verirsin.',
          screen() {
            const s = mk('div', 'howto-screen');
            const file = mk('div', 'howto-file');
            file.append(mk('span', 'howto-file-icon', 'PDF'), mk('span', 'howto-strong', 'cv.pdf'), mk('span', 'howto-muted', '· 1 sayfa'));
            s.append(file, mk('p', 'howto-screen-sub', 'CV’nden hikâyene girebilecek bilgiler'));
            [['SQL ve Jira kullanımı', true], ['Scrum sertifikası, 2025', true], ['Mobil uygulama projesi', false]].forEach(([t, on]) => {
              const r = mk('div', 'howto-check' + (on ? ' is-on' : ''));
              r.append(mk('span', 'howto-box'), mk('span', '', t));
              s.append(r);
            });
            return s;
          }
        },
        {
          title: 'Yapay zekâ önerilerini incele',
          text: 'Yapay zekâ metnini okur; eksik eylemleri, belirsiz ifadeleri ve CV’nle uyuşmayan yerleri kart kart gösterir. Her öneriyi kendi cümlenle ekler, örnekten başlar ya da geçersin. Senin vermediğin rakam, unvan, şirket adı ya da tarih metne eklenmez.',
          screen() {
            const s = mk('div', 'howto-screen');
            const head = mk('div', 'howto-row');
            head.append(mk('p', 'howto-screen-title', 'Önerilen metin'), mk('span', 'howto-muted', '1. okuma'));
            const add = mk('div', 'howto-sugg howto-sugg--add');
            add.append(mk('span', 'howto-tag', 'Ekleyin · Eksik eylem'), mk('p', 'howto-strong', 'Kod bilgisi edinmek için hangi somut adımları attın?'), mk('div', 'howto-input', 'Kendi cümlelerinle yaz'));
            const cv = mk('div', 'howto-sugg howto-sugg--risk');
            cv.append(mk('span', 'howto-tag', 'CV ile uyuşmuyor'), mk('p', 'howto-muted', 'Hikâyende başka, CV’nde başka bir kurum yazıyor.'));
            const bar = mk('div', 'howto-progress');
            bar.append(mk('span'));
            s.append(head, add, cv, bar);
            return s;
          }
        },
        {
          title: 'Hikâyeni kur ve düzelt',
          text: 'Önerileri tamamladığında yazdıklarının tamamı paragraflara kurulur. Her cümleye tıklayıp düzeltebilirsin; öneriden gelen cümleler işaretlidir ve her değişiklik yeni sürüm olarak saklanır. Hedef: kendi sesinle, 150–250 kelimelik bir anlatım.',
          screen() {
            const s = mk('div', 'howto-screen');
            const head = mk('div', 'howto-row');
            head.append(mk('p', 'howto-screen-title', 'Hikâyen'), mk('span', 'howto-pill', 'sürüm 4'));
            s.append(head);
            const story = mk('div', 'howto-story');
            const p1 = mk('p');
            p1.append(mk('span', 'howto-s is-mark', 'Yaklaşık bir yıldır iş analisti stajyeri olarak çalışıyorum ve bu sürede sekiz projede yer aldım.'), document.createTextNode(' '),
              mk('span', 'howto-s', 'Müşterilerle toplantılara katılıyor, ihtiyaçları analiz dokümanına çeviriyorum.'));
            const p2 = mk('p');
            const edited = mk('span', 'howto-s is-recent is-editing', 'Her hafta iki saat SQL çalışıyorum.');
            p2.append(edited, document.createTextNode(' '), mk('span', 'howto-s', 'Hedefim, bir ürünü fikirden canlıya taşıyan bir iş analisti olmak.'));
            story.append(p1, p2);
            const tip = mk('span', 'howto-tooltip', 'Senin cümlen · düzeltmek için tıkla');
            const legend = mk('div', 'howto-legend');
            legend.append(mk('span', 'howto-key howto-key--mark', 'Öneriden geldi'), mk('span', 'howto-key howto-key--recent', 'Son değişiklik'));
            s.append(story, tip, legend);
            s.append(mk('span', 'howto-muted', '192 kelime · sesli anlatımda yaklaşık 1,4–1,6 dk'));
            return s;
          }
        },
        {
          title: 'Danışmanına gönder',
          text: 'Hikâyen hazır olduğunda onayladığın sürümü danışmanına gönderirsin. Danışmanın ikinci seanstan önce okur, not bırakır ve gerekirse ödev ya da belge ister. Üzerinde çalıştığın taslakları göremez; yalnızca gönderdiğin sürümü görür.',
          screen() {
            const s = mk('div', 'howto-screen howto-screen--center');
            const sent = mk('div', 'howto-sent');
            sent.append(mk('span', 'howto-avatar', 'DK'), mk('p', 'howto-strong', 'Sürüm 4 danışmanına gönderildi'), mk('span', 'howto-muted', 'İkinci seanstan önce okuyacak'));
            const note = mk('div', 'howto-note');
            note.append(mk('span', 'howto-tag', 'Danışman notu'), line('90%'), line('60%'));
            s.append(sent, note);
            return s;
          }
        },
        {
          title: 'Prova et, çıktılarını al',
          text: 'Prova metninde vurgulanacak yerler ve duraklar işaretlidir. Hikâyeni sesli anlatır; süre, tempo, vurgu ve atladığın cümleler hakkında kısa öneriler alırsın. Ardından kısa özet, mülakat cevap taslakları, CV özet paragrafı, rol sürümü ve etki analizi Türkçe ya da İngilizce PDF olarak seninle.',
          screen() {
            const s = mk('div', 'howto-screen');
            s.append(mk('p', 'howto-screen-title', 'Siz anlatın'));
            const grid = mk('div', 'howto-metrics');
            [['1:32', 'süre'], ['128', 'kelime/dk'], ['0', 'dolgu sözcüğü'], ['4/5', 'vurgu']].forEach(([v, l]) => {
              const m = mk('div', 'howto-metric');
              m.append(mk('strong', '', v), mk('span', '', l));
              grid.append(m);
            });
            const good = mk('div', 'howto-good');
            good.append(mk('strong', '', 'İyi giden'), document.createTextNode('Anlatımında neredeyse hiç dolgu sözcüğü yoktu.'));
            const chips = mk('div', 'howto-chips');
            ['Kısa özet', 'Mülakat cevapları', 'CV özeti', 'PDF'].forEach(t => chips.append(mk('span', 'howto-pill', t)));
            s.append(grid, good, chips);
            return s;
          }
        }
      ];

      const tool = cms.howto && cms.howto.story_tool;
      const toolSteps = tool ? byOrder(tool.steps).filter(x => textOk(x.title) && textOk(x.text)) : [];
      if (toolSteps.length) {
        // Metinler içerikten; ekran önizlemeleri sırayla (fazla adımda son önizleme) korunur.
        const screens = steps.map(x => x.screen);
        steps.splice(0, steps.length, ...toolSteps.map((x, i) => ({ title: x.title, text: x.text, screen: screens[Math.min(i, screens.length - 1)] })));
      }
      const section = mk('section', 'landing-lower-section landing-howto-section');
      section.id = 'hikaye-araci';
      section.setAttribute('aria-labelledby', 'landing-heading-howto');
      const container = mk('div', 'landing-section-container landing-howto-layout');

      // Sol: dizüstü çerçevesi
      const device = mk('div', 'howto-device');
      device.setAttribute('aria-hidden', 'true');
      const screenFrame = mk('div', 'howto-device-screen');
      const bar = mk('div', 'howto-device-bar');
      bar.append(mk('i'), mk('i'), mk('i'), mk('span', 'howto-device-url', 'Satış Hikâyesi'));
      const stage = mk('div', 'howto-stage');
      screenFrame.append(bar, stage);
      device.append(screenFrame, mk('div', 'howto-device-base'));

      // Sağ: başlık + adımlar
      const copy = mk('div', 'howto-copy');
      const eyebrow = mk('div', 'landing-section-eyebrow');
      const rule = mk('span', 'landing-section-rule');
      rule.setAttribute('aria-hidden', 'true');
      eyebrow.append(rule, mk('span', '', 'Hikâye Aracı'));
      const title = mk('h2', 'howto-title', (tool && textOk(tool.title)) ? tool.title : 'Satış hikâyeni nasıl oluşturursun?');
      title.id = 'landing-heading-howto';
      const list = mk('div', 'howto-steps');

      const show = index => {
        stage.replaceChildren(steps[index].screen());
        stage.dataset.step = String(index + 1);
      };

      steps.forEach((step, index) => {
        const item = mk('details', 'howto-step');
        item.name = 'landing-howto';
        if (index === 0) item.open = true;
        const summary = mk('summary', 'howto-step-title');
        summary.append(mk('span', 'howto-step-no', String(index + 1).padStart(2, '0')), mk('span', '', step.title));
        item.append(summary, mk('p', 'howto-step-text', step.text));
        item.addEventListener('toggle', () => { if (item.open) show(index); });
        list.append(item);
      });

      const cta = mk('a', 'howto-cta', 'Satış hikâyeni oluştur →');
      cta.href = '/hizmet';
      copy.append(eyebrow, title, list, cta);
      container.append(device, copy);
      section.append(container);
      show(0);
      processSection.insertAdjacentElement('afterend', section);
    }

    if (servicesSection && !document.getElementById('sss')) {
      // Sıkça sorulan sorular: solda başlık ve kısa açıklama, sağda tek sütun akordeon.
      // İçerik: Müşteri Gereksinimleri raporu v1.4.3 ve yeni hikâye akışı (yaz → öneriler → hazır).
      const faqItems = [
        ['Interview Demo nedir?', 'Üniversiteliler ve yeni mezunlar, profesyoneller ve yönetici adaylarının iş görüşmelerine hazırlandığı bir kariyer danışmanlığı platformudur. Kendi deneyiminden bir satış hikâyesi çıkarır, bunu deneyimli bir danışmanla birlikte geliştirir ve görüşmede rahatça anlatmayı çalışırsın.'],
        ['Satış hikâyesi süreci nasıl işliyor?', 'Hizmeti ve danışmanını seçip ödemeyi tamamlarsın. İlk 60 dakikalık seansta kariyer hedefini konuşursunuz. Ardından hikâyeni kendi cümlelerinle yazarsın; yapay zekâ eksik kalan yerleri öneri olarak gösterir. Hazır olduğunda hikâyeni danışmanına gönderir, ikinci 60 dakikalık seansta birlikte son hâline getirip prova edersiniz.'],
        ['Yapay zekâ hikâyemi benim yerime mi yazıyor?', 'Hayır. Hikâyeyi sen yazarsın ya da konuşarak anlatırsın. Yapay zekâ metnini okur; eksik eylemleri, belirsiz ifadeleri ve CV’nle uyuşmayan yerleri gösterir. Senin vermediğin rakam, unvan, şirket adı ya da tarihi eklemez; hangi öneriyi alacağına sen karar verirsin.'],
        ['Hikâyemi konuşarak anlatabilir miyim?', 'Evet. Yazmak yerine “Konuşarak yaz” ile anlatabilirsin. Hikâyen hazır olduğunda prova bölümünde sesli anlatır; süre, duraklar, vurgular ve atladığın cümleler hakkında kısa öneriler alırsın. Ses kaydı saklanmaz.'],
        ['CV yüklemem zorunlu mu?', 'Hayır, CV isteğe bağlıdır. Yüklersen hikâyende CV’nle uyuşmayan yerleri gösteririz. CV’ndeki bir bilgi ancak sen seçersen hikâyene girer.'],
        ['Danışmanımı nasıl seçerim?', 'Danışman profillerini giriş yapmadan inceleyebilirsin. Sektöre göre filtreleyip unvanlarına ve uzmanlık alanlarına bakarak sana uygun danışmanı seçersin.'],
        ['Seanslar nasıl yapılıyor?', 'Her seans 60 dakikadır ve görüntülü görüşmeyle yapılır; danışmanın görüşme bağlantısını seans kartına ekler, “Görüşmeye katıl” düğmesi seans saatinden 15 dakika önce açılır. Saatler kendi saat diliminde gösterilir; seans dilini Türkçe ya da İngilizce seçebilirsin. Randevu almadan önce profilini tamamlaman ve KVKK onayını vermen gerekir. Seanslar kaydedilmez.'],
        ['Danışmanım hikâyemi ne zaman görür?', 'Yalnızca senin gönderip onayladığın sürümü görür; üzerinde çalıştığın taslakları göremez. CV’ne ve ham yazılarına da senin iznin olmadan erişemez. Danışmanın gerekirse sana ödev verebilir ya da belge isteyebilir.'],
        ['Süreç sonunda elime ne geçiyor?', 'Satış hikâyen, networking için kısa özetin, mülakat sorularına cevap taslakların, CV özet paragrafın, hedef role uyarlanmış sürüm ve etki analizi. Çıktıları Türkçe ya da İngilizce hazırlayıp PDF olarak indirebilirsin.'],
        ['Ödeme nasıl yapılıyor?', 'Ödeme, satın alma sırasında güvenli bir ödeme sağlayıcısı üzerinden alınır. Ödemeden önce hizmeti, danışmanını, seans sayısını ve tutarı görürsün. Kart bilgilerin Interview Demo tarafından alınmaz ve saklanmaz.'],
        ['Kişisel verilerim nasıl korunuyor?', 'CV’n, yazdıkların ve hikâyen kişisel veri olarak işlenir. KVKK aydınlatma metni ve açık rıza onayın kaydedilir; verilere yalnızca yetkili kişiler, verdiğin izin kapsamında erişebilir.']
      ];

      const faqContent = cms.faq;
      const faqFromCms = faqContent ? byOrder(faqContent.items).filter(x => textOk(x.question) && textOk(x.answer)) : [];
      if (faqFromCms.length) faqItems.splice(0, faqItems.length, ...faqFromCms.map(x => [x.question, x.answer]));
      const faq = document.createElement('section');
      faq.id = 'sss';
      faq.className = 'landing-lower-section landing-faq-section';
      faq.setAttribute('aria-labelledby', 'landing-heading-sss');

      const container = document.createElement('div');
      container.className = 'landing-section-container landing-faq-layout';

      const intro = document.createElement('div');
      intro.className = 'landing-faq-intro';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'landing-faq-eyebrow';
      const rule = document.createElement('span');
      rule.className = 'landing-section-rule';
      rule.setAttribute('aria-hidden', 'true');
      eyebrow.append(rule, document.createTextNode('SSS'));
      const title = document.createElement('h2');
      title.id = 'landing-heading-sss';
      title.className = 'landing-faq-title';
      title.textContent = (faqContent && textOk(faqContent.title)) ? faqContent.title : 'Sıkça sorulan sorular';
      const lead = document.createElement('p');
      lead.className = 'landing-faq-lead';
      lead.textContent = 'Satış hikâyeni kendi cümlelerinle yazarsın; yapay zekâ eksikleri gösterir, danışmanın hikâyeni okuyup seninle prova eder. Süreç, seanslar ve verilerin hakkında merak ettiklerin burada.';
      if (faqContent && textOk(faqContent.lead)) lead.textContent = faqContent.lead;
      const cta = document.createElement('a');
      cta.className = 'landing-faq-cta';
      cta.href = '/danismanlar';
      cta.setAttribute('data-nav-skip', '');
      cta.innerHTML = '<span>Danışmanları incele</span><span aria-hidden="true">→</span>';
      intro.append(eyebrow, title, lead, cta);

      const list = document.createElement('div');
      list.className = 'landing-faq-list';
      faqItems.forEach(([question, answer]) => {
        const item = document.createElement('details');
        item.className = 'landing-faq-item';
        item.name = 'landing-faq';
        const summary = document.createElement('summary');
        summary.className = 'landing-faq-question';
        const text = document.createElement('span');
        text.textContent = question;
        const plus = document.createElement('span');
        plus.className = 'landing-faq-plus';
        plus.setAttribute('aria-hidden', 'true');
        summary.append(text, plus);
        const body = document.createElement('p');
        body.className = 'landing-faq-answer';
        body.textContent = answer;
        item.append(summary, body);
        list.appendChild(item);
      });

      container.append(intro, list);
      faq.appendChild(container);
      servicesSection.insertAdjacentElement('afterend', faq);
    }

    // E6-14 (Etap 12): yol haritası — "Yakında" hizmetler (GET /public/content/roadmap; öğeler coming_soon
    // hizmetlerinden üretilir). Hizmet seçimindeki "Yakında planlanan hizmetleri gör →" buraya (#yol-haritasi) gelir.
    if (servicesSection && !document.getElementById('yol-haritasi')) {
      const rm = cms.roadmap;
      const fallback = ['CV / ön yazı', 'Demo iş görüşmesi', 'Networking', 'Koçluk', 'Test geri bildirimi'].map(title => ({ title, description: null }));
      const items = rm && Array.isArray(rm.items) ? byOrder(rm.items).filter(x => textOk(x.title)) : fallback;
      if (items.length) {
        const section = document.createElement('section');
        section.id = 'yol-haritasi';
        section.className = 'landing-lower-section landing-audience-section landing-roadmap-section';
        section.setAttribute('aria-labelledby', 'landing-heading-yol-haritasi');
        const container = document.createElement('div');
        container.className = 'landing-section-container';
        const head = document.createElement('div');
        head.className = 'audience-head';
        head.innerHTML = '<div class="landing-section-eyebrow"><span class="landing-section-rule" aria-hidden="true"></span><span>Yol haritası</span></div>' +
          '<h2 class="audience-title" id="landing-heading-yol-haritasi"></h2>';
        head.querySelector('h2').textContent = (rm && textOk(rm.title)) ? rm.title : 'Yakında';
        const grid = document.createElement('div');
        grid.className = 'audience-grid';
        items.forEach((item, index) => {
          const card = document.createElement('div');
          card.className = 'audience-item audience-item--' + ((index % 3) + 1);
          const top = document.createElement('div');
          top.className = 'audience-top';
          const no = document.createElement('span');
          no.className = 'audience-no';
          no.textContent = String(index + 1).padStart(2, '0');
          const h3 = document.createElement('h3');
          h3.className = 'audience-name';
          h3.textContent = item.title;
          top.append(no, h3);
          card.appendChild(top);
          if (textOk(item.description)) {
            const p = document.createElement('p');
            p.className = 'audience-text';
            p.textContent = item.description;
            card.appendChild(p);
          }
          const tags = document.createElement('ul');
          tags.className = 'audience-tags';
          const li = document.createElement('li');
          li.textContent = 'Yakında';
          tags.appendChild(li);
          card.appendChild(tags);
          grid.appendChild(card);
        });
        const note = document.createElement('p');
        note.className = 'audience-note';
        note.textContent = 'Bu hizmetler hazırlanıyor; şimdilik satın alınamaz.';
        container.append(head, grid, note);
        section.appendChild(container);
        (document.getElementById('sss') || servicesSection).insertAdjacentElement('beforebegin', section);
      }
    }

    const trustSection = Array.from(document.querySelectorAll('main section')).find(item =>
      item.querySelector('h2')?.textContent.trim() === 'Yapay zekâ senin yerine hikâye uydurmaz'
    );
    const trustLayout = trustSection?.querySelector('.landing-trust-layout');
    if (trustLayout) {
      const storyPreview = trustLayout.querySelector('.landing-story-preview');
      const trustPoints = trustLayout.querySelector('.landing-trust-points');

      if (storyPreview && trustPoints) {
        storyPreview.classList.add('landing-source-match');
        storyPreview.setAttribute('aria-label', 'Kullanıcı yanıtı ile üretilen mülakat metni karşılaştırması');
        storyPreview.innerHTML = `
          <div class="landing-source-match-heading">
            <span class="landing-source-match-kicker">KAYNAK EŞLEŞTİRME</span>
            <span class="landing-source-match-label">Örnek</span>
          </div>
          <div class="landing-source-entry">
            <span class="landing-source-entry-label">Senin Cevabın #1</span>
            <p>Ekip içinde kriz anlarında çözüm ürettim...</p>
          </div>
          <div class="landing-source-connector" aria-hidden="true">
            <svg viewBox="0 0 24 32" focusable="false"><path d="M12 2v23m-7-7 7 7 7-7"/></svg>
            <span>YANITINDAN TÜRETİLDİ</span>
          </div>
          <div class="landing-generated-entry">
            <span class="landing-generated-entry-label">Mülakat metni · Cevap 1</span>
            <h3>Deneyiminden hikâyeye</h3>
            <p>İş deneyimimde ekip içinde çözümler ürettim ve bu süreçte yöneticilik becerilerimi geliştirdim. <span class="landing-source-warning">[bilgi gerekli]</span></p>
          </div>
          <div class="landing-source-info">
            <span class="landing-source-info-icon" aria-hidden="true">i</span>
            <p><strong>Eksik veri tespit edildi:</strong> Hangi projede ve kaç kişilik ekipte? <span>(AI burayı uydurmaz, sana sorar)</span></p>
          </div>`;

        const icons = [
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v8.5A2.75 2.75 0 0 1 16.25 17H10l-5 4v-4.75Z"/><path d="M8 8h8M8 12h5"/></svg>',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12.5 11 14.5l4-4"/><path d="M12 3 5 6v5c0 4.5 2.9 7.8 7 10 4.1-2.2 7-5.5 7-10V6Z"/></svg>',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v6H6a2 2 0 0 1-2-2Zm16 0h-3v6h1a2 2 0 0 0 2-2Z"/><path d="M12 19h3"/></svg>'
        ];

        Array.from(trustPoints.querySelectorAll('.landing-trust-item')).forEach((item, index) => {
          const heading = item.querySelector('h3');
          const description = item.querySelector('p');
          if (!heading || !description) return;

          item.classList.add('landing-trust-feature');
          const icon = document.createElement('span');
          icon.className = 'landing-trust-feature-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = icons[index] ?? icons[0];
          const copy = document.createElement('div');
          copy.className = 'landing-trust-feature-copy';
          copy.append(heading, description);
          item.replaceChildren(icon, copy);
        });
      }
    }

    const hero = document.querySelector('body.public-landing main > section');
    const heroTitle = hero?.querySelector('h1');
    // ─── "Güvenilir ve Şeffaf" ve "Sana kalan çıktılar" kaldırıldı: bu bilgiler artık giriş alanında,
    // "Nasıl çalışır?", Hikâye Aracı ve SSS bölümlerinde. Yerine sayfada olmayan bir bilgi geldi:
    // hedef kitleler (rapor v1.4.3 §1, §2, §7.1: Üniversiteliler ve Yeni Mezunlar, Profesyoneller, Executive).
    const oldTrust = document.getElementById('guvenilir-ve-seffaf');
    const oldOutputs = document.getElementById('sana-kalan-ciktilar');
    if (!document.getElementById('kimler-icin') && (oldTrust || oldOutputs)) {
      const audiences = [
        { name: 'Üniversiteliler ve yeni mezunlar', text: 'Henüz uzun bir iş geçmişin yoksa sorun değil. Eğitiminden, stajlarından ve projelerinden yola çıkarsın; olmayan bir deneyim hikâyene eklenmez.', tags: ['Eğitim', 'Staj', 'Proje'] },
        { name: 'Profesyoneller', text: 'Deneyimini hedeflediğin role bağlayan bir anlatıya dönüştürürsün; ister yeni bir iş, ister terfi, ister kariyer değişimi için.', tags: ['Deneyim', 'Hedef rol', 'Kariyer geçişi'] },
        { name: 'Yönetici adayları', text: 'Yönetim kapsamını ve kararlarının etkisini net cümlelerle anlatırsın. Unvan tek başına yetmez; her başarı senin verdiğin bilgiye dayanır.', tags: ['Yönetim kapsamı', 'Karar etkisi', 'Hedef rol'] }
      ];
      const aud = cms.audiences;
      const audFromCms = aud ? byOrder(aud.items).filter(x => textOk(x.title) && textOk(x.text)) : [];
      if (audFromCms.length) audiences.splice(0, audiences.length, ...audFromCms.map(x => ({ name: x.title, text: x.text, tags: Array.isArray(x.tags) ? x.tags : [] })));
      const section = document.createElement('section');
      section.id = 'kimler-icin';
      section.className = 'landing-lower-section landing-audience-section';
      section.setAttribute('aria-labelledby', 'landing-heading-kimler-icin');
      const container = document.createElement('div');
      container.className = 'landing-section-container';
      container.innerHTML = '<div class="audience-head"><div class="landing-section-eyebrow"><span class="landing-section-rule" aria-hidden="true"></span><span>Kimler için?</span></div>' +
        '<h2 class="audience-title" id="landing-heading-kimler-icin">Hikâyen, bulunduğun yere göre <em>şekillenir.</em></h2></div>';
      if (aud && textOk(aud.title)) {
        // Başlığın son kelimesi tasarımdaki gibi italik vurgulanır.
        const h = container.querySelector('.audience-title');
        const words = aud.title.trim().split(/\s+/);
        const em = document.createElement('em');
        em.textContent = words.pop();
        h.replaceChildren(document.createTextNode(words.length ? words.join(' ') + ' ' : ''), em);
      }
      if (aud && textOk(aud.eyebrow)) container.querySelector('.landing-section-eyebrow span:last-child').textContent = aud.eyebrow;
      const grid = document.createElement('div');
      grid.className = 'audience-grid';
      audiences.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'audience-item audience-item--' + (index + 1);
        const top = document.createElement('div');
        top.className = 'audience-top';
        top.innerHTML = '<span class="audience-no">0' + (index + 1) + '</span>';
        const h3 = document.createElement('h3');
        h3.className = 'audience-name';
        h3.textContent = item.name;
        top.appendChild(h3);
        const p = document.createElement('p');
        p.className = 'audience-text';
        p.textContent = item.text;
        const tags = document.createElement('ul');
        tags.className = 'audience-tags';
        item.tags.forEach(tag => { const li = document.createElement('li'); li.textContent = tag; tags.appendChild(li); });
        card.append(top, p, tags);
        grid.appendChild(card);
      });
      const note = document.createElement('p');
      note.className = 'audience-note';
      note.textContent = (aud && textOk(aud.note)) ? aud.note : 'Öneriler ve örnekler seçtiğin hedef kitleye göre uyarlanır. Hikâyeni Türkçe ya da İngilizce hazırlayabilirsin.';
      container.append(grid, note);
      section.appendChild(container);
      (oldTrust || oldOutputs).insertAdjacentElement('beforebegin', section);
      if (oldTrust) oldTrust.remove();
      if (oldOutputs) oldOutputs.remove();
    }

    if (hero && heroTitle) {
      heroTitle.id = 'landing-hero-title';

      // Etkileyici giriş alanı: mor geçişli büyük kart, ortalanmış başlık, köşelerde yarı saydam paneller.
      hero.classList.add('landing-hero--immersive');
      const heroCta = hero.querySelector('.landing-hero-actions > a:first-child');
      if (heroCta) heroCta.id = 'landing-hero-cta';
      const heroSecondary = hero.querySelector('.landing-hero-actions > a.landing-secondary-cta');
      if (heroSecondary) heroSecondary.id = 'landing-hero-secondary';
      hero.setAttribute('aria-labelledby', heroTitle.id);

      // The hero preview is a fictional, static HTML mockup; do not populate it with invented user data.

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sections = Array.from(document.querySelectorAll('body.public-landing main section'));
      if (!reducedMotion && 'IntersectionObserver' in window) {
        const revealTargets = [];
        const revealObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        }, { threshold: 0 });
        sections.forEach(section => {
          if (section === hero) return;
          section.classList.add('landing-reveal');
          revealTargets.push(section);
          revealObserver.observe(section);
        });

        function revealInView() {
          const viewportBottom = window.innerHeight;
          for (let index = revealTargets.length - 1; index >= 0; index -= 1) {
            const section = revealTargets[index];
            const bounds = section.getBoundingClientRect();
            if (bounds.top > viewportBottom || bounds.bottom < 0) continue;
            section.classList.add('is-visible');
            revealObserver.unobserve(section);
            revealTargets.splice(index, 1);
          }
          if (!revealTargets.length) {
            window.removeEventListener('scroll', revealInView);
            window.removeEventListener('resize', revealInView);
          }
        }

        window.addEventListener('scroll', revealInView, { passive: true });
        window.addEventListener('resize', revealInView);
        window.requestAnimationFrame(revealInView);
      }
    }

    const main = document.querySelector('body.public-landing main');
    if (main && !document.querySelector('.landing-footer')) {
      const footer = document.createElement('footer');
      footer.className = 'landing-footer';
      footer.setAttribute('aria-labelledby', 'landing-footer-title');
      footer.innerHTML = `
        <div class="landing-section-container landing-footer-content">
          <a class="landing-footer-brand site-brand-link" id="landing-footer-title" href="/" aria-label="Ana sayfaya dön">Interview Demo</a>
          <nav aria-label="Yasal ve iletişim bağlantıları">
            <a href="#">Gizlilik</a>
            <a href="#">KVKK aydınlatma metni</a>
            <a href="#">İletişim</a>
          </nav>
          <p class="landing-footer-note">Çıktı kartlarındaki içerikler kurgusaldır; gerçek kullanıcı verisi değildir.</p>
          <p class="landing-footer-copyright">© 2026 Interview Demo. Tüm hakları saklıdır.</p>
        </div>`;
      main.insertAdjacentElement('afterend', footer);
    }

    const serviceCallToAction = document.querySelector('#hizmetler .landing-service-action a');
    if (serviceCallToAction) {
      const serviceCta = getServiceCta(session, hasEnrollment);
      serviceCallToAction.href = serviceCta.href || '#';
      serviceCallToAction.title = serviceCta.title;
      serviceCallToAction.setAttribute('aria-disabled', String(serviceCta.disabled));
      if (serviceCta.disabled) {
        serviceCallToAction.addEventListener('click', event => event.preventDefault());
      }
      let loginLink = document.querySelector('#hizmetler .landing-service-login');
      if (!session.role) {
        if (!loginLink) {
          loginLink = document.createElement('a');
          loginLink.className = 'landing-service-login';
          serviceCallToAction.insertAdjacentElement('afterend', loginLink);
        }
        loginLink.href = serviceCta.loginHref;
        loginLink.hidden = false;
        const loginAction = document.createElement('strong');
        loginAction.textContent = 'Giriş yap';
        loginLink.replaceChildren(document.createTextNode('Zaten hesabın var mı? '), loginAction);
      } else if (loginLink) {
        loginLink.hidden = true;
      }
    }
    document.querySelectorAll('#sana-kalan-ciktilar .micro-document-example').forEach(button => {
      button.addEventListener('click', () => {
        const note = button.nextElementSibling;
        if (!(note instanceof HTMLElement) || !note.classList.contains('micro-document-example-note')) return;
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        note.hidden = expanded;
      });
    });
    // Kaydı olan aday ana ekrana gider; "sıradaki adım" (ilk seans sonrası hikâye vb.) /panel'de
    // story_session.status'tan türetilir (83). Eski demoIlkSeansTamamlandi bayrağı kaldırıldı.
    const heroAction = document.querySelector('.landing-hero-actions > a:first-child');
    if (heroAction) {
      if (!session.role) {
        heroAction.href = '/kayit';
      } else if (session.role === 'danisman') {
        heroAction.href = '/guru/danisanlar';
      } else {
        heroAction.href = hasEnrollment ? '/panel' : '/danismanlar';
      }
    }
  }

  // K115 (Etap 8): index.html <html class="page-pending"> ile açılır; yeni düzen kurulunca görünür olur.
  function reveal() {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('page-pending');
      // Bölüm JS ile kurulduğu için #yol-haritasi / #sss gibi bağlantılar yüklemeden sonra kaydırılır.
      const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    });
  }
  function start() {
    renderLanding().catch(error => console.error('Landing oluşturulamadı:', error)).finally(reveal);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
