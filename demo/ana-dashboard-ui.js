(function () {
  const sidebar = document.querySelector('main > div aside');
  if (sidebar) {
    sidebar.classList.add('advisor-sidebar');
    sidebar.firstElementChild?.classList.add('candidate-sidebar-card');
    const nav = sidebar.querySelector('nav');
    // "Sıradaki" rozeti gerçek sıradaki adıma göre ana-page.js'te eklenir (GAP-U15).

    const lockedItem = Array.from(nav?.children || []).find(item =>
      item.textContent.includes('Ödevlerim')
    );
    if (lockedItem) {
      lockedItem.classList.add('candidate-locked-nav-item');
      lockedItem.setAttribute('aria-disabled', 'true');
    }

    const avatar = sidebar.querySelector('.border-t .rounded-full');
    avatar?.classList.add('candidate-profile-avatar');
  }

  const progress = document.querySelector(
    'main section .relative.flex.items-center.justify-between.w-full'
  );
  if (!progress || progress.children.length !== 6) {
    console.error('Ana ekrandaki beş adımlı ilerleme göstergesi bulunamadı.');
    return;
  }

  progress.classList.add('candidate-progress');
  const dashboardSection = progress.closest('section');
  const introCard = Array.from(dashboardSection?.children || [])
    .find(child => child.contains(progress));
  introCard?.classList.add('candidate-dashboard-intro-card');
  const nextStepCard = Array.from(dashboardSection?.children || []).find(child =>
    Array.from(child.querySelectorAll('a, button')).some(action =>
      action.textContent.toLocaleLowerCase('tr-TR').includes('hikâyeni oluştur')
    )
  );
  nextStepCard?.classList.add('candidate-next-step-card');
  const nextStepAction = Array.from(nextStepCard?.querySelectorAll('a, button') || [])
    .find(action => action.textContent.toLocaleLowerCase('tr-TR').includes('hikâyeni oluştur'));
  nextStepAction?.classList.add('candidate-next-step-action');
  const sideCards = Array.from(dashboardSection?.children || []).find(child =>
    Array.from(child.querySelectorAll('h3')).some(heading =>
      heading.textContent.trim() === 'Seanslarım'
    )
  );
  sideCards?.classList.add('candidate-dashboard-side-cards');

  const track = progress.firstElementChild;
  track.classList.add('candidate-progress-track');
  track.firstElementChild?.classList.add('candidate-progress-fill');

  Array.from(progress.children).slice(1).forEach((step, index) => {
    const label = step.querySelector('span:not(.material-symbols-outlined)');
    const labelText = label?.textContent.trim() || `Adım ${index + 1}`;
    step.querySelector('.material-symbols-outlined')?.setAttribute('aria-hidden', 'true');
    step.classList.add('candidate-progress-step');
    step.dataset.stepLabel = labelText;
    // Adım durumu (complete/current/upcoming) API'den türetilir: ana-page.js (K36).
  });

  const sessionHeading = Array.from(document.querySelectorAll('h3')).find(item =>
    item.textContent.trim() === 'Seanslarım'
  );
  const sessionCard = sessionHeading?.parentElement;
  const sessionList = sessionCard?.querySelector(':scope > div');
  const sessionRows = Array.from(sessionList?.children || []);
  sessionCard?.classList.add('candidate-session-card');
  sessionList?.classList.add('candidate-session-list');
  sessionRows.forEach(row => row.classList.add('candidate-session-row'));
  sessionRows[0]?.querySelector('span:last-child')
    ?.classList.add('candidate-session-badge', 'candidate-session-badge--complete');
  const upcomingTitle = sessionRows[1]?.querySelector(':scope > span');
  const upcomingActions = sessionRows[1]?.querySelector(':scope > div');
  const plannedBadge = upcomingActions?.querySelector('span');
  const bookingLink = upcomingActions?.querySelector('a');
  upcomingTitle?.classList.add('candidate-session-title');
  upcomingActions?.classList.add('candidate-session-actions');
  plannedBadge?.classList.add('candidate-session-badge', 'candidate-session-badge--planned');
  bookingLink?.classList.add('candidate-booking-link');

  const advisorHeading = Array.from(document.querySelectorAll('h3')).find(item =>
    item.textContent.trim() === 'Danışmanın'
  );
  advisorHeading?.parentElement?.querySelector('p')?.classList.add('candidate-advisor-copy');
  // "Danışmanı gör" bağlantısı gerçek guru kimliğiyle ana-page.js'te eklenir (eski nav.js wireClientAdvisorProfile).
})();
