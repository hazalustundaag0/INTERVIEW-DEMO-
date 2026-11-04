(function () {
  const heading = Array.from(document.querySelectorAll('h2')).find((item) =>
    item.textContent.trim() === 'Satış hikâyeni oluştur'
  );
  const card = heading?.parentElement?.parentElement;
  const description = heading?.nextElementSibling;
  const actionRow = card?.lastElementChild;
  const button = actionRow?.querySelector('button');
  const notesLink = actionRow?.querySelector('a');
  const badgeLabel = card?.querySelector('span.uppercase');

  if (!card || !description || !button || !notesLink || !badgeLabel) {
    console.error('Ana ekrandaki sıradaki adım kartının gerekli öğeleri bulunamadı.');
    return;
  }

  badgeLabel.textContent = 'Sıradaki Adım';
  card.className = 'next-step-card relative overflow-hidden rounded-xl border border-[#E9E4F5] bg-white p-7 shadow-elevation-card transition-all duration-200 hover:shadow-elevation-hover';

  const stripe = document.createElement('span');
  stripe.className = 'next-step-stripe';
  stripe.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'next-step-content';

  const copy = document.createElement('div');
  copy.className = 'next-step-copy';

  const badge = document.createElement('div');
  badge.className = 'next-step-badge';
  const dot = document.createElement('span');
  dot.className = 'next-step-dot';
  dot.setAttribute('aria-hidden', 'true');
  badgeLabel.className = 'next-step-label';
  badge.append(dot, badgeLabel);

  heading.className = 'next-step-title';
  description.className = 'next-step-description';

  const actions = document.createElement('div');
  actions.className = 'next-step-actions';
  button.className = 'next-step-cta';
  notesLink.className = 'next-step-notes-link';

  copy.append(badge, heading, description);
  actions.append(button, notesLink);
  content.append(copy, actions);
  card.replaceChildren(stripe, content);
})();
