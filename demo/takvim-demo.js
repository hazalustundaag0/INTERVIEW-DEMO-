// takvim-demo.js: Aday takvimini danışmanın müsaitlik kayıtlarına bağlar.
(function () {
  const AVAILABILITY_KEY = 'demoMusaitlik';
  const APPOINTMENT_KEY = 'demoRandevu';
  const DEMO_TODAY = '2027-01-11';
  const availability = window.DemoAvailability;
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const weekdayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function loadAvailability() {
    if (!availability) throw new Error('Ortak müsaitlik modülü yüklenemedi.');
    return availability.loadSlots(AVAILABILITY_KEY);
  }

  function parseDate(value) {
    const parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function dateLabel(date) {
    return date.getDate() + ' ' + monthNames[date.getMonth()] + ' ' + weekdayNames[date.getDay()];
  }

  function appointmentLabel(date, includeWeekday) {
    return date.getDate() + ' ' + monthNames[date.getMonth()] +
      (includeWeekday ? ' ' + weekdayNames[date.getDay()] : '');
  }

  function initConfirmation() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(APPOINTMENT_KEY));
    } catch (error) {
      console.error('demoRandevu verisi okunamadı.', error);
      return;
    }
    if (!saved) return;

    const advisor = typeof window.getAdvisor === 'function'
      ? window.getAdvisor(saved.danismanId || 'selin-arslan')
      : null;
    const advisorLink = document.getElementById('confirmation-advisor-profile');
    if (advisorLink && advisor) {
      advisorLink.textContent = advisor.ad;
      advisorLink.href = 'danisman.html?id=' + encodeURIComponent(advisor.id);
    }

    const dateValue = saved.tarih || saved.date;
    const start = saved.bas || (saved.time && saved.time.split(' - ')[0]);
    const end = saved.bit || (saved.time && saved.time.split(' - ')[1]);
    if (!dateValue || !start || !end) return;

    const dateRow = Array.from(document.querySelectorAll('div.flex.items-center.justify-between')).find(function (row) {
      return row.firstElementChild && row.firstElementChild.textContent.trim() === 'Tarih';
    });
    const timeRow = Array.from(document.querySelectorAll('div.flex.items-center.justify-between')).find(function (row) {
      return row.firstElementChild && row.firstElementChild.textContent.trim() === 'Saat';
    });
    if (dateRow && dateRow.lastElementChild) {
      dateRow.lastElementChild.textContent = dateLabel(parseDate(dateValue));
    }
    if (timeRow && timeRow.lastElementChild) {
      timeRow.lastElementChild.textContent = start + ' - ' + end + ' (İstanbul)';
    }
  }

  function initCalendar() {
    const monthTitle = Array.from(document.querySelectorAll('h2')).find(function (element) {
      return /^\S+\s+\d{4}$/.test(element.textContent.trim());
    });
    if (!monthTitle) return;

    const monthHeader = monthTitle.parentElement;
    const arrows = monthHeader.querySelectorAll('button');
    const calendar = monthHeader.parentElement;
    const dateGrids = Array.from(calendar.querySelectorAll('.grid-cols-7')).filter(function (element) {
      return element.querySelector('button') || element.className.indexOf('text-[13px]') > -1;
    });
    const dateGrid = dateGrids[dateGrids.length - 1];
    calendar.classList.add('appointment-calendar');
    dateGrid?.classList.add('appointment-date-grid');
    const hoursColumn = document.querySelector('.md\\:col-span-5');
    const hoursTitle = hoursColumn && hoursColumn.querySelector('h2');
    const slotsContainer = hoursColumn && hoursColumn.querySelector('.flex.flex-col.gap-3');
    const confirmButton = Array.from(document.querySelectorAll('button')).find(function (button) {
      return button.textContent.replace(/\s+/g, ' ').trim().startsWith('Seans Zamanını Onayla');
    });
    if (arrows.length < 2 || !dateGrid || !hoursTitle || !slotsContainer) return;
    const appointmentLayout = hoursColumn?.parentElement;
    appointmentLayout?.classList.add('appointment-layout');
    slotsContainer.classList.add('appointment-slot-list');
    slotsContainer.setAttribute('role', 'radiogroup');
    if (confirmButton) {
      confirmButton.setAttribute('data-confirm-booking', '');
      confirmButton.textContent = 'Randevuyu onayla';
      confirmButton.setAttribute('aria-label', 'Randevuyu onayla');
      confirmButton.className = 'appointment-confirm-button';
    }
    monthTitle.setAttribute('aria-live', 'polite');
    slotsContainer.setAttribute('aria-live', 'polite');

    let availableSlots = loadAvailability()
      .filter(slot => slot.durum === 'musait' && slot.tarih >= DEMO_TODAY &&
        parseDate(slot.tarih).getDay() !== 0)
      .sort((a, b) => (a.tarih + a.bas).localeCompare(b.tarih + b.bas));
    const availableDates = Array.from(new Set(availableSlots.map(slot => slot.tarih)));
    let month = new Date(2027, 0, 1);
    let selectedDate = availableDates.length ? parseDate(availableDates[0]) : null;
    let focusedDateKey;
    let selectedSlot = null;
    let focusedSlotId = null;
    let bookedAdvisor = 'Selin Arslan';
    let bookedAdvisorId = 'selin-arslan';

    try {
      const savedAppointment = JSON.parse(localStorage.getItem(APPOINTMENT_KEY));
      if (savedAppointment && savedAppointment.danışman) {
        bookedAdvisor = savedAppointment.danışman;
      }
      if (savedAppointment && typeof savedAppointment.danismanId === 'string') {
        bookedAdvisorId = savedAppointment.danismanId;
      }
      const savedProfile = JSON.parse(localStorage.getItem('guruProfile'));
      if (savedProfile && typeof savedProfile.name === 'string' && savedProfile.name.trim()) {
        bookedAdvisor = savedProfile.name.trim();
      }
      const savedSelection = JSON.parse(localStorage.getItem('demoSecim'));
      if (savedSelection && typeof savedSelection.guru === 'string' && savedSelection.guru.trim()) {
        const selectedAdvisor = window.getAdvisor?.(savedSelection.guru.trim());
        if (selectedAdvisor) {
          bookedAdvisor = selectedAdvisor.ad;
          bookedAdvisorId = selectedAdvisor.id;
        }
      }
    } catch (error) {
      console.error('Randevu veya danışman bilgisi okunamadı.', error);
    }
    const requestedBooking = new URLSearchParams(location.search);
    const requestedAdvisorId = requestedBooking.get('danisman');
    const requestedAdvisor = requestedAdvisorId ? window.getAdvisor?.(requestedAdvisorId) : null;
    if (requestedAdvisor) {
      bookedAdvisor = requestedAdvisor.ad;
      bookedAdvisorId = requestedAdvisor.id;
    }
    const requestedDate = requestedBooking.get('tarih');
    const requestedTime = requestedBooking.get('saat');
    if (requestedDate) {
      const requestedSlot = availableSlots.find(slot =>
        slot.tarih === requestedDate && (!requestedTime || slot.bas === requestedTime)
      );
      if (requestedSlot) {
        selectedDate = parseDate(requestedSlot.tarih);
        selectedSlot = requestedSlot;
        focusedSlotId = requestedSlot.id;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        const candidateDate = parseDate(requestedDate);
        if (!Number.isNaN(candidateDate.getTime())) selectedDate = candidateDate;
      }
    }
    if (selectedDate) month = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    focusedDateKey = dateKey(selectedDate || month);

    const activeAdvisor = window.getAdvisor?.(bookedAdvisorId);
    const advisorProfileLink = document.querySelector('.appointment-advisor-profile');
    if (activeAdvisor && advisorProfileLink) {
      advisorProfileLink.href = 'danisman.html?id=' + encodeURIComponent(activeAdvisor.id);
      advisorProfileLink.setAttribute('aria-label', activeAdvisor.ad + ' danışman profilini gör');
      const avatar = advisorProfileLink.querySelector('.w-11.h-11');
      if (avatar) avatar.textContent = activeAdvisor.ad.split(/\s+/).slice(0, 2)
        .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
      const name = advisorProfileLink.querySelector('.font-headline-sm.text-body-md.text-tertiary');
      if (name) name.textContent = activeAdvisor.ad;
      const title = advisorProfileLink.querySelector('.text-\\[14px\\]');
      if (title) title.textContent = activeAdvisor.unvan;
    }

    function slotsFor(date) {
      if (!date) return [];
      if (date.getDay() === 0) return [];
      return availableSlots.filter(slot => slot.tarih === dateKey(date));
    }

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
    if (confirmButton) {
      confirmButton.type = 'button';
      summaryCard.appendChild(confirmButton);
    }
    const infoText = Array.from(document.querySelectorAll('p')).find(function (paragraph) {
      return paragraph.textContent.trim().startsWith('Profil bilgilerin danışmanına ön bilgi olarak iletilir.');
    });
    const infoCard = infoText?.parentElement;
    if (infoCard) {
      infoCard.classList.add('appointment-info-card');
      appointmentLayout.appendChild(infoCard);
    }
    const slotCount = document.createElement('p');
    slotCount.className = 'appointment-slot-count';
    slotCount.setAttribute('role', 'status');
    slotCount.setAttribute('aria-live', 'polite');
    hoursTitle.insertAdjacentElement('afterend', slotCount);

    function showBookingSuccess() {
      const dialog = document.createElement('dialog');
      dialog.className = 'appointment-success-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'appointment-success-title');
      const title = document.createElement('h2');
      title.id = 'appointment-success-title';
      title.textContent = 'Randevun onaylandı';
      const message = document.createElement('p');
      message.textContent = 'Seans bilgilerin Seanslarım sayfasında görünecek.';
      const actions = document.createElement('div');
      actions.className = 'appointment-success-actions';
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.textContent = 'Kapat';
      closeButton.addEventListener('click', () => dialog.close());
      const sessionsLink = document.createElement('a');
      sessionsLink.href = 'seanslar.html';
      sessionsLink.textContent = 'Seanslarıma git';
      actions.append(closeButton, sessionsLink);
      dialog.append(title, message, actions);
      document.body.appendChild(dialog);
      dialog.addEventListener('close', () => {
        dialog.remove();
        dateGrid.querySelector(`[aria-label^="${appointmentLabel(parseDate(appointment.tarih), true)}"]`)?.focus();
      }, { once: true });
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        dialog.close();
      });
      dialog.showModal();
      closeButton.focus();
    }

    function saveBooking() {
      if (!selectedSlot) return;
      let current;
      let oldAvailability;
      let oldAppointment;
      try {
        oldAvailability = localStorage.getItem(AVAILABILITY_KEY);
        oldAppointment = localStorage.getItem(APPOINTMENT_KEY);
        current = loadAvailability();
      } catch (error) {
        console.error('Randevu kaydı için tarayıcı depolama alanı okunamadı.', error);
        window.alert('Randevu kaydedilemedi. Tarayıcı depolama alanına erişilemiyor.');
        return;
      }
      const reserved = current.find(slot => slot.id === selectedSlot.id && slot.durum === 'musait');
      if (!reserved) {
        window.alert('Bu saat artık uygun değil. Lütfen başka bir saat seç.');
        location.reload();
        return;
      }
      reserved.durum = 'rezerve';
      reserved.aday = 'Elif Yılmaz';
      const appointment = {
        tarih: reserved.tarih,
        bas: reserved.bas,
        bit: reserved.bit,
        aday: reserved.aday,
        danışman: bookedAdvisor,
        danismanId: bookedAdvisorId
      };
      try {
        if (!availability.saveSlots(AVAILABILITY_KEY, current)) throw new Error('Müsaitlik kaydı yazılamadı.');
        localStorage.setItem(APPOINTMENT_KEY, JSON.stringify(appointment));
      } catch (error) {
        console.error('Randevu kaydedilemedi.', error);
        try {
          if (oldAvailability === null) localStorage.removeItem(AVAILABILITY_KEY);
          else localStorage.setItem(AVAILABILITY_KEY, oldAvailability);
          if (oldAppointment === null) localStorage.removeItem(APPOINTMENT_KEY);
          else localStorage.setItem(APPOINTMENT_KEY, oldAppointment);
        } catch (rollbackError) {
          console.error('Başarısız randevu kaydı geri alınamadı.', rollbackError);
        }
        window.alert('Randevu kaydedilemedi. Tarayıcı depolama alanını kontrol edip tekrar dene.');
        return;
      }
      availableSlots = availableSlots.filter(slot => slot.id !== reserved.id);
      selectedSlot = null;
      renderCalendar();
      renderSlots();
      showBookingSuccess();
    }

    function renderSlots() {
      const monthKey = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0');
      const monthSlots = availableSlots.filter(slot => slot.tarih.startsWith(monthKey));
      const viewingSelectedMonth = selectedDate && selectedDate.getFullYear() === month.getFullYear() &&
        selectedDate.getMonth() === month.getMonth();
      hoursTitle.textContent = !selectedDate
        ? 'Takvimden bir gün seç'
        : monthSlots.length && viewingSelectedMonth
        ? appointmentLabel(selectedDate, true) + ' için uygun saatler'
        : monthNames[month.getMonth()] + ' ' + month.getFullYear();
      slotsContainer.replaceChildren();
      slotsContainer.setAttribute('aria-label', viewingSelectedMonth
        ? appointmentLabel(selectedDate, true) + ' için uygun saatler'
        : 'Saat seçimi');
      const daySlots = viewingSelectedMonth ? slotsFor(selectedDate) : [];
      if (selectedSlot && !daySlots.some(slot => slot.id === selectedSlot.id)) {
        selectedSlot = null;
        focusedSlotId = null;
      }
      slotCount.textContent = selectedDate && viewingSelectedMonth
        ? daySlots.length + ' uygun saat'
        : ' ';
      summaryCard.classList.toggle('has-selection', Boolean(selectedSlot));
      if (selectedSlot) {
        summaryText.textContent = dateLabel(parseDate(selectedSlot.tarih)) + ' · ' +
          selectedSlot.bas + ' - ' + selectedSlot.bit + ' · ' + bookedAdvisor;
      } else {
        summaryText.textContent = 'Önce bir tarih ve saat seç';
      }

      if (!selectedDate || !viewingSelectedMonth || !daySlots.length) {
        const empty = document.createElement('p');
        empty.className = 'appointment-slot-empty';
        empty.textContent = !selectedDate
          ? 'Takvimden bir gün seç'
          : !monthSlots.length ? 'Bu ay için müsait saat yok' : 'Bu gün için uygun saat yok';
        slotsContainer.appendChild(empty);
      } else {
        const groups = [
          { label: 'Sabah', slots: daySlots.filter(slot => Number(slot.bas.slice(0, 2)) < 12) },
          { label: 'Öğleden sonra', slots: daySlots.filter(slot => Number(slot.bas.slice(0, 2)) >= 12 && Number(slot.bas.slice(0, 2)) < 17) },
          { label: 'Akşam', slots: daySlots.filter(slot => Number(slot.bas.slice(0, 2)) >= 17) }
        ].filter(group => group.slots.length);

        groups.forEach(function (group) {
          const section = document.createElement('section');
          section.className = 'appointment-slot-group';
          const heading = document.createElement('h3');
          heading.textContent = group.label;
          section.appendChild(heading);
          group.slots.forEach(function (slot) {
            const active = selectedSlot?.id === slot.id;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = active ? 'appointment-slot appointment-slot--selected' : 'appointment-slot';
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', String(Boolean(active)));
            button.dataset.slotId = slot.id;
            button.innerHTML = '<span class="appointment-slot-time"><span class="material-symbols-outlined" aria-hidden="true">schedule</span>' +
              slot.bas + ' - ' + slot.bit + '</span><span class="material-symbols-outlined appointment-slot-check" aria-hidden="true">' +
              (active ? 'check_circle' : 'radio_button_unchecked') + '</span>';
            button.addEventListener('click', function () {
              selectedSlot = slot;
              focusedSlotId = slot.id;
              renderSlots();
              slotsContainer.querySelector(`[data-slot-id="${slot.id}"]`)?.focus();
            });
            button.addEventListener('keydown', function (event) {
              const choices = Array.from(slotsContainer.querySelectorAll('[role="radio"]'));
              const currentIndex = choices.indexOf(button);
              let nextIndex = currentIndex;
              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % choices.length;
              else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + choices.length) % choices.length;
              else if (event.key === 'Home') nextIndex = 0;
              else if (event.key === 'End') nextIndex = choices.length - 1;
              else return;
              event.preventDefault();
              choices[nextIndex].click();
            });
            section.appendChild(button);
          });
          slotsContainer.appendChild(section);
        });
      }
      if (confirmButton) {
        confirmButton.disabled = !selectedSlot || !viewingSelectedMonth;
        confirmButton.setAttribute('aria-disabled', String(confirmButton.disabled));
      }
      if (focusedSlotId) slotsContainer.querySelector(`[data-slot-id="${focusedSlotId}"]`)?.setAttribute('tabindex', '0');
    }

    function renderCalendar(focusDate) {
      monthTitle.textContent = monthNames[month.getMonth()] + ' ' + month.getFullYear();
      arrows[0].setAttribute('aria-label', 'Önceki ay');
      arrows[1].setAttribute('aria-label', 'Sonraki ay');
      dateGrid.setAttribute('role', 'grid');
      dateGrid.setAttribute('aria-label', monthNames[month.getMonth()] + ' ' + month.getFullYear());
      dateGrid.replaceChildren();
      const monthKey = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0');
      const monthHasSlots = availableSlots.some(slot => slot.tarih.startsWith(monthKey));
      let emptyMonth = dateGrid.parentElement.querySelector('[data-calendar-empty-month]');
      if (!emptyMonth) {
        emptyMonth = document.createElement('p');
        emptyMonth.dataset.calendarEmptyMonth = '';
        emptyMonth.className = 'mt-3 rounded-lg bg-[#F5F2FF] px-3 py-2 text-center text-[13px] font-medium text-[#433582]';
        emptyMonth.setAttribute('role', 'status');
        dateGrid.insertAdjacentElement('afterend', emptyMonth);
      }
      emptyMonth.hidden = monthHasSlots;
      emptyMonth.textContent = 'Bu ay için müsait saat yok';
      const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
      for (let blank = 0; blank < offset; blank++) dateGrid.appendChild(document.createElement('span'));
      const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= dayCount; day++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day, 12);
        const slots = slotsFor(date);
        const available = slots.length > 0;
        const active = available && selectedDate && dateKey(date) === dateKey(selectedDate);
        const key = dateKey(date);
        const today = key === DEMO_TODAY;
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'gridcell');
        item.setAttribute('aria-label', appointmentLabel(date, true) + (available ? ', müsait' : ', müsait saat yok'));
        item.setAttribute('aria-disabled', String(!available));
        item.setAttribute('aria-pressed', String(active));
        item.setAttribute('tabindex', key === focusedDateKey ? '0' : '-1');
        if (today) item.setAttribute('aria-current', 'date');
        item.dataset.today = String(today);
        item.className = active
          ? 'calendar-date calendar-date--selected' + (today ? ' calendar-date--today' : '')
          : available
            ? 'calendar-date calendar-date--available' + (today ? ' calendar-date--today' : '')
            : 'calendar-date calendar-date--unavailable' + (today ? ' calendar-date--today' : '');
        const number = document.createElement('span');
        number.textContent = String(day);
        item.appendChild(number);
        if (available) {
          const dot = document.createElement('span');
          dot.className = 'calendar-date-dot';
          dot.setAttribute('aria-hidden', 'true');
          item.appendChild(dot);
        }
        item.addEventListener('click', function () {
          if (!available) return;
          focusedDateKey = key;
          selectedDate = date;
          selectedSlot = null;
          focusedSlotId = null;
          renderCalendar(key);
          renderSlots();
        });
        item.addEventListener('keydown', function (event) {
          const delta = event.key === 'ArrowLeft' ? -1
            : event.key === 'ArrowRight' ? 1
              : event.key === 'ArrowUp' ? -7
                : event.key === 'ArrowDown' ? 7 : 0;
          if (!delta) return;
          event.preventDefault();
          const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta, 12);
          focusedDateKey = dateKey(nextDate);
          if (nextDate.getMonth() !== month.getMonth() || nextDate.getFullYear() !== month.getFullYear()) {
            month = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
            selectedDate = null;
            selectedSlot = null;
            focusedSlotId = null;
            renderSlots();
          }
          renderCalendar(focusedDateKey);
        });
        dateGrid.appendChild(item);
      }
      if (focusDate) dateGrid.querySelector(`[aria-label^="${appointmentLabel(parseDate(focusDate), true)}"]`)?.focus();
    }

    arrows[0].addEventListener('click', function () {
      month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
      selectedDate = null;
      selectedSlot = null;
      focusedSlotId = null;
      focusedDateKey = dateKey(month);
      renderCalendar(focusedDateKey);
      renderSlots();
    });
    arrows[1].addEventListener('click', function () {
      month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      selectedDate = null;
      selectedSlot = null;
      focusedSlotId = null;
      focusedDateKey = dateKey(month);
      renderCalendar(focusedDateKey);
      renderSlots();
    });
    if (confirmButton) confirmButton.addEventListener('click', saveBooking);

    renderCalendar();
    renderSlots();
  }

  if (location.pathname.endsWith('/randevu-ok.html')) {
    initConfirmation();
  } else {
    initCalendar();
  }
})();
