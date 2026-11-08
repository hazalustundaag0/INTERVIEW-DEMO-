// guru-ortak.js — Guru paneli ortak yardımcıları. Sahibi: 84 Guru Panel UI.
// Yükleme: config.js → api-client.js → gate.js → guru-ortak.js → sayfa betiği → nav.js
// Veri yalnız window.Api ile (GET /guru/...). localStorage kullanılmaz.
//
//   GuruPanel.params()                 → { enrollmentId, storyId } (URL ?enrollment=&story=, UUID)
//   GuruPanel.loadClient()             → Promise<CandidateBrief|null>: başlık (ad, baş harfler, hedef rol · sektör),
//                                        ?story= adres çubuğuna yazılır (nav.js sekme taşıması için)
//   GuruPanel.clientSubtitle(brief)    → 'Satış Uzmanı · Teknoloji / Yazılım' (profile_answers etiketleri, GAP-B05)
//   GuruPanel.answerValue(answer)      → seçenek etiketleri + serbest metin
//   GuruPanel.storyStatus(status)      → { label, tone:'active'|'muted' } (Client.story_status)
//   GuruPanel.addProfileActions()      → "Not Yaz" / "Ödev Ver" bağlantıları (nav.js addGuruProfileActions karşılığı)
//   GuruPanel.clientHref(page, brief)  → 'guru-notlar.html?enrollment=…&story=…'
//   GuruPanel.toast(message, cls)      → sayfanın mevcut toast sınıfıyla kısa bildirim
//   GuruPanel.showState(container, { icon, title, text, tone }) → bilgi / boş durum kutusu (mevcut not stili)
//   GuruPanel.mapLimit(items, n, fn)   → sınırlı eşzamanlılıkla Promise.all
//   GuruPanel.clearStaticCopy(root)    → tasarımdaki örnek metinleri (sahte isimler) temizler
(function () {
  'use strict';
  if (!window.Api) return;
  const Api = window.Api;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const CLIENT_TAB_PAGES = ['guru-danisan-detay.html', 'guru-hikaye.html', 'guru-notlar.html', 'guru-odevler.html'];
  const page = Api.pageName();

  function params() {
    const query = new URLSearchParams(location.search);
    const enrollment = query.get('enrollment');
    const story = query.get('story');
    return {
      enrollmentId: enrollment && UUID.test(enrollment) ? enrollment : null,
      storyId: story && UUID.test(story) ? story : null
    };
  }

  function answerValue(answer) {
    if (!answer) return '';
    const labels = (answer.options || []).map(option => option.label || option.value).filter(Boolean);
    const text = (answer.text || '').trim();
    return labels.concat(text ? [text] : []).join(', ');
  }

  function findAnswer(brief, key) {
    return (brief && Array.isArray(brief.profile_answers) ? brief.profile_answers : []).find(a => a.field_key === key) || null;
  }

  function clientSubtitle(brief) {
    return ['target_position', 'sector'].map(key => answerValue(findAnswer(brief, key))).filter(Boolean).join(' · ');
  }

  // Client.story_status → liste rozeti (tasarımdaki iki ton: mor = ilerliyor/hazır, gri = bekliyor).
  const STORY_STATUS = {
    NOT_STARTED: ['Başlamadı', 'muted'],
    PURCHASED: ['Başlamadı', 'muted'],
    PROFILE_COMPLETED: ['Başlamadı', 'muted'],
    CV_UPLOADED: ['Başlamadı', 'muted'],
    FIRST_SESSION_DONE: ['Sorulara hazır', 'muted'],
    QA_IN_PROGRESS: ['Sorular yanıtlanıyor', 'active'],
    PAUSED: ['Duraklatıldı', 'muted'],
    DRAFT_GENERATED: ['Taslak hazır', 'active'],
    CANDIDATE_EDITED: ['Taslak hazır', 'active'],
    SUMMARY_READY: ['Çıktılar hazır', 'active'],
    COMPLETED: ['Tamamlandı', 'active'],
    CANCELLED: ['İptal edildi', 'muted']
  };
  function storyStatus(status) {
    const entry = STORY_STATUS[status] || ['Başlamadı', 'muted'];
    return { label: entry[0], tone: entry[1] };
  }

  function clientHref(target, brief) {
    const p = params();
    const query = new URLSearchParams();
    const enrollmentId = (brief && brief.enrollment && brief.enrollment.id) || p.enrollmentId;
    const storyId = (brief && brief.story && brief.story.id) || p.storyId;
    if (enrollmentId) query.set('enrollment', enrollmentId);
    if (storyId) query.set('story', storyId);
    const qs = query.toString();
    return target + (qs ? '?' + qs : '');
  }

  function profileSection() {
    return Array.from(document.querySelectorAll('section')).find(element =>
      element.classList.contains('lg:col-span-8') && element.querySelector('h1'));
  }

  // nav.js addGuruProfileActions karşılığı (84'e taşındı). nav.js'teki kopya, kart zaten
  // .client-profile-actions içeriyorsa hiçbir şey yapmaz; 81 kopyayı silene kadar çift ekleme olmaz.
  function addProfileActions() {
    if (!CLIENT_TAB_PAGES.includes(page)) return;
    document.body.classList.add('guru-client-profile');
    if (page === 'guru-hikaye.html') document.body.classList.add('guru-story-page');
    const title = profileSection()?.querySelector('h1');
    const profileCard = title?.parentElement?.parentElement;
    if (!profileCard || profileCard.querySelector('.client-profile-actions')) return;
    profileCard.classList.add('client-profile-card');
    const actions = document.createElement('div');
    actions.className = 'client-profile-actions';
    [['Not Yaz', 'guru-notlar.html'], ['Ödev Ver', 'guru-odevler.html']].forEach(([label, href]) => {
      const link = document.createElement('a');
      link.className = 'client-profile-action' + (label === 'Ödev Ver' ? ' client-profile-action--primary' : '');
      link.href = clientHref(href);
      link.dataset.navSkip = '';
      link.dataset.clientLink = href;
      link.textContent = label;
      actions.append(link);
    });
    profileCard.append(actions);
  }

  function refreshClientLinks(brief) {
    document.querySelectorAll('[data-client-link]').forEach(link => {
      link.href = clientHref(link.dataset.clientLink, brief);
    });
    // "Danışanlarım" geri bağlantısı (tasarımda href="#").
    const back = Array.from(document.querySelectorAll('section a')).find(a =>
      a.getAttribute('href') === '#' && a.textContent.replace(/\s+/g, ' ').includes('Danışanlarım'));
    if (back) back.href = 'guru-danisanlar.html';
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => Array.from(part)[0].toLocaleUpperCase('tr-TR')).join('');
  }

  function fillHeader(brief) {
    const section = profileSection();
    const h1 = section?.querySelector('h1');
    if (!h1) return;
    const name = Api.format.fullName(brief.candidate) || 'Danışan';
    h1.textContent = name;
    h1.dataset.filled = 'true';
    const subtitle = h1.nextElementSibling;
    if (subtitle && subtitle.tagName === 'P') {
      const text = clientSubtitle(brief);
      subtitle.textContent = text;
      subtitle.hidden = !text;
    }
    const avatar = h1.parentElement?.previousElementSibling;
    if (avatar && !avatar.querySelector('*')) {
      avatar.textContent = initials(name);
      avatar.setAttribute('aria-label', name + ' baş harfleri');
    }
    document.title = name + ' · Danışan';
  }

  // Tasarımdaki örnek içerik (örnek aday/danışman adları) veri gelene kadar görünmesin.
  function clearStaticCopy(root) {
    const scope = root || document;
    const section = profileSection();
    const h1 = section?.querySelector('h1');
    if (h1 && CLIENT_TAB_PAGES.includes(page) && h1.dataset.filled !== 'true') {
      h1.textContent = '';
      if (h1.nextElementSibling && h1.nextElementSibling.tagName === 'P') h1.nextElementSibling.textContent = '';
    }
    scope.querySelectorAll('.advisor-sidebar .border-t .truncate, .advisor-sidebar .border-t .rounded-full').forEach(node => {
      node.textContent = '';
    });
  }

  let clientPromise = null;
  function loadClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      const p = params();
      await window.sessionReady;
      if (!p.enrollmentId) return null;
      const brief = await Api.get('/guru/enrollments/' + p.enrollmentId);
      fillHeader(brief);
      const storyId = brief.story && brief.story.id;
      if (storyId && storyId !== p.storyId) {
        const url = new URL(location.href);
        url.searchParams.set('story', storyId);
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      }
      refreshClientLinks(brief);
      return brief;
    })();
    return clientPromise;
  }

  // Bilgi / boş durum kutusu: mevcut "advisor-permission-note" + "note-info-box" görsel dili.
  function showState(container, options) {
    const o = options || {};
    if (!container) return null;
    const box = document.createElement('div');
    box.className = 'guru-state-box rounded-[8px] border border-[#BCB7F5] bg-[#EEECFF] px-4 py-4 text-[14px] text-[#1E1E1C] flex items-start gap-3';
    box.setAttribute('role', o.tone === 'error' ? 'alert' : 'status');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-[20px] text-[#51409D]';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = o.icon || 'info';
    const body = document.createElement('div');
    body.className = 'flex flex-col gap-1';
    if (o.title) {
      const title = document.createElement('strong');
      title.className = 'text-[15px] font-semibold text-[#51409D]';
      title.textContent = o.title;
      body.appendChild(title);
    }
    if (o.text) {
      const text = document.createElement('p');
      text.className = 'leading-relaxed';
      text.textContent = o.text;
      body.appendChild(text);
    }
    box.append(icon, body);
    if (o.replace) container.replaceChildren(box);
    else container.prepend(box);
    return box;
  }

  function errorState(container, error, extra) {
    const message = Api.ui.message(error);
    return showState(container, Object.assign({ icon: 'error', tone: 'error', title: 'Bilgiler yüklenemedi', text: message, replace: true }, extra));
  }

  const toastTimers = new WeakMap();
  function toast(message, className) {
    const cls = className || 'client-overview-toast';
    let node = document.querySelector('.' + cls);
    if (!node) {
      node = document.createElement('div');
      node.className = cls;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.append(node);
    }
    node.textContent = message;
    window.clearTimeout(toastTimers.get(node));
    toastTimers.set(node, window.setTimeout(() => node.remove(), 3200));
  }

  async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let index = 0;
    async function worker() {
      while (index < items.length) {
        const current = index;
        index += 1;
        results[current] = await fn(items[current], current);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  // Danışan sekmeleri için ortak giriş: header temizliği + profil eylemleri (DOM hazırken).
  if (CLIENT_TAB_PAGES.includes(page)) {
    const start = () => { clearStaticCopy(); addProfileActions(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  } else if (page.startsWith('guru-')) {
    const start = () => clearStaticCopy();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }

  window.GuruPanel = Object.freeze({
    params, loadClient, clientSubtitle, answerValue, findAnswer, storyStatus, clientHref, addProfileActions,
    showState, errorState, toast, mapLimit, clearStaticCopy, initials, CLIENT_TAB_PAGES
  });
})();
