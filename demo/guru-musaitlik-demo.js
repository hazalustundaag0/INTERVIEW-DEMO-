// guru-musaitlik-demo.js — Guru · haftalık müsaitlik takvimi (guru-musaitlik.html). Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/availability?from=&to= → yalnız MÜSAİT slotlar (is_available; rezerve olan listeden düşer).
//       Rezerve bloklar planlı seanslardan çizilir: GET /guru/clients → GET /guru/enrollments/{id}/sessions
//       (GAP-B18 "rezerve eden aday" alanı ve GAP-B20 tek uç yok → geçici N+1, eşzamanlılık 4).
// Slot silme/düzenleme ucu YOK (GAP-B18: DELETE /guru/availability/{id}) → Sil/Düzenle gösterilmez.
// "Hizmetlerim ve fiyatım" kartı kaldırıldı (K53/GAP-U07: fiyatı yönetici belirler).
// Hafta: ?hafta=YYYY-MM-DD (ekleme sonrası dönüş) — depolama yok. Saatler Europe/Istanbul.
(function () {
  'use strict';
  if (!window.Api || !window.SlotTime) return;
  const Api = window.Api;
  const T = window.SlotTime;
  const weekdayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthNames = T.months;
  const section = document.querySelector('main section');
  if (!section) return;

  const periodLabel = section.querySelector('[data-week-label]');
  if (!periodLabel) return;
  const calendar = periodLabel.parentElement.parentElement;
  calendar.classList.add('availability-calendar');
  const calendarGrid = calendar.querySelector('[class~="min-w-[700px]"]');
  const calendarHeader = calendarGrid && calendarGrid.children[0];
  const calendarBody = calendarGrid && calendarGrid.children[1];
  const viewport = calendar.querySelector('.overflow-x-auto');
  viewport?.classList.add('availability-viewport');
  calendarHeader?.classList.add('availability-calendar-header');
  calendarHeader?.setAttribute('aria-label', 'Haftalık takvim günleri');
  const toolbarButtons = Array.from(calendar.querySelectorAll('button'));
  const todayButton = toolbarButtons.find(button => button.textContent.trim() === 'Bugün');
  const previousButton = toolbarButtons.find(button => button.textContent.trim() === 'chevron_left');
  const nextButton = toolbarButtons.find(button => button.textContent.trim() === 'chevron_right');
  [previousButton, nextButton].filter(Boolean).forEach(button => {
    button.classList.add('availability-week-nav');
    button.setAttribute('aria-label', button === previousButton ? 'Önceki hafta' : 'Sonraki hafta');
  });
  todayButton?.classList.add('availability-week-today');
  const templateRow = calendarBody.children[0].cloneNode(true);

  const today = T.today();
  const params = new URLSearchParams(location.search);
  const requestedWeek = params.get('hafta');
  let weekStart = T.weekStart(requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek) ? requestedWeek : today);
  let slots = [];        // { id, date, start, end, reserved, candidate, enrollmentId }
  let reserved = [];     // planlı seanslar (tüm haftalar)
  let activeSlotTrigger = null;
  let outsideClickHandler = null;
  let escapeKeyHandler = null;
  let requestSeq = 0;

  function minutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function dayLabel(dateStr, includeYear) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return d + ' ' + monthNames[m - 1] + (includeYear ? ' ' + y : '');
  }

  function showDeliveryNotice() {
    const count = Number(params.get('eklendi'));
    if (!Number.isFinite(count) || count < 1) return;
    const notice = document.createElement('div');
    notice.className = 'rounded-[8px] border border-[#BCB7F5] bg-[#EEECFF] px-4 py-3 text-[14px] font-semibold text-[#51409D]';
    notice.setAttribute('role', 'status');
    notice.textContent = count + ' saat eklendi. Adaylar artık bu saatlerden randevu alabilir.';
    section.insertBefore(notice, section.firstChild);
    window.setTimeout(() => notice.remove(), 5000);
    params.delete('eklendi');
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }

  function openAddAvailability(date, time) {
    location.href = 'guru-musaitlik-ekle.html?' + new URLSearchParams({ date, start: time }).toString();
  }

  function closeOnOutsideClick(event) {
    const popover = document.getElementById('availability-popover');
    if (popover && !popover.contains(event.target) && !activeSlotTrigger?.contains(event.target)) closePopover(false);
  }

  function closePopover(restoreFocus) {
    document.getElementById('availability-popover')?.remove();
    if (activeSlotTrigger) {
      activeSlotTrigger.setAttribute('aria-expanded', 'false');
      activeSlotTrigger.removeAttribute('aria-controls');
      if (restoreFocus !== false && activeSlotTrigger.isConnected) activeSlotTrigger.focus();
    }
    activeSlotTrigger = null;
    if (outsideClickHandler) document.removeEventListener('click', outsideClickHandler);
    if (escapeKeyHandler) document.removeEventListener('keydown', escapeKeyHandler);
    outsideClickHandler = null;
    escapeKeyHandler = null;
  }

  function openSlotDetails(slot, anchor) {
    closePopover(false);
    const popover = document.createElement('div');
    popover.id = 'availability-popover';
    popover.className = 'availability-slot-popover fixed z-[100000] w-[min(300px,calc(100%_-_32px))] rounded-[8px] border border-[#7564C7] bg-white p-4 shadow-xl';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.setAttribute('aria-label', slot.reserved ? 'Rezerve randevu bilgileri' : 'Müsaitlik bilgisi');
    anchor.setAttribute('aria-haspopup', 'dialog');
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', popover.id);
    activeSlotTrigger = anchor;
    const heading = document.createElement('p');
    heading.className = 'text-[14px] font-semibold text-[#1E1E1C]';
    heading.textContent = dayLabel(slot.date, true) + ' · ' + slot.start + ' - ' + slot.end;
    popover.appendChild(heading);
    if (slot.reserved) {
      const name = document.createElement('p');
      name.className = 'mt-2 text-[13px] font-semibold text-[#51409D]';
      name.textContent = (slot.candidate || 'Aday') + (slot.sequenceNo ? ' · Seans ' + slot.sequenceNo : '');
      const link = document.createElement('a');
      link.href = 'guru-danisan-detay.html?' + new URLSearchParams({ enrollment: slot.enrollmentId }).toString();
      link.className = 'mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-[#51409D] px-3 py-2 text-[13px] font-semibold text-white';
      link.textContent = 'Detaya git';
      popover.append(name, link);
    } else {
      const info = document.createElement('p');
      info.className = 'mt-2 text-[13px] text-[#51409D]';
      info.textContent = 'Müsait · adaylar bu saatten randevu alabilir.';
      popover.append(info);
    }
    document.body.appendChild(popover);
    requestAnimationFrame(() => {
      if (!popover.isConnected) return;
      const rect = anchor.getBoundingClientRect();
      const bounds = popover.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const left = Math.max(12, Math.min(rect.left + rect.width / 2 - bounds.width / 2, viewportWidth - bounds.width - 12));
      const top = rect.bottom + bounds.height + 8 <= viewportHeight ? rect.bottom + 8 : Math.max(12, rect.top - bounds.height - 8);
      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    });
    outsideClickHandler = closeOnOutsideClick;
    escapeKeyHandler = event => { if (event.key === 'Escape') { event.preventDefault(); closePopover(); } };
    window.setTimeout(() => {
      document.addEventListener('click', outsideClickHandler);
      document.addEventListener('keydown', escapeKeyHandler);
    });
    (popover.querySelector('a') || popover).focus({ preventScroll: true });
  }

  function renderEmptyState(show) {
    let empty = calendar.querySelector('[data-availability-empty-state]');
    if (!show) { empty?.remove(); return; }
    if (empty) return;
    empty = document.createElement('div');
    empty.dataset.availabilityEmptyState = '';
    empty.className = 'flex flex-col items-center gap-3 px-5 py-8 text-center';
    empty.innerHTML = '<span class="material-symbols-outlined text-[34px] text-[#7564C7]" aria-hidden="true">event_busy</span><p class="max-w-[360px] text-[14px] leading-6 text-[#7564C7]">Henüz müsaitlik eklemedin. Saat eklemeden adaylar randevu alamaz.</p><a class="inline-flex items-center gap-1.5 rounded-[8px] bg-[#51409D] px-4 py-2.5 text-[14px] font-semibold text-white" href="guru-musaitlik-ekle.html">+ Müsaitlik Ekle</a>';
    calendar.appendChild(empty);
  }

  function renderCalendar() {
    closePopover(false);
    const weekEnd = T.addDays(weekStart, 6);
    const [, startMonth] = weekStart.split('-').map(Number);
    const [, endMonth] = weekEnd.split('-').map(Number);
    periodLabel.textContent = startMonth === endMonth
      ? Number(weekStart.slice(8)) + ' - ' + Number(weekEnd.slice(8)) + ' ' + monthNames[endMonth - 1] + ' ' + weekEnd.slice(0, 4)
      : dayLabel(weekStart, false) + ' - ' + dayLabel(weekEnd, true);

    Array.from(calendarHeader.children).slice(1).forEach((cell, index) => {
      const date = T.addDays(weekStart, index);
      const isToday = date === today;
      const weekend = index >= 5;
      cell.dataset.today = String(isToday);
      cell.children[0].textContent = weekdayNames[index];
      cell.children[1].textContent = dayLabel(date, false).replace(/(\S+)$/, m => m.slice(0, 3));
      cell.classList.toggle('bg-[#7564C7]/70', weekend);
      cell.children[0].classList.toggle('text-[#7564C7]', weekend);
      cell.children[0].classList.toggle('text-[#1E1E1C]', !weekend);
      cell.setAttribute('aria-current', isToday ? 'date' : 'false');
    });

    calendarBody.replaceChildren();
    for (let hour = 9; hour <= 18; hour += 1) {
      const row = templateRow.cloneNode(true);
      row.classList.add('availability-hour-row');
      row.children[0].textContent = String(hour).padStart(2, '0') + ':00';
      row.children[0].classList.add('availability-time-label');
      Array.from(row.children).slice(1).forEach((cell, dayIndex) => {
        cell.replaceChildren();
        const key = T.addDays(weekStart, dayIndex);
        const isPast = key < today;
        cell.className = 'availability-day-cell relative border-r border-[#E9E4F5]';
        cell.dataset.today = String(key === today);
        if (!isPast) {
          const emptyAction = document.createElement('button');
          emptyAction.type = 'button';
          emptyAction.className = 'availability-empty-action';
          emptyAction.dataset.navSkip = '';
          emptyAction.setAttribute('aria-label', dayLabel(key, true) + ' saat ' + String(hour).padStart(2, '0') + ':00 için müsaitlik ekle');
          emptyAction.addEventListener('click', () => openAddAvailability(key, String(hour).padStart(2, '0') + ':00'));
          cell.appendChild(emptyAction);
        }
        slots.filter(slot => slot.date === key && Math.floor(minutes(slot.start) / 60) === hour)
          .sort((a, b) => a.start.localeCompare(b.start))
          .forEach(slot => {
            const startOffset = minutes(slot.start) - hour * 60;
            const length = Math.max(minutes(slot.end) - minutes(slot.start), 20);
            const block = document.createElement('button');
            block.type = 'button';
            block.dataset.navSkip = '';
            block.className = slot.reserved ? 'availability-slot availability-slot--reserved' : 'availability-slot availability-slot--available';
            block.id = 'availability-slot-' + slot.id;
            block.setAttribute('aria-expanded', 'false');
            block.style.top = startOffset * (64 / 60) + 'px';
            block.style.height = length * (64 / 60) + 'px';
            const stateText = slot.reserved ? 'Rezerve · ' + (slot.candidate || 'Aday') : 'Müsait';
            block.title = slot.start + ' - ' + slot.end + ' · ' + stateText;
            block.setAttribute('aria-label', slot.start + ' - ' + slot.end + ', ' + stateText);
            const time = document.createElement('span');
            time.className = 'availability-slot-time';
            time.textContent = slot.start + ' - ' + slot.end;
            const state = document.createElement('span');
            state.className = 'availability-slot-state';
            state.textContent = stateText;
            block.append(time, state);
            block.addEventListener('click', event => { event.stopPropagation(); openSlotDetails(slot, block); });
            cell.appendChild(block);
          });
      });
      calendarBody.appendChild(row);
    }
  }

  function toCalendarSlot(item) {
    const start = T.parts(item.starts_at);
    return { id: item.id, date: start.date, start: start.time, end: T.parts(item.ends_at).time, reserved: false };
  }

  async function loadReserved() {
    // Planlı seanslar (rezerve bloklar). Hata olursa takvim yalnız müsait slotlarla çizilir.
    try {
      const clients = await Api.listAll('/guru/clients', { limit: 100, query: { status: 'active' } });
      const lists = await window.GuruPanel.mapLimit(clients, 4, client =>
        Api.get(`/guru/enrollments/${client.enrollment.id}/sessions`)
          .then(data => (data.items || []).map(session => ({ session, client })))
          .catch(() => []));
      reserved = lists.flat()
        .filter(({ session }) => session.status === 'scheduled' && session.scheduled_start_at)
        .map(({ session, client }) => {
          const start = T.parts(session.scheduled_start_at);
          return {
            id: session.id, date: start.date, start: start.time,
            end: T.parts(session.scheduled_end_at || T.addMinutes(session.scheduled_start_at, 50)).time,
            reserved: true, candidate: Api.format.fullName(client.candidate), enrollmentId: client.enrollment.id,
            sequenceNo: session.sequence_no
          };
        });
    } catch (error) {
      reserved = [];
      Api.ui.showError(calendar, error, { position: 'before', fallback: 'Rezerve seanslar yüklenemedi.' });
    }
  }

  async function loadWeek() {
    const seq = ++requestSeq;
    calendar.setAttribute('aria-busy', 'true');
    Api.ui.clearError(calendar);
    try {
      const data = await Api.get('/guru/availability', { query: { from: T.toUtcIso(weekStart, '00:00'), to: T.toUtcIso(T.addDays(weekStart, 7), '00:00') } });
      if (seq !== requestSeq) return;
      const weekEnd = T.addDays(weekStart, 7);
      slots = (data.items || []).filter(item => item.is_available).map(toCalendarSlot)
        .concat(reserved.filter(item => item.date >= weekStart && item.date < weekEnd));
      renderCalendar();
    } catch (error) {
      if (seq !== requestSeq) return;
      slots = [];
      renderCalendar();
      Api.ui.showError(calendar, error, { position: 'before' });
    } finally {
      if (seq === requestSeq) calendar.removeAttribute('aria-busy');
    }
  }

  async function checkAnyAvailability() {
    // Önümüzdeki 90 günde hiç müsait saat ve planlı seans yoksa boş durum gösterilir.
    try {
      const data = await Api.get('/guru/availability', { query: { from: new Date().toISOString(), to: T.toUtcIso(T.addDays(today, 90), '00:00') } });
      renderEmptyState(!(data.items || []).length && !reserved.some(item => item.date >= today));
    } catch (error) {
      renderEmptyState(false);
    }
  }

  function changeWeek(amount) {
    weekStart = T.addDays(weekStart, amount * 7);
    const url = new URL(location.href);
    url.searchParams.set('hafta', weekStart);
    history.replaceState(null, '', url.pathname + url.search);
    loadWeek();
  }

  todayButton?.addEventListener('click', () => { weekStart = T.weekStart(today); changeWeek(0); });
  previousButton?.addEventListener('click', () => changeWeek(-1));
  nextButton?.addEventListener('click', () => changeWeek(1));

  showDeliveryNotice();
  renderCalendar();
  (async () => {
    await window.sessionReady;
    await loadReserved();
    await loadWeek();
    checkAnyAvailability();
  })();
})();
