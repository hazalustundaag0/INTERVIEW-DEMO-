(function () {
  if (window.__guruSessionDemoInitialized) return;
  window.__guruSessionDemoInitialized = true;

  const content = document.querySelector('section.lg\\:col-span-8');
  if (!content) return;

  const completionEnabled = window.DEMO_SESSION_CAN_COMPLETE === true ||
    document.body.dataset.sessionCompletionEnabled === 'true';
  const dialog = document.createElement('dialog');
  dialog.className = 'session-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'session-confirm-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="session-confirm-title" class="text-[18px] font-semibold">Seansı tamamlandı olarak işaretlemek istiyor musun?</h2>
      <div class="session-dialog-actions">
        <button type="submit" value="cancel">İptal</button>
        <button type="submit" value="confirm">Onayla</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);

  let pendingCompletion = null;
  let toastTimer;
  let updateSessionTabs = () => {};

  function showToast(message) {
    let toast = document.querySelector('.session-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'session-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.remove(), 2600);
  }

  function setButtonContent(button, label, iconName) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined session-action-icon';
    icon.textContent = iconName;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = label;
    button.replaceChildren(icon, text);
  }

  function createButton(label, className, iconName) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    setButtonContent(button, label, iconName);
    return button;
  }

  function setComplete(card) {
    const sessionNumber = card.querySelector('.session-card-index')?.textContent.trim();
    const candidateName = card.querySelector('.session-card-title')?.textContent.trim();
    if (card.dataset.bookedAppointment === 'true') {
      try {
        const rawAppointment = localStorage.getItem('demoRandevu');
        const appointment = rawAppointment ? JSON.parse(rawAppointment) : null;
        if (!appointment || typeof appointment !== 'object' || Array.isArray(appointment)) {
          throw new TypeError('Kaydedilen randevu bilgisi geçersiz.');
        }
        appointment.tamamlandi = true;
        localStorage.setItem('demoRandevu', JSON.stringify(appointment));
      } catch (error) {
        console.error('Randevu tamamlanma durumu kaydedilemedi.', error);
        showToast('Tamamlanma durumu kaydedilemedi. Yeniden dene.');
        return;
      }
    } else if (/^Seans 1\s*\//.test(sessionNumber || '') && candidateName === 'Elif Yılmaz') {
      try {
        localStorage.setItem('demoIlkSeansTamamlandi', 'true');
      } catch (error) {
        console.error('İlk seans tamamlanma durumu kaydedilemedi.', error);
        showToast('Tamamlanma durumu kaydedilemedi. Yeniden dene.');
        return;
      }
    }

    const status = card.querySelector('.session-card-status');
    if (status) {
      status.textContent = 'Tamamlandı';
      status.className = 'session-card-status';
      status.tabIndex = -1;
      status.focus();
    }
    const countdown = card.querySelector('.session-card-countdown');
    if (countdown) setCardProximity(card, countdown);
    const completeButton = card.querySelector('.session-complete-button');
    if (completeButton) {
      completeButton.disabled = true;
      completeButton.setAttribute('aria-disabled', 'true');
      completeButton.title = 'Bu seans zaten tamamlandı';
      setButtonContent(completeButton, 'Tamamlandı', 'check_circle');
    }
    updateSessionTabs();
    showToast('Seans tamamlandı olarak işaretlendi.');
  }

  const rows = Array.from(content.querySelectorAll('div')).filter(element =>
    element.classList.contains('bg-[#FFFFFF]') &&
    element.classList.contains('p-5') &&
    element.firstElementChild &&
    /^Seans \d+\s*\//.test(element.firstElementChild.textContent.trim())
  );
  const tabs = Array.from(content.querySelectorAll('button')).filter(button =>
    ['Yaklaşan', 'Tamamlanan'].includes(button.textContent.trim())
  );
  const tabList = tabs[0]?.parentElement;
  const list = rows[0]?.parentElement;
  const pageHeader = content.querySelector('h1')?.parentElement;
  let summaryCards;

  function renderSummary() {
    if (!summaryCards) return;
    const counts = {
      upcoming: rows.filter(card => card.querySelector('.session-card-status')?.textContent.trim() === 'Yaklaşan').length,
      pendingLinks: rows.filter(card =>
        card.querySelector('.session-card-status')?.textContent.trim() === 'Yaklaşan' &&
        card.dataset.meetingLinkReady !== 'true'
      ).length,
      completed: rows.filter(card => card.querySelector('.session-card-status')?.textContent.trim() === 'Tamamlandı').length
    };
    summaryCards.querySelector('[data-summary="upcoming"] .session-summary-count').textContent = String(counts.upcoming);
    summaryCards.querySelector('[data-summary="pendingLinks"] .session-summary-count').textContent = String(counts.pendingLinks);
    summaryCards.querySelector('[data-summary="completed"] .session-summary-count').textContent = String(counts.completed);
  }

  if (pageHeader && rows.length) {
    summaryCards = document.createElement('div');
    summaryCards.className = 'session-summary-grid';
    [
      ['upcoming', 'event', 'Yaklaşan seans', 'session-summary-card--upcoming'],
      ['pendingLinks', 'link_off', 'Bağlantı bekleyen', 'session-summary-card--pending'],
      ['completed', 'task_alt', 'Tamamlanan', 'session-summary-card--completed']
    ].forEach(([key, iconName, label, toneClass]) => {
      const card = document.createElement('article');
      card.className = `session-summary-card ${toneClass}`;
      card.dataset.summary = key;
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined session-summary-icon';
      icon.textContent = iconName;
      icon.setAttribute('aria-hidden', 'true');
      const count = document.createElement('strong');
      count.className = 'session-summary-count';
      const labelNode = document.createElement('span');
      labelNode.className = 'session-summary-label';
      labelNode.textContent = label;
      card.append(icon, count, labelNode);
      summaryCards.appendChild(card);
    });
    pageHeader.insertAdjacentElement('afterend', summaryCards);
  }

  function avatarTone(name) {
    const tones = ['indigo', 'teal', 'coral', 'purple'];
    let hash = 0;
    for (const character of name) hash = (hash * 31 + character.codePointAt(0)) | 0;
    return tones[Math.abs(hash) % tones.length];
  }

  function getCurrentIstanbulDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).reduce((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    return { year, timestamp: Date.UTC(year, month - 1, day) };
  }

  function daysUntilDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || '')) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const target = Date.UTC(year, month - 1, day);
    const targetDate = new Date(target);
    if (targetDate.getUTCFullYear() !== year || targetDate.getUTCMonth() !== month - 1 ||
        targetDate.getUTCDate() !== day) return null;
    return Math.round((target - getCurrentIstanbulDate().timestamp) / 86400000);
  }

  function daysUntilLabel(dateLabel) {
    const monthNames = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
    const weekdayNames = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
    const [, dayText, monthText, weekdayText] = dateLabel.match(/^(\d{1,2})\s+(\S+)\s+(\S+)/u) || [];
    const day = Number(dayText);
    const month = monthNames.indexOf((monthText || '').toLocaleLowerCase('tr-TR'));
    const weekday = weekdayNames.indexOf((weekdayText || '').toLocaleLowerCase('tr-TR'));
    if (!day || month < 0 || weekday < 0) return null;
    const today = getCurrentIstanbulDate();
    for (let year = today.year; year <= today.year + 7; year += 1) {
      const target = Date.UTC(year, month, day);
      const targetDate = new Date(target);
      if (targetDate.getUTCMonth() !== month || targetDate.getUTCDate() !== day ||
          targetDate.getUTCDay() !== weekday || target < today.timestamp) continue;
      return Math.round((target - today.timestamp) / 86400000);
    }
    return null;
  }

  function setCardProximity(card, countdown, dateLabel) {
    card.classList.remove(
      'session-card--today',
      'session-card--soon',
      'session-card--later',
      'session-card--completed',
      'session-card--unknown',
      'session-card--past'
    );
    const status = card.querySelector('.session-card-status')?.textContent.trim();
    if (status === 'Tamamlandı') {
      card.classList.add('session-card--completed');
      countdown.textContent = 'Tamamlandı';
      countdown.hidden = false;
      return;
    }
    const appointmentDate = card.dataset.bookedAppointment === 'true'
      ? window.demoBookedAppointment?.tarih
      : null;
    const days = appointmentDate
      ? daysUntilDate(appointmentDate)
      : daysUntilLabel(dateLabel || card.querySelector('.session-card-date-block')?.getAttribute('aria-label') || '');
    if (days === null) {
      card.classList.add('session-card--unknown');
      countdown.hidden = true;
      return;
    }
    countdown.hidden = false;
    if (days < 0) {
      card.classList.add('session-card--past');
      countdown.textContent = 'Seans tarihi geçti';
    } else if (days === 0) {
      card.classList.add('session-card--today');
      countdown.textContent = 'Bugün';
    } else if (days === 1) {
      card.classList.add('session-card--today');
      countdown.textContent = 'Yarın';
    } else {
      card.classList.add(days <= 3 ? 'session-card--soon' : 'session-card--later');
      countdown.textContent = `${days} gün sonra`;
    }
  }

  function enhanceDate(card, dateNode, dateLabel, timeLabel, onDateChange) {
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const parts = dateLabel.trim().split(/\s+/);
    const day = parts[0] || '';
    const month = parts[1] || '';
    const weekday = parts[2] || '';
    const dateBlock = document.createElement('div');
    dateBlock.className = 'session-card-date-block';
    dateBlock.setAttribute('aria-label', [day, month, weekday].filter(Boolean).join(' '));
    const dayNode = document.createElement('strong');
    dayNode.className = 'session-card-date-day';
    dayNode.textContent = day;
    const monthNode = document.createElement('span');
    monthNode.className = 'session-card-date-month';
    monthNode.textContent = monthNames.find(item => item === month)?.slice(0, 3) || month;
    const weekdayNode = document.createElement('span');
    weekdayNode.className = 'session-card-date-weekday';
    weekdayNode.textContent = weekday;
    dateBlock.append(dayNode, monthNode, weekdayNode);
    card.insertBefore(dateBlock, card.firstElementChild);

    function updateDate(value) {
      const segments = value.split('·').map(part => part.trim());
      const currentDate = segments[0] || dateLabel;
      const currentParts = currentDate.split(/\s+/);
      if (!/^\d{1,2}\s+\S+\s+\S+/.test(currentDate)) return;
      dayNode.textContent = currentParts[0] || day;
      monthNode.textContent = monthNames.find(item => item === currentParts[1])?.slice(0, 3) || currentParts[1] || month;
      weekdayNode.textContent = currentParts.find((part, index) => index > 1 && !/^\d{4}$/.test(part)) || weekday;
      dateBlock.setAttribute('aria-label', currentDate);
      dateNode.replaceChildren(document.createTextNode(segments.slice(1).join(' · ') || timeLabel));
      onDateChange();
    }

    const observer = new MutationObserver(() => updateDate(dateNode.textContent.trim()));
    observer.observe(dateNode, { childList: true, subtree: true, characterData: true });
    updateDate(`${dateLabel} · ${timeLabel}`);
    return dateBlock;
  }

  if (tabs.length === 2 && tabList && list) {
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

    let activeStatus = 'Yaklaşan';
    function renderSessionTabs() {
      const counts = {
        Yaklaşan: rows.filter(card => card.querySelector('.session-card-status')?.textContent.trim() === 'Yaklaşan').length,
        Tamamlanan: rows.filter(card => card.querySelector('.session-card-status')?.textContent.trim() === 'Tamamlandı').length
      };
      renderSummary();

      tabs.forEach(tab => {
        const label = tab.dataset.sessionStatus;
        const selected = label === activeStatus;
        tab.setAttribute('aria-selected', String(selected));
        tab.setAttribute('aria-controls', list.id);
        tab.tabIndex = selected ? 0 : -1;
        const count = document.createElement('span');
        count.className = 'session-tab-count';
        count.dataset.sessionCountFor = label === 'Yaklaşan' ? 'upcoming' : 'completed';
        count.setAttribute('aria-label', `${counts[label]} seans`);
        count.textContent = String(counts[label]);
        tab.replaceChildren(document.createTextNode(label), count);
      });

      const activeTab = tabs.find(tab => tab.dataset.sessionStatus === activeStatus);
      list.setAttribute('aria-labelledby', activeTab.id);
      const targetStatus = activeStatus === 'Tamamlanan' ? 'Tamamlandı' : 'Yaklaşan';
      let visibleCount = 0;
      rows.forEach(card => {
        const isVisible = card.querySelector('.session-card-status')?.textContent.trim() === targetStatus;
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });
      emptyMessage.textContent = activeStatus === 'Tamamlanan'
        ? 'Henüz tamamlanan seans yok'
        : 'Yaklaşan seans yok';
      emptyHint.textContent = activeStatus === 'Tamamlanan'
        ? 'Yeni seanslarını burada görebileceksin.'
        : '';
      emptyHint.hidden = activeStatus !== 'Tamamlanan';
      emptyState.hidden = visibleCount > 0;
      if (!emptyState.isConnected) list.append(emptyState);
    }

    tabs.forEach(tab => {
      const label = tab.textContent.trim();
      tab.dataset.sessionStatus = label;
      tab.className = 'session-tab';
      tab.id = `session-tab-${label === 'Yaklaşan' ? 'upcoming' : 'completed'}`;
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => {
        activeStatus = label;
        renderSessionTabs();
      });
      tab.addEventListener('keydown', event => {
        const currentIndex = tabs.indexOf(tab);
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      });
    });
    updateSessionTabs = renderSessionTabs;
  }

  rows.forEach((card, index) => {
    const details = card.firstElementChild;
    const actions = card.children[1];
    const title = details.querySelector('h2');
    const date = details.querySelector('p');
    const status = Array.from(details.querySelectorAll('span'))
      .find(span => span.textContent.trim() === 'Yaklaşan');
    const price = details.querySelector('[data-session-price]');
    if (!details || !actions || !title || !date || !status || !price) return;

    const match = title.textContent.trim().match(/^(Seans\s+\d+\s*\/\s*\d+)\s*·\s*(.+)$/);
    if (!match) return;
    const [, sessionNumber, candidateName] = match;
    card.classList.add('session-card');
    details.className = 'session-card-details flex flex-col';
    actions.className = 'session-card-actions';

    const heading = document.createElement('div');
    heading.className = 'session-card-heading';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'session-card-title-group';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'session-card-index';
    indexLabel.textContent = sessionNumber;
    title.textContent = candidateName;
    title.className = 'session-card-title';
    titleGroup.append(indexLabel, title);
    status.classList.add('session-card-status');
    heading.append(titleGroup, status);

    const [dateLabel = '', timeLabel = ''] = date.textContent.split(' · ');
    date.className = 'session-card-date';
    let refreshProximity = () => {};
    const dateBlock = enhanceDate(card, date, dateLabel, timeLabel, () => refreshProximity());

    const avatar = document.createElement('span');
    avatar.className = `session-card-avatar session-card-avatar--${avatarTone(candidateName)}`;
    avatar.textContent = candidateName.split(/\s+/).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
    avatar.setAttribute('aria-hidden', 'true');
    titleGroup.insertBefore(avatar, indexLabel);

    price.className = 'session-card-price';
    const priceText = price.textContent.trim();
    const priceParts = priceText.match(/^(Ücret:)\s*(.+)$/);
    if (priceParts) {
      const priceLabel = document.createElement('span');
      priceLabel.className = 'session-card-price-label';
      priceLabel.textContent = priceParts[1];
      const priceValue = document.createElement('strong');
      priceValue.className = 'session-card-price-value';
      priceValue.textContent = priceParts[2];
      price.replaceChildren(priceLabel, document.createTextNode(' '), priceValue);
    }
    const meta = document.createElement('div');
    meta.className = 'session-card-meta';
    const detailLink = document.createElement('a');
    detailLink.className = 'session-card-detail-link';
    detailLink.href = 'guru-danisan-detay.html';
    const detailIcon = document.createElement('span');
    detailIcon.className = 'material-symbols-outlined session-action-icon';
    detailIcon.textContent = 'arrow_forward';
    detailIcon.setAttribute('aria-hidden', 'true');
    const detailText = document.createElement('span');
    detailText.textContent = 'Danışanı gör';
    detailLink.append(detailIcon, detailText);
    const countdown = document.createElement('span');
    countdown.className = 'session-card-countdown';
    const linkStatus = document.createElement('span');
    linkStatus.className = 'session-card-link-status session-card-link-status--pending';
    linkStatus.textContent = 'Görüşme linki eklenmedi';
    linkStatus.setAttribute('role', 'status');
    function updateLinkStatus(ready) {
      card.dataset.meetingLinkReady = String(ready);
      linkStatus.classList.toggle('session-card-link-status--ready', ready);
      linkStatus.classList.toggle('session-card-link-status--pending', !ready);
      linkStatus.textContent = ready ? 'Bağlantı hazır' : 'Görüşme linki eklenmedi';
      renderSummary();
    }
    meta.append(detailLink, countdown, linkStatus);
    details.replaceChildren(heading, date, price, meta);
    refreshProximity = () => setCardProximity(card, countdown, dateBlock.getAttribute('aria-label'));
    refreshProximity();

    const addLinkButton = createButton('Görüşme linki ekle', 'session-link-add', 'add_link');
    const completeButton = createButton('Tamamlandı işaretle', 'session-complete-button', 'check_circle');
    completeButton.title = 'Seans saatinden sonra işaretlenebilir';
    completeButton.disabled = !completionEnabled;
    completeButton.setAttribute('aria-disabled', String(!completionEnabled));
    actions.replaceChildren(addLinkButton, completeButton);

    const linkActions = document.createElement('div');
    linkActions.className = 'session-link-actions';
    linkActions.hidden = true;
    let savedUrl = '';
    const meetingLink = document.createElement('a');
    meetingLink.textContent = 'Linke git';
    meetingLink.target = '_blank';
    meetingLink.rel = 'noopener noreferrer';
    const editButton = createButton('Düzenle', 'session-link-edit');
    linkActions.append(meetingLink, editButton);

    const editor = document.createElement('form');
    editor.className = 'session-link-editor';
    editor.hidden = true;
    const field = document.createElement('div');
    field.className = 'session-link-field';
    const label = document.createElement('label');
    label.textContent = 'Görüşme bağlantısı';
    const input = document.createElement('input');
    input.className = 'session-link-input';
    input.type = 'url';
    input.required = true;
    input.placeholder = 'https://';
    input.autocomplete = 'url';
    label.htmlFor = `session-link-${index + 1}`;
    input.id = label.htmlFor;
    field.append(label, input);
    const saveButton = createButton('Kaydet', 'session-link-save');
    saveButton.type = 'submit';
    const cancelButton = createButton('İptal', 'session-link-cancel');
    editor.append(field, saveButton, cancelButton);
    card.append(linkActions, editor);

    function openEditor() {
      input.value = savedUrl;
      editor.hidden = false;
      addLinkButton.hidden = true;
      linkActions.hidden = true;
      input.focus();
    }

    addLinkButton.addEventListener('click', openEditor);
    editButton.addEventListener('click', openEditor);
    cancelButton.addEventListener('click', () => {
      editor.hidden = true;
      addLinkButton.hidden = Boolean(savedUrl);
      linkActions.hidden = !savedUrl;
      (addLinkButton.hidden ? editButton : addLinkButton).focus();
    });

    editor.addEventListener('submit', event => {
      event.preventDefault();
      if (!input.reportValidity()) return;
      const url = new URL(input.value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        input.setCustomValidity('Bağlantı http veya https ile başlamalıdır.');
        input.reportValidity();
        input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
        return;
      }
      savedUrl = url.href;
      meetingLink.href = savedUrl;
      editor.hidden = true;
      addLinkButton.hidden = true;
      linkActions.hidden = false;
      updateLinkStatus(true);
      showToast('Görüşme bağlantısı kaydedildi.');
      editButton.focus();
    });

    completeButton.addEventListener('click', () => {
      if (completeButton.disabled) return;
      pendingCompletion = { card, button: completeButton };
      dialog.showModal();
      dialog.querySelector('button[value="cancel"]').focus();
    });
  });
  updateSessionTabs();
  renderSummary();
  setupSessionMobileNav();

  dialog.addEventListener('cancel', () => {
    const button = pendingCompletion?.button;
    pendingCompletion = null;
    window.setTimeout(() => button?.focus(), 0);
  });

  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'confirm' || !pendingCompletion) {
      pendingCompletion?.button.focus();
      pendingCompletion = null;
      return;
    }
    const { card } = pendingCompletion;
    pendingCompletion = null;
    setComplete(card);
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close('cancel');
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled)'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function setupSessionMobileNav() {
    const sidebar = document.querySelector('.guru-session-page .advisor-sidebar');
    const sidebarCard = sidebar?.firstElementChild;
    const content = sidebarCard?.firstElementChild;
    const brandRow = content?.querySelector(':scope > div:first-child');
    const nav = content?.querySelector('nav');
    if (!sidebar || !brandRow || !nav || brandRow.querySelector('.guru-session-mobile-toggle')) return;

    nav.id = 'guru-session-mobile-menu';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guru-session-mobile-toggle';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'menu';
    const label = document.createElement('span');
    label.textContent = 'Menüyü aç';
    toggle.append(icon, label);
    brandRow.appendChild(toggle);

    function setOpen(open) {
      sidebar.classList.toggle('guru-session-mobile-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Menüyü kapat' : 'Menüyü aç';
      icon.textContent = open ? 'close' : 'menu';
      if (open) nav.querySelector('a')?.focus();
      else toggle.focus();
    }

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sidebar.classList.contains('guru-session-mobile-menu-open')) setOpen(false);
    });
    document.addEventListener('click', event => {
      if (!sidebar.contains(event.target) && sidebar.classList.contains('guru-session-mobile-menu-open')) setOpen(false);
    });
  }
})();
