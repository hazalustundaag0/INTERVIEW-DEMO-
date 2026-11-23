// guru-ortak.js — Guru paneli ortak yardımcıları. Sahibi: 84 Guru Panel UI.
// Yükleme: config.js → api-client.js → gate.js → guru-ortak.js → sidebar.js → guru-client-card.js → sayfa betiği → nav.js
// Veri yalnız window.Api ile (GET /guru/...). localStorage kullanılmaz.
//
//   GuruPanel.params()                 → { enrollmentId, storyId } (URL ?enrollment=&story=, UUID)
//   GuruPanel.loadClient()             → Promise<CandidateBrief|null>: danışan kartını (Etap 4, Ultraviolet)
//                                        [data-client-profile] host'una GuruClientCard ile çizer (ad, aday fotoğrafı
//                                        ya da baş harfler, hedef rol · sektör, "Not Yaz"/"Ödev Ver");
//                                        ?story= adres çubuğuna yazılır (nav.js sekme taşıması için)
//   GuruPanel.clientModel(brief)       → GuruClientCard modeli (unvan/sektör profile_answers etiketlerinden, GAP-B05)
//   GuruPanel.clientSubtitle(brief)    → 'Satış Uzmanı · Teknoloji / Yazılım' (profile_answers etiketleri, GAP-B05)
//   GuruPanel.answerValue(answer)      → seçenek etiketleri + serbest metin
//   GuruPanel.storyStatus(status)      → { label, tone:'active'|'muted' } (Client.story_status)
//   GuruPanel.clientHref(page, brief)  → '/guru/notlar?enrollment=…&story=…'
//   GuruPanel.avatarBlobUrl(avatarUrl) → Promise<'blob:…'|''>: Bearer isteyen fotoğraf (GAP-B23, K83)
//   GuruPanel.paintAvatar(el, name, avatarUrl) → önce baş harfler, fotoğraf gelince <img> (avatar.js)
//   GuruPanel.toast(message, cls)      → sayfanın mevcut toast sınıfıyla kısa bildirim
//   GuruPanel.showState(container, { icon, title, text, tone }) → bilgi / boş durum kutusu
//   GuruPanel.mapLimit(items, n, fn)   → sınırlı eşzamanlılıkla Promise.all
//
// Aday fotoğrafı (K83/K90): DTO'daki candidate.avatar_url API tabanına göre göreli ve Bearer ister
// (/guru/clients/{candidateID}/avatar). <img src>'ye doğrudan yazılamaz; token asla URL'e konmaz →
// Api.avatarSrc blob: adresi üretir (tek önbellek api-client.js'te, QA-027); avatar.js data-avatar-url'i aynı yolla çözer.
// 404 / hata → sessizce baş harfler.
(function () {
  'use strict';
  if (!window.Api) return;
  const Api = window.Api;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const CLIENT_TAB_PAGES = ['/guru/danisan', '/guru/hikaye', '/guru/notlar', '/guru/odevler'];

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

  // Client.story_status (+ gönderim) → liste rozeti (iki ton: mor = ilerliyor/hazır, gri = bekliyor).
  // K118 (Etap 12): etiket hikâyenin danışman açısından durumunu söyler — taslak yok / taslak yazılıyor /
  // gönderildi / yeniden gönderilecek / nihai. Adayın taslakları danışmana görünmez (E6-9); "gönderildi" yalnız
  // Client.submission (60'a iletildi: {version_no, submitted_at, needs_resubmit} | null) varsa gösterilir.
  const STORY_STATUS = {
    NOT_STARTED: ['Taslak yok', 'muted'],
    PURCHASED: ['Taslak yok', 'muted'],
    PROFILE_COMPLETED: ['Taslak yok', 'muted'],
    CV_UPLOADED: ['Taslak yok', 'muted'],
    FIRST_SESSION_DONE: ['Taslak yok', 'muted'],
    QA_IN_PROGRESS: ['Taslak yazılıyor', 'active'],
    PAUSED: ['Duraklatıldı', 'muted'],
    DRAFT_GENERATED: ['Taslak yazılıyor', 'active'],
    CANDIDATE_EDITED: ['Taslak yazılıyor', 'active'],
    SUMMARY_READY: ['Taslak yazılıyor', 'active'],
    COMPLETED: ['Nihai', 'active'],
    CANCELLED: ['İptal edildi', 'muted']
  };
  // progress: Client.story_progress / StorySession.progress.state (K118b, 60 Etap 12) — varsa önceliklidir.
  function storyStatus(status, submission, progress) {
    if (status === 'COMPLETED' || progress === 'finalized') return { label: 'Nihai', tone: 'active' };
    if (progress === 'needs_resubmit') return { label: 'Gönderildi · yeni sürüm bekleniyor', tone: 'active' };
    if (progress === 'submitted' && !submission) return { label: 'Gönderildi', tone: 'active' };
    if (submission && status !== 'CANCELLED' && status !== 'PAUSED') {
      return submission.needs_resubmit
        ? { label: 'Gönderildi · yeni sürüm bekleniyor', tone: 'active' }
        : { label: 'Gönderildi' + (submission.version_no ? ' · sürüm ' + submission.version_no : ''), tone: 'active' };
    }
    const entry = STORY_STATUS[status] || ['Taslak yok', 'muted'];
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

  function refreshClientLinks() {
    // "Danışanlarım" geri bağlantısı (tasarımda href="#").
    const back = Array.from(document.querySelectorAll('section a')).find(a =>
      a.getAttribute('href') === '#' && a.textContent.replace(/\s+/g, ' ').includes('Danışanlarım'));
    if (back) {
      back.href = '/guru/danisanlar';
      back.dataset.navSkip = '';
    }
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => Array.from(part)[0].toLocaleUpperCase('tr-TR')).join('');
  }

  // ─── Aday fotoğrafı (GAP-B23): tek önbellek Api.avatarSrc (QA-027) ───────────
  // Bearer isteyen göreli yol (ör. /guru/clients/{id}/avatar?v=…) → blob: URL; /public/… → tam adres.
  // Önbellek ve revokeObjectURL api-client.js'te (Api.avatarSrc / Api.forgetAvatars); burada ikinci önbellek yok.
  function avatarBlobUrl(avatarUrl) {
    const path = String(avatarUrl || '').trim();
    // Yalnız API'ye göreli yol; mutlak adres / protokole göreli (//host) / şema kabul edilmez.
    if (!path || !path.startsWith('/') || path.startsWith('//')) return Promise.resolve('');
    return Api.avatarSrc(path);
  }

  // Önce baş harfler, fotoğraf çözülünce <img>: avatar.js data-avatar-url'i Api.avatarSrc ile çözer.
  function paintAvatar(element, name, avatarUrl) {
    if (!element) return Promise.resolve(element);
    if (window.DemoAvatar && window.DemoAvatar.render) {
      window.DemoAvatar.render(element, { name: name || '', url: avatarUrl || '' });
    } else {
      // avatar.js henüz yüklenmediyse öznitelikler yazılır; avatar.js yüklenince (MutationObserver /
      // ilk tarama) fotoğrafı Api.avatarSrc ile çözer.
      element.dataset.avatarName = name || '';
      if (avatarUrl) element.dataset.avatarUrl = avatarUrl;
      else delete element.dataset.avatarUrl;
      element.textContent = initials(name);
    }
    return Promise.resolve(element);
  }

  // GuruClientCard modeli: unvan · sektör etiketli profil cevaplarından (GAP-B05; "Satış Uzmanı · Teknoloji / Yazılım"),
  // yoksa CandidateBrief.profile'dan. avatarUrl = candidate.avatar_url (fromBrief); avatar.js Api.avatarSrc ile çözer.
  function clientModel(brief) {
    const Card = window.GuruClientCard;
    const base = Card ? Card.fromBrief(brief) : {};
    const title = answerValue(findAnswer(brief, 'target_position'));
    const sector = answerValue(findAnswer(brief, 'sector'));
    return Object.assign({}, base, {
      name: Api.format.fullName(brief && brief.candidate) || base.name || 'Danışan',
      title: title || base.title || '',
      sector: sector || base.sector || '',
      avatarUrl: base.avatarUrl || '',
      enrollmentId: (brief && brief.enrollment && brief.enrollment.id) || base.enrollmentId || '',
      storyId: (brief && brief.story && brief.story.id) || base.storyId || ''
    });
  }

  function renderClientCard(brief) {
    const Card = window.GuruClientCard;
    const host = Card && Card.host();
    if (!host) return null;
    const model = clientModel(brief);
    Card.render(model, { host });   // fotoğraf: model.avatarUrl → avatar.js (QA-027, G12 geçici çözümü kaldırıldı)
    document.title = model.name + ' · Danışan';
    return model;
  }

  let clientPromise = null;
  function loadClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      const p = params();
      refreshClientLinks();
      await window.sessionReady;
      const Card = window.GuruClientCard;
      if (!p.enrollmentId) {
        // Danışan seçilmeden açılan sekme: kart alanı boş kalmasın (sayfa kendi bilgi kutusunu gösterir).
        const host = Card && Card.host();
        if (host) { host.removeAttribute('aria-busy'); host.hidden = true; }
        return null;
      }
      let brief;
      try {
        brief = await Api.get('/guru/enrollments/' + p.enrollmentId);
      } catch (error) {
        if (Card) Card.renderError(error.status === 404
          ? 'Danışan bulunamadı: bu kayıt sana atanmış değil ya da artık yok.' : error);
        throw error;
      }
      renderClientCard(brief);
      const storyId = brief.story && brief.story.id;
      if (storyId && storyId !== p.storyId) {
        const url = new URL(location.href);
        url.searchParams.set('story', storyId);
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      }
      return brief;
    })();
    return clientPromise;
  }

  // Bilgi / boş durum kutusu: mevcut "advisor-permission-note" + "note-info-box" görsel dili.
  function showState(container, options) {
    const o = options || {};
    if (!container) return null;
    const box = document.createElement('div');
    box.className = 'guru-state-box rounded-[var(--radius-card)] border border-[color:var(--color-rule)] bg-[color:var(--color-paper-2)] px-4 py-4 text-[14px] text-[color:var(--color-ink)] flex items-start gap-3';
    box.setAttribute('role', o.tone === 'error' ? 'alert' : 'status');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-[20px] text-[color:var(--color-accent)]';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = o.icon || 'info';
    const body = document.createElement('div');
    body.className = 'flex flex-col gap-1';
    if (o.title) {
      const title = document.createElement('strong');
      title.className = 'text-[15px] font-semibold text-[color:var(--color-ink)]';
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

  window.GuruPanel = Object.freeze({
    params, loadClient, clientModel, clientSubtitle, answerValue, findAnswer, storyStatus, clientHref,
    avatarBlobUrl, paintAvatar, showState, errorState, toast, mapLimit, initials, CLIENT_TAB_PAGES
  });
})();
