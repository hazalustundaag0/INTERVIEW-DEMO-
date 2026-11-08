// randevu-ok-page.js — Randevu onayı ekranları (randevu-ok: 1. seans, seans2-ok: sonraki seans). Sahibi: 83.
// ?session=<uuid> (takvimden) yoksa en son planlanan seans gösterilir. Veri: enrollment detayı (sessions),
// hizmet şablon başlığı, /public/gurus/{guru_id}. Sahte tarih/isim yok; "hikâyen paylaşıldı" bandı yalnız
// hikâye taslağı varsa ve guruya gösterim rızası (guru_visibility, K45) güncelse görünür.
(function () {
  'use strict';
  const card = document.querySelector('main section > div');
  const rows = Array.from(document.querySelectorAll('main section .divide-y > div, main section .rounded-\\[10px\\].border > div'))
    .filter(row => row.children.length === 2 && row.firstElementChild.classList.contains('text-[14px]'));
  const row = label => rows.find(item => item.firstElementChild.textContent.trim() === label);
  const sessionValue = row('Seans')?.lastElementChild;
  const advisorValue = row('Danışman')?.lastElementChild;
  const dateValue = row('Tarih')?.lastElementChild;
  const timeValue = row('Saat')?.lastElementChild;
  const sharedBanner = Array.from(document.querySelectorAll('main section div')).find(div =>
    div.children.length === 2 && div.textContent.includes('Hikâyen kaydedildi ve danışmanınla paylaşıldı'));
  const linkNotice = Array.from(document.querySelectorAll('main section p')).find(p => p.textContent.includes('Görüşme linkini'));

  [sessionValue, advisorValue, dateValue, timeValue].forEach(node => { if (node) node.textContent = '…'; });
  if (sharedBanner) sharedBanner.hidden = true;
  // Toplantı bağlantısı alanı yok (GAP-B16): e-posta vaadi yerine dürüst metin.
  if (linkNotice) linkNotice.textContent = 'Görüşme bağlantısı seanstan önce danışmanın tarafından iletilecek.';

  async function init() {
    try {
      const ctx = await window.Journey.load();
      if (!ctx.enrollment) { window.Journey.showNoEnrollment(card); return; }
      const wanted = new URLSearchParams(location.search).get('session');
      const scheduled = ctx.sessions.filter(item => item.status === 'scheduled' || item.status === 'completed');
      const sessionItem = (wanted && ctx.sessions.find(item => item.id === wanted)) ||
        scheduled.sort((a, b) => Date.parse(b.scheduled_start_at || 0) - Date.parse(a.scheduled_start_at || 0))[0] || null;
      if (!sessionItem || !sessionItem.scheduled_start_at) {
        window.Api.ui.showError(card, 'Planlanmış bir seansın bulunamadı. Takvimden seans zamanı seçebilirsin.', { tone: 'info' });
        [sessionValue, advisorValue, dateValue, timeValue].forEach(node => { if (node) node.textContent = '—'; });
        return;
      }
      const [tpl, guru] = await Promise.all([window.Journey.template(ctx, sessionItem.sequence_no), window.Journey.guru(ctx)]);
      if (sessionValue) sessionValue.textContent = sessionItem.sequence_no + ' / ' + ctx.sessions.length + (tpl ? ' · ' + tpl.title : '');
      if (dateValue) dateValue.textContent = window.SessionView.dateLabel(sessionItem.scheduled_start_at);
      if (timeValue) timeValue.textContent = window.SessionView.timeRange(sessionItem.scheduled_start_at, sessionItem.scheduled_end_at) + ' (İstanbul)';
      if (advisorValue) {
        advisorValue.textContent = guru ? guru.ad : '—';
        if (guru && advisorValue.tagName === 'A') {
          advisorValue.href = 'danisman.html?id=' + encodeURIComponent(guru.id);
          advisorValue.setAttribute('data-nav-skip', '');
        }
      }
      if (sharedBanner && window.Journey.atLeast(ctx.story, 'DRAFT_GENERATED')) {
        const consents = await window.Api.get('/me/consents').catch(() => null);
        const visible = consents && (consents.items || []).some(item => item.kind === 'guru_visibility' && item.up_to_date);
        sharedBanner.hidden = !visible;
      }
      window.Journey.refreshSidebar(ctx).catch(() => {});
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  }

  (window.sessionReady || Promise.resolve()).then(init);
})();
