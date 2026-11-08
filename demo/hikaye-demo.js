// hikaye-demo.js — Hikâye girişi (83): danışman notu + "Sorulara Başla" / "Hikâyemi Yükle".
//   GET  /candidate/stories/{id}/notes        → adaya görünür ilk seans notu (sabit not metinleri kaldırıldı, GAP-D13)
//   POST /candidate/stories/{id}/qa/start     → FIRST_SESSION_DONE'da ilk kez (soru seti + istem yapılandırması bağlanır)
//   POST /candidate/stories/{id}/resume       → PAUSED ise kaldığı yerden
//   GET  /candidate/stories/{id}              → QA_IN_PROGRESS'te sıradaki soru (next.question.sequence_no → soruN.html)
// 1. seans tamamlanmadan (FIRST_SESSION_DONE öncesi) iki seçenek de kapalıdır (409 invalid_transition'ı önler).
(function () {
  'use strict';
  const card = document.querySelector('main section > div');
  const startButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sorulara Başla'));
  const uploadButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Hikâyemi Yükle'));
  const notesTitle = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim() === 'Danışmanının seans notları');
  const notesCard = notesTitle && notesTitle.closest('div.mt-6');
  const notesMeta = notesTitle && notesTitle.nextElementSibling;
  const notesText = notesCard && notesCard.querySelector(':scope > p');
  const notesLink = notesCard && Array.from(notesCard.querySelectorAll('a')).find(a => a.textContent.includes('Notların tamamını oku'));
  const notesAvatar = notesCard && notesCard.querySelector('.rounded-full');

  if (notesCard) notesCard.hidden = true;
  [startButton, uploadButton].forEach(button => { if (button) { button.disabled = true; } });
  startButton?.setAttribute('data-action', 'qa-start');
  uploadButton?.setAttribute('data-nav-skip', '');

  let ctx = null;

  function go(href) { window.Nav ? window.Nav.go(href) : (location.href = href); }

  function questionPage(state) {
    const next = state && state.next;
    const questions = (state && state.questions) || [];
    if (next && next.question) return 'soru' + next.question.sequence_no + '.html';
    if (next && next.follow_up) {
      const answer = (state.answers || []).find(a => a.id === next.follow_up.answer_id);
      const q = answer && questions.find(item => item.id === answer.question_id);
      if (q) return 'soru' + q.sequence_no + '.html';
    }
    const last = questions.reduce((max, q) => Math.max(max, q.sequence_no), 0) || 5;
    return 'soru' + Math.min(last, 5) + '.html';
  }

  async function start() {
    const id = encodeURIComponent(ctx.story.id);
    const status = ctx.story.status;
    let state;
    if (status === 'FIRST_SESSION_DONE') state = await window.Api.post('/candidate/stories/' + id + '/qa/start');
    else if (status === 'PAUSED') state = await window.Api.post('/candidate/stories/' + id + '/resume');
    else state = await window.Api.get('/candidate/stories/' + id);
    // Sunucunun sıradaki adımı (current_question_id / bekleyen takip) önceliklidir; last_screen yalnız yedek.
    const last = state.session && state.session.last_screen;
    const hasNext = state.next && (state.next.question || state.next.follow_up);
    if (!hasNext && last && /^soru[1-5]\.html$/.test(last)) return go(last);
    go(questionPage(state));
  }

  startButton?.addEventListener('click', async event => {
    event.preventDefault();
    if (!ctx || !ctx.story) return;
    if (window.Journey.atLeast(ctx.story, 'DRAFT_GENERATED')) return go('ciktilar.html');
    window.Api.ui.clearError(card);
    try {
      await window.Api.ui.withLoading(startButton, start, { text: 'Hazırlanıyor…' });
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  });

  uploadButton?.addEventListener('click', event => {
    event.preventDefault();
    if (!uploadButton.disabled) go('hikaye-yukle.html');
  });

  async function renderNotes() {
    if (!notesCard || !ctx.story) return;
    const [notes, guru] = await Promise.all([
      window.Api.listAll('/candidate/stories/' + encodeURIComponent(ctx.story.id) + '/notes').catch(() => []),
      window.Journey.guru(ctx)
    ]);
    const list = notes.filter(note => note.note_kind === 'first_session_note')
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    if (!list.length) return;
    const latest = list[0];
    if (notesAvatar) notesAvatar.textContent = guru ? window.Journey.initials(guru.ad) : '';
    if (notesMeta) {
      notesMeta.replaceChildren(document.createTextNode((guru ? guru.ad : 'Danışmanın') + ' • '));
      const when = document.createElement('span');
      when.className = 'text-muted';
      when.textContent = window.Api.format.dateTime(latest.updated_at || latest.created_at);
      notesMeta.appendChild(when);
    }
    if (notesText) notesText.textContent = latest.note_text;
    if (notesLink) {
      notesLink.href = 'seans-notlari.html';
      notesLink.setAttribute('data-nav-skip', '');
      notesLink.hidden = list.length < 2 && latest.note_text.length < 280;
    }
    notesCard.hidden = false;
  }

  async function init() {
    try {
      ctx = await window.Journey.load();
      if (!ctx.enrollment || !ctx.story) { window.Journey.showNoEnrollment(card); return; }
      window.Journey.refreshSidebar(ctx).catch(() => {});
      const status = window.Journey.storyStatus(ctx.story);
      if (!window.Journey.atLeast(ctx.story, 'FIRST_SESSION_DONE')) {
        window.Api.ui.showError(card, 'Hikâye adımı ilk seansın danışmanın tarafından tamamlandıktan sonra açılır.', { tone: 'info' });
        return;
      }
      if (status === 'COMPLETED') {
        startButton.textContent = 'Hikâyeme git →';
        startButton.disabled = false;
        window.Api.ui.showError(card, 'Hikâyeni onayladın; son hâli Hikâyem bölümünde.', { tone: 'info' });
      } else if (window.Journey.atLeast(ctx.story, 'DRAFT_GENERATED')) {
        startButton.textContent = 'Hikâyeme git →';
        startButton.disabled = false;
        uploadButton.disabled = false;
      } else {
        if (status === 'QA_IN_PROGRESS') startButton.textContent = ctx.story.status === 'PAUSED' ? 'Kaldığın yerden devam et →' : 'Sorulara devam et →';
        startButton.disabled = false;
        uploadButton.disabled = false;
      }
      await renderNotes();
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
