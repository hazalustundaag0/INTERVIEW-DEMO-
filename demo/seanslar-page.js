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

  async function buildCard(item, total, notes) {
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
      // K83: guru fotoğrafı herkese açık katalog URL'si (/public/gurus/{id}/avatar); yoksa baş harfler.
      window.Journey.paintAvatar(avatar, guru.ad, guru.avatarUrl);
      text(name, guru.ad);
      if (link) { link.href = '/danisman?id=' + encodeURIComponent(guru.id); link.setAttribute('data-nav-skip', ''); }
    } else {
      card.querySelector('.candidate-session-advisor')?.setAttribute('hidden', '');
    }
    // Paket fiyatı seans başına değildir; yalnız süre gösterilir. GAP-E6-15: seans dili (planlı seansta değiştirilebilir).
    text(card.querySelector('.candidate-session-price'), ctx.enrollment.session_duration_minutes + ' dakika' +
      (item.language ? ' · ' + (item.language === 'en' ? 'English' : 'Türkçe') : ''));
    if (info.key === 'upcoming' && item.status === 'scheduled') {
      const priceNode = card.querySelector('.candidate-session-price');
      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'candidate-session-language-change';
      change.setAttribute('data-nav-skip', '');
      change.setAttribute('data-action', 'session-language');
      change.textContent = 'Dili değiştir';
      change.addEventListener('click', async () => {
        const next = item.language === 'en' ? 'tr' : 'en';
        try {
          const updated = await window.Api.ui.withLoading(change, () =>
            window.Api.patch('/candidate/enrollment-sessions/' + encodeURIComponent(item.id), { language: next }));
          item.language = updated.language || next;
          text(priceNode, ctx.enrollment.session_duration_minutes + ' dakika · ' + (item.language === 'en' ? 'English' : 'Türkçe'));
        } catch (error) {
          window.Api.ui.showError(card, error);
        }
      });
      if (priceNode) priceNode.insertAdjacentElement('afterend', change);
    }
    const countdown = card.querySelector('[data-session-countdown]');
    if (countdown) countdown.textContent = info.key === 'upcoming' ? window.SessionView.countdownLabel(item.scheduled_start_at) : '';
    const message = card.querySelector('[data-session-message]');
    if (message) message.textContent = info.key === 'completed' ? 'Seans tamamlandı' : info.key === 'upcoming' ? 'Seansın planlandı' : info.label;
    // Etap 14 (TC-UC19-001): bağlantı kendi seansının paylaşılan notlarına (?seans=N); yalnız not varsa.
    const notesLink = card.querySelector('[data-session-notes-link]');
    const seqNotes = (notes && notes.bySeq[item.sequence_no]) || [];
    if (notesLink) {
      notesLink.hidden = !(info.key === 'completed' && seqNotes.length);
      notesLink.href = window.Journey.notesHref(item.sequence_no);
      notesLink.setAttribute('data-nav-skip', '');
    }
    const join = card.querySelector('[data-link-state-content]');
    if (join) window.SessionView.renderJoin(join, item);   // GAP-B16
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
    if (linkBox) window.SessionView.renderJoin(linkBox, item);
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
    const open = (tasks || []).filter(task => task.status === 'open' || task.status === 'in_progress').length;
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

  // Birden çok paket varsa seçici: "Paket: <tarih> · durum". Seçim adrese (?paket=) yazılır.
  function renderPackagePicker() {
    const list = window.Journey.enrollments().filter(item => item.status !== 'cancelled');
    const old = document.querySelector('[data-package-picker]');
    if (old) old.remove();
    if (list.length < 2) return;
    const STATUS = { active: 'devam ediyor', completed: 'tamamlandı', pending_payment: 'ödeme bekliyor' };
    const wrap = document.createElement('label');
    wrap.setAttribute('data-package-picker', '');
    wrap.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin:0 0 1rem;font-size:14px;color:var(--color-ink-2,#475569)';
    wrap.append(document.createTextNode('Paket'));
    const select = document.createElement('select');
    select.setAttribute('data-nav-skip', '');
    select.style.cssText = 'padding:.4rem .6rem;border:1px solid var(--color-rule-2,#C4B5FD);border-radius:8px;background:#fff';
    list.forEach((item, i) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = window.Api.format.date(item.created_at) + ' · ' + (STATUS[item.status] || item.status) + (item.is_current || (i === 0 && !list.some(x => x.is_current)) ? ' (güncel)' : '');
      option.selected = item.id === ctx.enrollment.id;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      const url = new URL(location.href);
      const currentId = (list.find(x => x.is_current) || list[0]).id;
      if (select.value === currentId) url.searchParams.delete('paket'); else url.searchParams.set('paket', select.value);
      location.href = url.pathname + url.search;
    });
    wrap.appendChild(select);
    panel.insertAdjacentElement('beforebegin', wrap);
  }

  async function init() {
    try {
      // Etap 14 (TC-ADAY-10-003): varsayılan güncel (en son satın alınan) paket; ?paket=<id> ile önceki paket.
      const wanted = new URLSearchParams(location.search).get('paket');
      ctx = await window.Journey.load(wanted || undefined);
      if (!ctx.enrollment) {
        window.Journey.showNoEnrollment(panel);
        window.SessionView.setupSessionTabs([], {});
        return;
      }
      renderPackagePicker();
      const [g, notes] = await Promise.all([window.Journey.guru(ctx), window.Journey.sharedNotes(ctx)]);
      guru = g;
      const total = ctx.sessions.length;
      const cards = [];
      for (const item of ctx.sessions) {
        if (item.status === 'not_scheduled') continue;
        const card = await buildCard(item, total, notes);
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

  // QA-024: init, tüm betikler (aday-yolculuk.js dahil) çalıştıktan ve oturum doğrulandıktan sonra başlar.
  new Promise(resolve => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve, { once: true }) : resolve()))
    .then(() => window.sessionReady).then(init);
})();
