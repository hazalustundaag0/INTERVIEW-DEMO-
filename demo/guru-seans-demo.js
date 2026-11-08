// guru-seans-demo.js — Guru · Seanslarım (guru-seanslar.html). Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/clients → her kayıt için GET /guru/enrollments/{id}/sessions (GAP-B20: tüm seanslar için tek uç
//       yok → geçici N+1, eşzamanlılık 4). Tamamlama: POST /guru/enrollment-sessions/{id}/complete (FR-53, GAP-U06:
//       artık bayrakla kapalı değil; kuralı backend uygular — planlı olmayan / önceki tamamlanmamış → 409).
// Kaldırılanlar: sahte kartlar (Elif/Can), demoRandevu / demoIlkSeansTamamlandi, sahte görüşme bağlantısı editörü ve
// "Bağlantı bekleyen" özeti (GAP-B16/D09: toplantı bağlantısı alanı yok). Ücret salt okunur (enrollment.amount_minor, K53).
(function () {
  'use strict';
  if (window.__guruSessionPageInitialized) return;
  window.__guruSessionPageInitialized = true;
  if (!window.Api || !window.GuruPanel) return;
  const Api = window.Api;
  const G = window.GuruPanel;
  const SV = window.SessionView;
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const content = document.querySelector('section.lg\\:col-span-8');
  if (!content) return;
  const tabs = Array.from(content.querySelectorAll('button')).filter(button => ['Yaklaşan', 'Tamamlanan'].includes(button.textContent.trim()));
  const tabList = tabs[0]?.parentElement;
  const list = tabList?.nextElementSibling;
  const pageHeader = content.querySelector('h1')?.parentElement;
  if (!tabList || !list || !pageHeader) return;

  // ─── Onay penceresi ────────────────────────────────────────────────────────
  const dialog = document.createElement('dialog');
  dialog.className = 'session-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'session-confirm-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="session-confirm-title" class="text-[18px] font-semibold">Seansı tamamlandı olarak işaretlemek istiyor musun?</h2>
      <div class="session-dialog-actions">
        <button type="submit" value="cancel">İptal</button>
        <button type="submit" value="confirm" data-action="complete-session-confirm">Onayla</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  let pendingCompletion = null;

  function toast(message) { G.toast(message, 'session-toast'); }

  function setButtonContent(button, label, iconName) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined session-action-icon';
    icon.textContent = iconName;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = label;
    button.replaceChildren(icon, text);
  }

  // ─── Özet kartları (Yaklaşan / Tamamlanan) ─────────────────────────────────
  const summaryCards = document.createElement('div');
  summaryCards.className = 'session-summary-grid';
  [['upcoming', 'event', 'Yaklaşan seans', 'session-summary-card--upcoming'],
    ['completed', 'task_alt', 'Tamamlanan', 'session-summary-card--completed']].forEach(([key, iconName, label, tone]) => {
    const card = document.createElement('article');
    card.className = `session-summary-card ${tone}`;
    card.dataset.summary = key;
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined session-summary-icon';
    icon.textContent = iconName;
    icon.setAttribute('aria-hidden', 'true');
    const count = document.createElement('strong');
    count.className = 'session-summary-count';
    count.textContent = '–';
    const labelNode = document.createElement('span');
    labelNode.className = 'session-summary-label';
    labelNode.textContent = label;
    card.append(icon, count, labelNode);
    summaryCards.appendChild(card);
  });
  pageHeader.insertAdjacentElement('afterend', summaryCards);

  // ─── Sekmeler ──────────────────────────────────────────────────────────────
  let cards = [];
  let activeStatus = 'Yaklaşan';
  tabList.className = 'session-tabs';
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'Seans durumu');
  list.classList.add('session-card-list');
  list.id = 'session-card-list';
  list.setAttribute('role', 'tabpanel');
  const emptyState = document.createElement('div');
  emptyState.className = 'session-empty-state';
  emptyState.hidden = true;
  emptyState.setAttribute('role', 'status');
  emptyState.setAttribute('aria-live', 'polite');
  const emptyIcon = document.createElement('span');
  emptyIcon.className = 'material-symbols-outlined session-empty-icon';
  emptyIcon.setAttribute('aria-hidden', 'true');
  emptyIcon.textContent = 'event_available';
  const emptyMessage = document.createElement('p');
  emptyMessage.className = 'session-empty-message';
  const emptyHint = document.createElement('p');
  emptyHint.className = 'session-empty-hint';
  emptyState.append(emptyIcon, emptyMessage, emptyHint);

  function statusKey(card) { return card.dataset.sessionKey; }

  function renderTabs() {
    const counts = {
      Yaklaşan: cards.filter(card => statusKey(card) === 'upcoming').length,
      Tamamlanan: cards.filter(card => statusKey(card) === 'completed').length
    };
    summaryCards.querySelector('[data-summary="upcoming"] .session-summary-count').textContent = String(counts.Yaklaşan);
    summaryCards.querySelector('[data-summary="completed"] .session-summary-count').textContent = String(counts.Tamamlanan);
    tabs.forEach(tab => {
      const label = tab.dataset.sessionStatus;
      const selected = label === activeStatus;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-controls', list.id);
      tab.tabIndex = selected ? 0 : -1;
      const count = document.createElement('span');
      count.className = 'session-tab-count';
      count.setAttribute('aria-label', `${counts[label]} seans`);
      count.textContent = String(counts[label]);
      tab.replaceChildren(document.createTextNode(label), count);
    });
    const activeTab = tabs.find(tab => tab.dataset.sessionStatus === activeStatus);
    list.setAttribute('aria-labelledby', activeTab.id);
    const target = activeStatus === 'Tamamlanan' ? 'completed' : 'upcoming';
    let visible = 0;
    cards.forEach(card => {
      const show = statusKey(card) === target;
      card.hidden = !show;
      if (show) visible += 1;
    });
    emptyMessage.textContent = activeStatus === 'Tamamlanan' ? 'Henüz tamamlanan seans yok' : 'Yaklaşan seans yok';
    emptyHint.textContent = activeStatus === 'Tamamlanan' ? 'Yeni seanslarını burada görebileceksin.' : 'Adaylar müsaitlik takviminden randevu aldığında burada görünür.';
    emptyState.hidden = visible > 0;
    if (!emptyState.isConnected) list.append(emptyState);
  }

  tabs.forEach(tab => {
    const label = tab.textContent.trim();
    tab.dataset.sessionStatus = label;
    tab.dataset.navSkip = '';
    tab.className = 'session-tab';
    tab.id = `session-tab-${label === 'Yaklaşan' ? 'upcoming' : 'completed'}`;
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => { activeStatus = label; renderTabs(); });
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });

  // ─── Kartlar ───────────────────────────────────────────────────────────────
  function avatarTone(name) {
    const tones = ['indigo', 'teal', 'coral', 'purple'];
    let hash = 0;
    for (const character of name) hash = (hash * 31 + character.codePointAt(0)) | 0;
    return tones[Math.abs(hash) % tones.length];
  }

  function setProximity(card, countdown, session) {
    card.classList.remove('session-card--today', 'session-card--soon', 'session-card--later', 'session-card--completed', 'session-card--unknown', 'session-card--past');
    if (session.status === 'completed') {
      card.classList.add('session-card--completed');
      countdown.textContent = 'Tamamlandı';
      countdown.hidden = false;
      return;
    }
    if (!session.scheduled_start_at || !SV) {
      card.classList.add('session-card--unknown');
      countdown.hidden = true;
      return;
    }
    const days = SV.daysUntil(session.scheduled_start_at);
    countdown.hidden = false;
    countdown.textContent = SV.countdownLabel(session.scheduled_start_at);
    card.classList.add(days < 0 ? 'session-card--past' : days <= 1 ? 'session-card--today' : days <= 3 ? 'session-card--soon' : 'session-card--later');
  }

  function statusBadge(status, session) {
    const done = session.status === 'completed';
    status.textContent = done ? 'Tamamlandı' : 'Yaklaşan';
    status.className = done
      ? 'session-card-status inline-flex items-center rounded px-2.5 py-1 text-[12px] font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
      : 'session-card-status inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]';
  }

  function buildCard(session, client) {
    const name = Api.format.fullName(client.candidate) || 'Danışan';
    const card = document.createElement('div');
    card.className = 'session-card bg-[#FFFFFF] rounded-[8px] border border-outline-variant p-5 flex flex-col md:flex-row md:items-center justify-between gap-4';
    card.dataset.sessionKey = session.status === 'completed' ? 'completed' : 'upcoming';
    card.dataset.sessionId = session.id;

    // Tarih bloğu
    const parts = window.SlotTime && session.scheduled_start_at ? window.SlotTime.parts(session.scheduled_start_at) : null;
    const dateBlock = document.createElement('div');
    dateBlock.className = 'session-card-date-block';
    if (parts) {
      const [, month, day] = parts.date.split('-').map(Number);
      dateBlock.setAttribute('aria-label', SV ? SV.dateLabel(session.scheduled_start_at) : parts.date);
      const dayNode = document.createElement('strong');
      dayNode.className = 'session-card-date-day';
      dayNode.textContent = String(day);
      const monthNode = document.createElement('span');
      monthNode.className = 'session-card-date-month';
      monthNode.textContent = MONTHS[month - 1].slice(0, 3);
      const weekdayNode = document.createElement('span');
      weekdayNode.className = 'session-card-date-weekday';
      weekdayNode.textContent = window.SlotTime.weekdays[parts.weekday];
      dateBlock.append(dayNode, monthNode, weekdayNode);
    }

    const details = document.createElement('div');
    details.className = 'session-card-details flex flex-col';
    const heading = document.createElement('div');
    heading.className = 'session-card-heading';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'session-card-title-group';
    const avatar = document.createElement('span');
    avatar.className = `session-card-avatar session-card-avatar--${avatarTone(name)}`;
    avatar.textContent = G.initials(name);
    avatar.setAttribute('aria-hidden', 'true');
    const index = document.createElement('span');
    index.className = 'session-card-index';
    index.textContent = `Seans ${session.sequence_no} / ${client.enrollment.session_count}`;
    const title = document.createElement('h2');
    title.className = 'session-card-title';
    title.textContent = name;
    titleGroup.append(avatar, index, title);
    const status = document.createElement('span');
    statusBadge(status, session);
    heading.append(titleGroup, status);

    const date = document.createElement('p');
    date.className = 'session-card-date';
    date.textContent = SV ? SV.timeRange(session.scheduled_start_at, session.scheduled_end_at) : '';

    const price = document.createElement('span');
    price.className = 'session-card-price';
    const priceLabel = document.createElement('span');
    priceLabel.className = 'session-card-price-label';
    priceLabel.textContent = 'Ücret:';
    const priceValue = document.createElement('strong');
    priceValue.className = 'session-card-price-value';
    priceValue.textContent = Api.format.money(client.enrollment.amount_minor, client.enrollment.currency);
    price.append(priceLabel, document.createTextNode(' '), priceValue);

    const meta = document.createElement('div');
    meta.className = 'session-card-meta';
    const detailLink = document.createElement('a');
    detailLink.className = 'session-card-detail-link';
    detailLink.href = 'guru-danisan-detay.html?' + new URLSearchParams({ enrollment: client.enrollment.id }).toString();
    detailLink.dataset.navSkip = '';
    const detailIcon = document.createElement('span');
    detailIcon.className = 'material-symbols-outlined session-action-icon';
    detailIcon.textContent = 'arrow_forward';
    detailIcon.setAttribute('aria-hidden', 'true');
    const detailText = document.createElement('span');
    detailText.textContent = 'Danışanı gör';
    detailLink.append(detailIcon, detailText);
    const countdown = document.createElement('span');
    countdown.className = 'session-card-countdown';
    const join = document.createElement('span');
    if (SV) SV.renderJoinPlaceholder(join);
    meta.append(detailLink, countdown, join);
    details.append(heading, date, price, meta);

    const actions = document.createElement('div');
    actions.className = 'session-card-actions';
    const completeButton = document.createElement('button');
    completeButton.type = 'button';
    completeButton.className = 'session-complete-button';
    completeButton.dataset.action = 'complete-session';
    function syncButton() {
      const done = session.status === 'completed';
      setButtonContent(completeButton, done ? 'Tamamlandı' : 'Tamamlandı işaretle', 'check_circle');
      completeButton.disabled = done;
      completeButton.setAttribute('aria-disabled', String(done));
      completeButton.title = done ? 'Bu seans zaten tamamlandı' : 'Seans yapıldıktan sonra işaretle';
    }
    syncButton();
    completeButton.addEventListener('click', () => {
      if (completeButton.disabled) return;
      pendingCompletion = { card, session, button: completeButton, update(next) {
        Object.assign(session, next);
        card.dataset.sessionKey = 'completed';
        statusBadge(status, session);
        setProximity(card, countdown, session);
        syncButton();
      } };
      dialog.showModal();
      dialog.querySelector('button[value="cancel"]').focus();
    });
    actions.append(completeButton);

    card.append(dateBlock, details, actions);
    setProximity(card, countdown, session);
    return card;
  }

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dialog.close('cancel'); }
  });
  dialog.addEventListener('close', async () => {
    const pending = pendingCompletion;
    pendingCompletion = null;
    if (!pending) return;
    if (dialog.returnValue !== 'confirm') { pending.button.focus(); return; }
    try {
      const result = await Api.ui.withLoading(pending.button, () =>
        Api.post(`/guru/enrollment-sessions/${pending.session.id}/complete`), { text: 'İşaretleniyor…' });
      pending.update(result.session);
      renderTabs();
      toast(result.story_advanced ? 'Seans tamamlandı. Danışan hikâye adımına geçebilir.' : 'Seans tamamlandı olarak işaretlendi.');
    } catch (error) {
      toast(Api.ui.message(error));
      pending.button.focus();
    }
  });

  async function load() {
    list.replaceChildren();
    list.setAttribute('aria-busy', 'true');
    try {
      await window.sessionReady;
      const clients = await Api.listAll('/guru/clients', { limit: 100 });
      const active = clients.filter(client => client.enrollment.status === 'active' || client.enrollment.status === 'completed');
      const lists = await G.mapLimit(active, 4, client =>
        Api.get(`/guru/enrollments/${client.enrollment.id}/sessions`).then(data => (data.items || []).map(session => ({ session, client }))));
      const entries = lists.flat().filter(({ session }) => session.status === 'scheduled' || session.status === 'completed');
      entries.sort((a, b) => {
        const ta = Date.parse(a.session.scheduled_start_at || a.session.completed_at || 0);
        const tb = Date.parse(b.session.scheduled_start_at || b.session.completed_at || 0);
        return a.session.status === 'completed' ? tb - ta : ta - tb;
      });
      cards = entries.map(({ session, client }) => buildCard(session, client));
      list.replaceChildren(...cards);
      renderTabs();
    } catch (error) {
      cards = [];
      renderTabs();
      Api.ui.showError(list, error, { position: 'before' });
    } finally {
      list.removeAttribute('aria-busy');
    }
  }

  renderTabs();
  load();
})();
