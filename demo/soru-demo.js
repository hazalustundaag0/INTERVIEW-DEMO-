(function () {
  var pageMatch = (location.pathname.split('/').pop() || '').match(/^soru([1-5])\.html$/);
  if (!pageMatch) return;

  var questionNumber = Number(pageMatch[1]);
  var textarea = document.querySelector('textarea');
  var nextButton = Array.from(document.querySelectorAll('button')).find(function (button) {
    return /^(Cevabı Kaydet ve İlerle|Cevabı Kaydet ve Hikâyemi Oluştur)/.test(button.textContent.trim());
  });
  var skipButton = Array.from(document.querySelectorAll('button')).find(function (button) {
    return button.textContent.trim() === 'Hatırlamıyorum / Atla';
  });
  var previousButton = Array.from(document.querySelectorAll('button')).find(function (button) {
    return /^(←\s*)?(Önceki Soru|Geri)$/.test(button.textContent.trim());
  });
  var saveLaterButton = Array.from(document.querySelectorAll('button')).find(function (button) {
    return button.textContent.trim() === 'Kaydet ve Daha Sonra Devam Et';
  });
  var statusText = textarea && Array.from(textarea.parentElement.querySelectorAll('span')).find(function (span) {
    return span.textContent.trim() === 'Otomatik kaydedildi';
  });
  var statusContainer = statusText && statusText.parentElement;
  var statusIcon = statusContainer && statusContainer.querySelector('.material-symbols-outlined');
  var count = textarea && textarea.parentElement.querySelector(':scope > div > span:last-child');
  var storageKey = 'demoSoruCevaplari';

  document.body.classList.add('question-page');

  var pageTitle = document.querySelector('h1');
  if (pageTitle) pageTitle.classList.add('question-page-title');

  var activeSidebarLink = Array.from(document.querySelectorAll('aside a[aria-current="page"]')).find(function (link) {
    return link.textContent.includes('Hikâyem');
  });
  if (activeSidebarLink) activeSidebarLink.classList.add('question-sidebar-link');

  var profileName = Array.from(document.querySelectorAll('aside span.truncate')).find(function (span) {
    return span.textContent.trim().length > 0;
  });
  var profileDetails = profileName && profileName.parentElement;
  var avatar = profileDetails && profileDetails.previousElementSibling;
  if (profileName && avatar) {
    var initials = profileName.textContent.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toLocaleUpperCase('tr-TR');
    }).join('');
    avatar.textContent = initials;
    avatar.classList.add('question-avatar');
    avatar.setAttribute('aria-hidden', 'true');
  }

  var aiInfo = Array.from(document.querySelectorAll('p')).find(function (paragraph) {
    return paragraph.textContent.trim().startsWith('YZ yalnızca senin verdiğin bilgilerden yazar');
  });
  if (aiInfo) {
    aiInfo.classList.add('question-ai-info');
    var infoIcon = document.createElement('span');
    infoIcon.className = 'material-symbols-outlined';
    infoIcon.setAttribute('aria-hidden', 'true');
    infoIcon.textContent = 'info';
    aiInfo.insertBefore(infoIcon, aiInfo.firstChild);
  }

  function readAnswers() {
    try {
      var saved = localStorage.getItem(storageKey);
      if (!saved) return {};
      var answers = JSON.parse(saved);
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        console.error('Soru cevapları okunamadı: kayıt biçimi geçersiz.');
        return {};
      }
      return answers;
    } catch (error) {
      console.error('Soru cevapları okunamadı.', error);
      return {};
    }
  }

  var answers = readAnswers();

  function saveAnswer() {
    if (!textarea || !hasEditedAnswer) return true;
    clearTimeout(saveTimer);
    setSaveStatus('Kaydediliyor...', 'sync');
    var saved = persistAnswer();
    setSaveStatus(saved ? 'Kaydedildi' : 'Kaydedilemedi', saved ? 'check_circle' : 'error');
    return saved;
  }

  function persistAnswer() {
    answers[questionNumber] = textarea.value;
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
      return true;
    } catch (error) {
      console.error('Soru cevabı kaydedilemedi.', error);
      return false;
    }
  }

  var saveTimer;
  var hasEditedAnswer = false;

  function setSaveStatus(message, iconName) {
    if (!statusContainer || !statusText) return;
    statusContainer.hidden = false;
    statusText.textContent = message;
    if (statusIcon) statusIcon.textContent = iconName;
  }

  function updateCharacterCount() {
    if (count) count.textContent = textarea.value.length + ' / 1000';
  }

  function routeUrl(target) {
    var destination = new URL(target, location.href);
    destination.search = location.search;
    destination.hash = location.hash;
    return destination;
  }

  function navigateTo(target) {
    location.href = routeUrl(target).href;
  }

  function questionPath(number) {
    return 'soru' + number + '.html';
  }

  if (textarea) {
    textarea.value = typeof answers[questionNumber] === 'string' ? answers[questionNumber] : '';
    textarea.classList.add('question-answer');
    textarea.maxLength = 1000;
    textarea.setAttribute('aria-describedby', 'question-answer-count');
    if (count) {
      count.id = 'question-answer-count';
      count.className = 'question-answer-counter';
      updateCharacterCount();
    }
    if (statusContainer) {
      statusContainer.classList.add('question-autosave-status');
      statusContainer.setAttribute('aria-live', 'polite');
      if (statusIcon) statusIcon.setAttribute('aria-hidden', 'true');
      statusContainer.hidden = true;
    }
    textarea.addEventListener('input', function () {
      hasEditedAnswer = true;
      updateCharacterCount();
      if (nextButton) nextButton.disabled = !textarea.value.trim();
      if (nextButton) nextButton.setAttribute('aria-disabled', String(nextButton.disabled));
      setSaveStatus('Kaydediliyor...', 'sync');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        var saved = persistAnswer();
        setSaveStatus(saved ? 'Kaydedildi' : 'Kaydedilemedi', saved ? 'check_circle' : 'error');
      }, 300);
    });
  }

  if (nextButton) {
    nextButton.classList.add('question-next-button');
    nextButton.type = 'button';
    nextButton.textContent = questionNumber === 5 ? 'Hikâyeyi oluştur' : 'Cevabı kaydet ve ilerle';
    nextButton.disabled = !textarea || !textarea.value.trim();
    nextButton.setAttribute('aria-disabled', String(nextButton.disabled));
  }

  if (skipButton) {
    skipButton.classList.add('question-skip-button');
    skipButton.type = 'button';
    skipButton.textContent = 'Hatırlamıyorum / atla';
  }

  if (previousButton) {
    previousButton.classList.add('question-previous-button');
    previousButton.type = 'button';
    previousButton.textContent = '← Önceki soru';
    previousButton.hidden = questionNumber === 1;
  }

  if (saveLaterButton) {
    saveLaterButton.classList.add('question-save-later');
    saveLaterButton.type = 'button';
    saveLaterButton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">bookmark</span><span>Kaydet ve daha sonra devam et</span>';
  }

  var progressGrid = document.querySelector('.grid.grid-cols-5');
  if (progressGrid && progressGrid.children.length === 5) {
    var progressContainer = document.createElement('div');
    progressContainer.className = 'question-progress-container';
    progressGrid.parentNode.replaceChild(progressContainer, progressGrid);
    progressGrid.classList.add('question-progress-track');
    progressGrid.setAttribute('role', 'progressbar');
    progressGrid.setAttribute('aria-label', 'Soru ilerlemesi');
    progressGrid.setAttribute('aria-valuemin', '0');
    progressGrid.setAttribute('aria-valuemax', '100');
    progressGrid.setAttribute('aria-valuenow', String(questionNumber * 20));
    progressGrid.setAttribute('aria-valuetext', 'Soru ' + questionNumber + ' / 5');
    Array.from(progressGrid.children).forEach(function (segment, index) {
      segment.setAttribute('aria-hidden', 'true');
      if (index === questionNumber - 1) segment.classList.add('question-progress-current');
    });
    progressContainer.appendChild(progressGrid);

    var progressControls = document.createElement('div');
    progressControls.className = 'question-progress-controls';
    progressControls.setAttribute('role', 'group');
    progressControls.setAttribute('aria-label', 'Tamamlanan sorular');
    for (var step = 1; step <= 5; step += 1) {
      if (step < questionNumber) {
        var progressButton = document.createElement('button');
        progressButton.type = 'button';
        progressButton.className = 'question-progress-control';
        progressButton.dataset.questionTarget = String(step);
        progressButton.setAttribute('aria-label', 'Soru ' + step + (step === 2 ? "'ye git" : "'e git"));
        progressControls.appendChild(progressButton);
      } else {
        var emptyControl = document.createElement('span');
        emptyControl.className = 'question-progress-empty';
        emptyControl.setAttribute('aria-hidden', 'true');
        progressControls.appendChild(emptyControl);
      }
    }
    progressContainer.appendChild(progressControls);
  }

  var footer = (skipButton || previousButton)?.closest('.border-t');
  if (footer) footer.classList.add('question-footer');
  var actionGroup = (nextButton || skipButton)?.parentElement;
  if (actionGroup) {
    actionGroup.classList.add('question-action-group');
    if (nextButton && skipButton) actionGroup.insertBefore(nextButton, skipButton);
  }

  function showBilgiGerekli() {
    var existingBox = document.querySelector('[data-bilgi-box="true"]');
    if (existingBox) {
      existingBox.hidden = false;
      return;
    }

    var warning = document.querySelector('.demo-bilgi-gerekli');
    if (!warning) {
      warning = document.createElement('div');
      warning.className = 'demo-bilgi-gerekli';
      warning.setAttribute('role', 'status');
      warning.setAttribute('aria-live', 'polite');
      warning.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">info</span><p>Bu bilgi hikâyende <strong>[bilgi gerekli]</strong> olarak işaretlenecek. Danışmanınla seansta tamamlayabilirsiniz.</p>';
      var footer = skipButton && skipButton.closest('.border-t');
      if (footer && footer.parentNode) footer.parentNode.insertBefore(warning, footer);
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;

    if (button === skipButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (skipButton.dataset.warned !== 'true') {
        showBilgiGerekli();
        skipButton.dataset.warned = 'true';
        skipButton.textContent = 'Atla ve ilerle';
        if (textarea && !textarea.value.trim()) textarea.placeholder = '[bilgi gerekli olarak işaretlendi]';
        return;
      }
      saveAnswer();
      navigateTo(questionNumber === 5 ? 'ciktilar.html' : questionPath(questionNumber + 1));
      return;
    }

    if (button === previousButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (questionNumber > 1) {
        saveAnswer();
        navigateTo(questionPath(questionNumber - 1));
      }
      return;
    }

    if (button === nextButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!nextButton.disabled) {
        saveAnswer();
        navigateTo(questionNumber === 5 ? 'ciktilar.html' : questionPath(questionNumber + 1));
      }
      return;
    }

    if (button === saveLaterButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveAnswer();
      navigateTo('ana.html');
      return;
    }

    if (button.classList.contains('question-progress-control')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveAnswer();
      navigateTo(questionPath(Number(button.dataset.questionTarget)));
    }
  }, true);

  var oldFlowNavigation = document.getElementById('demo-flow-nav');
  if (oldFlowNavigation) oldFlowNavigation.remove();

  var flowNavigation = document.createElement('nav');
  flowNavigation.id = 'demo-flow-nav';
  flowNavigation.className = 'question-flow-nav demo-only';
  flowNavigation.setAttribute('aria-label', 'Soru gezinmesi');

  if (questionNumber > 1) {
    var previousLink = document.createElement('a');
    previousLink.href = routeUrl(questionPath(questionNumber - 1)).href;
    previousLink.textContent = 'Önceki';
    flowNavigation.appendChild(previousLink);
  }

  var homeLink = document.createElement('a');
  homeLink.href = routeUrl('ana.html').href;
  homeLink.textContent = 'Ana sayfa';
  flowNavigation.appendChild(homeLink);

  var nextLink = document.createElement('a');
  nextLink.href = routeUrl(questionNumber === 5 ? 'ciktilar.html' : questionPath(questionNumber + 1)).href;
  nextLink.textContent = 'Sonraki';
  flowNavigation.appendChild(nextLink);

  document.body.appendChild(flowNavigation);
})();
