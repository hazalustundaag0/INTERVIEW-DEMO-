// appointment-sync.js — Seans kartı görünüm yardımcıları. Sahibi: 81 Frontend Platform.
// Kullananlar: seanslar (83), guru-seanslar (84). Veri: EnrollmentSession
//   { id, enrollment_id, sequence_no, scheduled_start_at, scheduled_end_at, status:
//     not_scheduled|scheduled|completed|cancelled|no_show }
// Eski demoRandevu / demoIlkSeansTamamlandi / demoSeansNotu / demoGuruNotlari okumaları ve sahte
// Google Meet bağlantısı (demoLinkDurumu) kaldırıldı (GAP-D09, D15). Sayfa betikleri kartları API
// verisiyle doldurur ve aşağıdaki yardımcıları kullanır. Bağımlılık: availability.js (SlotTime)
// yüklüyse onu kullanır; değilse kendi biçimlendiricisiyle çalışır.
//
//   SessionView.dateLabel(iso)            → '10 Kasım Salı'
//   SessionView.timeRange(startIso, endIso) → '14:00 - 14:50'
//   SessionView.whenLabel(session)        → '10 Kasım Salı · 14:00 - 14:50' | 'Henüz planlanmadı'
//   SessionView.countdownLabel(iso)       → 'Bugün' | 'Yarın' | '3 gün sonra' | 'Seans tarihi geçti'
//   SessionView.statusInfo(session)       → { key:'upcoming'|'completed'|'unplanned'|'cancelled', label }
//   SessionView.applyStatusBadge(card, session) → [data-session-status] rozetini günceller
//   SessionView.renderJoinPlaceholder(container) → toplantı bağlantısı yok metni (FR-54 kapsam dışı)
//   SessionView.setupSessionTabs(cards, { onRender }) → Yaklaşan/Tamamlanan sekmeleri
//     (kart: data-session-key="upcoming|completed|unplanned"; sekme: [data-session-tab])
(function () {
  'use strict';
  const CONFIG = window.APP_CONFIG || {};
  const TZ = CONFIG.timeZone || 'Europe/Istanbul';
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function localDate(iso) {
    if (window.SlotTime) return window.SlotTime.parts(iso).date;
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  }

  function dateLabel(iso) {
    if (!iso) return '';
    if (window.SlotTime) return window.SlotTime.dateLabel(iso);
    const [year, month, day] = localDate(iso).split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    return `${day} ${MONTHS[month - 1]} ${WEEKDAYS[weekday]}`;
  }

  function timeRange(startIso, endIso) {
    if (!startIso) return '';
    if (window.SlotTime) return window.SlotTime.timeRange(startIso, endIso);
    const fmt = iso => new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
    return endIso ? `${fmt(startIso)} - ${fmt(endIso)}` : fmt(startIso);
  }

  function whenLabel(session) {
    if (!session || !session.scheduled_start_at) return 'Henüz planlanmadı';
    return `${dateLabel(session.scheduled_start_at)} · ${timeRange(session.scheduled_start_at, session.scheduled_end_at)}`;
  }

  function daysUntil(iso) {
    const [y, m, d] = localDate(iso).split('-').map(Number);
    const [ty, tm, td] = localDate(new Date().toISOString()).split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
  }

  function countdownLabel(iso) {
    if (!iso) return '';
    const days = daysUntil(iso);
    return days < 0 ? 'Seans tarihi geçti' : days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : days + ' gün sonra';
  }

  // Durum yalnız API'den: tarihi geçmiş ama guru tamamlamamış seans "Yaklaşan" kalır (FR-53).
  function statusInfo(session) {
    switch (session && session.status) {
      case 'completed': return { key: 'completed', label: 'Tamamlandı' };
      case 'scheduled': return { key: 'upcoming', label: 'Yaklaşan' };
      case 'cancelled': return { key: 'cancelled', label: 'İptal edildi' };
      case 'no_show': return { key: 'completed', label: 'Katılım olmadı' };
      default: return { key: 'unplanned', label: 'Planlanmadı' };
    }
  }

  function applyStatusBadge(card, session) {
    const info = statusInfo(session);
    card.dataset.sessionKey = info.key;
    const badge = card.querySelector('[data-session-status]');
    if (badge) {
      badge.textContent = info.label;
      badge.classList.toggle('candidate-session-status--complete', info.key === 'completed');
      badge.classList.toggle('candidate-session-status--planned', info.key === 'upcoming');
    }
    return info;
  }

  function renderJoinPlaceholder(container) {
    if (!container) return;
    const message = document.createElement('span');
    message.className = 'candidate-session-join-unavailable';
    message.textContent = 'Görüşme bağlantısı seanstan önce iletilecek';
    container.replaceChildren(message);
  }

  function setupSessionTabs(cards, options) {
    const o = options || {};
    const tabs = Array.from(document.querySelectorAll('[data-session-tab]'));
    const panel = document.getElementById('candidate-session-panel');
    const emptyState = document.querySelector('[data-session-empty]');
    if (tabs.length !== 2) return null;
    let activeTab = 'upcoming';

    function render() {
      const counts = {
        upcoming: cards.filter(card => card.dataset.sessionKey === 'upcoming').length,
        completed: cards.filter(card => card.dataset.sessionKey === 'completed').length
      };
      tabs.forEach(tab => {
        const key = tab.dataset.sessionTab;
        const selected = key === activeTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.textContent = `${key === 'upcoming' ? 'Yaklaşan' : 'Tamamlanan'} (${counts[key] || 0})`;
      });
      let visibleCount = 0;
      cards.forEach(card => {
        const visible = card.dataset.sessionKey === activeTab;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      if (panel) panel.setAttribute('aria-labelledby', activeTab === 'upcoming' ? 'candidate-tab-upcoming' : 'candidate-tab-completed');
      if (emptyState) {
        emptyState.textContent = visibleCount ? '' : activeTab === 'upcoming'
          ? 'Yaklaşan seans bulunmuyor.' : 'Henüz tamamlanan seans bulunmuyor.';
        emptyState.hidden = visibleCount > 0;
      }
      if (typeof o.onRender === 'function') o.onRender(activeTab, counts);
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => { activeTab = tab.dataset.sessionTab; render(); });
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = tabs.indexOf(tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });
    render();
    return { render, get activeTab() { return activeTab; } };
  }

  window.SessionView = Object.freeze({
    dateLabel, timeRange, whenLabel, countdownLabel, daysUntil, statusInfo, applyStatusBadge,
    renderJoinPlaceholder, setupSessionTabs
  });
})();
