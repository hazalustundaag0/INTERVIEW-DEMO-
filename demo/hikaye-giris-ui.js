(function () {
  const sidebar = document.querySelector('main > div aside');
  if (sidebar) {
    sidebar.classList.add('advisor-sidebar');
    const avatar = sidebar.querySelector('.border-t .rounded-full');
    avatar?.classList.add('story-profile-avatar');
  }

  const optionCards = Array.from(document.querySelectorAll('h3')).filter(heading =>
    ['YZ ile oluştur', 'Hazır hikâyemi yükleyeceğim'].includes(heading.textContent.trim())
  );
  optionCards[0]?.parentElement?.parentElement?.parentElement?.classList.add('story-option-grid');
  optionCards.forEach(heading => {
    const card = heading.parentElement?.parentElement;
    const content = heading.parentElement;
    const icon = content?.querySelector(':scope > div:first-child');
    const button = card?.querySelector(':scope > button');
    if (!card || !content || !icon || !button) {
      console.error(`Hikâye seçeneği kartı tamamlanamadı: ${heading.textContent.trim()}`);
      return;
    }

    card.classList.add('story-option-card');
    content.classList.add('story-option-content');
    button.classList.add('story-option-action');

    if (heading.textContent.trim() === 'Hazır hikâyemi yükleyeceğim') {
      button.classList.add('story-option-action--secondary');
    }

    if (heading.textContent.trim() === 'YZ ile oluştur' && !icon.hasChildNodes()) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.8');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/>';
      icon.classList.add('story-option-icon', 'story-option-icon--ai');
      icon.append(svg);
    }

    const description = heading.nextElementSibling;
    if (heading.textContent.trim() === 'YZ ile oluştur' && description && !content.querySelector('.story-option-meta')) {
      const meta = document.createElement('span');
      meta.className = 'story-option-meta';
      meta.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">schedule</span><span>5 soru · yaklaşık 10 dakika</span>';
      heading.insertAdjacentElement('afterend', meta);
      description.classList.add('story-option-description');
    }

    if (heading.textContent.trim() === 'Hazır hikâyemi yükleyeceğim' && description && !content.querySelector('.story-option-meta')) {
      const meta = document.createElement('span');
      meta.className = 'story-option-meta';
      meta.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">description</span><span>PDF, Word veya metin</span>';
      description.insertAdjacentElement('afterend', meta);
      description.classList.add('story-option-description');
    }

    const helper = card.querySelector('p.text-\\[12px\\]');
    helper?.classList.add('story-option-helper');
  });

  const trustNote = Array.from(document.querySelectorAll('p')).find(paragraph =>
    paragraph.textContent.trim() === 'YZ yalnızca senin verdiğin bilgilerden yazar, bilgi uydurmaz.'
  );
  if (trustNote && !trustNote.querySelector('.story-trust-icon')) {
    trustNote.classList.add('story-trust-note');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined story-trust-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'verified_user';
    trustNote.prepend(icon);
  }

  const section = document.querySelector('main section');
  const pageHeading = section?.querySelector('h1');
  if (section && pageHeading && !section.querySelector('.story-page-context')) {
    const context = document.createElement('div');
    context.className = 'story-page-context';
    const stepLabel = document.createElement('span');
    stepLabel.textContent = 'Adım 3 / 5 · Hikâyen';
    const homeLink = document.createElement('a');
    homeLink.className = 'story-home-link';
    homeLink.href = 'ana.html';
    homeLink.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span>Ana ekran</span>';
    context.append(stepLabel, homeLink);
    pageHeading.classList.add('story-page-title');
    pageHeading.parentElement?.insertBefore(context, pageHeading);
  }

  const advisorTitle = Array.from(section?.querySelectorAll('span') || []).find(item =>
    item.textContent.trim() === 'Danışmanının seans notları'
  );
  const advisorCard = advisorTitle?.closest('div.mt-6');
  if (advisorCard) {
    advisorCard.classList.add('story-advisor-notes-card');
    advisorTitle.classList.add('story-advisor-notes-title');
    advisorTitle.parentElement?.parentElement?.classList.add('story-advisor-notes-heading');
    advisorCard.querySelector('.story-notes-toggle')?.classList.add('story-notes-toggle');
  }
})();
