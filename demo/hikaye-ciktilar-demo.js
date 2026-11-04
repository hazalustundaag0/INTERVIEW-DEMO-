(function () {
  if (new URLSearchParams(location.search).get('source') !== 'manual') return;

  let story;
  try {
    story = localStorage.getItem('demoHazirHikaye');
  } catch (error) {
    console.error('Yüklenen hikâye tarayıcıdan okunamadı.', error);
    return;
  }
  if (!story) return;

  const heading = Array.from(document.querySelectorAll('h2')).find((item) =>
    item.textContent.trim() === 'Satış hikâyen'
  );
  const paragraph = heading && heading.nextElementSibling;
  if (!paragraph || paragraph.tagName !== 'P') {
    console.error('Satış hikâyesi alanı sonuç ekranında bulunamadı.');
    return;
  }
  paragraph.textContent = story;
})();
