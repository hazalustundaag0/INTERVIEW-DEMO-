// hikaye-yukle-demo.js — Hazır hikâye yükleme (83, FR-68). demoHazirHikaye (localStorage) kaldırıldı.
//   POST /candidate/stories/{id}/external  JSON {text} | multipart text + file (PDF/DOCX ≤10 MB, K38)
//   → Draft(created_by=external_upload), durum DRAFT_GENERATED
//   POST /candidate/stories/{id}/outputs/generate → metin varsa çıktılar (YZ ≤70 sn)
// "Dosya yükle" sekmesi: .txt/.md tarayıcıda okunup metne aktarılır; PDF/DOCX şifreli dosya olarak gönderilir
// (metin çıkarımı yok; metin de yapıştırılırsa çıktılar o metinden üretilir).
(function () {
  'use strict';
  const textarea = document.querySelector('textarea[placeholder="Hikâye metnini buraya yapıştır..."]');
  const submitButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yükle ve Çıktıları Oluştur'));
  const fileButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Dosya yükle');
  const pasteButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Metni yapıştır');
  const card = document.querySelector('main section > div');
  if (!textarea || !submitButton || !fileButton || !pasteButton) {
    console.error('Hikâye yükleme kontrolleri bulunamadı.');
    return;
  }
  submitButton.setAttribute('data-action', 'story-external-upload');
  fileButton.setAttribute('data-nav-skip', '');
  pasteButton.setAttribute('data-nav-skip', '');

  const wordCount = textarea.parentElement.querySelector('span');
  const status = document.createElement('p');
  status.className = 'text-[12px] text-muted mt-2';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  textarea.parentElement.appendChild(status);

  const fileArea = document.createElement('div');
  fileArea.className = 'hidden mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4';
  const fileNote = document.createElement('p');
  fileNote.className = 'text-[12px] text-muted mb-3';
  fileNote.textContent = 'PDF veya DOCX (en fazla 10 MB) ya da metin dosyası (.txt, .md) seç.';
  fileArea.appendChild(fileNote);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fileInput.className = 'block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#EEECFF] file:text-[#51409D]';
  fileInput.setAttribute('aria-label', 'Hikâye dosyası seç');
  fileArea.appendChild(fileInput);
  fileButton.parentElement.insertAdjacentElement('afterend', fileArea);

  let storyId = null;
  let attachment = null;   // PDF/DOCX
  let allowed = false;

  function updateSubmitState() {
    const hasContent = textarea.value.trim().length > 0 || Boolean(attachment);
    const enabled = allowed && hasContent;
    submitButton.disabled = !enabled;
    submitButton.className = enabled
      ? 'bg-[#51409D] hover:bg-[#51409D] text-white px-6 py-3 rounded-lg font-medium text-sm inline-flex items-center gap-2'
      : 'bg-surface-container-low text-muted cursor-not-allowed px-6 py-3 rounded-lg font-medium text-sm inline-flex items-center gap-2 select-none';
    if (wordCount) {
      const words = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
      wordCount.textContent = words + ' kelime';
    }
  }

  function setActiveTab(active, inactive) {
    active.className = 'text-[#51409D] font-medium border-b-2 border-[#51409D] pb-2 px-1 text-sm inline-flex items-center gap-2';
    inactive.className = 'text-muted hover:text-[#1c1c1a] pb-2 px-1 border-b-2 border-transparent text-sm transition-colors';
  }

  fileButton.addEventListener('click', () => {
    setActiveTab(fileButton, pasteButton);
    fileArea.classList.remove('hidden');
    fileInput.click();
  });
  pasteButton.addEventListener('click', () => {
    setActiveTab(pasteButton, fileButton);
    fileArea.classList.add('hidden');
    textarea.focus();
  });
  textarea.addEventListener('input', updateSubmitState);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    window.Api.ui.clearError(card);
    if (/\.(txt|md|text)$/i.test(file.name)) {
      file.text().then(text => {
        textarea.value = text;
        updateSubmitState();
        status.textContent = file.name + ' metni aktarıldı.';
      }).catch(() => { status.textContent = 'Dosya okunamadı. Lütfen dosyayı kontrol edip tekrar dene.'; });
      fileInput.value = '';
      return;
    }
    const message = window.Api.validateFile(file, ['pdf', 'docx']);
    if (message) {
      window.Api.ui.showError(card, message);
      fileInput.value = '';
      return;
    }
    attachment = file;
    status.textContent = file.name + ' eklendi. Çıktıların oluşturulabilmesi için hikâye metnini de yapıştırabilirsin.';
    updateSubmitState();
  });

  submitButton.addEventListener('click', async event => {
    event.preventDefault();
    if (submitButton.disabled || !storyId) return;
    window.Api.ui.clearError(card);
    const text = textarea.value.trim();
    const id = encodeURIComponent(storyId);
    try {
      await window.Api.ui.withLoading(submitButton, async () => {
        if (attachment) await window.Api.upload('/candidate/stories/' + id + '/external', { file: attachment, fields: { text } });
        else await window.Api.post('/candidate/stories/' + id + '/external', { text });
        if (text) {
          submitButton.textContent = 'Çıktılar oluşturuluyor… (1 dakikayı bulabilir)';
          try {
            await window.Api.post('/candidate/stories/' + id + '/outputs/generate', undefined, { timeoutMs: window.Api.config.aiTimeoutMs });
          } catch (error) {
            console.warn('Çıktılar üretilemedi; Hikâyem sayfasından yeniden denenebilir.', error);
          }
        }
      }, { text: 'Yükleniyor…' });
      window.Nav ? window.Nav.go('ciktilar.html') : (location.href = 'ciktilar.html');
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  });

  async function init() {
    updateSubmitState();
    try {
      const ctx = await window.Journey.load();
      if (!ctx.enrollment || !ctx.story) { window.Journey.showNoEnrollment(card); return; }
      storyId = ctx.story.id;
      window.Journey.refreshSidebar(ctx).catch(() => {});
      const st = ctx.story.status;
      if (!window.Journey.atLeast(ctx.story, 'FIRST_SESSION_DONE')) {
        window.Api.ui.showError(card, 'Hikâye yükleme ilk seansın tamamlandıktan sonra açılır.', { tone: 'info' });
      } else if (st === 'COMPLETED') {
        window.Api.ui.showError(card, 'Hikâyeni onayladın; yeni bir hikâye yüklenemez.', { tone: 'info' });
      } else if (st === 'PAUSED') {
        window.Api.ui.showError(card, 'Sorulara verdiğin ara duraklatıldı. Önce Hikâyem sayfasından devam et.', { tone: 'info' });
      } else {
        allowed = true;
        if (window.Journey.atLeast(ctx.story, 'DRAFT_GENERATED')) {
          window.Api.ui.showError(card, 'Yüklediğin metin mevcut hikâye taslağının yeni sürümü olur.', { tone: 'info' });
        }
      }
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
    updateSubmitState();
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
