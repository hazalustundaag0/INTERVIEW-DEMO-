// aday-yolculuk.js — Aday yolculuk sayfalarının ortak durum/görünüm yardımcıları. Sahibi: 83.
// Yalnız 83 sayfaları yükler (ana, profil, cv, randevu-on, takvim, randevu-ok, seanslar, seans-notlari,
// seans2-ok, hikaye-giris, hikaye-oneriler, ciktilar, odevler, odev-teslim, odev-goruntule).
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
//   Journey.applySidebar(ctx, { prerequisites, assignments }) → Sidebar.setState: ✓ profil/cv, hikâye/ödev kilidi
//   Journey.setSidebarState(patch) → Sidebar.setState (sidebar:ready beklenir)
//   Journey.paintAvatar(el, name, url) → DemoAvatar.render (fotoğraf yoksa baş harfler)
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

  // Etap 14 (TC-ADAY-10-003): birden çok paket varsa güncel paket = EN SON satın alınan (aktif ya da tamamlanmış).
  // Önceki kural "aktif önce" idi: yeni paket tamamlanınca eski aktif paket seçiliyor, Seanslarım eski seansları
  // gösteriyordu. Ödeme bekleyen/iptal paketler yalnız başka paket yoksa seçilir. preferredId (Seanslarım paket
  // seçimi) adayın kendi paketlerinden biriyse o kullanılır.
  let enrollmentList = [];
  async function activeEnrollment(preferredId) {
    const items = await api().listAll('/candidate/enrollments');
    enrollmentList = items.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    if (!items.length) return null;
    if (preferredId) {
      const chosen = items.find(item => item.id === preferredId);
      if (chosen) return chosen;
    }
    // 60 Etap 14 sözleşmesi: Enrollment.is_current tek kaynak (en son aktifleşen ödenmiş paket).
    const current = items.find(item => item.is_current === true);
    if (current) return current;
    const live = enrollmentList.filter(item => item.status === 'active' || item.status === 'completed');
    if (live.length) return live[0];
    return items.slice().sort((a, b) =>
      (ENROLLMENT_PRIORITY[a.status] ?? 9) - (ENROLLMENT_PRIORITY[b.status] ?? 9) ||
      Date.parse(b.created_at) - Date.parse(a.created_at)
    )[0];
  }
  function enrollments() { return enrollmentList.slice(); }

  async function load(preferredEnrollmentId) {
    await ready();
    const enrollment = await activeEnrollment(preferredEnrollmentId);
    if (!enrollment) return { enrollment: null, sessions: [], story: null, payments: [] };
    const detail = await api().get('/candidate/enrollments/' + encodeURIComponent(enrollment.id));
    const sessions = (detail.sessions || []).slice().sort((a, b) => a.sequence_no - b.sequence_no);
    return { enrollment: detail.enrollment, detail, sessions, story: detail.story_session || null, payments: detail.payments || [] };
  }

  // K118 (Etap 12): danışmana gönderim durumu tek kaynaktan — StorySession.progress
  //   {state: not_started|drafting|submitted|needs_resubmit|finalized, last_submitted_version, last_submitted_at}
  //   → { sent, current, needsResubmit, finalized, versionNo, submittedAt }. Alan yoksa (eski API) null.
  async function submissionState(ctx) {
    const pr = ctx && ctx.story && ctx.story.progress;
    if (!pr || !pr.state) return null;
    return {
      sent: pr.state === 'submitted' || pr.state === 'needs_resubmit' || Boolean(pr.last_submitted_version),
      current: pr.state === 'submitted' || pr.state === 'finalized',
      needsResubmit: pr.state === 'needs_resubmit',
      finalized: pr.state === 'finalized',
      versionNo: pr.last_submitted_version || null,
      submittedAt: pr.last_submitted_at || null
    };
  }

  // Etap 14 (TC-UC19-001/003): adaya görünür (paylaşılan) danışman notları seans numarasına göre.
  // API yalnız is_visible_to_candidate notları döner; özel taslaklar hiç gelmez. Seans eşlemesi GAP-B17.
  const NOTE_KIND_SEQ = { first_session_note: 1, feedback: 2 };
  async function sharedNotes(ctx) {
    if (!ctx || !ctx.story) return { bySeq: {}, latestSeq: null, all: [] };
    const all = await api().listAll('/candidate/stories/' + encodeURIComponent(ctx.story.id) + '/notes').catch(() => []);
    const bySeq = {};
    all.forEach(n => { const s = NOTE_KIND_SEQ[n.note_kind]; if (s) (bySeq[s] = bySeq[s] || []).push(n); });
    Object.values(bySeq).forEach(list => list.sort((a, b) => Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at)));
    const seqs = Object.keys(bySeq).map(Number).sort((a, b) => b - a);
    return { bySeq, latestSeq: seqs[0] || null, all };
  }
  function notesHref(seq) { return '/seanslar/notlar?seans=' + (seq === 2 ? 2 : 1); }

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
      // K118: "Hikâyen" adımı = güncel sürüm danışmana gönderildi (ya da hikâye nihaileşti).
      storyStatus(story) === 'COMPLETED' || Boolean(ctx && ctx.submission && ctx.submission.current),
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
      return { title: 'Danışmanını seç', description: 'Henüz aktif bir hizmetin yok. Danışmanını seçip hizmeti satın alarak başlayabilirsin.', cta: { label: 'Danışmanları gör', href: '/danismanlar' } };
    }
    if (ctx.enrollment.status === 'pending_payment') {
      return { title: 'Ödemeni tamamla', description: 'Ödemen onaylandığında hazırlık adımlarına geçebilirsin.', cta: { label: 'Ödeme durumunu gör', href: '/odeme/bekleniyor' } };
    }
    const missing = (pre && pre.missing) || [];
    const story = ctx.story;
    const status = storyStatus(story);
    const s1 = session(ctx, 1);
    const s2 = session(ctx, 2);
    if (missing.includes('profile')) {
      return { title: 'Profilini tamamla', description: 'Hedef pozisyonun, sektörün ve katılım nedenin danışmanına ön bilgi olarak iletilir.', cta: { label: 'Profilimi doldur', href: '/profil' } };
    }
    if (missing.includes('cv')) {
      return { title: 'CV\'ni ekle ve onayla', description: 'CV\'ni yükle ya da bilgilerini elle gir; onayladığın bilgiler hikâyende kullanılır.', cta: { label: 'CV\'me git', href: '/cv' } };
    }
    if (missing.includes('consent')) {
      return { title: 'KVKK onayını tamamla', description: 'Randevu almadan önce güncel aydınlatma ve açık rıza metinlerini onaylaman gerekiyor.', cta: { label: 'Son adımlara git', href: '/randevu' } };
    }
    if (s1 && s1.status === 'not_scheduled') {
      return { title: '1. seansın için randevu al', description: 'Hazırlık adımların tamam. Danışmanının uygun saatlerinden birini seç.', cta: { label: 'Randevu al', href: '/randevu/takvim' } };
    }
    if (s1 && s1.status === 'scheduled' && rank(status) < rank('FIRST_SESSION_DONE')) {
      return { title: '1. seansına hazırlan', description: 'Seansın planlandı: ' + whenText(s1) + ' (İstanbul).', cta: { label: 'Seanslarım', href: '/seanslar' } };
    }
    if (status === 'FIRST_SESSION_DONE') {
      return { title: 'Satış hikâyeni oluştur', description: 'İlk seansın tamamlandı. Hikâyeni kendi cümlelerinle yaz; yapay zekâ eksik kalan yerleri sana öneri olarak göstersin.', cta: { label: 'Hikâyeni Oluştur →', href: '/hikaye/yaz' }, secondary: { label: 'Danışman notlarını oku', href: '/seanslar/notlar' } };
    }
    if (status === 'QA_IN_PROGRESS') {
      return { title: 'Hikâyene kaldığın yerden devam et', description: 'Yazdıkların kaydedildi; önerileri inceleyip hikâyeni tamamla.', cta: { label: 'Devam et →', href: '/hikaye/yaz' }, secondary: { label: 'Danışman notlarını oku', href: '/seanslar/notlar' } };
    }
    // K118 (Etap 12): taslak sonrası adım, danışmana gönderim durumuna göre (ctx.submission, submissionState).
    if (status === 'COMPLETED') {
      return { title: 'Yolculuğun tamamlandı', description: 'Hikâyeni onayladın; son hâli ve çıktıların her zaman Hikâyem bölümünde.', cta: { label: 'Hikâyeme git →', href: '/hikaye/hazir' } };
    }
    if (status === 'DRAFT_GENERATED' || status === 'CANDIDATE_EDITED' || status === 'SUMMARY_READY') {
      const sub = ctx.submission;
      if (sub && sub.needsResubmit) {
        return { title: 'Yeni sürümü danışmanına gönder', description: 'Sürüm ' + (sub.versionNo || '') + ' gönderildikten sonra hikâyeni değiştirdin. Danışmanın yalnız gönderdiğin sürümü görür; güncel hâlini yeniden gönder.', cta: { label: 'Hikâyeme git →', href: '/hikaye/hazir' } };
      }
      if (!sub || !sub.sent) {
        return { title: 'Hikâyeni danışmanına gönder', description: 'Taslağını gözden geçir, eksik bilgileri tamamla ve ikinci seanstan önce danışmanına gönder.', cta: { label: 'Hikâyeme git →', href: '/hikaye/hazir' } };
      }
      const sent = 'Hikâyeni danışmanına gönderdin' + (sub.versionNo ? ' (sürüm ' + sub.versionNo + ')' : '') + '. ';
      if (s2 && s2.status === 'completed') {
        return { title: 'Hikâyeni onayla', description: 'İkinci seansın tamamlandı. Hikâyeni kontrol edip onayladığında son hâli danışmanınla paylaşılır.', cta: { label: 'Hikâyeme git →', href: '/hikaye/hazir' } };
      }
      if (s2 && s2.status === 'scheduled') {
        return { title: '2. seansına hazırlan', description: sent + 'Seansın planlandı: ' + whenText(s2) + ' (İstanbul).', cta: { label: 'Seanslarım', href: '/seanslar' } };
      }
      if (s2 && s2.status === 'not_scheduled') {
        return { title: '2. seansın için randevu al', description: sent + 'Hikâyeni danışmanınla birlikte son hâline getirmek için ikinci seansını planla.', cta: { label: 'Randevu al', href: '/randevu/takvim' }, secondary: { label: 'Hikâyeme git', href: '/hikaye/hazir' } };
      }
      return { title: 'Danışmanın hikâyeni okuyor', description: sent + 'Danışmanın ödev ya da belge isterse Ödevlerim bölümünde görürsün.', cta: { label: 'Hikâyeme git →', href: '/hikaye/hazir' } };
    }
    if (s2 && s2.status === 'not_scheduled') {
      return { title: '2. seansın için randevu al', description: 'Hikâyeni danışmanınla birlikte son hâline getirmek için ikinci seansını planla.', cta: { label: 'Randevu al', href: '/randevu/takvim' } };
    }
    if (s2 && s2.status === 'scheduled') {
      return { title: '2. seansına hazırlan', description: 'Seansın planlandı: ' + whenText(s2) + ' (İstanbul).', cta: { label: 'Seanslarım', href: '/seanslar' } };
    }
    return { title: 'Yolculuğun tamamlandı', description: 'Hikâyen ve çıktıların her zaman Hikâyem bölümünde.', cta: { label: 'Hikâyeme git →', href: '/hikaye/hazir' } };
  }

  // ─── Kenar çubuğu (menü) ────────────────────────────────────────────────────
  // Etap 4: menü paylaşımlı sidebar.js'tir; durum yalnız Sidebar.setState ile verilir (81 sözleşmesi).
  // Eski DOM düzenlemesi (metinle öğe bulma, Material ikonlu öğe klonlama/kilit kutusu) kaldırıldı.
  // window.Sidebar henüz yoksa (betik sırası) 'sidebar:ready' beklenir; bekleyen yamalar birleştirilir.
  let pendingSidebar = null;
  function setSidebarState(patch) {
    if (window.Sidebar && typeof window.Sidebar.setState === 'function') {
      window.Sidebar.setState(patch);
      return;
    }
    if (!document.getElementById('sidebar')) return;
    if (!pendingSidebar) {
      pendingSidebar = { items: {} };
      document.addEventListener('sidebar:ready', () => {
        const queued = pendingSidebar;
        pendingSidebar = null;
        if (queued && window.Sidebar) window.Sidebar.setState(queued);
      }, { once: true });
    }
    Object.assign(pendingSidebar.items, (patch && patch.items) || {});
    if (patch && 'next' in patch) pendingSidebar.next = patch.next;
  }

  function sidebarItems(ctx, options) {
    const o = options || {};
    const missing = (o.prerequisites && o.prerequisites.missing) || null;
    const story = ctx && ctx.story;
    const items = {};
    if (missing) {
      items.profil = { done: !missing.includes('profile') };
      items.cv = { done: !missing.includes('cv') };
    }
    const storyOpen = atLeast(story, 'FIRST_SESSION_DONE');
    const storyHref = atLeast(story, 'DRAFT_GENERATED') ? '/hikaye/hazir' : '/hikaye/yaz';
    items.hikaye = storyOpen
      ? { locked: false, hint: '', href: storyHref }
      : { locked: true, hint: 'İlk seanstan sonra açılır' };
    if (Array.isArray(o.assignments)) {
      items.odevler = o.assignments.length
        ? { locked: false, hint: '', href: '/odevler' }
        : { locked: true, hint: 'Danışmanın ödev verince açılır' };
    }
    return items;
  }

  function applySidebar(ctx, options) {
    setSidebarState({ items: sidebarItems(ctx, options) });
  }

  // Avatar: ad + (varsa) fotoğraf URL'si avatar.js'e devredilir (K83). avatar.js henüz yüklenmediyse
  // öznitelikler yazılır; avatar.js açılışta ve MutationObserver ile bunları çizer.
  function paintAvatar(el, name, url) {
    if (!el) return;
    if (window.DemoAvatar && typeof window.DemoAvatar.render === 'function') {
      window.DemoAvatar.render(el, { name: name || '', url: url || '' });
      return;
    }
    if (name) el.dataset.avatarName = name; else delete el.dataset.avatarName;
    if (url) el.dataset.avatarUrl = url; else delete el.dataset.avatarUrl;
    if (!url) el.textContent = initials(name);
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
      link.href = '/danismanlar';
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
    STORY_ORDER, ready, load, enrollments, storyStatus, rank, atLeast, session, submissionState, sharedNotes, notesHref, bookableSession, prerequisites, assignments,
    guru, template, progress, nextStep, applySidebar, refreshSidebar, setSidebarState, paintAvatar, showNoEnrollment, initials, whenText
  });
})();
