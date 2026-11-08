// odevler-page.js — Ödevlerim / ödev teslimi / teslim görüntüleme (83). demoOdevler (localStorage) ve örnek
// ödevler kaldırıldı (GAP-U13); guru-odevler (84) ile aynı kaynak:
//   GET  /candidate/enrollments/{id}/assignments → Assignment[] (kind homework|document_request, status open|submitted|reviewed|cancelled)
//   POST /candidate/assignments/{id}/submission  → JSON {text} veya multipart text + file (PDF/DOCX ≤10 MB, K38)
//   GET  /candidate/assignments/{id}/file        → teslim edilen dosya (Bearer ile indirme)
// Sayfa: odevler.html (liste), odev-teslim.html?id=<uuid>, odev-goruntule.html?id=<uuid>.
(function () {
  'use strict';
  const PAGE = location.pathname.split('/').pop();
  const assignmentId = new URLSearchParams(location.search).get('id');

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const fmtDate = iso => window.Api.format.date(iso, { day: 'numeric', month: 'long' });
  const kindLabel = item => item.kind === 'document_request' ? 'belge' : 'ödev';

  async function loadAll() {
    const ctx = await window.Journey.load();
    if (!ctx.enrollment) return { ctx, items: [] };
    const items = await window.Journey.assignments(ctx);
    window.Journey.applySidebar(ctx, { assignments: items });
    window.Journey.prerequisites(ctx).then(pre => window.Journey.applySidebar(ctx, { prerequisites: pre })).catch(() => {});
    return { ctx, items };
  }

  // ─── Liste ─────────────────────────────────────────────────────────────────
  function initList() {
    const list = document.querySelector('main section .divide-y');
    if (!list) return;
    const card = list.parentElement;
    list.replaceChildren();
    list.hidden = true;

    function row(item) {
      const delivered = item.status === 'submitted' || item.status === 'reviewed';
      const wrap = el('div', 'flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 bg-[#FFFFFF]');
      const left = el('div', 'flex items-center gap-3.5');
      const iconBox = el('div', 'w-10 h-10 rounded-[8px] bg-surface-container-low text-[#51409D] flex items-center justify-center shrink-0');
      iconBox.appendChild(el('span', 'material-symbols-outlined text-[22px]', item.kind === 'document_request' ? 'description' : 'assignment'));
      const text = el('div', 'flex flex-col');
      text.append(el('h2', 'text-[16px] font-semibold text-[#1E1E1C] leading-tight', item.title));
      const secondary = delivered && item.submitted_at ? 'Teslim edildi ' + fmtDate(item.submitted_at)
        : item.due_at ? 'Son tarih ' + fmtDate(item.due_at) : item.kind === 'document_request' ? 'Belge talebi' : 'Ödev';
      text.append(el('span', 'text-[14px] text-muted mt-0.5', secondary));
      left.append(iconBox, text);
      const right = el('div', 'flex items-center gap-3 shrink-0 self-end sm:self-center');
      const label = { open: 'Bekliyor', submitted: 'Teslim edildi', reviewed: 'İncelendi', cancelled: 'İptal edildi' }[item.status] || item.status;
      right.appendChild(el('span', 'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#EEECFF] text-[#51409D]', label));
      if (item.status === 'open') {
        const button = el('a', 'inline-flex items-center justify-center px-4 py-2 rounded-[8px] bg-[#51409D] text-on-primary font-semibold text-[14px] shadow-sm hover:opacity-90 transition-all', 'Teslim Et');
        button.href = 'odev-teslim.html?id=' + encodeURIComponent(item.id);
        button.setAttribute('data-nav-skip', '');
        right.appendChild(button);
      } else if (delivered) {
        const link = el('a', 'text-[14px] font-semibold text-[#51409D] hover:underline underline-offset-4 py-1', 'Görüntüle');
        link.href = 'odev-goruntule.html?id=' + encodeURIComponent(item.id);
        link.setAttribute('data-nav-skip', '');
        right.appendChild(link);
      }
      wrap.append(left, right);
      return wrap;
    }

    (async () => {
      try {
        const { ctx, items } = await loadAll();
        if (!ctx.enrollment) { window.Journey.showNoEnrollment(card); return; }
        const visible = items.slice().sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || Date.parse(b.created_at) - Date.parse(a.created_at));
        if (!visible.length) {
          window.Api.ui.showError(card, 'Danışmanın henüz bir ödev ya da belge talebi göndermedi.', { tone: 'info' });
          return;
        }
        visible.forEach(item => list.appendChild(row(item)));
        list.hidden = false;
        const params = new URLSearchParams(location.search);
        if (params.get('teslim') === '1') {
          window.Api.ui.showError(card, 'Ödevin teslim edildi. Danışmanın görebilir.', { tone: 'info' });
          params.delete('teslim');
          const query = params.toString();
          history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
        }
      } catch (error) {
        window.Api.ui.showError(card, error);
      }
    })();
  }

  // ─── Teslim ────────────────────────────────────────────────────────────────
  function initSubmit() {
    const title = document.getElementById('task-title');
    const description = document.getElementById('task-description');
    const quote = document.querySelector('p.italic');
    const form = document.getElementById('submission-form');
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const fileSummary = document.getElementById('file-summary');
    const selectedFile = document.getElementById('selected-file');
    const textArea = document.getElementById('answer-text');
    const error = document.getElementById('form-error');
    const submit = form && form.querySelector('button[type="submit"]');
    if (!form || !submit) return;
    submit.setAttribute('data-action', 'assignment-submit');
    submit.disabled = true;
    if (quote) quote.parentElement.hidden = true;
    let currentTab = 'file';
    let file = null;
    let item = null;

    function showError(message) { error.textContent = message; error.classList.remove('hidden'); }
    function clearError() { error.textContent = ''; error.classList.add('hidden'); }
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    function setFile(candidate) {
      clearError();
      const message = window.Api.validateFile(candidate, ['pdf', 'docx']);
      if (message) {
        file = null;
        fileInput.value = '';
        selectedFile.classList.add('hidden');
        selectedFile.classList.remove('flex');
        showError(message);
        return;
      }
      file = candidate;
      fileSummary.textContent = candidate.name + ' · ' + formatSize(candidate.size);
      selectedFile.classList.remove('hidden');
      selectedFile.classList.add('flex');
    }
    function selectTab(tab) {
      currentTab = tab;
      const fileActive = tab === 'file';
      const on = 'border-b-2 border-[#51409D] pb-3 text-[14px] font-semibold text-[#51409D]';
      const off = 'border-b-2 border-transparent pb-3 text-[14px] font-semibold text-muted hover:text-[#1E1E1C]';
      document.getElementById('file-tab').className = fileActive ? on : off;
      document.getElementById('text-tab').className = fileActive ? off : on;
      document.getElementById('file-tab').setAttribute('aria-selected', String(fileActive));
      document.getElementById('text-tab').setAttribute('aria-selected', String(!fileActive));
      document.getElementById('file-panel').classList.toggle('hidden', !fileActive);
      document.getElementById('text-panel').classList.toggle('hidden', fileActive);
      document.getElementById('text-panel').hidden = fileActive;
      clearError();
    }
    document.getElementById('file-tab').addEventListener('click', () => selectTab('file'));
    document.getElementById('text-tab').addEventListener('click', () => selectTab('text'));
    fileInput.addEventListener('change', () => { if (fileInput.files.length) setFile(fileInput.files[0]); });
    document.getElementById('remove-file').addEventListener('click', event => {
      event.preventDefault();
      file = null;
      fileInput.value = '';
      selectedFile.classList.add('hidden');
      selectedFile.classList.remove('flex');
      clearError();
    });
    ['dragenter', 'dragover'].forEach(name => dropArea.addEventListener(name, event => { event.preventDefault(); dropArea.classList.add('border-[#51409D]', 'bg-[#F8F7FF]'); }));
    ['dragleave', 'drop'].forEach(name => dropArea.addEventListener(name, event => { event.preventDefault(); dropArea.classList.remove('border-[#51409D]', 'bg-[#F8F7FF]'); }));
    dropArea.addEventListener('drop', event => { if (event.dataTransfer.files.length) setFile(event.dataTransfer.files[0]); });
    textArea.addEventListener('input', clearError);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      clearError();
      if (!item || item.status !== 'open') return;
      const text = textArea.value.trim();
      if ((currentTab === 'file' && !file) || (currentTab === 'text' && !text)) {
        showError('Teslim etmek için bir dosya seç ya da metin yaz.');
        return;
      }
      const path = '/candidate/assignments/' + encodeURIComponent(item.id) + '/submission';
      try {
        await window.Api.ui.withLoading(submit, () => currentTab === 'file'
          ? window.Api.upload(path, { file, fields: text ? { text } : {} })
          : window.Api.post(path, { text }), { text: 'Gönderiliyor…' });
        location.href = 'odevler.html?teslim=1';
      } catch (err) {
        showError(window.Api.ui.message(err));
      }
    });

    (async () => {
      try {
        const { ctx, items } = await loadAll();
        if (!ctx.enrollment) { window.Journey.showNoEnrollment(form); return; }
        item = items.find(entry => entry.id === assignmentId) || null;
        if (!item) {
          title.textContent = 'Ödev bulunamadı';
          description.textContent = 'Bu ödev listende bulunamadı.';
          return;
        }
        const guru = await window.Journey.guru(ctx);
        title.textContent = item.title;
        description.textContent = (guru ? guru.ad : 'Danışmanın') + ' senden bu ' + (item.kind === 'document_request' ? 'belgeyi' : 'ödevi') + ' istedi.' + (item.due_at ? ' Son tarih: ' + fmtDate(item.due_at) + '.' : '');
        if (quote && item.description) {
          quote.textContent = '“' + item.description + '”';
          quote.parentElement.hidden = false;
        }
        if (item.status !== 'open') {
          showError('Bu ' + kindLabel(item) + ' zaten teslim edildi ya da kapatıldı.');
          return;
        }
        submit.disabled = false;
      } catch (err) {
        showError(window.Api.ui.message(err));
      }
    })();
  }

  // ─── Görüntüle ─────────────────────────────────────────────────────────────
  function initView() {
    const title = document.getElementById('task-title');
    const status = document.getElementById('task-status');
    const content = document.getElementById('task-content');
    if (!content) return;
    status.textContent = '';

    function message(text) {
      content.appendChild(el('p', 'rounded-[8px] border border-outline-variant bg-surface-container-low p-4 text-[14px] text-muted', text));
    }

    (async () => {
      try {
        const { ctx, items } = await loadAll();
        if (!ctx.enrollment) { window.Journey.showNoEnrollment(content); return; }
        const item = items.find(entry => entry.id === assignmentId);
        if (!item || !(item.status === 'submitted' || item.status === 'reviewed')) {
          title.textContent = 'Teslim edilmiş ödev bulunamadı';
          status.classList.add('hidden');
          message('Bu ödev henüz teslim edilmemiş ya da listende bulunamadı.');
          return;
        }
        title.textContent = item.title;
        status.textContent = (item.status === 'reviewed' ? 'İncelendi' : 'Teslim edildi') + (item.submitted_at ? ' · ' + fmtDate(item.submitted_at) : '');
        if (item.has_submission_file) {
          const row = el('div', 'flex flex-col gap-3 rounded-[8px] border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between');
          row.appendChild(el('div', 'min-w-0 break-all text-[14px] font-semibold text-[#1E1E1C]', 'Teslim ettiğin dosya'));
          const download = el('button', 'inline-flex items-center gap-1 text-[13px] font-semibold text-[#51409D] hover:underline');
          download.type = 'button';
          download.setAttribute('data-action', 'assignment-download');
          download.innerHTML = '<span class="material-symbols-outlined text-[18px]" aria-hidden="true">download</span> İndir';
          download.addEventListener('click', async () => {
            try {
              await window.Api.ui.withLoading(download, () => window.Api.download('/candidate/assignments/' + encodeURIComponent(item.id) + '/file'));
            } catch (err) {
              window.Api.ui.showError(content, err);
            }
          });
          row.appendChild(download);
          content.append(row, el('p', 'mt-3 text-[13px] text-muted', 'Danışmanın bu dosyayı görebilir.'));
        }
        if (item.submission_text) {
          const answer = el('div', 'mt-3 whitespace-pre-wrap rounded-[8px] border border-outline-variant bg-surface-container-low p-4 text-[14px] leading-6 text-[#1E1E1C]', item.submission_text);
          answer.setAttribute('aria-readonly', 'true');
          content.appendChild(answer);
        }
        if (!item.has_submission_file && !item.submission_text) message('Bu ödev için görüntülenecek bir teslim içeriği yok.');
      } catch (err) {
        window.Api.ui.showError(content, err);
      }
    })();
  }

  // Örnek (statik) ödev satırları oturum doğrulanmadan gizlenir.
  if (PAGE === 'odevler.html') { const staticList = document.querySelector('main section .divide-y'); if (staticList) staticList.hidden = true; }

  function init() {
    if (PAGE === 'odevler.html') initList();
    else if (PAGE === 'odev-teslim.html') initSubmit();
    else if (PAGE === 'odev-goruntule.html') initView();
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
