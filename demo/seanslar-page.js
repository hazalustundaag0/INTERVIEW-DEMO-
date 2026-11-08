// seanslar-page.js — Seanslarım (83). Kartlar API'den: enrollment detayı (sessions) + hizmet şablon başlıkları +
// /public/gurus/{guru_id}. Sahte Google Meet bağlantısı ve demoLinkDurumu kaldırıldı (GAP-D09/B16):
// bağlantı yerine SessionView.renderJoinPlaceholder. "Notları oku" yalnız adaya görünür guru notu varsa.
(function () {
  'use strict';
  const panel = document.getElementById('candidate-session-panel');
  if (!panel) return;
  const templates = Array.from(panel.querySelectorAll('[data-session-id]'));
  const completedTemplate = templates[0];
  const upcomingTemplate = templates[1] || templates[0];
  const unplannedBlock = panel.querySelector('[data-session2-unplanned]');
  const drawer = document.getElementById('session-details-drawer');
  const closeButton = drawer && drawer.querySelector('[data-close-session-drawer]');
  templates.forEach(node => node.remove());
  if (unplannedBlock) unplannedBlock.hidden = true;
  document.body.classList.add('candidate-sessions-page');

  let ctx = null;
  let guru = null;
  let previousFocus = null;
  let drawerSession = null;

  function text(node, value) { if (node) node.textContent = value; }

  async function buildCard(item, total, hasNotes) {
    const info = window.SessionView.statusInfo(item);
    const source = info.key === 'completed' ? completedTemplate : upcomingTemplate;
    const card = source.cloneNode(true);
    card.hidden = false;
    card.removeAttribute('data-upcoming-session');
    card.dataset.sessionId = item.id;
    ['sessionDate', 'sessionStart', 'sessionEnd'].forEach(key => delete card.dataset[key]);
    const tpl = await window.Journey.template(ctx, item.sequence_no);
    text(card.querySelector('.candidate-session-number'), 'Seans ' + item.sequence_no + ' / ' + total);
    window.SessionView.applyStatusBadge(card, item);
    text(card.querySelector('.candidate-session-title'), tpl ? tpl.title : 'Seans ' + item.sequence_no);
    text(card.querySelector('[data-session-date-label]'), window.SessionView.whenLabel(item));
    const avatar = card.querySelector('.candidate-session-advisor-avatar');
    const name = card.querySelector('.candidate-session-advisor-name');
    const link = card.querySelector('.candidate-session-advisor-link');
    if (guru) {
      text(avatar, window.Journey.initials(guru.ad));
      text(name, guru.ad);
      if (link) { link.href = 'danisman.html?id=' + encodeURIComponent(guru.id); link.setAttribute('data-nav-skip', ''); }
    } else {
      card.querySelector('.candidate-session-advisor')?.setAttribute('hidden', '');
    }
    // Paket fiyatı seans başına değildir; yalnız süre gösterilir.
    text(card.querySelector('.candidate-session-price'), ctx.enrollment.session_duration_minutes + ' dakika');
    const countdown = card.querySelector('[data-session-countdown]');
    if (countdown) countdown.textContent = info.key === 'upcoming' ? window.SessionView.countdownLabel(item.scheduled_start_at) : '';
    const message = card.querySelector('[data-session-message]');
    if (message) message.textContent = info.key === 'completed' ? 'Seans tamamlandı' : info.key === 'upcoming' ? 'Seansın planlandı' : info.label;
    const notes = card.querySelector('[data-session-notes-link]');
    if (notes) notes.hidden = !(info.key === 'completed' && hasNotes);
    const join = card.querySelector('[data-link-state-content]');
    if (join) window.SessionView.renderJoinPlaceholder(join);
    const details = card.querySelector('.candidate-session-details-link');
    if (details) {
      details.hidden = info.key !== 'upcoming';
      details.setAttribute('data-nav-skip', '');
      details.addEventListener('click', event => openDrawer(event, item, total));
    }
    return card;
  }

  // ─── Görüşme bilgileri çekmecesi ───────────────────────────────────────────
  async function openDrawer(event, item, total) {
    event.preventDefault();
    if (!drawer) return;
    previousFocus = event.currentTarget;
    drawerSession = item;
    text(drawer.querySelector('#session-drawer-title'), 'Seans ' + item.sequence_no + ' / ' + total);
    text(drawer.querySelector('#session-drawer-title + p'), window.SessionView.whenLabel(item) + ' (İstanbul saati)');
    const dl = drawer.querySelector('dl');
    if (dl) {
      const dts = Array.from(dl.querySelectorAll('dt'));
      dts.forEach(dt => {
        const dd = dt.nextElementSibling;
        if (dt.textContent.trim() === 'Danışman') text(dd, guru ? guru.ad : '—');
        if (dt.textContent.trim() === 'Platform') { dt.hidden = true; if (dd) dd.hidden = true; }
      });
    }
    const linkBox = drawer.querySelector('[data-drawer-link]');
    if (linkBox) window.SessionView.renderJoinPlaceholder(linkBox);
    drawer.hidden = false;
    closeButton?.focus();
    await fillPreparation();
  }

  async function fillPreparation() {
    const list = drawer.querySelector('.session-drawer-section ul');
    if (!list) return;
    const items = Array.from(list.children);
    const [pre, tasks, consents] = await Promise.all([
      window.Journey.prerequisites(ctx).catch(() => null),
      window.Journey.assignments(ctx).catch(() => null),
      window.Api.get('/me/consents').catch(() => null)
    ]);
    const missing = (pre && pre.missing) || [];
    const shared = window.Journey.atLeast(ctx.story, 'DRAFT_GENERATED') &&
      Boolean(consents && (consents.items || []).some(entry => entry.kind === 'guru_visibility' && entry.up_to_date));
    const open = (tasks || []).filter(task => task.status === 'open').length;
    const states = [
      [!missing.includes('profile'), 'Profilin tamam', 'Profilin eksik'],
      [!missing.includes('cv'), 'CV\'n onaylandı', 'CV\'n henüz onaylanmadı'],
      [shared, 'Hikâyen danışmanınla paylaşıldı', 'Hikâyen henüz paylaşılmadı'],
      [open === 0, 'Bekleyen ödev: yok', 'Bekleyen ödev: ' + open]
    ];
    items.forEach((li, index) => {
      const state = states[index];
      if (!state) { li.hidden = true; return; }
      const icon = li.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = state[0] ? 'check_circle' : 'remove';
        icon.classList.toggle('text-[#51409D]', state[0]);
        icon.classList.toggle('text-muted', !state[0]);
      }
      li.lastChild.textContent = state[0] ? state[1] : state[2];
    });
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.hidden = true;
    previousFocus?.focus();
  }

  if (drawer) {
    closeButton?.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', event => { if (event.target === drawer) closeDrawer(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !drawer.hidden) closeDrawer(); });
    const ics = drawer.querySelector('[data-calendar-download]');
    ics?.setAttribute('data-nav-skip', '');
    ics?.addEventListener('click', () => {
      if (!drawerSession || !drawerSession.scheduled_start_at) return;
      const stamp = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Interview Demo//Seans Takvimi//TR', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:' + drawerSession.id + '@interview-demo',
        'DTSTAMP:' + stamp(new Date().toISOString()),
        'DTSTART:' + stamp(drawerSession.scheduled_start_at),
        'DTEND:' + stamp(drawerSession.scheduled_end_at || drawerSession.scheduled_start_at),
        'SUMMARY:Interview Demo · Seans ' + drawerSession.sequence_no + (guru ? ' · ' + guru.ad.replace(/[,;\\]/g, ' ') : ''),
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      const url = URL.createObjectURL(new Blob([lines], { type: 'text/calendar;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'interview-demo-seans-' + drawerSession.sequence_no + '.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  async function init() {
    try {
      ctx = await window.Journey.load();
      if (!ctx.enrollment) {
        window.Journey.showNoEnrollment(panel);
        window.SessionView.setupSessionTabs([], {});
        return;
      }
      const [g, notes] = await Promise.all([
        window.Journey.guru(ctx),
        ctx.story ? window.Api.listAll('/candidate/stories/' + encodeURIComponent(ctx.story.id) + '/notes').catch(() => []) : Promise.resolve([])
      ]);
      guru = g;
      const total = ctx.sessions.length;
      const cards = [];
      for (const item of ctx.sessions) {
        if (item.status === 'not_scheduled') continue;
        const card = await buildCard(item, total, notes.length > 0);
        panel.insertBefore(card, unplannedBlock || panel.firstChild);
        cards.push(card);
      }
      const bookable = window.Journey.bookableSession(ctx);
      if (unplannedBlock && bookable) {
        text(unplannedBlock.querySelector('h2'), 'Seans ' + bookable.sequence_no + ' henüz planlanmadı');
        unplannedBlock.querySelector('a')?.setAttribute('data-nav-skip', '');
      }
      window.SessionView.setupSessionTabs(cards, {
        onRender(activeTab) {
          if (unplannedBlock) unplannedBlock.hidden = !(bookable && activeTab === 'upcoming');
          const empty = document.querySelector('[data-session-empty]');
          if (empty && bookable && activeTab === 'upcoming') empty.hidden = true;
        }
      });
      window.Journey.refreshSidebar(ctx).catch(() => {});
    } catch (error) {
      window.Api.ui.showError(panel, error);
    }
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
