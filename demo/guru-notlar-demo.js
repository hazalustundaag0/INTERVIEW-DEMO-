// guru-notlar-demo.js — Guru · seans notları (guru-notlar.html). Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/stories/{storyID}/notes (gizli dahil) · POST /guru/stories/{storyID}/notes
//       PUT /guru/notes/{noteID} {note_text, is_visible_to_candidate} · DELETE /guru/notes/{noteID}
// "Hangi seans için?" → note_kind (GAP-B17: notun seans ilişkisi yok): Seans 1 → first_session_note,
// Seans 2 → feedback; hikâyedeki cümle notları (sentence_comment) "Cümle notu" olarak listelenir.
// "Taslak" = is_visible_to_candidate:false; "Adayla paylaşıldı" = true (adayda anında görünür, FR-82).
(function () {
  'use strict';
  if (!window.Api || !window.GuruPanel) return;
  const Api = window.Api;
  const G = window.GuruPanel;

  const section = Array.from(document.querySelectorAll('section')).find(element =>
    element.classList.contains('lg:col-span-8') &&
    Array.from(element.querySelectorAll('h2')).some(heading => heading.textContent.trim() === 'Seans notu')
  );
  if (!section) return;
  document.body.classList.add('guru-notes-page');

  const heading = Array.from(section.querySelectorAll('h2')).find(element => element.textContent.trim() === 'Seans notu');
  const editorCard = heading?.parentElement;
  const textarea = editorCard?.querySelector('textarea');
  const saveContainer = editorCard?.querySelector('button')?.parentElement;
  const previousHeading = Array.from(section.querySelectorAll('h3')).find(element => element.textContent.trim() === 'Önceki notlar');
  const notesList = previousHeading?.parentElement;
  if (!editorCard || !textarea || !saveContainer || !notesList) return;
  const tabList = Array.from(section.querySelectorAll('div')).find(element =>
    Array.from(element.querySelectorAll(':scope > button')).some(button => button.textContent.trim() === 'Notlar'));
  const noteTabs = tabList ? Array.from(tabList.querySelectorAll(':scope > button')) : [];

  const KIND_LABEL = { first_session_note: 'Seans 1', feedback: 'Seans 2', sentence_comment: 'Cümle notu' };
  const STATUS = { draft: 'Taslak', shared: 'Adayla paylaşıldı' };

  editorCard.classList.add('note-editor-card');
  heading.id = 'note-editor-title';
  textarea.classList.add('note-editor-textarea');
  textarea.maxLength = 1000;
  textarea.value = '';
  textarea.setAttribute('aria-labelledby', heading.id);
  const description = Array.from(editorCard.querySelectorAll('p')).find(element => element.textContent.includes('Bu not adayın ana ekranında'));
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
  [['first_session_note', 'Seans 1'], ['feedback', 'Seans 2']].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
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
  draftButton.dataset.action = 'note-save-draft';
  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'note-share';
  shareButton.dataset.action = 'note-share';
  const cancelEditButton = document.createElement('button');
  cancelEditButton.type = 'button';
  cancelEditButton.className = 'note-cancel-edit';
  cancelEditButton.textContent = 'Düzenlemeyi iptal et';
  cancelEditButton.hidden = true;
  saveContainer.className = 'note-save-actions';
  saveContainer.replaceChildren(draftButton, shareButton, cancelEditButton);
  oldButton?.remove();

  const dialog = document.createElement('dialog');
  dialog.className = 'note-share-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'note-share-dialog-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="note-share-dialog-title"></h2>
      <div class="note-dialog-actions">
        <button type="submit" value="cancel">İptal</button>
        <button type="submit" value="confirm" data-action="note-dialog-confirm">Onayla</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const dialogTitle = dialog.querySelector('#note-share-dialog-title');
  const dialogConfirm = dialog.querySelector('button[value="confirm"]');

  let notes = [];
  let storyId = null;
  let editing = null; // GuruNote
  let pendingAction = null;
  let busy = false;

  function toast(message) { G.toast(message, 'note-toast'); }

  function updateCounter() {
    counter.textContent = `${textarea.value.length} / 1000`;
    const disabled = busy || !storyId || textarea.value.trim().length === 0;
    [draftButton, shareButton].forEach(button => {
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
    });
    draftButton.textContent = editing ? 'Taslağı güncelle' : 'Taslak kaydet';
    shareButton.textContent = editing ? 'Güncelle ve adayla paylaş' : 'Kaydet ve adayla paylaş';
    cancelEditButton.hidden = !editing;
    // PUT note_kind değiştiremez: düzenlemede seans seçimi kilitli.
    sessionSelect.disabled = Boolean(editing) || !storyId;
  }

  const emptyState = document.createElement('p');
  emptyState.className = 'note-empty-state';
  emptyState.textContent = 'Henüz not yok.';

  function updateNotesCount() {
    previousHeading.textContent = `Önceki notlar (${notes.length})`;
    emptyState.hidden = notes.length > 0;
    noteTabs.forEach(tab => {
      const label = tab.dataset.noteTabLabel;
      tab.replaceChildren(document.createTextNode(label));
      if (label === 'Notlar') {
        const count = document.createElement('span');
        count.className = 'note-tab-count';
        count.textContent = `(${notes.length})`;
        tab.append(count);
      }
    });
  }

  function dateText(iso) {
    return `${Api.format.date(iso, { day: 'numeric', month: 'long' })} · ${Api.format.time(iso)}`;
  }

  function noteCard(note) {
    const card = document.createElement('article');
    card.className = 'note-history-card';
    const status = note.is_visible_to_candidate ? STATUS.shared : STATUS.draft;
    const session = KIND_LABEL[note.note_kind] || 'Not';
    card.dataset.noteStatus = status;
    card.dataset.noteSession = session;
    card.dataset.noteId = note.id;
    const top = document.createElement('div');
    top.className = 'note-history-header';
    const date = document.createElement('span');
    date.className = 'note-history-date';
    date.textContent = `${session}${note.sentence_no ? ' (cümle ' + note.sentence_no + ')' : ''} · ${dateText(note.updated_at || note.created_at)}`;
    const badges = document.createElement('div');
    badges.className = 'note-history-badges';
    const badge = document.createElement('span');
    badge.className = 'note-status-badge';
    badge.textContent = status;
    badges.append(badge);
    top.append(date, badges);
    const text = document.createElement('p');
    text.className = 'note-history-text';
    text.textContent = note.note_text;
    const actions = document.createElement('div');
    actions.className = 'note-history-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'note-history-edit';
    edit.textContent = 'Düzenle';
    edit.setAttribute('aria-label', `${session} notunu düzenle`);
    edit.addEventListener('click', () => {
      editing = note;
      textarea.value = note.note_text;
      if (note.note_kind !== 'sentence_comment') sessionSelect.value = note.note_kind;
      updateCounter();
      textarea.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'note-history-delete';
    remove.dataset.action = 'note-delete';
    remove.textContent = 'Sil';
    remove.setAttribute('aria-label', `${session} notunu sil`);
    remove.addEventListener('click', () => {
      pendingAction = { type: 'delete', note, trigger: remove };
      dialogTitle.textContent = 'Bu notu silmek istiyor musun?';
      dialogConfirm.textContent = 'Sil';
      dialog.showModal();
      dialog.querySelector('button[value="cancel"]').focus();
    });
    actions.append(edit, remove);
    card.append(top, text, actions);
    return card;
  }

  function renderNotes() {
    const sorted = notes.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    notesList.querySelectorAll('.note-history-card').forEach(card => card.remove());
    notesList.classList.add('note-history-list');
    sorted.forEach(note => notesList.append(noteCard(note)));
    if (!emptyState.isConnected) notesList.append(emptyState);
    updateNotesCount();
  }

  async function save(visible) {
    const text = textarea.value.trim();
    if (!text || !storyId) return;
    busy = true;
    updateCounter();
    Api.ui.clearError(editorCard);
    const button = visible ? shareButton : draftButton;
    try {
      const saved = await Api.ui.withLoading(button, () => editing
        ? Api.put('/guru/notes/' + editing.id, { note_text: text, is_visible_to_candidate: visible })
        : Api.post(`/guru/stories/${storyId}/notes`, { note_kind: sessionSelect.value, note_text: text, is_visible_to_candidate: visible }),
      { text: 'Kaydediliyor…' });
      notes = editing ? notes.map(n => (n.id === saved.id ? saved : n)) : [saved].concat(notes);
      editing = null;
      textarea.value = '';
      renderNotes();
      toast(visible ? 'Not adayla paylaşıldı.' : 'Not taslak olarak kaydedildi.');
    } catch (error) {
      Api.ui.showError(editorCard, error, { position: 'append' });
    } finally {
      busy = false;
      updateCounter();
    }
  }

  async function removeNote(note, trigger) {
    try {
      await Api.ui.withLoading(trigger, () => Api.del('/guru/notes/' + note.id));
      notes = notes.filter(n => n.id !== note.id);
      if (editing && editing.id === note.id) { editing = null; textarea.value = ''; }
      renderNotes();
      updateCounter();
      toast('Not silindi.');
      textarea.focus();
    } catch (error) {
      Api.ui.showError(notesList, error, { position: 'before' });
    }
  }

  textarea.addEventListener('input', updateCounter);
  cancelEditButton.addEventListener('click', () => {
    editing = null;
    textarea.value = '';
    updateCounter();
    textarea.focus();
  });
  draftButton.addEventListener('click', () => { if (!draftButton.disabled) save(false); });
  shareButton.addEventListener('click', () => {
    if (shareButton.disabled) return;
    pendingAction = { type: 'share', trigger: shareButton };
    dialogTitle.textContent = 'Bu not adayın ekranında görünecek. Devam etmek istiyor musun?';
    dialogConfirm.textContent = 'Onayla';
    dialog.showModal();
    dialog.querySelector('button[value="cancel"]').focus();
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dialog.close('cancel'); }
  });
  dialog.addEventListener('close', () => {
    const action = pendingAction;
    pendingAction = null;
    if (!action) return;
    if (dialog.returnValue !== 'confirm') { action.trigger?.focus(); return; }
    if (action.type === 'share') save(true);
    else if (action.type === 'delete') removeNote(action.note, action.trigger);
  });

  // Hikâye sayfasındaki "Not Yaz" bu sayfada editöre odaklanır.
  document.addEventListener('click', event => {
    const control = event.target.closest('button, a, [role="button"]');
    if (control?.textContent.replace(/\s+/g, ' ').trim() !== 'Not Yaz') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    textarea.focus();
  }, true);

  async function load() {
    updateCounter();
    try {
      const brief = await G.loadClient();
      if (!brief) {
        G.showState(editorCard, { icon: 'person_search', title: 'Danışan seçilmedi', text: 'Danışanlarım listesinden bir danışan aç.' });
        return;
      }
      storyId = brief.story && brief.story.id;
      if (!storyId) {
        G.showState(editorCard, { icon: 'info', text: 'Bu kayıt için hikâye oturumu açılmadığından not eklenemiyor.' });
        updateCounter();
        return;
      }
      notes = await Api.listAll(`/guru/stories/${storyId}/notes`);
      renderNotes();
      updateCounter();
    } catch (error) {
      G.errorState(notesList, error, error.status === 404 ? { title: 'Danışan bulunamadı', text: 'Bu kayıt sana atanmış değil ya da artık yok.' } : {});
    }
  }

  updateNotesCount();
  load();
})();
