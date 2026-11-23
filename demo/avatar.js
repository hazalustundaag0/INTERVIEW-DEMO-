// avatar.js — Kişi avatarları (Etap 4, K83). Sahibi: 81.
//
// Kural: fotoğraf URL'si varsa <img>, yoksa baş harfler. Örnek portre SVG'leri (avatars/*.svg)
// kullanılmaz; sabit/sahte isim yok (GAP-D06, K79).
//
// Ad ve fotoğraf kaynağı:
//   - Kullanıcının kendi avatarı (.site-header-avatar, .candidate-profile-avatar, .story-profile-avatar,
//     .question-avatar, #sidebar .sidebar-avatar, [data-avatar-self]): oturum (/auth/me önbelleği,
//     getSession()); `session:ready` ile tazelenir. Oturumda `avatar_url` varsa (GAP-B23) fotoğraf.
//   - Başka kişinin avatarı (danışman kartları, seans kartları, guru danışan kartı …):
//     yalnız öğenin kendi `data-avatar-name` / `data-avatar-url` öznitelikleri ya da hemen yanındaki
//     ad öğesi. **Oturumdaki ad hiçbir zaman başkasının avatarına yazılmaz** (R4).
//   - Ad yoksa avatar boş (nötr daire) kalır.
//
// Sayfa betiği sözleşmesi:
//   el.dataset.avatarName = guru.ad;            // baş harf kaynağı
//   el.dataset.avatarUrl  = guru.avatar_url;    // varsa (GAP-B23), <img src> olarak kullanılabilir olmalı
//   DemoAvatar.sync(el);                        // (MutationObserver eklenen öğeleri zaten yakalar)
//   // ya da tek çağrıda: DemoAvatar.render(el, { name, url })
(function () {
  'use strict';

  const SELF_SELECTOR = [
    '[data-avatar-self]',
    '.site-header-avatar',
    '.candidate-profile-avatar',
    '.story-profile-avatar',
    '.question-avatar',
    '#sidebar .sidebar-avatar'
  ].join(',');

  const avatarSelector = [
    '[data-demo-avatar]',
    '[data-avatar-name]',
    '[data-avatar-url]',
    '.advisor-directory-avatar',
    '.public-advisor-avatar',
    '.public-advisor-similar-avatar',
    '.candidate-session-advisor-avatar',
    '.payment-success-advisor-avatar',
    '.service-summary-avatar',
    '.guru-profile-preview-avatar',
    '.client-profile-avatar',
    '.session-card-avatar',
    SELF_SELECTOR
  ].join(',');

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  }

  // QA-028b: kabul edilen kaynaklar yalnız blob:, data:image/(png|jpeg|webp|gif), aynı kökene göreli yol
  // (protokole göreli //host DEĞİL) ve kökeni API tabanı ya da sayfanın kendisi olan mutlak http(s) adres.
  function allowedOrigins() {
    const origins = [location.origin];
    try {
      const base = (window.Api && window.Api.config && window.Api.config.baseUrl) ||
        (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || '';
      if (base) origins.push(new URL(base, location.href).origin);
    } catch (error) { /* geçersiz taban: yalnız sayfa kökeni */ }
    return origins;
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    if (/^blob:/i.test(url) || /^data:image\/(png|jpe?g|webp|gif);/i.test(url)) return url;
    if (/^[\\/]{2}/.test(url)) return '';                      // //host, /\host, \\host (protokole göreli)
    if (/^https?:\/\//i.test(url)) {
      try {
        return allowedOrigins().includes(new URL(url).origin) ? url : '';
      } catch (error) {
        return '';
      }
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';               // javascript:, data:text/html …
    return url;
  }

  function siblingName(avatar) {
    const sibling = avatar.nextElementSibling;
    if (!sibling) return '';
    const named = '.site-header-user-name, [data-user-name], .sidebar-user-name, .truncate';
    const namedNode = sibling.matches(named) ? sibling : sibling.querySelector(named);
    if (namedNode) return namedNode.textContent.trim();
    return Array.from(sibling.children)
      .map(child => child.textContent.trim())
      .find(text => text && !/^(aday|danışman)$/i.test(text)) || '';
  }

  function session() {
    return window.getSession?.() || null;
  }

  function sessionName() {
    const s = session();
    return (s && (s.name || s.ad)) || '';
  }

  function sessionPhoto() {
    const s = session();
    return (s && (s.avatar_url || s.avatarUrl)) || '';
  }

  function paint(avatar, name, url) {
    avatar.classList.add('demo-avatar');
    // Eski sürümden kalmış portre izleri temizlenir.
    avatar.removeAttribute('data-avatar');
    avatar.style.removeProperty('background-image');

    const label = String(name || '').trim();
    const src = safeUrl(url);
    const value = initials(label);
    const current = avatar.querySelector(':scope > img.avatar-photo');

    if (src) {
      if (!current || current.getAttribute('src') !== src) {
        const img = document.createElement('img');
        img.className = 'avatar-photo';
        img.alt = '';
        img.decoding = 'async';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.src = src;
        // Fotoğraf yüklenemezse baş harflere düşülür.
        img.addEventListener('error', () => {
          img.remove();
          avatar.classList.remove('has-photo');
          avatar.textContent = value;
        }, { once: true });
        avatar.replaceChildren(img);
      }
      avatar.classList.add('has-photo');
    } else {
      avatar.classList.remove('has-photo');
      if (current) current.remove();
      // Ad yoksa sayfanın kendi yazdığı baş harflere dokunulmaz (ör. kart şablonu doğrudan "DK" basar).
      if (value && avatar.textContent.trim() !== value) avatar.textContent = value;
    }

    if (label && avatar.getAttribute('role') === 'img') avatar.setAttribute('aria-label', label);
    avatar.dataset.avatarState = src ? 'photo' : (avatar.textContent.trim() ? 'initials' : 'empty');
  }

  // GAP-B23: API'nin göreli fotoğraf yolu (/me/avatar?v=…, /guru/clients/{id}/avatar …). Bearer isteyenler
  // <img src> ile yüklenemez → Api.avatarSrc (fetch + Authorization → blob:, token URL'e girmez).
  const API_PHOTO = /^\/(me|public|guru|admin|candidate)\//;
  const pending = new WeakMap();

  function syncAvatar(avatar) {
    if (!(avatar instanceof HTMLElement)) return;
    const isSelf = avatar.matches(SELF_SELECTOR);
    const name = isSelf
      ? sessionName() || avatar.dataset.avatarName || siblingName(avatar)
      : avatar.dataset.avatarName || siblingName(avatar);
    // QA-028a: kendi avatarında öznitelik VARSA (boş dahil) o geçerlidir; boş değer "fotoğraf yok" demektir
    // (DemoAvatar.render(el, { url: '' })). Böylece fotoğraf silinince oturum önbelleği tazelenmeden eski
    // /me/avatar?v= adresi istenmez (404 yok). Öznitelik hiç yoksa oturumdaki avatar_url kullanılır.
    const url = isSelf
      ? (avatar.hasAttribute('data-avatar-url') ? avatar.dataset.avatarUrl : sessionPhoto())
      : avatar.dataset.avatarUrl;
    if (url && API_PHOTO.test(String(url)) && window.Api && typeof window.Api.avatarSrc === 'function') {
      pending.set(avatar, url);
      // Çözülene kadar mevcut fotoğraf korunur; yoksa baş harfler.
      if (!avatar.querySelector(':scope > img.avatar-photo')) paint(avatar, name, '');
      window.Api.avatarSrc(url).then(src => {
        if (pending.get(avatar) !== url) return;   // bu arada başka fotoğraf istendi
        paint(avatar, name, src);
      });
      return;
    }
    pending.delete(avatar);
    paint(avatar, name, url);
  }

  function syncAvatars(root) {
    if (!root) return;
    if (root instanceof HTMLElement && root.matches(avatarSelector)) syncAvatar(root);
    root.querySelectorAll?.(avatarSelector).forEach(syncAvatar);
  }

  function render(avatar, options) {
    if (!(avatar instanceof HTMLElement)) return;
    const o = options || {};
    if ('name' in o) {
      if (o.name) avatar.dataset.avatarName = o.name;
      else delete avatar.dataset.avatarName;
    }
    if ('url' in o) {
      // Kendi avatarında boş url açık "fotoğraf yok"tur (öznitelik boş kalır); başkasınınkinde öznitelik kalkar.
      if (o.url) avatar.dataset.avatarUrl = o.url;
      else if (avatar.matches(SELF_SELECTOR)) avatar.dataset.avatarUrl = '';
      else delete avatar.dataset.avatarUrl;
    }
    syncAvatar(avatar);
  }

  window.DemoAvatar = Object.freeze({ initials, sync: syncAvatars, render });
  syncAvatars(document);
  document.addEventListener('session:ready', () => syncAvatars(document));
  // /auth/me önbelleği tazelendiğinde (ör. fotoğraf yüklendi/silindi) kendi avatarları yeniden çizilir.
  window.addEventListener('api:session', () => syncAvatars(document));

  new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'attributes') {
        if (record.target instanceof HTMLElement && record.target.matches(avatarSelector)) syncAvatar(record.target);
        return;
      }
      record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) syncAvatars(node);
      });
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-avatar-name', 'data-avatar-url']
  });
})();
