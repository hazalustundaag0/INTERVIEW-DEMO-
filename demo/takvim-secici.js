// takvim-secici.js — Müsaitlik ekleme (/guru/musaitlik/ekle) için iki aylık tarih seçici.
// Yerel <input type="date" id="availability-date"> korunur (guru-musaitlik-ekle.js onu okur); seçim
// yapıldığında değeri yazılır ve "change" olayı tetiklenir. Geçmiş günler seçilemez. Görünüm takvim.css.
(function () {
  'use strict';
  const T = window.SlotTime;
  const input = document.getElementById('availability-date');
  const control = input && input.closest('.availability-date-control');
  if (!T || !input || !control) return;

  document.body.classList.add('booking-page', 'availability-add-page');
  const today = T.today();
  const months = T.months;
  const weekdays = T.weekdays;
  const addMonths = (key, delta) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
  };
  const daysIn = key => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  };
  const weekdayOf = key => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  };
  const label = key => {
    const [y, m, d] = key.split('-').map(Number);
    return d + ' ' + months[m - 1] + ' ' + y + ' ' + weekdays[weekdayOf(key)];
  };
  const monthLabel = key => {
    const [y, m] = key.split('-').map(Number);
    return months[m - 1] + ' ' + y;
  };

  let month = (input.value || today).slice(0, 7);
  let focusKey = input.value || today;

  const root = document.createElement('div');
  root.className = 'booking-picker';
  const wrap = document.createElement('div');
  wrap.className = 'booking-months';
  const arrow = (dir, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'booking-arrow booking-arrow--' + dir;
    b.setAttribute('aria-label', dir === 'prev' ? 'Önceki ay' : 'Sonraki ay');
    b.setAttribute('data-nav-skip', '');
    b.innerHTML = '<span aria-hidden="true">' + text + '</span>';
    return b;
  };
  const prev = arrow('prev', '←');
  const next = arrow('next', '→');
  const panes = [0, 1].map(index => {
    const pane = document.createElement('div');
    pane.className = 'booking-month' + (index ? ' booking-month--next' : '');
    const head = document.createElement('div');
    head.className = 'booking-month-head';
    const title = document.createElement('h2');
    title.className = 'booking-month-title';
    head.appendChild(title);
    const names = document.createElement('div');
    names.className = 'booking-weekdays';
    names.setAttribute('aria-hidden', 'true');
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(n => {
      const s = document.createElement('span');
      s.textContent = n;
      names.appendChild(s);
    });
    const grid = document.createElement('div');
    grid.className = 'booking-grid';
    grid.setAttribute('role', 'grid');
    pane.append(head, names, grid);
    wrap.appendChild(pane);
    return { head, title, grid };
  });
  panes[0].head.prepend(prev);
  panes[1].head.append(next);
  const chosen = document.createElement('p');
  chosen.className = 'booking-picker-choice';
  chosen.setAttribute('aria-live', 'polite');
  root.append(wrap, chosen);
  control.insertAdjacentElement('afterend', root);
  control.classList.add('booking-native-date');

  function pick(key) {
    if (key < today) return;
    input.value = key;
    focusKey = key;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    render(key);
  }

  function render(focus) {
    prev.disabled = month <= today.slice(0, 7);
    chosen.textContent = input.value ? 'Seçilen tarih: ' + label(input.value) : 'Takvimden bir tarih seç';
    [month, addMonths(month, 1)].forEach((key, index) => {
      const pane = panes[index];
      pane.title.textContent = monthLabel(key);
      pane.grid.setAttribute('aria-label', monthLabel(key));
      pane.grid.replaceChildren();
      const offset = (weekdayOf(key + '-01') + 6) % 7;
      for (let i = 0; i < offset; i += 1) pane.grid.appendChild(document.createElement('span'));
      for (let d = 1; d <= daysIn(key); d += 1) {
        const date = key + '-' + String(d).padStart(2, '0');
        const past = date < today;
        const selected = date === input.value;
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.date = date;
        b.setAttribute('data-nav-skip', '');
        b.setAttribute('role', 'gridcell');
        b.setAttribute('aria-label', label(date) + (past ? ', geçmiş tarih' : ''));
        b.setAttribute('aria-disabled', String(past));
        b.setAttribute('aria-pressed', String(selected));
        b.tabIndex = date === focusKey ? 0 : -1;
        if (date === today) b.setAttribute('aria-current', 'date');
        b.className = 'calendar-date ' + (selected ? 'calendar-date--selected' : past ? 'calendar-date--unavailable' : 'calendar-date--available') + (date === today ? ' calendar-date--today' : '');
        b.textContent = String(d);
        b.addEventListener('click', () => pick(date));
        b.addEventListener('keydown', event => {
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key] || 0;
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(date); return; }
          if (!delta) return;
          event.preventDefault();
          const target = T.addDays(date, delta);
          if (target < today) return;
          focusKey = target;
          if (target.slice(0, 7) > addMonths(month, 1)) month = addMonths(month, 1);
          else if (target.slice(0, 7) < month) month = addMonths(month, -1);
          render(target);
        });
        pane.grid.appendChild(b);
      }
    });
    if (focus) root.querySelector('[data-date="' + focus + '"]')?.focus();
  }

  prev.addEventListener('click', () => { if (month > today.slice(0, 7)) { month = addMonths(month, -1); render(); } });
  next.addEventListener('click', () => { month = addMonths(month, 1); render(); });
  input.addEventListener('change', () => {
    if (input.value && (input.value.slice(0, 7) < month || input.value.slice(0, 7) > addMonths(month, 1))) month = input.value.slice(0, 7);
    render();
  });
  // guru-musaitlik-ekle.js varsayılan tarihi (bugün) yazdıktan sonra çiz.
  setTimeout(() => render(), 0);
})();
