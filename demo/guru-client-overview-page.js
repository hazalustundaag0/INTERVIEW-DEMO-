(function () {
  const section = Array.from(document.querySelectorAll('section')).find(element =>
    element.classList.contains('lg:col-span-8') &&
    Array.from(element.querySelectorAll('h2')).some(heading => heading.textContent.trim() === 'Profil ön bilgisi')
  );
  if (!section) return;
  document.body.classList.add('guru-client-overview');
  document.body.style.paddingBottom = '5rem';

  const tabs = Array.from(section.querySelectorAll('button')).filter(button =>
    ['Genel', 'Hikâye', 'Notlar', 'Ödevler'].includes(button.textContent.trim())
  );
  const tabList = tabs[0]?.parentElement;
  if (tabs.length === 4 && tabList) {
    tabList.className = 'client-overview-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Danışan detay sekmeleri');
    const counts = { Genel: null, Hikâye: null, Notlar: 1, Ödevler: 2 };
    tabs.forEach(tab => {
      const label = tab.textContent.trim();
      const active = label === 'Genel';
      tab.className = 'client-overview-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute('aria-controls', 'client-overview-content');
      if (counts[label] !== null) {
        const count = document.createElement('span');
        count.className = 'client-overview-tab-count';
        count.textContent = `(${counts[label]})`;
        tab.append(count);
      }
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

  const pageContent = tabList?.nextElementSibling;
  if (pageContent) {
    pageContent.id = 'client-overview-content';
    pageContent.setAttribute('role', 'tabpanel');
    pageContent.setAttribute('aria-labelledby', tabs[0]?.id || 'client-tab-overview');
    if (tabs[0]) tabs[0].id = 'client-tab-overview';
  }

  const infoHeading = Array.from(section.querySelectorAll('h2')).find(heading =>
    heading.textContent.trim() === 'Profil ön bilgisi'
  );
  const infoCard = infoHeading?.parentElement;
  const rows = infoCard?.querySelector(':scope > div');
  if (rows) {
    rows.classList.add('client-profile-info-grid');
    Array.from(rows.children).forEach(row => {
      const [label, value] = row.children;
      if (!label || !value) return;
      row.className = 'client-profile-info-row';
      label.className = 'client-profile-info-label';
      label.textContent = label.textContent.trim().replace(/:\s*$/, '');
      value.className = 'client-profile-info-value';
    });
  }

  const sessionHeading = Array.from(section.querySelectorAll('h2')).find(heading =>
    heading.textContent.trim() === 'Seanslar'
  );
  const sessionCard = sessionHeading?.parentElement;
  const sessionList = sessionCard?.querySelector(':scope > div');
  const sessionRows = sessionList ? Array.from(sessionList.children) : [];
  let toastTimer;
  function showToast(message) {
    let toast = document.querySelector('.client-overview-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'client-overview-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.remove(), 2600);
  }

  const completionEnabled = window.DEMO_CLIENT_SESSION_CAN_COMPLETE === true ||
    document.body.dataset.clientSessionCompletionEnabled === 'true';
  const dialog = document.createElement('dialog');
  dialog.className = 'client-session-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'client-session-dialog-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="client-session-dialog-title">Bu seansı tamamlandı olarak işaretlemek istiyor musun?</h2>
      <div class="client-session-dialog-actions">
        <button type="submit" value="cancel">İptal</button>
        <button type="submit" value="confirm">Onayla</button>
      </div>
    </form>`;
  document.body.append(dialog);
  let pendingCompletion = null;

  sessionRows.forEach((row, index) => {
    row.classList.add('client-session-row');
    const content = row.querySelector('div');
    const status = content?.querySelector('span span') || row.querySelector(':scope > span');
    if (index === 0) {
      const sessionText = Array.from(content?.querySelectorAll(':scope > span') || [])
        .find(span => span.textContent.includes('Seans 1'));
      if (sessionText) {
        sessionText.classList.add('client-session-description');
        const statusText = sessionText.querySelector('span');
        if (statusText) {
          statusText.className = 'client-session-status';
          statusText.textContent = 'Planlandı';
        }
      }
      const oldButton = row.querySelector('button');
      if (oldButton) {
        oldButton.className = 'client-session-complete';
        oldButton.textContent = 'Tamamlandı işaretle';
        oldButton.type = 'button';
        oldButton.disabled = !completionEnabled;
        oldButton.setAttribute('aria-disabled', String(!completionEnabled));
        oldButton.title = 'Seans saatinden sonra işaretlenebilir';
        oldButton.addEventListener('click', () => {
          if (oldButton.disabled) return;
          pendingCompletion = oldButton;
          dialog.showModal();
          dialog.querySelector('button[value="cancel"]').focus();
        });
      }
      const linkButton = document.createElement('button');
      linkButton.type = 'button';
      linkButton.className = 'client-session-link';
      linkButton.textContent = 'Link ekle';
      linkButton.addEventListener('click', () => showToast('Demo: Bu seans için henüz görüşme bağlantısı yok.'));
      row.append(linkButton);
    } else {
      if (status) {
        status.className = 'client-session-status client-session-status--pending';
        status.textContent = 'Beklemede';
      }
      const planLink = document.createElement('a');
      planLink.className = 'client-session-plan';
      planLink.href = 'guru-musaitlik.html';
      planLink.textContent = 'Planla';
      row.append(planLink);
    }
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close('cancel');
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled)'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener('close', () => {
    const trigger = pendingCompletion;
    pendingCompletion = null;
    if (dialog.returnValue === 'confirm' && trigger) {
      const row = trigger.closest('.client-session-row');
      const status = row?.querySelector('.client-session-status');
      if (status) {
        status.textContent = 'Tamamlandı';
        status.classList.add('client-session-status--complete');
      }
      try {
        localStorage.setItem('demoIlkSeansTamamlandi', 'true');
      } catch (error) {
        console.error('İlk seans tamamlanma durumu kaydedilemedi.', error);
      }
      trigger.textContent = 'Tamamlandı';
      trigger.disabled = true;
      trigger.setAttribute('aria-disabled', 'true');
      trigger.title = 'Bu seans zaten tamamlandı';
      trigger.focus();
      showToast('Seans tamamlandı olarak işaretlendi.');
    } else {
      trigger?.focus();
    }
  });

  document.addEventListener('click', event => {
    const control = event.target.closest('button, a, [role="button"]');
    if (control?.textContent.replace(/\s+/g, ' ').trim() !== 'Not Yaz' &&
        control?.textContent.replace(/\s+/g, ' ').trim() !== 'Ödev Ver') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = control.getAttribute('href');
  }, true);

  const flowNav = document.getElementById('demo-flow-nav');
  flowNav?.classList.add('demo-only');
})();
