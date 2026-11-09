(function () {
  const STORAGE_KEY = 'demoMusaitlik';
  const availability = window.DemoAvailability;
  const weekdayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const section = document.querySelector('main section');
  if (!section) return;

  function loadSlots() {
    if (!availability) throw new Error('Ortak müsaitlik modülü yüklenemedi.');
    return availability.loadSlots(STORAGE_KEY);
  }

  function parseDate(value) {
    const parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function dateLabel(date, includeYear) {
    return date.getDate() + ' ' + monthNames[date.getMonth()] +
      (includeYear ? ' ' + date.getFullYear() : '');
  }

  function mondayOf(date) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
  }

  const periodLabel = Array.from(section.querySelectorAll('div')).find(function (element) {
    return /^\d{1,2}\s*-\s*\d{1,2}\s+\S+\s+\d{4}$/.test(element.textContent.trim());
  });
  if (!periodLabel) return;
  const calendar = periodLabel.parentElement.parentElement;
  calendar.classList.add('availability-calendar');
  const calendarGrid = calendar.querySelector('[class~="min-w-[700px]"]');
  const calendarHeader = calendarGrid && calendarGrid.children[0];
  const calendarBody = calendarGrid && calendarGrid.children[1];
  const viewport = calendar.querySelector('.overflow-x-auto');
  viewport?.classList.add('availability-viewport');
  calendarHeader?.classList.add('availability-calendar-header');
  if (calendarHeader) calendarHeader.setAttribute('aria-label', 'Haftalık takvim günleri');
  const toolbarButtons = Array.from(calendar.querySelectorAll('button'));
  const todayButton = toolbarButtons.find(button => button.textContent.trim() === 'Bugün');
  const previousButton = toolbarButtons.find(button => button.textContent.trim() === 'chevron_left');
  const nextButton = toolbarButtons.find(button => button.textContent.trim() === 'chevron_right');
  [previousButton, nextButton].filter(Boolean).forEach(function (button) {
    button.classList.add('availability-week-nav');
    button.setAttribute('aria-label', button === previousButton ? 'Önceki hafta' : 'Sonraki hafta');
  });
  if (todayButton) {
    todayButton.classList.add('availability-week-today');
  }
  const addButton = Array.from(section.querySelectorAll('button')).find(button =>
    button.textContent.replace(/\s+/g, ' ').trim() === 'add Müsaitlik Ekle' ||
    button.textContent.replace(/\s+/g, ' ').trim() === 'Müsaitlik Ekle'
  );
  const slots = loadSlots();
  let activeSlotTrigger = null;
  let outsideClickHandler = null;
  let escapeKeyHandler = null;
  const demoToday = dateKey(new Date(2027, 0, 11));
  let weekStart = mondayOf(new Date(2027, 0, 11));
  const jumpDate = localStorage.getItem('demoMusaitlikHafta');
  if (jumpDate) {
    weekStart = mondayOf(parseDate(jumpDate));
    localStorage.removeItem('demoMusaitlikHafta');
  }

  function showDeliveryNotice() {
    const params = new URLSearchParams(location.search);
    const count = Number(params.get('eklendi'));
    const updated = params.get('guncellendi') === '1';
    if (!updated && (!Number.isFinite(count) || count < 1)) return;
    const notice = document.createElement('div');
    notice.className = 'rounded-[var(--radius-card)] border px-4 py-3 text-[14px] font-semibold';
    notice.style.borderColor = 'var(--color-rule)';
    notice.style.backgroundColor = 'var(--color-paper-2)';
    notice.style.color = 'var(--color-ink-2)';
    notice.setAttribute('role', 'status');
    notice.textContent = updated
      ? 'Müsaitlik güncellendi.'
      : count + ' saat eklendi. Adaylar artık bu saatlerden randevu alabilir.';
    section.insertBefore(notice, section.firstChild);
    window.setTimeout(function () { notice.remove(); }, 5000);
    params.delete('eklendi');
    params.delete('guncellendi');
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }

  function openAddAvailability(date, time) {
    const query = new URLSearchParams({ date, start: time });
    location.href = 'guru-musaitlik-ekle.html?' + query.toString();
  }

  addButton?.addEventListener('click', function () {
    openAddAvailability(dateKey(weekStart), '09:00');
  });

  function openSlotDetails(slot, anchor) {
    closePopover(false);
    const popover = document.createElement('div');
    popover.id = 'availability-popover';
    popover.className = 'availability-slot-popover fixed z-[100000] w-[min(300px,calc(100%_-_32px))] border p-4';
    popover.style.borderColor = 'var(--color-rule)';
    popover.style.borderRadius = 'var(--radius-card)';
    popover.style.backgroundColor = 'var(--color-paper)';
    popover.style.boxShadow = 'none';
    popover.style.color = 'var(--color-ink)';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.setAttribute('aria-label', slot.durum === 'rezerve' ? 'Rezerve randevu bilgileri' : 'Müsaitlik işlemleri');
    anchor.setAttribute('aria-haspopup', 'dialog');
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', popover.id);
    activeSlotTrigger = anchor;
    const date = parseDate(slot.tarih);
    const time = slot.bas + ' - ' + slot.bit;
    const heading = document.createElement('p');
    heading.className = 'text-[14px] font-semibold';
    heading.textContent = dateLabel(date, true) + ' · ' + time;
    popover.appendChild(heading);

    if (slot.durum === 'rezerve') {
      const reserved = document.createElement('p');
      reserved.className = 'mt-2 text-[13px] font-semibold';
      reserved.style.color = 'var(--color-accent)';
      reserved.textContent = slot.aday || 'Aday';
      const detailsLink = document.createElement('a');
      detailsLink.href = 'guru-danisan-detay.html';
      detailsLink.className = 'availability-slot-primary mt-3 inline-flex items-center justify-center px-3 py-2 text-[13px] font-semibold';
      detailsLink.textContent = 'Detaya git';
      popover.append(reserved, detailsLink);
    } else {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'availability-slot-primary mt-3 px-3 py-2 text-[13px] font-semibold';
      removeButton.textContent = 'Sil';
      removeButton.addEventListener('click', function () {
        const updated = loadSlots().filter(item => item.id !== slot.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        slots.splice(0, slots.length, ...updated);
        closePopover(false);
        renderCalendar();
      });
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'mt-3 ml-2 px-3 py-2 text-[13px] font-semibold';
      editButton.textContent = 'Düzenle';
      editButton.addEventListener('click', function () {
        const query = new URLSearchParams({
          edit: slot.id,
          date: slot.tarih,
          start: slot.bas
        });
        location.href = 'guru-musaitlik-ekle.html?' + query.toString();
      });
      popover.append(removeButton, editButton);
    }

    document.body.appendChild(popover);
    requestAnimationFrame(function () {
      if (!popover.isConnected) return;
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const bounds = popover.getBoundingClientRect();
      const left = Math.max(12, Math.min(
        rect.left + rect.width / 2 - bounds.width / 2,
        viewportWidth - bounds.width - 12
      ));
      const below = rect.bottom + bounds.height + 8 <= viewportHeight;
      const top = below
        ? rect.bottom + 8
        : Math.max(12, rect.top - bounds.height - 8);
      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    });
    outsideClickHandler = closeOnOutsideClick;
    escapeKeyHandler = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopover();
      }
    };
    window.setTimeout(function () {
      document.addEventListener('click', outsideClickHandler);
      document.addEventListener('keydown', escapeKeyHandler);
    });
    const firstAction = popover.querySelector('button, a');
    (firstAction || popover).focus({ preventScroll: true });
  }

  function closeOnOutsideClick(event) {
    const popover = document.getElementById('availability-popover');
    if (!popover) return;
    if (!popover.contains(event.target) && !activeSlotTrigger?.contains(event.target)) closePopover(false);
  }

  function closePopover(restoreFocus) {
    const popover = document.getElementById('availability-popover');
    if (popover) popover.remove();
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

  function renderEmptyState() {
    if (calendarGrid) calendarGrid.classList.add('hidden');
    if (viewport) viewport.classList.add('hidden');
    let empty = calendar.querySelector('[data-availability-empty-state]');
    if (!empty) {
      empty = document.createElement('div');
      empty.dataset.availabilityEmptyState = '';
      empty.className = 'flex flex-col items-center gap-3 px-5 py-12 text-center';
      empty.innerHTML = '<span class="material-symbols-outlined text-[34px] text-[var(--color-accent)]" aria-hidden="true">event_busy</span><p class="max-w-[360px] text-[14px] leading-6 text-[var(--color-muted)]">Henüz müsaitlik eklemedin. Saat eklemeden adaylar randevu alamaz.</p><a class="availability-slot-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-semibold" href="guru-musaitlik-ekle.html">+ Müsaitlik Ekle</a>';
      calendar.appendChild(empty);
    }
  }

  function renderCalendar() {
    closePopover(false);
    if (!slots.length) {
      renderEmptyState();
      return;
    }
    calendarGrid.classList.remove('hidden');
    if (viewport) viewport.classList.remove('hidden');
    calendar.querySelector('[data-availability-empty-state]')?.remove();

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const monthStart = monthNames[weekStart.getMonth()];
    const monthEnd = monthNames[weekEnd.getMonth()];
    periodLabel.textContent = weekStart.getMonth() === weekEnd.getMonth()
      ? weekStart.getDate() + ' - ' + weekEnd.getDate() + ' ' + monthStart + ' ' + weekEnd.getFullYear()
      : dateLabel(weekStart, false) + ' - ' + dateLabel(weekEnd, true);

    Array.from(calendarHeader.children).slice(1).forEach(function (cell, index) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const weekend = index >= 5;
      const isToday = dateKey(date) === demoToday;
      cell.dataset.today = String(isToday);
      cell.children[0].textContent = weekdayNames[index];
      cell.children[1].textContent = date.getDate() + ' ' + monthNames[date.getMonth()].slice(0, 3);
      cell.style.backgroundColor = weekend ? 'var(--color-accent-soft)' : '';
      cell.children[0].style.color = weekend ? 'var(--color-accent)' : '';
      cell.children[0].classList.toggle('text-[#1E1E1C]', !weekend);
      cell.setAttribute('aria-current', isToday ? 'date' : 'false');
    });

    const templateRow = calendarBody.children[0].cloneNode(true);
    calendarBody.replaceChildren();
    for (let hour = 9; hour <= 18; hour++) {
      const row = templateRow.cloneNode(true);
      row.classList.add('availability-hour-row');
      row.children[0].textContent = String(hour).padStart(2, '0') + ':00';
      row.children[0].classList.add('availability-time-label');
      Array.from(row.children).slice(1).forEach(function (cell, dayIndex) {
        cell.replaceChildren();
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        const key = dateKey(date);
        const isToday = key === demoToday;
        cell.className = 'availability-day-cell relative border-r border-[#E9E4F5]';
        cell.dataset.today = String(isToday);
        const emptyAction = document.createElement('button');
        emptyAction.type = 'button';
        emptyAction.className = 'availability-empty-action';
        emptyAction.setAttribute('aria-label', dateLabel(date, true) + ' saat ' + String(hour).padStart(2, '0') + ':00 için müsaitlik ekle');
        emptyAction.addEventListener('click', function () {
          openAddAvailability(key, String(hour).padStart(2, '0') + ':00');
        });
        cell.appendChild(emptyAction);
        slots.filter(function (slot) {
          return slot.tarih === key &&
            Number(slot.bas.slice(0, 2)) * 60 + Number(slot.bas.slice(3, 5)) < (hour + 1) * 60 &&
            Number(slot.bit.slice(0, 2)) * 60 + Number(slot.bit.slice(3, 5)) > hour * 60;
        }).sort((a, b) => a.bas.localeCompare(b.bas)).forEach(function (slot) {
          const reserved = slot.durum === 'rezerve';
          const [startHour, startMinute] = slot.bas.split(':').map(Number);
          const [endHour, endMinute] = slot.bit.split(':').map(Number);
          const startOffset = Math.max(0, startHour * 60 + startMinute - hour * 60);
          const block = document.createElement('button');
          block.type = 'button';
          block.className = reserved
            ? 'availability-slot availability-slot--reserved'
            : 'availability-slot availability-slot--available';
          block.id = 'availability-slot-' + slot.id;
          block.setAttribute('aria-expanded', 'false');
          block.style.top = startOffset * (64 / 60) + 'px';
          block.style.height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * (64 / 60) + 'px';
          const stateText = reserved ? 'Rezerve · ' + (slot.aday || 'Aday') : 'Müsait';
          block.title = slot.bas + ' - ' + slot.bit + ' · ' + stateText;
          block.setAttribute('aria-label', slot.bas + ' - ' + slot.bit + ', ' +
            (reserved ? 'Rezerve · ' + (slot.aday || '') : 'Müsait'));
          const time = document.createElement('span');
          time.className = 'availability-slot-time';
          time.textContent = slot.bas + ' - ' + slot.bit;
          const state = document.createElement('span');
          state.className = 'availability-slot-state';
          state.textContent = stateText;
          block.append(time, state);
          block.addEventListener('click', function (event) {
            event.stopPropagation();
            openSlotDetails(slot, block);
          });
          if (startHour === hour) cell.appendChild(block);
        });
      });
      calendarBody.appendChild(row);
    }
  }

  function changeWeek(amount) {
    weekStart.setDate(weekStart.getDate() + amount * 7);
    renderCalendar();
  }

  todayButton?.addEventListener('click', function () {
    weekStart = mondayOf(new Date(2027, 0, 11));
    renderCalendar();
  });
  previousButton?.addEventListener('click', function () { changeWeek(-1); });
  nextButton?.addEventListener('click', function () { changeWeek(1); });

  const params = new URLSearchParams(location.search);
  const addedCount = Number(params.get('eklendi'));
  if (Number.isFinite(addedCount) && addedCount > 0) showDeliveryNotice();
  renderCalendar();
})();
