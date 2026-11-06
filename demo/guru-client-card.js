(function () {
  const page = location.pathname.split('/').pop();
  const profilePages = new Set([
    'guru-danisan-detay.html',
    'guru-hikaye.html',
    'guru-notlar.html',
    'guru-odevler.html'
  ]);
  const candidates = {
    'elif-yilmaz': {
      id: 'elif-yilmaz',
      name: 'Elif Yılmaz',
      title: 'Kıdemli Satış Yöneticisi',
      sector: 'Teknoloji & SaaS',
      completedSessions: 1,
      registrationDate: '11 Ocak 2026'
    },
    'can-ozturk': {
      id: 'can-ozturk',
      name: 'Can Öztürk',
      title: 'Ürün Müdürü',
      sector: '',
      completedSessions: 0,
      registrationDate: ''
    },
    'zeynep-aydin': {
      id: 'zeynep-aydin',
      name: 'Zeynep Aydın',
      title: 'Pazarlama Uzmanı',
      sector: '',
      completedSessions: 2,
      registrationDate: ''
    }
  };
  const storageKey = 'demoSelectedCandidate';

  function rememberSelection(candidateId) {
    try {
      localStorage.setItem(storageKey, candidateId);
    } catch (error) {
      console.error('Seçili aday kaydedilemedi.', error);
    }
  }

  if (page === 'guru-danisanlar.html') {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    rows.forEach(row => {
      const name = row.cells[0]?.textContent.trim();
      const candidate = Object.values(candidates).find(item => item.name === name);
      if (!candidate) {
        console.error(`Danışan listesinde aday profili bulunamadı: ${name || '(adsız)'}.`);
        return;
      }
      row.dataset.candidateId = candidate.id;
      const link = row.querySelector('a');
      if (link) link.href = `guru-danisan-detay.html?aday=${encodeURIComponent(candidate.id)}`;
    });

    document.addEventListener('click', event => {
      const row = event.target.closest('tbody tr[data-candidate-id]');
      if (row) rememberSelection(row.dataset.candidateId);
    }, true);
  }

  if (!profilePages.has(page)) return;
  document.body.classList.add('guru-client-profile');
  if (page === 'guru-hikaye.html') document.body.classList.add('guru-story-page');

  const queryId = new URLSearchParams(location.search).get('aday');
  let storedId = '';
  try {
    storedId = localStorage.getItem(storageKey) || '';
  } catch (error) {
    console.error('Seçili aday okunamadı.', error);
  }
  const candidateId = queryId || storedId || 'elif-yilmaz';
  const candidate = candidates[candidateId];
  if (!candidate) {
    console.error(`Aday profili bulunamadı: ${candidateId}.`);
    return;
  }
  rememberSelection(candidate.id);
  window.DemoClientProfile = { selectedCandidate: candidate };

  const host = document.querySelector('[data-client-profile]');
  if (!host) {
    console.error('Aday profil kartı için [data-client-profile] alanı bulunamadı.');
    return;
  }

  const avatar = document.createElement('span');
  avatar.className = 'client-profile-avatar';
  avatar.setAttribute('aria-label', `${candidate.name} baş harfleri`);
  avatar.textContent = candidate.name.split(/\s+/).slice(0, 2)
    .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');

  const copy = document.createElement('div');
  copy.className = 'client-profile-copy';
  const name = document.createElement('h1');
  name.textContent = candidate.name;
  const title = document.createElement('p');
  title.textContent = [candidate.title, candidate.sector].filter(Boolean).join(' · ');
  copy.append(name, title);

  const actions = document.createElement('div');
  actions.className = 'client-profile-actions';
  [
    ['Not Yaz', 'guru-notlar.html', false],
    ['Ödev Ver', 'guru-odevler.html', true]
  ].forEach(([label, href, primary]) => {
    const link = document.createElement('a');
    link.className = `client-profile-action${primary ? ' client-profile-action--primary' : ''}`;
    link.href = `${href}?aday=${encodeURIComponent(candidate.id)}`;
    link.textContent = label;
    actions.append(link);
  });

  host.className = 'client-profile-card';
  host.removeAttribute('aria-busy');
  host.replaceChildren(avatar, copy, actions);

  if (page === 'guru-danisan-detay.html') {
    const sessionHeading = Array.from(document.querySelectorAll('h2'))
      .find(heading => heading.textContent.trim() === 'Seanslar');
    const sessionList = sessionHeading?.parentElement?.querySelector(':scope > div');
    if (sessionHeading && sessionList) {
      document.querySelectorAll('.client-session-overview').forEach(summary => summary.remove());
      const summary = document.createElement('p');
      summary.className = 'client-session-overview';
      const registration = candidate.registrationDate
        ? ` · Kayıt tarihi · ${candidate.registrationDate}`
        : '';
      summary.textContent = `${candidate.completedSessions} / ${sessionList.children.length} seans tamamlandı${registration}`;
      sessionHeading.insertAdjacentElement('afterend', summary);
    } else {
      console.error('Genel sekmesinde seans bilgisi alanı bulunamadı.');
    }
  }
})();
