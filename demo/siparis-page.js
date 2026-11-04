(function () {
  const stepLabels = ['Kayıt', 'Hizmet ve Danışman', 'Ödeme'].map(label =>
    Array.from(document.querySelectorAll('span')).find(element => element.textContent.trim() === label)
  );
  const steps = stepLabels.map((label, index) => {
    if (!label?.parentElement?.parentElement) return null;
    const labelContainer = label.parentElement;
    const step = labelContainer.parentElement;
    labelContainer.classList.add('order-progress-label');
    step.classList.add('order-progress-step');
    step.firstElementChild?.classList.add('order-progress-node');
    if (index < stepLabels.length - 1) step.classList.add('order-progress-step--complete');
    if (index === stepLabels.length - 1) step.setAttribute('aria-current', 'step');
    return step;
  });
  const progress = steps[0]?.parentElement;
  if (progress && steps.every(Boolean)) {
    progress.classList.add('order-progress');
    Array.from(progress.children).forEach(child => {
      if (child.classList.contains('flex-1')) child.classList.add('order-progress-line');
    });
  } else {
    console.error('Sipariş ilerleme adımları bulunamadı.');
  }

  const summaryHeading = Array.from(document.querySelectorAll('h2'))
    .find(element => element.textContent.trim() === 'Sipariş özeti');
  const summaryCard = summaryHeading?.parentElement?.parentElement;
  const summaryGrid = summaryCard?.querySelector('.grid');
  if (!summaryCard || !summaryGrid || summaryGrid.children.length !== 3) {
    console.error('Sipariş özeti sütunları bulunamadı.');
    return;
  }

  summaryCard.classList.add('order-summary-card');
  summaryHeading.parentElement.firstElementChild?.classList.add('order-summary-heading-indicator');
  summaryGrid.classList.add('order-summary-grid');
  Array.from(summaryGrid.children).forEach(column => column.classList.add('order-summary-column'));

  const serviceDescription = summaryGrid.children[0].querySelector('span.text-muted-text');
  if (serviceDescription) serviceDescription.classList.add('order-summary-value');

  const advisorColumn = summaryGrid.children[1];
  const advisorLink = document.createElement('a');
  advisorLink.className = 'order-advisor-link';
  advisorLink.href = 'danisman.html?id=selin-arslan';
  advisorLink.setAttribute('aria-label', 'Selin Arslan danışman profilini gör');
  advisorLink.append(...Array.from(advisorColumn.childNodes));
  advisorColumn.appendChild(advisorLink);
  const advisorName = advisorLink.querySelector('.font-bold');
  if (advisorName) advisorName.classList.add('order-summary-value');
  const advisorTitle = advisorLink.querySelector('.text-muted-text');
  if (advisorTitle) advisorTitle.classList.add('order-summary-value');

  Array.from(summaryGrid.children[2].querySelectorAll('.flex.items-center.justify-between'))
    .forEach(row => row.lastElementChild?.classList.add('order-summary-value'));

  const serviceConsent = summaryCard.querySelector('input[type="checkbox"]');
  if (!serviceConsent) {
    console.error('Hizmet onay kutusu bulunamadı.');
  } else {
    serviceConsent.id = 'order-service-confirmation';
    serviceConsent.checked = false;
    serviceConsent.setAttribute('aria-required', 'true');
    const serviceConsentLabel = serviceConsent.closest('label');
    if (serviceConsentLabel) serviceConsentLabel.htmlFor = serviceConsent.id;
  }

  const consentCheck = document.getElementById('consent-check');
  if (consentCheck) {
    consentCheck.checked = false;
    const consentLabel = consentCheck.closest('label');
    if (consentLabel) consentLabel.htmlFor = consentCheck.id;
  } else {
    console.error('KVKK açık rıza kutusu bulunamadı.');
  }

  const submitButton = document.getElementById('submit-order-btn');
  const buttonLabel = submitButton?.querySelector('span:last-child');
  const bottomBar = submitButton?.parentElement?.parentElement;
  if (!submitButton || !buttonLabel || !bottomBar) {
    console.error('Ödeme alt çubuğu başlatılamadı.');
    return;
  }
  submitButton.disabled = !serviceConsent?.checked;
  submitButton.setAttribute('aria-disabled', String(submitButton.disabled));
  submitButton.title = submitButton.disabled ? 'Devam etmek için hizmet onayını işaretle.' : '';
  submitButton.setAttribute('aria-describedby', 'order-payment-status');
  buttonLabel.id = 'order-payment-status';
  buttonLabel.setAttribute('role', 'status');
  buttonLabel.setAttribute('aria-live', 'polite');
  buttonLabel.setAttribute('aria-atomic', 'true');
  bottomBar.classList.add('order-payment-bar');
  bottomBar.firstElementChild?.classList.add('order-payment-bar-content');
  const priceSummary = bottomBar.querySelector('.hidden.md\\:block');
  if (priceSummary) {
    priceSummary.classList.remove('hidden', 'md:block');
    priceSummary.classList.add('order-payment-summary');
    priceSummary.setAttribute('aria-label', 'Sipariş özeti');
  }

  function updateSubmitState() {
    const isDisabled = !serviceConsent?.checked || submitButton.dataset.processing === 'true';
    submitButton.disabled = isDisabled;
    submitButton.setAttribute('aria-disabled', String(isDisabled));
    submitButton.title = !serviceConsent?.checked
      ? 'Devam etmek için hizmet onayını işaretle.'
      : '';
  }

  serviceConsent?.addEventListener('change', updateSubmitState);

  const noticeText = Array.from(document.querySelectorAll('p'))
    .find(element => element.textContent.includes('Şimdi onaylamasan da ödemeye devam edebilirsin'));
  const notice = noticeText?.parentElement;
  if (notice) {
    notice.classList.add('order-info-notice');
    notice.setAttribute('role', 'note');
    notice.setAttribute('aria-label', 'Açık rıza hakkında bilgi');
  } else {
    console.error('Açık rıza bilgi metni bulunamadı.');
  }

  const paymentHeading = Array.from(document.querySelectorAll('h2'))
    .find(element => element.textContent.trim() === 'Ödeme yöntemi');
  const paymentCard = paymentHeading?.parentElement?.parentElement;
  if (!paymentCard) {
    console.error('Ödeme yöntemi alanı bulunamadı.');
  } else {
    const providerCopy = Array.from(paymentCard.querySelectorAll('p'))
      .find(element => element.textContent.includes('Kart bilgilerini ödeme sağlayıcısının güvenli sayfasında'));
    const providerContainer = providerCopy?.closest('.rounded-lg.border-2');
    if (!providerCopy || !providerContainer) {
      console.error('Ödeme sağlayıcısı açıklaması bulunamadı.');
    } else {
      providerCopy.id = 'order-payment-description';
      providerCopy.setAttribute('aria-live', 'polite');
      providerCopy.setAttribute('aria-atomic', 'true');
    }

    const choiceGroup = document.createElement('div');
    choiceGroup.className = 'order-payment-options';

    const choiceTitle = document.createElement('h3');
    choiceTitle.className = 'order-payment-choice-title';
    choiceTitle.id = 'order-payment-choice-title';
    choiceTitle.textContent = 'Ödeme türü';

    const options = document.createElement('div');
    options.className = 'order-payment-option-list';
    options.setAttribute('role', 'radiogroup');
    options.setAttribute('aria-labelledby', 'order-payment-choice-title');

    [
      { value: 'kart', label: 'Kredi/banka kartı' },
      { value: 'havale', label: 'Havale/EFT' }
    ].forEach((option, index) => {
      const label = document.createElement('label');
      label.className = 'order-payment-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'payment-method';
      radio.value = option.value;
      radio.checked = index === 0;
      radio.setAttribute('aria-checked', String(radio.checked));
      if (providerCopy) radio.setAttribute('aria-describedby', providerCopy.id);
      const text = document.createElement('span');
      text.textContent = option.label;
      label.append(radio, text);
      options.appendChild(label);
      radio.addEventListener('change', () => {
        options.querySelectorAll('input[name="payment-method"]').forEach(input => {
          input.setAttribute('aria-checked', String(input.checked));
        });
        if (providerCopy) {
          providerCopy.textContent = radio.value === 'kart'
            ? 'Ödeme sağlayıcısının güvenli sayfasına yönlendirileceksin.'
            : 'Havale/EFT bilgileri ödeme onayından sonra gösterilecek.';
        }
      });
    });

    choiceGroup.append(choiceTitle, options);

    if (!providerContainer) {
      console.error('Ödeme sağlayıcısı açıklaması bulunamadı.');
    } else {
      providerCopy.textContent = 'Ödeme sağlayıcısının güvenli sayfasına yönlendirileceksin.';
      providerContainer.classList.remove('border-dashed');
      providerContainer.classList.add('order-payment-provider');
      providerContainer.insertAdjacentElement('beforebegin', choiceGroup);
      const logos = providerContainer.querySelector('.flex.items-center.gap-2');
      if (logos) {
        logos.setAttribute('aria-label', 'Kabul edilen kartlar');
        logos.querySelectorAll('span').forEach(logo => {
          logo.setAttribute('aria-hidden', 'true');
          logo.classList.add('order-card-logo');
        });
      }
    }
  }

  const afterPaymentHeading = Array.from(document.querySelectorAll('h2'))
    .find(element => element.textContent.trim() === 'Ödemeden sonra ne olacak?');
  const afterPaymentCard = afterPaymentHeading?.parentElement?.parentElement;
  const afterPaymentGrid = afterPaymentCard?.querySelector('.grid');
  if (afterPaymentGrid?.children.length === 4) {
    afterPaymentGrid.classList.add('order-next-steps');
    Array.from(afterPaymentGrid.children).forEach((step, index) => {
      step.classList.add('order-next-step');
      if (index === 0) {
        step.classList.add('order-next-step--active');
        step.setAttribute('aria-current', 'step');
      }
    });
  } else {
    console.error('Ödeme sonrası adımlar bulunamadı.');
  }

  submitButton.addEventListener('click', () => {
    if (!serviceConsent?.checked || submitButton.dataset.processing === 'true') {
      updateSubmitState();
      return;
    }

    submitButton.dataset.processing = 'true';
    updateSubmitState();
    submitButton.setAttribute('aria-busy', 'true');
    buttonLabel.textContent = 'İşleniyor...';
    const icon = submitButton.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = 'progress_activity';

    try {
      const session = window.getSession?.();
      if (session?.role === 'danisan' && !window.setSession?.({ ...session, state: 'registered' })) {
        throw new Error('Ödeme sonrası danışan oturumu güncellenemedi.');
      }
      localStorage.setItem('demoOdemeAlindi', 'true');
      localStorage.setItem(
        'demoOdemeYontemi',
        paymentCard?.querySelector('input[name="payment-method"]:checked')?.value || 'kart'
      );
      localStorage.setItem('demoKvkkOnaylandi', String(Boolean(consentCheck?.checked)));
    } catch (error) {
      console.error('Ödeme durumu kaydedilemedi.', error);
      buttonLabel.textContent = 'Ödeme bilgisi kaydedilemedi. Tekrar dene.';
      submitButton.removeAttribute('aria-busy');
      delete submitButton.dataset.processing;
      if (icon) icon.textContent = 'lock';
      updateSubmitState();
      return;
    }

    window.setTimeout(() => {
      location.href = 'odeme-ok.html';
    }, 700);
  });
})();
