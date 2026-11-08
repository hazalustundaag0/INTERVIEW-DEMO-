// landing-page.js — index.html (landing) düzeni ve dinamik blokları. SAHİBİ: 82 Aday Onboarding UI Agent.
// Veri: danışmanlar → window.Advisors (GET /public/gurus), hizmet kartı → GET /public/services
// (ad, açıklama, seans sayısı/süresi), oturum → window.sessionReady, "kaydın var mı" → GET /candidate/enrollments.
// Kaldırılan demo davranışı (GAP-D07/B03): sahte istatistik şeridi (250+ seans, 4,8 puan …), tanıtım
// videosu kartının yerine basılan örnek hikâye, danışman puanı ve "müsaitlik" metni. localStorage yok.
// "Sana kalan çıktılar" örnek kartları (landing-outputs.js) "Örnek" etiketli pazarlama içeriğidir (K57 gibi).
(function () {
  'use strict';
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page !== 'index.html') return;

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
      return { href: 'ana.html', loginHref: '', disabled: false, title: '' };
    }
    return {
      href: 'danismanlar.html',
      loginHref: !(session && session.role) ? 'giris.html?return=' + encodeURIComponent('danismanlar.html') : '',
      disabled: false,
      title: ''
    };
  }
  window.getServiceCta = getServiceCta;

  async function renderLanding() {
    if (page !== 'index.html') return;
    const session = await (window.sessionReady || Promise.resolve(window.getSession ? window.getSession() : {}));
    const hasEnrollment = session && session.role === 'danisan' ? await candidateHasEnrollment() : false;
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
    // 81: danışmanlar GET /public/gurus'tan (js/advisors.js adaptörü). Sahte veri yok (GAP-D08).
    let advisors = [];
    try {
      advisors = window.Advisors ? (await window.Advisors.list({ limit: 6 })).slice(0, 6) : [];
    } catch (error) {
      console.error('Danışman listesi yüklenemedi:', error && error.message);
    }
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
        identity.append(avatar, name, title);
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
      // Veri yoksa statik/sahte kart gösterilmez; "Tüm danışmanları gör" bağlantısı kalır.
      advisorGrid.replaceChildren();
      advisorGrid.style.display = 'none';
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
      const sectorMap = new Map();
      advisors.forEach(advisor => (advisor.card.sectors || []).forEach(sector => sectorMap.set(sector.code, sector)));
      Array.from(sectorMap.values())
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .slice(0, 6)
        .forEach(sector => {
          const link = document.createElement('a');
          link.href = `danismanlar.html?sektor=${encodeURIComponent(sector.code)}`;
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
          if (title) title.textContent = service.name;
          if (description && service.description) description.textContent = service.description;
          if (meta) meta.textContent = sessionLabel;
        }
        const heroMeta = document.querySelector('.landing-hero-copy .material-symbols-outlined + span');
        if (heroMeta) heroMeta.textContent = sessionLabel;
      }
    } catch (error) {
      console.error('Hizmet bilgisi yüklenemedi:', error && error.message);
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

      // GAP-D07: sahte istatistik şeridi ve örnek hikâye kaldırıldı; tanıtım videosu kartı (HTML) olduğu gibi kalır.

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
    // Kaydı olan aday ana ekrana gider; "sıradaki adım" (ilk seans sonrası hikâye vb.) ana.html'de
    // story_session.status'tan türetilir (83). Eski demoIlkSeansTamamlandi bayrağı kaldırıldı.
    const heroAction = document.querySelector('.landing-hero-actions > a:first-child');
    if (heroAction) {
      if (!session.role) {
        heroAction.href = 'kayit.html';
      } else if (session.role === 'danisman') {
        heroAction.href = 'guru-danisanlar.html';
      } else {
        heroAction.href = hasEnrollment ? 'ana.html' : 'danismanlar.html';
      }
    }
  }

  function start() {
    renderLanding().catch(error => console.error('Landing oluşturulamadı:', error));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
