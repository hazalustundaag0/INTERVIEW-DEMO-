(function () {
  const textarea = document.querySelector('textarea[placeholder="Hikâye metnini buraya yapıştır..."]');
  const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent.includes('Yükle ve Çıktıları Oluştur')
  );
  const fileButton = Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent.trim() === 'Dosya yükle'
  );
  const pasteButton = Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent.trim() === 'Metni yapıştır'
  );

  if (!textarea || !submitButton || !fileButton || !pasteButton) {
    console.error('Hikâye yükleme kontrolleri bulunamadı.');
    return;
  }

  const wordCount = textarea.parentElement.querySelector('span');
  const status = document.createElement('p');
  status.className = 'text-[12px] text-[#7564C7] mt-2';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  textarea.parentElement.appendChild(status);

  const fileArea = document.createElement('div');
  fileArea.className = 'hidden mt-4 rounded-lg border border-[#7564C7] bg-[#7564C7] p-4';
  const fileNote = document.createElement('p');
  fileNote.className = 'text-[12px] text-[#7564C7] mb-3';
  fileNote.textContent = 'Metin dosyası seç (.txt, .md)';
  fileArea.appendChild(fileNote);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,.md,.text,text/plain';
  fileInput.className = 'block w-full text-sm text-[#7564C7] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#EEECFF] file:text-[#51409D]';
  fileInput.setAttribute('aria-label', 'Hikâye metin dosyası seç');
  fileArea.appendChild(fileInput);
  fileButton.parentElement.insertAdjacentElement('afterend', fileArea);

  function updateSubmitState() {
    const hasText = textarea.value.trim().length > 0;
    submitButton.disabled = !hasText;
    submitButton.className = hasText
      ? 'bg-[#51409D] hover:bg-[#51409D] text-white px-6 py-3 rounded-lg font-medium text-sm inline-flex items-center gap-2'
      : 'bg-[#7564C7] text-[#7564C7] cursor-not-allowed px-6 py-3 rounded-lg font-medium text-sm inline-flex items-center gap-2 select-none';
    if (wordCount) {
      const count = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
      wordCount.textContent = count + ' kelime';
    }
  }

  function setActiveTab(activeButton, inactiveButton) {
    activeButton.className = 'text-[#51409D] font-medium border-b-2 border-[#51409D] pb-2 px-1 text-sm inline-flex items-center gap-2';
    inactiveButton.className = 'text-[#7564C7] hover:text-[#1c1c1a] pb-2 px-1 border-b-2 border-transparent text-sm transition-colors';
  }

  fileButton.addEventListener('click', function () {
    setActiveTab(fileButton, pasteButton);
    fileArea.classList.remove('hidden');
    fileInput.click();
  });

  pasteButton.addEventListener('click', function () {
    setActiveTab(pasteButton, fileButton);
    fileArea.classList.add('hidden');
    textarea.focus();
  });

  textarea.addEventListener('input', updateSubmitState);

  fileInput.addEventListener('change', function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!/\.(txt|md|text)$/i.test(file.name)) {
      status.textContent = 'Lütfen .txt veya .md biçiminde bir metin dosyası seçin.';
      fileInput.value = '';
      return;
    }

    file.text().then(function (text) {
      textarea.value = text;
      updateSubmitState();
      status.textContent = file.name + ' yüklendi.';
    }).catch(function (error) {
      console.error('Hikâye dosyası okunamadı.', error);
      status.textContent = 'Dosya okunamadı. Lütfen dosyayı kontrol edip tekrar deneyin.';
    });
  });

  document.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (button !== submitButton) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!textarea.value.trim()) return;

    try {
      localStorage.setItem('demoHazirHikaye', textarea.value.trim());
    } catch (error) {
      console.error('Hikâye tarayıcıya kaydedilemedi.', error);
      status.textContent = 'Hikâye kaydedilemedi. Tarayıcı depolama alanı kullanılamıyor.';
      return;
    }

    location.href = 'ciktilar.html?source=manual';
  }, true);

  updateSubmitState();
})();
