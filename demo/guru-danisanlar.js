// guru-danisanlar.js — Danışanlarım listesi. Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/clients (sayfalı, tüm sayfalar) → Client{enrollment, candidate, story_session_id, story_status}.
// GAP-B06: listede hedef rol / tamamlanan seans / son işlem yok → bu sütunlar gizlenir; satır başına ek istek
// (N+1) atılmaz (Orchestrator kararı). Hedef rol ve seanslar danışan detayında (profile_answers, sessions).
(function () {
  'use strict';
  if (!window.Api || !window.GuruPanel) return;
  const Api = window.Api;
  const G = window.GuruPanel;

  const table = document.querySelector('main table');
  const tbody = table?.querySelector('tbody');
  const card = table?.closest('.overflow-hidden');
  if (!table || !tbody || !card) return;

  // Karşılığı olmayan sütunlar (GAP-B06): Hedef rol, Seans, Son işlem.
  const HIDDEN = ['Hedef rol', 'Seans', 'Son işlem'];
  const headers = Array.from(table.querySelectorAll('thead th'));
  headers.forEach(th => { if (HIDDEN.includes(th.textContent.trim())) th.remove(); });

  const BADGE = {
    active: 'inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#EEECFF] text-[#51409D] border border-[#BCB7F5]',
    muted: 'inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
  };

  function cell(className, content) {
    const td = document.createElement('td');
    td.className = className;
    if (content instanceof Node) td.appendChild(content);
    else td.textContent = content || '';
    return td;
  }

  function row(client) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-container-low transition-colors';
    const name = Api.format.fullName(client.candidate) || 'Danışan';
    const status = G.storyStatus(client.story_status);
    const badge = document.createElement('span');
    badge.className = BADGE[status.tone];
    badge.textContent = client.enrollment.status === 'pending_payment' ? 'Ödeme bekleniyor' : status.label;
    const link = document.createElement('a');
    link.className = 'text-[14px] font-medium text-[#51409D] hover:underline underline-offset-4 inline-flex items-center gap-0.5';
    const query = new URLSearchParams({ enrollment: client.enrollment.id });
    if (client.story_session_id) query.set('story', client.story_session_id);
    link.href = 'guru-danisan-detay.html?' + query.toString();
    link.dataset.navSkip = '';
    link.textContent = 'Aç →';
    link.setAttribute('aria-label', name + ' detayını aç');
    tr.append(
      cell('py-4 px-5 font-medium text-[14px] text-[#1E1E1C]', name),
      cell('py-4 px-5', badge),
      cell('py-4 px-5 text-right', link)
    );
    return tr;
  }

  function messageRow(text) {
    const tr = document.createElement('tr');
    const td = cell('py-6 px-5 text-[14px] text-muted', text);
    td.colSpan = table.querySelectorAll('thead th').length || 3;
    tr.appendChild(td);
    return tr;
  }

  async function load() {
    tbody.replaceChildren(messageRow('Danışanlar yükleniyor…'));
    card.setAttribute('aria-busy', 'true');
    try {
      await window.sessionReady;
      const clients = await Api.listAll('/guru/clients', { limit: 100 });
      // Ödeme bekleyen ve iptal edilen kayıtlar en sona.
      const order = { active: 0, completed: 1, pending_payment: 2, cancelled: 3 };
      clients.sort((a, b) => (order[a.enrollment.status] ?? 9) - (order[b.enrollment.status] ?? 9) ||
        Date.parse(b.enrollment.created_at) - Date.parse(a.enrollment.created_at));
      if (!clients.length) {
        tbody.replaceChildren(messageRow('Henüz danışanın yok. Bir aday seninle hizmet satın aldığında burada görünür.'));
      } else {
        tbody.replaceChildren(...clients.map(row));
      }
    } catch (error) {
      tbody.replaceChildren(messageRow(Api.ui.message(error)));
      Api.ui.showError(card, error, { position: 'before' });
    } finally {
      card.removeAttribute('aria-busy');
    }
  }

  load();
})();
