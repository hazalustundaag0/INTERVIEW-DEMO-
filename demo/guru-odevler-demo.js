// guru-odevler-demo.js — Guru · ödev / belge talepleri (guru-odevler.html). Sahibi: 84 Guru Panel UI.
// Veri: GET/POST /guru/enrollments/{id}/assignments · PATCH /guru/assignments/{id} {status: reviewed|cancelled}
//       GET /guru/assignments/{id}/file (teslim dosyası, Api.download)
// Tür eşlemesi: "Ödev" → homework, "Belge" → document_request. "Soru" türünün backend karşılığı yok → gizlenir.
// Son tarih: tarih alanı (Europe/Istanbul 23:59 → UTC due_at). Yerel depolamadaki eski talep listesi kaldırıldı.
(function () {
  'use strict';
  if (!window.Api || !window.GuruPanel) return;
  const Api = window.Api;
  const G = window.GuruPanel;

  const taskTypeButtons = Array.from(document.querySelectorAll('button')).filter(button =>
    ['Ödev', 'Belge', 'Soru'].includes(button.textContent.trim()));
  const cardTitle = Array.from(document.querySelectorAll('h2')).find(heading => heading.textContent.trim() === 'Yeni talep');
  const card = cardTitle?.parentElement;
  const sendButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Adaya Gönder');
  const actionRow = sendButton?.parentElement;
  const formWrapper = actionRow?.parentElement;
  const deadlineInput = actionRow?.querySelector('input[type="text"], input[type="date"]');
  const givenHeading = Array.from(document.querySelectorAll('h3')).find(heading => heading.textContent.trim() === 'Verilenler');
  const givenList = givenHeading?.nextElementSibling;
  if (taskTypeButtons.length !== 3 || !formWrapper || !deadlineInput || !sendButton || !givenList || !card) {
    console.error('Danışan ödev formunun gerekli alanları bulunamadı.');
    return;
  }
  givenList.classList.add('advisor-given-list');
  sendButton.dataset.action = 'assignment-create';

  const KIND = { 'Ödev': 'homework', 'Belge': 'document_request' };
  const KIND_LABEL = { homework: 'Ödev', document_request: 'Belge' };
  const STATUS_LABEL = { open: 'Bekliyor', submitted: 'Teslim edildi', reviewed: 'İncelendi', cancelled: 'İptal edildi' };

  // "Soru" türü: backend'de karşılığı yok (Assignment.kind = homework | document_request).
  taskTypeButtons.find(button => button.textContent.trim() === 'Soru')?.remove();
  const typeButtons = taskTypeButtons.filter(button => button.isConnected);

  // Son tarih: tasarımdaki metin kutusu tarih seçiciye dönüşür (ikon korunur).
  deadlineInput.type = 'date';
  deadlineInput.value = '';
  deadlineInput.min = window.SlotTime ? window.SlotTime.today() : new Date().toISOString().slice(0, 10);
  deadlineInput.id = 'assignment-due';
  deadlineInput.setAttribute('aria-label', 'Son tarih');
  deadlineInput.nextElementSibling?.classList.contains('material-symbols-outlined') && deadlineInput.nextElementSibling.remove();
  const dueLabel = deadlineInput.closest('.flex-col')?.querySelector('label');
  if (dueLabel) dueLabel.htmlFor = deadlineInput.id;

  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'flex flex-col gap-4';
  formWrapper.insertBefore(fieldContainer, actionRow);
  Array.from(formWrapper.children).forEach(child => {
    if (child !== fieldContainer && child !== actionRow) child.remove();
  });
  const feedback = document.createElement('p');
  feedback.className = 'text-[13px] mt-2';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  card.appendChild(feedback);

  let selectedType = 'Ödev';
  const drafts = { 'Ödev': { title: '', details: '' }, 'Belge': { title: '', details: '' } };
  let enrollmentId = null;
  let assignments = [];

  const INPUT_CLASS = 'w-full border border-[#7564C7] rounded-[6px] px-3 py-2 text-[14px] text-[#1E1E1C] bg-white focus:outline-none focus:border-[#51409D]';
  function makeField(labelText, control, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1.5';
    const label = document.createElement('label');
    label.className = 'text-[11px] font-semibold text-[#7564C7] uppercase tracking-wider';
    label.textContent = labelText;
    control.id = id;
    control.name = id.replace('assignment-', '');
    label.htmlFor = id;
    const error = document.createElement('p');
    error.className = 'api-field-error';
    error.id = id + '-error';
    error.hidden = true;
    wrapper.append(label, control, error);
    return wrapper;
  }

  function renderForm() {
    const draft = drafts[selectedType];
    const title = document.createElement('input');
    title.type = 'text';
    title.maxLength = 200;
    title.value = draft.title;
    title.placeholder = selectedType + ' başlığı';
    title.className = INPUT_CLASS;
    title.dataset.taskTitle = 'true';
    title.addEventListener('input', () => { draft.title = title.value; });
    const details = document.createElement('textarea');
    details.rows = 3;
    details.className = INPUT_CLASS;
    details.placeholder = selectedType === 'Belge'
      ? 'İstenen belgeyi ve yükleme biçimini açıklayın...'
      : 'Ödevin içeriğini ve nasıl tamamlanacağını açıklayın...';
    details.value = draft.details;
    details.dataset.taskDetails = 'true';
    details.addEventListener('input', () => { draft.details = details.value; });
    fieldContainer.replaceChildren(
      makeField('Başlık', title, 'assignment-title'),
      makeField(selectedType === 'Belge' ? 'Belge açıklaması' : 'Ödev açıklaması', details, 'assignment-description')
    );
    feedback.textContent = '';
  }

  function selectType(type) {
    selectedType = type;
    typeButtons.forEach(button => {
      const isSelected = button.textContent.trim() === type;
      button.className = 'theme-choice-chip cursor-pointer';
      button.setAttribute('aria-pressed', String(isSelected));
    });
    renderForm();
  }

  // ─── Verilenler listesi ────────────────────────────────────────────────────
  function dueText(assignment) {
    return assignment.due_at ? '· Son tarih ' + Api.format.date(assignment.due_at, { day: 'numeric', month: 'long' }) : '· Son tarih belirtilmedi';
  }

  function rowFor(assignment) {
    const row = document.createElement('div');
    row.className = 'bg-[#FFFFFF] border border-[#7564C7] rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-[#51409D] transition-colors';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.dataset.navSkip = '';
    row.title = 'Detayları görmek için tıklayın';
    const textGroup = document.createElement('div');
    textGroup.className = 'flex items-center gap-2';
    const title = document.createElement('span');
    title.className = 'text-[14px] font-medium text-[#1E1E1C]';
    title.textContent = assignment.title;
    const deadline = document.createElement('span');
    deadline.className = 'text-[13px] text-[#7564C7]';
    deadline.textContent = dueText(assignment);
    textGroup.append(title, deadline);
    const details = document.createElement('div');
    details.className = 'flex items-center gap-2 shrink-0';
    const type = document.createElement('span');
    type.className = 'advisor-task-type-badge px-2.5 py-0.5 rounded-full text-[12px] font-medium';
    type.textContent = KIND_LABEL[assignment.kind] || assignment.kind;
    const status = document.createElement('span');
    status.className = 'advisor-task-status-badge px-2.5 py-0.5 rounded-full text-[12px] font-medium';
    status.textContent = STATUS_LABEL[assignment.status] || assignment.status;
    details.append(type, status);
    row.append(textGroup, details);
    row.addEventListener('click', () => openTaskModal(assignment));
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTaskModal(assignment); }
    });
    return row;
  }

  function renderList() {
    const sorted = assignments.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    if (!sorted.length) {
      const empty = document.createElement('p');
      empty.className = 'text-[14px] text-muted';
      empty.textContent = 'Henüz talep göndermedin.';
      givenList.replaceChildren(empty);
    } else {
      givenList.replaceChildren(...sorted.map(rowFor));
    }
    givenHeading.textContent = 'Verilenler';
  }

  // ─── Detay penceresi (DOM ile; kullanıcı metni innerHTML'e girmez) ──────────
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;';
  overlay.dataset.navSkip = '';
  document.body.appendChild(overlay);
  let lastTrigger = null;

  function node(tag, style, text) {
    const el = document.createElement(tag);
    if (style) el.style.cssText = style;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function closeModal() {
    overlay.style.display = 'none';
    overlay.replaceChildren();
    lastTrigger?.focus?.();
  }
  const BTN_PRIMARY = 'padding:9px 18px;border-radius:8px;border:0;background:#51409D;color:#FFFFFF;font-size:14px;font-weight:500;cursor:pointer;';
  const BTN_SECONDARY = 'padding:9px 18px;border-radius:8px;border:1px solid #51409D;background:#FFFFFF;color:#51409D;font-size:14px;font-weight:500;cursor:pointer;';

  function openTaskModal(assignment) {
    lastTrigger = document.activeElement;
    const box = node('div', "background:#FFFFFF;border-radius:14px;padding:24px;width:100%;max-width:540px;max-height:85vh;overflow-y:auto;box-shadow:0 16px 40px rgba(0,0,0,0.2);font-family:'IBM Plex Sans',sans-serif;color:#1E1E1C;");
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'assignment-modal-title');
    const head = node('div', 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;');
    const headText = node('div');
    const meta = node('div', 'display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;');
    meta.append(
      node('span', 'padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:rgba(81, 64, 157, 0.1);color:#51409D;', KIND_LABEL[assignment.kind]),
      node('span', 'padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#EEECFF;color:#51409D;', STATUS_LABEL[assignment.status]),
      node('span', 'font-size:13px;color:#7564C7;', dueText(assignment).replace(/^· /, ''))
    );
    const title = node('h3', 'margin:0;font-size:18px;font-weight:600;color:#1E1E1C;', assignment.title);
    title.id = 'assignment-modal-title';
    headText.append(meta, title);
    const close = node('button', 'background:transparent;border:0;cursor:pointer;color:#7564C7;padding:4px;');
    close.type = 'button';
    close.setAttribute('aria-label', 'Kapat');
    close.appendChild(node('span', '', 'close')).className = 'material-symbols-outlined';
    close.addEventListener('click', closeModal);
    head.append(headText, close);

    const descBox = node('div', 'background:#F8F7FF;border:1px solid #BCB7F5;border-radius:8px;padding:14px;margin-top:12px;');
    descBox.append(
      node('div', 'font-size:12px;font-weight:600;color:#7564C7;text-transform:uppercase;margin-bottom:4px;', assignment.kind === 'document_request' ? 'İstenen belge açıklaması' : 'Ödev yönergesi'),
      node('div', 'font-size:14px;color:#1E1E1C;line-height:1.5;white-space:pre-line;', assignment.description || '—')
    );

    const submission = node('div', 'background:#FFFFFF;border:1px dashed #7564C7;border-radius:8px;padding:12px 14px;margin-top:12px;display:flex;flex-direction:column;gap:8px;');
    submission.appendChild(node('div', 'font-size:12px;font-weight:600;color:#7564C7;text-transform:uppercase;', 'Adayın teslimi'));
    if (assignment.status === 'open' || (!assignment.submitted_at && !assignment.submission_text && !assignment.has_submission_file)) {
      submission.appendChild(node('div', 'font-size:14px;color:#7564C7;', assignment.status === 'cancelled' ? 'Talep iptal edildi.' : 'Adayın teslimi bekleniyor...'));
    } else {
      if (assignment.submitted_at) submission.appendChild(node('div', 'font-size:13px;color:#7564C7;', 'Teslim tarihi: ' + Api.format.dateTime(assignment.submitted_at)));
      if (assignment.submission_text) submission.appendChild(node('div', 'font-size:14px;color:#1E1E1C;line-height:1.5;white-space:pre-line;word-break:break-word;', assignment.submission_text));
      if (assignment.has_submission_file) {
        const download = node('button', BTN_SECONDARY + 'align-self:flex-start;display:inline-flex;align-items:center;gap:6px;');
        download.type = 'button';
        download.dataset.action = 'assignment-download';
        const icon = node('span', 'font-size:20px;', 'description');
        icon.className = 'material-symbols-outlined';
        download.append(icon, document.createTextNode('Teslim dosyasını indir'));
        download.addEventListener('click', async () => {
          try {
            await Api.ui.withLoading(download, () => Api.download(`/guru/assignments/${assignment.id}/file`), { text: 'İndiriliyor…' });
          } catch (error) {
            Api.ui.showError(submission, error, { position: 'append' });
          }
        });
        submission.appendChild(download);
      }
    }

    const footer = node('div', 'display:flex;justify-content:flex-end;gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid #DEDaf4;flex-wrap:wrap;');
    function statusButton(label, status, style) {
      const button = node('button', style, label);
      button.type = 'button';
      button.dataset.action = 'assignment-' + status;
      button.addEventListener('click', async () => {
        Api.ui.clearError(footer);
        try {
          const updated = await Api.ui.withLoading(button, () => Api.patch(`/guru/assignments/${assignment.id}`, { status }), { text: 'Kaydediliyor…' });
          assignments = assignments.map(a => (a.id === updated.id ? updated : a));
          renderList();
          closeModal();
          G.toast(status === 'reviewed' ? 'Teslim incelendi olarak işaretlendi.' : 'Talep iptal edildi.');
        } catch (error) {
          Api.ui.showError(footer, error, { position: 'before' });
        }
      });
      return button;
    }
    if (assignment.status === 'submitted') footer.appendChild(statusButton('İncelendi olarak işaretle', 'reviewed', BTN_PRIMARY));
    if (assignment.status === 'open') footer.appendChild(statusButton('Talebi iptal et', 'cancelled', BTN_SECONDARY));
    const closeButton = node('button', assignment.status === 'submitted' || assignment.status === 'open' ? BTN_SECONDARY : BTN_PRIMARY, 'Kapat');
    closeButton.type = 'button';
    closeButton.addEventListener('click', closeModal);
    footer.appendChild(closeButton);

    box.append(head, descBox, submission, footer);
    overlay.replaceChildren(box);
    overlay.style.display = 'flex';
    close.focus();
  }
  overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.style.display === 'flex') closeModal();
  });

  // ─── Gönder ────────────────────────────────────────────────────────────────
  function showFeedback(message, ok) {
    feedback.className = 'text-[13px] mt-2 ' + (ok ? 'text-[#51409D] font-medium' : 'text-[#B42318]');
    feedback.textContent = message;
  }

  function dueAtFromInput() {
    const value = deadlineInput.value;
    if (!value) return null;
    return window.SlotTime ? window.SlotTime.toUtcIso(value, '23:59') : new Date(value + 'T23:59:00+03:00').toISOString();
  }

  typeButtons.forEach(button => {
    const type = button.textContent.trim();
    button.type = 'button';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      selectType(type);
    });
  });

  sendButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    if (!enrollmentId) return;
    const title = fieldContainer.querySelector('[data-task-title]')?.value.trim() || '';
    const description = fieldContainer.querySelector('[data-task-details]')?.value.trim() || '';
    Api.ui.clearFieldErrors(card);
    if (!title) { showFeedback('Lütfen talep için bir başlık yazın.'); fieldContainer.querySelector('[data-task-title]')?.focus(); return; }
    if (!description) {
      showFeedback(selectedType === 'Belge' ? 'İstenen belge için kısa bir açıklama ekleyin.' : 'Ödevin nasıl yapılacağını açıklayın.');
      fieldContainer.querySelector('[data-task-details]')?.focus();
      return;
    }
    if (deadlineInput.value && deadlineInput.value < deadlineInput.min) { showFeedback('Son tarih geçmiş bir gün olamaz.'); deadlineInput.focus(); return; }
    try {
      const created = await Api.ui.withLoading(sendButton, () => Api.post(`/guru/enrollments/${enrollmentId}/assignments`, {
        kind: KIND[selectedType], title, description, due_at: dueAtFromInput()
      }), { text: 'Gönderiliyor…' });
      assignments = [created].concat(assignments);
      renderList();
      drafts[selectedType] = { title: '', details: '' };
      deadlineInput.value = '';
      renderForm();
      showFeedback('✓ ' + selectedType + ' talebi ' + (document.querySelector('section h1')?.textContent.trim() || 'danışana') + ' gönderildi ve "Verilenler" listesine eklendi.', true);
    } catch (error) {
      if (error.isValidation) {
        Api.ui.applyFieldErrors(card, error, { map: { title: '#assignment-title', description: '#assignment-description', due_at: '#assignment-due' } });
      }
      showFeedback(Api.ui.message(error));
    }
  });

  async function load() {
    selectType('Ödev');
    sendButton.disabled = true;
    try {
      const brief = await G.loadClient();
      if (!brief) {
        G.showState(card, { icon: 'person_search', title: 'Danışan seçilmedi', text: 'Danışanlarım listesinden bir danışan aç.' });
        return;
      }
      enrollmentId = brief.enrollment.id;
      assignments = await Api.listAll(`/guru/enrollments/${enrollmentId}/assignments`);
      renderList();
      sendButton.disabled = brief.enrollment.status !== 'active';
      if (sendButton.disabled) showFeedback('Bu kayıt aktif olmadığı için yeni talep gönderilemez.');
    } catch (error) {
      G.errorState(givenList, error, error.status === 404 ? { title: 'Danışan bulunamadı', text: 'Bu kayıt sana atanmış değil ya da artık yok.' } : {});
    }
  }

  load();
})();
