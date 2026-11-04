(function () {
  const section = Array.from(document.querySelectorAll('section')).find(element =>
    element.classList.contains('lg:col-span-8') &&
    Array.from(element.querySelectorAll('h2')).some(heading => heading.textContent.trim() === 'Seans notu')
  );
  if (!section) return;
  document.body.classList.add('guru-notes-page');

  const heading = Array.from(section.querySelectorAll('h2')).find(element =>
    element.textContent.trim() === 'Seans notu'
  );
  const editorCard = heading?.parentElement;
  const textarea = editorCard?.querySelector('textarea');
  const saveContainer = editorCard?.querySelector('button')?.parentElement;
  if (!editorCard || !textarea || !saveContainer) return;

  const previousHeading = Array.from(section.querySelectorAll('h3')).find(element =>
    element.textContent.trim() === 'Önceki notlar'
  );
  const notesList = previousHeading?.parentElement;
  if (!notesList) return;
  const tabList = Array.from(section.querySelectorAll('div')).find(element =>
    Array.from(element.querySelectorAll(':scope > button')).some(button => button.textContent.trim() === 'Notlar')
  );
  const noteTabs = tabList ? Array.from(tabList.querySelectorAll(':scope > button')) : [];

  editorCard.classList.add('note-editor-card');
  heading.id = 'note-editor-title';
  textarea.classList.add('note-editor-textarea');
  textarea.maxLength = 1000;
  textarea.setAttribute('aria-labelledby', heading.id);

  const description = Array.from(editorCard.querySelectorAll('p')).find(element =>
    element.textContent.includes('Bu not adayın ana ekranında')
  );
  if (description) {
    description.className = 'note-info-box';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'info';
    icon.setAttribute('aria-hidden', 'true');
    description.prepend(icon);
  }

  const sessionField = document.createElement('div');
  sessionField.className = 'note-session-field';
  const sessionLabel = document.createElement('label');
  sessionLabel.htmlFor = 'note-session';
  sessionLabel.textContent = 'Hangi seans için?';
  const sessionSelect = document.createElement('select');
  sessionSelect.id = 'note-session';
  sessionSelect.className = 'note-session-select';
  ['Seans 1', 'Seans 2'].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    sessionSelect.append(option);
  });
  sessionField.append(sessionLabel, sessionSelect);
  editorCard.insertBefore(sessionField, textarea);

  const counter = document.createElement('p');
  counter.id = 'note-character-count';
  counter.className = 'note-character-count';
  counter.setAttribute('aria-live', 'polite');
  textarea.setAttribute('aria-describedby', counter.id);
  textarea.insertAdjacentElement('afterend', counter);
  if (tabList && noteTabs.length) {
    tabList.classList.add('note-tabs');
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Danışan detay sekmeleri');
    noteTabs.forEach(tab => {
      const label = tab.textContent.trim();
      tab.dataset.noteTabLabel = label;
      tab.classList.add('note-tab');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(label === 'Notlar'));
      tab.tabIndex = label === 'Notlar' ? 0 : -1;
      tab.addEventListener('keydown', event => {
        let nextIndex = noteTabs.indexOf(tab);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (nextIndex + 1) % noteTabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (nextIndex - 1 + noteTabs.length) % noteTabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = noteTabs.length - 1;
        else return;
        event.preventDefault();
        noteTabs[nextIndex].focus();
        noteTabs[nextIndex].click();
      });
    });
  }

  const oldButton = saveContainer.querySelector('button');
  const draftButton = document.createElement('button');
  draftButton.type = 'button';
  draftButton.className = 'note-save-draft';
  draftButton.textContent = 'Taslak kaydet';
  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'note-share';
  shareButton.textContent = 'Kaydet ve adayla paylaş';
  saveContainer.className = 'note-save-actions';
  saveContainer.replaceChildren(draftButton, shareButton);
  oldButton?.remove();
  const cancelEditButton = document.createElement('button');
  cancelEditButton.type = 'button';
  cancelEditButton.className = 'note-cancel-edit';
  cancelEditButton.textContent = 'Düzenlemeyi iptal et';
  cancelEditButton.hidden = true;
  saveContainer.append(cancelEditButton);

  const dialog = document.createElement('dialog');
  dialog.className = 'note-share-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'note-share-dialog-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="note-share-dialog-title">Bu not adayın ekranında görünecek. Devam etmek istiyor musun?</h2>
      <div class="note-dialog-actions">
        <button type="submit" value="cancel">İptal</button>
        <button type="submit" value="confirm">Onayla</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const dialogTitle = dialog.querySelector('#note-share-dialog-title');

  let toastTimer;
  let pendingAction = null;
  let editingCard = null;
  function showToast(message) {
    let toast = document.querySelector('.note-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'note-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.remove(), 2600);
  }

  function updateCounter() {
    counter.textContent = `${textarea.value.length} / 1000`;
    const isEmpty = textarea.value.trim().length === 0;
    draftButton.disabled = isEmpty;
    shareButton.disabled = isEmpty;
    draftButton.setAttribute('aria-disabled', String(isEmpty));
    shareButton.setAttribute('aria-disabled', String(isEmpty));
    draftButton.textContent = editingCard ? 'Taslağı güncelle' : 'Taslak kaydet';
    shareButton.textContent = editingCard ? 'Güncelle ve adayla paylaş' : 'Kaydet ve adayla paylaş';
    cancelEditButton.hidden = !editingCard;
  }

  const emptyState = document.createElement('p');
  emptyState.className = 'note-empty-state';
  emptyState.textContent = 'Henüz not yok.';

  function updateNotesCount() {
    const cards = Array.from(notesList.querySelectorAll('.note-history-card'));
    previousHeading.textContent = `Önceki notlar (${cards.length})`;
    emptyState.hidden = cards.length > 0;
    if (!emptyState.isConnected) notesList.append(emptyState);
    if (noteTabs.length) {
      noteTabs.forEach(tab => {
        const label = tab.dataset.noteTabLabel;
        const selected = label === 'Notlar';
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.replaceChildren(document.createTextNode(label));
        if (selected) {
          const count = document.createElement('span');
          count.className = 'note-tab-count';
          count.textContent = `(${cards.length})`;
          tab.append(count);
        }
      });
    }
  }

  function createNoteCard(status, session, text, dateText) {
    const card = document.createElement('article');
    card.className = 'note-history-card';
    card.dataset.noteStatus = status;
    card.dataset.noteSession = session;
    const top = document.createElement('div');
    top.className = 'note-history-header';
    const date = document.createElement('span');
    date.className = 'note-history-date';
    date.textContent = `${session} · ${dateText}`;
    const badges = document.createElement('div');
    badges.className = 'note-history-badges';
    const statusBadge = document.createElement('span');
    statusBadge.className = 'note-status-badge';
    statusBadge.textContent = status;
    badges.append(statusBadge);
    top.append(date, badges);
    const noteText = document.createElement('p');
    noteText.className = 'note-history-text';
    noteText.textContent = text;
    const actions = document.createElement('div');
    actions.className = 'note-history-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'note-history-edit';
    editButton.textContent = 'Düzenle';
    editButton.setAttribute('aria-label', `${session} notunu düzenle`);
    editButton.addEventListener('click', () => {
      editingCard = card;
      textarea.value = noteText.textContent;
      sessionSelect.value = card.dataset.noteSession;
      updateCounter();
      textarea.focus();
    });
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'note-history-delete';
    deleteButton.textContent = 'Sil';
    deleteButton.setAttribute('aria-label', `${session} notunu sil`);
    deleteButton.addEventListener('click', () => {
      pendingAction = { type: 'delete', card, trigger: deleteButton };
      dialogTitle.textContent = 'Bu notu silmek istiyor musun?';
      dialog.querySelector('button[value="confirm"]').textContent = 'Sil';
      dialog.showModal();
      dialog.querySelector('button[value="cancel"]').focus();
    });
    actions.append(editButton, deleteButton);
    card.append(top, noteText, actions);
    return card;
  }

  function addNote(status) {
    const now = new Date();
    const dateText = `${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    if (editingCard) {
      editingCard.dataset.noteStatus = status;
      editingCard.dataset.noteSession = sessionSelect.value;
      editingCard.querySelector('.note-history-date').textContent = `${sessionSelect.value} · ${dateText}`;
      editingCard.querySelector('.note-status-badge').textContent = status;
      editingCard.querySelector('.note-history-text').textContent = textarea.value.trim();
      editingCard = null;
    } else {
      const card = createNoteCard(status, sessionSelect.value, textarea.value.trim(), dateText);
      notesList.insertBefore(card, notesList.querySelector('.note-history-card, .note-empty-state'));
    }
    textarea.value = '';
    updateCounter();
    updateNotesCount();
    showToast(status === 'Taslak' ? 'Not taslak olarak kaydedildi.' : 'Not adayla paylaşıldı.');
  }

  textarea.addEventListener('input', updateCounter);
  cancelEditButton.addEventListener('click', () => {
    editingCard = null;
    textarea.value = '';
    updateCounter();
    textarea.focus();
  });
  draftButton.addEventListener('click', () => {
    if (!draftButton.disabled) addNote('Taslak');
  });
  shareButton.addEventListener('click', () => {
    if (shareButton.disabled) return;
    pendingAction = { type: 'share', trigger: shareButton };
    dialogTitle.textContent = 'Bu not adayın ekranında görünecek. Devam etmek istiyor musun?';
    dialog.querySelector('button[value="confirm"]').textContent = 'Onayla';
    dialog.showModal();
    dialog.querySelector('button[value="cancel"]').focus();
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
  dialog.addEventListener('close', () => {
    const action = pendingAction;
    pendingAction = null;
    if (dialog.returnValue === 'confirm' && action?.type === 'share') {
      addNote('Adayla paylaşıldı');
      textarea.focus();
    } else if (dialog.returnValue === 'confirm' && action?.type === 'delete') {
      action.card.remove();
      if (editingCard === action.card) {
        editingCard = null;
        textarea.value = '';
        updateCounter();
      }
      updateNotesCount();
      showToast('Not silindi.');
      textarea.focus();
    } else {
      if (action?.type === 'delete') {
        dialog.querySelector('button[value="confirm"]').textContent = 'Onayla';
        dialogTitle.textContent = 'Bu not adayın ekranında görünecek. Devam etmek istiyor musun?';
      }
      action?.trigger?.focus();
    }
  });
  notesList.classList.add('note-history-list');
  Array.from(notesList.querySelectorAll('div')).filter(card =>
    card.classList.contains('bg-[#FFFFFF]')
  ).forEach(card => {
    const header = card.querySelector('.flex.items-center.justify-between');
    if (!header) return;
    const badge = Array.from(header.querySelectorAll('span')).find(element =>
      element !== header.firstElementChild
    );
    const session = badge?.textContent.trim() || 'Seans 1';
    const dateText = header.firstElementChild?.textContent.trim() || '';
    const noteText = card.querySelector('p')?.textContent.trim() || '';
    const styledCard = createNoteCard('Adayla paylaşıldı', session, noteText, dateText);
    card.replaceWith(styledCard);
  });
  cancelEditButton.hidden = true;
  document.addEventListener('click', event => {
    const control = event.target.closest('button, a, [role="button"]');
    if (control?.textContent.replace(/\s+/g, ' ').trim() !== 'Not Yaz') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    textarea.focus();
  }, true);
  const flowNav = document.getElementById('demo-flow-nav');
  flowNav?.classList.add('demo-only');
  updateCounter();
  updateNotesCount();
})();
