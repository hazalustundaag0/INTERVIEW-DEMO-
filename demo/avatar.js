// avatar.js — Baş harf avatarları. Sahibi: 81. İsim oturumdan (/auth/me önbelleği) gelir; sabit isim yok (GAP-D06).
(function () {
  const DEFAULT_CANDIDATE_NAME = '';
  const avatarSelector = [
    '[data-demo-avatar]',
    '.candidate-profile-avatar',
    '.story-profile-avatar',
    '.question-avatar',
    '.client-profile-avatar',
    '.session-card-avatar',
    '.site-header-avatar'
  ].join(',');

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  }

  function siblingName(avatar) {
    const sibling = avatar.nextElementSibling;
    if (!sibling) return '';
    const namedNode = sibling.matches('.site-header-user-name, [data-user-name], .truncate')
      ? sibling
      : sibling.querySelector('.site-header-user-name, [data-user-name], .truncate');
    if (namedNode) return namedNode.textContent.trim();
    return Array.from(sibling.children)
      .map(child => child.textContent.trim())
      .find(text => text && !/^(aday|danışman)$/i.test(text)) || '';
  }

  function sessionName() {
    const session = window.getSession?.();
    return session?.name || session?.ad || '';
  }

  function syncAvatar(avatar) {
    if (!(avatar instanceof HTMLElement)) return;
    avatar.classList.add('demo-avatar');

    const isHeaderAvatar = avatar.matches('.site-header-avatar');
    const name = isHeaderAvatar
      ? sessionName() || siblingName(avatar) || avatar.textContent.trim()
      : (window.getSession?.()?.role === 'danisan' ? sessionName() : '') ||
        siblingName(avatar) || avatar.textContent.trim() || DEFAULT_CANDIDATE_NAME;
    const value = initials(name);
    if (value && avatar.textContent.trim() !== value) avatar.textContent = value;
  }

  function syncAvatars(root) {
    if (root instanceof HTMLElement && root.matches(avatarSelector)) syncAvatar(root);
    root.querySelectorAll?.(avatarSelector).forEach(syncAvatar);
  }

  window.DemoAvatar = { initials, sync: syncAvatars };
  syncAvatars(document);
  document.addEventListener('session:ready', () => syncAvatars(document));

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) syncAvatars(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
