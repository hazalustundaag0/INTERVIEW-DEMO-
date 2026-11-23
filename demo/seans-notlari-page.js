// seans-notlari-page.js — Danışmanın adayla paylaştığı seans notları (83).
//   GET /candidate/stories/{storyID}/notes → yalnız adaya görünür notlar (is_visible_to_candidate)
// Seans eşlemesi (GAP-B17): ?seans=1 (varsayılan) → first_session_note, ?seans=2 → feedback.
// "Sonraki adımlar" kartının backend karşılığı yok → gizlenir. Statik guru notu/isim/tarih kaldırıldı (GAP-D13).
(function () {
  'use strict';
  const container = document.querySelector('main section > div');
  const title = container && container.querySelector('h1');
  const authorCard = title && title.nextElementSibling;
  const generalCard = Array.from(document.querySelectorAll('main h2')).find(h => h.textContent.trim() === 'Genel not')?.parentElement;
  const nextCard = Array.from(document.querySelectorAll('main h2')).find(h => h.textContent.trim() === 'Sonraki adımlar')?.parentElement;
  const cta = Array.from(document.querySelectorAll('main a')).find(a => a.textContent.includes('Hikâyeni Oluştur'));
  const param = new URLSearchParams(location.search).get('seans');
  let seq = param === '2' ? 2 : 1;
  let KIND = seq === 2 ? 'feedback' : 'first_session_note';

  if (nextCard) nextCard.hidden = true;
  if (authorCard) authorCard.hidden = true;
  if (generalCard) generalCard.hidden = true;
  if (cta) cta.hidden = true;
  if (title) title.textContent = 'Seans ' + seq + ' notları';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function init() {
    try {
      const ctx = await window.Journey.load();
      if (!ctx.enrollment || !ctx.story) { window.Journey.showNoEnrollment(container); return; }
      const [shared, guru] = await Promise.all([window.Journey.sharedNotes(ctx), window.Journey.guru(ctx)]);
      const notes = shared.all;
      // Etap 14 (TC-UC19-001): ?seans verilmemişse en son not paylaşılan seans gösterilir.
      if (param !== '1' && param !== '2' && shared.latestSeq) {
        seq = shared.latestSeq;
        KIND = seq === 2 ? 'feedback' : 'first_session_note';
        if (title) title.textContent = 'Seans ' + seq + ' notları';
      }
      // Diğer seansın notları da varsa geçiş bağlantısı
      const other = seq === 2 ? 1 : 2;
      if (title && shared.bySeq[other] && shared.bySeq[other].length && !document.querySelector('[data-other-session-notes]')) {
        const link = el('a', 'text-[#51409D] hover:underline font-medium text-[14px]', 'Seans ' + other + ' notlarını gör →');
        link.href = window.Journey.notesHref(other);
        link.setAttribute('data-other-session-notes', '');
        link.setAttribute('data-nav-skip', '');
        link.style.display = 'inline-block';
        link.style.marginTop = '.25rem';
        title.insertAdjacentElement('afterend', link);
      }
      const list = notes.filter(note => note.note_kind === KIND)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      if (!list.length) {
        window.Api.ui.showError(title, 'Danışmanın bu seans için henüz not paylaşmadı.', { tone: 'info', position: 'after' });
      } else {
        if (authorCard) {
          const avatar = authorCard.querySelector('.rounded-full');
          const spans = authorCard.querySelectorAll('.flex.flex-col > span');
          if (avatar) avatar.textContent = guru ? window.Journey.initials(guru.ad) : '';
          if (spans[0]) spans[0].textContent = guru ? guru.ad : 'Danışmanın';
          if (spans[1]) spans[1].textContent = window.Api.format.date(list[0].updated_at || list[0].created_at, { day: 'numeric', month: 'long' }) + ' · ' + window.Api.format.time(list[0].updated_at || list[0].created_at);
          authorCard.hidden = false;
        }
        if (generalCard) {
          generalCard.querySelectorAll('p').forEach(p => p.remove());
          list.forEach(note => generalCard.appendChild(el('p', 'font-body-md text-[14px] text-muted whitespace-pre-line', note.note_text)));
          generalCard.hidden = false;
        }
      }
      if (cta) {
        const status = window.Journey.storyStatus(ctx.story);
        if (status === 'FIRST_SESSION_DONE' || status === 'QA_IN_PROGRESS') {
          cta.href = '/hikaye/yaz';
          cta.textContent = status === 'QA_IN_PROGRESS' ? 'Sorulara devam et →' : 'Hikâyeni Oluştur →';
          cta.hidden = false;
        } else if (window.Journey.atLeast(ctx.story, 'DRAFT_GENERATED')) {
          cta.href = '/hikaye/hazir';
          cta.textContent = 'Hikâyeme git →';
          cta.hidden = false;
        }
        cta.setAttribute('data-nav-skip', '');
      }
      window.Journey.refreshSidebar(ctx).catch(() => {});
    } catch (error) {
      window.Api.ui.showError(container, error);
    }
  }

  // QA-024: init, tüm betikler (aday-yolculuk.js dahil) çalıştıktan ve oturum doğrulandıktan sonra başlar.
  new Promise(resolve => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve, { once: true }) : resolve()))
    .then(() => window.sessionReady).then(init);
})();
