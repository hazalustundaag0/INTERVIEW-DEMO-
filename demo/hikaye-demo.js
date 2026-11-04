// hikaye-demo.js: seans notlarını kart içinde aç + sorulara 1. sorudan başla
(function () {
  try {
    localStorage.removeItem('soruNo');
  } catch (error) {
    console.error('Önceki soru bilgisi temizlenemedi.', error);
  }

  const notes = [
    'CV\'ndeki bankacılıktan teknolojiye geçiş güçlü bir tema. Hikâyende bu geçişin nedenini ve seni heyecanlandıran şeyi öne çıkaralım.',
    'Ekip yönetimi deneyimini somut bir örnekle anlat. Rakamla desteklenen bir başarı hikâyenin merkezinde olmalı.',
    '"Biz" dili yerine kendi payına odaklan. Mülakatçı senin ne yaptığını duymak istiyor.',
    'Ödev: Seni en çok zorlayan dönemi ve nasıl aştığını üç cümleyle yaz.'
  ];

  const toggle = Array.from(document.querySelectorAll('a')).find(link =>
    link.textContent.replace(/\s+/g, ' ').trim().startsWith('Notların tamamını oku')
  );
  const notesCard = toggle?.closest('div.mt-6');
  if (!toggle || !notesCard) {
    console.error('Danışman seans notları kartı bulunamadı.');
  } else {
    const expandedNotes = document.createElement('div');
    expandedNotes.className = 'story-expanded-notes';
    expandedNotes.id = 'advisor-session-notes-full';
    expandedNotes.hidden = true;
    notes.slice(1).forEach(note => {
      const paragraph = document.createElement('p');
      paragraph.textContent = note;
      expandedNotes.append(paragraph);
    });
    toggle.replaceWith(Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'story-notes-toggle',
      textContent: 'Notların tamamını oku'
    }));
    const button = notesCard.querySelector('.story-notes-toggle');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', expandedNotes.id);
    const arrow = document.createElement('span');
    arrow.className = 'material-symbols-outlined';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = 'expand_more';
    button.append(' ', arrow);
    button.insertAdjacentElement('beforebegin', expandedNotes);
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
      expandedNotes.hidden = isExpanded;
      arrow.textContent = isExpanded ? 'expand_more' : 'expand_less';
      button.firstChild.textContent = isExpanded
        ? 'Notların tamamını oku '
        : 'Notları gizle ';
    });
  }
})();
