// aday-yolculuk.js — Aday yolculuk sayfalarının ortak durum/görünüm yardımcıları. Sahibi: 83.
// Yalnız 83 sayfaları yükler (ana, profil, cv, randevu-on, takvim, randevu-ok, seanslar, seans-notlari,
// seans2-ok, hikaye-giris, soru1–5, hikaye-yukle, ciktilar, odevler, odev-teslim, odev-goruntule).
// Veri yalnız window.Api ile; localStorage kullanılmaz. Durum olgulardan türetilir (K36): kayıt
// (enrollment) + seanslar + hikâye oturumu (story_session) + randevu ön koşulları.
//
//   Journey.load()               → ctx { enrollment, detail, sessions[], story, payments[] } | { enrollment:null }
//   Journey.storyStatus(story)   → PAUSED ise duraklatılmadan önceki durum
//   Journey.atLeast(story, 'FIRST_SESSION_DONE') → boolean
//   Journey.session(ctx, seq)    → EnrollmentSession | null
//   Journey.bookableSession(ctx) → ilk not_scheduled seans | null
//   Journey.prerequisites(ctx)   → { ready, missing[] } (GET …/booking-prerequisites)
//   Journey.assignments(ctx)     → Assignment[]
//   Journey.guru(ctx)            → Advisors görünüm modeli | null
//   Journey.template(ctx, seq)   → { title, purpose } | null (hizmet şablonu)
//   Journey.progress(ctx)        → { steps:[{label,state}], current }   (ana ekran 5 adım)
//   Journey.nextStep(ctx, pre)   → { title, description, cta:{label,href}, secondary }
//   Journey.applySidebar(ctx, { prerequisites, assignments }) → menüdeki kilit/onay işaretleri gerçek duruma göre
//   Journey.showNoEnrollment(container) → aktif hizmet yoksa bilgi kutusu
//   Journey.initials(name)
(function () {
  'use strict';

  const STORY_ORDER = ['NOT_STARTED', 'PURCHASED', 'PROFILE_COMPLETED', 'CV_UPLOADED', 'FIRST_SESSION_DONE',
    'QA_IN_PROGRESS', 'DRAFT_GENERATED', 'CANDIDATE_EDITED', 'SUMMARY_READY', 'COMPLETED'];
  const ENROLLMENT_PRIORITY = { active: 0, completed: 1, pending_payment: 2, cancelled: 3 };

  function api() {
    if (!window.Api) throw new Error('api-client.js yüklenmedi.');
    return window.Api;
  }

  async function ready() {
    if (window.sessionReady) await window.sessionReady;
  }

  function storyStatus(story) {
    if (!story) return null;
    if (story.status === 'PAUSED') return story.status_before_pause || 'QA_IN_PROGRESS';
    return story.status;
  }

  function rank(status) {
    return STORY_ORDER.indexOf(status);
  }

  function atLeast(story, status) {
    const current = storyStatus(story);
    return Boolean(current) && rank(current) >= rank(status);
  }

  async function activeEnrollment() {
    const items = await api().listAll('/candidate/enrollments');
    if (!items.length) return null;
    return items.slice().sort((a, b) =>
      (ENROLLMENT_PRIORITY[a.status] ?? 9) - (ENROLLMENT_PRIORITY[b.status] ?? 9) ||
      Date.parse(b.created_at) - Date.parse(a.created_at)
    )[0];
  }

  async function load() {
    await ready();
    const enrollment = await activeEnrollment();
    if (!enrollment) return { enrollment: null, sessions: [], story: null, payments: [] };
    const detail = await api().get('/candidate/enrollments/' + encodeURIComponent(enrollment.id));
    const sessions = (detail.sessions || []).slice().sort((a, b) => a.sequence_no - b.sequence_no);
    return { enrollment: detail.enrollment, detail, sessions, story: detail.story_session || null, payments: detail.payments || [] };
  }

  function session(ctx, seq) {
    return (ctx && ctx.sessions || []).find(item => item.sequence_no === seq) || null;
  }

  function bookableSession(ctx) {
    return (ctx && ctx.sessions || []).find(item => item.status === 'not_scheduled') || null;
  }

  async function prerequisites(ctx) {
    if (!ctx || !ctx.enrollment) return { ready: false, missing: ['payment'] };
    return api().get('/candidate/enrollments/' + encodeURIComponent(ctx.enrollment.id) + '/booking-prerequisites');
  }

  async function assignments(ctx) {
    if (!ctx || !ctx.enrollment) return [];
    return api().listAll('/candidate/enrollments/' + encodeURIComponent(ctx.enrollment.id) + '/assignments');
  }

  async function guru(ctx) {
    if (!ctx || !ctx.enrollment || !window.Advisors) return null;
    try {
      return await window.Advisors.get(ctx.enrollment.guru_id);
    } catch (error) {
      console.warn('Danışman bilgisi alınamadı.', error);
      return null;
    }
  }

  const serviceCache = new Map();
  async function template(ctx, seq) {
    if (!ctx || !ctx.enrollment) return null;
    const id = ctx.enrollment.service_id;
    if (!serviceCache.has(id)) {
      serviceCache.set(id, api().get('/public/services/' + encodeURIComponent(id), { auth: false }).catch(error => {
        serviceCache.delete(id);
        console.warn('Hizmet şablonları alınamadı.', error);
        return null;
      }));
    }
    const service = await serviceCache.get(id);
    const found = service && (service.templates || []).find(item => item.sequence_no === seq);
    return found ? { title: found.title, purpose: found.purpose } : null;
  }

  // Ana ekran 5 adımı: Hazırlık · 1. Seans · Hikâyen · 2. Seans · Tamamlandı
  function progress(ctx) {
    const story = ctx && ctx.story;
    const s1 = session(ctx, 1);
    const last = ctx && ctx.sessions && ctx.sessions.length ? ctx.sessions[ctx.sessions.length - 1] : null;
    const done = [
      atLeast(story, 'CV_UPLOADED'),
      (s1 && s1.status === 'completed') || atLeast(story, 'FIRST_SESSION_DONE'),
      atLeast(story, 'SUMMARY_READY'),
      Boolean(last && last !== s1 && last.status === 'completed'),
      storyStatus(story) === 'COMPLETED' && Boolean(last && last.status === 'completed')
    ];
    const labels = ['Hazırlık', '1. Seans', 'Hikâyen', '2. Seans', 'Tamamlandı'];
    let current = done.findIndex(value => !value);
    if (current < 0) current = labels.length;
    return {
      current,
      steps: labels.map((label, index) => ({ label, state: done[index] ? 'complete' : index === current ? 'current' : 'upcoming' }))
    };
  }

  function whenText(item) {
    if (!item || !item.scheduled_start_at) return '';
    return window.SessionView ? window.SessionView.whenLabel(item) : api().format.dateTime(item.scheduled_start_at);
  }

  // "Sıradaki adım" kartı — yalnız gerçek duruma göre (GAP-U15).
  function nextStep(ctx, pre) {
    if (!ctx || !ctx.enrollment) {
      return { title: 'Danışmanını seç', description: 'Henüz aktif bir hizmetin yok. Danışmanını seçip hizmeti satın alarak başlayabilirsin.', cta: { label: 'Danışmanları gör', href: 'danismanlar.html' } };
    }
    if (ctx.enrollment.status === 'pending_payment') {
      return { title: 'Ödemeni tamamla', description: 'Ödemen onaylandığında hazırlık adımlarına geçebilirsin.', cta: { label: 'Ödeme durumunu gör', href: 'odeme-bekle.html' } };
    }
    const missing = (pre && pre.missing) || [];
    const story = ctx.story;
    const status = storyStatus(story);
    const s1 = session(ctx, 1);
    const s2 = session(ctx, 2);
    if (missing.includes('profile')) {
      return { title: 'Profilini tamamla', description: 'Hedef pozisyonun, sektörün ve katılım nedenin danışmanına ön bilgi olarak iletilir.', cta: { label: 'Profilimi doldur', href: 'profil.html' } };
    }
    if (missing.includes('cv')) {
      return { title: 'CV\'ni ekle ve onayla', description: 'CV\'ni yükle ya da bilgilerini elle gir; onayladığın bilgiler hikâyende kullanılır.', cta: { label: 'CV\'me git', href: 'cv.html' } };
    }
    if (missing.includes('consent')) {
      return { title: 'KVKK onayını tamamla', description: 'Randevu almadan önce güncel aydınlatma ve açık rıza metinlerini onaylaman gerekiyor.', cta: { label: 'Son adımlara git', href: 'randevu-on.html' } };
    }
    if (s1 && s1.status === 'not_scheduled') {
      return { title: '1. seansın için randevu al', description: 'Hazırlık adımların tamam. Danışmanının uygun saatlerinden birini seç.', cta: { label: 'Randevu al', href: 'takvim.html' } };
    }
    if (s1 && s1.status === 'scheduled' && rank(status) < rank('FIRST_SESSION_DONE')) {
      return { title: '1. seansına hazırlan', description: 'Seansın planlandı: ' + whenText(s1) + ' (İstanbul).', cta: { label: 'Seanslarım', href: 'seanslar.html' } };
    }
    if (status === 'FIRST_SESSION_DONE') {
      return { title: 'Satış hikâyeni oluştur', description: 'İlk seansın tamamlandı. YZ sana sorular sorsun ya da hazır hikâyeni yükle.', cta: { label: 'Hikâyeni Oluştur →', href: 'hikaye-giris.html' }, secondary: { label: 'Danışman notlarını oku', href: 'seans-notlari.html' } };
    }
    if (status === 'QA_IN_PROGRESS') {
      return { title: 'Sorulara kaldığın yerden devam et', description: story && story.status === 'PAUSED' ? 'Soruları daha sonra devam etmek üzere kaydettin.' : 'Cevapların kaydediliyor; kalan soruları tamamla.', cta: { label: 'Devam et →', href: 'hikaye-giris.html' }, secondary: { label: 'Danışman notlarını oku', href: 'seans-notlari.html' } };
    }
    if (status === 'DRAFT_GENERATED' || status === 'CANDIDATE_EDITED') {
      return { title: 'Hikâye taslağını gözden geçir', description: 'Taslağını düzenle, eksik bilgileri tamamla ve çıktılarını oluştur.', cta: { label: 'Hikâyeme git →', href: 'ciktilar.html' } };
    }
    if (status === 'SUMMARY_READY') {
      return { title: 'Hikâyeni onayla', description: 'Hikâyen ve çıktıların hazır. Kontrol edip onayladığında danışmanın son hâlini görebilir.', cta: { label: 'Hikâyeme git →', href: 'ciktilar.html' } };
    }
    if (s2 && s2.status === 'not_scheduled') {
      return { title: '2. seansın için randevu al', description: 'Hikâyeni danışmanınla birlikte son hâline getirmek için ikinci seansını planla.', cta: { label: 'Randevu al', href: 'takvim.html' } };
    }
    if (s2 && s2.status === 'scheduled') {
      return { title: '2. seansına hazırlan', description: 'Seansın planlandı: ' + whenText(s2) + ' (İstanbul).', cta: { label: 'Seanslarım', href: 'seanslar.html' } };
    }
    return { title: 'Yolculuğun tamamlandı', description: 'Hikâyen ve çıktıların her zaman Hikâyem bölümünde.', cta: { label: 'Hikâyeme git →', href: 'ciktilar.html' } };
  }

  // ─── Kenar çubuğu (menü) ────────────────────────────────────────────────────
  function menuItem(nav, label) {
    return Array.from(nav.children).find(item => (item.textContent || '').includes(label)) || null;
  }

  function iconOf(item) {
    return Array.from(item.querySelectorAll('.material-symbols-outlined'))
      .map(icon => icon.textContent.trim()).find(name => !['lock', 'check_circle', 'chevron_right'].includes(name)) || 'circle';
  }

  function templateLink(nav) {
    return Array.from(nav.querySelectorAll(':scope > a')).find(link => !link.hasAttribute('aria-current') &&
      !link.querySelector('.material-symbols-outlined:last-child:not(:first-child)')) ||
      Array.from(nav.querySelectorAll(':scope > a')).find(link => !link.hasAttribute('aria-current')) || null;
  }

  function unlock(nav, item, label, href) {
    if (item.tagName === 'A') {
      item.href = href;
      item.setAttribute('data-nav-skip', '');
      return item;
    }
    const model = templateLink(nav);
    const icon = iconOf(item);
    let link;
    if (model) {
      link = model.cloneNode(true);
      link.removeAttribute('aria-current');
      link.querySelectorAll('.material-symbols-outlined').forEach(node => {
        if (['check_circle', 'chevron_right'].includes(node.textContent.trim())) node.remove();
      });
      const iconNode = link.querySelector('.material-symbols-outlined');
      if (iconNode) iconNode.textContent = icon;
      const labelNode = Array.from(link.querySelectorAll('span')).find(span => !span.classList.contains('material-symbols-outlined'));
      if (labelNode) labelNode.textContent = label;
    } else {
      link = document.createElement('a');
      link.className = 'flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors';
      link.innerHTML = '<span class="material-symbols-outlined text-[20px] text-outline"></span><span class="font-headline-sm text-body-md"></span>';
      link.firstChild.textContent = icon;
      link.lastChild.textContent = label;
    }
    if (item.dataset.panelShort) link.dataset.panelShort = item.dataset.panelShort;
    link.href = href;
    link.setAttribute('data-nav-skip', '');
    item.replaceWith(link);
    return link;
  }

  function lock(item, hint) {
    if (item.tagName !== 'A' || item.getAttribute('aria-current') === 'page') return item;
    const label = Array.from(item.querySelectorAll('span')).find(span => !span.classList.contains('material-symbols-outlined'));
    const box = document.createElement('div');
    box.className = 'flex flex-col px-space-md py-space-sm rounded-lg cursor-not-allowed select-none candidate-locked-nav-item';
    box.setAttribute('aria-disabled', 'true');
    if (item.dataset.panelShort) box.dataset.panelShort = item.dataset.panelShort;
    box.innerHTML = '<div class="flex items-center justify-between"><div class="flex items-center gap-space-sm">' +
      '<span class="material-symbols-outlined text-[20px] text-muted panel-nav-icon"></span>' +
      '<span class="font-headline-sm text-body-md text-muted panel-nav-label"></span></div>' +
      '<span class="material-symbols-outlined text-[16px] text-muted panel-nav-icon">lock</span></div>' +
      '<span class="text-[11px] text-muted pl-8 pt-0.5 leading-tight"></span>';
    box.querySelector('.panel-nav-icon').textContent = iconOf(item);
    box.querySelector('.panel-nav-label').textContent = label ? label.textContent.trim() : '';
    box.lastElementChild.textContent = hint;
    item.replaceWith(box);
    return box;
  }

  function setCheck(item, done) {
    if (!item || item.tagName !== 'A') return;
    const current = item.getAttribute('aria-current') === 'page';
    const check = Array.from(item.querySelectorAll(':scope > .material-symbols-outlined')).find(icon => icon.textContent.trim() === 'check_circle');
    if (current) return;
    if (!done && check) check.remove();
    if (done && !check) {
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined text-[18px] text-[#51409D] panel-nav-icon';
      icon.textContent = 'check_circle';
      if (!item.classList.contains('justify-between')) item.classList.add('justify-between');
      item.appendChild(icon);
    }
  }

  function applySidebar(ctx, options) {
    const nav = document.querySelector('aside nav');
    if (!nav) return;
    const o = options || {};
    const missing = (o.prerequisites && o.prerequisites.missing) || null;
    const story = ctx && ctx.story;
    if (missing) {
      setCheck(menuItem(nav, 'Profilim'), !missing.includes('profile'));
      setCheck(menuItem(nav, 'CV\'m'), !missing.includes('cv'));
    }
    const storyItem = menuItem(nav, 'Hikâyem');
    if (storyItem) {
      const storyOpen = atLeast(story, 'FIRST_SESSION_DONE');
      const storyHref = atLeast(story, 'DRAFT_GENERATED') ? 'ciktilar.html' : 'hikaye-giris.html';
      if (storyOpen) unlock(nav, storyItem, 'Hikâyem', storyHref);
      else lock(storyItem, 'İlk seanstan sonra açılır');
    }
    const homeworkItem = menuItem(nav, 'Ödevlerim');
    if (homeworkItem && Array.isArray(o.assignments)) {
      if (o.assignments.length) unlock(nav, homeworkItem, 'Ödevlerim', 'odevler.html');
      else lock(homeworkItem, 'Danışmanın ödev verince açılır');
    }
  }

  // Kenar çubuğu için hafif yükleme: ön koşullar + ödevler (hata menüyü bozmaz).
  async function refreshSidebar(ctx) {
    if (!ctx || !ctx.enrollment) return;
    const [pre, tasks] = await Promise.all([
      prerequisites(ctx).catch(() => null),
      assignments(ctx).catch(() => null)
    ]);
    applySidebar(ctx, { prerequisites: pre, assignments: tasks });
    return { prerequisites: pre, assignments: tasks };
  }

  function showNoEnrollment(container) {
    const host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) return null;
    const alert = api().ui.showError(host, 'Henüz aktif bir hizmetin yok. Danışmanını seçip hizmeti satın aldıktan sonra bu adım açılır.', { tone: 'info' });
    if (alert && !alert.querySelector('a')) {
      const link = document.createElement('a');
      link.href = 'danismanlar.html';
      link.textContent = ' Danışmanları gör →';
      link.className = 'font-semibold underline';
      alert.appendChild(link);
    }
    return alert;
  }

  function initials(name) {
    return api().format.initials(name);
  }

  window.Journey = Object.freeze({
    STORY_ORDER, ready, load, storyStatus, rank, atLeast, session, bookableSession, prerequisites, assignments,
    guru, template, progress, nextStep, applySidebar, refreshSidebar, showNoEnrollment, initials, whenText
  });
})();
