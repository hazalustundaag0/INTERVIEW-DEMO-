(function () {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const weekdays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function readStoredJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(key + ' verisi okunamadı.', error);
      return null;
    }
  }

  function validAppointment(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        typeof value.tarih !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.tarih) ||
        typeof value.bas !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.bas) ||
        typeof value.bit !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.bit)) return false;
    const [year, month, day] = value.tarih.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function dateLabel(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return `${day} ${months[month - 1]} ${weekdays[date.getDay()]}`;
  }

  function sessionHasStarted(dateString, timeString) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now).reduce((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
    const currentDate = `${parts.year}-${parts.month}-${parts.day}`;
    if (dateString !== currentDate) return dateString < currentDate;
    const currentTime = Number(parts.hour) * 60 + Number(parts.minute);
    const [hour, minute] = timeString.split(':').map(Number);
    return hour * 60 + minute <= currentTime;
  }

  function hasSharedNotes() {
    try {
      const rawSessionNote = localStorage.getItem('demoSeansNotu');
      if (rawSessionNote) {
        try {
          const directNote = JSON.parse(rawSessionNote);
          if (typeof directNote === 'string' && directNote.trim()) return true;
          if (directNote && typeof directNote.metin === 'string' && directNote.metin.trim()) return true;
        } catch {
          if (rawSessionNote.trim()) return true;
        }
      }
    } catch (error) {
      console.error('Danışman seans notu okunamadı.', error);
    }
    const notes = readStoredJson('demoGuruNotlari');
    return Array.isArray(notes) && notes.some(note => note && typeof note.metin === 'string' && note.metin.trim());
  }

  function setSessionStatus(card, date, time, explicitlyCompleted) {
    const complete = explicitlyCompleted || sessionHasStarted(date, time);
    const badge = card.querySelector('[data-session-status]');
    if (badge) {
      badge.textContent = complete ? 'Tamamlandı' : 'Yaklaşan';
      badge.classList.toggle('candidate-session-status--complete', complete);
      badge.classList.toggle('candidate-session-status--planned', !complete);
    }
    return complete;
  }

  function daysUntil(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const target = Date.UTC(year, month - 1, day);
    const nowParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).reduce((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
    const today = Date.UTC(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day));
    return Math.round((target - today) / 86400000);
  }

  function updateCountdown(card) {
    const countdown = card.querySelector('[data-session-countdown]');
    if (!countdown) return;
    const days = daysUntil(card.dataset.sessionDate);
    countdown.textContent = days < 0 ? 'Seans tarihi geçti' : days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : days + ' gün sonra';
  }

  function updateJoinState(card) {
    const container = card.querySelector('[data-link-state-content]');
    if (!container) return;
    container.replaceChildren();
    let linkState = 'yok';
    try {
      linkState = localStorage.getItem('demoLinkDurumu') || 'yok';
    } catch (error) {
      console.error('Görüşme linki durumu okunamadı.', error);
    }

    if (linkState === 'acik') {
      const joinLink = document.createElement('a');
      joinLink.className = 'candidate-session-join-button';
      joinLink.href = 'https://meet.google.com/abc-defg-hij';
      joinLink.target = '_blank';
      joinLink.rel = 'noopener noreferrer';
      joinLink.textContent = 'Görüşmeye katıl';
      container.appendChild(joinLink);
      return;
    }

    const message = document.createElement('span');
    message.className = 'candidate-session-join-unavailable';
    message.textContent = 'Link seanstan 15 dk önce gönderilir';
    container.appendChild(message);
  }

  function setupSessionTabs(cards, plannedSession, unplannedState) {
    const tabs = Array.from(document.querySelectorAll('[data-session-tab]'));
    const panel = document.getElementById('candidate-session-panel');
    const emptyState = document.querySelector('[data-session-empty]');
    if (tabs.length !== 2 || !panel) return;
    let activeTab = 'upcoming';

    function render() {
      const counts = {
        upcoming: cards.filter(card => card.dataset.unplanned !== 'true' && card.querySelector('[data-session-status]')?.textContent === 'Yaklaşan').length,
        completed: cards.filter(card => card.dataset.unplanned !== 'true' && card.querySelector('[data-session-status]')?.textContent === 'Tamamlandı').length
      };
      tabs.forEach(tab => {
        const selected = tab.dataset.sessionTab === activeTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const label = selected ? (activeTab === 'upcoming' ? 'Yaklaşan' : 'Tamamlanan') : (tab.dataset.sessionTab === 'upcoming' ? 'Yaklaşan' : 'Tamamlanan');
        tab.textContent = `${label} (${counts[tab.dataset.sessionTab]})`;
      });

      const status = activeTab === 'upcoming' ? 'Yaklaşan' : 'Tamamlandı';
      let matchCount = 0;
      cards.forEach(card => {
        const visible = card.dataset.unplanned !== 'true' && card.querySelector('[data-session-status]')?.textContent === status;
        card.hidden = !visible;
        if (visible) matchCount += 1;
      });
      const hasAnySession = cards.some(card => card.dataset.unplanned !== 'true');
      if (unplannedState) unplannedState.hidden = activeTab !== 'upcoming' || plannedSession || !hasAnySession;
      panel.setAttribute('aria-labelledby', activeTab === 'upcoming' ? 'candidate-tab-upcoming' : 'candidate-tab-completed');
      if (emptyState) {
        emptyState.textContent = matchCount
          ? ''
          : activeTab === 'upcoming'
            ? hasAnySession ? 'Yaklaşan seans bulunmuyor.' : 'Henüz planlanmış bir seansın yok.'
            : 'Henüz tamamlanan seans bulunmuyor.';
        emptyState.hidden = matchCount > 0 || (activeTab === 'upcoming' && !plannedSession && hasAnySession);
      }
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.sessionTab;
        render();
      });
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = tabs.indexOf(tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });
    render();
  }

  const appointment = readStoredJson('demoRandevu');
  if (appointment && !validAppointment(appointment)) {
    console.error('Kaydedilen randevu bilgisi geçersiz; seans listesindeki örnek randevu korunuyor.');
  }

  const bookedAppointment = validAppointment(appointment) ? appointment : null;
  if (bookedAppointment) window.demoBookedAppointment = bookedAppointment;
  const bookedAdvisor = typeof window.getAdvisor === 'function'
    ? window.getAdvisor(bookedAppointment?.danismanId || 'selin-arslan')
    : null;

  if (document.body.classList.contains('guru-session-page')) {
    if (!bookedAppointment) return;
    const clientCard = Array.from(document.querySelectorAll('.session-card')).find(card =>
      card.querySelector('.session-card-title')?.textContent.trim() === (bookedAppointment.aday || 'Elif Yılmaz')
    );
    const dateNode = clientCard?.querySelector('.session-card-date');
    if (dateNode) {
      dateNode.replaceChildren(document.createTextNode(`${dateLabel(bookedAppointment.tarih)} · ${bookedAppointment.bas} - ${bookedAppointment.bit}`));
      clientCard.dataset.bookedAppointment = 'true';
    }
    return;
  }

  const sessionCards = Array.from(document.querySelectorAll('.candidate-session-card'));
  const firstSession = sessionCards.find(card => card.dataset.sessionId === 'session-1');
  const upcomingCard = sessionCards.find(card => card.dataset.sessionId === 'session-2');
  function renderAdvisorIdentity(card, advisor) {
    if (!card || !advisor) return;
    const advisorName = card.querySelector('.candidate-session-advisor-name');
    const advisorAvatar = card.querySelector('.candidate-session-advisor-avatar');
    const advisorLink = card.querySelector('.candidate-session-advisor-link');
    if (advisorName) advisorName.textContent = advisor.ad;
    if (advisorAvatar) advisorAvatar.textContent = advisor.ad.split(/\s+/).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
    if (advisorLink) advisorLink.href = 'danisman.html?id=' + encodeURIComponent(advisor.id);
  }
  renderAdvisorIdentity(firstSession, window.getAdvisor?.('selin-arslan'));

  if (bookedAppointment && upcomingCard) {
    upcomingCard.dataset.sessionDate = bookedAppointment.tarih;
    upcomingCard.dataset.sessionStart = bookedAppointment.bas;
    upcomingCard.dataset.sessionEnd = bookedAppointment.bit;
    const upcomingDate = upcomingCard.querySelector('[data-session-date-label]');
    if (upcomingDate) upcomingDate.textContent = `${dateLabel(bookedAppointment.tarih)} · ${bookedAppointment.bas} - ${bookedAppointment.bit}`;
    renderAdvisorIdentity(upcomingCard, bookedAdvisor);
    const drawerDate = document.querySelector('.session-drawer-header p');
    if (drawerDate) drawerDate.textContent = `${dateLabel(bookedAppointment.tarih)} · ${bookedAppointment.bas} - ${bookedAppointment.bit} (İstanbul saati)`;
    upcomingCard.hidden = false;
    updateCountdown(upcomingCard);
    updateJoinState(upcomingCard);
  }

  const firstSessionCompleted = readStoredJson('demoIlkSeansTamamlandi') === 'true';
  if (firstSession) {
    const date = firstSession.dataset.sessionDate;
    const start = firstSession.dataset.sessionStart || firstSession.dataset.sessionEnd;
    const complete = setSessionStatus(firstSession, date, start, firstSessionCompleted);
    const message = firstSession.querySelector('[data-session-message]');
    if (message) {
      message.textContent = firstSessionCompleted
        ? 'Danışmanın seansı tamamlandı olarak işaretledi'
        : complete
          ? 'Seans tarihi geçti'
          : 'Danışman randevunu onayladı';
    }
    const notesLink = firstSession.querySelector('[data-session-notes-link]');
    if (notesLink) notesLink.hidden = !hasSharedNotes();
  }

  if (upcomingCard) {
    const planned = Boolean(bookedAppointment);
    upcomingCard.dataset.unplanned = String(!planned);
    if (!planned) upcomingCard.hidden = true;
    const date = upcomingCard.dataset.sessionDate;
    const start = upcomingCard.dataset.sessionStart || '14:00';
    setSessionStatus(upcomingCard, date, start, Boolean(bookedAppointment?.tamamlandi));
    if (planned) updateCountdown(upcomingCard);
    const unplannedState = document.querySelector('[data-session2-unplanned]');
    if (unplannedState) unplannedState.hidden = planned;
    setupSessionTabs(sessionCards, planned, unplannedState);
  }
})();
