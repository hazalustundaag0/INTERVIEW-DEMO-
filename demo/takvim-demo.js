// takvim-demo.js — Seans zamanı seçimi ve rezervasyon (83). Sahte Ocak 2027 takvimi, demoMusaitlik,
// demoRandevu ve guruProfile okumaları kaldırıldı (GAP-D05). Veri yalnız API:
//   GET  /candidate/enrollments/{id}/slots?from&to → { items: Availability[] } (UTC; gösterim İstanbul, SlotTime)
//   POST /candidate/enrollment-sessions/{sessionID}/book { slot_id } → ilk planlanmamış seans
//   409 booking_prerequisites + missing → randevu-on.html (BR-07); 409 slot_taken/slot_not_suitable → yenile
// Başarılı yanıttan sonra: 1. seans → randevu-ok.html, sonraki seans → seans2-ok.html (?session=<uuid>).
(function () {
  'use strict';
  const T = window.SlotTime;
  const MONTHS = T ? T.months : [];
  // Ay başlığı: takvim sütunundaki (önceki/sonraki ay okları olan) başlık — sahte "Ocak 2027" metni kaldırıldı.
  const monthTitle = document.querySelector('.md\\:col-span-7 h2') ||
    Array.from(document.querySelectorAll('h2')).find(element => element.parentElement && element.parentElement.querySelectorAll('button').length === 2);
  if (!monthTitle || !T) return;

  const card = monthTitle.closest('div.bg-\\[\\#FFFFFF\\]') || document.querySelector('main section');
  const monthHeader = monthTitle.parentElement;
  const arrows = monthHeader.querySelectorAll('button');
  const calendar = monthHeader.parentElement;
  const dateGrids = Array.from(calendar.querySelectorAll('.grid-cols-7')).filter(element =>
    element.querySelector('button') || element.className.indexOf('text-[13px]') > -1);
  const dateGrid = dateGrids[dateGrids.length - 1];
  const hoursColumn = document.querySelector('.md\\:col-span-5');
  const hoursTitle = hoursColumn && hoursColumn.querySelector('h2');
  const slotsContainer = hoursColumn && hoursColumn.querySelector('.flex.flex-col.gap-3');
  const confirmButton = Array.from(document.querySelectorAll('button')).find(button =>
    button.textContent.replace(/\s+/g, ' ').trim().startsWith('Seans Zamanını Onayla'));
  const chips = card.querySelector('.flex.items-center.gap-2.mb-6');
  const sessionChip = chips && chips.children[0];
  const durationChip = chips && chips.children[1];
  const advisorLink = document.querySelector('.appointment-advisor-profile');
  const introText = card.querySelector('h1')?.nextElementSibling;
  if (arrows.length < 2 || !dateGrid || !hoursTitle || !slotsContainer) return;

  // Sahte içerik veri gelene kadar gizlenir.
  if (advisorLink) advisorLink.style.visibility = 'hidden';
  if (sessionChip) sessionChip.textContent = 'Seans';
  dateGrid.replaceChildren();
  slotsContainer.replaceChildren();
  monthTitle.textContent = '';
  hoursTitle.textContent = 'Uygun saatler yükleniyor…';

  calendar.classList.add('appointment-calendar');
  dateGrid.classList.add('appointment-date-grid');
  const appointmentLayout = hoursColumn.parentElement;
  appointmentLayout.classList.add('appointment-layout');
  slotsContainer.classList.add('appointment-slot-list');
  slotsContainer.setAttribute('role', 'radiogroup');
  if (confirmButton) {
    confirmButton.setAttribute('data-action', 'booking-confirm');
    confirmButton.textContent = 'Randevuyu onayla';
    confirmButton.setAttribute('aria-label', 'Randevuyu onayla');
    confirmButton.className = 'appointment-confirm-button';
    confirmButton.disabled = true;
  }
  monthTitle.setAttribute('aria-live', 'polite');
  slotsContainer.setAttribute('aria-live', 'polite');

  const summaryCard = document.createElement('section');
  summaryCard.className = 'appointment-selection-summary';
  summaryCard.setAttribute('aria-labelledby', 'appointment-summary-heading');
  const summaryHeading = document.createElement('h3');
  summaryHeading.id = 'appointment-summary-heading';
  summaryHeading.textContent = 'Seçimin';
  const summaryText = document.createElement('p');
  summaryText.className = 'appointment-summary-text';
  summaryText.setAttribute('aria-live', 'polite');
  summaryText.textContent = 'Önce bir tarih ve saat seç';
  summaryCard.append(summaryHeading, summaryText);
  appointmentLayout.appendChild(summaryCard);
  if (confirmButton) summaryCard.appendChild(confirmButton);
  const infoText = Array.from(document.querySelectorAll('p')).find(p => p.textContent.trim().startsWith('Profil bilgilerin danışmanına ön bilgi olarak iletilir.'));
  if (infoText) {
    // Görüşme bağlantısı alanı backend'de yok (GAP-B16): sabit, dürüst metin.
    infoText.textContent = 'Profil bilgilerin danışmanına ön bilgi olarak iletilir. Görüşme bağlantısı seanstan önce iletilecek. Saatler İstanbul saatiyle gösterilir.';
    infoText.parentElement.classList.add('appointment-info-card');
    appointmentLayout.appendChild(infoText.parentElement);
  }
  const slotCount = document.createElement('p');
  slotCount.className = 'appointment-slot-count';
  slotCount.setAttribute('role', 'status');
  slotCount.setAttribute('aria-live', 'polite');
  hoursTitle.insertAdjacentElement('afterend', slotCount);

  const today = T.today();
  let ctx = null;
  let target = null;          // rezerve edilecek EnrollmentSession
  let guruName = '';
  let month = today.slice(0, 7); // 'YYYY-MM'
  let slots = [];             // görüntülenen ayın uygun slotları
  let selectedDate = null;    // 'YYYY-MM-DD'
  let selectedSlot = null;
  let focusedDateKey = today;
  let loading = false;

  function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return MONTHS[m - 1] + ' ' + y;
  }

  function addMonths(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    return date.toISOString().slice(0, 7);
  }

  function daysIn(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function weekdayOf(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  }

  function dayLabel(dateKey) {
    const [, m, d] = dateKey.split('-').map(Number);
    return d + ' ' + MONTHS[m - 1] + ' ' + T.weekdays[weekdayOf(dateKey)];
  }

  function slotsFor(dateKey) {
    return slots.filter(slot => T.parts(slot.starts_at).date === dateKey);
  }

  async function loadMonth() {
    loading = true;
    renderCalendar();
    hoursTitle.textContent = 'Uygun saatler yükleniyor…';
    const first = month + '-01';
    const from = first < today ? today : first;
    const to = T.addDays(month + '-' + String(daysIn(month)).padStart(2, '0'), 1);
    try {
      const data = await window.Api.get('/candidate/enrollments/' + encodeURIComponent(ctx.enrollment.id) + '/slots', {
        query: { from: T.toUtcIso(from, '00:00'), to: T.toUtcIso(to, '00:00') }
      });
      const now = Date.now();
      slots = ((data && data.items) || []).filter(slot => slot.is_available && Date.parse(slot.starts_at) > now)
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
      window.Api.ui.clearError(card);
    } catch (error) {
      slots = [];
      window.Api.ui.showError(card, error);
    } finally {
      loading = false;
    }
    if (!selectedDate || !selectedDate.startsWith(month) || !slotsFor(selectedDate).length) {
      const firstAvailable = slots[0] && T.parts(slots[0].starts_at).date;
      selectedDate = firstAvailable || null;
      selectedSlot = null;
    }
    focusedDateKey = selectedDate || first;
    renderCalendar();
    renderSlots();
  }

  function renderSlots() {
    const daySlots = selectedDate ? slotsFor(selectedDate) : [];
    hoursTitle.textContent = loading ? 'Uygun saatler yükleniyor…'
      : selectedDate ? dayLabel(selectedDate) + ' için uygun saatler' : monthLabel(month);
    slotsContainer.replaceChildren();
    slotsContainer.setAttribute('aria-label', selectedDate ? dayLabel(selectedDate) + ' için uygun saatler' : 'Saat seçimi');
    if (selectedSlot && !daySlots.some(slot => slot.id === selectedSlot.id)) selectedSlot = null;
    slotCount.textContent = selectedDate ? daySlots.length + ' uygun saat' : ' ';
    summaryCard.classList.toggle('has-selection', Boolean(selectedSlot));
    summaryText.textContent = selectedSlot
      ? dayLabel(T.parts(selectedSlot.starts_at).date) + ' · ' + T.timeRange(selectedSlot.starts_at, selectedSlot.ends_at) + (guruName ? ' · ' + guruName : '')
      : 'Önce bir tarih ve saat seç';

    if (!daySlots.length) {
      const empty = document.createElement('p');
      empty.className = 'appointment-slot-empty';
      empty.textContent = loading ? 'Yükleniyor…' : !slots.length ? 'Bu ay için müsait saat yok' : 'Takvimden bir gün seç';
      slotsContainer.appendChild(empty);
    } else {
      const hour = slot => Number(T.parts(slot.starts_at).time.slice(0, 2));
      [
        { label: 'Sabah', list: daySlots.filter(slot => hour(slot) < 12) },
        { label: 'Öğleden sonra', list: daySlots.filter(slot => hour(slot) >= 12 && hour(slot) < 17) },
        { label: 'Akşam', list: daySlots.filter(slot => hour(slot) >= 17) }
      ].filter(group => group.list.length).forEach(group => {
        const section = document.createElement('section');
        section.className = 'appointment-slot-group';
        const heading = document.createElement('h3');
        heading.textContent = group.label;
        section.appendChild(heading);
        group.list.forEach(slot => {
          const active = selectedSlot && selectedSlot.id === slot.id;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = active ? 'appointment-slot appointment-slot--selected' : 'appointment-slot';
          button.setAttribute('role', 'radio');
          button.setAttribute('aria-checked', String(Boolean(active)));
          button.setAttribute('data-nav-skip', '');
          button.dataset.slotId = slot.id;
          const time = document.createElement('span');
          time.className = 'appointment-slot-time';
          time.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">schedule</span>';
          time.append(T.timeRange(slot.starts_at, slot.ends_at));
          const check = document.createElement('span');
          check.className = 'material-symbols-outlined appointment-slot-check';
          check.setAttribute('aria-hidden', 'true');
          check.textContent = active ? 'check_circle' : 'radio_button_unchecked';
          button.append(time, check);
          button.addEventListener('click', () => {
            selectedSlot = slot;
            renderSlots();
            slotsContainer.querySelector('[data-slot-id="' + slot.id + '"]')?.focus();
          });
          button.addEventListener('keydown', event => {
            const choices = Array.from(slotsContainer.querySelectorAll('[role="radio"]'));
            const index = choices.indexOf(button);
            let next = index;
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % choices.length;
            else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + choices.length) % choices.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = choices.length - 1;
            else return;
            event.preventDefault();
            choices[next].click();
          });
          section.appendChild(button);
        });
        slotsContainer.appendChild(section);
      });
    }
    if (confirmButton) {
      confirmButton.disabled = !selectedSlot || !target;
      confirmButton.setAttribute('aria-disabled', String(confirmButton.disabled));
    }
  }

  function renderCalendar(focusKey) {
    monthTitle.textContent = monthLabel(month);
    arrows[0].setAttribute('aria-label', 'Önceki ay');
    arrows[1].setAttribute('aria-label', 'Sonraki ay');
    arrows[0].setAttribute('data-nav-skip', '');
    arrows[1].setAttribute('data-nav-skip', '');
    arrows[0].disabled = month <= today.slice(0, 7);
    dateGrid.setAttribute('role', 'grid');
    dateGrid.setAttribute('aria-label', monthLabel(month));
    dateGrid.replaceChildren();
    let emptyMonth = dateGrid.parentElement.querySelector('[data-calendar-empty-month]');
    if (!emptyMonth) {
      emptyMonth = document.createElement('p');
      emptyMonth.dataset.calendarEmptyMonth = '';
      emptyMonth.className = 'mt-3 rounded-lg bg-[#F5F2FF] px-3 py-2 text-center text-[13px] font-medium text-[#433582]';
      emptyMonth.setAttribute('role', 'status');
      dateGrid.insertAdjacentElement('afterend', emptyMonth);
    }
    emptyMonth.hidden = loading || slots.length > 0;
    emptyMonth.textContent = 'Bu ay için müsait saat yok';
    const firstDay = month + '-01';
    const offset = (weekdayOf(firstDay) + 6) % 7;
    for (let blank = 0; blank < offset; blank += 1) dateGrid.appendChild(document.createElement('span'));
    for (let day = 1; day <= daysIn(month); day += 1) {
      const key = month + '-' + String(day).padStart(2, '0');
      const available = !loading && slotsFor(key).length > 0;
      const active = available && key === selectedDate;
      const isToday = key === today;
      const item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('data-nav-skip', '');
      item.setAttribute('role', 'gridcell');
      item.setAttribute('aria-label', dayLabel(key) + (available ? ', müsait' : ', müsait saat yok'));
      item.setAttribute('aria-disabled', String(!available));
      item.setAttribute('aria-pressed', String(active));
      item.setAttribute('tabindex', key === focusedDateKey ? '0' : '-1');
      if (isToday) item.setAttribute('aria-current', 'date');
      item.className = 'calendar-date ' + (active ? 'calendar-date--selected' : available ? 'calendar-date--available' : 'calendar-date--unavailable') + (isToday ? ' calendar-date--today' : '');
      const number = document.createElement('span');
      number.textContent = String(day);
      item.appendChild(number);
      if (available) {
        const dot = document.createElement('span');
        dot.className = 'calendar-date-dot';
        dot.setAttribute('aria-hidden', 'true');
        item.appendChild(dot);
      }
      item.addEventListener('click', () => {
        if (!available) return;
        focusedDateKey = key;
        selectedDate = key;
        selectedSlot = null;
        renderCalendar(key);
        renderSlots();
      });
      item.addEventListener('keydown', event => {
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key] || 0;
        if (!delta) return;
        event.preventDefault();
        const nextKey = T.addDays(key, delta);
        focusedDateKey = nextKey;
        if (!nextKey.startsWith(month)) {
          if (nextKey < today) return;
          month = nextKey.slice(0, 7);
          loadMonth();
          return;
        }
        renderCalendar(nextKey);
      });
      dateGrid.appendChild(item);
    }
    if (focusKey) dateGrid.querySelector('[aria-label^="' + dayLabel(focusKey) + '"]')?.focus();
  }

  arrows[0].addEventListener('click', () => {
    if (month <= today.slice(0, 7)) return;
    month = addMonths(month, -1);
    selectedDate = null;
    loadMonth();
  });
  arrows[1].addEventListener('click', () => {
    month = addMonths(month, 1);
    selectedDate = null;
    loadMonth();
  });

  confirmButton?.addEventListener('click', async () => {
    if (!selectedSlot || !target) return;
    window.Api.ui.clearError(card);
    try {
      const booked = await window.Api.ui.withLoading(confirmButton, () =>
        window.Api.post('/candidate/enrollment-sessions/' + encodeURIComponent(target.id) + '/book', { slot_id: selectedSlot.id }),
      { text: 'Onaylanıyor…' });
      const page = booked.sequence_no === 1 ? 'randevu-ok.html' : 'seans2-ok.html';
      location.href = page + '?session=' + encodeURIComponent(booked.id);
    } catch (error) {
      if (error.is && error.is('booking_prerequisites')) {
        location.href = 'randevu-on.html';
        return;
      }
      window.Api.ui.showError(card, error);
      if (error.is && (error.is('slot_taken') || error.is('slot_not_suitable'))) {
        selectedSlot = null;
        loadMonth();
      }
    }
  });

  async function renderHeader() {
    const tpl = await window.Journey.template(ctx, target ? target.sequence_no : 1);
    const total = ctx.sessions.length || ctx.enrollment.session_count;
    if (sessionChip) sessionChip.textContent = 'Seans ' + (target ? target.sequence_no : '–') + ' / ' + total + (tpl ? ' · ' + tpl.title : '');
    if (durationChip) durationChip.textContent = ctx.enrollment.session_duration_minutes + ' dk';
    if (introText && tpl && tpl.purpose) introText.textContent = tpl.purpose;
    const guru = await window.Journey.guru(ctx);
    if (guru && advisorLink) {
      guruName = guru.ad;
      advisorLink.href = 'danisman.html?id=' + encodeURIComponent(guru.id);
      advisorLink.setAttribute('aria-label', guru.ad + ' danışman profilini gör');
      advisorLink.setAttribute('data-nav-skip', '');
      const avatar = advisorLink.querySelector('.w-11.h-11');
      if (avatar) avatar.textContent = window.Journey.initials(guru.ad);
      const name = advisorLink.querySelector('.font-headline-sm');
      if (name) name.textContent = guru.ad;
      const title = advisorLink.querySelector('.text-\\[14px\\]');
      if (title) title.textContent = guru.unvan;
      advisorLink.style.visibility = '';
    } else if (advisorLink) {
      advisorLink.hidden = true;
    }
  }

  async function init() {
    try {
      ctx = await window.Journey.load();
      if (!ctx.enrollment) {
        hoursTitle.textContent = '';
        window.Journey.showNoEnrollment(card);
        return;
      }
      target = window.Journey.bookableSession(ctx);
      const pre = await window.Journey.prerequisites(ctx);
      window.Journey.refreshSidebar(ctx).catch(() => {});
      if (!pre.ready) {
        // BR-07: ön koşullar tamam değilse takvim açılmaz.
        location.replace('randevu-on.html');
        return;
      }
      await renderHeader();
      if (!target) {
        hoursTitle.textContent = 'Tüm seansların planlandı';
        window.Api.ui.showError(card, 'Planlanacak seansın kalmadı. Seanslarını Seanslarım sayfasında görebilirsin.', { tone: 'info' });
        renderCalendar();
        return;
      }
      await loadMonth();
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
