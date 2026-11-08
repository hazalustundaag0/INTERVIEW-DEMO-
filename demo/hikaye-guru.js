// hikaye-guru.js — Guru · danışan hikâyesi (guru-hikaye.html). Sahibi: 84 Guru Panel UI.
// hikaye-veri.js'in guru kısmının (renderAdvisor) API'ye bağlı karşılığıdır; örnek hikâye, öneriler (GAP-B08),
// "Yönetim · Takip sorusu yapılandırması" editörü (GAP-U08, yöneticiye ait) ve "Hikâyeyi onayla" (GAP-U09) YOK.
//
// Veri:  GET /guru/enrollments/{id}       → başlık + hikâye kimliği + raw_access (rızadan bağımsız)
//        GET /guru/stories/{id}           → GuruStory{session, draft{draft, info_needed}, outputs, raw_access, raw}
//        GET /guru/stories/{id}/notes     → cümle notları (sentence_comment)
//        POST /guru/stories/{id}/notes · PUT /guru/notes/{id} → cümle notu kaydet
// K45: rıza yoksa backend 403 no_guru_visibility döner → hikâye metni, ham cevaplar ve çıktılar GÖSTERİLMEZ;
//      tasarım içi bilgi kutusu gösterilir. raw_access=false iken hikâye isteği hiç atılmaz.
(function () {
  'use strict';
  if (!window.Api || !window.GuruPanel || !window.StoryModel) return;
  const Api = window.Api;
  const G = window.GuruPanel;
  const SM = window.StoryModel;
  const el = SM.dom.element;

  const storyTab = Array.from(document.querySelectorAll('button')).find(node => node.textContent.trim() === 'Hikâye');
  const tabBar = storyTab?.parentElement;
  const placeholder = document.querySelector('[data-story-panel]') || tabBar?.nextElementSibling;
  if (!tabBar || !placeholder) return;

  // ─── Sekmeler ──────────────────────────────────────────────────────────────
  const tabs = Array.from(tabBar.querySelectorAll(':scope > button'));
  tabBar.setAttribute('role', 'tablist');
  tabBar.setAttribute('aria-label', 'Danışan detay sekmeleri');
  tabs.forEach((tab, index) => {
    const label = tab.textContent.trim();
    const active = label === 'Hikâye';
    tab.id = 'client-tab-' + index;
    tab.dataset.tabLabel = label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-label', label);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
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
  function setTabCount(label, count) {
    const tab = tabs.find(item => item.dataset.tabLabel === label);
    if (!tab) return;
    tab.querySelector('.advisor-story-tab-count')?.remove();
    const badge = el('span', 'advisor-story-tab-count', String(count));
    badge.setAttribute('aria-hidden', 'true');
    tab.setAttribute('aria-label', label + ', ' + count + ' kayıt');
    tab.appendChild(badge);
  }

  const panel = el('div', 'advisor-story-panel flex flex-col gap-8');
  panel.id = 'client-panel-story';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', storyTab.id);
  panel.setAttribute('aria-busy', 'true');
  panel.tabIndex = 0;
  storyTab.setAttribute('aria-controls', panel.id);
  placeholder.replaceWith(panel);
  panel.appendChild(el('p', 'text-[14px] text-muted', 'Hikâye yükleniyor…'));

  function toast(message) {
    document.querySelector('.advisor-story-toast')?.remove();
    const node = el('div', 'advisor-story-toast', message);
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
    window.setTimeout(() => node.remove(), 2800);
  }

  function actionBar(brief) {
    document.querySelector('.advisor-story-action-bar')?.remove();
    const bar = el('div', 'advisor-story-action-bar');
    [['guru-notlar.html', 'edit_note', 'Danışana not yaz'], ['guru-odevler.html', 'assignment_add', 'Ödev ver']].forEach(([href, iconName, label]) => {
      const link = el('a', 'advisor-story-action advisor-story-action--secondary', '');
      link.href = G.clientHref(href, brief);
      link.dataset.navSkip = '';
      const icon = el('span', 'material-symbols-outlined', iconName);
      icon.setAttribute('aria-hidden', 'true');
      link.setAttribute('aria-label', label);
      link.append(icon, document.createTextNode(label));
      bar.appendChild(link);
    });
    document.body.appendChild(bar);
  }

  // K45 / boş durumlar: hikâye içeriği olmadan, mevcut izin notu görsel diliyle.
  function infoState(icon, title, text) {
    panel.replaceChildren();
    G.showState(panel, { icon, title, text });
    panel.removeAttribute('aria-busy');
  }

  const CREATED_BY = {
    ai: ['auto_awesome', 'YZ ile oluşturuldu'],
    candidate_edit: ['edit', 'Aday düzenledi'],
    external_upload: ['upload_file', 'Aday yükledi']
  };

  function render(brief, story, notes) {
    const draftView = story.draft;
    const draft = draftView.draft;
    const raw = story.raw;
    const answerIndex = SM.answerIndex(raw);
    const questionById = new Map((raw?.questions || []).map(q => [q.id, q]));
    // Cümleler: ham kaynaklar (/raw, rızalı) varsa cümle-kaynak eşlemesiyle, yoksa metinden bölünerek.
    const sources = (raw?.sources || []).slice().sort((a, b) => a.sentence_no - b.sentence_no);
    const sentences = sources.length
      ? sources.map(s => ({ no: s.sentence_no, text: s.sentence_text, sourceType: s.source_type, answerId: s.answer_id, followUpId: s.follow_up_id, unsourced: s.is_unsourced }))
      : SM.splitSentences(draft.story_text).map((text, index) => ({ no: index + 1, text, sourceType: null, answerId: null, followUpId: null, unsourced: true }));
    const sentenceNotes = new Map(notes
      .filter(note => note.note_kind === 'sentence_comment' && note.story_draft_id === draft.id && note.sentence_no)
      .map(note => [note.sentence_no, note]));

    panel.replaceChildren();
    const sharedNote = el('p', 'advisor-permission-note', '');
    const permissionIcon = el('span', 'material-symbols-outlined advisor-permission-icon', 'lock');
    permissionIcon.setAttribute('aria-hidden', 'true');
    sharedNote.append(permissionIcon, el('span', '', 'Bu bölümleri adayın izniyle görüyorsun.'));
    document.querySelectorAll('.advisor-permission-note').forEach(note => note.remove());
    tabBar.before(sharedNote);

    // Üst bilgi: paylaşım rozeti · sürüm · kelime · kaynak türü
    const metadata = el('div', 'advisor-story-metadata-row');
    const sharedBadge = el('span', 'advisor-story-shared-badge');
    sharedBadge.append(el('span', 'advisor-story-shared-dot'), document.createTextNode('Aday hikâyeyi seninle paylaştı'));
    metadata.appendChild(sharedBadge);
    const versionLabel = el('div', 'advisor-version-badge');
    const versionButton = el('button', 'advisor-version-button', 'Sürüm ' + draft.version_no);
    versionButton.type = 'button';
    versionButton.setAttribute('aria-label', 'Hikâye sürüm bilgisini göster');
    versionButton.addEventListener('click', () => toast('Sürüm ' + draft.version_no + ' · ' + draft.word_count + ' kelime · ' + Api.format.dateTime(draft.created_at)));
    versionLabel.append(versionButton, document.createTextNode(' · '), el('span', 'advisor-word-count', draft.word_count + ' kelime'));
    metadata.appendChild(versionLabel);
    const [createdIcon, createdText] = CREATED_BY[draft.created_by] || CREATED_BY.ai;
    const generatedBadge = el('span', 'advisor-generated-badge');
    const generatedIcon = el('span', 'material-symbols-outlined', createdIcon);
    generatedIcon.setAttribute('aria-hidden', 'true');
    generatedBadge.append(generatedIcon, document.createTextNode(createdText));
    metadata.appendChild(generatedBadge);
    panel.appendChild(metadata);

    const columns = el('div', 'advisor-story-columns grid grid-cols-1 items-start gap-5 lg:grid-cols-12');
    const storyColumn = el('div', 'advisor-story-sections flex flex-col gap-8 lg:col-span-8');
    const sourceColumn = el('aside', 'advisor-source-column flex flex-col gap-2 lg:col-span-4');
    const storyBox = el('div', 'advisor-story-copy rounded-[8px] border border-[#7564C7] bg-white p-5');
    storyBox.id = 'advisor-story-copy';

    // Kaynak sütunu: danışanın cevapları (yalnız /raw ile, K45)
    const sourceCard = el('section', 'advisor-source-card');
    const sourceTitle = el('h3', 'advisor-source-title');
    const sourceTitleIcon = el('span', 'material-symbols-outlined', 'forum');
    sourceTitleIcon.setAttribute('aria-hidden', 'true');
    sourceTitle.append(sourceTitleIcon, el('span', '', 'Kaynak · danışanın cevapları'));
    const sourceBox = el('div', 'advisor-source-list');
    sourceBox.setAttribute('aria-live', 'polite');
    sourceCard.append(sourceTitle, sourceBox);
    sourceColumn.append(sourceCard);
    const sourceEntries = new Map();
    const answers = (raw?.answers || []).slice().sort((a, b) =>
      ((questionById.get(a.question_id) || {}).sequence_no || 0) - ((questionById.get(b.question_id) || {}).sequence_no || 0));
    answers.forEach(answer => {
      const ref = answerIndex.get(answer.id) || {};
      const article = el('article', 'advisor-source-answer');
      article.dataset.sourceId = answer.id;
      article.append(
        el('h4', 'advisor-source-question', 'Cevap ' + (ref.questionNo || '') + ' · ' + (ref.questionText || '')),
        el('p', 'advisor-source-quote', answer.is_info_needed ? 'Aday bu soruyu “hatırlamıyorum” diyerek geçti.' : '“' + answer.answer_text + '”')
      );
      sourceEntries.set(answer.id, article);
      sourceBox.appendChild(article);
    });
    if (!answers.length) sourceBox.appendChild(el('p', 'text-[13px] text-muted', 'Bu hikâye adayın yüklediği metinden oluşturuldu; soru-cevap kaynağı yok.'));

    const followUps = raw?.follow_ups || [];
    const followUpAnswer = new Map(followUps.map(f => [f.id, f.answer_id]));
    function updateSource(sentence) {
      const key = sentence ? (sentence.answerId || followUpAnswer.get(sentence.followUpId) || null) : null;
      sourceEntries.forEach((article, id) => {
        article.classList.toggle('is-source-active', id === key);
        article.setAttribute('aria-current', String(id === key));
      });
    }

    let selectedNo = sentences[0]?.no;
    sentences.forEach((sentence, index) => {
      const row = el('div', 'advisor-story-sentence');
      const button = el('button', 'advisor-story-sentence-button', sentence.text);
      button.type = 'button';
      button.dataset.sentenceNo = String(sentence.no);
      button.setAttribute('aria-pressed', String(sentence.no === selectedNo));
      const sourceText = sentence.sourceType ? SM.sourceLabel(sentence, answerIndex) : 'Kaynak yok';
      button.title = sourceText;
      button.addEventListener('click', () => {
        selectedNo = sentence.no;
        storyBox.querySelectorAll('[data-sentence-no]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.sentenceNo === String(selectedNo))));
        updateSource(sentence);
      });
      const restore = () => updateSource(sentences.find(item => item.no === selectedNo));
      button.addEventListener('mouseenter', () => updateSource(sentence));
      button.addEventListener('focus', () => updateSource(sentence));
      button.addEventListener('mouseleave', restore);
      button.addEventListener('blur', restore);

      const noteAction = el('button', 'advisor-story-note-action', '');
      noteAction.type = 'button';
      noteAction.title = 'Yorum ekle';
      noteAction.setAttribute('aria-label', 'Yorum ekle');
      noteAction.setAttribute('aria-expanded', 'false');
      noteAction.setAttribute('aria-controls', 'story-comment-' + sentence.no);
      noteAction.appendChild(el('span', 'material-symbols-outlined', 'add_comment'));
      row.append(button, noteAction);
      const existing = sentenceNotes.get(sentence.no);
      if (existing) row.appendChild(el('span', 'rounded-full bg-[#EEECFF] px-2 py-0.5 text-[11px] font-semibold text-[#51409D]', 'Not eklendi'));
      const noteArea = el('div', 'advisor-story-note-area hidden pb-2 pl-2');
      noteArea.id = 'story-comment-' + sentence.no;
      noteArea.setAttribute('role', 'region');
      noteArea.setAttribute('aria-label', sentence.text);
      noteAction.addEventListener('click', () => {
        noteArea.classList.toggle('hidden');
        noteAction.setAttribute('aria-expanded', String(!noteArea.classList.contains('hidden')));
        if (noteArea.childElementCount) return;
        const form = el('form', 'flex flex-col gap-2');
        const textarea = el('textarea', 'w-full rounded-[8px] border border-[#DEDaf4] p-2 text-[13px] focus:border-[#51409D] focus:outline-none');
        textarea.rows = 3;
        textarea.maxLength = 1000;
        textarea.placeholder = 'Bu cümleyle ilgili notun...';
        textarea.value = existing?.note_text || '';
        const hint = el('p', 'text-[12px] text-[#5B5F6B]', existing && existing.is_visible_to_candidate
          ? 'Bu not adayla paylaşıldı.' : 'Not taslak olarak kaydedilir; Notlar sekmesinden adayla paylaşabilirsin.');
        const save = el('button', 'self-start rounded-[7px] bg-[#51409D] px-3 py-1.5 text-[13px] font-semibold text-white', 'Kaydet');
        save.type = 'submit';
        save.dataset.action = 'save-sentence-note';
        form.append(textarea, hint, save);
        form.addEventListener('submit', async event => {
          event.preventDefault();
          const text = textarea.value.trim();
          Api.ui.clearError(form);
          if (!text) { Api.ui.showError(form, 'Notu boş bırakamazsın.', { position: 'append' }); textarea.focus(); return; }
          try {
            await Api.ui.withLoading(save, () => existing
              ? Api.put('/guru/notes/' + existing.id, { note_text: text, is_visible_to_candidate: existing.is_visible_to_candidate })
              : Api.post('/guru/stories/' + story.session.id + '/notes', {
                note_kind: 'sentence_comment', note_text: text, is_visible_to_candidate: false,
                story_draft_id: draft.id, sentence_no: sentence.no
              }), { text: 'Kaydediliyor…' });
            toast('Cümle notu kaydedildi.');
            load();
          } catch (error) {
            Api.ui.showError(form, error, { position: 'append' });
          }
        });
        noteArea.appendChild(form);
        textarea.focus();
      });
      const group = el('div', 'advisor-story-group' + (index === 0 ? ' advisor-story-group--lead' : ''));
      group.append(row, noteArea);
      storyBox.appendChild(group);
      storyBox.appendChild(document.createTextNode(' '));
    });
    updateSource(sentences.find(item => item.no === selectedNo));
    storyColumn.appendChild(storyBox);

    // Seansta tamamlanacaklar: [bilgi gerekli] işaretleri (takip türü ataması yönetici yapılandırmasıdır, GAP-U08)
    const missing = (draftView.info_needed || []).length
      ? draftView.info_needed
      : sentences.filter(s => SM.hasInfoNeeded(s.text)).map(s => s.text);
    const completion = el('section', 'rounded-[8px] border border-[#7564C7] bg-white p-4');
    completion.appendChild(el('h2', 'mb-2 text-[18px] font-semibold text-[#1E1E1C]', 'Seansta tamamlanacaklar'));
    if (missing.length) {
      const list = el('ul', 'flex flex-col gap-2 text-[14px] text-[#1E1E1C]');
      missing.forEach(text => {
        const item = el('li', 'flex flex-wrap items-center gap-2');
        item.append(el('span', 'theme-status-badge theme-status-badge--warning', 'Bilgi Gerekli'), el('span', '', text));
        list.appendChild(item);
      });
      completion.appendChild(list);
    } else {
      completion.appendChild(el('p', 'text-[14px] text-[#7564C7]', 'Tamamlanacak bilgi yok.'));
    }
    storyColumn.appendChild(completion);

    // YZ takip soruları ve adayın cevapları (/raw follow_ups)
    if (followUps.length) {
      const section = el('section', 'flex flex-col gap-2');
      section.appendChild(el('h2', 'text-[18px] font-semibold text-[#1E1E1C]', 'YZ takip soruları'));
      followUps.forEach(item => {
        const details = el('details', 'rounded-[8px] border border-[#7564C7] bg-white');
        const summary = el('summary', 'advisor-accordion-summary flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[14px] font-medium text-[#1E1E1C]');
        summary.setAttribute('aria-expanded', 'false');
        details.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(details.open)));
        summary.append(document.createTextNode(item.question_text), el('span', 'material-symbols-outlined text-[18px] text-[#7564C7]', 'chevron_right'));
        const ref = answerIndex.get(item.answer_id) || {};
        const body = el('div', 'border-t border-[#7564C7] px-4 py-3');
        body.append(
          el('p', 'mb-1 text-[12px] font-semibold text-[#7564C7]', Api.format.fullName(brief.candidate) + '’in cevabı:'),
          el('p', 'text-[14px] leading-6 text-[#1E1E1C]', item.answer_text || (item.is_info_needed ? 'Aday “hatırlamıyorum” dedi.' : 'Henüz cevaplanmadı.')),
          el('p', 'mt-2 text-[12px] text-[#51409D]', ref.questionNo ? 'Cevap ' + ref.questionNo + '’e bağlı' : '')
        );
        details.append(summary, body);
        section.appendChild(details);
      });
      storyColumn.appendChild(section);
    }

    columns.append(storyColumn, sourceColumn);
    panel.appendChild(columns);

    // Çıktılar (OutputsVM)
    const outputs = SM.fromOutputs(story.outputs || []);
    const outputsBox = el('details', 'rounded-[8px] border border-[#7564C7] bg-white');
    const outputsSummary = el('summary', 'advisor-accordion-summary cursor-pointer px-4 py-3 text-[15px] font-semibold text-[#1E1E1C]');
    outputsSummary.setAttribute('aria-expanded', 'false');
    outputsBox.addEventListener('toggle', () => outputsSummary.setAttribute('aria-expanded', String(outputsBox.open)));
    const outputsHeading = el('span', '', 'Çıktılar');
    outputsHeading.setAttribute('role', 'heading');
    outputsHeading.setAttribute('aria-level', '2');
    outputsSummary.appendChild(outputsHeading);
    outputsBox.appendChild(outputsSummary);
    const outputBody = el('div', 'flex flex-col gap-4 border-t border-[#7564C7] p-4');
    if (outputs.isEmpty) {
      outputBody.appendChild(el('p', 'text-[14px] text-[#7564C7]', 'Çıktılar henüz oluşturulmadı.'));
    } else {
      if (outputs.shortSummary) {
        outputBody.append(el('h3', 'text-[13px] font-semibold text-[#7564C7]', 'Kısa özet'), el('p', 'text-[14px] leading-6 text-[#1E1E1C] whitespace-pre-line', outputs.shortSummary));
      }
      if (outputs.interviewAnswers.length) {
        outputBody.appendChild(el('h3', 'text-[13px] font-semibold text-[#7564C7]', 'Mülakat cevapları'));
        outputs.interviewAnswers.forEach(item => {
          const answer = el('div', '');
          // GAP-B07: çıktı sorunun metnini taşımıyor → sıra numarasıyla başlık.
          answer.append(el('p', 'text-[14px] font-semibold text-[#1E1E1C]', 'Mülakat cevabı ' + item.itemNo), el('p', 'mt-1 text-[14px] leading-6 text-[#7564C7] whitespace-pre-line', item.content));
          outputBody.appendChild(answer);
        });
      }
      if (outputs.cvSummary) {
        outputBody.append(el('h3', 'text-[13px] font-semibold text-[#7564C7]', 'CV özeti'), el('p', 'text-[14px] leading-6 text-[#1E1E1C] whitespace-pre-line', outputs.cvSummary));
      }
    }
    outputsBox.appendChild(outputBody);
    panel.appendChild(outputsBox);
    panel.removeAttribute('aria-busy');
  }

  let loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    try {
      const brief = await G.loadClient();
      if (!brief) {
        infoState('person_search', 'Danışan seçilmedi', 'Danışanlarım listesinden bir danışan aç.');
        return;
      }
      actionBar(brief);
      const storyId = brief.story && brief.story.id;
      const notes = storyId ? await Api.listAll(`/guru/stories/${storyId}/notes`).catch(() => []) : [];
      setTabCount('Notlar', notes.length);
      Api.listAll(`/guru/enrollments/${brief.enrollment.id}/assignments`)
        .then(items => setTabCount('Ödevler', items.filter(a => a.status !== 'cancelled').length)).catch(() => {});
      if (!storyId) {
        infoState('auto_stories', 'Hikâye oturumu yok', 'Bu kayıt için henüz bir hikâye oturumu açılmadı.');
        return;
      }
      if (!brief.raw_access) {
        // K45: rıza yokken hikâye/ham veri istenmez; yalnız profil özeti (Genel sekmesi) açıktır.
        infoState('lock', 'Aday hikâyesini seninle paylaşmadı',
          'Hikâye metni, cevaplar ve çıktılar yalnızca adayın “guruyla paylaşım” onayıyla görünür. Profil özeti ve seanslar Genel sekmesinde.');
        return;
      }
      let story;
      try {
        story = await Api.get('/guru/stories/' + storyId);
      } catch (error) {
        if (error.is && error.is('no_guru_visibility')) {
          infoState('lock', 'Aday hikâyesini seninle paylaşmadı',
            'Hikâye metni, cevaplar ve çıktılar yalnızca adayın “guruyla paylaşım” onayıyla görünür.');
          return;
        }
        throw error;
      }
      if (!story.draft) {
        const status = G.storyStatus(story.session.status).label;
        infoState('hourglass_top', 'Hikâye henüz oluşturulmadı',
          'Aday soruları yanıtladığında veya hazır hikâyesini yüklediğinde taslak burada görünür. Durum: ' + status + '.');
        return;
      }
      render(brief, story, notes);
    } catch (error) {
      panel.removeAttribute('aria-busy');
      G.errorState(panel, error, error.status === 404 ? { title: 'Danışan bulunamadı', text: 'Bu kayıt sana atanmış değil ya da artık yok.' } : {});
    } finally {
      loading = false;
    }
  }

  // Mobil menü: nav.js setupPanelLayout ortak panel menüsünü kurar (eski setupStoryMobileNav gereksiz).
  load();
})();
