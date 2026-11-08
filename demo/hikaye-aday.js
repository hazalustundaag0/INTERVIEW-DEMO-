// hikaye-aday.js — Aday hikâye/çıktı ekranı (ciktilar.html). Sahibi: 83. hikaye-veri.js'in aday kısmının yerine
// geçer (80/81 bölünme planı); başkasının örnek hikâyesi gösterilmez (GAP-U17), frontend'de çıktı üretilmez (K58).
//   GET  /candidate/stories/{id}                → StoryState (cevap ↔ soru eşlemesi: cümle kaynak etiketi)
//   GET  /candidate/stories/{id}/drafts (+/{draftID}) → DraftView (cümle başına kaynak, [bilgi gerekli], issues)
//   POST /candidate/stories/{id}/drafts {based_on_draft_id, story_text}  → aday düzenlemesi (yeni sürüm)
//   GET  /candidate/stories/{id}/outputs · POST …/outputs/generate (YZ ≤70 sn) → mülakat cevapları, CV özeti
//   POST /candidate/stories/{id}/finalize {draft_id, confirm:true} → SUMMARY_READY → COMPLETED (K56/K61, FR-70)
// Model/biçim yardımcıları: hikaye-model.js (window.StoryModel, 81).
(function () {
  'use strict';
  const M = window.StoryModel;
  const section = document.querySelector('main section');
  if (!M || !section) return;
  const el = M.dom.element;
  const title = section.querySelector('h1');
  const titleBadge = title && title.previousElementSibling;
  const cardOf = name => Array.from(section.querySelectorAll('h2')).find(h => h.textContent.trim() === name)?.parentElement?.parentElement;
  const storyCard = cardOf('Satış hikâyen');
  const interviewCard = cardOf('Mülakat cevap taslakların');
  const cvCard = cardOf('CV özet paragrafın');
  const storyText = storyCard && storyCard.querySelector('h2 + p');
  const interviewText = interviewCard && interviewCard.querySelector('h2 + p');
  const cvText = cvCard && cvCard.querySelector('h2 + p');
  const bottomRow = section.querySelector(':scope > div.flex.flex-col.sm\\:flex-row');
  const printAllButton = bottomRow && bottomRow.querySelector('button');
  const homeLink = bottomRow && Array.from(bottomRow.querySelectorAll('a')).find(a => a.textContent.includes('Ana Ekrana Dön'));
  const cardsWrap = storyCard && storyCard.parentElement;

  document.title = 'Satış hikâyen · Interview Demo';
  document.body.classList.add('story-output-page');
  [storyCard, interviewCard, cvCard].forEach(card => { if (card) card.hidden = true; });
  if (storyCard) storyCard.dataset.storyOutput = 'story';
  if (interviewCard) interviewCard.dataset.storyOutput = 'interview';
  if (cvCard) cvCard.dataset.storyOutput = 'cv';
  if (title) title.textContent = 'Satış hikâyen yükleniyor…';
  if (homeLink) homeLink.href = 'ana.html';

  // "Hikâyemi onayla" (K56): mevcut birincil buton stilinin kopyası, alt eylem satırında.
  const finalizeButton = printAllButton ? printAllButton.cloneNode(false) : document.createElement('button');
  finalizeButton.type = 'button';
  finalizeButton.setAttribute('data-action', 'story-finalize');
  finalizeButton.innerHTML = '<span class="material-symbols-outlined text-[20px]" aria-hidden="true">verified</span><span>Hikâyemi onayla</span>';
  finalizeButton.hidden = true;
  const finalizeHint = el('p', 'text-[12px] text-muted', '');
  finalizeHint.id = 'story-finalize-hint';
  finalizeHint.hidden = true;
  finalizeButton.setAttribute('aria-describedby', finalizeHint.id);
  if (bottomRow) {
    const group = el('div', 'flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto');
    if (printAllButton) {
      printAllButton.setAttribute('data-nav-skip', '');
      printAllButton.addEventListener('click', () => M.dom.print('all'));
      group.appendChild(printAllButton);
    }
    group.appendChild(finalizeButton);
    bottomRow.prepend(group);
    bottomRow.insertAdjacentElement('afterend', finalizeHint);
  }

  let ctx = null;
  let storyId = null;
  let state = null;
  let index = new Map();
  let vm = null;          // StoryVM (son taslak)
  let outputs = null;     // OutputsVM (son taslağa ait)
  let outputsStale = false;
  let saving = false;

  function toast(message) {
    document.getElementById('story-output-toast')?.remove();
    const node = el('div', 'story-output-toast', message);
    node.id = 'story-output-toast';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function status() { return ctx && ctx.story ? ctx.story.status : null; }
  function completed() { return status() === 'COMPLETED'; }
  function editable() { return Boolean(vm) && !completed() && status() !== 'PAUSED' && !saving; }

  function sourceText(sentence) {
    const label = M.sourceLabel(sentence, index);
    if (sentence.sourceType === 'answer' && sentence.answerId) {
      const ref = index.get(sentence.answerId);
      if (ref && ref.focusLabel) return label + ' · ' + ref.focusLabel;
    }
    return sentence.infoNeeded ? 'Bilgi gerekli' : label;
  }

  // ─── Kartlar ────────────────────────────────────────────────────────────────
  function actionRow(card) {
    const row = card.lastElementChild;
    row.classList.add('story-output-actions');
    return row;
  }

  function wireCardButtons(card, target, textFn) {
    const row = actionRow(card);
    row.querySelectorAll('button').forEach(button => {
      button.setAttribute('data-nav-skip', '');
      button.classList.add('story-output-button');
      if (button.dataset.wired) return;
      button.dataset.wired = 'true';
      if (button.textContent.includes('Kopyala')) {
        button.addEventListener('click', async () => toast(await M.dom.copyText(textFn()) ? 'Kopyalandı' : 'Kopyalanamadı. Tarayıcı izinlerini kontrol et.'));
      } else if (button.textContent.includes('PDF')) {
        button.addEventListener('click', () => M.dom.print(target));
      }
    });
  }

  function renderStatusBadges() {
    section.querySelector('[data-story-status]')?.remove();
    if (!vm) return;
    const row = el('div', 'story-output-status');
    row.dataset.storyStatus = '';
    row.setAttribute('aria-label', 'Hikâye durumu');
    const origin = { ai: 'YZ ile oluşturuldu', candidate: 'Senin düzenlemen', external_upload: 'Yüklediğin hikâye' }[vm.createdBy] || '';
    const words = vm.wordCount != null ? vm.wordCount : M.joinSentences(vm.sentences).split(/\s+/).filter(Boolean).length;
    ['Sürüm ' + vm.versionNo, words + ' kelime', origin, completed() ? 'Onaylandı' : ''].filter(Boolean)
      .forEach(text => row.appendChild(el('span', 'story-output-status-badge', text)));
    (title.parentElement || section).insertAdjacentElement('afterend', row);
  }

  function renderStory() {
    if (!storyCard || !storyText) return;
    storyCard.querySelectorAll('[data-story-sources], [data-story-missing], #candidate-edit-hint, .api-alert').forEach(node => node.remove());
    storyText.replaceChildren();
    storyText.classList.add('story-output-story');
    if (!vm.sentences.length) {
      storyText.textContent = vm.hasExternalFile
        ? 'Hikâyeni dosya olarak yükledin. Çıktıların oluşturulabilmesi için hikâye metnini "Hazır hikâyemi yükle" adımında yapıştır.'
        : 'Bu taslakta metin yok.';
    }
    vm.sentences.forEach((sentence, i) => {
      if (i) storyText.appendChild(document.createTextNode(' '));
      const span = el('span', 'story-output-sentence rounded-sm outline-none focus:bg-[#EEECFF] focus:ring-1 focus:ring-[#51409D]', sentence.text);
      span.dataset.storySentence = '';
      span.dataset.index = String(i);
      span.title = 'Kaynak: ' + sourceText(sentence);
      if (editable()) {
        span.contentEditable = 'true';
        span.spellcheck = true;
        span.setAttribute('aria-label', 'Hikâye cümlesi ' + (i + 1) + ' (kaynak: ' + sourceText(sentence) + '), düzenlemek için tıkla');
        span.addEventListener('blur', () => {
          const updated = span.textContent.replace(/\s+/g, ' ').trim();
          if (updated === sentence.text) return;
          const texts = vm.sentences.map(s => s.text);
          texts[i] = updated;
          saveEdit(texts, 'Değişikliğin kaydedildi.');
        });
        span.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); span.blur(); } });
      }
      storyText.appendChild(span);
    });

    // Cümle kaynakları — her cümle, kaynağıyla (BR-01 izlenebilirlik).
    if (vm.sentences.length) {
      const sources = el('details', 'story-output-followup-other-list');
      sources.dataset.storySources = '';
      sources.appendChild(el('summary', '', 'Cümle kaynakları (' + vm.sentences.length + ')'));
      vm.sentences.forEach(sentence => {
        const row = el('div', 'story-output-missing-row');
        row.append(el('span', 'story-output-missing-badge' + (sentence.unsourced ? '' : ' is-complete'), sourceText(sentence)),
          el('p', 'story-output-missing-text', sentence.text));
        if (sentence.sourceType === 'answer' && sentence.answerId && index.get(sentence.answerId)) {
          row.appendChild(el('p', 'story-output-missing-detail', 'Cevabın: “' + index.get(sentence.answerId).text + '”'));
        }
        sources.appendChild(row);
      });
      storyText.insertAdjacentElement('afterend', sources);
    }
    renderMissing();
    if (editable() && vm.sentences.length) {
      const hint = el('p', 'mt-2 text-[12px] text-[#51409D] story-edit-hint', 'Bir cümleyi düzenlemek için tıkla; değişiklik yeni sürüm olarak kaydedilir.');
      hint.id = 'candidate-edit-hint';
      (storyCard.querySelector('[data-story-missing]') || storyCard.querySelector('[data-story-sources]') || storyText).insertAdjacentElement('afterend', hint);
    }
    const notes = vm.issues.map(issueText).filter(Boolean);
    if (notes.length) {
      // QA-017: ham ayrıntı (ör. "76") yerine etiketli, anlaşılır bilgi notu.
      window.Api.ui.showError(storyText.parentElement, 'Metin önerisi: ' + notes.join(' '), { tone: 'info', position: 'append' });
    }
    wireCardButtons(storyCard, 'story', () => M.joinSentences(vm.sentences));
    storyCard.hidden = false;
  }

  // BR-09 bilgi amaçlı metin kuralları (TextIssue) → Türkçe açıklama.
  function issueText(issue) {
    const detail = String(issue.detail || '');
    switch (issue.code) {
      case 'word_count': return 'Hikâyen ' + detail + ' kelime; önerilen uzunluk 150–250 kelime.';
      case 'praise_word': return '“' + detail + '” gibi övgü ifadeleri yerine somut bir örnek kullan.';
      case 'sentence_count': return 'Kısa özetin cümle sayısı önerilen aralığın dışında.';
      case 'line_count': return 'CV özetinin satır sayısı önerilen aralığın dışında.';
      case 'answer_count': return 'Mülakat cevabı sayısı önerilen aralığın dışında.';
      default: return '';
    }
  }

  // "[bilgi gerekli]" cümleleri: aday kendi bilgisiyle tamamlar (aday düzenlemesi, yeni sürüm).
  function renderMissing() {
    const gaps = vm.sentences.map((s, i) => ({ s, i })).filter(item => item.s.infoNeeded);
    if (!gaps.length) return;
    const box = el('section', 'story-output-missing');
    box.dataset.storyMissing = '';
    const heading = el('h3', 'story-output-missing-title', 'Seansta tamamlanacaklar');
    heading.id = 'story-missing-title';
    box.setAttribute('aria-labelledby', heading.id);
    box.appendChild(heading);
    gaps.forEach(({ s, i }) => {
      const row = el('div', 'story-output-missing-row');
      row.append(el('span', 'story-output-missing-badge', 'Bilgi gerekli'), el('p', 'story-output-missing-text', s.text));
      if (editable()) {
        const controls = el('div', 'story-output-followup-controls');
        const open = el('button', 'story-output-followup-open', 'Şimdi cevapla');
        open.type = 'button';
        open.setAttribute('aria-expanded', 'false');
        open.setAttribute('data-nav-skip', '');
        const panel = el('div', 'story-output-followup-panel');
        panel.hidden = true;
        const form = el('form', 'story-output-followup-form');
        form.setAttribute('autocomplete', 'off');
        const field = el('label', 'story-output-followup-field', 'Bu cümlenin yerine geçecek bilgiyi kendi cümlenle yaz');
        const input = el('textarea', 'story-output-followup-input');
        input.rows = 2;
        input.maxLength = 600;
        field.appendChild(input);
        const actions = el('div', 'story-output-followup-actions');
        const submit = el('button', 'story-output-followup-submit', 'Kaydet');
        submit.type = 'submit';
        submit.setAttribute('data-action', 'story-fill-gap');
        actions.appendChild(submit);
        form.append(field, actions);
        panel.appendChild(form);
        open.addEventListener('click', () => {
          const expanded = open.getAttribute('aria-expanded') === 'true';
          open.setAttribute('aria-expanded', String(!expanded));
          panel.hidden = expanded;
          if (!expanded) input.focus();
        });
        form.addEventListener('submit', event => {
          event.preventDefault();
          let value = input.value.replace(/\s+/g, ' ').trim();
          if (!value) { input.focus(); return; }
          if (!/[.!?…]$/.test(value)) value += '.';
          const texts = vm.sentences.map(x => x.text);
          texts[i] = value;
          saveEdit(texts, 'Eksik bilgi tamamlandı.', submit);
        });
        controls.append(open, panel);
        row.appendChild(controls);
      }
      box.appendChild(row);
    });
    (storyCard.querySelector('[data-story-sources]') || storyText).insertAdjacentElement('afterend', box);
  }

  function emptyOutput(card, textNode, message) {
    textNode.hidden = false;
    textNode.textContent = message;
  }

  function generateButton(card) {
    const row = actionRow(card);
    let button = row.querySelector('[data-action="outputs-generate"]');
    if (!button) {
      const model = row.querySelector('button');
      button = model ? model.cloneNode(false) : el('button');
      button.type = 'button';
      button.setAttribute('data-action', 'outputs-generate');
      button.removeAttribute('data-wired');
      button.innerHTML = '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span><span></span>';
      button.addEventListener('click', () => generateOutputs(button));
      row.prepend(button);
    }
    button.lastElementChild.textContent = outputsStale ? 'Çıktıları güncelle' : 'Çıktıları oluştur';
    const current = outputs && !outputs.isEmpty && !outputsStale;
    const hide = completed() || current || !vm.sentences.length;
    button.hidden = hide;
    button.style.display = hide ? 'none' : ''; // .story-output-button display'i [hidden]'ı eziyor
    return button;
  }

  function renderOutputs() {
    const ready = outputs && !outputs.isEmpty && !outputsStale;
    if (interviewCard && interviewText) {
      interviewCard.querySelector('.story-interview-answers')?.remove();
      if (ready && outputs.interviewAnswers.length) {
        interviewText.hidden = true;
        const list = el('div', 'story-interview-answers');
        outputs.interviewAnswers.forEach(item => {
          // GAP-B07: Output soruyu taşımıyor → "Mülakat cevabı N".
          const block = el('article', 'story-interview-answer');
          block.append(el('h3', 'story-interview-question', 'Mülakat cevabı ' + item.itemNo), el('p', 'story-interview-response', item.content));
          const copy = el('button', 'story-output-button');
          copy.type = 'button';
          copy.setAttribute('data-nav-skip', '');
          copy.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">content_copy</span><span>Kopyala</span>';
          copy.addEventListener('click', async () => toast(await M.dom.copyText(item.content) ? 'Kopyalandı' : 'Kopyalanamadı.'));
          block.appendChild(copy);
          list.appendChild(block);
        });
        interviewText.insertAdjacentElement('afterend', list);
      } else {
        emptyOutput(interviewCard, interviewText, outputsStale ? 'Hikâyeni değiştirdin; mülakat cevaplarını güncellemek için çıktıları yeniden oluştur.' : 'Mülakat cevapların henüz oluşturulmadı.');
      }
      interviewCard.querySelectorAll('.story-output-actions button').forEach(button => {
        if (button.textContent.includes('Kopyala')) button.hidden = true;
      });
      wireCardButtons(interviewCard, 'interview', () => outputs ? outputs.interviewAnswers.map(a => a.content).join('\n\n') : '');
      generateButton(interviewCard);
      interviewCard.hidden = false;
    }
    if (cvCard && cvText) {
      cvText.id = 'story-cv-summary';
      cvText.classList.add('story-output-cv');
      if (ready && outputs.cvSummary) cvText.textContent = outputs.cvSummary;
      else emptyOutput(cvCard, cvText, outputsStale ? 'CV özetini güncellemek için çıktıları yeniden oluştur.' : 'CV özetin henüz oluşturulmadı.');
      wireCardButtons(cvCard, 'cv', () => (ready && outputs.cvSummary) || '');
      cvCard.querySelectorAll('.story-output-actions button').forEach(button => {
        if (!button.matches('[data-action]')) button.disabled = !(ready && outputs.cvSummary);
      });
      cvCard.hidden = false;
    }
  }

  function renderHeader() {
    const ready = status() === 'SUMMARY_READY' || completed();
    title.textContent = completed() ? 'Satış hikâyen onaylandı' : ready ? 'Satış hikâyen hazır' : 'Satış hikâye taslağın';
    if (titleBadge) titleBadge.hidden = !ready;
  }

  function renderFinalize() {
    finalizeButton.hidden = false;
    finalizeHint.hidden = false;
    if (completed()) {
      finalizeButton.disabled = true;
      finalizeButton.lastElementChild.textContent = 'Hikâyen onaylandı';
      finalizeHint.textContent = 'Onayladığın hikâye danışmanınla paylaşılan son hâlidir.';
      return;
    }
    const canFinalize = status() === 'SUMMARY_READY' && outputs && !outputs.isEmpty && !outputsStale;
    finalizeButton.disabled = !canFinalize || saving;
    finalizeButton.setAttribute('aria-disabled', String(finalizeButton.disabled));
    finalizeButton.lastElementChild.textContent = 'Hikâyemi onayla';
    finalizeHint.textContent = canFinalize
      ? 'Onayladığında hikâyen tamamlanır ve artık değiştirilemez.'
      : status() === 'PAUSED' ? 'Soruları duraklattın; onaylamak için önce Hikâyem\'den devam et.'
        : 'Onaylamak için önce çıktılarını oluştur.';
  }

  function renderNextStep() {
    section.querySelector('.story-next-step-card')?.remove();
    const s2 = window.Journey.session(ctx, 2);
    if (!s2 || s2.status === 'completed') return;
    const box = el('section', 'story-next-step-card');
    box.appendChild(el('h2', '', 'Sıradaki adım'));
    const content = el('div', 'story-next-step-content');
    content.appendChild(el('h3', '', '2. seansa hazırlan'));
    const planned = s2.status === 'scheduled';
    const link = el('a', 'story-output-button story-next-step-link', planned ? 'Seanslarım' : 'Randevu al');
    link.href = planned ? 'seanslar.html' : 'takvim.html';
    link.setAttribute('data-nav-skip', '');
    content.appendChild(link);
    box.appendChild(content);
    section.appendChild(box);
  }

  function renderAll() {
    renderHeader();
    renderStatusBadges();
    renderStory();
    renderOutputs();
    renderFinalize();
    renderNextStep();
  }

  // ─── API işlemleri ─────────────────────────────────────────────────────────
  async function reloadStory() {
    const id = encodeURIComponent(storyId);
    const [stateRes, drafts, outs, detail] = await Promise.all([
      window.Api.get('/candidate/stories/' + id),
      window.Api.listAll('/candidate/stories/' + id + '/drafts'),
      window.Api.get('/candidate/stories/' + id + '/outputs'),
      window.Api.get('/candidate/enrollments/' + encodeURIComponent(ctx.enrollment.id))
    ]);
    state = stateRes;
    ctx.story = detail.story_session;
    ctx.sessions = (detail.sessions || []).slice().sort((a, b) => a.sequence_no - b.sequence_no);
    index = M.answerIndex(state);
    const latest = drafts.slice().sort((a, b) => b.version_no - a.version_no)[0];
    if (!latest) { vm = null; return; }
    vm = M.fromDraftView(await window.Api.get('/candidate/stories/' + id + '/drafts/' + encodeURIComponent(latest.id)));
    const items = (outs && outs.items) || (outs && outs.outputs) || [];
    const forDraft = items.filter(o => o.draft_id === latest.id);
    outputsStale = !forDraft.length && items.length > 0;
    outputs = M.fromOutputs(forDraft);
  }

  async function saveEdit(texts, message, button) {
    if (saving || !vm) return;
    saving = true;
    window.Api.ui.clearError(section);
    const run = () => window.Api.post('/candidate/stories/' + encodeURIComponent(storyId) + '/drafts', {
      based_on_draft_id: vm.draftId, story_text: M.joinSentences(texts), skeleton: vm.skeleton
    });
    try {
      if (button) await window.Api.ui.withLoading(button, run, { text: 'Kaydediliyor…' }); else await run();
      await reloadStory();
      toast(message);
    } catch (error) {
      window.Api.ui.showError(section, error);
    } finally {
      saving = false;
      renderAll();
    }
  }

  async function generateOutputs(button) {
    if (saving) return;
    saving = true;
    window.Api.ui.clearError(section);
    try {
      await window.Api.ui.withLoading(button, () => window.Api.post('/candidate/stories/' + encodeURIComponent(storyId) + '/outputs/generate', undefined, { timeoutMs: window.Api.config.aiTimeoutMs }),
        { text: 'Oluşturuluyor… (1 dakikayı bulabilir)' });
      await reloadStory();
      toast('Çıktıların oluşturuldu.');
    } catch (error) {
      window.Api.ui.showError(section, error);
    } finally {
      saving = false;
      renderAll();
    }
  }

  // QA-018: onay penceresi tasarımın mevcut <dialog> bileşeni (appointment-success-dialog), native confirm değil.
  const confirmDialog = document.createElement('dialog');
  confirmDialog.className = 'appointment-success-dialog';
  confirmDialog.setAttribute('aria-modal', 'true');
  confirmDialog.setAttribute('aria-labelledby', 'story-finalize-title');
  confirmDialog.setAttribute('aria-describedby', 'story-finalize-text');
  confirmDialog.innerHTML = '<h2 id="story-finalize-title">Hikâyeni onaylıyor musun?</h2>' +
    '<p id="story-finalize-text">Onayladığında hikâyen tamamlanır ve danışmanınla son hâli paylaşılır. Onaydan sonra hikâye metni değiştirilemez.</p>' +
    '<div class="appointment-success-actions"><button type="button" data-dialog-cancel>Vazgeç</button>' +
    '<a href="#" role="button" data-action="story-finalize-confirm">Evet, onayla</a></div>';
  document.body.appendChild(confirmDialog);
  const dialogConfirm = confirmDialog.querySelector('[data-action="story-finalize-confirm"]');
  const dialogCancel = confirmDialog.querySelector('[data-dialog-cancel]');
  dialogCancel.setAttribute('data-nav-skip', '');

  function askFinalize() {
    return new Promise(resolve => {
      const finish = value => {
        confirmDialog.removeEventListener('close', onClose);
        if (typeof confirmDialog.close === 'function' && confirmDialog.open) confirmDialog.close();
        else confirmDialog.removeAttribute('open');
        resolve(value);
      };
      const onClose = () => finish(false);
      confirmDialog.addEventListener('close', onClose);
      dialogCancel.onclick = () => finish(false);
      dialogConfirm.onclick = event => { event.preventDefault(); finish(true); };
      dialogConfirm.onkeydown = event => { if (event.key === ' ') { event.preventDefault(); finish(true); } };
      if (typeof confirmDialog.showModal === 'function') confirmDialog.showModal(); else confirmDialog.setAttribute('open', '');
      dialogCancel.focus();
    });
  }

  finalizeButton.addEventListener('click', async () => {
    if (finalizeButton.disabled || !vm) return;
    const ok = await askFinalize();
    finalizeButton.focus();
    if (!ok) return;
    saving = true;
    window.Api.ui.clearError(section);
    try {
      const session = await window.Api.ui.withLoading(finalizeButton, () =>
        window.Api.confirm('POST', '/candidate/stories/' + encodeURIComponent(storyId) + '/finalize', { draft_id: vm.draftId }), { text: 'Onaylanıyor…' });
      ctx.story = session;
      await reloadStory();
      toast(session.status === 'COMPLETED' ? 'Hikâyen onaylandı.' : 'Onayın kaydedildi.');
    } catch (error) {
      window.Api.ui.showError(section, error);
    } finally {
      saving = false;
      renderAll();
    }
  });

  function showEmpty(message) {
    title.textContent = 'Satış hikâyen';
    if (titleBadge) titleBadge.hidden = true;
    const alert = window.Api.ui.showError(cardsWrap || section, message, { tone: 'info', position: 'before' });
    if (alert && !alert.querySelector('a')) {
      const link = el('a', 'font-semibold underline', ' Hikâye adımına git →');
      link.href = 'hikaye-giris.html';
      alert.appendChild(link);
    }
  }

  async function init() {
    try {
      ctx = await window.Journey.load();
      if (!ctx.enrollment || !ctx.story) { title.textContent = 'Satış hikâyen'; window.Journey.showNoEnrollment(section); return; }
      storyId = ctx.story.id;
      window.Journey.refreshSidebar(ctx).catch(() => {});
      if (!window.Journey.atLeast(ctx.story, 'FIRST_SESSION_DONE')) {
        showEmpty('Hikâye adımı ilk seansın tamamlandıktan sonra açılır.');
        return;
      }
      await reloadStory();
      if (!vm) {
        showEmpty('Henüz bir hikâye taslağın yok. Soruları cevapla ya da hazır hikâyeni yükle.');
        return;
      }
      if (status() === 'PAUSED') window.Api.ui.showError(cardsWrap || section, 'Hikâye akışın duraklatıldı; düzenlemek için Hikâyem\'den devam et.', { tone: 'info', position: 'before' });
      renderAll();
    } catch (error) {
      title.textContent = 'Satış hikâyen';
      window.Api.ui.showError(section, error);
    }
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
