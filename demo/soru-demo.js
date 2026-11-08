// soru-demo.js — Hikâye soruları soru1–5.html (83). soruN.html ↔ question.sequence_no. Veri yalnız API:
//   GET  /candidate/stories/{id}                       → StoryState (sorular, son cevaplar, takip soruları, next)
//   POST /candidate/stories/{id}/qa/start | /resume     → FIRST_SESSION_DONE / PAUSED ise
//   PUT  /candidate/stories/{id}/answers/{questionID}   → {text} | {dont_know:true} → SaveAnswer{answer, follow_up, next}
//   PUT  /candidate/stories/{id}/follow-ups/{id}        → takip sorusu cevabı (dev motor: kısa cevapta tek takip, K58)
//   POST /candidate/stories/{id}/pause {last_screen}    → "Kaydet ve daha sonra devam et"
//   POST /candidate/stories/{id}/drafts/generate + /outputs/generate → son soruda (YZ ≤70 sn, K43)
// Soru metinleri artık HTML'den değil API'den (GAP-U12). Her tuşta API'ye yazılmaz (her kayıt yeni cevap
// sürümü ve takip kararı üretir); yazılan taslak yalnız bu sekmede sessionStorage'da tutulur (UI tercihi).
(function () {
  'use strict';
  const pageMatch = (location.pathname.split('/').pop() || '').match(/^soru([1-5])\.html$/);
  if (!pageMatch) return;
  const N = Number(pageMatch[1]);
  const findButton = re => Array.from(document.querySelectorAll('button')).find(b => re.test(b.textContent.trim()));
  const textarea = document.querySelector('textarea');
  const nextButton = findButton(/^(Cevabı Kaydet ve İlerle|Cevabı Kaydet ve Hikâyemi Oluştur)/);
  const skipButton = findButton(/^Hatırlamıyorum \/ Atla$/);
  const previousButton = findButton(/^(←\s*)?(Önceki Soru|Geri)$/);
  const saveLaterButton = findButton(/^Kaydet ve Daha Sonra Devam Et$/);
  const card = document.querySelector('main section > div');
  const questionTitle = document.querySelector('main h2');
  const questionHelp = questionTitle && questionTitle.nextElementSibling;
  const chipRow = questionTitle && questionTitle.previousElementSibling;
  const aiChip = Array.from(document.querySelectorAll('main span')).find(s => s.textContent.trim() === 'YZ sorusu');
  const targetChip = Array.from(document.querySelectorAll('main span')).find(s => s.textContent.trim().startsWith('Hedef rolün:'));
  const progressLabel = Array.from(document.querySelectorAll('main span')).find(s => /^Soru \d \/ \d$/.test(s.textContent.trim()));
  const progressPercent = progressLabel && progressLabel.nextElementSibling;
  const statusText = textarea && Array.from(textarea.parentElement.querySelectorAll('span')).find(s => s.textContent.trim() === 'Otomatik kaydedildi');
  const statusContainer = statusText && statusText.parentElement;
  const statusIcon = statusContainer && statusContainer.querySelector('.material-symbols-outlined');
  const count = textarea && textarea.parentElement.querySelector(':scope > div > span:last-child');

  document.body.classList.add('question-page');
  document.querySelector('h1')?.classList.add('question-page-title');
  Array.from(document.querySelectorAll('aside a[aria-current="page"]')).find(l => l.textContent.includes('Hikâyem'))?.classList.add('question-sidebar-link');
  const aiInfo = Array.from(document.querySelectorAll('p')).find(p => p.textContent.trim().startsWith('YZ yalnızca senin verdiğin bilgilerden yazar'));
  if (aiInfo) {
    aiInfo.classList.add('question-ai-info');
    const infoIcon = document.createElement('span');
    infoIcon.className = 'material-symbols-outlined';
    infoIcon.setAttribute('aria-hidden', 'true');
    infoIcon.textContent = 'info';
    aiInfo.insertBefore(infoIcon, aiInfo.firstChild);
  }

  // Sabit soru metni API gelene kadar gösterilmez.
  if (questionTitle) questionTitle.textContent = '';
  if (targetChip) targetChip.closest('.inline-flex').hidden = true;
  const originalHelp = questionHelp ? questionHelp.textContent : '';

  let storyId = null;
  let state = null;
  let question = null;
  let total = 5;
  let followUp = null;      // aktif takip sorusu
  let busy = false;

  function draftKey() {
    return 'soruTaslak.' + storyId + '.' + (followUp ? 'f.' + followUp.id : question.id);
  }
  function readDraft() {
    try { return window.sessionStorage.getItem(draftKey()); } catch (e) { return null; }
  }
  function writeDraft(value) {
    try { if (value) window.sessionStorage.setItem(draftKey(), value); else window.sessionStorage.removeItem(draftKey()); } catch (e) { /* UI tercihi */ }
  }

  function setStatus(message, icon) {
    if (!statusContainer || !statusText) return;
    statusContainer.hidden = !message;
    statusText.textContent = message || '';
    if (statusIcon) statusIcon.textContent = icon || 'check_circle';
  }

  function updateCount() {
    if (count) count.textContent = textarea.value.length + ' / 1000';
    if (nextButton) {
      nextButton.disabled = busy || !textarea.value.trim();
      nextButton.setAttribute('aria-disabled', String(nextButton.disabled));
    }
  }

  function go(href) { window.Nav ? window.Nav.go(href) : (location.href = href); }
  function questionPath(n) { return 'soru' + n + '.html'; }

  // ─── Görünüm ────────────────────────────────────────────────────────────────
  if (textarea) {
    textarea.classList.add('question-answer');
    textarea.maxLength = 1000;
    textarea.disabled = true;
    textarea.setAttribute('aria-describedby', 'question-answer-count');
    if (count) { count.id = 'question-answer-count'; count.className = 'question-answer-counter'; }
    if (statusContainer) {
      statusContainer.classList.add('question-autosave-status');
      statusContainer.setAttribute('aria-live', 'polite');
      statusIcon?.setAttribute('aria-hidden', 'true');
      statusContainer.hidden = true;
    }
    textarea.addEventListener('input', () => {
      updateCount();
      if (question) writeDraft(textarea.value);
      setStatus('Taslak — kaydetmek için ilerle', 'edit_note');
    });
  }
  if (nextButton) {
    nextButton.classList.add('question-next-button');
    nextButton.type = 'button';
    nextButton.setAttribute('data-action', 'answer-save');
    nextButton.disabled = true;
  }
  if (skipButton) {
    skipButton.classList.add('question-skip-button');
    skipButton.type = 'button';
    skipButton.textContent = 'Hatırlamıyorum / atla';
    skipButton.setAttribute('data-action', 'answer-skip');
  }
  if (previousButton) {
    previousButton.classList.add('question-previous-button');
    previousButton.type = 'button';
    previousButton.textContent = '← Önceki soru';
    previousButton.hidden = N === 1;
    previousButton.setAttribute('data-nav-skip', '');
  }
  if (saveLaterButton) {
    saveLaterButton.classList.add('question-save-later');
    saveLaterButton.type = 'button';
    saveLaterButton.setAttribute('data-action', 'qa-pause');
    saveLaterButton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">bookmark</span><span>Kaydet ve daha sonra devam et</span>';
  }
  const footer = (skipButton || previousButton)?.closest('.border-t');
  footer?.classList.add('question-footer');
  const actionGroup = (nextButton || skipButton)?.parentElement;
  if (actionGroup) {
    actionGroup.classList.add('question-action-group');
    if (nextButton && skipButton) actionGroup.insertBefore(nextButton, skipButton);
  }

  function renderProgress() {
    if (progressLabel) progressLabel.textContent = 'Soru ' + N + ' / ' + total;
    if (progressPercent) progressPercent.textContent = '%' + Math.round((N / total) * 100) + ' tamamlandı';
    const grid = document.querySelector('.question-progress-track') || document.querySelector('.grid.grid-cols-5');
    if (!grid) return;
    if (!grid.classList.contains('question-progress-track')) {
      const wrap = document.createElement('div');
      wrap.className = 'question-progress-container';
      grid.parentNode.replaceChild(wrap, grid);
      grid.classList.add('question-progress-track');
      grid.setAttribute('role', 'progressbar');
      grid.setAttribute('aria-label', 'Soru ilerlemesi');
      grid.setAttribute('aria-valuemin', '0');
      grid.setAttribute('aria-valuemax', '100');
      wrap.appendChild(grid);
      const controls = document.createElement('div');
      controls.className = 'question-progress-controls';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Tamamlanan sorular');
      wrap.appendChild(controls);
    }
    grid.setAttribute('aria-valuenow', String(Math.round((N / total) * 100)));
    grid.setAttribute('aria-valuetext', 'Soru ' + N + ' / ' + total);
    Array.from(grid.children).forEach((segment, index) => {
      segment.setAttribute('aria-hidden', 'true');
      segment.hidden = index >= total;
      segment.classList.toggle('question-progress-current', index === N - 1);
    });
    const controls = grid.parentElement.querySelector('.question-progress-controls');
    controls.replaceChildren();
    for (let step = 1; step <= total; step += 1) {
      if (step < N) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'question-progress-control';
        button.setAttribute('data-nav-skip', '');
        button.setAttribute('aria-label', 'Soru ' + step + '’e git');
        button.addEventListener('click', () => go(questionPath(step)));
        controls.appendChild(button);
      } else {
        const empty = document.createElement('span');
        empty.className = 'question-progress-empty';
        empty.setAttribute('aria-hidden', 'true');
        controls.appendChild(empty);
      }
    }
  }

  function renderQuestion() {
    followUp = null;
    if (aiChip) aiChip.textContent = 'YZ sorusu';
    if (questionTitle) questionTitle.textContent = question.question_text;
    if (questionHelp) questionHelp.textContent = originalHelp;
    const answer = (state.answers || []).find(a => a.question_id === question.id);
    const draft = readDraft();
    textarea.value = draft != null ? draft : answer && !answer.is_info_needed ? answer.answer_text : '';
    textarea.placeholder = answer && answer.is_info_needed ? '[bilgi gerekli olarak işaretlendi]' : 'Cevabını buraya yaz...';
    setStatus(draft != null ? 'Taslak — kaydetmek için ilerle' : answer ? 'Kaydedildi' : '', draft != null ? 'edit_note' : 'check_circle');
    if (nextButton) nextButton.textContent = N === total ? 'Hikâyeyi oluştur' : 'Cevabı kaydet ve ilerle';
    if (skipButton) { skipButton.hidden = false; skipButton.dataset.warned = 'false'; skipButton.textContent = 'Hatırlamıyorum / atla'; }
    document.querySelector('.demo-bilgi-gerekli')?.remove();
    textarea.disabled = false;
    updateCount();
  }

  function renderFollowUp(item) {
    followUp = item;
    const answer = (state.answers || []).find(a => a.id === item.answer_id);
    if (aiChip) aiChip.textContent = 'Takip sorusu';
    if (questionTitle) questionTitle.textContent = item.question_text;
    if (questionHelp) {
      questionHelp.textContent = answer && answer.answer_text
        ? 'Önceki cevabını biraz daha açar mısın? Cevabın: “' + answer.answer_text + '”'
        : 'Önceki cevabını biraz daha açar mısın?';
    }
    const draft = readDraft();
    textarea.value = draft || '';
    textarea.placeholder = 'Cevabını buraya yaz...';
    setStatus('', 'check_circle');
    if (nextButton) nextButton.textContent = N === total ? 'Kaydet ve hikâyeyi oluştur' : 'Kaydet ve ilerle';
    if (skipButton) { skipButton.dataset.warned = 'false'; skipButton.textContent = 'Hatırlamıyorum / atla'; }
    document.querySelector('.demo-bilgi-gerekli')?.remove();
    textarea.disabled = false;
    textarea.focus();
    updateCount();
  }

  function showInfoNeededWarning() {
    if (document.querySelector('.demo-bilgi-gerekli')) return;
    const warning = document.createElement('div');
    warning.className = 'demo-bilgi-gerekli';
    warning.setAttribute('role', 'status');
    warning.setAttribute('aria-live', 'polite');
    warning.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">info</span><p>Bu bilgi hikâyende <strong>[bilgi gerekli]</strong> olarak işaretlenecek. Danışmanınla seansta tamamlayabilirsiniz.</p>';
    footer?.parentNode?.insertBefore(warning, footer);
  }

  function setBusy(on) {
    busy = on;
    [skipButton, saveLaterButton, previousButton].forEach(b => { if (b) b.disabled = on; });
    if (textarea) textarea.readOnly = on;
    updateCount();
  }

  // ─── Akış ──────────────────────────────────────────────────────────────────
  async function generateStory() {
    const id = encodeURIComponent(storyId);
    const ai = { timeoutMs: window.Api.config.aiTimeoutMs };
    await window.Api.post('/candidate/stories/' + id + '/drafts/generate', undefined, ai);
    try {
      await window.Api.post('/candidate/stories/' + id + '/outputs/generate', undefined, ai);
    } catch (error) {
      // Taslak oluştu; çıktılar ciktilar.html'den yeniden üretilebilir.
      console.warn('Çıktılar üretilemedi; Hikâyem sayfasından yeniden denenebilir.', error);
    }
    go('ciktilar.html');
  }

  async function proceed(result) {
    const pending = result.follow_up || (result.next && result.next.follow_up);
    if (pending && !pending.answered_at) {
      state = await window.Api.get('/candidate/stories/' + encodeURIComponent(storyId));
      renderFollowUp(pending);
      return;
    }
    const next = result.next || {};
    if (next.question && next.question.sequence_no !== N) return go(questionPath(next.question.sequence_no));
    if (N < total) return go(questionPath(N + 1));
    await generateStory();
  }

  async function submit(body) {
    const id = encodeURIComponent(storyId);
    const path = followUp
      ? '/candidate/stories/' + id + '/follow-ups/' + encodeURIComponent(followUp.id)
      : '/candidate/stories/' + id + '/answers/' + encodeURIComponent(question.id);
    const result = await window.Api.put(path, body, { timeoutMs: window.Api.config.aiTimeoutMs });
    writeDraft('');
    setStatus('Kaydedildi', 'check_circle');
    return result;
  }

  async function run(button, body, loadingText) {
    if (busy) return;
    window.Api.ui.clearError(card);
    setBusy(true);
    const lastStep = N === total;
    try {
      await window.Api.ui.withLoading(button, async () => {
        const result = await submit(body);
        if (lastStep && !(result.follow_up || (result.next && result.next.follow_up))) {
          button.textContent = 'Hikâyen oluşturuluyor… (1 dakikayı bulabilir)';
        }
        await proceed(result);
      }, { text: loadingText });
    } catch (error) {
      window.Api.ui.showError(card, error);
    } finally {
      setBusy(false);
    }
  }

  nextButton?.addEventListener('click', event => {
    event.preventDefault();
    if (!textarea.value.trim()) return;
    run(nextButton, { text: textarea.value.trim() }, N === total ? 'Kaydediliyor…' : 'Kaydediliyor…');
  });

  skipButton?.addEventListener('click', event => {
    event.preventDefault();
    if (skipButton.dataset.warned !== 'true') {
      showInfoNeededWarning();
      skipButton.dataset.warned = 'true';
      skipButton.textContent = 'Atla ve ilerle';
      return;
    }
    run(skipButton, { dont_know: true }, 'Kaydediliyor…');
  });

  previousButton?.addEventListener('click', event => {
    event.preventDefault();
    if (N > 1) go(questionPath(N - 1));
  });

  saveLaterButton?.addEventListener('click', async event => {
    event.preventDefault();
    if (busy || !storyId) return;
    window.Api.ui.clearError(card);
    try {
      await window.Api.ui.withLoading(saveLaterButton, async () => {
        const text = textarea.value.trim();
        if (text && question) {
          const saved = followUp ? null : (state.answers || []).find(a => a.question_id === question.id);
          if (!saved || saved.answer_text !== text) await submit({ text });
        }
        await window.Api.post('/candidate/stories/' + encodeURIComponent(storyId) + '/pause', { last_screen: 'soru' + N + '.html' });
      }, { text: 'Kaydediliyor…' });
      go('ana.html');
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  });

  async function profileTarget() {
    if (!targetChip) return;
    try {
      const profile = await window.Api.get('/candidate/profile');
      const field = (profile.labeled || []).find(item => item.field_key === 'target_position');
      const value = field && ((field.options[0] && field.options[0].label) || field.text);
      if (value) {
        targetChip.textContent = 'Hedef rolün: ' + value;
        targetChip.closest('.inline-flex').hidden = false;
      }
    } catch (error) { /* bilgi amaçlı çip; hata akışı engellemez */ }
  }

  async function init() {
    try {
      const ctx = await window.Journey.load();
      if (!ctx.enrollment || !ctx.story) { window.Journey.showNoEnrollment(card); return; }
      storyId = ctx.story.id;
      window.Journey.refreshSidebar(ctx).catch(() => {});
      const id = encodeURIComponent(storyId);
      const status = ctx.story.status;
      if (!window.Journey.atLeast(ctx.story, 'FIRST_SESSION_DONE')) {
        window.Api.ui.showError(card, 'Sorular ilk seansın tamamlandıktan sonra açılır.', { tone: 'info' });
        return;
      }
      if (status === 'FIRST_SESSION_DONE') state = await window.Api.post('/candidate/stories/' + id + '/qa/start');
      else if (status === 'PAUSED') state = await window.Api.post('/candidate/stories/' + id + '/resume');
      else state = await window.Api.get('/candidate/stories/' + id);
      if (state.session.status !== 'QA_IN_PROGRESS') {
        window.Api.ui.showError(card, 'Hikâye taslağın oluşturuldu; cevapların artık Hikâyem sayfasından düzenlenir.', { tone: 'info' });
        const link = document.createElement('a');
        link.href = 'ciktilar.html';
        link.className = 'font-semibold underline';
        link.textContent = ' Hikâyeme git →';
        card.querySelector('.api-alert')?.appendChild(link);
        return;
      }
      const questions = (state.questions || []).slice().sort((a, b) => a.sequence_no - b.sequence_no);
      total = Math.min(5, questions.length || 5);
      question = questions.find(q => q.sequence_no === N);
      if (!question) { location.replace(questionPath(total)); return; }
      renderProgress();
      const pending = state.next && state.next.follow_up;
      const pendingAnswer = pending && (state.answers || []).find(a => a.id === pending.answer_id);
      if (pending && pendingAnswer && pendingAnswer.question_id === question.id) renderFollowUp(pending);
      else renderQuestion();
      if (N === total) profileTarget();
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
