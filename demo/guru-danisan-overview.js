// guru-danisan-overview.js — Danışan detayı · Genel sekmesi. Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/enrollments/{id} (CandidateBrief; rızadan bağımsız açık: etiketli profile_answers B05,
// seanslar, hikâye durumu) · sekme sayaçları: GET /guru/stories/{id}/notes, GET /guru/enrollments/{id}/assignments
// Seans tamamlama: POST /guru/enrollment-sessions/{id}/complete (FR-53). localStorage yok.
// Hikâye metni/ham cevaplar burada gösterilmez (K45: yalnız Hikâye sekmesinde ve rızayla).
(function () {
  'use strict';
  if (!window.Api || !window.GuruPanel) return;
  const Api = window.Api;
  const G = window.GuruPanel;

  const section = Array.from(document.querySelectorAll('section')).find(element =>
    element.classList.contains('lg:col-span-8') &&
    Array.from(element.querySelectorAll('h2')).some(heading => heading.textContent.trim() === 'Profil ön bilgisi')
  );
  if (!section) return;
  document.body.classList.add('guru-client-overview');
  document.body.style.paddingBottom = '5rem';

  const name = section.querySelector('h1');
  const profileCopy = name?.parentElement;
  const avatar = profileCopy?.previousElementSibling;
  const profileHeader = profileCopy?.parentElement;
  let progress, progressCount, registration;
  if (name && profileCopy && avatar && profileHeader) {
    avatar.className = 'client-profile-avatar';
    avatar.textContent = '';
    profileHeader.classList.add('client-profile-card');
    profileCopy.classList.add('client-profile-copy');

    const summary = document.createElement('div');
    summary.className = 'client-profile-summary';
    summary.setAttribute('aria-label', 'Danışan özeti');
    const progressLabel = document.createElement('span');
    progressLabel.className = 'client-session-progress-label';
    progressLabel.textContent = 'Seans ilerlemesi';
    progress = document.createElement('div');
    progress.className = 'client-session-progress';
    progress.setAttribute('role', 'img');
    progressCount = document.createElement('span');
    progressCount.className = 'client-session-progress-count';
    registration = document.createElement('span');
    registration.className = 'client-registration-date';
    summary.append(progressLabel, progress, progressCount, registration);
    summary.hidden = true;
    profileHeader.append(summary);
  }

  // ─── Sekmeler (nav.js ?enrollment=&story= taşır) ───────────────────────────
  const tabs = Array.from(section.querySelectorAll('button')).filter(button =>
    ['Genel', 'Hikâye', 'Notlar', 'Ödevler'].includes(button.textContent.trim())
  );
  const tabList = tabs[0]?.parentElement;
  if (tabs.length === 4 && tabList) {
    tabList.className = 'client-overview-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Danışan detay sekmeleri');
    tabs.forEach(tab => {
      const label = tab.textContent.trim();
      const active = label === 'Genel';
      tab.dataset.tabLabel = label;
      tab.className = 'client-overview-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute('aria-controls', 'client-overview-content');
      tab.addEventListener('keydown', event => {
        let nextIndex = tabs.indexOf(tab);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (nextIndex + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (nextIndex - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      });
    });
  }
  function setTabCount(label, count) {
    const tab = tabs.find(item => item.dataset.tabLabel === label);
    if (!tab || count === null || count === undefined) return;
    tab.querySelector('.client-overview-tab-count')?.remove();
    const badge = document.createElement('span');
    badge.className = 'client-overview-tab-count';
    badge.textContent = `(${count})`;
    tab.append(badge);
  }

  const pageContent = tabList?.nextElementSibling;
  if (pageContent) {
    pageContent.id = 'client-overview-content';
    pageContent.setAttribute('role', 'tabpanel');
    if (tabs[0]) tabs[0].id = 'client-tab-overview';
    pageContent.setAttribute('aria-labelledby', 'client-tab-overview');
  }

  // ─── Profil ön bilgisi (etiketli cevaplar, GAP-B05) ────────────────────────
  const infoHeading = Array.from(section.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Profil ön bilgisi');
  const infoRows = infoHeading?.parentElement?.querySelector(':scope > div');
  infoRows?.classList.add('client-profile-info-grid');

  function renderProfile(brief) {
    if (!infoRows) return;
    const answers = (brief.profile_answers || []).filter(answer => G.answerValue(answer));
    if (!answers.length) {
      const empty = document.createElement('p');
      empty.className = 'text-[14px] text-muted';
      empty.textContent = 'Danışan profil formunu henüz doldurmadı.';
      infoRows.replaceChildren(empty);
      return;
    }
    infoRows.replaceChildren(...answers.map(answer => {
      const row = document.createElement('div');
      row.className = 'client-profile-info-row';
      const label = document.createElement('span');
      label.className = 'client-profile-info-label';
      label.textContent = answer.label;
      const value = document.createElement('span');
      value.className = 'client-profile-info-value';
      value.textContent = G.answerValue(answer);
      row.append(label, value);
      return row;
    }));
  }

  function renderSummary(brief) {
    if (!progress) return;
    const total = brief.enrollment.session_count || brief.sessions.length || 0;
    const done = brief.sessions.filter(s => s.status === 'completed').length;
    progress.setAttribute('aria-label', `${total} seanstan ${done}’i tamamlandı`);
    // Seans başına bir bölüt (tasarımdaki 2 bölütlü çubuk).
    progress.replaceChildren(...Array.from({ length: total }, (_, index) => {
      const segment = document.createElement('span');
      if (index < done) segment.className = 'is-complete';
      return segment;
    }));
    progressCount.textContent = `${done} / ${total}`;
    registration.textContent = 'Kayıt tarihi · ' + Api.format.date(brief.enrollment.created_at, { day: 'numeric', month: 'long', year: 'numeric' });
    progress.parentElement.hidden = false;
    avatar.textContent = G.initials(Api.format.fullName(brief.candidate));
  }

  // ─── Seanslar ──────────────────────────────────────────────────────────────
  const sessionHeading = Array.from(section.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Seanslar');
  const sessionList = sessionHeading?.parentElement?.querySelector(':scope > div');

  const dialog = document.createElement('dialog');
  dialog.className = 'client-session-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'client-session-dialog-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="client-session-dialog-title">Bu seansı tamamlandı olarak işaretlemek istiyor musun?</h2>
      <div class="client-session-dialog-actions">
        <button type="submit" value="cancel">İptal</button>
        <button type="submit" value="confirm" data-action="complete-session-confirm">Onayla</button>
      </div>
    </form>`;
  document.body.append(dialog);
  let pendingSession = null;
  let currentBrief = null;

  function sessionRow(session) {
    const row = document.createElement('div');
    row.className = 'client-session-row py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
    const content = document.createElement('div');
    content.className = 'flex items-center gap-2';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-[20px] ' + (session.status === 'not_scheduled' ? 'text-outline' : 'text-[#51409D]');
    icon.textContent = session.status === 'not_scheduled' ? 'event_busy' : 'event';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'client-session-description text-[14px] font-medium text-[#1E1E1C]';
    const status = document.createElement('span');
    status.className = 'client-session-status';
    content.append(icon, text);
    row.append(content);

    if (session.status === 'not_scheduled') {
      text.textContent = `Seans ${session.sequence_no} · Planlanmadı`;
      status.classList.add('client-session-status--pending');
      status.textContent = 'Beklemede';
      const planLink = document.createElement('a');
      planLink.className = 'client-session-plan';
      planLink.href = 'guru-musaitlik.html';
      planLink.textContent = 'Planla';
      planLink.title = 'Aday, müsaitlik takviminde açtığın saatlerden randevu alır.';
      row.append(status, planLink);
      return row;
    }

    const when = session.scheduled_start_at
      ? `${window.SlotTime ? window.SlotTime.dateLabel(session.scheduled_start_at) : Api.format.date(session.scheduled_start_at)} ${Api.format.time(session.scheduled_start_at)}`
      : '';
    text.append(document.createTextNode(`Seans ${session.sequence_no}${when ? ' · ' + when : ''} · `), status);
    if (session.status === 'completed') {
      status.classList.add('client-session-status--complete');
      status.textContent = 'Tamamlandı';
    } else if (session.status === 'scheduled') {
      status.textContent = 'Planlandı';
    } else {
      status.textContent = session.status === 'cancelled' ? 'İptal edildi' : 'Katılım olmadı';
    }

    if (session.status === 'scheduled' || session.status === 'completed') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'client-session-complete';
      button.dataset.action = 'complete-session';
      if (session.status === 'completed') {
        button.textContent = 'Tamamlandı';
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = 'Bu seans zaten tamamlandı';
      } else {
        button.textContent = 'Tamamlandı işaretle';
        button.addEventListener('click', () => {
          pendingSession = { session, button };
          dialog.showModal();
          dialog.querySelector('button[value="cancel"]').focus();
        });
      }
      row.append(button);
    }
    return row;
  }

  function renderSessions(brief) {
    if (!sessionList) return;
    const sessions = brief.sessions.slice().sort((a, b) => a.sequence_no - b.sequence_no);
    if (!sessions.length) {
      const empty = document.createElement('p');
      empty.className = 'text-[14px] text-muted';
      empty.textContent = 'Bu kayıt için seans bulunmuyor.';
      sessionList.replaceChildren(empty);
      return;
    }
    sessionList.replaceChildren(...sessions.map(sessionRow));
  }

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close('cancel');
    }
  });
  dialog.addEventListener('close', async () => {
    const pending = pendingSession;
    pendingSession = null;
    if (!pending) return;
    if (dialog.returnValue !== 'confirm') { pending.button.focus(); return; }
    try {
      const result = await Api.ui.withLoading(pending.button, () =>
        Api.post(`/guru/enrollment-sessions/${pending.session.id}/complete`), { text: 'İşaretleniyor…' });
      const sessions = currentBrief.sessions.map(s => (s.id === result.session.id ? result.session : s));
      currentBrief = Object.assign({}, currentBrief, { sessions, story: result.story || currentBrief.story });
      renderSessions(currentBrief);
      renderSummary(currentBrief);
      G.toast(result.story_advanced
        ? 'Seans tamamlandı. Danışan hikâye adımına geçebilir.'
        : 'Seans tamamlandı olarak işaretlendi.');
    } catch (error) {
      G.toast(Api.ui.message(error));
      Api.ui.showError(sessionList, error, { position: 'before' });
    }
  });

  async function loadCounts(brief) {
    const storyId = brief.story && brief.story.id;
    const [notes, assignments] = await Promise.all([
      storyId ? Api.listAll(`/guru/stories/${storyId}/notes`).catch(() => null) : Promise.resolve([]),
      Api.listAll(`/guru/enrollments/${brief.enrollment.id}/assignments`).catch(() => null)
    ]);
    if (notes) setTabCount('Notlar', notes.length);
    if (assignments) setTabCount('Ödevler', assignments.filter(a => a.status !== 'cancelled').length);
  }

  async function load() {
    const p = G.params();
    if (!p.enrollmentId) {
      G.showState(pageContent || section, {
        icon: 'person_search', title: 'Danışan seçilmedi',
        text: 'Danışanlarım listesinden bir danışan aç.', replace: true
      });
      return;
    }
    try {
      currentBrief = await G.loadClient();
      renderProfile(currentBrief);
      renderSummary(currentBrief);
      renderSessions(currentBrief);
      loadCounts(currentBrief);
    } catch (error) {
      G.errorState(pageContent || section, error, error.status === 404
        ? { title: 'Danışan bulunamadı', text: 'Bu kayıt sana atanmış değil ya da artık yok.' } : {});
    }
  }

  load();
})();
