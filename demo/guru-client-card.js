// guru-client-card.js — Guru panelinde danışan profil kartı (Ultraviolet tasarımı, Hazal; Etap 4 uyarlaması 81).
//
// Etap 4 (K79): Hazal'ın sürümündeki sabit 3 aday, ?aday= slug'ı ve localStorage 'demoSelectedCandidate'
// kaldırıldı. Bu dosya artık YALNIZ ÇİZER; veriyi sayfa betiği (84, guru-ortak.js) API'den getirip verir:
//   GET /guru/enrollments/{enrollmentID} → CandidateBrief
//
// Markup (guru-danisan-detay, guru-hikaye, guru-notlar, guru-odevler):
//   <div data-client-profile class="client-profile-card" aria-busy="true"></div>
//   + <link rel="stylesheet" href="guru-client-profile.css"> + <script src="guru-client-card.js"></script>
//
// Sözleşme (window.GuruClientCard):
//   GuruClientCard.fromBrief(brief, { sectorLabel? }) → görünüm modeli:
//     { name, title, sector, avatarUrl, completedSessions, totalSessions, registeredAt, enrollmentId, storyId }
//     (name = candidate.first_name + last_name; title = profile.target_position; sector = profile.sector
//      → sectorLabel(code) verilirse etiket; completedSessions = sessions[status=completed];
//      registeredAt = enrollment.created_at; avatarUrl = candidate.avatar_url (GAP-B23, yoksa baş harf))
//   GuruClientCard.render(model, { host?, actions? }) → kartı çizer, aria-busy kaldırır.
//     actions varsayılanı: "Not Yaz" → /guru/notlar, "Ödev Ver" → /guru/odevler;
//     bağlantılar ?enrollment=<id>&story=<id> taşır. actions: false → düğme yok.
//   GuruClientCard.renderSessionSummary(model, { after? }) → "N / M seans tamamlandı · Kayıt tarihi …"
//     satırı (guru-danisan-detay "Seanslar" başlığının altına; `after` öğesi verilebilir).
//   GuruClientCard.renderError(error | mesaj, { host? }) → Api.ui.showError ile hata, aria-busy kalkar.
//   GuruClientCard.host() → [data-client-profile] öğesi (yoksa null).
(function () {
  'use strict';

  const page = window.Routes.page();
  const profilePages = new Set(['/guru/danisan', '/guru/hikaye', '/guru/notlar', '/guru/odevler']);
  if (profilePages.has(page)) {
    document.body.classList.add('guru-client-profile');
    if (page === '/guru/hikaye') document.body.classList.add('guru-story-page');
  }

  function host(explicit) {
    return explicit || document.querySelector('[data-client-profile]');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const cfg = (window.Api && window.Api.config) || {};
    return date.toLocaleDateString(cfg.locale || 'tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: cfg.timeZone || 'Europe/Istanbul'
    });
  }

  function fromBrief(brief, options) {
    const b = brief || {};
    const o = options || {};
    const candidate = b.candidate || {};
    const profile = b.profile || {};
    const sessions = Array.isArray(b.sessions) ? b.sessions : [];
    const sectorCode = profile.sector || '';
    return {
      name: [candidate.first_name, candidate.last_name].filter(Boolean).join(' ').trim(),
      title: profile.target_position || '',
      sector: typeof o.sectorLabel === 'function' ? (o.sectorLabel(sectorCode) || sectorCode) : sectorCode,
      avatarUrl: candidate.avatar_url || '',
      completedSessions: sessions.filter(s => s && s.status === 'completed').length,
      totalSessions: sessions.length,
      registeredAt: (b.enrollment && b.enrollment.created_at) || '',
      enrollmentId: (b.enrollment && b.enrollment.id) || '',
      storyId: (b.story && b.story.id) || ''
    };
  }

  function withIds(href, model) {
    const params = new URLSearchParams();
    if (model.enrollmentId) params.set('enrollment', model.enrollmentId);
    if (model.storyId) params.set('story', model.storyId);
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  }

  function render(model, options) {
    const o = options || {};
    const target = host(o.host);
    if (!target) {
      console.error('Danışan profil kartı için [data-client-profile] alanı bulunamadı.');
      return null;
    }
    const m = model || {};

    const avatar = el('span', 'client-profile-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    if (m.name) avatar.dataset.avatarName = m.name;
    if (m.avatarUrl) avatar.dataset.avatarUrl = m.avatarUrl;
    if (window.DemoAvatar && window.DemoAvatar.render) window.DemoAvatar.render(avatar, { name: m.name || '', url: m.avatarUrl || '' });
    else avatar.textContent = String(m.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');

    const copy = el('div', 'client-profile-copy');
    copy.append(el('h1', '', m.name || 'Danışan'));
    const subtitle = [m.title, m.sector].filter(Boolean).join(' · ');
    if (subtitle) copy.append(el('p', '', subtitle));

    const nodes = [avatar, copy];
    const actions = o.actions === false ? [] : (o.actions || [
      { label: 'Not Yaz', href: '/guru/notlar' },
      { label: 'Ödev Ver', href: '/guru/odevler', primary: true }
    ]);
    if (actions.length) {
      const box = el('div', 'client-profile-actions');
      actions.forEach(action => {
        const link = el('a', `client-profile-action${action.primary ? ' client-profile-action--primary' : ''}`, action.label);
        link.href = withIds(action.href, m);
        link.setAttribute('data-nav-skip', '');
        if (action.href === page) link.setAttribute('aria-current', 'page');
        box.append(link);
      });
      nodes.push(box);
    }

    target.classList.add('client-profile-card');
    target.removeAttribute('aria-busy');
    target.replaceChildren(...nodes);
    return target;
  }

  function sessionSummaryText(model) {
    const m = model || {};
    const parts = [`${Number(m.completedSessions) || 0} / ${Number(m.totalSessions) || 0} seans tamamlandı`];
    const date = formatDate(m.registeredAt);
    if (date) parts.push(`Kayıt tarihi ${date}`);
    return parts.join(' · ');
  }

  function renderSessionSummary(model, options) {
    const o = options || {};
    let anchor = o.after || null;
    if (!anchor) {
      anchor = Array.from(document.querySelectorAll('h2')).find(heading => heading.textContent.trim() === 'Seanslar') || null;
    }
    if (!anchor) return null;
    document.querySelectorAll('.client-session-overview').forEach(node => node.remove());
    const summary = el('p', 'client-session-overview', sessionSummaryText(model));
    anchor.insertAdjacentElement('afterend', summary);
    return summary;
  }

  function renderError(error, options) {
    const target = host((options || {}).host);
    if (!target) return null;
    target.removeAttribute('aria-busy');
    target.replaceChildren();
    if (window.Api && window.Api.ui) return window.Api.ui.showError(target, error);
    target.textContent = typeof error === 'string' ? error : 'Danışan bilgisi yüklenemedi.';
    return target;
  }

  window.GuruClientCard = Object.freeze({ host: () => host(), fromBrief, render, renderSessionSummary, sessionSummaryText, renderError });
})();
