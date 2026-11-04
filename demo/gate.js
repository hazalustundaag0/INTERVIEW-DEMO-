(function () {
  const PUBLIC_PAGES = new Set([
    'index.html',
    'danismanlar.html',
    'danisman.html',
    'danisman-profil.html',
    'giris.html',
    'giris-danisman.html',
    'kayit.html'
  ]);
  const page = location.pathname.split('/').pop() || 'index.html';
  const sessionKey = 'demoOturum';
  const viewerMode = new URLSearchParams(location.search).get('izleyici') === '1';
  if (viewerMode) {
    try {
      localStorage.removeItem(sessionKey);
    } catch (error) {
      console.error('İzleyici modu oturumu temizlenemedi.', error);
    }
    const params = new URLSearchParams(location.search);
    params.delete('izleyici');
    const query = params.toString();
    try {
      history.replaceState(history.state, '', location.pathname + (query ? '?' + query : '') + location.hash);
    } catch (error) {
      console.error('İzleyici modu adres çubuğundan kaldırılamadı.', error);
    }
  }

  function safeReturnPath(value) {
    if (typeof value !== 'string' ||
        !/^[a-z0-9][a-z0-9_-]*\.html(?:[?#][^/\\\u0000-\u001f]*)?$/i.test(value)) {
      return null;
    }
    const targetPage = value.split(/[?#]/)[0].toLowerCase();
    if (['giris.html', 'giris-danisman.html', 'kayit.html'].includes(targetPage)) return null;
    return value;
  }

  function getServiceCta(session) {
    if (session?.role === 'danisan') {
      try {
        if (localStorage.getItem('demoOdemeAlindi') === 'true') {
          return { href: 'takvim.html', loginHref: '', disabled: false, title: '' };
        }
      } catch (error) {
        console.error('Hizmet CTA için ödeme bilgisi okunamadı.', error);
      }
    }
    return {
      href: 'danismanlar.html',
      loginHref: !session?.role ? 'giris.html?return=' + encodeURIComponent('danismanlar.html') : '',
      disabled: false,
      title: ''
    };
  }

  function hasReturningCandidateState() {
    try {
      return ['demoOdemeAlindi', 'demoProfilTamamlandi', 'demoKvkkOnaylandi', 'demoCvOnaylandi']
        .some(key => localStorage.getItem(key) === 'true');
    } catch (error) {
      console.error('Danışan ilerleme durumu okunamadı.', error);
      return false;
    }
  }

  function getSession() {
    if (viewerMode) return { role: null, name: '', state: null };
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw === null) return { role: null, name: '', state: null };
      if (!raw.trim()) {
        localStorage.removeItem(sessionKey);
        return { role: null, name: '', state: null };
      }
      const stored = JSON.parse(raw);
      if (!stored || typeof stored !== 'object' || Array.isArray(stored) ||
          !['danisman', 'danisan'].includes(stored.role)) {
        localStorage.removeItem(sessionKey);
        return { role: null, name: '', state: null };
      }
      const role = stored.role;
      return {
        role,
        name: stored.name || stored.ad || (role === 'danisman' ? 'Selin Arslan' : 'Elif Yılmaz'),
        state: stored.state || (role === 'danisan' && hasReturningCandidateState() ? 'registered' : 'new'),
        email: stored.email || '',
        tip: role === 'danisman' ? 'guru' : 'aday',
        ad: stored.name || stored.ad || (role === 'danisman' ? 'Selin Arslan' : 'Elif Yılmaz')
      };
    } catch (error) {
      console.error('Demo oturumu okunamadı.', error);
      try {
        localStorage.removeItem(sessionKey);
      } catch (clearError) {
        console.error('Geçersiz demo oturumu temizlenemedi.', clearError);
      }
      return { role: null, name: '', state: null };
    }
  }

  function setSession(value, name, state, details) {
    const input = typeof value === 'string'
      ? { role: value, name, state, ...(details || {}) }
      : value;
    if (!input || !['danisan', 'danisman'].includes(input.role)) {
      console.error('Demo oturumu için geçerli bir rol gerekli.');
      return false;
    }
    const normalized = {
      ...input,
      role: input.role,
      name: String(input.name || (input.role === 'danisman' ? 'Selin Arslan' : 'Elif Yılmaz')).trim(),
      state: input.state || (input.role === 'danisman' ? 'active' : 'new'),
      tip: input.role === 'danisman' ? 'guru' : 'aday',
      ad: String(input.name || (input.role === 'danisman' ? 'Selin Arslan' : 'Elif Yılmaz')).trim()
    };
    try {
      localStorage.setItem(sessionKey, JSON.stringify(normalized));
      return true;
    } catch (error) {
      console.error('Demo oturumu kaydedilemedi.', error);
      return false;
    }
  }

  function logout() {
    try {
      localStorage.removeItem(sessionKey);
      localStorage.removeItem('demoDevam');
    } catch (error) {
      console.error('Demo oturumu kapatılamadı.', error);
      return false;
    }
    location.href = 'index.html';
    return true;
  }

  function requireRole(role, targetPage) {
    const currentSession = getSession();
    if (currentSession.role === role) return true;
    const target = safeReturnPath(targetPage || page + location.search + location.hash) || page;
    const login = role === 'danisman' ? 'giris-danisman.html' : 'giris.html';
    location.replace(login + '?return=' + encodeURIComponent(target));
    return false;
  }

  function requireSession(targetPage) {
    if (getSession().role) return true;
    const target = safeReturnPath(targetPage || page + location.search + location.hash) || page;
    location.replace('giris.html?return=' + encodeURIComponent(target));
    return false;
  }

  window.getSession = getSession;
  window.setSession = setSession;
  window.requireRole = requireRole;
  window.requireSession = requireSession;
  window.getServiceCta = getServiceCta;
  window.safeReturnPath = safeReturnPath;
  window.logout = logout;
  window.DemoSession = { getSession, setSession, requireRole, requireSession, logout };

  const session = getSession();
  const sessionRequiredPages = new Set([
    'hizmet.html',
    'siparis.html',
    'odeme.html',
    'odeme-ok.html',
    'profil.html',
    'takvim.html'
  ]);
  if (sessionRequiredPages.has(page) && !requireSession()) return;
  if (page === 'hizmet.html' && !new URLSearchParams(location.search).get('danisman')) {
    location.replace('danismanlar.html');
    return;
  }
  const requiredRole = page.startsWith('guru-') || page === 'davet.html' ? 'danisman' :
    page === 'hizmet.html' || page === 'eposta.html' || !PUBLIC_PAGES.has(page) ? 'danisan' : null;

  if (requiredRole && !requireRole(requiredRole)) {
    return;
  }
  if (page === 'odeme-ok.html' && session.role === 'danisan') {
    if (!setSession({ ...session, state: 'registered' })) {
      console.error('Ödeme sonrası danışan durumu güncellenemedi.');
    }
    try {
      localStorage.setItem('demoOdemeAlindi', 'true');
    } catch (error) {
      console.error('Ödeme durumu kaydedilemedi.', error);
    }
  }

  function wireBrandLinks() {
    document.querySelectorAll('header a, aside a').forEach(link => {
      if (link.textContent.replace(/\s+/g, ' ').trim().includes('Interview Demo')) {
        link.href = 'index.html';
        link.setAttribute('aria-label', 'Ana sayfaya dön');
        link.classList.add('site-brand-link');
      }
    });
    document.querySelectorAll('header span, aside span').forEach(brand => {
      if (brand.textContent.trim() !== 'Interview Demo' || brand.closest('a')) return;
      const brandLink = document.createElement('a');
      brandLink.href = 'index.html';
      brandLink.className = brand.className + ' site-brand-link';
      brandLink.textContent = brand.textContent;
      brandLink.setAttribute('aria-label', 'Ana sayfaya dön');
      brand.replaceWith(brandLink);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireBrandLinks, { once: true });
  } else {
    wireBrandLinks();
  }

  function renderLanding() {
    if (page !== 'index.html') return;
    const lowerSections = [
      { title: 'Nasıl çalışır?', label: 'Adım Adım Süreç', id: 'nasil-calisir' },
      { title: 'Yapay zeka senin yerine hikâye uydurmaz', label: 'Güvenilir ve Şeffaf', id: 'guvenilir-ve-seffaf' },
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

    const advisorsSection = document.getElementById('danismanlar');
    const advisorsContainer = advisorsSection?.querySelector('.landing-section-container');
    const advisorsHeading = advisorsContainer?.querySelector('.landing-section-heading');
    const allAdvisorsLink = advisorsContainer && Array.from(advisorsContainer.querySelectorAll('a'))
      .find(link => link.textContent.trim() === 'Tüm danışmanları gör →');
    if (advisorsHeading && allAdvisorsLink) {
      allAdvisorsLink.href = 'danismanlar.html';
      const headingLayout = document.createElement('div');
      headingLayout.className = 'landing-advisors-heading';
      advisorsHeading.replaceWith(headingLayout);
      headingLayout.append(advisorsHeading, allAdvisorsLink);
      allAdvisorsLink.classList.add('landing-advisors-all');
    }

    const advisorGrid = advisorsContainer?.querySelector('.grid');
    const advisors = window.listAdvisors
      ? window.listAdvisors({ yayindaOlanlar: true })
      : window.DEMO_ADVISORS;
    if (advisorGrid && Array.isArray(advisors) && advisors.length) {
      advisorGrid.replaceChildren(...advisors.map(advisor => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-[#7564C7] rounded-lg p-6 flex flex-col justify-between shadow-none';
        card.dataset.advisorId = advisor.id;
        const identity = document.createElement('div');
        identity.className = 'flex flex-col items-start';
        const avatar = document.createElement('div');
        avatar.className = 'w-12 h-12 rounded-full bg-[#51409D] text-white font-semibold flex items-center justify-center mb-4 text-base';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = advisor.ad.split(/\s+/).slice(0, 2).map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
        const name = document.createElement('h3');
        name.className = 'text-lg font-semibold text-[#1E1E1C]';
        name.textContent = advisor.ad;
        const title = document.createElement('p');
        title.className = 'text-sm text-[#4B5563] mt-1 mb-4';
        title.textContent = advisor.unvan;
        const facts = document.createElement('div');
        facts.className = 'landing-advisor-facts';
        const rating = document.createElement('span');
        rating.className = 'landing-advisor-rating';
        rating.setAttribute('aria-label', '5 üzerinden ' + Number(advisor.puan).toLocaleString('tr-TR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }));
        const star = document.createElement('span');
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '★';
        const score = document.createElement('span');
        score.textContent = Number(advisor.puan).toLocaleString('tr-TR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
        rating.append(star, score);
        const availability = document.createElement('span');
        availability.className = 'landing-advisor-availability';
        availability.textContent = advisor.musait || 'Müsaitlik için profili gör';
        facts.append(rating, availability);
        identity.append(avatar, name, title, facts);
        const tags = document.createElement('div');
        tags.className = 'flex flex-wrap gap-1.5 pt-2';
        advisor.sektorler.forEach(sector => {
          const tag = document.createElement('span');
          tag.className = 'bg-[#EEECFF] text-[#433582] text-xs px-2.5 py-1 rounded border border-[#C4B5FD]';
          tag.textContent = sector;
          tags.appendChild(tag);
        });
        card.append(identity, tags);
        return card;
      }));
    } else if (advisorGrid) {
      console.error('Danışman listesi yüklenemedi.');
    }
    if (advisorGrid) {
      advisorGrid.classList.add('landing-advisor-grid');
      Array.from(advisorGrid.children).forEach(card => {
        const name = card.querySelector('h3')?.textContent.trim();
        if (!name) return;
        const interactiveCard = document.createElement('a');
        interactiveCard.className = `landing-advisor-card ${card.className}`;
        interactiveCard.href = `danisman.html?id=${encodeURIComponent(card.dataset.advisorId)}`;
        interactiveCard.setAttribute('aria-label', `${name} profilini gör`);
        card.replaceWith(interactiveCard);
        interactiveCard.append(...Array.from(card.childNodes));
        interactiveCard.lastElementChild?.classList.add('landing-advisor-tags');
        const action = document.createElement('span');
        action.className = 'landing-advisor-action';
        action.textContent = 'Profili gör →';
        interactiveCard.appendChild(action);
      });
    }
    if (advisorGrid) {
      const sectorLinks = document.createElement('div');
      sectorLinks.className = 'landing-advisor-sector-links';
      const sectorLabel = document.createElement('span');
      sectorLabel.textContent = 'Sektöre göre incele';
      sectorLinks.appendChild(sectorLabel);
      [
        ['technology', 'Teknoloji & SaaS'],
        ['finance', 'Finans'],
        ['retail', 'Perakende'],
        ['health', 'Sağlık'],
        ['production', 'Üretim']
      ].forEach(([sector, label]) => {
        const link = document.createElement('a');
        link.href = `danismanlar.html?sektor=${encodeURIComponent(sector)}`;
        link.textContent = label;
        sectorLinks.appendChild(link);
      });
      advisorGrid.insertAdjacentElement('afterend', sectorLinks);
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
    }
    const comingSoon = servicesContainer && Array.from(servicesContainer.children)
      .find(child => child.textContent.trim().startsWith('Yakında:'));
    if (comingSoon) {
      comingSoon.classList.add('landing-coming-soon');
      const comingSoonLabel = comingSoon.firstElementChild;
      comingSoonLabel?.classList.add('landing-coming-soon-label');
      Array.from(comingSoon.children).slice(1).forEach(chip => {
        chip.classList.add('landing-coming-soon-chip');
        chip.setAttribute('aria-disabled', 'true');
      });
    }

    const trustSection = Array.from(document.querySelectorAll('main section')).find(item =>
      item.querySelector('h2')?.textContent.trim() === 'Yapay zeka senin yerine hikâye uydurmaz'
    );
    trustSection?.querySelectorAll('.grid > div').forEach((card, index) => {
      card.classList.add('landing-trust-card');
      const iconBox = card.firstElementChild;
      if (iconBox) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        const iconMarkup = [
          '<path d="M8 11H5a3 3 0 0 1 3-3V6a5 5 0 0 0-5 5v6h6v-6Zm11 0h-3a3 3 0 0 1 3-3V6a5 5 0 0 0-5 5v6h6v-6Z"/>',
          '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
          '<path d="m12 3 8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/>'
        ][index];
        svg.innerHTML = iconMarkup;
        iconBox.className = 'landing-trust-icon';
        iconBox.replaceChildren(svg);
      }

      const description = card.querySelector('p');
      if (!description || !description.textContent.includes('[bilgi gerekli]')) return;
      const walker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        if (!textNode.nodeValue.includes('[bilgi gerekli]')) continue;
        const parts = textNode.nodeValue.split('[bilgi gerekli]');
        const badge = document.createElement('span');
        badge.className = 'theme-status-badge theme-status-badge--warning';
        badge.textContent = '[bilgi gerekli]';
        textNode.replaceWith(document.createTextNode(parts[0]), badge, document.createTextNode(parts[1]));
        break;
      }
    });

    const hero = document.querySelector('body.public-landing main > section');
    const heroTitle = hero?.querySelector('h1');
    if (hero && heroTitle) {
      heroTitle.id = 'landing-hero-title';
      hero.setAttribute('aria-labelledby', heroTitle.id);

      const proof = document.createElement('section');
      proof.className = 'landing-proof-strip';
      proof.setAttribute('aria-label', 'Süreç hakkında kısa bilgiler');
      proof.innerHTML = `
        <div class="landing-proof-item">
          <strong data-count-to="250" data-count-suffix="+">250+</strong>
          <span>Tamamlanan seans</span>
        </div>
        <div class="landing-proof-item">
          <strong data-count-to="4.8" data-count-decimals="1">4,8</strong>
          <span>Ortalama puan</span>
        </div>
        <div class="landing-proof-item">
          <strong data-count-to="4">4</strong>
          <span>Farklı sektör</span>
        </div>
        <div class="landing-proof-item">
          <strong data-count-to="2">2</strong>
          <span>Seansta hikâye</span>
        </div>`;
      hero.insertAdjacentElement('afterend', proof);

      const preview = hero.querySelector('.landing-video-card');
      if (preview) {
        preview.classList.remove('flex-col', 'items-center', 'text-center');
        preview.classList.add('landing-story-preview');
        preview.setAttribute('aria-label', 'Örnek satış hikâyesi önizlemesi');
        preview.innerHTML = `
          <div class="landing-story-topline">
            <span class="landing-story-label">Satış hikâyen</span>
            <span class="landing-story-example">Örnek</span>
          </div>
          <h2 class="landing-story-title">Deneyiminden hikâyeye</h2>
          <p class="landing-story-intro">Gerçek deneyimlerin, kendi sözlerinle anlamlı bir akışa dönüşür.</p>
          <div class="landing-story-lines">
            <div class="landing-story-line">
              <p>Satış ve iş geliştirme deneyimimle müşterilerin ihtiyaçlarını anlayıp doğru çözümleri konumlandırdım.</p>
              <span class="landing-story-source">Cevap 1</span>
            </div>
            <div class="landing-story-line">
              <p>Farklı ekiplerle birlikte çalışarak müşteri ilişkilerini güçlendirmeye ve sürdürülebilir büyümeye odaklandım.</p>
              <span class="landing-story-source">Cevap 2</span>
            </div>
          </div>
          <span class="landing-story-footnote">Cümleler, verdiğin cevapların kaynak etiketlerini taşır.</span>`;
      }

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

        function animateCounter(counter) {
          if (counter.dataset.countStarted) return;
          counter.dataset.countStarted = 'true';
          const target = Number(counter.dataset.countTo);
          const decimals = Number(counter.dataset.countDecimals || 0);
          const suffix = counter.dataset.countSuffix || '';
          const start = performance.now();
          const duration = 700;
          function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = target * eased;
            counter.textContent = value.toLocaleString('tr-TR', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals
            }) + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
          }
          window.requestAnimationFrame(step);
        }

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
          const proofBounds = proof.getBoundingClientRect();
          if (proofBounds.top <= viewportBottom && proofBounds.bottom >= 0) {
            proof.querySelectorAll('[data-count-to]').forEach(animateCounter);
          }
          if (!revealTargets.length && proof.querySelector('[data-count-to][data-count-started]')) {
            window.removeEventListener('scroll', revealInView);
            window.removeEventListener('resize', revealInView);
          }
        }

        const proofObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.querySelectorAll('[data-count-to]').forEach(animateCounter);
            proofObserver.unobserve(entry.target);
          });
        }, { threshold: 0.35 });
        proofObserver.observe(proof);
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
          <a class="landing-footer-brand site-brand-link" id="landing-footer-title" href="index.html" aria-label="Ana sayfaya dön">Interview Demo</a>
          <nav aria-label="Yasal ve iletişim bağlantıları">
            <a href="#">Gizlilik</a>
            <a href="#">KVKK aydınlatma metni</a>
            <a href="#">İletişim</a>
          </nav>
          <p class="landing-footer-copyright">© 2026 Interview Demo. Tüm hakları saklıdır.</p>
        </div>`;
      main.insertAdjacentElement('afterend', footer);
    }

    const demoUiVisible = window.DEMO_UI_VISIBLE !== false &&
      new URLSearchParams(location.search).get('demo') !== '0';
    if (demoUiVisible) {
      delete document.documentElement.dataset.demoUi;
    } else {
      document.documentElement.dataset.demoUi = 'hidden';
    }
    const serviceCallToAction = document.querySelector('#hizmetler .landing-service-action a');
    if (serviceCallToAction) {
      const serviceCta = getServiceCta(session);
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
    if (session.role === 'danisan') {
      let firstSessionComplete = window.DEMO_FIRST_SESSION_COMPLETED === true;
      try {
        firstSessionComplete = firstSessionComplete ||
          localStorage.getItem('demoIlkSeansTamamlandi') === 'true';
      } catch (error) {
        console.error('İlk seans durumu okunamadı.', error);
      }
      if (firstSessionComplete) {
        const hero = document.querySelector('main > section');
        const callToAction = document.createElement('a');
        callToAction.href = 'ana.html';
        callToAction.className = 'landing-first-session-cta';
        callToAction.innerHTML = '<span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>';
        callToAction.append(document.createTextNode('Devam et: satış hikâyeni oluştur'));
        hero?.querySelector('.pt-2')?.insertAdjacentElement('beforebegin', callToAction);
      }
    }

    const heroAction = document.querySelector('.landing-hero-actions > a:first-child');
    if (heroAction) {
      if (!session.role) {
        heroAction.href = 'kayit.html';
      } else if (session.role === 'danisman') {
        heroAction.href = 'guru-danisanlar.html';
      } else {
        heroAction.href = session.state === 'new' ? 'hizmet.html' : 'ana.html';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderLanding, { once: true });
  } else {
    renderLanding();
  }
})();
