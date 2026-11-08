(function () {
  const DEFAULT_CANDIDATE_NAME = 'Elif Yılmaz';
  const avatarSelector = [
    '[data-demo-avatar]',
    '.advisor-directory-avatar',
    '.public-advisor-avatar',
    '.public-advisor-similar-avatar',
    '.candidate-session-advisor-avatar',
    '.payment-success-advisor-avatar',
    '.service-summary-avatar',
    '.guru-profile-preview-avatar',
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
    const isUserAvatar = avatar.matches('.site-header-avatar, .candidate-profile-avatar');
    const name = isHeaderAvatar
      ? sessionName() || avatar.dataset.avatarName || siblingName(avatar) || avatar.textContent.trim()
      : (window.getSession?.()?.role === 'danisan' ? sessionName() : '') ||
        avatar.dataset.avatarName || siblingName(avatar) || avatar.textContent.trim() || DEFAULT_CANDIDATE_NAME;
    let hash = 2166136261;
    for (const character of String(name).trim()) {
      hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
    }
    const avatarIndex = isUserAvatar ? 8 : hash % 7 + 1;
    avatar.dataset.avatar = String(avatarIndex);
    avatar.style.backgroundImage = `url("avatars/avatar-${avatarIndex}.svg")`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.style.backgroundRepeat = 'no-repeat';
    avatar.style.backgroundColor = 'transparent';
    const value = initials(name);
    if (value && avatar.textContent.trim() !== value) avatar.textContent = value;
  }

  function syncAvatars(root) {
    if (root instanceof HTMLElement && root.matches(avatarSelector)) syncAvatar(root);
    root.querySelectorAll?.(avatarSelector).forEach(syncAvatar);
  }

  window.DemoAvatar = { initials, sync: syncAvatars };
  syncAvatars(document);

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) syncAvatars(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
