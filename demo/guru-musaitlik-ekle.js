// guru-musaitlik-ekle.js — Guru · müsaitlik ekleme (guru-musaitlik-ekle.html). Sahibi: 84 Guru Panel UI.
// Eskiden sayfa içi betikti (yerel depolama + sabit demo tarihi).
// Şimdi: çakışma ön kontrolü GET /guru/availability?from&to (yalnız müsait slotlar) + planlı seanslar
// (QA-015: rezerve slotlar müsait listesinde dönmez → /guru/clients → …/sessions, eşzamanlılık 4).
// Kayıt N × POST /guru/availability {starts_at, ends_at} (UTC, 50 dk). Yine de 409 gelirse her saat için
// "eklendi / eklenemedi + neden" önizleme listesinde gösterilir (Düzeltme turu 1).
// Başarıda guru-musaitlik.html?eklendi=N&hafta=<ilk tarih> (depolama yok). Toplu ekleme ucu yok (GAP-B18).
(function () {
  'use strict';
  if (!window.Api || !window.SlotTime) return;
  const Api = window.Api;
  const T = window.SlotTime;
  const DURATION = T.durationMinutes || 50;

  const dateInput = document.getElementById('availability-date');
  const timeRows = document.getElementById('time-rows');
  const addTime = document.getElementById('add-time');
  const repeat = document.getElementById('repeat-weekly');
  const repeatWrap = document.getElementById('repeat-count-wrap');
  const repeatCount = document.getElementById('repeat-count');
  const preview = document.getElementById('preview-list');
  const previewHeading = document.getElementById('preview-heading');
  const error = document.getElementById('form-error');
  const form = document.getElementById('availability-form');
  const saveButton = document.getElementById('save-availability');
  const datePickerButton = document.querySelector('.availability-date-picker');
  if (!dateInput || !timeRows || !form || !saveButton) return;
  saveButton.dataset.action = 'availability-create';
  const times = [];
  let nextRowId = 0;
  let existing = [];       // [{ start: ms, end: ms }] — sunucudaki müsait slotlar
  let existingKey = '';
  let reserved = null;     // [{ start, end, label }] — planlı seanslar (QA-015)
  let results = null;      // son kaydetme denemesinin satır satır sonucu
  let saving = false;
  const today = T.today();
  dateInput.min = today;
  if (!dateInput.value) dateInput.value = today;

  function pad(n) { return String(n).padStart(2, '0'); }
  function endOf(start) {
    const [h, m] = start.split(':').map(Number);
    const finish = h * 60 + m + DURATION;
    return pad(Math.floor(finish / 60)) + ':' + pad(finish % 60);
  }

  function resetResults() {
    results = null;
    delete saveButton.dataset.resultMode;
  }

  function createTimeSelect(value) {
    const select = document.createElement('select');
    select.className = 'availability-start-input rounded-[8px] border border-[#DEDaf4] bg-white px-2 py-2.5 text-[14px] text-[#1E1E1C] focus:border-[#51409D] focus:outline-none focus:ring-0 sm:px-3';
    select.id = 'availability-start-' + (++nextRowId);
    for (let m = 9 * 60; m <= 18 * 60; m += 30) {
      const option = document.createElement('option');
      option.value = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      option.textContent = option.value;
      option.selected = option.value === value;
      select.appendChild(option);
    }
    return select;
  }

  function addTimeRow(value) {
    if (times.length >= 5) return;
    const row = document.createElement('div');
    row.className = 'availability-time-row';
    const start = createTimeSelect(value);
    const startLabel = document.createElement('label');
    startLabel.className = 'availability-time-field';
    startLabel.htmlFor = start.id;
    const startCaption = document.createElement('span');
    startCaption.textContent = 'Başlangıç';
    startLabel.append(startCaption, start);
    const end = document.createElement('input');
    end.className = 'availability-end-input rounded-[8px] border border-[#DEDaf4] px-2 py-2.5 text-[14px] sm:px-3';
    end.type = 'text';
    end.disabled = true;
    end.setAttribute('aria-label', 'Bitiş, seans süresine göre otomatik hesaplanır');
    end.setAttribute('aria-describedby', 'availability-end-help');
    const endLabel = document.createElement('label');
    endLabel.className = 'availability-time-field';
    const endCaption = document.createElement('span');
    endCaption.textContent = 'Bitiş';
    endLabel.append(endCaption, end);
    const arrow = document.createElement('span');
    arrow.className = 'availability-time-separator';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '–';
    const remove = document.createElement('button');
    remove.className = 'availability-remove-time';
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Bu saati kaldır');
    remove.textContent = '×';
    const feedback = document.createElement('p');
    feedback.className = 'availability-time-feedback';
    feedback.id = start.id + '-error';
    feedback.hidden = true;
    feedback.setAttribute('role', 'status');
    row.append(startLabel, arrow, endLabel, remove, feedback);
    timeRows.appendChild(row);
    const entry = { row, start, end, remove, feedback };
    times.push(entry);
    start.addEventListener('change', () => { resetResults(); update(); });
    remove.addEventListener('click', () => {
      times.splice(times.indexOf(entry), 1);
      row.remove();
      resetResults();
      update();
    });
    update();
  }

  function dateLabel(dateValue) {
    return T.dateLabel(T.toUtcIso(dateValue, '12:00'));
  }

  function datesToPreview() {
    if (!dateInput.value) return [];
    const count = repeat.checked ? Number(repeatCount.value) : 1;
    return Array.from({ length: count }, (_, index) => T.addDays(dateInput.value, index * 7));
  }

  function plannedSlots() {
    const result = [];
    datesToPreview().forEach(date => times.forEach(entry => {
      const startsAt = T.toUtcIso(date, entry.start.value);
      result.push({ date, entry, startsAt, endsAt: T.addMinutes(startsAt, DURATION) });
    }));
    return result;
  }

  // Seçili tarih aralığındaki mevcut müsait slotları getir (çakışma ön kontrolü için).
  async function refreshExisting() {
    const dates = datesToPreview();
    if (!dates.length) { existing = []; existingKey = ''; return; }
    const key = dates[0] + '|' + dates[dates.length - 1];
    if (key === existingKey) return;
    existingKey = key;
    try {
      const data = await Api.get('/guru/availability', {
        query: { from: T.toUtcIso(dates[0], '00:00'), to: T.toUtcIso(T.addDays(dates[dates.length - 1], 1), '00:00') }
      });
      if (existingKey !== key) return;
      existing = (data.items || []).map(slot => ({ start: Date.parse(slot.starts_at), end: Date.parse(slot.ends_at) }));
    } catch (err) {
      existing = [];
    }
    update();
  }

  // Planlı seanslar = rezerve slotlar (GET /guru/availability bunları döndürmez, GAP-B18).
  async function loadReserved() {
    if (reserved) return;
    try {
      const clients = await Api.listAll('/guru/clients', { limit: 100, query: { status: 'active' } });
      const lists = await window.GuruPanel.mapLimit(clients, 4, client =>
        Api.get('/guru/enrollments/' + client.enrollment.id + '/sessions')
          .then(data => (data.items || []).map(session => ({ session, client }))).catch(() => []));
      reserved = lists.flat()
        .filter(({ session }) => session.status === 'scheduled' && session.scheduled_start_at)
        .map(({ session, client }) => ({
          start: Date.parse(session.scheduled_start_at),
          end: Date.parse(session.scheduled_end_at || T.addMinutes(session.scheduled_start_at, DURATION)),
          label: Api.format.fullName(client.candidate) + ' · Seans ' + session.sequence_no
        }));
    } catch (err) {
      reserved = [];
    }
    update();
  }

  // 409 already_exists → anlaşılır neden (rezerve veya gizli slot listede görünmeyebilir).
  function failureReason(err) {
    if (err && err.status === 409) return 'bu saatte zaten bir müsaitlik veya randevu var';
    if (err && err.isValidation) return 'saat geçersiz';
    return Api.ui.message(err);
  }

  function validate() {
    times.forEach(entry => {
      entry.feedback.textContent = '';
      entry.feedback.hidden = true;
      entry.start.removeAttribute('aria-invalid');
      entry.start.setAttribute('aria-describedby', 'availability-end-help');
    });
    if (!times.length) return '';
    if (!dateInput.value) return 'Tarih seç.';
    if (dateInput.value < today) return 'Geçmiş bir tarih seçemezsin.';
    const now = Date.now();
    const pending = [];
    for (const slot of plannedSlots()) {
      const start = Date.parse(slot.startsAt);
      const end = Date.parse(slot.endsAt);
      const booked = (reserved || []).find(item => start < item.end && end > item.start);
      let message = '';
      if (start <= now) message = 'Bu saat geçmişte kalıyor (' + slot.date + ' ' + slot.entry.start.value + ').';
      else if (booked) message = 'Bu saat planlı bir seansla çakışıyor (' + slot.date + ' ' + slot.entry.start.value + ' · ' + booked.label + ').';
      else if (existing.some(item => start < item.end && end > item.start) || pending.some(item => start < item.end && end > item.start)) {
        message = 'Bu saat mevcut bir müsaitlikle çakışıyor (' + slot.date + ' ' + slot.entry.start.value + ').';
      }
      if (message) {
        slot.entry.feedback.textContent = message;
        slot.entry.feedback.hidden = false;
        slot.entry.start.setAttribute('aria-invalid', 'true');
        slot.entry.start.setAttribute('aria-describedby', 'availability-end-help ' + slot.entry.feedback.id);
        return message;
      }
      pending.push({ start, end });
    }
    return '';
  }

  function renderResults() {
    results.forEach(result => {
      const item = document.createElement('li');
      item.className = 'availability-preview-item';
      const summary = document.createElement('span');
      summary.textContent = (result.ok ? '✓ ' : '✗ ') + dateLabel(result.slot.date) + ' · ' + result.slot.entry.start.value + ' - ' +
        endOf(result.slot.entry.start.value) + (result.ok ? ' — eklendi' : ' — eklenemedi: ' + result.reason);
      if (!result.ok) summary.className = 'text-[#B42318]';
      item.appendChild(summary);
      preview.appendChild(item);
    });
    const ok = results.filter(r => r.ok).length;
    previewHeading.textContent = 'Kaydetme sonucu (' + ok + ' eklendi, ' + (results.length - ok) + ' eklenemedi)';
  }

  function update() {
    times.forEach(entry => {
      entry.end.value = endOf(entry.start.value);
      entry.remove.hidden = false;
    });
    repeatWrap.classList.toggle('hidden', !repeat.checked);
    addTime.classList.toggle('hidden', times.length >= 5);
    preview.replaceChildren();
    if (results) { renderResults(); return; }
    times.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'availability-preview-item';
      const summary = document.createElement('span');
      const dateSummary = dateInput.value ? dateLabel(dateInput.value) : 'Tarih seçilmedi';
      const weekday = dateInput.value ? dateSummary.split(' ').slice(-1)[0] : 'gün';
      summary.textContent = repeat.checked
        ? repeatCount.value + ' hafta boyunca her ' + weekday + ' ' + entry.start.value + ' - ' + entry.end.value
        : dateSummary + ' · ' + entry.start.value + ' - ' + entry.end.value;
      const remove = document.createElement('button');
      remove.className = 'availability-preview-remove';
      remove.type = 'button';
      remove.setAttribute('aria-label', entry.start.value + ' saatini özet listesinden kaldır');
      remove.textContent = '×';
      remove.addEventListener('click', () => entry.remove.click());
      item.append(summary, remove);
      preview.appendChild(item);
    });
    const total = plannedSlots().length;
    previewHeading.textContent = 'Eklenecek saatler (' + total + ')';
    if (!saving) saveButton.textContent = total + ' saat ekle';
    const message = validate();
    error.textContent = message;
    error.classList.toggle('hidden', !message);
    saveButton.disabled = saving || total === 0 || !dateInput.value || Boolean(message);
  }

  function onScheduleChange() {
    resetResults();
    update();
    refreshExisting();
  }

  addTime.addEventListener('click', event => {
    event.preventDefault();
    resetResults();
    if (times.length < 5) addTimeRow('14:00');
  });
  dateInput.addEventListener('change', onScheduleChange);
  dateInput.addEventListener('input', () => { resetResults(); update(); });
  repeat.addEventListener('change', onScheduleChange);
  repeatCount.addEventListener('change', onScheduleChange);
  datePickerButton?.addEventListener('click', () => {
    if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
    else { dateInput.focus(); dateInput.click(); }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    // Sonuç modu: eklenen varsa takvime dön; hiç eklenmediyse formu yenile.
    if (saveButton.dataset.resultMode === 'true') {
      const added = (results || []).filter(r => r.ok);
      if (added.length) {
        location.href = 'guru-musaitlik.html?' + new URLSearchParams({ eklendi: String(added.length), hafta: added[0].slot.date }).toString();
        return;
      }
      resetResults();
      existingKey = '';
      reserved = null;
      loadReserved();
      refreshExisting();
      update();
      return;
    }
    const message = validate();
    if (message) {
      error.textContent = message;
      error.classList.remove('hidden');
      return;
    }
    const planned = plannedSlots();
    if (!planned.length || saving) return;
    saving = true;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    error.classList.add('hidden');
    let created = 0;
    const failures = [];
    const outcome = [];
    for (const slot of planned) {
      saveButton.textContent = 'Ekleniyor… (' + (created + failures.length + 1) + '/' + planned.length + ')';
      try {
        await Api.post('/guru/availability', { starts_at: slot.startsAt, ends_at: slot.endsAt });
        created += 1;
        outcome.push({ slot, ok: true });
      } catch (err) {
        if (err.status === 401) return; // api-client girişe yönlendiriyor
        failures.push({ slot, err });
        outcome.push({ slot, ok: false, reason: failureReason(err) });
      }
    }
    saving = false;
    saveButton.removeAttribute('aria-busy');
    if (!failures.length) {
      location.href = 'guru-musaitlik.html?' + new URLSearchParams({ eklendi: String(created), hafta: planned[0].date }).toString();
      return;
    }
    // Kısmi sonuç (QA-015): hangi saat eklendi, hangisi neden eklenemedi. Eklenenler kaydedildi;
    // kaydet düğmesi "Takvime dön" olur (aynı saatleri yeniden göndermek yine çakışma üretir).
    results = outcome;
    update();
    error.textContent = (created ? created + ' saat eklendi; ' : '') + failures.length +
      ' saat eklenemedi: ' + failureReason(failures[0].err) + '. Ayrıntılar aşağıdaki listede.';
    error.classList.remove('hidden');
    saveButton.disabled = false;
    saveButton.textContent = created ? 'Takvime dön' : 'Tamam';
    saveButton.dataset.resultMode = 'true';
  });

  const params = new URLSearchParams(location.search);
  const requestedDate = params.get('date');
  const requestedStart = params.get('start');
  if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && requestedDate >= today) dateInput.value = requestedDate;
  const validStarts = Array.from({ length: 19 }, (_, index) => {
    const m = 9 * 60 + index * 30;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  });
  addTimeRow(validStarts.includes(requestedStart) ? requestedStart : '14:00');
  window.sessionReady.then(() => { refreshExisting(); loadReserved(); });
})();
