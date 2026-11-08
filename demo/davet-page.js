// davet-page.js — Bağlantıyla parola belirleme ekranı (davet.html). Sahibi: 82 Aday Onboarding UI Agent.
// Dev sunucusu (81) e-posta bağlantılarını buraya yönlendirir, token adres çubuğunun #token= parçasındadır:
//   /verify-email   → davet.html?mode=verify  (aday e-posta doğrulama + ilk parola)  POST /auth/verify-email
//   /set-password   → davet.html?mode=invite  (guru daveti)                         POST /auth/verify-email
//   /reset-password → davet.html?mode=reset   (parola sıfırlama)                     POST /auth/password-reset/confirm
// Başarıda: aday → aynı parolayla otomatik giriş (client_type=candidate) → dönüş hedefi; guru → giris-danisman.html.
// Kaldırılan demo davranışı: sabit "selin.arslan@ornek.com" (token'dan e-posta önizlemesi yok → alan gizli,
// GAP-B15), nav.js'in "Hesabı Etkinleştir" → giriş yönlendirmesi (API'siz).
(function () {
  'use strict';
  const Api = window.Api;
  if (!Api) {
    console.error('davet-page.js: api-client.js yüklenmemiş.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const requestedMode = params.get('mode');
  const mode = ['verify', 'invite', 'reset'].includes(requestedMode) ? requestedMode : 'verify';
  // Token bir kez okunur ve adres çubuğundan silinir (geçmişe/Referer'a sızmaz). Loglanmaz.
  const token = Api.auth.takeLinkToken();

  const COPY = {
    verify: {
      title: 'Hesabını etkinleştir',
      intro: 'E-posta adresini doğrulamak ve giriş yapmak için bir şifre belirle.',
      button: 'Hesabı Etkinleştir',
      busy: 'Etkinleştiriliyor...'
    },
    invite: {
      title: null, // HTML'deki danışman metni korunur
      intro: null,
      button: 'Hesabı Etkinleştir',
      busy: 'Etkinleştiriliyor...'
    },
    reset: {
      title: 'Şifreni yenile',
      intro: 'Hesabın için yeni bir şifre belirle. Diğer cihazlardaki oturumların kapatılır.',
      button: 'Şifreyi Yenile',
      busy: 'Kaydediliyor...'
    }
  }[mode];

  function read(key) {
    try { return window.sessionStorage.getItem(key) || ''; } catch (error) { return ''; }
  }
  function forget(key) {
    try { window.sessionStorage.removeItem(key); } catch (error) { /* yok say */ }
  }

  async function candidateDestination() {
    const saved = Api.safeReturnPath(read('onboarding.return'));
    if (saved) return saved;
    try {
      const result = await Api.page('/candidate/enrollments', { limit: 1, role: Api.ROLES.CANDIDATE, redirectOn401: false });
      return result.items.length ? Api.HOME_PAGES.candidate : 'danismanlar.html';
    } catch (error) {
      return 'danismanlar.html';
    }
  }

  function init() {
    const form = document.getElementById('davet-form');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm-password');
    const submitButton = form && form.querySelector('[data-action="set-password"]');
    if (!form || !passwordInput || !confirmInput || !submitButton) {
      console.error('Parola belirleme formu bulunamadı.');
      return;
    }

    const title = document.querySelector('[data-davet-title]');
    const intro = document.querySelector('[data-davet-intro]');
    if (COPY.title && title) title.textContent = COPY.title;
    if (COPY.intro && intro) intro.textContent = COPY.intro;
    submitButton.textContent = COPY.button;
    if (COPY.title) document.title = COPY.title + ' · Interview Demo';
    form.noValidate = true;

    // QA-020: backend'de token'ı tüketmeden "bağlantı geçerli mi" ucu yok (82 → 60 önerisi). Bu yüzden
    // açılışta kilitlemek için tahmin yürütülmez; bunun yerine (1) açılışta tek kullanımlık bağlantı notu ve
    // kurtarma yolları gösterilir, (2) geçersiz/kullanılmış bağlantıda form kilitlenir ve aynı yollar sunulur.
    const RECOVERY = {
      verify: [['Giriş yap', Api.LOGIN_PAGES.candidate], ['Yeni doğrulama bağlantısı iste', 'kayit.html']],
      reset: [['Giriş yap', Api.LOGIN_PAGES.candidate], ['Yeni sıfırlama bağlantısı iste', Api.LOGIN_PAGES.candidate], ['Danışman girişi', Api.LOGIN_PAGES.guru]],
      invite: [['Danışman girişi', Api.LOGIN_PAGES.guru]]
    }[mode];
    function appendLinks(alert, links) {
      if (!alert) return;
      links.forEach(([label, href]) => {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        link.setAttribute('data-nav-skip', '');
        link.style.fontWeight = '600';
        link.style.textDecoration = 'underline';
        link.style.marginLeft = '.5rem';
        alert.appendChild(link);
      });
    }
    function lock(message) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-disabled', 'true');
      [passwordInput, confirmInput].forEach(input => { input.disabled = true; });
      hint?.remove();
      appendLinks(Api.ui.showError(form, message), RECOVERY);
    }

    // Açılış notu (bilgi kutusu): bağlantı tek kullanımlıktır; daha önce kullanıldıysa kurtarma yolları.
    let hint = null;
    if (token) {
      hint = document.createElement('p');
      hint.className = 'api-alert api-alert--info';
      hint.setAttribute('role', 'note');
      hint.dataset.linkHint = 'true';
      hint.textContent = mode === 'invite'
        ? 'Bu davet bağlantısı tek kullanımlıktır. Hesabını daha önce etkinleştirdiysen danışman girişini kullan.'
        : mode === 'reset'
          ? 'Bu bağlantı tek kullanımlıktır ve kısa süre geçerlidir. Şifreni bu bağlantıyla zaten yenilediysen giriş yap.'
          : 'Bu bağlantı tek kullanımlıktır ve 2 gün geçerlidir. Hesabını zaten etkinleştirdiysen giriş yap.';
      appendLinks(hint, [RECOVERY[0]]);
      form.insertAdjacentElement('beforebegin', hint);
    }

    // Bu sekmede zaten aday oturumu varsa (ör. bağlantı ikinci kez açıldı) açıkça söyle.
    if (token && mode === 'verify' && Api.hasSession(Api.ROLES.CANDIDATE)) {
      hint.textContent = 'Bu tarayıcıda zaten giriş yapmışsın; hesabın etkin görünüyor. Bağlantı daha önce kullanıldıysa yeniden kullanılamaz.';
      appendLinks(hint, [['Ana ekrana git', Api.HOME_PAGES.candidate]]);
    }

    if (!token) {
      lock('Bağlantı geçersiz veya eksik. E-postandaki bağlantıyı yeniden aç ya da yeni bir bağlantı iste.');
      return;
    }

    function validate() {
      const password = passwordInput.value;
      const errors = {};
      if (!password) errors.password = 'Bu alan zorunlu.';
      else if (password.length < 12) errors.password = 'Şifre en az 12 karakter olmalıdır.';
      else if (password.length > 128) errors.password = 'Şifre en fazla 128 karakter olabilir.';
      if (!errors.password && confirmInput.value !== password) errors['confirm-password'] = 'Şifreler eşleşmiyor.';
      return errors;
    }

    let busy = false;
    async function submit() {
      if (busy || submitButton.disabled) return;
      Api.ui.clearError(form);
      const errors = validate();
      if (Object.keys(errors).length) {
        Api.ui.applyFieldErrors(form, errors);
        return;
      }
      Api.ui.clearFieldErrors(form);
      const password = passwordInput.value;
      busy = true;
      Api.ui.setLoading(submitButton, true, { text: COPY.busy });
      try {
        const result = mode === 'reset'
          ? await Api.auth.confirmPasswordReset(token, password)
          : await Api.auth.verifyEmail(token, password);
        const user = (result && result.user) || {};
        forget('onboarding.pendingEmail');

        if (mode === 'invite' || user.role === 'guru') {
          location.href = Api.LOGIN_PAGES.guru;
          return;
        }
        if (user.role !== 'candidate') {
          Api.ui.setLoading(submitButton, false);
          submitButton.disabled = true;
          Api.ui.showError(form, 'Şifren kaydedildi. Bu hesapla yönetim panelinden giriş yapabilirsin.', { tone: 'info' });
          return;
        }
        // Aday: az önce belirlenen parolayla oturum aç (client_type=candidate), sonra dönüş hedefi.
        try {
          await Api.auth.login({ email: user.email, password, clientType: Api.ROLES.CANDIDATE });
        } catch (loginError) {
          const fallback = Api.safeReturnPath(read('onboarding.return'));
          location.href = Api.LOGIN_PAGES.candidate + (fallback ? '?return=' + encodeURIComponent(fallback) : '');
          return;
        }
        const destination = await candidateDestination();
        forget('onboarding.return');
        location.href = destination;
      } catch (error) {
        busy = false;
        Api.ui.setLoading(submitButton, false);
        if (!(error instanceof Api.ApiError)) {
          console.error('Parola kaydedilemedi.');
          Api.ui.showError(form, 'Şifre kaydedilemedi. Lütfen tekrar dene.');
          return;
        }
        if (error.is('invalid_link')) {
          lock(error.userMessage);
          return;
        }
        if (error.is('password_already_set')) {
          lock(error.userMessage); // kurtarma bağlantıları (Giriş yap …) lock() içinde eklenir
          return;
        }
        if (error.isValidation) {
          const unmatched = Api.ui.applyFieldErrors(form, error, { map: { password: '#password' } });
          if (!Object.keys(error.fields).length || unmatched.length) Api.ui.showError(form, error);
          return;
        }
        Api.ui.showError(form, error);
      }
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      submit();
    });
    submitButton.addEventListener('click', event => {
      event.preventDefault();
      submit();
    });
    [passwordInput, confirmInput].forEach(input => input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      input.closest('div')?.parentElement?.querySelectorAll('[data-api-field-error]').forEach(node => node.remove());
    }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
