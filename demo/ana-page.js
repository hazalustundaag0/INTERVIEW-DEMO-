// ana-page.js — Ana ekran verisi (83). Durum yalnız API'den türetilir ve ileri gider (K36, GAP-U15):
// GET /candidate/enrollments → /candidate/enrollments/{id} (sessions, story_session) +
// booking-prerequisites + assignments + /public/gurus/{guru_id} + /public/services/{id} (şablon başlıkları).
// Eski nav.js wireClientAdvisorProfile buraya taşındı (danisman.html?id=<guru uuid>).
(function () {
  'use strict';
  const STEP_ICONS = ['person', 'calendar_month', 'auto_stories', 'calendar_month', 'flag'];
  const section = document.querySelector('main section');
  const greeting = section && section.querySelector('h1');
  const subtitle = greeting && greeting.nextElementSibling;
  const nextCard = document.querySelector('.next-step-card') ||
    Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('hikâyeni oluştur'))?.closest('div.bg-\\[\\#FFFFFF\\]');
  const sessionHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.trim() === 'Seanslarım');
  const sessionList = sessionHeading && sessionHeading.nextElementSibling;
  const advisorHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.trim() === 'Danışmanın');
  const advisorCard = advisorHeading && advisorHeading.parentElement;

  // Sahte anlık görüntü yüklenene kadar gösterilmez.
  if (nextCard) nextCard.hidden = true;
  if (sessionList) sessionList.hidden = true;
  if (subtitle) subtitle.textContent = '';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderGreeting() {
    const session = window.getSession ? window.getSession() : null;
    const first = session && (session.first_name || session.ad || '').split(/\s+/)[0];
    if (greeting) greeting.textContent = first ? 'Merhaba ' + first : 'Merhaba';
  }

  function renderProgress(ctx) {
    const progress = document.querySelector('.candidate-progress') ||
      document.querySelector('main section .relative.flex.items-center.justify-between.w-full');
    if (!progress) return;
    const model = window.Journey.progress(ctx);
    const steps = Array.from(progress.children).slice(1);
    steps.forEach((step, index) => {
      const info = model.steps[index];
      if (!info) return;
      step.dataset.stepState = info.state;
      const circle = step.firstElementChild;
      if (circle) {
        circle.replaceChildren();
        if (info.state === 'upcoming') circle.textContent = String(index + 1);
        else {
          const icon = el('span', 'material-symbols-outlined text-[20px]', info.state === 'complete' ? 'check' : STEP_ICONS[index]);
          icon.setAttribute('aria-hidden', 'true');
          circle.appendChild(icon);
        }
      }
      const label = step.dataset.stepLabel || info.label;
      if (info.state === 'current') {
        step.setAttribute('aria-current', 'step');
        step.setAttribute('aria-label', label + ', mevcut adım');
      } else {
        step.removeAttribute('aria-current');
        step.setAttribute('aria-label', label + ', ' + (info.state === 'complete' ? 'tamamlandı' : 'sırada'));
      }
    });
    const fill = progress.querySelector('.candidate-progress-fill') || progress.firstElementChild?.firstElementChild;
    if (fill) fill.style.width = Math.min(100, (Math.min(model.current, 4) / 4) * 100) + '%';
  }

  function renderNextStep(step) {
    if (!nextCard) return;
    const title = nextCard.querySelector('.next-step-title, h2');
    const description = nextCard.querySelector('.next-step-description, p');
    const button = nextCard.querySelector('.next-step-cta, button');
    const notes = nextCard.querySelector('.next-step-notes-link, a');
    if (title) title.textContent = step.title;
    if (description) description.textContent = step.description;
    if (subtitle) subtitle.textContent = step.description;
    if (button) {
      button.textContent = step.cta.label;
      button.setAttribute('data-nav-skip', '');
      button.onclick = () => window.Nav ? window.Nav.go(step.cta.href) : (location.href = step.cta.href);
    }
    if (notes) {
      notes.hidden = !step.secondary;
      if (step.secondary) {
        notes.textContent = step.secondary.label;
        notes.href = step.secondary.href;
        notes.setAttribute('data-nav-skip', '');
      }
    }
    nextCard.hidden = false;
    markNextInSidebar(step.cta.href);
  }

  function markNextInSidebar(href) {
    document.querySelectorAll('aside .candidate-next-badge').forEach(node => node.remove());
    const page = String(href).split('?')[0];
    const label = { 'profil.html': 'Profilim', 'cv.html': 'CV\'m', 'randevu-on.html': 'CV\'m', 'takvim.html': 'Seanslarım', 'seanslar.html': 'Seanslarım', 'hikaye-giris.html': 'Hikâyem', 'ciktilar.html': 'Hikâyem' }[page];
    const item = label && Array.from(document.querySelectorAll('aside nav > a')).find(a => a.textContent.includes(label));
    if (item) {
      item.append(el('span', 'candidate-next-badge', 'Sıradaki'));
    }
  }

  async function renderSessions(ctx) {
    if (!sessionList) return;
    sessionList.replaceChildren();
    const sessions = ctx.sessions || [];
    if (!sessions.length) {
      sessionList.append(el('p', 'text-[14px] text-muted', 'Henüz planlanmış bir seansın yok.'));
    }
    for (let i = 0; i < sessions.length; i += 1) {
      const item = sessions[i];
      const tpl = await window.Journey.template(ctx, item.sequence_no);
      const row = el('div', 'flex items-center justify-between candidate-session-row ' + (i < sessions.length - 1 ? 'pb-3 border-b border-outline-variant' : 'pt-1'));
      row.append(el('span', 'text-[14px] font-medium text-[#1E1E1C] candidate-session-title', 'Seans ' + item.sequence_no + (tpl ? ' · ' + tpl.title : '')));
      if (item.status === 'completed') {
        row.append(el('span', 'theme-status-badge theme-status-badge--success candidate-session-badge candidate-session-badge--complete', 'Tamamlandı'));
      } else {
        const actions = el('div', 'flex items-center gap-2 candidate-session-actions');
        const info = window.SessionView ? window.SessionView.statusInfo(item) : { label: item.status };
        const badgeText = item.status === 'scheduled' ? window.Journey.whenText(item) : info.label;
        actions.append(el('span', 'bg-surface-container-low text-muted rounded-full px-2.5 py-0.5 text-[12px] font-medium candidate-session-badge candidate-session-badge--planned', badgeText));
        const bookable = window.Journey.bookableSession(ctx);
        if (item.status === 'not_scheduled' && bookable && bookable.id === item.id) {
          const link = el('a', 'text-[#51409D] hover:underline font-medium text-[14px] candidate-booking-link', 'Randevu al');
          link.href = 'takvim.html';
          link.setAttribute('data-nav-skip', '');
          actions.append(link);
        }
        row.append(actions);
      }
      sessionList.append(row);
    }
    sessionList.hidden = false;
  }

  async function renderAdvisor(ctx) {
    if (!advisorCard) return;
    const guru = await window.Journey.guru(ctx);
    // QA-017: avatar dairesi de text-[16px]/font-semibold taşıdığı için ad/unvan yalnız metin sütunundan seçilir.
    const avatar = advisorCard.querySelector('.rounded-full');
    const textColumn = avatar && avatar.nextElementSibling;
    const name = textColumn && textColumn.children[0];
    const title = textColumn && textColumn.children[1];
    if (!guru) {
      advisorCard.hidden = !ctx.enrollment;
      return;
    }
    if (avatar) avatar.textContent = window.Journey.initials(guru.ad);
    if (name) name.textContent = guru.ad;
    if (title) title.textContent = guru.unvan;
    const copy = advisorCard.querySelector('p');
    if (copy && !advisorCard.querySelector('.candidate-advisor-link')) {
      const link = el('a', 'candidate-advisor-link', 'Danışmanı gör');
      link.href = 'danisman.html?id=' + encodeURIComponent(guru.id);
      link.setAttribute('data-nav-skip', '');
      copy.insertAdjacentElement('afterend', link);
    }
  }

  async function init() {
    renderGreeting();
    document.addEventListener('session:ready', renderGreeting);
    const errorHost = section;
    try {
      const ctx = await window.Journey.load();
      if (!ctx.enrollment) {
        renderProgress(ctx);
        renderNextStep(window.Journey.nextStep(ctx));
        if (sessionList) { sessionList.replaceChildren(el('p', 'text-[14px] text-muted', 'Hizmet satın alındıktan sonra seansların burada görünür.')); sessionList.hidden = false; }
        if (advisorCard) advisorCard.hidden = true;
        window.Journey.applySidebar(ctx, { prerequisites: { missing: ['profile', 'cv'] }, assignments: [] });
        return;
      }
      const side = await window.Journey.refreshSidebar(ctx);
      renderProgress(ctx);
      renderNextStep(window.Journey.nextStep(ctx, side && side.prerequisites));
      await Promise.all([renderSessions(ctx), renderAdvisor(ctx)]);
    } catch (error) {
      if (nextCard) nextCard.hidden = true;
      window.Api.ui.showError(errorHost, error);
    }
  }

  init();
})();
