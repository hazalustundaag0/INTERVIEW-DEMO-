// siparis-page.js — Sipariş özeti + KVKK + ödeme (siparis.html). Sahibi: 82 Aday Onboarding UI Agent.
// Akış: ?service=<uuid>&guru=<uuid> (Selection)
//   1) GET /candidate/checkout/preview → özet (hizmet, danışman, seans sayısı/süresi, tutar; K53/K54)
//   2) GET /public/consent-texts + GET /me/consents → KVKK metni (güncel sürüm, K33) ve mevcut rıza durumu
//   3) "Ödemeyi tamamla" (data-action="checkout-purchase"):
//      a) KVKK kutusu işaretliyse POST /me/consents ×2 (kvkk_disclosure + explicit_consent, gösterilen sürüm)
//      b) guru_visibility kutusu (K51: ayrı, opsiyonel, önceden işaretsiz) işaretliyse POST /me/consents
//      c) POST /candidate/checkout/purchase {service_id, guru_id, confirm:true} + Idempotency-Key
//      d) redirect_url varsa sağlayıcıya; yoksa ödeme durumuna göre odeme-ok / odeme-bekle / odeme-hata (?enrollment=)
// Kaldırılan demo davranışı: setSession, demoOdemeAlindi/demoOdemeYontemi/demoKvkkOnaylandi localStorage,
// zamanlayıcıyla sahte başarı, Havale/EFT seçeneği (K55), sabit "Selin Arslan" / 1.500 ₺ (GAP-D10).
// Geçici UI durumu: sessionStorage "checkout.idem.<service>.<guru>" — aynı denemenin Idempotency-Key'i
// (sayfa yenilense de çift tahsilat olmaz); başarılı ödemeden sonra silinir.
(function () {
  'use strict';
  const Api = window.Api;
  if (!Api) {
    console.error('siparis-page.js: api-client.js yüklenmemiş.');
    return;
  }

  // ── Tasarım sınıfları (eski betikten korunur; veri bağımsız) ──────────────────
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
  }

  const summaryHeading = Array.from(document.querySelectorAll('h2')).find(element => element.textContent.trim() === 'Sipariş özeti');
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
  summaryGrid.children[0].querySelector('span.text-muted-text')?.classList.add('order-summary-value');

  const advisorColumn = summaryGrid.children[1];
  const advisorLink = document.createElement('a');
  advisorLink.className = 'order-advisor-link';
  advisorLink.href = 'danismanlar.html';
  advisorLink.setAttribute('data-nav-skip', '');
  advisorLink.append(...Array.from(advisorColumn.childNodes));
  advisorColumn.appendChild(advisorLink);
  advisorLink.querySelector('.font-bold')?.classList.add('order-summary-value');
  advisorLink.querySelector('.text-muted-text')?.classList.add('order-summary-value');
  Array.from(summaryGrid.children[2].querySelectorAll('.flex.items-center.justify-between'))
    .forEach(row => row.lastElementChild?.classList.add('order-summary-value'));

  const serviceConsent = summaryCard.querySelector('input[type="checkbox"]');
  if (serviceConsent) {
    serviceConsent.id = 'order-service-confirmation';
    serviceConsent.checked = false;
    serviceConsent.setAttribute('aria-required', 'true');
    const label = serviceConsent.closest('label');
    if (label) label.htmlFor = serviceConsent.id;
  }
  const consentCheck = document.getElementById('consent-check');
  const visibilityCheck = document.getElementById('guru-visibility-check');
  [consentCheck, visibilityCheck].forEach(box => {
    if (!box) return;
    box.checked = false; // K51: önceden işaretli değil
    const label = box.closest('label');
    if (label) label.htmlFor = box.id;
  });

  const submitButton = document.getElementById('submit-order-btn');
  const buttonLabel = submitButton?.querySelector('span:last-child');
  const buttonIcon = submitButton?.querySelector('.material-symbols-outlined');
  const bottomBar = submitButton?.parentElement?.parentElement;
  if (!submitButton || !buttonLabel || !bottomBar) {
    console.error('Ödeme alt çubuğu başlatılamadı.');
    return;
  }
  submitButton.setAttribute('aria-describedby', 'order-payment-status');
  buttonLabel.id = 'order-payment-status';
  buttonLabel.setAttribute('role', 'status');
  buttonLabel.setAttribute('aria-live', 'polite');
  buttonLabel.setAttribute('aria-atomic', 'true');
  bottomBar.classList.add('order-payment-bar');
  bottomBar.firstElementChild?.classList.add('order-payment-bar-content');
  const priceSummary = bottomBar.querySelector('[data-order-line]');
  if (priceSummary) {
    priceSummary.classList.remove('hidden', 'md:block');
    priceSummary.classList.add('order-payment-summary');
    priceSummary.setAttribute('aria-label', 'Sipariş özeti');
  }

  const noticeText = Array.from(document.querySelectorAll('p'))
    .find(element => element.textContent.includes('Şimdi onaylamasan da ödemeye devam edebilirsin'));
  if (noticeText?.parentElement) {
    noticeText.parentElement.classList.add('order-info-notice');
    noticeText.parentElement.setAttribute('role', 'note');
    noticeText.parentElement.setAttribute('aria-label', 'Açık rıza hakkında bilgi');
  }

  // K55: Havale/EFT yok; yalnız güvenli ödeme sağlayıcısı kutusu (mevcut tasarım) kalır.
  const paymentHeading = Array.from(document.querySelectorAll('h2')).find(element => element.textContent.trim() === 'Ödeme yöntemi');
  const paymentCard = paymentHeading?.parentElement?.parentElement;
  const providerContainer = paymentCard?.querySelector('.rounded-lg.border-2');
  if (providerContainer) {
    providerContainer.classList.remove('border-dashed');
    providerContainer.classList.add('order-payment-provider');
    const logos = providerContainer.querySelector('.flex.items-center.gap-2');
    if (logos) {
      logos.setAttribute('aria-label', 'Kabul edilen kartlar');
      logos.querySelectorAll('span').forEach(logo => {
        logo.setAttribute('aria-hidden', 'true');
        logo.classList.add('order-card-logo');
      });
    }
  }

  const afterPaymentHeading = Array.from(document.querySelectorAll('h2')).find(element => element.textContent.trim() === 'Ödemeden sonra ne olacak?');
  const afterPaymentGrid = afterPaymentHeading?.parentElement?.parentElement?.querySelector('.grid');
  if (afterPaymentGrid?.children.length === 4) {
    afterPaymentGrid.classList.add('order-next-steps');
    Array.from(afterPaymentGrid.children).forEach((step, index) => {
      step.classList.add('order-next-step');
      if (index === 0) {
        step.classList.add('order-next-step--active');
        step.setAttribute('aria-current', 'step');
      }
    });
  }

  // Hata/bilgi kutusu: içerik sütununun en üstünde (.api-alert).
  const contentColumn = summaryCard.parentElement;
  function showError(error, fallback) {
    const alert = Api.ui.showError(contentColumn, error, { fallback });
    alert?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearError() {
    const alert = contentColumn.querySelector(':scope > .api-alert');
    if (alert) Api.ui.clearError(alert);
  }

  // ── Durum ────────────────────────────────────────────────────────────────
  const selection = window.Selection ? window.Selection.current() : { serviceId: null, guruId: null };
  const state = { preview: null, texts: {}, status: {}, processing: false };
  const idemStorageKey = 'checkout.idem.' + selection.serviceId + '.' + selection.guruId;

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(node => { node.textContent = value; });
  }

  function updateSubmitState() {
    const ready = Boolean(state.preview) && Boolean(serviceConsent?.checked) && !state.processing;
    submitButton.disabled = !ready;
    submitButton.setAttribute('aria-disabled', String(!ready));
    submitButton.title = !state.preview ? 'Sipariş özeti yüklenemedi.'
      : !serviceConsent?.checked ? 'Devam etmek için hizmet onayını işaretle.' : '';
  }
  serviceConsent?.addEventListener('change', () => { clearError(); updateSubmitState(); });
  updateSubmitState();

  function idempotencyKey() {
    let key = null;
    try { key = window.sessionStorage.getItem(idemStorageKey); } catch (error) { key = null; }
    if (!key) {
      key = Api.newIdempotencyKey();
      try { window.sessionStorage.setItem(idemStorageKey, key); } catch (error) { /* bellekte kalır */ }
    }
    return key;
  }
  function forgetIdempotencyKey() {
    try { window.sessionStorage.removeItem(idemStorageKey); } catch (error) { /* yok say */ }
  }

  function renderPreview(preview) {
    const service = preview.service || {};
    const guru = preview.guru || {};
    const guruName = Api.format.fullName(guru);
    const total = Number(preview.amount_minor) === 0 ? 'Ücretsiz' : Api.format.money(preview.amount_minor, preview.currency);
    setText('[data-order-service]', service.name || '—');
    setText('[data-order-service-desc]', service.description || '');
    setText('[data-order-advisor]', guruName || '—');
    setText('[data-order-advisor-title]', guru.title || '');
    setText('[data-order-advisor-avatar]', Api.format.initials(guruName));
    setText('[data-order-sessions]', preview.session_count + ' seans');
    setText('[data-order-duration]', preview.session_duration_minutes + ' dk / seans');
    setText('[data-order-total]', total);
    setText('[data-order-line]', [service.name, guruName, preview.session_count + ' seans'].filter(Boolean).join(' · '));
    advisorLink.href = 'danisman.html?id=' + encodeURIComponent(guru.id || selection.guruId);
    advisorLink.setAttribute('aria-label', guruName + ' danışman profilini gör');
  }

  // KVKK/rıza metin çekmecesi: güncel yayınlanmış metin (gösterilen sürüm kaydedilir).
  const modal = document.getElementById('policy-modal');
  const policyTitle = document.querySelector('[data-policy-title]');
  const policyBody = document.querySelector('[data-policy-body]');
  function fillPolicy(kinds) {
    const texts = kinds.map(kind => state.texts[kind]).filter(Boolean);
    if (!texts.length || !policyBody) return;
    if (policyTitle) policyTitle.textContent = texts[0].title;
    policyBody.replaceChildren();
    texts.forEach((text, index) => {
      const heading = document.createElement('p');
      heading.className = 'font-semibold text-primary-container';
      heading.textContent = text.title + ' · Sürüm ' + text.version;
      policyBody.appendChild(heading);
      String(text.body || '').split(/\n{2,}/).forEach(paragraph => {
        const node = document.createElement('p');
        node.className = 'text-muted-text';
        node.textContent = paragraph.trim();
        if (node.textContent) policyBody.appendChild(node);
      });
      if (index < texts.length - 1) policyBody.appendChild(document.createElement('hr'));
    });
  }
  document.getElementById('open-policy-drawer')?.addEventListener('click', () => fillPolicy(['kvkk_disclosure', 'explicit_consent']));
  document.getElementById('open-guru-visibility-text')?.addEventListener('click', event => {
    event.preventDefault();
    fillPolicy(['guru_visibility']);
    modal?.classList.remove('hidden');
  });

  function consentUpToDate(kind) {
    const item = state.status[kind];
    return Boolean(item && item.active && item.up_to_date);
  }

  // Daha önce verilmiş (güncel sürüm) rızalar işaretli ve kilitli gösterilir; geri çekme bu ekranda yok.
  function reflectConsentStatus() {
    if (consentCheck && consentUpToDate('kvkk_disclosure') && consentUpToDate('explicit_consent')) {
      consentCheck.checked = true;
      consentCheck.disabled = true;
      consentCheck.title = 'Bu metne daha önce onay verdin.';
    }
    if (visibilityCheck && consentUpToDate('guru_visibility')) {
      visibilityCheck.checked = true;
      visibilityCheck.disabled = true;
      visibilityCheck.title = 'Bu izni daha önce verdin.';
    }
  }

  async function grant(kind) {
    const text = state.texts[kind];
    if (!text) throw new Api.ApiError({ status: 404, code: 'consent_text_missing', message: 'Onay metni yüklenemedi. Sayfayı yenileyip tekrar dene.' });
    return Api.post('/me/consents', { consent_text_id: text.id });
  }

  async function loadConsents() {
    const [texts, status] = await Promise.all([
      Api.get('/public/consent-texts', { auth: false }),
      Api.get('/me/consents')
    ]);
    state.texts = {};
    ((texts && texts.items) || []).forEach(text => { state.texts[text.kind] = text; });
    state.status = {};
    ((status && status.items) || []).forEach(item => { state.status[item.kind] = item; });
    reflectConsentStatus();
  }

  function paymentDestination(purchase) {
    const enrollmentId = purchase.enrollment && purchase.enrollment.id;
    const query = '?enrollment=' + encodeURIComponent(enrollmentId);
    const status = purchase.payment && purchase.payment.status;
    if (status === 'PAID') return 'odeme-ok.html' + query;
    if (status === 'FAILED') return 'odeme-hata.html' + query;
    return 'odeme-bekle.html' + query;
  }

  async function submit() {
    if (state.processing || !state.preview || !serviceConsent?.checked) {
      updateSubmitState();
      return;
    }
    clearError();
    state.processing = true;
    updateSubmitState();
    submitButton.setAttribute('aria-busy', 'true');
    buttonLabel.textContent = 'İşleniyor...';
    if (buttonIcon) buttonIcon.textContent = 'progress_activity';
    let step = 'consent';
    try {
      if (consentCheck?.checked && !consentCheck.disabled) {
        await grant('kvkk_disclosure');
        await grant('explicit_consent');
      }
      if (visibilityCheck?.checked && !visibilityCheck.disabled) {
        await grant('guru_visibility');
      }
      step = 'purchase';
      const purchase = await Api.confirm('POST', '/candidate/checkout/purchase', {
        service_id: selection.serviceId,
        guru_id: selection.guruId
      }, { idempotencyKey: idempotencyKey() });
      if (purchase && purchase.redirect_url && /^https:\/\//i.test(purchase.redirect_url)) {
        location.href = purchase.redirect_url; // Faz 4 gerçek sağlayıcı (3-D Secure)
        return;
      }
      if (purchase && purchase.payment && purchase.payment.status === 'PAID') forgetIdempotencyKey();
      location.href = paymentDestination(purchase);
    } catch (error) {
      state.processing = false;
      submitButton.removeAttribute('aria-busy');
      buttonLabel.textContent = 'Ödemeyi tamamla';
      if (buttonIcon) buttonIcon.textContent = 'lock';
      updateSubmitState();
      if (error instanceof Api.ApiError && error.is('consent_text_outdated')) {
        // Metin bu arada güncellendi: güncel sürümü yükle, kullanıcı yeniden okuyup onaylasın (K33).
        try { await loadConsents(); } catch (reloadError) { /* aşağıdaki mesaj yeterli */ }
        if (consentCheck && !consentCheck.disabled) consentCheck.checked = false;
        if (visibilityCheck && !visibilityCheck.disabled) visibilityCheck.checked = false;
      }
      if (error instanceof Api.ApiError && step === 'purchase' &&
          (error.isNetwork || error.isTimeout)) {
        showError(error.message + ' Tekrar denediğinde ödeme iki kez alınmaz.');
        return;
      }
      showError(error, step === 'consent' ? 'Onayın kaydedilemedi. Lütfen tekrar dene.' : 'Ödeme başlatılamadı. Lütfen tekrar dene.');
    }
  }
  submitButton.addEventListener('click', event => {
    event.preventDefault();
    submit();
  });

  // ── Yükleme ──────────────────────────────────────────────────────────────
  async function init() {
    const back = Array.from(document.querySelectorAll('a')).find(anchor => anchor.textContent.replace(/\s+/g, ' ').trim() === 'Danışman seçimine geri dön');
    if (back) {
      back.href = window.Selection ? window.Selection.href('hizmet.html', selection) : 'hizmet.html';
      back.setAttribute('data-nav-skip', '');
    }
    if (!selection.serviceId || !selection.guruId) {
      location.replace(window.Selection ? window.Selection.href('hizmet.html', selection) : 'hizmet.html');
      return;
    }
    await window.sessionReady;
    try {
      state.preview = await window.Selection.preview(selection);
      renderPreview(state.preview);
    } catch (error) {
      showError(error, 'Sipariş özeti yüklenemedi.');
      updateSubmitState();
      return;
    }
    updateSubmitState();
    try {
      await loadConsents();
    } catch (error) {
      showError(error, 'Onay metinleri yüklenemedi. Sayfayı yenileyip tekrar dene.');
    }
  }
  init().catch(error => console.error('Sipariş ekranı yüklenemedi:', error && error.message));
})();
